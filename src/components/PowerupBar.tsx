"use client";

import { useQuiz } from "@/context/QuizContext";
import {
  Trophy,
  Flame,
  Shield,
  Zap,
  Clock,
  BrainCircuit,
} from "lucide-react";

export default function PowerupBar() {
  const { state } = useQuiz();
  const { stats, inventory, mode } = state;
  const accuracy = stats.answered
    ? Math.round((stats.correct / stats.answered) * 100)
    : 0;

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3 overflow-x-auto text-sm no-scrollbar">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold whitespace-nowrap">
          <Trophy size={16} />
          <span>{stats.points.toLocaleString()}</span>
        </div>

        <div className="w-px h-4 bg-slate-700" />

        <div className="flex items-center gap-1.5 text-orange-400 font-medium whitespace-nowrap">
          <Flame size={15} />
          <span>{stats.streak}</span>
        </div>

        <div className="w-px h-4 bg-slate-700" />

        <div className="flex items-center gap-1.5 text-slate-400 whitespace-nowrap">
          <Shield size={14} />
          <span>
            {stats.correct}/{stats.answered}
          </span>
          {stats.answered > 0 && (
            <span className="text-xs text-slate-500">{accuracy}%</span>
          )}
        </div>

        <div className="flex-1" />

        {mode === "hard" ? (
          <span className="text-[11px] font-semibold text-red-400 whitespace-nowrap">
            Hard — no power-ups
          </span>
        ) : (
          <div className="flex items-center gap-2.5">
          <PowerupBadge
            icon={<Zap size={13} className="text-yellow-300" />}
            count={inventory["50-50"]}
            label="50/50"
            color="yellow"
          />
          <PowerupBadge
            icon={<Clock size={13} className="text-cyan-300" />}
            count={inventory["time-extension"]}
            label="Freeze"
            color="cyan"
          />
          <PowerupBadge
            icon={<BrainCircuit size={13} className="text-violet-300" />}
            count={inventory["ai-clarifier"]}
            label="Clarify"
            color="violet"
          />
        </div>
        )}
      </div>
    </div>
  );
}

const colorMap: Record<string, string> = {
  yellow: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
  cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  violet: "bg-violet-500/15 text-violet-300 border-violet-500/25",
};

function PowerupBadge({
  icon,
  count,
  label,
  color,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  color: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 border text-xs font-medium ${colorMap[color]}`}
    >
      {icon}
      <span>{count}</span>
    </div>
  );
}