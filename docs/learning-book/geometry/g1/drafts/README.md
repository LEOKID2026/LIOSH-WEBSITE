# Grade 1 Geometry Learning Book — Drafts

**Status:** **Owner-approved content** — **3 / 3** pages. Runtime insertion not started.  
**Signoff:** `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_SIGNOFF.md`  
**Date:** June 2026  
**Folder:** `docs/learning-book/geometry/g1/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` |
| Owner signoff | ✅ `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_SIGNOFF.md` |
| Draft markdown pages | ✅ **3 / 3** (Batches A–B) — **content approved** |
| Review pack | ✅ `docs/learning-book/GEOMETRY_GRADE_1_HEBREW_REVIEW_PACK.md` (generated) |
| Content verification | ✅ `scripts/verify-geometry-g1-book-content.mjs` |
| Draft manifest (scripts only) | ✅ `scripts/lib/geometry-g1-draft-manifest.mjs` |
| Runtime routes | ✅ `/learning/book/geometry/g1` + `[pageId]` (3 SSG pages) |
| Practice CTA resolver | ❌ Not created — post-runtime task |

---

## Naming

- Child-facing book content uses **גאומטריה**, not **הנדסה** (owner-approved).
- Internal IDs remain `geometry:g1:{pageId}` and `subject: geometry`.

---

## Source of Truth

| Document / file | Role |
|-----------------|------|
| `data/curriculum-spine/v1/skills.json` | Grade 1 geometry `skill_id` entries in scope |
| `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` | Page list, batches, boundaries |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Seven-section template (Grades 1–2 age band) |
| `docs/learning-book/math/g1/drafts/` | Style reference only — **not modified** |
| `utils/geometry-constants.js` | G1 topic descriptions (context only) |

---

## Batch A — צורות בסיסיות (2)

| File | Draft title |
|------|-------------|
| `shapes_basic_square.md` | הכרת הריבוע |
| `shapes_basic_rectangle.md` | הכרת המלבן |

---

## Batch B — הזזה ושיקוף (1)

| File | Draft title |
|------|-------------|
| `transformations.md` | הזזה ושיקוף — היכרות |

---

## Notes

- `book_placeholder.md` — infrastructure placeholder; **not** part of the 3-page book.
- All pages: `age_band: grades_1_2`, `approval_status: draft`, `grade: g1`.
- Section 7: draft invitation only — **no practice routing**.
- No ASCII diagrams or markdown tables in child-facing bodies.
- `geometry:kind:no_question` is spine meta only — **no** learning page.

---

## Regenerate review pack

```bash
node scripts/build-geometry-g1-hebrew-review-pack.mjs
node scripts/verify-geometry-g1-book-content.mjs
```

---

## Explicit Stop Rule

Content is owner-approved; **runtime insertion not started**:

- ❌ No registry, routes, SQL, commit, push, or deploy (unless explicitly requested)
- ✅ Approved Hebrew drafts remain source for a future runtime task
