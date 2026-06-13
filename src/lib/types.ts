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
  | "waiting"
  | "connected";

export type CallMode = "sequential" | "parallel";

export type SupporterStatus =
  | "pending"
  | "calling"
  | "ringing"
  | "listening"
  | "declined"
  | "confirmed"
  | "unavailable";

export interface SupporterAttempt {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  status: SupporterStatus;
  callSid?: string;
}

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
