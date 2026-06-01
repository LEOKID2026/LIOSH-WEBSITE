# Grade 1 Math Learning Book — Decisions & Signoff

**Status:** Documentation only — authoring-phase gate document  
**Date:** June 2026  
**Scope:** Math subject, Grade 1 (`g1`) only  
**Draft content folder:** `docs/learning-book/math/g1/drafts/`

This document consolidates the full Grade 1 Math Learning Book **draft authoring phase** before any Grade 2 authoring or implementation work begins.

**What this document is:** A phase-completion and decision record for owner review.  
**What this document is not:** Final content approval, product copy sign-off, or an implementation go-ahead.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Folder and File Inventory](#2-folder-and-file-inventory)
3. [Owner Draft Decisions Recorded](#3-owner-draft-decisions-recorded)
4. [Grade 1 Content Boundaries](#4-grade-1-content-boundaries)
5. [Product Decisions / Future UX Concepts](#5-product-decisions--future-ux-concepts)
6. [Status and Signoff Gate](#6-status-and-signoff-gate)
7. [Open Questions](#7-open-questions)
8. [Recommended Next Steps](#8-recommended-next-steps)
9. [Explicit Stop Rule](#9-explicit-stop-rule)

---

## 1. Executive Summary

The **Grade 1 Math Learning Book draft authoring phase is complete.**

| Item | Status |
|------|--------|
| Draft pages authored | **19** (all Grade 1 Math skills in curriculum spine) |
| `approval_status` on all pages | **`draft`** — none moved to `review`, `approved`, or `active` |
| Hebrew titles | All marked **`[DRAFT — not owner-approved]`** |
| Authoring batches | A (5) + B (5) + C (5) + D (4) = **19** |
| Polish passes completed | Batches A–D (including Batch C and Batch D mandatory polish) |

**Work explicitly not done during this phase:**

- No UI implemented
- No buttons added
- No runtime registry files created
- No app code changed
- No existing app Hebrew product copy changed
- No SQL executed
- No commit, push, or deploy performed

**Canonical sources used:**

- `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md`
- `docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md`
- `docs/learning-book/MATH_GRADE_1_LEARNING_BOOK_COVERAGE.md`
- `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md`
- `docs/learning-book/MATH_LEARNING_BOOK_IMPLEMENTATION_NOTES.md`
- `docs/learning-book/math/g1/drafts/README.md`
- `data/curriculum-spine/v1/skills.json`
- `utils/math-constants.js` (Grade 1 number range and operations)

---

## 2. Folder and File Inventory

**Root folder:** `docs/learning-book/math/g1/drafts/`  
**Batch tracker:** `docs/learning-book/math/g1/drafts/README.md`

All pages share:

- `subject`: math
- `grade`: g1
- `age_band`: grades_1_2
- `approval_status`: **draft**
- Section 7 heading: **בואו נתרגל!**

---

### Batch A — Number-Line / Number-Sense Foundations

| learning_page_id | skill_id | File path | Draft title | page_type | approval_status |
|------------------|----------|-----------|-------------|-----------|-----------------|
| `math:g1:ns_counting_forward` | `math:kind:ns_counting_forward` | `docs/learning-book/math/g1/drafts/ns_counting_forward.md` | ספירה קדימה על ציר המספרים | visual_intuition | draft |
| `math:g1:ns_counting_backward` | `math:kind:ns_counting_backward` | `docs/learning-book/math/g1/drafts/ns_counting_backward.md` | ספירה לאחור על ציר המספרים | visual_intuition | draft |
| `math:g1:ns_number_line` | `math:kind:ns_number_line` | `docs/learning-book/math/g1/drafts/ns_number_line.md` | ציר המספרים | visual_intuition | draft |
| `math:g1:ns_neighbors` | `math:kind:ns_neighbors` | `docs/learning-book/math/g1/drafts/ns_neighbors.md` | שכנים של מספר | visual_intuition | draft |
| `math:g1:cmp` | `math:kind:cmp` | `docs/learning-book/math/g1/drafts/cmp.md` | השוואת מספרים עם סימני < > = | visual_intuition | draft |

---

### Batch B — Place Value / Operation Foundations

| learning_page_id | skill_id | File path | Draft title | page_type | approval_status |
|------------------|----------|-----------|-------------|-----------|-----------------|
| `math:g1:ns_place_tens_units` | `math:kind:ns_place_tens_units` | `docs/learning-book/math/g1/drafts/ns_place_tens_units.md` | עשרות ואחדות | concept_foundation | draft |
| `math:g1:ns_even_odd` | `math:kind:ns_even_odd` | `docs/learning-book/math/g1/drafts/ns_even_odd.md` | זוגי ואי-זוגי | concept_foundation | draft |
| `math:g1:ns_complement10` | `math:kind:ns_complement10` | `docs/learning-book/math/g1/drafts/ns_complement10.md` | זוגות של עשר | visual_intuition | draft |
| `math:g1:add_second_decade` | `math:kind:add_second_decade` | `docs/learning-book/math/g1/drafts/add_second_decade.md` | חיבור בעשרייה השנייה — מספרים בין 11 ל־19 | concept_foundation | draft |
| `math:g1:add_tens_only` | `math:kind:add_tens_only` | `docs/learning-book/math/g1/drafts/add_tens_only.md` | חיבור עשרות שלמות | visual_intuition | draft |

---

### Batch C — Operation Foundations

| learning_page_id | skill_id | File path | Draft title | page_type | approval_status |
|------------------|----------|-----------|-------------|-----------|-----------------|
| `math:g1:add_two` | `math:kind:add_two` | `docs/learning-book/math/g1/drafts/add_two.md` | חיבור של שני מספרים | visual_intuition | draft |
| `math:g1:sub_two` | `math:kind:sub_two` | `docs/learning-book/math/g1/drafts/sub_two.md` | חיסור של שני מספרים | visual_intuition | draft |
| `math:g1:eq_add_simple` | `math:kind:eq_add_simple` | `docs/learning-book/math/g1/drafts/eq_add_simple.md` | משפט חיבור עם מספר חסר | concept_foundation | draft |
| `math:g1:eq_sub_simple` | `math:kind:eq_sub_simple` | `docs/learning-book/math/g1/drafts/eq_sub_simple.md` | משפט חיסור עם מספר חסר | concept_foundation | draft |
| `math:g1:mul` | `math:kind:mul` | `docs/learning-book/math/g1/drafts/mul.md` | כפל — חיבור חוזר | visual_intuition | draft |

---

### Batch D — Word Problems

| learning_page_id | skill_id | File path | Draft title | page_type | approval_status |
|------------------|----------|-----------|-------------|-----------|-----------------|
| `math:g1:wp_coins` | `math:kind:wp_coins` | `docs/learning-book/math/g1/drafts/wp_coins.md` | שאלות מילוליות — ערך מטבעות | word_problem_strategy | draft |
| `math:g1:wp_coins_spent` | `math:kind:wp_coins_spent` | `docs/learning-book/math/g1/drafts/wp_coins_spent.md` | שאלות מילוליות — כמה נשאר או עודף | word_problem_strategy | draft |
| `math:g1:wp_time_date` | `math:kind:wp_time_date` | `docs/learning-book/math/g1/drafts/wp_time_date.md` | שאלות מילוליות — ימים ותאריכים | word_problem_strategy | draft |
| `math:g1:wp_time_days` | `math:kind:wp_time_days` | `docs/learning-book/math/g1/drafts/wp_time_days.md` | שאלות מילוליות — מרחק בין ימים | word_problem_strategy | draft |

**Total:** 19 pages inventoried.

---

## 3. Owner Draft Decisions Recorded

The following decisions were made during batch review and polish passes. They are **accepted for continued draft use** unless the owner explicitly changes them during final sign-off.

### Structure and style

| Decision | Value / rule |
|----------|--------------|
| Shared section 7 heading | **`בואו נתרגל!`** on all 19 pages |
| Page structure | Grades 1–2 template: 7 sections (מה אנחנו לומדים?, הסבר פשוט, דוגמה ויזואלית, בואו נפתור יחד, נסו בעצמכם, טעות נפוצה, בואו נתרגל!) |
| One concept per page | Short Hebrew sentences; one worked example; one try-it-yourself; one common mistake |

### Terminology and metaphors

| Decision | Value / rule |
|----------|--------------|
| Comparison metaphor (`cmp.md`) | **`תנין רעב`** kept for Grade 1 comparison draft (child-friendly; draft only) |
| Ten-frame term | **`מסגרת עשר`** (not "מסגרת של 10") |
| Place-value blocks | **`מקל עשרת`**, **`קוביות בודדות`** |
| Even/odd method | **Pairing first**; last-digit rule only as **`טיפ`** |
| Missing-number language | **`מספר חסר`**, **`מקום ריק`** — not variables or formal algebra |
| Missing-number titles | **`משפט חיבור עם מספר חסר`**, **`משפט חיסור עם מספר חסר`** |

### Scope and examples

| Decision | Value / rule |
|----------|--------------|
| `add_tens_only` | Grade 1 cap **30**; whole tens **10, 20, 30 only** |
| `add_second_decade` title | **`חיבור בעשרייה השנייה — מספרים בין 11 ל־19`** |
| `mul` approach | **Repeated addition / equal groups only** — no full multiplication table |
| `4 × 3 = 12` in `mul.md` | **Accepted for draft use** — product ≤ 20, within Grade 1 scope |
| Number-line / jump counting | Do **not** count the starting number as the first jump (applied in `add_two`, `sub_two`, `wp_time_days`, and related pages) |
| Word-problem reading frame (Batch D) | **`מה יודעים? / מה מבקשים? / מה עושים?`** |
| Coin pages | Simple **₪** examples; **repeated addition only** — no multiplication for coin totals |
| Day-counting | Same rule as number-line jumps: **do not count the start day as the first jump**; do not stop before the target day |

### Polish fixes recorded (for traceability)

| Batch | Notable fixes |
|-------|---------------|
| A | Section 7 heading; typos (חיפושית, לפני המראה, קל לטעות); negative-number scope wording |
| B | `add_second_decade` title; ten-frame and place-value terms; even/odd pairing-first; `add_tens_only` cap 30 |
| C | `שתי כמויות`; subtraction visual (8−3); missing-number wording; removed child-facing **`גורמים`**; `add_two` worked example jump wording |
| D | `wp_coins` arithmetic fix (13₪); `wp_time_days` day-counting mistake wording |

### Title status

All 19 Hebrew titles remain **`[DRAFT — not owner-approved]`**. Batch A–C titles accepted for **continued draft use**; Batch D titles recorded as **draft only** pending owner review.

---

## 4. Grade 1 Content Boundaries

Grade 1 learning pages must stay within the Grade 1 Math scope defined in `MATH_GRADE_1_LEARNING_BOOK_COVERAGE.md`, `utils/math-constants.js`, and the master plan hard rules.

### Must NOT appear on Grade 1 pages

| Exclusion | Notes |
|-----------|-------|
| Vertical algorithms | No column addition/subtraction layout as main method |
| Carrying / regrouping | No "נשיאה" in addition |
| Borrowing | No "שאילה" in subtraction |
| Division | Not in Grade 1 spine operations for these pages |
| Fractions | Out of Grade 1 scope |
| Decimals | Out of Grade 1 scope |
| Negative numbers | Subtraction not below 0 |
| Formal algebra or variables | Use **`מספר חסר`** / **`מקום ריק`** / `__` only |
| Full multiplication table | `mul` is repeated addition / equal groups only |
| Multi-step word problems | Single-step word problems only in Batch D |
| Clock-reading | Not on day/date word-problem pages (`wp_time_date`, `wp_time_days`) |
| Month/year arithmetic | Weekday-only calendar scope for Grade 1 drafts |
| Fallback to another grade | If no approved page exists for `subject + grade + skill_id`, hide explanation — do not show another grade's page |

### Grade 1 numeric scope (authoring constraint)

- Primary working range: **0–30** (per `utils/math-constants.js` and coverage doc)
- `add_tens_only`: sums capped at **30**; tens **10, 20, 30** only
- `add_second_decade`: sums up to **20**
- `mul`: groups up to **5**; product up to **20**
- Word problems: amounts and counts within Grade 1 range; no multi-item purchases on `wp_coins_spent`

### Shared page conventions (Grade 1)

- Concrete visuals: number line, objects, ten-frame (`מסגרת עשר`), weekday row
- One main idea per page
- Child-facing Hebrew; short sentences
- Final section: **`בואו נתרגל!`**

---

## 5. Product Decisions / Future UX Concepts

These directions come from `MATH_LEARNING_BOOK_MASTER_PLAN.md` and `MATH_LEARNING_BOOK_IMPLEMENTATION_NOTES.md`. **No implementation decision has been made yet.**

### Product model

- This is a **grade-based digital learning book**, not one generic Math textbook.
- Pages are organized by **subject → grade → skill/topic**.
- Each grade has its own explanation pages for the same underlying `skill_id` where the curriculum spans multiple grades.
- Content is tied to existing **`skill_id`** entries in `data/curriculum-spine/v1/skills.json`.
- Resolution key: **`subject + grade + skill_id`** → `learning_page_id` (e.g. `math:g1:add_two`).

### Future UX concepts (not built)

The product may eventually support:

| Concept | Description |
|---------|-------------|
| Explanation entry from activity | Small "learn this" / explanation control near a practice question |
| Full subject learning book | Browse all Grade 1 Math pages from a subject homepage |
| Table of contents | Ordered list of skills/topics for the grade |
| Page navigation / browsing | Move between learning pages within the book |
| Images or diagrams | Illustrated versions of text-only visual descriptions in drafts |
| Worked examples | Already authored in draft markdown; future UI may render step-by-step |
| Short animations or videos | Optional future enrichment — not required for Phase 1 content |

### Hard product rules (for future implementation)

- **No fallback** to another grade's page if the exact grade page is missing or not active.
- **Approved content only** — drafts must not be shown to children until owner moves status to `approved` / `active`.
- Button / link **hidden entirely** when no active page exists (better than showing wrong-grade content).

---

## 6. Status and Signoff Gate

### Current status

| Field | Value |
|-------|-------|
| Pages authored | **19 / 19** Grade 1 Math skills |
| `approval_status` | **`draft`** on all 19 pages |
| Hebrew titles | **`[DRAFT — not owner-approved]`** on all 19 pages |
| Runtime registry | **Not created** |
| App integration | **Not started** |

### What this signoff confirms

- The **Grade 1 draft authoring phase is complete**.
- All curriculum-aligned Grade 1 Math skill pages exist as markdown drafts.
- Owner draft decisions from Batches A–D are consolidated in this document.
- Polish passes are recorded; known arithmetic and wording fixes are applied.

### What this signoff does NOT confirm

- **Not final content approval** — Hebrew text has not received final owner sign-off for product use.
- **Not title approval** — all titles remain draft-marked.
- **Not implementation approval** — no UI, registry, or display work is authorized by this document alone.
- **Not permission to show content to children** — pages must reach `approved` / `active` through the approval lifecycle before any student-facing use.

### Owner review checklist (before moving any page to `review`)

- [ ] Read full Hebrew page content
- [ ] Confirm grade scope matches `MATH_GRADE_1_LEARNING_BOOK_COVERAGE.md`
- [ ] Confirm `skill_id` matches `skills.json`
- [ ] Confirm title is acceptable (remove `[DRAFT — not owner-approved]` only after explicit approval)
- [ ] Confirm visual asset direction (text-only vs illustrated)
- [ ] Record reviewer and date when moving to `review`

---

## 7. Open Questions

The following items remain **unresolved** and require owner decision before final content approval or implementation planning.

### Titles and language

1. **Final Hebrew title approval** — all 19 pages need explicit owner approval of `title_hebrew` before product use.
2. **"שכן לפני / שכן אחרי"** — confirm this matches final classroom language for `ns_neighbors.md` (vs alternatives used in school materials).

### Visuals and layout

3. **RTL number-line visual standard** — drafts use **0 on the left, larger numbers to the right**; confirm this matches future product visuals in an RTL UI.
4. **Visual asset direction** — drafts are text descriptions only; decide for Phase 1: text-only, static illustrations, diagrams, and/or future animations.

### Batch D (word problems)

5. **Word-problem reading frame** — confirm **`מה יודעים? / מה מבקשים? / מה עושים?`** as the standard scaffold for Grade 1 word-problem pages.
6. **`wp_coins_spent` title** — confirm draft **`שאלות מילוליות — כמה נשאר או עודף`** vs shorter alternatives.
7. **Calendar scope** — confirm weekday-only approach (no month-date arithmetic like "ה-3 לחודש") for Grade 1 `wp_time_date`.

### Phase direction

8. **Next phase choice** — after owner review of this signoff:
   - Move to **Grade 2 authoring**, or
   - First **plan implementation / display** for Grade 1 only, or
   - **Owner review and polish** of Grade 1 Hebrew text first, or
   - **Hebrew style guide addendum** before either path

---

## 8. Recommended Next Steps

These are **options only**. None are executed by this document.

### Option A — Owner review and polish Grade 1 text

- Read all 19 draft pages in Hebrew end-to-end.
- Resolve open questions in Section 7.
- Approve or revise titles and terminology.
- Move selected pages to `review` when ready.

### Option B — Create a Hebrew style guide addendum

- Document learning-book-specific Hebrew conventions (section headings, metaphors, number-line jump language, word-problem frame, coin/day vocabulary).
- Align with existing app Hebrew copy policies without changing app strings yet.

### Option C — Begin Grade 2 authoring

- Use the same documentation workflow and template (Grades 1–2 age band where applicable).
- Do **not** start until owner has reviewed this signoff document.

### Option D — Plan future display / implementation for Grade 1 only

- Choose content storage approach (see `MATH_LEARNING_BOOK_IMPLEMENTATION_NOTES.md`).
- Design registry schema and approval lifecycle wiring.
- Prototype TOC and page navigation for Grade 1 Math only.
- Still requires approved content before student-facing release.

---

## 9. Explicit Stop Rule

> **Do not proceed to Grade 2 authoring or implementation until this signoff document is reviewed by the owner.**

After owner review, the owner should explicitly choose one path from Section 8 before any new work begins.

---

## Document History

| Date | Event |
|------|-------|
| June 2026 | Grade 1 draft authoring complete (19 pages, Batches A–D) |
| June 2026 | Batch C and Batch D polish passes completed |
| June 2026 | This signoff document created — authoring phase gate |

---

## Related Files

| File | Role |
|------|------|
| `docs/learning-book/math/g1/drafts/README.md` | Batch tracker, polish status, confirmations |
| `docs/learning-book/math/g1/drafts/*.md` | 19 draft learning pages |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Product rules and UX direction |
| `docs/learning-book/MATH_GRADE_1_LEARNING_BOOK_COVERAGE.md` | Per-skill Grade 1 scope |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Section structure template |
