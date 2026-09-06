import { NextResponse } from "next/server";
import { chatWithFallback, DEFAULT_MODEL, parseJsonContent } from "@/lib/groq";
import type { GenerateQuestionsRequest, GenerateQuestionsResponse, FlashcardQuestion, Difficulty } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "beginner foundational",
  2: "easy introductory",
  3: "intermediate",
  4: "advanced",
  5: "expert challenging",
};

function fallbackQuestions(text: string, difficulty: Difficulty, count: number): FlashcardQuestion[] {
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 220);

  const questions: FlashcardQuestion[] = [];
  const source = sentences.length > 0 ? sentences : ["The learning material"];

  for (let i = 0; i < count; i++) {
    const sentence = source[i % source.length];
    const fact = sentence.length > 120 ? sentence.slice(0, 120).trimEnd() + "…" : sentence;
    const keyword =
      fact
        .split(/\s+/)
        .filter((w) => w.length > 4)
        .sort((a, b) => b.length - a.length)[0] ?? "concept";

    const correct = keyword;
    const wrong1 = "An unrelated idea";
    const wrong2 = `The opposite of ${keyword}`;
    const wrong3 = "A vague, incorrect guess";

    questions.push({
      id: `fallback-${i}-${Date.now()}`,
      question: `According to the material, which statement best matches: "${fact}"`,
      options: [correct, wrong1, wrong2, wrong3].sort(() => Math.random() - 0.5),
      correctIndex: -1,
      explanation: `Based on the source text: ${fact}`,
      initialDifficulty: difficulty,
    });

    const correctText = questions[i].options.findIndex((o) => o === correct);
    questions[i].correctIndex = correctText;
  }

  return questions;
}

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON array found in response");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function sanitizeQuestions(parsed: unknown, difficulty: Difficulty, count: number): FlashcardQuestion[] {
  if (!Array.isArray(parsed)) throw new Error("Response is not an array");
  const out: FlashcardQuestion[] = [];

  for (const item of parsed.slice(0, count)) {
    const q = item as Record<string, unknown>;
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o)).slice(0, 4) : [];
    const correctIndex =
      typeof q.correctIndex === "number"
        ? q.correctIndex
        : typeof q.correctIndex === "string"
          ? parseInt(q.correctIndex, 10)
          : -1;

    if (!options.length) continue;

    const validIndex =
      correctIndex >= 0 && correctIndex < options.length ? correctIndex : 0;
    const diff = Math.max(1, Math.min(5, Number(q.initialDifficulty) || difficulty));

    out.push({
      id: `gen-${out.length}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      question: String(q.question ?? ""),
      options,
      correctIndex: validIndex,
      explanation: String(q.explanation ?? "No explanation provided."),
      initialDifficulty: diff as Difficulty,
    });

    if (out.length >= count) break;
  }

  return out;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: GenerateQuestionsRequest;
  try {
    body = (await req.json()) as GenerateQuestionsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "No source text provided" }, { status: 400 });
  }

  const difficulty = Math.max(1, Math.min(5, Number(body.difficulty) || 3)) as Difficulty;
  const count = Math.max(3, Math.min(10, Number(body.count) || 5));
  const fallback = () => fallbackQuestions(text, difficulty, count);

  const topicsLine = body.topics?.trim()
    ? `Focus on these topics: ${body.topics.trim()}\n`
    : "";

  const prompt = `You are an expert quiz writer. Create ${count} multiple-choice flashcards from the given source material.

Source text:
${text.slice(0, 6000)}

${topicsLine}
Difficulty level: ${DIFFICULTY_LABELS[difficulty]} (1=beginner, 5=expert).

CRITICAL: Respond with ONLY a valid JSON array. No markdown, no prose around it. Each object MUST have this exact shape:
{
  "question": "string - a clear question or fill-in-the-blank prompt",
  "options": ["string", "string", "string", "string"] - exactly 4 answer choices",
  "correctIndex": number - the 0-based index of the correct option",
  "explanation": "string - 1-2 sentence explanation of why the answer is correct",
  "initialDifficulty": number - ${difficulty} (match the requested difficulty)"
}
Make the questions meaningful, test actual understanding, include plausible distractors, and randomize the position of the correct answer.`;

  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { questions: fallback(), fallback: true } satisfies GenerateQuestionsResponse,
        { status: 200 }
      );
    }

    const raw = await chatWithFallback({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: "You output strictly valid JSON arrays. Never include surrounding text.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2048,
    });

    const parsed = extractJson(raw);
    const questions = sanitizeQuestions(parsed, difficulty, count);

    if (questions.length === 0) {
      return NextResponse.json(
        { questions: fallback(), fallback: true } satisfies GenerateQuestionsResponse,
        { status: 200 }
      );
    }

    return NextResponse.json({ questions } satisfies GenerateQuestionsResponse, { status: 200 });
  } catch (err) {
    console.error("generate-questions error:", err);
    return NextResponse.json(
      { questions: fallback(), fallback: true } satisfies GenerateQuestionsResponse,
      { status: 200 }
    );
  }
}