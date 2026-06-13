import { NextRequest, NextResponse } from "next/server";
import { tryCallNextSupporter } from "@/lib/escalation-calls";
import {
  registerCallSid,
  shouldAdvanceSequentialCall,
  updateCallStatus,
} from "@/lib/escalation-store";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  const formData = await request.formData();
  const callStatus = formData.get("CallStatus")?.toString() ?? "unknown";
  const callSid = formData.get("CallSid")?.toString();

  if (callSid && sessionId) {
    await registerCallSid(sessionId, callSid);
  }

  if (callSid) {
    const session = await updateCallStatus(callSid, callStatus, sessionId);
    if (
      session &&
      shouldAdvanceSequentialCall(session, callSid, callStatus)
    ) {
      await tryCallNextSupporter(session);
    }
  }

  return NextResponse.json({
    received: true,
    callSid,
    callStatus,
    sessionId,
  });
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
