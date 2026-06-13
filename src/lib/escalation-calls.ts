import {
  advanceToNextSupporter,
  getEscalationSession,
  markOtherSupportersUnavailable,
  markSupporterCalling,
  registerCallSid,
  setActiveCallSid,
  type EscalationSession,
} from "./escalation-store";
import {
  buildStatusUrl,
  buildVoiceUrl,
  getTwilioClient,
} from "./twilio";

export async function placeSupporterCall(params: {
  session: EscalationSession;
  to: string;
}): Promise<string | null> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!client || !from) return null;

  const call = await client.calls.create({
    to: params.to,
    from,
    url: buildVoiceUrl(params.session.id),
    statusCallback: buildStatusUrl(params.session.id),
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    statusCallbackMethod: "POST",
  });

  await registerCallSid(params.session.id, call.sid);
  await setActiveCallSid(params.session.id, call.sid);
  await markSupporterCalling(params.session.id, params.to, call.sid);
  return call.sid;
}

export async function startCircleCalls(session: EscalationSession): Promise<string[]> {
  const phones =
    session.memberPhones.length > 0 ? session.memberPhones : [];

  if (phones.length === 0) return [];

  const targets =
    session.callMode === "parallel" ? phones : [phones[session.currentIndex] ?? phones[0]];

  const callSids: string[] = [];
  for (const to of targets) {
    const sid = await placeSupporterCall({ session, to });
    if (sid) callSids.push(sid);
  }

  return callSids;
}

export async function cancelOtherSupporterCalls(
  sessionId: string,
  exceptCallSid: string
): Promise<void> {
  const client = getTwilioClient();
  if (!client) return;

  const session = await getEscalationSession(sessionId);
  if (!session) return;

  for (const callSid of session.callSids) {
    if (callSid === exceptCallSid) continue;
    try {
      await client.calls(callSid).update({ status: "completed" });
    } catch {
      // Call may already be finished.
    }
  }

  await markOtherSupportersUnavailable(sessionId, exceptCallSid);
}

export async function tryCallNextSupporter(
  session: EscalationSession
): Promise<string | null> {
  if (session.confirmed || session.callMode !== "sequential") return null;

  const nextPhone = await advanceToNextSupporter(session.id);
  if (!nextPhone) return null;

  const refreshed = await getEscalationSession(session.id);
  if (!refreshed) return null;

  return placeSupporterCall({ session: refreshed, to: nextPhone });
}
