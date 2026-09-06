import { NextResponse } from "next/server";
import { chatWithFallback, DEFAULT_MODEL, parseJsonContent } from "@/lib/groq";
import type { FlashcardQuestion, GameStats, QuestionResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AnalysisRequest {
  topic: string;
  questions: FlashcardQuestion[];
  results: QuestionResult[];
  stats: GameStats;
}

interface AnalysisResponse {
  strengths: string[];
  weaknesses: string[];
  feedback: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: AnalysisRequest;
  try {
    body = (await req.json()) as AnalysisRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const results = Array.isArray(body.results) ? body.results : [];
  const questions = Array.isArray(body.questions) ? body.questions : [];
  const stats = body.stats as GameStats | undefined;
  const topic = body.topic?.trim() || "your material";

  const wrong = results.filter((r) => !r.correct);
  const right = results.filter((r) => r.correct);

  const wrongDetail = wrong
    .map((r) => {
      const q = questions.find((x) => x.id === r.questionId);
      return `- "${q?.question ?? "a question"}" (${r.timeTaken}s, ${r.hintsUsed} hint(s) used)`;
    })
    .join("\n");
  const rightDetail = right.length
    ? right
        .map((r) => {
          const q = questions.find((x) => x.id === r.questionId);
          return `- "${q?.question ?? "a question"}" (${r.timeTaken}s)`;
        })
        .join("\n")
    : "None answered correctly yet.";

  const fastCount = results.filter((r) => r.correct && r.timeTaken < 10).length;
  const slowCount = results.filter((r) => r.correct && r.timeTaken >= 30).length;

  const fallbackStrengths: string[] = [];
  if (right.length > 0) {
    fallbackStrengths.push(`You got ${right.length} question${right.length > 1 ? "s" : ""} right — that's a solid start.`);
  }
  if (fastCount > 0) {
    fallbackStrengths.push(`You answered ${fastCount} question${fastCount > 1 ? "s" : ""} quickly, which shows real confidence.`);
  }

  const fallbackWeaknesses: string[] = [];
  if (wrong.length > 0) {
    fallbackWeaknesses.push(`You missed ${wrong.length} question${wrong.length > 1 ? "s" : ""}. The weak spots are usually wording and small details, not the big idea.`);
  }
  if (slowCount > 0) {
    fallbackWeaknesses.push(`A few correct answers took a long time — you know the idea but hesitation means it's not automatic yet.`);
  }
  if (right.length + wrong.length === 0) {
    fallbackWeaknesses.push("No questions answered yet — start your session to get feedback.");
  }

  const fallbackFeedback =
    wrong.length === 0 && results.length > 0
      ? `Great result on "${topic}"! You've clearly got the main ideas down.`
      : wrong.length > results.length
        ? `Don't stress: wrong answers during practice are how you learn. Re-read the explanations for the questions you missed, then try again.`
        : `Good effort on "${topic}". Focus your next round on the questions you missed and you'll tighten up quickly.`;

  const fallback: AnalysisResponse = {
    strengths: fallbackStrengths.length ? fallbackStrengths : ["No strong areas identified yet — finish the session to see them."],
    weaknesses: fallbackWeaknesses.length ? fallbackWeaknesses : ["No weak spots identified — nice and steady!"] ,
    feedback: fallbackFeedback,
  };

  if (results.length === 0) {
    return NextResponse.json(fallback satisfies AnalysisResponse, { status: 200 });
  }

  const prompt = `You are a friendly study coach. A student just finished a quiz and you must give simple, encouraging feedback in plain words.

Topic: ${topic}
Results: ${results.length} answered, ${right.length} correct.
Accuracy: ${Math.round((right.length / results.length) * 100)}%

Questions they got WRONG (with time and hints used):
${wrongDetail || "- none -"}

Questions they got RIGHT:
${rightDetail}

Give feedback that is encouraging, short, and specific. Respond with ONLY a JSON object:
{
  "strengths": ["2 strengths as very short plain-language points"],
  "weaknesses": ["up to 2 weaknesses as short plain-language points, pointing at exactly what to review"],
  "feedback": "2-3 encouraging sentences, no jargon, telling them what to do next"
}`;

  try {
    const raw = await chatWithFallback({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a warm, simple study coach for beginners. Respond with ONLY valid JSON in this shape: {\"strengths\": [], \"weaknesses\": [], \"feedback\": \"\"}. Keep every string short and simple.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 800,
    });

    const parsed = parseJsonContent(raw);
    if (typeof parsed === "object") {
      const strengths = Array.isArray(parsed.strengths)
        ? parsed.strengths.map(String).filter(Boolean).slice(0, 3)
        : [];
      const weaknesses = Array.isArray(parsed.weaknesses)
        ? parsed.weaknesses.map(String).filter(Boolean).slice(0, 3)
        : [];
      const feedback = typeof parsed.feedback === "string" ? parsed.feedback.trim() : "";
      if (strengths.length || weaknesses.length || feedback) {
        const out: AnalysisResponse = {
          strengths: strengths.length
            ? strengths
            : ["You finished the session — that's the first win!"],
          weaknesses,
          feedback: feedback || fallback.feedback,
        };
        return NextResponse.json(out satisfies AnalysisResponse, { status: 200 });
      }
    }
    return NextResponse.json(fallback satisfies AnalysisResponse, { status: 200 });
  } catch (err) {
    console.error("analysis error:", err);
    return NextResponse.json(fallback satisfies AnalysisResponse, { status: 200 });
  }
}