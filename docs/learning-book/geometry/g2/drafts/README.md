# Grade 2 Geometry Learning Book — Drafts

**Status:** All batches authored — **3 / 3** draft pages complete. Owner review pending.  
**Date:** June 2026  
**Folder:** `docs/learning-book/geometry/g2/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/GEOMETRY_GRADE_2_LEARNING_BOOK_PLAN.md` |
| Draft markdown pages | ✅ **3 / 3** (Batches A–C) |
| Review pack | ✅ `docs/learning-book/GEOMETRY_GRADE_2_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-geometry-g2-book-content.mjs` |
| Draft manifest (scripts only) | ✅ `scripts/lib/geometry-g2-draft-manifest.mjs` |
| Runtime registry / routes | ✅ wired (`geometry-g2-registry`, `/learning/book/geometry/g2`) |

---

## Naming

- Child-facing book content uses **גאומטריה**, not **הנדסה**.
- Internal IDs: `geometry:g2:{pageId}`, `subject: geometry`.

---

## Batch A — גופים (1)

| File | Draft title |
|------|-------------|
| `solids.md` | גופים תלת־ממדיים — שמות והיכרות |

---

## Batch B — שטח (1)

| File | Draft title |
|------|-------------|
| `square_area.md` | שטח של ריבוע |

---

## Batch C — הזזה ושיקוף (1)

| File | Draft title |
|------|-------------|
| `transformations.md` | הזזה ושיקוף — המשך |

---

## Notes

- `book_placeholder.md` — infrastructure placeholder; **not** part of the 3-page book.
- All pages: `age_band: grades_1_2`, `approval_status: draft`, `grade: g2`.
- G1 pages for `shapes_basic_square` / `shapes_basic_rectangle` are not repeated — those skills end at Grade 1 in the spine.
- `geometry:kind:no_question` — meta only; no learning page.

---

## Regenerate review pack

```bash
node scripts/build-geometry-g2-hebrew-review-pack.mjs
node scripts/verify-geometry-g2-book-content.mjs
```

---

## Explicit Stop Rule

Until owner approves content:

- ❌ No registry, routes, SQL, commit, push, or deploy
- ✅ Documentation and draft markdown only
