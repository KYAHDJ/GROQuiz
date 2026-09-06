import { useState } from "react";
import LandingScreen from "./screens/LandingScreen";
import QuizScreen from "./screens/QuizScreen";
import ScoreScreen from "./screens/ScoreScreen";

type Screen = "landing" | "quiz" | "score";

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [quizMode, setQuizMode] = useState<"balanced" | "hard">("balanced");
  const [timeLimit, setTimeLimit] = useState(30);
  const [finalScore, setFinalScore] = useState(0);

  const handleStart = (mode: "balanced" | "hard", limit: number) => {
    setQuizMode(mode);
    setTimeLimit(limit);
    setScreen("quiz");
  };

  const handleFinish = (score: number) => {
    setFinalScore(score);
    setScreen("score");
  };

  return (
    <div className="size-full overflow-y-auto">
      {screen === "landing" && (
        <LandingScreen onStart={handleStart} />
      )}
      {screen === "quiz" && (
        <QuizScreen
          mode={quizMode}
          timeLimit={timeLimit}
          onFinish={handleFinish}
          onBack={() => setScreen("landing")}
        />
      )}
      {screen === "score" && (
        <ScoreScreen
          score={finalScore}
          mode={quizMode}
          onTryAgain={() => setScreen("quiz")}
          onNewQuiz={() => setScreen("landing")}
        />
      )}
    </div>
  );
}
