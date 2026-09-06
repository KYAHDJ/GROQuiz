import Groq from "groq-sdk";

export const DEFAULT_MODEL = "openai/gpt-oss-120b";
export const FAST_MODEL = "openai/gpt-oss-20b";

export const DIFFICULTY_READABILITY: Record<number, string> = {
  1: "Beginner (age ~7): baby-simple words, very short sentences (under 12 words), one single idea per question. A small child understands it with no help.",
  2: "Easy (age ~10): simple everyday words, short clear sentences, plain structure. A kid can read it easily.",
  3: "Medium (teen/adult): normal everyday wording and vocabulary, standard textbook sentences. Comfortable, natural reading.",
  4: "Hard (advanced high school/college): noticeably harder to read — longer sentences, more complex grammar, some advanced vocabulary — but every fact is STILL directly in the source material. The difficulty comes from understanding the wording, never from tricky or unfair logic.",
  5: "Expert (graduate): dense, academic-sounding wording with long multi-clause sentences and specialist vocabulary — still fully answerable from the source text. The extra difficulty is purely reading comprehension, not trickery.",
};

const clientCache = new Map<string, Groq>();

export function apiKeys(): string[] {
  const keys: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) keys.push(v.trim());
  };
  push(process.env.GROQ_API_KEY);
  push(process.env.GROQ_API_KEY_1);
  for (let i = 2; i <= 6; i++) push(process.env[`GROQ_API_KEY_${i}`]);
  return keys;
}

export function getGroqClient(): Groq {
  const keys = apiKeys();
  const key = keys[0];
  if (!key) throw new Error("GROQ_API_KEY is not set");
  const cached = clientCache.get(key);
  if (cached) return cached;
  const client = new Groq({ apiKey: key });
  clientCache.set(key, client);
  return client;
}

export interface ChatOptions {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  response_format?: { type: "json_object" };
  temperature?: number;
  max_tokens?: number;
}

/**
 * Runs a chat completion, trying each configured GROQ key in order.
 * If a key fails (rate limit, outage), the next key is used automatically.
 */
export async function chatWithFallback(
  opts: ChatOptions
): Promise<string> {
  const keys = apiKeys();
  if (keys.length === 0) throw new Error("GROQ_API_KEY is not set");
  let lastErr: unknown;

  for (const key of keys) {
    try {
      let client = clientCache.get(key);
      if (!client) {
        client = new Groq({ apiKey: key });
        clientCache.set(key, client);
      }
      const completion = await client.chat.completions.create(
        opts as unknown as Parameters<typeof client.chat.completions.create>[0]
      );
      const anyCompletion = completion as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      return anyCompletion.choices?.[0]?.message?.content ?? "";
    } catch (err) {
      lastErr = err;
      if (keys.length === 1) throw err;
    }
  }
  throw lastErr;
}

export function parseJsonContent(
  raw: string
): string | Record<string, unknown> {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return cleaned;
  }
}

export async function parsePdfBuffer(
  buffer: Buffer
): Promise<{ text: string; numpages: number }> {
  let lastErr: unknown = null;

  for (const attempt of [0, 1]) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 50));
      const { extractText } = await import("unpdf");
      const { text = "", totalPages } = await extractText(
        new Uint8Array(buffer),
        { mergePages: true }
      );
      const cleaned = (text ?? "")
        .replace(/\s+/g, " ")
        .replace(/([A-Za-z])- ([A-Za-z])/g, "$1$2")
        .replace(/([A-Za-z])-\s+([a-z])/g, (m: string, a: string, b: string) =>
          /^[A-ZÀ-Ÿ]/.test(b) ? m : `${a}${b}`
        )
        .trim();
      if (!cleaned) {
        lastErr = new Error("empty-text");
        continue;
      }
      return { text: cleaned, numpages: totalPages || 1 };
    } catch (err) {
      lastErr = err;
    }
  }

  if (lastErr instanceof Error && lastErr.message === "empty-text") {
    throw new Error("EMPTY_TEXT");
  }
  throw lastErr ?? new Error("PDF_PARSE_FAILED");
}