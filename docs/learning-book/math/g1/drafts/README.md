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

- `ns_place_tens_units`: two-digit numbers up to 30; tens and units only (no hundreds)
- `ns_even_odd`: numbers 1–20; pairing strategy + last-digit tip
- `ns_complement10`: pairs summing to 10 only; ten-frame visual
- `add_second_decade`: sums landing in 11–19; "complete to 10" strategy; max sum 20
- `add_tens_only`: whole tens only (10, 20, 30); max sum 30 for Grade 1

---

## All Draft Pages Summary

| Batch | Files | Status |
|-------|-------|--------|
| A | 5 | draft |
| B | 5 | draft |
| **Total** | **10** | **all draft** |

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

- All **10** learning pages are **draft only** (`approval_status: draft`).
- No page is set to `review`, `approved`, or `active`.
- **No app code** was changed.
- **No UI or buttons** were added.
- **No runtime registry files** were created.
- **No Hebrew product copy in the app** was changed.
- **No SQL** was executed.
- **No commit, push, or deploy** was performed.

---

## Open Questions for Owner Review (Batch B)

### Hebrew titles (draft — not owner-approved)

| learning_page_id | Draft title |
|------------------|-------------|
| `math:g1:ns_place_tens_units` | עשרות ואחדות |
| `math:g1:ns_even_odd` | זוגי ואי-זוגי |
| `math:g1:ns_complement10` | זוגות של עשר |
| `math:g1:add_second_decade` | חיבור בעשרייה השנייה (11–19) |
| `math:g1:add_tens_only` | חיבור עשרות שלמות |

### Wording and content

1. **"עשרייה השנייה"** — is this term used in the product/classroom, or should a simpler phrase be used (e.g., "מספרים בין 11 ל-19")?
2. **"מסגרת של 10" (ten-frame)** — confirm this visual term matches existing product language.
3. **"מקל / קוביות" (base-10 blocks)** — confirm block/rod terminology for place value pages.
4. **Even/odd last-digit rule** — introduced as a shortcut after pairing; confirm acceptable for Grade 1 or pairing-only preferred.
5. **`add_tens_only` number range** — Batch B caps at sum 30 (10+20); confirm this matches Grade 1 scope vs. using 50 or 70 in examples.

### Still open from Batch A

6. **"שכן לפני / שכן אחרי"** — confirm classroom language match.
7. **RTL number-line direction** — confirm 0-left matches product visuals.
8. **Visual assets** — text descriptions only; confirm illustrated assets for Phase 1.

---

## Recommended Next Step

1. **Owner review** of Batch B draft titles and wording (especially "עשרייה השנייה" and ten-frame terminology).
2. **Batch C authoring** — remaining Grade 1 skills:
   - `add_two`, `sub_two`
   - `eq_add_simple`, `eq_sub_simple`
   - `mul`
   - `wp_coins`, `wp_coins_spent`, `wp_time_date`, `wp_time_days`
3. After Batch B review, apply any wording fixes before Batch C.
