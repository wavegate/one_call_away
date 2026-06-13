"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EscalationStatus } from "@/components/EscalationStatus";
import { HelpButton } from "@/components/HelpButton";
import { MyCircleFooter } from "@/components/MyCircleFooter";
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
