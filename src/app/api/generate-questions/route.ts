import { NextResponse } from "next/server";
import { chatWithFallback, DEFAULT_MODEL, DIFFICULTY_READABILITY, parseJsonContent, parsePdfBuffer } from "@/lib/groq";
import type { GenerateQuestionsRequest, GenerateQuestionsResponse, FlashcardQuestion, Difficulty } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const READABILITY_STYLES = [
  "fresh angle",
  "unusual angle",
  "everyday-life angle",
  "cause-and-effect angle",
  "apply-it-to-real-life angle",
];

function extractJson(raw: string): unknown[] {
  const parsed = parseJsonContent(raw);
  if (parsed && typeof parsed === "object") {
    const list = (parsed as Record<string, unknown>).questions;
    if (Array.isArray(list)) return list;
  }
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON array found in response");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as unknown[];
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

  let text = (body.text ?? "").trim();

  if (!text && Array.isArray(body.pdfs) && body.pdfs.length > 0) {
    const parts: string[] = [];
    let scanned = false;
    for (const pdf of body.pdfs.slice(0, 5)) {
      const url = typeof pdf?.url === "string" ? pdf.url : "";
      if (!url) continue;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        const len = Number(res.headers.get("content-length") ?? 0);
        if (len > 50 * 1024 * 1024) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        const parsed = await parsePdfBuffer(buf);
        if (parsed.text.trim().length >= 20) {
          parts.push(
            `Source document "${pdf.name ?? "PDF"}":\n${parsed.text}`
          );
        }
      } catch (err) {
        if (err instanceof Error && err.message === "EMPTY_TEXT") {
          scanned = true;
        }
        console.warn("generate-questions: failed to fetch/parse PDF:", err);
      }
    }
    text = parts.join("\n\n").trim();
    if (text.length < 20) {
      return NextResponse.json(
        {
          error: scanned
            ? "These PDFs have no readable text layer (they look like scans). Upload text-based PDFs or paste the text below instead."
            : "We couldn't read the uploaded PDFs. Try again or paste the text below instead.",
        },
        { status: 422 }
      );
    }
  }

  if (!text) {
    return NextResponse.json({ error: "No source text provided" }, { status: 400 });
  }

  const difficulty = Math.max(1, Math.min(5, Number(body.difficulty) || 3)) as Difficulty;
  const count = Math.max(3, Math.min(10, Number(body.count) || 5));

  const topicsLine = body.topics?.trim()
    ? `Focus on these topics: ${body.topics.trim()}\n`
    : "";

  const seed = Math.floor(Math.random() * 1_000_000);
  const style = READABILITY_STYLES[Math.floor(Math.random() * READABILITY_STYLES.length)];
  const questionTypes = [
    "definition",
    "cause-and-effect",
    "comparison",
    "what-would-happen-if",
    "apply-it-to-a-real-situation",
    "true-or-false",
    "fill-in-the-blank",
  ]
    .sort(() => Math.random() - 0.5)
    .join(", ");

  const prompt = `You are an expert quiz writer famous for NEVER repeating yourself. Create ${count} multiple-choice flashcards from the given source material. This is round #${seed} — use a ${style} this time.

Source text:
${text.slice(0, 6000)}

${topicsLine}
Requested difficulty: ${difficulty} (1=beginner, 5=expert).
READABILITY RULE — the wording itself must match this level exactly:
${DIFFICULTY_READABILITY[difficulty]}

UNIQUENESS RULES — very important:
- Each of the ${count} questions must use a DIFFERENT style and a DIFFERENT type (e.g. one definition, one cause-and-effect, one real-life application). Vary question types among: ${questionTypes}.
- No two questions may share the same sentence pattern, the same opening words, or the same correct answer.
- Write each question in your own fresh words. Never copy phrasing from the examples or from other questions.
- Harder difficulty means harder READING, not trick questions: all answers must still be directly findable in the source text.

STRICT QUALITY RULE:
- The source text may have OCR/PDF artifacts. Fix ALL of them. Broken or split words (e.g. "systema tic", "deter- mined", "mechanis m"), typos, spacing errors, and grammar mistakes MUST be corrected.
- Every question, option, and explanation MUST be grammatically correct, properly spaced, and smoothly readable English. No machine-sounding or garbled text, ever. This rule is mandatory and cannot be skipped.

CRITICAL: Respond with ONLY one valid JSON object containing a single key "questions". No markdown, no prose around it. Shape:
{
  "questions": [
    {
      "question": "string - a clear question or fill-in-the-blank prompt",
      "options": ["string", "string", "string", "string"] - exactly 4 answer choices",
      "correctIndex": number - the 0-based index of the correct option",
      "explanation": "string - 1-2 sentence explanation of why the answer is correct",
      "initialDifficulty": number - ${difficulty} (match the requested difficulty)"
    }
  ]
}
Make the questions meaningful, test actual understanding, include plausible distractors, and randomize the position of the correct answer.`;

  try {
    const raw = await chatWithFallback({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: "You output strictly valid JSON objects. Never include surrounding text.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_tokens: 2048,
    });

    const parsed = extractJson(raw);
    const questions = sanitizeQuestions(parsed, difficulty, count);

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Couldn't generate usable questions. Please try again." },
        { status: 503 }
      );
    }

    return NextResponse.json({ questions } satisfies GenerateQuestionsResponse, { status: 200 });
  } catch (err) {
    console.error("generate-questions error:", err);
    return NextResponse.json(
      { error: "Questions couldn't be generated right now. Try again in a moment." },
      { status: 503 }
    );
  }
}