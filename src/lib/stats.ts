// Sample-size calculations for common study designs.
//
// All formulas use the standard normal approximation. They are intended for
// planning/teaching, not as a replacement for a statistician on a real study.

/** Inverse standard normal CDF (quantile). Acklam's rational approximation. */
export function normInv(p: number): number {
  if (p <= 0 || p >= 1) throw new Error("normInv: p must be in (0,1)");
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

export type Tail = "two-sided" | "one-sided";

function zAlpha(alpha: number, tail: Tail): number {
  return normInv(1 - alpha / (tail === "two-sided" ? 2 : 1));
}

export interface SampleSizeResult {
  /** Sample size per group (or total, for single-group designs). */
  perGroup: number;
  total: number;
  /** Human-readable lines describing inputs and assumptions. */
  notes: string[];
}

export interface CompareMeansInput {
  mean1: number;
  mean2: number;
  sd: number;
  alpha: number;
  power: number;
  tail: Tail;
  allocationRatio?: number; // n2 / n1, default 1
}

/** Two independent means (unpaired t-test, normal approximation). */
export function nCompareMeans(i: CompareMeansInput): SampleSizeResult {
  const k = i.allocationRatio ?? 1;
  const za = zAlpha(i.alpha, i.tail);
  const zb = normInv(i.power);
  const delta = Math.abs(i.mean1 - i.mean2);
  if (delta === 0) throw new Error("The two means must differ.");
  const n1 = ((1 + 1 / k) * Math.pow((za + zb) * i.sd, 2)) / (delta * delta);
  const n1c = Math.ceil(n1);
  const n2c = Math.ceil(n1 * k);
  return {
    perGroup: n1c,
    total: n1c + n2c,
    notes: [
      `Effect size (Cohen's d): ${(delta / i.sd).toFixed(3)}`,
      `Mean difference: ${delta}, common SD: ${i.sd}`,
      `α = ${i.alpha} (${i.tail}), power = ${i.power}`,
      k === 1
        ? `Equal groups: n = ${n1c} per group.`
        : `Allocation ratio ${k}:1 → group 1 = ${n1c}, group 2 = ${n2c}.`,
    ],
  };
}

export interface CompareProportionsInput {
  p1: number;
  p2: number;
  alpha: number;
  power: number;
  tail: Tail;
}

/** Two independent proportions (normal approximation). */
export function nCompareProportions(i: CompareProportionsInput): SampleSizeResult {
  if (i.p1 <= 0 || i.p1 >= 1 || i.p2 <= 0 || i.p2 >= 1)
    throw new Error("Proportions must be between 0 and 1 (exclusive).");
  const delta = Math.abs(i.p1 - i.p2);
  if (delta === 0) throw new Error("The two proportions must differ.");
  const za = zAlpha(i.alpha, i.tail);
  const zb = normInv(i.power);
  const pbar = (i.p1 + i.p2) / 2;
  const n =
    Math.pow(
      za * Math.sqrt(2 * pbar * (1 - pbar)) +
        zb * Math.sqrt(i.p1 * (1 - i.p1) + i.p2 * (1 - i.p2)),
      2,
    ) /
    (delta * delta);
  const nc = Math.ceil(n);
  return {
    perGroup: nc,
    total: nc * 2,
    notes: [
      `Proportions: ${i.p1} vs ${i.p2} (absolute difference ${delta.toFixed(3)})`,
      `α = ${i.alpha} (${i.tail}), power = ${i.power}`,
      `n = ${nc} per group, ${nc * 2} total.`,
    ],
  };
}

export interface MeanPrecisionInput {
  sd: number;
  marginOfError: number;
  confidence: number; // e.g. 0.95
}

/** Estimate a single mean to a target margin of error (CI half-width). */
export function nMeanPrecision(i: MeanPrecisionInput): SampleSizeResult {
  const z = zAlpha(1 - i.confidence, "two-sided");
  const n = Math.pow((z * i.sd) / i.marginOfError, 2);
  const nc = Math.ceil(n);
  return {
    perGroup: nc,
    total: nc,
    notes: [
      `Estimating one mean within ±${i.marginOfError} at ${i.confidence * 100}% confidence.`,
      `Assumed SD: ${i.sd}.`,
      `n = ${nc}.`,
    ],
  };
}

export interface ProportionPrecisionInput {
  p: number;
  marginOfError: number;
  confidence: number;
}

/** Estimate a single proportion to a target margin of error. */
export function nProportionPrecision(i: ProportionPrecisionInput): SampleSizeResult {
  if (i.p <= 0 || i.p >= 1) throw new Error("Proportion must be between 0 and 1.");
  const z = zAlpha(1 - i.confidence, "two-sided");
  const n = (z * z * i.p * (1 - i.p)) / (i.marginOfError * i.marginOfError);
  const nc = Math.ceil(n);
  return {
    perGroup: nc,
    total: nc,
    notes: [
      `Estimating one proportion (expected ${i.p}) within ±${i.marginOfError} at ${i.confidence * 100}% confidence.`,
      `n = ${nc}.`,
    ],
  };
}

export interface PairedMeansInput {
  meanDiff: number;
  sdDiff: number;
  alpha: number;
  power: number;
  tail: Tail;
}

/** Paired means (within-subject) — one-sample t on the differences. */
export function nPairedMeans(i: PairedMeansInput): SampleSizeResult {
  const delta = Math.abs(i.meanDiff);
  if (delta === 0) throw new Error("The mean difference must be non-zero.");
  if (i.sdDiff <= 0) throw new Error("SD of differences must be positive.");
  const za = zAlpha(i.alpha, i.tail);
  const zb = normInv(i.power);
  const n = Math.pow(((za + zb) * i.sdDiff) / delta, 2);
  const nc = Math.ceil(n);
  return {
    perGroup: nc,
    total: nc,
    notes: [
      `Effect size (dz): ${(delta / i.sdDiff).toFixed(3)}`,
      `Mean within-pair difference: ${delta}, SD of differences: ${i.sdDiff}`,
      `α = ${i.alpha} (${i.tail}), power = ${i.power}`,
      `n = ${nc} pairs (each measured twice).`,
    ],
  };
}

export interface OneMeanInput {
  mean: number;
  reference: number;
  sd: number;
  alpha: number;
  power: number;
  tail: Tail;
}

/** Test a single mean against a reference value (one-sample t). */
export function nOneMean(i: OneMeanInput): SampleSizeResult {
  const delta = Math.abs(i.mean - i.reference);
  if (delta === 0) throw new Error("Mean and reference must differ.");
  if (i.sd <= 0) throw new Error("SD must be positive.");
  const za = zAlpha(i.alpha, i.tail);
  const zb = normInv(i.power);
  const n = Math.pow(((za + zb) * i.sd) / delta, 2);
  const nc = Math.ceil(n);
  return {
    perGroup: nc,
    total: nc,
    notes: [
      `Detecting a shift of ${delta} from the reference (${i.reference}).`,
      `Assumed SD: ${i.sd}, effect size: ${(delta / i.sd).toFixed(3)}`,
      `α = ${i.alpha} (${i.tail}), power = ${i.power}`,
      `n = ${nc}.`,
    ],
  };
}

export interface OneProportionInput {
  p: number;
  reference: number;
  alpha: number;
  power: number;
  tail: Tail;
}

/** Test a single proportion against a reference value. */
export function nOneProportion(i: OneProportionInput): SampleSizeResult {
  if (i.p <= 0 || i.p >= 1 || i.reference <= 0 || i.reference >= 1)
    throw new Error("Proportions must be between 0 and 1 (exclusive).");
  const delta = Math.abs(i.p - i.reference);
  if (delta === 0) throw new Error("Proportion and reference must differ.");
  const za = zAlpha(i.alpha, i.tail);
  const zb = normInv(i.power);
  const n =
    Math.pow(
      za * Math.sqrt(i.reference * (1 - i.reference)) +
        zb * Math.sqrt(i.p * (1 - i.p)),
      2,
    ) /
    (delta * delta);
  const nc = Math.ceil(n);
  return {
    perGroup: nc,
    total: nc,
    notes: [
      `Expected ${i.p} vs reference ${i.reference} (difference ${delta.toFixed(3)}).`,
      `α = ${i.alpha} (${i.tail}), power = ${i.power}`,
      `n = ${nc}.`,
    ],
  };
}

export interface CorrelationInput {
  r: number;
  alpha: number;
  power: number;
  tail: Tail;
}

/** Detect a Pearson correlation different from zero (Fisher z). */
export function nCorrelation(i: CorrelationInput): SampleSizeResult {
  if (i.r <= -1 || i.r >= 1) throw new Error("Correlation must be in (-1, 1).");
  if (i.r === 0) throw new Error("Expected correlation must be non-zero.");
  const za = zAlpha(i.alpha, i.tail);
  const zb = normInv(i.power);
  const z = 0.5 * Math.log((1 + i.r) / (1 - i.r)); // Fisher transform
  const n = Math.pow((za + zb) / Math.abs(z), 2) + 3;
  const nc = Math.ceil(n);
  return {
    perGroup: nc,
    total: nc,
    notes: [
      `Detecting a correlation of r = ${i.r} (Fisher z = ${z.toFixed(3)}).`,
      `α = ${i.alpha} (${i.tail}), power = ${i.power}`,
      `n = ${nc}.`,
    ],
  };
}

export interface AnovaInput {
  groups: number;
  effectF: number; // Cohen's f
  alpha: number;
  power: number;
}

/** One-way ANOVA across k groups (Cohen's f effect size, approximation). */
export function nAnova(i: AnovaInput): SampleSizeResult {
  if (i.groups < 2) throw new Error("ANOVA needs at least 2 groups.");
  if (i.effectF <= 0) throw new Error("Effect size f must be positive.");
  // Normal-based approximation to the noncentral F. Conservative for planning;
  // confirm a final number with dedicated software (e.g. G*Power).
  const za = zAlpha(i.alpha, "two-sided");
  const zb = normInv(i.power);
  const lambda = Math.pow(za + zb, 2);
  const totalApprox = lambda / (i.effectF * i.effectF) + (i.groups - 1);
  const perGroup = Math.ceil(totalApprox / i.groups);
  return {
    perGroup,
    total: perGroup * i.groups,
    notes: [
      `${i.groups} groups, Cohen's f = ${i.effectF}.`,
      `α = ${i.alpha} (two-sided), power = ${i.power}`,
      `≈ ${perGroup} per group, ${perGroup * i.groups} total (planning approximation).`,
    ],
  };
}

/** Inflate a sample size to account for expected dropout/non-response. */
export function inflateForDropout(n: number, dropoutRate: number): number {
  if (dropoutRate < 0 || dropoutRate >= 1)
    throw new Error("Dropout rate must be in [0, 1).");
  return Math.ceil(n / (1 - dropoutRate));
}

export type CalcType =
  | "compareMeans"
  | "compareProportions"
  | "pairedMeans"
  | "oneMean"
  | "oneProportion"
  | "correlation"
  | "anova"
  | "meanPrecision"
  | "proportionPrecision";
