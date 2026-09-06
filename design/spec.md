# GROQuiz UI — Complete screen & component spec

Everything below already exists in the live app. The Figma design must include ALL of it.

## Shared foundation

- **Colors**
  - bg `#0F172A`, surface `#1E293B`, surface-2 `#16202F`, border `#334155`
  - text `#E2E8F0`, muted `#94A3B8`, faint `#64748B`
  - cyan `#22D3EE` (actions, selection, links) · cyan-600 `#0891B2`
  - emerald `#34D399` (correct) · red `#F87171` (wrong) · amber `#FBBF24` (hints)
  - violet `#A78BFA` (AI coach / clarifier)
- **Type** — Inter. Display 28/800, Headline 20/700, Body 15/400, Small 13/500, Tiny 11/600, Mono 15/700
- **Radii** — lg 16, xl 20, full 999
- **Spacing** — 4-scale: 4, 8, 12, 16, 20, 24, 32

## Screen inventory

### 1. Landing (PdfUpload)
- Groq status pill: pulse dot + "Groq ready — {n} keys connected" / "Checking AI keys…" / "Groq not connected — add GROQ_API_KEY to start" (3 states)
- Mode cards (Balanced / Hard) — icon, title, subtitle, selected ring
- Time limit picker — chips 15/30/45/60/90, selected filled cyan; hard mode → locked 30s label + red clock
- PDF drop zone (dashed, ghost icon) + "or paste text instead"
- Paste panel — textarea, "Paste from clipboard", topic input, "Generate quiz" button, progress label during generation
- Resume banner (unfinished quiz) + Resume button
- History list — past quizzes: topic, wpm/score badge, correct %, date
- Error banner (red, dismissible)

### 2. Quiz — Balanced (QuizCard + GamePage + HintTimer)
- Exit (back) button with confirm dialog
- Top bar: "Q{n}/{total}", score chip, mode chip
- Progress bar showing question position + # of hints used (hint tokens)
- Per-question timer: mono countdown "0:24", ring turns red <10s, pauses on leave
- Tag: "Hints active — score drops 25% per hint" / "Answer fast for a bigger score"
- Question headline; keyword highlight (top ≤5, yellow underline)
- Hint box (amber) — appears at hint stage 2, "Preparing hint…" then hint text
- 4 option rows — hover, selected (cyan tint), eliminated on 50/50 (small + faded), correct (emerald check) / wrong (red X) after answer
- Power-up pills (before answering, one per question): 50/50 (bolt, yellow), Freeze 15s (clock, cyan), AI Clarifier (brain, violet) — each with count, disabled at 0
- Freeze banner "Timer frozen for 15 seconds"
- Confirm Answer (filled) → Answered: Correct/Incorrect chip, explanation block (trophy), Next Question button

### 3. Quiz — Hard (same shell, no power-ups/hints)
- Red lock accent, nav chips locked (click disabled), fixed 30s timer, red at ≤10s

### 4. Retry round
- Header banner "Retry round — half points", retry chip on nav for wrong/timeout questions

### 5. Score (ScoreDisplay)
- Score ring + total, stat chips (Accuracy, Best streak, Avg time, Questions)
- Per-topic weak areas list
- AI Coach card (violet, sparkle) with coaching paragraph; refresh button
- Buttons: Try the quiz again, New quiz, Back to landing

### 6. Pause / Resume overlay
- Modal: "Quiz paused", resume + new quiz buttons; timer resumes on return

## Components
Progress bar · Timer ring · Hint chip · Status pill · Mode card · Time chip · Drop zone ·
Option row (4 states) · Power-up pill · Badge (correct/wrong) · Button (primary/outline/ghost, disabled) ·
Toast/error banner · Score ring · Stat chip · AI coach card

## Behavior notes for the design
- Elimination on 50/50 = smaller + faded, never green, never bigger on the answer.
- Hints never reveal the answer text itself.
- Everything above must survive the redesign — restyle, don't remove.