import twilio from "twilio";
import { getCallableCircleMembers } from "./circle-store";
import { APP_BASE_URL, SUPPORTER_PHONE, TWILIO_FROM_NUMBER } from "./config";

export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  return twilio(accountSid, authToken);
}

export function getCirclePhoneNumbers(): string[] {
  const fromCircle = getCallableCircleMembers().map((m) => m.phone.trim());
  if (fromCircle.length > 0) return fromCircle;
  if (SUPPORTER_PHONE) return [SUPPORTER_PHONE];
  return [];
}

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      TWILIO_FROM_NUMBER &&
      getCirclePhoneNumbers().length > 0
  );
}

export function buildVoiceUrl(params: {
  transcript: string;
  memberName: string;
  supporterMessage: string;
}) {
  const url = new URL("/api/twilio/voice", APP_BASE_URL);
  url.searchParams.set("transcript", params.transcript);
  url.searchParams.set("memberName", params.memberName);
  url.searchParams.set("supporterMessage", params.supporterMessage);
  return url.toString();
}

export function buildStatusUrl() {
  return new URL("/api/twilio/status", APP_BASE_URL).toString();
}
