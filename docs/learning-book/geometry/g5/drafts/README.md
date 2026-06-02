# Grade 5 Geometry Learning Book — Drafts

**Status:** All batches authored — **17 / 17** draft pages complete (Batches A–G). Owner review pending.  
**Date:** June 2026  
**Folder:** `docs/learning-book/geometry/g5/drafts/`  
**Book title (child-facing):** ספר גאומטריה — כיתה ה׳

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/GEOMETRY_GRADE_5_LEARNING_BOOK_PLAN.md` |
| Draft markdown pages | ✅ **17 / 17** (Batches A–G) |
| Review pack | ✅ `docs/learning-book/GEOMETRY_GRADE_5_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-geometry-g5-book-content.mjs` |
| Draft manifest | ✅ `scripts/lib/geometry-g5-draft-manifest.mjs` |
| Runtime registry / routes | ❌ Not in scope |

---

## Batch A — מקבילות, מרובעים וזוויות (3)

| File | Draft title |
|------|-------------|
| `parallel_perpendicular.md` | קווים מקבילים ומאונכים |
| `quadrilaterals.md` | סיווג מרובעים — כיתה ה׳ |
| `triangle_angles.md` | זוויות במשולש |

## Batch B — היקף ושטח — ריבוע ומשולש (3)

| File | Draft title |
|------|-------------|
| `square_perimeter.md` | היקף ריבוע |
| `triangle_perimeter.md` | היקף משולש |
| `square_area.md` | שטח ריבוע |

## Batch C — שטח — מקבילית וטרפז (2)

| File | Draft title |
|------|-------------|
| `parallelogram_area.md` | שטח מקבילית |
| `trapezoid_area.md` | שטח טרפז |

## Batch D — גובה במצולעים (3)

| File | Draft title |
|------|-------------|
| `heights_triangle.md` | גובה במשולש |
| `heights_parallelogram.md` | גובה במקבילית |
| `heights_trapezoid.md` | גובה בטרפז |

## Batch E — אלכסונים (3)

| File | Draft title |
|------|-------------|
| `diagonal_square.md` | אלכסון בריבוע |
| `diagonal_rectangle.md` | אלכסון במלבן |
| `diagonal_parallelogram.md` | אלכסון במקבילית |

## Batch F — גופים ונפח (2)

| File | Draft title |
|------|-------------|
| `solids.md` | גופים תלת-ממדיים — חזרה |
| `rectangular_prism_volume.md` | נפח תיבה |

## Batch G — ריצוף (1)

| File | Draft title |
|------|-------------|
| `tiling.md` | ריצוף במישור |

---

## Notes

- All pages: `age_band: grades_5_6`, `approval_status: draft`, `grade: g5`.
- Child-facing copy uses **גאומטריה**, not **הנדסה**.
- Section 7: draft invitation only — **no practice routing**.
- `book_placeholder.md` — infrastructure placeholder; **not** part of the 17-page book.

---

## Regenerate

```bash
node scripts/generate-geometry-g5-drafts.mjs
node scripts/build-geometry-g5-hebrew-review-pack.mjs
node scripts/verify-geometry-g5-book-content.mjs
```
