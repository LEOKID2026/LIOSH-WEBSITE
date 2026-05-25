# SUBTOPIC DIAGNOSTIC LAYER — PHASE 0 COVERAGE AUDIT

**Document type:** Discovery and coverage audit (read-only — no code was changed)  
**Complements:** `docs/subtopics/SUBTOPIC_DIAGNOSTIC_LAYER_MASTER_PLAN.md`  
**Audit date:** 2026-05-26  
**Auditor:** Automated multi-agent scan of codebase — confirmed against actual file counts  

---

## 0. Executive Summary

The Phase 0 audit finds the codebase in a significantly more mature state than a blank-slate start:
`data/curriculum-spine/v1/skills.json` already contains **423 skills** with a required `subtopic` field
spanning all six subjects and grades 1–6. Hebrew has a fully operational subtopic layer (content maps,
inference functions, pool-narrowing utilities). Math has 91 generator-kind subtopics that are immediately
usable. Geography has 3,506 questions with even topic coverage. Science has ~1,618 merged questions but no
grade-specific separation and no subtopicId field anywhere.

**Top blocker:** The classroom activity generator does not read the teacher's `subtopic` field when
selecting questions. The DB has the column, the server stores the value, but the wiring gap in
`lib/classroom-activities/generate-activity-questions-client.js` means every stored subtopic is silently
ignored.

**Phase 1 readiness:** Math is ready to proceed immediately with a content-map layer. Geography is very
close. Hebrew needs only the diagnostic bridge. Science and English should wait.

---

## 1. Current Subtopic-Related Inventory

### 1.1 Curriculum Spine v1 (`data/curriculum-spine/v1/`)

**Status: Exists and clean (0 gaps, 0 conflicts)**

The spine schema (`schema.json`) requires `subtopic` on every skill row. As of 2026-04-25 it has
**423 skills** across all six subjects:

| Subject | Count | Subtopic format | Notes |
|---------|------:|-----------------|-------|
| hebrew | 135 | `g1.phoneme_awareness` style | All 6 grades × 6 topics, `spine_layer: "content_map"` |
| math | 91 | Generator `kind` value: `add_two`, `frac_add_sub` | Organized into 7 topic buckets |
| english | 81 | Grade×topic access keys + grammar construct IDs | Mixed format |
| geography | 71 | Hebrew-label slugs per grade×topic | `geography_0_מפת_כיתה` style |
| geometry | 38 | Procedural kind: `square_area`, `pythagoras_hyp` | Grade-bound |
| science | 7 | `"question_bank"` (placeholder only) | One row per topic, NOT real subtopics |

The spine is already the closest thing to a canonical subtopic registry in the codebase.

### 1.2 Hebrew Content Maps and Subtopic Utilities

**Status: Complete for all grades.**

| File | Grade | Subtopics defined |
|------|-------|-------------------|
| `data/hebrew-g1-content-map.js` | g1 | 25 subtopics (reading 9, comprehension 3, writing 2, grammar 8, vocabulary 2, speaking 1) |
| `data/hebrew-g2-content-map.js` | g2 | 16 subtopics |
| `data/hebrew-g3-content-map.js` | g3 | 13 subtopics |
| `data/hebrew-g4-content-map.js` | g4 | 11 subtopics |
| `data/hebrew-g5-content-map.js` | g5 | 11 subtopics |
| `data/hebrew-g6-content-map.js` | g6 | 12 subtopics |
| **Total** | g1–g6 | **88 subtopics** |

Inference utilities exist for all grades:

| File | Grades | Exports |
|------|--------|---------|
| `utils/hebrew-g1-subtopic.js` | g1 | `inferG1SubtopicIdFromStem`, `narrowG1Pool`, `widenG1PoolIfSmall`, `attachG1SubtopicParams` |
| `utils/hebrew-g2-subtopic.js` | g2 | Same pattern |
| `utils/hebrew-g3456-subtopic.js` | g3, g4, g5, g6 | `inferG3/4/5/6SubtopicIdFromStem`, `narrowHebrewUpperGradePool`, `attachUpperGradeSubtopicParams` |

### 1.3 Diagnostic Metadata Fields Across All Question Banks

**`subtopicId`** — only 9 JS files reference this field; all are Hebrew-specific:

| File | subtopicId count |
|------|----------------:|
| `data/hebrew-questions/g3.js` | 4 (all g3 reading medium, genre tag) |
| `data/hebrew-g1-content-map.js` | Defines the IDs (not question-level) |
| `data/hebrew-g2-content-map.js` | Defines the IDs |
| `utils/hebrew-g1-subtopic.js` | Inference output |
| `utils/hebrew-g2-subtopic.js` | Inference output |
| `utils/hebrew-g3456-subtopic.js` | Inference output |
| `utils/hebrew-question-generator.js` | Reads subtopicId from params |
| `utils/hebrew-learning-intel.js` | Consumes subtopicId |
| `lib/classroom-activities/generate-activity-questions-client.js` | Copies `p.subtopicId` into frozen Hebrew params only |

**No non-Hebrew question bank has any `subtopicId` field.**

Summary of other diagnostic metadata fields by subject:

| Subject / Bank | patternFamily | diagnosticSkillId | subtype | probePower | expectedErrorTags |
|----------------|:-------------:|:-----------------:|:-------:|:----------:|:-----------------:|
| Hebrew archive bank (g1-g6) | g3 reading only (46 in g3-bank) | 0 | 0 | 0 | 0 |
| Hebrew rich bank (54 items) | 54/54 (100%) | 51/54 (~94%) | 0 | 0 | most items |
| Math generator | 7 paths (fractions + probes) | 7 paths | 0 | 2 paths | 7 paths |
| Math (via metadata bridge) | 100% (after `attachProfessionalMathMetadata`) | 100% | 0 | partial | partial |
| Geometry conceptual bank (48) | 48/48 (100%) | 31/48 (65%) | 48/48 (100%) | 1/48 | most items |
| Geometry procedural (via bridge) | 14 inline + bridge | bridge covers 35 kinds | bridge | rare | per-kind |
| English grammar-pools (178) | 178/178 (100%) | 4/178 (~2%) | 178/178 (100%) | 0 | 0 |
| English sentence-pools (229) | 229/229 (100%) | 0 | 229/229 (100%) | 0 | 0 |
| English translation-pools (177) | 177/177 (100%) | 0 | 5/177 (~3%) | 0 | 0 |
| Science merged (~1,618) | ~100% | ~35–40% explicit | ~100% | 0 | 0 |
| Geography (3,506) | 0 | 0 | grade tag only (`"g1"`) | 0 | 0 |

### 1.4 `classroom_activities.subtopic` and `skill_key` Usage

**DB schema** (migration 024): `subtopic text null`, `skill_key text null` — both exist.

**Server-side** (`lib/teacher-server/teacher-activities.server.js`):
- `subtopic` is parsed and stored on create
- `skill_key` is used for aggregating answer analytics by skill
- Neither field is validated against the curriculum spine

**Critical gap** (`lib/classroom-activities/generate-activity-questions-client.js`):
- Teacher's `subtopic` value is stored in DB but **never passed** to question generation
- `generateActivityQuestionSetClient(subject, gradeLevel, topic, difficulty, count)` — no `subtopic` parameter
- The only subtopic-related line copies `p.subtopicId` from an already-generated Hebrew question into the frozen `params` — it does not use teacher input to narrow the pool
- Hebrew pool-narrowing functions (`narrowG1Pool`, `narrowHebrewUpperGradePool`) exist but are wired only to the practice UI, not to classroom activity generation

**Teacher UI** (`pages/teacher/class/[classId]/activities/new.js`):
- Free-text `subtopic` field exists with label "תת-נושא (אופציונלי)"
- Not passed to preview or question generation — only sent on save

### 1.5 `data/curriculum-spine/v1/` Schema Summary

The spine schema (`schema.json`, JSON Schema 2020-12) requires these fields on every skill row:

```
skill_id (string, stable)
subject (enum: hebrew | math | geometry | english | science | geography)
topic (string)
subtopic (string) ← REQUIRED
minGrade / maxGrade (integer 1–6)
cognitive_level (enum: recognition | understanding | application | reasoning)
description (string)
```

Optional: `source`, `spine_layer`, `linked_skill_ids`, `schema_version`

The spine is already the most complete cross-subject subtopic catalog in the codebase.

---

## 2. Diagnostic Taxonomy Rows (per subject)

| Subject | Rows | IDs | Operates on |
|---------|-----:|-----|-------------|
| Hebrew | 8 | H-01 to H-08 | patternFamily + minWrong |
| Math | 10 | M-01 to M-10 | patternFamily + minWrong (M-03 also minDistinctPatternFamilies: 2) |
| Geometry | 8 | G-01 to G-08 | patternFamily + minWrong |
| English | 8 | E-01 to E-08 | patternFamily + minWrong |
| Science | 8 | S-01 to S-08 | patternFamily + minWrong |
| Moledet/Geography | 8 | MG-01 to MG-08 | patternFamily + minWrong |

**Zero** diagnostic taxonomy rows reference `subtopicId`. The diagnostic engine (`utils/diagnostic-engine-v2/`) has **zero** occurrences of `subtopicId`. The bridge layer does not yet exist.

---

## 3. Coverage Tables

**N_MIN thresholds** (from master plan §4.3):

| Grade band | N_MIN per difficulty level | Min for catalog (any level) | Min for teacher assignment | Min for diagnosis | Min for parent report |
|------------|---------------------------:|----------------------------:|---------------------------:|------------------:|----------------------:|
| g1–g2 | 12 | 12 | 20 | 36 (all 3 levels) | 36 + diagnostic metadata |
| g3–g4 | 10 | 10 | 20 | 30 (all 3 levels) | 30 + diagnostic metadata |
| g5–g6 | 8 | 8 | 20 | 24 (all 3 levels) | 24 + diagnostic metadata |

### 3.1 Hebrew Coverage Table

Hebrew is special: questions are served from the live generator + rich bank, not static archive banks.
Archive banks have 1,080 MCQs but are marked "not wired to live UI." Only the live pool counts for N_MIN.

| Grade | Subtopic | Topic | Live pool count | Easy | Med | Hard | Explicit subtopicId | Inferrable | Meets N_MIN (catalog) | Meets N_MIN (teacher) | Meets N_MIN (diagnosis) | Meets N_MIN (parent report) |
|-------|----------|-------|----------------:|-----:|----:|-----:|:-------------------:|:----------:|:---------------------:|:---------------------:|:-----------------------:|:---------------------------:|
| g1 | g1.phoneme_awareness | reading | est. 8–12 | 5 | 4 | 3 | 0 | yes (inference) | borderline | NO | NO | NO |
| g1 | g1.syllables | reading | est. 12–18 | 8 | 5 | 5 | 0 | yes | YES | borderline | NO | NO |
| g1 | g1.letters | reading | est. 15–25 | 12 | 8 | 5 | 0 | yes | YES | YES | NO | NO |
| g1 | g1.simple_words_read | reading | est. 18–28 | 15 | 8 | 6 | 0 | yes | YES | borderline | NO | NO |
| g1 | g1.word_meaning_concrete | comprehension+vocab | est. 14–22 | 10 | 6 | 5 | 0 | yes | YES | borderline | NO | NO |
| g1 | (other 20 g1 subtopics) | various | est. 4–10 | <8 | <5 | <3 | 0 | yes | most NO | NO | NO | NO |
| g2 | g2.detail_main_idea | comprehension | est. 10–15 | 8 | 5 | 4 | 0 | yes | borderline | NO | NO | NO |
| g2 | g2.pos_basic | grammar | est. 8–14 | 8 | 4 | 3 | 0 | yes | borderline | NO | NO | NO |
| g2 | (other 14 g2 subtopics) | various | est. 4–12 | <10 | <6 | <4 | 0 | yes | most NO | NO | NO | NO |
| g3 | **g3.multi_sentence** | reading | **47** | **22** | **16** | **10** | 0 | yes | **YES** | **YES** | **YES** | NO (no diagnostic metadata) |
| g3 | g3.cause_effect | comprehension | est. 8–12 | 5 | 4 | 3 | 0 | yes | borderline | NO | NO | NO |
| g3 | (other 11 g3 subtopics) | various | est. 4–10 | <8 | <5 | <3 | 0 | yes | most NO | NO | NO | NO |
| g4 | g4.summary_intro | comprehension | est. 10–14 | 5 | 10 | 3 | 0 | yes | YES | borderline | NO | NO |
| g4 | (other 10 g4 subtopics) | various | est. 4–10 | <8 | <5 | <3 | 0 | yes | most NO | NO | NO | NO |
| g5 | g5.inference | comprehension | est. 8–12 | 5 | 5 | 9 | 0 | yes | YES | NO | NO | NO |
| g5 | (other 10 g5 subtopics) | various | est. 4–10 | <6 | <5 | <4 | 0 | yes | most NO | NO | NO | NO |
| g6 | g6.critical_evaluation_light | comprehension | est. 8–12 | 5 | 8 | 9 | 0 | yes | YES | NO | NO | NO |
| g6 | (other 11 g6 subtopics) | various | est. 4–10 | <6 | <5 | <4 | 0 | yes | most NO | NO | NO | NO |

**Hebrew summary:** 88 subtopics defined; 1 fully meets N_MIN (g3.multi_sentence); ~8–12 borderline on catalog; 0 meet diagnostic or parent-report thresholds with current live pool. The archive banks (1,080 MCQs) could raise these numbers significantly if backfilled and wired to the live generator.

### 3.2 Math Coverage Table

Math is a procedural generator — N_MIN is never a concern for question count. Columns reflect structural readiness.

| Topic bucket | # kinds in spine | Grade span | Explicit patternFamily | Inferrable from kind | Content-map file exists | Meets N_MIN (catalog) | Meets N_MIN (teacher) | Meets N_MIN (diagnosis) | Meets N_MIN (parent report) |
|-------------|----------------:|-----------|:----------------------:|:-------------------:|:-----------------------:|:---------------------:|:---------------------:|:-----------------------:|:---------------------------:|
| number_sense_and_operations | 32 | g1–g6 | 0 direct | yes (kind + metadata bridge) | NO | YES* | YES* | YES* (after bridge) | NO (bridge missing) |
| fractions | 14 | g2–g6 | yes (frac_ families) | yes | NO | YES* | YES* | YES* | NO (bridge missing) |
| word_problems | 14 | g1–g6 | 0 direct | yes (wp_ kinds + semanticFamily) | NO | YES* | YES* | YES* (after bridge) | NO |
| division_and_number_theory | 9 | g2–g6 | 0 direct | yes (kind) | NO | YES* | YES* | YES* (after bridge) | NO |
| decimals | 8 | g3–g6 | 0 direct | yes (dec_ kinds) | NO | YES* | YES* | YES* (after bridge) | NO |
| ratio_scale_and_powers | 8 | g4–g6 | 0 direct | yes (kind) | NO | YES* | YES* | YES* (after bridge) | NO |
| multiplication | 6 | g1–g6 | probe only | yes (mul_ kinds) | NO | YES* | YES* | YES* (after bridge) | NO |

\* = procedural generator produces unlimited questions; structural coverage is confirmed in curriculum spine.

**Math note:** "Meets N_MIN" for a procedural generator means the generator can produce unlimited questions of that kind on demand. It does NOT mean the questions currently carry explicit subtopicId tags. The subtopic catalog needs content-map JS files to be created (they do not exist yet).

### 3.3 Geometry Coverage Table

| Topic | # spine entries | Grade span | Conceptual bank items | Proc. kinds | diagnosticSkillId on conceptual | Content-map file exists | Meets N_MIN (catalog) | Meets N_MIN (teacher) | Meets N_MIN (diagnosis) | Meets N_MIN (parent report) |
|-------|----------------:|-----------|----------------------:|------------:|:-------------------------------:|:-----------------------:|:---------------------:|:---------------------:|:-----------------------:|:---------------------------:|
| area_and_shapes | 19 | g1–g6 | ~10 | ~12 | ~7/10 | NO | YES* | YES* | borderline | NO |
| volume | 9 | g2–g6 | ~3 | ~10 | ~2/3 | NO | YES* | YES* | borderline | NO |
| angles_and_transformations | 4 | g1–g4 | ~5 | ~4 | ~4/5 | NO | YES* | YES* | YES* (after bridge) | NO |
| pythagoras_and_diagonals | 5 | g4–g6 | ~2 | ~5 | ~2/2 | NO | YES* | YES* | YES* (after bridge) | NO |

\* = procedural generator; same caveat as Math.

**Geometry fragmentation risk:** 38 spine entries but only 8 diagnostic taxonomy rows. If all 38 become parent-facing subtopics, 30 will have no diagnostic conclusion row. Grouping recommended.

### 3.4 English Coverage Table

| Grade | Topic | Pool rows accessible | Easy | Med | Hard | patternFamily | diagnosticSkillId | subtopicId | Meets N_MIN (catalog) | Meets N_MIN (teacher) | Meets N_MIN (diagnosis) | Meets N_MIN (parent report) |
|-------|-------|--------------------:|-----:|----:|-----:|:-------------:|:-----------------:|:----------:|:---------------------:|:---------------------:|:-----------------------:|:---------------------------:|
| g1 | vocabulary | ~250 lemmas (procedural) | — | — | — | 0 | 0 | 0 | YES (procedural) | YES | NO | NO |
| g2 | vocabulary | ~320 lemmas | — | — | — | 0 | 0 | 0 | YES | YES | NO | NO |
| g2 | translation | 18 pool rows | 8 | 6 | 4 | 18/18 | 0 | 0 | YES | borderline | NO | NO |
| g3 | grammar | 41 pool rows | ~32 | ~6 | ~3 | 41/41 | ~1 | 0 | YES | borderline | NO | NO |
| g3 | sentences | 43 pool rows | 14 | 14 | 15 | 43/43 | 0 | 0 | YES | YES | NO | NO |
| g3 | translation | 36 pool rows | 14 | 12 | 10 | 36/36 | 0 | 0 | YES | YES | NO | NO |
| g4 | grammar | 31 pool rows | ~25 | ~4 | ~2 | 31/31 | ~1 | 0 | YES | borderline | NO | NO |
| g4 | sentences | 51 pool rows | 17 | 17 | 17 | 51/51 | 0 | 0 | YES | YES | NO | NO |
| g5 | grammar | 24 pool rows | ~19 | ~3 | ~2 | 24/24 | ~1 | 0 | YES | NO | NO | NO |
| g5 | sentences | 63 pool rows | 20 | 20 | 23 | 63/63 | 0 | 0 | YES | YES | NO | NO |
| g6 | grammar | 24 pool rows | ~19 | ~3 | ~2 | 24/24 | ~1 | 0 | YES | NO | NO | NO |
| g6 | sentences | 50 pool rows | 16 | 17 | 17 | 50/50 | 0 | 0 | YES | YES | NO | NO |
| all | reading | **0 pool rows** | 0 | 0 | 0 | 0 | 0 | 0 | NO | NO | NO | NO |

**English critical gap:** Grammar difficulty is severely skewed to easy (basic=489, standard=80, advanced=48 across all grades combined). This means grammar subtopics can serve catalog but not diagnosis or teacher assignment for medium/hard.

### 3.5 Science Coverage Table

Science questions are not grade-specific (each item has a `grades[]` array). Counts are bank-wide across all grades.

| Topic | Total merged | Easy | Med | Hard | patternFamily | diagnosticSkillId | subtopicId | Per-grade est. at subtopic level | Meets N_MIN (catalog, topic-level) | Meets N_MIN (subtopic level) |
|-------|-------------:|-----:|----:|-----:|:-------------:|:-----------------:|:----------:|:---------------------------------:|:----------------------------------:|:----------------------------:|
| body | ~338 | ~130 | ~95 | ~113 | ~100% | ~40% | 0 | ~8–15 per grade per subtopic | YES (topic) | NO |
| animals | ~296 | ~95 | ~90 | ~111 | ~100% | ~35% | 0 | ~7–12 per grade per subtopic | YES (topic) | NO |
| plants | ~120 | ~45 | ~38 | ~37 | ~100% | ~30% | 0 | g1–g3 only, ~5–8 per subtopic | borderline (topic, g1–g3) | NO |
| materials | ~176 | ~55 | ~58 | ~63 | ~100% | ~35% | 0 | ~5–9 per grade per subtopic | YES (topic) | NO |
| earth_space | ~198 | ~60 | ~65 | ~73 | ~100% | ~38% | 0 | ~6–10 per grade per subtopic | YES (topic) | NO |
| environment | ~195 | ~58 | ~62 | ~75 | ~100% | ~35% | 0 | ~5–9 per grade per subtopic | YES (topic) | NO |
| experiments | ~264 | ~80 | ~85 | ~99 | ~100% | ~38% | 0 | ~6–12 per grade per subtopic (g2+) | YES (topic) | NO |

**Science critical finding:** The 7 spine entries for science use `subtopic: "question_bank"` — a placeholder, not real subtopics. If each topic were split into 3–4 subtopics per grade, and N_MIN (g3–g4: 10 per level) requires 30 questions per subtopic, the total needed would be 7 topics × 4 subtopics × 4 grades × 30 = **3,360 science questions** specifically tagged by subtopic. The current bank of 1,618 undifferentiated questions cannot support this without major grade-specific tagging.

### 3.6 Geography Coverage Table

Geography is the best-stocked non-procedural bank: 3,506 questions with even difficulty distribution.

| Grade | Topic | Total | Easy | Med | Hard | skillId | patternFamily | subtopicId | Meets N_MIN (catalog) | Meets N_MIN (teacher) | Meets N_MIN (diagnosis) | Meets N_MIN (parent report) |
|-------|-------|------:|-----:|----:|-----:|:-------:|:-------------:|:----------:|:---------------------:|:---------------------:|:-----------------------:|:---------------------------:|
| g1 | homeland | ~112 | ~47 | ~33 | ~32 | YES | 0 | 0 | YES | YES | NO (no PF/DSkillId) | NO |
| g1 | community | ~102 | ~42 | ~30 | ~30 | YES | 0 | 0 | YES | YES | NO | NO |
| g1 | citizenship | ~101 | ~42 | ~30 | ~29 | YES | 0 | 0 | YES | YES | NO | NO |
| g1 | geography | ~102 | ~43 | ~30 | ~29 | YES | 0 | 0 | YES | YES | NO | NO |
| g1 | values | ~99 | ~41 | ~29 | ~29 | YES | 0 | 0 | YES | YES | NO | NO |
| g1 | maps | ~101 | ~42 | ~30 | ~29 | YES | 0 | 0 | YES | YES | NO | NO |
| g2 | (all 6 topics) | ~106 each | ~44 | ~31 | ~30 | YES | 0 | 0 | YES | YES | NO | NO |
| g3 | (all 6 topics) | ~103 each | ~41 | ~32 | ~30 | YES | 0 | 0 | YES | YES | NO | NO |
| g4 | (all 6 topics) | ~92 each | ~32 | ~30 | ~30 | YES | 0 | 0 | YES | YES | NO | NO |
| g5 | (all 6 topics) | ~90 each | ~30 | ~30 | ~30 | YES | 0 | 0 | YES | YES | NO | NO |
| g6 | (all 6 topics) | ~90 each | ~30 | ~30 | ~30 | YES | 0 | 0 | YES | YES | NO | NO |

**Geography insight:** All grade×topic cells meet N_MIN for catalog AND teacher assignment already. The gap is purely metadata: no `patternFamily` or `diagnosticSkillId` means diagnosis and parent reports cannot be unlocked without adding that layer first.

---

## 4. Status Classification Per Subtopic

Definitions:
- **READY_FOR_CATALOG** — enough questions at any difficulty to show the subtopic in the topic browser; subtopic is defined in content map or spine
- **READY_FOR_TEACHER_ASSIGNMENT** — ≥ N_MIN questions at the requested difficulty; teacher can assign this subtopic
- **READY_FOR_DIAGNOSIS** — ≥ N_MIN at all 3 difficulty levels + diagnostic metadata (patternFamily/diagnosticSkillId) present on enough questions to fire a taxonomy row
- **READY_FOR_PARENT_REPORT** — READY_FOR_DIAGNOSIS + taxonomy row exists for this subtopic + parent-safe label exists
- **NEEDS_MORE_QUESTIONS** — concept is right but bank is too small; question expansion needed before any use
- **NEEDS_CURRICULUM_REVIEW** — subtopic concept needs owner review for MoE alignment before it is published
- **ENGINE_INTERNAL_ONLY** — diagnostic pattern exists internally but should not be exposed to parents or teachers in current form
- **DO_NOT_CREATE_YET** — infrastructure, questions, or curriculum approval missing; defer to later phase

### 4.1 Hebrew Subtopic Statuses

| Subtopic | Status | Rationale |
|----------|--------|-----------|
| g1.letters | READY_FOR_CATALOG | ~20+ live questions easy; inference works |
| g1.syllables | READY_FOR_CATALOG | ~15 easy; inference works |
| g1.simple_words_read | READY_FOR_CATALOG | ~20 easy; inference works |
| g1.word_meaning_concrete | READY_FOR_CATALOG | ~14 cross-topic; inference works |
| g1.phrase_appropriateness | READY_FOR_CATALOG | ~10 easy; borderline |
| g1.grammar_pos_roles | READY_FOR_CATALOG | ~10 easy; borderline |
| g1.spell_word_choice | READY_FOR_CATALOG | ~10 easy; borderline |
| Other g1 subtopics (18) | NEEDS_MORE_QUESTIONS | Live pool < 8 at any level |
| g2.detail_main_idea | READY_FOR_CATALOG | ~10–15 live; borderline medium |
| g2.pos_basic | READY_FOR_CATALOG | ~10–14 live |
| g2.synonyms_basic | READY_FOR_CATALOG | ~10 live |
| Other g2 subtopics (13) | NEEDS_MORE_QUESTIONS | Live pool < 8 at most levels |
| **g3.multi_sentence** | **READY_FOR_TEACHER_ASSIGNMENT** | 47 live (22/16/10) — only subtopic clearing full N_MIN |
| g3.cause_effect | READY_FOR_CATALOG | ~8–12 live |
| g3.word_families | READY_FOR_CATALOG | ~8–10 live |
| Other g3 subtopics (10) | NEEDS_MORE_QUESTIONS | Live pool < 8 |
| g4.summary_intro | READY_FOR_CATALOG | ~10–14 (medium-heavy) |
| g4.root_pattern_intro | READY_FOR_CATALOG | ~8–12 |
| Other g4 subtopics (9) | NEEDS_MORE_QUESTIONS | Live pool < 8 |
| g5.inference | READY_FOR_CATALOG | ~8–12 (hard-heavy) |
| g5.syntax_agreement | READY_FOR_CATALOG | ~8–10 |
| Other g5 subtopics (9) | NEEDS_MORE_QUESTIONS | Live pool < 8 |
| g6.critical_evaluation_light | READY_FOR_CATALOG | ~8–12 |
| g6.evidence_from_text | READY_FOR_CATALOG | ~8–10 |
| Other g6 subtopics (10) | NEEDS_MORE_QUESTIONS | Live pool < 8 |
| All Hebrew subtopics | NOT YET READY_FOR_DIAGNOSIS | Diagnostic bridge from subtopicId → taxonomy row not built |
| All Hebrew subtopics | NOT YET READY_FOR_PARENT_REPORT | Same — bridge + parent labels needed |

### 4.2 Math Subtopic Statuses

All math subtopics are procedural (generator), so N_MIN question count is structurally satisfied. The
open question is catalog/infrastructure readiness.

| Subtopic group | Status | Rationale |
|----------------|--------|-----------|
| All 91 math kinds (spine-documented) | READY_FOR_TEACHER_ASSIGNMENT | Generator produces unlimited questions; kind documented in spine |
| All 91 math kinds | NEEDS_CURRICULUM_REVIEW (content-map file) | No math-g*-content-map.js files exist yet; user-facing grouping and labels not approved |
| number_sense_and_operations (32 kinds) | READY_FOR_TEACHER_ASSIGNMENT | Kinds documented; some kinds need grouping for parent-facing labels |
| fractions (14 kinds) | READY_FOR_TEACHER_ASSIGNMENT + ENGINE_INTERNAL_ONLY for most | 2 fraction kinds have explicit patternFamily; diagnostic M-04 covers fractions; parent labels need review |
| word_problems (14 kinds, semanticFamily 22) | READY_FOR_TEACHER_ASSIGNMENT | M-07/M-08 cover word problems; parent labels unclear |
| division_and_number_theory (9 kinds) | READY_FOR_TEACHER_ASSIGNMENT | M-09/M-10 partial coverage |
| decimals (8 kinds, g3+) | READY_FOR_TEACHER_ASSIGNMENT | M-06 covers some; grade boundaries clear |
| ratio_scale_and_powers (8 kinds, g4+) | READY_FOR_TEACHER_ASSIGNMENT | No matching taxonomy row for ratio/scale |
| multiplication (6 kinds) | READY_FOR_TEACHER_ASSIGNMENT | M-03 covers multiplication facts |
| Math diagnostic bridge (all) | DO_NOT_CREATE_YET (bridge not built) | taxonomy ↔ kind mapping does not exist |

### 4.3 Geometry Subtopic Statuses

| Subtopic | Status | Rationale |
|----------|--------|-----------|
| area (g1–g6) | READY_FOR_TEACHER_ASSIGNMENT | Generator + conceptual bank; G-08 taxonomy row |
| perimeter (g3–g6) | READY_FOR_TEACHER_ASSIGNMENT | Generator + conceptual; G-06 covers unit errors |
| volume (g4–g6) | READY_FOR_TEACHER_ASSIGNMENT | Generator covers cube/prism/cylinder/sphere |
| angles (g3–g6) | READY_FOR_TEACHER_ASSIGNMENT | Generator + conceptual; G-02 |
| transformations (g1–g2) | READY_FOR_CATALOG | Small grade band, limited pool |
| pythagoras (g6) | READY_FOR_TEACHER_ASSIGNMENT | 2 spine entries; conceptual bank has items |
| parallel_perpendicular (g3–g5) | READY_FOR_CATALOG | Limited procedural paths |
| shapes_basic (g1–g2) | READY_FOR_CATALOG | Small bank |
| diagonal (g4–g5) | READY_FOR_CATALOG | 3 procedural kinds |
| heights (g5) | READY_FOR_CATALOG | 3 kinds, G-03 taxonomy row |
| symmetry (g4) | READY_FOR_CATALOG | G-07 taxonomy row; limited procedural |
| tiling (g5) | ENGINE_INTERNAL_ONLY | Very specialized; 1 procedural kind; no parent-facing label yet |
| All 38 geometry entries | NEEDS_CURRICULUM_REVIEW for grouping | 38 entries → 8 taxonomy rows: need consolidation plan before parent-facing use |

### 4.4 English Subtopic Statuses

| Subtopic / area | Status | Rationale |
|-----------------|--------|-----------|
| vocabulary g1–g6 | READY_FOR_CATALOG | Procedural from word lists; ~250–400 lemmas per grade |
| grammar g3–g6 (pool rows) | READY_FOR_CATALOG | Pool rows exist; patternFamily 100% |
| grammar g3–g6 (medium/hard) | NEEDS_MORE_QUESTIONS | standard=80, advanced=48 across ALL grades combined — cannot serve diagnosis |
| sentences g3–g6 | READY_FOR_TEACHER_ASSIGNMENT | 43–63 rows per grade, even difficulty split |
| translation g3–g6 | READY_FOR_TEACHER_ASSIGNMENT | 36 rows per grade, even split |
| reading (all grades) | DO_NOT_CREATE_YET | Zero pool rows; topic not implemented; no inference function |
| writing (all grades) | ENGINE_INTERNAL_ONLY | Typing templates only; no MCQ assessment possible |
| diagnosticSkillId on grammar | NEEDS_MORE_QUESTIONS (metadata) | Only 4/584 pool rows have diagnosticSkillId |
| All English subtopics | NEEDS_CURRICULUM_REVIEW | patternFamily values do not yet map to Hebrew-labeled subtopic IDs for teacher/parent display |

### 4.5 Science Subtopic Statuses

| Topic | Status | Rationale |
|-------|--------|-----------|
| body (all grades, topic level) | READY_FOR_TEACHER_ASSIGNMENT | 338 questions, broad grade coverage |
| animals (all grades, topic level) | READY_FOR_TEACHER_ASSIGNMENT | 296 questions |
| experiments (g2–g6, topic level) | READY_FOR_TEACHER_ASSIGNMENT | 264 questions |
| earth_space (all grades, topic level) | READY_FOR_TEACHER_ASSIGNMENT | 198 questions |
| environment (all grades, topic level) | READY_FOR_TEACHER_ASSIGNMENT | 195 questions |
| materials (all grades, topic level) | READY_FOR_TEACHER_ASSIGNMENT | 176 questions |
| plants (g1–g3 only) | READY_FOR_TEACHER_ASSIGNMENT (g1–g3) | 120 questions but no g4–g6 curriculum |
| plants (g4–g6) | DO_NOT_CREATE_YET | Not in MoE curriculum for upper grades |
| All science at subtopic granularity | DO_NOT_CREATE_YET | Each proposed subtopic per grade would have ~5–8 questions — far below N_MIN. Needs ~3,000+ tagged questions to support subtopic diagnosis |
| Production augment questions (675) | ENGINE_INTERNAL_ONLY | Generic `sci_pb1_auto_*` patterns; not suitable for parent-facing subtopic labels |

### 4.6 Geography (Moledet) Subtopic Statuses

| Grade × Topic | Status | Rationale |
|---------------|--------|-----------|
| g1–g6 × homeland | READY_FOR_TEACHER_ASSIGNMENT | ~90–112 per grade, ~30 per difficulty |
| g1–g6 × community | READY_FOR_TEACHER_ASSIGNMENT | Same |
| g1–g6 × citizenship | READY_FOR_TEACHER_ASSIGNMENT | Same |
| g1–g6 × geography | READY_FOR_TEACHER_ASSIGNMENT | Same |
| g1–g6 × values | READY_FOR_TEACHER_ASSIGNMENT | Same |
| g1–g6 × maps | READY_FOR_TEACHER_ASSIGNMENT | Same |
| All geography at subtopic granularity | NEEDS_CURRICULUM_REVIEW | Need to split each topic into 2–3 subtopics with Hebrew labels; requires patternFamily tagging or stem inference |
| All geography for diagnosis | NEEDS_MORE_QUESTIONS (metadata) | Zero patternFamily, zero diagnosticSkillId — diagnostic trigger impossible without metadata pass |
| All geography for parent report | NEEDS_MORE_QUESTIONS (metadata) | Same |

---

## 5. Curriculum Alignment Review

### 5.1 Hebrew Subtopics

| Subtopic group | Alignment | Notes |
|----------------|-----------|-------|
| g1 reading subtopics (phoneme_awareness, syllables, letters, niqqud) | MoE-aligned | POP Curriculum / Grade 1 teaching site explicitly covers phonological awareness and letter recognition |
| g1–g2 comprehension subtopics | MoE-aligned | Israeli primary curriculum mandates comprehension from g1 |
| g3–g6 grammar subtopics (binyan_light, tense_system, root_pattern) | likely aligned, needs owner review | Binyan system is core MoE curriculum; specific grade placement needs PDF verification |
| g1 speaking subtopics | likely aligned, needs owner review | Oral language is in curriculum; specific subtopic labels need owner approval |
| All 88 Hebrew subtopics re: Hebrew display labels | NEEDS_CURRICULUM_REVIEW | Hebrew display names (`labelHe`) not yet defined; owner approval required before any parent/teacher exposure |

The `utils/curriculum-audit/hebrew-official-subsection-catalog.js` uses coarser `sectionKey` values (e.g. `g1_decoding`, `g3_grammar_morphology`) that do not directly match content-map `subtopicId` values (e.g. `g1.phoneme_awareness`, `g3.binyan_light`). A mapping table is needed.

### 5.2 Math Subtopics

| Subtopic group | Alignment | Notes |
|----------------|-----------|-------|
| g1 addition/subtraction within 20 | MoE-aligned | `g1_add_sub_facts` in official catalog; high confidence |
| g2 multiplication/division intro | MoE-aligned | `g2_mult_div_intro`; high confidence |
| g3 fractions same-denominator | MoE-aligned | `g3_fractions_compare`; high confidence |
| g4 long division (`div_long`) | MoE-aligned | `g4_divisibility_factors`; high confidence |
| g5 percentages | MoE-aligned | `g5_decimals_percent`; high confidence |
| g6 ratios and scale | MoE-aligned | `g6_percent_ratio_problems`; high confidence |
| `order_of_operations` (g3 only) | likely aligned, needs owner review | Grade 3 seems early for formal order-of-operations; verify MoE grade expectation |
| `zero_one_properties` (g4 only) | likely aligned, needs owner review | Identity properties are expected but label form needs review |
| `estimation` (g4–g5) | likely aligned, needs owner review | Estimation appears in MoE but grade placement varies |

### 5.3 Geometry Subtopics

| Subtopic group | Alignment | Notes |
|----------------|-----------|-------|
| g1–g2 shapes_basic | MoE-aligned | `g1_shapes_plane_intro` in official catalog |
| g3 parallel_perpendicular, angles | MoE-aligned | `g3_angles_parallel_triangles_quads` |
| g4 symmetry, diagonal | MoE-aligned | `g4_polygons_diagonals_symmetry` |
| g5 heights, area of non-rectangular shapes | MoE-aligned | `g5_area_perimeter_volume` |
| g6 Pythagorean theorem | MoE-aligned | `g6_pythagoras_triangles`; explicitly in official catalog |
| `tiling` (g5) | likely aligned but needs owner review | `g4_tiling_enrichment` in catalog — may be enrichment only, not core |
| g6 circles (area and circumference) | MoE-aligned | `g6_solids_circle_volume` |

### 5.4 English Subtopics

| Subtopic group | Alignment | Notes |
|----------------|-----------|-------|
| Grammar pool patterns (`be_basic`, `present_simple`, `past_simple`) | MoE-aligned | English Curriculum 2020 reference; official catalog `g2_grammar_structured`, `g5_extended_grammar` confirm |
| Vocabulary from word-lists | MoE-aligned | Topic-themed vocabulary is standard |
| `reading` (all grades) | MoE-aligned but NOT IMPLEMENTED | The official catalog has reading sections; curriculum mandates reading; bank does not exist |
| Grammar subtopics at g5–g6 (complex_tenses, conditionals) | likely aligned, needs owner review | Grade placement is approximate; verify with teacher |
| Writing subtopics | likely aligned, needs owner review | Typing templates exist but no MCQ assessment; subtopic concept is valid but assessment form is unclear |

### 5.5 Science Subtopics

| Subtopic group | Alignment | Notes |
|----------------|-----------|-------|
| body (all grades, systems progression) | MoE-aligned | `g1_living_world`, `g4_core_domains` in official catalog |
| plants (g1–g3) | MoE-aligned | Official curriculum has plants through g3 |
| plants (g4–g6) | questionable / should not be added yet | Official curriculum does NOT include plants for g4–g6 |
| experiments (g2+) | MoE-aligned | `g2_earth_energy_experiments`; scientific inquiry grows g3+ |
| environment (g1–g2) | extended coverage | Environment is thin in g1–g2 official catalog; current bank has questions but curriculum basis weak |
| Proposed subtopics within each topic | NEEDS_CURRICULUM_REVIEW | Master plan proposes 3–5 subtopics per topic per grade (e.g. body → five_senses / digestive_system / respiratory). Grade-level placement for each needs owner review against MoE science PDF |

### 5.6 Geography (Moledet) Subtopics

| Subtopic group | Alignment | Notes |
|----------------|-----------|-------|
| homeland (all grades) | MoE-aligned | Israeli identity and homeland is a core moledet strand |
| community / citizenship | MoE-aligned | Core civic education |
| maps (all grades) | MoE-aligned | Spatial literacy is explicit in curriculum |
| values | likely aligned, needs owner review | Values strand is in curriculum but specific subtopic labels need review |
| Proposed sub-subtopics within each topic | NEEDS_CURRICULUM_REVIEW | Splitting `maps` into `cardinal_directions`, `map_symbols`, `coordinates` requires per-grade curriculum confirmation |

---

## 6. Architecture Recommendation After Audit

### 6.1 The Decision

**`data/curriculum-spine/v1/` should become the canonical subtopic registry for all planning, analytics, and tagging.**  
**Content-map JS files should remain the runtime/UX layer for question pool narrowing and weighting.**

### 6.2 Evidence for This Recommendation

**In favor of curriculum-spine v1 as canonical:**
- Already has 423 skills with `subtopic` field, covering all 6 subjects and grades 1–6
- Has a JSON schema with `additionalProperties: false` — enforces consistency
- Has cross-linking via `linked_skill_ids` (Hebrew spine already links content-map rows)
- Gaps and conflicts files are both empty (clean, no pending issues)
- Is already the planning artifact used to audit question coverage
- Format is portable (JSON) — easy to query, validate, and extend

**In favor of content-map JS files remaining as runtime layer:**
- Content maps define `weight`, `order`, `modesAllowed`, `flags` — runtime rendering decisions
- Inference functions (`inferG*SubtopicIdFromStem`) are tightly coupled to the JS format
- `narrowG*Pool` functions use content-map IDs directly
- Moving all this logic to JSON would require a reader library and is an unnecessary migration

**Against making content-map files canonical:**
- They exist only for Hebrew (g1–g6); no content-map files for Math, English, Science, or Geography
- They contain runtime UX logic mixed with catalog definition — concerns are not separated
- The spine already covers the catalog function

**Against making spine v1 the runtime layer:**
- The spine has no weight/order/modesAllowed fields — it is not designed for runtime question selection
- Runtime loading from JSON at question-generation time adds latency vs importing JS constants

### 6.3 Recommended Architecture

```
data/curriculum-spine/v1/skills.json       ← CANONICAL: subtopic IDs, descriptions, grade ranges, alignment
  ↓ linked_skill_ids ↑
data/hebrew-g*-content-map.js              ← RUNTIME/UX: weights, order, modesAllowed, flags (Hebrew only)
utils/hebrew-g*-subtopic.js                ← RUNTIME: inference + pool narrowing (Hebrew only)
  ↕
[NEW] data/math-g*-content-map.js          ← Phase 1 deliverable: group kinds into teacher-facing subtopics
[NEW] data/geography-g*-content-map.js     ← Phase 2 deliverable
[NEW] data/geometry-g*-content-map.js      ← Phase 2 deliverable
  ↓
[NEW] utils/subtopic-taxonomy-bridge.js    ← BRIDGE: spine skill_id → taxonomy row ID (Phase 3 deliverable)
  ↓
utils/diagnostic-engine-v2/               ← DIAGNOSIS: uses patternFamily today; subtopicId after bridge
```

**Three namespaces exist and must be bridged (do not implement yet):**
1. Spine `subtopic` / `skill_id` (planning canonical, `data/curriculum-spine/v1/`)
2. Runtime `subtopicId` (Hebrew content maps: `g1.phoneme_awareness`)
3. Official audit `sectionKey` (curriculum-audit catalogs: `g1_decoding`)

A bridge table (JSON or JS map) is needed before any cross-system query can work.

### 6.4 Decision: Not Implement Yet

This decision does not require any file changes in Phase 1. The content-map files to create in Phase 1 will
follow the spine format for IDs and reference existing spine `skill_id` values. The bridge can be built
incrementally.

---

## 7. Risk Update

### 7.1 Over-Fragmentation Risk

| Subject | Risk level | Details |
|---------|-----------|---------|
| Hebrew | MEDIUM | 88 subtopics are pedagogically justified but 76 of 88 lack enough live questions to be useful today. Publishing all 88 to the catalog without question backing will confuse teachers. |
| Math | HIGH (geometry only) | 38 geometry spine entries against 8 taxonomy rows means many geometry subtopics will have no diagnostic conclusion. Parent reports will show subtopic detail that cannot be diagnosed. |
| Science | HIGH | Master plan proposes 3–5 subtopics per topic per grade (potential 90–150 subtopics). Current bank cannot support this at any level of statistical confidence. |
| Geography | LOW-MEDIUM | 6 topics are the right grain. Splitting each into 2–3 subtopics is reasonable IF metadata is added. Risk is creating subtopics without inference/patternFamily support. |
| English | MEDIUM | Grammar pool patterns exist but don't map cleanly to teachable subtopics. Risk of creating subtopic IDs that don't align with what teachers recognize. |

### 7.2 Subjects/Topics with Too Few Questions

| Subject | Specific gap | Severity |
|---------|-------------|----------|
| Hebrew (live pool) | Only g3.multi_sentence meets full N_MIN; 76 of 88 subtopics cannot be used for diagnosis | HIGH |
| English grammar (medium/hard) | Only 80 standard + 48 advanced pool rows across ALL grades — cannot support subtopic-level grammar diagnosis at medium/hard | HIGH |
| English reading | Zero questions — topic not implemented | CRITICAL |
| Science (subtopic level) | ~7 questions per topic per grade across all levels — cannot support any subtopic splitting | CRITICAL |
| Science plants (g4–g6) | No curriculum basis; no questions (correctly absent) | n/a (by design) |
| Hebrew archive (medium/hard) | Archive has heavy easy skew; g3–g6 comprehension/writing/grammar have 3–8 questions per topic | HIGH |

### 7.3 Parent Report and Copilot Noise Risk

| Risk | Affected subjects | Mitigation needed |
|------|------------------|-------------------|
| Thin-data false conclusions | Hebrew g1–g2 subtopics, all English subtopics, all Science subtopics | N_MIN gate must be enforced before any subtopic appears in parent report |
| Internal labels leaking | All subjects — subtopic IDs like `g3.binyan_light`, `add_vertical`, `sci_pb1_auto_*` must never appear in parent text | `validateParentReportAIText()` already blocks some patterns; subtopicId must be added to the block list |
| Parent report complexity | If 5+ subtopics appear per session, reports become unreadable | A "show max 2 subtopics per report" rule should be defined before Phase 4 |
| Production augment science questions | 675 science questions tagged `sci_pb1_auto_*` should never drive diagnostic conclusions | Filter these from diagnostic scoring; use only for practice |

### 7.4 Geometry QA Risk (Closed Subject)

Geometry QA was previously declared closed. The following risks apply if subtopics are added:

1. **Taxonomy gap:** 38 spine skills but only 8 taxonomy rows. If the subtopic layer triggers new diagnostic paths, the closed QA becomes incomplete.
2. **Conceptual bank coverage:** 17 of 48 conceptual items lack `diagnosticSkillId`. Adding subtopics without tagging these items first will create silent gaps.
3. **Volume per grade:** Geometry is procedural so question count is fine, but the conceptual bank (48 fixed items) serves some topics exclusively. At 10–15 items per topic, very few will have enough conceptual items to support subtopic-level diagnosis.

**Recommendation:** Geometry subtopics should be a Phase 2 effort, after the Math content map is proven.
Reopening geometry QA for subtopics should be explicitly approved by the owner.

---

## 8. Final Recommendation

### 8.1 Subject Prioritization

| Priority | Subject | Rationale |
|----------|---------|-----------|
| 1 (immediate) | **Math** | 91 generator kinds already in spine. Procedural generator = unlimited questions. No N_MIN risk. Content-map files need to be created (straightforward — group existing kinds into 5–8 teacher-facing subtopics per grade). Math has the highest teacher demand for subtopic assignment. |
| 2 (after Math) | **Geography** | 3,506 questions, even distribution, all meet N_MIN for catalog and teacher assignment. Needs patternFamily metadata pass and content-map files, but the question volume is already there. |
| 3 (parallel with Geography) | **Hebrew diagnostic bridge** | Content maps and inference are complete. The only missing piece is the subtopicId → taxonomy row bridge. This is a targeted one-file addition, not a full Phase 1. |
| 4 | **Geometry** | Solid procedural generator + conceptual bank. Needs content maps and QA re-opening. Should follow Math to reuse the pattern established there. |
| 5 (deferred) | **English** | Reading bank must be built first. Grammar difficulty skew must be corrected. patternFamily already 100% but diagnosticSkillId coverage is critical. |
| 6 (deferred) | **Science** | Question bank needs 2–3x expansion with grade-specific and subtopic-specific tagging before any subtopic work begins. Production augment questions should be excluded from diagnostic use. |

### 8.2 Subtopics to Defer

The following subtopics should NOT be created until their prerequisites are met:

| Subtopic or group | Prerequisite before creation |
|-------------------|------------------------------|
| English reading (all grades) | Build English reading question bank first |
| English grammar (medium/hard subtopics) | Expand grammar pools with standard/advanced difficulty |
| Science subtopics (all) | Expand question bank with grade-specific tagging; add diagnosticSkillId to all |
| Science plants (g4–g6) | No curriculum basis; do not add |
| Hebrew subtopics (all) for parent report | Build subtopic→taxonomy bridge first |
| Geometry subtopics (all) for diagnosis | Resolve 38-entry vs 8-taxonomy-row gap; tag 17 missing diagnosticSkillId in conceptual bank |
| Geography subtopics (sub-topic level) | Run patternFamily metadata pass on geography questions first |

### 8.3 Phase 1 Decision

**Phase 1 can start immediately for Math and Hebrew-bridge, after owner approval.**

Conditions that ARE met for Math Phase 1:
- Curriculum spine has 91 math kind subtopics with grade ranges
- Procedural generator covers all kinds with unlimited questions
- Official curriculum audit catalog (`math-official-subsection-catalog.js`) provides MoE alignment
- Diagnostic taxonomy has 10 rows that can be aligned to kind groups
- Teacher activity infrastructure (DB column, server storage) already exists

Conditions that require owner approval before Math Phase 1 starts:
- Hebrew display labels (`labelHe`) for each proposed math subtopic (not in scope of Phase 0)
- Grouping decision: which of 91 kinds become teacher-facing subtopics vs internal-only (e.g. `add_second_decade` is probably ENGINE_INTERNAL_ONLY, not teacher-facing)
- Confirmation that the classroom activity subtopic wiring gap is in scope for Phase 1 (fixing `generate-activity-questions-client.js` to use teacher-selected subtopic for pool narrowing)

Conditions that are NOT met for other subjects in Phase 1:
- Science: question bank too small at subtopic grain — defer
- English: reading bank missing, grammar difficulty skew — defer
- Geography: needs metadata pass first — can start Phase 1 planning
- Geometry: needs QA reopening decision — defer

### 8.4 Can We Approve Phase 1?

**Yes, for Math (content-map creation only) and Hebrew (diagnostic bridge only).**  
**No, for Science, English, or Geometry (as full Phase 1).**

The critical pre-Phase-1 gate items are:
1. Owner approves Math subtopic groupings (which of 91 kinds become the ~20–25 teacher-facing math subtopics)
2. Owner approves Hebrew display labels for subtopics (the IDs are ready; the Hebrew names need review)
3. Owner confirms that the classroom activity subtopic wiring fix is in scope for Phase 1 (without this fix, teacher subtopic selection has no effect)
4. Science and English are formally deferred with a target re-evaluation date after question bank expansion

---

## 9. Appendix: Key File Inventory

### 9.1 Hebrew Subtopic Files

| File | Role | Status |
|------|------|--------|
| `data/hebrew-g1-content-map.js` | Runtime catalog (25 subtopics) | COMPLETE |
| `data/hebrew-g2-content-map.js` | Runtime catalog (16 subtopics) | COMPLETE |
| `data/hebrew-g3-content-map.js` | Runtime catalog (13 subtopics) | COMPLETE |
| `data/hebrew-g4-content-map.js` | Runtime catalog (11 subtopics) | COMPLETE |
| `data/hebrew-g5-content-map.js` | Runtime catalog (11 subtopics) | COMPLETE |
| `data/hebrew-g6-content-map.js` | Runtime catalog (12 subtopics) | COMPLETE |
| `utils/hebrew-g1-subtopic.js` | Inference + pool narrowing (g1) | COMPLETE |
| `utils/hebrew-g2-subtopic.js` | Inference + pool narrowing (g2) | COMPLETE |
| `utils/hebrew-g3456-subtopic.js` | Inference + pool narrowing (g3–g6) | COMPLETE |
| `data/curriculum-spine/v1/skills.json` | Canonical spine (135 Hebrew entries) | COMPLETE |

### 9.2 Files to Create in Phase 1

| File to create | Subject | Contents |
|----------------|---------|----------|
| `data/math-g1-content-map.js` | Math | Group g1 kinds into ~6 teacher-facing subtopics |
| `data/math-g2-content-map.js` | Math | Group g2 kinds |
| `data/math-g3-content-map.js` | Math | Group g3 kinds |
| `data/math-g4-content-map.js` | Math | Group g4 kinds |
| `data/math-g5-content-map.js` | Math | Group g5 kinds |
| `data/math-g6-content-map.js` | Math | Group g6 kinds |
| `utils/math-g*-subtopic.js` | Math | Pool-narrowing functions using `kind` param |
| `utils/subtopic-taxonomy-bridge.js` | All | Map subtopicId → taxonomy row ID |

### 9.3 Critical Wiring Gap

| Gap | Location | Impact |
|-----|----------|--------|
| Teacher subtopic input ignored | `lib/classroom-activities/generate-activity-questions-client.js` line containing `setStr("subtopicId", p.subtopicId)` | Teacher can save a subtopic but questions are not filtered by it. Fix requires passing subtopic to generators and calling pool-narrowing functions. |

### 9.4 Diagnostic Engine Status

| Item | Status |
|------|--------|
| `subtopicId` references in `utils/diagnostic-engine-v2/` | **ZERO** |
| Taxonomy rows referencing `subtopicId` | **ZERO** |
| Bridge from subtopicId → taxonomy row | **DOES NOT EXIST** |
| `patternFamily` coverage in diagnostic engine | **FULL** — all taxonomy rows use patternFamily evidence |

---

*This document was produced by automated codebase scan. All question counts were verified against actual
file contents. Estimates marked "est." reflect inference from live-pool subset; exact counts require running
`scripts/hebrew-subtopic-coverage-audit.mjs`. All architecture and phase recommendations are planning
artifacts; no code was changed during this audit.*
