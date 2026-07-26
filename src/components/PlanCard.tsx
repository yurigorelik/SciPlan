"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface PlanSummary {
  id: string;
  title: string;
  updatedAt: string;
  finalizeStatus?: string;
  hasProtocol?: boolean;
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
    <div className="group relative h-full">
      <Link
        href={`/plan/${plan.id}`}
        className="flex h-full flex-col border border-slate-300 bg-white p-4 transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-brand-700 hover:shadow-md"
      >
        <p className="pr-7 font-display text-base font-semibold leading-snug text-slate-900">
          {plan.title}
        </p>
        <span className="mt-auto pt-3 font-mono text-[10px] uppercase tracking-label text-slate-400">
          Updated {new Date(plan.updatedAt).toLocaleDateString()}
        </span>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {plan.finalizeStatus === "processing" && (
            <span className="chip border-emerald-300 bg-emerald-50 text-emerald-800">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
              Reviewing
            </span>
          )}
          {plan.finalizeStatus === "done" && (
            <span className="chip border-emerald-300 bg-emerald-50 text-emerald-800">
              ✓ Finalized
            </span>
          )}
          {plan.finalizeStatus === "error" && (
            <span className="chip border-red-300 bg-red-50 text-red-700">
              Review failed
            </span>
          )}
          {plan.hasProtocol && (
            <span className="chip border-citron-400 bg-citron-100 text-citron-900">
              Protocol
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
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-sm text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-700 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
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
