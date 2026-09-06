import Groq from "groq-sdk";

export const DEFAULT_MODEL = "openai/gpt-oss-120b";
export const FAST_MODEL = "openai/gpt-oss-20b";

let cachedClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }
  if (!cachedClient) {
    cachedClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return cachedClient;
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
      const cleaned = (text ?? "").replace(/\s+/g, " ").trim();
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