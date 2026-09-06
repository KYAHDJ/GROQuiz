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
  Award,
} from "lucide-react";
import { useQuiz } from "@/context/QuizContext";
import type { FlashcardQuestion } from "@/lib/types";

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
              ? "text-yellow-300 font-semibold underline decoration-yellow-300/40 underline-offset-2"
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
    startTimer,
    currentQuestion,
  } = useQuiz();

  const { selected, answered, hintStage, timerPaused, inventory, mode, retryRound } =
    state;

  const hintsOn = mode === "balanced";

  const q: FlashcardQuestion | null = currentQuestion;

  const [clarification, setClarification] = useState<string | null>(null);
  const [loadingClarify, setLoadingClarify] = useState(false);
  const [fiftyActive, setFiftyActive] = useState(false);
  const [shrunk, setShrunk] = useState<Set<number>>(new Set());
  const [freezeActive, setFreezeActive] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintFetched, setHintFetched] = useState(false);
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
    if (q && !answered && !timerPaused) {
      startTimer();
    }
  }, [q?.id]);

  useEffect(() => {
    setClarification(null);
    setHint(null);
    setHintFetched(false);
    setFiftyActive(false);
    setShrunk(new Set());
    shrinkPickedRef.current = false;
    setFreezeActive(false);
  }, [q?.id]);

  const showTip = hintsOn && hintStage >= 2 && !answered;
  const showKeywords = hintsOn && hintStage >= 1 && !answered;

  useEffect(() => {
    if (hintsOn && hintStage >= 3 && q && !answered && !fiftyActive && !shrinkPickedRef.current) {
      shrinkPickedRef.current = true;
      setShrunk(pickTwoWrong(q));
      setFiftyActive(true);
    }
  }, [hintStage, hintsOn, q, answered, fiftyActive, pickTwoWrong]);

  useEffect(() => {
    if (hintsOn && showTip && !hintFetched && q) {
      setHintFetched(true);
      fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
        }),
      })
        .then((r) => r.json())
        .then((d) => setHint(d.hint ?? null))
        .catch(() => setHint(null));
    }
  }, [showTip, hintFetched, q]);

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
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <div className="mb-1 text-center text-[11px] text-slate-500">
        {hintStage >= 1 && !answered
          ? "Hints active — score drops 25% per hint"
          : "Answer fast for a bigger score"}
      </div>

      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 font-medium">
            {retryRound ? `Retry Q${state.currentIndex + 1}/${state.questions.length}` : `Q${state.currentIndex + 1}/${state.questions.length}`}
          </p>
          {answered && (
            <span
              className={`text-xs font-bold flex items-center gap-1.5 ${
                isCorrectAnswer ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {isCorrectAnswer ? <Check size={14} /> : <X size={14} />}
              {isCorrectAnswer ? "Correct!" : "Incorrect"}
            </span>
          )}
        </div>

        {freezeActive && (
          <div className="bg-cyan-500/10 border border-cyan-500/25 rounded-xl px-4 py-2 text-xs text-cyan-300 flex items-center gap-2">
            <Clock size={13} className="shrink-0" />
            Timer frozen for 15 seconds — take your time!
          </div>
        )}

        <h2 className="text-slate-100 text-lg sm:text-xl font-semibold leading-relaxed">
          {showKeywords ? highlightKeywords(q.question) : q.question}
        </h2>

        {showTip && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 text-xs sm:text-sm text-amber-200/90 animate-slide-up flex items-start gap-2">
            <Lightbulb
              size={14}
              className="shrink-0 mt-0.5 text-amber-400 animate-pulse-hint"
            />
            <span>{hint ?? "Loading hint…"}</span>
          </div>
        )}

        {fiftyActive && !answered && (
          <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl px-4 py-2 text-xs text-slate-400 flex items-center gap-2">
            <Zap size={13} className="shrink-0 text-yellow-400" />
            Smaller options are probably wrong — bigger one stands out. You decide.
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5">
          {q.options.map((opt, i) => {
            const isShrunk = shrunk.has(i);
            const isBoosted = fiftyActive && i === q.correctIndex;
            const isSelected = selected === i;
            const isCorrect = i === q.correctIndex;

            let optStyle =
              "bg-slate-900/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80 text-slate-200";
            let extraClasses = "";

            if (answered) {
              if (isCorrect) {
                optStyle =
                  "bg-emerald-500/15 border-emerald-500/50 text-emerald-300";
              } else if (isSelected && !isCorrect) {
                optStyle = "bg-red-500/15 border-red-500/50 text-red-300";
              } else {
                optStyle = "bg-slate-900/30 border-slate-800 text-slate-500";
              }
            } else if (isShrunk) {
              optStyle = "bg-slate-900/40 border-slate-800 text-slate-500";
              extraClasses = "opacity-50 scale-[0.92] py-1.5 text-xs";
            } else if (isBoosted) {
              optStyle =
                "bg-emerald-500/15 border-emerald-500/60 text-emerald-200 ring-2 ring-emerald-500/50";
              extraClasses = "scale-[1.06] font-semibold py-4";
            } else if (isSelected) {
              optStyle = "bg-cyan-500/10 border-cyan-500/40 text-cyan-200";
            }

            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                onClick={() => selectAnswer(i)}
                className={`relative text-left border rounded-xl px-4 py-3 text-sm sm:text-base transition-all duration-300 disabled:cursor-not-allowed ${optStyle} ${extraClasses}`}
              >
                <span
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${
                    isBoosted && !answered
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-700/60 text-slate-400"
                  } flex items-center justify-center text-[10px] font-bold`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className={`pl-8 ${isShrunk && !answered ? "block truncate" : ""}`}>
                  {opt}
                </span>
                {answered && isCorrect && (
                  <Check
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400"
                  />
                )}
                {answered && isSelected && !isCorrect && (
                  <X
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400"
                  />
                )}
              </button>
            );
          })}
        </div>

        {answered ? (
          <div className="animate-slide-up space-y-4 border-t border-slate-700/60 pt-4">
            <div
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                isCorrectAnswer
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/10 border border-red-500/30 text-red-300"
              }`}
            >
              {isCorrectAnswer
                ? "Correct! Nice work."
                : `Incorrect — the answer was: ${q.options[q.correctIndex]}`}
              <span className="ml-2 text-xs font-normal text-slate-400">
                answered in {state.elapsed}s
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Award size={12} className="text-cyan-400" />
                Explanation
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">{q.explanation}</p>
            </div>

            <button
              type="button"
              onClick={nextQuestion}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
            >
              Next Question
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={selected === null}
            onClick={confirmAnswer}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            Confirm Answer
          </button>
        )}
      </div>

      {/* POWERUP BUTTONS */}
      {!answered && mode === "balanced" && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <PowerupButton
            icon={<Zap size={14} className="text-yellow-400" />}
            label={fiftyActive ? "Hint on" : "50/50"}
            count={inventory["50-50"]}
            disabled={inventory["50-50"] <= 0 || fiftyActive}
            onClick={handleUseFiftyFifty}
          />
          <PowerupButton
            icon={<Clock size={14} className="text-cyan-400" />}
            label={freezeActive ? "Frozen…" : "Freeze 15s"}
            count={inventory["time-extension"]}
            disabled={inventory["time-extension"] <= 0 || freezeActive || timerPaused}
            onClick={() => handleUsePowerup("time-extension")}
          />
          <PowerupButton
            icon={<BrainCircuit size={14} className="text-violet-400" />}
            label="AI Clarifier"
            count={inventory["ai-clarifier"]}
            disabled={inventory["ai-clarifier"] <= 0 || loadingClarify}
            onClick={() => handleUsePowerup("ai-clarifier")}
          />
        </div>
      )}

      {clarification && (
        <div className="mt-3 bg-violet-500/10 border border-violet-500/25 rounded-xl px-4 py-3 text-sm text-violet-200/90 animate-slide-up max-w-xl mx-auto">
          <span className="font-medium text-violet-300 block mb-1">AI Analogy</span>
          {clarification}
        </div>
      )}
    </div>
  );
}

function PowerupButton({
  icon,
  label,
  count,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 transition-all"
    >
      {icon}
      <span>{label}</span>
      <span className="text-slate-500">×{count}</span>
    </button>
  );
}