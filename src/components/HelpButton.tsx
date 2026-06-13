interface HelpButtonProps {
  onToggle: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

export function HelpButton({
  onToggle,
  disabled,
  isActive,
}: HelpButtonProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={`
          relative flex h-56 w-56 select-none items-center justify-center
          rounded-full transition-all duration-300
          focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300/50
          disabled:opacity-50
          ${
            isActive
              ? "scale-95 shadow-lg shadow-teal-500/30"
              : "hover:scale-[1.02] active:scale-95 shadow-xl shadow-teal-400/25"
          }
        `}
        aria-label={isActive ? "Stop voice session" : "Tap the circle for help"}
      >
        {/* Outer ring */}
        <span
          className={`absolute inset-0 rounded-full border-[3px] ${
            isActive ? "border-teal-500 bg-teal-500" : "border-teal-500 bg-teal-50"
          }`}
        />

        {/* Inner circle */}
        <span
          className={`absolute inset-5 rounded-full ${
            isActive
              ? "bg-teal-600"
              : "bg-gradient-to-br from-teal-400 to-teal-600"
          }`}
        />

        {/* Center dot */}
        <span
          className={`relative rounded-full ${
            isActive
              ? "h-4 w-4 bg-white animate-pulse"
              : "h-3 w-3 bg-white/90"
          }`}
        />

        {isActive && (
          <span className="absolute inset-0 animate-ping rounded-full border-2 border-teal-400/50" />
        )}
      </button>

      <p className="max-w-xs text-center text-sm leading-relaxed text-slate-600">
        {isActive ? (
          <>Tap the circle when you&apos;re done.</>
        ) : (
          <>
            Tap the circle.
            <br />
            We&apos;ll stay with you while we reach your Circle.
          </>
        )}
      </p>
    </div>
  );
}
