"use client";

import { useState } from "react";
import type { StepDef } from "@/lib/steps";

export default function AiPanel({
  step,
  planContext,
  saved,
  onSave,
}: {
  step: StepDef;
  planContext: string;
  saved: string;
  onSave: (text: string) => void;
}) {
  const [instruction, setInstruction] = useState(step.aiSuggestion);
  const [output, setOutput] = useState(saved || "");
  const [loading, setLoading] = useState(false);

  async function ask() {
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepTitle: step.title,
          instruction,
          planContext,
        }),
      });

      if (!res.body) {
        setOutput(await res.text());
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setOutput(acc);
      }
      onSave(acc);
    } catch (e) {
      setOutput(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
        <span className="grid h-5 w-5 place-items-center rounded bg-brand-600 text-[10px] text-white">
          AI
        </span>
        Ask for guidance
      </h3>
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
      />
      <button
        onClick={ask}
        disabled={loading}
        className="mt-2 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "Thinking…" : "Get AI guidance"}
      </button>

      {output && (
        <div className="mt-3 max-h-[28rem] overflow-y-auto rounded-lg bg-slate-50 p-3">
          <div className="prose-ai">{output}</div>
        </div>
      )}
    </div>
  );
}
