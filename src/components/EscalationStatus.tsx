import type {
  CallMode,
  EscalationStep,
  SupporterAttempt,
  SupporterStatus,
} from "@/lib/types";

const STEPS: { key: EscalationStep; label: string }[] = [
  { key: "contacting", label: "I'm contacting My Circle now." },
  { key: "calling", label: "Calling support person..." },
  { key: "delivered", label: "Message delivered." },
  { key: "waiting", label: "Calling you now..." },
  { key: "connected", label: "You're connected with My Circle." },
];

const STATUS_LABELS: Record<SupporterStatus, string> = {
  pending: "Waiting",
  calling: "Calling...",
  ringing: "Ringing...",
  listening: "Heard message",
  declined: "Not available",
  confirmed: "Connecting",
  unavailable: "No answer",
};

const STATUS_STYLES: Record<SupporterStatus, string> = {
  pending: "bg-slate-100 text-slate-500",
  calling: "bg-amber-100 text-amber-800",
  ringing: "bg-amber-100 text-amber-800 animate-pulse",
  listening: "bg-sky-100 text-sky-800",
  declined: "bg-slate-100 text-slate-500",
  confirmed: "bg-teal-100 text-teal-800",
  unavailable: "bg-slate-100 text-slate-400",
};

interface EscalationStatusProps {
  currentStep: EscalationStep;
  callMode?: CallMode;
  supporterAttempts?: SupporterAttempt[];
  confirmedSupporter?: { name: string; relationship: string } | null;
  twilioConfigured: boolean;
}

export function EscalationStatus({
  currentStep,
  callMode = "sequential",
  supporterAttempts = [],
  confirmedSupporter = null,
  twilioConfigured,
}: EscalationStatusProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const isConnected = currentStep === "connected";
  const showSupporterList = supporterAttempts.length > 0;

  return (
    <div className="flex flex-1 flex-col px-6 py-8">
      <h2 className="mb-2 text-center text-xl font-medium text-slate-800">
        {isConnected ? "You're connected" : "Help is on the way"}
      </h2>
      {showSupporterList && (
        <p className="mb-6 text-center text-sm text-slate-500">
          {callMode === "parallel"
            ? "Reaching everyone in My Circle at once"
            : "Calling My Circle one person at a time"}
        </p>
      )}

      {showSupporterList ? (
        <div className="mx-auto w-full max-w-sm space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            My Circle
          </p>
          {supporterAttempts.map((attempt) => {
            const isActive =
              attempt.status === "calling" ||
              attempt.status === "ringing" ||
              attempt.status === "listening";
            const isConfirmed = attempt.status === "confirmed";

            return (
              <div
                key={attempt.id}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${isConfirmed
                    ? "border-teal-200 bg-teal-50/80"
                    : isActive
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-slate-200 bg-white/80"
                  }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {attempt.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {attempt.relationship}
                  </p>
                </div>
                <span
                  className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[attempt.status]}`}
                >
                  {STATUS_LABELS[attempt.status]}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
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
                      ${isComplete
                        ? "bg-teal-500 text-white"
                        : isCurrent
                          ? "bg-teal-100 text-teal-700 ring-2 ring-teal-400"
                          : "bg-slate-100 text-slate-400"
                      }
                    `}
                  >
                    {isComplete ? (
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
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
                      className={`my-1 min-h-[2rem] w-0.5 flex-1 ${isComplete ? "bg-teal-400" : "bg-slate-200"
                        }`}
                    />
                  )}
                </div>
                <div className={`pb-6 ${isPending ? "opacity-40" : ""}`}>
                  <p
                    className={`text-sm leading-snug ${isCurrent
                        ? "font-medium text-teal-800"
                        : isComplete
                          ? "text-slate-600"
                          : "text-slate-500"
                      }`}
                  >
                    {step.label}
                  </p>
                  {isCurrent && step.key === "waiting" && (
                    <p className="mt-1 animate-pulse text-xs text-slate-400">
                      Answer your phone to connect.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-auto rounded-2xl bg-teal-50/80 px-5 py-4 text-center">
        <p className="text-sm leading-relaxed text-teal-800">
          {isConnected ? (
            <>
              {confirmedSupporter ? (
                <>
                  {confirmedSupporter.name} ({confirmedSupporter.relationship})
                  is on the line with you.
                </>
              ) : (
                <>You&apos;re on the line with someone from My Circle.</>
              )}
              <br />
              You do not have to handle this alone.
            </>
          ) : (
            <>
              While we wait, take one slow breath.
              <br />
              You do not have to handle this alone.
            </>
          )}
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
