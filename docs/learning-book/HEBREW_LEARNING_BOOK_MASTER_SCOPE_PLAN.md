# Hebrew / עברית Learning Book — Master Scope Plan (Grades 1–6)

**Status:** Mapping / planning only. No page drafts. No runtime registry. No routes. No SQL. No commit.  
**Date:** June 2026  
**Scope:** Hebrew subject (`עברית`), grades 1–6  
**Child-facing language (future):** Hebrew only. All title examples below are `[DRAFT — not owner-approved]`.

---

## Table of Contents

1. [Sources Inspected](#1-sources-inspected)
2. [Hebrew Subject Key](#2-hebrew-subject-key)
3. [Full Hebrew Skill Inventory (Spine)](#3-full-hebrew-skill-inventory-spine)
4. [Grade-by-Grade Scope](#4-grade-by-grade-scope)
5. [Cross-Grade Progression](#5-cross-grade-progression)
6. [Duplicate / Repetition Risk](#6-duplicate--repetition-risk)
7. [Owner-Review Questions](#7-owner-review-questions)
8. [Risks Before Content Authoring](#8-risks-before-content-authoring)
9. [Proposed Next Step](#9-proposed-next-step)
10. [Appendix — Per-Grade Skill Tables](#10-appendix--per-grade-skill-tables)

---

## 1. Sources Inspected

| Source | Role in this plan |
|--------|-------------------|
| `data/curriculum-spine/v1/skills.json` | **Primary source of truth** — all `skill_id`, `subject`, `minGrade`, `maxGrade`, domains |
| `data/curriculum-spine/v1/schema.json` | Spine row shape (context) |
| `docs/learning-book/MATH_LEARNING_BOOK_MASTER_PLAN.md` | Hard rules: grade-only pages, no fallback, approved content, spine-tied IDs |
| `docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md` | Seven-section age-band template (grades 1–2 / 3–4 / 5–6) |
| `docs/learning-book/GEOMETRY_GRADE_1_LEARNING_BOOK_PLAN.md` | Per-grade plan structure (included / new / continuing / excluded / page list) |
| `data/hebrew-curriculum.js` | Grade stage summaries and topic umbrellas (context only — not authoritative for `skill_id`) |
| `data/hebrew-g1-content-map.js` … `data/hebrew-g6-content-map.js` | Official per-grade subtopics for `hebrew:gN:*` skills (scope hints) |
| `data/hebrew-g3-reading-bank.js` | Reading bank hint for G3+ (not spine) |
| `data/hebrew-official-alignment-matrix.json` | Ministry alignment metadata (owner review context) |
| `utils/hebrew-question-generator.js` | Runtime generator scope hints (not spine) |

**Explicitly not used as source of truth:** practice mappings, SQL, Math/Geometry masters (read-only for structure), app routes, catalog, themes, reader shell.

**Grade membership rule (applied throughout):**  
`subject === "hebrew"` AND `minGrade <= grade` AND `maxGrade >= grade`.

---

## 2. Hebrew Subject Key

All subjects in `skills.json`: `english`, `geography`, `geometry`, `hebrew`, `math`, `science`.

**Verified Hebrew subject key:** `hebrew`  
(135 rows; no alternate key such as `עברית` or `language_hebrew`.)

**Skill ID namespaces:**

| Prefix | Count | Origin |
|--------|------:|--------|
| `hebrew:g{N}:{domain}:{subtopic}` | 88 | Official grade content maps (`data/hebrew-g{N}-content-map.js`) |
| `hebrew:rich:{domain}:{patternFamily}:{subtype}` | 47 | Rich-bank / pattern coverage (Phase 7.11) |

---

## 3. Full Hebrew Skill Inventory (Spine)

**Total Hebrew skills:** 135  
**By domain (all grades):**

| Domain | Count |
|--------|------:|
| comprehension | 29 |
| grammar | 33 |
| reading | 24 |
| vocabulary | 21 |
| writing | 18 |
| speaking | 10 |

**By grade (in-scope skills):**

| Grade | In-scope skills | Proposed learning pages (1:1 with spine row) |
|------:|----------------:|-----------------------------------------------:|
| 1 | 32 | 32 |
| 2 | 23 | 23 |
| 3 | 31 | 31 |
| 4 | 29 | 29 |
| 5 | 28 | 28 |
| 6 | 29 | 29 |
| **Sum of grade instances** | — | **172** (47 rich rows include multi-grade spans; see §6) |

**Multi-grade span summary:**

| Span | Skills (unique pattern families / rows) | Grades |
|------|----------------------------------------|--------|
| 1–2 | 2 rows (`spell_word_early_ab_writing`, two subtypes) | G1 + G2 |
| 3–4 | 17 pattern families (18 spine rows incl. duplicate `sentence_correction` only in 5–6) | G3 + G4 |
| 5–6 | 17 pattern families (18 spine rows) | G5 + G6 |

There is **no** Hebrew `meta` / `no_question` row (unlike geometry).

Complete spine list (all 135 `skill_id` values):

<details>
<summary>Expand full skill_id list</summary>

**Grade 1 content-map (25 of 88 total map rows):**  
`hebrew:g1:comprehension:g1.one_sentence_who_what`, `hebrew:g1:comprehension:g1.simple_instruction`, `hebrew:g1:comprehension:g1.word_meaning_concrete`, `hebrew:g1:grammar:g1.grammar_agreement_light`, `hebrew:g1:grammar:g1.grammar_cloze_deixis`, `hebrew:g1:grammar:g1.grammar_connectors_time`, `hebrew:g1:grammar:g1.grammar_odd_category`, `hebrew:g1:grammar:g1.grammar_pos_roles`, `hebrew:g1:grammar:g1.grammar_punctuation`, `hebrew:g1:grammar:g1.grammar_wellformed`, `hebrew:g1:grammar:g1.grammar_word_order`, `hebrew:g1:reading:g1.basic_niqqud`, `hebrew:g1:reading:g1.final_letters`, `hebrew:g1:reading:g1.letters`, `hebrew:g1:reading:g1.open_close_syllable`, `hebrew:g1:reading:g1.phoneme_awareness`, `hebrew:g1:reading:g1.rhyme`, `hebrew:g1:reading:g1.simple_words_read`, `hebrew:g1:reading:g1.sound_letter_match`, `hebrew:g1:reading:g1.syllables`, `hebrew:g1:speaking:g1.phrase_appropriateness`, `hebrew:g1:vocabulary:g1.word_meaning_concrete`, `hebrew:g1:vocabulary:g1.word_picture`, `hebrew:g1:writing:g1.copy_word`, `hebrew:g1:writing:g1.spell_word_choice`

**Grade 1 rich (7):**  
`hebrew:rich:comprehension:binary_fact_early_g1:tf_science_simple`, `hebrew:rich:grammar:gender_number_early_g1:agreement_girl_singular`, `hebrew:rich:reading:word_level_early_g1:spelling_meaning_then_choice`, `hebrew:rich:speaking:social_reply_early_g1:bump_sorry`, `hebrew:rich:vocabulary:word_context_early_g1:cloze_morning`, `hebrew:rich:writing:spell_word_early_ab_writing:object_riddle`, `hebrew:rich:writing:spell_word_early_ab_writing:role_meaning`

**Grade 2 content-map (16):**  
`hebrew:g2:comprehension:g2.detail_main_idea`, `hebrew:g2:comprehension:g2.light_inference`, `hebrew:g2:comprehension:g2.simple_sequence`, `hebrew:g2:grammar:g2.number_gender_light`, `hebrew:g2:grammar:g2.pos_basic`, `hebrew:g2:grammar:g2.simple_tense`, `hebrew:g2:reading:g2.fluent_words`, `hebrew:g2:reading:g2.short_sentence`, `hebrew:g2:reading:g2.simple_punctuation_read`, `hebrew:g2:speaking:g2.describe_prompt_choice`, `hebrew:g2:speaking:g2.situation_register`, `hebrew:g2:vocabulary:g2.context_clue_easy`, `hebrew:g2:vocabulary:g2.synonyms_basic`, `hebrew:g2:writing:g2.punctuation_choice`, `hebrew:g2:writing:g2.sentence_wellformed`, `hebrew:g2:writing:g2.short_paragraph_choice`

**Grade 2 rich (7):**  
`hebrew:rich:comprehension:binary_fact_early_g2:where_from_sentence`, `hebrew:rich:grammar:gender_number_early_g2:agreement_boy_plural`, `hebrew:rich:reading:word_level_early_g2:spelling_choice_niqqud`, `hebrew:rich:speaking:social_reply_early_g2:thanks_response`, `hebrew:rich:vocabulary:word_context_early_g2:cloze_school`, `hebrew:rich:writing:spell_word_early_ab_writing:object_riddle`, `hebrew:rich:writing:spell_word_early_ab_writing:role_meaning`

**Grade 3 content-map (13):**  
`hebrew:g3:comprehension:g3.cause_effect`, `hebrew:g3:comprehension:g3.compare_light`, `hebrew:g3:comprehension:g3.explicit_only`, `hebrew:g3:grammar:g3.binyan_light`, `hebrew:g3:grammar:g3.connectors`, `hebrew:g3:grammar:g3.tense_system_intro`, `hebrew:g3:reading:g3.genre_tag_info_vs_story`, `hebrew:g3:reading:g3.multi_sentence`, `hebrew:g3:speaking:g3.discussion_prompt_choice`, `hebrew:g3:vocabulary:g3.context_meaning`, `hebrew:g3:vocabulary:g3.word_families`, `hebrew:g3:writing:g3.connector_use_choice`, `hebrew:g3:writing:g3.two_three_sentences_structure`

**Grade 3 rich (18):**  
`hebrew:rich:comprehension:analogy_reasoning:parallel`, `hebrew:rich:comprehension:binary_fact_mid_grammar:tf`, `hebrew:rich:comprehension:cause_effect:because`, `hebrew:rich:comprehension:completion:context_clue`, `hebrew:rich:comprehension:passage_explicit:detail`, `hebrew:rich:comprehension:passage_inference:implied`, `hebrew:rich:grammar:gender_number:plural`, `hebrew:rich:grammar:morphology:binyan_fit`, `hebrew:rich:grammar:part_of_speech:verb_noun`, `hebrew:rich:grammar:prep_choice:collocation`, `hebrew:rich:reading:sentence_read:meaning`, `hebrew:rich:speaking:social_reply_mid_help:request`, `hebrew:rich:vocabulary:antonym:opposite`, `hebrew:rich:vocabulary:precision:best_word`, `hebrew:rich:vocabulary:semantic_field:education_lexicon`, `hebrew:rich:vocabulary:synonym:near_meaning`, `hebrew:rich:writing:logic_completion:conclusion`, `hebrew:rich:writing:structured_completion:polite_phrase`

**Grade 4 content-map (11):**  
`hebrew:g4:comprehension:g4.summary_intro`, `hebrew:g4:comprehension:g4.text_structure`, `hebrew:g4:grammar:g4.dictation_spot_error`, `hebrew:g4:grammar:g4.root_pattern_intro`, `hebrew:g4:reading:g4.genre_mix`, `hebrew:g4:reading:g4.info_lit_intro`, `hebrew:g4:speaking:g4.present_text_based_choice`, `hebrew:g4:vocabulary:g4.idiom_light`, `hebrew:g4:vocabulary:g4.literary_lexicon_light`, `hebrew:g4:writing:g4.genre_appropriate_language`, `hebrew:g4:writing:g4.intro_body_conclusion_choice`

**Grade 4 rich (18):** same 3–4 band rows as G3 (continuing — separate G4 pages required)

**Grade 5 content-map (11):**  
`hebrew:g5:comprehension:g5.inference`, `hebrew:g5:comprehension:g5.multiple_perspectives_light`, `hebrew:g5:grammar:g5.syntax_agreement`, `hebrew:g5:grammar:g5.verb_patterns`, `hebrew:g5:reading:g5.multi_layer_read`, `hebrew:g5:reading:g5.position_in_text`, `hebrew:g5:speaking:g5.argument_scaffold_choice`, `hebrew:g5:vocabulary:g5.academic_starter_words`, `hebrew:g5:vocabulary:g5.semantic_fields`, `hebrew:g5:writing:g5.full_composition_scaffold_choice`, `hebrew:g5:writing:g5.genre_variety`

**Grade 5 rich (17):**  
`hebrew:rich:comprehension:compare_statements:contrast`, `hebrew:rich:comprehension:implicit_tone:attitude`, `hebrew:rich:comprehension:main_idea:summary`, `hebrew:rich:comprehension:reference:pronoun`, `hebrew:rich:comprehension:sequence:order`, `hebrew:rich:comprehension:supporting_detail:evidence`, `hebrew:rich:grammar:binary_grammar:tf`, `hebrew:rich:grammar:sentence_correction:choose_correct`, `hebrew:rich:grammar:sentence_correction:sv_agreement_plural`, `hebrew:rich:grammar:tense_shift:past_present`, `hebrew:rich:grammar:transform:negation`, `hebrew:rich:grammar:verb_agreement:plural_subject`, `hebrew:rich:reading:structural:paragraph_role`, `hebrew:rich:vocabulary:category_exclusion:odd_out`, `hebrew:rich:vocabulary:collocation:verb_noun_fit`, `hebrew:rich:vocabulary:context_fit:register`, `hebrew:rich:writing:rephrase:clarity`

**Grade 6 content-map (12):**  
`hebrew:g6:comprehension:g6.critical_evaluation_light`, `hebrew:g6:comprehension:g6.evidence_from_text`, `hebrew:g6:grammar:g6.complex_syntax_spot`, `hebrew:g6:grammar:g6.possession_prep`, `hebrew:g6:grammar:g6.subject_verb_advanced`, `hebrew:g6:reading:g6.compare_genres`, `hebrew:g6:reading:g6.complex_text_analysis`, `hebrew:g6:speaking:g6.debate_scaffold_choice`, `hebrew:g6:vocabulary:g6.academic_vocab`, `hebrew:g6:vocabulary:g6.discipline_words_light`, `hebrew:g6:writing:g6.argumentative_full_scaffold`, `hebrew:g6:writing:g6.research_literacy_choice`

**Grade 6 rich (17):** same 5–6 band rows as G5 (continuing — separate G6 pages required)

</details>

---

## 4. Grade-by-Grade Scope

**Proposed `learning_page_id` pattern (documentation only):**  
`hebrew:{gN}:{slug}` where `slug` is the spine subtopic (e.g. `g1.letters`, `cause_effect`, `sentence_correction:choose_correct`).  
**Future drafts path (not created now):** `docs/learning-book/hebrew/{gN}/drafts/{slug}.md`

**Age bands:** G1–2 → `grades_1_2`; G3–4 → `grades_3_4`; G5–6 → `grades_5_6` (per `MATH_LEARNING_PAGE_TEMPLATE.md`).

---

### Grade 1 — כיתה א׳

**Book title (draft):** ספר עברית — כיתה א׳ `[DRAFT — not owner-approved]`  
**Stage (from `hebrew-curriculum.js`):** פיתוח מיומנויות קריאה בסיסיות — פענוח, אותיות, ניקוד.  
**In-scope skills:** 32 (25 content-map + 7 rich)  
**Proposed pages:** 32  
**New skills:** all 32  
**Continuing from earlier grades:** none  

| Domain | # | Expected difficulty / language |
|--------|--:|--------------------------------|
| reading | 11 | Very concrete; niqqud visible; letter/syllable vocabulary; one idea per page |
| grammar | 10 | Light awareness (not formal labels); agreement through examples |
| comprehension | 4 | Single sentence; who/what; concrete word meaning |
| vocabulary | 4 | Picture/word; daily-life words |
| writing | 4 | Copy/spelling choice; early riddles |
| speaking | 2 | Short appropriate phrases; social reply |

**Excluded (why):** 103 Hebrew skills with `minGrade > 1` — belong to G2+ books only. All non-`hebrew` subjects excluded by definition.

**Page candidates (batch order — reading foundations first):**

| Order | skill_id | Draft title [DRAFT] | page_type |
|------:|----------|---------------------|-----------|
| 1–10 | ten `hebrew:g1:reading:g1.*` map skills (see appendix) | e.g. אותיות, הברות, ניקוד בסיסי | visual_intuition / concept_foundation |
| 11 | `hebrew:rich:reading:word_level_early_g1:spelling_meaning_then_choice` | מילה — משמעות ואיות | concept_foundation |
| 12–21 | nine `hebrew:g1:grammar:g1.*` map skills (see appendix) | e.g. סוגי מילים בקלות, סימני פיסוק | concept_foundation |
| 22 | `hebrew:rich:grammar:gender_number_early_g1:agreement_girl_singular` | התאמה בסיסית (מין ומספר) | concept_foundation |
| 23–25 | comprehension map (3) | משפט קצר — מי ומה | concept_foundation |
| 26 | `hebrew:rich:comprehension:binary_fact_early_g1:tf_science_simple` | נכון או לא נכון בטקסט קצר | practice_bridge |
| 27–28 | vocabulary map (2) | מילים ותמונות | visual_intuition |
| 29 | `hebrew:rich:vocabulary:word_context_early_g1:cloze_morning` | מילה בהקשר | concept_foundation |
| 30–31 | writing map (2) | העתקה; בחירת איות | step_by_step_procedure |
| 32–33 | two `spell_word_early_ab_writing` rich rows (see appendix) | חידת מילה; תפקיד המילה | mixed |
| 34 | `hebrew:g1:speaking:g1.phrase_appropriateness` | ביטוי מתאים | concept_foundation |
| 35 | `hebrew:rich:speaking:social_reply_early_g1:bump_sorry` | תגובה חברתית | concept_foundation |

*Pedagogical order table — **32 pages** total (one per spine row in appendix).*

---

### Grade 2 — כיתה ב׳

**Book title (draft):** ספר עברית — כיתה ב׳  
**Stage:** קריאה שוטפת והבנה בסיסית.  
**In-scope skills:** 23 (16 map + 7 rich)  
**Proposed pages:** 23  
**New:** 21 map/rich skills with `minGrade === 2`  
**Continuing:** 2 rich writing skills (`spell_word_early_ab_writing`, grades 1–2) — **must not reuse G1 page text**

| Domain | # | Language level |
|--------|--:|----------------|
| reading | 4 | Fluent short sentences; punctuation in reading |
| comprehension | 4 | Detail, main idea, light inference, sequence |
| grammar | 4 | POS, tense intro, number/gender light |
| vocabulary | 4 | Context clues, synonyms |
| writing | 5 | Paragraph choice, punctuation in writing |
| speaking | 3 | Describe, register, social reply |

**Excluded:** 112 Hebrew skills outside G2 window (G1-only, G3+, etc.).

**Continuing-skill depth change (G2 vs G1):**  
- `spell_word_early_ab_writing`: longer clues, fewer pictures, more fluent reading without full niqqud display.

---

### Grade 3 — כיתה ג׳

**Book title (draft):** ספר עברית — כיתה ג׳  
**Stage:** קריאה שוטפת; הבנה מעמיקה יותר; 2–3 משפטים בכתיבה.  
**In-scope skills:** 31 (13 map + 18 rich)  
**Proposed pages:** 31  
**New:** all 31 (no prior-grade continuing rows in spine filter)  
**Continuing (pedagogical, not spine):** builds on G1–2 decoding — reference only in prose, not separate spine rows

| Domain | # | Notes |
|--------|--:|-------|
| comprehension | 9 | Map + rich passage skills; **see §6 overlap** (`g3.cause_effect` vs rich `cause_effect`) |
| grammar | 7 | Tense system intro, binyan light, connectors |
| vocabulary | 6 | Families, antonym/synonym, semantic field |
| reading | 3 | Genre tag info vs story; multi-sentence |
| writing | 4 | 2–3 sentence structure; logic completion |
| speaking | 2 | Discussion prompt; mid social reply |

**Excluded:** 104 Hebrew skills outside G3 window.

---

### Grade 4 — כיתה ד׳

**Book title (draft):** ספר עברית — כיתה ד׳  
**Stage:** קריאה ביקורתית; טקסטים מובנים; סיכום.  
**In-scope skills:** 29 (11 new map + 18 continuing rich 3–4 band)  
**Proposed pages:** 29  
**New:** 11 content-map skills (`minGrade === 4`)  
**Continuing:** 18 rich skills (3–4 span) — **G4 pages must deepen** (longer passages, summary, text structure)

| Domain | # |
|--------|--:|
| comprehension | 8 |
| grammar | 6 |
| vocabulary | 6 |
| reading | 3 |
| writing | 4 |
| speaking | 2 |

**Excluded:** 106 Hebrew skills outside G4 window.

**New map highlights:** `g4.summary_intro`, `g4.text_structure`, `g4.root_pattern_intro`, `g4.intro_body_conclusion_choice`, `g4.info_lit_intro`, `g4.genre_mix`.

---

### Grade 5 — כיתה ה׳

**Book title (draft):** ספר עברית — כיתה ה׳  
**Stage:** קריאה מרובת עומק; חיבור מלא; טיעון.  
**In-scope skills:** 28 (11 map + 17 rich)  
**Proposed pages:** 28  
**New:** 11 map skills  
**Continuing:** none in spine filter (all rows have `minGrade === 5` or span starting at 5)

| Domain | # |
|--------|--:|
| comprehension | 8 |
| grammar | 8 |
| vocabulary | 5 |
| reading | 3 |
| writing | 3 |
| speaking | 1 |

**Excluded:** 107 Hebrew skills outside G5 window.

---

### Grade 6 — כיתה ו׳

**Book title (draft):** ספר עברית — כיתה ו׳  
**Stage:** ניתוח מעמיק; כתיבה טיעונית מלאה; מיומנויות לחטיבה.  
**In-scope skills:** 29 (12 new map + 17 continuing rich 5–6 band)  
**Proposed pages:** 29  
**New:** 12 map skills  
**Continuing:** 17 rich skills — **G6 pages must add evidence, debate, research literacy framing**

| Domain | # |
|--------|--:|
| comprehension | 8 |
| grammar | 9 |
| vocabulary | 5 |
| reading | 3 |
| writing | 3 |
| speaking | 1 |

**Excluded:** 106 Hebrew skills outside G6 window.

**New map highlights:** `g6.critical_evaluation_light`, `g6.evidence_from_text`, `g6.argumentative_full_scaffold`, `g6.research_literacy_choice`.

---

## 5. Cross-Grade Progression

| Strand | G1 | G2 | G3 | G4 | G5 | G6 |
|--------|----|----|----|----|----|-----|
| **Reading foundations** | Letters, niqqud, syllables, simple words | Fluent words, short sentences, punctuation in reading | Multi-sentence; genre info vs story | Genre mix; info literacy intro | Multi-layer read; position in text | Compare genres; complex text analysis |
| **Vocabulary** | Concrete, picture, word-in-context | Context clue, synonyms | Families, antonym/synonym, semantic field | Idiom, literary lexicon | Academic starters, semantic fields | Academic + discipline words |
| **Grammar / language awareness** | POS roles light, word order, punctuation games | Number/gender, tense intro, POS basic | Binyan light, connectors, tense system | Dictation error, root pattern | Syntax agreement, verb patterns | Complex syntax, possession, S–V advanced |
| **Reading comprehension** | One sentence who/what; instructions | Detail, main idea, inference light, sequence | Cause/compare/explicit; passage explicit/inference (rich) | Summary, text structure (map) + deeper rich band | Inference, perspectives; main idea, tone, reference (rich) | Critical evaluation, evidence (map) + rich band depth |
| **Writing / expression** | Copy word, spell choice | Sentence wellformed, short paragraph | 2–3 sentences, connectors | Intro–body–conclusion, genre language | Full composition scaffold, genre variety | Argumentative scaffold, research literacy |
| **Text types / genres** | — | — | Info vs story tag | Genre mix; structured writing | Genre variety in composition | Compare genres; argumentative |
| **Speaking** | Phrase appropriateness; social reply early | Describe, register | Discussion prompt | Present text-based | Argument scaffold | Debate scaffold |

---

## 6. Duplicate / Repetition Risk

| Risk | Grades | Mitigation for authors |
|------|--------|-------------------------|
| Same `patternFamily` spans two grades (rich 3–4, 5–6) | G3/G4, G5/G6 | **Two pages mandatory** — same `skill_id` is not reused across grades; G4/G6 versions use harder texts and different §5/§6 examples |
| `spell_word_early_ab_writing` (two subtypes, G1–2) | G1, G2 | Two spine rows per grade band; G2 continues both — do not copy G1 riddles |
| Map `g3.cause_effect` + rich `cause_effect` | G3 | Same grade, different `skill_id` — cross-link in prose; avoid duplicate definitions |
| Map `g3.explicit_only` + rich `passage_explicit` | G3 | Align explicit-reading strategy; map = curriculum label, rich = passage drill |
| `g1.word_meaning_concrete` in comprehension **and** vocabulary | G1 | Two pages — comprehension = text question framing; vocabulary = word knowledge |
| `sentence_correction` two subtypes | G5, G6 | Two pages per grade (choose_correct vs sv_agreement) — do not merge without owner approval |
| Grammar density jump G2→G3 | G3 | Avoid formal metalanguage beyond content-map intent; keep `[DRAFT]` titles short |

**No skill may be dropped** from the book plan without spine governance — consolidation is an owner decision, not mapper default.

---

## 7. Owner-Review Questions

1. **Page granularity:** Confirm 1:1 spine row → learning page (172 grade-instances) vs merging the two `spell_word_early_ab_writing` subtypes per grade.
2. **Map + rich overlap at G3:** Should `g3.cause_effect` and `hebrew:rich:comprehension:cause_effect:because` share one combined page or stay separate?
3. **Binyan / root terminology:** At what grade may the child-facing words **בניין**, **שורש**, **גזרה** appear (G3 `binyan_light`, G4 `root_pattern_intro`)?
4. **Niqqud policy:** G1 pages assume niqqud in examples — when should books show **חסר ניקוד** (align with generator `niqqud` flags in content maps)?
5. **Speaking / choice scaffolds:** Several skills are `*_choice` / speaking prompts — should the book explain oral strategies only, or also written rehearsal?
6. **Ministry alignment:** Should `data/hebrew-official-alignment-matrix.json` gate owner approval per grade before authoring?
7. **Book title branding:** **ספר עברית** vs **לשון** vs **עברית** on tiles (child-facing)?
8. **Rich-bank pages:** Should child-facing titles use friendly Hebrew names instead of internal pattern family names (e.g. `passage_inference` → "מה משתמע מהטקסט")?

---

## 8. Risks Before Content Authoring

| Risk | Detail |
|------|--------|
| **Age appropriateness** | G1 grammar has 9 map topics — risk of formal grammar tone; keep game-aligned language from practice, not textbook |
| **Too much formal grammar** | G5–6 syntax/verb patterns + rich correction — cap metalabels; use examples-first |
| **Comprehension vs writing overlap** | G4–6 structure/scaffold skills blur strands — keep reading pages about texts, writing pages about production |
| **Owner wording** | Academic vocab, debate, research literacy need exact approved phrases |
| **172 pages total** | Large authoring surface — recommend grade-by-grade signoff (Geometry/Math precedent) |
| **Internal keys in UI** | Future UI must not expose `hebrew:rich:...` or `g3.binyan_light` to children |
| **No practice CTA in mapping** | Do not invent practice mappings in this phase |

---

## 9. Proposed Next Step

After owner approval of this master plan:

1. Create **per-grade plan packages** only (e.g. `HEBREW_GRADE_1_LEARNING_BOOK_PLAN.md`) — still no runtime.
2. Author Hebrew drafts under `docs/learning-book/hebrew/{gN}/drafts/` using seven-section template.
3. Run grade-level review packs (Hebrew review pack pattern from Math/Geometry).
4. Separate future task: registry, routes, reader — **out of scope here**.

**Verification script:** `node scripts/verify-hebrew-learning-book-master-scope.mjs`

---

## 10. Appendix — Per-Grade Skill Tables

### Grade 1 (32 skills)

| skill_id | Domain | Page? |
|----------|--------|-------|
| `hebrew:g1:reading:g1.phoneme_awareness` | reading | Yes |
| `hebrew:g1:reading:g1.open_close_syllable` | reading | Yes |
| `hebrew:g1:reading:g1.rhyme` | reading | Yes |
| `hebrew:g1:reading:g1.syllables` | reading | Yes |
| `hebrew:g1:reading:g1.letters` | reading | Yes |
| `hebrew:g1:reading:g1.final_letters` | reading | Yes |
| `hebrew:g1:reading:g1.basic_niqqud` | reading | Yes |
| `hebrew:g1:reading:g1.sound_letter_match` | reading | Yes |
| `hebrew:g1:reading:g1.simple_words_read` | reading | Yes |
| `hebrew:rich:reading:word_level_early_g1:spelling_meaning_then_choice` | reading | Yes |
| `hebrew:g1:grammar:g1.grammar_pos_roles` | grammar | Yes |
| `hebrew:g1:grammar:g1.grammar_wellformed` | grammar | Yes |
| `hebrew:g1:grammar:g1.grammar_agreement_light` | grammar | Yes |
| `hebrew:g1:grammar:g1.grammar_cloze_deixis` | grammar | Yes |
| `hebrew:g1:grammar:g1.grammar_word_order` | grammar | Yes |
| `hebrew:g1:grammar:g1.grammar_odd_category` | grammar | Yes |
| `hebrew:g1:grammar:g1.grammar_punctuation` | grammar | Yes |
| `hebrew:g1:grammar:g1.grammar_connectors_time` | grammar | Yes |
| `hebrew:rich:grammar:gender_number_early_g1:agreement_girl_singular` | grammar | Yes |
| `hebrew:g1:comprehension:g1.word_meaning_concrete` | comprehension | Yes |
| `hebrew:g1:comprehension:g1.one_sentence_who_what` | comprehension | Yes |
| `hebrew:g1:comprehension:g1.simple_instruction` | comprehension | Yes |
| `hebrew:rich:comprehension:binary_fact_early_g1:tf_science_simple` | comprehension | Yes |
| `hebrew:g1:vocabulary:g1.word_meaning_concrete` | vocabulary | Yes |
| `hebrew:g1:vocabulary:g1.word_picture` | vocabulary | Yes |
| `hebrew:rich:vocabulary:word_context_early_g1:cloze_morning` | vocabulary | Yes |
| `hebrew:g1:writing:g1.copy_word` | writing | Yes |
| `hebrew:g1:writing:g1.spell_word_choice` | writing | Yes |
| `hebrew:rich:writing:spell_word_early_ab_writing:object_riddle` | writing | Yes |
| `hebrew:rich:writing:spell_word_early_ab_writing:role_meaning` | writing | Yes |
| `hebrew:g1:speaking:g1.phrase_appropriateness` | speaking | Yes |
| `hebrew:rich:speaking:social_reply_early_g1:bump_sorry` | speaking | Yes |

### Grade 2 (23 skills)

| skill_id | Domain | New / Continuing |
|----------|--------|------------------|
| `hebrew:g2:reading:g2.fluent_words` | reading | New |
| `hebrew:g2:reading:g2.short_sentence` | reading | New |
| `hebrew:g2:reading:g2.simple_punctuation_read` | reading | New |
| `hebrew:rich:reading:word_level_early_g2:spelling_choice_niqqud` | reading | New |
| `hebrew:g2:grammar:g2.pos_basic` | grammar | New |
| `hebrew:g2:grammar:g2.simple_tense` | grammar | New |
| `hebrew:g2:grammar:g2.number_gender_light` | grammar | New |
| `hebrew:rich:grammar:gender_number_early_g2:agreement_boy_plural` | grammar | New |
| `hebrew:g2:comprehension:g2.detail_main_idea` | comprehension | New |
| `hebrew:g2:comprehension:g2.light_inference` | comprehension | New |
| `hebrew:g2:comprehension:g2.simple_sequence` | comprehension | New |
| `hebrew:rich:comprehension:binary_fact_early_g2:where_from_sentence` | comprehension | New |
| `hebrew:g2:vocabulary:g2.context_clue_easy` | vocabulary | New |
| `hebrew:g2:vocabulary:g2.synonyms_basic` | vocabulary | New |
| `hebrew:rich:vocabulary:word_context_early_g2:cloze_school` | vocabulary | New |
| `hebrew:g2:writing:g2.sentence_wellformed` | writing | New |
| `hebrew:g2:writing:g2.punctuation_choice` | writing | New |
| `hebrew:g2:writing:g2.short_paragraph_choice` | writing | New |
| `hebrew:rich:writing:spell_word_early_ab_writing:object_riddle` | writing | Continuing (G1–2) |
| `hebrew:rich:writing:spell_word_early_ab_writing:role_meaning` | writing | Continuing (G1–2) |
| `hebrew:g2:speaking:g2.describe_prompt_choice` | speaking | New |
| `hebrew:g2:speaking:g2.situation_register` | speaking | New |
| `hebrew:rich:speaking:social_reply_early_g2:thanks_response` | speaking | New |

### Grade 3 (31 skills)

All rows `minGrade === 3` and `maxGrade === 3` except rich 3–4 band listed in G4 continuing table.

| skill_id | Domain |
|----------|--------|
| `hebrew:g3:reading:g3.genre_tag_info_vs_story` | reading |
| `hebrew:g3:reading:g3.multi_sentence` | reading |
| `hebrew:rich:reading:sentence_read:meaning` | reading |
| `hebrew:g3:grammar:g3.binyan_light` | grammar |
| `hebrew:g3:grammar:g3.connectors` | grammar |
| `hebrew:g3:grammar:g3.tense_system_intro` | grammar |
| `hebrew:rich:grammar:gender_number:plural` | grammar |
| `hebrew:rich:grammar:morphology:binyan_fit` | grammar |
| `hebrew:rich:grammar:part_of_speech:verb_noun` | grammar |
| `hebrew:rich:grammar:prep_choice:collocation` | grammar |
| `hebrew:g3:comprehension:g3.cause_effect` | comprehension |
| `hebrew:g3:comprehension:g3.compare_light` | comprehension |
| `hebrew:g3:comprehension:g3.explicit_only` | comprehension |
| `hebrew:rich:comprehension:analogy_reasoning:parallel` | comprehension |
| `hebrew:rich:comprehension:binary_fact_mid_grammar:tf` | comprehension |
| `hebrew:rich:comprehension:cause_effect:because` | comprehension |
| `hebrew:rich:comprehension:completion:context_clue` | comprehension |
| `hebrew:rich:comprehension:passage_explicit:detail` | comprehension |
| `hebrew:rich:comprehension:passage_inference:implied` | comprehension |
| `hebrew:g3:vocabulary:g3.context_meaning` | vocabulary |
| `hebrew:g3:vocabulary:g3.word_families` | vocabulary |
| `hebrew:rich:vocabulary:antonym:opposite` | vocabulary |
| `hebrew:rich:vocabulary:precision:best_word` | vocabulary |
| `hebrew:rich:vocabulary:semantic_field:education_lexicon` | vocabulary |
| `hebrew:rich:vocabulary:synonym:near_meaning` | vocabulary |
| `hebrew:g3:writing:g3.connector_use_choice` | writing |
| `hebrew:g3:writing:g3.two_three_sentences_structure` | writing |
| `hebrew:rich:writing:logic_completion:conclusion` | writing |
| `hebrew:rich:writing:structured_completion:polite_phrase` | writing |
| `hebrew:g3:speaking:g3.discussion_prompt_choice` | speaking |
| `hebrew:rich:speaking:social_reply_mid_help:request` | speaking |

### Grade 4 (29 skills)

**New (11):** all `hebrew:g4:*` content-map rows in §3.  
**Continuing (18):** all `hebrew:rich:*` with `minGrade: 3, maxGrade: 4` from Grade 3 table — require G4-depth rewrite.

### Grade 5 (28 skills)

**New map (11):** `hebrew:g5:comprehension:g5.inference`, `hebrew:g5:comprehension:g5.multiple_perspectives_light`, `hebrew:g5:grammar:g5.syntax_agreement`, `hebrew:g5:grammar:g5.verb_patterns`, `hebrew:g5:reading:g5.multi_layer_read`, `hebrew:g5:reading:g5.position_in_text`, `hebrew:g5:speaking:g5.argument_scaffold_choice`, `hebrew:g5:vocabulary:g5.academic_starter_words`, `hebrew:g5:vocabulary:g5.semantic_fields`, `hebrew:g5:writing:g5.full_composition_scaffold_choice`, `hebrew:g5:writing:g5.genre_variety`.

**Rich 5–6 band (17):** `hebrew:rich:comprehension:compare_statements:contrast`, `hebrew:rich:comprehension:implicit_tone:attitude`, `hebrew:rich:comprehension:main_idea:summary`, `hebrew:rich:comprehension:reference:pronoun`, `hebrew:rich:comprehension:sequence:order`, `hebrew:rich:comprehension:supporting_detail:evidence`, `hebrew:rich:grammar:binary_grammar:tf`, `hebrew:rich:grammar:sentence_correction:choose_correct`, `hebrew:rich:grammar:sentence_correction:sv_agreement_plural`, `hebrew:rich:grammar:tense_shift:past_present`, `hebrew:rich:grammar:transform:negation`, `hebrew:rich:grammar:verb_agreement:plural_subject`, `hebrew:rich:reading:structural:paragraph_role`, `hebrew:rich:vocabulary:category_exclusion:odd_out`, `hebrew:rich:vocabulary:collocation:verb_noun_fit`, `hebrew:rich:vocabulary:context_fit:register`, `hebrew:rich:writing:rephrase:clarity`.

### Grade 6 (29 skills)

**New map (12):** all `hebrew:g6:*` content-map rows in §3.  
**Continuing (17):** same rich 5–6 band as G5 — separate G6 pages with harder texts and argument/evidence framing.

---

## Related Documents (unchanged by this task)

| Document | Note |
|----------|------|
| `MATH_LEARNING_BOOK_MASTER_PLAN.md` | Structural reference only |
| `GEOMETRY_GRADE_*_LEARNING_BOOK_PLAN.md` | Per-grade plan pattern |
| `MATH_LEARNING_PAGE_TEMPLATE.md` | Section structure for future Hebrew drafts |

---

*End of master scope plan. Mapping only — no drafts, registry, routes, practice mappings, or SQL.*
