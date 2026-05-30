import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropic, MODEL, FINALIZE_SYSTEM_PROMPT } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

interface FinalizeRequest {
  // The full plan rendered as readable text (built by the site, not the user).
  planText: string;
}

export async function POST(req: NextRequest) {
  // Require sign-in. Blocked users cannot run new finalizations.
  const session = await auth();
  if (!session?.user) {
    return new Response("You must be signed in.", { status: 401 });
  }
  const dbUser = await prisma.user
    .findUnique({ where: { id: session.user.id } })
    .catch(() => null);
  if (dbUser?.blocked) {
    return new Response(
      "Your account is restricted to viewing existing plans. You cannot create or finalize new plans.",
      { status: 403 },
    );
  }

  const client = getAnthropic();
  if (!client) {
    return new Response(
      "AI review is not configured yet. Add an ANTHROPIC_API_KEY environment variable to enable the final review.",
      { status: 503, headers: { "Content-Type": "text/plain" } },
    );
  }

  let body: FinalizeRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  const planText = body.planText?.trim();
  if (!planText) {
    return new Response("The plan is empty — fill in the steps first.", {
      status: 400,
    });
  }

  const userPrompt = [
    "Here is the student's completed study plan (their selections and notes):",
    "",
    planText,
    "",
    "Review and finalize it as instructed.",
  ].join("\n");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
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

        anthropicStream.on("text", (delta) => {
          controller.enqueue(encoder.encode(delta));
        });

        await anthropicStream.finalMessage();
        controller.close();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unexpected error from the AI service.";
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
