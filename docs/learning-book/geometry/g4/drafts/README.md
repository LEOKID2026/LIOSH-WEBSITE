# Grade 4 Geometry Learning Book — Drafts

**Status:** All batches authored — **14 / 14** draft pages complete. Owner review pending.  
**Date:** June 2026  
**Folder:** `docs/learning-book/geometry/g4/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/GEOMETRY_GRADE_4_LEARNING_BOOK_PLAN.md` |
| Draft pages | ✅ **14 / 14** (Batches A–E) |
| Review pack | ✅ `docs/learning-book/GEOMETRY_GRADE_4_HEBREW_REVIEW_PACK.md` (generated) |
| Verifier | ✅ `scripts/verify-geometry-g4-book-content.mjs` |
| Manifest | ✅ `scripts/lib/geometry-g4-draft-manifest.mjs` |
| Runtime registry / routes | ✅ wired (`geometry-g4-registry`, `/learning/book/geometry/g4`) |

---

## Batches

| Batch | Pages |
|-------|--------|
| **A** | `shapes_basic_properties_square`, `shapes_basic_properties_rectangle`, `shapes_basic_properties_angles`, `symmetry` |
| **B** | `quadrilaterals`, `parallel_perpendicular` |
| **C** | `square_perimeter`, `square_area`, `triangle_perimeter`, `triangle_angles` |
| **D** | `diagonal_square`, `diagonal_rectangle` |
| **E** | `solids`, `rectangular_prism_volume` |

---

## Naming

- Book title: **ספר גאומטריה — כיתה ד׳** (not **הנדסה**).
- IDs: `geometry:g4:{pageId}`, `age_band: grades_3_4`.

---

## Regenerate

```bash
node scripts/build-geometry-g4-hebrew-review-pack.mjs
node scripts/verify-geometry-g4-book-content.mjs
```

---

## Stop rule

Content approved — runtime wired. No SQL, commit, push, or deploy without owner request.
