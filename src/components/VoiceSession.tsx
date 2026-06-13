interface VoiceSessionProps {
  transcript: string;
}

export function VoiceSession({ transcript }: VoiceSessionProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-teal-100">
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="inline-block w-1 rounded-full bg-teal-500 animate-pulse"
              style={{
                height: `${16 + Math.sin(i) * 8}px`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
      <h2 className="mb-2 text-xl font-medium text-slate-800">
        I&apos;m listening
      </h2>
      <p className="mb-6 text-sm text-slate-500">Speak freely. Release when done.</p>
      {transcript && (
        <div className="w-full max-w-sm rounded-2xl bg-white/80 px-5 py-4 shadow-sm ring-1 ring-slate-200/60">
          <p className="text-center text-base leading-relaxed text-slate-700">
            &ldquo;{transcript}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
