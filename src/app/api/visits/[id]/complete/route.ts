import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visit-access";

export const runtime = "nodejs";

// Doctor marks a BOOKED visit as having taken place (terminal).
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
  if (visit.doctorId !== me.id) {
    return NextResponse.json(
      { error: "Only the doctor can complete this visit." },
      { status: 403 },
    );
  }
  if (visit.status !== "BOOKED") {
    return NextResponse.json(
      { error: "Only a booked visit can be marked completed." },
      { status: 409 },
    );
  }

  try {
    await prisma.visit.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not complete the visit." },
      { status: 500 },
    );
  }
}
