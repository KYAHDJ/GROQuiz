import { NextResponse } from "next/server";
import { parsePdfBuffer } from "@/lib/groq";
import type { ParsePdfResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" } satisfies ParsePdfResponse,
        { status: 400 }
      );
    }

    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Uploaded file must be a PDF" } satisfies ParsePdfResponse,
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { text, numpages } = await parsePdfBuffer(buffer);

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        {
          error:
            "We couldn't find any readable text in this PDF. If it's a scanned document (images), upload a text PDF or paste the text below instead.",
        } satisfies ParsePdfResponse,
        { status: 422 }
      );
    }

    return NextResponse.json(
      { text, pageCount: numpages } satisfies ParsePdfResponse,
      { status: 200 }
    );
  } catch (err) {
    console.error("parse-pdf error:", err);
    return NextResponse.json(
      { error: "Failed to parse PDF. Please try another file." } satisfies ParsePdfResponse,
      { status: 500 }
    );
  }
}