# Grade 6 Geometry Learning Book — Drafts

**Status:** All batches authored — **19 / 19** draft pages complete (Batches A–G). Owner review pending.  
**Date:** June 2026  
**Folder:** `docs/learning-book/geometry/g6/drafts/`  
**Book title (child-facing):** ספר גאומטריה — כיתה ו׳

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/GEOMETRY_GRADE_6_LEARNING_BOOK_PLAN.md` |
| Draft markdown pages | ✅ **19 / 19** (Batches A–G) |
| Review pack | ✅ `docs/learning-book/GEOMETRY_GRADE_6_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-geometry-g6-book-content.mjs` |
| Draft manifest | ✅ `scripts/lib/geometry-g6-draft-manifest.mjs` |
| Runtime registry / routes | ❌ Not in scope |

---

## Batch A — היקף, שטח וזוויות (6)

| File | Draft title |
|------|-------------|
| `square_perimeter.md` | היקף ריבוע — כיתה ו׳ |
| `triangle_perimeter.md` | היקף משולש — כיתה ו׳ |
| `square_area.md` | שטח ריבוע — כיתה ו׳ |
| `parallelogram_area.md` | שטח מקבילית — כיתה ו׳ |
| `trapezoid_area.md` | שטח טרפז — כיתה ו׳ |
| `triangle_angles.md` | זוויות במשולש — כיתה ו׳ |

## Batch B — מעגל ועיגול (2)

| File | Draft title |
|------|-------------|
| `circle_perimeter.md` | היקף מעגל |
| `circle_area.md` | שטח עיגול |

## Batch C — משפט פיתגורס (2)

| File | Draft title |
|------|-------------|
| `pythagoras_hyp.md` | משפט פיתגורס — מציאת יתר |
| `pythagoras_leg.md` | משפט פיתגורס — מציאת ניצב |

## Batch D — גופים ונפח בסיסי (2)

| File | Draft title |
|------|-------------|
| `solids.md` | גופים — גליל, פירמידה, חרוט, כדור |
| `rectangular_prism_volume.md` | נפח תיבה — כיתה ו׳ |

## Batch E — נפח מנסרות (2)

| File | Draft title |
|------|-------------|
| `prism_volume_rectangular.md` | נפח מנסרה — בסיס מלבן |
| `prism_volume_triangle.md` | נפח מנסרה — בסיס משולש |

## Batch F — נפח פירמידות (2)

| File | Draft title |
|------|-------------|
| `pyramid_volume_square.md` | נפח פירמידה — בסיס ריבוע |
| `pyramid_volume_rectangular.md` | נפח פירמידה — בסיס מלבן |

## Batch G — נפח גליל, חרוט וכדור (3)

| File | Draft title |
|------|-------------|
| `cylinder_volume.md` | נפח גליל |
| `cone_volume.md` | נפח חרוט |
| `sphere_volume.md` | נפח כדור |

---

## Notes

- All pages: `age_band: grades_5_6`, `approval_status: draft`, `grade: g6`.
- Child-facing copy uses **גאומטריה**, not **הנדסה**.
- Section 5 and Section 6 use the **same geometry problem** (same numbers, units, story).
- Section 7: draft invitation only — **no practice routing**.
- `book_placeholder.md` — infrastructure placeholder; **not** part of the 19-page book.

---

## Regenerate

```bash
node scripts/generate-geometry-g6-drafts.mjs
node scripts/build-geometry-g6-hebrew-review-pack.mjs
node scripts/verify-geometry-g6-book-content.mjs
```
