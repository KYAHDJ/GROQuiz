import { NextResponse } from "next/server";
import { chatWithFallback, FAST_MODEL, parseJsonContent } from "@/lib/groq";
import type { ClarifyResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ClarifyRequest {
  question: string;
  options?: string[];
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: ClarifyRequest;
  try {
    body = (await req.json()) as ClarifyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "No question provided" }, { status: 400 });
  }

  const fallbackAnalogy = `Think of "${question.slice(0, 60)}…" like a recipe: every step builds on the one before it. Break it into parts and tackle each piece one at a time.`;

  try {
    const raw = await chatWithFallback({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a friendly tutor who explains complex ideas with simple, memorable real-world analogies. Respond with ONLY a JSON object in this format: {\"analogy\": \"string\"}. Keep the analogy under 80 words.",
        },
        {
          role: "user",
          content: `Rewrite this question as a simpler real-world analogy so a fifth grader could understand the underlying concept:\n\nQuestion: ${question}\n\nRespond with only the JSON object.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_tokens: 800,
    });

    const parsed = parseJsonContent(raw);
    const analogy =
      typeof parsed !== "string" && typeof parsed.analogy === "string" && parsed.analogy.trim()
        ? parsed.analogy.trim()
        : typeof parsed === "string" && parsed.trim()
          ? parsed.trim()
          : fallbackAnalogy;

    return NextResponse.json({ analogy } satisfies ClarifyResponse, { status: 200 });
  } catch (err) {
    console.error("clarify error:", err);
    return NextResponse.json({ analogy: fallbackAnalogy } satisfies ClarifyResponse, { status: 200 });
  }
}