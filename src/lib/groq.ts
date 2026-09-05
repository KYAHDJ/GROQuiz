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
  const { extractText } = await import("unpdf");
  const { text, totalPages } = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  });
  return { text: text ?? "", numpages: totalPages || 1 };
}