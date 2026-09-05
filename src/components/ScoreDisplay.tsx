"use client";

import { useQuiz } from "@/context/QuizContext";
import {
  Trophy,
  Target,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BarChart3,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function ScoreDisplay() {
  const { state, resetGame, setScreen } = useQuiz();
  const { stats, results, questions } = state;
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

  const grade =
    accuracy >= 90
      ? "S"
      : accuracy >= 80
        ? "A"
        : accuracy >= 65
          ? "B"
          : accuracy >= 50
            ? "C"
            : "D";
  const gradeColor: Record<string, string> = {
    S: "text-amber-400",
    A: "text-emerald-400",
    B: "text-cyan-400",
    C: "text-amber-300",
    D: "text-slate-400",
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-10">
      <div className="text-center mb-8 max-w-md">
        <div className="text-6xl sm:text-7xl font-extrabold mb-2">
          <span className={gradeColor[grade] ?? "text-slate-300"}>{grade}</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-1">Session Complete</h2>
        <p className="text-slate-400 text-sm">
          {stats.correct}/{stats.answered} correct · {totalPoints} total points earned
        </p>
      </div>

      <div className="w-full max-w-md grid grid-cols-2 gap-3 mb-8">
        <StatCard
          icon={<Target size={16} className="text-emerald-400" />}
          label="Accuracy"
          value={`${accuracy}%`}
        />
        <StatCard
          icon={<Flame size={16} className="text-orange-400" />}
          label="Best Streak"
          value={`${stats.bestStreak}`}
        />
        <StatCard
          icon={<Clock size={16} className="text-cyan-400" />}
          label="Avg Time"
          value={`${avgTime}s`}
        />
        <StatCard
          icon={<BarChart3 size={16} className="text-violet-400" />}
          label="Avg Hints"
          value={avgHints}
        />
      </div>

      <div className="w-full max-w-md space-y-2 mb-8">
        <h3 className="text-sm font-medium text-slate-400 mb-2">Question Breakdown</h3>
        {results.map((r, i) => {
          const q = questions.find((x) => x.id === r.questionId);
          return (
            <div
              key={r.questionId}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
                r.correct
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-red-500/5 border-red-500/20"
              }`}
            >
              {r.correct ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 line-clamp-2 leading-snug">
                  {q?.question ?? `Question ${i + 1}`}
                </p>
                <div className="flex gap-3 mt-1 text-xs text-slate-500">
                  <span>{r.timeTaken}s</span>
                  <span>+{r.pointsEarned} pts</span>
                  {r.hintsUsed > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Zap size={10} className="text-yellow-400" />
                      {r.hintsUsed} hint{r.hintsUsed > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          onClick={() => {
            resetGame();
          }}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium rounded-xl py-3 transition-colors"
        >
          <RotateCcw size={16} />
          New Session
        </button>
        <button
          onClick={() => setScreen("landing")}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl py-3 transition-colors"
        >
          <TrendingUp size={16} />
          Change Source
        </button>
      </div>
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
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-100 tabular-nums">{value}</p>
      </div>
    </div>
  );
}