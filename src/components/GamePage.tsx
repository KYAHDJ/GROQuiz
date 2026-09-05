"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useQuiz } from "@/context/QuizContext";
import PdfUpload from "./PdfUpload";
import PowerupBar from "./PowerupBar";
import HintTimer from "./HintTimer";
import QuizCard from "./QuizCard";
import PowerupShop from "./PowerupShop";
import ScoreDisplay from "./ScoreDisplay";

export default function GamePage() {
  const { state } = useQuiz();
  const [shopOpen, setShopOpen] = useState(false);

  if (state.screen === "landing" || state.screen === "loading") {
    return <PdfUpload />;
  }

  if (state.screen === "results") {
    return <ScoreDisplay />;
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <PowerupBar />

      <div className="flex-1 flex flex-col items-center justify-center py-6 gap-6">
        <HintTimer />
        <QuizCard />
      </div>

      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShopOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full p-3 shadow-lg shadow-emerald-900/40 transition-colors"
          title="Power-up Shop"
        >
          <ShoppingBag size={22} />
        </button>
      </div>

      <PowerupShop open={shopOpen} onClose={() => setShopOpen(false)} />
    </div>
  );
}