import { NextRequest, NextResponse } from "next/server";
import { getCallableCircleMembers } from "@/lib/circle-store";
import { DEMO_MEMBER_NAME } from "@/lib/config";
import {
  buildStatusUrl,
  buildVoiceUrl,
  getCirclePhoneNumbers,
  getTwilioClient,
  isTwilioConfigured,
} from "@/lib/twilio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      urgency,
      member_summary,
      supporter_message,
      member_name = DEMO_MEMBER_NAME,
      recommended_action,
      conversation_excerpt,
      share_original_words,
    } = body;

    const transcript =
      share_original_words && conversation_excerpt
        ? conversation_excerpt
        : member_summary;

    const messageForSupporter =
      supporter_message ??
      `${member_name} asked for support. ${member_name} left this message.`;

    const circleMembers = getCallableCircleMembers();
    const phones = getCirclePhoneNumbers();

    if (!isTwilioConfigured()) {
      return NextResponse.json({
        success: true,
        demo: true,
        urgency,
        message: "Twilio not configured or no Circle phone numbers — demo mode",
        recommended_action,
        circleMembers: circleMembers.map((m) => ({
          name: m.name,
          relationship: m.relationship,
        })),
      });
    }

    const client = getTwilioClient();
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Twilio client unavailable" },
        { status: 500 }
      );
    }

    const from = process.env.TWILIO_FROM_NUMBER!;
    const callSids: string[] = [];

    for (const to of phones) {
      const call = await client.calls.create({
        to,
        from,
        url: buildVoiceUrl({
          transcript,
          memberName: member_name,
          supporterMessage: messageForSupporter,
        }),
        statusCallback: buildStatusUrl(),
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        statusCallbackMethod: "POST",
      });
      callSids.push(call.sid);
    }

    return NextResponse.json({
      success: true,
      callSids,
      contacted: circleMembers.map((m) => m.name),
      urgency,
      member_name,
      recommended_action,
    });
  } catch (error) {
    const twilioError = error as { code?: number; message?: string };
    let message =
      error instanceof Error ? error.message : "Failed to notify Circle";

    if (twilioError.code === 20003 || message === "Authenticate") {
      message =
        "Twilio authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env, then restart the dev server.";
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
