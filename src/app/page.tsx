"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EscalationStatus } from "@/components/EscalationStatus";
import { HelpButton } from "@/components/HelpButton";
import { MyCircleFooter } from "@/components/MyCircleFooter";
import { VoiceSession } from "@/components/VoiceSession";
import {
  useGrokVoiceAgent,
  type NotifyCirclePayload,
} from "@/hooks/useGrokVoiceAgent";
import type { EscalationStep } from "@/lib/types";

export default function Home() {
  const [escalationStep, setEscalationStep] =
    useState<EscalationStep>("contacting");
  const [hasEscalated, setHasEscalated] = useState(false);
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const holdingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const advanceEscalation = useCallback(() => {
    const steps: EscalationStep[] = [
      "contacting",
      "calling",
      "delivered",
      "waiting",
    ];
    let index = 0;
    setEscalationStep("contacting");

    return setInterval(() => {
      index += 1;
      if (index < steps.length) {
        setEscalationStep(steps[index]);
      } else {
        if (holdingIntervalRef.current) {
          clearInterval(holdingIntervalRef.current);
          holdingIntervalRef.current = null;
        }
      }
    }, 2500);
  }, []);

  const handleEscalation = useCallback(
    (_payload: NotifyCirclePayload) => {
      setHasEscalated(true);
      if (holdingIntervalRef.current) {
        clearInterval(holdingIntervalRef.current);
      }
      holdingIntervalRef.current = advanceEscalation();
    },
    [advanceEscalation]
  );

  const {
    status,
    isListening,
    userTranscript,
    assistantTranscript,
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

  const handleReset = () => {
    if (holdingIntervalRef.current) {
      clearInterval(holdingIntervalRef.current);
      holdingIntervalRef.current = null;
    }
    disconnect();
    setHasEscalated(false);
    setEscalationStep("contacting");
  };

  const showVoiceSession = isListening && !hasEscalated;
  const showEscalation = hasEscalated;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-gradient-to-b from-slate-50 via-teal-50/30 to-slate-100">
      <header className="px-6 pt-12 pb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
          My Circle
        </h1>
        {hasEscalated && (
          <button
            onClick={handleReset}
            className="mt-3 text-xs text-slate-400 underline"
          >
            Start over
          </button>
        )}
      </header>

      <div className="flex flex-1 flex-col">
        {!showVoiceSession && !showEscalation && (
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <HelpButton
              onToggle={toggle}
              isActive={false}
              disabled={status === "connecting"}
            />
            {error && (
              <p className="mt-6 text-center text-sm text-amber-700">{error}</p>
            )}
            {status === "connecting" && (
              <p className="mt-4 text-center text-sm text-slate-500">
                Connecting...
              </p>
            )}
          </div>
        )}

        {showVoiceSession && (
          <div className="flex flex-1 flex-col">
            <VoiceSession
              userTranscript={userTranscript}
              assistantTranscript={assistantTranscript}
              micLevel={micLevel}
              isAssistantSpeaking={isAssistantSpeaking}
            />
            <div className="flex justify-center pb-8">
              <HelpButton onToggle={toggle} isActive />
            </div>
            {error && (
              <p className="px-6 pb-4 text-center text-sm text-amber-700">
                {error}
              </p>
            )}
          </div>
        )}

        {showEscalation && (
          <EscalationStatus
            currentStep={escalationStep}
            twilioConfigured={twilioConfigured}
          />
        )}
      </div>

      <MyCircleFooter />
    </main>
  );
}
