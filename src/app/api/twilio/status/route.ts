import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const callStatus = formData.get("CallStatus")?.toString() ?? "unknown";
  const callSid = formData.get("CallSid")?.toString();

  return NextResponse.json({
    received: true,
    callSid,
    callStatus,
  });
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
