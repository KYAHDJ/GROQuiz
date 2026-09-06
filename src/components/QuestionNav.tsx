"use client";

import { Check, X, Pause, Play, Gauge } from "lucide-react";
import { useQuiz, DIFFICULTY_LABELS } from "@/context/QuizContext";

export default function QuestionNav() {
  const { state, goToQuestion, togglePause } = useQuiz();
  const { questions, results, currentIndex, timerPaused, mode, stats, retryRound } =
    state;

  const locked = mode === "hard";

  const answeredFor = (i: number) => {
    const r = results.find((x) => x.questionId === questions[i]?.id);
    return r ? (r.correct ? "correct" : "wrong") : "none";
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 mb-2">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-1 border ${
            mode === "hard"
              ? "bg-red-500/10 text-red-300 border-red-500/30"
              : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
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
              ? "bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-500"
              : "bg-slate-800/70 text-slate-300 border-slate-700 hover:bg-slate-700"
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
              className={`relative w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center border transition-all ${
                locked
                  ? "cursor-not-allowed"
                  : ""
              } ${
                isCurrent
                  ? "bg-cyan-600 text-white border-cyan-400 ring-1 ring-cyan-400"
                  : status === "correct"
                    ? "bg-emerald-700/60 text-emerald-200 border-emerald-600/40 hover:bg-emerald-600"
                    : status === "wrong"
                      ? "bg-red-700/60 text-red-200 border-red-600/40 hover:bg-red-600"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
              }`}
            >
              {status === "correct" ? (
                <Check size={13} />
              ) : status === "wrong" ? (
                <X size={13} />
              ) : (
                i + 1
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}