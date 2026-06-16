# Learning Math Line Templates — Root Repair Report

Generated: 2026-06-15

## Verdict: **NOT PASS** (owner visual sign-off pending)

Automated golden string tests pass after this repair. Prior issues were **template/content errors** plus **free-string BiDi guessing**, not isolate flags alone.

---

## Root cause

1. **Too many free-form strings** mixed Hebrew labels, equations, comparisons, and carry prose in one line; renderer guessed math vs prose.
2. **Wrong source math** in drafts (e.g. `80 + 5 + 1 = 95` — invalid decomposition of 80 + 15).
3. **Comparison lines** merged Hebrew relation + symbol equation with `→` in one string (`735 גדול מ-708 → 735 > 708`).

---

## Fix (systemic, not 124-only)

### New: structured template layer

`lib/learning-book/learning-math-line-templates.js`

| Template | Input pattern | Output runs |
|----------|---------------|-------------|
| `parseLabeledMathRuns` | `עשרות: 30 + 20 = 50` | prose `עשרות:` + math `30 + 20 = 50` |
| `parseArrowCarryRuns` | `8 + 7 = 15 → 5, נשיאה 1` | math `8 + 7 = 15 → 5` + prose `, נשיאה 1` |
| `parseComparisonConclusionRuns` | `735 גדול מ-708, לכן: 735 > 708` | prose Hebrew + math `735 > 708` |
| `parseLabeledDigitComparisonRuns` | `עשרות: 1 < 2 → 612 קטן מ-628` | label + math `1 < 2` + prose conclusion |
| `buildComparisonConclusionRuns` | API for generators | `{a} גדול/קטן מ-{b}, לכן:` + `{a} <> {b}` |
| `place-value-equation-order.js` | 3+ term decomposition | `100 + 20 + 4 = 124` (unchanged) |

`splitMixedHebrewMathRuns` now calls `parseTemplateRuns()` **before** heuristics.

---

## Wrong templates fixed (source)

| File | Before | After |
|------|--------|-------|
| `docs/learning-book/math/g2/drafts/add_two.md` | `80 + 5 + 1 = 95` | `80 + 15 = 95` |
| `docs/learning-book/math/g2/drafts/add_two.md` | `80 + 2 + 1 = 92` | `80 + 12 = 92` |
| `docs/learning-book/math/g2/drafts/cmp.md` | `עשרות: 1 < 2 → 612 קטן מ-628` | split: `1 < 2` + `612 קטן מ-628, לכן: 612 < 628` |
| `docs/learning-book/math/g2/drafts/cmp.md` | `735 גדול מ-708 → 735 > 708` | `735 גדול מ-708, לכן: 735 > 708` |
| `docs/learning-book/math/g2/drafts/ns_place_tens_units.md` | (earlier) `124 = 100 + 20 + 4` | `100 + 20 + 4 = 124` |
| `docs/learning-book/math/g3/drafts/ns_place_hundreds.md` | `638 = 600 + 30 + 8` | `600 + 30 + 8 = 638` |
| `docs/learning-book/math/g3/drafts/add_two.md` | `375 = 300 + 70 + 5` | `300 + 70 + 5 = 375` |

Note: `4 + 2 + 1 = 7` in **vertical column** steps is correct (column digits + carry), not the same bug as `80 + 5 + 1`.

---

## Golden strings (expected)

```
100 + 20 + 4 = 124
400 + 0 + 5 = 405
735 > 708
612 < 628
80 + 15 = 95
30 + 20 = 50
8 + 7 = 15 → 5
π ≈ 3.14
A = πr²
10% מתוך 490
3/4
52° + 101°
```

## Forbidden (must not appear)

```
124 = 100 + 20 + 4
405 = 400 + 0 + 5
80 + 5 + 1 = 95
80 + 2 + 1 = 92
```

---

## Files changed

- `lib/learning-book/learning-math-line-templates.js` (new)
- `lib/bidi/mixed-hebrew-math-runs.js`
- `lib/learning-book/place-value-equation-order.js`
- `lib/learning-book/book-visible-text-render.js`
- `docs/learning-book/math/g2/drafts/add_two.md`
- `docs/learning-book/math/g2/drafts/cmp.md`
- (+ earlier place-value drafts g2/g3)
- `tests/bidi/golden-learning-math-strings.test.mjs` (new)
- `tests/bidi/place-value-equation-order.test.mjs`
- `tests/bidi/unified-renderer-dom-contract.test.mjs`

---

## Tests (no screenshot audit)

```bash
node --test tests/bidi/golden-learning-math-strings.test.mjs
node --test tests/bidi/place-value-equation-order.test.mjs
node --test tests/bidi/unified-renderer-dom-contract.test.mjs
node --test tests/bidi/mixed-hebrew-math-policy.test.mjs
node scripts/tests/verify-learning-book-bidi-regression.mjs
npm run build
```

---

## Generators still to migrate (follow-up)

These still emit free strings; templates parse at render time but **generators should use `buildComparisonConclusionRuns` / labeled helpers**:

- `utils/math-explanations.js`
- `utils/math-animations.js`
- `utils/comparison-sign-mcq.js`

Not in scope: parent report, PDF, AI, evidence, answer policy.
