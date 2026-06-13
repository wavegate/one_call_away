import { NextRequest, NextResponse } from "next/server";
import { getCallableCircleMembers } from "@/lib/circle-store";
import { startCircleCalls } from "@/lib/escalation-calls";
import { DEMO_MEMBER_NAME, MEMBER_PHONE } from "@/lib/config";
import {
  createEscalationSession,
  getEscalationSession,
  initSupporterAttempts,
} from "@/lib/escalation-store";
import { getCirclePhoneNumbers, getTwilioClient, isTwilioConfigured } from "@/lib/twilio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transcript = body.transcript ?? "";
    const supporterMessage =
      body.supporterMessage ??
      `${DEMO_MEMBER_NAME} asked for support.`;

    if (!(await isTwilioConfigured())) {
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

    const phones = await getCirclePhoneNumbers();
    const circleMembers = await getCallableCircleMembers();
    const session = await createEscalationSession({
      memberName: DEMO_MEMBER_NAME,
      memberPhone: MEMBER_PHONE,
      callMode: "sequential",
      memberPhones: phones,
      transcript,
      supporterMessage,
    });
    await initSupporterAttempts(session.id, circleMembers);

    const callSids = await startCircleCalls(
      (await getEscalationSession(session.id)) ?? session
    );

    return NextResponse.json({
      success: true,
      callSids,
      sessionId: session.id,
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
