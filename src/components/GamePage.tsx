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
      className="rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shrink-0"
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
      <div className="min-h-dvh bg-[#0F172A] flex flex-col items-center justify-center gap-5 px-4 screen-enter">
        <BrandLogo size={52} />
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm font-semibold text-[#E2E8F0]">
            Generating your quiz…
          </p>
          <p className="text-xs text-[#64748B] mt-1">
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
    <div className="min-h-dvh bg-[#0F172A] flex flex-col">
      {/* Pause overlay */}
      {pausedOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/90 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-8 sm:p-10 flex flex-col items-center gap-6 w-80 max-w-full shadow-2xl screen-enter">
            <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
              <Pause size={28} className="text-cyan-400" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-[#E2E8F0]">Quiz Paused</p>
              <p className="text-sm text-[#64748B] mt-1">
                Your timer is paused. Take a breath.
              </p>
            </div>
            <button
              type="button"
              onClick={resumeQuiz}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0F172A] font-bold text-sm hover:from-cyan-400 hover:to-cyan-300 transition-all"
            >
              Resume Quiz
            </button>
            <button
              type="button"
              onClick={() => setExitOpen(true)}
              className="text-sm text-[#64748B] hover:text-red-400 transition-colors"
            >
              Exit quiz
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#0F172A]/95 backdrop-blur-sm border-b border-[#334155] px-4 md:px-8 py-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={openPause}
          aria-label="Pause quiz"
          title="Pause quiz"
          className="w-9 h-9 shrink-0 rounded-xl border border-[#334155] flex items-center justify-center text-[#64748B] hover:text-[#E2E8F0] hover:border-[#475569] transition-all"
        >
          <Pause size={15} />
        </button>

        <div className="flex flex-col items-center gap-1.5 min-w-0">
          <p className="text-base font-bold text-[#E2E8F0] tabular-nums">
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
                          ? "bg-cyan-400"
                          : i === idx - 1
                            ? "bg-cyan-400/80"
                            : "bg-[#334155]"
                  }`}
                />
              );
            })}
            {total > 20 && (
              <span className="text-[10px] font-semibold text-[#64748B] ml-1">
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
          <span className="bg-[#1E293B] border border-[#334155] rounded-full px-3 py-1.5 text-xs font-bold text-cyan-400 tabular-nums whitespace-nowrap">
            {state.stats.points} pts
          </span>
        </div>
      </header>

      {/* Retry round banner */}
      {state.retryRound && (
        <div className="mx-4 md:mx-auto md:max-w-2xl mt-4 rounded-xl bg-cyan-400/10 border border-cyan-400/30 px-5 py-3 screen-enter">
          <p className="text-sm text-cyan-400 font-medium">
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
            className="w-full bg-[#1E293B] border border-cyan-400/30 rounded-xl px-4 py-3 text-sm text-cyan-300 flex items-center justify-center gap-2 hover:bg-[#0F172A] transition-colors"
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
            className="bg-gradient-to-r from-cyan-600 to-violet-500 hover:from-cyan-500 hover:to-violet-400 text-white rounded-full p-3.5 shadow-lg shadow-cyan-900/40 transition-all"
            title="Power-up Shop"
          >
            <ShoppingBag size={22} />
          </button>
        </div>
      )}

      <footer className="text-center py-4 text-xs text-[#334155] flex items-center justify-center gap-1.5">
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