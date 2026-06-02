# Grade 6 Geometry Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**Book title (child-facing):** ספר גאומטריה — כיתה ו׳

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, approved content) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Section C (Grades 5–6) seven-section template |
| `docs/learning-book/GEOMETRY_GRADE_5_LEARNING_BOOK_PLAN.md` | Prior geometry book pattern |
| `docs/learning-book/geometry/g1/drafts/` … `geometry/g5/drafts/` | Style reference — **do not modify** |
| `docs/learning-book/math/g6/drafts/` | Batch/script structure reference only |
| `utils/geometry-constants.js` | G6 topics, shapes, scope hints |
| `utils/geometry-question-generator.js` | Runtime kind hints (no practice mapping in this task) |
| `utils/geometry-explanations.js` | Formula wording reference (π ≈ 3.14) |

**Math books:** Out of scope — not modified by this package.  
**Other geometry grades (G1–G5):** Not modified by this package.  
**Subject naming:** Child-facing copy uses **גאומטריה**, not **הנדסה**. No English “geometry” in section bodies.

---

## 1. Grade 6 Geometry Skills (Complete List)

A skill is **in Grade 6 Geometry scope** when `subject: "geometry"`, `minGrade ≤ 6`, and `maxGrade ≥ 6` in `skills.json`.

**Spine filter result: 20 rows → 19 learning pages** (excluding meta `no_question`).

| # | skill_id | subtopic | topic | min | max | Page? |
|---|----------|----------|-------|-----|-----|-------|
| 1 | `geometry:kind:square_perimeter` | `square_perimeter` | area_and_shapes | 3 | 6 | Yes (G6 page) |
| 2 | `geometry:kind:triangle_perimeter` | `triangle_perimeter` | area_and_shapes | 3 | 6 | Yes (G6 page) |
| 3 | `geometry:kind:square_area` | `square_area` | area_and_shapes | 2 | 6 | Yes (G6 page) |
| 4 | `geometry:kind:triangle_angles` | `triangle_angles` | area_and_shapes | 3 | 6 | Yes (G6 page) |
| 5 | `geometry:kind:parallelogram_area` | `parallelogram_area` | area_and_shapes | 5 | 6 | Yes — **last grade** |
| 6 | `geometry:kind:trapezoid_area` | `trapezoid_area` | area_and_shapes | 5 | 6 | Yes — **last grade** |
| 7 | `geometry:kind:circle_perimeter` | `circle_perimeter` | area_and_shapes | 6 | 6 | Yes — **new G6** |
| 8 | `geometry:kind:circle_area` | `circle_area` | area_and_shapes | 6 | 6 | Yes — **new G6** |
| 9 | `geometry:kind:pythagoras_hyp` | `pythagoras_hyp` | pythagoras_and_diagonals | 6 | 6 | Yes — **new G6** |
| 10 | `geometry:kind:pythagoras_leg` | `pythagoras_leg` | pythagoras_and_diagonals | 6 | 6 | Yes — **new G6** |
| 11 | `geometry:kind:solids` | `solids` | volume | 2 | 6 | Yes (G6 page) |
| 12 | `geometry:kind:rectangular_prism_volume` | `rectangular_prism_volume` | volume | 4 | 6 | Yes (G6 page) |
| 13 | `geometry:kind:prism_volume_rectangular` | `prism_volume_rectangular` | volume | 6 | 6 | Yes — **new G6** |
| 14 | `geometry:kind:prism_volume_triangle` | `prism_volume_triangle` | volume | 6 | 6 | Yes — **new G6** |
| 15 | `geometry:kind:pyramid_volume_square` | `pyramid_volume_square` | volume | 6 | 6 | Yes — **new G6** |
| 16 | `geometry:kind:pyramid_volume_rectangular` | `pyramid_volume_rectangular` | volume | 6 | 6 | Yes — **new G6** |
| 17 | `geometry:kind:cylinder_volume` | `cylinder_volume` | volume | 6 | 6 | Yes — **new G6** |
| 18 | `geometry:kind:cone_volume` | `cone_volume` | volume | 6 | 6 | Yes — **new G6** |
| 19 | `geometry:kind:sphere_volume` | `sphere_volume` | volume | 6 | 6 | Yes — **new G6** |
| — | `geometry:kind:no_question` | `no_question` | meta | 1 | 6 | **No** — meta kind |

### 1A. New in Grade 6 (`minGrade = 6`) — 11 skills

| skill_id | Clearly G6? |
|----------|-------------|
| `geometry:kind:circle_area` | Yes |
| `geometry:kind:circle_perimeter` | Yes |
| `geometry:kind:cone_volume` | Yes |
| `geometry:kind:cylinder_volume` | Yes |
| `geometry:kind:prism_volume_rectangular` | Yes |
| `geometry:kind:prism_volume_triangle` | Yes |
| `geometry:kind:pyramid_volume_rectangular` | Yes |
| `geometry:kind:pyramid_volume_square` | Yes |
| `geometry:kind:pythagoras_hyp` | Yes |
| `geometry:kind:pythagoras_leg` | Yes |
| `geometry:kind:sphere_volume` | Yes |

### 1B. Continuing from earlier grades — 8 skills

| skill_id | Prior page | G6 scope upgrade | Clearly G6? |
|----------|------------|------------------|-------------|
| `geometry:kind:square_perimeter` | G3/G4/G5 | מספרים גדולים יותר | Yes |
| `geometry:kind:triangle_perimeter` | G3/G4/G5 | שלוש צלעות — חזרה | Yes |
| `geometry:kind:square_area` | G2+ | צלע² — חזרה | Yes |
| `geometry:kind:triangle_angles` | G3/G4/G5 | 180° — יישומים | Yes |
| `geometry:kind:parallelogram_area` | G5 | בסיס×גובה — **last grade** | Yes |
| `geometry:kind:trapezoid_area` | G5 | (b1+b2)×h÷2 — **last grade** | Yes |
| `geometry:kind:solids` | G2/G5 | + גליל, פירמידה, חרוט, כדור | Yes |
| `geometry:kind:rectangular_prism_volume` | G4/G5 | a×b×h — חזרה | Yes |

### 1C. Excluded from Grade 6 book

| skill_id / group | Reason |
|------------------|--------|
| `geometry:kind:no_question` | Meta — not teachable |
| `geometry:kind:parallel_perpendicular` | maxGrade = 5 |
| `geometry:kind:quadrilaterals` | maxGrade = 5 |
| `geometry:kind:heights_*` | G5 only (maxGrade = 5) |
| `geometry:kind:diagonal_*` | maxGrade = 5 (G5 covers √ intro) |
| `geometry:kind:tiling` | G5 only |
| `geometry:kind:shapes_basic_*` | G1/G4 only |
| `geometry:kind:triangles` | G3 only |
| `geometry:kind:rotation`, `symmetry`, `transformations` | End before G6 |

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/geometry/g6/drafts/{subtopic}.md`  
`learning_page_id`: `geometry:g6:{subtopic}`  
All pages: `age_band: grades_5_6`, `approval_status: draft`.

| Batch | Order | learning_page_id | skill_id | Draft file | Hebrew title | Learning goal |
|-------|-------|------------------|----------|------------|--------------|---------------|
| A | 1 | `geometry:g6:square_perimeter` | `geometry:kind:square_perimeter` | `square_perimeter.md` | היקף ריבוע — כיתה ו׳ | 4×צלע |
| A | 2 | `geometry:g6:triangle_perimeter` | `geometry:kind:triangle_perimeter` | `triangle_perimeter.md` | היקף משולש — כיתה ו׳ | סכום צלעות |
| A | 3 | `geometry:g6:square_area` | `geometry:kind:square_area` | `square_area.md` | שטח ריבוע — כיתה ו׳ | צלע² |
| A | 4 | `geometry:g6:parallelogram_area` | `geometry:kind:parallelogram_area` | `parallelogram_area.md` | שטח מקבילית — כיתה ו׳ | בסיס×גובה |
| A | 5 | `geometry:g6:trapezoid_area` | `geometry:kind:trapezoid_area` | `trapezoid_area.md` | שטח טרפז — כיתה ו׳ | (b1+b2)×h÷2 |
| A | 6 | `geometry:g6:triangle_angles` | `geometry:kind:triangle_angles` | `triangle_angles.md` | זוויות במשולש — כיתה ו׳ | סכום 180° |
| B | 7 | `geometry:g6:circle_perimeter` | `geometry:kind:circle_perimeter` | `circle_perimeter.md` | היקף מעגל | 2×π×r |
| B | 8 | `geometry:g6:circle_area` | `geometry:kind:circle_area` | `circle_area.md` | שטח עיגול | π×r² |
| C | 9 | `geometry:g6:pythagoras_hyp` | `geometry:kind:pythagoras_hyp` | `pythagoras_hyp.md` | משפט פיתגורס — מציאת יתר | a²+b²=c² |
| C | 10 | `geometry:g6:pythagoras_leg` | `geometry:kind:pythagoras_leg` | `pythagoras_leg.md` | משפט פיתגורס — מציאת ניצב | c²−a²=b² |
| D | 11 | `geometry:g6:solids` | `geometry:kind:solids` | `solids.md` | גופים — גליל, פירמידה, חרוט, כדור | שמות ותכונות |
| D | 12 | `geometry:g6:rectangular_prism_volume` | `geometry:kind:rectangular_prism_volume` | `rectangular_prism_volume.md` | נפח תיבה — כיתה ו׳ | a×b×h |
| E | 13 | `geometry:g6:prism_volume_rectangular` | `geometry:kind:prism_volume_rectangular` | `prism_volume_rectangular.md` | נפח מנסרה — בסיס מלבן | שטח בסיס × גובה |
| E | 14 | `geometry:g6:prism_volume_triangle` | `geometry:kind:prism_volume_triangle` | `prism_volume_triangle.md` | נפח מנסרה — בסיס משולש | שטח משולש × גובה |
| F | 15 | `geometry:g6:pyramid_volume_square` | `geometry:kind:pyramid_volume_square` | `pyramid_volume_square.md` | נפח פירמידה — בסיס ריבוע | ⅓×שטח×גובה |
| F | 16 | `geometry:g6:pyramid_volume_rectangular` | `geometry:kind:pyramid_volume_rectangular` | `pyramid_volume_rectangular.md` | נפח פירמידה — בסיס מלבן | ⅓×שטח×גובה |
| G | 17 | `geometry:g6:cylinder_volume` | `geometry:kind:cylinder_volume` | `cylinder_volume.md` | נפח גליל | π×r²×h |
| G | 18 | `geometry:g6:cone_volume` | `geometry:kind:cone_volume` | `cone_volume.md` | נפח חרוט | ⅓×π×r²×h |
| G | 19 | `geometry:g6:sphere_volume` | `geometry:kind:sphere_volume` | `sphere_volume.md` | נפח כדור | (4/3)×π×r³ |

**Page count:** 19.

---

## 3. Batch Grouping

| Batch | Title | Pages | Focus |
|-------|-------|-------|-------|
| **A** | היקף, שטח וזוויות — המשך כיתה ו׳ | 6 | continuing plane geometry |
| **B** | מעגל ועיגול | 2 | circle perimeter + area (π ≈ 3.14) |
| **C** | משפט פיתגורס | 2 | hyp + leg |
| **D** | גופים ונפח בסיסי | 2 | expanded solids + prism volume |
| **E** | נפח מנסרות | 2 | rectangular + triangle base |
| **F** | נפח פירמידות | 2 | square + rectangular base |
| **G** | נפח גליל, חרוט וכדור | 3 | curved solids |

---

## 4. Content Scope Notes

| Page | In scope (G6) | Out of scope |
|------|---------------|--------------|
| `circle_*` | π ≈ 3.14; r given | exact π; radians |
| `pythagoras_*` | integer triples; √ of perfect squares | formal proof |
| `prism_volume_*` | שטח בסיס × גובה | oblique prisms |
| `pyramid_volume_*` | (1/3)×שטח×גובה | slant height |
| `cylinder_volume` | π×r²×h | surface area |
| `cone_volume` | (1/3)×π×r²×h | frustum |
| `sphere_volume` | (4/3)×π×r³ | surface area |
| Continuing pages | larger numbers; G6 tone | re-teach G1 basics |

---

## 5. Section 5 / Section 6 Alignment Plan

| Page | §5 / §6 shared problem anchors |
|------|--------------------------------|
| `square_perimeter` | צלע **12 ס״מ** — בלבול שטח/היקף |
| `triangle_perimeter` | **8, 9, 10 ס״מ** — חסרה צלע |
| `square_area` | צלע **9 ס״מ** — בלבול היקף |
| `parallelogram_area` | ב **10 ס״מ**, ג **6 ס״מ** — צלע במקום גובה |
| `trapezoid_area` | **8, 12, 5 ס״מ** — שכח ÷2 |
| `triangle_angles` | **55°, 65°** — שכח 65° |
| `circle_perimeter` | r **5 ס״מ**, **3.14** — בלבול עם שטח |
| `circle_area` | r **4 ס״מ**, **3.14** — בלבול עם היקף |
| `pythagoras_hyp` | **3, 4 ס״מ** — חיבור במקום ריבועים |
| `pythagoras_leg` | יתר **13**, ניצב **12 ס״מ** — חיבור במקום חיסור |
| `solids` | **גליל** vs **פירמידה** — בסיס עגול |
| `rectangular_prism_volume` | **5×4×6 ס״מ** — שטח פאה |
| `prism_volume_rectangular` | **6×4×10 ס״מ** — שכח שטח בסיס |
| `prism_volume_triangle` | **6, 4, 10 ס״מ** — שכח ÷2 |
| `pyramid_volume_square` | **6, 9 ס״מ** — שכח ÷3 |
| `pyramid_volume_rectangular` | **4×6×9 ס״מ** — שכח ÷3 |
| `cylinder_volume` | r **3**, h **10**, **3.14** — היקף×גובה |
| `cone_volume` | r **3**, h **9**, **3.14** — שכח ÷3 |
| `sphere_volume` | r **3**, **3.14** — π×r² במקום r³ |

---

## 6. Notation / Bidi Risk Notes

| Notation | Pages | Mitigation in content |
|----------|-------|------------------------|
| **ס״מ** | perimeter, Pythagoras, volumes | full token; no split |
| **סמ״ר** | area pages | preferred over מ״ר in drafts |
| **ס״מ³** | volume pages | cubic length unit |
| **3.14, decimals** | circles, curved volumes | π given explicitly |
| **90°, 180°** | triangle_angles | digit+° as unit token |
| **×, ÷2, ÷3, ⅓** | formulas | spaced operators |
| **√, ², ³** | Pythagoras, circles, sphere | kept as LTR expressions |
| **Labels A,B,C** | triangle_angles | short Latin labels |
| **Parentheses** | trapezoid, volumes | no ASCII tables |

**Verifier:** `node scripts/verify-geometry-g6-book-content.mjs` reports all categories for browser review.

---

## 7. Owner-Review Questions

1. **Continuing vs new pages:** Should G6 pages for `square_perimeter`, `square_area`, etc. explicitly reference prior grades, or stand alone?
2. **π = 3.14:** Confirm rounding policy for circle/volume answers (e.g. 31.4 vs 31.40, 50.24 area).
3. **Pythagoras depth:** G5 diagonals introduced √ — is formal “משפט פיתגורס” title OK at G6 without proof?
4. **Sphere/cone/cylinder:** Is full formula set appropriate for all G6 students, or should any be optional enrichment?
5. **Decimal answers:** Pages like `circle_area` (50.24) and `sphere_volume` (113.04) — accept decimals or round to integers in child-facing copy?
6. **All Hebrew titles:** `[DRAFT — not owner-approved]` — batch or domain review?

---

## 8. Deliverables Checklist

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan (this document) | `docs/learning-book/GEOMETRY_GRADE_6_LEARNING_BOOK_PLAN.md` | ✅ |
| Hebrew review pack | `docs/learning-book/GEOMETRY_GRADE_6_HEBREW_REVIEW_PACK.md` | ✅ |
| Draft pages (19) | `docs/learning-book/geometry/g6/drafts/*.md` | ✅ |
| Drafts README | `docs/learning-book/geometry/g6/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-geometry-g6-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-geometry-g6-book-content.mjs` | ✅ |
| Draft manifest | `scripts/lib/geometry-g6-draft-manifest.mjs` | ✅ |
| Draft generator | `scripts/generate-geometry-g6-drafts.mjs` | ✅ |

---

## 9. Explicit Stop Rule

Until owner approves:

- ❌ No runtime registry, routes, SQL, commit, push, deploy
- ❌ No practice CTA / fake mappings
- ✅ Documentation and draft markdown only
