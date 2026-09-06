import { useState, useEffect } from "react";

interface Props {
  score: number;
  mode: "balanced" | "hard";
  onTryAgain: () => void;
  onNewQuiz: () => void;
}

const TOTAL_QUESTIONS = 5;
const MAX_SCORE = TOTAL_QUESTIONS * 100;

function ScoreRing({ score, max }: { score: number; max: number }) {
  const [displayed, setDisplayed] = useState(0);
  const pct = Math.min(score / max, 1);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  useEffect(() => {
    const end = Math.round(pct * 100);
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

  const ringColor =
    pct >= 0.85
      ? "#34D399"
      : pct >= 0.6
      ? "#22D3EE"
      : pct >= 0.4
      ? "#FBBF24"
      : "#F87171";

  return (
    <div className="relative w-52 h-52 flex items-center justify-center mx-auto">
      <svg width="208" height="208" viewBox="0 0 208 208" className="-rotate-90">
        <circle cx="104" cy="104" r={radius} fill="none" stroke="#1E293B" strokeWidth="14" />
        <circle
          cx="104" cy="104" r={radius}
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
        <p className="text-5xl font-extrabold text-[#E2E8F0] tabular-nums leading-none">{displayed}%</p>
        <p className="text-xs text-[#64748B] mt-1 font-medium">{score} pts</p>
      </div>
    </div>
  );
}

const STATS = [
  { label: "Accuracy", value: "80%", icon: "🎯" },
  { label: "Best streak", value: "3", icon: "🔥" },
  { label: "Avg time", value: "18s", icon: "⚡" },
  { label: "Questions", value: `${TOTAL_QUESTIONS}`, icon: "📝" },
];

export default function ScoreScreen({ score, mode, onTryAgain, onNewQuiz }: Props) {
  const pct = Math.min(score / MAX_SCORE, 1);
  const grade =
    pct >= 0.9 ? "Outstanding" : pct >= 0.75 ? "Great work" : pct >= 0.6 ? "Good job" : "Keep practicing";

  const coachMessages = [
    pct >= 0.8
      ? "Excellent performance! Your strong grasp of core concepts shows in your fast, accurate answers. Focus on building on your existing knowledge by exploring edge cases and deeper applications."
      : "You're making solid progress. A few areas need more attention — particularly time-sensitive recall under pressure. Try spacing your review sessions over 2–3 days to improve long-term retention.",
    pct >= 0.5
      ? "Your answer timing shows confidence in familiar territory. To raise your score further, spend extra time on the topics where you selected the wrong answer or used a hint."
      : "Don't be discouraged — this material is genuinely difficult. The retry round responses show that you can recall answers with a little more time. Focus on active recall over passive re-reading.",
  ];

  return (
    <div className="min-h-full bg-[#0F172A] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#334155] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path d="M8 1L10.5 6H15L11 9.5L12.5 15L8 12L3.5 15L5 9.5L1 6H5.5L8 1Z" fill="white" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[#E2E8F0] tracking-tight">GROQuiz</span>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
          mode === "hard"
            ? "border-red-400/30 bg-red-400/10 text-red-400"
            : "border-cyan-400/30 bg-cyan-400/10 text-cyan-400"
        }`}>
          {mode === "hard" ? "Hard mode" : "Balanced mode"}
        </span>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-10 space-y-8 screen-enter">
        {/* Grade label */}
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-[#64748B] uppercase tracking-widest">Quiz complete</p>
          <h1 className="text-3xl font-extrabold text-[#E2E8F0]">{grade}!</h1>
        </div>

        {/* Score ring */}
        <ScoreRing score={score} max={MAX_SCORE} />

        {/* Stat chips */}
        <div className="grid grid-cols-2 gap-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-[#1E293B] border border-[#334155] rounded-2xl p-4 flex items-center gap-4"
            >
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-xl font-bold text-[#E2E8F0]">{stat.value}</p>
                <p className="text-xs text-[#64748B]">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Coach card */}
        <div className="bg-violet-500/10 border border-violet-400/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-400/20 flex items-center justify-center shrink-0">
              <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                <path d="M9 2l1 3h3l-2.5 1.8.95 2.9L9 8.5l-2.45 1.2.95-2.9L5 5h3L9 2z" fill="#A78BFA" />
                <path d="M3 15l2-6M15 15l-2-6" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-violet-300">AI Coach</p>
              <p className="text-xs text-[#64748B]">Personalized feedback</p>
            </div>
          </div>
          <div className="space-y-3">
            {coachMessages.map((msg, i) => (
              <p key={i} className="text-sm text-[#94A3B8] leading-relaxed">{msg}</p>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="px-3 py-1 rounded-full text-xs bg-red-400/10 text-red-400 border border-red-400/20">
              Weak: Electron Transport
            </span>
            <span className="px-3 py-1 rounded-full text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20">
              Review: WWI/WWII Dates
            </span>
            <span className="px-3 py-1 rounded-full text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
              Strong: JavaScript
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onTryAgain}
            className="flex-1 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-cyan-600 to-cyan-400 text-[#0F172A] hover:from-cyan-500 hover:to-cyan-300 transition-all shadow-lg shadow-cyan-500/20"
          >
            Try Again
          </button>
          <button
            onClick={onNewQuiz}
            className="flex-1 py-4 rounded-2xl font-bold text-base border-2 border-[#334155] text-[#E2E8F0] hover:border-[#475569] hover:bg-[#1E293B] transition-all"
          >
            New Quiz
          </button>
        </div>
      </main>

      {/* Footer credit */}
      <footer className="text-center py-4 text-xs text-[#475569]">
        Built with Groq · GROQuiz
      </footer>
    </div>
  );
}
