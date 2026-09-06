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

/**
 * Finds every configured GROQ key, no matter how many are added later:
 * GROQ_API_KEY, then GROQ_API_KEY_1, GROQ_API_KEY_2, … up to the first
 * missing slot (so there is no upper bound to adjust when new keys appear).
 */
export function apiKeys(): string[] {
  const keys: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) keys.push(v.trim());
  };
  push(process.env.GROQ_API_KEY);
  push(process.env.GROQ_API_KEY_1);
  for (let i = 2; i <= 50; i++) {
    const next = process.env[`GROQ_API_KEY_${i}`];
    if (!next) break;
    push(next);
  }
  return keys;
}

export function keyNames(): string[] {
  const names: string[] = [];
  if (process.env.GROQ_API_KEY) names.push("GROQ_API_KEY");
  if (process.env.GROQ_API_KEY_1) names.push("GROQ_API_KEY_1");
  for (let i = 2; i <= 50; i++) {
    if (!process.env[`GROQ_API_KEY_${i}`]) break;
    names.push(`GROQ_API_KEY_${i}`);
  }
  return names;
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

const COOLDOWN_MS = 60_000;
const keyCooldowns = new Map<string, number>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs a chat completion, switching to another GROQ key the moment one fails.
 * - Keys that error are put on a 60s cooldown so we never hammer a dead key.
 * - If every key is cooling down, waits a bit, then tries anyhow.
 * - If a full pass fails, waits ~1 minute and tries the whole set once more.
 * - Only throws after all of that — callers decide what to show the user.
 */
export async function chatWithFallback(
  opts: ChatOptions
): Promise<string> {
  const keys = apiKeys().filter((k) => !keyCooldowns.has(k) || keyCooldowns.get(k)! <= Date.now());
  if (keys.length === 0) {
    await sleep(COOLDOWN_MS);
    keyCooldowns.clear();
    if (apiKeys().length === 0) throw new Error("GROQ_API_KEY is not set");
  }
  const attempts = keys.length > 0 ? keys : apiKeys();
  let lastErr: unknown;
  let pass = 0;

  while (pass < 2) {
    for (const key of attempts) {
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
        const content = anyCompletion.choices?.[0]?.message?.content ?? "";
        if (content) return content;
        lastErr = new Error("empty completion");
        keyCooldowns.set(key, Date.now() + COOLDOWN_MS);
      } catch (err) {
        lastErr = err;
        keyCooldowns.set(key, Date.now() + COOLDOWN_MS);
      }
    }
    pass += 1;
    if (pass < 2) await sleep(Math.min(COOLDOWN_MS, 20_000));
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