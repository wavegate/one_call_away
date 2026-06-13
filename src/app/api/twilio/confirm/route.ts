import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { cancelOtherSupporterCalls } from "@/lib/escalation-calls";
import {
  getEscalationSession,
  markSupporterConfirmed,
} from "@/lib/escalation-store";
import { buildConnectUrl } from "@/lib/twilio";

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
  return handleConfirm(request);
}

export async function POST(request: NextRequest) {
  return handleConfirm(request);
}

async function handleConfirm(request: NextRequest) {
  const { sessionId, memberPhone, memberName } = getParams(request);
  const formData = await request.formData();
  const digits = formData.get("Digits")?.toString() ?? "";
  const callSid = formData.get("CallSid")?.toString() ?? "";

  const twiml = new VoiceResponse();
  const session = sessionId ? await getEscalationSession(sessionId) : null;

  if (digits === "1" && session && memberPhone.trim()) {
    if (session.confirmed) {
      twiml.say(
        { voice: "Polly.Joanna" },
        "Someone else is already connecting with them. Thank you."
      );
      twiml.hangup();
      return xmlResponse(twiml);
    }

    const confirmed = await markSupporterConfirmed(sessionId, callSid);
    if (confirmed) {
      if (session.callMode === "parallel") {
        await cancelOtherSupporterCalls(sessionId, callSid);
      }

      twiml.say(
        { voice: "Polly.Joanna" },
        `Connecting you to ${memberName} now.`
      );
      twiml.redirect(
        { method: "POST" },
        buildConnectUrl({ sessionId, memberPhone, memberName })
      );
      return xmlResponse(twiml);
    }
  }

  twiml.say({ voice: "Polly.Joanna" }, "Goodbye.");
  twiml.hangup();

  return xmlResponse(twiml);
}

function xmlResponse(twiml: InstanceType<typeof VoiceResponse>) {
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
