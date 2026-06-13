interface AgentResponseProps {
  response: string;
  isSpeaking?: boolean;
}

export function AgentResponse({ response, isSpeaking }: AgentResponseProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div
        className={`mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 ring-2 ring-teal-200 ${isSpeaking ? "animate-pulse" : ""}`}
      >
        <svg
          className="h-9 w-9 text-teal-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
      </div>
      <h2 className="mb-4 text-xl font-medium text-slate-800">
        {isSpeaking ? "Stay with me" : "I hear you"}
      </h2>
      <div className="w-full max-w-sm rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-teal-100">
        <p className="text-center text-base leading-relaxed text-slate-700">
          {response}
        </p>
      </div>
    </div>
  );
}
