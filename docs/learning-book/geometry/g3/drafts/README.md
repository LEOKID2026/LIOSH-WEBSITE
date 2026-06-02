# Grade 3 Geometry Learning Book — Drafts

**Status:** **Owner-approved** — **9 / 9** pages; runtime wired.  
**Signoff:** `docs/learning-book/GEOMETRY_GRADE_3_LEARNING_BOOK_SIGNOFF.md`  
**Date:** June 2026  
**Folder:** `docs/learning-book/geometry/g3/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/GEOMETRY_GRADE_3_LEARNING_BOOK_PLAN.md` |
| Owner signoff | ✅ `docs/learning-book/GEOMETRY_GRADE_3_LEARNING_BOOK_SIGNOFF.md` |
| Draft pages | ✅ **9 / 9** (Batches A–E) |
| Runtime routes | ✅ `/learning/book/geometry/g3` + `[pageId]` |
| Review pack | ✅ `docs/learning-book/GEOMETRY_GRADE_3_HEBREW_REVIEW_PACK.md` (generated) |
| Verifier | ✅ `scripts/verify-geometry-g3-book-content.mjs` |
| Manifest | ✅ `scripts/lib/geometry-g3-draft-manifest.mjs` |

---

## Batches

| Batch | Pages |
|-------|--------|
| **A** | `triangles`, `quadrilaterals` |
| **B** | `parallel_perpendicular` |
| **C** | `square_area`, `square_perimeter`, `triangle_perimeter` |
| **D** | `triangle_angles` |
| **E** | `rotation`, `solids` |

---

## Naming

- Child-facing: **גאומטריה** (not הנדסה).
- IDs: `geometry:g3:{pageId}`, `age_band: grades_3_4`.

---

## Regenerate

```bash
node scripts/build-geometry-g3-hebrew-review-pack.mjs
node scripts/verify-geometry-g3-book-content.mjs
```

---

## Stop rule

No registry, routes, SQL, commit, push, or deploy until owner approves content.
