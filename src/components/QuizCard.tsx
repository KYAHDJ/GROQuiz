"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  X,
  Lightbulb,
  ArrowRight,
  BrainCircuit,
  Zap,
  Clock,
  Trophy,
  Loader2,
} from "lucide-react";
import { useQuiz, DIFFICULTY_LABELS } from "@/context/QuizContext";
import type { FlashcardQuestion } from "@/lib/types";
import HintTimer from "./HintTimer";

function highlightKeywords(text: string): React.ReactNode {
  const words = text.split(/(\s+)/);
  const keyWords = words.filter(
    (w) => w.length > 5 && !/^\s+$/.test(w) && /^[a-z]/.test(w)
  );
  const top5 = new Set(keyWords.slice(0, 5).map((w) => w.toLowerCase()));

  return (
    <>
      {words.map((w, i) => (
        <span
          key={i}
          className={
            top5.has(w.toLowerCase().trim())
              ? "bg-amber-400/20 text-[#F0EAF6] rounded-[3px] px-0.5"
              : ""
          }
        >
          {w}
        </span>
      ))}
    </>
  );
}

export default function QuizCard() {
  const {
    state,
    selectAnswer,
    confirmAnswer,
    nextQuestion,
    usePowerup,
    togglePause,
    currentQuestion,
    hintCache,
    requestHint,
  } = useQuiz();

  const { selected, answered, hintStage, timerPaused, inventory, mode, retryRound, isManual } =
    state;

  const hintsOn = mode === "balanced" && !isManual;

  const q: FlashcardQuestion | null = currentQuestion;

  const [clarification, setClarification] = useState<string | null>(null);
  const [loadingClarify, setLoadingClarify] = useState(false);
  const [fiftyActive, setFiftyActive] = useState(false);
  const [shrunk, setShrunk] = useState<Set<number>>(new Set());
  const [powerupUsed, setPowerupUsed] = useState(false);
  const [freezeActive, setFreezeActive] = useState(false);
  const [freezeLeft, setFreezeLeft] = useState<number | null>(null);
  const shrinkPickedRef = useRef(false);
  const freezeQuestionIdRef = useRef<string | undefined>(undefined);
  const answeredRef = useRef(answered);
  answeredRef.current = answered;

  const pickTwoWrong = useCallback(
    (question: FlashcardQuestion): Set<number> => {
      const wrong: number[] = [];
      question.options.forEach((_, i) => {
        if (i !== question.correctIndex) wrong.push(i);
      });
      return new Set(wrong.sort(() => Math.random() - 0.5).slice(0, 2));
    },
    []
  );

  useEffect(() => {
    setClarification(null);
    setFiftyActive(false);
    setShrunk(new Set());
    setPowerupUsed(false);
    shrinkPickedRef.current = false;
    setFreezeActive(false);
    setFreezeLeft(null);
  }, [q?.id]);

  useEffect(() => {
    if (!freezeActive) {
      setFreezeLeft(null);
      return;
    }
    setFreezeLeft(15);
    const iv = setInterval(
      () => setFreezeLeft((v) => (v === null || v <= 1 ? 0 : v - 1)),
      1000
    );
    return () => clearInterval(iv);
  }, [freezeActive]);

  const showTip = hintsOn && hintStage >= 2 && !answered;
  const showKeywords = hintsOn && hintStage >= 1 && !answered;

  useEffect(() => {
    if (hintsOn && hintStage >= 3 && q && !answered && !fiftyActive && !shrinkPickedRef.current) {
      shrinkPickedRef.current = true;
      setShrunk(pickTwoWrong(q));
      setFiftyActive(true);
      setPowerupUsed(true);
    }
  }, [hintStage, hintsOn, q, answered, fiftyActive, pickTwoWrong]);

  useEffect(() => {
    if (hintsOn && showTip && !hintCache[q?.id ?? ""] && q) {
      requestHint(q, state.stats.tier);
    }
  }, [showTip, q, hintCache, requestHint, hintsOn, state.stats.tier]);

  if (!q) return null;

  const questionResult = answered
    ? state.results.find((r) => r.questionId === q.id)
    : undefined;
  const isCorrectAnswer = answered
    ? selected !== null
      ? selected === q.correctIndex
      : questionResult?.correct ?? false
    : selected === q.correctIndex;

  const handleUsePowerup = async (
    name: "50-50" | "time-extension" | "ai-clarifier"
  ) => {
    if (inventory[name] <= 0 || answered) return;
    usePowerup(name);
    setPowerupUsed(true);

    if (name === "time-extension") {
      freezeQuestionIdRef.current = q.id;
      togglePause();
      setFreezeActive(true);
      setTimeout(() => {
        if (freezeQuestionIdRef.current !== q.id || answeredRef.current) return;
        togglePause();
        setFreezeActive(false);
      }, 15000);
    }

    if (name === "ai-clarifier") {
      setLoadingClarify(true);
      try {
        const res = await fetch("/api/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q.question, options: q.options }),
        });
        const data = await res.json();
        setClarification(data.analogy ?? null);
      } catch {
        setClarification("Could not load AI clarification right now.");
      } finally {
        setLoadingClarify(false);
      }
    }
  };

  const handleUseFiftyFifty = () => {
    if (inventory["50-50"] <= 0 || answered || fiftyActive) return;
    usePowerup("50-50");
    shrinkPickedRef.current = true;
    setShrunk(pickTwoWrong(q));
    setFiftyActive(true);
    setPowerupUsed(true);
  };

  const progressPct = (state.currentIndex / Math.max(1, state.questions.length)) * 100;
  const lastRetry = retryRound && state.currentIndex + 1 >= state.questions.length;

  const badgeBase =
    "w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all";

  return (
    <div className="space-y-4">
      {/* Question card */}
      <div className="bg-[#251C33] rounded-2xl border border-[#3A2E50] p-5 sm:p-6 space-y-5 screen-enter">
        {/* Progress bar + timer row */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-1.5 bg-[#151021] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                mode === "hard" ? "bg-red-400" : "bg-fuchsia-400"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <HintTimer />
        </div>

        {/* Tag row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#8D7FA0] bg-[#151021] border border-[#3A2E50] rounded-full px-3 py-1">
            {retryRound
              ? "Retry round"
              : mode === "hard"
                ? `Hard · ${DIFFICULTY_LABELS[4]}`
                : DIFFICULTY_LABELS[state.stats.tier]}
          </span>
          <span className="text-xs text-amber-400/80">
            {hintStage >= 1 && !answered
              ? "Score drops 25% per hint"
              : "Answer fast for a bigger score"}
          </span>
        </div>

        {freezeActive && (
          <div className="bg-fuchsia-400/10 border border-fuchsia-400/30 rounded-xl px-4 py-2.5 text-xs text-fuchsia-300 flex items-center gap-2 screen-enter">
            <Clock size={13} className="shrink-0" />
            <span className="flex-1">
              Timer frozen — {freezeLeft ?? 15}s left, take your time!
            </span>
            <div className="w-16 h-1.5 bg-[#151021] rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-fuchsia-400 rounded-full transition-all duration-1000"
                style={{ width: `${((freezeLeft ?? 15) / 15) * 100}%` }}
              />
            </div>
          </div>
        )}

        <h2 className="text-fluid-base font-semibold text-[#F0EAF6] leading-relaxed [overflow-wrap:anywhere]">
          {showKeywords ? highlightKeywords(q.question) : q.question}
        </h2>

        {showTip && (
          <div className="flex items-start gap-3 bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 animate-slide-up">
            <Lightbulb
              size={16}
              className="shrink-0 mt-0.5 text-amber-400 animate-pulse-hint"
            />
            <p className="text-sm text-amber-300 leading-relaxed [overflow-wrap:anywhere]">
              {hintCache[q.id] ?? "Preparing hint…"}
            </p>
          </div>
        )}

        {fiftyActive && !answered && (
          <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-2.5 text-xs text-amber-300">
            <Zap size={13} className="shrink-0" />
            Two options are out. One of the two remaining is correct — choose!
          </div>
        )}

        {/* Answer options */}
        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const isShrunk = shrunk.has(i);
            const isSelected = selected === i;
            const isCorrect = i === q.correctIndex;

            let rowClass =
              "border-[#3A2E50] bg-[#151021] text-[#B8A9C8] hover:border-[#6E5F81] hover:text-[#F0EAF6]";
            let extra = "";
            let badgeClass = `${badgeBase} border-[#3A2E50] text-[#8D7FA0]`;

            if (answered) {
              if (isCorrect) {
                rowClass = "border-emerald-400 bg-emerald-400/10 text-emerald-400";
                badgeClass = `${badgeBase} border-emerald-400 bg-emerald-400 text-[#151021]`;
              } else if (isSelected && !isCorrect) {
                rowClass = "border-red-400 bg-red-400/10 text-red-400";
                badgeClass = `${badgeBase} border-red-400 bg-red-400 text-[#151021]`;
              } else {
                rowClass = "border-[#3A2E50] bg-[#151021] text-[#6E5F81]";
              }
            } else if (isShrunk) {
              rowClass =
                "border-[#3A2E50] bg-[#151021] text-[#8D7FA0] cursor-not-allowed";
              extra = "scale-[0.92] origin-left py-1.5 text-xs opacity-70";
            } else if (isSelected) {
              rowClass =
                "border-fuchsia-400 bg-fuchsia-400/10 text-[#F0EAF6] ring-2 ring-fuchsia-400/40";
              badgeClass = `${badgeBase} border-fuchsia-400 bg-fuchsia-400 text-[#151021]`;
            } else if (fiftyActive) {
              rowClass =
                "border-[#6E5F81] bg-[#251C33] text-[#F0EAF6] hover:border-fuchsia-400/70";
              extra = "py-4 text-base font-semibold";
            }

            return (
              <button
                key={i}
                type="button"
                disabled={answered || isShrunk}
                onClick={() => selectAnswer(i)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-200 text-sm font-medium ${rowClass} ${extra}`}
              >
                <span className={badgeClass}>
                  {answered && isCorrect ? (
                    <Check size={14} strokeWidth={3} />
                  ) : answered && isSelected && !isCorrect ? (
                    <X size={14} strokeWidth={3} />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                <span className="flex-1 min-w-0 text-[15px] leading-snug [overflow-wrap:anywhere]">
                  {opt}
                </span>
                {answered && isCorrect && (
                  <span className="shrink-0">
                    <Check size={17} strokeWidth={3} className="text-emerald-400" />
                  </span>
                )}
                {answered && isSelected && !isCorrect && (
                  <span className="shrink-0">
                    <X size={17} strokeWidth={3} className="text-red-400" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Answered block */}
        {answered && (
          <div className="space-y-3 border-t border-[#3A2E50] pt-4 screen-enter">
            <div
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                isCorrectAnswer
                  ? "bg-emerald-400/10 border border-emerald-400/30 text-emerald-400"
                  : "bg-red-400/10 border border-red-400/30 text-red-400"
              }`}
            >
              {isCorrectAnswer
                ? "Correct! Nice work."
                : `Incorrect — the answer was: ${q.options[q.correctIndex]}`}
              <span className="ml-2 text-xs font-normal text-[#8D7FA0]">
                answered in {state.elapsed}s
              </span>
              {questionResult && (
                <span
                  className={`ml-2 inline-flex items-center gap-1 text-xs font-bold tabular-nums ${
                    isCorrectAnswer ? "text-emerald-400" : "text-[#B8A9C8]"
                  }`}
                >
                  +{questionResult.pointsEarned} pts
                </span>
              )}
            </div>

            <div className="flex gap-4 bg-[#151021] rounded-xl border border-[#3A2E50] p-4">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-400/10 flex items-center justify-center">
                <Trophy size={20} className="text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F0EAF6] mb-1">Explanation</p>
                <p className="text-sm text-[#B8A9C8] leading-relaxed [overflow-wrap:anywhere]">
                  {q.explanation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Power-ups (balanced only, one per question) */}
      {!answered && mode === "balanced" && !powerupUsed && (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            disabled={inventory["50-50"] <= 0 || fiftyActive}
            onClick={handleUseFiftyFifty}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Zap size={14} />
            50/50 <span className="opacity-60">×{inventory["50-50"]}</span>
          </button>
          <button
            type="button"
            disabled={inventory["time-extension"] <= 0 || freezeActive || timerPaused}
            onClick={() => handleUsePowerup("time-extension")}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-400 text-xs font-semibold hover:bg-fuchsia-400/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Clock size={14} />
            {freezeActive ? "Frozen…" : "Freeze +15s"}{" "}
            <span className="opacity-60">×{inventory["time-extension"]}</span>
          </button>
          <button
            type="button"
            disabled={inventory["ai-clarifier"] <= 0 || loadingClarify}
            onClick={() => handleUsePowerup("ai-clarifier")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border border-violet-400/40 bg-violet-400/10 text-violet-400 text-xs font-semibold hover:bg-violet-400/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isManual ? "hidden" : ""}`}
          >
            <BrainCircuit size={14} />
            AI Clarifier{" "}
            <span className="opacity-60">×{inventory["ai-clarifier"]}</span>
          </button>
        </div>
      )}

      {/* AI Clarifier panel */}
      {(loadingClarify || clarification) && (
        <div className="bg-violet-500/10 border border-violet-400/30 rounded-2xl p-5 screen-enter space-y-2">
          <div className="flex items-center gap-2">
            <BrainCircuit size={16} className="text-violet-400" />
            <span className="text-sm font-semibold text-violet-300">AI Clarifier</span>
          </div>
          <p className="text-sm text-[#B8A9C8] leading-relaxed [overflow-wrap:anywhere]">
            {loadingClarify ? (
              <span className="flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-violet-400" />
                Explaining in simpler words…
              </span>
            ) : (
              clarification
            )}
          </p>
        </div>
      )}

      {/* Action button */}
      <div className="pt-1">
        {!answered ? (
          <button
            type="button"
            disabled={selected === null}
            onClick={confirmAnswer}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-fuchsia-600 via-fuchsia-500 to-violet-500 text-white hover:from-fuchsia-500 hover:via-fuchsia-400 hover:to-violet-400 shadow-lg shadow-fuchsia-500/20"
          >
            Confirm Answer
          </button>
        ) : (
          <button
            type="button"
            onClick={nextQuestion}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-200 ${
              lastRetry
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20"
                : "bg-gradient-to-r from-fuchsia-600 via-fuchsia-500 to-fuchsia-400 text-[#151021] hover:from-fuchsia-500 hover:to-fuchsia-300 shadow-lg shadow-fuchsia-500/20"
            }`}
          >
            {lastRetry ? "See Results" : "Next Question"}
            <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}