import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAnthropic, MODEL, FINALIZE_SYSTEM_PROMPT } from "@/lib/anthropic";
import { buildPlanText, type PlanData } from "@/lib/steps";

export const runtime = "nodejs";
export const maxDuration = 300;

// Kick off the AI review/finalization for a plan in the background. Returns
// immediately with status "processing"; the AI result is written back to the
// plan when it completes, so the user can leave the page.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const { id } = await params;

  const plan = await prisma.plan.findUnique({ where: { id } }).catch(() => null);
  if (!plan) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

  const client = getAnthropic();
  if (!client) {
    return NextResponse.json(
      { error: "AI review is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  const data = (plan.data as PlanData) ?? { title: plan.title, answers: {} };
  const planText = buildPlanText({ ...data, title: plan.title });

  // Mark the plan as processing right away.
  const processingData: PlanData = {
    ...data,
    title: plan.title,
    finalizeStatus: "processing",
    finalizeError: undefined,
  };
  await prisma.plan.update({
    where: { id },
    data: { data: processingData as unknown as Prisma.InputJsonValue },
  });

  // Run the AI call after the response is sent. Railway runs a persistent
  // Node server, so this completes even though the client isn't waiting.
  after(async () => {
    try {
      const userPrompt = [
        "Here is the student's completed study plan (their selections and notes):",
        "",
        planText,
        "",
        "Review and finalize it as instructed.",
      ].join("\n");

      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        thinking: { type: "adaptive" },
        system: [
          {
            type: "text",
            text: FINALIZE_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      });

      const summary = msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();

      // Re-read to avoid clobbering edits made while the AI was running.
      const fresh = await prisma.plan.findUnique({ where: { id } });
      const freshData = (fresh?.data as PlanData) ?? processingData;
      const doneData: PlanData = {
        ...freshData,
        summary,
        finalizedAt: new Date().toISOString(),
        finalizeStatus: "done",
        finalizeError: undefined,
      };
      await prisma.plan.update({
        where: { id },
        data: { data: doneData as unknown as Prisma.InputJsonValue },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "The AI review failed.";
      const fresh = await prisma.plan.findUnique({ where: { id } }).catch(() => null);
      const freshData = (fresh?.data as PlanData) ?? processingData;
      await prisma.plan
        .update({
          where: { id },
          data: {
            data: {
              ...freshData,
              finalizeStatus: "error",
              finalizeError: message,
            } as unknown as Prisma.InputJsonValue,
          },
        })
        .catch(() => {});
    }
  });

  return NextResponse.json({ status: "processing" });
}
