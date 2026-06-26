import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";

// List doctors who have opted in (used by patients to pick who to request a
// visit with). Only doctors who have enabled doctor mode are exposed.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    const doctors = await prisma.user.findMany({
      where: { isDoctor: true, blocked: false },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true, specialty: true, bio: true },
    });
    return NextResponse.json({ doctors });
  } catch {
    return NextResponse.json({ doctors: [] });
  }
}
