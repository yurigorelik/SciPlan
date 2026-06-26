import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visit-access";

export const runtime = "nodejs";

// Patient secures an open slot for an ACCEPTED visit and accepts the terms and
// cost. Books the slot atomically so two patients can't take the same standing
// slot, then moves the visit to BOOKED.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireActiveUser();
  if ("error" in actor) return actor.error;
  const me = actor.user;
  const { id } = await params;

  let body: { slotId?: string; acceptTerms?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const slotId = (body.slotId ?? "").trim();
  if (!slotId) {
    return NextResponse.json({ error: "Pick a time slot." }, { status: 400 });
  }
  if (body.acceptTerms !== true) {
    return NextResponse.json(
      { error: "You must accept the terms and cost to book." },
      { status: 400 },
    );
  }

  const visit = await prisma.visit.findUnique({ where: { id } }).catch(() => null);
  if (!visit) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (visit.patientId !== me.id) {
    return NextResponse.json(
      { error: "Only the patient can book this visit." },
      { status: 403 },
    );
  }
  if (visit.status !== "ACCEPTED") {
    return NextResponse.json(
      { error: "This visit is not ready to book." },
      { status: 409 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Claim the visit FIRST, guarded by its status. This serializes
      // concurrent bookings on the visit row: a second attempt blocks here and
      // then sees status != ACCEPTED, so only one booking can proceed. Any
      // failure below throws BookError, which rolls the whole transaction back
      // (so a claimed slot is never left stranded).
      const claimedVisit = await tx.visit.updateMany({
        where: { id, status: "ACCEPTED" },
        data: { status: "BOOKED" },
      });
      if (claimedVisit.count !== 1) throw new BookError("bad-state");

      const slot = await tx.slot.findUnique({ where: { id: slotId } });
      if (!slot) throw new BookError("invalid-slot");

      // The slot must belong to this doctor and match how slots are sourced.
      const matchesSource =
        visit.slotSource === "CUSTOM"
          ? slot.visitId === id
          : visit.slotSource === "EXISTING"
            ? slot.visitId === null
            : false;
      if (slot.doctorId !== visit.doctorId || !matchesSource) {
        throw new BookError("invalid-slot");
      }
      if (slot.start <= new Date()) throw new BookError("past");

      // Claim the slot atomically; only one booking can win.
      const claimedSlot = await tx.slot.updateMany({
        where: { id: slotId, booked: false },
        data: { booked: true },
      });
      if (claimedSlot.count !== 1) throw new BookError("taken");

      await tx.visit.update({
        where: { id },
        data: {
          scheduledSlotId: slot.id,
          scheduledStart: slot.start,
          scheduledEnd: slot.end,
          termsAcceptedAt: new Date(),
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof BookError) {
      switch (e.code) {
        case "taken":
          return NextResponse.json(
            { error: "That slot was just taken. Pick another." },
            { status: 409 },
          );
        case "invalid-slot":
          return NextResponse.json(
            { error: "That slot is no longer available." },
            { status: 409 },
          );
        case "past":
          return NextResponse.json(
            { error: "That slot is in the past. Pick another." },
            { status: 409 },
          );
        case "bad-state":
          return NextResponse.json(
            { error: "This visit is not ready to book." },
            { status: 409 },
          );
      }
    }
    return NextResponse.json(
      { error: "Could not book the slot." },
      { status: 500 },
    );
  }
}

// Sentinel thrown inside the booking transaction to trigger a rollback and map
// to a specific client error.
class BookError extends Error {
  constructor(public code: "bad-state" | "invalid-slot" | "past" | "taken") {
    super(code);
  }
}
