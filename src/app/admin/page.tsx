import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import AdminDashboard, {
  type AdminUser,
  type AdminResearch,
  type ResearchStatus,
} from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

function planStatus(data: unknown): { status: ResearchStatus; summary: string } {
  const d = (data ?? {}) as { finalizeStatus?: string; summary?: string };
  const summary = typeof d.summary === "string" ? d.summary : "";
  if (d.finalizeStatus === "processing") return { status: "processing", summary };
  if (d.finalizeStatus === "error") return { status: "error", summary };
  if (d.finalizeStatus === "done" || summary) return { status: "done", summary };
  return { status: "draft", summary };
}

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/");

  let users: AdminUser[] = [];
  let research: AdminResearch[] = [];
  try {
    const [userRows, planRows] = await Promise.all([
      prisma.user.findMany({
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
      }),
      prisma.plan.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          data: true,
          user: { select: { email: true, name: true } },
        },
      }),
    ]);

    users = userRows.map((u) => ({
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
        finalized: planStatus(p.data).status === "done",
      })),
    }));

    research = planRows.map((p) => {
      const { status, summary } = planStatus(p.data);
      return {
        id: p.id,
        title: p.title,
        owner: p.user.email ?? "(no email)",
        ownerName: p.user.name,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        status,
        summary,
      };
    });
  } catch {
    // Database not configured.
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Administrator dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage users — block, unblock, or delete them (single or all) — and
          review every submitted research plan and its finalized summary.
        </p>
      </div>
      <AdminDashboard
        initialUsers={users}
        currentUserId={session.user.id}
        research={research}
      />
    </div>
  );
}
