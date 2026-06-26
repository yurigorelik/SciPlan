import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visit-access";

export const runtime = "nodejs";

type SlotInput = { start?: string; end?: string };

// Doctor accepts a REQUESTED visit: sets the cost, modality (+ link/location),
// optional terms, and how the patient's slots are sourced — either the doctor's
// standing availability (EXISTING) or slots provided just for this visit
// (CUSTOM). Moves the visit to ACCEPTED so the patient can book.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await requireActiveUser();
  if ("error" in actor) return actor.error;
  const me = actor.user;
  const { id } = await params;

  let body: {
    costCents?: number;
    currency?: string;
    modality?: string;
    meetingLink?: string;
    location?: string;
    terms?: string;
    slotSource?: string;
    slots?: SlotInput[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const visit = await prisma.visit.findUnique({ where: { id } }).catch(() => null);
  if (!visit) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (visit.doctorId !== me.id) {
    return NextResponse.json(
      { error: "Only the doctor can accept this visit." },
      { status: 403 },
    );
  }
  if (visit.status !== "REQUESTED") {
    return NextResponse.json(
      { error: "This visit can no longer be accepted." },
      { status: 409 },
    );
  }

  // ── Validate cost ──
  const costCents = body.costCents;
  const MAX_COST_CENTS = 100_000_000; // a sane ceiling (1,000,000.00)
  if (
    typeof costCents !== "number" ||
    !Number.isFinite(costCents) ||
    costCents < 0 ||
    costCents > MAX_COST_CENTS ||
    Math.round(costCents) !== costCents
  ) {
    return NextResponse.json(
      { error: "Provide a valid cost (0 or more)." },
      { status: 400 },
    );
  }
  const currency = (body.currency ?? "USD").trim().toUpperCase().slice(0, 3) || "USD";

  // ── Validate modality ──
  if (body.modality !== "IN_PERSON" && body.modality !== "VIDEO") {
    return NextResponse.json(
      { error: "Choose in person or video." },
      { status: 400 },
    );
  }
  const modality = body.modality;
  let meetingLink: string | null = null;
  let location: string | null = null;
  if (modality === "VIDEO") {
    meetingLink = (body.meetingLink ?? "").trim();
    if (!meetingLink) {
      return NextResponse.json(
        { error: "Provide a video call link for a video visit." },
        { status: 400 },
      );
    }
    if (!/^https?:\/\//i.test(meetingLink)) {
      return NextResponse.json(
        { error: "The video link must start with http:// or https://." },
        { status: 400 },
      );
    }
    meetingLink = meetingLink.slice(0, 2000);
  } else {
    location = (body.location ?? "").trim().slice(0, 500) || null;
  }
  const terms = (body.terms ?? "").trim().slice(0, 4000) || null;

  // ── Validate slot source ──
  if (body.slotSource !== "EXISTING" && body.slotSource !== "CUSTOM") {
    return NextResponse.json(
      { error: "Choose how the patient picks a time." },
      { status: 400 },
    );
  }
  const slotSource = body.slotSource;

  const customSlots: { start: Date; end: Date }[] = [];
  if (slotSource === "CUSTOM") {
    const raw = Array.isArray(body.slots) ? body.slots : [];
    if (raw.length === 0) {
      return NextResponse.json(
        { error: "Add at least one time slot." },
        { status: 400 },
      );
    }
    if (raw.length > 50) {
      return NextResponse.json(
        { error: "That is too many slots (max 50)." },
        { status: 400 },
      );
    }
    const now = new Date();
    for (const s of raw) {
      const start = new Date(String(s.start));
      const end = new Date(String(s.end));
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return NextResponse.json(
          { error: "Each slot needs a valid start before its end." },
          { status: 400 },
        );
      }
      if (start <= now) {
        return NextResponse.json(
          { error: "Slots must be in the future." },
          { status: 400 },
        );
      }
      customSlots.push({ start, end });
    }
  } else {
    // EXISTING: require at least one open, upcoming standing slot.
    const open = await prisma.slot.count({
      where: {
        doctorId: me.id,
        visitId: null,
        booked: false,
        start: { gt: new Date() },
      },
    });
    if (open === 0) {
      return NextResponse.json(
        {
          error:
            "You have no open upcoming availability. Add standing slots first, or provide slots for this visit.",
        },
        { status: 400 },
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.visit.update({
        where: { id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          costCents,
          currency,
          modality,
          meetingLink,
          location,
          terms,
          slotSource,
        },
      });
      if (customSlots.length) {
        await tx.slot.createMany({
          data: customSlots.map((s) => ({
            doctorId: me.id,
            visitId: id,
            start: s.start,
            end: s.end,
          })) as Prisma.SlotCreateManyInput[],
        });
      }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not accept the visit." },
      { status: 500 },
    );
  }
}
