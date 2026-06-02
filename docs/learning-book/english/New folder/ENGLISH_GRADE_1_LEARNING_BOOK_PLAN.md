# Grade 1 English Learning Book — Plan

**Status:** Draft content package — documentation only. No runtime, routes, registry, SQL, commit, push, or deploy.
**Date:** June 2026
**Book title (child-facing):** ספר אנגלית — כיתה א׳
**Master scope:** `docs/learning-book/ENGLISH_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/ENGLISH_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Grade 1 scope, merge policy, exclusions |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Grades 1–2 seven-section template |
| `data/english-curriculum.js` | G1 exposure stage — scope hints only |

**Other subjects:** Out of scope. **English G2–G6:** separate packages.

---

## 1. Grade 1 English Skills in Scope

Filter: `subject: "english"` AND `minGrade ≤ 1` AND `maxGrade ≥ 1`.

**Spine filter result: 12 rows** → **10 learning pages** (after merge) + **1 excluded meta row**.

### 1A. Included — teachable (10 pages after merge)

| # | skill_id(s) | page file | Hebrew title |
|---|-------------|-----------|--------------|
| 1 | `english:vocabulary:wordlist:colors` | `vocab_colors.md` | צבעים באנגלית |
| 2 | `english:vocabulary:wordlist:numbers` | `vocab_numbers.md` | מספרים 0–10 באנגלית |
| 3 | `english:vocabulary:wordlist:family` | `vocab_family.md` | משפחה באנגלית |
| 4 | `english:vocabulary:wordlist:animals` | `vocab_animals.md` | חיות באנגלית |
| 5 | `english:vocabulary:wordlist:emotions` | `vocab_emotions.md` | רגשות באנגלית |
| 6 | `english:vocabulary:wordlist:actions` | `vocab_actions.md` | פעולות באנגלית |
| 7 | `english:vocabulary:wordlist:school` | `vocab_school.md` | בית ספר באנגלית |
| 8 | `english:pool:grammar:be_basic` + `english:grammar:line:חשיפה_ל_i_am_you_are_…` | `grammar_be.md` | I am / You are — היכרות |
| 9 | `english:pool:sentence:base` | `sentence_base.md` | משפטים קצרים — בסיס |
| 10 | `english:pool:translation:classroom` | `translation_classroom.md` | ביטויי כיתה |

### 1B. Merge decision — G1 be

| Rows merged | Into | Rationale |
|-------------|------|-----------|
| `english:grammar:line:חשיפה_ל_i_am_you_are_ולכינויי_גוף_בסיסיים_בתוך_תבניות_קבועות` | `grammar_be.md` | Same G1 exposure intent as `be_basic` pool |
| `english:pool:grammar:be_basic` | `grammar_be.md` | Primary `skill_id` on merged page |

**Page count saved:** 1 (11 → 10).

### 1C. Continuing from earlier grades

None — Grade 1 is the entry point.

### 1D. Excluded

| skill_id | Reason |
|----------|--------|
| `english:g1:topic:vocabulary` | `curriculum_topic_access` — meta binding |
| Alphabet / phonics | Not in English spine |
| `english:g2:topic:writing` | Not in G1 scope |
| Mixed topic | G3+ only |

### 1E. Expected English level

**שלב חשיפה** — word recognition, fixed `I am` / `You are` patterns, 2–3 word sentences, classroom phrases. No formal grammar terminology.

---

## 2. Proposed Book Page List

`learning_page_id`: `english:g1:{pageId}`  
All pages: `age_band: grades_1_2`, `approval_status: draft`, `subject: english`.

| Batch | Order | pageId | learning_page_id |
|-------|-------|--------|------------------|
| A | 1–3 | vocab_colors, vocab_numbers, vocab_family | `english:g1:vocab_*` |
| B | 4–7 | vocab_animals, vocab_emotions, vocab_actions, vocab_school | `english:g1:vocab_*` |
| C | 8–10 | grammar_be, sentence_base, translation_classroom | `english:g1:grammar_be` etc. |

**Page count: 10.**

---

## 3. Section 5 / Section 6 Alignment

| pageId | Shared anchor (English) |
|--------|-------------------------|
| vocab_colors | red |
| vocab_numbers | five |
| vocab_family | mom |
| vocab_animals | cat |
| vocab_emotions | happy |
| vocab_actions | run |
| vocab_school | book |
| grammar_be | I am |
| sentence_base | I am happy |
| translation_classroom | Hello |

---

## 4. Content Safety (Grade 1)

- Hebrew explanations; English on own lines for LTR/Bidi review
- No `[DRAFT]` in section bodies
- No internal keys in child-facing text
- Section 7: text-only invitation — no practice routing
- No markdown tables or code fences in section bodies

---

## 5. Deliverables Checklist

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/ENGLISH_GRADE_1_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `docs/learning-book/ENGLISH_GRADE_1_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Draft pages | `docs/learning-book/english/g1/drafts/*.md` | ✅ 10 pages |
| Draft README | `docs/learning-book/english/g1/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-english-g1-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-english-g1-book-content.mjs` | ✅ |
| Draft manifest | `scripts/lib/english-g1-draft-manifest.mjs` | ✅ |

**Not in scope:** registry, routes, loaders, themes, English Master practice CTA, SQL, commit, push.

---

## 6. Owner-Review Topics

1. G1 page count (10) vs grouped vocab mega-pages
2. Numbers scope: 0–10 only — confirm vs curriculum 0–20 hint
3. Merged `grammar_be` — confirm single page
4. Bidi rendering of English lines in Hebrew paragraphs

---

## 7. Next Step (Not Started)

Runtime insertion — separate task after owner signoff on Hebrew review pack.
