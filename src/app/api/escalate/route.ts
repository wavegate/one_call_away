import { NextRequest, NextResponse } from "next/server";
import { DEMO_MEMBER_NAME } from "@/lib/config";
import {
  buildStatusUrl,
  buildVoiceUrl,
  getTwilioClient,
  isTwilioConfigured,
} from "@/lib/twilio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transcript = body.transcript ?? "";
    const supporterMessage =
      body.supporterMessage ??
      `${DEMO_MEMBER_NAME} asked for support. ${DEMO_MEMBER_NAME} left this message.`;

    if (!isTwilioConfigured()) {
      return NextResponse.json({
        success: true,
        demo: true,
        message: "Twilio not configured — demo mode",
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
    const to = process.env.SUPPORTER_PHONE ?? process.env.TWILIO_TO_NUMBER!;

    const call = await client.calls.create({
      to,
      from,
      url: buildVoiceUrl({
        transcript,
        memberName: DEMO_MEMBER_NAME,
        supporterMessage,
      }),
      statusCallback: buildStatusUrl(),
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to place call";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
