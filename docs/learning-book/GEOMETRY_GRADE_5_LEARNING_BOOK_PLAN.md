# Grade 5 Geometry Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר גאומטריה — כיתה ה׳

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, approved content) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Section C (Grades 5–6) seven-section template |
| `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` | Geometry book pattern; **גאומטריה** naming |
| `docs/learning-book/geometry/g1/drafts/` | Style reference — **do not modify** |
| `docs/learning-book/math/g5/drafts/` | Batch/script structure reference only |
| `utils/geometry-constants.js` | G5 topics, shapes, scope hints |
| `utils/geometry-question-generator.js` | Runtime kind hints (no practice mapping in this task) |
| `utils/geometry-explanations.js` | Formula wording reference |

**Math books:** Out of scope — not modified by this package.  
**Subject naming:** Child-facing copy uses **גאומטריה**, not **הנדסה**. No English “geometry” in section bodies.

---

## 1. Grade 5 Geometry Skills (Complete List)

A skill is **in Grade 5 Geometry scope** when `subject: "geometry"`, `minGrade ≤ 5`, and `maxGrade ≥ 5` in `skills.json`.

**Spine filter result: 18 rows → 17 learning pages** (excluding meta `no_question`).

| # | skill_id | subtopic | topic | min | max | Page? |
|---|----------|----------|-------|-----|-----|-------|
| 1 | `geometry:kind:parallel_perpendicular` | `parallel_perpendicular` | angles_and_transformations | 3 | 5 | Yes — **last grade** |
| 2 | `geometry:kind:quadrilaterals` | `quadrilaterals` | area_and_shapes | 3 | 5 | Yes — **last grade** |
| 3 | `geometry:kind:triangle_angles` | `triangle_angles` | area_and_shapes | 3 | 6 | Yes (G5 page) |
| 4 | `geometry:kind:square_perimeter` | `square_perimeter` | area_and_shapes | 3 | 6 | Yes (G5 page) |
| 5 | `geometry:kind:triangle_perimeter` | `triangle_perimeter` | area_and_shapes | 3 | 6 | Yes (G5 page) |
| 6 | `geometry:kind:square_area` | `square_area` | area_and_shapes | 2 | 6 | Yes (G5 page) |
| 7 | `geometry:kind:parallelogram_area` | `parallelogram_area` | area_and_shapes | 5 | 6 | Yes — **new G5** |
| 8 | `geometry:kind:trapezoid_area` | `trapezoid_area` | area_and_shapes | 5 | 6 | Yes — **new G5** |
| 9 | `geometry:kind:heights_triangle` | `heights_triangle` | area_and_shapes | 5 | 5 | Yes — **G5 only** |
| 10 | `geometry:kind:heights_parallelogram` | `heights_parallelogram` | area_and_shapes | 5 | 5 | Yes — **G5 only** |
| 11 | `geometry:kind:heights_trapezoid` | `heights_trapezoid` | area_and_shapes | 5 | 5 | Yes — **G5 only** |
| 12 | `geometry:kind:diagonal_square` | `diagonal_square` | pythagoras_and_diagonals | 4 | 5 | Yes — **last grade** |
| 13 | `geometry:kind:diagonal_rectangle` | `diagonal_rectangle` | pythagoras_and_diagonals | 4 | 5 | Yes — **last grade** |
| 14 | `geometry:kind:diagonal_parallelogram` | `diagonal_parallelogram` | pythagoras_and_diagonals | 5 | 5 | Yes — **G5 only** |
| 15 | `geometry:kind:solids` | `solids` | volume | 2 | 6 | Yes (G5 page) |
| 16 | `geometry:kind:rectangular_prism_volume` | `rectangular_prism_volume` | volume | 4 | 6 | Yes (G5 page) |
| 17 | `geometry:kind:tiling` | `tiling` | area_and_shapes | 5 | 5 | Yes — **G5 only** |
| — | `geometry:kind:no_question` | `no_question` | meta | 1 | 6 | **No** — meta kind |

### 1A. New in Grade 5 (`minGrade = 5`) — 7 skills

| skill_id | Clearly G5? |
|----------|-------------|
| `geometry:kind:parallelogram_area` | Yes |
| `geometry:kind:trapezoid_area` | Yes |
| `geometry:kind:heights_triangle` | Yes |
| `geometry:kind:heights_parallelogram` | Yes |
| `geometry:kind:heights_trapezoid` | Yes |
| `geometry:kind:diagonal_parallelogram` | Yes |
| `geometry:kind:tiling` | Yes |

### 1B. Continuing from earlier grades — 10 skills

| skill_id | Prior page | G5 scope upgrade | Clearly G5? |
|----------|------------|------------------|-------------|
| `geometry:kind:parallel_perpendicular` | G3/G4 | יישום במקבילית/טרפז | Yes — **last grade** |
| `geometry:kind:quadrilaterals` | G3/G4 | מקבילית, טרפז, הכלה | Yes — **last grade** |
| `geometry:kind:triangle_angles` | G3/G4 | חישוב זווית שלישית | Yes |
| `geometry:kind:square_perimeter` | G3/G4 | היקף = 4×צלע | Yes |
| `geometry:kind:triangle_perimeter` | G3/G4 | סכום 3 צלעות | Yes |
| `geometry:kind:square_area` | G2+ | שטח = צלע² | Yes |
| `geometry:kind:diagonal_square` | G4 | צלע × √2 | Yes — **last grade** |
| `geometry:kind:diagonal_rectangle` | G4 | √(a²+b²) | Yes — **last grade** |
| `geometry:kind:solids` | G2+ | קובייה/תיבה + שמות גופים | Yes |
| `geometry:kind:rectangular_prism_volume` | G4 | a×b×h | Yes |

### 1C. Excluded from Grade 5 book

| skill_id / group | Reason |
|------------------|--------|
| `geometry:kind:no_question` | Meta — not teachable |
| `geometry:kind:circle_*` | G6 only |
| `geometry:kind:pythagoras_*` | G6 only (G5 diagonals use idea, not formal skill) |
| `geometry:kind:rotation`, `symmetry`, `transformations` | End before G5 or G4/G6 only |
| `geometry:kind:shapes_basic_*` | G1/G4 only |
| `geometry:kind:triangles` | G3 only |
| G6 volume skills (cone, cylinder, sphere, pyramid…) | minGrade = 6 |

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/geometry/g5/drafts/{subtopic}.md`  
`learning_page_id`: `geometry:g5:{subtopic}`  
All pages: `age_band: grades_5_6`, `approval_status: draft`.

| Batch | Order | learning_page_id | skill_id | Draft file | Hebrew title | Learning goal | Clearly G5? |
|-------|-------|------------------|----------|------------|--------------|---------------|-------------|
| A | 1 | `geometry:g5:parallel_perpendicular` | `geometry:kind:parallel_perpendicular` | `parallel_perpendicular.md` | קווים מקבילים ומאונכים | זיהוי ∥ ו-⊥ | Yes |
| A | 2 | `geometry:g5:quadrilaterals` | `geometry:kind:quadrilaterals` | `quadrilaterals.md` | סיווג מרובעים | מקבילית/טרפז/מלבן/ריבוע | Yes |
| A | 3 | `geometry:g5:triangle_angles` | `geometry:kind:triangle_angles` | `triangle_angles.md` | זוויות במשולש | סכום 180° | Yes |
| B | 4 | `geometry:g5:square_perimeter` | `geometry:kind:square_perimeter` | `square_perimeter.md` | היקף ריבוע | 4×צלע | Yes |
| B | 5 | `geometry:g5:triangle_perimeter` | `geometry:kind:triangle_perimeter` | `triangle_perimeter.md` | היקף משולש | סכום צלעות | Yes |
| B | 6 | `geometry:g5:square_area` | `geometry:kind:square_area` | `square_area.md` | שטח ריבוע | צלע×צלע | Yes |
| C | 7 | `geometry:g5:parallelogram_area` | `geometry:kind:parallelogram_area` | `parallelogram_area.md` | שטח מקבילית | בסיס×גובה | Yes |
| C | 8 | `geometry:g5:trapezoid_area` | `geometry:kind:trapezoid_area` | `trapezoid_area.md` | שטח טרפז | (b1+b2)×h÷2 | Yes |
| D | 9 | `geometry:g5:heights_triangle` | `geometry:kind:heights_triangle` | `heights_triangle.md` | גובה במשולש | (ש×2)÷ב | Yes |
| D | 10 | `geometry:g5:heights_parallelogram` | `geometry:kind:heights_parallelogram` | `heights_parallelogram.md` | גובה במקבילית | ש÷ב | Yes |
| D | 11 | `geometry:g5:heights_trapezoid` | `geometry:kind:heights_trapezoid` | `heights_trapezoid.md` | גובה בטרפז | (ש×2)÷(b1+b2) | Yes |
| E | 12 | `geometry:g5:diagonal_square` | `geometry:kind:diagonal_square` | `diagonal_square.md` | אלכסון בריבוע | צלע×√2 | Yes |
| E | 13 | `geometry:g5:diagonal_rectangle` | `geometry:kind:diagonal_rectangle` | `diagonal_rectangle.md` | אלכסון במלבן | √(a²+b²) | Yes |
| E | 14 | `geometry:g5:diagonal_parallelogram` | `geometry:kind:diagonal_parallelogram` | `diagonal_parallelogram.md` | אלכסון במקבילית | √(a²+b²) | Yes |
| F | 15 | `geometry:g5:solids` | `geometry:kind:solids` | `solids.md` | גופים תלת-ממדיים | קובייה/תיבה | Yes |
| F | 16 | `geometry:g5:rectangular_prism_volume` | `geometry:kind:rectangular_prism_volume` | `rectangular_prism_volume.md` | נפח תיבה | a×b×h | Yes |
| G | 17 | `geometry:g5:tiling` | `geometry:kind:tiling` | `tiling.md` | ריצוף במישור | זווית 90° בריבוע | Yes |

**Page count:** 17.

---

## 3. Batch Grouping

| Batch | Title | Pages | Focus |
|-------|-------|-------|-------|
| **A** | מקבילות, מרובעים וזוויות | 3 | classify, parallel/perpendicular, 180° |
| **B** | היקף ושטח — ריבוע ומשולש | 3 | perimeter + square area |
| **C** | שטח — מקבילית וטרפז | 2 | new area formulas |
| **D** | גובה במצולעים | 3 | height from area (G5-only skills) |
| **E** | אלכסונים | 3 | diagonal with √ (pre-Pythagoras formal) |
| **F** | גופים ונפח | 2 | solids + prism volume |
| **G** | ריצוף | 1 | tiling angles |

---

## 4. Content Scope Notes

| Page | In scope (G5) | Out of scope |
|------|---------------|--------------|
| `parallelogram_area` | בסיס×גובה; גובה מאונך | עשרוניים מורכבים |
| `trapezoid_area` | שני בסיסים + גובה | שברים |
| `heights_*` | היפוך נוסחת שטח | |
| `diagonal_*` | √ וריבועי צלעות; **לא** שם “משפט פיתגורס” ככותרת | הוכחה פורמלית (→ G6) |
| `tiling` | 90°, 60°, 360° סביב נקודה | ריצוף משושה מעמיק |
| `rectangular_prism_volume` | תיבת מלבן | גליל, פירמידה (→ G6) |

---

## 5. Section 5 / Section 6 Alignment Plan

| Page | §5 problem | §6 mistake (same numbers/shape) |
|------|------------|----------------------------------|
| `parallel_perpendicular` | טרפז AB ∥ CD | אותו טרפז — בלבול מקביל/שווה |
| `quadrilaterals` | בסיסים מקבילים — טרפז? | מקבילית vs טרפז |
| `triangle_angles` | 60° + 70° | אותן זוויות — שכחת 70° |
| `square_perimeter` | צלע 9 ס״מ | 9 ס״מ — בלבול שטח/היקף |
| `triangle_perimeter` | 5,6,7 ס״מ | אותן צלעות — חסרה צלע |
| `square_area` | צלע 7 ס״מ | 7 ס״מ — בלבול היקף |
| `parallelogram_area` | ב 8, ג 5 | אותם מספרים — צלע במקום גובה |
| `trapezoid_area` | 6,10,4 | אותם מספרים — שכח ÷2 |
| `heights_triangle` | ב 10, ש 30 | ×2 vs לא |
| `heights_parallelogram` | ב 8, ש 40 | ÷2 שלא לכאן |
| `heights_trapezoid` | 5,9, ש 28 | שכח לחבר בסיסים |
| `diagonal_square` | צלע 6 | 6×2 במקום 6√2 |
| `diagonal_rectangle` | 6×8 | 6+8 במקום √(36+64) |
| `diagonal_parallelogram` | 5,12 | 5+12 |
| `solids` | קובייה vs תיבה | אותה שאלה |
| `rectangular_prism_volume` | 4×3×5 | שטח פאה במקום נפח |
| `tiling` | ריבוע 90° | 360° vs 90° |

---

## 6. Notation / Bidi Risk Notes

| Notation | Pages | Mitigation in content |
|----------|-------|------------------------|
| **ס״מ** | most measurement pages | full token; no split |
| **סמ״ר** | area pages | preferred over מ״ר in drafts |
| **90°, 180°, 360°** | angles, tiling | digit+° as unit token |
| **×** | formulas | spaced multiplication |
| **√2, √(a²+b²)** | diagonals | kept as LTR expressions |
| **Labels A,B,C,D** | parallel, angles | short Latin labels |
| **Parentheses** | trapezoid, heights | no ASCII tables |

**Verifier:** `node scripts/verify-geometry-g5-book-content.mjs` reports all categories for browser review.

---

## 7. Owner-Review Questions

1. **Diagonal pages:** Is introducing √ and “רעיון פיתגורס” at G5 OK before G6 `pythagoras_hyp`/`pythagoras_leg` pages?
2. **`parallel_perpendicular` / `quadrilaterals`:** Last spine grade is G5 — confirm no G6 continuation page needed.
3. **Heights skills:** G5-only in spine — confirm depth of formula inversion is appropriate.
4. **Tiling:** Cover only square (90°) + mention triangle 60° — or expand?
5. **All Hebrew titles:** `[DRAFT — not owner-approved]` — batch or domain review?

---

## 8. Deliverables Checklist

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan (this document) | `docs/learning-book/GEOMETRY_GRADE_5_LEARNING_BOOK_PLAN.md` | ✅ |
| Hebrew review pack | `docs/learning-book/GEOMETRY_GRADE_5_HEBREW_REVIEW_PACK.md` | ✅ |
| Draft pages (17) | `docs/learning-book/geometry/g5/drafts/*.md` | ✅ |
| Drafts README | `docs/learning-book/geometry/g5/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-geometry-g5-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-geometry-g5-book-content.mjs` | ✅ |
| Draft manifest | `scripts/lib/geometry-g5-draft-manifest.mjs` | ✅ |
| Draft generator | `scripts/generate-geometry-g5-drafts.mjs` | ✅ |

---

## 9. Explicit Stop Rule

Until owner approves:

- ❌ No runtime registry, routes, SQL, commit, push, deploy
- ❌ No practice CTA / fake mappings
- ✅ Documentation and draft markdown only
