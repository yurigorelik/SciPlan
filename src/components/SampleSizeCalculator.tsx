"use client";

import { useState } from "react";
import type { CalcType } from "@/lib/stats";

interface Result {
  perGroup: number;
  total: number;
  notes: string[];
}

const CALC_LABELS: Record<CalcType, string> = {
  compareMeans: "Compare two means (t-test)",
  compareProportions: "Compare two proportions",
  meanPrecision: "Estimate a mean (precision)",
  proportionPrecision: "Estimate a proportion (precision)",
};

function Field({
  label,
  value,
  onChange,
  step = "any",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
      />
    </label>
  );
}

export default function SampleSizeCalculator({
  onUseResult,
}: {
  onUseResult?: (text: string) => void;
}) {
  const [type, setType] = useState<CalcType>("compareMeans");
  const [v, setV] = useState<Record<string, string>>({
    alpha: "0.05",
    power: "0.8",
    confidence: "0.95",
    dropout: "0",
    allocationRatio: "1",
  });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }));

  async function calculate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/sample-size", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Calculation failed.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 font-semibold text-slate-900">Sample-size calculator</h3>

      <label className="block text-sm">
        <span className="text-slate-600">Goal</span>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as CalcType);
            setResult(null);
          }}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          {Object.entries(CALC_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {type === "compareMeans" && (
          <>
            <Field label="Mean group 1" value={v.mean1 || ""} onChange={set("mean1")} />
            <Field label="Mean group 2" value={v.mean2 || ""} onChange={set("mean2")} />
            <Field label="Common SD" value={v.sd || ""} onChange={set("sd")} />
            <Field
              label="Allocation ratio (n2/n1)"
              value={v.allocationRatio || ""}
              onChange={set("allocationRatio")}
            />
          </>
        )}
        {type === "compareProportions" && (
          <>
            <Field label="Proportion 1 (0-1)" value={v.p1 || ""} onChange={set("p1")} />
            <Field label="Proportion 2 (0-1)" value={v.p2 || ""} onChange={set("p2")} />
          </>
        )}
        {type === "meanPrecision" && (
          <>
            <Field label="Assumed SD" value={v.sd || ""} onChange={set("sd")} />
            <Field
              label="Margin of error (±)"
              value={v.marginOfError || ""}
              onChange={set("marginOfError")}
            />
            <Field
              label="Confidence (0-1)"
              value={v.confidence || ""}
              onChange={set("confidence")}
            />
          </>
        )}
        {type === "proportionPrecision" && (
          <>
            <Field label="Expected proportion" value={v.p || ""} onChange={set("p")} />
            <Field
              label="Margin of error (±)"
              value={v.marginOfError || ""}
              onChange={set("marginOfError")}
            />
            <Field
              label="Confidence (0-1)"
              value={v.confidence || ""}
              onChange={set("confidence")}
            />
          </>
        )}

        {(type === "compareMeans" || type === "compareProportions") && (
          <>
            <Field label="Alpha" value={v.alpha || ""} onChange={set("alpha")} />
            <Field label="Power" value={v.power || ""} onChange={set("power")} />
          </>
        )}
        <Field
          label="Expected dropout (0-1)"
          value={v.dropout || ""}
          onChange={set("dropout")}
        />
      </div>

      <button
        onClick={calculate}
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Calculating…" : "Calculate"}
      </button>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-lg bg-brand-50 p-3 text-sm">
          <p className="text-lg font-semibold text-brand-800">
            {result.perGroup === result.total
              ? `N = ${result.total}`
              : `${result.perGroup} per group · ${result.total} total`}
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
            {result.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          {onUseResult && (
            <button
              onClick={() =>
                onUseResult(
                  `${result.perGroup === result.total ? `N = ${result.total}` : `${result.perGroup} per group, ${result.total} total`}\n${result.notes.join("\n")}`,
                )
              }
              className="mt-3 rounded-md border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
            >
              Copy into the plan ↑
            </button>
          )}
        </div>
      )}
    </div>
  );
}
