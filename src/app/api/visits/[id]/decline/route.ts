import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visit-access";

export const runtime = "nodejs";

// Doctor declines a REQUESTED visit (terminal).
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
      { error: "Only the doctor can decline this visit." },
      { status: 403 },
    );
  }
  if (visit.status !== "REQUESTED") {
    return NextResponse.json(
      { error: "This visit can no longer be declined." },
      { status: 409 },
    );
  }

  try {
    await prisma.visit.update({
      where: { id },
      data: { status: "DECLINED", declinedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not decline the visit." },
      { status: 500 },
    );
  }
}
