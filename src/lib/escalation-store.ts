import { randomUUID } from "crypto";
import { ensureDbReady } from "./db";
import type {
  CallMode,
  CircleMember,
  EscalationStep,
  SupporterAttempt,
  SupporterStatus,
} from "./types";

export interface EscalationSession {
  id: string;
  createdAt: number;
  step: EscalationStep;
  demo: boolean;
  memberName: string;
  memberPhone: string;
  callSids: string[];
  dialOutcome?: "answered" | "no-answer" | "busy" | "failed" | "canceled";
  callMode: CallMode;
  memberPhones: string[];
  currentIndex: number;
  confirmed: boolean;
  confirmedCallSid?: string;
  activeCallSid?: string;
  transcript: string;
  supporterMessage: string;
  supporterAttempts: SupporterAttempt[];
}

const STEP_ORDER: EscalationStep[] = [
  "contacting",
  "calling",
  "delivered",
  "waiting",
  "connected",
];

type SessionRow = {
  id: string;
  created_at: number;
  step: EscalationStep;
  demo: number;
  member_name: string;
  member_phone: string;
  call_sids: string;
  dial_outcome: string | null;
  call_mode: CallMode;
  member_phones: string;
  current_index: number;
  confirmed: number;
  confirmed_call_sid: string | null;
  active_call_sid: string | null;
  transcript: string;
  supporter_message: string;
  supporter_attempts: string;
};

const SESSION_SELECT = `SELECT id, created_at, step, demo, member_name, member_phone, call_sids, dial_outcome,
  call_mode, member_phones, current_index, confirmed, confirmed_call_sid, active_call_sid, transcript, supporter_message, supporter_attempts`;

function parseSessionRow(row: Record<string, unknown>): SessionRow {
  return {
    id: String(row.id),
    created_at: Number(row.created_at),
    step: String(row.step) as EscalationStep,
    demo: Number(row.demo),
    member_name: String(row.member_name),
    member_phone: String(row.member_phone),
    call_sids: String(row.call_sids),
    dial_outcome: row.dial_outcome == null ? null : String(row.dial_outcome),
    call_mode: String(row.call_mode) as CallMode,
    member_phones: String(row.member_phones),
    current_index: Number(row.current_index),
    confirmed: Number(row.confirmed),
    confirmed_call_sid:
      row.confirmed_call_sid == null ? null : String(row.confirmed_call_sid),
    active_call_sid:
      row.active_call_sid == null ? null : String(row.active_call_sid),
    transcript: String(row.transcript),
    supporter_message: String(row.supporter_message),
    supporter_attempts: String(row.supporter_attempts),
  };
}

function maxStep(a: EscalationStep, b: EscalationStep): EscalationStep {
  return STEP_ORDER.indexOf(a) >= STEP_ORDER.indexOf(b) ? a : b;
}

function rowToSession(row: SessionRow): EscalationSession {
  return {
    id: row.id,
    createdAt: row.created_at,
    step: row.step,
    demo: row.demo === 1,
    memberName: row.member_name,
    memberPhone: row.member_phone,
    callSids: JSON.parse(row.call_sids) as string[],
    dialOutcome:
      row.dial_outcome === "answered" ||
      row.dial_outcome === "no-answer" ||
      row.dial_outcome === "busy" ||
      row.dial_outcome === "failed" ||
      row.dial_outcome === "canceled"
        ? row.dial_outcome
        : undefined,
    callMode: row.call_mode === "parallel" ? "parallel" : "sequential",
    memberPhones: JSON.parse(row.member_phones) as string[],
    currentIndex: row.current_index,
    confirmed: row.confirmed === 1,
    confirmedCallSid: row.confirmed_call_sid ?? undefined,
    activeCallSid: row.active_call_sid ?? undefined,
    transcript: row.transcript,
    supporterMessage: row.supporter_message,
    supporterAttempts: JSON.parse(row.supporter_attempts) as SupporterAttempt[],
  };
}

function findAttemptByCallSid(
  attempts: SupporterAttempt[],
  callSid: string
): SupporterAttempt | undefined {
  return attempts.find((attempt) => attempt.callSid === callSid);
}

function findAttemptByPhone(
  attempts: SupporterAttempt[],
  phone: string
): SupporterAttempt | undefined {
  const normalized = phone.trim();
  return attempts.find((attempt) => attempt.phone.trim() === normalized);
}

function updateAttemptStatus(
  attempts: SupporterAttempt[],
  attemptId: string,
  status: SupporterStatus,
  callSid?: string
): SupporterAttempt[] {
  return attempts.map((attempt) => {
    if (attempt.id !== attemptId) return attempt;
    return {
      ...attempt,
      status,
      callSid: callSid ?? attempt.callSid,
    };
  });
}

async function persistSession(session: EscalationSession): Promise<void> {
  const db = await ensureDbReady();
  await db.execute({
    sql: `INSERT INTO escalation_sessions
        (id, created_at, step, demo, member_name, member_phone, call_sids, dial_outcome,
         call_mode, member_phones, current_index, confirmed, confirmed_call_sid, active_call_sid,
         transcript, supporter_message, supporter_attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        step = excluded.step,
        call_sids = excluded.call_sids,
        dial_outcome = excluded.dial_outcome,
        call_mode = excluded.call_mode,
        member_phones = excluded.member_phones,
        current_index = excluded.current_index,
        confirmed = excluded.confirmed,
        confirmed_call_sid = excluded.confirmed_call_sid,
        active_call_sid = excluded.active_call_sid,
        transcript = excluded.transcript,
        supporter_message = excluded.supporter_message,
        supporter_attempts = excluded.supporter_attempts`,
    args: [
      session.id,
      session.createdAt,
      session.step,
      session.demo ? 1 : 0,
      session.memberName,
      session.memberPhone,
      JSON.stringify(session.callSids),
      session.dialOutcome ?? null,
      session.callMode,
      JSON.stringify(session.memberPhones),
      session.currentIndex,
      session.confirmed ? 1 : 0,
      session.confirmedCallSid ?? null,
      session.activeCallSid ?? null,
      session.transcript,
      session.supporterMessage,
      JSON.stringify(session.supporterAttempts),
    ],
  });
}

export async function createEscalationSession(params: {
  demo?: boolean;
  memberName: string;
  memberPhone: string;
  callSids?: string[];
  callMode?: CallMode;
  memberPhones?: string[];
  transcript?: string;
  supporterMessage?: string;
  supporterAttempts?: SupporterAttempt[];
}): Promise<EscalationSession> {
  const session: EscalationSession = {
    id: randomUUID(),
    createdAt: Date.now(),
    step: "contacting",
    demo: params.demo ?? false,
    memberName: params.memberName,
    memberPhone: params.memberPhone,
    callSids: params.callSids ?? [],
    callMode: params.callMode ?? "sequential",
    memberPhones: params.memberPhones ?? [],
    currentIndex: 0,
    confirmed: false,
    transcript: params.transcript ?? "",
    supporterMessage: params.supporterMessage ?? "",
    supporterAttempts: params.supporterAttempts ?? [],
  };
  await persistSession(session);
  return session;
}

export async function initSupporterAttempts(
  sessionId: string,
  members: CircleMember[]
): Promise<void> {
  const session = await getEscalationSession(sessionId);
  if (!session) return;

  session.supporterAttempts = members.map((member) => ({
    id: member.id,
    name: member.name,
    relationship: member.relationship,
    phone: member.phone.trim(),
    status: "pending",
  }));
  await persistSession(session);
}

export async function markSupporterCalling(
  sessionId: string,
  phone: string,
  callSid: string
): Promise<void> {
  const session = await getEscalationSession(sessionId);
  if (!session) return;

  const attempt = findAttemptByPhone(session.supporterAttempts, phone);
  if (!attempt) return;

  session.supporterAttempts = updateAttemptStatus(
    session.supporterAttempts,
    attempt.id,
    "calling",
    callSid
  );
  await persistSession(session);
}

export async function updateSupporterCallStatus(
  sessionId: string,
  callSid: string,
  callStatus: string
): Promise<void> {
  const session = await getEscalationSession(sessionId);
  if (!session) return;

  const attempt = findAttemptByCallSid(session.supporterAttempts, callSid);
  if (!attempt || attempt.status === "confirmed") return;

  let nextStatus: SupporterStatus | null = null;

  switch (callStatus) {
    case "initiated":
    case "queued":
      nextStatus = "calling";
      break;
    case "ringing":
      nextStatus = "ringing";
      break;
    case "in-progress":
      nextStatus = "listening";
      break;
    case "completed":
      if (session.confirmedCallSid === callSid) return;
      nextStatus =
        attempt.status === "listening" || attempt.status === "ringing"
          ? attempt.status === "listening"
            ? "declined"
            : "unavailable"
          : "unavailable";
      break;
    case "busy":
    case "failed":
    case "no-answer":
    case "canceled":
      nextStatus = "unavailable";
      break;
  }

  if (!nextStatus) return;

  session.supporterAttempts = updateAttemptStatus(
    session.supporterAttempts,
    attempt.id,
    nextStatus,
    callSid
  );
  await persistSession(session);
}

export async function markOtherSupportersUnavailable(
  sessionId: string,
  exceptCallSid: string
): Promise<void> {
  const session = await getEscalationSession(sessionId);
  if (!session) return;

  session.supporterAttempts = session.supporterAttempts.map((attempt) => {
    if (
      attempt.callSid === exceptCallSid ||
      attempt.status === "confirmed" ||
      attempt.status === "pending"
    ) {
      return attempt;
    }

    if (
      attempt.status === "calling" ||
      attempt.status === "ringing" ||
      attempt.status === "listening"
    ) {
      return { ...attempt, status: "unavailable" as SupporterStatus };
    }

    return attempt;
  });
  await persistSession(session);
}

export async function getEscalationSession(
  id: string
): Promise<EscalationSession | null> {
  const db = await ensureDbReady();
  const result = await db.execute({
    sql: `${SESSION_SELECT} FROM escalation_sessions WHERE id = ?`,
    args: [id],
  });

  const row = result.rows[0];
  return row ? rowToSession(parseSessionRow(row)) : null;
}

export async function updateEscalationStep(
  id: string,
  step: EscalationStep
): Promise<void> {
  const session = await getEscalationSession(id);
  if (!session) return;
  session.step = maxStep(session.step, step);
  await persistSession(session);
}

export async function registerCallSid(
  sessionId: string,
  callSid: string
): Promise<void> {
  const session = await getEscalationSession(sessionId);
  if (!session || session.callSids.includes(callSid)) return;
  session.callSids.push(callSid);
  await persistSession(session);
}

export async function setActiveCallSid(
  sessionId: string,
  callSid: string
): Promise<void> {
  const session = await getEscalationSession(sessionId);
  if (!session) return;
  session.activeCallSid = callSid;
  await persistSession(session);
}

export async function markSupporterConfirmed(
  sessionId: string,
  callSid: string
): Promise<boolean> {
  const session = await getEscalationSession(sessionId);
  if (!session || session.confirmed) return false;

  const attempt = findAttemptByCallSid(session.supporterAttempts, callSid);

  session.confirmed = true;
  session.confirmedCallSid = callSid;
  if (attempt) {
    session.supporterAttempts = updateAttemptStatus(
      session.supporterAttempts,
      attempt.id,
      "confirmed",
      callSid
    );
  }
  await persistSession(session);
  return true;
}

export async function advanceToNextSupporter(
  sessionId: string
): Promise<string | null> {
  const session = await getEscalationSession(sessionId);
  if (!session || session.confirmed) return null;

  const nextIndex = session.currentIndex + 1;
  if (nextIndex >= session.memberPhones.length) return null;

  session.currentIndex = nextIndex;
  await persistSession(session);
  return session.memberPhones[nextIndex] ?? null;
}

async function findSessionByCallSid(
  callSid: string
): Promise<EscalationSession | null> {
  const db = await ensureDbReady();
  const result = await db.execute(
    `${SESSION_SELECT} FROM escalation_sessions ORDER BY created_at DESC`
  );

  for (const rawRow of result.rows) {
    const row = parseSessionRow(rawRow);
    const callSids = JSON.parse(row.call_sids) as string[];
    if (callSids.includes(callSid)) {
      return rowToSession(row);
    }
  }

  return null;
}

export async function updateCallStatus(
  callSid: string,
  callStatus: string,
  sessionId?: string | null
): Promise<EscalationSession | null> {
  const session = sessionId
    ? await getEscalationSession(sessionId)
    : await findSessionByCallSid(callSid);
  if (!session) return null;

  await updateSupporterCallStatus(session.id, callSid, callStatus);

  switch (callStatus) {
    case "initiated":
    case "queued":
      await updateEscalationStep(session.id, "contacting");
      break;
    case "ringing":
      await updateEscalationStep(session.id, "calling");
      break;
    case "in-progress":
      await updateEscalationStep(session.id, "delivered");
      break;
    case "completed":
      if (session.dialOutcome === "answered") {
        await updateEscalationStep(session.id, "connected");
      }
      break;
  }

  return getEscalationSession(session.id);
}

export function shouldAdvanceSequentialCall(
  session: EscalationSession,
  callSid: string,
  callStatus: string
): boolean {
  return (
    callStatus === "completed" &&
    !session.confirmed &&
    session.callMode === "sequential" &&
    session.activeCallSid === callSid
  );
}

export async function markMemberConnected(sessionId: string): Promise<void> {
  const session = await getEscalationSession(sessionId);
  if (!session) return;
  session.dialOutcome = "answered";
  session.step = "connected";
  await persistSession(session);
}

export async function setDialOutcome(
  sessionId: string,
  dialCallStatus: string,
  dialCallDuration?: number
): Promise<void> {
  const session = await getEscalationSession(sessionId);
  if (!session) return;

  const duration = dialCallDuration ?? 0;
  const connected =
    dialCallStatus === "answered" ||
    (dialCallStatus === "completed" && duration > 0);

  if (
    dialCallStatus === "answered" ||
    dialCallStatus === "no-answer" ||
    dialCallStatus === "busy" ||
    dialCallStatus === "failed" ||
    dialCallStatus === "canceled" ||
    dialCallStatus === "completed"
  ) {
    session.dialOutcome = connected
      ? "answered"
      : dialCallStatus === "completed"
        ? session.dialOutcome
        : (dialCallStatus as EscalationSession["dialOutcome"]);
  }

  if (connected) {
    session.step = "connected";
    session.dialOutcome = "answered";
    await persistSession(session);
  } else {
    await persistSession(session);
  }
}
