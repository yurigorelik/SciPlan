import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-helpers";

export const runtime = "nodejs";

// Block / unblock a single user.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const { id } = await params;

  let body: { blocked?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.blocked !== "boolean") {
    return NextResponse.json(
      { error: "Expected { blocked: boolean }." },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admin accounts cannot be blocked." },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id },
    data: { blocked: body.blocked },
    select: { id: true, blocked: true },
  });
  return NextResponse.json({ ok: true, user });
}

// Delete a single user (and, by cascade, their plans).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const { id } = await params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted here." },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
