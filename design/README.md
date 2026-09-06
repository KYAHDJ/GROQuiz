# GROQuiz — UI Design Kit (for Figma)

This folder contains everything you need to generate and finalize the app's UI in Figma.

## What's in here

| File | Purpose |
| --- | --- |
| `figma-prompt.md` | A ready-to-paste prompt for Figma Make/AI to auto-generate the whole UI |
| `spec.md` | The complete, screen-by-screen inventory — every element that must exist |
| `screens/01-landing.svg` … `07-pause-resume.svg` | Visual reference + editable vector layers for every screen |
| `foundation/style-guide.svg` | Color palette, type scale, spacing, radii, and the core components |

## How to use it

1. Open **Figma** → new file.
2. Paste `figma-prompt.md` into Figma Make (or use it as the brief for any AI generation).
3. Drag & drop the SVGs from `screens/` and `foundation/` directly onto the Figma canvas.
   Figma imports SVG text as editable text layers and shapes as editable vectors,
   so you can restyle anything.
4. When your final `.fig` is ready, save it in this folder as `design/final.fig`
   and the developer will build the app to match it 1:1.

## Ground rules (keep these)

- Dark theme. Background near-black blue `#0F172A`. Panels `#1E293B`, borders `#334155`.
- "Professional but fun": rounded corners (16–20px), friendly helper copy, playful accent
  gradients, no clutter.
- One accent per function: cyan = actions/selection, emerald = correct/success,
  red = wrong/danger, amber = hints/warnings, violet = AI (coach / clarifier).
- Font: **Inter** (weights 400/500/600/700/800). Mono `#09B9CE` for timers.
- Every screen below MUST stay complete — do not delete features while restyling.