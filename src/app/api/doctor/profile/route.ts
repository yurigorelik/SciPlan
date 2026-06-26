import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/visit-access";

export const runtime = "nodejs";

// Update the signed-in user's doctor profile, including enabling/disabling
// doctor mode. Self-serve: any active (non-blocked) user can opt in to act as a
// doctor and set their specialty/bio.
export async function POST(req: NextRequest) {
  const actor = await requireActiveUser();
  if ("error" in actor) return actor.error;
  const me = actor.user;

  let body: { isDoctor?: boolean; specialty?: string; bio?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data: { isDoctor?: boolean; specialty?: string | null; bio?: string | null } = {};
  if (typeof body.isDoctor === "boolean") data.isDoctor = body.isDoctor;
  if (typeof body.specialty === "string") {
    data.specialty = body.specialty.trim().slice(0, 200) || null;
  }
  if (typeof body.bio === "string") {
    data.bio = body.bio.trim().slice(0, 1000) || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: me.id },
      data,
      select: { id: true, isDoctor: true, specialty: true, bio: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json(
      { error: "Could not update your doctor profile." },
      { status: 500 },
    );
  }
}
