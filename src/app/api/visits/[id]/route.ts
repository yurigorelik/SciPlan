import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";

// Load a visit by id, including both parties and slots. Visible to either party
// (even if blocked — read-only) and to admins.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: {
          select: { id: true, name: true, email: true, specialty: true },
        },
        scheduledSlot: true,
        customSlots: { orderBy: { start: "asc" } },
      },
    });
    if (!visit) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const uid = session.user.id;
    const isParty = visit.patientId === uid || visit.doctorId === uid;
    if (!isParty && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.json(visit);
  } catch {
    return NextResponse.json(
      { error: "Could not load the visit. Is the database configured?" },
      { status: 500 },
    );
  }
}
