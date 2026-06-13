"use client";

import { useEffect, useState } from "react";
import { MyCircleModal } from "./MyCircleModal";

export function MyCircleFooter() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/circle")
      .then((r) => r.json())
      .then((data) => setCount(data.members?.length ?? 0))
      .catch(() => setCount(0));
  }, [open]);

  return (
    <>
      <footer className="px-6 py-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-teal-100 bg-white/80 px-5 py-4 shadow-sm transition-colors hover:border-teal-200 hover:bg-white"
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-teal-800">Your Circle</p>
          </div>
          <div className="flex items-center gap-2">
            {count > 0 && (
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                {count}
              </span>
            )}
            <svg
              className="h-5 w-5 text-teal-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.09 9.09 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
          </div>
        </button>
      </footer>

      <MyCircleModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
