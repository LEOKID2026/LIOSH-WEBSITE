# Learning Book Cross-Grade Content Polish — Closure

**Date:** 2026-06-02  
**Scope:** Math (חשבון) + Geometry (גאומטריה), G1–G6 draft markdown only.

## Outcome

Cross-grade content polish pass **complete** for all FAIL_DUPLICATE and FAIL_AGE_FIT families identified in the initial audit.

| Metric | Before | After |
|--------|-------:|------:|
| FAIL_DUPLICATE | 12 | 0 |
| FAIL_AGE_FIT | 6 | 0 |
| PASS | 18 | 29 |

## Files changed

**118 draft pages** under `docs/learning-book/math/` and `docs/learning-book/geometry/`.

Plus documentation:

- `docs/learning-book/LEARNING_BOOK_CROSS_GRADE_CONTENT_AUDIT.md` (re-run + Resolution pass section)
- `tmp/learning-book-cross-grade-audit.json` (regenerated)

## Content rules applied

1. Seven-section structure preserved.
2. Section 5 / Section 6 alignment preserved (same numbers/context).
3. Manifest alignment anchors unchanged (no manifest edits).
4. RTL-safe wording: **ושארית**, no fragile verbal formulas.
5. No new diagram types; existing `:::geometry-diagram` blocks retained.
6. No `[DRAFT]` in child-facing bodies.

## Grade progression highlights

### Math

- **division_core:** G2 equal sharing → G6 decomposed long division with verification
- **sequence:** +5 (G3) → +50 (G4) → +500 (G5) → rule + missing terms at 200k (G6)
- **ns_neighbors:** tens (G1) through hundred-thousands (G6)
- **wp_time_sum:** minutes only (G3) → hours:minutes + carry (G6)
- **eq_add / eq_sub / add_three (G6):** large-number teaching in §2–§4; practice anchors in §5/§6

### Geometry

- **triangle_angles:** compare (G3) → 180° rule (G4) → equation (G6)
- **prism_volume:** concrete box (G4) → layers (G5) → base area × height (G6)
- **square_area:** grid (G2/G3) → formula (G4) → units + larger sides (G6)

## Verification

| Check | Result |
|-------|--------|
| `node scripts/audit-learning-book-cross-grade-content.mjs` | PASS (0 FAIL) |
| `node scripts/audit-learning-book-rtl-content.mjs` | 7 risky lines remain (pre-existing; no auto-fix applied) |
| `node scripts/tests/verify-learning-book-bidi-rendering.mjs` | PASS |
| `node scripts/verify-learning-book-structure.mjs` | PASS |
| `node scripts/verify-learning-book-geometry-diagrams.mjs` | PASS |
| `node scripts/verify-math-g1-book.mjs` | PASS |
| `node scripts/verify-math-g2-book.mjs` | PASS |
| `node scripts/verify-math-g3-book-content.mjs` | PASS |
| `node scripts/verify-math-g4-book-content.mjs` | PASS |
| `node scripts/verify-math-g5-book-content.mjs` | PASS |
| `node scripts/verify-math-g6-book-content.mjs` | PASS |
| `npm run build` | PASS |

## Not changed

- UI, runtime, routes, registry, book tiles, practice mappings, SQL
- Manifests, verify/build/audit scripts
- Hebrew / English / Science / Moledet-Geography books
- Placeholder-only pages
- Git commit, push, deploy

## Owner follow-up (optional)

- Spot-check NEEDS_POLISH rows (`fm_factor`, `dec_sub`, `solids`, etc.) — non-blocking.
- Browser bidi review for grouped thousands and `H:MM` tokens flagged by math verifiers.
- Owner approval of individual draft pages remains pending (`approval_status: draft`).
