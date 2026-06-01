# Grade 1 Math Learning Book — Section 5 Hint Alignment Audit

**Audit date:** 2026-06-01  
**Scope:** 19 markdown drafts in `docs/learning-book/math/g1/drafts/` (excluding `README.md`)  
**Task:** Read-only map of question ↔ hint alignment in the practice tail of each page (sections 3–6, with primary focus on section 5).  
**No content was modified** in drafts, UI, code, routes, registry, or SQL.

---

## Methodology

For each page, the auditor read sections **3. דוגמה**, **4. בואו נפתור יחד**, **5. נסו בעצמכם**, and **6. טעות נפוצה / שימו לב** in full.

**Section 5 verdict criteria:**

| Verdict | Meaning |
|---------|---------|
| **PASS** | Hint uses the same starting numbers, operation, and situation as the question, or a strategy hint that directly applies to those numbers. |
| **FAIL** | Hint names different numbers, a different operation, or an example that would lead to a different answer than the question. |
| **NEEDS REVIEW** | Hint is ambiguous, only partially applies, or gives away / obscures the asked numbers in a way that may confuse Grade 1 readers. |

**Section 6** is reported separately: many pages reuse numbers from sections 3 or 4 in the common-mistake block. That is often intentional pedagogy, but it is flagged when a child who just finished section 5 may think section 6 is explaining *their* task with the wrong numbers.

Pages are listed in registry order (`lib/learning-book/math-g1-registry.js`).

---

## Executive summary

| Metric | Count |
|--------|------:|
| Pages checked | **19** |
| Section 5 — **PASS** | **19** |
| Section 5 — **FAIL** | **0** |
| Section 5 — **NEEDS REVIEW** | **0** |
| Section 6 — confusing cross-example (NEEDS REVIEW) | **11** |
| Section 6 — acceptable generic demo (PASS) | **8** |

### Finding

In **current draft markdown**, every section 5 `(רמז: …)` line matches its question (numbers, operation, and situation).

The **systematic child-facing confusion** appears instead in **section 6 (and, when swiping sequentially, the jump from section 5 → section 6)**: the common-mistake block usually repeats numbers from **section 3 or 4**, while section 5 always introduces **new** numbers. A child who just solved section 5 and swipes forward may see an “explanation” with different coins, totals, weekdays, or addends than the question they were working on.

One section 5 hint was recently clarified in git (`ns_counting_forward.md`, commit `48fadd44`): old wording used number-line “jumps”; new wording names the expected answer sequence directly. Both versions were aligned to “from 8”; the update reduces ambiguity for non-number-line readers.

**Note:** `docs/learning-book/MATH_GRADE_1_HEBREW_REVIEW_PACK.md` still shows the **old** `ns_counting_forward` hint (`התחילו מ-8 וקפצו ימינה פעמיים`) and is **out of sync** with the draft file. That pack was **not** in audit scope.

---

## Files that need correction (recommended follow-up)

### Section 5 — none

No draft requires a section 5 hint fix based on this audit.

### Section 6 — align mistake demos to section 5 numbers (11 pages)

| Priority | File | Why |
|----------|------|-----|
| High | `wp_coins.md` | Section 6 walks through **13 ₪** (section 4 — נועה); section 5 asks **דני → 14 ₪**. |
| High | `wp_coins_spent.md` | Section 6 uses **15 − 6** (section 4 — יעל); section 5 asks **10 − 7** (עודף — אמיר). |
| High | `ns_counting_forward.md` | Section 6 demo sequence starts at **6**; section 5 asks counting forward from **8**. |
| Medium | `cmp.md` | Section 6 demo is **7 __ 11** (section 4); section 5 asks **14 __ 9**. |
| Medium | `add_second_decade.md` | Section 6 worked example is **7 + 6** (section 4); section 5 asks **9 + 4**. |
| Medium | `mul.md` | Section 6 demo is **3 × 2** (section 3); section 5 asks **3 × 3**. |
| Medium | `add_two.md` | Section 6 demo is **5 + 3** (section 4); section 5 asks **7 + 4**. |
| Medium | `sub_two.md` | Section 6 demo is **9 − 4** (section 4); section 5 asks **10 − 3**. |
| Medium | `eq_add_simple.md` | Section 6 demo is **3 + __ = 7** (section 3); section 5 asks **2 + __ = 8**. |
| Medium | `eq_sub_simple.md` | Section 6 demo is **8 − __ = 3** (section 3); section 5 asks **10 − __ = 7**. |
| Medium | `ns_neighbors.md` | Section 6 demo is neighbors of **8** (sections 3–4); section 5 asks neighbors of **12**. |

### Section 6 — lower risk (8 pages, no change required unless owner wants strict S5 parity)

`ns_counting_backward.md`, `ns_number_line.md`, `ns_place_tens_units.md`, `ns_even_odd.md`, `ns_complement10.md`, `add_tens_only.md`, `wp_time_date.md`, `wp_time_days.md` — section 6 teaches a **generic rule** with numbers that do not contradict section 5, though they are not the same instance.

---

## Per-page audit (19 pages)

---

### 1. `ns_counting_forward.md`

**Page title:** ספירה קדימה על ציר המספרים

**Section 5 question (exact):**
> ספרו קדימה מ־8. מה שני המספרים הבאים?

**Section 5 hint (exact):**
> *(רמז: אחרי 8 באים 9 ואז 10.)*

**Section 5 verdict:** **PASS** — Hint names the same start (8) and the two forward numbers (9, 10).

**Section 6 check:** **NEEDS REVIEW** — Correct sequence demo is **6, 7, 8, 9, 10** (skipping-error example), while section 5 anchors on **8**. A child may think they should begin at 6.

**Suggested fix (do not apply):** In section 6, use a skip-error example anchored on 8, e.g. ❌ 8, **10** (skipped 9) vs ✓ 8, **9**, **10**.

**Sections 3–4 note:** Section 4 uses **5 → 6, 7, 8**; section 3 ladybug starts on **4**. Progression is intentional; no internal mismatch.

---

### 2. `ns_counting_backward.md`

**Page title:** ספירה לאחור על ציר המספרים

**Section 5 question (exact):**
> ספרו לאחור מ-9. מה שני המספרים הבאים?

**Section 5 hint (exact):**
> *(רמז: התחילו מ-9 וקפצו שמאלה פעמיים)*

**Section 5 verdict:** **PASS** — Start 9, two left jumps → 8, 7.

**Section 6 check:** **PASS** — Teaches “do not go below 0” with **2, 1, 0**; does not contradict section 5.

---

### 3. `ns_number_line.md`

**Page title:** ציר המספרים

**Section 5 question (exact):**
> איזה מספר נמצא 3 צעדים ימינה מ-2?

**Section 5 hint (exact):**
> *(רמז: התחילו מ-2 וספרו 3 קפיצות ימינה)*

**Section 5 verdict:** **PASS** — Same start (2) and step count (3).

**Section 6 check:** **PASS** — Demo uses **2 steps from 4** (section 4 pattern); generic “don’t count start as step” rule; no contradiction with section 5 answer (5).

---

### 4. `ns_neighbors.md`

**Page title:** שכנים של מספר

**Section 5 question (exact):**
> מה השכנים של 12?

**Section 5 hint (exact):**
> *(רמז: מספר אחד לפני 12, מספר אחד אחרי 12)*

**Section 5 verdict:** **PASS** — Both refer to neighbors of **12**.

**Section 6 check:** **NEEDS REVIEW** — Demo uses neighbors of **8** (sections 3–4); section 5 asks **12**.

**Suggested fix (do not apply):** Show wrong neighbors of **12**, e.g. ❌ 10 ו-14 vs ✓ **11** ו-**13**.

---

### 5. `cmp.md`

**Page title:** השוואת מספרים

**Section 5 question (exact):**
> השוו: 14 __ 9  
> איזה סימן נכון — `<`, `>`, או `=`?

**Section 5 hint (exact):**
> *(רמז: איזה מספר גדול יותר? הפה פונה אליו)*

**Section 5 verdict:** **PASS** — Strategy applies to **14 vs 9** (14 greater → `>`).

**Section 6 check:** **NEEDS REVIEW** — Demo compares **7 __ 11** (section 4); section 5 compares **14 __ 9**.

**Suggested fix (do not apply):** Wrong mouth on **14 __ 9**, e.g. ❌ 14 **<** 9 vs ✓ 14 **>** 9.

---

### 6. `ns_place_tens_units.md`

**Page title:** עשרות ואחדות

**Section 5 question (exact):**
> כמה עשרות וכמה אחדות יש במספר 23?

**Section 5 hint (exact):**
> *(רמז: כמה מקלי עשרת? כמה קוביות בודדות?)*

**Section 5 verdict:** **PASS** — Place-value strategy applies directly to **23** (2 tens rods, 3 unit cubes).

**Section 6 check:** **PASS** — Demo uses **12** (common digit confusion); rule transfers to **23**.

---

### 7. `ns_even_odd.md`

**Page title:** זוגי ואי-זוגי

**Section 5 question (exact):**
> האם 9 זוגי או אי-זוגי?

**Section 5 hint (exact):**
> *(רמז: נסו לסדר 9 כוכבים בזוגות — נשאר מישהו בלי שותף?)*

**Section 5 verdict:** **PASS** — Hint explicitly uses **9** objects and the pairing strategy.

**Section 6 check:** **PASS** — Demo uses **11** to counter “big number = even”; does not contradict section 5.

---

### 8. `ns_complement10.md`

**Page title:** זוגות שמרכיבים 10

**Section 5 question (exact):**
> 4 + ? = 10 — מה המספר החסר?

**Section 5 hint (exact):**
> *(רמז: כמה חסר כדי למלא את מסגרת עשר?)*

**Section 5 verdict:** **PASS** — Ten-frame complement strategy applies to **4 + ? = 10** (missing **6**).

**Section 6 check:** **PASS** — Section 6 also uses **4 + ? = 10** (same number as section 5).

---

### 9. `add_second_decade.md`

**Page title:** חיבור בעשרייה השנייה — מספרים בין 11 ל־19

**Section 5 question (exact):**
> 9 + 4 = ?

**Section 5 hint (exact):**
> *(רמז: קודם השלימו את 9 ל-10 — כמה נשאר מ-4?)*

**Section 5 verdict:** **PASS** — Make-10 decomposition for **9 + 4** (9+1=10, 3 left → 13).

**Section 6 check:** **NEEDS REVIEW** — Full worked example is **7 + 6 = 13** (section 4); section 5 asks **9 + 4**.

**Suggested fix (do not apply):** Section 6 ✓ path using **9 + 4**: 9+1=10, 10+3=13.

---

### 10. `add_tens_only.md`

**Page title:** חיבור עשרות שלמות

**Section 5 question (exact):**
> 10 + 20 = ?

**Section 5 hint (exact):**
> *(רמז: 1 מקל עשרת + 2 מקלי עשרת = כמה מקלי עשרת?)*

**Section 5 verdict:** **PASS** — Same addends **10 + 20** expressed as rods (3 tens → 30).

**Section 6 check:** **PASS** — Demo **20 + 10** (commutative with section 5); same numbers, digit-concatenation mistake.

---

### 11. `add_two.md`

**Page title:** חיבור של שני מספרים

**Section 5 question (exact):**
> 7 + 4 = ?

**Section 5 hint (exact):**
> *(רמז: התחילו מ-7 והוסיפו עוד 4 — על ציר המספרים או עם חפצים)*

**Section 5 verdict:** **PASS** — Same addends **7** and **4**.

**Section 6 check:** **NEEDS REVIEW** — Counting mistake demo uses **5 + 3** (section 4); section 5 is **7 + 4**.

**Suggested fix (do not apply):** ❌ 7 + 4 → counting 7 as first step vs ✓ after 7 count four steps: 8, 9, 10, 11.

---

### 12. `sub_two.md`

**Page title:** חיסור של שני מספרים

**Section 5 question (exact):**
> 10 − 3 = ?

**Section 5 hint (exact):**
> *(רמז: התחילו מ-10 והורידו 3 — אל תרדו מתחת ל-0)*

**Section 5 verdict:** **PASS** — Same minuend **10**, subtrahend **3**.

**Section 6 check:** **NEEDS REVIEW** — Demo uses **9 − 4** (section 4); section 5 is **10 − 3**.

**Suggested fix (do not apply):** ❌ 10 − 3 → counting 10 as first step vs ✓ after 10: three steps to **7**.

---

### 13. `eq_add_simple.md`

**Page title:** חיבור עם מספר חסר

**Section 5 question (exact):**
> 2 + __ = 8 — מה המספר החסר?

**Section 5 hint (exact):**
> *(רמז: כמה קפיצות מ-2 ל-8 על ציר המספרים?)*

**Section 5 verdict:** **PASS** — Same equation structure; jumps from **2** to **8** → missing **6**.

**Section 6 check:** **NEEDS REVIEW** — Demo is **3 + __ = 7** (section 3); section 5 is **2 + __ = 8**.

**Suggested fix (do not apply):** ❌ 2 + **8** = 8 (wrote total) vs ✓ 2 + **6** = 8.

---

### 14. `eq_sub_simple.md`

**Page title:** חיסור עם מספר חסר

**Section 5 question (exact):**
> 10 − __ = 7 — מה המספר החסר?

**Section 5 hint (exact):**
> *(רמז: כמה לקחו מ-10 כדי שנשארו 7?)*

**Section 5 verdict:** **PASS** — Same numbers **10**, remainder **7**; missing subtrahend **3**.

**Section 6 check:** **NEEDS REVIEW** — Demo is **8 − __ = 3** (section 3); section 5 is **10 − __ = 7**.

**Suggested fix (do not apply):** ❌ 10 − **7** = 7 (wrote remainder) vs ✓ 10 − **3** = 7.

---

### 15. `mul.md`

**Page title:** כפל — חיבור חוזר

**Section 5 question (exact):**
> 3 × 3 = ?

**Section 5 hint (exact):**
> *(רמז: שלוש קבוצות של 3 — כמה ביחד?)*

**Section 5 verdict:** **PASS** — Three groups of three for **3 × 3**.

**Section 6 check:** **NEEDS REVIEW** — Demo is **3 × 2** (section 3); section 5 is **3 × 3** (same first factor, different second — easy to mix up).

**Suggested fix (do not apply):** ❌ 3 × 3 = 3 + 3 = 6 vs ✓ 3 + 3 + 3 = 9.

---

### 16. `wp_coins.md`

**Page title:** שאלות מילוליות — ערך מטבעות

**Section 5 question (exact):**
> לדני יש מטבע אחד של 10 שקלים ו-2 מטבעות של 2 שקלים. כמה כסף יש לו ביחד?

**Section 5 hint (exact):**
> *(רמז: 10 + 2 + 2 — מה מבקשים? לחבר את כל הערכים)*

**Section 5 verdict:** **PASS** — Hint matches Danny’s coins; total **14 ₪**.

**Section 6 check:** **NEEDS REVIEW** — Worked correction totals **13 ₪** (2×5 + 3×1, section 4 — נועה). Child may think the answer to section 5 is **13**, not **14**.

**Suggested fix (do not apply):** Section 6 ❌/✓ using Danny’s coins: ❌ “3 מטבעות” vs ✓ **10 + 2 + 2 = 14**.

---

### 17. `wp_coins_spent.md`

**Page title:** שאלות מילוליות — כמה נשאר?

**Section 5 question (exact):**
> אמיר שילם 10 שקלים על משחק שעלה 7 שקלים. כמה **עודף** הוא מקבל?

**Section 5 hint (exact):**
> *(רמז: שילמו − עלה = עודף — 10 − 7)*

**Section 5 verdict:** **PASS** — Same paid/cost pair **10** and **7**; change **3**.

**Section 6 check:** **NEEDS REVIEW** — Demo is **15 − 6 = 9** “נשאר” (section 4 — יעל); section 5 asks **10 − 7** “עודף”. Different story and numbers.

**Suggested fix (do not apply):** ❌ 10 + 7 = 17 vs ✓ **10 − 7 = 3** עודף.

---

### 18. `wp_time_date.md`

**Page title:** שאלות מילוליות — ימי השבוע

**Section 5 question (exact):**
> היום יום חמישי. **מחר** — איזה יום?

**Section 5 hint (exact):**
> *(רמז: קפיצה אחת קדימה מהיום)*

**Section 5 verdict:** **PASS** — One step forward from Thursday → **שישי** (Friday).

**Section 6 check:** **PASS** — Demo “בעוד 2 ימים from שלישי” teaches counting rule; does not state a conflicting answer for section 5.

**Optional enhancement (not required for PASS):** Hint could name **חמישי → שישי** for extra clarity.

---

### 19. `wp_time_days.md`

**Page title:** שאלות מילוליות — כמה ימים בין יום ליום

**Section 5 question (exact):**
> היום יום שישי. **לפני 2 ימים** — איזה יום היה?

**Section 5 hint (exact):**
> *(רמז: ספרו 2 צעדים **אחורה** משישי)*

**Section 5 verdict:** **PASS** — Two steps back from **שישי** → **רביעי** (Wednesday).

**Section 6 check:** **PASS** — Demo “ראשון → רביעי” teaches span counting; different task type from section 5 but not contradictory.

---

## Cross-cutting patterns

1. **Section 5 hints are consistently authored for the section 5 question** in all 19 drafts (numbers and operations match).
2. **Section 6 almost always copies section 3 or 4 numbers**, while section 5 always introduces new numbers — creating a **sequential-reading mismatch** in the book UI (one section per swipe).
3. **Word-problem and money pages** are the highest-risk cases because section 6 shows a **different total** than section 5 (`wp_coins`, `wp_coins_spent`).
4. **Counting-forward page** section 6 starts its demo at **6** while section 5 starts at **8** — matches the owner-reported “question about 8, explanation from 6” pattern, but the mismatch is in **section 6**, not the section 5 hint.

---

## Confirmations

| Item | Status |
|------|--------|
| Audit file created | `docs/learning-book/MATH_GRADE_1_TRY_IT_YOURSELF_ALIGNMENT_AUDIT.md` |
| Markdown draft content changed | **No** (at audit time) |
| UI / code changed | **No** |
| Routes / registry changed | **No** |
| SQL run | **No** |
| Git commit / push / deploy | **No** |

---

## Corrections applied (2026-06-01)

Section 6 in the following **11 draft files** was updated so common-mistake examples use the **same numbers and context as section 5** (per alignment fix pass):

1. `ns_counting_forward.md` — skip-error demo anchored on **8, 9, 10**
2. `ns_neighbors.md` — neighbors of **12** (11 and 13)
3. `cmp.md` — comparison **14 __ 9**
4. `add_second_decade.md` — make-10 mistake for **9 + 4**
5. `add_two.md` — counting mistake for **7 + 4**
6. `sub_two.md` — counting mistake for **10 − 3**
7. `eq_add_simple.md` — missing addend for **2 + __ = 8**
8. `eq_sub_simple.md` — missing subtrahend for **10 − __ = 7**
9. `mul.md` — groups mistake for **3 × 3**
10. `wp_coins.md` — Danny’s coins → **14 ₪**
11. `wp_coins_spent.md` — Amir’s change → **3 ₪** עודף

**Post-fix status:**

| Metric | Before fix | After fix |
|--------|------------|-----------|
| Section 5 — PASS | 19 | 19 |
| Section 6 — NEEDS REVIEW (11 flagged pages) | 11 | **0** (for those 11) |
| Section 6 — PASS (remaining 8 pages) | 8 | 8 |

`docs/learning-book/MATH_GRADE_1_HEBREW_REVIEW_PACK.md` was regenerated from current drafts via `node scripts/build-math-g1-hebrew-review-pack.mjs`.

All pages remain `approval_status: draft` with `[DRAFT — not owner-approved]` title markers.
