# Grade 4 Geometry Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר גאומטריה — כיתה ד׳

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, separate subjects) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 3–4 seven-section template |
| `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` | G1 book — not reused |
| `docs/learning-book/GEOMETRY_GRADE_2_LEARNING_BOOK_PLAN.md` | G2 book — not reused |
| `docs/learning-book/GEOMETRY_GRADE_3_LEARNING_BOOK_PLAN.md` | G3 book — continuing skills reference |
| `docs/learning-book/geometry/g1/drafts/`, `g2/drafts/`, `g3/drafts/` | Style reference — **do not modify** |
| `docs/learning-book/math/g4/drafts/` | Structure reference only — **do not modify** |
| `utils/geometry-constants.js` | `TOPIC_DESCRIPTION_MID_HIGH_GRADES.g4` hints |
| `utils/geometry-question-generator.js` | G4 scope hints (properties, diagonals, symmetry, prism volume) |

**Math books:** Out of scope.  
**Subject naming:** **גאומטריה** in book title and child-facing phrasing; not **הנדסה**; no English “geometry”.

---

## 1. Grade 4 Geometry Skills (Complete List)

Filter: `subject: "geometry"`, `minGrade ≤ 4`, `maxGrade ≥ 4`.

**Spine filter result: 15 rows → 14 learning pages** (exclude `no_question`)

| # | skill_id | subtopic | topic | min | max | Page? |
|---|----------|----------|-------|-----|-----|-------|
| 1 | `geometry:kind:shapes_basic_properties_square` | `shapes_basic_properties_square` | area_and_shapes | 4 | 4 | Yes |
| 2 | `geometry:kind:shapes_basic_properties_rectangle` | `shapes_basic_properties_rectangle` | area_and_shapes | 4 | 4 | Yes |
| 3 | `geometry:kind:shapes_basic_properties_angles` | `shapes_basic_properties_angles` | area_and_shapes | 4 | 4 | Yes |
| 4 | `geometry:kind:symmetry` | `symmetry` | angles_and_transformations | 4 | 4 | Yes |
| 5 | `geometry:kind:quadrilaterals` | `quadrilaterals` | area_and_shapes | 3 | 5 | Yes (G4 depth) |
| 6 | `geometry:kind:parallel_perpendicular` | `parallel_perpendicular` | angles_and_transformations | 3 | 5 | Yes (G4 depth) |
| 7 | `geometry:kind:square_perimeter` | `square_perimeter` | area_and_shapes | 3 | 6 | Yes (G4 page) |
| 8 | `geometry:kind:square_area` | `square_area` | area_and_shapes | 2 | 6 | Yes (G4 page) |
| 9 | `geometry:kind:triangle_perimeter` | `triangle_perimeter` | area_and_shapes | 3 | 6 | Yes (G4 page) |
| 10 | `geometry:kind:triangle_angles` | `triangle_angles` | area_and_shapes | 3 | 6 | Yes (G4 page) |
| 11 | `geometry:kind:diagonal_square` | `diagonal_square` | pythagoras_and_diagonals | 4 | 5 | Yes |
| 12 | `geometry:kind:diagonal_rectangle` | `diagonal_rectangle` | pythagoras_and_diagonals | 4 | 5 | Yes |
| 13 | `geometry:kind:solids` | `solids` | volume | 2 | 6 | Yes (G4 page) |
| 14 | `geometry:kind:rectangular_prism_volume` | `rectangular_prism_volume` | volume | 4 | 6 | Yes |
| — | `geometry:kind:no_question` | `no_question` | meta | 1 | 6 | **No** |

### 2A. New in Grade 4 (`minGrade = 4`) — 7 skills

| skill_id | Page type | Clearly G4? |
|----------|-----------|-------------|
| `geometry:kind:shapes_basic_properties_square` | concept_foundation | Yes — g4-only (`maxGrade = 4`) |
| `geometry:kind:shapes_basic_properties_rectangle` | concept_foundation | Yes — g4-only |
| `geometry:kind:shapes_basic_properties_angles` | concept_foundation | Yes — g4-only |
| `geometry:kind:symmetry` | visual_intuition | Yes — g4-only |
| `geometry:kind:diagonal_square` | step_by_step_procedure | Yes — new min 4 |
| `geometry:kind:diagonal_rectangle` | step_by_step_procedure | Yes — new min 4 |
| `geometry:kind:rectangular_prism_volume` | step_by_step_procedure | Yes — new min 4 |

### 2B. Continuing — 7 skills (G4-calibrated pages)

| skill_id | Prior page | G4 upgrade |
|----------|------------|------------|
| `geometry:kind:quadrilaterals` | G3 `quadrilaterals` | ריבוע ⊂ מלבן; תכונות וסיווג |
| `geometry:kind:parallel_perpendicular` | G3 `parallel_perpendicular` | יישום במלבן; 90° בפינות |
| `geometry:kind:square_perimeter` | G3 `square_perimeter` | צלע 8 → היקף 32 |
| `geometry:kind:square_area` | G3 `square_area` | צלע 7 → שטח 49 |
| `geometry:kind:triangle_perimeter` | G3 `triangle_perimeter` | 5+6+7=18 |
| `geometry:kind:triangle_angles` | G3 `triangle_angles` | 45°+75° → 60°; 180° |
| `geometry:kind:solids` | G3 `solids` | תיבה — 6 פאות מלבניות |

### 2C. Excluded from Grade 4 book

| skill_id / pattern | Reason |
|--------------------|--------|
| `geometry:kind:no_question` | Meta / generator |
| `geometry:kind:triangles` | `maxGrade = 3` |
| `geometry:kind:rotation` | `maxGrade = 3` |
| `geometry:kind:transformations` | `maxGrade = 2` |
| `geometry:kind:shapes_basic_square`, `shapes_basic_rectangle` | `maxGrade = 1` |
| Skills with `minGrade > 4` | Not in filter (e.g. `tiling`, `parallelogram_area`, `pythagoras_*`) |

---

## 3. Proposed Book Page List

`learning_page_id`: `geometry:g4:{subtopic}`  
`age_band`: `grades_3_4`, `approval_status`: `draft`

| Batch | Order | learning_page_id | skill_id | File | Hebrew title | Goal |
|-------|-------|------------------|----------|------|--------------|------|
| A | 1 | `geometry:g4:shapes_basic_properties_square` | `geometry:kind:shapes_basic_properties_square` | `shapes_basic_properties_square.md` | תכונות הריבוע — צלעות | 4 צלעות שוות |
| A | 2 | `geometry:g4:shapes_basic_properties_rectangle` | `geometry:kind:shapes_basic_properties_rectangle` | `shapes_basic_properties_rectangle.md` | תכונות המלבן — זוגות צלעות | 2 זוגות שווים |
| A | 3 | `geometry:g4:shapes_basic_properties_angles` | `geometry:kind:shapes_basic_properties_angles` | `shapes_basic_properties_angles.md` | זוויות ישרות במרובע | 4×90° |
| A | 4 | `geometry:g4:symmetry` | `geometry:kind:symmetry` | `symmetry.md` | סימטרייה במישור | ריבוע — 4 צירים |
| B | 5 | `geometry:g4:quadrilaterals` | `geometry:kind:quadrilaterals` | `quadrilaterals.md` | מרובעים — תכונות וסיווג | ריבוע ⊂ מלבן |
| B | 6 | `geometry:g4:parallel_perpendicular` | `geometry:kind:parallel_perpendicular` | `parallel_perpendicular.md` | מקבילות ומאונכות — במצולעים | מלבן: מקבילות / 90° |
| C | 7 | `geometry:g4:square_perimeter` | `geometry:kind:square_perimeter` | `square_perimeter.md` | היקף ריבוע — כיתה ד׳ | 4×8=32 |
| C | 8 | `geometry:g4:square_area` | `geometry:kind:square_area` | `square_area.md` | שטח ריבוע — כיתה ד׳ | 7×7=49 |
| C | 9 | `geometry:g4:triangle_perimeter` | `geometry:kind:triangle_perimeter` | `triangle_perimeter.md` | היקף משולש — כיתה ד׳ | 5+6+7=18 |
| C | 10 | `geometry:g4:triangle_angles` | `geometry:kind:triangle_angles` | `triangle_angles.md` | זוויות במשולש — כיתה ד׳ | 45°+75°+60°=180° |
| D | 11 | `geometry:g4:diagonal_square` | `geometry:kind:diagonal_square` | `diagonal_square.md` | אלכסון בריבוע | צלע 6; אלכסון > צלע |
| D | 12 | `geometry:g4:diagonal_rectangle` | `geometry:kind:diagonal_rectangle` | `diagonal_rectangle.md` | אלכסון במלבן | 3×4 → אלכסון 5 |
| E | 13 | `geometry:g4:solids` | `geometry:kind:solids` | `solids.md` | גופים — פאות במישור | תיבה 6 פאות |
| E | 14 | `geometry:g4:rectangular_prism_volume` | `geometry:kind:rectangular_prism_volume` | `rectangular_prism_volume.md` | נפח תיבה | 3×4×5=60 ס״מ³ |

**Page count:** 14.

---

## 4. Batch Grouping

| Batch | Title | Pages |
|-------|-------|-------|
| **A** | תכונות ריבוע ומלבן | 4 |
| **B** | מרובעים ומקבילות | 2 |
| **C** | היקף ושטח | 4 |
| **D** | אלכסונים | 2 |
| **E** | גופים ונפח תיבה | 2 |

---

## 5. Content Scope Notes

| Page | In scope | Out of scope |
|------|----------|--------------|
| `shapes_basic_properties_*` | ספירת צלעות/זוגות/זוויות ישרות | שטח, היקף |
| `symmetry` | ציר סימטרייה; ריבוע 4 | סיבוב |
| `quadrilaterals` | סיווג; ריבוע ⊂ מלבן | שטח מקבילית/טרפז |
| `parallel_perpendicular` | במלבן | חישוב זווית לא ידועה |
| `square_perimeter` / `square_area` | מספרים גדולים יותר | מלבן (→ G5) |
| `triangle_perimeter` / `triangle_angles` | סכום צלעות; 180° | שטח משולש |
| `diagonal_square` | אלכסון > צלע; צלע 6 | √2 פורמלי |
| `diagonal_rectangle` | משולש 3-4-5 | משפט פיתגורס בשם |
| `solids` | תיבה 6 פאות | נפח (דף נפרד) |
| `rectangular_prism_volume` | אורך×רוחב×גובה | גליל, פירמידה |

---

## 6. Section 5 / Section 6 Alignment Plan

Anchors enforced by `scripts/verify-geometry-g4-book-content.mjs` (`GEOMETRY_G4_ALIGNMENT_ANCHORS`).

| Page | §5 / §6 shared context |
|------|------------------------|
| `shapes_basic_properties_square` | ריבוע; 4 צלעות שוות |
| `shapes_basic_properties_rectangle` | מלבן; 2 זוגות |
| `shapes_basic_properties_angles` | ריבוע; 90° בכל פינה |
| `symmetry` | ריבוע; 4 צירי סימטרייה |
| `quadrilaterals` | מלבן 3×7 vs ריבוע |
| `parallel_perpendicular` | מלבן; מקבילות vs 90° |
| `square_perimeter` | ריבוע צלע 8; היקף 32 (לא 64) |
| `square_area` | ריבוע צלע 7; שטח 49 (לא 7) |
| `triangle_perimeter` | 5, 6, 7 → 18 |
| `triangle_angles` | 45°, 75° → 60° |
| `diagonal_square` | ריבוע צלע 6; אלכסון > 6 |
| `diagonal_rectangle` | 3, 4, 5 — לא 7 |
| `solids` | תיבה; 6 פאות (לא 4) |
| `rectangular_prism_volume` | 3×4×5=60 (לא חיבור 12) |

---

## 7. Bidi / Notation Risk Notes

Verifier flags for runtime review:

| Token type | Example pages | Risk |
|------------|---------------|------|
| Degrees `90°`, `45°`, `180°` | properties_angles, triangle_angles, parallel_perpendicular | ° + digits in RTL |
| Multiplication `4 × 8`, `7 × 7`, `3 × 4 × 5` | perimeter, area, volume | × between numbers |
| Centimeters `32 ס״מ` | square_perimeter | number + unit order |
| Cubic cm `ס״מ³` / מעוקב | rectangular_prism_volume | volume unit in RTL |
| Shape context numbers `3`, `4`, `5` | diagonal_rectangle | digit runs in Hebrew prose |

Content rules applied:

- No ASCII diagrams or markdown tables in bodies
- No formal `P = 2 × (a + b)` unless owner adds later
- No vertex labels A/B/C in G4 drafts (reduces Bidi risk)
- Section 7: «בתרגול תמצאו…» only — no practice URLs

---

## 8. Owner-Review Questions

1. Approve **14 pages** as full G4 geometry book for current spine?
2. Confirm book/runtime title uses **גאומטריה** (not **הנדסה**).
3. Confirm **diagonal_square** stays intuitive (no √2) vs introducing approximate length?
4. Confirm **diagonal_rectangle** uses classic 3-4-5 without naming Pythagoras?
5. Confirm **rectangular_prism_volume** at G4 (continues in G5–G6) — units ס״מ מעוקב OK?
6. Confirm **symmetry** g4-only page — no overlap with G5+ symmetry extensions?
7. Practice CTA mapping — separate post-approval task (not in this deliverable).

---

## 9. Deliverables Checklist

| Deliverable | Status |
|-------------|--------|
| `GEOMETRY_GRADE_4_LEARNING_BOOK_PLAN.md` | ✅ |
| `GEOMETRY_GRADE_4_HEBREW_REVIEW_PACK.md` | ✅ generated |
| `geometry/g4/drafts/*.md` (14 pages) | ✅ |
| `geometry/g4/drafts/README.md` | ✅ |
| `scripts/build-geometry-g4-hebrew-review-pack.mjs` | ✅ |
| `scripts/verify-geometry-g4-book-content.mjs` | ✅ |
| `scripts/lib/geometry-g4-draft-manifest.mjs` | ✅ |

**Not modified:** Math G1–G6; Geometry G1–G3 drafts; design/CSS/routes/registry/SQL.
