import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { DEMO_MEMBER_NAME } from "@/lib/config";
import { getEscalationSession } from "@/lib/escalation-store";
import { buildConfirmUrl } from "@/lib/twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

function buildSupporterIntro(memberName: string, supporterMessage: string): string {
  const concern = supporterMessage.trim();
  if (concern) {
    return `Hi. ${memberName} has reached out for support. ${concern}`;
  }
  return `Hi. ${memberName} has reached out for support and needs someone to talk to right now.`;
}

function buildTwiml(params: {
  memberName: string;
  supporterMessage: string;
  sessionId: string;
  memberPhone: string;
}) {
  const {
    memberName,
    supporterMessage,
    sessionId,
    memberPhone,
  } = params;
  const twiml = new VoiceResponse();

  twiml.say(
    { voice: "Polly.Joanna" },
    buildSupporterIntro(memberName, supporterMessage)
  );

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

async function resolveVoiceParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? "";

  if (sessionId) {
    const session = await getEscalationSession(sessionId);
    if (session) {
      return {
        memberName: session.memberName,
        supporterMessage: session.supporterMessage,
        sessionId: session.id,
        memberPhone: session.memberPhone,
      };
    }
  }

  return {
    memberName: searchParams.get("memberName") ?? DEMO_MEMBER_NAME,
    supporterMessage:
      searchParams.get("supporterMessage") ??
      "They need someone to talk to as soon as possible.",
    sessionId,
    memberPhone: searchParams.get("memberPhone") ?? "",
  };
}

export async function GET(request: NextRequest) {
  const params = await resolveVoiceParams(request);
  const xml = buildTwiml(params);

  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(request: NextRequest) {
  const params = await resolveVoiceParams(request);
  const xml = buildTwiml(params);

  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}
