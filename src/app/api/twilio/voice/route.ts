import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { buildConfirmUrl } from "@/lib/twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

function buildTwiml(params: {
  transcript: string;
  memberName: string;
  supporterMessage: string;
  sessionId: string;
  memberPhone: string;
}) {
  const {
    transcript,
    memberName,
    supporterMessage,
    sessionId,
    memberPhone,
  } = params;
  const twiml = new VoiceResponse();

  twiml.say(
    { voice: "Polly.Joanna" },
    `This is My Circle. ${supporterMessage}`
  );

  twiml.pause({ length: 1 });
  twiml.say({ voice: "Polly.Joanna" }, transcript);
  twiml.pause({ length: 1 });

  if (memberPhone.trim()) {
    const gather = twiml.gather({
      numDigits: 1,
      timeout: 10,
      action: buildConfirmUrl({ sessionId, memberPhone, memberName }),
      method: "POST",
    });
    gather.say(
      { voice: "Polly.Joanna" },
      `Press 1 to connect with ${memberName} now, or hang up if you are not available.`
    );
    twiml.say(
      { voice: "Polly.Joanna" },
      "No response received. Goodbye."
    );
    twiml.hangup();
  } else {
    twiml.say(
      { voice: "Polly.Joanna" },
      `Please call ${memberName} back now if you are available.`
    );
  }

  return twiml.toString();
}

function getParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    transcript:
      searchParams.get("transcript") ??
      "They are feeling urges and are concerned about using.",
    memberName: searchParams.get("memberName") ?? "Frank",
    supporterMessage:
      searchParams.get("supporterMessage") ??
      "Frank asked for support.",
    sessionId: searchParams.get("sessionId") ?? "",
    memberPhone: searchParams.get("memberPhone") ?? "",
  };
}

export async function GET(request: NextRequest) {
  const params = getParams(request);
  const xml = buildTwiml(params);

  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(request: NextRequest) {
  const params = getParams(request);
  const xml = buildTwiml(params);

  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}
