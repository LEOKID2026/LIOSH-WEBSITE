# Student Bright UI — Fix Round v2 Report

**Date:** 2026-06-13  
**Branch:** `pilot/student-bright-3-pages` (uncommitted)  
**Scope:** `/student/home`, `/learning`, `/learning/math-master` only

## What changed (v2 contrast pass)

### Tokens
- **`lib/student-ui/student-bright-math-ui.client.js`** — stronger shell gradient (`#EAF6FF`), HUD borders/shadows, mode tabs (sky-600 active / white inactive), pre-game panel + action bar, game card, feedback/hint/error boxes, float buttons, pre-game stat tiles and selects.
- **`lib/student-ui/student-bright-theme.client.js`** — stronger stat cards, subject cards, sky-600 CTAs on learning hub.

### math-master (className only)
- Mode tabs: active/inactive contrast (no more `bg-white/10` on bright bg).
- HUD values: dark readable colors (sky/orange/amber/violet/emerald/rose).
- Timer + avatar cells: white cards with slate borders.
- Pre-game: white panel wrapper, bright selects, stat tiles, prominent **התחל** + action bar.
- Active game: white game card, sky question surface, bright feedback/hints/errors, visible float buttons.

### home / learning
- Minor token polish (borders, stat values, subject CTAs).

## Screenshots (after fix)

All under `qa/screenshots/after-fix-v2/`:

| Page | Desktop | Mobile |
|------|---------|--------|
| `/student/home` | `student-home-desktop.png` | `student-home-mobile.png` |
| `/learning` | `learning-desktop.png` | `learning-mobile.png` |
| `/learning/math-master` | `math-master-desktop.png` | `math-master-mobile.png` |

### Regression (out of scope — should remain dark/unchanged)

| URL | Desktop | Mobile |
|-----|---------|--------|
| `/` | `regression-home-desktop.png` | `regression-home-mobile.png` |
| `/parent/login` | `regression-parent-login-desktop.png` | `regression-parent-login-mobile.png` |
| `/teacher/login` | `regression-teacher-login-desktop.png` | `regression-teacher-login-mobile.png` |
| `/school` | `regression-school-desktop.png` | `regression-school-mobile.png` |
| `/admin` | `regression-admin-desktop.png` | `regression-admin-mobile.png` |

**Note:** Baseline screenshots before first pass were not captured; this folder is the post-fix reference set.

## QA

| Check | Result |
|-------|--------|
| `npx next build` | PASS (after v2 changes) |
| `student-question-display.spec.ts` | 5/5 PASS |
| `math-topic-visibility.spec.ts` | 3/3 PASS |

## Open items (not in scope)

- Profile/stats modals in math-master still use dark overlay styling (visible when opened; not part of main practice flow).
- Multiplication table / leaderboard modals still dark-themed internally.
- Pixel diff vs baseline not run (no baseline folder).

## Recommendation

Review `math-master-desktop.png` and `math-master-mobile.png` for contrast/hierarchy. If approved, commit on `pilot/student-bright-3-pages` and optionally capture baseline for future regressions.

**No git commit was made.**
