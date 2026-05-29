import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

let client: Anthropic | null = null;

/**
 * Returns a shared Anthropic client, or null if no API key is configured.
 * Callers should handle the null case so the app stays usable before a key
 * is added.
 */
export function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

// Frozen system prompt — kept byte-stable so prompt caching can kick in across
// requests. Step-specific context is appended in the user turn, not here.
export const SYSTEM_PROMPT = `You are SciPlan, a research-methods mentor for students planning a scientific study.

Your role is to teach and guide, not to do the work for the student. For each
request you will be given the current planning step and the student's plan so
far. Respond with clear, structured guidance tailored to that step.

Principles:
- Be concrete and practical. Prefer short paragraphs and tight bulleted lists.
- Ask focused clarifying questions when the plan is missing something essential.
- Name the methodological concepts involved (e.g. PICO, confounding, power,
  effect size) and briefly explain them so the student learns.
- Surface trade-offs and common pitfalls rather than giving one "right answer".
- When statistics are involved, explain assumptions and when they break.
- Keep total responses focused — aim for the most useful guidance, not the
  longest. Use Markdown.`;
