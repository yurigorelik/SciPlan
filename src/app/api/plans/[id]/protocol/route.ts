import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAnthropic, MODEL, PROTOCOL_SYSTEM_PROMPT } from "@/lib/anthropic";
import { asPlanData, buildPlanText, type PlanData } from "@/lib/steps";

export const runtime = "nodejs";
export const maxDuration = 300;

// Generate the full study protocol from the plan plus the AI-finalized review.
// Like the review itself this runs in the background: the document is long, and
// the student shouldn't have to keep the tab open.
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
      { error: "Protocol generation is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  const data = asPlanData(plan.data);
  if (!data.summary) {
    return NextResponse.json(
      { error: "Run the AI review first — the protocol is written from it." },
      { status: 400 },
    );
  }

  const planText = buildPlanText({ ...data, title: plan.title });
  const review = data.summary;

  const processingData: PlanData = {
    ...data,
    title: plan.title,
    protocolStatus: "processing",
    protocolError: undefined,
  };
  await prisma.plan.update({
    where: { id },
    data: { data: processingData as unknown as Prisma.InputJsonValue },
  });

  after(async () => {
    try {
      const userPrompt = [
        "The student's study plan (their selections and notes):",
        "",
        planText,
        "",
        "The finalized review of that plan, which supersedes the selections wherever it corrected them:",
        "",
        review,
        "",
        "Write the full study protocol as instructed.",
      ].join("\n");

      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: [
          {
            type: "text",
            text: PROTOCOL_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      });

      const protocol = msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();

      // Re-read so we don't clobber edits made while the AI was writing.
      const fresh = await prisma.plan.findUnique({ where: { id } });
      const freshData = fresh ? asPlanData(fresh.data) : processingData;
      const doneData: PlanData = {
        ...freshData,
        protocol,
        protocolAt: new Date().toISOString(),
        protocolStatus: "done",
        protocolError: undefined,
      };
      await prisma.plan.update({
        where: { id },
        data: { data: doneData as unknown as Prisma.InputJsonValue },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "The protocol could not be generated.";
      const fresh = await prisma.plan
        .findUnique({ where: { id } })
        .catch(() => null);
      const freshData = fresh ? asPlanData(fresh.data) : processingData;
      await prisma.plan
        .update({
          where: { id },
          data: {
            data: {
              ...freshData,
              protocolStatus: "error",
              protocolError: message,
            } as unknown as Prisma.InputJsonValue,
          },
        })
        .catch(() => {});
    }
  });

  return NextResponse.json({ status: "processing" });
}
