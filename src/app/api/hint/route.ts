import { NextResponse } from "next/server";
import { chatWithFallback, FAST_MODEL, parseJsonContent } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

interface HintRequest {
  question: string;
  options: string[];
  correctIndex: number;
}

interface HintResponse {
  hint: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: HintRequest;
  try {
    body = (await req.json()) as HintRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = body.question?.trim();
  const options = Array.isArray(body.options) ? body.options.map(String) : [];
  const answer = options[body.correctIndex] ?? "";

  if (!question || !answer) {
    const hint = answer
      ? `Look for the option that matches: "${answer}".`
      : "Read the question carefully and pick the most precise option.";
    return NextResponse.json({ hint } satisfies HintResponse, { status: 200 });
  }

  const fallbackHint = `The answer is basically: ${answer}. Pick the option that says this in simple words.`;

  const prompt = `You are a kind tutor for a complete beginner. Write ONE short clue that points clearly to the right answer, in the simplest everyday words possible (like talking to a 10-year-old). Do NOT copy the answer word-for-word — say what it means simply instead.

Question: ${question}
Answer options: ${options.map((o) => `"${o}"`).join(", ")}
The right option is: "${answer}"

Rules:
- Max 15 words.
- Zero jargon, zero fancy words.
- It must make the correct choice obvious.`;

  try {
    const raw = await chatWithFallback({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write extremely simple, beginner-friendly clues. Respond with ONLY a JSON object: {\"hint\": \"string\"}.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 800,
    });

    const parsed = parseJsonContent(raw);
    const hint =
      typeof parsed === "object" && typeof parsed.hint === "string" && parsed.hint.trim()
        ? parsed.hint.trim()
        : fallbackHint;

    return NextResponse.json({ hint } satisfies HintResponse, { status: 200 });
  } catch (err) {
    console.error("hint error:", err);
    return NextResponse.json({ hint: fallbackHint } satisfies HintResponse, { status: 200 });
  }
}