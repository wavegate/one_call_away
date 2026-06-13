export const DEMO_MEMBER_NAME = process.env.DEMO_MEMBER_NAME ?? "Frank";

export const MEMBER_PHONE = process.env.MEMBER_PHONE ?? "";

export const SUPPORTER_PHONE =
  process.env.SUPPORTER_PHONE ?? process.env.TWILIO_TO_NUMBER ?? "";

export const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? "";

export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const ESCALATION_KEYWORDS = [
  "urge",
  "urges",
  "relapse",
  "using",
  "use",
  "unsafe",
  "help",
  "scared",
  "afraid",
  "alone",
  "need someone",
  "losing control",
  "call me",
  "call back",
];
