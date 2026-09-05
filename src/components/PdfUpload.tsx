"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  AlertCircle,
  Loader2,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { useQuiz } from "@/context/QuizContext";
import { BATCH_SIZE } from "@/context/QuizContext";
import type { Difficulty } from "@/lib/types";

export default function PdfUpload() {
  const { state, setSource, loadQuestions } = useQuiz();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"pdf" | "text" | null>(null);
  const [textInput, setTextInput] = useState("");
  const [topicsInput, setTopicsInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to parse PDF");
        setLoading(false);
        return;
      }
      setSource(data.text, topicsInput);
      await fetchQuestions(data.text, topicsInput);
    } catch {
      setError("Could not process the PDF. Please try another file.");
      setLoading(false);
    }
  }, [topicsInput, setSource]);

  const fetchQuestions = useCallback(
    async (text: string, topics: string) => {
      setLoading(true);
      const tier = state.stats.tier as unknown as Difficulty;
      try {
        const res = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            topics,
            count: BATCH_SIZE,
            difficulty: tier,
          }),
        });
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          loadQuestions(data.questions);
        } else {
          setError("No questions could be generated. Try different content.");
          setLoading(false);
        }
      } catch {
        setError("Failed to generate questions. Check your connection.");
        setLoading(false);
      }
    },
    [state.stats.tier, loadQuestions]
  );

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim()) return;
    setSource(textInput, topicsInput);
    await fetchQuestions(textInput, topicsInput);
  }, [textInput, topicsInput, setSource, fetchQuestions]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.toLowerCase().endsWith(".pdf")) processFile(file);
      else setError("Please drop a PDF file");
    },
    [processFile]
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-4 py-8">
      <div className="text-center mb-10 max-w-lg">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-5 text-sm text-emerald-400">
          <Sparkles size={14} className="animate-pulse" />
          Powered by Groq + LLaMA 3
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
          GROQuiz
        </h1>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
          Upload a PDF or paste text. Get AI-generated adaptive flashcards with
          progressive hints and power-ups.
        </p>
      </div>

      {state.screen === "loading" && loading ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 size={40} className="text-emerald-400 animate-spin" />
          <p className="text-slate-300 text-lg">Generating questions…</p>
        </div>
      ) : !uploadMode ? (
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button
            onClick={() => setUploadMode("pdf")}
            className="flex-1 flex flex-col items-center gap-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 transition-all cursor-pointer group"
          >
            <FileText
              size={32}
              className="text-slate-400 group-hover:text-emerald-400 transition-colors"
            />
            <span className="font-semibold text-slate-200">Upload PDF</span>
            <span className="text-xs text-slate-500">
              Extract text & build flashcards
            </span>
          </button>
          <button
            onClick={() => setUploadMode("text")}
            className="flex-1 flex flex-col items-center gap-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-2xl p-6 transition-all cursor-pointer group"
          >
            <BookOpen
              size={32}
              className="text-slate-400 group-hover:text-cyan-400 transition-colors"
            />
            <span className="font-semibold text-slate-200">Paste Text</span>
            <span className="text-xs text-slate-500">
              Enter a topic or raw notes
            </span>
          </button>
        </div>
      ) : uploadMode === "pdf" ? (
        <div className="w-full max-w-lg">
          <button
            onClick={() => { setUploadMode(null); setError(""); }}
            className="text-sm text-slate-500 hover:text-slate-300 mb-4 transition-colors"
          >
            ← back
          </button>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-slate-700 hover:border-slate-500 bg-slate-800/50"
            }`}
          >
            <Upload
              size={40}
              className={`mx-auto mb-4 ${dragOver ? "text-emerald-400" : "text-slate-500"}`}
            />
            <p className="text-slate-300 font-medium mb-1">
              Drop your PDF here or tap to browse
            </p>
            <p className="text-xs text-slate-500">Max ~4MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm text-slate-400 mb-1">
              Optional: topics / focus areas
            </label>
            <input
              type="text"
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder="e.g. cellular respiration, mitochondria"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
            />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-lg">
          <button
            onClick={() => { setUploadMode(null); setError(""); }}
            className="text-sm text-slate-500 hover:text-slate-300 mb-4 transition-colors"
          >
            ← back
          </button>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your study material here…"
            rows={8}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 resize-none transition-colors"
          />
          <div className="mt-3">
            <label className="block text-sm text-slate-400 mb-1">
              Optional: focus topics
            </label>
            <input
              type="text"
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder="e.g. osmosis, cell membranes"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
            />
          </div>
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim()}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            Generate Flashcards
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300 max-w-lg w-full">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  );
}