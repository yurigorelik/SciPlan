import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

// Create a new plan.
export async function POST(req: NextRequest) {
  let body: { title?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const plan = await prisma.plan.create({
      data: {
        title: body.title?.slice(0, 200) || "Untitled research plan",
        data: (body.data ?? {}) as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ id: plan.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Could not save plan. Is the database configured?" },
      { status: 500 },
    );
  }
}
