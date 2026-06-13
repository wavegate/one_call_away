interface HelpButtonProps {
  onPressStart: () => void;
  onPressEnd: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

export function HelpButton({
  onPressStart,
  onPressEnd,
  disabled,
  isActive,
}: HelpButtonProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={(e) => {
          e.preventDefault();
          onPressStart();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          onPressEnd();
        }}
        onPointerLeave={(e) => {
          if (isActive) {
            e.preventDefault();
            onPressEnd();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={`
          relative flex h-52 w-52 select-none touch-none items-center justify-center
          rounded-full text-white shadow-xl transition-all duration-300
          focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300/50
          disabled:opacity-50
          ${
            isActive
              ? "scale-95 bg-gradient-to-br from-teal-500 to-teal-700 shadow-teal-500/40"
              : "bg-gradient-to-br from-teal-400 to-teal-600 shadow-teal-400/30 hover:scale-[1.02] active:scale-95"
          }
        `}
        aria-label="Hold for Help"
      >
        <span className="pointer-events-none flex flex-col items-center gap-2">
          <svg
            className={`h-10 w-10 transition-opacity ${isActive ? "opacity-100" : "opacity-90"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
          <span className="text-lg font-semibold tracking-wide">
            {isActive ? "Listening..." : "Hold for Help"}
          </span>
        </span>
        {isActive && (
          <span className="absolute inset-0 animate-ping rounded-full bg-teal-400/30" />
        )}
      </button>
      <p className="max-w-xs text-center text-sm leading-relaxed text-slate-600">
        Tell us what&apos;s going on.
        <br />
        We&apos;ll stay with you while we reach your Circle.
      </p>
    </div>
  );
}
