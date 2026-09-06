import { useState, useEffect, useCallback } from "react";

interface Props {
  mode: "balanced" | "hard";
  timeLimit: number;
  onFinish: (score: number) => void;
  onBack: () => void;
}

const QUESTIONS = [
  {
    id: 1,
    text: "During cellular respiration, which molecule serves as the primary electron carrier in the electron transport chain?",
    keywords: ["cellular respiration", "electron carrier", "electron transport chain", "NADH", "ATP"],
    answers: ["FADH₂", "NAD⁺", "NADH", "Cytochrome c"],
    correct: 2,
    hint: "Think about the molecule produced in glycolysis and the Krebs cycle that carries electrons to Complex I.",
    explanation: "NADH is the primary electron carrier, donating electrons at Complex I of the electron transport chain, which drives the proton gradient used to synthesize ATP.",
    topic: "Cell Biology",
  },
  {
    id: 2,
    text: "The Treaty of Versailles, signed in 1919, imposed which specific financial reparation amount on Germany?",
    keywords: ["Treaty of Versailles", "1919", "financial reparation", "Germany", "132 billion"],
    answers: ["100 billion gold marks", "132 billion gold marks", "50 billion gold marks", "200 billion gold marks"],
    correct: 1,
    hint: "The Reparation Commission set the final figure in May 1921.",
    explanation: "The London Schedule of Payments set German reparations at 132 billion gold marks, a figure that caused severe economic hardship and contributed to political instability.",
    topic: "World History",
  },
  {
    id: 3,
    text: "In JavaScript, what does the async keyword combined with await do to Promise execution?",
    keywords: ["JavaScript", "async", "await", "Promise", "synchronous"],
    answers: [
      "Runs promises on a separate thread",
      "Converts promises to synchronous code blocks",
      "Pauses execution until the promise resolves without blocking the thread",
      "Chains multiple promises automatically",
    ],
    correct: 2,
    hint: "The event loop still runs — only the function's execution is paused.",
    explanation: "async/await syntax pauses function execution at each await point until the Promise resolves, but the JavaScript engine continues executing other code in the event loop.",
    topic: "JavaScript",
  },
  {
    id: 4,
    text: "Which French revolutionary body was responsible for the Reign of Terror from 1793 to 1794?",
    keywords: ["French Revolution", "Reign of Terror", "1793", "Committee", "Robespierre"],
    answers: [
      "The National Assembly",
      "The Directory",
      "The Committee of Public Safety",
      "The Legislative Assembly",
    ],
    correct: 2,
    hint: "This body was led by Maximilien Robespierre and had near-dictatorial powers.",
    explanation: "The Committee of Public Safety, dominated by Robespierre, oversaw the revolutionary tribunals that executed approximately 17,000 people during the Terror.",
    topic: "French Revolution",
  },
  {
    id: 5,
    text: "What is the time complexity of searching in a balanced binary search tree?",
    keywords: ["time complexity", "balanced", "binary search tree", "O(log n)", "search"],
    answers: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
    correct: 2,
    hint: "Each comparison eliminates half the remaining nodes.",
    explanation: "A balanced BST has height O(log n), so each search traverses at most log₂(n) nodes, giving O(log n) time complexity.",
    topic: "Computer Science",
  },
];

function CountdownRing({ seconds, total, isLow }: { seconds: number; total: number; isLow: boolean }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle
          cx="32" cy="32" r={radius}
          fill="none"
          stroke="#1E293B"
          strokeWidth="4"
        />
        <circle
          cx="32" cy="32" r={radius}
          fill="none"
          stroke={isLow ? "#F87171" : "#22D3EE"}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
        />
      </svg>
      <span
        className={`absolute text-base font-bold tabular-nums ${
          isLow ? "text-red-400" : "text-[#E2E8F0]"
        }`}
      >
        {seconds < 10 ? `0:0${seconds}` : `0:${seconds}`}
      </span>
    </div>
  );
}

function KeywordHighlight({ text, keywords }: { text: string; keywords: string[] }) {
  const parts: { text: string; highlight: boolean }[] = [];
  let remaining = text;

  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

  const regex = new RegExp(`(${sortedKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const splitParts = text.split(regex);

  splitParts.forEach(part => {
    const isKeyword = sortedKeywords.some(k => k.toLowerCase() === part.toLowerCase());
    parts.push({ text: part, highlight: isKeyword });
  });

  return (
    <span>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={i} className="bg-transparent text-[#E2E8F0] underline decoration-amber-400 decoration-2 underline-offset-2">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}

export default function QuizScreen({ mode, timeLimit, onFinish, onBack }: Props) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [frozen, setFrozen] = useState(false);
  const [showClarifier, setShowClarifier] = useState(false);
  const [score, setScore] = useState(0);
  const [isRetryRound, setIsRetryRound] = useState(false);
  const [missedQuestions, setMissedQuestions] = useState<number[]>([]);
  const [retryIndex, setRetryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentQuestion = isRetryRound
    ? QUESTIONS[missedQuestions[retryIndex]]
    : QUESTIONS[questionIndex];
  const totalQuestions = QUESTIONS.length;
  const displayIndex = isRetryRound ? retryIndex + 1 : questionIndex + 1;
  const displayTotal = isRetryRound ? missedQuestions.length : totalQuestions;

  const isLow = secondsLeft <= Math.floor(timeLimit * 0.25);

  const handleTimeout = useCallback(() => {
    if (answered) return;
    setAnswered(true);
    setIsCorrect(false);
    if (!isRetryRound) {
      setMissedQuestions(prev => [...prev, questionIndex]);
    }
  }, [answered, isRetryRound, questionIndex]);

  useEffect(() => {
    if (answered || frozen || isPaused) return;
    if (secondsLeft <= 0) { handleTimeout(); return; }
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, answered, frozen, isPaused, handleTimeout]);

  const handleSelectAnswer = (idx: number) => {
    if (answered || eliminated.includes(idx)) return;
    setSelectedAnswer(idx);
  };

  const handleConfirm = () => {
    if (selectedAnswer === null || answered) return;
    const correct = selectedAnswer === currentQuestion.correct;
    setIsCorrect(correct);
    setAnswered(true);
    const hintPenalty = hintsUsed * 0.25;
    const timePenalty = 1 - (secondsLeft / timeLimit) * 0.3;
    const basePoints = correct ? Math.round(100 * (1 - hintPenalty) * timePenalty) : 0;
    const retryMultiplier = isRetryRound ? 0.5 : 1;
    setScore(s => s + Math.round(basePoints * retryMultiplier));
    if (!correct && !isRetryRound) {
      setMissedQuestions(prev => [...prev, questionIndex]);
    }
  };

  const handleNext = () => {
    if (isRetryRound) {
      if (retryIndex < missedQuestions.length - 1) {
        setRetryIndex(i => i + 1);
      } else {
        onFinish(score);
        return;
      }
    } else {
      if (questionIndex < totalQuestions - 1) {
        setQuestionIndex(i => i + 1);
      } else if (missedQuestions.length > 0) {
        setIsRetryRound(true);
        setRetryIndex(0);
      } else {
        onFinish(score);
        return;
      }
    }
    setAnswered(false);
    setSelectedAnswer(null);
    setIsCorrect(false);
    setSecondsLeft(timeLimit);
    setShowHint(false);
    setHintsUsed(0);
    setEliminated([]);
    setFrozen(false);
    setShowClarifier(false);
  };

  const handleFiftyFifty = () => {
    if (eliminated.length > 0) return;
    const wrongAnswers = [0, 1, 2, 3].filter(i => i !== currentQuestion.correct);
    const toEliminate = wrongAnswers.sort(() => Math.random() - 0.5).slice(0, 2);
    setEliminated(toEliminate);
    if (selectedAnswer !== null && toEliminate.includes(selectedAnswer)) {
      setSelectedAnswer(null);
    }
  };

  const handleFreeze = () => {
    setFrozen(true);
    setSecondsLeft(s => Math.min(timeLimit, s + 15));
    setTimeout(() => setFrozen(false), 15000);
  };

  const handleHint = () => {
    if (!showHint) {
      setShowHint(true);
      setHintsUsed(h => h + 1);
    }
  };

  const progressPct = ((displayIndex - 1) / displayTotal) * 100;

  return (
    <div className="min-h-full bg-[#0F172A] flex flex-col">
      {/* Pause overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/90 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-10 flex flex-col items-center gap-6 w-80 shadow-2xl screen-enter">
            <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
              <svg width="28" height="28" fill="none" viewBox="0 0 28 28">
                <rect x="6" y="5" width="5" height="18" rx="2" fill="#22D3EE" />
                <rect x="17" y="5" width="5" height="18" rx="2" fill="#22D3EE" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-[#E2E8F0]">Quiz Paused</p>
              <p className="text-sm text-[#64748B] mt-1">Your timer is paused. Take a breath.</p>
            </div>
            <button
              onClick={() => setIsPaused(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0F172A] font-bold text-sm hover:from-cyan-400 hover:to-cyan-300 transition-all"
            >
              Resume Quiz
            </button>
            <button
              onClick={onBack}
              className="text-sm text-[#64748B] hover:text-red-400 transition-colors"
            >
              Exit quiz
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="border-b border-[#334155] px-4 md:px-8 py-4 flex items-center justify-between gap-4 sticky top-0 bg-[#0F172A]/95 backdrop-blur-sm z-10">
        <button
          onClick={() => setIsPaused(true)}
          className="w-9 h-9 rounded-xl border border-[#334155] flex items-center justify-center text-[#64748B] hover:text-[#E2E8F0] hover:border-[#475569] transition-all"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M10 3l-7 5 7 5V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            {mode === "hard" && (
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="#F87171" strokeWidth="1.2" />
                <path d="M4.5 6V4.5a2.5 2.5 0 115 0V6" stroke="#F87171" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
            <p className="text-base font-bold text-[#E2E8F0]">
              Q{displayIndex} / {displayTotal}
            </p>
          </div>
          {/* Nav chips */}
          <div className="flex gap-1">
            {Array.from({ length: displayTotal }).map((_, i) => (
              <div
                key={i}
                className={`relative w-5 h-1.5 rounded-full transition-all ${
                  i < displayIndex - 1
                    ? "bg-cyan-400"
                    : i === displayIndex - 1
                    ? "bg-cyan-400/80"
                    : "bg-[#334155]"
                }`}
              >
                {isRetryRound && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] text-amber-400 font-bold">R</span>
                )}
                {mode === "hard" && i >= displayIndex - 1 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg width="6" height="6" fill="none" viewBox="0 0 6 6">
                      <rect x="1" y="2.5" width="4" height="3" rx="0.5" stroke="#F87171" strokeWidth="0.8" />
                      <path d="M2 2.5V2a1 1 0 112 0v.5" stroke="#F87171" strokeWidth="0.8" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Score chip + answered chip */}
        <div className="flex items-center gap-2">
          {answered && (
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                isCorrect ? "bg-emerald-400/20 text-emerald-400" : "bg-red-400/20 text-red-400"
              }`}
            >
              {isCorrect ? "Correct!" : "Incorrect"}
            </span>
          )}
          <span className="bg-[#1E293B] border border-[#334155] rounded-full px-3 py-1.5 text-xs font-bold text-cyan-400">
            {score} pts
          </span>
        </div>
      </header>

      {/* Retry round banner */}
      {isRetryRound && (
        <div className="mx-4 md:mx-auto md:max-w-2xl mt-4 rounded-xl bg-cyan-400/10 border border-cyan-400/30 px-5 py-3 flex items-center gap-3">
          <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
            <path d="M9 2v4M9 12v4M2 9h4M12 9h4" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="9" cy="9" r="3" stroke="#22D3EE" strokeWidth="1.5" />
          </svg>
          <p className="text-sm text-cyan-400 font-medium">
            Retry round — missed or timed-out questions, worth <span className="font-bold">half points</span>.
          </p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 md:px-0 py-6 space-y-4">
        {/* Topic tag */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#64748B] bg-[#1E293B] border border-[#334155] rounded-full px-3 py-1">
            {currentQuestion.topic}
          </span>
          {mode === "balanced" && (
            <span className="text-xs text-amber-400/80">
              {showHint ? `Score drops 25% per hint` : "Answer fast for a bigger score"}
            </span>
          )}
          {mode === "hard" && (
            <span className="flex items-center gap-1.5 text-xs text-red-400/80">
              <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                <rect x="2" y="5" width="8" height="6" rx="1" stroke="#F87171" strokeWidth="1" />
                <path d="M3.5 5V3.5a2.5 2.5 0 015 0V5" stroke="#F87171" strokeWidth="1" strokeLinecap="round" />
              </svg>
              Hard mode — no power-ups
            </span>
          )}
        </div>

        {/* Question card */}
        <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6 space-y-5">
          {/* Progress bar + timer row */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-1.5 bg-[#0F172A] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  mode === "hard" ? "bg-red-400" : "bg-cyan-400"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <CountdownRing seconds={secondsLeft} total={timeLimit} isLow={isLow && mode === "hard" ? true : isLow} />
          </div>

          {/* Question text */}
          <h2 className="text-lg font-semibold text-[#E2E8F0] leading-relaxed">
            <KeywordHighlight text={currentQuestion.text} keywords={currentQuestion.keywords} />
          </h2>

          {/* Hint box — balanced only */}
          {mode === "balanced" && showHint && (
            <div className="flex items-start gap-3 bg-amber-400/10 border border-amber-400/30 rounded-xl p-4">
              <svg width="18" height="18" fill="none" viewBox="0 0 18 18" className="shrink-0 mt-0.5">
                <path d="M9 2a5 5 0 013.95 8.08L12 11.5V13H6v-1.5l-.95-1.42A5 5 0 019 2z" stroke="#FBBF24" strokeWidth="1.4" />
                <path d="M7 15h4M8 17h2" stroke="#FBBF24" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <p className="text-sm text-amber-300 leading-relaxed">{currentQuestion.hint}</p>
            </div>
          )}

          {/* Answer options */}
          <div className="space-y-2.5">
            {currentQuestion.answers.map((answer, idx) => {
              const isEliminated = eliminated.includes(idx);
              const isSelected = selectedAnswer === idx;
              const isCorrectAnswer = idx === currentQuestion.correct;

              let answerClass = "border-[#334155] bg-[#0F172A] text-[#94A3B8] hover:border-[#475569] hover:text-[#E2E8F0]";
              if (isEliminated) {
                answerClass = "border-[#334155] bg-[#0F172A] text-[#334155] answer-eliminated cursor-not-allowed";
              } else if (answered) {
                if (isCorrectAnswer) {
                  answerClass = "border-emerald-400 bg-emerald-400/10 text-emerald-400";
                } else if (isSelected && !isCorrectAnswer) {
                  answerClass = "border-red-400 bg-red-400/10 text-red-400";
                } else {
                  answerClass = "border-[#334155] bg-[#0F172A] text-[#475569]";
                }
              } else if (isSelected) {
                answerClass = "border-cyan-400 bg-cyan-400/10 text-[#E2E8F0]";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  disabled={answered || isEliminated}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-all duration-150 text-sm font-medium ${answerClass}`}
                >
                  <span
                    className={`w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all ${
                      answered && isCorrectAnswer
                        ? "border-emerald-400 bg-emerald-400 text-[#0F172A]"
                        : answered && isSelected && !isCorrectAnswer
                        ? "border-red-400 bg-red-400 text-[#0F172A]"
                        : isSelected
                        ? "border-cyan-400 bg-cyan-400 text-[#0F172A]"
                        : "border-[#334155]"
                    }`}
                  >
                    {answered && isCorrectAnswer ? (
                      <svg width="12" height="10" fill="none" viewBox="0 0 12 10">
                        <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : answered && isSelected && !isCorrectAnswer ? (
                      <svg width="10" height="10" fill="none" viewBox="0 0 10 10">
                        <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      String.fromCharCode(65 + idx)
                    )}
                  </span>
                  {answer}
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation block (after answer) */}
        {answered && (
          <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-5 flex gap-4 screen-enter">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-400/10 flex items-center justify-center">
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <path d="M10 2l1.76 5.42H17l-4.48 3.26 1.71 5.26L10 13.27l-4.23 2.67 1.71-5.26L3 7.42h5.24L10 2z" fill="#FBBF24" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E2E8F0] mb-1">Explanation</p>
              <p className="text-sm text-[#94A3B8] leading-relaxed">{currentQuestion.explanation}</p>
            </div>
          </div>
        )}

        {/* Power-ups (balanced only, not answered) */}
        {mode === "balanced" && !answered && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleFiftyFifty}
              disabled={eliminated.length > 0}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                <path d="M2 7h4M8 7h4M7 3l1.5 2.5h-3L7 3zM7 11l1.5-2.5h-3L7 11z" stroke="#FBBF24" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              50/50
            </button>
            <button
              onClick={handleFreeze}
              disabled={frozen}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-400 text-xs font-semibold hover:bg-cyan-400/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                <circle cx="7" cy="7" r="5" stroke="#22D3EE" strokeWidth="1.2" />
                <path d="M7 4v3l2 1.5" stroke="#22D3EE" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Freeze +15s
            </button>
            <button
              onClick={handleHint}
              disabled={showHint}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                <path d="M7 1.5a3.5 3.5 0 012.77 5.66L9 8.5V9H5v-.5L4.23 7.16A3.5 3.5 0 017 1.5z" stroke="#FBBF24" strokeWidth="1.2" />
                <path d="M5.5 10.5h3M6 12h2" stroke="#FBBF24" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Hint (−25%)
            </button>
            <button
              onClick={() => setShowClarifier(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-violet-400/40 bg-violet-400/10 text-violet-400 text-xs font-semibold hover:bg-violet-400/20 transition-all"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                <circle cx="7" cy="7" r="5.5" stroke="#A78BFA" strokeWidth="1.2" />
                <path d="M5.5 5.5a1.5 1.5 0 012.83.75c0 1.25-2.33 1.25-2.33 2.5" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="7" cy="10.5" r=".5" fill="#A78BFA" />
              </svg>
              AI Clarifier
            </button>
          </div>
        )}

        {/* AI Clarifier panel */}
        {showClarifier && mode === "balanced" && !answered && (
          <div className="bg-violet-500/10 border border-violet-400/30 rounded-2xl p-5 screen-enter">
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                <path d="M9 2l1 3h3l-2.5 1.8.95 2.9L9 8.5l-2.45 1.2.95-2.9L5 5h3L9 2z" fill="#A78BFA" />
                <path d="M4 14l1.5-4.5M14 14l-1.5-4.5" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-semibold text-violet-400">AI Clarifier</span>
            </div>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              This question is asking about the specific roles of molecules in energy metabolism. Focus on whether the molecule is giving or receiving electrons — the primary carrier should be the one with the highest yield in the process.
            </p>
          </div>
        )}

        {/* Action button */}
        <div className="pt-2">
          {!answered ? (
            <button
              onClick={handleConfirm}
              disabled={selectedAnswer === null}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 via-cyan-500 to-violet-500 text-white hover:from-cyan-500 hover:via-cyan-400 hover:to-violet-400 shadow-lg shadow-cyan-500/20"
            >
              Confirm Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-200 ${
                isRetryRound && retryIndex >= missedQuestions.length - 1
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400"
                  : "bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-400 text-[#0F172A] hover:from-cyan-500 hover:to-cyan-300"
              } shadow-lg shadow-cyan-500/20`}
            >
              {isRetryRound && retryIndex >= missedQuestions.length - 1
                ? "See Results"
                : "Next Question"}
              <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                <path d="M4 9h10M10 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Footer credit */}
      <footer className="text-center py-4 text-xs text-[#334155]">
        Built with Groq · GROQuiz
      </footer>
    </div>
  );
}
