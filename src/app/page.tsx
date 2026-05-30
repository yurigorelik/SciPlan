import Link from "next/link";
import { STEPS } from "@/lib/steps";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    const finalizeStatus =
      d.finalizeStatus ?? (d.summary ? "done" : undefined);
    return {
      id: p.id,
      title: p.title,
      updatedAt: p.updatedAt,
      finalizeStatus,
    };
  });

  return (
    <div>
      <section className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome{user.name ? `, ${user.name}` : ""}.
        </h1>
        <p className="text-slate-600">
          {user.blocked
            ? "Your account can view existing plans but cannot create or edit new ones."
            : "Plan a sound study step by step, then get a final AI review that finalizes it."}
        </p>
        {!user.blocked && (
          <div>
            <Link
              href="/plan"
              className="mt-3 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
            >
              Start a new plan
            </Link>
          </div>
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          My plans
        </h2>
        {plans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            You don&apos;t have any plans yet.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/plan/${p.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-400"
                >
                  <p className="font-medium text-slate-900">{p.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-slate-400">
                      Updated {new Date(p.updatedAt).toLocaleDateString()}
                    </p>
                    {p.finalizeStatus === "processing" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                        Finalizing…
                      </span>
                    )}
                    {p.finalizeStatus === "done" && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                        Finalized
                      </span>
                    )}
                    {p.finalizeStatus === "error" && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        Review failed
                      </span>
                    )}
                  </div>
                </Link>
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
              className="rounded-xl border border-slate-200 bg-white p-5"
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
