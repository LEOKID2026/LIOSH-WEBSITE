# Grade 3 Math Learning Book — Plan

**Status:** Documentation / planning + draft content (content-only). No UI, routes, registry, SQL, commit, push, or deploy.  
**Date:** June 2026  
**UI style:** Reuse existing reader per `MATH_LEARNING_BOOK_UI_STYLE_LOCK.md` — **not in scope for this task.**

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md` | Page types, wide-span rules, geometry exclusion |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules (grade scope, no fallback, approved content) |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | **Section B** (Grades 3–4) seven-section template |
| `docs/learning-book/MATH_GRADE_2_LEARNING_BOOK_PLAN.md` | Batch model and continuing-skill rules |
| `docs/learning-book/math/g1/drafts/`, `math/g2/drafts/` | Style and prose reference only — **do not modify** |
| `utils/math-constants.js` | Grade 3 operations (context only; spine drives page list) |
| `utils/math-question-generator.js` | Runtime kind hints for scope alignment (no practice mapping in this task) |

**Geometry:** Out of scope.  
**Subject naming:** Child-facing copy uses **חשבון**, not **מתמטיקה**.

---

## 1. Grade 3 Math Skills (Complete List)

A skill is **in Grade 3 scope** when `minGrade ≤ 3` and `maxGrade ≥ 3` in `skills.json` for `subject: "math"`.

**Total: 26 skills → 26 learning pages** (one `math:g3:{subtopic}` page each).

### 1A. New in Grade 3 (`minGrade = 3`) — 17 skills

| # | skill_id | subtopic | topic | Recommended page type | Clearly G3? |
|---|----------|----------|-------|------------------------|-------------|
| 1 | `math:kind:add_three` | `add_three` | number_sense_and_operations | step_by_step_procedure | Yes |
| 2 | `math:kind:dec_add` | `dec_add` | decimals | step_by_step_procedure | Yes |
| 3 | `math:kind:dec_sub` | `dec_sub` | decimals | step_by_step_procedure | Yes |
| 4 | `math:kind:div_with_remainder` | `div_with_remainder` | division_and_number_theory | concept_foundation | Yes |
| 5 | `math:kind:eq_add` | `eq_add` | number_sense_and_operations | concept_foundation | Yes |
| 6 | `math:kind:eq_sub` | `eq_sub` | number_sense_and_operations | concept_foundation | Yes |
| 7 | `math:kind:mul_hundreds` | `mul_hundreds` | multiplication | step_by_step_procedure | Yes (G3-only in spine) |
| 8 | `math:kind:mul_tens` | `mul_tens` | multiplication | step_by_step_procedure | Yes (G3-only in spine) |
| 9 | `math:kind:ns_complement100` | `ns_complement100` | number_sense_and_operations | visual_intuition | Yes |
| 10 | `math:kind:ns_place_hundreds` | `ns_place_hundreds` | number_sense_and_operations | concept_foundation | Yes |
| 11 | `math:kind:order_add_mul` | `order_add_mul` | number_sense_and_operations | step_by_step_procedure | Yes (G3-only) |
| 12 | `math:kind:order_mul_sub` | `order_mul_sub` | number_sense_and_operations | step_by_step_procedure | Yes (G3-only) |
| 13 | `math:kind:order_parentheses` | `order_parentheses` | number_sense_and_operations | step_by_step_procedure | Yes (G3-only) |
| 14 | `math:kind:sequence` | `sequence` | number_sense_and_operations | concept_foundation | Yes |
| 15 | `math:kind:wp_comparison_more` | `wp_comparison_more` | word_problems | word_problem_strategy | Yes |
| 16 | `math:kind:wp_leftover` | `wp_leftover` | word_problems | word_problem_strategy | Yes |
| 17 | `math:kind:wp_time_sum` | `wp_time_sum` | word_problems | word_problem_strategy | Yes |

### 1B. Continuing from earlier grades — 9 skills

Separate **Grade 3** pages required (upgraded scope / vocabulary). Do **not** reuse G1/G2 pages.

| # | skill_id | subtopic | G2 page? | G3 scope upgrade | Clearly G3? |
|---|----------|----------|----------|------------------|-------------|
| 18 | `math:kind:add_two` | `add_two` | Yes | עד 1,000; נשיאה בין מאות | Yes |
| 19 | `math:kind:sub_two` | `sub_two` | Yes | עד 1,000; השאלה ממאות | Yes |
| 20 | `math:kind:cmp` | `cmp` | Yes | השוואה עד 1,000 | Yes |
| 21 | `math:kind:div` | `div` | Yes | מספרים גדולים יותר; עדיין בלי שארית בדף זה | Yes |
| 22 | `math:kind:divisibility` | `divisibility` | Yes | **2, 5, 10 בלבד** (כמו G2); `maxGrade = 4` | Yes — owner: confirm no 3/6/9 |
| 23 | `math:kind:mul` | `mul` | Yes | לוח כפל מלא; קשר לכפל בעשרות/מאות | Yes |
| 24 | `math:kind:ns_complement10` | `ns_complement10` | Yes | חזרה קצרה — בסיס ל-100 | Yes (bridge) |
| 25 | `math:kind:ns_even_odd` | `ns_even_odd` | Yes | מספרים גדולים יותר | Yes |
| 26 | `math:kind:ns_neighbors` | `ns_neighbors` | Yes | שכנים עד 1,000 | Yes |

### 1C. Grade 2 skills that do **not** continue to Grade 3 book

No G3 page (spine ends at Grade 2):

| skill_id | Reason |
|----------|--------|
| `math:kind:add_vertical` | `maxGrade = 2` |
| `math:kind:sub_vertical` | `maxGrade = 2` |
| `math:kind:frac_half`, `frac_half_reverse`, `frac_quarter`, `frac_quarter_reverse` | `maxGrade = 2` |
| `math:kind:wp_coins`, `wp_coins_spent`, `wp_time_date`, `wp_time_days`, `wp_groups_g2`, `wp_division_simple` | `maxGrade = 2` |

### 1D. In `math-constants.js` G3 operations but **not** separate spine pages

| Operation / topic | Decision |
|-------------------|----------|
| `fractions` (general) | No dedicated G3 book page in this batch — fractions were G2-only in spine; formal fraction pages deferred |
| `order_of_operations` (umbrella) | Covered by three spine pages: `order_add_mul`, `order_mul_sub`, `order_parentheses` |
| `word_problems` (umbrella) | Covered by three G3 WP pages only |
| `equations` (umbrella in constants) | Covered by `eq_add` + `eq_sub` spine entries |

---

## 2. Proposed Book Page List

Each row → `docs/learning-book/math/g3/drafts/{subtopic}.md`  
`learning_page_id`: `math:g3:{subtopic}`  
All pages: `age_band: grades_3_4`, `approval_status: draft`.

| Batch | Order | learning_page_id | skill_id | Draft file | Draft Hebrew title | Learning goal (short) |
|-------|-------|------------------|----------|------------|-------------------|------------------------|
| A | 1 | `math:g3:ns_place_hundreds` | `math:kind:ns_place_hundreds` | `ns_place_hundreds.md` | מאות, עשרות ואחדות — עד 1,000 | לזהות ערך ספרה לפי מיקום במספר עד 1,000 |
| A | 2 | `math:g3:ns_neighbors` | `math:kind:ns_neighbors` | `ns_neighbors.md` | שכנים של מספר — עד 1,000 | למצוא מספר שלפני ואחרי במספרים גדולים |
| A | 3 | `math:g3:ns_complement10` | `math:kind:ns_complement10` | `ns_complement10.md` | זוגות שמרכיבים 10 — חזרה | לזכור זוגות ל-10 כבסיס לחיבור מהיר |
| A | 4 | `math:g3:ns_complement100` | `math:kind:ns_complement100` | `ns_complement100.md` | זוגות שמרכיבים 100 | למצוא מה חסר כדי להגיע ל-100 |
| A | 5 | `math:g3:ns_even_odd` | `math:kind:ns_even_odd` | `ns_even_odd.md` | זוגי ואי-זוגי — מספרים גדולים | לזהות זוגי/אי-זוגי לפי ספרת האחדות |
| A | 6 | `math:g3:cmp` | `math:kind:cmp` | `cmp.md` | השוואת מספרים עד 1,000 | להשוות מספרים ולבחור >, <, = |
| A | 7 | `math:g3:sequence` | `math:kind:sequence` | `sequence.md` | סדרות מספרים | להמשיך סדרה בקפיצה קבועה |
| B | 8 | `math:g3:add_two` | `math:kind:add_two` | `add_two.md` | חיבור שני מספרים — עד 1,000 | לחבר שני מספרים עם נשיאה |
| B | 9 | `math:g3:sub_two` | `math:kind:sub_two` | `sub_two.md` | חיסור שני מספרים — עד 1,000 | לחסר שני מספרים עם השאלה |
| B | 10 | `math:g3:add_three` | `math:kind:add_three` | `add_three.md` | חיבור שלושה מספרים | לחבר שלושה מספרים בזה אחר זה |
| B | 11 | `math:g3:mul` | `math:kind:mul` | `mul.md` | כפל — לוח הכפל | לפתור כפל בלוח הכפל |
| B | 12 | `math:g3:mul_tens` | `math:kind:mul_tens` | `mul_tens.md` | כפל בעשרות | לכפול מספר בעשרות (למשל 4 × 30) |
| B | 13 | `math:g3:mul_hundreds` | `math:kind:mul_hundreds` | `mul_hundreds.md` | כפל במאות | לכפול מספר במאות (למשל 5 × 200) |
| B | 14 | `math:g3:div` | `math:kind:div` | `div.md` | חילוק — חלוקה שווה | לחלק בלי שארית במספרים גדולים יותר |
| B | 15 | `math:g3:div_with_remainder` | `math:kind:div_with_remainder` | `div_with_remainder.md` | חילוק עם שארית | להבין מquotient ושארית |
| B | 16 | `math:g3:divisibility` | `math:kind:divisibility` | `divisibility.md` | התחלקות ב-2, ב-5 וב-10 | לבדוק לפי ספרת האחדות |
| C | 17 | `math:g3:eq_add` | `math:kind:eq_add` | `eq_add.md` | משוואת חיבור — מספר חסר | למצוא מספר חסר במשוואת חיבור |
| C | 18 | `math:g3:eq_sub` | `math:kind:eq_sub` | `eq_sub.md` | משוואת חיסור — מספר חסר | למצוא מספר חסר במשוואת חיסור |
| C | 19 | `math:g3:dec_add` | `math:kind:dec_add` | `dec_add.md` | חיבור עשרוניים | לחבר מספרים עם נקודה עשרונית |
| C | 20 | `math:g3:dec_sub` | `math:kind:dec_sub` | `dec_sub.md` | חיסור עשרוניים | לחסר מספרים עם נקודה עשרונית |
| C | 21 | `math:g3:order_add_mul` | `math:kind:order_add_mul` | `order_add_mul.md` | סדר פעולות — חיבור וכפל | כפל לפני חיבור |
| C | 22 | `math:g3:order_mul_sub` | `math:kind:order_mul_sub` | `order_mul_sub.md` | סדר פעולות — כפל וחיסור | כפל לפני חיסור |
| C | 23 | `math:g3:order_parentheses` | `math:kind:order_parentheses` | `order_parentheses.md` | סוגריים בחישוב | מה שבסוגריים קודם |
| D | 24 | `math:g3:wp_comparison_more` | `math:kind:wp_comparison_more` | `wp_comparison_more.md` | שאלה מילולית — כמה יותר? | הפרש בין שני כמויות |
| D | 25 | `math:g3:wp_leftover` | `math:kind:wp_leftover` | `wp_leftover.md` | שאלה מילולית — מה נשאר? | שארית בהקשר יומיומי |
| D | 26 | `math:g3:wp_time_sum` | `math:kind:wp_time_sum` | `wp_time_sum.md` | שאלה מילולית — סכום זמנים | לחבר דקות (משך צפייה) |

**Page count:** 26.

**Note:** `book_placeholder.md` remains as infrastructure placeholder — **not** part of the 26-page book plan.

---

## 3. Batch Grouping

| Batch | Title (draft) | Pages | Focus |
|-------|---------------|-------|-------|
| **A** | יסודות מספרים, השוואה וסדרות | 7 | place value to 1,000, complements, compare, sequences |
| **B** | חיבור, חיסור, כפל וחילוק | 9 | operations including tens/hundreds multiply, remainder |
| **C** | משוואות, עשרוניים וסדר פעולות | 7 | equations, decimals, order of operations |
| **D** | שאלות מילוליות | 3 | comparison, leftover, time sum |

---

## 4. Content Scope Notes (Draft Boundaries)

| Page | Scope | Out of scope (G3 draft) |
|------|-------|-------------------------|
| `add_two` / `sub_two` | עד 1,000; נשיאה/השאלה | חיבור/חיסור של 3+ ספרות במאונך כנושא נפרד |
| `add_three` | שלושה מספרים; סכום עד ~1,000 | ארבעה מספרים ומעלה |
| `mul_tens` / `mul_hundreds` | כפל חד-ספרתי × עשרות/מאות | כפל דו-ספרתי × דו-ספרתי |
| `div` | חלוקה שווה; תוצאה שלמה | שארית (→ `div_with_remainder`) |
| `div_with_remainder` | quotient + remainder; מספרים קטנים-בינוניים | חילוק ארוך פורמלי |
| `divisibility` | **2, 5, 10**; ספרת אחדות | 3, 6, 9 (→ Grade 4) |
| `dec_add` / `dec_sub` | ספרה אחת אחרי הנקודה | שתי ספרות עשרוניות, עיגול |
| `eq_add` / `eq_sub` | מקום ריק **__**; עד ~100 | משתנה x; אלגברה פורמלית |
| `order_*` | תרגילים קצרים; כלל אחד בכל דף | שברים, עשרוניים בתוך סדר פעולות |
| `sequence` | קפיצה קבועה (+/-) | סדרות מורכבות, כפל בסדרה |
| `wp_*` | שלב אחד; מסגרת מה יודעים/מבקשים/עושים | רב-שלבי, שעון analog |

---

## 5. Section 5 / Section 6 Alignment Plan

Every page keeps **the same numbers/story** in §5 (נסו בעצמכם) and §6 (שימו לב!).

| Page | §5 context | §6 mistake context |
|------|------------|-------------------|
| `ns_place_hundreds` | 472 — כמה מאות? | 472 — בלבול מאות/עשרות |
| `ns_neighbors` | שכנים של 350 | 350 — שכן לא נכון |
| `ns_complement10` | 7 + ? = 10 | 7 + ? = 10 |
| `ns_complement100` | 63 + ? = 100 | 63 + ? = 100 |
| `ns_even_odd` | 48 — זוגי? | 48 — ספרת עשרות במקום אחדות |
| `cmp` | 456 ? 465 | 456 vs 465 — >/< הפוך |
| `sequence` | 5, 10, 15, ? | אותה סדרה — קפיצה +4 במקום +5 |
| `add_two` | 248 + 156 | 248 + 156 — שכחו מאות |
| `sub_two` | 503 − 287 | 503 − 287 — השאלה לא נכונה |
| `add_three` | 125 + 40 + 35 | 125 + 40 + 35 — חיברו רק שניים |
| `mul` | 7 × 8 | 7 × 8 — חיבור במקום כפל |
| `mul_tens` | 4 × 30 | 4 × 30 — 4+30 |
| `mul_hundreds` | 5 × 200 | 5 × 200 — 5+200 |
| `div` | 84 ÷ 4 | 84 ÷ 4 — חיסור במקום חילוק |
| `div_with_remainder` | 23 ÷ 5 | 23 ÷ 5 — התעלמו משארית |
| `divisibility` | 35 — ÷2,5,10? | 35 — בלבול ÷5/÷10 |
| `eq_add` | 45 + __ = 72 | 45 + __ = 72 |
| `eq_sub` | __ − 18 = 42 | __ − 18 = 42 |
| `dec_add` | 2.3 + 1.4 | 2.3 + 1.4 — יישור נקודות |
| `dec_sub` | 5.7 − 2.2 | 5.7 − 2.2 |
| `order_add_mul` | 6 + 4 × 2 | 6 + 4 × 2 — שמאל לימין |
| `order_mul_sub` | 30 − 3 × 4 | 30 − 3 × 4 |
| `order_parentheses` | (8 + 2) × 3 | (8 + 2) × 3 — בלי סוגריים |
| `wp_comparison_more` | נועה 52, יובל 37 | אותה שאלה — חיסרו הפוך |
| `wp_leftover` | 47 תלמידים, קבוצות 6 | אותה שאלה — quotient במקום שארית |
| `wp_time_sum` | 35 דק׳ + 25 דק׳ | אותה שאלה — חיברו רק חלק |

---

## 6. Topics Skipped or Uncertain (Owner Review)

| Topic | Status | Notes |
|-------|--------|-------|
| Fractions (G3 constants) | **Skipped** | No `math:kind:frac_*` in G3 spine scope |
| `ns_complement10` on G3 book | **Included as bridge** | Short refresh; `maxGrade = 4` — owner may trim if redundant |
| `divisibility` depth | **Uncertain** | Same 2/5/10 as G2, or slightly larger numbers? |
| `eq_add` / `eq_sub` vs G1 `eq_*_simple` | **Clear upgrade** | Formal “משוואה” wording; numbers up to ~100 |
| Decimal range | **Uncertain** | Draft uses one decimal place only |
| Vertical algorithm pages | **Skipped** | Not in G3 spine |
| Practice CTA (§7) | **Not mapped** | Draft wording only until implementation task |

---

## 7. Deliverables (This Task)

| Deliverable | Path |
|-------------|------|
| This plan | `docs/learning-book/MATH_GRADE_3_LEARNING_BOOK_PLAN.md` |
| Draft pages (26) | `docs/learning-book/math/g3/drafts/*.md` |
| Drafts README | `docs/learning-book/math/g3/drafts/README.md` |
| Review pack | `docs/learning-book/MATH_GRADE_3_HEBREW_REVIEW_PACK.md` |
| Generator (optional) | `scripts/generate-math-g3-book-drafts.mjs` |
| Review pack builder | `scripts/build-math-g3-hebrew-review-pack.mjs` |
| Content verify | `scripts/verify-math-g3-book-content.mjs` |

---

## 8. Explicit Stop Rule

Until owner approves content:

- ❌ No registry, routes, loader, practice resolver, SQL, commit, push, deploy
- ❌ No fake Section 7 practice mappings
- ✅ Documentation and draft markdown only

---

## 9. Confirmations

- Geometry / גאומטריה: **not in scope**
- Grade 1 and Grade 2 drafts: **read-only reference**
- Design / UI / themes / reader shell: **not touched**
- All 26 pages: `approval_status: draft`; `[DRAFT — not owner-approved]` in metadata title only
