# Grade 3 Geometry Learning Book — Plan

**Status:** **Owner-approved content** + runtime wired (June 2026). See `GEOMETRY_GRADE_3_LEARNING_BOOK_SIGNOFF.md`.  
**Date:** June 2026  
**Book title (child-facing):** ספר גאומטריה — כיתה ג׳

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, separate subjects) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 3–4 seven-section template |
| `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` | G1 book — not reused |
| `docs/learning-book/GEOMETRY_GRADE_2_LEARNING_BOOK_PLAN.md` | G2 book — not reused |
| `docs/learning-book/geometry/g1/drafts/`, `g2/drafts/` | Style reference — **do not modify** |
| `docs/learning-book/math/g3/drafts/` | Structure reference only — **do not modify** |
| `utils/geometry-constants.js` | G3 topic descriptions |
| `utils/geometry-question-generator.js` | G3 scope hints |

**Math books:** Out of scope.  
**Subject naming:** **גאומטריה** in child-facing text; not **הנדסה**; no English “geometry”.

---

## 1. Grade 3 Geometry Skills (Complete List)

Filter: `subject: "geometry"`, `minGrade ≤ 3`, `maxGrade ≥ 3`.

**Spine filter result: 10 rows → 9 learning pages**

| # | skill_id | subtopic | topic | min | max | Page? |
|---|----------|----------|-------|-----|-----|-------|
| 1 | `geometry:kind:triangles` | `triangles` | area_and_shapes | 3 | 3 | Yes |
| 2 | `geometry:kind:quadrilaterals` | `quadrilaterals` | area_and_shapes | 3 | 5 | Yes |
| 3 | `geometry:kind:parallel_perpendicular` | `parallel_perpendicular` | angles_and_transformations | 3 | 5 | Yes |
| 4 | `geometry:kind:square_area` | `square_area` | area_and_shapes | 2 | 6 | Yes (G3 page) |
| 5 | `geometry:kind:square_perimeter` | `square_perimeter` | area_and_shapes | 3 | 6 | Yes |
| 6 | `geometry:kind:triangle_perimeter` | `triangle_perimeter` | area_and_shapes | 3 | 6 | Yes |
| 7 | `geometry:kind:triangle_angles` | `triangle_angles` | area_and_shapes | 3 | 6 | Yes |
| 8 | `geometry:kind:rotation` | `rotation` | angles_and_transformations | 3 | 3 | Yes |
| 9 | `geometry:kind:solids` | `solids` | volume | 2 | 6 | Yes (G3 page) |
| — | `geometry:kind:no_question` | `no_question` | meta | 1 | 6 | **No** |

### 2A. New in Grade 3 (`minGrade = 3`) — 6 skills

| skill_id | Page type | Clearly G3? |
|----------|-----------|-------------|
| `geometry:kind:triangles` | concept_foundation | Yes |
| `geometry:kind:quadrilaterals` | concept_foundation | Yes |
| `geometry:kind:parallel_perpendicular` | concept_foundation | Yes |
| `geometry:kind:square_perimeter` | step_by_step_procedure | Yes |
| `geometry:kind:triangle_perimeter` | step_by_step_procedure | Yes |
| `geometry:kind:triangle_angles` | step_by_step_procedure | Yes |
| `geometry:kind:rotation` | visual_intuition | Yes — g3-only in spine (`maxGrade = 3`) |

### 2B. Continuing — 2 skills (G3-calibrated pages)

| skill_id | Prior page | G3 upgrade |
|----------|------------|------------|
| `geometry:kind:square_area` | G2 `square_area` | צלע 5 → 25; יחידות ריבוע |
| `geometry:kind:solids` | G2 `solids` | פאות, קדקודים, מקצועות בקובייה |

### 2C. Excluded from Grade 3 book

| skill_id | Reason |
|----------|--------|
| `geometry:kind:no_question` | Meta / generator |
| `geometry:kind:transformations` | `maxGrade = 2` — ends at G2 geometry book |
| `geometry:kind:shapes_basic_square` | `maxGrade = 1` |
| `geometry:kind:shapes_basic_rectangle` | `maxGrade = 1` |
| Skills with `minGrade > 3` | Not in filter |

---

## 3. Proposed Book Page List

`learning_page_id`: `geometry:g3:{subtopic}`  
`age_band`: `grades_3_4`, `approval_status`: `draft`

| Batch | Order | learning_page_id | skill_id | File | Hebrew title | Goal |
|-------|-------|------------------|----------|------|--------------|------|
| A | 1 | `geometry:g3:triangles` | `geometry:kind:triangles` | `triangles.md` | סוגי משולשים | סיווג לפי צלעות |
| A | 2 | `geometry:g3:quadrilaterals` | `geometry:kind:quadrilaterals` | `quadrilaterals.md` | סוגי מרובעים | ריבוע, מלבן, מקבילית, טרפז |
| B | 3 | `geometry:g3:parallel_perpendicular` | `geometry:kind:parallel_perpendicular` | `parallel_perpendicular.md` | מקבילות ומאונכות | מסילות / פינה 90° |
| C | 4 | `geometry:g3:square_area` | `geometry:kind:square_area` | `square_area.md` | שטח ריבוע | 5×5=25 |
| C | 5 | `geometry:g3:square_perimeter` | `geometry:kind:square_perimeter` | `square_perimeter.md` | היקף ריבוע | 4×6=24 |
| C | 6 | `geometry:g3:triangle_perimeter` | `geometry:kind:triangle_perimeter` | `triangle_perimeter.md` | היקף משולש | 3+4+5=12 |
| D | 7 | `geometry:g3:triangle_angles` | `geometry:kind:triangle_angles` | `triangle_angles.md` | זוויות במשולש | 50°+60°+70°=180° |
| E | 8 | `geometry:g3:rotation` | `geometry:kind:rotation` | `rotation.md` | סיבוב במישור | רבע = 90° |
| E | 9 | `geometry:g3:solids` | `geometry:kind:solids` | `solids.md` | גופים — פאות, קדקודים ומקצועות | קובייה 6-8-12 |

**Page count:** 9.

---

## 4. Batch Grouping

| Batch | Title | Pages |
|-------|-------|-------|
| **A** | משולשים ומרובעים | 2 |
| **B** | מקבילות ומאונכות | 1 |
| **C** | שטח והיקף | 3 |
| **D** | זוויות במשולש | 1 |
| **E** | סיבוב וגופים | 2 |

---

## 5. Content Scope Notes

| Page | In scope | Out of scope |
|------|----------|--------------|
| `triangles` | 3 types by sides | שטח משולש |
| `quadrilaterals` | 4 names | תכונות עמוקות (→ G4) |
| `parallel_perpendicular` | מקבילות, מאונכות, 90° | חישוב זווית לא ידועה |
| `square_area` | יחידות ריבוע, 5×5 | π, מלבן |
| `square_perimeter` | 4×צלע | שטח |
| `triangle_perimeter` | סכום 3 צלעות | שטח |
| `triangle_angles` | 180° rule | משולש חוץ־משולשי |
| `rotation` | 90°, רבע סיבוב | מרכז סיבוב פורמלי |
| `solids` | קובייה פאות/קדקודים/מקצועות | נפח |

---

## 6. Section 5 / Section 6 Alignment Plan

| Page | §5 | §6 (same context) |
|------|-----|-------------------|
| `triangles` | משולש 3, 3, 5 | אותו משולש — בלבול שווה צלעות / שווה שוקיים |
| `quadrilaterals` | שתי צלעות קצרות ושתיים ארוכות | אותו מרובע — בלבול עם ריבוע |
| `parallel_perpendicular` | מסילת רכבת — מקבילים? | אותה מסילה — בלבול עם מאונכים |
| `square_area` | ריבוע צלע 5 | אותו ריבוע — 5 במקום 25 |
| `square_perimeter` | ריבוע צלע 6 | אותו ריבוע — 6+6 במקום 4×6 |
| `triangle_perimeter` | צלעות 3,4,5 | אותו משולש — שכחו צלע |
| `triangle_angles` | 50°, 60° | אותן זוויות — 110° במקום 70° |
| `rotation` | רבע סיבוב | אותו סיבוב — 45° במקום 90° |
| `solids` | קובייה פאות/קדקודים | אותה קובייה — 6 קדקודים במקום 8; 12 מקצועות |

---

## 7. Bidi / Notation Risk Notes

Verifier flags for runtime review:

| Token type | Example pages | Risk |
|------------|---------------|------|
| Degrees `50°`, `90°`, `180°` | `triangle_angles`, `rotation`, `parallel_perpendicular` | Degree symbol + digits in RTL |
| Multiplication `5 × 5`, `4 × 6` | `square_area`, `square_perimeter` | × between numbers in Hebrew prose |
| Centimeters `24 ס״מ`, `12 ס״מ` | `square_perimeter`, `triangle_perimeter` (if used) | Number + unit order in RTL |

Content rules applied:

- No ASCII diagrams or markdown tables in bodies
- Degrees kept as `90°` (spine-aligned); renderer should isolate LTR
- No splitting `180°` into separate tokens

---

## 8. Owner-Review Questions

1. Approve **9 pages** as full G3 geometry book for current spine.
2. Confirm **גאומטריה** at runtime (not הנדסה).
3. Confirm `rotation` page is **g3-only** (`maxGrade = 3`) — no G4 rotation page unless spine extended.
4. Confirm introduction of **ס״מ** and **°** in child text — OK for Grade 3?
5. Confirm `quadrilaterals` covers four names only (not full properties).
6. Practice CTA — separate post-approval task.

---

## 9. Deliverables Checklist

| Deliverable | Status |
|-------------|--------|
| `GEOMETRY_GRADE_3_LEARNING_BOOK_PLAN.md` | ✅ |
| `GEOMETRY_GRADE_3_HEBREW_REVIEW_PACK.md` | ✅ generated |
| `geometry/g3/drafts/*.md` (9 pages) | ✅ |
| `geometry/g3/drafts/README.md` | ✅ |
| `scripts/build-geometry-g3-hebrew-review-pack.mjs` | ✅ |
| `scripts/verify-geometry-g3-book-content.mjs` | ✅ |
| `scripts/lib/geometry-g3-draft-manifest.mjs` | ✅ |

**Not modified:** Math G1–G6; Geometry G1–G2 drafts (except new G3 folder).
