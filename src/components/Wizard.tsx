"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  STEPS,
  REVIEW_STEP,
  PlanData,
  emptyPlan,
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

  const setField = useCallback(
    (stepId: string, key: string, value: FieldValue) => {
      setData((prev) => ({
        ...prev,
        answers: {
          ...prev.answers,
          [stepId]: { ...prev.answers[stepId], [key]: value },
        },
      }));
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

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await persist();
      setSaveMsg(planId ? "Saved." : "Saved. This plan now has a shareable link.");
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
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {readOnlyReason ||
            "You are viewing this plan in read-only mode."}
        </div>
      )}

      {/* Header: title + save */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <input
          value={data.title}
          onChange={(e) => setData((p) => ({ ...p, title: e.target.value }))}
          disabled={readOnly}
          className="flex-1 rounded-lg border border-transparent bg-transparent px-1 text-2xl font-bold text-slate-900 hover:border-slate-200 focus:border-brand-400 focus:outline-none disabled:hover:border-transparent"
        />
        {!readOnly && (
          <div className="flex items-center gap-3">
            {saveMsg && <span className="text-sm text-slate-500">{saveMsg}</span>}
            <button
              onClick={() => save()}
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : planId ? "Save" : "Save & get link"}
            </button>
          </div>
        )}
      </div>

      {/* Step nav */}
      <ol className="mb-8 flex flex-wrap gap-2">
        {TABS.map((s, i) => (
          <li key={s.id}>
            <button
              onClick={() => setCurrent(i)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                i === current
                  ? "border-brand-600 bg-brand-600 text-white"
                  : i === STEPS.length
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-500"
                    : "border-slate-300 bg-white text-slate-600 hover:border-brand-400"
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-xs ${
                  i === current ? "bg-white/20" : "bg-slate-100 text-slate-500"
                }`}
              >
                {i === STEPS.length ? "✓" : i + 1}
              </span>
              {s.short}
            </button>
          </li>
        ))}
      </ol>

      {isReview ? (
        <ReviewPanel
          summary={output}
          finalizedAt={data.finalizedAt}
          status={status}
          error={finalizeError}
          readOnly={readOnly}
          onFinalize={finalize}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
          {/* Left: the step form */}
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{step!.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{step!.blurb}</p>

            <div className="mt-5 space-y-4">
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

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-40"
              >
                ← Previous
              </button>
              <button
                onClick={() => setCurrent((c) => Math.min(TABS.length - 1, c + 1))}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                {current === STEPS.length - 1 ? "Review →" : "Next →"}
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
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:bg-slate-50"
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
        <div className="mt-1 flex flex-wrap gap-2">
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
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-brand-400"
                }`}
              >
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
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:bg-slate-50"
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
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:bg-slate-50"
      />
    </label>
  );
}

function ReviewPanel({
  summary,
  finalizedAt,
  status,
  error,
  readOnly,
  onFinalize,
}: {
  summary: string;
  finalizedAt?: string;
  status: FinalizeStatus;
  error: string;
  readOnly: boolean;
  onFinalize: () => void;
}) {
  const processing = status === "processing";
  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-slate-900">{REVIEW_STEP.title}</h2>
      <p className="mt-2 text-sm text-slate-600">{REVIEW_STEP.blurb}</p>

      {!readOnly && (
        <button
          onClick={onFinalize}
          disabled={processing}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {processing && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
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

      {finalizedAt && status === "done" && (
        <p className="mt-3 text-xs text-slate-400">
          Last finalized {new Date(finalizedAt).toLocaleString()}.
        </p>
      )}

      {summary ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Markdown>{summary}</Markdown>
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
