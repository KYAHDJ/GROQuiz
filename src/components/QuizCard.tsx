"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  X,
  Lightbulb,
  ArrowRight,
  BrainCircuit,
  Zap,
  Clock,
  RotateCw,
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

  const {
    selected,
    answered,
    isFlipped,
    hintStage,
    timerPaused,
    inventory,
  } = state;

  const q: FlashcardQuestion | null = currentQuestion;

  const [clarification, setClarification] = useState<string | null>(null);
  const [loadingClarify, setLoadingClarify] = useState(false);
  const [eliminated, setEliminated] = useState<Set<number>>(new Set());
  const [localFlipped, setLocalFlipped] = useState(false);
  const [freezeActive, setFreezeActive] = useState(false);
  const freezeQuestionIdRef = useRef<string | undefined>(undefined);
  const answeredRef = useRef(answered);
  answeredRef.current = answered;

  useEffect(() => {
    if (q && !answered && !timerPaused) {
      startTimer();
    }
  }, [q?.id]);

  const fiftyFiftyAutoApplied =
    hintStage >= 3 && !answered && eliminated.size === 0;

  useEffect(() => {
    if (q && fiftyFiftyAutoApplied) {
      const wrongIndices: number[] = [];
      q.options.forEach((_, i) => {
        if (i !== q.correctIndex) wrongIndices.push(i);
      });
      const shuffled = wrongIndices.sort(() => Math.random() - 0.5);
      setEliminated(new Set(shuffled.slice(0, 2)));
    }
  }, [fiftyFiftyAutoApplied, q?.id]);

  useEffect(() => {
    setEliminated(new Set());
    setClarification(null);
    setLocalFlipped(false);
    setFreezeActive(false);
  }, [q?.id]);

  if (!q) return null;

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
        if (
          freezeQuestionIdRef.current !== q.id ||
          answeredRef.current
        ) {
          return;
        }
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
    if (inventory["50-50"] <= 0 || answered) return;
    usePowerup("50-50");
    setEliminated(nextTwoWrong(q));
  };

  function nextTwoWrong(question: FlashcardQuestion): Set<number> {
    const wrongIndices: number[] = [];
    question.options.forEach((_, i) => {
      if (i !== question.correctIndex) wrongIndices.push(i);
    });
    const shuffled = wrongIndices.sort(() => Math.random() - 0.5);
    return new Set(shuffled.slice(0, 2));
  }

  const showKeywords = hintStage >= 1 && !answered;
  const showTip = hintStage >= 2 && !answered;

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <div className="perspective-1200">
        <div
          className={`relative transition-transform duration-500 preserve-3d ${
            localFlipped || isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* FRONT */}
          <div
            className="backface-hidden w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 sm:p-8 space-y-5"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 font-medium">
                Q{state.currentIndex + 1}/{state.questions.length}
              </p>
              <div className="flex items-center gap-2">
                {!answered && <FlipToggle onFlip={() => setLocalFlipped(true)} />}
              </div>
            </div>

            {freezeActive && (
              <div className="bg-cyan-500/10 border border-cyan-500/25 rounded-xl px-4 py-2 text-xs text-cyan-300 flex items-center gap-2">
                <Clock size={13} className="shrink-0" />
                Timer frozen for 15 seconds — take your time!
              </div>
            )}

            {!localFlipped ? (
              <>
                <h2
                  className={`text-lg sm:text-xl font-semibold leading-relaxed ${
                    showKeywords ? "" : "text-slate-100"
                  }`}
                >
                  {showKeywords ? highlightKeywords(q.question) : q.question}
                </h2>

                {showTip && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-amber-200/90 animate-slide-up flex items-start gap-2">
                    <Lightbulb size={14} className="shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      Hint: Look for the key relationship in the question — the
                      answer often connects cause to effect.
                    </span>
                  </div>
                )}

                {eliminated.size > 0 && !answered && (
                  <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-2 text-xs text-yellow-300 flex items-center gap-2">
                    <Zap size={13} className="shrink-0" />
                    50/50 applied — {eliminated.size} options removed.
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2.5">
                  {q.options.map((opt, i) => {
                    const isEliminated = eliminated.has(i);
                    const isSelected = selected === i;
                    const isCorrectAnswer = i === q.correctIndex;
                    let optStyle =
                      "bg-slate-900/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80 text-slate-200";

                    if (answered) {
                      if (isCorrectAnswer) {
                        optStyle =
                          "bg-emerald-500/15 border-emerald-500/50 text-emerald-300";
                      } else if (isSelected && !isCorrectAnswer) {
                        optStyle = "bg-red-500/15 border-red-500/50 text-red-300";
                      } else {
                        optStyle = "bg-slate-900/30 border-slate-800 text-slate-500";
                      }
                    } else if (isSelected) {
                      optStyle = "bg-cyan-500/10 border-cyan-500/40 text-cyan-200";
                    }

                    return (
                      <button
                        key={i}
                        disabled={answered || isEliminated}
                        onClick={() => selectAnswer(i)}
                        className={`relative text-left border rounded-xl px-4 py-3 text-sm sm:text-base transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${optStyle}`}
                      >
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-700/60 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="pl-8">{opt}</span>
                        {answered && isCorrectAnswer && (
                          <Check
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400"
                          />
                        )}
                        {answered && isSelected && !isCorrectAnswer && (
                          <X
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {!answered && (
                  <button
                    disabled={selected === null}
                    onClick={confirmAnswer}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-3 transition-colors"
                  >
                    Confirm Answer
                  </button>
                )}

                {answered && (
                  <div className="space-y-4 animate-slide-up">
                    <div className="bg-slate-900/80 border border-slate-700/40 rounded-xl p-4 text-sm text-slate-300 leading-relaxed">
                      <span className="font-medium text-slate-200 block mb-1">
                        {selected === q.correctIndex ? "Correct!" : "Incorrect"}
                      </span>
                      {q.explanation}
                    </div>

                    <button
                      onClick={nextQuestion}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
                    >
                      Next Question
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                <p className="text-sm text-slate-400">Explanation</p>
                <p className="text-slate-200 leading-relaxed">{q.explanation}</p>
                <button
                  onClick={() => setLocalFlipped(false)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                >
                  Flip back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* POWERUP BUTTONS */}
      {!answered && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <PowerupButton
            icon={<Zap size={14} className="text-yellow-400" />}
            label="50/50"
            count={inventory["50-50"]}
            disabled={inventory["50-50"] <= 0 || eliminated.size >= 2}
            onClick={handleUseFiftyFifty}
          />
          <PowerupButton
            icon={<Clock size={14} className="text-cyan-400" />}
            label={freezeActive ? "Frozen…" : "Freeze 15s"}
            count={inventory["time-extension"]}
            disabled={
              inventory["time-extension"] <= 0 || freezeActive || timerPaused
            }
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
          <span className="font-medium text-violet-300 block mb-1">
            AI Analogy
          </span>
          {clarification}
        </div>
      )}
    </div>
  );
}

function FlipToggle({ onFlip }: { onFlip: () => void }) {
  return (
    <button
      onClick={onFlip}
      title="Flip card to see explanation"
      className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-300 transition-colors"
    >
      <RotateCw size={14} />
      Flip
    </button>
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