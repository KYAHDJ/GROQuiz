export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type QuizMode = "balanced" | "hard";

export interface FlashcardQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  initialDifficulty: Difficulty;
}

export interface GenerateQuestionsRequest {
  text: string;
  topics?: string;
  count?: number;
  difficulty: Difficulty;
}

export interface GenerateQuestionsResponse {
  questions: FlashcardQuestion[];
  fallback?: boolean;
}

export interface ParsePdfResponse {
  text?: string;
  pageCount?: number;
  error?: string;
}

export interface ClarifyResponse {
  analogy: string;
}

export interface PowerupInventory {
  "50-50": number;
  "time-extension": number;
  "ai-clarifier": number;
}

export interface GameStats {
  points: number;
  streak: number;
  bestStreak: number;
  answered: number;
  correct: number;
  tier: Difficulty;
}

export type HintStage = 0 | 1 | 2 | 3;

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  timeTaken: number;
  pointsEarned: number;
  hintsUsed: number;
}

export interface HistoryRecord {
  id: string;
  topic: string;
  date: number;
  stats: GameStats;
  results: QuestionResult[];
  questions: FlashcardQuestion[];
  points: number;
}

export interface SavedGame {
  questions: FlashcardQuestion[];
  allQuestions: FlashcardQuestion[];
  retryIds: string[];
  retryRound: boolean;
  timeLimit: number;
  currentIndex: number;
  stats: GameStats;
  inventory: PowerupInventory;
  results: QuestionResult[];
  currentText: string;
  currentTopics: string;
  screen: "quiz" | "results";
  mode: QuizMode;
  savedAt: number;
}