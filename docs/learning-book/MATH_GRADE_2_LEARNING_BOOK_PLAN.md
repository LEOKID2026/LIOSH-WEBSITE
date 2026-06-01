# Grade 2 Math Learning Book — Plan

**Status:** Documentation / planning only. No draft pages authored yet. No code. No SQL. No commit/push/deploy.  
**Date:** June 2026  
**UI style:** Reuse Grade 1 reader per `MATH_LEARNING_BOOK_UI_STYLE_LOCK.md`

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md` | Page types, wide-span rules, geometry exclusion |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, no fallback, approved content) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 1–2 seven-section template |
| `docs/learning-book/MATH_GRADE_1_LEARNING_BOOK_SIGNOFF.md` | G1 conventions, terminology, batch model |
| `docs/learning-book/math/g1/drafts/` | Style and prose reference only — **do not reuse G1 wording for G2 pages** |
| `utils/math-constants.js` | Grade 2 operations, number ranges, divisibility divisors |
| `utils/math-question-generator.js` | Confirms runtime kinds for G2 practice alignment |

**Geometry:** Out of scope. Geometry is `subject: "geometry"` in the spine and is not part of this Math Grade 2 plan.

---

## 1. Grade 2 Math Skills (Complete List)

A skill is **in Grade 2 scope** when `minGrade ≤ 2` and `maxGrade ≥ 2` in `skills.json` for `subject: "math"`.

**Total: 22 skills → 22 learning pages** (one `math:g2:{subtopic}` page each).

### 1A. New in Grade 2 (`minGrade = 2`) — 10 skills

These skills first appear in Grade 2. They have **no** Grade 1 learning page.

| # | skill_id | subtopic | topic | Recommended page type |
|---|----------|----------|-------|------------------------|
| 1 | `math:kind:add_vertical` | `add_vertical` | number_sense_and_operations | `step_by_step_procedure` |
| 2 | `math:kind:sub_vertical` | `sub_vertical` | number_sense_and_operations | `step_by_step_procedure` |
| 3 | `math:kind:div` | `div` | division_and_number_theory | `concept_foundation` |
| 4 | `math:kind:divisibility` | `divisibility` | division_and_number_theory | `concept_foundation` |
| 5 | `math:kind:frac_half` | `frac_half` | fractions | `visual_intuition` |
| 6 | `math:kind:frac_half_reverse` | `frac_half_reverse` | fractions | `visual_intuition` |
| 7 | `math:kind:frac_quarter` | `frac_quarter` | fractions | `visual_intuition` |
| 8 | `math:kind:frac_quarter_reverse` | `frac_quarter_reverse` | fractions | `visual_intuition` |
| 9 | `math:kind:wp_division_simple` | `wp_division_simple` | word_problems | `word_problem_strategy` |
| 10 | `math:kind:wp_groups_g2` | `wp_groups_g2` | word_problems | `word_problem_strategy` |

### 1B. Continuing from Grade 1 — 12 skills

These skills exist in Grade 1 but **require a separate Grade 2 page** (different scope, vocabulary, or procedure). Do **not** show Grade 1 pages to Grade 2 students.

| # | skill_id | subtopic | topic | G1 page exists | Recommended G2 page type |
|---|----------|----------|-------|----------------|---------------------------|
| 11 | `math:kind:add_two` | `add_two` | number_sense_and_operations | Yes | `step_by_step_procedure` |
| 12 | `math:kind:sub_two` | `sub_two` | number_sense_and_operations | Yes | `step_by_step_procedure` |
| 13 | `math:kind:cmp` | `cmp` | number_sense_and_operations | Yes | `concept_foundation` |
| 14 | `math:kind:mul` | `mul` | multiplication | Yes | `concept_foundation` |
| 15 | `math:kind:ns_complement10` | `ns_complement10` | number_sense_and_operations | Yes | `visual_intuition` (g1–g2 band) |
| 16 | `math:kind:ns_even_odd` | `ns_even_odd` | number_sense_and_operations | Yes | `practice_bridge` |
| 17 | `math:kind:ns_neighbors` | `ns_neighbors` | number_sense_and_operations | Yes | `visual_intuition` |
| 18 | `math:kind:ns_place_tens_units` | `ns_place_tens_units` | number_sense_and_operations | Yes | `concept_foundation` |
| 19 | `math:kind:wp_coins` | `wp_coins` | word_problems | Yes | `word_problem_strategy` |
| 20 | `math:kind:wp_coins_spent` | `wp_coins_spent` | word_problems | Yes | `word_problem_strategy` |
| 21 | `math:kind:wp_time_date` | `wp_time_date` | word_problems | Yes | `word_problem_strategy` |
| 22 | `math:kind:wp_time_days` | `wp_time_days` | word_problems | Yes | `word_problem_strategy` |

### 1C. Grade 1 skills that do **not** continue to Grade 2

No Grade 2 page is needed for these (Grade 1 only in spine):

| skill_id | Reason |
|----------|--------|
| `math:kind:add_second_decade` | `maxGrade = 1` |
| `math:kind:add_tens_only` | `maxGrade = 1` |
| `math:kind:eq_add_simple` | `maxGrade = 1` |
| `math:kind:eq_sub_simple` | `maxGrade = 1` |
| `math:kind:ns_counting_forward` | `maxGrade = 1` |
| `math:kind:ns_counting_backward` | `maxGrade = 1` |
| `math:kind:ns_number_line` | `maxGrade = 1` |

---

## 2. Proposed Book Page List

Each row is one markdown draft: `docs/learning-book/math/g2/drafts/{subtopic}.md`  
`learning_page_id` format: `math:g2:{subtopic}`  
All pages: `age_band: grades_1_2`, `approval_status: draft` (until owner review).

| Batch | Order | learning_page_id | skill_id | Draft file | page_type |
|-------|-------|------------------|----------|------------|-----------|
| A | 1 | `math:g2:ns_place_tens_units` | `math:kind:ns_place_tens_units` | `ns_place_tens_units.md` | concept_foundation |
| A | 2 | `math:g2:ns_neighbors` | `math:kind:ns_neighbors` | `ns_neighbors.md` | visual_intuition |
| A | 3 | `math:g2:ns_complement10` | `math:kind:ns_complement10` | `ns_complement10.md` | visual_intuition |
| A | 4 | `math:g2:ns_even_odd` | `math:kind:ns_even_odd` | `ns_even_odd.md` | practice_bridge |
| A | 5 | `math:g2:cmp` | `math:kind:cmp` | `cmp.md` | concept_foundation |
| B | 6 | `math:g2:add_two` | `math:kind:add_two` | `add_two.md` | step_by_step_procedure |
| B | 7 | `math:g2:sub_two` | `math:kind:sub_two` | `sub_two.md` | step_by_step_procedure |
| B | 8 | `math:g2:add_vertical` | `math:kind:add_vertical` | `add_vertical.md` | step_by_step_procedure |
| B | 9 | `math:g2:sub_vertical` | `math:kind:sub_vertical` | `sub_vertical.md` | step_by_step_procedure |
| B | 10 | `math:g2:mul` | `math:kind:mul` | `mul.md` | concept_foundation |
| B | 11 | `math:g2:div` | `math:kind:div` | `div.md` | concept_foundation |
| C | 12 | `math:g2:divisibility` | `math:kind:divisibility` | `divisibility.md` | concept_foundation |
| C | 13 | `math:g2:frac_half` | `math:kind:frac_half` | `frac_half.md` | visual_intuition |
| C | 14 | `math:g2:frac_half_reverse` | `math:kind:frac_half_reverse` | `frac_half_reverse.md` | visual_intuition |
| C | 15 | `math:g2:frac_quarter` | `math:kind:frac_quarter` | `frac_quarter.md` | visual_intuition |
| C | 16 | `math:g2:frac_quarter_reverse` | `math:kind:frac_quarter_reverse` | `frac_quarter_reverse.md` | visual_intuition |
| D | 17 | `math:g2:wp_coins` | `math:kind:wp_coins` | `wp_coins.md` | word_problem_strategy |
| D | 18 | `math:g2:wp_coins_spent` | `math:kind:wp_coins_spent` | `wp_coins_spent.md` | word_problem_strategy |
| D | 19 | `math:g2:wp_time_date` | `math:kind:wp_time_date` | `wp_time_date.md` | word_problem_strategy |
| D | 20 | `math:g2:wp_time_days` | `math:kind:wp_time_days` | `wp_time_days.md` | word_problem_strategy |
| D | 21 | `math:g2:wp_groups_g2` | `math:kind:wp_groups_g2` | `wp_groups_g2.md` | word_problem_strategy |
| D | 22 | `math:g2:wp_division_simple` | `math:kind:wp_division_simple` | `wp_division_simple.md` | word_problem_strategy |

**Page count:** 22 (vs. 19 for Grade 1).

---

## 3. Batch Grouping

Mirrors Grade 1’s batch model (foundations → operations → extensions → word problems).

| Batch | Hebrew batch title (draft) | Pages | Focus |
|-------|----------------------------|-------|-------|
| **A** | יסודות מספרים והשוואה | 5 | Place value to 1,000, neighbors, complements, even/odd reinforcement, comparison |
| **B** | חיבור, חיסור, כפל וחילוק | 6 | Horizontal and vertical algorithms, multiplication table, division as inverse of multiplication |
| **C** | התחלקות ושברים | 5 | Divisibility by 2, 5, 10; half and quarter of a whole (and reverse) |
| **D** | שאלות מילוליות | 6 | Coins, spending, calendar/days, equal groups, sharing equally |

---

## 4. Wide-Span Skills — Grade 2 Page Required (Not G1 Reuse)

These continuing skills **must** be newly authored for Grade 2. Grade 1 wording, examples, and caps are wrong for Grade 2.

| skill_id | Why G2 page is required | Key G2 differences from G1 |
|----------|-------------------------|----------------------------|
| `add_two` | Range and methods expand | Sums up to 100 (level-dependent); may reference vertical addition; no “join two small groups only” cap at 30 |
| `sub_two` | Range and methods expand | Minuends up to 100; borrowing may appear in examples tied to `sub_vertical`; not capped at 30 |
| `cmp` | Compare range expands | Numbers up to **1,000** (`GRADE_LEVELS[2].compare.max`); three-digit comparison |
| `mul` | Multiplication scope expands | **Times table up to 10×10**; not “repeated addition only, product ≤ 20” |
| `ns_neighbors` | Number range expands | Neighbors on a line up to 1,000; not 0–30 focus |
| `ns_complement10` | Reinforcement at higher range | Still pairs to 10, but used in mental strategies for larger addition (bridge to regrouping) |
| `ns_even_odd` | `practice_bridge` at G2 | Reinforce with larger numbers; pairing-first from G1 may carry forward as **טיפ** |
| `ns_place_tens_units` | **Second page slot** (g1–g2) | G1: two-digit to ~30; **G2: up to 1,000** — hundreds introduced |
| `wp_coins` | Word problems allow all four ops at G2 | May include multiplication context for equal coin groups; amounts within G2 WP max |
| `wp_coins_spent` | Richer money stories | Still no formal algebra; amounts up to G2 word-problem cap |
| `wp_time_date` | Same skill span g1–g2 | Confirm whether G2 adds month-level questions or stays weekday-only (see open questions) |
| `wp_time_days` | Same skill span g1–g2 | Day-counting with larger spans if generator allows; keep jump-counting rules from G1 |

**New G2-only skills** (`add_vertical`, `sub_vertical`, `div`, `divisibility`, fractions, `wp_division_simple`, `wp_groups_g2`) have no G1 page to reuse.

---

## 5. Grade 2 Content Boundaries

Derived from `utils/math-constants.js` (`GRADES.g2`, `GRADE_LEVELS[2]`) and curriculum map.

### 5A. Allowed

| Area | Grade 2 scope |
|------|----------------|
| **Operations** | Addition, subtraction, multiplication, division, fractions (½, ¼), compare, number_sense, word_problems, mixed |
| **Addition / subtraction** | Horizontal and **vertical** layouts; carrying (`נשיאה`) and borrowing (`שאילה`) on dedicated vertical pages and in worked examples where aligned |
| **Multiplication** | Full table toward **10×10** at medium/hard levels |
| **Division** | Simple division by times-table facts; inverse of multiplication; divisors up to 10 at medium/hard |
| **Fractions** | Unit fractions **½ and ¼** only; part-of-whole and find-whole-given-part (`frac_*`, `frac_*_reverse`) |
| **Divisibility** | Divisors **2, 5, 10 only** in Grade 2 (not 3, 6, 9 — those are Grade 4 in `math-constants.js`) |
| **Compare** | Up to **1,000** |
| **Number sense** | Up to **1,000** |
| **Word problems** | Single-step (per age band); all four operations; max operand context **100** in generator config |
| **Language** | Child-facing Hebrew; short sentences; concrete visuals; seven-section template |
| **Section 7** | `בואו נתרגל!` → future G2 practice preset (mirror G1 pattern) |

### 5B. Not allowed

| Exclusion | Notes |
|-----------|-------|
| **Geometry** | Separate subject — not in this book |
| **Negative numbers** | `allowNegatives: false` for g2 |
| **Decimals** | Grade 3+ |
| **Division with remainder** | Grade 3+ (`div_with_remainder`) |
| **Formal equations** (`eq_add`, `eq_sub`) | Grade 3+ |
| **Fractions beyond ½ and ¼** | No eighths, thirds, addition of fractions, etc. |
| **Divisibility by 3, 6, 9** | Grade 4 scope in constants |
| **Long division algorithm** | Grade 4 (`div_long`) |
| **Order of operations / parentheses** | Grade 3 |
| **Multi-step word problems** | Grade 5 (`wp_multi_step`) |
| **Grade 1-only topics** | Teens decade trick as main topic, G1-only missing-number pages, G1-only number-line intro pages |
| **Fallback to G1 pages** | Hard rule from master plan |
| **Variables / formal algebra** | Use `מספר חסר` / number sentences only where applicable |

### 5C. Number ranges (authoring guide)

| Level (generator) | Addition / subtraction | Multiplication | Division | Word problems |
|-------------------|------------------------|----------------|----------|---------------|
| Easy | up to **50**, vertical allowed | factors up to **5** | dividend up to **50**, divisor up to **5** | up to **100** |
| Medium / Hard | up to **100** | up to **10** | dividend up to **100**, divisor up to **10** | up to **100** |

**Compare / number_sense:** up to **1,000** at all G2 levels.

**Fractions:** denominator 2 (half) at easy; denominators 2 and 4 (half and quarter) at medium/hard.

### 5D. Age-appropriate expectations

- Grades 1–2 band: one main concept per page, one worked example, one try-it-yourself, one common mistake.
- Introduce **vertical algorithm** as its own pages (`add_vertical`, `sub_vertical`) before assuming it in every `add_two` / `sub_two` example.
- Introduce **division** as sharing / inverse of multiplication before abstract `a ÷ b` drill tone.
- Fraction pages stay **visual** (paper folds, pizzas, bars) — no fraction arithmetic.
- Word problems keep **`מה יודעים? / מה מבקשים? / מה עושים?`** frame from Grade 1 unless owner revises.

---

## 6. Ambiguous Skills — Owner Review

| # | Topic | Issue | Recommendation (draft) |
|---|-------|-------|------------------------|
| 1 | `wp_time_date` / `wp_time_days` | G1 drafts are weekday-only, no clock/months. Spine spans g1–g2 but does not specify G2 calendar expansion. | **Default:** keep weekday-only unless generator adds month/year items for G2. Owner to confirm. |
| 2 | `cmp` metaphor | G1 draft uses **`תנין רעב`**. | Confirm keep, simplify, or drop for G2 three-digit comparison. |
| 3 | `wp_coins` at G2 | G1 rule: repeated addition only. G2 generator allows multiplication in word problems. | Confirm whether coin-total pages may show **equal groups × value** or stay addition-only. |
| 4 | `ns_place_tens_units` | G2 introduces ** hundreds** within g1–g2 skill. | Author explicit hundreds place on G2 page; do not copy G1 “up to 30” scope. |
| 5 | `add_two` vs `add_vertical` | Overlap in content. | `add_two`: horizontal mental and composing to 100; `add_vertical`: column procedure and carrying. Cross-link, do not duplicate full algorithm on both. |
| 6 | `div` vs `wp_division_simple` | Both introduce sharing. | `div`: operation meaning and facts; `wp_division_simple`: story setup only. |
| 7 | `mul` page tone | Shift from G1 “חיבור חוזר” to times table. | Title and opening must reflect **לוח כפל** without skipping visual grouping entirely. |
| 8 | `divisibility` | Spine spans g2–g4; constants restrict G2 to 2, 5, 10. | Page must state **only** those three rules; no preview of ÷3 rules. |
| 9 | Fraction denominator in examples | Easy: half only; medium/hard: quarter. | Pick one representative difficulty per page or note level variants in owner review. |
| 10 | Practice CTA mappings | G2 resolver does not exist yet. | Plan mappings when authoring Batch B+; some kinds may map to `forceKind` branches not yet in generator. |

**Planning gate:** Resolve items **1, 3, and 4** before Batch D and Batch A (`ns_place_tens_units`) authoring. Items **2, 5, 6** before Batch A/B polish.

---

## 7. Recommended First Content Batch

**Batch A — יסודות מספרים והשוואה** (5 pages)

| Page | Rationale |
|------|-----------|
| `ns_place_tens_units` | Unlocks three-digit numbers and sets vocabulary for all later batches |
| `ns_neighbors` | Number-line tool at G2 range |
| `ns_complement10` | Mental-math bridge before vertical carrying |
| `ns_even_odd` | Light reinforcement page (`practice_bridge`) |
| `cmp` | Comparison to 1,000 closes the number-sense foundation |

**Why not start with Batch B:** Vertical addition/subtraction and multiplication assume place-value fluency to 1,000. **`ns_place_tens_units` (G2)** is the highest-risk ambiguous page and should be drafted first for owner review.

**Authoring order within Batch A:**  
`ns_place_tens_units` → `ns_neighbors` → `ns_complement10` → `cmp` → `ns_even_odd`

---

## 8. Draft Title Suggestions

All **`[DRAFT — not owner-approved]`** until explicit sign-off.

| learning_page_id | Suggested Hebrew title (draft) |
|------------------|-------------------------------|
| `math:g2:ns_place_tens_units` | עשרות, אחדות ומאות — עד 1,000 |
| `math:g2:ns_neighbors` | שכנים של מספר — מספרים גדולים יותר |
| `math:g2:ns_complement10` | זוגות של עשר — עזר לחיבור |
| `math:g2:ns_even_odd` | זוגי ואי-זוגי — חזרה ותרגול |
| `math:g2:cmp` | השוואת מספרים עד 1,000 |
| `math:g2:add_two` | חיבור של שני מספרים — עד 100 |
| `math:g2:sub_two` | חיסור של שני מספרים — עד 100 |
| `math:g2:add_vertical` | חיבור במאונך |
| `math:g2:sub_vertical` | חיסור במאונך |
| `math:g2:mul` | לוח הכפל |
| `math:g2:div` | חילוק — שיתוף והפוך של כפל |
| `math:g2:divisibility` | מתי מתחלק ב-2, ב-5 וב-10? |
| `math:g2:frac_half` | חצי מהשלם |
| `math:g2:frac_half_reverse` | מציאת השלם כשיש חצי |
| `math:g2:frac_quarter` | רבע מהשלם |
| `math:g2:frac_quarter_reverse` | מציאת השלם כשיש רבע |
| `math:g2:wp_coins` | שאלות מילוליות — מטבעות |
| `math:g2:wp_coins_spent` | שאלות מילוליות — קניות ועודף |
| `math:g2:wp_time_date` | שאלות מילוליות — ימים ותאריכים |
| `math:g2:wp_time_days` | שאלות מילוליות — מרחק בין ימים |
| `math:g2:wp_groups_g2` | שאלות מילוליות — קבוצות שוות |
| `math:g2:wp_division_simple` | שאלות מילוליות — חלוקה שווה |

---

## 9. Explicit Non-Goals (This Phase)

- No app code changes
- No `/learning/book/math/g2` route
- No Math Master UI changes
- No Grade 3+ planning
- No geometry pages
- No SQL, commit, push, or deploy
- No draft markdown files until owner clears ambiguous items (see `math/g2/drafts/README.md`)

---

## 10. Related Documents

| Document | Location |
|----------|----------|
| UI style lock | `MATH_LEARNING_BOOK_UI_STYLE_LOCK.md` |
| G2 drafts folder README | `math/g2/drafts/README.md` |
| G1 signoff (reference) | `MATH_GRADE_1_LEARNING_BOOK_SIGNOFF.md` |
