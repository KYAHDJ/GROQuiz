import { NextResponse } from "next/server";
import { apiKeys, keyNames } from "@/lib/groq";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const keys = apiKeys();
  return NextResponse.json({
    availableKeys: keys.length,
    available: keys.length > 0,
    keyNames: keyNames(),
  });
}