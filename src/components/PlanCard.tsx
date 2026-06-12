"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface PlanSummary {
  id: string;
  title: string;
  updatedAt: string;
  finalizeStatus?: string;
}

export default function PlanCard({
  plan,
  canDelete,
}: {
  plan: PlanSummary;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${plan.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete the plan.");
      setBusy(false);
    }
  }

  return (
    <div className="group relative">
      <Link
        href={`/plan/${plan.id}`}
        className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow"
      >
        <p className="pr-7 font-medium text-slate-900">{plan.title}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-xs text-slate-400">
            Updated {new Date(plan.updatedAt).toLocaleDateString()}
          </p>
          {plan.finalizeStatus === "processing" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Finalizing…
            </span>
          )}
          {plan.finalizeStatus === "done" && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
              ✓ Finalized
            </span>
          )}
          {plan.finalizeStatus === "error" && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
              Review failed
            </span>
          )}
        </div>
      </Link>
      {canDelete && (
        <button
          onClick={remove}
          disabled={busy}
          title="Delete plan"
          aria-label={`Delete ${plan.title}`}
          className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-md text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
            <path
              d="M2.5 4h11M6.5 2h3M5.5 4v9a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V4M6.8 7v4M9.2 7v4"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
