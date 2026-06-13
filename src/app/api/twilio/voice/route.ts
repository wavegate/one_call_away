import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

function buildTwiml(params: {
  transcript: string;
  memberName: string;
  supporterMessage: string;
}) {
  const { transcript, memberName, supporterMessage } = params;
  const twiml = new VoiceResponse();

  twiml.say(
    { voice: "Polly.Joanna" },
    `This is My Circle. ${supporterMessage}`
  );

  twiml.pause({ length: 1 });
  twiml.say({ voice: "Polly.Joanna" }, transcript);
  twiml.pause({ length: 1 });
  twiml.say(
    { voice: "Polly.Joanna" },
    `Please call ${memberName} back now if you are available.`
  );

  return twiml.toString();
}

function getParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return {
    transcript:
      searchParams.get("transcript") ??
      "I'm feeling urges and I'm concerned I'm going to use.",
    memberName: searchParams.get("memberName") ?? "Frank",
    supporterMessage:
      searchParams.get("supporterMessage") ??
      "Frank asked for support. Frank left this message.",
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
