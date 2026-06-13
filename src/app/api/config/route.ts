import { NextResponse } from "next/server";
import { getAllCircleMembers } from "@/lib/circle-store";
import { isTwilioConfigured } from "@/lib/twilio";

export async function GET() {
  const members = await getAllCircleMembers();
  return NextResponse.json({
    twilioConfigured: await isTwilioConfigured(),
    grokConfigured: Boolean(process.env.XAI_API_KEY),
    demoMember: process.env.DEMO_MEMBER_NAME ?? "Frank",
    circleCount: members.length,
    callableCount: members.filter((m) => m.phone.trim()).length,
  });
}
