import { NextRequest, NextResponse } from "next/server";
import { getEscalationSession } from "@/lib/escalation-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  const session = await getEscalationSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const confirmedSupporter = session.supporterAttempts.find(
    (attempt) => attempt.status === "confirmed"
  );

  return NextResponse.json({
    id: session.id,
    step: session.step,
    demo: session.demo,
    memberName: session.memberName,
    dialOutcome: session.dialOutcome,
    callMode: session.callMode,
    supporterAttempts: session.supporterAttempts,
    confirmedSupporter: confirmedSupporter
      ? {
          name: confirmedSupporter.name,
          relationship: confirmedSupporter.relationship,
        }
      : null,
  });
}
