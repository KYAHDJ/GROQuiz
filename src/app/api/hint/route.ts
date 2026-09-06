import { NextResponse } from "next/server";
import { chatWithFallback, FAST_MODEL, parseJsonContent, DIFFICULTY_READABILITY } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

interface HintRequest {
  question: string;
  options: string[];
  correctIndex: number;
  difficulty?: number;
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

  const fallbackHint =
    "Think back to what this topic is really about, then pick the option that fits best — one wrong option repeats the story, not the fact.";

  const difficulty = Math.max(1, Math.min(5, Number(body.difficulty) || 2)) as 1 | 2 | 3 | 4 | 5;
  const readability = DIFFICULTY_READABILITY[difficulty];
  const wordCap =
    difficulty === 1 ? 8 : difficulty === 2 ? 12 : difficulty === 3 ? 15 : 18;
  const style = difficulty >= 4 ? "It is OK to sound a little more clever and indirect, but keep it a real clue." : "";

  const voices = [
    "describe what the answer actually is or does, without using its exact words",
    "contrast the right answer with the wrong ones",
    "give a tiny real-world example that matches the answer",
    "start with the first concept the answer involves, then nudge",
  ];
  const voice = voices[Math.floor(Math.random() * voices.length)];

  const prompt = `You are a kind, mysterious tutor who helps learners WITHOUT spoiling the answer, and you never say the same thing twice. Write ONE short clue that nudges the learner toward the right option. This time, ${voice}.

Wording level for this hint:
${readability}

Question: ${question}
Answer options: ${options.map((o) => `"${o}"`).join(", ")}
(PS — the intended correct option is: "${answer}". Use it only to aim your clue, never to state it.)

Rules:
- NEVER reveal the answer. Do NOT name it, restate its meaning, echo its words, or say "it is…". The clue must not make the choice obvious by spelling anything out.
- Instead nudge with context: where it happens, what it does, how it connects to the question, or one small fact from the material that points toward it.
- Max ${wordCap} words.
- ${style}Write a fresh, different clue — no clichés, no repeating phrasing from earlier hints.`;

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