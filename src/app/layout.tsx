import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { QuizProvider } from "@/context/QuizContext";

export const metadata: Metadata = {
  title: "GROQuiz — Adaptive Quiz Flashcards",
  description:
    "Upload a PDF or pick a topic. GROQuiz turns your material into adaptive flashcards with progressive hints, powerups, and AI explanations.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-slate-950 text-slate-100 antialiased">
        <QuizProvider>{children}</QuizProvider>
      </body>
    </html>
  );
}