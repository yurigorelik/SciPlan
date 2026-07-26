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
  pairedMeans: "Paired means (within-subject)",
  oneMean: "One mean vs a reference",
  oneProportion: "One proportion vs a reference",
  correlation: "Correlation (r ≠ 0)",
  anova: "ANOVA (>2 groups)",
  meanPrecision: "Estimate a mean (precision)",
  proportionPrecision: "Estimate a proportion (precision)",
};

// Which calculation types use the alpha/power hypothesis-test inputs.
const TEST_TYPES: CalcType[] = [
  "compareMeans",
  "compareProportions",
  "pairedMeans",
  "oneMean",
  "oneProportion",
  "correlation",
  "anova",
];

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
    <label className="block">
      <span className="font-mono text-[10px] uppercase leading-tight tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field mt-1 px-2 py-1.5 font-mono"
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
    <div className="card sticky top-24 p-4">
      <p className="eyebrow">Tool</p>
      <h3 className="mb-3 mt-0.5 font-display text-lg font-semibold text-slate-900">
        Sample-size calculator
      </h3>

      <label className="block">
        <span className="font-mono text-[10px] uppercase leading-tight tracking-wide text-slate-500">
          Goal
        </span>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as CalcType);
            setResult(null);
          }}
          className="field mt-1 px-2 py-1.5"
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
        {type === "pairedMeans" && (
          <>
            <Field
              label="Mean within-pair difference"
              value={v.meanDiff || ""}
              onChange={set("meanDiff")}
            />
            <Field
              label="SD of differences"
              value={v.sdDiff || ""}
              onChange={set("sdDiff")}
            />
          </>
        )}
        {type === "oneMean" && (
          <>
            <Field label="Expected mean" value={v.mean || ""} onChange={set("mean")} />
            <Field
              label="Reference value"
              value={v.reference || ""}
              onChange={set("reference")}
            />
            <Field label="Assumed SD" value={v.sd || ""} onChange={set("sd")} />
          </>
        )}
        {type === "oneProportion" && (
          <>
            <Field
              label="Expected proportion (0-1)"
              value={v.p || ""}
              onChange={set("p")}
            />
            <Field
              label="Reference proportion (0-1)"
              value={v.reference || ""}
              onChange={set("reference")}
            />
          </>
        )}
        {type === "correlation" && (
          <Field
            label="Expected correlation r (-1 to 1)"
            value={v.r || ""}
            onChange={set("r")}
          />
        )}
        {type === "anova" && (
          <>
            <Field
              label="Number of groups"
              value={v.groups || ""}
              onChange={set("groups")}
            />
            <Field
              label="Effect size (Cohen's f)"
              value={v.effectF || ""}
              onChange={set("effectF")}
            />
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

        {TEST_TYPES.includes(type) && (
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
        className="btn btn-primary mt-4 w-full"
      >
        {loading ? "Calculating…" : "Calculate"}
      </button>

      {error && (
        <p className="mt-3 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 border-l-2 border-citron-400 bg-citron-50 p-3 text-sm">
          <p className="font-mono text-xl font-semibold text-slate-900">
            {result.perGroup === result.total
              ? `N = ${result.total}`
              : `${result.perGroup} / group · ${result.total} total`}
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
              className="btn btn-secondary btn-xs mt-3"
            >
              Copy into the plan ↑
            </button>
          )}
        </div>
      )}
    </div>
  );
}
