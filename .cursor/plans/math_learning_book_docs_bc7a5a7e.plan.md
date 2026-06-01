---
name: Math Learning Book Docs
overview: Create `docs/learning-book/` with 5 documentation files mapping the existing Math curriculum by grade and laying out the structure for a future grade-appropriate learning book layer. No code, no SQL, no commits.
todos:
  - id: create-folder
    content: "Create docs/learning-book/ folder and file A: MATH_LEARNING_BOOK_MASTER_PLAN.md"
    status: pending
  - id: create-curriculum-map
    content: "Create file B: MATH_LEARNING_BOOK_CURRICULUM_MAP.md with grade-by-grade tables of all 91 math skills"
    status: pending
  - id: create-g1-coverage
    content: "Create file C: MATH_GRADE_1_LEARNING_BOOK_COVERAGE.md with all 18 Grade 1 subtopics covered in depth"
    status: pending
  - id: create-template
    content: "Create file D: MATH_LEARNING_PAGE_TEMPLATE.md with separate structures for grades 1-2, 3-4, and 5-6"
    status: pending
  - id: create-impl-notes
    content: "Create file E: MATH_LEARNING_BOOK_IMPLEMENTATION_NOTES.md with future technical considerations"
    status: pending
isProject: false
---

# Math Learning Book Documentation Plan

## What will be created

A new folder `docs/learning-book/` with 5 markdown files. No app code is touched.

---

## Key Sources Inspected

### Canonical Math curriculum sources found in the repo

- **`data/curriculum-spine/v1/skills.json`** — 423 total skills; 91 tagged `subject: "math"`, 38 tagged `subject: "geometry"`. Each row has: `skill_id`, `topic`, `subtopic`, `minGrade`, `maxGrade`, `cognitive_level`, `description`, `source`. This is the authoritative ID registry for Math skills.
- **`utils/math-constants.js`** — Defines `GRADES` (g1–g6) with per-grade allowed `operations[]` lists and number-range parameters per level (easy/medium/hard). This is the canonical record of which operations are enabled by grade.
- **`utils/math-question-generator.js`** — Procedural question generator; all Math questions are generated here rather than from a static bank.
- **`data/curriculum-spine/v1/schema.json`** — JSON Schema for spine rows; confirms `subject` enum includes `"math"` and `"geometry"` separately.
- **`docs/subtopics/SUBTOPIC_DIAGNOSTIC_LAYER_MASTER_PLAN.md`** — Related planning doc (May 2026). Notes that Math does not yet have dedicated `math-g*-content-map.js` files (unlike Hebrew). The learning-book plan should cross-reference this doc.

### Math topic domains found (91 skills)

| Domain (topic key) | # Skills | Grade range |
|---|---|---|
| `number_sense_and_operations` | 25 | g1–g6 |
| `word_problems` | 12 | g1–g6 |
| `fractions` | 10 | g2–g6 |
| `decimals` | 7 | g3–g6 |
| `division_and_number_theory` | 7 | g2–g6 |
| `multiplication` | 5 | g1–g4 |
| `ratio_scale_and_powers` | 7 | g4–g6 |

Geometry (separate subject, adjacent): 38 skills across `area_and_shapes`, `angles_and_transformations`, `volume`, `pythagoras_and_diagonals`.

### Grade 1 Math subtopics (18 skills from spine)
`add_second_decade`, `add_tens_only`, `add_two`, `cmp`, `eq_add_simple`, `eq_sub_simple`, `mul` (×5 only), `ns_complement10`, `ns_counting_backward`, `ns_counting_forward`, `ns_even_odd`, `ns_neighbors`, `ns_number_line`, `ns_place_tens_units`, `sub_two`, `wp_coins`, `wp_time_date`, `wp_time_days`

Plus geometry (Grade 1 scope): `shapes_basic_rectangle`, `shapes_basic_square`, `transformations`.

---

## Key Findings / Gaps

1. **No `math-g*-content-map.js` files exist** — unlike Hebrew, Math has no per-grade content-map files with weights. The spine (`skills.json`) is the only static catalog. `SUBTOPIC_DIAGNOSTIC_LAYER_MASTER_PLAN.md` flagged this same gap.
2. **Geometry is a separate subject** in the spine (`subject: "geometry"`), not a topic under Math. The learning-book plan must decide: document geometry in a separate future doc, or note adjacency in the Math plan.
3. **No learning pages, no approval workflow** — the learning-book layer does not exist yet anywhere in the codebase.
4. **Some grade-range bindings are wide** (e.g., `add_two` is g1–g6, `cmp` is g1–g6). The learning book must use these skill IDs but cannot rely on `minGrade`/`maxGrade` alone to determine appropriate explanation style — each explanation page must be authored per grade.
5. **`ratio_scale_and_powers`** subtopics (`ratio_find`, `scale_find`, `power_base`, etc.) are only in grades 4–6 and carry no existing learning content.

---

## Files to Create

### A. `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md`

Content:
- Product goal and definition (grade-based book, not generic textbook)
- Why this layer is needed (learning-in-context, not just drilling)
- Future UX concept: a button in a learning/activity flow opens a modal or full page; button placement is TBD and out of scope for this document
- Hard rules: grade-appropriate content only; no fallback to another grade; approved content only; all content tied to an existing `skill_id` from the spine; no freeform AI-generated explanation shown directly to children at this stage
- Proposed age-band structure for explanation style (grades 1–2 / 3–4 / 5–6)
- Proposed content model fields (see template doc)
- Phased rollout sketch (Phase 0: map; Phase 1: author Grade 1; Phase 2: author Grade 2–3; etc.)
- Acceptance criteria
- Out-of-scope items (UI, button placement, SQL, deployment)

### B. `docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md`

Content:
- Grade-by-grade tables (g1–g6) of all Math topic/subtopics found in the spine
- Each row: `skill_id` | `topic` | `subtopic` | `grade scope (min–max)` | `source file` | `needs learning page?` | `recommended page type`
- Page type vocabulary: `concept_foundation`, `visual_intuition`, `step_by_step_procedure`, `word_problem_strategy`, `practice_bridge`, `needs_review`
- Note on Geometry (separate subject, adjacent, out of scope for this doc but cross-referenced)
- Source file column references `data/curriculum-spine/v1/skills.json` and `utils/math-constants.js`

### C. `docs/learning-book/MATH_GRADE_1_LEARNING_BOOK_COVERAGE.md`

Content:
- Full list of all 18 Grade 1 Math subtopics from the spine
- For each subtopic:
  - What the child should understand
  - What a learning page should explain
  - Age-appropriate example types
  - What must NOT appear yet (belongs to later grades)
  - Suggested Hebrew page title (draft, owner-approval required)
- Adjacent Grade 1 Geometry subtopics noted (shapes_basic_rectangle, shapes_basic_square, transformations)

### D. `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md`

Content:
- Reusable template with separate structures for:
  - Grades 1–2 (concrete, visual, minimal text)
  - Grades 3–4 (step-by-step, worked examples)
  - Grades 5–6 (strategy selection, reasonableness checks)
- Each template section includes: field name, purpose note, example placeholder
- Content model fields: `learning_page_id`, `skill_id` (required, must exist in spine), `grade`, `title_hebrew` (draft), `page_type`, `age_band`, `approval_status`, `sections[]`

### E. `docs/learning-book/MATH_LEARNING_BOOK_IMPLEMENTATION_NOTES.md`

Content:
- Future technical considerations only (no code):
  - How a button would resolve a learning page by `subject + grade + skill_id`
  - Why missing content should hide the button (no fallback policy)
  - Modal vs. full page options
  - Approval status lifecycle: `draft → review → approved → active`
  - Possible future relationship to Parent Report, Teacher Report, AI Tutor
  - Relationship to existing `docs/subtopics/SUBTOPIC_DIAGNOSTIC_LAYER_MASTER_PLAN.md`
  - Risks and open questions

---

## Conventions for All Files

- Documentation language: English
- Hebrew UI labels included only as draft examples, clearly marked `[DRAFT — not owner-approved]`
- No app code changed
- No SQL executed
- No commits or deployments
- Geometry noted as adjacent but out of scope for this Math plan
