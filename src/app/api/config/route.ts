import { NextResponse } from "next/server";
import { isTwilioConfigured } from "@/lib/twilio";

export async function GET() {
  return NextResponse.json({
    twilioConfigured: isTwilioConfigured(),
    demoMember: process.env.DEMO_MEMBER_NAME ?? "Frank",
  });
}
