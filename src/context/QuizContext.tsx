"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import type {
  Difficulty,
  FlashcardQuestion,
  GameStats,
  HintStage,
  PowerupInventory,
  QuestionResult,
} from "@/lib/types";

type Screen = "landing" | "loading" | "quiz" | "results";

export const BASE_POINTS = 100;
export const BATCH_SIZE = 5;

interface QuizState {
  screen: Screen;
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
}

type QuizAction =
  | { type: "SET_SOURCE"; text: string; topics: string }
  | { type: "SET_LOADING" }
  | { type: "LOAD_QUESTIONS"; questions: FlashcardQuestion[] }
  | { type: "SET_SCREEN"; screen: Screen }
  | { type: "START_TIMER" }
  | { type: "TICK" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "BUY_POWERUP"; name: keyof PowerupInventory; cost: number }
  | { type: "USE_POWERUP"; name: keyof PowerupInventory }
  | { type: "SELECT_ANSWER"; index: number }
  | { type: "CONFIRM_ANSWER" }
  | { type: "NEXT_QUESTION" }
  | { type: "RESET_GAME" }
  | { type: "EDIT_FLIP"; flipped: boolean };

const initialState: QuizState = {
  screen: "landing",
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
};

function activeHints(hintStage: HintStage): number {
  return hintStage;
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
  const hints = activeHints(result.hintStage) + (result.fiftyFiftyUsed ? 1 : 0);
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
      return { ...state, currentText: action.text, currentTopics: action.topics, screen: "loading" };

    case "SET_LOADING":
      return { ...state, screen: "loading" };

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
      };

    case "SET_SCREEN":
      return { ...state, screen: action.screen };

    case "START_TIMER":
      return { ...state, elapsed: 0, hintStage: 0, timerPaused: false, selected: null, answered: false, isFlipped: false, fiftyFiftyUsed: false };

    case "TICK": {
      if (state.answered || state.timerPaused) return state;
      const elapsed = state.elapsed + 1;
      const hintStage =
        elapsed >= 30 ? 3 : elapsed >= 20 ? 2 : elapsed >= 10 ? 1 : 0;
      return { ...state, elapsed, hintStage };
    }

    case "TOGGLE_PAUSE":
      return { ...state, timerPaused: !state.timerPaused };

    case "BUY_POWERUP":
      if (state.stats.points < action.cost) return state;
      return {
        ...state,
        stats: { ...state.stats, points: state.stats.points - action.cost },
        inventory: { ...state.inventory, [action.name]: state.inventory[action.name] + 1 },
      };

    case "USE_POWERUP":
      if (state.inventory[action.name] <= 0 || state.answered) return state;
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

      const newTier = Math.max(1, Math.min(5, state.stats.tier + scoring.deltaTier)) as Difficulty;

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
        inventory: state.inventory,
      };

    case "EDIT_FLIP":
      return { ...state, isFlipped: action.flipped };

    default:
      return state;
  }
}

interface QuizContextValue {
  state: QuizState;
  setSource: (text: string, topics: string) => void;
  setLoading: () => void;
  loadQuestions: (questions: FlashcardQuestion[]) => void;
  setScreen: (screen: Screen) => void;
  startTimer: () => void;
  tick: () => void;
  togglePause: () => void;
  buyPowerup: (name: keyof PowerupInventory, cost: number) => void;
  usePowerup: (name: keyof PowerupInventory) => void;
  selectAnswer: (index: number) => void;
  confirmAnswer: () => void;
  nextQuestion: () => void;
  resetGame: () => void;
  currentQuestion: FlashcardQuestion | null;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, initialState);

  const value = useMemo<QuizContextValue>(() => {
    const currentQuestion = state.questions[state.currentIndex] ?? null;
    return {
      state,
      setSource: (text, topics) => dispatch({ type: "SET_SOURCE", text, topics }),
      setLoading: () => dispatch({ type: "SET_LOADING" }),
      loadQuestions: (questions) => dispatch({ type: "LOAD_QUESTIONS", questions }),
      setScreen: (screen) => dispatch({ type: "SET_SCREEN", screen }),
      startTimer: () => dispatch({ type: "START_TIMER" }),
      tick: () => dispatch({ type: "TICK" }),
      togglePause: () => dispatch({ type: "TOGGLE_PAUSE" }),
      buyPowerup: (name, cost) => dispatch({ type: "BUY_POWERUP", name, cost }),
      usePowerup: (name) => dispatch({ type: "USE_POWERUP", name }),
      selectAnswer: (index) => dispatch({ type: "SELECT_ANSWER", index }),
      confirmAnswer: () => dispatch({ type: "CONFIRM_ANSWER" }),
      nextQuestion: () => dispatch({ type: "NEXT_QUESTION" }),
      resetGame: () => dispatch({ type: "RESET_GAME" }),
      currentQuestion,
    };
  }, [state]);

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz(): QuizContextValue {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used within QuizProvider");
  return ctx;
}