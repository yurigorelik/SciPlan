"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  STEPS,
  REVIEW_STEP,
  PlanData,
  emptyPlan,
  stepProgress,
  type FieldDef,
  type FieldValue,
  type FinalizeStatus,
} from "@/lib/steps";
import SampleSizeCalculator from "./SampleSizeCalculator";
import Markdown from "./Markdown";

const TABS = [...STEPS, REVIEW_STEP];

export default function Wizard({
  initialData,
  initialId,
  readOnly = false,
  readOnlyReason,
}: {
  initialData?: PlanData;
  initialId?: string;
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<PlanData>(initialData ?? emptyPlan());
  const [planId, setPlanId] = useState<string | undefined>(initialId);
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [output, setOutput] = useState(initialData?.summary || "");
  const [status, setStatus] = useState<FinalizeStatus>(
    initialData?.finalizeStatus ?? (initialData?.summary ? "done" : "idle"),
  );
  const [finalizeError, setFinalizeError] = useState(
    initialData?.finalizeError || "",
  );
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isReview = current === STEPS.length;
  const step = isReview ? null : STEPS[current];

  const progress = useMemo(() => {
    let filled = 0;
    let total = 0;
    for (const s of STEPS) {
      const p = stepProgress(data, s);
      filled += p.filled;
      total += p.total;
    }
    return { filled, total, pct: total ? Math.round((filled / total) * 100) : 0 };
  }, [data]);

  const setField = useCallback(
    (stepId: string, key: string, value: FieldValue) => {
      setData((prev) => ({
        ...prev,
        answers: {
          ...prev.answers,
          [stepId]: { ...prev.answers[stepId], [key]: value },
        },
      }));
      setDirty(true);
    },
    [],
  );

  // Save the plan; returns the plan id (creating it on first save).
  const persist = useCallback(
    async (extra?: Partial<PlanData>): Promise<string> => {
      const payload = { ...data, ...extra };
      if (planId) {
        const res = await fetch(`/api/plans/${planId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: payload.title, data: payload }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        return planId;
      }
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: payload.title, data: payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPlanId(json.id);
      router.replace(`/plan/${json.id}`);
      return json.id as string;
    },
    [data, planId, router],
  );

  // Autosave: once the plan exists, debounce edits and save automatically.
  useEffect(() => {
    if (!dirty || !planId || readOnly) return;
    const t = setTimeout(async () => {
      try {
        setSaving(true);
        await persist();
        setDirty(false);
        setSaveMsg("All changes saved");
      } catch (e) {
        setSaveMsg(e instanceof Error ? e.message : "Could not save.");
      } finally {
        setSaving(false);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [dirty, data, planId, readOnly, persist]);

  // Scroll back to the top when moving between steps.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [current]);

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await persist();
      setDirty(false);
      setSaveMsg(planId ? "All changes saved" : "Saved — this plan now has its own link.");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  // Poll the plan until the background finalization finishes.
  const poll = useCallback((id: string) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    const tick = async () => {
      try {
        const res = await fetch(`/api/plans/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const plan = await res.json();
        const d = (plan.data as PlanData) ?? {};
        if (d.finalizeStatus === "done") {
          setStatus("done");
          setOutput(d.summary || "");
          setData((p) => ({ ...p, ...d }));
          return; // stop polling
        }
        if (d.finalizeStatus === "error") {
          setStatus("error");
          setFinalizeError(d.finalizeError || "The AI review failed.");
          return;
        }
      } catch {
        // transient error — keep polling
      }
      pollRef.current = setTimeout(tick, 4000);
    };
    pollRef.current = setTimeout(tick, 3000);
  }, []);

  // If the plan is already being finalized (e.g. the user came back), resume
  // polling. Clean up on unmount.
  useEffect(() => {
    if (planId && status === "processing") poll(planId);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Submit the plan for background AI finalization.
  async function finalize() {
    setStatus("processing");
    setFinalizeError("");
    setData((p) => ({ ...p, finalizeStatus: "processing" }));
    try {
      const id = await persist({ finalizeStatus: "processing" });
      const res = await fetch(`/api/plans/${id}/finalize`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Could not start the AI review.");
      }
      poll(id);
    } catch (e) {
      setStatus("error");
      setFinalizeError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div>
      {readOnly && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <LockIcon />
          {readOnlyReason || "You are viewing this plan in read-only mode."}
        </div>
      )}

      {/* Header: title + save state */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <input
          value={data.title}
          onChange={(e) => {
            setData((p) => ({ ...p, title: e.target.value }));
            setDirty(true);
          }}
          disabled={readOnly}
          aria-label="Plan title"
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 text-2xl font-bold text-slate-900 hover:border-slate-200 focus:border-brand-400 focus:outline-none disabled:hover:border-transparent"
        />
        {!readOnly && (
          <div className="flex items-center gap-3 text-sm">
            {saving ? (
              <span className="flex items-center gap-1.5 text-slate-400">
                <Spinner className="border-slate-300 border-t-slate-500" />
                Saving…
              </span>
            ) : dirty && planId ? (
              <span className="text-slate-400">Unsaved changes…</span>
            ) : (
              saveMsg && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckIcon className="h-3.5 w-3.5" />
                  {saveMsg}
                </span>
              )
            )}
            {!planId && (
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                Save & get link
              </button>
            )}
          </div>
        )}
      </div>

      {/* Step nav + overall progress */}
      <ol className="mb-3 flex flex-wrap gap-2">
        {TABS.map((s, i) => {
          const isCurrent = i === current;
          const isReviewTab = i === STEPS.length;
          const p = isReviewTab ? null : stepProgress(data, STEPS[i]);
          const complete = !!p && p.total > 0 && p.filled === p.total;
          return (
            <li key={s.id}>
              <button
                onClick={() => setCurrent(i)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                  isCurrent
                    ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                    : isReviewTab
                      ? "border-brand-200 bg-brand-50 text-brand-700 hover:border-brand-400"
                      : complete
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-500"
                        : "border-slate-300 bg-white text-slate-600 hover:border-brand-400"
                }`}
              >
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-xs ${
                    isCurrent
                      ? "bg-white/20"
                      : complete
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isReviewTab ? "✦" : complete ? "✓" : i + 1}
                </span>
                {s.short}
                {p && p.filled > 0 && !complete && (
                  <span
                    className={`text-[10px] ${isCurrent ? "text-white/70" : "text-slate-400"}`}
                  >
                    {p.filled}/{p.total}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mb-8 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-400">
          {progress.pct}% complete
        </span>
      </div>

      {isReview ? (
        <ReviewPanel
          data={data}
          summary={output}
          finalizedAt={data.finalizedAt}
          status={status}
          error={finalizeError}
          readOnly={readOnly}
          onFinalize={finalize}
          onJump={setCurrent}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
          {/* Left: the step form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Step {current + 1} of {STEPS.length}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {step!.title}
                </h2>
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {step!.blurb}
            </p>

            <div className="mt-6 space-y-5">
              {step!.fields.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={data.answers[step!.id]?.[f.key]}
                  disabled={readOnly}
                  onChange={(v) => setField(step!.id, f.key, v)}
                />
              ))}
            </div>

            <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                ← Previous
              </button>
              <button
                onClick={() => setCurrent((c) => Math.min(TABS.length - 1, c + 1))}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  current === STEPS.length - 1
                    ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
                    : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {current === STEPS.length - 1 ? "Review & finalize →" : "Next →"}
              </button>
            </div>
          </div>

          {/* Right: tools */}
          {step!.id === "sampleSize" && (
            <aside className="space-y-6">
              <SampleSizeCalculator
                onUseResult={
                  readOnly
                    ? undefined
                    : (text) => {
                        const cur = data.answers.sampleSize?.targetN;
                        const prev = typeof cur === "string" ? cur : "";
                        setField(
                          "sampleSize",
                          "targetN",
                          `${prev ? prev + "\n" : ""}${text}`,
                        );
                      }
                }
              />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldDef;
  value: FieldValue | undefined;
  disabled: boolean;
  onChange: (v: FieldValue) => void;
}) {
  if (field.type === "select") {
    return (
      <label className="block">
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
        >
          <option value="">— Select —</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (opt: string) => {
      if (selected.includes(opt)) {
        onChange(selected.filter((s) => s !== opt));
      } else {
        onChange([...selected, opt]);
      }
    };
    return (
      <div>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {field.options?.map((o) => {
            const on = selected.includes(o);
            return (
              <button
                key={o}
                type="button"
                disabled={disabled}
                onClick={() => toggle(o)}
                className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-60 ${
                  on
                    ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-700"
                }`}
              >
                {on && <span className="mr-1">✓</span>}
                {o}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="block">
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows || 2}
          disabled={disabled}
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{field.label}</span>
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
      />
    </label>
  );
}

function ReviewPanel({
  data,
  summary,
  finalizedAt,
  status,
  error,
  readOnly,
  onFinalize,
  onJump,
}: {
  data: PlanData;
  summary: string;
  finalizedAt?: string;
  status: FinalizeStatus;
  error: string;
  readOnly: boolean;
  onFinalize: () => void;
  onJump: (index: number) => void;
}) {
  const processing = status === "processing";
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — ignore.
    }
  }

  function downloadSummary() {
    const blob = new Blob([`# ${data.title}\n\n${summary}`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "sciplan-study"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-slate-900">{REVIEW_STEP.title}</h2>
      <p className="mt-2 text-sm text-slate-600">{REVIEW_STEP.blurb}</p>

      {/* Readiness checklist */}
      {!readOnly && (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {STEPS.map((s, i) => {
            const p = stepProgress(data, s);
            const complete = p.total > 0 && p.filled === p.total;
            const started = p.filled > 0;
            return (
              <button
                key={s.id}
                onClick={() => onJump(i)}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm transition hover:border-brand-400"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-xs ${
                      complete
                        ? "bg-emerald-100 text-emerald-700"
                        : started
                          ? "bg-brand-50 text-brand-700"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {complete ? "✓" : i + 1}
                  </span>
                  <span className="font-medium text-slate-700">{s.title}</span>
                </span>
                <span
                  className={`text-xs ${started ? "text-slate-500" : "text-slate-300"}`}
                >
                  {p.filled}/{p.total}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <button
          onClick={onFinalize}
          disabled={processing}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {processing && <Spinner className="border-white/40 border-t-white" />}
          {processing
            ? "Reviewing in the background…"
            : summary
              ? "Re-run AI review"
              : "Submit for AI review & finalize"}
        </button>
      )}

      {processing && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your plan is being finalized by the AI. This runs in the background —
          you can leave this page and it will appear in <strong>My plans</strong>{" "}
          when it&apos;s ready. We&apos;ll update this page automatically too.
        </p>
      )}

      {status === "error" && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "The AI review failed. Please try again."}
        </p>
      )}

      {summary ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="grid h-5 w-5 place-items-center rounded bg-emerald-600 text-[10px] text-white">
                ✓
              </span>
              Finalized study
              {finalizedAt && status === "done" && (
                <span className="font-normal text-xs text-slate-400">
                  · {new Date(finalizedAt).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copySummary}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <button
                onClick={downloadSummary}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700"
              >
                Download .md
              </button>
            </div>
          </div>
          <div className="p-6">
            <Markdown>{summary}</Markdown>
          </div>
        </div>
      ) : (
        !readOnly &&
        !processing && (
          <p className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
            When you submit, SciPlan sends your selected options and notes to the
            AI. You don&apos;t chat with the AI directly — it reviews your inputs,
            corrects inconsistent choices, and returns a finalized study with a
            summary.
          </p>
        )
      )}
    </div>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`h-3.5 w-3.5 animate-spin rounded-full border-2 ${className}`}
    />
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" aria-hidden>
      <rect
        x="3"
        y="7"
        width="10"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
