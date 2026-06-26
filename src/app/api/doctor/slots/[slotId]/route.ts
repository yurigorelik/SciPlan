import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visit-access";

export const runtime = "nodejs";

// Delete one of the signed-in doctor's standing availability slots. Only
// unbooked standing slots (not tied to a specific visit) can be removed.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> },
) {
  const actor = await requireActiveUser();
  if ("error" in actor) return actor.error;
  const me = actor.user;
  const { slotId } = await params;

  const slot = await prisma.slot.findUnique({ where: { id: slotId } }).catch(() => null);
  if (!slot) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (slot.doctorId !== me.id || slot.visitId !== null) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (slot.booked) {
    // A booked slot tied to a live visit can't be removed — cancel the visit
    // instead. But a slot left "booked" with no visit referencing it (e.g. the
    // visit's user was deleted) is an orphan and is safe to clean up.
    const ref = await prisma.visit
      .findFirst({ where: { scheduledSlotId: slotId }, select: { id: true } })
      .catch(() => null);
    if (ref) {
      return NextResponse.json(
        { error: "That slot is booked and cannot be removed. Cancel the visit instead." },
        { status: 409 },
      );
    }
  }

  try {
    await prisma.slot.delete({ where: { id: slotId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not remove the slot." }, { status: 500 });
  }
}
