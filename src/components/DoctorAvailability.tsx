"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SlotEditor, { type DraftSlot } from "./SlotEditor";
import { formatSlotRange } from "@/lib/visits";

export interface StandingSlot {
  id: string;
  start: string;
  end: string;
  booked: boolean;
}

export default function DoctorAvailability({
  initialProfile,
  initialSlots,
}: {
  initialProfile: { isDoctor: boolean; specialty: string; bio: string };
  initialSlots: StandingSlot[];
}) {
  const router = useRouter();
  const [isDoctor, setIsDoctor] = useState(initialProfile.isDoctor);
  const [specialty, setSpecialty] = useState(initialProfile.specialty);
  const [bio, setBio] = useState(initialProfile.bio);
  const [drafts, setDrafts] = useState<DraftSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function saveProfile(nextIsDoctor?: boolean) {
    setErr(null);
    setMsg(null);
    setBusy(true);
    const wantDoctor = nextIsDoctor ?? isDoctor;
    try {
      const res = await fetch("/api/doctor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDoctor: wantDoctor, specialty, bio }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save.");
      setIsDoctor(wantDoctor);
      setMsg("Saved.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function addSlots() {
    if (drafts.length === 0) return;
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/doctor/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: drafts }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not add slots.");
      setDrafts([]);
      setMsg(`Added ${json.count} slot${json.count === 1 ? "" : "s"}.`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSlot(id: string) {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/doctor/slots/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not remove the slot.");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!isDoctor) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Become a doctor</h2>
        <p className="mt-1 text-sm text-slate-600">
          Doctor mode lets patients request visits with you. You decide the cost,
          times, and whether each visit is in person or by video — per request.
        </p>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <button
          onClick={() => saveProfile(true)}
          disabled={busy}
          className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? "Enabling…" : "Enable doctor mode"}
        </button>
      </div>
    );
  }

  const futureSlots = initialSlots;

  return (
    <div className="space-y-6">
      {/* Profile */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Your profile</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Doctor mode on
          </span>
        </div>
        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Specialty</span>
            <input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. Family medicine, Dermatology"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Short bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="A sentence or two about your practice."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => saveProfile()}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            Save profile
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  "Turn off doctor mode? Patients won't be able to request new visits with you.",
                )
              )
                saveProfile(false);
            }}
            disabled={busy}
            className="text-sm font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
          >
            Turn off doctor mode
          </button>
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </section>

      {/* Standing availability */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">Standing availability</h2>
        <p className="mt-1 text-sm text-slate-600">
          Add the times you&apos;re generally open. When you accept a visit you
          can let the patient pick from these, or provide one-off times instead.
        </p>

        <div className="mt-4">
          <SlotEditor slots={drafts} onChange={setDrafts} />
          {drafts.length > 0 && (
            <button
              onClick={addSlots}
              disabled={busy}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? "Saving…" : `Save ${drafts.length} slot${drafts.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current slots
          </h3>
          {futureSlots.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
              No standing slots yet.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {futureSlots.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="text-slate-700">
                    {formatSlotRange(s.start, s.end)}
                    {s.booked && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Booked
                      </span>
                    )}
                  </span>
                  {!s.booked && (
                    <button
                      onClick={() => removeSlot(s.id)}
                      disabled={busy}
                      className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
