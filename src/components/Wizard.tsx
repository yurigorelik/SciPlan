"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  STEPS,
  REVIEW_STEP,
  PlanData,
  emptyPlan,
  stepProgress,
  planProgress,
  visibleFields,
  allFields,
  isStepSkipped,
  hasValue,
  type CustomFieldDef,
  type FieldDef,
  type FieldValue,
  type FinalizeStatus,
} from "@/lib/steps";
import SampleSizeCalculator from "./SampleSizeCalculator";
import Markdown from "./Markdown";

const TABS = [...STEPS, REVIEW_STEP];

/** Marks a value the AI drafted and the student hasn't accepted yet. */
type DraftMark = { previous: FieldValue | null };

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
  const [protocol, setProtocol] = useState(initialData?.protocol || "");
  const [protocolStatus, setProtocolStatus] = useState<FinalizeStatus>(
    initialData?.protocolStatus ?? (initialData?.protocol ? "done" : "idle"),
  );
  const [protocolError, setProtocolError] = useState(
    initialData?.protocolError || "",
  );

  // AI drafting state, keyed "<stepId>:<fieldKey>" (or "<stepId>:*" for a
  // whole section).
  const [drafting, setDrafting] = useState<Set<string>>(new Set());
  const [drafted, setDrafted] = useState<Record<string, DraftMark>>({});
  const [draftError, setDraftError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isReview = current === STEPS.length;
  const step = isReview ? null : STEPS[current];
  const skipped = !!step && isStepSkipped(data, step.id);
  const progress = useMemo(() => planProgress(data), [data]);

  // ── Plan edits ───────────────────────────────────────────────────────────

  const applyValue = useCallback(
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

  function editField(stepId: string, key: string, value: FieldValue) {
    clearMark(`${stepId}:${key}`);
    applyValue(stepId, key, value);
  }

  function clearMark(token: string) {
    setDrafted((prev) => {
      if (!(token in prev)) return prev;
      const next = { ...prev };
      delete next[token];
      return next;
    });
  }

  function undoDraft(stepId: string, key: string) {
    const token = `${stepId}:${key}`;
    const mark = drafted[token];
    applyValue(stepId, key, mark?.previous ?? "");
    clearMark(token);
  }

  function removeField(stepId: string, key: string) {
    clearMark(`${stepId}:${key}`);
    setData((prev) => {
      const list = prev.removed?.[stepId] ?? [];
      if (list.includes(key)) return prev;
      return {
        ...prev,
        removed: { ...prev.removed, [stepId]: [...list, key] },
      };
    });
    setDirty(true);
  }

  function restoreField(stepId: string, key: string) {
    setData((prev) => ({
      ...prev,
      removed: {
        ...prev.removed,
        [stepId]: (prev.removed?.[stepId] ?? []).filter((k) => k !== key),
      },
    }));
    setDirty(true);
  }

  function toggleSkipStep(stepId: string) {
    setData((prev) => {
      const list = prev.skippedSteps ?? [];
      return {
        ...prev,
        skippedSteps: list.includes(stepId)
          ? list.filter((s) => s !== stepId)
          : [...list, stepId],
      };
    });
    setDirty(true);
  }

  function addCustomField(stepId: string, label: string, type: CustomFieldDef["type"]) {
    const key = `custom:${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    setData((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [stepId]: [...(prev.customFields?.[stepId] ?? []), { key, label, type }],
      },
    }));
    setDirty(true);
  }

  function deleteCustomField(stepId: string, key: string) {
    clearMark(`${stepId}:${key}`);
    setData((prev) => {
      const answers = { ...(prev.answers[stepId] ?? {}) };
      delete answers[key];
      return {
        ...prev,
        answers: { ...prev.answers, [stepId]: answers },
        customFields: {
          ...prev.customFields,
          [stepId]: (prev.customFields?.[stepId] ?? []).filter(
            (f) => f.key !== key,
          ),
        },
        removed: {
          ...prev.removed,
          [stepId]: (prev.removed?.[stepId] ?? []).filter((k) => k !== key),
        },
      };
    });
    setDirty(true);
  }

  // ── AI drafting ──────────────────────────────────────────────────────────

  function startDraft(token: string) {
    setDraftError(null);
    setDrafting((prev) => new Set(prev).add(token));
  }

  function endDraft(token: string) {
    setDrafting((prev) => {
      const next = new Set(prev);
      next.delete(token);
      return next;
    });
  }

  async function draftField(stepId: string, field: FieldDef) {
    const token = `${stepId}:${field.key}`;
    startDraft(token);
    try {
      const res = await fetch("/api/ai/fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: data, stepId, fieldKey: field.key }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not draft an answer.");
      const previous = data.answers[stepId]?.[field.key] ?? null;
      applyValue(stepId, field.key, json.value as FieldValue);
      setDrafted((prev) => ({ ...prev, [token]: { previous } }));
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Could not draft an answer.");
    } finally {
      endDraft(token);
    }
  }

  async function draftSection(stepId: string) {
    const token = `${stepId}:*`;
    startDraft(token);
    try {
      const res = await fetch("/api/ai/fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: data, stepId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not draft this section.");
      const values = (json.values ?? {}) as Record<string, FieldValue>;
      const keys = Object.keys(values);
      if (!keys.length) {
        setDraftError("Nothing left to draft in this section.");
        return;
      }
      setData((prev) => ({
        ...prev,
        answers: {
          ...prev.answers,
          [stepId]: { ...prev.answers[stepId], ...values },
        },
      }));
      setDirty(true);
      setDrafted((prev) => {
        const next = { ...prev };
        for (const k of keys) next[`${stepId}:${k}`] = { previous: null };
        return next;
      });
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Could not draft this section.");
    } finally {
      endDraft(token);
    }
  }

  // ── Persistence ──────────────────────────────────────────────────────────

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
      setSaveMsg(
        planId ? "All changes saved" : "Saved — this plan now has its own link.",
      );
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  // ── Background jobs (review + protocol) ──────────────────────────────────

  const poll = useCallback((id: string) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    const tick = async () => {
      let keepGoing = true;
      try {
        const res = await fetch(`/api/plans/${id}`, { cache: "no-store" });
        if (res.ok) {
          const plan = await res.json();
          const d = (plan.data as PlanData) ?? {};

          if (d.finalizeStatus === "done") {
            setStatus("done");
            setOutput(d.summary || "");
          } else if (d.finalizeStatus === "error") {
            setStatus("error");
            setFinalizeError(d.finalizeError || "The AI review failed.");
          }

          if (d.protocolStatus === "done") {
            setProtocolStatus("done");
            setProtocol(d.protocol || "");
          } else if (d.protocolStatus === "error") {
            setProtocolStatus("error");
            setProtocolError(
              d.protocolError || "The protocol could not be generated.",
            );
          }

          if (d.finalizeStatus === "done" || d.finalizeStatus === "error") {
            setData((p) => ({
              ...p,
              summary: d.summary,
              finalizedAt: d.finalizedAt,
              finalizeStatus: d.finalizeStatus,
              finalizeError: d.finalizeError,
              protocol: d.protocol,
              protocolAt: d.protocolAt,
              protocolStatus: d.protocolStatus,
              protocolError: d.protocolError,
            }));
          }

          keepGoing =
            d.finalizeStatus === "processing" || d.protocolStatus === "processing";
        }
      } catch {
        // transient error — keep polling
      }
      if (keepGoing) pollRef.current = setTimeout(tick, 4000);
    };
    pollRef.current = setTimeout(tick, 3000);
  }, []);

  // Resume polling if a job was already running when the page loaded.
  useEffect(() => {
    if (
      planId &&
      (initialData?.finalizeStatus === "processing" ||
        initialData?.protocolStatus === "processing")
    ) {
      poll(planId);
    }
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function generateProtocol() {
    setProtocolStatus("processing");
    setProtocolError("");
    setData((p) => ({ ...p, protocolStatus: "processing" }));
    try {
      const id = await persist({ protocolStatus: "processing" });
      const res = await fetch(`/api/plans/${id}/protocol`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Could not start the protocol.");
      }
      poll(id);
    } catch (e) {
      setProtocolStatus("error");
      setProtocolError(
        e instanceof Error ? e.message : "Could not generate the protocol.",
      );
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  function go(delta: number) {
    setCurrent((c) => {
      let next = c + delta;
      while (next > 0 && next < STEPS.length && isStepSkipped(data, STEPS[next].id)) {
        next += delta;
      }
      return Math.max(0, Math.min(TABS.length - 1, next));
    });
  }

  const removedKeys = step ? (data.removed?.[step.id] ?? []) : [];
  const removedFields = step
    ? allFields(data, step).filter((f) => removedKeys.includes(f.key))
    : [];
  const pendingCount = step
    ? visibleFields(data, step).filter(
        (f) => !hasValue(data.answers[step.id]?.[f.key]),
      ).length
    : 0;

  return (
    <div>
      {readOnly && (
        <div className="mb-6 flex items-center gap-2 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <LockIcon />
          {readOnlyReason || "You are viewing this plan in read-only mode."}
        </div>
      )}

      {/* Title + save state */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-300 pb-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1">Research plan</p>
          <input
            value={data.title}
            onChange={(e) => {
              setData((p) => ({ ...p, title: e.target.value }));
              setDirty(true);
            }}
            disabled={readOnly}
            aria-label="Plan title"
            className="w-full border-b border-transparent bg-transparent font-display text-3xl font-semibold leading-tight text-slate-900 hover:border-slate-300 focus:border-brand-700 focus:outline-none disabled:hover:border-transparent"
          />
        </div>
        {!readOnly && (
          <div className="flex items-center gap-3 text-sm">
            {saving ? (
              <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-label text-slate-400">
                <Spinner className="border-slate-300 border-t-slate-600" />
                Saving
              </span>
            ) : dirty && planId ? (
              <span className="font-mono text-[11px] uppercase tracking-label text-slate-400">
                Unsaved
              </span>
            ) : (
              saveMsg && (
                <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-label text-emerald-700">
                  <CheckIcon className="h-3 w-3" />
                  {saveMsg}
                </span>
              )
            )}
            {!planId && (
              <button onClick={save} disabled={saving} className="btn btn-primary">
                Save &amp; get link
              </button>
            )}
          </div>
        )}
      </div>

      {/* Section rail */}
      <nav className="mb-4">
        <ol className="flex flex-wrap gap-px border border-slate-300 bg-slate-300">
          {TABS.map((s, i) => {
            const isCurrent = i === current;
            const isReviewTab = i === STEPS.length;
            const stepSkipped = !isReviewTab && isStepSkipped(data, s.id);
            const p = isReviewTab || stepSkipped ? null : stepProgress(data, STEPS[i]);
            const complete = !!p && p.total > 0 && p.filled === p.total;
            return (
              <li key={s.id} className="min-w-0 flex-1">
                <button
                  onClick={() => setCurrent(i)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`flex h-full w-full flex-col gap-0.5 px-3 py-2 text-left transition ${
                    isCurrent
                      ? "bg-brand-700 text-white"
                      : "bg-white text-slate-700 hover:bg-citron-50"
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] uppercase tracking-label ${
                      isCurrent ? "text-citron-300" : "text-slate-400"
                    }`}
                  >
                    {isReviewTab ? "Fin" : String(i + 1).padStart(2, "0")}
                    {complete && !isCurrent && " ✓"}
                    {stepSkipped && " —"}
                  </span>
                  <span
                    className={`truncate text-[13px] font-medium ${
                      stepSkipped && !isCurrent
                        ? "text-slate-400 line-through"
                        : ""
                    }`}
                  >
                    {s.short}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Progress */}
      <div className="mb-8 flex items-center gap-3">
        <div className="h-2 flex-1 border border-slate-300 bg-white p-px">
          <div
            className="h-full bg-citron-300 transition-all duration-500"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-label text-slate-500">
          {progress.filled}/{progress.total} answered
        </span>
      </div>

      {isReview ? (
        <ReviewPanel
          data={data}
          summary={output}
          status={status}
          error={finalizeError}
          protocol={protocol}
          protocolStatus={protocolStatus}
          protocolError={protocolError}
          readOnly={readOnly}
          onFinalize={finalize}
          onProtocol={generateProtocol}
          onJump={setCurrent}
        />
      ) : (
        <div
          className={`grid gap-6 ${
            step!.id === "sampleSize" && !skipped
              ? "lg:grid-cols-[1fr_23rem]"
              : "mx-auto w-full max-w-4xl"
          }`}
        >
          <div className="card p-0">
            {/* Section header */}
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">
                    Section {String(current + 1).padStart(2, "0")} /{" "}
                    {String(STEPS.length).padStart(2, "0")}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">
                    {step!.title}
                  </h2>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => toggleSkipStep(step!.id)}
                    className="btn btn-secondary btn-xs shrink-0"
                  >
                    {skipped ? "Restore section" : "Skip this section"}
                  </button>
                )}
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                {step!.blurb}
              </p>
            </div>

            {skipped ? (
              <div className="px-6 py-10 text-center">
                <p className="font-display text-lg text-slate-700">
                  This section is skipped.
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Its questions are left out of your plan and out of the AI
                  review — the review is told you left them out on purpose.
                </p>
                {!readOnly && (
                  <button
                    onClick={() => toggleSkipStep(step!.id)}
                    className="btn btn-secondary mt-5"
                  >
                    Put this section back
                  </button>
                )}
              </div>
            ) : (
              <>
                {!readOnly && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-3">
                    <p className="text-xs text-slate-500">
                      Every question is optional. Draft one with AI, remove it, or
                      add your own.
                    </p>
                    <button
                      onClick={() => draftSection(step!.id)}
                      disabled={
                        drafting.has(`${step!.id}:*`) || pendingCount === 0
                      }
                      className="btn btn-secondary btn-xs shrink-0"
                    >
                      {drafting.has(`${step!.id}:*`) ? (
                        <>
                          <Spinner className="border-slate-300 border-t-slate-700" />
                          Drafting…
                        </>
                      ) : (
                        <>
                          <DraftIcon />
                          Draft the {pendingCount} unanswered
                        </>
                      )}
                    </button>
                  </div>
                )}

                {draftError && (
                  <p className="border-b border-red-200 bg-red-50 px-6 py-2.5 text-sm text-red-700">
                    {draftError}
                  </p>
                )}

                <div className="divide-y divide-slate-100">
                  {visibleFields(data, step!).map((f) => {
                    const token = `${step!.id}:${f.key}`;
                    return (
                      <FieldRow
                        key={f.key}
                        field={f}
                        value={data.answers[step!.id]?.[f.key]}
                        disabled={readOnly}
                        drafting={drafting.has(token)}
                        drafted={token in drafted}
                        onChange={(v) => editField(step!.id, f.key, v)}
                        onDraft={() => draftField(step!.id, f)}
                        onAccept={() => clearMark(token)}
                        onUndo={() => undoDraft(step!.id, f.key)}
                        onRemove={
                          f.key.startsWith("custom:")
                            ? () => deleteCustomField(step!.id, f.key)
                            : () => removeField(step!.id, f.key)
                        }
                        removeLabel={
                          f.key.startsWith("custom:") ? "Delete" : "Remove"
                        }
                      />
                    );
                  })}
                </div>

                {removedFields.length > 0 && (
                  <div className="border-t border-dashed border-slate-300 bg-slate-50 px-6 py-4">
                    <p className="eyebrow mb-2">
                      Removed from this plan · {removedFields.length}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {removedFields.map((f) => (
                        <span
                          key={f.key}
                          className="chip border-slate-300 bg-white text-slate-500"
                        >
                          <span className="line-through">{f.label}</span>
                          {!readOnly && (
                            <button
                              onClick={() => restoreField(step!.id, f.key)}
                              className="ml-1 font-semibold text-brand-700 hover:text-citron-700"
                            >
                              restore
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!readOnly && (
                  <AddQuestion
                    onAdd={(label, type) => addCustomField(step!.id, label, type)}
                  />
                )}
              </>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => go(-1)}
                disabled={current === 0}
                className="btn btn-secondary"
              >
                ← Previous
              </button>
              <button
                onClick={() => go(1)}
                className={
                  current === STEPS.length - 1
                    ? "btn btn-primary"
                    : "btn btn-secondary"
                }
              >
                {current === STEPS.length - 1 ? "Review & finalize →" : "Next →"}
              </button>
            </div>
          </div>

          {step!.id === "sampleSize" && !skipped && (
            <aside className="space-y-6">
              <SampleSizeCalculator
                onUseResult={
                  readOnly
                    ? undefined
                    : (text) => {
                        const cur = data.answers.sampleSize?.targetN;
                        const prev = typeof cur === "string" ? cur : "";
                        editField(
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

// ── One question ───────────────────────────────────────────────────────────

function FieldRow({
  field,
  value,
  disabled,
  drafting,
  drafted,
  onChange,
  onDraft,
  onAccept,
  onUndo,
  onRemove,
  removeLabel,
}: {
  field: FieldDef;
  value: FieldValue | undefined;
  disabled: boolean;
  drafting: boolean;
  drafted: boolean;
  onChange: (v: FieldValue) => void;
  onDraft: () => void;
  onAccept: () => void;
  onUndo: () => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  const id = `f-${field.key.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div
      className={`group relative px-6 py-4 transition ${
        drafted ? "bg-citron-50" : ""
      }`}
    >
      {drafted && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] bg-citron-400"
        />
      )}
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <label htmlFor={id} className="field-label">
          {field.label}
        </label>
        {!disabled && (
          <div className="flex shrink-0 items-center gap-1 opacity-70 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button
              type="button"
              onClick={onDraft}
              disabled={drafting}
              title="Let the AI draft this answer"
              className="btn btn-quiet btn-xs"
            >
              {drafting ? (
                <Spinner className="border-slate-300 border-t-slate-600" />
              ) : (
                <DraftIcon />
              )}
              Draft
            </button>
            <button
              type="button"
              onClick={onRemove}
              title={`${removeLabel} this question from your plan`}
              className="btn btn-quiet btn-xs hover:text-red-700"
            >
              <CrossIcon />
              {removeLabel}
            </button>
          </div>
        )}
      </div>

      {field.help && (
        <p className="mb-1.5 text-xs text-slate-500">{field.help}</p>
      )}

      <FieldInput
        id={id}
        field={field}
        value={value}
        disabled={disabled || drafting}
        onChange={onChange}
      />

      {drafted && !disabled && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="chip border-citron-400 bg-citron-200 text-citron-900">
            AI draft — check it
          </span>
          <button onClick={onAccept} className="btn btn-quiet btn-xs">
            Looks right
          </button>
          <button onClick={onUndo} className="btn btn-quiet btn-xs">
            <UndoIcon />
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

function FieldInput({
  id,
  field,
  value,
  disabled,
  onChange,
}: {
  id: string;
  field: FieldDef;
  value: FieldValue | undefined;
  disabled: boolean;
  onChange: (v: FieldValue) => void;
}) {
  if (field.type === "select") {
    return (
      <select
        id={id}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="field"
      >
        <option value="">— Select —</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (opt: string) =>
      onChange(
        selected.includes(opt)
          ? selected.filter((s) => s !== opt)
          : [...selected, opt],
      );
    return (
      <div className="flex flex-wrap gap-1.5">
        {field.options?.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              disabled={disabled}
              onClick={() => toggle(o)}
              className={`rounded-sm border px-2.5 py-1 text-xs transition disabled:opacity-60 ${
                on
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-brand-700 hover:text-brand-800"
              }`}
            >
              {on && <span className="mr-1 text-citron-300">✓</span>}
              {o}
            </button>
          );
        })}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        id={id}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={field.rows || 2}
        disabled={disabled}
        className="field"
      />
    );
  }

  return (
    <input
      id={id}
      type="text"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      className="field"
    />
  );
}

// ── Adding your own question ───────────────────────────────────────────────

function AddQuestion({
  onAdd,
}: {
  onAdd: (label: string, type: CustomFieldDef["type"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldDef["type"]>("textarea");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd(trimmed.slice(0, 160), type);
    setLabel("");
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="border-t border-dashed border-slate-300 px-6 py-3">
        <button
          onClick={() => setOpen(true)}
          className="btn btn-quiet btn-xs text-slate-500"
        >
          <PlusIcon />
          Add your own question to this section
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border-t border-dashed border-slate-300 bg-slate-50 px-6 py-4"
    >
      <label className="field-label" htmlFor="custom-question">
        Your question
      </label>
      <input
        id="custom-question"
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. How will participants be reimbursed?"
        className="field mt-1.5"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="eyebrow">Answer as</span>
        {(["text", "textarea"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-sm border px-2.5 py-1 text-xs transition ${
              type === t
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-brand-700"
            }`}
          >
            {t === "text" ? "Short answer" : "Paragraph"}
          </button>
        ))}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-secondary btn-xs"
        >
          Cancel
        </button>
        <button type="submit" disabled={!label.trim()} className="btn btn-primary btn-xs">
          Add question
        </button>
      </div>
    </form>
  );
}

// ── Review, AI review, and protocol ────────────────────────────────────────

function ReviewPanel({
  data,
  summary,
  status,
  error,
  protocol,
  protocolStatus,
  protocolError,
  readOnly,
  onFinalize,
  onProtocol,
  onJump,
}: {
  data: PlanData;
  summary: string;
  status: FinalizeStatus;
  error: string;
  protocol: string;
  protocolStatus: FinalizeStatus;
  protocolError: string;
  readOnly: boolean;
  onFinalize: () => void;
  onProtocol: () => void;
  onJump: (index: number) => void;
}) {
  const processing = status === "processing";
  const writing = protocolStatus === "processing";

  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Final step</p>
      <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">
        {REVIEW_STEP.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {REVIEW_STEP.blurb}
      </p>

      {/* What will be sent */}
      <div className="mt-6 card">
        <p className="eyebrow border-b border-slate-200 px-4 py-2.5">
          What the AI will see
        </p>
        <ul className="divide-y divide-slate-100">
          {STEPS.map((s, i) => {
            const stepSkipped = isStepSkipped(data, s.id);
            const p = stepProgress(data, s);
            const complete = !stepSkipped && p.total > 0 && p.filled === p.total;
            const removed = (data.removed?.[s.id] ?? []).length;
            return (
              <li key={s.id}>
                <button
                  onClick={() => onJump(i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-citron-50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={`font-mono text-[10px] tracking-label ${
                        stepSkipped ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`truncate font-medium ${
                        stepSkipped
                          ? "text-slate-400 line-through"
                          : "text-slate-800"
                      }`}
                    >
                      {s.title}
                    </span>
                    {removed > 0 && !stepSkipped && (
                      <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
                        {removed} removed
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tracking-label">
                    {stepSkipped ? (
                      <span className="text-slate-400">skipped</span>
                    ) : complete ? (
                      <span className="text-emerald-700">complete</span>
                    ) : (
                      <span className="text-slate-500">
                        {p.filled}/{p.total}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {!readOnly && (
        <button
          onClick={onFinalize}
          disabled={processing}
          className="btn btn-primary mt-6"
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
        <p className="mt-3 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your plan is being finalized. This runs in the background — you can
          leave this page and it will appear in <strong>My plans</strong> when
          it&apos;s ready. This page updates itself too.
        </p>
      )}

      {status === "error" && (
        <p className="mt-3 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "The AI review failed. Please try again."}
        </p>
      )}

      {summary ? (
        <DocumentCard
          title="Finalized study"
          stamp={data.finalizedAt}
          filename={fileBase(data.title)}
          body={summary}
          heading={data.title}
        />
      ) : (
        !readOnly &&
        !processing && (
          <p className="mt-5 border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
            When you submit, SciPlan sends your selected options and notes to the
            AI. You don&apos;t chat with it — it reviews your inputs, corrects
            inconsistent choices, and returns a finalized study with a summary.
          </p>
        )
      )}

      {/* Protocol */}
      {summary && (
        <section className="mt-10 border-t border-slate-300 pt-8">
          <p className="eyebrow">After the review</p>
          <h3 className="mt-1 font-display text-xl font-semibold text-slate-900">
            Full study protocol
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Turn the finalized study into the complete protocol document you
            would hand to a supervisor or an ethics committee — background,
            eligibility, measurement, the statistical analysis plan, data
            management, ethics, and a checklist of what is still outstanding.
          </p>

          {!readOnly && (
            <button
              onClick={onProtocol}
              disabled={writing}
              className="btn btn-primary mt-4"
            >
              {writing && <Spinner className="border-white/40 border-t-white" />}
              {writing
                ? "Writing the protocol…"
                : protocol
                  ? "Regenerate protocol"
                  : "Generate the protocol"}
            </button>
          )}

          {writing && (
            <p className="mt-3 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              The protocol is long, so it is written in the background. You can
              leave this page — it will be here when you come back.
            </p>
          )}

          {protocolStatus === "error" && (
            <p className="mt-3 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {protocolError || "The protocol could not be generated."}
            </p>
          )}

          {protocol && (
            <DocumentCard
              title="Study protocol"
              stamp={data.protocolAt}
              filename={`${fileBase(data.title)}-protocol`}
              body={protocol}
              heading={`${data.title} — study protocol`}
              printable
            />
          )}
        </section>
      )}
    </div>
  );
}

/** A generated document with copy / download / print actions. */
function DocumentCard({
  title,
  stamp,
  filename,
  body,
  heading,
  printable = false,
}: {
  title: string;
  stamp?: string;
  filename: string;
  body: string;
  heading: string;
  printable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — ignore.
    }
  }

  function download() {
    const blob = new Blob([`# ${heading}\n\n${body}`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`card mt-6 ${printable ? "print-region" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="eyebrow text-slate-700">{title}</span>
          {stamp && (
            <span className="font-mono text-[10px] text-slate-400">
              · {new Date(stamp).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 print-hide">
          <button onClick={copy} className="btn btn-secondary btn-xs">
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button onClick={download} className="btn btn-secondary btn-xs">
            Download .md
          </button>
          {printable && (
            <button
              onClick={() => window.print()}
              className="btn btn-secondary btn-xs"
            >
              <PrinterIcon />
              Print / PDF
            </button>
          )}
        </div>
      </div>
      <div className="px-6 py-6">
        <Markdown>{body}</Markdown>
      </div>
    </div>
  );
}

function fileBase(title: string): string {
  return (
    title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "") ||
    "sciplan-study"
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 ${className}`}
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

function DraftIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M2 14l1-3.2L10.4 3.4a1.4 1.4 0 0 1 2 0l.2.2a1.4 1.4 0 0 1 0 2L5.2 13 2 14Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M9.4 4.4 11.6 6.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M3 8a5 5 0 1 1 1.6 3.7M3 4.5V8h3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrinterIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M4.5 6V2.5h7V6M4.5 11.5h7v2h-7v-2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 12H2.5V6.5h11V12h-2"
        stroke="currentColor"
        strokeWidth="1.3"
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
        rx="1"
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
