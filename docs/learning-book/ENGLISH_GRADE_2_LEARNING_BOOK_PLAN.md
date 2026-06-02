# Grade 2 English Learning Book — Plan

**Status:** Draft content package — documentation only. No runtime, routes, registry, SQL, commit, push, or deploy.
**Date:** June 2026
**Book title (child-facing):** ספר אנגלית — כיתה ב׳
**Master scope:** `docs/learning-book/ENGLISH_LEARNING_BOOK_MASTER_SCOPE_PLAN.md`

---

## Sources of Truth

| Source | Use |
|--------|-----|
| `data/curriculum-spine/v1/skills.json` | Canonical `skill_id` list and grade spans |
| `docs/learning-book/ENGLISH_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | Grade 2 scope, merge policy |
| `docs/learning-book/ENGLISH_GRADE_1_LEARNING_BOOK_PLAN.md` | Continuing vocab baseline |
| `data/english-curriculum.js` | G2 foundation stage — scope hints only |

---

## 1. Grade 2 English Skills in Scope

Filter: `subject: "english"` AND `minGrade ≤ 2` AND `maxGrade ≥ 2`.

**Spine filter result: 20 rows** → **15 learning pages** (after merges) + **3 excluded meta rows**.

### 1A. New skills (7 page topics)

| skill_id(s) | page file | Hebrew title |
|-------------|-----------|--------------|
| `english:vocabulary:wordlist:food` | `vocab_food.md` | מזון באנגלית |
| `english:vocabulary:wordlist:house` | `vocab_house.md` | בית — חדרים וחפצים |
| `english:pool:grammar:question_frames` + `english:grammar:line:ריבוי_שמות_עצם…` | `grammar_plural_questions.md` | ריבוי ושאלות פשוטות |
| `english:pool:sentence:routine` | `sentence_routine.md` | שגרת יום — משפטים |
| `english:pool:translation:routines` | `translation_routines.md` | שגרת יום — תרגום |

Plus merge page for be (see 1B).

### 1B. Merge decisions

| Merge | Into | Rationale |
|-------|------|-----------|
| `english:grammar:line:חיזוק_to_be_am_is_are_וכינויי_גוף` + `english:pool:grammar:be_basic` | `grammar_be.md` | Same G2 be reinforcement intent |
| `english:grammar:line:ריבוי_שמות_עצם_והיכרות_עם_מבני_שאלות_פשוטים` + `english:pool:grammar:question_frames` | `grammar_plural_questions.md` | Plurals + questions taught together |

**Pages saved:** 2 (17 → 15).

### 1C. Continuing skills (10) — depth change required

| pageId | G1 depth | G2 depth |
|--------|----------|----------|
| vocab_colors … vocab_school (7) | Word recognition | Words in short sentences; initial typing |
| grammar_be | I am / You are only | + He is / She is |
| sentence_base | 2–3 words | 3–4 words + punctuation |
| translation_classroom | Single words/phrases | Short sentence context |

### 1D. Excluded

| skill_id | Reason |
|----------|--------|
| `english:g2:topic:vocabulary` | meta |
| `english:g2:topic:translation` | meta |
| `english:g2:topic:writing` | meta — no writing pool; typing embedded in vocab/sentence pages |
| Present Simple, formal grammar | G3+ spine |
| Alphabet / phonics | Not in spine |

### 1E. Expected English level

**שלב יסוד** — word typing, 3–4 word sentences, am/is/are, plurals, simple questions, routine translation.

---

## 2. Proposed Book Page List

**Page count: 15.**

| Batch | Pages |
|-------|-------|
| A — continuing vocab (7) | vocab_colors, vocab_numbers, vocab_family, vocab_animals, vocab_emotions, vocab_actions, vocab_school |
| B — new vocab (2) | vocab_food, vocab_house |
| C — grammar (2) | grammar_be, grammar_plural_questions |
| D — sentences + translation (4) | sentence_base, sentence_routine, translation_classroom, translation_routines |

---

## 3. Section 5 / Section 6 Alignment

| pageId | Shared anchor |
|--------|---------------|
| vocab_colors | blue |
| vocab_numbers | seven |
| vocab_family | dad |
| vocab_animals | dog |
| vocab_emotions | sad |
| vocab_actions | jump |
| vocab_school | pen |
| vocab_food | apple |
| vocab_house | bed |
| grammar_be | She is |
| grammar_plural_questions | cats |
| sentence_base | I am seven |
| sentence_routine | I wake up |
| translation_classroom | Thank you |
| translation_routines | I eat breakfast |

---

## 4. Deliverables Checklist

| Deliverable | Path | Status |
|-------------|------|--------|
| Plan | `docs/learning-book/ENGLISH_GRADE_2_LEARNING_BOOK_PLAN.md` | ✅ |
| Review pack | `docs/learning-book/ENGLISH_GRADE_2_HEBREW_REVIEW_PACK.md` | ✅ generated |
| Draft pages | `docs/learning-book/english/g2/drafts/*.md` | ✅ 15 pages |
| Draft README | `docs/learning-book/english/g2/drafts/README.md` | ✅ |
| Review pack builder | `scripts/build-english-g2-hebrew-review-pack.mjs` | ✅ |
| Content verifier | `scripts/verify-english-g2-book-content.mjs` | ✅ |
| Draft manifest | `scripts/lib/english-g2-draft-manifest.mjs` | ✅ |

---

## 5. Owner-Review Topics

1. G2 continuing vocab — 7 separate pages vs slimmer recap batch
2. Writing curriculum without spine pools — confirm embedding in sentence pages is enough
3. Plural + questions merged page — confirm
4. Numbers 11–20 introduction on G2 page

---

## 6. Next Step (Not Started)

Owner review of Hebrew review pack → signoff doc → runtime insertion (separate task).
