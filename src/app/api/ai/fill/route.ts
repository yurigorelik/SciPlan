import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getAnthropic,
  MODEL,
  DRAFT_SYSTEM_PROMPT,
  SECTION_DRAFT_SYSTEM_PROMPT,
} from "@/lib/anthropic";
import {
  STEPS,
  buildPlanText,
  findField,
  hasValue,
  visibleFields,
  type FieldDef,
  type FieldValue,
  type PlanData,
} from "@/lib/steps";

export const runtime = "nodejs";
export const maxDuration = 120;

// Guard rails: the plan travels in the request body (it may not be saved yet),
// so cap what we accept and how much of it reaches the model.
const MAX_BODY_CHARS = 400_000;
const MAX_CONTEXT_CHARS = 24_000;
const MAX_SECTION_QUESTIONS = 12;

/**
 * Draft an answer for one question, or for every unanswered question in a
 * section. The student asked for it explicitly — nothing here writes to the
 * plan, it only returns a suggestion the wizard applies locally (and which the
 * student can edit, undo, or remove like any other answer).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const dbUser = await prisma.user
    .findUnique({ where: { id: session.user.id } })
    .catch(() => null);
  if (dbUser?.blocked) {
    return NextResponse.json(
      { error: "Your account is restricted to viewing existing plans." },
      { status: 403 },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) {
    return NextResponse.json(
      { error: "This plan is too large to draft from." },
      { status: 413 },
    );
  }

  let body: { plan?: PlanData; stepId?: string; fieldKey?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const plan = body.plan;
  const stepId = body.stepId;
  if (!plan || typeof plan !== "object" || !stepId) {
    return NextResponse.json({ error: "Missing plan or step." }, { status: 400 });
  }
  const step = STEPS.find((s) => s.id === stepId);
  if (!step) {
    return NextResponse.json({ error: "Unknown step." }, { status: 400 });
  }

  const client = getAnthropic();
  if (!client) {
    return NextResponse.json(
      { error: "Drafting is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  const context = buildPlanText(plan).slice(0, MAX_CONTEXT_CHARS);

  // ── Single question ──────────────────────────────────────────────────────
  if (body.fieldKey) {
    const field = findField(plan, stepId, body.fieldKey);
    if (!field) {
      return NextResponse.json({ error: "Unknown question." }, { status: 400 });
    }
    try {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: [
          {
            type: "text",
            text: DRAFT_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: [
              "The student's plan so far:",
              "",
              context || "(nothing filled in yet)",
              "",
              `Section: ${step.title} — ${step.blurb}`,
              "",
              "Draft an answer for this question:",
              describeField(field),
            ].join("\n"),
          },
        ],
      });
      const text = textOf(msg.content);
      const value = coerce(field, text);
      if (value === null) {
        return NextResponse.json(
          { error: "The draft didn't fit this question. Try again." },
          { status: 502 },
        );
      }
      return NextResponse.json({ value });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Drafting failed." },
        { status: 502 },
      );
    }
  }

  // ── Whole section: only the questions still empty ─────────────────────────
  const answers = plan.answers?.[stepId] ?? {};
  const pending = visibleFields(plan, step)
    .filter((f) => !hasValue(answers[f.key]))
    .slice(0, MAX_SECTION_QUESTIONS);

  if (!pending.length) {
    return NextResponse.json({ values: {} });
  }

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: SECTION_DRAFT_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            "The student's plan so far:",
            "",
            context || "(nothing filled in yet)",
            "",
            `Section: ${step.title} — ${step.blurb}`,
            "",
            "Questions still to answer:",
            "",
            pending.map(describeField).join("\n\n"),
          ].join("\n"),
        },
      ],
    });

    const parsed = parseAnswers(textOf(msg.content));
    const values: Record<string, FieldValue> = {};
    for (const field of pending) {
      const draft = parsed[field.key];
      if (draft === undefined) continue;
      const value = coerce(field, draft);
      if (value !== null) values[field.key] = value;
    }
    return NextResponse.json({ values });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Drafting failed." },
      { status: 502 },
    );
  }
}

function textOf(content: { type: string; text?: string }[]): string {
  return content
    .map((b) => (b.type === "text" ? (b.text ?? "") : ""))
    .join("")
    .trim();
}

/** Describe one question for the model, including its allowed options. */
function describeField(f: FieldDef): string {
  const lines = [`key: ${f.key}`, `question: ${f.label}`];
  if (f.type === "select") {
    lines.push("answer with exactly one of these options, copied verbatim:");
    for (const o of f.options ?? []) lines.push(`  - ${o}`);
  } else if (f.type === "multiselect") {
    lines.push(
      'answer with one or more of these options, copied verbatim and separated by " | ":',
    );
    for (const o of f.options ?? []) lines.push(`  - ${o}`);
  } else {
    lines.push(
      f.type === "textarea"
        ? "answer in free text (at most three sentences)"
        : "answer in free text (one short phrase or sentence)",
    );
    if (f.placeholder) lines.push(`example of the shape wanted: ${f.placeholder}`);
  }
  return lines.join("\n");
}

/** Pull `<answer key="…">…</answer>` blocks out of a section draft. */
function parseAnswers(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<answer\s+key="([^"]+)"\s*>([\s\S]*?)<\/answer>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out[m[1]] = m[2].trim();
  return out;
}

/**
 * Force a draft into a value the field can actually hold. Options are matched
 * against the real list, so the model can never introduce an option the wizard
 * doesn't offer; anything unmatched is dropped rather than stored.
 */
function coerce(field: FieldDef, draft: string): FieldValue | null {
  const text = draft.replace(/^["'`]+|["'`]+$/g, "").trim();
  if (!text) return null;

  if (field.type === "select") {
    return pickOptions(field.options ?? [], text)[0] ?? null;
  }

  if (field.type === "multiselect") {
    const picked = pickOptions(field.options ?? [], text);
    return picked.length ? picked : null;
  }

  const limit = field.type === "textarea" ? 2000 : 400;
  return text.slice(0, limit);
}

/**
 * Match a draft against the allowed options.
 *
 * The whole string is tried first, because several options contain commas of
 * their own ("Lifestyle (diet, exercise, smoking)") and splitting on them first
 * would shred the option into unmatchable fragments. Separators are then tried
 * from most to least explicit, stopping at the first that matches anything.
 */
function pickOptions(options: string[], text: string): string[] {
  const exact = options.find((o) => normalize(o) === normalize(text));
  if (exact) return [exact];

  for (const separator of [/\s*\|\s*/, /\n+/, /\s*,\s*/]) {
    const parts = text
      .split(separator)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) continue;
    const picked = parts
      .map((part) => matchOption(options, part))
      .filter((v): v is string => !!v);
    if (picked.length) return [...new Set(picked)];
  }

  // Last resort: a single lightly-reworded option (trailing period, truncation).
  const fuzzy = matchOption(options, text);
  return fuzzy ? [fuzzy] : [];
}

function matchOption(options: string[], candidate: string): string | null {
  const c = normalize(candidate);
  if (!c) return null;
  const exact = options.find((o) => normalize(o) === c);
  if (exact) return exact;
  // Tolerate a truncated or lightly reworded option, but only when one option
  // is clearly meant.
  const partial = options.filter(
    (o) => normalize(o).startsWith(c) || c.startsWith(normalize(o)),
  );
  return partial.length === 1 ? partial[0] : null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‐-―]/g, "-")
    .replace(/[^a-z0-9%.:<>/+-]+/g, " ")
    .trim();
}
