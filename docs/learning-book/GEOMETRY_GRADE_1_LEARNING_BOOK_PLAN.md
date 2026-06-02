# Grade 1 Geometry Learning Book — Plan

**Status:** **Owner-approved content** (June 2026). Draft files still `approval_status: draft` until runtime insertion task. No UI, routes, registry, SQL, commit, push, or deploy from this gate.  
**Signoff:** `GEOMETRY_GRADE_1_LEARNING_BOOK_SIGNOFF.md`  
**Date:** June 2026  
**Book title (child-facing):** ספר גאומטריה — כיתה א׳

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, approved content, separate subjects) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 1–2 seven-section template |
| `docs/learning-book/MATH_GRADE_1_LEARNING_BOOK_COVERAGE.md` | Notes which geometry skills exist for G1 |
| `docs/learning-book/math/g1/drafts/` | Style reference — **do not modify** |
| `utils/geometry-constants.js` | G1 `shapes_basic` / `transformations` descriptions (context only) |
| `utils/geometry-question-generator.js` | G1 scope hints (identify square/rectangle; הזזה/שיקוף) |

**Math books:** Out of scope for this package.  
**Subject naming:** Child-facing copy uses **גאומטריה**, not **הנדסה**. No English “geometry” in child-facing bodies.

---

## 1. Grade 1 Geometry Skills (Complete List)

A skill is **in Grade 1 Geometry scope** when `subject: "geometry"` and `minGrade ≤ 1` and `maxGrade ≥ 1` in `skills.json`.

**Spine filter result: 4 rows**

| # | skill_id | subtopic | topic | min | max | Learning page? |
|---|----------|----------|-------|-----|-----|----------------|
| 1 | `geometry:kind:shapes_basic_square` | `shapes_basic_square` | area_and_shapes | 1 | 1 | **Yes** |
| 2 | `geometry:kind:shapes_basic_rectangle` | `shapes_basic_rectangle` | area_and_shapes | 1 | 1 | **Yes** |
| 3 | `geometry:kind:transformations` | `transformations` | angles_and_transformations | 1 | 2 | **Yes** (G1-specific page) |
| 4 | `geometry:kind:no_question` | `no_question` | meta | 1 | 6 | **No** — generator meta kind |

**Total learning pages: 3** (one `geometry:g1:{subtopic}` page each).

### 1A. New in Grade 1 (`minGrade = 1`, teachable) — 3 skills

| skill_id | Recommended page type | Clearly G1? |
|----------|------------------------|-------------|
| `geometry:kind:shapes_basic_square` | visual_intuition | Yes |
| `geometry:kind:shapes_basic_rectangle` | visual_intuition | Yes |
| `geometry:kind:transformations` | visual_intuition | Yes — G1 scope: הזזה + שיקוף only |

### 1B. Continuing from earlier grades

None — Grade 1 is the first geometry book grade for these skills.

### 1C. Excluded from Grade 1 book (with reason)

| skill_id | Reason |
|----------|--------|
| `geometry:kind:no_question` | Meta / generator binding (`topic: meta`); not teachable child content |
| All other geometry skills | `minGrade > 1` in spine (area, volume, angles, etc.) |

### 1D. In `geometry-constants.js` G1 topics but not separate spine pages

| Topic umbrella | Decision |
|----------------|----------|
| `shapes_basic` (umbrella) | Split into `shapes_basic_square` + `shapes_basic_rectangle` spine entries |
| `transformations` (umbrella) | Covered by `transformations` spine entry (G1 page: הזזה + שיקוף; no rotation) |

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/geometry/g1/drafts/{subtopic}.md`  
`learning_page_id`: `geometry:g1:{subtopic}`  
All pages: `age_band: grades_1_2`, `approval_status: draft`.

| Batch | Order | learning_page_id | skill_id | Draft file | Hebrew title | Learning goal (short) | Clearly G1? |
|-------|-------|------------------|----------|------------|--------------|------------------------|-------------|
| A | 1 | `geometry:g1:shapes_basic_square` | `geometry:kind:shapes_basic_square` | `shapes_basic_square.md` | הכרת הריבוע | זיהוי ריבוע; 4 צלעות שוות | Yes |
| A | 2 | `geometry:g1:shapes_basic_rectangle` | `geometry:kind:shapes_basic_rectangle` | `shapes_basic_rectangle.md` | הכרת המלבן | זיהוי מלבן; אורך ורוחב | Yes |
| B | 3 | `geometry:g1:transformations` | `geometry:kind:transformations` | `transformations.md` | הזזה ושיקוף — היכרות | הזזה מול שיקוף | Yes |

**Page count:** 3.

**Note:** `book_placeholder.md` remains as infrastructure placeholder — **not** part of the 3-page book.

---

## 3. Batch Grouping

| Batch | Title (draft) | Pages | Focus |
|-------|---------------|-------|-------|
| **A** | צורות בסיסיות — ריבוע ומלבן | 2 | identify square vs rectangle |
| **B** | הזזה ושיקוף | 1 | translation vs reflection; no rotation |

---

## 4. Content Scope Notes (Draft Boundaries)

| Page | In scope (G1 draft) | Out of scope |
|------|---------------------|--------------|
| `shapes_basic_square` | שם, 4 צלעות שוות, פינות ישרות; דוגמאות יומיומיות | שטח, היקף, נוסחאות |
| `shapes_basic_rectangle` | שם, אורך/רוחב, ניגוד לריבוע | מדידות, שטח |
| `transformations` | הזזה, שיקוף; דוגמאות מעשיות | סיבוב (→ G3+ spine) |

---

## 5. Section 5 / Section 6 Alignment Plan

| Page | §5 context | §6 mistake context |
|------|------------|-------------------|
| `shapes_basic_square` | אריח — 4 צלעות שוות | אותו אריח — בלבול עם 4 צלעות לא שוות |
| `shapes_basic_rectangle` | דלת — אורך ורוחב | אותה דלת — בלבול עם ריבוע |
| `transformations` | פרפר מקופל — שיקוף? | אותו פרפר — בלבול עם הזזה |

---

## 6. Owner Approval (June 2026)

See **`GEOMETRY_GRADE_1_LEARNING_BOOK_SIGNOFF.md`** for the full record.

| Topic | Resolution |
|-------|------------|
| 3-page book vs spine | **Approved** |
| Book name | **גאומטריה** (not הנדסה) |
| זווית ישרה | **Approved** — simple box-corner explanation |
| G1 transformations | **הזזה + שיקוף only** — no rotation |
| Visual assets | **Deferred** to runtime/implementation review |
| Practice CTA | **Separate task** after runtime insertion |

---

## 7. Next Step (Not Started)

Runtime insertion of approved pages into the learning-book reader — **separate task**. Draft markdown metadata (`approval_status`, title markers) may be updated during that task.

---

## 8. Content Safety (Grade 1)

- No ASCII art diagrams or fenced code blocks in section bodies
- No markdown tables in child-facing sections
- No `[DRAFT]` inside section bodies
- Short sentences; one idea per page
- Section 7: “בתרגול תמצאו…” only — no routing

---

## 9. Deliverables Checklist (This Task)

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` | ✅ |
| Owner signoff | `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_SIGNOFF.md` | ✅ |
| Review pack | `docs/learning-book/GEOMETRY_GRADE_1_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Draft pages | `docs/learning-book/geometry/g1/drafts/*.md` | ✅ 3 pages |
| Draft README | `docs/learning-book/geometry/g1/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-geometry-g1-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-geometry-g1-book-content.mjs` | ✅ |
| Draft manifest | `scripts/lib/geometry-g1-draft-manifest.mjs` | ✅ |

**Not in scope:** registry, routes, loaders, themes, Math Master, SQL, commit, push.  
**Not modified:** Math G1–G6 drafts or math scripts.
