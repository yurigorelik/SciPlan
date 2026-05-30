import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth-helpers";

export const runtime = "nodejs";

// List all users with their plan counts.
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      blocked: true,
      createdAt: true,
      _count: { select: { plans: true } },
    },
  });
  return NextResponse.json({ users });
}

// Bulk actions over all non-admin users: deleteAll, blockAll, unblockAll.
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Never act on admin accounts in bulk.
  const where = { role: "USER" as const };

  switch (body.action) {
    case "deleteAll": {
      const res = await prisma.user.deleteMany({ where });
      return NextResponse.json({ ok: true, count: res.count });
    }
    case "blockAll": {
      const res = await prisma.user.updateMany({
        where,
        data: { blocked: true },
      });
      return NextResponse.json({ ok: true, count: res.count });
    }
    case "unblockAll": {
      const res = await prisma.user.updateMany({
        where,
        data: { blocked: false },
      });
      return NextResponse.json({ ok: true, count: res.count });
    }
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
