# English / אנגלית Learning Book — Master Scope Plan

**Status:** Documentation / mapping only. No page drafts. No runtime registry. No routes. No design/CSS/themes. No commits.
**Date:** June 2026
**Scope:** English subject (`english`), grades 1–6
**Child-facing book title (draft):** ספר אנגלית — כיתה X
**Verifier:** `node scripts/verify-english-learning-book-master-scope.mjs`
**Machine-readable manifest:** `scripts/lib/english-learning-book-master-scope-manifest.mjs`

---

## Table of Contents

1. [Sources Inspected](#1-sources-inspected)
2. [English Subject Key](#2-english-subject-key)
3. [Spine Architecture (English)](#3-spine-architecture-english)
4. [Full English Skill List (skills.json)](#4-full-english-skill-list-skillsjson)
5. [Grade-by-Grade Mapping](#5-grade-by-grade-mapping)
6. [Cross-Grade Progression Table](#6-cross-grade-progression-table)
7. [Duplicate / Repetition Risk](#7-duplicate--repetition-risk)
8. [Language Policy for Later Authoring](#8-language-policy-for-later-authoring)
9. [Owner-Review Questions](#9-owner-review-questions)
10. [Risks Before Content Authoring](#10-risks-before-content-authoring)
11. [Proposed Next Step](#11-proposed-next-step)

---

## 1. Sources Inspected

| Source | Role in this plan |
|--------|-------------------|
| `data/curriculum-spine/v1/skills.json` | **Primary source of truth** — 81 English skill rows, grade spans, spine layers |
| `data/english-curriculum.js` | Grade stages, topic lists, grammar/vocabulary curriculum lines (scope hints only) |
| `utils/english-grade-topic-policy.js` | Topic-to-grade policy alignment (context only) |
| `utils/english-question-generator.js` | Generator pool scope hints (not source of truth) |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules: grade scope, no fallback, approved content, skill_id binding |
| `docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md` | Structural reference: skill tables, page-type vocabulary, wide-span skills |
| `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` | Per-grade plan structure: included / new / continuing / excluded / page list |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Future 7-section page pattern (Grades 1–2 / 3–4 / 5–6 age bands) |
| `docs/learning-book/LEARNING_BOOK_FULL_STRUCTURE_EXPANSION.md` | Infrastructure conventions (not modified; reference for future insertion) |

**Not used as source of truth:** question pools, diagnostic metadata, product-quality phase docs, English Master runtime.

**Grade membership rule applied throughout:**

> A skill belongs to grade G when `subject === "english"` AND `minGrade ≤ G` AND `maxGrade ≥ G`.

---

## 2. English Subject Key

**Verified subject key:** `english`

All subjects present in `skills.json`:

| subject key | Notes |
|-------------|-------|
| `english` | **This plan** |
| `hebrew` | Separate Hebrew learning book track |
| `math` | Math learning books (existing) |
| `geometry` | Geometry learning books (existing) |
| `science` | Out of scope |
| `geography` | Out of scope |

No alternate key (`eng`, `english_language`, etc.) appears in the spine.

---

## 3. Spine Architecture (English)

81 total English skills across **4 spine layers** and **6 topic domains**:

| spine_layer | Count | Learning-book treatment |
|-------------|-------|-------------------------|
| `curriculum_topic_access` | 22 | **Excluded** — meta topic binding (like `geometry:kind:no_question`) |
| `vocabulary_wordlist` | 20 | **Teachable** — one grade-specific page per word-list skill per grade |
| `curriculum_grammar_line` | 11 | **Teachable** — grade-specific grammar curriculum line |
| `question_bank_pool` | 22 | **Teachable** — grammar / sentence / translation pool coverage |
| `mixed` topic access | 4 | **Excluded** — practice-mode aggregator (G3–G6 only) |

**Topic domains in English spine:**

| topic | Present from | Notes |
|-------|--------------|-------|
| `vocabulary` | G1 | Word lists + per-grade access rows |
| `translation` | G2 | Bidirectional sentence translation pools |
| `writing` | G2 | **Access rows only** — no writing pool skills in spine |
| `grammar` | G1 (exposure) / G3 (formal) | Grammar lines + pools |
| `sentences` | G1 (base) / G3 (formal) | Sentence-building pools |
| `mixed` | G3 | Excluded from book |

**Not in English spine (explicitly out of scope):**

- Letters / alphabet / phonics
- Reading comprehension as a standalone topic
- Text types (essay, report, letter) as spine skills
- Listening / speaking skills
- Spelling rules as separate skills

These may appear informally inside vocabulary or sentence pages but must not be invented as new spine skills without governance.

---

## 4. Full English Skill List (skills.json)

### 4A. Summary by grade (filter counts)

| Grade | Skills in scope (`minGrade ≤ G ≤ maxGrade`) | Teachable pages proposed | Excluded (meta/mixed) |
|-------|-----------------------------------------------|--------------------------|------------------------|
| G1 | 12 | **11** | 1 |
| G2 | 20 | **17** | 3 |
| G3 | 26 | **20** | 6 |
| G4 | 27 | **21** | 6 |
| G5 | 29 | **23** | 6 |
| G6 | 25 | **19** | 6 |
| **Unique skill_ids** | **81** | — | 28 excluded rows across grades |

> **Important:** Wide-span skills (e.g. `vocabulary:wordlist:animals` G1–G6) require **separate grade-specific pages**, not one reused page.

### 4B. Complete skill registry (all 81 rows)

#### Vocabulary — word lists (20)

| skill_id | subtopic | Grade span | Layer |
|----------|----------|------------|-------|
| `english:vocabulary:wordlist:actions` | actions | G1–G3 | vocabulary_wordlist |
| `english:vocabulary:wordlist:animals` | animals | G1–G6 | vocabulary_wordlist |
| `english:vocabulary:wordlist:body` | body | G3–G4 | vocabulary_wordlist |
| `english:vocabulary:wordlist:colors` | colors | G1–G3 | vocabulary_wordlist |
| `english:vocabulary:wordlist:community` | community | G4–G6 | vocabulary_wordlist |
| `english:vocabulary:wordlist:culture` | culture | G6 | vocabulary_wordlist |
| `english:vocabulary:wordlist:emotions` | emotions | G1–G6 | vocabulary_wordlist |
| `english:vocabulary:wordlist:environment` | environment | G4–G6 | vocabulary_wordlist |
| `english:vocabulary:wordlist:family` | family | G1–G5 | vocabulary_wordlist |
| `english:vocabulary:wordlist:food` | food | G2–G5 | vocabulary_wordlist |
| `english:vocabulary:wordlist:global_issues` | global_issues | G6 | vocabulary_wordlist |
| `english:vocabulary:wordlist:health` | health | G5–G6 | vocabulary_wordlist |
| `english:vocabulary:wordlist:history` | history | G6 | vocabulary_wordlist |
| `english:vocabulary:wordlist:house` | house | G2–G3 | vocabulary_wordlist |
| `english:vocabulary:wordlist:numbers` | numbers | G1–G3 | vocabulary_wordlist |
| `english:vocabulary:wordlist:school` | school | G1–G5 | vocabulary_wordlist |
| `english:vocabulary:wordlist:sports` | sports | G3–G5 | vocabulary_wordlist |
| `english:vocabulary:wordlist:technology` | technology | G5–G6 | vocabulary_wordlist |
| `english:vocabulary:wordlist:travel` | travel | G4–G6 | vocabulary_wordlist |
| `english:vocabulary:wordlist:weather` | weather | G3–G4 | vocabulary_wordlist |

#### Vocabulary — topic access (6, excluded from pages)

| skill_id | Grade | Layer |
|----------|-------|-------|
| `english:g1:topic:vocabulary` | G1 | curriculum_topic_access |
| `english:g2:topic:vocabulary` | G2 | curriculum_topic_access |
| `english:g3:topic:vocabulary` | G3 | curriculum_topic_access |
| `english:g4:topic:vocabulary` | G4 | curriculum_topic_access |
| `english:g5:topic:vocabulary` | G5 | curriculum_topic_access |
| `english:g6:topic:vocabulary` | G6 | curriculum_topic_access |

#### Grammar — curriculum lines (11)

| skill_id | Grade span | Layer |
|----------|------------|-------|
| `english:grammar:line:חשיפה_ל_i_am_you_are_ולכינויי_גוף_בסיסיים_בתוך_תבניות_קבועות` | G1 | curriculum_grammar_line |
| `english:grammar:line:חיזוק_to_be_am_is_are_וכינויי_גוף` | G2 | curriculum_grammar_line |
| `english:grammar:line:ריבוי_שמות_עצם_והיכרות_עם_מבני_שאלות_פשוטים` | G2 | curriculum_grammar_line |
| `english:grammar:line:present_simple_בחיובי_שלילי_שאלה` | G3 | curriculum_grammar_line |
| `english:grammar:line:תארים_בסיסיים_יידוע_a_an_the_ומילות_יחס_מקום_in_on_under` | G3 | curriculum_grammar_line |
| `english:grammar:line:present_simple_לעומת_present_continuous` | G4 | curriculum_grammar_line |
| `english:grammar:line:some_any_much_many_כינויי_שייכות_ותוארי_פועל_slowly_quickly` | G4 | curriculum_grammar_line |
| `english:grammar:line:past_simple_סדירים_חריגים_נפוצים` | G5 | curriculum_grammar_line |
| `english:grammar:line:מודאליים_בסיסיים_future_will_going_to_והשוואתיים` | G5 | curriculum_grammar_line |
| `english:grammar:line:past_continuous_לצד_past_simple_היכרות_עם_present_perfect` | G6 | curriculum_grammar_line |
| `english:grammar:line:conditionals_type_0_1_ומודאליים_should_might_could` | G6 | curriculum_grammar_line |

#### Grammar — question pools (13)

| skill_id | subtopic | Grade span | Layer |
|----------|----------|------------|-------|
| `english:pool:grammar:be_basic` | be_basic | G1–G2 | question_bank_pool |
| `english:pool:grammar:question_frames` | question_frames | G2–G3 | question_bank_pool |
| `english:pool:grammar:present_simple` | present_simple | G3–G4 | question_bank_pool |
| `english:pool:grammar:progressive` | progressive | G4 | question_bank_pool |
| `english:pool:grammar:quantifiers` | quantifiers | G4–G5 | question_bank_pool |
| `english:pool:grammar:past_simple` | past_simple | G5 | question_bank_pool |
| `english:pool:grammar:future_forms` | future_forms | G5 | question_bank_pool |
| `english:pool:grammar:modals` | modals | G5–G6 | question_bank_pool |
| `english:pool:grammar:comparatives` | comparatives | G5–G6 | question_bank_pool |
| `english:pool:grammar:complex_tenses` | complex_tenses | G6 | question_bank_pool |
| `english:pool:grammar:conditionals` | conditionals | G6 | question_bank_pool |

#### Translation — pools (7) + access (5 excluded)

**Pools (teachable):**

| skill_id | subtopic | Grade span |
|----------|----------|------------|
| `english:pool:translation:classroom` | classroom | G1–G2 |
| `english:pool:translation:routines` | routines | G2–G3 |
| `english:pool:translation:hobbies` | hobbies | G3–G4 |
| `english:pool:translation:community` | community | G4–G5 |
| `english:pool:translation:technology` | technology | G5–G6 |
| `english:pool:translation:global` | global | G5–G6 |

**Access rows (excluded):** `english:g2:topic:translation` through `english:g6:topic:translation`

#### Sentences — pools (5) + access (4 excluded)

**Pools (teachable):**

| skill_id | subtopic | Grade span |
|----------|----------|------------|
| `english:pool:sentence:base` | base | G1–G2 |
| `english:pool:sentence:routine` | routine | G2–G4 |
| `english:pool:sentence:descriptive` | descriptive | G3–G4 |
| `english:pool:sentence:narrative` | narrative | G4–G5 |
| `english:pool:sentence:advanced` | advanced | G5–G6 |

**Access rows (excluded):** `english:g3:topic:sentences` through `english:g6:topic:sentences`

#### Writing — access only (5, all excluded)

| skill_id | Grade |
|----------|-------|
| `english:g2:topic:writing` | G2 |
| `english:g3:topic:writing` | G3 |
| `english:g4:topic:writing` | G4 |
| `english:g5:topic:writing` | G5 |
| `english:g6:topic:writing` | G6 |

No `question_bank_pool` or `curriculum_grammar_line` rows exist for writing. Writing objectives from `english-curriculum.js` must be addressed within sentence / translation pages until spine expands.

#### Mixed — access only (4, all excluded)

`english:g3:topic:mixed` … `english:g6:topic:mixed`

---

## 5. Grade-by-Grade Mapping

### Grade 1 — כיתה א׳

**Expected English level:** שלב חשיפה (exposure) — recognition of basic words; fixed patterns only (`I am` / `You are`); no formal grammar terminology.

**Included skills:** 12 | **Teachable pages:** 11 | **Excluded:** 1

#### New skills (11)

| skill_id | Proposed page candidate | Page type |
|----------|-------------------------|-----------|
| `english:vocabulary:wordlist:colors` | `english:g1:vocab:colors` | vocabulary_theme |
| `english:vocabulary:wordlist:numbers` | `english:g1:vocab:numbers` | vocabulary_theme |
| `english:vocabulary:wordlist:family` | `english:g1:vocab:family` | vocabulary_theme |
| `english:vocabulary:wordlist:animals` | `english:g1:vocab:animals` | vocabulary_theme |
| `english:vocabulary:wordlist:emotions` | `english:g1:vocab:emotions` | vocabulary_theme |
| `english:vocabulary:wordlist:actions` | `english:g1:vocab:actions` | vocabulary_theme |
| `english:vocabulary:wordlist:school` | `english:g1:vocab:school` | vocabulary_theme |
| `english:grammar:line:חשיפה_ל_i_am_you_are_ולכינויי_גוף_בסיסיים_בתוך_תבניות_קבועות` | `english:g1:grammar:be_exposure` | concept_foundation |
| `english:pool:grammar:be_basic` | `english:g1:grammar:be_basic` | concept_foundation *(merge candidate with line above)* |
| `english:pool:sentence:base` | `english:g1:sentence:base` | visual_intuition |
| `english:pool:translation:classroom` | `english:g1:translation:classroom` | practice_bridge |

#### Continuing from earlier grades

None — G1 is the entry point.

#### Excluded

| skill_id | Reason |
|----------|--------|
| `english:g1:topic:vocabulary` | `curriculum_topic_access` meta row |

#### Out-of-scope for G1 book

- Translation beyond classroom phrases (topic starts G2 in curriculum)
- Formal grammar (Present Simple starts G3)
- Writing topic (starts G2)
- Numbers above 20, abstract vocabulary themes (community, environment, etc.)

---

### Grade 2 — כיתה ב׳

**Expected English level:** שלב יסוד (foundation) — word typing, short 3–4 word sentences, plural nouns, simple questions.

**Included skills:** 20 | **Teachable pages:** 17 | **Excluded:** 3

#### New skills (7)

| skill_id | Proposed page candidate |
|----------|-------------------------|
| `english:vocabulary:wordlist:food` | `english:g2:vocab:food` |
| `english:vocabulary:wordlist:house` | `english:g2:vocab:house` |
| `english:grammar:line:חיזוק_to_be_am_is_are_וכינויי_גוף` | `english:g2:grammar:be_reinforcement` |
| `english:grammar:line:ריבוי_שמות_עצם_והיכרות_עם_מבני_שאלות_פשוטים` | `english:g2:grammar:plural_questions` |
| `english:pool:grammar:question_frames` | `english:g2:grammar:question_frames` |
| `english:pool:sentence:routine` | `english:g2:sentence:routine` |
| `english:pool:translation:routines` | `english:g2:translation:routines` |

#### Continuing skills (10) — depth change required

| skill_id | G1 depth | G2 depth |
|----------|----------|----------|
| `english:vocabulary:wordlist:*` (7 lists) | Recognition / picture match | Add typing + use in short sentences |
| `english:pool:grammar:be_basic` | Fixed `I am` / `You are` patterns | Full am/is/are table with pronouns |
| `english:pool:sentence:base` | 2–3 word patterns | 3–4 word sentences with punctuation |
| `english:pool:translation:classroom` | Single words / fixed phrases | Short sentence translation |

#### Excluded

| skill_id | Reason |
|----------|--------|
| `english:g2:topic:vocabulary` | meta |
| `english:g2:topic:translation` | meta |
| `english:g2:topic:writing` | meta — no writing pool; writing tips embedded in sentence pages |

---

### Grade 3 — כיתה ג׳

**Expected English level:** שלב ראשית אוריינות — Present Simple (affirmative/negative/question), articles, prepositions; active sentence building.

**Included skills:** 26 | **Teachable pages:** 20 | **Excluded:** 6

#### New skills (8)

| skill_id | Proposed page candidate |
|----------|-------------------------|
| `english:grammar:line:present_simple_בחיובי_שלילי_שאלה` | `english:g3:grammar:present_simple_forms` |
| `english:grammar:line:תארים_בסיסיים_יידוע_a_an_the_ומילות_יחס_מקום_in_on_under` | `english:g3:grammar:articles_prepositions` |
| `english:pool:grammar:present_simple` | `english:g3:grammar:present_simple` |
| `english:pool:sentence:descriptive` | `english:g3:sentence:descriptive` |
| `english:pool:translation:hobbies` | `english:g3:translation:hobbies` |
| `english:vocabulary:wordlist:body` | `english:g3:vocab:body` |
| `english:vocabulary:wordlist:sports` | `english:g3:vocab:sports` |
| `english:vocabulary:wordlist:weather` | `english:g3:vocab:weather` |

#### Continuing skills (12)

Colors, numbers, actions (final year), house, food, family, school, animals, emotions — vocabulary depth adds sentence context. `question_frames`, `routine` sentences, `routines` translation deepen from G2.

#### Excluded

All six `english:g3:topic:*` access rows + `english:g3:topic:mixed`.

#### Out-of-scope for G3

- Present Continuous (G4)
- Past tenses (G5)
- Community / environment vocab themes (G4+)

---

### Grade 4 — כיתה ד׳

**Expected English level:** שלב אוריינות מתפתחת — Present Simple vs Continuous; quantifiers; short paragraph writing (via sentence pages).

**Included skills:** 27 | **Teachable pages:** 21 | **Excluded:** 6

#### New skills (9)

| skill_id | Proposed page candidate |
|----------|-------------------------|
| `english:grammar:line:present_simple_לעומת_present_continuous` | `english:g4:grammar:simple_vs_continuous` |
| `english:grammar:line:some_any_much_many_כינויי_שייכות_ותוארי_פועל_slowly_quickly` | `english:g4:grammar:quantifiers_possessives_adverbs` |
| `english:pool:grammar:progressive` | `english:g4:grammar:progressive` |
| `english:pool:grammar:quantifiers` | `english:g4:grammar:quantifiers` |
| `english:pool:sentence:narrative` | `english:g4:sentence:narrative` |
| `english:pool:translation:community` | `english:g4:translation:community` |
| `english:vocabulary:wordlist:community` | `english:g4:vocab:community` |
| `english:vocabulary:wordlist:environment` | `english:g4:vocab:environment` |
| `english:vocabulary:wordlist:travel` | `english:g4:vocab:travel` |

#### Continuing skills (12)

Present Simple pool (second year — contrast focus), descriptive/routine sentences, hobbies translation, body/weather/sports vocab, animals/emotions/family/school/food.

#### Excluded

All six `english:g4:topic:*` access rows.

---

### Grade 5 — כיתה ה׳

**Expected English level:** שלב אוריינות מורחבת — Past Simple, modals, future forms, comparatives; longer texts.

**Included skills:** 29 | **Teachable pages:** 23 | **Excluded:** 6

#### New skills (11)

| skill_id | Proposed page candidate |
|----------|-------------------------|
| `english:grammar:line:past_simple_סדירים_חריגים_נפוצים` | `english:g5:grammar:past_simple_curriculum` |
| `english:grammar:line:מודאליים_בסיסיים_future_will_going_to_והשוואתיים` | `english:g5:grammar:modals_future_comparatives` |
| `english:pool:grammar:past_simple` | `english:g5:grammar:past_simple` |
| `english:pool:grammar:future_forms` | `english:g5:grammar:future_forms` |
| `english:pool:grammar:modals` | `english:g5:grammar:modals` |
| `english:pool:grammar:comparatives` | `english:g5:grammar:comparatives` |
| `english:pool:sentence:advanced` | `english:g5:sentence:advanced` |
| `english:pool:translation:technology` | `english:g5:translation:technology` |
| `english:pool:translation:global` | `english:g5:translation:global` |
| `english:vocabulary:wordlist:health` | `english:g5:vocab:health` |
| `english:vocabulary:wordlist:technology` | `english:g5:vocab:technology` |

#### Continuing skills (12)

Quantifiers (second year), narrative sentences, community translation, environment/travel/community vocab, animals/emotions/sports/school/food/family.

#### Excluded

All six `english:g5:topic:*` access rows.

#### Note — family / school vocab

`family` and `school` word lists end at G5 (`maxGrade: 5`). G6 book should not include those lists unless spine is extended.

---

### Grade 6 — כיתה ו׳

**Expected English level:** שלב מתקדם — complex tenses, conditionals, global topics; middle-school readiness.

**Included skills:** 25 | **Teachable pages:** 19 | **Excluded:** 6

#### New skills (7)

| skill_id | Proposed page candidate |
|----------|-------------------------|
| `english:grammar:line:past_continuous_לצד_past_simple_היכרות_עם_present_perfect` | `english:g6:grammar:complex_tenses_curriculum` |
| `english:grammar:line:conditionals_type_0_1_ומודאליים_should_might_could` | `english:g6:grammar:conditionals_modals` |
| `english:pool:grammar:complex_tenses` | `english:g6:grammar:complex_tenses` |
| `english:pool:grammar:conditionals` | `english:g6:grammar:conditionals` |
| `english:vocabulary:wordlist:culture` | `english:g6:vocab:culture` |
| `english:vocabulary:wordlist:global_issues` | `english:g6:vocab:global_issues` |
| `english:vocabulary:wordlist:history` | `english:g6:vocab:history` |

#### Continuing skills (12)

Modals, comparatives (second year), advanced sentences, technology/global translation, health/technology/travel/environment/community/animals/emotions vocab.

#### Excluded

All six `english:g6:topic:*` access rows.

#### Out-of-scope for G6 book

- `family`, `school`, `food`, `sports`, `colors`, `numbers`, `actions`, `house`, `body`, `weather` word lists (spine `maxGrade < 6`)
- Conditionals type 2+ (not in spine)
- Full Present Perfect mastery (spine says היכרות — introduction only)

---

## 6. Cross-Grade Progression Table

| Domain | G1 | G2 | G3 | G4 | G5 | G6 |
|--------|----|----|----|----|----|----|
| **Letters / phonics** | — | — | — | — | — | — *(not in spine)* |
| **Vocabulary** | 7 basic themes: colors, numbers, family, animals, emotions, actions, school | +food, house; typing introduced | +body, sports, weather; words in sentences | +community, environment, travel | +health, technology; abstract nouns | +culture, global_issues, history |
| **Sentence structure** | Fixed 2–3 word patterns (`base`) | Daily routines (`routine`) | Descriptive sentences; Present Simple frames | Narrative sequencing; tense contrast in context | Advanced multi-clause sentences | Complex tense combinations in context |
| **Reading comprehension** | — *(implicit in translation)* | Short phrase translation | Short sentence translation | 2-action sentences | 8–10 word sentences | Long sentences; opinion prompts *(via writing curriculum, not spine)* |
| **Grammar** | `be` exposure in fixed templates | am/is/are + plurals + question frames | Present Simple ±/? ; a/an/the ; in/on/under | Present Simple vs Continuous; some/any; adverbs | Past Simple; modals; future; comparatives | Past Continuous; Present Perfect intro; conditionals 0/1 |
| **Writing / expression** | — | Typing words *(curriculum; no spine pool)* | 5+ short sentences *(curriculum)* | 3–4 sentence paragraph *(curriculum)* | 2 short paragraphs *(curriculum)* | Opinion statements *(curriculum)* |
| **Translation** | Classroom words/phrases | Daily routines | Hobbies | Community | Technology + global topics | Technology + global (continuing) |
| **Text types** | — | — | — | — | — | — *(not in spine)* |

### Topic introduction timeline

| Topic | First appears (curriculum + spine) |
|-------|-------------------------------------|
| vocabulary | G1 |
| translation | G2 |
| writing (UI topic) | G2 — **no teachable spine rows** |
| grammar (formal) | G3 |
| sentences (formal) | G3 |
| mixed (practice mode) | G3 — **excluded from book** |

---

## 7. Duplicate / Repetition Risk

Skills spanning multiple grades **must not reuse the same page content**. Each grade gets a distinct `learning_page_id` (e.g. `english:g3:vocab:animals` ≠ `english:g1:vocab:animals`).

### High-risk wide-span skills

| skill_id | Grades | What must change each year |
|----------|--------|----------------------------|
| `english:vocabulary:wordlist:animals` | G1–G6 | G1: 5–8 common animals; G3: habitats; G6: conservation / global_issues crossover |
| `english:vocabulary:wordlist:emotions` | G1–G6 | G1: happy/sad; G4: worried/excited; G6: frustrated/proud |
| `english:pool:grammar:be_basic` | G1–G2 | G1: fixed templates; G2: full pronoun chart |
| `english:pool:grammar:present_simple` | G3–G4 | G3: forms; G4: contrast with Continuous |
| `english:pool:grammar:quantifiers` | G4–G5 | G4: some/any introduction; G5: much/many in past/future context |
| `english:pool:grammar:modals` | G5–G6 | G5: can/must/have to; G6: should/might/could |
| `english:pool:grammar:comparatives` | G5–G6 | G5: -er/than; G6: superlatives + irregular |
| `english:pool:sentence:routine` | G2–G4 | G2: My day starts…; G4: frequency adverbs + Continuous |
| `english:pool:sentence:advanced` | G5–G6 | G5: 6–8 words; G6: 10+ words with subordinate clauses |
| `english:pool:translation:technology` | G5–G6 | G5: devices; G6: digital citizenship vocabulary |

### Grammar line + pool pairs (merge candidates)

At several grades, a `curriculum_grammar_line` and a `question_bank_pool` cover the same curriculum intent. **Default plan: one combined page per grade** unless owner prefers split pages.

| Grade | Line skill | Pool skill | Recommendation |
|-------|-----------|------------|----------------|
| G1 | `…חשיפה_ל_i_am_you_are…` | `english:pool:grammar:be_basic` | **Merge** → 1 page |
| G2 | `…חיזוק_to_be…` | `english:pool:grammar:be_basic` | **Merge** → 1 page (G2 be page) |
| G3 | `…present_simple_בחיובי…` | `english:pool:grammar:present_simple` | **Merge** → 1 page |
| G4 | `…present_simple_לעומת…` | `english:pool:grammar:progressive` | **Merge** → 1 page |
| G4 | `…some_any_much_many…` | `english:pool:grammar:quantifiers` | **Merge** → 1 page |
| G5 | `…past_simple_סדירים…` | `english:pool:grammar:past_simple` | **Merge** → 1 page |
| G5 | `…מודאליים_בסיסיים…` | modals + future + comparatives pools | **Split or series** — owner decision (3 pools) |
| G6 | `…past_continuous…` | `english:pool:grammar:complex_tenses` | **Merge** → 1 page |
| G6 | `…conditionals…` | `english:pool:grammar:conditionals` | **Merge** → 1 page |

If merges are approved, page counts drop by ~8–10 across all grades (e.g. G1: 10 pages instead of 11).

---

## 8. Language Policy for Later Authoring

| Rule | Detail |
|------|--------|
| **Explanation language** | Hebrew — natural, age-appropriate child-facing prose |
| **English examples** | English words, phrases, and sentences appear where the skill requires them |
| **UI labels** | Avoid unnecessary English UI labels; book chrome stays Hebrew (`ספר אנגלית`) |
| **Grammar terminology** | English terms (Present Simple, modal) paired with simple Hebrew explanation on first use |
| **Internal keys** | Never expose `skill_id`, `spine_layer`, or pool names in child-facing UI |
| **Section format** | Follow 7-section book pattern from `MATH_LEARNING_PAGE_TEMPLATE.md` when authoring begins |
| **Practice CTA (§7)** | No fake practice mappings in this phase — separate task after resolver confidence |
| **Approval** | All titles marked `[DRAFT — not owner-approved]` until signoff |

### Bidi / mixed-language QA checklist (future runtime)

English books will contain mixed Hebrew + English/LTR content. Future QA must verify:

- English words embedded in Hebrew paragraphs render LTR correctly
- Full English example sentences are visually LTR (not reversed)
- Punctuation direction around English inserts (commas, periods, question marks)
- Quoted English words inside Hebrew quotes
- A/B/C or 1/2/3 option labels if used in examples
- Apostrophes and contractions (`don't`, `I'm`) — common bidi failure points
- Numbers adjacent to English words (e.g. `3 cats`)

**Authoring convention (draft):** wrap standalone English examples in a dedicated LTR block in markdown when the reader supports it; until then, keep English examples on their own line.

---

## 9. Owner-Review Questions

1. **Grammar merge policy:** Should `curriculum_grammar_line` + matching `question_bank_pool` become one page per grade (recommended), or separate pages?
2. **G1 page count:** Is 10–11 pages appropriate for Grade 1 exposure, or should vocab lists be grouped (e.g. one "מילים בסיסיות" mega-page)?
3. **Writing without spine pools:** G2–G6 curriculum declares `writing` but spine has access rows only. Should writing be (a) embedded in sentence pages, (b) deferred until spine adds writing pools, or (c) approved as exception pages without spine binding?
4. **Phonics / alphabet gap:** Official English curriculum in Israel often includes letters early. Spine has no phonics skills. Confirm intentional omission or request spine expansion.
5. **Reading comprehension:** No standalone spine topic. Should short "read and understand" sections appear inside translation/sentence pages?
6. **Child-facing subject name:** `ספר אנגלית` vs `ספר English` vs `ספר לימוד אנגלית`?
7. **G5 grammar bundle:** Three pools (past_simple, future_forms, modals, comparatives) plus one curriculum line — one page or a short multi-page grammar unit?
8. **Present Perfect at G6:** Spine says היכרות (introduction). How deep should the G6 page go?
9. **Vocab list end dates:** `family`/`school` end at G5; confirm G6 book should omit them.
10. **Mixed topic:** Confirm no learning-book page for mixed practice mode.

---

## 10. Risks Before Content Authoring

| Risk | Mitigation |
|------|------------|
| **Too much English too early (G1)** | Keep G1 pages Hebrew-heavy; English limited to target words and fixed patterns; no grammar jargon |
| **Hebrew explanation vs English example mismatch** | Owner review pack with side-by-side QA; verify every English example matches the Hebrew explanation |
| **Grammar terms needing simple Hebrew** | Glossary appendix per grade band; first-use pattern: English term + Hebrew meaning |
| **Bidi/LTR in mixed text** | Dedicated LTR blocks; runtime QA checklist (§8); test on mobile Safari + Chrome |
| **Blind page reuse across grades** | Mandatory distinct `learning_page_id` per grade; continuing-skill table documents depth delta |
| **Writing topic orphan** | Resolve owner Q3 before G2 authoring starts |
| **Grammar line subtopic encoding** | Spine subtopics use Hebrew slug keys — internal only; child-facing titles must be clean Hebrew |
| **Page count inflation** | Consider grammar merges; vocab grouping for G1–G2 if owner approves |

---

## 11. Proposed Next Step

After owner approval of this master scope plan:

1. Create **separate per-grade content packages** (`ENGLISH_GRADE_N_LEARNING_BOOK_PLAN.md`) following the Geometry G1 plan structure.
2. Author draft markdown pages under `docs/learning-book/english/gN/drafts/` — **not started in this task**.
3. Build per-grade verifier scripts (pattern: `verify-geometry-g1-book-content.mjs`).
4. Runtime insertion (registry, routes, catalog, skill→page resolver) — **separate task after content signoff**.
5. Practice reverse-map (§7 CTA → English Master) — **separate task after resolver confidence**.

---

## Appendix A — Proposed Page Count Summary

| Grade | Teachable skills | Proposed pages (1:1) | After grammar merges (estimate) |
|-------|------------------|----------------------|----------------------------------|
| G1 | 11 | 11 | ~10 |
| G2 | 17 | 17 | ~15 |
| G3 | 20 | 20 | ~18 |
| G4 | 21 | 21 | ~18 |
| G5 | 23 | 23 | ~19 |
| G6 | 19 | 19 | ~17 |
| **Total** | **111 grade-slots** | **111** | **~97** |

> 111 grade-slots = sum of teachable skills across G1–G6 (same skill_id counted once per grade where in scope).

---

## Appendix B — Page Type Vocabulary (English book)

| Code | Use for |
|------|---------|
| `vocabulary_theme` | Word-list pages — themed vocabulary with Hebrew glosses |
| `concept_foundation` | Grammar introduction — what rule means and why |
| `visual_intuition` | Sentence patterns anchored to daily-life context |
| `step_by_step_procedure` | How to form a tense / question / negative |
| `contrast_page` | Simple vs Continuous, past vs present, etc. |
| `practice_bridge` | Translation pages connecting vocab + grammar |
| `needs_review` | Scope ambiguous — owner decision required |

---

## Appendix C — Deliverables for This Task

| Deliverable | Path | Status |
|-------------|------|--------|
| Master scope plan | `docs/learning-book/ENGLISH_LEARNING_BOOK_MASTER_SCOPE_PLAN.md` | ✅ |
| Machine-readable manifest | `scripts/lib/english-learning-book-master-scope-manifest.mjs` | ✅ |
| Scope verifier | `scripts/verify-english-learning-book-master-scope.mjs` | ✅ |

**Not created:** per-grade drafts, registry, routes, practice mappings, SQL, commits.

**Not modified:** Math, Geometry, Hebrew, Science, Moledet learning-book files; design/CSS/themes; reader shell; book tiles; English Master runtime.
