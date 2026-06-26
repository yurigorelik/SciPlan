"use client";

import { useState } from "react";
import { DURATIONS, formatSlotRange } from "@/lib/visits";

export interface DraftSlot {
  start: string; // ISO
  end: string; // ISO
}

/**
 * Builds a list of time slots. Each slot is entered as a start date/time plus a
 * duration; the end is computed. Used by the doctor when proposing visit slots
 * and when managing standing availability.
 */
export default function SlotEditor({
  slots,
  onChange,
  disabled = false,
}: {
  slots: DraftSlot[];
  onChange: (slots: DraftSlot[]) => void;
  disabled?: boolean;
}) {
  const [startLocal, setStartLocal] = useState("");
  const [duration, setDuration] = useState(30);
  const [err, setErr] = useState<string | null>(null);

  function add() {
    setErr(null);
    if (!startLocal) {
      setErr("Pick a start date and time.");
      return;
    }
    const start = new Date(startLocal);
    if (isNaN(start.getTime())) {
      setErr("That start time isn't valid.");
      return;
    }
    const end = new Date(start.getTime() + duration * 60_000);
    const next: DraftSlot = { start: start.toISOString(), end: end.toISOString() };
    // Avoid exact duplicates.
    if (slots.some((s) => s.start === next.start && s.end === next.end)) {
      setErr("That slot is already in the list.");
      return;
    }
    onChange(
      [...slots, next].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      ),
    );
    setStartLocal("");
  }

  function remove(i: number) {
    onChange(slots.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Start</span>
          <input
            type="datetime-local"
            value={startLocal}
            disabled={disabled}
            onChange={(e) => setStartLocal(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Duration</span>
          <select
            value={duration}
            disabled={disabled}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={add}
          disabled={disabled}
          className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:border-brand-400 disabled:opacity-50"
        >
          + Add slot
        </button>
      </div>
      {err && <p className="mt-1.5 text-xs text-red-600">{err}</p>}

      {slots.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {slots.map((s, i) => (
            <li
              key={`${s.start}-${s.end}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="text-slate-700">{formatSlotRange(s.start, s.end)}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-xs font-medium text-slate-400 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
