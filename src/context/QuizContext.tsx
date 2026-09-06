"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  IS_FIREBASE_ENABLED,
  saveHistoryToFirebase,
  loadHistoryFromFirebase,
  deleteHistoryFromFirebase,
  saveGameToFirebase,
  loadGameFromFirebase,
} from "@/lib/firebase/client";
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
  allQuestions: FlashcardQuestion[];
  currentIndex: number;
  isFlipped: boolean;
  selected: number | null;
  answered: boolean;
  hintStage: HintStage;
  timerPaused: boolean;
  elapsed: number;
  timeLimit: number;
  elapsedByQuestion: Record<string, number>;
  retryIds: string[];
  retryRound: boolean;
  fiftyFiftyUsed: boolean;
  stats: GameStats;
  inventory: PowerupInventory;
  results: QuestionResult[];
  currentText: string;
  currentTopics: string;
  isManual: boolean;
  displayingAnswer: boolean;
  sessionId: string;
}

type QuizAction =
  | { type: "SET_SOURCE"; text: string; topics: string }
  | { type: "LOAD_QUESTIONS"; questions: FlashcardQuestion[]; manual?: boolean; topics?: string }
  | { type: "SET_SCREEN"; screen: Screen }
  | { type: "SET_MODE"; mode: QuizMode }
  | { type: "SET_TIME_LIMIT"; seconds: number }
  | { type: "START_TIMER" }
  | { type: "TICK" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "GO_TO_QUESTION"; index: number }
  | { type: "BUY_POWERUP"; name: keyof PowerupInventory; cost: number }
  | { type: "USE_POWERUP"; name: keyof PowerupInventory }
  | { type: "SELECT_ANSWER"; index: number }
  | { type: "CONFIRM_ANSWER" }
  | { type: "NEXT_QUESTION" }
  | { type: "REPLACE_QUESTION"; index: number; question: FlashcardQuestion }
  | { type: "RESTART_QUIZ" }
  | { type: "RESET_GAME" };

const freshId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const initialState: QuizState = {
  screen: "landing",
  mode: "balanced",
  questions: [],
  allQuestions: [],
  currentIndex: 0,
  isFlipped: false,
  selected: null,
  answered: false,
  hintStage: 0,
  timerPaused: false,
  elapsed: 0,
  timeLimit: 60,
  elapsedByQuestion: {},
  retryIds: [],
  retryRound: false,
  fiftyFiftyUsed: false,
  stats: { points: 0, streak: 0, bestStreak: 0, answered: 0, correct: 0, tier: 3 },
  inventory: { "50-50": 1, "time-extension": 1, "ai-clarifier": 1 },
  results: [],
  currentText: "",
  currentTopics: "",
  isManual: false,
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
    const activeQuestionId = saved.questions[saved.currentIndex ?? 0]?.id;
    return {
      ...initialState,
      mode,
      questions: saved.questions,
      allQuestions: saved.allQuestions ?? saved.questions,
      retryIds: saved.retryIds ?? [],
      retryRound: saved.retryRound ?? false,
      timeLimit: mode === "hard" ? 30 : Math.max(10, Math.min(180, saved.timeLimit ?? 60)),
      elapsedByQuestion: saved.elapsedByQuestion ?? {},
      elapsed:
        activeQuestionId && saved.elapsedByQuestion?.[activeQuestionId] != null
          ? saved.elapsedByQuestion[activeQuestionId]
          : 0,
      currentIndex: saved.currentIndex ?? 0,
      stats: saved.stats ?? defaultStats(mode),
      inventory: saved.inventory ?? initialState.inventory,
      results: saved.results ?? [],
      currentText: saved.currentText ?? "",
      currentTopics: saved.currentTopics ?? "",
      isManual: saved.isManual ?? false,
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

function persistSave(state: QuizState): SavedGame | null {
  if (typeof window === "undefined") return null;
  if (state.screen === "landing" || state.questions.length === 0) {
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
  const activeQuestion = state.questions[state.currentIndex];
  const saved: SavedGame = {
    questions: state.questions,
    allQuestions: state.allQuestions,
    retryIds: state.retryIds,
    retryRound: state.retryRound,
    timeLimit: state.timeLimit,
    elapsedByQuestion: activeQuestion
      ? { ...state.elapsedByQuestion, [activeQuestion.id]: state.elapsed }
      : state.elapsedByQuestion,
    currentIndex: state.currentIndex,
    stats: state.stats,
    inventory: state.inventory,
    results: state.results,
    currentText: state.currentText,
    currentTopics: state.currentTopics,
    isManual: state.isManual,
    screen: state.screen === "results" ? "results" : "quiz",
    mode: state.mode,
    savedAt: Date.now(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  return saved;
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
    return { points: 10, deltaTier: -1, newStreak: 0 };
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
        allQuestions: action.questions,
        currentIndex: 0,
        isFlipped: false,
        selected: null,
        answered: false,
        hintStage: 0,
        timerPaused: false,
        elapsed: 0,
        elapsedByQuestion: {},
        retryIds: [],
        retryRound: false,
        fiftyFiftyUsed: false,
        isManual: action.manual ?? false,
        currentTopics: action.topics ?? state.currentTopics,
        screen: "quiz",
        results: [],
        sessionId: freshId("sess"),
      };

    case "SET_MODE":
      return {
        ...state,
        mode: action.mode,
        timeLimit: action.mode === "hard" ? 30 : state.timeLimit,
        stats: {
          ...state.stats,
          tier: action.mode === "hard" ? 4 : 3,
        },
      };

    case "SET_TIME_LIMIT":
      if (state.mode === "hard" || state.answered || state.screen !== "landing") {
        return state;
      }
      return { ...state, timeLimit: Math.max(10, Math.min(180, action.seconds)) };

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

      if (elapsed >= state.timeLimit) {
        const q = state.questions[state.currentIndex];
        if (!q) return { ...state, elapsed: state.timeLimit, answered: true };
        const hintStage = state.mode === "hard" ? 0 : state.hintStage;
        const newTier =
          state.mode === "hard"
            ? 4
            : (Math.max(1, state.stats.tier - 1) as Difficulty);
        const result: QuestionResult = {
          questionId: q.id,
          correct: false,
          timeTaken: state.timeLimit,
          pointsEarned: 0,
          hintsUsed: hintStage,
        };
        const retryIds =
          state.retryRound || state.retryIds.includes(q.id)
            ? state.retryIds
            : [...state.retryIds, q.id];
        return {
          ...state,
          elapsed: state.timeLimit,
          answered: true,
          isFlipped: true,
          hintStage,
          results: [...state.results, result],
          retryIds,
          stats: {
            ...state.stats,
            answered: state.stats.answered + 1,
            streak: 0,
            tier: newTier,
          },
        };
      }

      const hintStage =
        state.mode === "hard"
          ? 0
          : elapsed >= state.timeLimit * 0.75
            ? 3
            : elapsed >= state.timeLimit * 0.5
              ? 2
              : elapsed >= state.timeLimit * 0.25
                ? 1
                : 0;
      return { ...state, elapsed, hintStage };
    }

    case "TOGGLE_PAUSE":
      return { ...state, timerPaused: !state.timerPaused };

    case "GO_TO_QUESTION": {
      if (state.mode === "hard" || state.retryRound) return state;
      const idx = Math.max(0, Math.min(state.questions.length - 1, action.index));
      if (idx === state.currentIndex || !state.questions[idx]) return state;
      const alreadyAnswered = state.results.some(
        (r) => r.questionId === state.questions[idx].id
      );
      const elapsedByQuestion = { ...state.elapsedByQuestion };
      const active = state.questions[state.currentIndex];
      if (active) elapsedByQuestion[active.id] = state.elapsed;
      const targetElapsed = state.elapsedByQuestion[state.questions[idx].id] ?? 0;
      const targetHintStage =
        targetElapsed >= state.timeLimit * 0.75
          ? 3
          : targetElapsed >= state.timeLimit * 0.5
            ? 2
            : targetElapsed >= state.timeLimit * 0.25
              ? 1
              : 0;
      return {
        ...state,
        currentIndex: idx,
        selected: null,
        answered: alreadyAnswered,
        hintStage: alreadyAnswered ? 0 : targetHintStage,
        isFlipped: false,
        timerPaused: false,
        elapsedByQuestion,
        elapsed: targetElapsed,
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
      const points = state.retryRound ? Math.round(scoring.points * 0.5) : scoring.points;
      const deltaTier = state.retryRound ? 0 : scoring.deltaTier;
      const newStreak = state.retryRound ? state.stats.streak : scoring.newStreak;

      const rawTier = state.stats.tier + deltaTier;
      const newTier =
        state.mode === "hard"
          ? 4
          : (Math.max(1, Math.min(5, rawTier)) as Difficulty);

      const result: QuestionResult = {
        questionId: q.id,
        correct,
        timeTaken: state.elapsed,
        pointsEarned: points,
        hintsUsed: state.hintStage,
      };

      const retryIds =
        !correct && !state.retryRound && !state.retryIds.includes(q.id)
          ? [...state.retryIds, q.id]
          : state.retryIds;

      return {
        ...state,
        answered: true,
        isFlipped: true,
        retryIds,
        stats: {
          points: state.stats.points + points,
          streak: newStreak,
          bestStreak: Math.max(state.stats.bestStreak, newStreak),
          answered: state.stats.answered + 1,
          correct: state.stats.correct + (correct ? 1 : 0),
          tier: newTier,
        },
        results: [...state.results, result],
      };
    }

    case "NEXT_QUESTION": {
      const elapsedByQuestion = { ...state.elapsedByQuestion };
      const active = state.questions[state.currentIndex];
      if (active) elapsedByQuestion[active.id] = state.elapsed;
      const nextIndex = state.currentIndex + 1;
      if (nextIndex < state.questions.length) {
        return {
          ...state,
          currentIndex: nextIndex,
          isFlipped: false,
          selected: null,
          answered: false,
          hintStage: 0,
          timerPaused: false,
          elapsedByQuestion,
          elapsed: 0,
          fiftyFiftyUsed: false,
        };
      }
      if (!state.retryRound) {
        const retryQuestions = state.allQuestions.filter((q) =>
          state.retryIds.includes(q.id)
        );
        if (retryQuestions.length > 0) {
          return {
            ...state,
            questions: retryQuestions,
            retryRound: true,
            currentIndex: 0,
            isFlipped: false,
            selected: null,
            answered: false,
            hintStage: 0,
            timerPaused: false,
            elapsedByQuestion,
            elapsed: 0,
            fiftyFiftyUsed: false,
          };
        }
      }
      return { ...state, elapsedByQuestion, screen: "results" };
    }

    case "REPLACE_QUESTION": {
      const idx = action.index;
      if (
        idx < 0 ||
        idx >= state.questions.length ||
        !action.question ||
        state.results.some((r) => r.questionId === state.questions[idx]?.id)
      ) {
        return state;
      }
      return {
        ...state,
        questions: state.questions.map((q, i) =>
          i === idx ? action.question : q
        ),
        allQuestions: state.allQuestions.map((q, i) =>
          i === idx ? action.question : q
        ),
      };
    }

    case "RESTART_QUIZ":
      return {
        ...state,
        screen: "quiz",
        currentIndex: 0,
        isFlipped: false,
        selected: null,
        answered: false,
        hintStage: 0,
        timerPaused: false,
        elapsed: 0,
        elapsedByQuestion: {},
        retryIds: [],
        retryRound: false,
        fiftyFiftyUsed: false,
        results: [],
        sessionId: freshId("sess"),
        stats: defaultStats(state.mode),
        questions: state.allQuestions,
        allQuestions: state.allQuestions,
      };

    case "RESET_GAME":
      return {
        ...initialState,
        mode: state.mode,
        inventory: state.inventory,
        timeLimit: state.mode === "hard" ? 30 : state.timeLimit,
        stats: defaultStats(state.mode),
      };

    default:
      return state;
  }
}

interface QuizContextValue {
  state: QuizState;
  setSource: (text: string, topics: string) => void;
  loadQuestions: (
    questions: FlashcardQuestion[],
    opts?: { manual?: boolean; topics?: string }
  ) => void;
  setScreen: (screen: Screen) => void;
  setMode: (mode: QuizMode) => void;
  setTimeLimit: (seconds: number) => void;
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
  restartQuiz: () => void;
  resumeGame: () => void;
  adaptUpcoming: () => Promise<void>;
  hintCache: Readonly<Record<string, string>>;
  requestHint: (question: FlashcardQuestion, difficulty: number) => void;
  currentQuestion: FlashcardQuestion | null;
  hasSavedGame: boolean;
  history: HistoryRecord[];
  deleteHistory: (id: string) => void;
  clearHistory: () => void;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, initialState, loadSave);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const recordedSessionRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastSavedSigRef = useRef<string>("");
  const hadSavedRef = useRef(false);
  const adaptTokenRef = useRef(0);
  const [hintCache, setHintCache] = useState<Record<string, string>>({});
  const hintCacheRef = useRef<Record<string, string>>({});
  hintCacheRef.current = hintCache;
  const hintPendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let restored = false;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      restored = Boolean(raw && (JSON.parse(raw) as SavedGame)?.questions?.length);
    } catch {
      restored = false;
    }
    setHasSavedGame(state.questions.length > 0 || restored);
    const saved = persistSave(state);
    if (!IS_FIREBASE_ENABLED) return;
    let cancelled = false;
    const sig = saved
      ? `${state.sessionId}|${state.currentIndex}|${state.results.length}|${state.stats.points}|${state.screen}`
      : "";
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (saved) {
        if (sig === lastSavedSigRef.current) return;
        lastSavedSigRef.current = sig;
        hadSavedRef.current = true;
        void saveGameToFirebase(saved);
      } else if (hadSavedRef.current && lastSavedSigRef.current) {
        lastSavedSigRef.current = "";
        hadSavedRef.current = false;
        void saveGameToFirebase(null);
      }
    }, 900);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (!IS_FIREBASE_ENABLED) return;
    let cancelled = false;
    (async () => {
      try {
        const [remoteHistory, remoteSave] = await Promise.all([
          loadHistoryFromFirebase(),
          loadGameFromFirebase(),
        ]);
        if (cancelled) return;
        const local = loadHistory();
        let merged: HistoryRecord[] | null = null;
        if (remoteHistory && remoteHistory.length > 0) merged = remoteHistory;
        else if (local.length > 0) merged = local;
        if (merged) {
          setHistory(merged);
          if (remoteHistory && remoteHistory.length === 0) {
            void saveHistoryToFirebase(merged);
          }
        }
        if (remoteSave && Array.isArray(remoteSave.questions) && remoteSave.questions.length > 0) {
          const cur = stateRef.current;
          if (cur.screen === "landing" && cur.questions.length === 0) {
            try {
              localStorage.setItem(SAVE_KEY, JSON.stringify(remoteSave));
            } catch {
              // ignore storage errors
            }
            setHasSavedGame(true);
          }
        }
      } catch {
        // keep local storage
      }
    })();
    return () => {
      cancelled = true;
    };
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
        questions: state.allQuestions,
        points: state.results.reduce((a, r) => a + r.pointsEarned, 0),
      });
      setHistory(records);
      if (IS_FIREBASE_ENABLED) void saveHistoryToFirebase(records);
    }
  }, [state.screen, state.sessionId, state.results, state.stats, state.allQuestions, state.currentTopics]);

  const requestHint = useCallback(
    async (question: FlashcardQuestion, difficulty: number) => {
      if (
        hintCacheRef.current[question.id] ||
        hintPendingRef.current.has(question.id)
      ) {
        return;
      }
      hintPendingRef.current.add(question.id);
      try {
        const s = stateRef.current;
        const res = await fetch("/api/hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: question.question,
            options: question.options,
            correctIndex: question.correctIndex,
            difficulty,
            text: s.currentText.slice(0, 4000),
          }),
        });
        if (!res.ok) throw new Error("hint failed");
        const data = await res.json();
        if (typeof data?.hint === "string" && data.hint.trim()) {
          const hint = data.hint.trim();
          setHintCache((prev) =>
            prev[question.id] ? prev : { ...prev, [question.id]: hint }
          );
          return;
        }
        throw new Error("empty hint");
      } catch {
        setTimeout(() => {
          hintPendingRef.current.delete(question.id);
          const cur = stateRef.current;
          if (
            cur.screen === "quiz" &&
            cur.questions.some((q) => q.id === question.id)
          ) {
            requestHint(question, cur.stats.tier);
          }
        }, 60_000);
      }
    },
    []
  );

  useEffect(() => {
    const s = stateRef.current;
    if (s.screen !== "quiz" || s.questions.length === 0) return;
    const answeredIds = new Set(s.results.map((r) => r.questionId));
    for (const q of s.questions) {
      if (answeredIds.has(q.id) || hintCacheRef.current[q.id]) continue;
      requestHint(q, s.stats.tier);
    }
  }, [state.screen, state.currentIndex, state.questions, state.results, requestHint]);

  const value = useMemo<QuizContextValue>(() => {
    const currentQuestion = state.questions[state.currentIndex] ?? null;

    const adaptUpcoming: () => Promise<void> = async () => {
      const s = stateRef.current;
      if (s.mode !== "balanced" || s.retryRound || s.screen !== "quiz") return;
      const idx = s.currentIndex + 1;
      if (idx >= s.questions.length) return;

      const avoid = s.allQuestions
        .map((q, i) =>
          i === idx
            ? ""
            : `Question ${i + 1}: ${q.question} | Correct answer: ${q.options[q.correctIndex]}`
        )
        .filter(Boolean);

      const token = ++adaptTokenRef.current;
      try {
        const res = await fetch("/api/regenerate-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: s.currentText,
            topics: s.currentTopics,
            difficulty: s.stats.tier,
            avoid,
          }),
        });
        const data = await res.json();
        if (
          token !== adaptTokenRef.current ||
          !data.question ||
          typeof data.question.question !== "string"
        ) {
          return;
        }
        const cur = stateRef.current;
        if (cur.retryRound || cur.currentIndex + 1 !== idx) return;
        dispatch({ type: "REPLACE_QUESTION", index: idx, question: data.question });
      } catch {
        // keep the batch question as-is
      }
    };

    return {
      state,
      setSource: (text, topics) => dispatch({ type: "SET_SOURCE", text, topics }),
      loadQuestions: (questions, opts) =>
        dispatch({
          type: "LOAD_QUESTIONS",
          questions,
          manual: opts?.manual,
          topics: opts?.topics,
        }),
      setScreen: (screen) => dispatch({ type: "SET_SCREEN", screen }),
      setMode: (mode) => dispatch({ type: "SET_MODE", mode }),
      setTimeLimit: (seconds) => dispatch({ type: "SET_TIME_LIMIT", seconds }),
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
      restartQuiz: () => {
        hintPendingRef.current.clear();
        setHintCache({});
        dispatch({ type: "RESTART_QUIZ" });
      },
      adaptUpcoming,
      currentQuestion,
      hintCache,
      requestHint,
      hasSavedGame,
      history,
      deleteHistory: (id) => {
        const next = history.filter((r) => r.id !== id);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        setHistory(next);
        if (IS_FIREBASE_ENABLED) {
          void deleteHistoryFromFirebase(id);
          void saveHistoryToFirebase(next);
        }
      },
      clearHistory: () => {
        localStorage.removeItem(HISTORY_KEY);
        setHistory([]);
        if (IS_FIREBASE_ENABLED) void saveHistoryToFirebase([]);
      },
    };
  }, [state, hasSavedGame, history, hintCache, requestHint]);

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz(): QuizContextValue {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used within QuizProvider");
  return ctx;
}