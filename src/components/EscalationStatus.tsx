import type { EscalationStep } from "@/lib/types";

const STEPS: { key: EscalationStep; label: string }[] = [
  { key: "contacting", label: "I'm contacting your Circle now." },
  { key: "calling", label: "Calling support person..." },
  { key: "delivered", label: "Message delivered." },
  { key: "waiting", label: "Waiting for callback." },
];

interface EscalationStatusProps {
  currentStep: EscalationStep;
  memberName?: string;
  twilioConfigured: boolean;
}

export function EscalationStatus({
  currentStep,
  memberName = "Frank",
  twilioConfigured,
}: EscalationStatusProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex flex-1 flex-col px-6 py-8">
      <h2 className="mb-2 text-center text-xl font-medium text-slate-800">
        Help is on the way
      </h2>
      <p className="mb-8 text-center text-sm text-slate-500">
        Your support person has been contacted. Stay on this screen.
      </p>

      <div className="mx-auto w-full max-w-sm space-y-0">
        {STEPS.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium
                    ${
                      isComplete
                        ? "bg-teal-500 text-white"
                        : isCurrent
                          ? "bg-teal-100 text-teal-700 ring-2 ring-teal-400"
                          : "bg-slate-100 text-slate-400"
                    }
                  `}
                >
                  {isComplete ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`my-1 w-0.5 flex-1 min-h-[2rem] ${
                      isComplete ? "bg-teal-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
              <div className={`pb-6 ${isPending ? "opacity-40" : ""}`}>
                <p
                  className={`text-sm leading-snug ${
                    isCurrent
                      ? "font-medium text-teal-800"
                      : isComplete
                        ? "text-slate-600"
                        : "text-slate-500"
                  }`}
                >
                  {step.label}
                </p>
                {isCurrent && step.key === "calling" && (
                  <p className="mt-1 text-xs text-slate-400 animate-pulse">
                    Ringing {memberName}&apos;s support person...
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto rounded-2xl bg-teal-50/80 px-5 py-4 text-center">
        <p className="text-sm leading-relaxed text-teal-800">
          While we wait, take one slow breath.
          <br />
          You do not have to handle this alone.
        </p>
      </div>

      {!twilioConfigured && (
        <p className="mt-4 text-center text-xs text-amber-600">
          Demo mode: Twilio not configured. Timeline shown for presentation.
        </p>
      )}
    </div>
  );
}
