"use client";

import { Check, X, Pause, Play, Lock, Gauge } from "lucide-react";
import { useQuiz, DIFFICULTY_LABELS } from "@/context/QuizContext";

export default function QuestionNav() {
  const { state, goToQuestion, togglePause } = useQuiz();
  const { questions, results, currentIndex, timerPaused, mode, stats, retryRound, retryIds } =
    state;

  const locked = mode === "hard";

  const answeredFor = (i: number) => {
    const r = results.find((x) => x.questionId === questions[i]?.id);
    return r ? (r.correct ? "correct" : "wrong") : "none";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-1 border ${
            mode === "hard"
              ? "bg-red-500/10 text-red-300 border-red-500/30"
              : "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30"
          }`}
        >
          <Gauge size={12} />
          {retryRound
            ? "Retry round — fix the ones you missed"
            : mode === "hard"
              ? `Hard · ${DIFFICULTY_LABELS[4]} · locked order · 30s each`
              : `${DIFFICULTY_LABELS[stats.tier]} · adjusts as you answer`}
        </span>

        <button
          type="button"
          onClick={togglePause}
          className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 border transition-colors ${
            timerPaused
              ? "bg-fuchsia-600 text-white border-fuchsia-600 hover:bg-fuchsia-500"
              : "bg-[#251C33] text-[#B8A9C8] border-[#3A2E50] hover:text-[#F0EAF6] hover:border-[#6E5F81]"
          }`}
        >
          {timerPaused ? <Play size={12} /> : <Pause size={12} />}
          {timerPaused ? "Continue" : "Pause"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((_, i) => {
          const status = answeredFor(i);
          const isCurrent = i === currentIndex;
          const isAnswered = status !== "none";
          const isRetry = retryRound || retryIds.includes(questions[i]?.id ?? "");
          const showLock =
            locked && !isAnswered && !isCurrent && i > currentIndex;

          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => goToQuestion(i)}
              title={
                locked
                  ? "Locked — answer in order"
                  : `Question ${i + 1}${status === "correct" ? " (correct)" : status === "wrong" ? " (missed)" : ""}`
              }
              className={`relative h-8 min-w-8 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                isCurrent
                  ? "bg-fuchsia-400 text-[#151021] border-fuchsia-400"
                  : status === "correct"
                    ? "bg-emerald-400/20 text-emerald-400 border-emerald-400/40"
                    : status === "wrong"
                      ? "bg-red-400/20 text-red-400 border-red-400/40"
                      : "bg-[#151021] text-[#8D7FA0] border-[#3A2E50] hover:border-[#6E5F81] hover:text-[#B8A9C8]"
              } ${locked ? "cursor-not-allowed" : ""}`}
            >
              {status === "correct" ? (
                <Check size={13} />
              ) : status === "wrong" ? (
                <X size={13} />
              ) : showLock ? (
                <Lock size={11} className="text-[#6E5F81]" />
              ) : (
                i + 1
              )}
              {isRetry && (
                <span className="absolute -top-1.5 -right-1 text-[8px] font-extrabold text-amber-400">
                  R
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}