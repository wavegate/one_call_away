import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { CallMode, CircleMember, EscalationStep, SupporterAttempt, SupporterStatus } from "./types";

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

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "escalations.db");

const STEP_ORDER: EscalationStep[] = [
  "contacting",
  "calling",
  "delivered",
  "waiting",
  "connected",
];

let db: Database.Database | null = null;

function migrateDb(database: Database.Database): void {
  const columns = database
    .prepare("PRAGMA table_info(escalation_sessions)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));

  const additions: Array<{ name: string; sql: string }> = [
    {
      name: "call_mode",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN call_mode TEXT NOT NULL DEFAULT 'sequential'",
    },
    {
      name: "member_phones",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN member_phones TEXT NOT NULL DEFAULT '[]'",
    },
    {
      name: "current_index",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN current_index INTEGER NOT NULL DEFAULT 0",
    },
    {
      name: "confirmed",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN confirmed INTEGER NOT NULL DEFAULT 0",
    },
    {
      name: "confirmed_call_sid",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN confirmed_call_sid TEXT",
    },
    {
      name: "active_call_sid",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN active_call_sid TEXT",
    },
    {
      name: "transcript",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN transcript TEXT NOT NULL DEFAULT ''",
    },
    {
      name: "supporter_message",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN supporter_message TEXT NOT NULL DEFAULT ''",
    },
    {
      name: "supporter_attempts",
      sql: "ALTER TABLE escalation_sessions ADD COLUMN supporter_attempts TEXT NOT NULL DEFAULT '[]'",
    },
  ];

  for (const addition of additions) {
    if (!names.has(addition.name)) {
      database.exec(addition.sql);
    }
  }
}

function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS escalation_sessions (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        step TEXT NOT NULL,
        demo INTEGER NOT NULL DEFAULT 0,
        member_name TEXT NOT NULL,
        member_phone TEXT NOT NULL,
        call_sids TEXT NOT NULL DEFAULT '[]',
        dial_outcome TEXT,
        call_mode TEXT NOT NULL DEFAULT 'sequential',
        member_phones TEXT NOT NULL DEFAULT '[]',
        current_index INTEGER NOT NULL DEFAULT 0,
        confirmed INTEGER NOT NULL DEFAULT 0,
        confirmed_call_sid TEXT,
        active_call_sid TEXT,
        transcript TEXT NOT NULL DEFAULT '',
        supporter_message TEXT NOT NULL DEFAULT '',
        supporter_attempts TEXT NOT NULL DEFAULT '[]'
      )
    `);
    migrateDb(db);
  }

  return db;
}

function maxStep(a: EscalationStep, b: EscalationStep): EscalationStep {
  return STEP_ORDER.indexOf(a) >= STEP_ORDER.indexOf(b) ? a : b;
}

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

function persistSession(session: EscalationSession): void {
  getDb()
    .prepare(
      `INSERT INTO escalation_sessions
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
        supporter_attempts = excluded.supporter_attempts`
    )
    .run(
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
      JSON.stringify(session.supporterAttempts)
    );
}

export function createEscalationSession(params: {
  demo?: boolean;
  memberName: string;
  memberPhone: string;
  callSids?: string[];
  callMode?: CallMode;
  memberPhones?: string[];
  transcript?: string;
  supporterMessage?: string;
  supporterAttempts?: SupporterAttempt[];
}): EscalationSession {
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
  persistSession(session);
  return session;
}

export function initSupporterAttempts(
  sessionId: string,
  members: CircleMember[]
): void {
  const session = getEscalationSession(sessionId);
  if (!session) return;

  session.supporterAttempts = members.map((member) => ({
    id: member.id,
    name: member.name,
    relationship: member.relationship,
    phone: member.phone.trim(),
    status: "pending",
  }));
  persistSession(session);
}

export function markSupporterCalling(
  sessionId: string,
  phone: string,
  callSid: string
): void {
  const session = getEscalationSession(sessionId);
  if (!session) return;

  const attempt = findAttemptByPhone(session.supporterAttempts, phone);
  if (!attempt) return;

  session.supporterAttempts = updateAttemptStatus(
    session.supporterAttempts,
    attempt.id,
    "calling",
    callSid
  );
  persistSession(session);
}

export function updateSupporterCallStatus(
  sessionId: string,
  callSid: string,
  callStatus: string
): void {
  const session = getEscalationSession(sessionId);
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
  persistSession(session);
}


export function markOtherSupportersUnavailable(
  sessionId: string,
  exceptCallSid: string
): void {
  const session = getEscalationSession(sessionId);
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
  persistSession(session);
}

export function getEscalationSession(id: string): EscalationSession | null {
  const row = getDb()
    .prepare(`${SESSION_SELECT} FROM escalation_sessions WHERE id = ?`)
    .get(id) as SessionRow | undefined;

  return row ? rowToSession(row) : null;
}

export function updateEscalationStep(id: string, step: EscalationStep): void {
  const session = getEscalationSession(id);
  if (!session) return;
  session.step = maxStep(session.step, step);
  persistSession(session);
}

export function registerCallSid(sessionId: string, callSid: string): void {
  const session = getEscalationSession(sessionId);
  if (!session || session.callSids.includes(callSid)) return;
  session.callSids.push(callSid);
  persistSession(session);
}

export function setActiveCallSid(sessionId: string, callSid: string): void {
  const session = getEscalationSession(sessionId);
  if (!session) return;
  session.activeCallSid = callSid;
  persistSession(session);
}

export function markSupporterConfirmed(
  sessionId: string,
  callSid: string
): boolean {
  const session = getEscalationSession(sessionId);
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
  persistSession(session);
  return true;
}

export function advanceToNextSupporter(sessionId: string): string | null {
  const session = getEscalationSession(sessionId);
  if (!session || session.confirmed) return null;

  const nextIndex = session.currentIndex + 1;
  if (nextIndex >= session.memberPhones.length) return null;

  session.currentIndex = nextIndex;
  persistSession(session);
  return session.memberPhones[nextIndex] ?? null;
}

function findSessionByCallSid(callSid: string): EscalationSession | null {
  const rows = getDb()
    .prepare(`${SESSION_SELECT} FROM escalation_sessions ORDER BY created_at DESC`)
    .all() as SessionRow[];

  for (const row of rows) {
    const callSids = JSON.parse(row.call_sids) as string[];
    if (callSids.includes(callSid)) {
      return rowToSession({ ...row, call_sids: row.call_sids });
    }
  }

  return null;
}

export function updateCallStatus(
  callSid: string,
  callStatus: string,
  sessionId?: string | null
): EscalationSession | null {
  const session = sessionId
    ? getEscalationSession(sessionId)
    : findSessionByCallSid(callSid);
  if (!session) return null;

  updateSupporterCallStatus(session.id, callSid, callStatus);

  switch (callStatus) {
    case "initiated":
    case "queued":
      updateEscalationStep(session.id, "contacting");
      break;
    case "ringing":
      updateEscalationStep(session.id, "calling");
      break;
    case "in-progress":
      updateEscalationStep(session.id, "delivered");
      break;
    case "completed":
      if (session.dialOutcome === "answered") {
        updateEscalationStep(session.id, "connected");
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

export function markMemberConnected(sessionId: string): void {
  const session = getEscalationSession(sessionId);
  if (!session) return;
  session.dialOutcome = "answered";
  session.step = "connected";
  persistSession(session);
}

export function setDialOutcome(
  sessionId: string,
  dialCallStatus: string,
  dialCallDuration?: number
): void {
  const session = getEscalationSession(sessionId);
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
    persistSession(session);
  } else {
    persistSession(session);
  }
}
