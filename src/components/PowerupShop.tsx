"use client";

import { useQuiz } from "@/context/QuizContext";
import { Zap, Clock, BrainCircuit, X, ShoppingBag } from "lucide-react";

const POWERUPS = [
  {
    key: "50-50" as const,
    name: "50/50 Freeze",
    desc: "Removes 2 wrong answers instantly",
    icon: <Zap size={18} className="text-yellow-400" />,
    cost: 100,
  },
  {
    key: "time-extension" as const,
    name: "Time Extension",
    desc: "Pauses hint timer for 15s",
    icon: <Clock size={18} className="text-cyan-400" />,
    cost: 75,
  },
  {
    key: "ai-clarifier" as const,
    name: "AI Clarifier",
    desc: "Simpler real-world analogy of the question",
    icon: <BrainCircuit size={18} className="text-violet-400" />,
    cost: 50,
  },
];

export default function PowerupShop({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { state, buyPowerup } = useQuiz();
  const { stats, inventory } = state;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full relative animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag size={18} className="text-emerald-400" />
          <h3 className="text-lg font-bold text-slate-100">Power-up Shop</h3>
        </div>

        <div className="flex items-center gap-2 mb-5 bg-slate-800/60 rounded-xl px-3 py-2">
          <span className="text-xs text-slate-400">Your Points</span>
          <span className="font-bold text-amber-400">{stats.points}</span>
        </div>

        <div className="space-y-3">
          {POWERUPS.map((p) => {
            const canAfford = stats.points >= p.cost;
            return (
              <button
                key={p.key}
                disabled={!canAfford}
                onClick={() => {
                  buyPowerup(p.key, p.cost);
                }}
                className="w-full flex items-start gap-3 bg-slate-800/60 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded-xl p-3 text-left transition-colors"
              >
                <div className="mt-0.5">{p.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200">
                      {p.name}
                    </span>
                    <span className="text-xs font-medium text-slate-400 bg-slate-700/50 rounded-full px-2 py-0.5">
                      {p.cost} pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Owned: {inventory[p.key]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}