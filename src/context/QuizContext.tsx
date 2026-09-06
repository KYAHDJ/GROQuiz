"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Difficulty,
  FlashcardQuestion,
  GameStats,
  HintStage,
  HistoryRecord,
  PowerupInventory,
  QuestionResult,
  QuizMode,
  SavedGame,
} from "@/lib/types";

export type Screen = "landing" | "loading" | "quiz" | "results";
export type { QuizMode };

export const BASE_POINTS = 100;
export const BATCH_SIZE = 5;

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Easy",
  3: "Medium",
  4: "Hard",
  5: "Expert",
};

const SAVE_KEY = "groquiz:save:v1";
const HISTORY_KEY = "groquiz:history:v1";

interface QuizState {
  screen: Screen;
  mode: QuizMode;
  questions: FlashcardQuestion[];
  currentIndex: number;
  isFlipped: boolean;
  selected: number | null;
  answered: boolean;
  hintStage: HintStage;
  timerPaused: boolean;
  elapsed: number;
  fiftyFiftyUsed: boolean;
  stats: GameStats;
  inventory: PowerupInventory;
  results: QuestionResult[];
  currentText: string;
  currentTopics: string;
  displayingAnswer: boolean;
  sessionId: string;
}

type QuizAction =
  | { type: "SET_SOURCE"; text: string; topics: string }
  | { type: "LOAD_QUESTIONS"; questions: FlashcardQuestion[] }
  | { type: "SET_SCREEN"; screen: Screen }
  | { type: "SET_MODE"; mode: QuizMode }
  | { type: "START_TIMER" }
  | { type: "TICK" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "GO_TO_QUESTION"; index: number }
  | { type: "BUY_POWERUP"; name: keyof PowerupInventory; cost: number }
  | { type: "USE_POWERUP"; name: keyof PowerupInventory }
  | { type: "SELECT_ANSWER"; index: number }
  | { type: "CONFIRM_ANSWER" }
  | { type: "NEXT_QUESTION" }
  | { type: "RESET_GAME" };

const freshId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const initialState: QuizState = {
  screen: "landing",
  mode: "balanced",
  questions: [],
  currentIndex: 0,
  isFlipped: false,
  selected: null,
  answered: false,
  hintStage: 0,
  timerPaused: false,
  elapsed: 0,
  fiftyFiftyUsed: false,
  stats: { points: 0, streak: 0, bestStreak: 0, answered: 0, correct: 0, tier: 3 },
  inventory: { "50-50": 1, "time-extension": 1, "ai-clarifier": 1 },
  results: [],
  currentText: "",
  currentTopics: "",
  displayingAnswer: false,
  sessionId: "",
};

function defaultStats(mode: QuizMode): GameStats {
  return {
    points: 0,
    streak: 0,
    bestStreak: 0,
    answered: 0,
    correct: 0,
    tier: mode === "hard" ? 4 : 3,
  };
}

function loadSave(): QuizState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw) as SavedGame;
    if (!Array.isArray(saved.questions) || saved.questions.length === 0) {
      return initialState;
    }
    const mode: QuizMode = saved.mode === "hard" ? "hard" : "balanced";
    return {
      ...initialState,
      mode,
      questions: saved.questions,
      currentIndex: saved.currentIndex ?? 0,
      stats: saved.stats ?? defaultStats(mode),
      inventory: saved.inventory ?? initialState.inventory,
      results: saved.results ?? [],
      currentText: saved.currentText ?? "",
      currentTopics: saved.currentTopics ?? "",
      screen: saved.screen === "results" ? "results" : "quiz",
    };
  } catch {
    return initialState;
  }
}

function loadHistory(): HistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryRecord[]) : [];
  } catch {
    return [];
  }
}

function persistSave(state: QuizState): void {
  if (typeof window === "undefined") return;
  if (state.screen === "landing" || state.questions.length === 0) {
    localStorage.removeItem(SAVE_KEY);
    return;
  }
  const saved: SavedGame = {
    questions: state.questions,
    currentIndex: state.currentIndex,
    stats: state.stats,
    inventory: state.inventory,
    results: state.results,
    currentText: state.currentText,
    currentTopics: state.currentTopics,
    screen: state.screen === "results" ? "results" : "quiz",
    mode: state.mode,
    savedAt: Date.now(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
}

function persistHistory(record: HistoryRecord): HistoryRecord[] {
  if (typeof window === "undefined") return [record];
  try {
    const existing = loadHistory();
    const next = [record, ...existing.filter((r) => r.id !== record.id)].slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [record];
  }
}

function pointsForAnswer(result: {
  correct: boolean;
  elapsed: number;
  hintStage: HintStage;
  streak: number;
  fiftyFiftyUsed: boolean;
}): { points: number; deltaTier: number; newStreak: number } {
  if (!result.correct) {
    return { points: 0, deltaTier: -1, newStreak: 0 };
  }

  const fast = result.elapsed < 10;
  const speedBonus = fast ? 100 : 0;
  const hints = result.hintStage + (result.fiftyFiftyUsed ? 1 : 0);
  const hintPenalty = hints * 0.25;

  let points = Math.round((100 + speedBonus) * Math.max(0, 1 - hintPenalty));
  const combo = 1 + Math.min(result.streak, 9) * 0.1;
  points = Math.round(points * combo);

  const slowOrHinted = result.elapsed >= 30 || hints > 0;
  const deltaTier = slowOrHinted ? -1 : fast && hints === 0 ? 1 : 0;

  return { points, deltaTier, newStreak: result.streak + 1 };
}

function reduce(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "SET_SOURCE":
      return {
        ...state,
        currentText: action.text,
        currentTopics: action.topics,
        screen: "loading",
      };

    case "LOAD_QUESTIONS":
      return {
        ...state,
        questions: action.questions,
        currentIndex: 0,
        isFlipped: false,
        selected: null,
        answered: false,
        hintStage: 0,
        timerPaused: false,
        elapsed: 0,
        fiftyFiftyUsed: false,
        screen: "quiz",
        results: [],
        sessionId: freshId("sess"),
      };

    case "SET_MODE":
      return {
        ...state,
        mode: action.mode,
        stats: {
          ...state.stats,
          tier: action.mode === "hard" ? 4 : 3,
        },
      };

    case "SET_SCREEN":
      return { ...state, screen: action.screen };

    case "START_TIMER":
      return {
        ...state,
        elapsed: 0,
        hintStage: 0,
        timerPaused: false,
        selected: null,
        answered: false,
        isFlipped: false,
        fiftyFiftyUsed: false,
      };

    case "TICK": {
      if (state.answered || state.timerPaused) return state;
      const elapsed = state.elapsed + 1;
      const hintStage = elapsed >= 30 ? 3 : elapsed >= 20 ? 2 : elapsed >= 10 ? 1 : 0;
      return { ...state, elapsed, hintStage };
    }

    case "TOGGLE_PAUSE":
      return { ...state, timerPaused: !state.timerPaused };

    case "GO_TO_QUESTION": {
      const idx = Math.max(0, Math.min(state.questions.length - 1, action.index));
      if (idx === state.currentIndex || !state.questions[idx]) return state;
      const alreadyAnswered = state.results.some(
        (r) => r.questionId === state.questions[idx].id
      );
      return {
        ...state,
        currentIndex: idx,
        selected: null,
        answered: alreadyAnswered,
        hintStage: alreadyAnswered ? 0 : state.hintStage,
        isFlipped: false,
        timerPaused: false,
        elapsed: 0,
        fiftyFiftyUsed: alreadyAnswered ? false : state.fiftyFiftyUsed,
      };
    }

    case "BUY_POWERUP":
      if (state.stats.points < action.cost) return state;
      return {
        ...state,
        stats: { ...state.stats, points: state.stats.points - action.cost },
        inventory: { ...state.inventory, [action.name]: state.inventory[action.name] + 1 },
      };

    case "USE_POWERUP":
      if (state.inventory[action.name] <= 0 || state.answered || state.mode === "hard") return state;
      return {
        ...state,
        inventory: { ...state.inventory, [action.name]: state.inventory[action.name] - 1 },
        fiftyFiftyUsed: state.fiftyFiftyUsed || action.name === "50-50",
      };

    case "SELECT_ANSWER":
      if (state.answered) return state;
      return { ...state, selected: action.index };

    case "CONFIRM_ANSWER": {
      if (state.selected === null || state.answered) return state;
      const q = state.questions[state.currentIndex];
      const correct = state.selected === q.correctIndex;

      const scoring = pointsForAnswer({
        correct,
        elapsed: state.elapsed,
        hintStage: state.hintStage,
        streak: state.stats.streak,
        fiftyFiftyUsed: state.fiftyFiftyUsed,
      });

      const rawTier = state.stats.tier + scoring.deltaTier;
      const newTier =
        state.mode === "hard"
          ? 4
          : (Math.max(1, Math.min(5, rawTier)) as Difficulty);

      const result: QuestionResult = {
        questionId: q.id,
        correct,
        timeTaken: state.elapsed,
        pointsEarned: scoring.points,
        hintsUsed: state.hintStage,
      };

      return {
        ...state,
        answered: true,
        isFlipped: true,
        stats: {
          points: state.stats.points + scoring.points,
          streak: scoring.newStreak,
          bestStreak: Math.max(state.stats.bestStreak, scoring.newStreak),
          answered: state.stats.answered + 1,
          correct: state.stats.correct + (correct ? 1 : 0),
          tier: newTier,
        },
        results: [...state.results, result],
      };
    }

    case "NEXT_QUESTION": {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { ...state, screen: "results" };
      }
      return {
        ...state,
        currentIndex: nextIndex,
        isFlipped: false,
        selected: null,
        answered: false,
        hintStage: 0,
        timerPaused: false,
        elapsed: 0,
        fiftyFiftyUsed: false,
      };
    }

    case "RESET_GAME":
      return {
        ...initialState,
        mode: state.mode,
        inventory: state.inventory,
        stats: defaultStats(state.mode),
      };

    default:
      return state;
  }
}

interface QuizContextValue {
  state: QuizState;
  setSource: (text: string, topics: string) => void;
  loadQuestions: (questions: FlashcardQuestion[]) => void;
  setScreen: (screen: Screen) => void;
  setMode: (mode: QuizMode) => void;
  startTimer: () => void;
  tick: () => void;
  togglePause: () => void;
  goToQuestion: (index: number) => void;
  buyPowerup: (name: keyof PowerupInventory, cost: number) => void;
  usePowerup: (name: keyof PowerupInventory) => void;
  selectAnswer: (index: number) => void;
  confirmAnswer: () => void;
  nextQuestion: () => void;
  resetGame: () => void;
  resumeGame: () => void;
  currentQuestion: FlashcardQuestion | null;
  hasSavedGame: boolean;
  history: HistoryRecord[];
  clearHistory: () => void;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, initialState, loadSave);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const recordedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    setHasSavedGame(state.screen !== "landing" && state.questions.length > 0);
    persistSave(state);
  }, [state]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (
      state.screen === "results" &&
      state.results.length > 0 &&
      state.sessionId &&
      recordedSessionRef.current !== state.sessionId
    ) {
      recordedSessionRef.current = state.sessionId;
      const records = persistHistory({
        id: state.sessionId,
        topic: state.currentTopics || "Imported material",
        date: Date.now(),
        stats: state.stats,
        results: state.results,
        questions: state.questions,
        points: state.results.reduce((a, r) => a + r.pointsEarned, 0),
      });
      setHistory(records);
    }
  }, [state.screen, state.sessionId, state.results, state.stats, state.questions, state.currentTopics]);

  const value = useMemo<QuizContextValue>(() => {
    const currentQuestion = state.questions[state.currentIndex] ?? null;
    return {
      state,
      setSource: (text, topics) => dispatch({ type: "SET_SOURCE", text, topics }),
      loadQuestions: (questions) => dispatch({ type: "LOAD_QUESTIONS", questions }),
      setScreen: (screen) => dispatch({ type: "SET_SCREEN", screen }),
      setMode: (mode) => dispatch({ type: "SET_MODE", mode }),
      startTimer: () => dispatch({ type: "START_TIMER" }),
      tick: () => dispatch({ type: "TICK" }),
      togglePause: () => dispatch({ type: "TOGGLE_PAUSE" }),
      goToQuestion: (index) => dispatch({ type: "GO_TO_QUESTION", index }),
      buyPowerup: (name, cost) => dispatch({ type: "BUY_POWERUP", name, cost }),
      usePowerup: (name) => dispatch({ type: "USE_POWERUP", name }),
      selectAnswer: (index) => dispatch({ type: "SELECT_ANSWER", index }),
      confirmAnswer: () => dispatch({ type: "CONFIRM_ANSWER" }),
      nextQuestion: () => dispatch({ type: "NEXT_QUESTION" }),
      resetGame: () => dispatch({ type: "RESET_GAME" }),
      resumeGame: () => {
        const save = loadSave();
        if (save.questions.length > 0) {
          dispatch({ type: "SET_SCREEN", screen: save.screen });
        }
      },
      currentQuestion,
      hasSavedGame,
      history,
      clearHistory: () => {
        localStorage.removeItem(HISTORY_KEY);
        setHistory([]);
      },
    };
  }, [state, hasSavedGame, history]);

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz(): QuizContextValue {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used within QuizProvider");
  return ctx;
}