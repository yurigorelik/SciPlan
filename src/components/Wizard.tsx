"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { STEPS, PlanData, emptyPlan } from "@/lib/steps";
import AiPanel from "./AiPanel";
import SampleSizeCalculator from "./SampleSizeCalculator";

// Render the whole plan as readable text so the AI has full context.
function buildContext(data: PlanData, uptoStepIndex: number): string {
  const lines: string[] = [`Working title: ${data.title}`];
  STEPS.slice(0, uptoStepIndex + 1).forEach((step) => {
    const answers = data.answers[step.id] || {};
    const filled = step.fields
      .filter((f) => answers[f.key]?.trim())
      .map((f) => `  - ${f.label}: ${answers[f.key].trim()}`);
    if (filled.length) {
      lines.push(`\n${step.title}:`);
      lines.push(...filled);
    }
  });
  return lines.join("\n");
}

export default function Wizard({
  initialData,
  initialId,
}: {
  initialData?: PlanData;
  initialId?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<PlanData>(initialData ?? emptyPlan());
  const [planId, setPlanId] = useState<string | undefined>(initialId);
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const step = STEPS[current];
  const answers = data.answers[step.id] || {};

  const setField = useCallback(
    (key: string, value: string) => {
      setData((prev) => ({
        ...prev,
        answers: {
          ...prev.answers,
          [step.id]: { ...prev.answers[step.id], [key]: value },
        },
      }));
    },
    [step.id],
  );

  const setAiNote = useCallback(
    (text: string) => {
      setData((prev) => ({
        ...prev,
        aiNotes: { ...prev.aiNotes, [step.id]: text },
      }));
    },
    [step.id],
  );

  const planContext = useMemo(() => buildContext(data, current), [data, current]);

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    try {
      if (planId) {
        const res = await fetch(`/api/plans/${planId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: data.title, data }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        setSaveMsg("Saved.");
      } else {
        const res = await fetch("/api/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: data.title, data }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setPlanId(json.id);
        router.replace(`/plan/${json.id}`);
        setSaveMsg("Saved. This page now has a shareable link.");
      }
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header: title + save */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <input
          value={data.title}
          onChange={(e) => setData((p) => ({ ...p, title: e.target.value }))}
          className="flex-1 rounded-lg border border-transparent bg-transparent px-1 text-2xl font-bold text-slate-900 hover:border-slate-200 focus:border-brand-400 focus:outline-none"
        />
        <div className="flex items-center gap-3">
          {saveMsg && <span className="text-sm text-slate-500">{saveMsg}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : planId ? "Save" : "Save & get link"}
          </button>
        </div>
      </div>

      {/* Step nav */}
      <ol className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              onClick={() => setCurrent(i)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                i === current
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-brand-400"
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-xs ${
                  i === current ? "bg-white/20" : "bg-slate-100"
                }`}
              >
                {i + 1}
              </span>
              {s.short}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        {/* Left: the step form */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{step.title}</h2>
          <p className="mt-2 text-sm text-slate-600">{step.blurb}</p>

          <div className="mt-5 space-y-4">
            {step.fields.map((f) => (
              <label key={f.key} className="block">
                <span className="text-sm font-medium text-slate-700">
                  {f.label}
                </span>
                <textarea
                  value={answers[f.key] || ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={f.rows || 2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </label>
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
              onClick={() => setCurrent((c) => Math.min(STEPS.length - 1, c + 1))}
              disabled={current === STEPS.length - 1}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Right: tools */}
        <aside className="space-y-6">
          {step.id === "sampleSize" && (
            <SampleSizeCalculator
              onUseResult={(text) =>
                setField("result", `${answers.result ? answers.result + "\n" : ""}${text}`)
              }
            />
          )}
          <AiPanel
            step={step}
            planContext={planContext}
            saved={data.aiNotes[step.id] || ""}
            onSave={setAiNote}
          />
        </aside>
      </div>
    </div>
  );
}
