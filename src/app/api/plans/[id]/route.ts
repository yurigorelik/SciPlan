import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";

export const runtime = "nodejs";

// Load a plan by id. Owners and admins only.
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
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (plan.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json(
      { error: "Could not load plan. Is the database configured?" },
      { status: 500 },
    );
  }
}

// Update an existing plan. Owner only, and not while blocked.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await params;

  const existing = await prisma.plan
    .findUnique({ where: { id } })
    .catch(() => null);
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const dbUser = await prisma.user
    .findUnique({ where: { id: session.user.id } })
    .catch(() => null);
  if (dbUser?.blocked) {
    return NextResponse.json(
      { error: "Your account is restricted to viewing existing plans." },
      { status: 403 },
    );
  }

  let body: { title?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title.slice(0, 200) } : {}),
        ...(body.data !== undefined
          ? { data: body.data as Prisma.InputJsonValue }
          : {}),
      },
    });
    return NextResponse.json({ id: plan.id, updatedAt: plan.updatedAt });
  } catch {
    return NextResponse.json(
      { error: "Could not update plan." },
      { status: 500 },
    );
  }
}

// Delete a plan. Owner or admin.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.plan
    .findUnique({ where: { id } })
    .catch(() => null);
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (existing.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  try {
    await prisma.plan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete plan." }, { status: 500 });
  }
}
