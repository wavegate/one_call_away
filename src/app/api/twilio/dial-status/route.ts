import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { setDialOutcome } from "@/lib/escalation-store";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? "";

  const formData = await request.formData();
  const dialCallStatus =
    formData.get("DialCallStatus")?.toString() ?? "unknown";
  const dialCallDuration = Number(
    formData.get("DialCallDuration")?.toString() ?? "0"
  );

  if (sessionId) {
    setDialOutcome(sessionId, dialCallStatus, dialCallDuration);
  }

  const twiml = new VoiceResponse();
  twiml.hangup();

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
