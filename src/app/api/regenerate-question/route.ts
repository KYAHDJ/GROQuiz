import { NextResponse } from "next/server";
import { chatWithFallback, DEFAULT_MODEL, DIFFICULTY_READABILITY, parseJsonContent } from "@/lib/groq";
import type { Difficulty, FlashcardQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RegenerateRequest {
  text: string;
  topics?: string;
  difficulty: number;
  avoid: string[];
}

const ANGLES = [
  "cause-and-effect",
  "comparison",
  "what-would-happen-if",
  "apply-it-to-a-real-situation",
  "definition-in-fresh-words",
  "spot-the-mistake",
  "sequence-or-order",
  "a-tiny-story-then-a-question",
];

const OPENERS = [
  "Which of these is correct?",
  "What does this mean?",
  "Why does this happen?",
  "Think about it:",
  "Here's a little situation:",
  "A friend asks you:",
  "Can you explain why:",
  "What would change if:",
];

function fallbackQuestion(text: string, difficulty: Difficulty): FlashcardQuestion {
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 220);
  const sentence = sentences[Math.floor(Math.random() * sentences.length)] ?? text.slice(0, 160);
  const fact = sentence.length > 120 ? sentence.slice(0, 120).trimEnd() + "…" : sentence;
  const keyword =
    fact.split(/\s+/).filter((w) => w.length > 4).sort((a, b) => b.length - a.length)[0] ??
    "concept";
  const correct = keyword;
  const options = [
    correct,
    "An unrelated idea",
    `The opposite of ${keyword}`,
    "A vague, incorrect guess",
  ].sort(() => Math.random() - 0.5);
  return {
    id: `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    question: `According to the material, which statement best matches: "${fact}"`,
    options,
    correctIndex: options.findIndex((o) => o === correct),
    explanation: `Based on the source text: ${fact}`,
    initialDifficulty: difficulty,
  };
}

function extractJson(raw: string): Record<string, unknown> {
  const parsed = parseJsonContent(raw);
  if (parsed && typeof parsed === "object") return parsed;
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    const obj = JSON.parse(cleaned) as unknown;
    if (obj && typeof obj === "object") return obj as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new Error("No JSON object found in response");
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: RegenerateRequest;
  try {
    body = (await req.json()) as RegenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "No source text provided" }, { status: 400 });
  }

  const difficulty = Math.max(1, Math.min(5, Number(body.difficulty) || 3)) as Difficulty;
  const avoid = Array.isArray(body.avoid)
    ? body.avoid.map((a) => String(a)).filter((a) => a.trim()).slice(0, 20)
    : [];

  const fallback = () => fallbackQuestion(text, difficulty);

  const seed = Math.floor(Math.random() * 1_000_000);
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
  const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];

  const topicsLine = body.topics?.trim()
    ? `Focus on these topics: ${body.topics.trim()}\n`
    : "";

  const prompt = `You are an adaptive quiz AI that NEVER repeats itself. Write ONE brand-new multiple-choice question from the source material. This is round #${seed}; pick a completely fresh ${angle} approach and open it fresh (e.g. "${opener}") unless another angle fits better.

Source text:
${text.slice(0, 6000)}

${topicsLine}
Requested difficulty: ${difficulty} (1=beginner, 5=expert).
READABILITY RULE — the wording must match this level exactly:
${DIFFICULTY_READABILITY[difficulty]}

UNIQUENESS RULES — very important:
- The question, its answer, and its wording must NOT repeat or even resemble ANY of these previously used questions (from earlier in this same quiz):
${avoid.map((a) => `  - ${a}`).join("\n") || "  (none yet)"}
- Change the sentence structure, pick a different part of the material, and use different words.
- Harder difficulty means harder READING, not trick questions — the answer is still directly in the source text.

CRITICAL: Respond with ONLY a valid JSON object: {"question": {...}}. No markdown, no prose. Shape:
{
  "question": {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "correctIndex": number (0-based),
    "explanation": "string - 1-2 sentences",
    "initialDifficulty": ${difficulty}
  }
}
Randomize the position of the correct answer and use plausible distractors.`;

  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ question: fallback() }, { status: 200 });
    }

    const raw = await chatWithFallback({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: "You output strictly valid JSON objects that look exactly like the requested response shape. Never include surrounding text.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.95,
      max_tokens: 1024,
    });

    const parsed = extractJson(raw);
    const item = (parsed.question ?? null) as Record<string, unknown> | null;
    if (!item) {
      return NextResponse.json({ question: fallback() }, { status: 200 });
    }
    const options = Array.isArray(item.options)
      ? (item.options as unknown[]).map((o) => String(o)).slice(0, 4)
      : [];
    const questionText = String(item.question ?? "").trim();

    if (options.length < 2 || !questionText) {
      return NextResponse.json({ question: fallback() }, { status: 200 });
    }

    const rawIndex = item.correctIndex as number | string | undefined;
    const correctIndex =
      typeof rawIndex === "number"
        ? rawIndex
        : typeof rawIndex === "string"
          ? parseInt(rawIndex, 10)
          : 0;

    return NextResponse.json(
      {
        question: {
          id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          question: questionText,
          options,
          correctIndex:
            correctIndex >= 0 && correctIndex < options.length ? correctIndex : 0,
          explanation: String(item.explanation ?? "No explanation provided."),
          initialDifficulty: difficulty,
        } satisfies FlashcardQuestion,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("regenerate-question error:", err);
    return NextResponse.json({ question: fallback() }, { status: 200 });
  }
}