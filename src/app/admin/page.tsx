import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import AdminDashboard, { type AdminUser } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/");

  let users: AdminUser[] = [];
  try {
    const rows = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        blocked: true,
        createdAt: true,
        plans: {
          orderBy: { updatedAt: "desc" },
          select: { id: true, title: true, updatedAt: true, data: true },
        },
      },
    });
    users = rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      blocked: u.blocked,
      createdAt: u.createdAt.toISOString(),
      plans: u.plans.map((p) => ({
        id: p.id,
        title: p.title,
        updatedAt: p.updatedAt.toISOString(),
        finalized: Boolean(
          p.data &&
            typeof p.data === "object" &&
            "summary" in (p.data as Record<string, unknown>) &&
            (p.data as Record<string, unknown>).summary,
        ),
      })),
    }));
  } catch {
    // Database not configured.
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Administrator dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage users: block them from new use, delete them, and view (read-only)
          the projects and summaries they already created.
        </p>
      </div>
      <AdminDashboard
        initialUsers={users}
        currentUserId={session.user.id}
      />
    </div>
  );
}
