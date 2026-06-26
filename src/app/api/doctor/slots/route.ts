import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visit-access";

export const runtime = "nodejs";

// List the signed-in doctor's standing availability slots.
export async function GET() {
  const actor = await requireActiveUser();
  if ("error" in actor) return actor.error;
  const me = actor.user;
  try {
    const slots = await prisma.slot.findMany({
      where: { doctorId: me.id, visitId: null },
      orderBy: { start: "asc" },
    });
    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json({ slots: [] });
  }
}

// Add standing availability slots. Doctor mode required.
export async function POST(req: NextRequest) {
  const actor = await requireActiveUser();
  if ("error" in actor) return actor.error;
  const me = actor.user;
  if (!me.isDoctor) {
    return NextResponse.json(
      { error: "Enable doctor mode to manage availability." },
      { status: 403 },
    );
  }

  let body: { slots?: { start?: string; end?: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = Array.isArray(body.slots) ? body.slots : [];
  if (raw.length === 0) {
    return NextResponse.json({ error: "Add at least one slot." }, { status: 400 });
  }
  if (raw.length > 100) {
    return NextResponse.json(
      { error: "That is too many slots at once (max 100)." },
      { status: 400 },
    );
  }

  const now = new Date();
  const rows: Prisma.SlotCreateManyInput[] = [];
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
    rows.push({ doctorId: me.id, visitId: null, start, end });
  }

  try {
    await prisma.slot.createMany({ data: rows });
    return NextResponse.json({ ok: true, count: rows.length }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not add the slots." }, { status: 500 });
  }
}
