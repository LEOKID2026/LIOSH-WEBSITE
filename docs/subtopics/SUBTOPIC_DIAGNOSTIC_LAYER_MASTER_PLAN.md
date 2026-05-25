# Subtopic Diagnostic Layer — Master Plan

**Status:** Planning only. No code implemented. No SQL executed. No commits made.
**Date:** May 2026
**Scope:** All subjects, grades 1–6 (Math, Geometry, Hebrew, English, Science, Moledet/Geography)
**Language:** English planning document. All Hebrew display labels to be approved separately.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Findings](#2-current-state-findings)
3. [Proposed Data Model](#3-proposed-data-model)
4. [Pedagogical Rules](#4-pedagogical-rules)
5. [Subject-by-Subject Subtopic Strategy](#5-subject-by-subject-subtopic-strategy)
6. [Diagnostic Engine Impact](#6-diagnostic-engine-impact)
7. [Parent Report Impact](#7-parent-report-impact)
8. [Teacher Portal / Classroom Impact](#8-teacher-portal--classroom-impact)
9. [Student and Parent Practice Impact](#9-student-and-parent-practice-impact)
10. [Migration Strategy](#10-migration-strategy)
11. [QA and Gates](#11-qa-and-gates)
12. [Risk Analysis](#12-risk-analysis)
13. [Phased Roadmap](#13-phased-roadmap)
14. [Acceptance Criteria](#14-acceptance-criteria)
15. [Open Questions for Owner Approval](#15-open-questions-for-owner-approval)

---

## 1. Executive Summary

The site currently diagnoses student performance at the **topic level** (e.g., Math → Addition). This plan introduces a **Subtopic Diagnostic Layer** that adds one level of granularity between topic and individual question, enabling:

- More precise diagnostic conclusions (e.g., addition with regrouping vs. missing addend)
- Teacher assignments targeted at a specific subtopic
- Parent reports that name the exact skill gap without overwhelming parents
- Parent Copilot answers that cite specific practice areas rather than broad topic names
- Student practice sessions that focus on a weak subtopic instead of the full topic

**Critical finding from the codebase audit:** Hebrew subtopics for grades 1–6 are **already fully implemented** in `data/hebrew-g*-content-map.js` and `utils/hebrew-g*-subtopic.js`. These files are the reference architecture for this plan. The work required is to:

1. Design and build equivalent catalog files for Math, Geometry, English, Science, and Moledet/Geography.
2. Bridge the existing `subtopicId` (pool-narrowing layer) to the Diagnostic Engine V2 taxonomy (diagnostic conclusions layer).
3. Surface subtopic signals in parent reports and parent copilot.
4. Expose subtopic selection in the teacher portal.
5. Enable focused subtopic practice in student sessions.

The recommended approach is **hybrid**: canonical subtopics live in static JS catalog files (like Hebrew already does), questions carry an optional `subtopicId` field, legacy questions are retroactively tagged via stem inference functions, and the DB does not need new columns on `answers` or `learning_sessions` until Phase 5.

---

## 2. Current State Findings

### 2.1 Where Questions Are Defined

There is **no `questions` table** in the database. Questions live in:

- **Static banks**: `data/science-questions.js`, `data/english-questions/*.js`, `data/hebrew-questions/g*.js`, `data/geography-questions/g*.js`, `utils/hebrew-rich-question-bank.js`
- **Procedural generators**: `utils/math-question-generator.js`, `utils/geometry-question-generator.js`, `utils/english-question-generator.js`, `utils/hebrew-question-generator.js`, `utils/moledet-geography-question-generator.js`

Each question row carries optional diagnostic metadata under a `params` object: `diagnosticSkillId`, `patternFamily`, `conceptTag`, `subtype`, `probePower`, `expectedErrorTags`. The `DiagnosticQuestionContract` in `utils/diagnostic-question-contract.js` is the authoritative field contract.

### 2.2 How Subject / Grade / Topic Are Currently Linked to Questions

| Layer | Where stored | Fields |
|-------|-------------|--------|
| Per-session | `learning_sessions` (DB) | `subject` (text), `topic` (text) |
| Per-answer | `answers.answer_payload` (jsonb) | `subject`, `topic`, grade evidence (clientMeta) |
| Per-question (static) | JS bank row | `topic`, `grades[]` or `minGrade`/`maxGrade`, `difficulty` |
| Per-question (generated) | `params` on runtime object | `diagnosticSkillId`, `patternFamily` |

There is **no `subtopic` field** on `learning_sessions` or `answers`. Grade is resolved at read-time via `lib/learning-supabase/practice-grade-resolution.js`.

### 2.3 The Two Parallel Taxonomy Systems

The codebase already has two distinct taxonomy systems. Both must be understood to plan the subtopic layer correctly.

**System A — Content-Map Subtopics (pool narrowing)**

- Location: `data/hebrew-g*-content-map.js`
- Purpose: Choose which subtopic of a topic to practice in a session; narrow the question pool
- Structure: `topicKey → subtopics[] → { id, weight, order, modesAllowed, flags }`
- ID format: `g1.phoneme_awareness`, `g2.simple_tense`, `g6.argumentative_full_scaffold`
- Current coverage: Hebrew only (g1–g6). Does not exist for any other subject.
- How questions get subtopicIds: explicit field on bank row, or inferred at runtime by `inferG*SubtopicIdFromStem()` from question text

**System B — Diagnostic Taxonomy Rows (engine conclusions)**

- Location: `utils/diagnostic-engine-v2/taxonomy-*.js`
- Purpose: Decide whether a student has a diagnosable pattern (weakness) in a specific skill
- Structure: `TaxonomyRow { id, subjectId, domainHe, topicHe, subskillHe, patternHe, minWrong, minDistinctDays, ... }`
- ID format: `H-01`, `M-02`, `G-05`, etc.
- Current coverage: Math, Geometry, Hebrew, English, Science, Moledet/Geography (all subjects)
- How it works: engine counts wrong events matching the pattern criteria; fires conclusion when thresholds met

**The gap:** System A (subtopic pool narrowing) and System B (diagnostic taxonomy) are not yet connected. A student can practice a specific subtopic, but diagnostic conclusions are not yet made at the subtopic level.

### 2.4 How the Diagnostic Engine Uses Topic Data

`utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js` iterates over the topic map (subject × topicRowKey → row), filters mistake events, matches taxonomy rows via `taxonomyIdsForReportBucket()` in `topic-taxonomy-bridge.js`, and fires diagnostic units when `minWrong`/`minDistinctDays`/`minDistinctPatternFamilies` thresholds are met.

The engine operates at the **topic bucket level**, not subtopic level. `bucketKey` is the topic (e.g., `addition`, `reading`), not the subtopic.

Weakness determination has multiple layers:
- `needsPractice`: `accuracy < 70%` (row level)
- `isStablePattern`: strong evidence + volume + stability/confidence thresholds
- `taxonomyRow match`: `minWrong` recurring across sessions
- `weaknessLevel` (intelligence layer): `tentative` / `stable` / `none`
- `masteryBand` (skill rollup): `unknown` / `emerging` / `near_mastery` / `mastered` / `retention_risk`

### 2.5 How Parent Reports Consume Diagnostic Data

Parent reports are **computed on read**, not stored. Flow:

```
learning_sessions + answers (Supabase)
  → aggregateParentReportPayload() [report-data-aggregate.server.js]
  → buildReportInputFromDbData() [report-data-adapter.js]  
  → generateParentReportV2() [parent-report-v2.js]
    → runDiagnosticEngineV2()
    → enrichReportMapsWithTopicStepHints()
  → buildDetailedParentReportFromBaseReport() [detailed-parent-report.js]
    → subjectProfiles[].topicRecommendations[]
  → Parent Copilot truth packet [truth-packet-v1.js]
```

Parent-facing output is currently at topic resolution only. `topicRecommendations` has `displayName` (topic label), `interventionPlanHe`, `doNowHe`, etc. — but no subtopic breakdown.

**Parent-facing safety layer:** `utils/parent-report-ai/parent-report-ai-validate.js` blocks any output containing internal tokens (`diagnostics`, `metadata`, `algorithm`, `AI`, etc.). Any subtopic data surfaced in parent reports must be translated through a safe Hebrew label layer before display.

### 2.6 How Teacher / Classroom Activities Handle Topics

- `classroom_activities` DB table already has `subtopic text NULL` and `skill_key text NULL` columns (migration 024).
- Teacher UI for creating activities (`pages/teacher/class/[classId]/activities/new.js`) has a `subtopic` state field.
- Question generation in `generate-activity-questions-client.js` does **not** yet use `subtopic` to narrow the question pool — it is stored but not acted upon.
- Topic dropdown sources: structured constants for Hebrew/geometry/English/geography; **free-text input** for Math and Science (no canonical list enforced).

### 2.7 How Student Practice Selects Questions

Each subject has a master page that calls its question generator. Pool narrowing currently happens by:
- Subject + grade + topic (always)
- Level / difficulty (always)
- Subtopic (Hebrew only, via `withG*SubtopicPreference()` + `narrowHebrewG*Pool()`)
- Active diagnostic probe bias (`selectQuestionWithProbe()` — Science, English, Moledet)
- Anti-repeat fingerprint (`SessionAntiRepeatBuffer`)
- Mistake-replay mode (picks previous wrong topic/grade/level)

Non-Hebrew subjects have **no subtopic pool narrowing** today.

---

## 3. Proposed Data Model

### 3.1 Recommended Hierarchy

```
Subject
  └── Grade (g1–g6)
        └── Topic (existing: reading, addition, body, grammar, …)
              └── Subtopic (new layer)
                    └── Skill / Diagnostic Pattern (existing TaxonomyRow)
                          └── Questions (existing banks/generators)
```

### 3.2 The Three Options and Recommendation

**Option A — New explicit `subtopic` column on `learning_sessions` and `answers`**

- Pros: Queryable from DB, clean audit trail, grade-level joins easy
- Cons: Migration risk on large tables; sessions are created by master pages that would all need updating simultaneously; breaks nothing if NULL but adds no value until all subjects are tagged; requires a migration run before any product benefit

**Option B — Mapping layer / catalog JS files only (no DB changes)**

- Pros: Zero migration risk; Hebrew reference architecture already uses this; subtopicId resolved at read-time from question stem or params; fully backward compatible; can be released per-subject
- Cons: No DB-level subtopic analytics; subtopicId must be re-inferred on every report computation; harder to query raw data by subtopic

**Option C — DB field on `classroom_activities` only (already exists) + catalog layer for report pipeline**

- Pros: Teacher assignments already support subtopic; report pipeline uses catalog lookup (no new DB changes); incremental benefit
- Cons: Student practice sessions still have no subtopic in DB; cross-surface subtopic analytics not unified

**Recommendation: Hybrid approach — Phase the DB changes**

- **Immediately:** Use catalog files (Option B pattern) for all subjects. This is the Hebrew architecture. Build `data/math-content-map.js`, `data/geometry-content-map.js`, etc., matching the pattern of `data/hebrew-g*-content-map.js`.
- **`classroom_activities.subtopic` already exists** — wire it to question generation (Option C is already structurally ready).
- **Phase 5+ only:** Add `subtopic_id text` to `learning_sessions` and optionally to `answers.answer_payload` schema once catalog coverage and question tagging reach ≥80% for a given subject. This prevents polluting the DB with NULL-heavy columns before the data is meaningful.

### 3.3 Catalog File Architecture

Each subject gets a content map following the Hebrew pattern:

```
data/
  hebrew-g1-content-map.js    ← EXISTS
  hebrew-g2-content-map.js    ← EXISTS
  hebrew-g3-content-map.js    ← EXISTS
  hebrew-g4-content-map.js    ← EXISTS
  hebrew-g5-content-map.js    ← EXISTS
  hebrew-g6-content-map.js    ← EXISTS
  math-g1-content-map.js      ← NEEDS TO BE CREATED
  math-g2-content-map.js      ← NEEDS TO BE CREATED
  math-g3-content-map.js      ← NEEDS TO BE CREATED
  math-g4-content-map.js      ← NEEDS TO BE CREATED
  math-g5-content-map.js      ← NEEDS TO BE CREATED
  math-g6-content-map.js      ← NEEDS TO BE CREATED
  geometry-g3-content-map.js  ← NEEDS TO BE CREATED (geometry starts g3)
  ...
  english-g1-content-map.js   ← NEEDS TO BE CREATED
  ...
  science-g1-content-map.js   ← NEEDS TO BE CREATED
  ...
  moledet-g1-content-map.js   ← NEEDS TO BE CREATED
  ...
```

Each map file exports:
```js
export const MATH_G2_CONTENT_MAP = {
  addition: {
    subtopics: [
      { id: "math_g2.add_no_regroup", weight: 8, order: 1, modesAllowed: [...ALL_MODES], flags: {...} },
      { id: "math_g2.add_with_regroup", weight: 10, order: 2, modesAllowed: [...ALL_MODES], flags: {...} },
      { id: "math_g2.missing_addend", weight: 6, order: 3, modesAllowed: [...ALL_MODES], flags: {...} },
      { id: "math_g2.word_problem_add", weight: 5, order: 4, modesAllowed: [...ALL_MODES], flags: {...} },
    ]
  },
  ...
}
```

Subtopic IDs follow the naming convention: `{subject}_{gradeKey}.{subtopic_slug}`.
- Examples: `math_g2.add_with_regroup`, `sci_g3.food_chain_producer`, `en_g4.simple_past_irregular`
- IDs must be stable (never rename after launch — create new ID and deprecate old one)
- IDs are internal/English only; Hebrew display labels are a separate concern

### 3.4 Backward Compatibility Plan

- All existing topic-level data remains fully functional.
- Subtopic is additive: if no subtopicId is resolvable, the system falls back to topic-level behavior.
- Parent reports continue to show topic-level rows; subtopic adds an optional detail row or enrichment.
- `narrowPool()` functions return the full pool if subtopic narrowing yields too few questions (already the pattern in Hebrew).
- Existing `parent_reports` table data (if any) is unaffected — reports are recomputed from raw data.

---

## 4. Pedagogical Rules

### 4.1 Definition of a Subtopic

A subtopic deserves its own entry when **all** of the following are true:

1. It represents a pedagogically distinct skill that can be assessed independently of the other subtopics in the same topic.
2. It maps to a unit, standard, or concept recognized in the Israeli Ministry of Education curriculum for that grade level.
3. It is possible to write at least **N_MIN questions** at the required difficulty range (see 4.4).
4. A student can plausibly be strong in some subtopics but weak in others within the same topic — i.e., the subtopics are not perfectly correlated.
5. The subtopic can be explained to a parent in one short Hebrew sentence without technical jargon.

### 4.2 Anti-Fragmentation Rules

Do **not** create a subtopic when:

- It would only differ from another subtopic by difficulty level (that is handled by `difficulty` field, not subtopic).
- There are fewer than N_MIN questions in the current bank that would fall in this subtopic.
- The subtopic is a sub-case that a student who struggles with the parent subtopic also always struggles with (i.e., they are perfectly correlated — treat as difficulty).
- It is only pedagogically meaningful as a remediation path, not as a diagnosis target.
- The subtopic exists in upper grades but the same label at a lower grade would be confusingly different in scope.

### 4.3 Minimum Question Coverage

Before a subtopic can be used for diagnosis, the question bank must have:

| Grade band | Min questions per subtopic × difficulty |
|------------|----------------------------------------|
| G1–G2 (early) | 12 per level (easy / medium / hard) = 36 total |
| G3–G4 (mid) | 10 per level = 30 total |
| G5–G6 (upper) | 8 per level = 24 total |

Before a subtopic can be used for **teacher assignments**, the bank needs at least 20 questions at the requested difficulty.

Before a subtopic appears in **parent reports**, the student must have answered at least 5 questions in that subtopic in the relevant period. Below this threshold, the system must use the topic-level summary only.

### 4.4 Curriculum Alignment

Subtopics must align with the Israeli Ministry of Education (MoE) primary curriculum framework (תכנית הלימודים של משרד החינוך לבית הספר היסודי). The following reference documents exist in the codebase and must be consulted:

- `utils/curriculum-audit/official-primary-curriculum-spine.js`
- `utils/curriculum-audit/israeli-primary-curriculum-map.js`
- Per-subject: `utils/curriculum-audit/*-official-subsection-catalog.js`
- `data/curriculum-spine/v1/skills.json` (already has `skill_id`, `subject`, `topic`, `subtopic` schema)
- `data/hebrew-ministry-source-catalog.json`

Where a subtopic exists in the codebase catalog but is not explicitly in MoE documents, it must be flagged as "extended coverage" in the content map and should not be presented as a required standard to parents.

### 4.5 Audience Classification

Each subtopic must be classified by who sees it:

| Classification | Description | Example |
|---------------|-------------|---------|
| `teacher_facing` | Shown in teacher assignments and class reports | "Addition with regrouping" |
| `parent_facing` | Can be named in parent reports and Copilot | "Addition with carrying" |
| `engine_internal` | Used only for diagnostic routing; never shown to parents or teachers | Internal probe taxonomy IDs |

A subtopic that appears in parent reports must have an approved Hebrew display label. The label must pass the `validateParentReportAIText()` safety checks (no internal tokens, no blame language, no scary framing).

---

## 5. Subject-by-Subject Subtopic Strategy

### 5.1 Hebrew (עברית) — Already Implemented

Hebrew subtopics are **fully built** for grades 1–6. They are the reference architecture for all other subjects.

**Existing catalog files:**
- `data/hebrew-g1-content-map.js` through `data/hebrew-g6-content-map.js`
- `utils/hebrew-g1-subtopic.js`, `utils/hebrew-g2-subtopic.js`, `utils/hebrew-g3456-subtopic.js`

**Summary of existing subtopics:**

| Grade | Topic | Subtopics (English planning IDs) |
|-------|-------|----------------------------------|
| G1 | reading | phoneme_awareness, open_close_syllable, rhyme, syllables, letters, final_letters, basic_niqqud, sound_letter_match, simple_words_read |
| G1 | comprehension | word_meaning_concrete, one_sentence_who_what, simple_instruction |
| G1 | writing | copy_word, spell_word_choice |
| G1 | grammar | grammar_pos_roles, grammar_wellformed, grammar_agreement_light, grammar_cloze_deixis, grammar_word_order, grammar_odd_category, grammar_punctuation, grammar_connectors_time |
| G1 | vocabulary | word_picture, word_meaning_concrete |
| G1 | speaking | phrase_appropriateness |
| G2 | reading | simple_punctuation_read, short_sentence, fluent_words |
| G2 | comprehension | simple_sequence, light_inference, detail_main_idea |
| G2 | writing | punctuation_choice, short_paragraph_choice, sentence_wellformed |
| G2 | grammar | simple_tense, number_gender_light, pos_basic |
| G2 | vocabulary | synonyms_basic, context_clue_easy |
| G2 | speaking | describe_prompt_choice, situation_register |
| G3 | reading | genre_tag_info_vs_story, multi_sentence |
| G3 | comprehension | compare_light, cause_effect, explicit_only |
| G3 | writing | connector_use_choice, two_three_sentences_structure |
| G3 | grammar | binyan_light, connectors, tense_system_intro |
| G3 | vocabulary | word_families, context_meaning |
| G4 | reading | info_lit_intro, genre_mix |
| G4 | comprehension | text_structure, summary_intro |
| G4 | writing | genre_appropriate_language, intro_body_conclusion_choice |
| G4 | grammar | root_pattern_intro, dictation_spot_error |
| G4 | vocabulary | idiom_light, literary_lexicon_light |
| G5 | reading | position_in_text, multi_layer_read |
| G5 | comprehension | multiple_perspectives_light, inference |
| G5 | writing | genre_variety, full_composition_scaffold_choice |
| G5 | grammar | verb_patterns, syntax_agreement |
| G5 | vocabulary | academic_starter_words, semantic_fields |
| G6 | reading | compare_genres, complex_text_analysis |
| G6 | comprehension | evidence_from_text, critical_evaluation_light |
| G6 | writing | research_literacy_choice, argumentative_full_scaffold |
| G6 | grammar | possession_prep, subject_verb_advanced, complex_syntax_spot |
| G6 | vocabulary | discipline_words_light, academic_vocab |

**Action required for Hebrew:** The existing subtopic system must be **connected to Diagnostic Engine V2** (see Section 6). The content-map subtopics currently control pool narrowing only; they do not feed into the diagnostic conclusion layer.

Note: Hebrew display labels already exist in the content maps. No Hebrew copy changes are needed. Owner review of label accuracy is recommended before the diagnostic layer uses them in parent reports.

---

### 5.2 Math (מתמטיקה)

**Current state:** Topics are effectively operations per grade (`GRADES[g*].operations` in `utils/math-constants.js`). Topic-to-taxonomy mapping exists in `utils/diagnostic-engine-v2/topic-taxonomy-bridge.js` (`MATH_OP_TO_IDS[]`). No subtopic catalog files exist.

**Proposed subtopic structure by grade:**

**Grade 1**
| Topic | Proposed Subtopics (planning IDs) | MoE alignment |
|-------|----------------------------------|---------------|
| number_sense | count_sequence_to_20, count_sequence_to_100, number_bonds_to_10, compare_numbers_to_20 | כיתה א: ספירה, השוואה |
| addition | add_facts_to_10, add_facts_to_20, add_missing_addend_to_10 | חיבור לכיתה א |
| subtraction | sub_facts_to_10, sub_facts_to_20, sub_missing_minuend | חיסור לכיתה א |
| word_problems | wp_add_one_step, wp_sub_one_step | בעיות מילוליות לכיתה א |
| shapes_intro | identify_2d_shapes, sort_shapes | צורות גיאומטריות בסיסיות |

**Grade 2**
| Topic | Proposed Subtopics | MoE alignment |
|-------|-------------------|---------------|
| addition | add_no_regroup_to_100, add_with_regroup_to_100, missing_addend_to_100, word_problem_add | חיבור עם/בלי נשיאה עד 100 |
| subtraction | sub_no_regroup_to_100, sub_with_regroup_to_100, missing_subtrahend, word_problem_sub | חיסור עם/בלי שאילה עד 100 |
| number_sense | place_value_tens_ones, number_line_to_100, odd_even, skip_count_2_5_10 | ערך מקום, ספירה קפיצית |
| multiplication | equal_groups_concept, skip_count_as_multiply | הכנה לכפל |
| measurement | measure_length_cm, compare_weight, time_full_half_hour | מדידה בסיסית |

**Grade 3**
| Topic | Proposed Subtopics | MoE alignment |
|-------|-------------------|---------------|
| multiplication | times_table_2_to_5, times_table_6_to_9, times_table_mixed, mul_unknown_factor | לוח הכפל |
| division | equal_sharing, related_to_multiplication, div_with_remainder | חילוק, שארית |
| addition | add_to_1000_no_regroup, add_to_1000_with_regroup | חיבור עד 1000 |
| subtraction | sub_to_1000, multi_step_sub | חיסור עד 1000 |
| fractions | fraction_intro_half_third_quarter, unit_fraction_compare, fraction_on_number_line | שברים פשוטים |
| word_problems | wp_two_step_mixed, wp_money_change | בעיות מילוליות דו-שלביות |

**Grade 4**
| Topic | Proposed Subtopics | MoE alignment |
|-------|-------------------|---------------|
| multiplication | mul_2_digit_by_1, mul_3_digit_by_1, mul_2_digit_by_2 | כפל רב-ספרתי |
| division | div_by_1_digit_no_remainder, div_by_1_digit_with_remainder, long_division_intro | חילוק עם שארית |
| fractions | equivalent_fractions, compare_fractions_unlike, fraction_of_whole_number | שברים שקולים, השוואה |
| decimals | decimal_intro_tenths_hundredths, decimal_compare, decimal_on_number_line | עשרוניים |
| word_problems | wp_fractions, wp_multi_operation, wp_scale_and_money | בעיות מורכבות |
| area_perimeter | area_rectangle, perimeter_rectangle, area_vs_perimeter | שטח והיקף |

**Grade 5**
| Topic | Proposed Subtopics | MoE alignment |
|-------|-------------------|---------------|
| fractions | fraction_add_sub_same_denom, fraction_add_sub_diff_denom, fraction_multiply_by_integer, fraction_of_fraction_intro | חיבור/חיסור/כפל שברים |
| decimals | decimal_add_sub, decimal_multiply_by_10_100, decimal_divide_by_10_100 | חיבור/חיסור עשרוניים |
| percentages | percent_meaning, percent_of_number, percent_find_whole | אחוזים |
| ratio | ratio_intro, ratio_equivalent, ratio_word_problem | יחס |
| proportions | proportion_simple, proportion_word_problem | פרופורציה |
| equations | equation_one_step_add_sub, equation_one_step_mul_div, equation_word_problem | משוואות |

**Grade 6**
| Topic | Proposed Subtopics | MoE alignment |
|-------|-------------------|---------------|
| ratio_proportion | ratio_and_proportion_combined, percent_ratio_bridge, scale_problem | יחס ופרופורציה |
| equations | equation_two_step, equation_with_fractions, inequality_intro | משוואות ואי-שוויון |
| negative_numbers | negative_intro, negative_number_line, add_sub_negative | מספרים שליליים |
| percentages | percent_advanced_find_base, percent_change_increase_decrease | אחוזים מורכבים |
| statistics | average_mean, median_mode, data_reading_graphs | סטטיסטיקה בסיסית |
| powers | power_intro, power_of_10, square_numbers | חזקות |

---

### 5.3 Geometry (גיאומטריה)

**Current state:** Topics defined in `utils/geometry-constants.js` (`GRADES[gN].topics`). Diagnostic taxonomy exists (`utils/diagnostic-engine-v2/taxonomy-geometry.js`, `geometry-taxonomy-candidate-order.js`). Geometry conceptual bank in `utils/geometry-conceptual-bank.js` has rich `skillId`/`subskillId` metadata. No content-map subtopic files exist.

Note: Geometry is typically introduced from Grade 3 in the Israeli curriculum. G1–G2 geometry is minimal (shapes recognition only).

**Proposed subtopic structure:**

**Grade 1–2 (shapes intro)**
| Topic | Proposed Subtopics |
|-------|-------------------|
| shapes | identify_circle_square_triangle_rectangle, sort_by_shape_size_color |

**Grade 3**
| Topic | Proposed Subtopics | MoE alignment |
|-------|-------------------|---------------|
| shapes | identify_polygon_types, right_angle_identify, symmetry_intro | פוליגונים, זוויות |
| perimeter | perimeter_regular_shapes, perimeter_rectangle | היקף |
| area | area_by_counting_squares, area_rectangle_intro | שטח |
| angles | right_angle_straight_angle, angle_comparison | זוויות ישרות |

**Grade 4**
| Topic | Proposed Subtopics | MoE alignment |
|-------|-------------------|---------------|
| quadrilaterals | rectangle_properties, square_properties, parallelogram_intro | מרובעים |
| triangles | classify_by_sides_equilateral_isoceles_scalene, classify_by_angles | משולשים |
| area_perimeter | area_rectangle_formula, perimeter_rectangle_formula, area_vs_perimeter_choose | שטח ×היקף |
| symmetry | axis_of_symmetry_identify, reflection_draw | סימטריה |
| angles | angle_types_acute_right_obtuse, angles_in_triangle_sum_180 | סוגי זוויות, סכום זוויות |

**Grade 5**
| Topic | Proposed Subtopics | MoE alignment |
|-------|-------------------|---------------|
| area | area_parallelogram, area_triangle_formula, area_composite_shapes | שטח מרובע נטוי, משולש |
| volume | volume_cube_intro, volume_rectangular_prism | נפח |
| circles | circle_parts_radius_diameter, circumference_intro | עיגול: רדיוס/קוטר |
| transformations | translation_slide, rotation_intro, reflection_flip | תנועות גיאומטריות |
| parallel_perpendicular | identify_parallel_lines, identify_perpendicular_lines | מקביל, מאונך |

**Grade 6**
| Topic | Proposed Subtopics | MoE alignment |
|-------|-------------------|---------------|
| area | area_circle_formula, area_advanced_composite | שטח עיגול |
| volume | volume_prism_formula, volume_problem_solving | נפח גוף תלת-מימד |
| pythagoras | pythagorean_theorem_identify_right, apply_pythagoras_find_side | משפט פיתגורס |
| coordinate_plane | plot_points_quadrant1, read_coordinates, distance_on_grid | מישור קואורדינטות |
| statistics_geometry | scale_drawing_and_maps, reading_geometric_data | ייצוג גרפי |

---

### 5.4 English (אנגלית)

**Current state:** Topics in `ENGLISH_TOPICS` (grammar, vocabulary, translation, sentences, writing, mixed). Question banks in `data/english-questions/`. Diagnostic taxonomy in `utils/diagnostic-engine-v2/taxonomy-english.js`. No content-map subtopic files.

**Grade 1**
| Topic | Proposed Subtopics |
|-------|-------------------|
| vocabulary | alphabet_and_phonics, colors_shapes_numbers, family_and_body, animals_and_nature |
| grammar | is_am_are_intro, singular_plural_basic, simple_commands |
| sentences | identify_sentence_question, word_order_simple |

**Grade 2**
| Topic | Proposed Subtopics |
|-------|-------------------|
| vocabulary | school_objects_actions, food_and_home, basic_adjectives |
| grammar | simple_present_I_you, question_words_what_who_where, articles_a_an_the |
| sentences | short_sentence_read_and_choose, answer_simple_question |
| reading | read_single_sentence, read_caption_and_answer |

**Grade 3**
| Topic | Proposed Subtopics |
|-------|-------------------|
| grammar | simple_present_he_she_it_s_form, have_has, there_is_there_are, prepositions_in_on_under |
| vocabulary | clothes_and_weather, sports_and_hobbies, context_clue_easy |
| sentences | sentence_completion, sentence_order_rearrange |
| reading | find_detail_short_text, true_false_short_text |

**Grade 4**
| Topic | Proposed Subtopics |
|-------|-------------------|
| grammar | simple_past_regular, simple_past_irregular, can_cant_ability, wh_questions_past |
| vocabulary | topic_based_expansion, synonym_basic, word_in_context |
| writing | sentence_with_connectors_and_but_because, write_short_description_choice |
| reading | find_main_idea, answer_detail_question |

**Grade 5**
| Topic | Proposed Subtopics |
|-------|-------------------|
| grammar | present_perfect_intro_have_has_been, comparative_adjectives, superlative_adjectives, modal_verbs_can_should_must |
| vocabulary | academic_starter_vocabulary, word_families, idiom_intro |
| writing | paragraph_structure_intro, topic_sentence_supporting_detail |
| reading | main_idea_inference, multi_sentence_comprehension |

**Grade 6**
| Topic | Proposed Subtopics |
|-------|-------------------|
| grammar | passive_voice_simple_present_past, first_conditional_if_will, question_tags_basic, reported_speech_intro |
| vocabulary | advanced_academic_words, connotation_denotation_light, word_choice_precision |
| writing | argumentative_paragraph_scaffold, summary_writing_short_text |
| reading | author_purpose_and_tone, inference_and_implication, multi_paragraph_comprehension |

---

### 5.5 Science (מדעים)

**Current state:** Topics in `SCIENCE_TOPIC_ORDER` (body, animals, plants, materials, earth_space, environment, experiments). Static bank in `data/science-questions.js`. Diagnostic taxonomy in `utils/diagnostic-engine-v2/taxonomy-science.js`. No content-map subtopic files.

**Grade 1**
| Topic | Proposed Subtopics |
|-------|-------------------|
| body | five_senses_identify, parts_of_body_location, body_function_basics |
| animals | living_vs_nonliving, pet_vs_wild_animal, animal_body_parts |
| plants | parts_of_plant, plants_need_to_grow, seed_to_plant |
| materials | hard_soft_smooth_rough, natural_vs_manmade |
| earth_space | day_and_night, seasons_four, weather_types |

**Grade 2**
| Topic | Proposed Subtopics |
|-------|-------------------|
| body | skeleton_basic, muscles_movement, nutrition_basic |
| animals | vertebrate_invertebrate_intro, animal_habitats, animal_diet_herbivore_carnivore |
| plants | photosynthesis_basic, plant_reproduction_seeds, types_of_plants |
| materials | states_of_matter_solid_liquid_gas, water_cycle_basic |
| earth_space | earth_sun_moon_relationship, stars_basic |

**Grade 3**
| Topic | Proposed Subtopics |
|-------|-------------------|
| body | digestive_system, respiratory_system_basic, circulatory_system_basic |
| animals | food_chain_producer_consumer, classify_animals_by_trait, animal_adaptation |
| plants | cell_intro_plant, germination_conditions, plant_and_ecosystem_role |
| materials | matter_properties_density_solubility, mixtures_and_solutions |
| earth_space | rock_types_basic, layers_of_earth_intro, erosion_weathering |
| environment | ecosystem_intro, habitat_and_organism, human_impact_basic |

**Grade 4**
| Topic | Proposed Subtopics |
|-------|-------------------|
| body | nervous_system_intro, sensory_system_detailed, body_systems_interaction |
| animals | classification_vertebrates_detailed, insect_life_cycle, plant_pollination |
| plants | photosynthesis_detailed, transpiration, plant_cell_vs_animal_cell |
| materials | force_and_motion_intro, simple_machines_basics, energy_forms_intro |
| earth_space | water_cycle_detailed, weather_vs_climate, natural_disasters |
| environment | food_web_complex, energy_flow_in_ecosystem, conservation_intro |
| experiments | hypothesis_intro, variable_identification, reading_experimental_data |

**Grade 5**
| Topic | Proposed Subtopics |
|-------|-------------------|
| body | cell_division_basic, immune_system_intro, endocrine_intro |
| animals | evolution_adaptation_intro, classification_full_taxonomy, marine_ecosystems |
| materials | chemical_vs_physical_change, acids_bases_intro, electricity_circuits_intro |
| earth_space | solar_system_detailed, earth_rotation_revolution, tides_and_moon |
| environment | biodiversity_importance, human_environmental_impact, renewable_energy_intro |
| experiments | controlled_experiment_design, data_collection_and_table, drawing_conclusions |

**Grade 6**
| Topic | Proposed Subtopics |
|-------|-------------------|
| body | genetics_basic_heredity, organ_systems_interaction, health_and_disease |
| animals | animal_kingdom_full_classification, behavior_learned_vs_instinct |
| plants | plant_kingdom_classification, reproduction_sexual_asexual |
| materials | atomic_structure_intro, chemical_reactions_balancing_basic, magnets_and_electromagnetic |
| earth_space | plate_tectonics_basic, climate_change_intro, space_exploration_history |
| environment | ecology_food_web_energy_pyramid, sustainability_and_conservation_advanced |
| experiments | scientific_method_full, analyze_graph_and_conclude, design_experiment |

---

### 5.6 Moledet / Geography (מולדת / גיאוגרפיה)

**Current state:** Topics in `utils/moledet-geography-constants.js` (homeland, community, citizenship, geography, values, maps). Static banks per grade in `data/geography-questions/g*.js`. Diagnostic taxonomy in `utils/diagnostic-engine-v2/taxonomy-moledet.js`. No content-map subtopic files. Questions structured as `G*_EASY_QUESTIONS.topicKey[]`.

**Grade 1**
| Topic | Proposed Subtopics |
|-------|-------------------|
| homeland | my_house_and_neighborhood, my_city_or_village, symbols_flag_menorah |
| community | family_roles, community_helpers_police_doctor, school_community |
| maps | near_and_far_spatial_language, left_and_right_directions |

**Grade 2**
| Topic | Proposed Subtopics |
|-------|-------------------|
| homeland | regions_of_israel_intro_north_south_center, coastal_vs_inland, climate_intro |
| geography | cardinal_directions_NSEW, map_symbols_legend, map_reading_basic |
| community | city_vs_village_vs_kibbutz, local_government_intro |
| citizenship | rights_and_responsibilities_child, rules_and_laws_intro |

**Grade 3**
| Topic | Proposed Subtopics |
|-------|-------------------|
| homeland | mountains_valleys_rivers_of_israel, major_cities_of_israel, negev_galilee_coastal_plain |
| geography | physical_map_reading, climate_zones_in_israel, water_sources_kinneret_dead_sea |
| community | types_of_communities_urban_rural, kibbutz_history_intro, immigration_aliyah_intro |
| maps | scale_on_map_intro, grid_reference_intro |

**Grade 4**
| Topic | Proposed Subtopics |
|-------|-------------------|
| homeland | israel_neighbors_map, historical_geography_intro, holy_sites_and_religions_in_israel |
| geography | jordan_river_basin, negev_desert_geography, reading_topographic_map |
| citizenship | democratic_values_intro, rights_in_israel, arab_jewish_coexistence_intro |
| community | population_diversity_in_israel, aliyah_waves_historical |
| maps | scale_calculation_basic, map_type_comparison |

**Grade 5**
| Topic | Proposed Subtopics |
|-------|-------------------|
| homeland | founding_of_the_state_1948, war_of_independence_intro, zionism_intro |
| geography | physical_regions_detailed, climate_comparison_north_south, water_economy_israel |
| community | modern_society_in_israel, minorities_and_groups, hi_tech_and_economy |
| citizenship | branches_of_government_intro, rights_responsibilities_citizen, environmental_citizenship |
| maps | satellite_image_reading, advanced_map_skills_coordinates |

**Grade 6**
| Topic | Proposed Subtopics |
|-------|-------------------|
| homeland | israel_in_the_middle_east_region, peace_process_intro, global_jewish_communities |
| geography | world_continents_oceans, physical_world_geography, climate_change_and_geography |
| citizenship | international_organizations_UN_intro, human_rights_global, democracy_comparison |
| values | tolerance_and_coexistence, environmental_responsibility, identity_national_personal |
| maps | world_map_reading_coordinates, time_zones_intro, geopolitical_map_reading |

---

## 6. Diagnostic Engine Impact

### 6.1 The Bridge Layer (New)

The key technical work in the diagnostic engine is creating a **Subtopic–Taxonomy Bridge**: a mapping from `subtopicId` (content-map layer) to `TaxonomyRow.id` (diagnostic engine layer).

This bridge does not replace either system. It adds a lookup that says:
"When the engine is analyzing a topicRowKey that has subtopic evidence, check these taxonomy IDs first."

Example:
```
math_g2.add_with_regroup  →  TaxonomyRow M-02 (addition carrying error)
math_g4.fraction_add_sub_diff_denom  →  TaxonomyRow M-07 (adds denominators directly, wrong_lcm)
g1.phoneme_awareness  →  TaxonomyRow H-05 (phoneme discrimination)
```

This bridge file should be added alongside the existing `utils/diagnostic-engine-v2/topic-taxonomy-bridge.js`.

### 6.2 Evidence Requirements Before Subtopic Diagnosis

A subtopic-level diagnostic conclusion must require more evidence than a topic-level one, because the sample size is smaller (questions are split across subtopics).

Proposed rules:
- **Minimum correct+wrong for subtopic diagnosis:** 5 questions in the subtopic (vs. topic-level which can act on fewer)
- **Minimum wrong for subtopic weakness signal:** 3 wrong answers specifically in the subtopic (configurable per taxonomy row, can be `subtopic_minWrong` field)
- **Confidence gates:** Below 5 answers in the subtopic → output `insufficient_data`; suppress subtopic-level conclusions in parent report
- **Thin-data caveats apply at subtopic level:** Parent report must use soft language ("we are starting to see…") when subtopic evidence is thin
- **Never override topic-level mastery:** If a student has strong topic-level data showing mastery, a weak subtopic signal in a thin sample must not override the headline message

### 6.3 Subtopic Mastery Tracking

Subtopic mastery follows the same band model as topic mastery, computed at read-time from filtered answers:

```
unknown → emerging → near_mastery → mastered → retention_risk
```

Conditions per band:
- `unknown`: fewer than 5 questions answered in subtopic
- `emerging`: 5–14 questions, accuracy 0–69%
- `near_mastery`: 15–24 questions, accuracy 70–87%
- `mastered`: 25+ questions, accuracy ≥88%, difficulty spread across at least 2 levels
- `retention_risk`: was `mastered`, but last 7 answers show accuracy drop ≥20%

### 6.4 Relationship Between Topic and Subtopic Diagnosis

- Topic-level diagnosis **continues to function exactly as today** for all subjects.
- Subtopic diagnosis is **additive enrichment** that can be shown inside a topic row when data is sufficient.
- If the diagnostic engine fires a topic-level pattern (`M-02: carrying error in addition`), and the student's subtopic data shows weakness specifically in `math_g2.add_with_regroup`, the subtopic label reinforces the diagnostic conclusion.
- Subtopic evidence that contradicts the topic-level signal must be handled by the engine's existing `competing-hypotheses.js` layer.
- The engine must never show a subtopic weakness conclusion for a topic the student has already achieved `mastered` status in.

### 6.5 Backward Compatibility of Diagnostic Behavior

- All existing engine behavior is preserved. Subtopic is an additive enrichment path.
- If `subtopicId` is not present on a question or cannot be inferred, the engine runs exactly as today.
- Existing `patternDiagnostics`, `topicRecommendations`, and `topicEngineRowSignals` fields in the report payload are not removed — they may gain optional subtopic enrichment fields.
- The `contractsV1.narrative` eligibility gates (`recommendation.eligible`) are unaffected initially.

---

## 7. Parent Report Impact

### 7.1 Short Parent Report

The short report (weekly/monthly bar chart + explain rows) should show subtopics when:
- The student has at least 5 answers in a subtopic in the period
- The subtopic mastery is `emerging` or the subtopic has a confirmed diagnostic pattern
- The topic-level row is already showing `needsPractice = true`

**UI approach (planning, no implementation yet):**
- Under a topic explain row, add a collapsible detail line: "In particular, [Hebrew subtopic label]."
- This detail line must use an approved parent-facing Hebrew label (not the internal `subtopicId`).
- The detail line must pass `validateParentReportAIText()` before display.

### 7.2 Detailed Report

The detailed report's `topicRecommendations` array can gain an optional `subtopicFocus[]` field on each recommendation row:

```js
topicFocus: {
  subtopicId: "math_g2.add_with_regroup",
  subtopicLabelHe: "...",  // Hebrew, approved by owner
  confidence: "moderate",
  evidenceCount: 8,
  accuracyInSubtopic: 0.42,
}
```

This must never appear without an approved Hebrew label. Internal IDs must never surface in parent-facing output.

### 7.3 Short Reports — Thin-Data Caveats at Subtopic Level

If a subtopic has fewer than 5 answers:
- Subtopic data must be **suppressed entirely** from parent-facing output.
- The topic-level summary is shown without subtopic detail.
- The Copilot must not reference a specific subtopic when the evidence is thin.

If a subtopic has 5–10 answers:
- Soft language is required: parent-facing copy must use hedged phrasing.
- The `dataSufficiencyLevel` for this subtopic must be `thin` or `moderate`.

### 7.4 Forbidden Output Rules (Preserving Existing Safety Layer)

All existing rules in `parent-report-ai-validate.js` continue to apply. Additional rules for subtopic output:

- Never show internal subtopicId strings (e.g., `g1.phoneme_awareness`) in any parent-facing surface.
- Never say "your child failed in [subtopic]" — blame language rules apply equally to subtopics.
- Never make the report feel like a fine-grained audit of every subtopic. Limit subtopic depth to 1–2 per subject maximum in any single report view.

### 7.5 Parent Copilot Subtopic Support

The Copilot truth packet (`utils/parent-copilot/truth-packet-v1.js`) can be enriched with subtopic signals when evidence is sufficient. The Copilot should be able to:

- Answer "What specifically should my child practice in addition?" → cite the specific subtopic weakness
- Answer "Is she good at reading?" → mention the strongest and weakest subtopic within reading (if data exists)
- Recommend specific focused practice by subtopic when recommending homework

Copilot must still apply all existing guardrails: no diagnostic language, no blame, no guarantees, minimum evidence thresholds.

---

## 8. Teacher Portal / Classroom Impact

### 8.1 Current State

The `classroom_activities` DB table already has `subtopic text NULL` and `skill_key text NULL` columns. The teacher activity creation UI (`pages/teacher/class/[classId]/activities/new.js`) has a subtopic state field. However, the question generation function (`generate-activity-questions-client.js`) does not yet use the subtopic value to narrow the question pool.

### 8.2 Planned Teacher Subtopic Selection Flow

When creating a classroom activity, teachers should eventually be able to select:

```
Subject → Grade → Topic → Subtopic (optional, dropdown)
```

The subtopic dropdown should:
- Appear only after topic is selected
- Show only subtopics that have sufficient question coverage at the selected grade/difficulty
- Show Hebrew display labels (not internal IDs)
- Be optional — teachers can create activities at topic level only (as today)
- For Math and Science (currently free-text topic), be replaced with a structured dropdown when subtopic catalogs are complete

### 8.3 Question Generation Integration

When a teacher selects a subtopic, `generateActivityQuestionSetClient()` should narrow the question pool to questions matching that subtopicId. The existing pool-narrowing logic in the Hebrew subtopic files (e.g., `narrowHebrewG1Pool()`) is the pattern to follow.

If the narrowed pool has fewer than the requested `questionCount`, the generator should:
1. Log a coverage warning (server-side only)
2. Fall back to the full topic pool without warning the teacher
3. Optionally: notify teacher that "not enough questions for this exact subtopic; showing related questions"

### 8.4 Class-Level Subtopic Reports

After activities, the teacher report (`pages/teacher/class/[classId]/activities/[activityId]/report.js`) should optionally show:
- Class-level accuracy by subtopic (when activity was scoped to a subtopic)
- List of students who struggled on the specific subtopic vs. students who did well

This is a planning-level note — no implementation yet. Teacher portal subtopic UI is Phase 5.

### 8.5 Teacher Dashboard — Class Subtopic Weaknesses

The teacher class dashboard (`pages/teacher/class/[classId].js`) currently shows weak topics per student. Eventually it should show weak subtopics aggregated across the class, enabling the teacher to identify the most common class-wide subtopic gap.

### 8.6 No UI Changes in This Plan

This document does not implement or design any UI. Teacher portal subtopic UI is a Phase 5 deliverable. All UI planning requires separate owner approval of Hebrew display labels and UX layout before implementation.

---

## 9. Student and Parent Practice Impact

### 9.1 Current Practice Selection

Currently, a student selects a subject and topic. Grade is inferred from the student's registered grade. Level (difficulty) is tracked and adjusted. Subtopic is only active for Hebrew.

### 9.2 Planned Subtopic-Focused Practice

When a student (or parent) wants focused practice:

**Scenario A — Diagnostic-driven focus (recommended):** After the diagnostic engine identifies a subtopic weakness, the practice session starts in "focused mode" targeting that subtopic. The student does not select the subtopic — the system selects it.

**Scenario B — Parent-initiated focus:** After reading a parent report that mentions a specific subtopic, the parent taps "practice this" and the session launches in subtopic-focused mode.

**Scenario C — Teacher-assigned focus:** A classroom activity scoped to a subtopic places the student in that subtopic's question pool for the duration of the activity.

### 9.3 Progression Logic

Subtopic focus sessions should not feel like a grind through a list of subtopics. The design principle:

- A session starts in the recommended subtopic (the weakest one, or the diagnostically confirmed one).
- After enough correct answers in that subtopic (configurable, e.g., 5 correct consecutively), the session can optionally widen to the full topic.
- The system should never force a student through every subtopic systematically — the goal is useful practice, not curriculum completion.
- If the student is in a free-play session (not diagnostic-driven), subtopic focus is optional and not enforced.

### 9.4 Avoiding Over-Prescription

The product goal is **consistency and enjoyment**, not rigid curriculum completion. Rules:

- Subtopic-focused practice should feel like a natural part of the session, not a test of specific items.
- If a subtopic pool runs low on questions (below the minimum floor), the session must widen automatically rather than repeat questions.
- The existing `widenHebrewG*PoolIfSmall()` pattern (expand to adjacent subtopics by weight order) is the reference implementation.
- Parent recommendations should reference subtopics as helpful hints, not as required assignments.

---

## 10. Migration Strategy

### 10.1 Phase-by-Phase Data Migration

**No DB migrations are required in early phases.** The strategy is:

1. Build catalog JS files (no DB changes)
2. Tag existing question banks (no DB changes — fields added to JS objects)
3. Update generators to use subtopicId in question params (no DB changes)
4. Enable pool narrowing in practice sessions (no DB changes)
5. Enable subtopic signal in diagnostic engine (no DB changes — computed on read)
6. Enable subtopic in parent reports (no DB changes)
7. Enable subtopic in teacher portal (classroom_activities.subtopic already exists)
8. Phase 7+: consider `subtopic_id` column on `learning_sessions` if analytics require it

### 10.2 Existing Question Tagging Strategy

**Static banks** (science, english, hebrew-archive, geography): Add `subtopicId` field to each question row in the JS file. This is a bulk find-and-classify operation on static data.

**Procedural generators** (math, geometry, hebrew): Questions are generated at runtime. The generator must determine `subtopicId` from the operation/variant being generated and include it in `params.subtopicId`.

**Legacy questions without subtopicId:** Use inference functions (like `inferG1SubtopicIdFromStem()`) to retroactively assign a subtopicId from the question text at read-time. This is already done for Hebrew. For other subjects, similar inference functions must be written for the question generator output format.

### 10.3 Unknown / Mixed Subtopic Handling

When a question cannot be confidently assigned to a subtopic:
- Assign `subtopicId: null` or omit the field entirely.
- In pool narrowing: treat as belonging to the topic generally (eligible for any subtopic session).
- In diagnostic scoring: question's wrong answer does not count toward any specific subtopic's evidence.
- In QA reports: flag these questions as `subtopic_tag_missing` — track coverage ratio.

### 10.4 Validating Old Reports Still Work

- Parent report pipeline must be tested end-to-end after any subtopic catalog change to verify no regression in topic-level output.
- `topicRecommendations` objects must still contain exactly the same fields as today — subtopic enrichment is strictly additive.
- The `contractsV1.narrative.eligibility` gates must not change behavior for any existing topic-level data.
- Launch the `scripts/parent-ai-mass-simulation/` harness against existing session data before and after each phase to confirm report output parity.

### 10.5 Gradual Rollout Without Breaking Production

- Subtopic catalog files can be deployed to production before any product surface uses them (they are inert JS files).
- Pool narrowing can be enabled per-subject behind a feature flag: `SUBTOPIC_FOCUS_ENABLED_SUBJECTS = new Set([])`.
- Diagnostic subtopic enrichment can be gated per-subject in the engine bridge.
- Parent report subtopic enrichment can be gated by a `showSubtopicDetail` flag in the report config.
- No feature flag change triggers a DB migration.

---

## 11. QA and Gates

### 11.1 Catalog Completeness Checks

Before any subject's subtopic catalog is used in production:

- [ ] All subtopic IDs follow the naming convention `{subject}_{gradeKey}.{slug}`
- [ ] All subtopics have `weight`, `order`, `modesAllowed`, `flags` fields
- [ ] No two subtopics within the same topic×grade have duplicate IDs
- [ ] Every subtopic has an approved Hebrew display label (stored in a separate labels file, not in the content map)
- [ ] Hebrew display labels pass `validateParentReportAIText()` in test mode
- [ ] Content map file exports the correct function names (`pick*SubtopicId`, `get*SubtopicSpec`)

### 11.2 Question Coverage Checks

Before a subtopic is activated for diagnostic use:

- [ ] At least N_MIN questions (per Section 4.3) exist at each difficulty level for this subtopic
- [ ] Coverage ratio for the subject × grade × topic × subtopic combination is logged in the QA report
- [ ] No subtopic has 100% of questions at a single difficulty level (indicate coverage gap)
- [ ] `question-bank-inventory-gate.mjs` script is extended to track subtopic coverage

### 11.3 No Orphan Topics or Subtopics

- [ ] Every subtopic in a content map corresponds to at least N_MIN questions in the relevant bank
- [ ] No subtopicId appears in a question bank that does not exist in a content map
- [ ] The inference functions (`inferSubtopicFromStem()`) must have a catch-all fallback that returns the most generic subtopic, never `undefined`

### 11.4 No Raw Internal Labels in Parent-Facing Surfaces

- [ ] All subtopicId strings (e.g., `math_g2.add_with_regroup`) must be absent from any parent-facing page render
- [ ] All subtopic labels shown to parents must come from the approved Hebrew labels file
- [ ] Automated test: scan parent report payload for strings matching `^[a-z]+_g[1-6]\.[a-z_]+$` regex — any match is a failure

### 11.5 Diagnostic Evidence Threshold Tests

- [ ] When a student has 0–4 answers in a subtopic, no subtopic-level diagnostic conclusion is emitted
- [ ] When a student has 5 answers but only 1 wrong, no subtopic weakness is flagged
- [ ] When a student has 8+ answers with 4+ wrong in the same subtopic, a `tentative` weakness signal is emitted
- [ ] Topic-level mastery `mastered` is never overridden by thin subtopic data

### 11.6 Parent Report Regression Tests

- [ ] Run `scripts/parent-ai-mass-simulation/` with 100+ synthetic student sessions before and after subtopic layer activation
- [ ] Verify that `topicRecommendations` arrays are identical in structure (same keys, same types)
- [ ] Verify that `contractsV1.recommendation.eligible` values do not change for any existing session data
- [ ] Verify that `patternDiagnostics` output is identical for sessions with no subtopic data
- [ ] Verify that the parent-report AI text validator passes on all new subtopic-enriched report sections

### 11.7 Teacher Assignment Regression Tests

- [ ] Creating a classroom activity with `subtopic: null` behaves identically to today
- [ ] Creating a classroom activity with a valid `subtopicId` narrows the question pool correctly
- [ ] Creating a classroom activity with an invalid `subtopicId` falls back gracefully to full topic pool
- [ ] `classroom_activity_attempts` records still store `skill_key` as today

### 11.8 Student Practice Regression Tests

- [ ] A practice session with no subtopic focus runs identically to today
- [ ] The `widenPool` fallback fires correctly when a subtopic pool is too small
- [ ] Anti-repeat fingerprint buffer works correctly with subtopic-narrowed pools
- [ ] Probe-biased selection (`selectQuestionWithProbe`) continues to work after pool narrowing

### 11.9 Launch-Readiness Gate

A subject-level subtopic feature is not production-ready until ALL of the following are true:

- [ ] Catalog completeness check passed
- [ ] Question coverage check passed (all subtopics at N_MIN)
- [ ] No orphan subtopics
- [ ] No internal labels in parent-facing surfaces
- [ ] Diagnostic evidence threshold tests passed
- [ ] Parent report regression tests passed (no regressions)
- [ ] Teacher assignment regression tests passed
- [ ] Student practice regression tests passed
- [ ] Hebrew display labels approved by owner
- [ ] At least one full end-to-end test run from student session → parent report → Copilot using subtopic-enriched data

---

## 12. Risk Analysis

### 12.1 Over-Fragmentation Risk

**Risk:** Too many subtopics make the system feel granular to the point of noise, especially for parents.

**Mitigation:**
- Follow the anti-fragmentation rules in Section 4.2.
- Limit parent-facing subtopic depth to 1–2 per subject per report period.
- Engine conclusions must require meaningful evidence before surfacing a subtopic.
- Owner review of subtopic taxonomy before any phase goes live.

### 12.2 Too Few Questions Per Subtopic

**Risk:** A subtopic is added to the catalog but has only 3–4 questions. Pool narrowing sessions become repetitive and diagnostic conclusions are unreliable.

**Mitigation:**
- N_MIN coverage gate is mandatory before activation.
- `question-bank-inventory-gate.mjs` script must track subtopic coverage.
- Start with fewer, broader subtopics and split later when question bank grows.

### 12.3 Breaking Existing Reports

**Risk:** Adding subtopic enrichment to the report pipeline introduces bugs that change or suppress existing topic-level outputs.

**Mitigation:**
- Subtopic enrichment is strictly additive — never modifies existing fields.
- All changes behind feature flags until regression tests pass.
- Automated regression test suite run before every phase deployment.

### 12.4 Making Parent Reports Too Complicated

**Risk:** Parents see subtopic breakdowns that feel overwhelming, confusing, or alarming.

**Mitigation:**
- Subtopic in parent reports is collapsible/optional, not the headline.
- Thin-data suppression rules prevent noise.
- All parent-facing labels must be reviewed for clarity and tone.
- The existing `validateParentReportAIText()` blame/scary/promise filters apply to all subtopic copy.

### 12.5 Teacher UI Becoming Too Complex

**Risk:** Adding a subtopic dropdown to the teacher activity creation form makes it harder to create simple activities.

**Mitigation:**
- Subtopic is always optional in the teacher form.
- Default is topic-level (same as today).
- Subtopic dropdown only appears when sufficient question coverage exists.
- Teacher portal UI changes are Phase 5 — deferred.

### 12.6 Curriculum Mismatch Risk

**Risk:** Proposed subtopics do not align with what the Israeli MoE actually teaches at a given grade, or what teachers and parents expect.

**Mitigation:**
- All proposed subtopics in Section 5 are documented as planning IDs pending MoE alignment review.
- Reference files in `utils/curriculum-audit/` must be cross-checked for each subject before catalog finalization.
- Owner review is a hard gate before any subtopic is surfaced to parents or teachers.

### 12.7 Old QA Reports Becoming Misleading

**Risk:** After subtopic tagging, QA coverage reports may show existing questions as `subtopic_tag_missing`, creating noise.

**Mitigation:**
- QA scripts should distinguish `no_subtopic_support_yet` (subject not yet subtopicized) from `subtopic_tag_missing` (subject has catalog but question lacks ID).
- Only the latter is a QA failure.

### 12.8 Data Migration Risk if DB Changes Introduced Too Early

**Risk:** Adding `subtopic_id` column to `learning_sessions` or `answers` before sufficient question coverage creates a column that is almost entirely NULL, adding no value while complicating queries and migrations.

**Mitigation:**
- No DB schema changes until Phase 5 minimum.
- Phase 5 DB migration is only recommended if subtopic analytics are actively needed and catalog coverage is at or above 80% for the subject being added.

---

## 13. Phased Roadmap

### Phase 0 — Discovery and Current-State Audit (1–2 weeks)

**Goal:** Document the complete current state and identify gaps.

Tasks:
- Audit all question banks for existing `subtopicId` or `patternFamily` fields that could serve as proto-subtopics.
- Run `question-metadata-qa.mjs` and `audit-question-banks.mjs` to get current coverage statistics.
- Review `data/curriculum-spine/v1/` — it already has `subtopic` fields in its schema. Determine if it can serve as the canonical subtopic registry.
- Cross-reference proposed subtopics in Section 5 against `utils/curriculum-audit/*-official-subsection-catalog.js` for each subject.
- Identify which question generator variants (`kind`, `patternFamily`) already correspond to which proposed subtopics.
- Document all places in the codebase where `subtopic` field is read or written (already partially cataloged: `classroom_activities.subtopic`, Hebrew content maps).
- Produce a coverage audit spreadsheet: subject × grade × topic × proposed subtopic × current question count.

**Deliverable:** Coverage audit report. Updated Section 5 of this document with coverage counts. Owner approval of proposed subtopic taxonomy.

---

### Phase 1 — Canonical Subtopic Catalog Design (2–3 weeks)

**Goal:** Finalize and create all content-map catalog files.

Tasks:
- For each non-Hebrew subject, create `data/{subject}-g{N}-content-map.js` following the Hebrew pattern.
- Each catalog file includes: subtopic IDs, weights, order, modesAllowed, flags.
- Create `utils/{subject}-g{N}-subtopic.js` with: `infer*SubtopicIdFromStem()`, `resolve*ItemSubtopicId()`, `narrow*Pool()`, `widen*PoolIfSmall()`, `with*SubtopicPreference()`, `attach*SubtopicParams()`.
- Register all new subtopicIds in the metadata taxonomy allowlist (`utils/question-metadata-qa/question-metadata-taxonomy.js`).
- Create a subtopic Hebrew labels file: `data/subtopic-labels-he.js` — English planning ID → Hebrew display string (all labels pending owner approval, marked with `pending_approval: true`).

**Deliverable:** All content-map catalog files created. Subtopic ID registry complete. Hebrew labels draft created. Owner review of labels.

---

### Phase 2 — Question Tagging / Mapping Layer (3–4 weeks)

**Goal:** Tag existing questions with `subtopicId` and update generators.

Tasks:
- Static banks (science, english, geography, hebrew-archive): add `subtopicId` to each question row. Where the question can be assigned confidently by a reviewer, tag explicitly. Where uncertain, rely on the inference function.
- Procedural generators (math, geometry, hebrew): add `params.subtopicId` to generated question objects based on the operation/variant/topic being generated.
- Write inference functions for each subject (following Hebrew's `inferG*SubtopicIdFromStem()` pattern).
- Update `question-bank-inventory-gate.mjs` to report per-subtopic question counts.
- Run the N_MIN gate and document which subtopics pass and which are below threshold.
- For below-threshold subtopics: either write additional questions or mark the subtopic as `draft` (available in catalog but not yet enabled for use).

**Deliverable:** All question banks tagged. Coverage gate report showing which subtopics are activation-ready. List of subtopics still needing more questions.

---

### Phase 3 — Diagnostic Engine Subtopic Support (2–3 weeks)

**Goal:** Connect the subtopic layer to Diagnostic Engine V2.

Tasks:
- Create `utils/diagnostic-engine-v2/subtopic-taxonomy-bridge.js` mapping subtopicId → relevant TaxonomyRow IDs.
- Update `run-diagnostic-engine-v2.js` to pass subtopic evidence when available (subtopic-filtered mistake events, subtopic accuracy).
- Add `subtopicUnits[]` to the engine output shape (additive, does not replace existing `units[]`).
- Implement the evidence threshold rules (Section 6.2): suppress subtopic conclusions below 5-question minimum.
- Add subtopic mastery band computation (Section 6.3) to `mastery-engine-v1.js` or a new `subtopic-mastery-engine.js`.
- Update `topic-taxonomy-bridge.js` to be aware of subtopicId when routing taxonomy candidates.
- Run diagnostic harness (`scripts/diagnostic-engine-v2-harness.mjs`) to verify no regressions.

**Deliverable:** Diagnostic engine produces subtopic-level units in addition to topic-level units. All existing tests pass. New subtopic-specific tests pass.

---

### Phase 4 — Parent Report and Parent Copilot Support (2–3 weeks)

**Goal:** Surface subtopic insights in parent-facing surfaces.

Tasks:
- Add optional `subtopicFocus` field to `topicRecommendations` rows in `detailed-parent-report.js`.
- Add optional subtopic detail line to short report topic rows in `parent-report-v2.js`.
- Add thin-data suppression logic: if subtopic evidence < 5 answers, suppress subtopic detail.
- Implement Hebrew label lookup for subtopicId → display string from `data/subtopic-labels-he.js`.
- Validate all new subtopic display strings through `validateParentReportAIText()`.
- Update `truth-packet-v1.js` to include subtopic signals when eligible.
- Update Copilot intent composers to use subtopic data when answering "what should they practice" questions.
- Run parent report regression tests against 100+ synthetic sessions.
- Owner review of all new parent-facing Hebrew subtopic label strings.

**Deliverable:** Parent reports show subtopic detail when data is sufficient. Copilot answers are more specific. All regression tests pass. Owner approves Hebrew labels.

---

### Phase 5 — Teacher / Class Activity Support (2 weeks)

**Goal:** Enable teacher subtopic selection in classroom activities.

Tasks:
- Wire `subtopic` value in teacher activity creation form to question generation function.
- Update `generate-activity-questions-client.js` to call the appropriate `narrow*Pool()` function when subtopicId is provided.
- Add subtopic dropdown to teacher UI (requires separate UI design and owner approval of Hebrew labels).
- Post-activity report: show per-subtopic accuracy when activity was scoped to a subtopic.
- Teacher class dashboard: aggregate subtopic weakness across students (planning level only; implementation in this phase).
- Review Math and Science topic inputs: replace free-text with structured dropdown using the new content maps.

**Deliverable:** Teachers can create subtopic-scoped activities. Activity reports show subtopic breakdown. Teacher portal UI approved by owner.

---

### Phase 6 — Student / Parent Focused Practice (2 weeks)

**Goal:** Enable focused subtopic practice in student sessions.

Tasks:
- Enable subtopic-focused session start for all subjects (currently Hebrew only).
- Implement the session progression logic (Section 9.3): start in weak subtopic, widen after success.
- Enable "practice this" link from parent report subtopic detail to launch a focused session.
- Test pool-widening fallback under all subjects to prevent repetitive sessions.
- Update adaptive planner API to include subtopicId in recommendation payload.

**Deliverable:** Students can practice focused on a weak subtopic. Parent "practice this" link works. Pool-widening tested.

---

### Phase 7 — QA, Regression, and Release Gate (2–3 weeks per subject)

**Goal:** Validate every subject end-to-end before release.

Tasks:
- Run all QA gates from Section 11 per subject.
- Catalog completeness check.
- Question coverage check.
- No orphan subtopics.
- No internal labels in parent-facing surfaces.
- Diagnostic evidence threshold tests.
- Parent report regression tests.
- Teacher assignment regression tests.
- Student practice regression tests.
- Final owner review of all Hebrew display labels.
- Rollout per subject: Hebrew first (already built), then Math, then Geometry, then English, then Science, then Moledet/Geography.

**Deliverable:** Production release gate passed for each subject. Feature enabled per-subject. Monitoring in place.

---

## 14. Acceptance Criteria

The Subtopic Diagnostic Layer is considered complete when:

1. All six subjects (Math, Geometry, Hebrew, English, Science, Moledet/Geography) have canonical subtopic catalog files for grades 1–6.
2. All question banks have subtopicId tagging with at least 80% coverage per subject × grade × topic × subtopic combination.
3. Every subtopic that appears in production has passed the N_MIN question coverage gate.
4. The Diagnostic Engine V2 produces subtopic-level units with correct evidence thresholds (no conclusions on thin data).
5. Parent reports show subtopic detail for at least one subject in production, validated by owner.
6. Parent Copilot answers reference specific subtopics when evidence is available.
7. Teachers can create classroom activities scoped to a specific subtopic.
8. Student practice sessions narrow to a subtopic when diagnostically recommended.
9. No internal subtopicId strings appear in any parent-facing output surface.
10. All existing topic-level diagnostic behavior is unchanged (regression tests pass for all subjects).
11. Hebrew display labels for all new parent-facing subtopic content approved by owner.

---

## 15. Open Questions for Owner Approval

The following questions must be answered by the product owner before implementation begins or during Phase 0/1:

**Pedagogical / Curriculum:**

1. Should proposed subtopic structures in Section 5 be validated against a specific edition or year of the MoE curriculum? Which document is authoritative?
2. Are the proposed subtopic granularities appropriate, or should any subjects start coarser (e.g., only 2 subtopics per topic rather than 3–5)?
3. For Science, should subtopics track theoretical concepts or experimental skills, or both? (Currently both are proposed.)
4. For Moledet/Geography, do the proposed subtopics feel appropriate given the product's target age group and the way teachers use this subject?
5. Should subtopics align to individual lesson topics in Israeli textbooks (specifically)? If yes, which textbook series?

**Product / UX:**

6. In parent reports, should subtopic detail be visible by default, or hidden behind a "show more" tap?
7. Should parents be able to request subtopic-focused practice directly, or only through Copilot recommendations?
8. Should the teacher activity form show subtopic selection for all subjects simultaneously, or roll out per subject?
9. How should thin-data caveats be phrased in Hebrew to parents when subtopic evidence is below the threshold? (Requires Hebrew copy approval.)

**Technical:**

10. Should `data/curriculum-spine/v1/` serve as the canonical subtopic registry (it already has a `subtopic` field in its schema), or should content-map JS files be the canonical source?
11. At what point (if ever) should `subtopic_id` be added as a column to `learning_sessions` for analytics purposes? What analytics queries would drive that decision?
12. Should Diagnostic Engine V2 subtopic conclusions be stored in `parent_reports` table (currently unused), or always computed on read?
13. Is there a plan to expand the question banks to meet the N_MIN coverage gates, or should subtopics that don't meet N_MIN be deferred indefinitely?

**Hebrew Labels:**

14. Who is the approver for Hebrew display labels for subtopics in parent reports?
15. Should Hebrew labels be consistent with labels used in MoE materials or with labels teachers use informally?
16. For English subtopics shown in Hebrew to parents (e.g., "grammar – simple past"), what is the preferred Hebrew register (formal / informal / curriculum-standard)?

---

*End of document. Document created May 2026. Planning only — no code, SQL, or commits have been made.*
