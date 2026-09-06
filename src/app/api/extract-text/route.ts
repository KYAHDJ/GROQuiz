import { NextResponse } from "next/server";
import { parsePdfBuffer } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<NextResponse> {
  let body: { text?: unknown; pdfs?: { name?: string; url?: string }[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const directText = typeof body.text === "string" ? body.text.trim() : "";
  if (directText) {
    return NextResponse.json({ text: directText }, { status: 200 });
  }

  const pdfs = Array.isArray(body.pdfs) ? body.pdfs.filter((p) => typeof p?.url === "string") : [];
  if (pdfs.length === 0) {
    return NextResponse.json({ error: "No source text provided" }, { status: 400 });
  }

  const parts: string[] = [];
  let scanned = false;
  for (const pdf of pdfs.slice(0, 5)) {
    const url = pdf.url as string;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > 50 * 1024 * 1024) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const parsed = await parsePdfBuffer(buf);
      if (parsed.text.trim().length >= 20) {
        parts.push(`Source document "${pdf.name ?? "PDF"}":\n${parsed.text}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "EMPTY_TEXT") {
        scanned = true;
      }
      console.warn("extract-text: failed to fetch/parse PDF:", err);
    }
  }

  const text = parts.join("\n\n").trim();
  if (text.length < 20) {
    return NextResponse.json(
      {
        error: scanned
          ? "These PDFs have no readable text layer (they look like scans). Upload text-based PDFs or paste the text instead."
          : "We couldn't read the uploaded PDFs. Try again or paste the text below instead.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ text }, { status: 200 });
}