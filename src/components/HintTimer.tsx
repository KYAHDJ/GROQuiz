"use client";

import { useEffect, useRef } from "react";
import { useQuiz } from "@/context/QuizContext";

export default function HintTimer() {
  const { state, tick } = useQuiz();
  const { elapsed, answered, timerPaused, timeLimit, mode, isManual } = state;

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
  const progress = timeLimit ? remaining / timeLimit : 0;
  const isLow = remaining <= Math.floor(timeLimit * 0.25);
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const timeText = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

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
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#1E293B"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={isLow ? "#F87171" : "#22D3EE"}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.9s linear, stroke 0.3s",
            }}
          />
        </svg>
        <span
          className={`absolute text-base font-bold tabular-nums ${
            isLow ? "text-red-400" : "text-[#E2E8F0]"
          }`}
        >
          {timeText}
        </span>
      </div>
      {mode === "balanced" && !isManual && (
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i <= state.hintStage
                  ? ["bg-cyan-400", "bg-amber-400", "bg-amber-400", "bg-red-400"][i]
                  : "bg-[#334155]"
              }`}
            />
          ))}
        </div>
      )}
      {urgency && (
        <p
          className={`text-[10px] font-medium text-center max-w-[88px] leading-tight ${
            remaining <= timeLimit * 0.3 ? "text-red-400" : "text-amber-400"
          }`}
        >
          {urgency}
        </p>
      )}
    </div>
  );
}