"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Loader2,
  ChevronRight,
  ClipboardPaste,
  X,
  Scale,
  Lock,
  Check,
  Trash2,
  Star,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useQuiz } from "@/context/QuizContext";
import {
  IS_FIREBASE_ENABLED,
  uploadPdfForProcessing,
  deletePdfUpload,
  deleteUploadSession,
  makeSessionId,
} from "@/lib/firebase/client";
import type {
  FlashcardQuestion,
  HistoryRecord,
  QuizMode,
} from "@/lib/types";
import ConfirmModal from "./ConfirmModal";

const MAX_PDF_MB = 50;
const TIME_OPTIONS = [15, 30, 45, 60, 90];

interface BuilderItem {
  id: string;
  question: string;
  options: string[];
  correct: number;
}

interface QueueItem {
  id: string;
  name: string;
  status: "uploading" | "ready" | "error";
  url?: string;
  text?: string;
}

function BrandLogo({ size = 36 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shrink-0"
    >
      <svg width={size * 0.5} height={size * 0.5} fill="none" viewBox="0 0 16 16">
        <path d="M8 1L10.5 6H15L11 9.5L12.5 15L8 12L3.5 15L5 9.5L1 6H5.5L8 1Z" fill="white" />
      </svg>
    </div>
  );
}

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
    deleteHistory,
  } = useQuiz();
  const fileRef = useRef<HTMLInputElement>(null);
  const [groqCount, setGroqCount] = useState<number | null>(null);
  const [mode, setModeLocal] = useState<QuizMode>(state.mode);
  const [progress, setProgress] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState("");
  const [topics, setTopics] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "paste" | "build">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pdfQueue, setPdfQueue] = useState<QueueItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [builderItems, setBuilderItems] = useState<BuilderItem[]>([]);
  const [draft, setDraft] = useState<BuilderItem>({
    id: "",
    question: "",
    options: ["", "", "", ""],
    correct: 0,
  });
  const [buildError, setBuildError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/status");
        const d = await res.json();
        if (cancelled) return;
        if (typeof d?.availableKeys === "number") {
          setGroqCount(d.availableKeys);
          return;
        }
        throw new Error("bad response");
      } catch {
        if (cancelled) return;
        setTimeout(check, 2500);
      }
    };
    check();
    const onFocus = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const clearError = () => setError(null);

  const handleGenerate = async () => {
    if (pastedText.trim().length === 0) {
      setError("Paste some text first — that's what the questions come from.");
      return;
    }
    await startQuestionsFromText(pastedText);
  };

  const startQuestionsFromText = async (text: string) => {
    if (text.trim().length < 20) {
      setError("Please provide at least a couple sentences of material.");
      return;
    }
    setError(null);

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
      }, 400);
    } catch {
      setProgress(null);
      setError("Something went wrong while generating questions. Please try again.");
    }
  };

  const addFile = async (file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose PDF files only.");
      return;
    }
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      setError(
        `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — keep each PDF under ${MAX_PDF_MB} MB.`
      );
      return;
    }

    const sid = sessionId ?? makeSessionId();
    if (!sessionId) setSessionId(sid);

    const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: QueueItem = { id, name: file.name, status: "uploading" };
    setPdfQueue((prev) => [...prev, item]);

    if (IS_FIREBASE_ENABLED) {
      const url = await uploadPdfForProcessing(file, sid);
      setPdfQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, status: url ? "ready" : "error", ...(url ? { url } : {}) }
            : q
        )
      );
    } else {
      try {
        const body = new FormData();
        body.append("file", file);
        const parseRes = await fetch("/api/parse-pdf", { method: "POST", body });
        const parseData = await parseRes.json();
        if (!parseRes.ok) throw new Error(parseData?.error ?? "Couldn't read that PDF.");
        setPdfQueue((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status: "ready", text: parseData.text } : q))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't read that PDF.");
        setPdfQueue((prev) => prev.filter((q) => q.id !== id));
        return;
      }
    }
  };

  const removeFromQueue = (id: string) => {
    const item = pdfQueue.find((q) => q.id === id);
    setPdfQueue((prev) => prev.filter((q) => q.id !== id));
    if (item?.url) {
      void deletePdfUpload(item.url);
    }
  };

  const generateFromPdfs = async (items: QueueItem[]) => {
    setError(null);
    const sid = sessionId;
    try {
      setProgressLabel("Reading PDFs…");
      setProgress(60);

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
            pdfs: items.map((i) => ({ name: i.name, url: i.url })),
            topics,
            difficulty: mode === "hard" ? 4 : 3,
          }),
        });
        genData = await genRes.json();
        if (genRes.ok) break;
      }

      if (!genData || !Array.isArray(genData.questions) || genData.questions.length === 0) {
        setError(
          genData?.error ??
            "We couldn't generate questions from these PDFs. Try again in a minute."
        );
        return;
      }

      const questions: FlashcardQuestion[] = genData.questions;
      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      loadQuestions(questions, { topics: topics.trim() || "PDF quiz" });
      setScreen("quiz");
    } catch {
      setError("Something went wrong while generating questions. Please try again.");
    } finally {
      if (sid) {
        void deleteUploadSession(sid);
      }
      setSessionId(null);
      setPdfQueue([]);
      setProgress(null);
    }
  };

  const generateFromQueue = async () => {
    if (active) return;
    const firebaseFiles = pdfQueue.filter((q) => q.status === "ready" && q.url);
    const textFiles = pdfQueue.filter((q) => q.status === "ready" && q.text);
    if (firebaseFiles.length > 0) {
      await generateFromPdfs(firebaseFiles);
    } else if (textFiles.length > 0) {
      const combined = textFiles.map((q) => q.text ?? "").join("\n\n");
      await startQuestionsFromText(combined);
    } else {
      setError("Wait for the PDFs to finish uploading, or add a file first.");
    }
  };

  const addBuilderQuestion = () => {
    const q = draft.question.trim();
    const opts = draft.options.map((o) => o.trim());
    if (q.length < 10) {
      setBuildError("Write a full question (at least a few words).");
      return;
    }
    if (opts.some((o) => !o)) {
      setBuildError("Fill in all 4 answer options.");
      return;
    }
    setBuilderItems((prev) => [
      ...prev,
      { id: `manual-${Date.now()}-${prev.length}`, question: q, options: opts, correct: draft.correct },
    ]);
    setDraft({ id: "", question: "", options: ["", "", "", ""], correct: 0 });
    setBuildError(null);
  };

  const removeBuilderQuestion = (id: string) => {
    setBuilderItems((prev) => prev.filter((b) => b.id !== id));
  };

  const startBuilderQuiz = () => {
    if (builderItems.length < 3) {
      setBuildError("Add at least 3 questions to start the quiz.");
      return;
    }
    const questions: FlashcardQuestion[] = builderItems.map((b) => ({
      id: b.id,
      question: b.question,
      options: b.options,
      correctIndex: b.correct,
      explanation: "",
      initialDifficulty: mode === "hard" ? 4 : 3,
    }));
    loadQuestions(questions, {
      manual: true,
      topics: topics.trim() || "My custom quiz",
    });
  };

  const active = progress !== null;
  const readyCount = pdfQueue.filter((q) => q.status === "ready").length;
  const visibleHistory = showAll ? history : history.slice(0, 5);
  const accFor = (r: HistoryRecord) => {
    const total = r.results.length || r.stats.answered;
    const correct = r.results.filter((x) => x.correct).length || r.stats.correct;
    return total ? Math.round((correct / total) * 100) : 0;
  };

  return (
    <div className="min-h-full bg-[#0F172A] pb-16">
      {/* Top nav bar */}
      <header className="sticky top-0 z-30 bg-[#0F172A]/95 backdrop-blur-sm border-b border-[#334155] px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <span className="text-xl font-bold text-[#E2E8F0] tracking-tight">GROQuiz</span>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full border px-4 py-1.5 transition-colors ${
            groqCount === null
              ? "bg-[#1E293B] border-[#334155]"
              : groqCount > 0
                ? "bg-[#1E293B] border-[#334155]"
                : "bg-red-500/10 border-red-400/30"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              groqCount === null
                ? "bg-slate-500"
                : groqCount > 0
                  ? "bg-emerald-400 animate-pulse-dot"
                  : "bg-red-400"
            }`}
          />
          <span className="text-sm text-[#E2E8F0] whitespace-nowrap">
            {groqCount === null ? (
              <span className="text-[#94A3B8]">Checking AI keys…</span>
            ) : groqCount > 0 ? (
              <>
                <span className="font-semibold text-emerald-400">
                  {groqCount} {groqCount === 1 ? "key" : "keys"}
                </span>{" "}
                connected
              </>
            ) : (
              <span className="text-red-400 font-medium">Not connected</span>
            )}
          </span>
        </div>
      </header>

      <main className="max-w-[672px] mx-auto px-4 pt-8 sm:pt-10 space-y-6 sm:space-y-8 screen-enter">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h1 className="text-fluid-hero font-extrabold text-[#E2E8F0] tracking-tight [overflow-wrap:anywhere]">
            Turn any PDF into a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
              quiz in seconds
            </span>
          </h1>
          <p className="text-fluid-base text-[#94A3B8]">
            Upload PDFs, paste text, or build your own — an adaptive quiz that
            adjusts to your answers.
          </p>
        </div>

        {/* Mode cards */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">
            Select mode
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setModeLocal("balanced");
                setMode("balanced");
              }}
              className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                mode === "balanced"
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-[#334155] bg-[#1E293B] hover:border-[#475569]"
              }`}
            >
              {mode === "balanced" && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center">
                  <Check size={12} strokeWidth={3} className="text-[#0F172A]" />
                </span>
              )}
              <div className="w-10 h-10 rounded-xl bg-cyan-400/20 flex items-center justify-center mb-3">
                <Scale size={20} className="text-cyan-400" />
              </div>
              <p className="font-bold text-[#E2E8F0] text-sm mb-1">Balanced</p>
              <p className="text-[#64748B] text-xs leading-relaxed">
                Starts Medium and adjusts to your answers
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setModeLocal("hard");
                setMode("hard");
              }}
              className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                mode === "hard"
                  ? "border-red-400 bg-red-400/10"
                  : "border-[#334155] bg-[#1E293B] hover:border-[#475569]"
              }`}
            >
              {mode === "hard" && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-red-400 flex items-center justify-center">
                  <Check size={12} strokeWidth={3} className="text-[#0F172A]" />
                </span>
              )}
              <div className="w-10 h-10 rounded-xl bg-red-400/20 flex items-center justify-center mb-3">
                <Lock size={20} className="text-red-400" />
              </div>
              <p className="font-bold text-[#E2E8F0] text-sm mb-1">Hard</p>
              <p className="text-[#64748B] text-xs leading-relaxed">
                Locked at Hard — no power-ups, fixed 30s each
              </p>
            </button>
          </div>
        </div>

        {/* Time limit */}
        <div className="space-y-3 bg-[#1E293B] rounded-2xl p-5 border border-[#334155]">
          <p className="text-sm font-semibold text-[#E2E8F0]">
            {mode === "hard" ? "Time per question" : "Pick your time limit per question"}
          </p>
          <div className="flex gap-2 flex-wrap">
            {TIME_OPTIONS.map((t) => {
              const on = mode === "hard" ? t === 30 : state.timeLimit === t;
              const isFixed = mode === "hard";
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => !isFixed && setTimeLimit(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                    on
                      ? "bg-cyan-400 text-[#0F172A] font-bold"
                      : "bg-[#0F172A] border border-[#334155] text-[#94A3B8] hover:border-cyan-400/50 hover:text-[#E2E8F0]"
                  } ${isFixed && !on ? "opacity-40 cursor-not-allowed" : ""}`}
                  title={isFixed ? "Fixed at 30s in Hard mode" : `${t} seconds per question`}
                >
                  {t}s
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[#64748B]">
            Time out = marked wrong, then a retry at the end.
          </p>
        </div>

        {hasSavedGame && state.screen === "landing" && (
          <div className="bg-cyan-400/10 border border-cyan-400/30 rounded-2xl px-5 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-cyan-300 [overflow-wrap:anywhere]">
              You have an unfinished quiz on{" "}
              <span className="font-semibold">{state.currentTopics || "your material"}</span>.
            </p>
            <button
              type="button"
              onClick={resumeGame}
              className="shrink-0 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0F172A] font-bold text-sm rounded-xl px-4 py-2 transition-all hover:from-cyan-400 hover:to-cyan-300"
            >
              Resume
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-400/30 rounded-2xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <span className="flex-1 [overflow-wrap:anywhere]">{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-red-400 hover:text-red-200 font-medium text-xs shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Input toggle */}
        <div className="flex gap-1 bg-[#1E293B] rounded-xl p-1 border border-[#334155]">
          <button
            type="button"
            onClick={() => setInputMode("upload")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              inputMode === "upload"
                ? "bg-[#334155] text-[#E2E8F0]"
                : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            Upload PDF
          </button>
          <button
            type="button"
            onClick={() => setInputMode("paste")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              inputMode === "paste"
                ? "bg-[#334155] text-[#E2E8F0]"
                : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            Paste Text
          </button>
          <button
            type="button"
            onClick={() => setInputMode("build")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              inputMode === "build"
                ? "bg-[#334155] text-[#E2E8F0]"
                : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            Build Quiz
          </button>
        </div>

        {inputMode === "upload" ? (
          <div className="space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const files = Array.from(e.dataTransfer.files ?? []);
                files.forEach((f) => void addFile(f));
              }}
              onClick={() => !active && fileRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 sm:p-10 md:p-12 flex flex-col items-center gap-4 transition-all duration-200 cursor-pointer ${
                isDragging || active
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-[#334155] bg-[#1E293B] hover:border-[#475569]"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  files.forEach((f) => void addFile(f));
                  e.target.value = "";
                }}
              />

              {progress !== null ? (
                <>
                  <Loader2 size={32} className="text-cyan-400 animate-spin" />
                  {pdfQueue.length > 0 && (
                    <p className="text-sm text-[#E2E8F0] font-medium flex items-center gap-2">
                      <FileText size={14} className="shrink-0 text-cyan-400" />
                      <span>
                        {pdfQueue.length} PDF{pdfQueue.length > 1 ? "s" : ""}
                      </span>
                    </p>
                  )}
                  <p className="text-xs text-cyan-400">{progressLabel}</p>
                  <div className="w-full max-w-xs h-1.5 bg-[#0F172A] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? "bg-cyan-400/20" : "bg-[#0F172A]"}`}>
                    <Upload size={32} className={isDragging ? "text-cyan-400" : "text-[#475569]"} />
                  </div>
                  <div className="text-center">
                    <p className="text-[#94A3B8] font-medium [overflow-wrap:anywhere]">
                      Drag & drop PDFs here
                    </p>
                    <p className="text-sm text-[#64748B] mt-1">
                      or{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInputMode("paste");
                        }}
                        className="text-cyan-400 hover:underline"
                      >
                        paste text instead
                      </button>
                    </p>
                    <p className="text-xs text-[#64748B] mt-3">
                      Add several PDFs for one combined quiz. Your files are
                      uploaded to a private temp folder and auto-deleted after
                      the quiz is generated — never stored. Max {MAX_PDF_MB} MB each.
                    </p>
                  </div>
                  <span className="mt-1 px-6 py-2.5 rounded-xl bg-[#0F172A] border border-[#334155] text-sm text-[#94A3B8] hover:border-cyan-400/60 hover:text-[#E2E8F0] transition-all cursor-pointer">
                    Browse files
                  </span>
                </>
              )}
            </div>

            {pdfQueue.length > 0 && progress === null && (
              <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-4 space-y-3 screen-enter">
                <div className="space-y-2">
                  {pdfQueue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-[#0F172A] rounded-xl border border-[#334155] px-3 py-2.5"
                    >
                      <FileText
                        size={15}
                        className={`shrink-0 ${
                          item.status === "ready"
                            ? "text-cyan-400"
                            : item.status === "error"
                              ? "text-red-400"
                              : "text-[#64748B]"
                        }`}
                      />
                      <span className="flex-1 min-w-0 text-sm text-[#E2E8F0] truncate">
                        {item.name}
                      </span>
                      {item.status === "uploading" && (
                        <Loader2 size={14} className="text-[#64748B] animate-spin shrink-0" />
                      )}
                      {item.status === "ready" && (
                        <span className="text-[#64748B] text-xs shrink-0">
                          {item.url ? "ready" : "read"}
                        </span>
                      )}
                      {item.status === "error" && (
                        <span className="text-red-400 text-xs shrink-0">failed</span>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeFromQueue(item.id)}
                        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#64748B] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => void generateFromQueue()}
                  disabled={readyCount === 0}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0F172A] hover:from-cyan-400 hover:to-cyan-300 shadow-lg shadow-cyan-500/20"
                >
                  {readyCount > 0
                    ? `Generate quiz from ${readyCount} PDF${readyCount > 1 ? "s" : ""}`
                    : "Uploading…"}
                </button>
              </div>
            )}
          </div>
        ) : inputMode === "paste" ? (
          <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-5 space-y-4 screen-enter">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Your text
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your notes, article, or study material here…"
                rows={7}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-sm text-[#E2E8F0] placeholder-[#475569] focus:outline-none focus:border-cyan-400/60 transition-colors [overflow-wrap:anywhere]"
              />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-[#64748B]">{pastedText.length} characters</p>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard
                      .readText()
                      .then((t) => t && setPastedText(t))
                      .catch(() => {})
                  }
                  className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <ClipboardPaste size={14} />
                  Paste from clipboard
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Topic (optional)
              </label>
              <input
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="e.g. Cellular Respiration"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-sm text-[#E2E8F0] placeholder-[#475569] focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={active || pastedText.trim().length < 20}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0F172A] hover:from-cyan-400 hover:to-cyan-300 shadow-lg shadow-cyan-500/20"
            >
              Generate quiz
            </button>
          </div>
        ) : (
          <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-5 space-y-4 screen-enter">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[#E2E8F0]">Build your own quiz</p>
              <p className="text-xs text-[#64748B]">
                {builderItems.length} question{builderItems.length === 1 ? "" : "s"} added
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Question
              </label>
              <textarea
                value={draft.question}
                onChange={(e) => setDraft({ ...draft, question: e.target.value })}
                placeholder="Type your question here…"
                rows={2}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-sm text-[#E2E8F0] placeholder-[#475569] focus:outline-none focus:border-cyan-400/60 transition-colors [overflow-wrap:anywhere]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Answers — tap the circle to mark the correct one
              </label>
              {draft.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                const isCorrect = draft.correct === i;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                      isCorrect
                        ? "border-cyan-400 bg-cyan-400/10"
                        : "border-[#334155] bg-[#0F172A]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, correct: i })}
                      aria-label={`Mark option ${letter} as correct`}
                      className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isCorrect
                          ? "border-cyan-400 bg-cyan-400 text-[#0F172A]"
                          : "border-[#334155] text-transparent hover:border-cyan-400/60"
                      }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                    <span className="text-xs font-bold text-[#64748B] w-5 shrink-0">
                      {letter}
                    </span>
                    <input
                      value={draft.options[i]}
                      onChange={(e) => {
                        const options = [...draft.options];
                        options[i] = e.target.value;
                        setDraft({ ...draft, options });
                      }}
                      placeholder={`Option ${letter}`}
                      className="flex-1 min-w-0 bg-transparent text-sm text-[#E2E8F0] placeholder-[#475569] focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            {buildError && (
              <p className="text-xs text-red-400 [overflow-wrap:anywhere]">{buildError}</p>
            )}

            <button
              type="button"
              onClick={addBuilderQuestion}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-400 text-sm font-semibold hover:bg-cyan-400/20 transition-all"
            >
              <Plus size={15} />
              Add question
            </button>

            {builderItems.length > 0 && (
              <div className="space-y-2">
                {builderItems.map((b, i) => (
                  <div
                    key={b.id}
                    className="flex items-start gap-3 bg-[#0F172A] rounded-xl border border-[#334155] px-3 py-2.5"
                  >
                    <span className="text-xs font-bold text-cyan-400 w-5 shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="flex-1 min-w-0 text-sm text-[#94A3B8] leading-snug [overflow-wrap:anywhere]">
                      {b.question}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeBuilderQuestion(b.id)}
                      aria-label={`Remove question ${i + 1}`}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#64748B] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                Quiz title (optional)
              </label>
              <input
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="e.g. My French vocab quiz"
                className="w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-sm text-[#E2E8F0] placeholder-[#475569] focus:outline-none focus:border-cyan-400/60 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={startBuilderQuiz}
              disabled={builderItems.length < 3 || active}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0F172A] hover:from-cyan-400 hover:to-cyan-300 shadow-lg shadow-cyan-500/20"
            >
              Start quiz
            </button>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-3 screen-enter">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">
                Recent quizzes
              </p>
              {history.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {showAll ? "Show recent" : "View all"}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {visibleHistory.map((r) => {
                const acc = accFor(r);
                return (
                  <div
                    key={r.id}
                    className="group flex items-center justify-between gap-2 bg-[#1E293B] rounded-xl pl-4 pr-2 py-3 border border-[#334155] hover:border-[#475569] transition-colors cursor-pointer"
                    onClick={() => onReview?.(r)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#E2E8F0] group-hover:text-white transition-colors [overflow-wrap:anywhere] leading-snug">
                        {r.topic}
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {r.results.length} questions · {r.points} pts ·{" "}
                        {new Date(r.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold mr-1 ${
                          acc >= 85
                            ? "bg-emerald-400/20 text-emerald-400"
                            : acc >= 70
                              ? "bg-amber-400/20 text-amber-400"
                              : "bg-red-400/20 text-red-400"
                        }`}
                      >
                        {acc}%
                      </span>
                      <button
                        type="button"
                        aria-label="Take this quiz again"
                        title="Take again"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadQuestions(r.questions, {
                            manual: true,
                            topics: r.topic,
                          });
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#64748B] hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors"
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete quiz"
                        title="Delete quiz"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(r);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#475569] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                      <ChevronRight
                        size={16}
                        className="text-[#475569] group-hover:text-[#64748B] transition-colors"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer credit */}
      <footer className="text-center mt-12 text-xs text-[#475569] flex items-center justify-center gap-1.5">
        <Star size={10} className="text-violet-500" />
        GROQuiz
      </footer>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete this quiz?"
        message={
          deleteTarget
            ? `"${deleteTarget.topic}" will be removed from your history. This can't be undone.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteHistory(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}