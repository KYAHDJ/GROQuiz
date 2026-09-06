# Figma Make / AI prompt — paste this into Figma

> Design a dark, modern, "professional but fun" SPA for **GROQuiz**, a quiz app that turns uploaded PDFs
> and pasted text into multiple-choice flashcards with Groq AI.
> Desktop-first (1440px wide) but mobile-friendly. Background near-black blue `#0F172A`,
> panels `#1E293B`, borders `#334155`, text `#E2E8F0`. Rounded corners 16–20px.
> Font Inter. ONE accent per function: cyan (#22D3EE) = actions/selection,
> emerald (#34D399) = correct, red (#F87171) = wrong, amber (#FBBF24) = hints,
> violet (#A78BFA) = AI coach/clarifier.
>
> Design these screens EXACTLY with these elements, do not drop anything:

1. **Landing / upload screen**
   - Centered column, max ~672px.
   - Small status pill on top: green pulse dot + "Groq ready — N keys connected" (count comes from the server; show it as a variable).
   - Two mode cards side by side: **Balanced** (cyan icon, "Starts Medium and adjusts to your answers") and **Hard** (red lock icon, "Locked at Hard — no power-ups").
   - Time limit row: labeled "Pick your time limit per question", pill buttons 15s / 30s / 45s / 60s / 90s (selected = filled cyan), caption "Time out = marked wrong, then a retry at the end."
   - Drop zone: dashed border, ghost upload icon, "Drag & drop your PDF here" + "or paste text instead" link.
   - Right side or below: paste-mode panel (textarea + "Paste from clipboard" + topic field + "Generate quiz" button).
   - History section with past quiz rows (topic, quiz score badge).

2. **Quiz screen — Balanced mode (question view)**
   - Top bar: back arrow (exit), centered "Q3 / 10" progress, right side score chip.
   - Question card: progress bar under the header, live countdown ring/timer right side "0:24".
   - Small tag above question: "Hints active — score drops 25% per hint" (or "Answer fast for a bigger score").
   - Question headline with 5 highlighted keywords (yellow underline).
   - Amber hint box with lightbulb icon + hint text.
   - 4 answer rows; selected row = cyan tint; two eliminated rows faded/smaller.
   - Below: three power-up pill buttons — 50/50 (yellow bolt), Freeze 15s (cyan clock), AI Clarifier (violet brain).
   - Filled gradient "Confirm Answer" button.

3. **Quiz screen — answered / feedback**
   - Same layout, but top-right now shows a green "Correct!" or red "Incorrect" chip with the correct option highlighted emerald.
   - Explanation block under the options with a trophy icon.
   - Primary "Next Question" button with arrow.

4. **Quiz screen — Hard mode**
   - Same as balanced but: red lock accent, timer fixed 30s countdown in red when low, NO hint box, NO power-up row, question nav locked (show lock icon on nav chips).

5. **Retry round**
   - A cyan banner between header and card: "Retry round — missed or timed-out questions, worth half points."
   - Chips show which questions are retry (small "retry" badge).

6. **Score screen**
   - Big circular score ring with total score in the center.
   - Stat chips: Accuracy, Best streak, Avg time, Questions.
   - "AI Coach" violet card with sparkle icon + short paragraph about weak areas.
   - Buttons: "Try Again" (cyan), "New Quiz" (outline).

7. **Pause / resume overlay** shown briefly when leaving a question.

Also include on the same canvas: a small footer credit "Built with Groq · GROQuiz".