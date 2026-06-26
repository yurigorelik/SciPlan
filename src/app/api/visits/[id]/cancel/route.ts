import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser, partyFor } from "@/lib/visit-access";

export const runtime = "nodejs";

// Either party cancels a visit that is REQUESTED, ACCEPTED, or BOOKED. Any
// booked slot is released back to the doctor's availability.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireActiveUser();
  if ("error" in actor) return actor.error;
  const me = actor.user;
  const { id } = await params;

  const visit = await prisma.visit.findUnique({ where: { id } }).catch(() => null);
  if (!visit) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const party = partyFor(visit, me.id);
  if (!party) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!["REQUESTED", "ACCEPTED", "BOOKED"].includes(visit.status)) {
    return NextResponse.json(
      { error: "This visit can no longer be cancelled." },
      { status: 409 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (visit.scheduledSlotId) {
        // Release the slot so standing availability becomes bookable again.
        await tx.slot.update({
          where: { id: visit.scheduledSlotId },
          data: { booked: false },
        });
      }
      await tx.visit.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: party,
          scheduledSlotId: null,
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not cancel the visit." },
      { status: 500 },
    );
  }
}
