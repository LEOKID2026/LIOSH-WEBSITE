# Question Metadata Contract

**File:** `docs/diagnostics/QUESTION_METADATA_CONTRACT.md`  
**Date:** 2026-06-06  
**Status:** Q2-A — contract only (no product behavior change)  
**Prerequisite:** Phase Q1 closed (parent-context evidence quality)  
**Companion:** `QUESTION_METADATA_CURRENT_COVERAGE_AUDIT.md`

---

## Explicit No-Change Declaration

> This document defines a **canonical metadata contract** and rollout plan only.  
> It does **not** change reports, UI, Hebrew copy, SQL, auth, telemetry, generators, classification rules, coins/monthly, or cross-context logic.

---

## 1. Purpose

Provide a **unified, additive, backward-compatible** metadata vocabulary so diagnosis can move beyond subject/topic rollups toward skill-level evidence — without breaking Phase Q1 sufficiency, confidence, gating, or context isolation.

**Two layers:**

| Layer | When | Role |
|-------|------|------|
| **Generation metadata** | Question created (generator, bank row, freeze) | Stable ids, taxonomy, difficulty semantics |
| **Answer-time engine metadata** | Answer submitted (Phase 8 `questionEngine`) | MCQ contract, leakage risk, runtime confidence |

Q2-A defines the contract. Population and normalization come in Q2-B/C/D. Consumption by evidence quality internals is Q2-E (owner approval required).

---

## 2. Design Principles

| Principle | Rule |
|-----------|------|
| **Additive** | New fields are optional until populated; missing fields must not break existing flows |
| **Classification SSOT unchanged** | `activity-classification.js` remains write-time authority for `isDiagnosticEligible` / `evidenceCategory`. Metadata **cannot** reclassify book, step-by-step, discussion, or guided practice as diagnostic |
| **Context isolation** | Metadata is scoped to the owning context payload; no cross-context merge, hints, or parity |
| **Fail closed on parent** | Q1 gating unchanged; metadata does not weaken suppression |
| **Traceability** | Prefer stable string ids (`skillId`, `subSkill`) over display labels |
| **Honest confidence** | `metadataConfidence` reflects how much of the contract is present at answer time |

---

## 3. Canonical Fields

### 3.1 Core identity

| Field | Type | Required (contract) | Description | Examples |
|-------|------|---------------------|-------------|----------|
| `subject` | string | **Yes** | Report rollup key | `math`, `geometry`, `english`, `hebrew`, `science`, `moledet_geography` |
| `grade` | string | Recommended | Content or registered grade key | `g3`, `grade_4` |
| `topic` | string | **Yes** | Topic within subject | `fractions`, `grammar`, `body_systems`, `homeland` |
| `skillId` | string | Recommended | Stable diagnostic skill identifier | `math_frac_add_like`, `sci_body_fact_recall`, `geo_square_area` |
| `subSkill` | string | Optional | Finer routing within skill | `like_denominators`, `sci_body_heart_place` |

**Legacy mapping today:**

| Contract field | Current source(s) |
|----------------|-------------------|
| `skillId` | `params.diagnosticSkillId`, top-level `skillId`, `skill_key`, Phase 8 `questionEngine.skillId` |
| `subSkill` | `params.subtype`, `subskillId`, `subtopicId`, Phase 8 `questionEngine.subtopic` (rename target in Q2-B) |

---

### 3.2 Question shape & pedagogy

| Field | Type | Required | Description | Allowed values |
|-------|------|----------|-------------|----------------|
| `questionType` | enum | Recommended | Surface / modality of the item | `technical`, `word_problem`, `visual`, `reading_comprehension`, `vocabulary`, `grammar`, `translation`, `diagram`, `mcq`, `numeric`, `open`, `audio`, `unknown` |
| `problemClass` | enum | Optional | Cognitive demand class | `conceptual`, `procedural`, `mixed` |
| `difficulty` | string | Optional | Canonical difficulty band | `basic`, `medium`, `hard` (align with `mapDifficultyToCanonical`) |
| `difficultyDepth` | enum | Optional | Depth of reasoning required | `recall`, `simple_application`, `multi_step`, `inference` |

**Legacy mapping today:**

| Contract field | Current source(s) |
|----------------|-------------------|
| `questionType` | Phase 8 `detectQuestionTypeFromRecord` → `mcq`/`numeric`/`open`/`audio`; infer from `params.kind` (e.g. `wp_*` → `word_problem`) in Q2-B |
| `problemClass` | **Not stored** — derive from `cognitiveLevel` + `kind` in Q2-B where safe |
| `difficulty` | `difficulty`, `level`, `params.difficulty`, activity `difficulty_level` |
| `difficultyDepth` | Partial: math `cognitiveLevel`, science `params.cognitiveLevel`, hebrew `difficultyBand` — normalize in Q2-B |

---

### 3.3 Presentation requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requiresVisual` | boolean | Optional | Diagram, shape, or image required to answer |
| `requiresAudio` | boolean | Optional | Audio playback required to answer |

**Rule:** `requiresVisual` / `requiresAudio` describe **item design**, not player state. They do not affect diagnostic eligibility alone.

**Legacy mapping:** `shape` present → `requiresVisual: true`; `questionType === "audio"` → `requiresAudio: true` (Q2-B derivations).

---

### 3.4 Answer format

| Field | Type | Required | Description | Allowed values |
|-------|------|----------|-------------|----------------|
| `answerFormat` | enum | Recommended | How the student responds | `mcq`, `numeric`, `text`, `drag`, `matching` |

**Legacy mapping:** Phase 8 `questionType` is a subset; map `mcq`→`mcq`, `numeric`→`numeric`, `open`→`text` in Q2-B normalizer.

---

### 3.5 Quality & diagnostic intent (metadata-only)

| Field | Type | Required | Description | Allowed values |
|-------|------|----------|-------------|----------------|
| `metadataConfidence` | enum | Recommended | Completeness of metadata at answer time | `high`, `medium`, `low` |
| `diagnosticEligibleByMetadata` | boolean | Optional | Whether **metadata alone** would support diagnostic use | `true` / `false` |

**Critical separation:**

- `diagnosticEligibleByMetadata` is a **metadata hint** for coverage/QA — **not** the product diagnostic flag.
- Product truth remains `isDiagnosticEligible` + `evidenceCategory` from `classifyActivityEvidence()` (mode, step-by-step, book context, guided practice).
- A question with rich metadata and `diagnosticEligibleByMetadata: true` is still **non-diagnostic** when `afterStepByStep === true` or mode is `learning` / `learning_book` / `guided_practice`.

**Legacy mapping:** Phase 8 `metadataConfidence` uses `minimal` / `partial` / `full` / `unknown` — Q2-B maps to contract enum:

| Phase 8 | Contract |
|---------|----------|
| `full` | `high` |
| `partial` | `medium` |
| `minimal`, `unknown` | `low` |

---

### 3.6 Error patterns & maintainer notes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `possibleErrorPatterns` | string[] | Optional | Normalized misconception / error tags | e.g. `calculation_error`, `fact_recall_gap`, `grammar_forms` |
| `notes` | string | Optional | Maintainer rationale (not parent-facing) | Internal QA / generator intent |

**Legacy mapping:** `expectedErrorTags`, `expectedErrorTypes`, `distractorFamily`, `misconceptionTag` → merge into `possibleErrorPatterns` in Q2-B.

---

## 4. Storage Locations (read-only reference)

Metadata may appear at multiple layers. Q2 does not add columns in Q2-A.

| Layer | Location | Fields typically present |
|-------|----------|--------------------------|
| Generator output | In-memory question object | `subject`, `topic`, `params.*`, `skillId`, `subskillId`, `shape` |
| Activity freeze | `question_set[]` on activity row | `subject`, `topic`, `subtopic`, `grade`, `difficulty`, `skill_key`, `params`, `generator_source` |
| Free practice answer | `answers.answer_payload` JSONB | `subject`, `topic`, `questionEngine`, `evidenceCategory`, `isDiagnosticEligible`, `contextFlags`, `clientMeta` |
| Assigned attempt | `*_attempts.question_snapshot` JSONB | Frozen question + above classification fields |
| Phase 8 engine | Nested `questionEngine` | `version`, `skillId`, `subtopic`, `questionType`, `generatorKind`, `metadataConfidence`, MCQ cells |

---

## 5. Relationship to Existing Contracts

### 5.1 `DiagnosticQuestionContract` (`utils/diagnostic-question-contract.js`)

Existing optional generation fields — **remain valid**, mapped into this contract:

- `diagnosticSkillId` → `skillId`
- `subtype` → `subSkill`
- `patternFamily`, `conceptTag`, `kind` → support `subSkill` / `possibleErrorPatterns` routing
- `distractorFamily`, `expectedErrorTags`, `probePower` → error pattern / confidence inputs

### 5.2 Phase 8 `questionEngine` (`lib/learning/question-engine-metadata.js`)

Answer-time block — **unchanged in Q2-A**. Future Q2-B normalizer may:

- Emit parallel `contractVersion` block, or
- Extend `questionEngine` additively with contract aliases (`subSkill`, `answerFormat`, `problemClass`)

No rename of `subtopic` → `subSkill` in Q2-A (breaking risk).

### 5.3 Phase Q1 evidence quality

`meta.evidenceQuality` public shape is **frozen**. Metadata contract does not alter sufficiency thresholds, recurrence rules, or parent gating.

---

## 6. Field Requirement Matrix (by rollout phase)

| Field | Q2-A | Q2-B normalizer | Q2-C population | Q2-D validator | Q2-E consumption |
|-------|------|-----------------|-----------------|----------------|------------------|
| `subject`, `topic` | Document | Pass-through | Already present | Required | Internal only |
| `grade` | Document | Derive when missing | Enrich generators | Warn if missing | Optional |
| `skillId` | Document | Map from legacy ids | Math/geometry first | Coverage threshold | Evidence internals |
| `subSkill` | Document | Map from subtype/subtopicId | Subject-by-subject | Warn if missing | Evidence internals |
| `questionType` | Document | Derive from kind/type | Enrich banks | Threshold per subject | Optional |
| `problemClass` | Document | Safe derive only | Generator tags | Optional | Deferred |
| `difficulty`, `difficultyDepth` | Document | Normalize enums | Generator tags | Warn | Optional |
| `requiresVisual`, `requiresAudio` | Document | Derive from shape/type | Generator tags | Optional | Deferred |
| `answerFormat` | Document | Map from questionType | Pass-through | Required for MCQ | MCQ contract |
| `metadataConfidence` | Document | Map Phase 8 values | N/A (computed) | Report in QA | Optional |
| `diagnosticEligibleByMetadata` | Document | Compute hint only | N/A | Must not override classification | Never parent-facing |
| `possibleErrorPatterns` | Document | Merge legacy tags | Generator tags | Optional | Error routing |
| `notes` | Document | Optional | Maintainer only | N/A | Never exposed |

---

## 7. Staged Rollout

| Phase | Scope | Behavior change |
|-------|-------|-----------------|
| **Q2-A** | This contract + coverage audit + read-only script | **None** |
| **Q2-B** | `normalizeQuestionMetadata()` — pure function, maps legacy → contract; used in tests and optional debug only | **None** in reports |
| **Q2-C** | Subject-by-subject population starting with **math + geometry** (most structured); then science; then english/hebrew/moledet | Generator/bank changes only; classification unchanged |
| **Q2-D** | Validator + coverage thresholds per subject/grade; CI script gates | **None** in reports |
| **Q2-E** | Feed `subSkill` into evidence quality / report **internals** only | Owner approval; no public API shape change without separate approval |

---

## 8. QA Requirements (all Q2 phases until E approved)

- No report behavior changes in Q2-A/B/C/D
- No change to Q1 evidence sufficiency thresholds (`0/1–4/5–11/12+recurrence`)
- No parent/teacher/school cross-context comparison or hints
- No metadata field may make book / step-by-step / discussion diagnostic
- Metadata must remain additive and backward-compatible
- Phase Q1 tests (`evidence-quality-layer.test.mjs`) must stay green
- Public `meta.evidenceQuality` sanitization unchanged (no `supportingEvidenceIds`, no `_evidenceQuality`)

---

## 9. Non-Diagnostic Surfaces (document only)

| Surface | Why non-diagnostic | Metadata role |
|---------|-------------------|---------------|
| **Learning book** | `learning_book` category; weight 0 | Document reading context; `contextAfterBookReading` flag only |
| **Step-by-step** | `afterStepByStep` → `learning_guided` always | `answerLeakageRisk: step_by_step_shown`; metadata must not override |
| **Guided practice** | Parent/assigned mode policy | Metadata for learning context only |
| **Discussion / mistakes review** | Mode classification | No diagnostic rollup |

---

## 10. Versioning

| Key | Value |
|-----|-------|
| `contractVersion` | `question-metadata-contract-v1` |
| `questionEngine.version` | `phase-8-mcq-contract-v1` (unchanged) |

Future contract revisions bump `contractVersion` only; old payloads remain readable via Q2-B normalizer fallbacks.
