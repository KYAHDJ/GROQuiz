"use client";

import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  Loader2,
  History,
  ChevronRight,
  ClipboardPaste,
  X,
  Scale,
  Lock,
  Clock4,
} from "lucide-react";
import { useQuiz } from "@/context/QuizContext";
import type {
  FlashcardQuestion,
  HistoryRecord,
  QuizMode,
} from "@/lib/types";

const MAX_PDF_MB = 4;
const TIME_OPTIONS = [15, 30, 45, 60, 90];

export default function PdfUpload({
  onReview,
}: {
  onReview?: (record: HistoryRecord) => void;
}) {
  const {
    setSource,
    loadQuestions,
    setScreen,
    setMode,
    setTimeLimit,
    state,
    hasSavedGame,
    resumeGame,
    history,
  } = useQuiz();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setModeLocal] = useState<QuizMode>(state.mode);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState("");
  const [topics, setTopics] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const startQuestionsFromText = async (text: string) => {
    if (text.trim().length < 20) {
      setError("Please provide at least a couple sentences of material.");
      return;
    }
    setError(null);
    setFileName("Provided material");

    try {
      setProgressLabel("Generating questions…");
      setProgress(50);

      let genData: { questions?: FlashcardQuestion[]; error?: string } | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (attempt > 1) {
          setProgressLabel(`Still generating questions… (attempt ${attempt}/3)`);
          await new Promise((r) => setTimeout(r, 8000));
        }
        const genRes = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            topics,
            difficulty: mode === "hard" ? 4 : 3,
          }),
        });
        genData = await genRes.json();
        if (genRes.ok) break;
      }

      if (!genData || !Array.isArray(genData.questions) || genData.questions.length === 0) {
        setProgress(null);
        setError(
          genData?.error ??
            "We couldn't generate questions for this material. Try again in a minute."
        );
        return;
      }

      const questions: FlashcardQuestion[] = genData.questions;

      setProgress(100);
      setSource(text, topics);
      setTimeout(() => {
        loadQuestions(questions);
        setScreen("quiz");
        setProgress(null);
        setFileName(null);
      }, 400);
    } catch {
      setProgress(null);
      setError("Something went wrong while generating questions. Please try again.");
    }
  };

  const handleFile = (file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      setError(
        `That PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB — the free host accepts up to ${MAX_PDF_MB} MB. Use a smaller PDF or paste the text below instead.`
      );
      setShowPaste(true);
      return;
    }

    setFileName(file.name);
    parsePdf(file);
  };

  const parsePdf = async (file: File) => {
    try {
      setProgressLabel("Reading PDF…");
      setProgress(10);

      const parseBody = new FormData();
      parseBody.append("file", file);
      const parseRes = await fetch("/api/parse-pdf", { method: "POST", body: parseBody });
      const parseData = await parseRes.json();

      if (!parseRes.ok) {
        setProgress(null);
        setError(parseData.error ?? "We couldn't read that PDF.");
        setShowPaste(true);
        return;
      }

      const text = parseData.text as string;
      setProgressLabel("Generating questions…");
      setProgress(60);
      await startQuestionsFromText(text);
    } catch (err) {
      setProgress(null);
      setError(
        err instanceof TypeError && err.message.includes("413")
          ? `This PDF is larger than the ${MAX_PDF_MB} MB the host allows. Paste the text below instead.`
          : "Something went wrong while uploading. Please try again."
      );
      setShowPaste(true);
    }
  };

  const handleGenerate = async () => {
    if (topics.trim().length < 3) {
      setError("Enter a topic for your material to continue.");
      return;
    }
    if (pastedText.trim().length === 0) {
      setError("Paste some text first — that's what the questions come from.");
      return;
    }
    await startQuestionsFromText(pastedText);
  };

  const active = progress !== null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setModeLocal("balanced");
            setMode("balanced");
          }}
          className={`rounded-2xl border p-4 text-left transition-all ${
            mode === "balanced"
              ? "border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/40"
              : "border-slate-700 bg-slate-800/40 hover:bg-slate-700/40"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Scale size={15} className="text-cyan-400" />
            Balanced mode
          </span>
          <span className="block text-xs text-slate-400 mt-1">
            Starts Medium and gets Easier/Harder based on your answers.
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setModeLocal("hard");
            setMode("hard");
          }}
          className={`rounded-2xl border p-4 text-left transition-all ${
            mode === "hard"
              ? "border-red-500/60 bg-red-500/10 ring-1 ring-red-500/40"
              : "border-slate-700 bg-slate-800/40 hover:bg-slate-700/40"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Lock size={15} className="text-red-400" />
            Hard mode
          </span>
          <span className="block text-xs text-slate-400 mt-1">
            Locked at Hard — no power-ups, just you and the questions.
          </span>
        </button>
      </div>

      {/* Time limit */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
        <p className="text-xs font-medium text-slate-400 mb-2">
          {mode === "hard"
            ? "Time per question"
            : "Pick your time limit per question"}
        </p>
        {mode === "hard" ? (
          <p className="text-sm text-slate-300 font-semibold flex items-center gap-2">
            <Clock4 size={15} className="text-red-400" />
            30 seconds — fixed in Hard mode
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((s) => {
              const active = state.timeLimit === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTimeLimit(s)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold border transition-all ${
                    active
                      ? "bg-cyan-600 text-white border-cyan-500"
                      : "bg-slate-900/60 text-slate-300 border-slate-700 hover:border-cyan-500/50 hover:text-slate-100"
                  }`}
                >
                  {s}s
                </button>
              );
            })}
            <span className="text-xs text-slate-500 self-center ml-1">
              Time out = marked wrong, then a retry at the end.
            </span>
          </div>
        )}
      </div>

      {hasSavedGame && state.screen === "landing" && (
        <div className="bg-cyan-500/10 border border-cyan-500/25 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-cyan-200">
            You have an unfinished quiz on{" "}
            <span className="font-semibold">{state.currentTopics || "your material"}</span>.
          </p>
          <button
            type="button"
            onClick={resumeGame}
            className="shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl px-4 py-2 transition-colors"
          >
            Resume
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="text-red-400 hover:text-red-200 font-medium text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        onClick={() => !active && fileRef.current?.click()}
        className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-cyan-500/60 hover:bg-slate-800/40 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center gap-3 transition-all"
      >
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {progress !== null ? (
          <>
            <Loader2 size={28} className="text-cyan-400 animate-spin" />
            {fileName && (
              <p className="text-sm text-slate-300 font-medium truncate max-w-full flex items-center gap-2">
                <FileText size={14} className="shrink-0 text-cyan-400" />
                <span className="truncate">{fileName}</span>
              </p>
            )}
            <p className="text-xs text-cyan-300">{progressLabel}</p>
            <div className="w-full max-w-xs h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <Upload size={32} className="text-slate-500" />
            <p className="text-sm sm:text-base text-slate-300 font-medium">
              Upload a PDF to generate questions
            </p>
            <p className="text-xs text-slate-500 text-center">
              Text is extracted on the fly — your document is never stored.
              <br />
              Max {MAX_PDF_MB} MB. Scanned/image-only PDFs can't be read — paste the text below instead.
            </p>
          </>
        )}
      </div>

      {/* Topic input */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-3">
        <label htmlFor="topics" className="block text-xs font-medium text-slate-400">
          What is this material about?
        </label>
        <input
          id="topics"
          type="text"
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          placeholder="e.g. Photosynthesis for high school biology"
          className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Paste-text fallback */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPaste((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/40 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ClipboardPaste size={15} className="text-cyan-400" />
            <span className="font-medium">
              {showPaste ? "Hide" : "PDF not working?"} Paste the text instead
            </span>
          </span>
          {showPaste ? <X size={15} className="text-slate-500" /> : <ChevronRight size={15} className="text-slate-500" />}
        </button>

        {showPaste && (
          <div className="px-4 pb-4 space-y-3 animate-slide-up">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={7}
              placeholder="Paste the text of your notes, article, or chapter here…"
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 resize-y"
            />
            <div className="text-xs text-slate-500 -mt-1">{pastedText.length} characters</div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={active}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
            >
              Generate questions from this text
            </button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <History size={12} />
            Past sessions
          </p>
          {history.slice(0, 5).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onReview?.(r)}
              className="w-full flex items-center justify-between gap-2 bg-slate-900/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl px-3 py-2.5 text-left transition-colors group"
            >
              <span className="min-w-0">
                <span className="block text-sm text-slate-200 truncate">{r.topic}</span>
                <span className="block text-[11px] text-slate-500">
                  {new Date(r.date).toLocaleDateString()} · {r.stats.correct}/{r.stats.answered} correct ·{" "}
                  {r.points} pts
                </span>
              </span>
              <ChevronRight
                size={15}
                className="shrink-0 text-slate-600 group-hover:text-cyan-400 transition-colors"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}