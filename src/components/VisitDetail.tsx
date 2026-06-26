"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SlotEditor, { type DraftSlot } from "./SlotEditor";
import {
  STATUS_LABELS,
  STATUS_BADGE,
  MODALITY_LABELS,
  CURRENCIES,
  formatMoney,
  parseCostToCents,
  formatSlotRange,
  statusHint,
  type VisitStatus,
  type VisitModality,
  type SlotSource,
  type VisitParty,
} from "@/lib/visits";

export interface VisitView {
  id: string;
  status: VisitStatus;
  requestedBy: VisitParty;
  reason: string | null;
  modality: VisitModality | null;
  meetingLink: string | null;
  location: string | null;
  costCents: number | null;
  currency: string;
  terms: string | null;
  slotSource: SlotSource | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  termsAcceptedAt: string | null;
  cancelledBy: VisitParty | null;
  createdAt: string;
  patient: { id: string; name: string | null; email: string | null };
  doctor: { id: string; name: string | null; email: string | null; specialty: string | null };
}

export interface SlotView {
  id: string;
  start: string;
  end: string;
}

function who(u: { name: string | null; email: string | null }): string {
  return u.name || u.email || "Unknown";
}

export default function VisitDetail({
  visit,
  candidateSlots,
  viewerParty,
  readOnly,
}: {
  visit: VisitView;
  candidateSlots: SlotView[];
  viewerParty: VisitParty | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isDoctor = viewerParty === "DOCTOR";
  const isPatient = viewerParty === "PATIENT";
  const counterpart = isDoctor ? visit.patient : visit.doctor;

  async function act(path: string, body?: unknown): Promise<boolean> {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/visits/${visit.id}/${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "That action could not be completed.");
      }
      router.refresh();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const canAct = !readOnly && !!viewerParty;
  const hasTerms = visit.costCents != null && visit.modality;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/visits" className="text-sm text-slate-500 hover:text-brand-700">
        ← Back to visits
      </Link>

      {readOnly && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {viewerParty
            ? "Your account is restricted: you can view this visit but cannot act on it."
            : "Admin view — this visit belongs to other users and is read-only."}
        </div>
      )}

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isDoctor ? "Visit with " : "Visit with Dr. "}
            {who(counterpart)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {visit.requestedBy === "PATIENT" ? "Requested by the patient" : "Requested by the doctor"}
            {!isDoctor && visit.doctor.specialty ? ` · ${visit.doctor.specialty}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGE[visit.status]}`}
        >
          {STATUS_LABELS[visit.status]}
        </span>
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
        {statusHint(visit.status, isDoctor)}
      </p>

      {err && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{err}</p>
      )}

      {visit.reason && (
        <Section title="Reason for the visit">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{visit.reason}</p>
        </Section>
      )}

      {/* Agreed/proposed terms, shown once the doctor has set them */}
      {hasTerms && (
        <Section title={visit.status === "BOOKED" ? "Visit details" : "Proposed terms"}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Detail label="Cost">
              {formatMoney(visit.costCents ?? 0, visit.currency)}
            </Detail>
            <Detail label="Type">
              {visit.modality ? MODALITY_LABELS[visit.modality] : "—"}
            </Detail>
            {visit.modality === "IN_PERSON" && visit.location && (
              <Detail label="Location">{visit.location}</Detail>
            )}
            {visit.modality === "VIDEO" && visit.meetingLink && (
              <Detail label="Video link">
                <a
                  href={visit.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-brand-700 hover:underline"
                >
                  {visit.meetingLink}
                </a>
              </Detail>
            )}
            {visit.status === "BOOKED" && visit.scheduledStart && visit.scheduledEnd && (
              <Detail label="Time">
                {formatSlotRange(visit.scheduledStart, visit.scheduledEnd)}
              </Detail>
            )}
          </dl>
          {visit.terms && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Terms
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                {visit.terms}
              </p>
            </div>
          )}
          {visit.termsAcceptedAt && (
            <p className="mt-2 text-xs text-emerald-700">
              ✓ Terms and cost accepted on{" "}
              {new Date(visit.termsAcceptedAt).toLocaleString()}
            </p>
          )}
        </Section>
      )}

      {/* ── Actions ── */}

      {/* Doctor accepts a request */}
      {canAct && isDoctor && visit.status === "REQUESTED" && (
        <AcceptForm busy={busy} onAccept={(body) => act("accept", body)} />
      )}

      {/* Patient books an accepted visit */}
      {canAct && isPatient && visit.status === "ACCEPTED" && (
        <BookPanel
          visit={visit}
          slots={candidateSlots}
          busy={busy}
          onBook={(slotId) => act("book", { slotId, acceptTerms: true })}
        />
      )}

      {/* Generic action buttons */}
      {canAct && (
        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
          {isDoctor && visit.status === "REQUESTED" && (
            <button
              onClick={() => {
                if (confirm("Decline this visit request?")) act("decline");
              }}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Decline request
            </button>
          )}
          {isDoctor && visit.status === "BOOKED" && (
            <button
              onClick={() => {
                if (confirm("Mark this visit as completed?")) act("complete");
              }}
              disabled={busy}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Mark completed
            </button>
          )}
          {["REQUESTED", "ACCEPTED", "BOOKED"].includes(visit.status) && (
            <button
              onClick={() => {
                if (confirm("Cancel this visit?")) act("cancel");
              }}
              disabled={busy}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Cancel visit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}

// ── Doctor: accept a request (set cost, modality, slots) ─────────────────────

function AcceptForm({
  busy,
  onAccept,
}: {
  busy: boolean;
  onAccept: (body: unknown) => Promise<boolean>;
}) {
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [modality, setModality] = useState<VisitModality>("IN_PERSON");
  const [meetingLink, setMeetingLink] = useState("");
  const [location, setLocation] = useState("");
  const [terms, setTerms] = useState("");
  const [slotSource, setSlotSource] = useState<SlotSource>("CUSTOM");
  const [slots, setSlots] = useState<DraftSlot[]>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr(null);
    const costCents = parseCostToCents(cost);
    if (costCents == null) {
      setLocalErr("Enter a valid cost (e.g. 120 or 0 for free).");
      return;
    }
    if (modality === "VIDEO" && !meetingLink.trim()) {
      setLocalErr("Provide a video call link.");
      return;
    }
    if (slotSource === "CUSTOM" && slots.length === 0) {
      setLocalErr("Add at least one time slot, or use your existing availability.");
      return;
    }
    await onAccept({
      costCents,
      currency,
      modality,
      meetingLink: modality === "VIDEO" ? meetingLink.trim() : undefined,
      location: modality === "IN_PERSON" ? location.trim() : undefined,
      terms: terms.trim() || undefined,
      slotSource,
      slots: slotSource === "CUSTOM" ? slots : undefined,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 space-y-5 rounded-2xl border border-brand-200 bg-brand-50/40 p-5 shadow-sm"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700">
        Accept & propose terms
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Cost</span>
          <div className="mt-1 flex gap-2">
            <input
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="120"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <span className="mt-1 block text-xs text-slate-400">Enter 0 for a free visit.</span>
        </label>

        <div className="block text-sm">
          <span className="font-medium text-slate-700">Visit type</span>
          <div className="mt-1 flex gap-2">
            {(["IN_PERSON", "VIDEO"] as VisitModality[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModality(m)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  modality === m
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-brand-400"
                }`}
              >
                {MODALITY_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {modality === "VIDEO" ? (
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Video call link</span>
          <input
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="https://meet.example.com/your-room"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
      ) : (
        <label className="block text-sm">
          <span className="font-medium text-slate-700">
            Location <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Clinic name and address"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
      )}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">
          Terms <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={2}
          placeholder="e.g. Cancellation policy, what to bring, payment terms…"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </label>

      <div className="text-sm">
        <span className="font-medium text-slate-700">When can the patient come?</span>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setSlotSource("CUSTOM")}
            className={`flex-1 rounded-lg border px-3 py-2 text-left transition ${
              slotSource === "CUSTOM"
                ? "border-brand-600 bg-white"
                : "border-slate-300 bg-white hover:border-brand-400"
            }`}
          >
            <span className="block font-medium text-slate-800">Provide times now</span>
            <span className="block text-xs text-slate-500">Offer slots just for this visit</span>
          </button>
          <button
            type="button"
            onClick={() => setSlotSource("EXISTING")}
            className={`flex-1 rounded-lg border px-3 py-2 text-left transition ${
              slotSource === "EXISTING"
                ? "border-brand-600 bg-white"
                : "border-slate-300 bg-white hover:border-brand-400"
            }`}
          >
            <span className="block font-medium text-slate-800">Use my availability</span>
            <span className="block text-xs text-slate-500">Let them pick from standing slots</span>
          </button>
        </div>
      </div>

      {slotSource === "CUSTOM" ? (
        <SlotEditor slots={slots} onChange={setSlots} />
      ) : (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          The patient will choose from your open standing slots.{" "}
          <Link href="/doctor" className="font-medium text-brand-700 hover:underline">
            Manage availability →
          </Link>
        </p>
      )}

      {localErr && <p className="text-sm text-red-600">{localErr}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Accept & send to patient"}
      </button>
    </form>
  );
}

// ── Patient: book a slot and accept terms ────────────────────────────────────

function BookPanel({
  visit,
  slots,
  busy,
  onBook,
}: {
  visit: VisitView;
  slots: SlotView[];
  busy: boolean;
  onBook: (slotId: string) => Promise<boolean>;
}) {
  const [slotId, setSlotId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr(null);
    if (!slotId) {
      setLocalErr("Pick a time slot.");
      return;
    }
    if (!accepted) {
      setLocalErr("Please accept the terms and cost.");
      return;
    }
    await onBook(slotId);
  }

  const costLabel = formatMoney(visit.costCents ?? 0, visit.currency);

  return (
    <form
      onSubmit={submit}
      className="mt-6 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
        Pick a time & confirm
      </h2>

      {slots.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
          There are no open slots available right now. Please check back later or
          cancel and request again.
        </p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Available times</legend>
          {slots.map((s) => (
            <label
              key={s.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                slotId === s.id
                  ? "border-emerald-500 bg-white ring-1 ring-emerald-200"
                  : "border-slate-300 bg-white hover:border-emerald-400"
              }`}
            >
              <input
                type="radio"
                name="slot"
                value={s.id}
                checked={slotId === s.id}
                onChange={() => setSlotId(s.id)}
                className="accent-emerald-600"
              />
              <span className="text-slate-700">{formatSlotRange(s.start, s.end)}</span>
            </label>
          ))}
        </fieldset>
      )}

      <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 accent-emerald-600"
        />
        <span className="text-slate-700">
          I accept the cost of <strong>{costLabel}</strong>
          {visit.terms ? " and the terms above" : ""} for this visit.
        </span>
      </label>

      {localErr && <p className="text-sm text-red-600">{localErr}</p>}

      <button
        type="submit"
        disabled={busy || slots.length === 0}
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? "Booking…" : "Secure this slot"}
      </button>
    </form>
  );
}
