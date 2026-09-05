import Groq from "groq-sdk";

export const DEFAULT_MODEL = "llama3-70b-8192";
export const FAST_MODEL = "llama3-8b-8192";

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

export async function parsePdfBuffer(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return { text: data.text ?? "", numpages: data.numpages || 1 };
}