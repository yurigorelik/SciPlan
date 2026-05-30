"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  STEPS,
  REVIEW_STEP,
  PlanData,
  emptyPlan,
  buildPlanText,
  type FieldDef,
  type FieldValue,
} from "@/lib/steps";
import SampleSizeCalculator from "./SampleSizeCalculator";

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
  const [finalizing, setFinalizing] = useState(false);
  const [output, setOutput] = useState(initialData?.summary || "");

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

  const planText = useMemo(() => buildPlanText(data), [data]);

  async function save(extra?: Partial<PlanData>) {
    const payload = { ...data, ...extra };
    setSaving(true);
    setSaveMsg(null);
    try {
      if (planId) {
        const res = await fetch(`/api/plans/${planId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: payload.title, data: payload }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setSaveMsg("Saved.");
      } else {
        const res = await fetch("/api/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: payload.title, data: payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setPlanId(json.id);
        router.replace(`/plan/${json.id}`);
        setSaveMsg("Saved. This plan now has a shareable link.");
      }
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  // Submit the whole plan to the AI for review/finalization, then save it.
  async function finalize() {
    setFinalizing(true);
    setOutput("");
    let acc = "";
    try {
      const res = await fetch("/api/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planText }),
      });
      if (!res.ok || !res.body) {
        setOutput(await res.text());
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setOutput(acc);
      }
      const finalizedAt = new Date().toISOString();
      setData((p) => ({ ...p, summary: acc, finalizedAt }));
      await save({ summary: acc, finalizedAt });
    } catch (e) {
      setOutput(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setFinalizing(false);
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
          finalizing={finalizing}
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
  finalizing,
  readOnly,
  onFinalize,
}: {
  summary: string;
  finalizedAt?: string;
  finalizing: boolean;
  readOnly: boolean;
  onFinalize: () => void;
}) {
  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-slate-900">{REVIEW_STEP.title}</h2>
      <p className="mt-2 text-sm text-slate-600">{REVIEW_STEP.blurb}</p>

      {!readOnly && (
        <button
          onClick={onFinalize}
          disabled={finalizing}
          className="mt-5 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {finalizing
            ? "Reviewing your plan…"
            : summary
              ? "Re-run AI review"
              : "Submit for AI review & finalize"}
        </button>
      )}

      {finalizedAt && !finalizing && (
        <p className="mt-2 text-xs text-slate-400">
          Last finalized {new Date(finalizedAt).toLocaleString()}.
        </p>
      )}

      {summary ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="prose-ai whitespace-pre-wrap text-sm text-slate-700">
            {summary}
          </div>
        </div>
      ) : (
        !readOnly && (
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
