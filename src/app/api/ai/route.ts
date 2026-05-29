import { NextRequest } from "next/server";
import { getAnthropic, MODEL, SYSTEM_PROMPT } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AiRequest {
  stepTitle: string;
  instruction: string;
  // The student's plan so far, rendered as readable text.
  planContext: string;
}

export async function POST(req: NextRequest) {
  const client = getAnthropic();
  if (!client) {
    return new Response(
      "AI is not configured yet. Add an ANTHROPIC_API_KEY environment variable to enable AI guidance.",
      { status: 503, headers: { "Content-Type": "text/plain" } },
    );
  }

  let body: AiRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  const userPrompt = [
    `Current planning step: ${body.stepTitle}`,
    "",
    "The student's plan so far:",
    body.planContext?.trim() || "(nothing filled in yet)",
    "",
    `Student's request: ${body.instruction}`,
  ].join("\n");

  // Stream the response back as plain text chunks.
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
              text: SYSTEM_PROMPT,
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
