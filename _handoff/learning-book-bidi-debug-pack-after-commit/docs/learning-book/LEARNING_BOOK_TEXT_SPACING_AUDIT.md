# Learning Book Text Spacing Audit

Generated: 2026-06-03

## Summary

| Metric | Count |
|--------|------:|
| Files scanned | 254 |
| Pages scanned | 254 |
| Sections scanned | 1778 |
| Visible lines checked | 6584 |
| Suspicious spacing issues | 0 |
| Test failures | 0 |

## Root cause

The RTL/LTR renderer treated some **plain Hebrew prose** as **formula-like bodies** (`isFormulaLikeBody`):

1. **ASCII hyphen** in patterns like `צעד-צעד` matched formula operators, routing prose into `splitFormulaTokens`.
2. **Equals chains** like `קדימה = ימינה = מספר גדול יותר` were classified as formulas despite being child-facing explanations.
3. `splitFormulaTokens` used `.trim()` on chunks and **discarded whitespace tokens**, so adjacent `<span>` / `<bdi>` runs glued in the browser.
4. `renderContentRuns` / `renderMixedBodyInner` did not re-insert **source gaps** between digit/math/text runs, so `unicode-bidi: isolate` spans could collapse inter-word spaces.

**Source markdown was correct** for the known screenshot examples; the bug was **renderer-side**.

## Fix applied

- Tightened `isFormulaLikeBody` (exclude word hyphens and multi-word explanatory equals chains).
- `splitFormulaTokens` preserves whitespace as `space` tokens; no `.trim()` on Hebrew chunks.
- `MixedHebrewMathText` re-inserts source gaps between runs/segments and renders formula space tokens.
- Added `book-visible-text-render.js` for export + regression simulation.

## Known glued patterns checked

- `קוישר`
- `נקודותמסומנות`
- `חציימינה`
- `מעלהקו`
- `מספרגדוליותר`
- `צעד־צעדימינה`
- `קדימה=ימינה`
- `היאהולכת`

## Before / after examples

### Formula-like equals chain (diagram caption)

| | Text |
|--|------|
| Before (broken) | `קדימה=ימינה=מספרגדוליותר` |
| After (fixed renderer) | `קדימה = ימינה = מספר גדול יותר` |

### Word-hyphen prose misclassified as formula

| | Text |
|--|------|
| Before (broken) | `היאהולכתצעד-צעדימינה` |
| After (fixed renderer) | `היא הולכת צעד-צעד ימינה` |

### List item Hebrew phrase

| | Text |
|--|------|
| Before (broken) | `קוישרעםנקודותמסומנות` |
| After (fixed renderer) | `קו ישר עם נקודות מסומנות` |

### Geometry-style label phrase

| | Text |
|--|------|
| Before (broken) | `חציימינהמעלהקו` |
| After (fixed renderer) | `חץ ימינה מעל הקו` |

## Files / pages with suspicious spacing

_None — all scanned lines preserve source spacing._

## Affected renderer files

- `components/learning-book/MixedHebrewMathText.js`
- `lib/learning-book/book-math-display.js`
- `lib/learning-book/book-visible-text-render.js` (new simulation helper)

## Verification

Run `node scripts/verify-learning-book-text-spacing.mjs` — failures: **0**
