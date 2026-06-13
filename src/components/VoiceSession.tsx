interface VoiceSessionProps {
  userTranscript?: string;
  assistantTranscript?: string;
  micLevel?: number;
  isAssistantSpeaking?: boolean;
}

export function VoiceSession({
  userTranscript,
  assistantTranscript,
  micLevel = 0,
  isAssistantSpeaking,
}: VoiceSessionProps) {
  const scale = 1 + Math.min(micLevel * 8, 0.4);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div
        className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-teal-100 transition-transform duration-75"
        style={{ transform: `scale(${scale})` }}
      >
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`inline-block w-1 rounded-full ${
                isAssistantSpeaking ? "bg-teal-400" : "bg-teal-500"
              }`}
              style={{
                height: `${12 + micLevel * 400 + Math.sin(i) * 6}px`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      <h2 className="mb-2 text-xl font-medium text-slate-800">
        {isAssistantSpeaking ? "Stay with me" : "I'm listening"}
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        Speak freely. Tap the button when you&apos;re done.
      </p>

      {userTranscript && (
        <div className="mb-4 w-full max-w-sm rounded-2xl bg-white/80 px-5 py-4 shadow-sm ring-1 ring-slate-200/60">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            You
          </p>
          <p className="text-center text-base leading-relaxed text-slate-700">
            &ldquo;{userTranscript}&rdquo;
          </p>
        </div>
      )}

      {assistantTranscript && (
        <div className="w-full max-w-sm rounded-2xl bg-teal-50 px-5 py-4 shadow-sm ring-1 ring-teal-100">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-teal-500">
            Coordinator
          </p>
          <p className="text-center text-base leading-relaxed text-teal-900">
            {assistantTranscript}
          </p>
        </div>
      )}
    </div>
  );
}
