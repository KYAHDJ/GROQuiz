"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  RotateCcw,
  Target,
  Flame,
  Clock,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Zap,
  Star,
} from "lucide-react";
import { useQuiz } from "@/context/QuizContext";
import type { HistoryRecord } from "@/lib/types";

interface CoachFeedback {
  strengths: string[];
  weaknesses: string[];
  feedback: string;
}

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

function ScoreRing({ pct, pts }: { pct: number; pts: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const end = Math.round(pct);
    let frame: number;
    let current = 0;
    const step = () => {
      current += 2;
      if (current >= end) {
        setDisplayed(end);
        return;
      }
      setDisplayed(current);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [pct]);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  const ringColor =
    pct >= 85
      ? "#34D399"
      : pct >= 60
        ? "#22D3EE"
        : pct >= 40
          ? "#FBBF24"
          : "#F87171";

  return (
    <div className="relative w-52 h-52 flex items-center justify-center mx-auto">
      <svg width="208" height="208" viewBox="0 0 208 208" className="-rotate-90">
        <circle
          cx="104"
          cy="104"
          r={radius}
          fill="none"
          stroke="#251C33"
          strokeWidth="14"
        />
        <circle
          cx="104"
          cy="104"
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-5xl font-extrabold text-[#F0EAF6] tabular-nums leading-none">
          {displayed}%
        </p>
        <p className="text-xs text-[#8D7FA0] mt-1 font-medium">{pts} pts</p>
      </div>
    </div>
  );
}

export default function ScoreDisplay({
  record,
  onBack,
}: {
  record?: HistoryRecord;
  onBack?: () => void;
}) {
  const { state, resetGame, restartQuiz } = useQuiz();

  const isReview = Boolean(record);
  const stats = record ? record.stats : state.stats;
  const results = record ? record.results : state.results;
  const questions = record ? record.questions : state.allQuestions;
  const topic = record ? record.topic : state.currentTopics;
  const accuracy = stats.answered
    ? Math.round((stats.correct / stats.answered) * 100)
    : 0;
  const avgTime = results.length
    ? Math.round(results.reduce((a, r) => a + r.timeTaken, 0) / results.length)
    : 0;
  const avgHints = results.length
    ? (
        results.reduce((a, r) => a + r.hintsUsed, 0) / results.length
      ).toFixed(1)
    : "0";
  const totalPoints = results.reduce((a, r) => a + r.pointsEarned, 0);

  const [coach, setCoach] = useState<CoachFeedback | null>(null);
  const [coachPending, setCoachPending] = useState(false);
  const [coachNonce, setCoachNonce] = useState(0);

  useEffect(() => {
    if (results.length === 0 || coach) return;
    setCoachPending(true);
    fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, questions, results, stats }),
    })
      .then((r) => r.json())
      .then((d) =>
        setCoach({
          strengths: Array.isArray(d.strengths) ? d.strengths : [],
          weaknesses: Array.isArray(d.weaknesses) ? d.weaknesses : [],
          feedback: typeof d.feedback === "string" ? d.feedback : "",
        })
      )
      .catch(() => setCoach(null))
      .finally(() => setCoachPending(false));
  }, [results, questions, stats, topic, coach, coachNonce]);

  const grade =
    accuracy >= 90
      ? "Outstanding"
      : accuracy >= 75
        ? "Great work"
        : accuracy >= 60
          ? "Good job"
          : "Keep practicing";

  return (
    <div className="min-h-dvh bg-[#151021] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#3A2E50] px-4 md:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isReview ? (
            <button
              onClick={onBack}
              aria-label="Back to home"
              className="w-9 h-9 rounded-xl border border-[#3A2E50] flex items-center justify-center text-[#8D7FA0] hover:text-[#F0EAF6] hover:border-[#6E5F81] transition-all shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <BrandLogo />
          )}
          <span className="text-xl font-bold text-[#F0EAF6] tracking-tight">
            {isReview ? "Review" : "GROQuiz"}
          </span>
        </div>
        <span
          className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${
            isReview
              ? "border-violet-400/30 bg-violet-400/10 text-violet-400"
              : state.mode === "hard"
                ? "border-red-400/30 bg-red-400/10 text-red-400"
                : "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-400"
          }`}
        >
          {isReview ? "History review" : state.mode === "hard" ? "Hard mode" : "Balanced mode"}
        </span>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8 sm:py-10 space-y-7 screen-enter">
        {/* Grade label */}
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-[#8D7FA0] uppercase tracking-widest">
            {isReview ? "Session review" : "Quiz complete"}
          </p>
          <h1 className="text-fluid-grade font-extrabold text-[#F0EAF6] [overflow-wrap:anywhere]">
            {grade}!
          </h1>
          <p className="text-sm text-[#8D7FA0]">
            {stats.correct}/{stats.answered} correct · {topic || "Imported material"}
          </p>
        </div>

        {/* Score ring */}
        <ScoreRing pct={accuracy} pts={totalPoints} />

        {/* Stat chips */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Target size={20} className="text-emerald-400" />} label="Accuracy" value={`${accuracy}%`} />
          <StatCard icon={<Flame size={20} className="text-orange-400" />} label="Best streak" value={`${stats.bestStreak}`} />
          <StatCard icon={<Clock size={20} className="text-fuchsia-400" />} label="Avg time" value={`${avgTime}s`} />
          <StatCard icon={<Lightbulb size={20} className="text-amber-400" />} label="Avg hints" value={avgHints} />
        </div>

        {/* AI Coach card */}
        <div className="bg-violet-500/10 border border-violet-400/30 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-400/20 flex items-center justify-center shrink-0">
                <Lightbulb size={18} className="text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-violet-300">AI Coach</p>
                <p className="text-xs text-[#8D7FA0]">Personalized feedback</p>
              </div>
            </div>
            {coach && !isReview && (
              <button
                type="button"
                onClick={() => {
                  setCoach(null);
                  setCoachNonce((n) => n + 1);
                }}
                className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                <RotateCcw size={13} />
                Refresh
              </button>
            )}
          </div>

          {coachPending ? (
            <div className="flex items-center gap-2 text-xs text-[#B8A9C8]">
              <Loader2 size={14} className="animate-spin text-violet-400" />
              Analyzing your answers…
            </div>
          ) : coach ? (
            <div className="space-y-4">
              {coach.feedback && (
                <p className="text-sm text-[#B8A9C8] leading-relaxed [overflow-wrap:anywhere]">
                  {coach.feedback}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {coach.weaknesses.map((w, i) => (
                  <span
                    key={`w-${i}`}
                    className="px-3 py-1 rounded-full text-xs bg-red-400/10 text-red-400 border border-red-400/20 [overflow-wrap:anywhere]"
                  >
                    Weak: {w}
                  </span>
                ))}
                {coach.strengths.map((s, i) => (
                  <span
                    key={`s-${i}`}
                    className="px-3 py-1 rounded-full text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 [overflow-wrap:anywhere]"
                  >
                    Strong: {s}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#8D7FA0]">
              {results.length > 0
                ? "Couldn't load the AI analysis right now."
                : "Finish the quiz to get AI feedback."}
            </p>
          )}
        </div>

        {/* Question breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8D7FA0]">
            Question breakdown
          </p>
          {results.map((r, i) => {
            const q = questions.find((x) => x.id === r.questionId);
            return (
              <div
                key={r.questionId}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
                  r.correct
                    ? "bg-emerald-400/5 border-emerald-400/20"
                    : "bg-red-400/5 border-red-400/20"
                }`}
              >
                {r.correct ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[#B8A9C8] line-clamp-2 leading-snug [overflow-wrap:anywhere]">
                    {q?.question ?? `Question ${i + 1}`}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-[#8D7FA0] flex-wrap">
                    <span>{r.timeTaken}s</span>
                    <span className="text-fuchsia-400">+{r.pointsEarned} pts</span>
                    {r.hintsUsed > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Zap size={10} className="text-amber-400" />
                        {r.hintsUsed} hint{r.hintsUsed > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {isReview ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full py-4 rounded-2xl font-bold text-base border-2 border-[#3A2E50] text-[#F0EAF6] hover:border-[#6E5F81] hover:bg-[#251C33] transition-all"
          >
            Back to Home
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={restartQuiz}
              className="flex-1 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 text-[#151021] hover:from-fuchsia-500 hover:to-fuchsia-300 transition-all shadow-lg shadow-fuchsia-500/20"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={resetGame}
              className="flex-1 py-4 rounded-2xl font-bold text-base border-2 border-[#3A2E50] text-[#F0EAF6] hover:border-[#6E5F81] hover:bg-[#251C33] transition-all"
            >
              New Quiz
            </button>
          </div>
        )}
      </main>

      {/* Footer credit */}
      <footer className="text-center py-4 text-xs text-[#3A2E50] flex items-center justify-center gap-1.5">
        <Star size={10} className="text-violet-500" />
        GROQuiz
      </footer>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#251C33] border border-[#3A2E50] rounded-2xl p-4 flex items-center gap-4">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xl font-bold text-[#F0EAF6] tabular-nums">{value}</p>
        <p className="text-xs text-[#8D7FA0]">{label}</p>
      </div>
    </div>
  );
}