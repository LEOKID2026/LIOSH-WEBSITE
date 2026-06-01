# Grade 2 Math Learning Book — Drafts

**Status:** All batches authored — **22 / 22** draft pages complete (Batches A + B + C + D). Full review polish pass applied (June 2026). Owner review pending.  
**Date:** June 2026  
**Folder:** `docs/learning-book/math/g2/drafts/`

---

## Current Status

| Item | Status |
|------|--------|
| Curriculum plan | ✅ `docs/learning-book/MATH_GRADE_2_LEARNING_BOOK_PLAN.md` |
| UI style lock | ✅ `docs/learning-book/MATH_LEARNING_BOOK_UI_STYLE_LOCK.md` |
| Draft markdown pages | ✅ **22 / 22** (Batches A + B + C + D) |
| Batch A polish pass | ✅ Applied (June 2026) |
| Batch B polish pass | ✅ Applied (June 2026) |
| Batch C authoring | ✅ Complete + polish pass applied (June 2026) |
| Batch D authoring | ✅ Complete (June 2026) — owner review pending |
| Full review polish pass | ✅ Applied (June 2026) |
| Runtime registry | ✅ `lib/learning-book/math-g2-registry.js` |
| Page loader | ✅ `lib/learning-book/load-math-g2-pages.js` |
| App route `/learning/book/math/g2` | ✅ Implemented (dev preview) |
| Practice CTA resolver (G2) | ✅ `lib/learning-book/resolve-math-g2-practice-target.js` |
| Book page resolver (G2) | ✅ `lib/learning-book/resolve-math-g2-book-page.js` |
| Math Master book entry | ✅ General tile + topic + in-learning buttons (g2) |
| Verification script | ✅ `scripts/verify-math-g2-book.mjs` |

---

## Owner Decisions (Recorded — June 2026)

| Topic | Decision |
|-------|----------|
| UI / reader | Reuse Grade 1 book reader — no redesign |
| `divisibility` | **2, 5, 10 only** in G2; child-facing last-digit rules; no 3/6/9 |
| Fractions (Batch C) | **Visual only** — half and quarter; no fraction arithmetic |
| `frac_*_reverse` | Doubling (half) or 4 equal parts (quarter) to find whole |
| `wp_time_date` / `wp_time_days` | **Weekdays only** for G2 (Batch D) |
| `wp_coins` | Simple equal groups / multiplication allowed (Batch D) |

---

## Source of Truth

| Document / file | Role |
|-----------------|------|
| `data/curriculum-spine/v1/skills.json` | All 22 Grade 2 Math `skill_id` entries |
| `docs/learning-book/MATH_GRADE_2_LEARNING_BOOK_PLAN.md` | Page list, batches, boundaries |
| `docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md` | Page types and wide-span rules |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Seven-section Grades 1–2 template |
| `docs/learning-book/MATH_LEARNING_BOOK_UI_STYLE_LOCK.md` | Reader UX — reuse Grade 1 |
| `utils/math-constants.js` | Grade 2 number ranges and allowed operations |
| `docs/learning-book/math/g1/drafts/` | **Style reference only** |

---

## Batch A — יסודות מספרים והשוואה

**Status:** ✅ Draft complete + polish pass applied

| File | Draft title |
|------|-------------|
| `ns_place_tens_units.md` | מאות, עשרות ואחדות — עד 1,000 |
| `ns_neighbors.md` | שכנים של מספר — מספרים גדולים יותר |
| `ns_complement10.md` | זוגות שמרכיבים 10 — עזר לחיבור |
| `ns_even_odd.md` | זוגי ואי-זוגי — חזרה ותרגול |
| `cmp.md` | השוואת מספרים עד 1,000 |

---

## Batch B — חיבור, חיסור, כפל וחילוק

**Status:** ✅ Draft complete + polish pass applied

| File | Draft title |
|------|-------------|
| `add_two.md` | חיבור של שני מספרים — עד 100 |
| `sub_two.md` | חיסור של שני מספרים — עד 100 |
| `add_vertical.md` | חיבור במאונך |
| `sub_vertical.md` | חיסור במאונך |
| `mul.md` | לוח הכפל — קבוצות שוות |
| `div.md` | חילוק — חלוקה שווה |

---

## Batch C — התחלקות ושברים

**Status:** ✅ **Draft complete + polish pass applied** (June 2026) — owner review pending

| File | learning_page_id | skill_id | page_type | Draft title |
|------|------------------|----------|-----------|-------------|
| `divisibility.md` | `math:g2:divisibility` | `math:kind:divisibility` | concept_foundation | מתי מספר מתחלק ב־2, ב־5 וב־10? |
| `frac_half.md` | `math:g2:frac_half` | `math:kind:frac_half` | visual_intuition | חצי מהשלם |
| `frac_half_reverse.md` | `math:g2:frac_half_reverse` | `math:kind:frac_half_reverse` | visual_intuition | מציאת השלם כשיש חצי |
| `frac_quarter.md` | `math:g2:frac_quarter` | `math:kind:frac_quarter` | visual_intuition | רבע מהשלם |
| `frac_quarter_reverse.md` | `math:g2:frac_quarter_reverse` | `math:kind:frac_quarter_reverse` | visual_intuition | מציאת השלם כשיש רבע |

All Batch C pages:

- `subject`: math · `grade`: g2 · `age_band`: grades_1_2 · `approval_status`: **draft**
- Section headings: מה לומדים? / הסבר / דוגמה / בואו נפתור / נסו בעצמכם / שימו לב! / בואו נתרגל!
- All Hebrew titles: **`[DRAFT — not owner-approved]`**

### Batch C polish pass (June 2026)

| Fix | Detail |
|-----|--------|
| `frac_half` / `frac_quarter` | Section 7: **שני חלקים שווים** / **ארבעה חלקים שווים** (not “שתיים/ארבע שווה”) |
| `frac_half_reverse` | Section 1: removed **להפוך**; Section 6: clearer “add only 1” mistake |
| `frac_quarter_reverse` | Section 1: **כשידוע לנו רבע…**; Section 6: half vs quarter contrast (**5 + 5** vs **5 + 5 + 5 + 5**) |

### Batch C content scope notes

- `divisibility`: **2, 5, 10 only**; “מתחלק ב־2/5/10”; last-digit rules; e.g. 40; **no** 3/6/9; shallow “בלי שארית” only
- `frac_half`: visual; חצי = חלק אחד מתוך שני חלקים שווים; e.g. חצי מ־12 = 6; no formal numerator/denominator
- `frac_half_reverse`: know half → find whole; doubling; e.g. חצי = 6 → שלם 12
- `frac_quarter`: visual; רבע = חלק אחד מתוך ארבעה חלקים שווים; e.g. רבע מ־12 = 3; no thirds/eighths
- `frac_quarter_reverse`: know quarter → find whole; 4 equal parts; 4 × or repeated add; e.g. רבע = 4 → שלם 16

### Batch C section 5 / 6 alignment

| Page | Section 5 (try it) | Section 6 (mistake) |
|------|-------------------|---------------------|
| `divisibility` | 35 — divide by 2, 5, 10? | 35 confused with ÷10 |
| `frac_half` | חצי מ־10 = ? | 10 split unequally (4+6) |
| `frac_half_reverse` | חצי = 5 → whole? | 5 + 1 = 6 instead of 5 + 5 |
| `frac_quarter` | רבע מ־20 = ? | 20 split in 2 (half = 10) |
| `frac_quarter_reverse` | רבע = 5 → whole? | 5 + 5 = 10 (half not quarter) |

---

## Batch D — שאלות מילוליות

**Status:** ✅ **Draft complete** (June 2026) — owner review pending

| File | learning_page_id | skill_id | page_type | Draft title |
|------|------------------|----------|-----------|-------------|
| `wp_coins.md` | `math:g2:wp_coins` | `math:kind:wp_coins` | word_problem_strategy | שאלות מילוליות — מטבעות |
| `wp_coins_spent.md` | `math:g2:wp_coins_spent` | `math:kind:wp_coins_spent` | word_problem_strategy | שאלות מילוליות — קניות ועודף |
| `wp_time_date.md` | `math:g2:wp_time_date` | `math:kind:wp_time_date` | word_problem_strategy | שאלות מילוליות — ימי השבוע |
| `wp_time_days.md` | `math:g2:wp_time_days` | `math:kind:wp_time_days` | word_problem_strategy | שאלות מילוליות — כמה ימים בין יום ליום |
| `wp_groups_g2.md` | `math:g2:wp_groups_g2` | `math:kind:wp_groups_g2` | word_problem_strategy | שאלות מילוליות — קבוצות שוות |
| `wp_division_simple.md` | `math:g2:wp_division_simple` | `math:kind:wp_division_simple` | word_problem_strategy | שאלות מילוליות — חלוקה שווה |

All Batch D pages:

- `subject`: math · `grade`: g2 · `age_band`: grades_1_2 · `approval_status`: **draft**
- Section headings: מה לומדים? / הסבר / דוגמה / בואו נפתור / נסו בעצמכם / שימו לב! / בואו נתרגל!
- All Hebrew titles: **`[DRAFT — not owner-approved]`**
- Word-problem frame: **מה יודעים? / מה מבקשים? / מה עושים?**

### Batch D content scope notes

- `wp_coins`: ₪ whole shekels only; single-step totals; equal groups / multiplication OK (e.g. 4 × 5); up to ~100; no agorot, no multi-step money
- `wp_coins_spent`: paid − cost = change; single-step; one purchase; up to ~100; no agorot
- `wp_time_date`: **weekdays only**; forward/back day jumps; no clock, month, calendar, or year arithmetic
- `wp_time_days`: count jumps between weekdays; **do not count start day as first jump**; no clock or calendar dates
- `wp_groups_g2`: equal-groups multiplication stories; one-step; factors within G2; cross-link to Batch B `mul`; no division here
- `wp_division_simple`: equal-sharing stories; one-step; no remainder; cross-link to Batch B `div`; no long division

### Batch D section 5 / 6 alignment

| Page | Section 5 (try it) | Section 6 (mistake) |
|------|-------------------|---------------------|
| `wp_coins` | 3 coins × 10 ₪ = ? | counted 3 instead of 3 × 10 = 30 |
| `wp_coins_spent` | paid 40, cost 28 → change? | 40 − 20 = 20 (partial subtract) |
| `wp_time_date` | Wed + 2 days → ? | stopped at Thu (1 jump) not Fri |
| `wp_time_days` | Mon → Fri, how many days? | counted Mon or stopped at Thu (3 not 4) |
| `wp_groups_g2` | 6 bags × 3 apples = ? | 6 + 3 = 9 instead of 6 × 3 = 18 |
| `wp_division_simple` | 20 stickers ÷ 5 kids = ? | 20 − 5 = 15 instead of 20 ÷ 5 = 4 |

---

## Batch Plan (complete)

**Total pages: 22 — all drafted**

| Batch | Title (draft) | Pages | Status |
|-------|---------------|-------|--------|
| **A** | יסודות מספרים והשוואה | 5 | ✅ drafted + polished |
| **B** | חיבור, חיסור, כפל וחילוק | 6 | ✅ drafted + polished |
| **C** | התחלקות ושברים | 5 | ✅ drafted + polished |
| **D** | שאלות מילוליות | 6 | ✅ drafted — owner review pending |

---

## Full review polish pass (June 2026)

Mandatory Hebrew/content fixes from full review pack review, before implementation:

| Page | Fix |
|------|-----|
| `add_two` | Grammar: `מחברים את שתי התוצאות` (feminine plural) |
| `wp_coins_spent` | Wording: `יותר מהמחיר`; Section 6: `לחסר` (not `לחסור`) |
| `wp_division_simple` | Clarity: `חלק שווה`; `באופן שווה בין … ילדים` (§4 + §5) |

**Status unchanged:** **22 / 22** pages drafted · all `approval_status: draft`.

---

## Site implementation (June 2026)

Grade 2 book connected to the site for **dev preview** — reuses Grade 1 reader UX exactly (`MathG2BookShell`, shared `LearningPageBody` / `BookTocModal`).

| Item | Location |
|------|----------|
| Registry + page order | `lib/learning-book/math-g2-registry.js` |
| Markdown loader | `lib/learning-book/load-math-g2-pages.js` |
| Book nav / snapshots / practice preset | `lib/learning-book/math-g2-book-nav.js` |
| Topic → book page | `lib/learning-book/resolve-math-g2-book-page.js` |
| Section 7 practice CTA | `lib/learning-book/resolve-math-g2-practice-target.js` |
| Routes | `/learning/book/math/g2`, `/learning/book/math/g2/[pageId]` |
| Math Master | General 📖 tile (g2 only), `הסבר בספר`, in-learning `📖 הסבר` |
| Verify | `node scripts/verify-math-g2-book.mjs` |

**Child-facing UI:** `ספר חשבון — כיתה ב׳` · no `[DRAFT]` markers · no internal metadata.

**Practice CTA:** All **22** pages mapped via `resolve-math-g2-practice-target.js` + `forceKind` branches in `utils/math-question-generator.js`.

**Hidden buttons (no confident mapping):**
- Setup `הסבר בספר` hidden for umbrella ops: `number_sense`, `word_problems`, `fractions`, `mixed`
- In-learning `📖 הסבר` hidden when kind/operation cannot resolve to a single G2 page

**Not done:** SQL · commit · push · deploy · owner content approval.

See also: `docs/learning-book/MATH_GRADE_2_BOOK_IMPLEMENTATION_SUMMARY.md`

---

## Open Questions (post–Batch D)

1. **Batch D Hebrew titles** — owner review before implementation
2. **Practice CTA mappings** — G2 resolver still not implemented
3. **Full book sign-off** — all 22 pages pending owner approval

---

## Explicit Stop Rule

> **Grade 2 UI is implemented for dev preview only.** Do not deploy or treat draft content as owner-approved until sign-off.

Until owner approves content:

- ❌ No SQL, commit, push, or deploy for production release
- ✅ Dev routes `/learning/book/math/g2` available for QA

---

## Confirmations

- **22** draft `.md` pages (Batches A + B + C + D); all `approval_status: draft`.
- All Grade 2 draft pages now exist — **22 / 22**.
- G2 registry, loader, routes, resolvers, and Math Master wiring implemented (June 2026).
- Grade 1 reader UX remains the locked reference (`MATH_LEARNING_BOOK_UI_STYLE_LOCK.md`).
- No SQL, commit, push, or deploy in this workstream.
