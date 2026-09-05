import { NextResponse } from "next/server";
import { getGroqClient, FAST_MODEL } from "@/lib/groq";

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
      ? `Look for the answer that matches: "${answer}".`
      : "Read the question carefully and pick the most precise option.";
    return NextResponse.json({ hint } satisfies HintResponse, { status: 200 });
  }

  const fallbackHint = answer
    ? `The answer is related to "${answer}". Read the choices again — this option says it best.`
    : "";

  const prompt = `You are a friendly tutor giving a REALLY easy hint. Do not spell out the answer literally as a full sentence, but make it obvious by describing the answer concept in simple words any beginner understands.

Question: ${question}
Answer options: ${options.map((o) => `"${o}"`).join(", ")}

Write ONE short, plain-words clue (under 30 words) that clearly points to the correct answer (which mentions: "${answer}") so a beginner can confidently pick it.`;

  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ hint: fallbackHint } satisfies HintResponse, { status: 200 });
    }

    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write short, simple, beginner-friendly hints. Respond with ONLY a JSON object: {\"hint\": \"string\"}. Keep it under 30 words.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 800,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let hint = fallbackHint;
    try {
      const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")) as Record<string, unknown>;
      if (typeof parsed.hint === "string" && parsed.hint.trim().length > 0) {
        hint = parsed.hint.trim();
      }
    } catch {
      hint = raw.trim() || fallbackHint;
    }

    return NextResponse.json({ hint } satisfies HintResponse, { status: 200 });
  } catch (err) {
    console.error("hint error:", err);
    return NextResponse.json({ hint: fallbackHint } satisfies HintResponse, { status: 200 });
  }
}