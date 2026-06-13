import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { updateEscalationStep } from "@/lib/escalation-store";
import { buildDialStatusUrl, buildMemberDialStatusUrl } from "@/lib/twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

function getParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    sessionId: searchParams.get("sessionId") ?? "",
    memberPhone: searchParams.get("memberPhone") ?? "",
    memberName: searchParams.get("memberName") ?? "Frank",
  };
}

export async function GET(request: NextRequest) {
  return buildConnectResponse(request);
}

export async function POST(request: NextRequest) {
  return buildConnectResponse(request);
}

function buildConnectResponse(request: NextRequest) {
  const { sessionId, memberPhone, memberName } = getParams(request);

  if (sessionId) {
    updateEscalationStep(sessionId, "waiting");
  }

  const twiml = new VoiceResponse();

  if (!memberPhone.trim()) {
    twiml.say(
      { voice: "Polly.Joanna" },
      `Unable to connect. Please call ${memberName} back directly.`
    );
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const dial = twiml.dial({
    action: buildDialStatusUrl(sessionId),
    method: "POST",
    timeout: 45,
    answerOnBridge: true,
  });
  dial.number(
    {
      statusCallback: buildMemberDialStatusUrl(sessionId),
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    },
    memberPhone.trim()
  );

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
