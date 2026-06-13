import { NextRequest, NextResponse } from "next/server";
import { analyzeTranscript } from "@/lib/agent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transcript = body.transcript ?? "";

    const decision = await analyzeTranscript(transcript);
    return NextResponse.json(decision);
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze message" },
      { status: 500 }
    );
  }
}
