"use client";

import { useEffect, useRef } from "react";
import { useQuiz } from "@/context/QuizContext";

export default function HintTimer() {
  const { state, tick } = useQuiz();
  const { elapsed, answered, timerPaused, timeLimit, mode } = state;

  const tickRef = useRef(tick);
  tickRef.current = tick;
  const pausedRef = useRef(false);
  pausedRef.current = answered || timerPaused;

  useEffect(() => {
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      tickRef.current();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = Math.max(0, timeLimit - elapsed);
  const pct = Math.min((elapsed / timeLimit) * 100, 100);
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;

  let colorClass = "stroke-slate-400";
  if (pct >= 75) colorClass = "stroke-red-500";
  else if (pct >= 50) colorClass = "stroke-amber-500";
  else if (pct >= 25) colorClass = "stroke-yellow-400";

  const urgency =
    remaining <= timeLimit * 0.1
      ? "Time's up — pick your best guess!"
      : remaining <= timeLimit * 0.3
        ? "Hurry — every second counts!"
        : remaining <= timeLimit * 0.5
          ? "Answer now to avoid a score penalty!"
          : mode === "balanced" && remaining <= timeLimit * 0.75
            ? "Hint active!"
            : mode === "balanced" && remaining <= timeLimit * 0.9
              ? "Keywords highlighted!"
              : "";

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
          {remaining}s
        </span>
      </div>
      {mode === "balanced" && (
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
      )}
      {urgency && (
        <p
          className={`text-[10px] font-medium text-center max-w-[80px] leading-tight ${
            remaining <= timeLimit * 0.3 ? "text-red-400" : "text-amber-400"
          }`}
        >
          {urgency}
        </p>
      )}
    </div>
  );
}