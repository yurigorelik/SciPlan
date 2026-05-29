import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

// Load a plan by id.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json(
      { error: "Could not load plan. Is the database configured?" },
      { status: 500 },
    );
  }
}

// Update an existing plan.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
