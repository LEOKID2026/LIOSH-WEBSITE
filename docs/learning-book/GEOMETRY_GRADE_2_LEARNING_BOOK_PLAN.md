# Grade 2 Geometry Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר גאומטריה — כיתה ב׳

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, separate subjects) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 1–2 seven-section template |
| `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` | Prior grade book; G1 pages not reused |
| `docs/learning-book/geometry/g1/drafts/` | Style reference — **do not modify** |
| `docs/learning-book/math/g2/drafts/` | Structure reference only — **do not modify** |
| `utils/geometry-constants.js` | G2 topic descriptions (`area`, `solids`, `transformations`) |
| `utils/geometry-question-generator.js` | G2 scope hints (solid names; square area; הזזה/שיקוף) |

**Math books:** Out of scope.  
**Subject naming:** Child-facing copy uses **גאומטריה**, not **הנדסה**. No English “geometry” in child-facing bodies.

---

## 1. Grade 2 Geometry Skills (Complete List)

A skill is **in Grade 2 Geometry scope** when `subject: "geometry"` and `minGrade ≤ 2` and `maxGrade ≥ 2` in `skills.json`.

**Spine filter result: 4 rows**

| # | skill_id | subtopic | topic | min | max | Learning page? |
|---|----------|----------|-------|-----|-----|----------------|
| 1 | `geometry:kind:solids` | `solids` | volume | 2 | 6 | **Yes** (G2-calibrated) |
| 2 | `geometry:kind:square_area` | `square_area` | area_and_shapes | 2 | 6 | **Yes** (G2-calibrated) |
| 3 | `geometry:kind:transformations` | `transformations` | angles_and_transformations | 1 | 2 | **Yes** (G2 page; G1 page separate) |
| 4 | `geometry:kind:no_question` | `no_question` | meta | 1 | 6 | **No** — generator meta |

**Total learning pages: 3** (one `geometry:g2:{subtopic}` page each).

### 2A. New in Grade 2 (`minGrade = 2`) — 2 skills

| skill_id | Recommended page type | Clearly G2? |
|----------|------------------------|-------------|
| `geometry:kind:solids` | visual_intuition | Yes — name 6 solids; no volume formulas |
| `geometry:kind:square_area` | visual_intuition | Yes — unit squares + צלע × צלע; small numbers |

### 2B. Continuing from Grade 1 — 1 skill

| skill_id | G1 page | G2 upgrade | Clearly G2? |
|----------|---------|------------|-------------|
| `geometry:kind:transformations` | `geometry:g1:transformations` | הבחנה מדויקת; דוגמאות מדבקה/עפרון | Yes |

**Note:** G1 taught `shapes_basic_square` and `shapes_basic_rectangle` (`maxGrade = 1`). G2 does **not** repeat those pages; plane-shape recognition continues implicitly via `square_area`.

### 2C. Excluded from Grade 2 book

| skill_id | Reason |
|----------|--------|
| `geometry:kind:no_question` | Meta / generator binding |
| `geometry:kind:shapes_basic_square` | `maxGrade = 1` — covered in G1 geometry book |
| `geometry:kind:shapes_basic_rectangle` | `maxGrade = 1` — covered in G1 geometry book |
| All skills with `minGrade > 2` | Not in G2 spine filter (triangles, perimeter, etc.) |

### 2D. In `geometry-constants.js` G2 topics but not separate spine pages

| Topic umbrella | Decision |
|----------------|----------|
| `shapes_basic` (umbrella) | G1-only spine entries; G2 uses `square_area` for area intro |
| `area` (umbrella) | G2 book page: `square_area` only at this grade |

---

## 3. Proposed Book Page List

Each row → `docs/learning-book/geometry/g2/drafts/{subtopic}.md`  
`learning_page_id`: `geometry:g2:{subtopic}`  
All pages: `age_band: grades_1_2`, `approval_status: draft`.

| Batch | Order | learning_page_id | skill_id | Draft file | Hebrew title | Learning goal (short) | Clearly G2? |
|-------|-------|------------------|----------|------------|--------------|------------------------|-------------|
| A | 1 | `geometry:g2:solids` | `geometry:kind:solids` | `solids.md` | גופים תלת־ממדיים | שמות 6 גופים | Yes |
| B | 2 | `geometry:g2:square_area` | `geometry:kind:square_area` | `square_area.md` | שטח של ריבוע | כיסוי; 4×4=16 | Yes |
| C | 3 | `geometry:g2:transformations` | `geometry:kind:transformations` | `transformations.md` | הזזה ושיקוף — המשך | מדבקה = שיקוף | Yes |

**Page count:** 3.

---

## 4. Batch Grouping

| Batch | Title | Pages | Focus |
|-------|-------|-------|-------|
| **A** | גופים תלת־ממדיים | 1 | קובייה, תיבה, גליל, פירמידה, חרוט, כדור |
| **B** | שטח — ריבוע | 1 | unit squares; צלע × צלע |
| **C** | הזזה ושיקוף | 1 | continue from G1; sharper distinction |

---

## 5. Content Scope Notes (Draft Boundaries)

| Page | In scope (G2 draft) | Out of scope |
|------|---------------------|--------------|
| `solids` | זיהוי לפי תיאור; 6 שמות | נפח, נוסחאות |
| `square_area` | יחידות ריבוע; צלע 4 → 16 | π, מלבן, משולש |
| `transformations` | הזזה מול שיקוף | סיבוב (→ G3) |

---

## 6. Section 5 / Section 6 Alignment Plan

| Page | §5 context | §6 mistake context |
|------|------------|-------------------|
| `solids` | 6 פאות ריבועיות שוות — קובייה? | אותו תיאור — בלבול עם תיבה |
| `square_area` | ריבוע צלע 4 — שטח? | אותו ריבוע — תשובה 4 במקום 16 |
| `transformations` | מדבקה בחלון — הזזה או שיקוף? | אותה מדבקה — בלבול עם הזזה |

---

## 7. Topics Skipped or Uncertain (Owner Review)

| Topic | Status | Notes |
|-------|--------|-------|
| `square_area` formula | Needs review | Draft teaches 4×4; confirm no formal formula notation required earlier |
| Six solids in one page | Needs review | All six named in §2; practice may focus on subset |
| No G2 `shapes_basic` page | By design | Spine has no g2 shapes_basic skill — relies on G1 + square_area |
| Illustrated diagrams | Needs review | Prose-only drafts; assets at implementation |

---

## 8. Owner-Review Questions Before Implementation

1. Approve **3 pages** as full G2 geometry book for current spine.
2. Confirm **גאומטריה** (not הנדסה) at runtime for book title and tiles.
3. Confirm G2 `square_area` uses **צלע × צלע** with small whole numbers only.
4. Confirm G2 `solids` introduces all six bodies without volume.
5. Practice CTA — separate task after approval.

---

## 9. Deliverables Checklist (This Task)

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/GEOMETRY_GRADE_2_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `docs/learning-book/GEOMETRY_GRADE_2_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Draft pages | `docs/learning-book/geometry/g2/drafts/*.md` | ✅ 3 pages |
| Draft README | `docs/learning-book/geometry/g2/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-geometry-g2-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-geometry-g2-book-content.mjs` | ✅ |
| Draft manifest | `scripts/lib/geometry-g2-draft-manifest.mjs` | ✅ |

**Not modified:** Math G1–G6; Geometry G1 drafts (reference only).
