import Link from "next/link";
import Wizard from "@/components/Wizard";
import { prisma } from "@/lib/prisma";
import { emptyPlan, PlanData } from "@/lib/steps";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let plan: { id: string; title: string; data: unknown } | null = null;
  try {
    plan = await prisma.plan.findUnique({ where: { id } });
  } catch {
    // Database not configured — fall through to the error message below.
  }

  if (!plan) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Plan not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          This plan doesn&apos;t exist, or the database isn&apos;t configured yet.
        </p>
        <Link
          href="/plan"
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Start a new plan
        </Link>
      </div>
    );
  }

  const data: PlanData = { ...emptyPlan(), ...(plan.data as PlanData), title: plan.title };

  return <Wizard initialData={data} initialId={plan.id} />;
}
