# Grade 1 Math Learning Book — Drafts

**Status:** Draft content only. No code. No UI. No SQL. No commit/push/deploy.
**Date:** June 2026
**Folder:** `docs/learning-book/math/g1/drafts/`

---

## Owner Decisions (Recorded)

| Decision | Status |
|----------|--------|
| Shared section 7 heading | **Approved for draft use:** `בואו נתרגל!` |
| Crocodile metaphor (`cmp.md`) | **Keep for Grade 1 draft:** `תנין רעב` — child-friendly, draft content only (not final owner-approved product copy) |
| Batch A Hebrew titles | **Accepted for continued draft use** — all remain `[DRAFT — not owner-approved]` |
| Batch B Hebrew titles | **Accepted for continued draft use** — all remain `[DRAFT — not owner-approved]` |
| `add_second_decade` title | **Draft use:** `חיבור בעשרייה השנייה — מספרים בין 11 ל־19` (keep concept "עשרייה השנייה", child-clear) |
| Ten-frame term | **Draft use:** `מסגרת עשר` (standardized; not "מסגרת של 10") |
| Place-value blocks | **Draft use:** `מקל עשרת`, `קוביות בודדות` |
| Even/odd method | **Pairing first**; last-digit rule as **טיפ** only |
| `add_tens_only` scope | **Grade 1 cap: 30** — use 10, 20, 30 only |
| Batch C Hebrew titles | **Accepted for continued draft use** — all remain `[DRAFT — not owner-approved]` |
| Batch C polish pass | **Accepted for continued draft use** (June 2026) |
| Batch D Hebrew titles | **Draft only** — all remain `[DRAFT — not owner-approved]` |
| Missing-number language | **Draft use:** `מספר חסר`, `מקום ריק` — not variables/algebra |
| Missing-number titles | **Draft use:** `משפט חיבור/חיסור עם מספר חסר` |
| `mul` example 4 × 3 = 12 | **Accepted for draft use** — within Grade 1 scope (product ≤ 20) |
| All pages | **`approval_status: draft`** — nothing moved to review/approved/active |

---

## Batch A — Number-Line / Number-Sense Foundations

**Focus:** Number-line and number-sense foundations

| File | learning_page_id | skill_id | page_type |
|------|------------------|----------|-----------|
| `ns_counting_forward.md` | `math:g1:ns_counting_forward` | `math:kind:ns_counting_forward` | visual_intuition |
| `ns_counting_backward.md` | `math:g1:ns_counting_backward` | `math:kind:ns_counting_backward` | visual_intuition |
| `ns_number_line.md` | `math:g1:ns_number_line` | `math:kind:ns_number_line` | visual_intuition |
| `ns_neighbors.md` | `math:g1:ns_neighbors` | `math:kind:ns_neighbors` | visual_intuition |
| `cmp.md` | `math:g1:cmp` | `math:kind:cmp` | visual_intuition |

### Batch A Polish Status

**Polish pass completed:** June 2026

| Fix | Detail |
|-----|--------|
| Section 7 heading | **"בואו נתרגל!"** on all 5 pages |
| Typos | חיפושית, לפני המראה, קל לטעות |
| Scope wording | Negative-number note scoped to Grade 1 page |

---

## Batch B — Place Value / Operations Foundations

**Focus:** Place value, even/odd, complements of 10, addition in teens, adding whole tens

| File | learning_page_id | skill_id | page_type |
|------|------------------|----------|-----------|
| `ns_place_tens_units.md` | `math:g1:ns_place_tens_units` | `math:kind:ns_place_tens_units` | concept_foundation |
| `ns_even_odd.md` | `math:g1:ns_even_odd` | `math:kind:ns_even_odd` | concept_foundation |
| `ns_complement10.md` | `math:g1:ns_complement10` | `math:kind:ns_complement10` | visual_intuition |
| `add_second_decade.md` | `math:g1:add_second_decade` | `math:kind:add_second_decade` | concept_foundation |
| `add_tens_only.md` | `math:g1:add_tens_only` | `math:kind:add_tens_only` | visual_intuition |

All Batch B pages:
- `subject`: math
- `grade`: g1
- `age_band`: grades_1_2
- `approval_status`: **draft**
- Section 7 heading: **בואו נתרגל!**
- All Hebrew titles: **`[DRAFT — not owner-approved]`**

### Batch B Content Scope Notes

- `ns_place_tens_units`: two-digit numbers up to 30; `מקל עשרת` / `קוביות בודדות`; no expanded `+` notation as main explanation
- `ns_even_odd`: numbers 1–20; **pairing first**; last-digit rule as **טיפ** only
- `ns_complement10`: pairs summing to 10; visual term **`מסגרת עשר`**
- `add_second_decade`: title **`חיבור בעשרייה השנייה — מספרים בין 11 ל־19`**; "complete to 10" strategy; max sum 20
- `add_tens_only`: **10, 20, 30 only**; max sum 30; wording **`בכיתה א' נשתמש בעשרות 10, 20 ו־30`**

### Batch B Polish Status

**Polish pass completed:** June 2026

| Fix | Detail |
|-----|--------|
| `add_second_decade` title | Updated to **`חיבור בעשרייה השנייה — מספרים בין 11 ל־19`**; child-clear explanation of עשרייה שנייה throughout |
| Ten-frame term | Standardized to **`מסגרת עשר`** (`ns_complement10.md`) |
| Place-value terms | Standardized to **`מקל עשרת`**, **`קוביות בודדות`**; removed `10 + 7` style as main explanation |
| Even/odd | Pairing as main method; last-digit rule demoted to **טיפ**; clearer wording for 11 example |
| `add_tens_only` scope | Explicit **Grade 1 cap 30**; removed ellipsis implying 40/50/100 |

**Confirmation:** All Batch B pages remain **`approval_status: draft`**. All titles remain **`[DRAFT — not owner-approved]`**.

---

## Batch C — Operation Foundations

**Focus:** Basic addition, subtraction, missing-number sentences, early multiplication (no word problems)

| File | learning_page_id | skill_id | page_type |
|------|------------------|----------|-----------|
| `add_two.md` | `math:g1:add_two` | `math:kind:add_two` | visual_intuition |
| `sub_two.md` | `math:g1:sub_two` | `math:kind:sub_two` | visual_intuition |
| `eq_add_simple.md` | `math:g1:eq_add_simple` | `math:kind:eq_add_simple` | concept_foundation |
| `eq_sub_simple.md` | `math:g1:eq_sub_simple` | `math:kind:eq_sub_simple` | concept_foundation |
| `mul.md` | `math:g1:mul` | `math:kind:mul` | visual_intuition |

All Batch C pages:
- `subject`: math
- `grade`: g1
- `age_band`: grades_1_2
- `approval_status`: **draft**
- Section 7 heading: **בואו נתרגל!**
- All Hebrew titles: **`[DRAFT — not owner-approved]`**

### Batch C Content Scope Notes

- `add_two`: joining two groups; number line / objects; sums up to 30; no vertical addition
- `sub_two`: taking away / moving backward; not below 0; no borrowing or vertical subtraction
- `eq_add_simple`: missing number as puzzle; `__` / `מספר חסר`; links to `מסגרת עשר` where helpful
- `eq_sub_simple`: missing number in subtraction; concrete number line / objects; no formal algebra
- `mul`: repeated addition / equal groups only; **קבוצות עד 5, תוצאה עד 20**; `4 × 3 = 12` accepted; no full times table, no division

### Batch C Draft Titles

| learning_page_id | Draft title |
|------------------|-------------|
| `math:g1:add_two` | חיבור של שני מספרים |
| `math:g1:sub_two` | חיסור של שני מספרים |
| `math:g1:eq_add_simple` | משפט חיבור עם מספר חסר |
| `math:g1:eq_sub_simple` | משפט חיסור עם מספר חסר |
| `math:g1:mul` | כפל — חיבור חוזר |

### Batch C Polish Status

**Polish pass completed:** June 2026

| Fix | Detail |
|-----|--------|
| `add_two.md` | `שני כמויות` → **`שתי כמויות`**; common-mistake section clarified (first number counted as first jump) |
| `sub_two.md` | Fixed 8−3 visual: **3 נלקחו, 5 נשארו** (was reversed) |
| `eq_add_simple.md` | `לעוד` → **`להוסיף`** |
| `eq_sub_simple.md` | Simplified missing-start-number wording; fixed 8−__=3 visual (**5 נלקחו, 3 נשארו**) |
| `mul.md` | Removed child-facing **`גורמים`**; scope wording **`בכיתה א' נשתמש בכפל קטן: קבוצות עד 5, והתוצאה עד 20`** |

**Confirmation:** All Batch C pages remain **`approval_status: draft`**. All titles remain **`[DRAFT — not owner-approved]`**.

**Batch C polish accepted:** June 2026 — owner confirmed continued draft use (titles, missing-number language, `4 × 3 = 12`, multiplication scope).

**Carry-forward polish:** `add_two.md` worked example — `ספרו את הכל` → **`ספרו עוד 3 אחרי 5: 6, 7, 8`**

---

## Batch D — Word Problems

**Focus:** Reading simple word problems — coins, spending/change, days and calendar

| File | learning_page_id | skill_id | page_type |
|------|------------------|----------|-----------|
| `wp_coins.md` | `math:g1:wp_coins` | `math:kind:wp_coins` | word_problem_strategy |
| `wp_coins_spent.md` | `math:g1:wp_coins_spent` | `math:kind:wp_coins_spent` | word_problem_strategy |
| `wp_time_date.md` | `math:g1:wp_time_date` | `math:kind:wp_time_date` | word_problem_strategy |
| `wp_time_days.md` | `math:g1:wp_time_days` | `math:kind:wp_time_days` | word_problem_strategy |

All Batch D pages:
- `subject`: math
- `grade`: g1
- `age_band`: grades_1_2
- `approval_status`: **draft**
- Section 7 heading: **בואו נתרגל!**
- All Hebrew titles: **`[DRAFT — not owner-approved]`**

### Batch D Content Scope Notes

- `wp_coins`: coin values added together; "how much altogether?"; repeated addition only; no spending/change, no multiplication
- `wp_coins_spent`: had / spent / left; simple change (paid 10, cost 7, change 3); subtraction only; no multi-item purchases
- `wp_time_date`: days of the week; today/tomorrow/yesterday; "in 2 days"; no clock, no months/years
- `wp_time_days`: counting days forward/backward on a weekday row; within one week; no clock, no months/years

### Batch D Draft Titles

| learning_page_id | Draft title |
|------------------|-------------|
| `math:g1:wp_coins` | שאלות מילוליות — ערך מטבעות |
| `math:g1:wp_coins_spent` | שאלות מילוליות — כמה נשאר או עודף |
| `math:g1:wp_time_date` | שאלות מילוליות — ימים ותאריכים |
| `math:g1:wp_time_days` | שאלות מילוליות — מרחק בין ימים |

**Confirmation:** All Batch D pages remain **`approval_status: draft`**. All titles remain **`[DRAFT — not owner-approved]`**.

### Batch D Polish Status

**Polish pass completed:** June 2026

| Fix | Detail |
|-----|--------|
| `wp_coins.md` | Fixed worked-example arithmetic: **12₪ → 13₪** (`5 + 5 + 1 + 1 + 1 = 13`); visual example **5 + 5 + 2 = 12** unchanged |
| `wp_time_days.md` | Clarified day-counting common mistake — do not count start day as first jump; do not stop before target day |

**Confirmation:** All **19** pages remain **`approval_status: draft`**. All titles remain **`[DRAFT — not owner-approved]`**. No code, UI, runtime registry, SQL, commit, push, or deploy.

---

## All Draft Pages Summary

| Batch | Files | Status |
|-------|-------|--------|
| A | 5 | draft |
| B | 5 | draft |
| C | 5 | draft |
| D | 4 | draft |
| **Total** | **19** | **all draft** |

**Grade 1 Math Learning Book:** All **19** skill pages now exist as drafts in this folder.

---

## Source Documents Used

| Document | Role |
|----------|------|
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Product rules, hard constraints, age-band policy |
| `docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md` | Skill IDs, page types, grade scope |
| `docs/learning-book/MATH_GRADE_1_LEARNING_BOOK_COVERAGE.md` | Per-skill content guidance and exclusions |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 1–2 section structure |
| `docs/learning-book/MATH_LEARNING_BOOK_IMPLEMENTATION_NOTES.md` | No-fallback and approval lifecycle reference |
| `data/curriculum-spine/v1/skills.json` | Canonical skill_id registry |
| `utils/math-constants.js` | Grade 1 number range (0–30 max) |

---

## Confirmations

- All **19** learning pages are **draft only** (`approval_status: draft`).
- No page is set to `review`, `approved`, or `active`.
- All Hebrew titles remain **`[DRAFT — not owner-approved]`**.
- **No app code** was changed.
- **No UI or buttons** were added.
- **No runtime registry files** were created.
- **No Hebrew product copy in the app** was changed.
- **No SQL** was executed.
- **No commit, push, or deploy** was performed.

---

## Open Questions for Owner Review

### Batch B — resolved for draft use (polish pass)

The following were decided for continued **draft** use (not final owner-approved product copy):

| Topic | Decision |
|-------|----------|
| `add_second_decade` title | `חיבור בעשרייה השנייה — מספרים בין 11 ל־19` |
| Ten-frame | `מסגרת עשר` |
| Place value | `מקל עשרת`, `קוביות בודדות` |
| Even/odd | Pairing first; last-digit as **טיפ** |
| `add_tens_only` | Cap at 30; 10, 20, 30 only |

### Batch C — resolved for draft use (polish pass)

| Topic | Decision |
|-------|----------|
| Missing-number titles | `משפט חיבור/חיסור עם מספר חסר` |
| Missing-number language | `מספר חסר`, `מקום ריק` |
| `4 × 3 = 12` in `mul.md` | Accepted — within Grade 1 scope (product ≤ 20) |

### Still open (Batch A + general)

1. **"שכן לפני / שכן אחרי"** — confirm classroom language match.
2. **RTL number-line direction** — confirm 0-left matches product visuals.
3. **Visual assets** — text descriptions only; confirm illustrated assets for Phase 1.
4. **Final title approval** — all 19 pages remain `[DRAFT — not owner-approved]` until explicit owner sign-off.

### Batch D — pending owner review

| Topic | Notes |
|-------|-------|
| Word-problem reading frame | `מה יודעים?` / `מה מבקשים?` / `מה עושים?` on all 4 pages |
| Coin addition | Repeated addition only — no multiplication on `wp_coins` |
| `wp_coins_spent` title | Draft: `שאלות מילוליות — כמה נשאר או עודף` |
| Calendar scope | Weekday names only — no clock, no month/year arithmetic |
| Day-counting | Within one week; same "don't count start as first jump" pattern as number line |

---

## Recommended Next Step

1. **Create the Grade 1 decisions/signoff document** — consolidate all owner draft decisions (Batches A–D), open questions, and sign-off checklist for `draft` → `review`.
2. **Owner review** of Batch D polish pass and full Grade 1 draft set.
3. After Grade 1 signoff, consider a **Hebrew style guide addendum**, then begin Grade 2 or implementation planning.

**Do not proceed to Grade 2 or implementation until the Grade 1 signoff document is reviewed.**
