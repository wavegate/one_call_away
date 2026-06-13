export const DEMO_MEMBER_NAME = process.env.DEMO_MEMBER_NAME ?? "Frank";

export const MEMBER_PHONE = process.env.MEMBER_PHONE ?? "";

export const SUPPORTER_PHONE =
  process.env.SUPPORTER_PHONE ?? process.env.TWILIO_TO_NUMBER ?? "";

export const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? "";

function resolveAppBaseUrl(): string {
  // Twilio webhooks must hit a public URL. On Vercel, ignore NEXT_PUBLIC_APP_URL
  // when it still points at local/ngrok dev tunnels copied from .env.
  if (process.env.VERCEL_URL) {
    const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (productionHost) {
      return `https://${productionHost}`;
    }
    return `https://${process.env.VERCEL_URL}`;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured;

  return "http://localhost:3000";
}

export const APP_BASE_URL = resolveAppBaseUrl();

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
