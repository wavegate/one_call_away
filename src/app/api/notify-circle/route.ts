import { NextRequest, NextResponse } from "next/server";
import { getCallableCircleMembers } from "@/lib/circle-store";
import { startCircleCalls } from "@/lib/escalation-calls";
import { DEMO_MEMBER_NAME, MEMBER_PHONE } from "@/lib/config";
import { createEscalationSession, getEscalationSession, initSupporterAttempts } from "@/lib/escalation-store";
import {
  getCirclePhoneNumbers,
  getTwilioClient,
  isTwilioConfigured,
} from "@/lib/twilio";
import type { CallMode } from "@/lib/types";

function resolveMemberPhone(requestPhone?: string): string {
  const fromRequest = requestPhone?.trim() ?? "";
  if (fromRequest) return fromRequest;
  return MEMBER_PHONE.trim();
}

function resolveCallMode(explicit?: string, urgency?: string): CallMode {
  if (explicit === "parallel" || explicit === "sequential") return explicit;
  if (urgency === "high") return "parallel";
  return "sequential";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      urgency,
      member_summary,
      supporter_message,
      member_name = DEMO_MEMBER_NAME,
      recommended_action,
      member_phone,
      call_mode,
    } = body;

    const memberPhone = resolveMemberPhone(member_phone);
    const callMode = resolveCallMode(call_mode, urgency);

    const transcript = (member_summary ?? "").trim() || "They asked for support.";

    const messageForSupporter =
      supporter_message ?? `${member_name} asked for support.`;

    const circleMembers = getCallableCircleMembers();
    const phones = getCirclePhoneNumbers();

    if (!isTwilioConfigured()) {
      const session = createEscalationSession({
        demo: true,
        memberName: member_name,
        memberPhone,
        callMode,
        memberPhones: phones,
        transcript,
        supporterMessage: messageForSupporter,
        supporterAttempts: circleMembers.map((member) => ({
          id: member.id,
          name: member.name,
          relationship: member.relationship,
          phone: member.phone.trim(),
          status:
            callMode === "parallel"
              ? ("ringing" as const)
              : member === circleMembers[0]
                ? ("ringing" as const)
                : ("pending" as const),
        })),
      });

      return NextResponse.json({
        success: true,
        demo: true,
        sessionId: session.id,
        urgency,
        call_mode: callMode,
        message: "Twilio not configured or no Circle phone numbers — demo mode",
        recommended_action,
        circleMembers: circleMembers.map((m) => ({
          name: m.name,
          relationship: m.relationship,
        })),
        supporterAttempts: session.supporterAttempts,
      });
    }

    const client = getTwilioClient();
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Twilio client unavailable" },
        { status: 500 }
      );
    }

    const session = createEscalationSession({
      memberName: member_name,
      memberPhone,
      callMode,
      memberPhones: phones,
      transcript,
      supporterMessage: messageForSupporter,
    });
    initSupporterAttempts(session.id, circleMembers);

    const callSids = await startCircleCalls(getEscalationSession(session.id) ?? session);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      callSids,
      call_mode: callMode,
      contacted:
        callMode === "parallel"
          ? circleMembers.map((m) => m.name)
          : circleMembers.slice(0, 1).map((m) => m.name),
      urgency,
      member_name,
      recommended_action,
      supporterAttempts: session.supporterAttempts,
      warmTransfer: Boolean(memberPhone),
    });
  } catch (error) {
    console.error("[notify-circle]", error);

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
