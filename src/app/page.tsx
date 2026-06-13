"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EscalationStatus } from "@/components/EscalationStatus";
import { HelpButton } from "@/components/HelpButton";
import { MyCircleFooter } from "@/components/MyCircleFooter";
import {
  useGrokVoiceAgent,
  type EscalationMeta,
  type NotifyCirclePayload,
} from "@/hooks/useGrokVoiceAgent";
import type {
  CallMode,
  EscalationStep,
  SupporterAttempt,
  SupporterStatus,
} from "@/lib/types";

function updateAttempt(
  attempts: SupporterAttempt[],
  id: string,
  status: SupporterStatus
): SupporterAttempt[] {
  return attempts.map((attempt) =>
    attempt.id === id ? { ...attempt, status } : attempt
  );
}

export default function Home() {
  const [escalationStep, setEscalationStep] =
    useState<EscalationStep>("contacting");
  const [hasEscalated, setHasEscalated] = useState(false);
  const [escalationSessionId, setEscalationSessionId] = useState<string | null>(
    null
  );
  const [isDemoEscalation, setIsDemoEscalation] = useState(false);
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const [callMode, setCallMode] = useState<CallMode>("sequential");
  const [supporterAttempts, setSupporterAttempts] = useState<SupporterAttempt[]>(
    []
  );
  const [confirmedSupporter, setConfirmedSupporter] = useState<{
    name: string;
    relationship: string;
  } | null>(null);
  const holdingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const advanceDemoEscalation = useCallback(
    (attempts: SupporterAttempt[], mode: CallMode) => {
      let tick = 0;

      return setInterval(() => {
        tick += 1;

        if (mode === "parallel") {
          if (tick === 1) {
            setEscalationStep("calling");
          } else if (tick === 2) {
            setSupporterAttempts((current) =>
              current.map((attempt, index) => ({
                ...attempt,
                status: index === 0 ? "confirmed" : "unavailable",
              }))
            );
            setConfirmedSupporter({
              name: attempts[0]?.name ?? "Jamie",
              relationship: attempts[0]?.relationship ?? "Sponsor",
            });
            setEscalationStep("connected");
          }
          return;
        }

        if (tick === 1) {
          setEscalationStep("calling");
        } else if (tick === 2 && attempts[0]) {
          setSupporterAttempts((current) => {
            let next = updateAttempt(current, attempts[0].id, "unavailable");
            if (attempts[1]) {
              next = updateAttempt(next, attempts[1].id, "ringing");
            }
            return next;
          });
        } else if (tick === 3 && attempts[1]) {
          setSupporterAttempts((current) =>
            updateAttempt(current, attempts[1].id, "listening")
          );
          setEscalationStep("delivered");
        } else if (tick === 4 && attempts[1]) {
          setSupporterAttempts((current) =>
            updateAttempt(current, attempts[1].id, "confirmed")
          );
          setConfirmedSupporter({
            name: attempts[1].name,
            relationship: attempts[1].relationship,
          });
          setEscalationStep("connected");
        }

        if (tick >= 4) {
          if (holdingIntervalRef.current) {
            clearInterval(holdingIntervalRef.current);
            holdingIntervalRef.current = null;
          }
        }
      }, 2500);
    },
    []
  );

  const handleEscalation = useCallback(
    (payload: NotifyCirclePayload, meta: EscalationMeta) => {
      setHasEscalated(true);
      setEscalationStep("contacting");
      setCallMode(meta.callMode ?? payload.call_mode ?? "sequential");
      setSupporterAttempts(meta.supporterAttempts ?? []);
      setConfirmedSupporter(null);

      if (holdingIntervalRef.current) {
        clearInterval(holdingIntervalRef.current);
        holdingIntervalRef.current = null;
      }

      if (meta.demo) {
        setIsDemoEscalation(true);
        setEscalationSessionId(null);
        holdingIntervalRef.current = advanceDemoEscalation(
          meta.supporterAttempts ?? [],
          meta.callMode ?? payload.call_mode ?? "sequential"
        );
      } else if (meta.sessionId) {
        setIsDemoEscalation(false);
        setEscalationSessionId(meta.sessionId);
      }
    },
    [advanceDemoEscalation]
  );

  const {
    status,
    isListening,
    micLevel,
    error,
    isAssistantSpeaking,
    toggle,
    disconnect,
  } = useGrokVoiceAgent({
    memberName: "Frank",
    onEscalation: handleEscalation,
  });

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setTwilioConfigured(data.twilioConfigured))
      .catch(() => setTwilioConfigured(false));
  }, []);

  useEffect(() => {
    if (!escalationSessionId || isDemoEscalation) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/escalation-status?id=${escalationSessionId}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.step) {
          setEscalationStep(data.step);
        }
        if (data.callMode) {
          setCallMode(data.callMode);
        }
        if (Array.isArray(data.supporterAttempts)) {
          setSupporterAttempts(data.supporterAttempts);
        }
        setConfirmedSupporter(data.confirmedSupporter ?? null);
      } catch {
        // ignore polling errors
      }
    };

    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [escalationSessionId, isDemoEscalation]);

  const handleReset = () => {
    if (holdingIntervalRef.current) {
      clearInterval(holdingIntervalRef.current);
      holdingIntervalRef.current = null;
    }
    disconnect();
    setHasEscalated(false);
    setEscalationSessionId(null);
    setIsDemoEscalation(false);
    setEscalationStep("contacting");
    setCallMode("sequential");
    setSupporterAttempts([]);
    setConfirmedSupporter(null);
  };

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gradient-to-b from-slate-50 via-teal-50/30 to-slate-100">
      {hasEscalated && (
        <div className="flex justify-end px-6 pt-6">
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 underline"
          >
            Start over
          </button>
        </div>
      )}

      {!hasEscalated ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6">
          <div className="pointer-events-auto">
            <HelpButton
              onToggle={toggle}
              isActive={isListening}
              isConnecting={status === "connecting"}
              micLevel={micLevel}
              isAssistantSpeaking={isAssistantSpeaking}
              disabled={status === "connecting"}
            />
          </div>
          {error && (
            <p className="pointer-events-auto mt-6 min-h-[1.25rem] text-center text-sm text-amber-700">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="relative z-10 flex flex-1 flex-col">
          <EscalationStatus
            currentStep={escalationStep}
            callMode={callMode}
            supporterAttempts={supporterAttempts}
            confirmedSupporter={confirmedSupporter}
            twilioConfigured={twilioConfigured}
          />
        </div>
      )}

      <div className="relative z-10 mt-auto shrink-0">
        <MyCircleFooter />
      </div>
    </main>
  );
}
