import { NextResponse } from "next/server";
import { chatWithFallback, FAST_MODEL, parseJsonContent, DIFFICULTY_READABILITY } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

interface HintRequest {
  question: string;
  options: string[];
  correctIndex: number;
  difficulty?: number;
  text?: string;
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
    return NextResponse.json({ error: "Missing question data" }, { status: 400 });
  }

  const difficulty = Math.max(1, Math.min(5, Number(body.difficulty) || 2)) as 1 | 2 | 3 | 4 | 5;
  const readability = DIFFICULTY_READABILITY[difficulty];
  const wordCap =
    difficulty === 1 ? 12 : difficulty === 2 ? 16 : difficulty === 3 ? 20 : 24;
  const style = difficulty >= 4 ? "It is OK to sound a little more clever and indirect, but still lead the way." : "";

  const source = (body.text ?? "").trim().slice(0, 4000);

  const voices = [
    "point to the exact fact in the material that answers it, in new words",
    "describe the answer using the material's own example or detail",
    "contrast the right answer with the wrong ones using material facts",
    "walk from the question's first idea straight to the clue, using the material",
  ];
  const voice = voices[Math.floor(Math.random() * voices.length)];

  const prompt = `You are a kind tutor building a hint from the actual source material. Write ONE short clue that can ONLY be answered by what the material says. This time, ${voice}.

Source material (use THIS for the clue):
${source}

Question: ${question}
Answer options: ${options.map((o) => `"${o}"`).join(", ")}
(The correct option is: "${answer}" — use it only to aim the clue, never to reveal it.)

Rules:
- ALMOST tell the learner the answer, but NEVER use the exact answer words. Get as close as you can: name the concept it points to, describe what it is, or say the material fact that proves it — just never repeat the answer text itself.
- Never quote or repeat the question.
- Always use real details from the material — never generic filler.
- Wording level for the clue: ${readability}
- Max ${wordCap} words. ${style}
- Fresh phrasing every time — never the same sentence structure as before.`;

  try {
    const raw = await chatWithFallback({
      model: FAST_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write short, fresh, almost-telling hints that are grounded in the source material and never reveal the exact answer. Respond with ONLY a JSON object: {\"hint\": \"string\"}.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_tokens: 800,
    });

    const parsed = parseJsonContent(raw);
    const hint =
      typeof parsed === "object" && typeof parsed.hint === "string" && parsed.hint.trim()
        ? parsed.hint.trim()
        : null;

    if (!hint) {
      return NextResponse.json(
        { error: "Couldn't build the hint right now." },
        { status: 503 }
      );
    }

    return NextResponse.json({ hint } satisfies HintResponse, { status: 200 });
  } catch (err) {
    console.error("hint error:", err);
    return NextResponse.json(
      { error: "Couldn't build the hint right now. It will retry automatically." },
      { status: 503 }
    );
  }
}