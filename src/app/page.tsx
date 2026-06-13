"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AgentResponse } from "@/components/AgentResponse";
import { EscalationStatus } from "@/components/EscalationStatus";
import { HelpButton } from "@/components/HelpButton";
import { SafetyFooter } from "@/components/SafetyFooter";
import { VoiceSession } from "@/components/VoiceSession";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import type { AgentDecision, AppState, EscalationStep } from "@/lib/types";

const DEMO_TRANSCRIPT =
  "I'm feeling urges and I'm concerned I'm going to use.";

const HOLDING_LINES = [
  "I'm contacting your support person now.",
  "Stay with me for the next minute.",
  "Take one slow breath.",
  "You do not have to handle this alone.",
];

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [agentDecision, setAgentDecision] = useState<AgentDecision | null>(
    null
  );
  const [escalationStep, setEscalationStep] =
    useState<EscalationStep>("contacting");
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const holdingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    speak,
  } = useVoiceSession();

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setTwilioConfigured(data.twilioConfigured))
      .catch(() => setTwilioConfigured(false));
  }, []);

  const advanceEscalation = useCallback(() => {
    const steps: EscalationStep[] = [
      "contacting",
      "calling",
      "delivered",
      "waiting",
    ];
    let index = 0;

    setEscalationStep("contacting");

    const interval = setInterval(() => {
      index += 1;
      if (index < steps.length) {
        setEscalationStep(steps[index]);
      } else {
        clearInterval(interval);
        setAppState("waiting");
      }
    }, 2500);

    return interval;
  }, []);

  const processTranscript = useCallback(
    async (finalTranscript: string) => {
      setAppState("processing");

      const text = finalTranscript.trim() || DEMO_TRANSCRIPT;

      try {
        const agentRes = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text }),
        });
        const decision: AgentDecision = await agentRes.json();
        setAgentDecision(decision);
        setAppState("responding");
        setIsSpeaking(true);

        await speak(decision.memberResponse);
        setIsSpeaking(false);

        if (decision.needsHuman && decision.escalationPath === "call_supporter") {
          setAppState("escalating");
          holdingIntervalRef.current = advanceEscalation();

          await fetch("/api/escalate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transcript: text,
              supporterMessage: decision.supporterMessage,
            }),
          });

          let holdingIndex = 0;
          const holdingTimer = setInterval(async () => {
            if (holdingIndex < HOLDING_LINES.length) {
              setIsSpeaking(true);
              await speak(HOLDING_LINES[holdingIndex]);
              setIsSpeaking(false);
              holdingIndex += 1;
            } else {
              clearInterval(holdingTimer);
            }
          }, 4000);
        } else {
          setTimeout(() => {
            setAppState("idle");
            setAgentDecision(null);
          }, 3000);
        }
      } catch {
        setAppState("idle");
      }
    },
    [speak, advanceEscalation]
  );

  const handlePressStart = useCallback(() => {
    if (appState !== "idle") return;
    setAppState("listening");
    startListening();
  }, [appState, startListening]);

  const handlePressEnd = useCallback(() => {
    if (appState !== "listening") return;
    const final = stopListening();
    processTranscript(final);
  }, [appState, stopListening, processTranscript]);

  const handleReset = () => {
    if (holdingIntervalRef.current) {
      clearInterval(holdingIntervalRef.current);
    }
    window.speechSynthesis?.cancel();
    setAppState("idle");
    setAgentDecision(null);
    setEscalationStep("contacting");
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gradient-to-b from-slate-50 via-teal-50/30 to-slate-100">
      <header className="px-6 pt-12 pb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
          One Call Away
        </h1>
        {(appState === "waiting" || appState === "escalating") && (
          <button
            onClick={handleReset}
            className="mt-3 text-xs text-slate-400 underline"
          >
            Start over
          </button>
        )}
      </header>

      <div className="flex flex-1 flex-col">
        {appState === "idle" && (
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <HelpButton
              onPressStart={handlePressStart}
              onPressEnd={handlePressEnd}
              isActive={false}
            />
            {!isSupported && (
              <p className="mt-6 text-center text-xs text-amber-600">
                Voice not supported in this browser. Use Chrome on mobile for
                best results.
              </p>
            )}
          </div>
        )}

        {appState === "listening" && (
          <VoiceSession transcript={transcript} />
        )}

        {appState === "processing" && (
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-200 border-t-teal-600" />
            <p className="mt-4 text-sm text-slate-500">Understanding...</p>
          </div>
        )}

        {appState === "responding" && agentDecision && (
          <AgentResponse
            response={agentDecision.memberResponse}
            isSpeaking={isSpeaking}
          />
        )}

        {(appState === "escalating" || appState === "waiting") && (
          <EscalationStatus
            currentStep={escalationStep}
            twilioConfigured={twilioConfigured}
          />
        )}
      </div>

      <SafetyFooter />
    </main>
  );
}
