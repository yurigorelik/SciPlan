import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";

export const runtime = "nodejs";

// Create a new plan, owned by the signed-in user.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to save plans." }, { status: 401 });
  }

  const dbUser = await prisma.user
    .findUnique({ where: { id: session.user.id } })
    .catch(() => null);
  if (!dbUser) {
    return NextResponse.json({ error: "Account not found." }, { status: 401 });
  }
  if (dbUser.blocked) {
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
    const plan = await prisma.plan.create({
      data: {
        title: body.title?.slice(0, 200) || "Untitled research plan",
        data: (body.data ?? {}) as Prisma.InputJsonValue,
        userId: dbUser.id,
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
