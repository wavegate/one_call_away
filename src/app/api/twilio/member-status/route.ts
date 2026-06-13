import { NextRequest, NextResponse } from "next/server";
import {
  markMemberConnected,
  updateEscalationStep,
} from "@/lib/escalation-store";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? "";

  const formData = await request.formData();
  const callStatus = formData.get("CallStatus")?.toString() ?? "unknown";

  if (!sessionId) {
    return NextResponse.json({ received: true });
  }

  switch (callStatus) {
    case "initiated":
    case "queued":
      updateEscalationStep(sessionId, "waiting");
      break;
    case "ringing":
      updateEscalationStep(sessionId, "waiting");
      break;
    case "in-progress":
    case "answered":
      markMemberConnected(sessionId);
      break;
  }

  return NextResponse.json({
    received: true,
    sessionId,
    callStatus,
  });
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
