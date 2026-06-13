export type AppState =
  | "idle"
  | "listening"
  | "processing"
  | "responding"
  | "escalating"
  | "waiting";

export type EscalationStep =
  | "contacting"
  | "calling"
  | "delivered"
  | "waiting";

export interface AgentDecision {
  urgency: "low" | "medium" | "high";
  needsHuman: boolean;
  escalationPath: "call_supporter" | "none";
  memberResponse: string;
  supporterMessage: string;
  shareVoiceMemo: boolean;
}

export interface EscalationResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

export interface CircleMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export type CircleMemberInput = Omit<CircleMember, "id">;
