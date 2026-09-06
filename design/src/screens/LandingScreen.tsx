import { useState } from "react";

interface Props {
  onStart: (mode: "balanced" | "hard", timeLimit: number) => void;
}

const historyItems = [
  { topic: "Photosynthesis & Cell Biology", score: 87, questions: 15, date: "Today" },
  { topic: "World War II: Key Battles", score: 92, questions: 20, date: "Yesterday" },
  { topic: "JavaScript Async Patterns", score: 74, questions: 12, date: "2 days ago" },
  { topic: "French Revolution", score: 68, questions: 18, date: "3 days ago" },
];

const TIME_OPTIONS = [15, 30, 45, 60, 90];

export default function LandingScreen({ onStart }: Props) {
  const [mode, setMode] = useState<"balanced" | "hard">("balanced");
  const [timeLimit, setTimeLimit] = useState(30);
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [pasteText, setPasteText] = useState("");
  const [topic, setTopic] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const keysConnected = 3;

  return (
    <div className="min-h-full bg-[#0F172A] pb-16">
      {/* Top nav bar */}
      <header className="border-b border-[#334155] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path d="M8 1L10.5 6H15L11 9.5L12.5 15L8 12L3.5 15L5 9.5L1 6H5.5L8 1Z" fill="white" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[#E2E8F0] tracking-tight">GROQuiz</span>
        </div>

        {/* Status pill */}
        <div className="flex items-center gap-2 bg-[#1E293B] border border-[#334155] rounded-full px-4 py-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
          <span className="text-sm text-[#E2E8F0]">
            Groq ready —{" "}
            <span className="font-semibold text-emerald-400">{keysConnected} keys</span> connected
          </span>
        </div>
      </header>

      <main className="max-w-[672px] mx-auto px-4 pt-10 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-[#E2E8F0] tracking-tight">
            Turn any PDF into a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
              quiz in seconds
            </span>
          </h1>
          <p className="text-[#94A3B8] text-base">
            Upload a PDF or paste text — Groq AI generates multiple-choice flashcards instantly.
          </p>
        </div>

        {/* Mode cards */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Select mode</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("balanced")}
              className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                mode === "balanced"
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-[#334155] bg-[#1E293B] hover:border-[#475569]"
              }`}
            >
              {mode === "balanced" && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center">
                  <svg width="10" height="8" fill="none" viewBox="0 0 10 8">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
              <div className="w-10 h-10 rounded-xl bg-cyan-400/20 flex items-center justify-center mb-3">
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                  <path d="M10 2L12.09 7.26L17.18 7.27L13.18 10.74L14.55 16L10 13.27L5.45 16L6.82 10.74L2.82 7.27L7.91 7.26L10 2Z" fill="#22D3EE" />
                </svg>
              </div>
              <p className="font-bold text-[#E2E8F0] text-sm mb-1">Balanced</p>
              <p className="text-[#64748B] text-xs leading-relaxed">Starts Medium and adjusts to your answers</p>
            </button>

            <button
              onClick={() => setMode("hard")}
              className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                mode === "hard"
                  ? "border-red-400 bg-red-400/10"
                  : "border-[#334155] bg-[#1E293B] hover:border-[#475569]"
              }`}
            >
              {mode === "hard" && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-red-400 flex items-center justify-center">
                  <svg width="10" height="8" fill="none" viewBox="0 0 10 8">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
              <div className="w-10 h-10 rounded-xl bg-red-400/20 flex items-center justify-center mb-3">
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                  <rect x="5" y="9" width="10" height="8" rx="2" stroke="#F87171" strokeWidth="1.5" />
                  <path d="M7 9V6.5a3 3 0 116 0V9" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="10" cy="13" r="1" fill="#F87171" />
                </svg>
              </div>
              <p className="font-bold text-[#E2E8F0] text-sm mb-1">Hard</p>
              <p className="text-[#64748B] text-xs leading-relaxed">Locked at Hard — no power-ups</p>
            </button>
          </div>
        </div>

        {/* Time limit row */}
        <div className="space-y-3 bg-[#1E293B] rounded-2xl p-5 border border-[#334155]">
          <p className="text-sm font-semibold text-[#E2E8F0]">Pick your time limit per question</p>
          <div className="flex gap-2 flex-wrap">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTimeLimit(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                  timeLimit === t
                    ? "bg-cyan-400 text-[#0F172A] font-bold"
                    : "bg-[#0F172A] border border-[#334155] text-[#94A3B8] hover:border-cyan-400/50 hover:text-[#E2E8F0]"
                }`}
              >
                {t}s
              </button>
            ))}
          </div>
          <p className="text-xs text-[#64748B]">
            Time out = marked wrong, then a retry at the end.
          </p>
        </div>

        {/* Input toggle */}
        <div className="flex gap-1 bg-[#1E293B] rounded-xl p-1 border border-[#334155]">
          <button
            onClick={() => setInputMode("upload")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              inputMode === "upload" ? "bg-[#334155] text-[#E2E8F0]" : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            Upload PDF
          </button>
          <button
            onClick={() => setInputMode("paste")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              inputMode === "paste" ? "bg-[#334155] text-[#E2E8F0]" : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            Paste Text
          </button>
        </div>

        {inputMode === "upload" ? (
          /* Drop zone */
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
            className={`rounded-2xl border-2 border-dashed p-12 flex flex-col items-center gap-4 transition-all duration-200 cursor-pointer ${
              isDragging
                ? "border-cyan-400 bg-cyan-400/10"
                : "border-[#334155] bg-[#1E293B] hover:border-[#475569]"
            }`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
              isDragging ? "bg-cyan-400/20" : "bg-[#0F172A]"
            }`}>
              <svg width="32" height="32" fill="none" viewBox="0 0 32 32">
                <path d="M16 4v16M9 11l7-7 7 7" stroke={isDragging ? "#22D3EE" : "#475569"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 22v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke={isDragging ? "#22D3EE" : "#475569"} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[#94A3B8] font-medium">Drag & drop your PDF here</p>
              <p className="text-sm text-[#64748B] mt-1">
                or{" "}
                <button
                  onClick={() => setInputMode("paste")}
                  className="text-cyan-400 hover:underline"
                >
                  paste text instead
                </button>
              </p>
            </div>
            <label className="mt-2 px-6 py-2.5 rounded-xl bg-[#0F172A] border border-[#334155] text-sm text-[#94A3B8] hover:border-cyan-400/60 hover:text-[#E2E8F0] cursor-pointer transition-all">
              Browse files
              <input type="file" accept=".pdf" className="hidden" />
            </label>
          </div>
        ) : (
          /* Paste mode panel */
          <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Your text</label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste your notes, article, or study material here…"
                rows={7}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-sm text-[#E2E8F0] placeholder-[#475569] resize-none focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
              <button
                onClick={async () => {
                  const text = await navigator.clipboard.readText().catch(() => "");
                  if (text) setPasteText(text);
                }}
                className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14">
                  <rect x="4" y="1" width="8" height="10" rx="1.5" stroke="#22D3EE" strokeWidth="1.2" />
                  <path d="M2 4H1a1 1 0 00-1 1v7a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="#22D3EE" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Paste from clipboard
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Topic (optional)</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Cellular Respiration"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-sm text-[#E2E8F0] placeholder-[#475569] focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
            </div>

            <button
              onClick={() => onStart(mode, timeLimit)}
              disabled={!pasteText.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0F172A] hover:from-cyan-400 hover:to-cyan-300 shadow-lg shadow-cyan-500/20"
            >
              Generate quiz
            </button>
          </div>
        )}

        {inputMode === "upload" && (
          <div className="text-center">
            <button
              onClick={() => onStart(mode, timeLimit)}
              className="px-8 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0F172A] hover:from-cyan-400 hover:to-cyan-300 shadow-lg shadow-cyan-500/20 transition-all duration-200"
            >
              Generate quiz (demo)
            </button>
          </div>
        )}

        {/* History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Recent quizzes</p>
            <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">View all</button>
          </div>
          <div className="space-y-2">
            {historyItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-[#1E293B] rounded-xl px-4 py-3 border border-[#334155] hover:border-[#475569] transition-colors cursor-pointer group"
              >
                <div>
                  <p className="text-sm font-medium text-[#E2E8F0] group-hover:text-white transition-colors">{item.topic}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">{item.questions} questions · {item.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.score >= 85
                        ? "bg-emerald-400/20 text-emerald-400"
                        : item.score >= 70
                        ? "bg-amber-400/20 text-amber-400"
                        : "bg-red-400/20 text-red-400"
                    }`}
                  >
                    {item.score}%
                  </span>
                  <svg width="16" height="16" fill="none" viewBox="0 0 16 16" className="text-[#475569] group-hover:text-[#64748B] transition-colors">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer credit */}
      <footer className="text-center mt-16 text-xs text-[#475569]">
        Built with Groq · GROQuiz
      </footer>
    </div>
  );
}
