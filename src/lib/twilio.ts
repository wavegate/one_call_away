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

export async function getCirclePhoneNumbers(): Promise<string[]> {
  const fromCircle = (await getCallableCircleMembers()).map((m) => m.phone.trim());
  if (fromCircle.length > 0) return fromCircle;
  if (SUPPORTER_PHONE) return [SUPPORTER_PHONE];
  return [];
}

export async function isTwilioConfigured(): Promise<boolean> {
  const phones = await getCirclePhoneNumbers();
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      TWILIO_FROM_NUMBER &&
      phones.length > 0
  );
}

export function buildVoiceUrl(params: {
  transcript: string;
  memberName: string;
  supporterMessage: string;
  sessionId: string;
  memberPhone: string;
}) {
  const url = new URL("/api/twilio/voice", APP_BASE_URL);
  url.searchParams.set("transcript", params.transcript);
  url.searchParams.set("memberName", params.memberName);
  url.searchParams.set("supporterMessage", params.supporterMessage);
  url.searchParams.set("sessionId", params.sessionId);
  url.searchParams.set("memberPhone", params.memberPhone);
  return url.toString();
}

export function buildConnectUrl(params: {
  sessionId: string;
  memberPhone: string;
  memberName: string;
}) {
  const url = new URL("/api/twilio/connect", APP_BASE_URL);
  url.searchParams.set("sessionId", params.sessionId);
  url.searchParams.set("memberPhone", params.memberPhone);
  url.searchParams.set("memberName", params.memberName);
  return url.toString();
}

export function buildConfirmUrl(params: {
  sessionId: string;
  memberPhone: string;
  memberName: string;
}) {
  const url = new URL("/api/twilio/confirm", APP_BASE_URL);
  url.searchParams.set("sessionId", params.sessionId);
  url.searchParams.set("memberPhone", params.memberPhone);
  url.searchParams.set("memberName", params.memberName);
  return url.toString();
}

export function buildDialStatusUrl(sessionId: string) {
  const url = new URL("/api/twilio/dial-status", APP_BASE_URL);
  url.searchParams.set("sessionId", sessionId);
  return url.toString();
}

export function buildMemberDialStatusUrl(sessionId: string) {
  const url = new URL("/api/twilio/member-status", APP_BASE_URL);
  url.searchParams.set("sessionId", sessionId);
  return url.toString();
}

export function buildStatusUrl(sessionId: string) {
  const url = new URL("/api/twilio/status", APP_BASE_URL);
  url.searchParams.set("sessionId", sessionId);
  return url.toString();
}
