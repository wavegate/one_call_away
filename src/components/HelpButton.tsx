interface HelpButtonProps {
  onToggle: () => void;
  disabled?: boolean;
  isActive?: boolean;
  isConnecting?: boolean;
  micLevel?: number;
  isAssistantSpeaking?: boolean;
}

export function HelpButton({
  onToggle,
  disabled,
  isActive,
  isConnecting,
  micLevel = 0,
  isAssistantSpeaking,
}: HelpButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`
        group relative h-56 w-56 shrink-0 rounded-full
        bg-gradient-to-br from-teal-400 via-teal-500 to-teal-700
        shadow-[0_16px_48px_rgba(13,148,136,0.28)]
        transition-all duration-300
        focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300/40
        disabled:opacity-50
        ${isActive ? "scale-[0.98]" : "hover:scale-[1.02] active:scale-[0.98]"}
      `}
      aria-label={isActive ? "Stop voice session" : "Start voice session"}
    >
      {/* Subtle inner ring — one circle, not a thick band */}
      <span className="pointer-events-none absolute inset-[18px] rounded-full border border-white/25" />

      {/* Soft highlight */}
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.22),transparent_55%)]" />

      {/* Active glow */}
      {isActive && (
        <span
          className={`pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500 ${
            isAssistantSpeaking
              ? "bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_70%)]"
              : "opacity-0"
          }`}
        />
      )}

      <span className="absolute inset-0 flex items-center justify-center">
        {isConnecting ? (
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/25 border-t-white" />
        ) : isActive ? (
          <span className="flex h-9 items-end justify-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => {
              const base = isAssistantSpeaking ? 14 : 10 + micLevel * 260;
              const height = base + Math.sin(i * 1.1) * 4;
              return (
                <span
                  key={i}
                  className="w-1 rounded-full bg-white"
                  style={{
                    height: `${Math.max(8, height)}px`,
                    opacity: isAssistantSpeaking ? 0.85 : 1,
                    transition: "height 75ms ease-out",
                  }}
                />
              );
            })}
          </span>
        ) : null}
      </span>
    </button>
  );
}
