# Question Metadata — Current Coverage Audit

**File:** `docs/diagnostics/QUESTION_METADATA_CURRENT_COVERAGE_AUDIT.md`  
**Date:** 2026-06-06  
**Status:** Q2-A — audit only (no product behavior change)  
**Companion:** `QUESTION_METADATA_CONTRACT.md`  
**Read-only script:** `scripts/tests/question-metadata-coverage-audit.mjs`

---

## Executive Summary

| Subject | Coverage depth | `skillId` reliability | `subSkill` reliability | Primary gap |
|---------|----------------|----------------------|------------------------|-------------|
| **Math** | **High** | Auto via `resolveMathSkillId` | `subskillId` / `params.subtype` | `problemClass`, `difficultyDepth` not canonical |
| **Geometry** | **High** | Bridge maps `params.kind` | `params.patternFamily`, `subtype` | Some procedural kinds unmapped |
| **Science** | **High** (static bank) | Bank `params.diagnosticSkillId` | `params.subtype`, `conceptTag` | No procedural generator |
| **English** | **High-bank** (Q2-C3) | 1189/1189 pool rows + generator attach | `params.canonicalMetadata` on all topics | Vocab procedural only at generation; translation poolKey sometimes general |
| **Hebrew** | **High-bank** (Q2-C4) | Rich pool 100% + generator attach | `params.canonicalMetadata` | Legacy inline pools use conservative `heb_*` fallbacks |
| **Moledet/Geography** | **High-bank** (Q2-C5) | 100% bank + generator + freeze params | `params.canonicalMetadata` preserved on freeze | Text-only banks; no map image assets yet |
| **Parent assigned** | **Medium** | `skill_key` when frozen | `subtopic` column + frozen | Depends on source generator |
| **Phase 8 engine** | **Answer-time** | Maps to `skillId` | `subtopic` only (not `subSkill`) | No `problemClass` / `difficultyDepth` |

**Bottom line:** Q2-C1–C5 population is complete for all six subjects. Q2-D validator gates coverage/quality before Q2-E consumption.

**Q2-D validator:** `node scripts/tests/question-metadata-validator.mjs` — see `QUESTION_METADATA_Q2_D_VALIDATOR.md`.

---

## 1. Audit Questions — Answers

### 1.1 Which fields already exist today?

| Contract field | Exists today? | Where |
|----------------|---------------|-------|
| `subject` | ✅ Always | Generators, frozen snapshots, `answer_payload` |
| `grade` | ✅ Usually | Session/master `gradeKey`; bank `grades[]`; frozen `grade` |
| `topic` | ✅ Always | Generators, activity definition, payloads |
| `skillId` | ⚠️ Partial | Math/geometry/science strong; hebrew/english sparse; engine maps at answer time |
| `subSkill` | ⚠️ Partial | As `subtype`, `subskillId`, `subtopicId`, `subtopic` — naming inconsistent |
| `questionType` | ⚠️ Partial | Phase 8: `mcq`/`numeric`/`open`/`audio`; not pedagogy enums |
| `problemClass` | ❌ | Not stored |
| `difficulty` | ✅ Partial | `difficulty`, `difficulty_level`, `params.difficulty` |
| `difficultyDepth` | ⚠️ Partial | `cognitiveLevel` (math/science), `difficultyBand` (hebrew) |
| `requiresVisual` | ⚠️ Implicit | `shape` field on geometry/moledet items |
| `requiresAudio` | ⚠️ Rare | `questionType: audio` only |
| `answerFormat` | ⚠️ Partial | Inferred from Phase 8 `questionType` |
| `metadataConfidence` | ✅ Answer-time | Phase 8 `minimal`/`partial`/`full`/`unknown` |
| `diagnosticEligibleByMetadata` | ❌ | Not computed (classification SSOT separate) |
| `possibleErrorPatterns` | ⚠️ Partial | `expectedErrorTags`, `distractorFamily`, `misconceptionTag` |
| `notes` | ⚠️ Rare | `explanationHe` on diagnostic contract rows |

### 1.2 Where are they created?

| Stage | Files | What is created |
|-------|-------|-----------------|
| **Math generation** | `utils/math-question-generator.js`, `utils/math-question-metadata.js` | `skillId`, `subskillId`, `params.diagnosticSkillId`, `params.kind`, `cognitiveLevel`, `expectedErrorTypes` |
| **Geometry generation** | `utils/geometry-question-generator.js`, `utils/geometry-diagnostic-metadata-bridge.js` | `params.kind`, `patternFamily`, `diagnosticSkillId`, `conceptTag`, `expectedErrorTags` |
| **Science bank** | `data/science-questions*.js` | Rich `params.*` on static rows |
| **English bank** | `data/english-questions/*.js`, `utils/english-question-generator.js` | `topic`, `params.patternFamily`, `params.subtype`; sparse `diagnosticSkillId` |
| **Hebrew bank/gen** | `utils/hebrew-question-generator.js`, `utils/hebrew-rich-question-bank.js`, `utils/hebrew-rich-diagnostic-metadata-enrich.js` | `subtopicId`, `patternFamily`, `subtype`; optional `diagnosticSkillId` |
| **Moledet/gen** | `utils/moledet-geography-question-generator.js`, `utils/moledet-geography-diagnostic-metadata-bridge.js`, `data/geography-questions/` | Topic-default skill ids; bank row overrides |
| **Activity freeze** | `lib/classroom-activities/assigned-activity-snapshot.server.js` | `subject`, `topic`, `subtopic`, `grade`, `difficulty`, `skill_key`, `params` (if present) |
| **Answer submit (free)** | Masters → `pages/api/learning/answer.js` | `questionEngine`, `evidenceCategory`, `isDiagnosticEligible`, `contextFlags` |
| **Answer submit (assigned)** | `lib/parent-server/parent-activity.server.js`, `lib/teacher-server/student-activity-play.server.js` | Merges frozen Q + `questionEngine` + classification into `question_snapshot` |

### 1.3 Where are they persisted?

| Store | Table / field | Contents |
|-------|---------------|----------|
| Free practice | `answers.answer_payload` JSONB | Full payload + nested `questionEngine` |
| Parent assigned | `parent_activity_attempts.question_snapshot` JSONB | Frozen question + engine + classification |
| Class / individual assigned | `student_activity_attempts.question_snapshot` JSONB | Same pattern |
| Activity definition | `parent_assigned_activities.question_set`, teacher activity `question_set` | Frozen normalized questions |
| Activity columns | `subject`, `topic`, `subtopic`, `skill_key`, `difficulty_level`, `mode` | Activity-level defaults |
| Reports | **Derived at read time** — no new metadata columns | `report-data-aggregate.server.js` reads payloads; `recentMistakes` extracts subset of `questionEngine` |

### 1.4 Which subjects/grades/topics have reliable `skillId`?

| Subject | Reliable? | Notes |
|---------|-----------|-------|
| Math | ✅ Yes | `math_${params.kind}` or explicit probe ids across operations |
| Geometry | ✅ Mostly | Bridge covers formula kinds; verify edge procedural kinds |
| Science | ✅ Yes | Bank rows carry `params.diagnosticSkillId` |
| English | ⚠️ Partial | Grammar pools have `patternFamily`; only 4 explicit `diagnosticSkillId` in grammar-pools |
| Hebrew | ⚠️ Weak | Enrichment pass exists (`hebrew-rich-diagnostic-metadata-enrich.js`) but not uniform on all pool rows |
| Moledet | ⚠️ Partial | Live generation: `moledet_geo_{topic}`; static bank: no `diagnosticSkillId` in files; frozen strips params |

### 1.5 Which areas only have subject/topic?

- Legacy assigned activities without `params` freeze
- Moledet frozen items (params often omitted after freeze normalization)
- English vocabulary/translation pools without Phase-B enrichment
- Hebrew items missing `diagnosticSkillId` on raw row (majority of procedural picks)
- Book practice questions (learning context — intentionally shallow for diagnosis)

### 1.6 Which fields can be derived safely now (no generator change)?

| Field | Safe derivation (Q2-B) | Source |
|-------|------------------------|--------|
| `answerFormat` | Map Phase 8 `questionType` | `question-engine-metadata.js` |
| `metadataConfidence` | Map `full`→`high`, `partial`→`medium`, etc. | Phase 8 engine |
| `requiresVisual` | `shape != null` or geometry topic | Frozen / generator output |
| `questionType` (pedagogy) | `params.kind` prefix rules (`wp_`→`word_problem`) | Math generator |
| `difficultyDepth` | Map `cognitiveLevel` / `difficultyBand` | Math/science/hebrew |
| `skillId` | `diagnosticSkillId` ?? `skill_key` ?? `math_${kind}` | Existing normalizers |
| `subSkill` | `subtype` ?? `subtopicId` ?? `subtopic` | Multiple legacy fields |
| `possibleErrorPatterns` | Union `expectedErrorTags` + `distractorFamily` | Diagnostic contract |
| `diagnosticEligibleByMetadata` | `skillId present && !learning-only kind` | **Hint only** — must not override classification |

### 1.7 Which fields require generator changes later (Q2-C)?

| Field | Why generator change needed |
|-------|----------------------------|
| `problemClass` | No field exists; needs explicit tagging or kind taxonomy |
| `skillId` (hebrew/english) | Needs bank enrichment or auto-id rules per subtopic |
| `subSkill` (uniform) | Needs consistent `subtype` on all pool rows |
| `questionType` (pedagogy) | English/hebrew/moledet need explicit tags beyond MCQ detection |
| `difficultyDepth` | English/moledet lack `cognitiveLevel` |
| `requiresAudio` | Only meaningful when audio items exist with explicit flag |
| `notes` | Maintainer rationale not systematically captured |

### 1.8 Which fields should remain optional until Q2-B/C/D?

| Field | Until |
|-------|-------|
| `problemClass` | Q2-C tagging |
| `difficultyDepth` | Q2-B normalize + Q2-C populate |
| `requiresVisual`, `requiresAudio` | Q2-B derive; Q2-C explicit tags |
| `diagnosticEligibleByMetadata` | Q2-B compute for QA only |
| `subSkill` in evidence quality | **Q2-E** (owner approval) |
| `notes` | Optional indefinitely |

---

## 2. Subject-by-Subject Detail

### 2.1 Math

**Generator / master paths:**
- `utils/math-question-generator.js`
- `utils/math-question-metadata.js` — `attachProfessionalMathMetadata`
- `pages/learning/math-master.js`
- `lib/classroom-activities/generate-activity-questions-client.js` (math branch)

**Fields at generation:**

| Field | Status |
|-------|--------|
| `subject` | `math` |
| `topic` | `selectedOp` / operation |
| `skillId` | Auto `math_${kind}` |
| `subSkill` | `subskillId`, `params.subtype`, `params.patternFamily` |
| `difficulty` | `mapMathLevelKeyToDifficulty` |
| `difficultyDepth` | Via `cognitiveLevel` (`recall`/`understanding`/`application`/`analysis`) — map in Q2-B |
| `questionType` | Derive: `wp_*`→`word_problem`, default `technical` |
| `possibleErrorPatterns` | `expectedErrorTypes`, `expectedErrorTags` |
| `problemClass` | Missing — infer procedural for `kind`, conceptual for probes (Q2-B tentative) |

**Persistence:** `answers.answer_payload` via master → `/api/learning/answer`; assigned via freeze `params` + attempt snapshot.

**Coverage rating:** ⭐⭐⭐⭐⭐ — best candidate for Q2-C pilot.

---

### 2.2 Geometry

**Paths:**
- `utils/geometry-question-generator.js`
- `utils/geometry-diagnostic-metadata-bridge.js` (~87 kind mappings)
- `pages/learning/geometry-master.js`

**Fields at generation:**

| Field | Status |
|-------|--------|
| `topic` | `selectedTopic` (area, perimeter, pythagoras, …) |
| `skillId` | Bridge `diagnosticSkillId` per `params.kind` |
| `subSkill` | `patternFamily`, `subtype` |
| `requiresVisual` | `shape` always for diagram items |
| `questionType` | Default `diagram` / `visual` |
| `possibleErrorPatterns` | `expectedErrorTags` |

**Gaps:** Unmapped procedural kinds fall back to topic-level only. No `problemClass`.

**Coverage rating:** ⭐⭐⭐⭐ — Q2-C alongside math.

---

### 2.3 Science

**Paths:**
- `data/science-questions.js` + phase enrichment files (600+ `diagnosticSkillId` references across data files)
- `pages/learning/science-master.js` (bank picker — no procedural generator)

**Fields on bank rows:**

| Field | Status |
|-------|--------|
| `topic`, `grades[]`, `type` | Structural |
| `skillId` | `params.diagnosticSkillId` (e.g. `sci_body_fact_recall`) |
| `subSkill` | `params.subtype`, `conceptTag` |
| `difficulty` | `params.difficulty` |
| `difficultyDepth` | `params.cognitiveLevel` |
| `possibleErrorPatterns` | `expectedErrorTags`, `probePower` |

**Gaps:** Static only — new items need bank PRs. Master passes row into Phase 8 at answer time.

**Coverage rating:** ⭐⭐⭐⭐ — strong bank metadata; Q2-C after math/geometry normalizer proven.

---

### 2.4 English (Q2-C3 complete)

**Paths:**
- `lib/learning/english-canonical-metadata.js`
- `utils/english-question-generator.js` — `attachCanonicalMetadataToEnglishQuestion` on every `generateQuestion()` return
- `data/english-questions/index.js` — pool enrich at export (`GRAMMAR_POOLS`, `SENTENCE_POOLS`, `TRANSLATION_POOLS`)
- `pages/learning/english-master.js` (unchanged consumer)

**Runtime coverage (Q2-C3):**

| Surface | Before Q2-C3 | After Q2-C3 |
|---------|--------------|-------------|
| Static pool rows | 0 / 1189 `canonicalMetadata` | **1189 / 1189** `row.canonicalMetadata` + `skillId` |
| `generateQuestion()` output | 0 `params.canonicalMetadata` | **100%** on grammar, vocabulary, translation, sentences, writing |
| Vocabulary (procedural) | no pool row | `eng_vocabulary_{listKey}` at generation |

**Fields:**

| Field | Status |
|-------|--------|
| `topic` | `grammar`, `vocabulary`, `translation`, `sentences`, `writing` |
| `subSkill` | `subtype`, `patternFamily`, `listKey`, `englishPoolKey` |
| `skillId` | Explicit `diagnosticSkillId` / row `skillId` when present; else `eng_grammar_{subtype}`, `eng_vocabulary_{listKey}`, `eng_translation_{poolKey}`, `eng_sentences_{subtype}`, `eng_{topic}_general` |
| `questionType` | `grammar` / `vocabulary` / `translation` from topic |
| `problemClass` | `conceptual` or `mixed` (translation/writing); omitted when unknown |
| `possibleErrorPatterns` | From `expectedErrorTags` / `distractorFamily` via normalizer |

**Gaps:** Procedural vocabulary has no static pool row metadata (generation-only). Translation without `englishPoolKey` uses `eng_translation_general`. `diagnosticEligibleByMetadata` is QA/debug only.

**Coverage rating:** ⭐⭐⭐⭐ — bank + generator populated; see `QUESTION_METADATA_Q2_C3_ENGLISH.md`.

---

### 2.5 Hebrew (Q2-C4 complete)

**Paths:**
- `lib/learning/hebrew-canonical-metadata.js`
- `utils/hebrew-question-generator.js` — attach on all `generateQuestion()` returns
- `utils/hebrew-rich-question-bank.js` — `row.canonicalMetadata` at module load
- `utils/hebrew-rich-diagnostic-metadata-enrich.js` (unchanged diagnostic pass)
- `pages/learning/hebrew-master.js` (unchanged consumer)

**Runtime coverage (Q2-C4):**

| Surface | Before Q2-C4 | After Q2-C4 |
|---------|--------------|-------------|
| `HEBREW_RICH_POOL` rows | 0 `canonicalMetadata` | **100%** `row.canonicalMetadata` + `skillId` |
| `generateQuestion()` output | 0 `params.canonicalMetadata` | **100%** (incl. empty-pool placeholder) |
| Legacy inline pools | sparse ids | generation-time attach with `heb_*` fallbacks |

**Fields:**

| Field | Status |
|-------|--------|
| `topic` | Grade-scoped topics |
| `subSkill` | `subtopicId` → `subtype` → `patternFamily` |
| `skillId` | Explicit `diagnosticSkillId` when present; else `heb_{topic}_{subtopicId}` / `heb_{topic}_{subtype}` / `heb_{topic}_general` |
| `questionType` | `reading_comprehension` / `vocabulary` / `grammar` / `technical`; omitted when unclear |
| `possibleErrorPatterns` | `expectedErrorTags` / `distractorFamily` via normalizer |

**Gaps:** Legacy inline generator pools still rely on runtime attach + conservative fallbacks. Assigned-activity freeze adapter still strips most params (canonical preserved only when full `params` passed to freeze).

**Coverage rating:** ⭐⭐⭐⭐ — rich bank + generator; see `QUESTION_METADATA_Q2_C4_HEBREW.md`.

---

### 2.6 Moledet / Geography (Q2-C5 complete)

**Paths:**
- `lib/learning/moledet-geography-canonical-metadata.js`
- `data/geography-questions/index.js` — enrich all grade pools at export
- `utils/moledet-geography-question-generator.js` — attach on `generateQuestion()`
- `lib/classroom-activities/generate-activity-questions-client.js` — freeze adapter preserves full `params`
- `pages/learning/moledet-geography-master.js` (unchanged consumer)

**Runtime coverage (Q2-C5):**

| Surface | Before Q2-C5 | After Q2-C5 |
|---------|--------------|-------------|
| Static bank rows | 0 `params.canonicalMetadata` | **100%** all grade×level pools |
| `generateQuestion()` | bridge-only `params` | **100%** with `params.canonicalMetadata` |
| Assigned freeze `params` | `{ subtype, cognitiveLevel }` only | **Full** diagnostic + `canonicalMetadata` |

**Fields:**

| Field | Status |
|-------|--------|
| `skillId` | Row `skillId` or `moledet_geo_{topic}_{subtype}` / `_general` |
| `subSkill` | `conceptTag` → `subtype` → `patternFamily` |
| `questionType` | vocabulary / reading_comprehension / technical / visual (when assets exist) |
| `requiresVisual` | Only when `mapUrl` / `diagram` / `shape` present (banks text-only today) |

**Gaps:** No rendered map assets in banks; `maps` topic is text map-literacy MCQ.

**Coverage rating:** ⭐⭐⭐⭐ — see `QUESTION_METADATA_Q2_C5_MOLEDET.md`.

---

## 3. Parent Assigned Activity Snapshots

**Freeze:** `lib/classroom-activities/assigned-activity-snapshot.server.js` → `normalizeAndFreezeQuestionSet`

**Frozen fields:**

```
qk, question_index, question, correct_answer,
subject, topic, subtopic, grade, difficulty, skill_key,
source_question_id, generator_source,
choices?, params?, explanation?, hint?, shape?
```

**Answer-time enrichment:** `lib/parent-server/parent-activity.server.js` → `buildAssignedQuestionSnapshotWithEngine`

**Persisted attempt `question_snapshot` adds:**
- `questionEngine` (Phase 8)
- `evidenceCategory`, `isDiagnosticEligible`, `contextFlags`
- Timing: `rawTimeSpentMs`, `creditedTimeMs`, `timingStatus`

**Parent mode policy:**
- `homework` → diagnostic-eligible (when classification agrees)
- `guided_practice` → non-diagnostic

**Coverage:** Inherits source generator metadata; weakest when `params` missing after freeze (moledet, legacy activities).

---

## 4. Phase 8 `questionEngine` Metadata

**SSOT:** `lib/learning/question-engine-metadata.js`  
**Version:** `phase-8-mcq-contract-v1`  
**Tests:** `tests/learning/phase8-mcq-engine-contract.test.mjs`

**Fields emitted at answer time:**

| Engine field | Contract mapping |
|--------------|------------------|
| `skillId` | `skillId` |
| `subtopic` | `subSkill` (rename in Q2-B alias only) |
| `questionType` | `answerFormat` subset + partial `questionType` |
| `generatorKind` | `params.kind` |
| `generatorSource` | e.g. `math-master`, `parent-assigned-activity` |
| `difficulty` | `difficulty` |
| `metadataConfidence` | Map to `high`/`medium`/`low` |
| `distractorFamily`, `misconceptionTag` | `possibleErrorPatterns` |
| `answerLeakageRisk` | QA signal (step-by-step, explanation, passage, stem leak) |

**Report consumption:** `extractRecentMistakeEngineFields` in aggregate pulls `distractorFamily`, `questionType`, `skillId`, `metadataConfidence` into `recentMistakes` — **display/internal only**; does not change Q1 gating.

**Not present:** `problemClass`, `difficultyDepth`, `requiresVisual`, `requiresAudio`, `diagnosticEligibleByMetadata`.

---

## 5. Book & Step-by-Step (non-diagnostic documentation)

**SSOT:** `lib/learning/activity-classification.js`

| Surface | Classification | Metadata implication |
|---------|---------------|----------------------|
| Learning book mode | `learning_book`, weight 0 | Track reading in `learningActivity`; MCQ after book gets `contextAfterBookReading` flag but does not alone reclassify |
| Step-by-step shown | `learning_guided`, `afterStepByStep: true` | `answerLeakageRisk: step_by_step_shown`; **always non-diagnostic** |
| Guided practice | Non-diagnostic mode | Rich metadata allowed for learning analytics only |
| Discussion / mistakes | Non-diagnostic modes | Subject/topic only in reports |

**Q2 rule:** Metadata contract fields must **never** override these rules. `diagnosticEligibleByMetadata` is a coverage hint, not product eligibility.

---

## 6. Gap & Risk Matrix

| Risk | Severity | Mitigation |
|------|----------|------------|
| Inconsistent `skillId` naming (`math_*` vs `sci_*` vs `moledet_geo_*`) | Medium | Q2-B normalizer + documented prefixes |
| `subtopic` vs `subSkill` vs `subtype` fragmentation | Medium | Q2-B alias map; no DB rename in Q2-A–D |
| Frozen activities drop `params` | High for moledet | Q2-C: preserve diagnostic params in freeze |
| Hebrew/English sparse skill ids | High for language diagnosis | Q2-C bank enrichment passes |
| `diagnosticEligibleByMetadata` confused with product flag | High | Contract §3.5 + QA gates |
| Cross-context metadata merge | **Out of scope** | Q1 guardrails remain |
| Metadata changes report behavior early | High | Q2-A–D explicitly no report changes |

---

## 7. Recommended Q2-B Implementation Plan

**Goal:** Pure `normalizeQuestionMetadata(record, context?)` in `lib/learning/question-metadata-normalizer.js` (new file in Q2-B).

1. **Input adapters** — accept generator question, frozen snapshot, or `questionEngine` block
2. **Legacy field merge** — single pass per contract §3 legacy tables
3. **Safe derivations only** — no generator calls; no classification overrides
4. **Output** — `{ contractVersion, ...canonicalFields, _legacy: { ... } }` for debug
5. **Tests** — fixture per subject from this audit; assert mapping without touching aggregate/report servers
6. **Optional debug hook** — behind `includeDebug` in adapter only; never default in API responses
7. **CI** — wire `scripts/tests/question-metadata-coverage-audit.mjs` thresholds in Q2-D

**Explicitly out of Q2-B:**
- Changes to `report-data-aggregate.server.js`
- Changes to `evidence-quality.js` thresholds
- Changes to parent-facing Hebrew copy
- SQL migrations

---

## 8. Staged Rollout (reference)

See `QUESTION_METADATA_CONTRACT.md` §7:

- **Q2-A** ← this audit + contract (current)
- **Q2-B** normalizer
- **Q2-C** math/geometry → science → languages
- **Q2-D** validator thresholds
- **Q2-E** evidence quality internals (approval gate)

---

## 9. Verification (Q2-A)

| Check | Expected |
|-------|----------|
| No production code behavior change | ✅ Docs + read-only script only |
| Q1 tests green | Run `evidence-quality-layer.test.mjs` |
| Phase 8 tests green | Unchanged |
| Public `meta.evidenceQuality` | Unchanged |
| Cross-context isolation | Unchanged |

---

## 10. Q2-D Validator Coverage (2026-06-06)

**Script:** `node scripts/tests/question-metadata-validator.mjs`  
**Library:** `lib/learning/question-metadata-validator.js`  
**Doc:** `QUESTION_METADATA_Q2_D_VALIDATOR.md`

### Per-subject thresholds

| Subject | Phase | minTotal | minCoveragePct | Last run |
|---------|-------|----------|----------------|----------|
| Math | Q2-C1 | 1 | 100% | 1/1 PASS |
| Geometry | Q2-C1 | 1 | 100% | 1/1 PASS |
| Science | Q2-C2 | 1000 | 100% | 1017/1017 PASS |
| English | Q2-C3 | 1000 | 100% | 1191/1191 PASS |
| Hebrew | Q2-C4 | 50 | 100% | 55/55 PASS |
| Moledet/Geography | Q2-C5 | 3000 | 100% | 3508/3508 PASS |

### Validator rules (summary)

1. **Required fields** — `contractVersion`, `subject`, `topic`, `skillId`, `answerFormat`, `metadataConfidence`; `subSkill` / `questionType` when derivable; `diagnosticEligibleByMetadata` QA-only.
2. **Confidence quality** — fallback-only `skillId` cannot be `high`; `requiresVisual` / `requiresAudio` conservative; `answerFormat` matches mcq/numeric/text.
3. **Non-diagnostic safety** — book, step-by-step, guided practice, discussion, review/mistakes never overridden by metadata.
4. **No-consumption** — grep guard: no `canonicalMetadata` in report aggregate, evidence-quality, or public API shaping (pre Q2-E).
5. **Cross-context** — no parent/school/teacher parity or merge logic tied to `canonicalMetadata`.

### Audit label corrections (Q2-D)

| Subject | Correct phase |
|---------|---------------|
| English | Q2-C3 (was mislabeled Q2-C1 in some audit strings) |
| Hebrew | Q2-C4 |
| Moledet/Geography | Q2-C5 |

### Confidence-quality findings (last run)

None — all sampled rows passed conservative confidence checks.
