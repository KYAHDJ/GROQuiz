"use client";

import { useEffect, useRef } from "react";
import { useQuiz } from "@/context/QuizContext";

export default function HintTimer() {
  const { state, tick } = useQuiz();
  const { elapsed, answered, timerPaused } = state;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (answered || timerPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [answered, timerPaused, tick]);

  const pct = Math.min((elapsed / 45) * 100, 100);
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;

  let colorClass = "stroke-slate-400";
  if (elapsed >= 30) colorClass = "stroke-red-500";
  else if (elapsed >= 20) colorClass = "stroke-amber-500";
  else if (elapsed >= 10) colorClass = "stroke-yellow-400";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-slate-800"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${colorClass} transition-all duration-700 ease-linear`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-200 tabular-nums">
          {elapsed}s
        </span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i <= state.hintStage
                ? ["bg-slate-500", "bg-yellow-400", "bg-amber-400", "bg-red-400"][i]
                : "bg-slate-800"
            }`}
          />
        ))}
      </div>
    </div>
  );
}