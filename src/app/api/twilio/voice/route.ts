import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transcript =
    searchParams.get("transcript") ??
    "I'm feeling urges and I'm concerned I'm going to use.";
  const memberName = searchParams.get("memberName") ?? "Frank";
  const supporterMessage =
    searchParams.get("supporterMessage") ??
    `${memberName} asked for support. ${memberName} left this message.`;

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

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
