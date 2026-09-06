"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag, Pause, Play, Check, X, Star } from "lucide-react";
import { useQuiz } from "@/context/QuizContext";
import type { HistoryRecord } from "@/lib/types";
import PdfUpload from "./PdfUpload";
import QuestionNav from "./QuestionNav";
import QuizCard from "./QuizCard";
import PowerupShop from "./PowerupShop";
import ScoreDisplay from "./ScoreDisplay";
import ConfirmModal from "./ConfirmModal";

function BrandLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-lg bg-gradient-to-br from-fuchsia-400 to-violet-500 flex items-center justify-center shrink-0"
    >
      <svg width={size * 0.5} height={size * 0.5} fill="none" viewBox="0 0 16 16">
        <path d="M8 1L10.5 6H15L11 9.5L12.5 15L8 12L3.5 15L5 9.5L1 6H5.5L8 1Z" fill="white" />
      </svg>
    </div>
  );
}

export default function GamePage() {
  const { state, togglePause, resetGame, adaptUpcoming } = useQuiz();
  const [shopOpen, setShopOpen] = useState(false);
  const [review, setReview] = useState<HistoryRecord | null>(null);
  const [pausedOpen, setPausedOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const adaptingRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.screen === "quiz" && state.mode === "balanced" && !state.retryRound && !state.isManual) {
      const idx = state.currentIndex + 1;
      if (idx < state.questions.length && adaptingRef.current !== idx) {
        adaptingRef.current = idx;
        adaptUpcoming().finally(() => {
          if (adaptingRef.current === idx) adaptingRef.current = null;
        });
      }
    }
  }, [state.screen, state.mode, state.retryRound, state.currentIndex, state.questions.length, adaptUpcoming]);

  if (state.screen === "landing") {
    if (review) {
      return <ScoreDisplay record={review} onBack={() => setReview(null)} />;
    }
    return <PdfUpload onReview={(r) => setReview(r)} />;
  }

  if (state.screen === "loading") {
    return (
      <div className="min-h-dvh bg-[#151021] flex flex-col items-center justify-center gap-5 px-4 screen-enter">
        <BrandLogo size={52} />
        <div className="w-10 h-10 border-4 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm font-semibold text-[#F0EAF6]">
            Generating your quiz…
          </p>
          <p className="text-xs text-[#8D7FA0] mt-1">
            Preparing your adaptive flashcards.
          </p>
        </div>
      </div>
    );
  }

  if (state.screen === "results") {
    return <ScoreDisplay />;
  }

  /* ----- Quiz screen ----- */
  const idx = state.currentIndex + 1;
  const total = state.questions.length;
  const activeQ = state.questions[state.currentIndex];
  const activeResult = activeQ
    ? state.results.find((r) => r.questionId === activeQ.id)
    : undefined;
  const answeredNow = Boolean(activeResult);
  const correctNow = activeResult?.correct;

  const answeredFor = (i: number) => {
    const r = state.results.find((x) => x.questionId === state.questions[i]?.id);
    return r ? (r.correct ? "correct" : "wrong") : "none";
  };

  const openPause = () => {
    if (!state.timerPaused) togglePause();
    setPausedOpen(true);
  };
  const resumeQuiz = () => {
    setPausedOpen(false);
    if (state.timerPaused) togglePause();
  };

  return (
    <div className="min-h-dvh bg-[#151021] flex flex-col">
      {/* Pause overlay */}
      {pausedOpen && (
        <div className="fixed inset-0 z-50 bg-[#151021]/90 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-[#251C33] rounded-2xl border border-[#3A2E50] p-8 sm:p-10 flex flex-col items-center gap-6 w-80 max-w-full shadow-2xl screen-enter">
            <div className="w-16 h-16 rounded-2xl bg-fuchsia-400/10 border border-fuchsia-400/30 flex items-center justify-center">
              <Pause size={28} className="text-fuchsia-400" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-[#F0EAF6]">Quiz Paused</p>
              <p className="text-sm text-[#8D7FA0] mt-1">
                Your timer is paused. Take a breath.
              </p>
            </div>
            <button
              type="button"
              onClick={resumeQuiz}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-fuchsia-400 text-[#151021] font-bold text-sm hover:from-fuchsia-400 hover:to-fuchsia-300 transition-all"
            >
              Resume Quiz
            </button>
            <button
              type="button"
              onClick={() => setExitOpen(true)}
              className="text-sm text-[#8D7FA0] hover:text-red-400 transition-colors"
            >
              Exit quiz
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#151021]/95 backdrop-blur-sm border-b border-[#3A2E50] px-4 md:px-8 py-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={openPause}
          aria-label="Pause quiz"
          title="Pause quiz"
          className="w-9 h-9 shrink-0 rounded-xl border border-[#3A2E50] flex items-center justify-center text-[#8D7FA0] hover:text-[#F0EAF6] hover:border-[#6E5F81] transition-all"
        >
          <Pause size={15} />
        </button>

        <div className="flex flex-col items-center gap-1.5 min-w-0">
          <p className="text-base font-bold text-[#F0EAF6] tabular-nums">
            Q{idx} / {total}
          </p>
          <div className="flex gap-1 flex-wrap justify-center items-center">
            {state.questions.slice(0, 20).map((_, i) => {
              const st = answeredFor(i);
              return (
                <div
                  key={i}
                  className={`w-5 h-1.5 rounded-full transition-all ${
                    st === "correct"
                      ? "bg-emerald-400"
                      : st === "wrong"
                        ? "bg-red-400"
                        : i < idx - 1
                          ? "bg-fuchsia-400"
                          : i === idx - 1
                            ? "bg-fuchsia-400/80"
                            : "bg-[#3A2E50]"
                  }`}
                />
              );
            })}
            {total > 20 && (
              <span className="text-[10px] font-semibold text-[#8D7FA0] ml-1">
                +{total - 20}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          {answeredNow && (
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                correctNow
                  ? "bg-emerald-400/20 text-emerald-400"
                  : "bg-red-400/20 text-red-400"
              }`}
            >
              {correctNow ? (
                <span className="inline-flex items-center gap-1">
                  <Check size={12} strokeWidth={3} /> Correct!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <X size={12} strokeWidth={3} /> Incorrect
                </span>
              )}
            </span>
          )}
          <span className="bg-[#251C33] border border-[#3A2E50] rounded-full px-3 py-1.5 text-xs font-bold text-fuchsia-400 tabular-nums whitespace-nowrap">
            {state.stats.points} pts
          </span>
        </div>
      </header>

      {/* Retry round banner */}
      {state.retryRound && (
        <div className="mx-4 md:mx-auto md:max-w-2xl mt-4 rounded-xl bg-fuchsia-400/10 border border-fuchsia-400/30 px-5 py-3 screen-enter">
          <p className="text-sm text-fuchsia-400 font-medium">
            Retry round — missed or timed-out questions, worth{" "}
            <span className="font-bold">half points</span>.
          </p>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 md:px-0 py-6 space-y-5 screen-enter">
        {state.timerPaused && !pausedOpen && !answeredNow && (
          <button
            type="button"
            onClick={togglePause}
            className="w-full bg-[#251C33] border border-fuchsia-400/30 rounded-xl px-4 py-3 text-sm text-fuchsia-300 flex items-center justify-center gap-2 hover:bg-[#151021] transition-colors"
          >
            <Play size={14} />
            Paused — click to continue
          </button>
        )}
        <QuestionNav />
        <QuizCard />
      </main>

      {state.mode === "balanced" && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setShopOpen(true)}
            className="bg-gradient-to-r from-fuchsia-600 to-violet-500 hover:from-fuchsia-500 hover:to-violet-400 text-white rounded-full p-3.5 shadow-lg shadow-fuchsia-900/40 transition-all"
            title="Power-up Shop"
          >
            <ShoppingBag size={22} />
          </button>
        </div>
      )}

      <footer className="text-center py-4 text-xs text-[#3A2E50] flex items-center justify-center gap-1.5">
        <Star size={10} className="text-violet-500" />
        GROQuiz
      </footer>

      <ConfirmModal
        open={exitOpen}
        title="Exit this quiz?"
        message="Your progress will be cleared — you can start a new one anytime."
        confirmLabel="Exit Quiz"
        onConfirm={() => resetGame()}
        onCancel={() => setExitOpen(false)}
      />

      <PowerupShop open={shopOpen} onClose={() => setShopOpen(false)} />
    </div>
  );
}