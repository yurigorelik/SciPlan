// Shared types and helpers for doctor-visit scheduling.
//
// The string-literal unions below mirror the Prisma enums in schema.prisma.
// They are duplicated here (rather than imported from "@prisma/client") so this
// module is safe to import from client components — importing the Prisma client
// into the browser bundle is both unnecessary and undesirable.

export type VisitStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "BOOKED"
  | "DECLINED"
  | "CANCELLED"
  | "COMPLETED";

export type VisitModality = "IN_PERSON" | "VIDEO";
export type SlotSource = "EXISTING" | "CUSTOM";
export type VisitParty = "PATIENT" | "DOCTOR";

// ── Labels & badge styles ────────────────────────────────────────────────────

export const STATUS_LABELS: Record<VisitStatus, string> = {
  REQUESTED: "Requested",
  ACCEPTED: "Awaiting booking",
  BOOKED: "Booked",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

// Tailwind classes for the status pill, keyed by status.
export const STATUS_BADGE: Record<VisitStatus, string> = {
  REQUESTED: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  ACCEPTED: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
  BOOKED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  DECLINED: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  CANCELLED: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  COMPLETED: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
};

export const MODALITY_LABELS: Record<VisitModality, string> = {
  IN_PERSON: "In person",
  VIDEO: "Video call",
};

// A short, viewer-relative description of what each status means.
export function statusHint(status: VisitStatus, viewerIsDoctor: boolean): string {
  switch (status) {
    case "REQUESTED":
      return viewerIsDoctor
        ? "Review the request: accept it (set the cost, modality, and times) or decline."
        : "Waiting for the doctor to accept and propose times and a cost.";
    case "ACCEPTED":
      return viewerIsDoctor
        ? "You proposed times and a cost. Waiting for the patient to pick a slot and accept."
        : "Pick an open slot and accept the terms and cost to confirm your visit.";
    case "BOOKED":
      return "The visit is booked. The details are below.";
    case "DECLINED":
      return "The doctor declined this request.";
    case "CANCELLED":
      return "This visit was cancelled.";
    case "COMPLETED":
      return "This visit has taken place.";
  }
}

// ── Money ────────────────────────────────────────────────────────────────────

/** Format an integer amount of minor units (cents) as a currency string. */
export function formatMoney(cents: number, currency = "USD"): string {
  if (cents === 0) return "Free";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    // Unknown currency code — fall back to a plain amount.
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/**
 * Parse a user-entered cost (e.g. "120", "120.50") into integer cents.
 * Returns null when the input is not a valid, non-negative amount.
 */
export function parseCostToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  // Allow an optional leading currency symbol and thousands separators.
  const cleaned = trimmed.replace(/[^0-9.]/g, "");
  if (cleaned === "" || !/^\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

// ── Misc helpers ─────────────────────────────────────────────────────────────

export const CURRENCIES = ["USD", "EUR", "GBP", "ILS", "CAD", "AUD"] as const;

// Slot durations offered in the slot editor (minutes).
export const DURATIONS = [15, 20, 30, 45, 60, 90] as const;

/** Whether a visit is in a terminal (no further action) state. */
export function isTerminal(status: VisitStatus): boolean {
  return status === "DECLINED" || status === "CANCELLED" || status === "COMPLETED";
}

/** A compact, human label for a slot's time range. */
export function formatSlotRange(start: string | Date, end: string | Date): string {
  const s = new Date(start);
  const e = new Date(end);
  const date = s.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time(s)} – ${time(e)}`;
}
