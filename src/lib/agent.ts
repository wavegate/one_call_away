import { DEMO_MEMBER_NAME, ESCALATION_KEYWORDS } from "./config";
import type { AgentDecision } from "./types";

const DEFAULT_MEMBER_RESPONSE =
  "I hear you. I'm going to stay with you while I get help from My Circle. I'm contacting your support person now.";

const HOLDING_RESPONSE =
  "You did the right thing by pressing the button. While I contact your support person, take one slow breath and stay with me.";

function shouldEscalate(transcript: string): boolean {
  const lower = transcript.toLowerCase();
  return ESCALATION_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function ruleBasedDecision(transcript: string): AgentDecision {
  const needsHuman = shouldEscalate(transcript);

  if (needsHuman) {
    return {
      urgency: "high",
      needsHuman: true,
      escalationPath: "call_supporter",
      memberResponse: `${DEFAULT_MEMBER_RESPONSE} ${HOLDING_RESPONSE}`,
      supporterMessage: `${DEMO_MEMBER_NAME} asked for support.`,
      shareVoiceMemo: true,
    };
  }

  return {
    urgency: "low",
    needsHuman: false,
    escalationPath: "none",
    memberResponse:
      "Thank you for sharing. I'm here with you. If you need My Circle, you can press and hold the button again anytime.",
    supporterMessage: "",
    shareVoiceMemo: false,
  };
}

async function grokDecision(transcript: string): Promise<AgentDecision | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = `You are the escalation coordinator for My Circle — not a therapist.
Analyze the member's message and return ONLY valid JSON with this shape:
{
  "urgency": "low" | "medium" | "high",
  "needsHuman": boolean,
  "escalationPath": "call_supporter" | "none",
  "memberResponse": "warm brief response to member, under 3 sentences",
  "supporterMessage": "brief intro for supporter call, or empty string",
  "shareVoiceMemo": boolean
}

Escalate if member mentions urges, relapse, using substances, feeling unsafe, fear of losing control, or needing someone.
Do not diagnose, give medical advice, or act as emergency services.
Member name is ${DEMO_MEMBER_NAME}.`;

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as AgentDecision;
    if (!parsed.memberResponse) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function analyzeTranscript(
  transcript: string
): Promise<AgentDecision> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return {
      urgency: "low",
      needsHuman: false,
      escalationPath: "none",
      memberResponse:
        "I didn't catch that. Hold the button and tell me what's going on.",
      supporterMessage: "",
      shareVoiceMemo: false,
    };
  }

  const grok = await grokDecision(trimmed);
  if (grok) return grok;

  return ruleBasedDecision(trimmed);
}
