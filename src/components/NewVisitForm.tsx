"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface DoctorOption {
  id: string;
  name: string | null;
  email: string | null;
  specialty: string | null;
}

export default function NewVisitForm({
  isDoctor,
  doctors,
}: {
  isDoctor: boolean;
  doctors: DoctorOption[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [doctorId, setDoctorId] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const body =
        role === "patient"
          ? { asRole: "patient", doctorId, reason }
          : { asRole: "doctor", patientEmail, reason };
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not create the request.");
      router.push(`/visits/${json.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {isDoctor && (
        <div>
          <span className="text-sm font-medium text-slate-700">
            Who are you requesting as?
          </span>
          <div className="mt-2 flex gap-2">
            <RoleButton
              active={role === "patient"}
              onClick={() => setRole("patient")}
              title="As a patient"
              sub="Request a visit with a doctor"
            />
            <RoleButton
              active={role === "doctor"}
              onClick={() => setRole("doctor")}
              title="As a doctor"
              sub="Invite a patient to a visit"
            />
          </div>
        </div>
      )}

      {role === "patient" ? (
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Doctor</span>
          {doctors.length === 0 ? (
            <p className="mt-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              No doctors are available yet. Check back once a doctor has enabled
              doctor mode.
            </p>
          ) : (
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">— Select a doctor —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.email}
                  {d.specialty ? ` — ${d.specialty}` : ""}
                </option>
              ))}
            </select>
          )}
        </label>
      ) : (
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Patient email</span>
          <input
            type="email"
            value={patientEmail}
            onChange={(e) => setPatientEmail(e.target.value)}
            required
            placeholder="patient@example.com"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <span className="mt-1 block text-xs text-slate-400">
            The patient must already have an account.
          </span>
        </label>
      )}

      <label className="block">
        <span className="text-sm font-medium text-slate-700">
          Reason for the visit{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Briefly describe what the visit is about."
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </label>

      {err && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
      )}

      <button
        type="submit"
        disabled={busy || (role === "patient" && doctors.length === 0)}
        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}

function RoleButton({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-3 py-2 text-left transition ${
        active
          ? "border-brand-600 bg-brand-50"
          : "border-slate-300 bg-white hover:border-brand-400"
      }`}
    >
      <span className="block text-sm font-medium text-slate-800">{title}</span>
      <span className="block text-xs text-slate-500">{sub}</span>
    </button>
  );
}
