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
    const d = (p.data ?? {}) as {
      finalizeStatus?: string;
      summary?: string;
      protocol?: string;
    };
    return {
      id: p.id,
      title: p.title,
      updatedAt: p.updatedAt.toISOString(),
      finalizeStatus: d.finalizeStatus ?? (d.summary ? "done" : undefined),
      hasProtocol: !!d.protocol,
    };
  });

  return (
    <div>
      {/* Masthead */}
      <section className="mb-12 border-b-2 border-brand-700 pb-8">
        <p className="eyebrow">
          {user.blocked ? "Read-only account" : "Plan · Review · Protocol"}
        </p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
          Design a study that
          <span className="mark"> holds up</span>
          <br className="hidden sm:block" /> before you collect a single
          data point.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
          {user.blocked
            ? "Your account can view the plans you already created, but cannot create or edit new ones."
            : "Six sections, from the research question to the statistical analysis plan. Answer what you want, remove what you don't, and have the AI draft anything you're stuck on — then get a review that corrects your choices and a full protocol you can hand to a supervisor."}
        </p>
        {!user.blocked && (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/plan" className="btn btn-primary">
              Start a new plan
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-label text-slate-500">
              {plans.length > 0
                ? `${plans.length} plan${plans.length === 1 ? "" : "s"} in progress`
                : "Takes about 15 minutes"}
            </span>
          </div>
        )}
      </section>

      {/* Plans */}
      <section className="mb-14">
        <h2 className="eyebrow mb-4">My plans</h2>
        {plans.length === 0 ? (
          <div className="border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-display text-lg text-slate-700">
              Nothing here yet.
            </p>
            {!user.blocked && (
              <Link
                href="/plan"
                className="mt-3 inline-block font-mono text-[11px] uppercase tracking-label text-slate-600 underline decoration-citron-400 decoration-2 underline-offset-4 hover:text-slate-900"
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

      {/* The route through the wizard */}
      <section id="how">
        <h2 className="eyebrow mb-4">The six sections</h2>
        <ol className="border-t border-slate-300">
          {STEPS.map((step, i) => (
            <li
              key={step.id}
              className="grid gap-x-5 gap-y-1 border-b border-slate-200 py-5 sm:grid-cols-[3rem_14rem_1fr]"
            >
              <span className="font-mono text-xs tracking-label text-slate-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-lg font-semibold leading-snug text-slate-900">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                {step.blurb}
              </p>
            </li>
          ))}
          <li className="grid gap-x-5 gap-y-1 border-b border-slate-200 bg-citron-50 py-5 sm:grid-cols-[3rem_14rem_1fr]">
            <span className="font-mono text-xs tracking-label text-citron-700">
              Fin
            </span>
            <h3 className="font-display text-lg font-semibold leading-snug text-slate-900">
              Review, then protocol
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              The AI reviews every choice, corrects what doesn&apos;t hold
              together, and returns a finalized study. From there, generate the
              full protocol document — background, eligibility, analysis plan,
              data management, ethics, and what&apos;s still outstanding.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}
