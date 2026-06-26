import Link from "next/link";
import { STEPS } from "@/lib/steps";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PlanCard from "@/components/PlanCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const user = session!.user; // middleware guarantees sign-in

  let rows: { id: string; title: string; updatedAt: Date; data: unknown }[] = [];
  try {
    rows = await prisma.plan.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, data: true },
    });
  } catch {
    // Database not configured — show an empty list.
  }

  const plans = rows.map((p) => {
    const d = (p.data ?? {}) as { finalizeStatus?: string; summary?: string };
    return {
      id: p.id,
      title: p.title,
      updatedAt: p.updatedAt.toISOString(),
      finalizeStatus: d.finalizeStatus ?? (d.summary ? "done" : undefined),
    };
  });

  return (
    <div>
      <section className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          Research planning
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          {user.blocked
            ? "Your account can view existing plans but cannot create or edit new ones."
            : "Plan a sound study step by step — question, literature, design, variables, sample size, and analysis — then get a final AI review that finalizes it."}
        </p>
        {!user.blocked && (
          <Link
            href="/plan"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-brand-700"
          >
            + Start a new plan
          </Link>
        )}
      </section>

      <section className="mb-12">
        <Link
          href="/visits"
          className="group flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm transition hover:border-brand-400"
        >
          <div>
            <h2 className="font-semibold text-slate-900">Schedule a doctor visit</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Request a visit with a doctor, agree on a time and cost, and meet in
              person or by video. Doctors can set their availability and accept
              requests.
            </p>
          </div>
          <span className="shrink-0 rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-700 transition group-hover:border-brand-400">
            Go to visits →
          </span>
        </Link>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          My plans
        </h2>
        {plans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-500">
              You don&apos;t have any plans yet.
            </p>
            {!user.blocked && (
              <Link
                href="/plan"
                className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
              >
                Create your first plan →
              </Link>
            )}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <li key={p.id}>
                <PlanCard plan={p} canDelete={!user.blocked} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="how">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          The six steps
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                  {i + 1}
                </span>
                <h3 className="font-semibold text-slate-900">{step.title}</h3>
              </div>
              <p className="text-sm text-slate-600">{step.blurb}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
