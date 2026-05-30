import Link from "next/link";
import Wizard from "@/components/Wizard";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { emptyPlan, PlanData } from "@/lib/steps";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user; // middleware guarantees sign-in

  let plan:
    | { id: string; title: string; data: unknown; userId: string }
    | null = null;
  try {
    plan = await prisma.plan.findUnique({ where: { id } });
  } catch {
    // Database not configured — fall through to the error message below.
  }

  const isOwner = plan?.userId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!plan || (!isOwner && !isAdmin)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Plan not available</h1>
        <p className="mt-2 text-sm text-slate-600">
          This plan doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Back to my plans
        </Link>
      </div>
    );
  }

  const data: PlanData = {
    ...emptyPlan(),
    ...(plan.data as PlanData),
    title: plan.title,
  };

  // Read-only when: a blocked user views their own plan, or an admin views
  // someone else's plan.
  const readOnly = (isOwner && user.blocked) || (!isOwner && isAdmin);
  const readOnlyReason =
    !isOwner && isAdmin
      ? "Admin view — this plan belongs to another user and is read-only."
      : user.blocked
        ? "Your account is restricted: you can view this plan but cannot edit it."
        : undefined;

  return (
    <Wizard
      initialData={data}
      initialId={plan.id}
      readOnly={readOnly}
      readOnlyReason={readOnlyReason}
    />
  );
}
