# Q2-E — Question Metadata Consumption Plan (Planning Only)

**File:** `docs/diagnostics/QUESTION_METADATA_Q2_E_CONSUMPTION_PLAN.md`  
**Date:** 2026-06-06  
**Status:** Planning / impact mapping only — **no implementation**  
**Prerequisites:** Q2-C1–C5 population complete; Q2-D validator PASS  
**Companions:** `QUESTION_METADATA_CONTRACT.md`, `QUESTION_METADATA_Q2_D_VALIDATOR.md`, `DIAGNOSTIC_ENGINE_QUALITY_MASTER_PLAN.md`

---

## Explicit No-Change Declaration (this phase)

> This document is a **consumption blueprint only**.  
> It does **not** connect `canonicalMetadata` to evidence-quality, report aggregates, APIs, UI, Hebrew copy, SQL, or classification.  
> **No product behavior changes** until Q2-E sub-phases are separately approved and implemented.

---

## 1. What would Q2-E consume?

Canonical fields from `params.canonicalMetadata` (or `row.canonicalMetadata` on frozen pools), normalized via `normalizeQuestionMetadata()` when legacy shapes appear in answer snapshots.

| Field | Q2-E role | Consumption tier | Notes |
|-------|-----------|------------------|-------|
| **`skillId`** | Internal grouping key; parent of `subSkill` rollups | **E.2+** | Prefer canonical over Phase 8 `questionEngine.skillId` when both exist; never sole basis for diagnosis |
| **`subSkill`** | Primary finer-grain rollup inside topic | **E.1 first target** | Internal `_evidenceQuality.bySubSkill` only initially |
| **`questionType`** | Segment mistakes for pattern routing (grammar vs reading vs numeric) | **E.3+** | Filter only; does not change eligibility |
| **`problemClass`** | Cognitive segmentation (conceptual / procedural / mixed) | **Deferred (E.4+)** | Useful for false-precision guardrails; not first step |
| **`difficultyDepth`** | Depth-aware recurrence weighting | **Deferred (E.5+)** | Optional internal weight; no Q1 threshold change |
| **`possibleErrorPatterns`** | Recurrence / pattern-family routing | **E.3+** | Align with `utils/diagnostic-engine-v2/recurrence.js`; complements `distractorFamily` |
| **`metadataConfidence`** | Cap internal grouping trust | **E.2+** | Must not inflate Q1 `dataSufficiency`; low confidence → coarser grouping or skip subSkill split |

### Fields explicitly not consumed in Q2-E

| Field | Reason |
|-------|--------|
| `diagnosticEligibleByMetadata` | QA/debug hint only — never product or parent-facing |
| `isDiagnosticEligible` / `evidenceCategory` | `activity-classification.js` remains SSOT |
| `requiresVisual` / `requiresAudio` | Presentation design only until telemetry phase |
| `notes` | Maintainer-only |

### Metadata resolution rule (all sub-phases)

At answer-read time, resolve metadata from **allowed parent-context evidence only**:

```
answer_payload / question_snapshot
  → params.canonicalMetadata (preferred)
  → normalizeQuestionMetadata({ ...snapshot, questionEngine })
  → internal metadata view (never written back to classification)
```

Evidence must already be classified diagnostic by `classifyActivityEvidence()` — metadata cannot promote book, step-by-step, guided practice, discussion, or review/mistakes mode.

---

## 2. Where would it be consumed?

### 2.1 Evidence-quality internals (primary)

| File | Current state | Planned Q2-E touch |
|------|---------------|-------------------|
| `lib/learning/evidence-quality.js` | Q1 scopes: `student`, `bySubject`, `byTopic`; recurrence on wrong rows only | Add **`_evidenceQuality.internal.bySubSkill`** (and optionally `bySkill`); read resolved metadata from enriched `recentMistakes`; **do not** extend public `meta.evidenceQuality` shape in E.1 |
| `lib/learning/diagnostic-evidence-contract.js` | Parent-context source policy | Document allowed metadata sources; no cross-context reads |
| `utils/diagnostic-engine-v2/recurrence.js` | `minDistinctPatternFamilies: 0` today | Optional E.3: feed `possibleErrorPatterns` / `distractorFamily` into recurrence helper **without** changing Q1 owner thresholds |

**Public shape frozen:** `meta.evidenceQuality` keys remain `context`, `student`, `bySubject`, `byTopic` with existing sufficiency fields only (per Q1 contract).

### 2.2 Report-data aggregate internals

| File | Current state | Planned Q2-E touch |
|------|---------------|-------------------|
| `lib/parent-server/report-data-aggregate.server.js` | Builds `recentMistakes` with `subject`, `topic`, `questionEngine` subset via `extractRecentMistakeEngineFields` | E.2: resolve canonical metadata from `answer_payload` / `question_snapshot.params.canonicalMetadata` at mistake push time; attach **internal-only** fields (`subSkill`, `skillId`, `metadataConfidence`, `possibleErrorPatterns`) stripped before API |
| `lib/learning/question-engine-metadata.js` | `extractRecentMistakeEngineFields` exports `skillId`, `questionType`, `metadataConfidence`, `distractorFamily` | E.2: extend or sibling helper `extractRecentMistakeCanonicalFields` — still storage pass-through, stripped at API boundary |
| `lib/learning/question-metadata-normalizer.js` | Pure legacy → canonical mapper | E.1: called from aggregate/evidence read path only (not generators) |

**Not in first step:** changes to `diagnosticAnswers` / `diagnosticAccuracy` counting — metadata groups mistakes already counted as diagnostic.

### 2.3 RecentMistakes / pattern routing

| File | Current state | Planned Q2-E touch |
|------|---------------|-------------------|
| `lib/parent-server/report-data-aggregate.server.js` | `recentMistakes[]` capped at `RECENT_MISTAKES_LIMIT` | Enrich rows; internal grouping keys |
| `utils/diagnostic-mistake-metadata.js` | Legacy `patternFamily`, `distractorFamily` extraction | E.3: prefer canonical `possibleErrorPatterns` when present |
| `lib/parent-server/parent-facing-report-authority.js` | Suppresses client `patternDiagnostics` on thin/insufficient Q1 data | E.5+ only: optional subSkill-aware suppression — **separate approval** |
| `utils/parent-report-v2.js` / `utils/detailed-parent-report.js` | Client DE2 pattern diagnostics | **No direct canonicalMetadata reads** in E.1–E.3; continue server authority bridge |

### 2.4 Parent-facing gating

| File | Current state | Planned Q2-E touch |
|------|---------------|-------------------|
| `lib/parent-server/parent-report-parent-facing.server.js` | Gates Hebrew insights via `allowsStrongParentDiagnosisAtStudent/Topic` (Q1 sufficiency) | **E.1: no change.** E.5+: optional topic→subSkill gating only with explicit approval |
| `lib/parent-server/parent-facing-report-authority.js` | `shouldSuppressClientPatternDiagnostics` | E.5+: may consult internal `bySubSkill` sufficiency — not first step |
| `lib/parent-server/report-data-aggregate.server.js` | `stripInternalReportPayloadFields` removes `_evidenceQuality` | Ensure new internal keys (`bySubSkill`, `supportingMetadataIds`) are stripped |

### 2.5 DE2 bridge / report-data-adapter

| File | Current state | Planned Q2-E touch |
|------|---------------|-------------------|
| `lib/learning-supabase/report-data-adapter.js` | Passes `evidenceQuality` from `source.meta` into DB report input | **E.1: no change** to output shape; no `canonicalMetadata` in adapter output |
| `lib/learning-supabase/parent-report-from-api-payload.js` | Seeds localStorage shim → `generateParentReportV2` + `applyServerParentFacingAuthorityToClientReport` | E.5+: if subSkill gating approved, pass only **derived** suppression flags — not raw metadata |
| `utils/diagnostic-engine-v2/*` | Client recurrence / pattern logic | Avoid divergence: server internal grouping is source of truth; client remains gated by Q1 snapshot |

### 2.6 API boundary (must stay clean)

| File | Rule |
|------|------|
| `pages/api/parent/**` | No `canonicalMetadata` in responses |
| `lib/guardian-server/guardian-report.server.js` | Strip internals; no metadata consumption in E.1–E.3 |
| `stripInternalReportPayloadFields` in `report-data-aggregate.server.js` | Single choke point for new internal fields |

### 2.7 Teacher / school — later phases only (do not implement in first Q2-E)

| File | Future scope | Gate |
|------|--------------|------|
| `lib/teacher-server/teacher-guidance-v2.server.js` | Skill/subSkill weakness ranking | Separate approval (Q4 alignment) |
| `lib/teacher-server/teacher-report.server.js` | Diagnostic mistake enrichment | Separate approval |
| `lib/teacher-server/teacher-class-report.server.js` | Class weakness topics | Separate approval |
| `lib/school-server/*` | School report payloads | Separate approval |
| `lib/guardian-server/guardian-report.server.js` | Guardian parity | **Never** cross-context metadata merge |

### 2.8 Validator / CI (update when E approved)

| File | Change when implementing |
|------|--------------------------|
| `lib/learning/question-metadata-validator.js` | Remove paths from `NO_CONSUMPTION_SCAN_PATHS` only for approved files; add positive consumption tests |
| `tests/learning/question-metadata-validator.test.mjs` | Flip no-consumption tests to allow-list approved wiring |

---

## 3. What must not change in first Q2-E implementation?

| Constraint | Enforcement |
|------------|-------------|
| **No public API shape change** | `meta.evidenceQuality` keys unchanged; no `canonicalMetadata` on API JSON |
| **No Hebrew copy** | `parent-report-parent-facing.server.js` insight strings untouched in E.1–E.3 |
| **No UI** | No pages/components |
| **No SQL** | Read existing `answer_payload` / `question_snapshot` only |
| **No cross-context logic** | Parent path only; no teacher/school/guardian metadata reads |
| **No teacher/school changes** | Unless separate phase approval |
| **No classification override** | `activity-classification.js` untouched |
| **No Q1 threshold change** | `0 / 1–4 / 5–11 / 12+recurrence` constants frozen |
| **No diagnosis from metadata alone** | Grouping enriches existing diagnostic wrongs only; eligibility still from classification |
| **No `subSkill` in public reports** | Internal `_evidenceQuality` and pre-strip `recentMistakes` only |
| **Book / step-by-step / guided / discussion** | Remain non-diagnostic regardless of metadata richness |

---

## 4. Proposed safe Q2-E first step

### Recommended minimal path: **Q2-E.1 — Internal subSkill grouping (parent context only)**

**Goal:** Add skill-level **internal** rollups without changing anything parent-visible.

```
Q2-E.1a  Pure resolver
         lib/learning/question-metadata-resolve-at-answer.js (new)
         resolveCanonicalMetadataFromAnswerSnapshot(snapshot, questionEngine)
         → uses normalizeQuestionMetadata(); returns null for non-diagnostic contexts

Q2-E.1b  recentMistakes enrichment (internal fields)
         report-data-aggregate.server.js
         → on wrong + diagnostic-eligible rows only, attach subSkill/skillId/metadataConfidence
         → stripInternalReportPayloadFields removes any new internal-only keys from API

Q2-E.1c  evidence-quality internal scope
         evidence-quality.js
         → compute _evidenceQuality.internal.bySubSkill from enriched recentMistakes
         → same rawDiagnosticCount / recurrence / dataSufficiency as today (topic scope unchanged)

Q2-E.1d  Tests + before/after fixtures
         tests/learning/question-metadata-consumption.test.mjs (new)
         → assert public API snapshot identical before/after flag-off
         → assert internal bySubSkill populated when flag-on in test harness only

Q2-E.1e  Validator allow-list update
         question-metadata-validator.js NO_CONSUMPTION_SCAN_PATHS narrowed to approved files
```

**Feature flag:** `METADATA_CONSUMPTION_INTERNAL=1` env or compile-time test flag — default **off** in production until E.1 acceptance.

**What E.1 deliberately does not do:**

- Does not change `allowsStrongParentDiagnosisAtTopic`
- Does not change Hebrew insights or recommendations
- Does not add public `bySubSkill` to `meta.evidenceQuality`
- Does not use `metadataConfidence` to upgrade sufficiency
- Does not consume `problemClass` / `difficultyDepth` yet

### Subsequent sub-phases (after E.1 accepted)

| Sub-phase | Scope | Approval |
|-----------|-------|----------|
| **Q2-E.2** | `possibleErrorPatterns` + `distractorFamily` recurrence routing (internal) | Owner |
| **Q2-E.3** | `metadataConfidence` caps internal subSkill split (low → roll up to topic) | Owner |
| **Q2-E.4** | `questionType` filters for pattern routing | Owner |
| **Q2-E.5** | Parent-facing gating uses `bySubSkill` sufficiency (still no new public fields) | Owner + copy review |
| **Q2-E.6** | `problemClass` / `difficultyDepth` internal segmentation | Owner |
| **Q2-E.7+** | Teacher/school consumption | Q4 / separate approval |

---

## 5. Risk analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **False precision from weak metadata** | Medium | Over-splitting weaknesses | Require `metadataConfidence !== low` for subSkill split; Q2-D validator stays in CI |
| **Fallback `skillId` overuse** (`eng_*_general`, `heb_*`, `moledet_geo_*_general`) | Medium | Misleading internal groups | Roll up fallback-only ids to topic level; never `high` confidence routing |
| **English reading / typing items** | Medium | `answerFormat: text` vs mcq mismatch in grouping | Group by `subSkill` not `answerFormat`; validate with E.3 fixtures |
| **Hebrew grammar typing → text** | Low | Split groups for same skill | Use canonical `subSkill` from generator, not hardcoded mcq |
| **Moledet topic-level fallback confidence** | Medium | Broad buckets only | Cap at topic rollup when `metadataConfidence: low` or fallback skillId |
| **Parent report overdiagnosis** | High if rushed | Trust erosion | E.1 internal-only; Q1 gating unchanged; before/after API snapshot tests |
| **DE2 divergence** | Medium | Client/server mismatch | Server authority unchanged; no new metadata fields to client adapter |
| **Cross-context isolation breach** | Low | Policy violation | Parent aggregate only; grep guard updated incrementally; no teacher/school reads |
| **Metadata-only diagnosis** | Medium | False eligibility | Gate resolver on `isDiagnosticEligible === true` from classification, not `diagnosticEligibleByMetadata` |
| **Legacy rows without canonicalMetadata** | High | Sparse `bySubSkill` | `normalizeQuestionMetadata` fallbacks; empty subSkill → topic-level internal bucket |

---

## 6. Acceptance criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| AC1 | Q2-D validator PASS | `node scripts/tests/question-metadata-validator.mjs` |
| AC2 | Q1 simulation 12/12 PASS | `node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs --verify-only` |
| AC3 | No public API leak | Snapshot test: stripped payload has no `canonicalMetadata`, no `_evidenceQuality`, no `bySubSkill` |
| AC4 | No report text changes unless approved | Diff `parentFacing` blocks with flag on/off — identical in E.1 |
| AC5 | Metadata cannot make non-diagnostic items diagnostic | Fixtures: book, step-by-step, guided, discussion, review → excluded from `bySubSkill` |
| AC6 | Every subSkill group traces to allowed parent evidence | Only `free_practice` + `assigned_parent` sources per `diagnostic-evidence-contract.js` |
| AC7 | Q1 thresholds unchanged | `SUPPORTED_MIN_DIAGNOSTIC`, `PRELIMINARY_MIN_DIAGNOSTIC`, recurrence rules constant |
| AC8 | `activity-classification.js` untouched | No edits in E.1 PR |
| AC9 | Cross-context isolation | No teacher/school/guardian metadata reads; cross-context validator PASS |
| AC10 | Phase 4–10 + consumer tests green | Full regression matrix |

---

## 7. Recommended test plan

### 7.1 Before implementation (baseline — current)

```bash
node scripts/tests/question-metadata-validator.mjs
node --test tests/learning/question-metadata-validator.test.mjs
node --test tests/learning/evidence-quality-layer.test.mjs
node --test tests/reports/diagnostic-truth-consumer-verification.test.mjs
node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs --verify-only
```

### 7.2 New tests (when E.1 implemented)

| Test file | Purpose |
|-----------|---------|
| `tests/learning/question-metadata-consumption.test.mjs` | Resolver + internal `bySubSkill` grouping |
| `tests/learning/question-metadata-consumption-api-snapshot.test.mjs` | Public API JSON identical with consumption on/off |
| `tests/learning/fixtures/metadata-consumption/` | Per-subject before/after mistake rows |

### 7.3 Fixture scenarios (minimum)

| Fixture | Expect |
|---------|--------|
| Math diagnostic wrong with `params.canonicalMetadata` | Internal `bySubSkill` key `math_frac_add_like::frac_add_like` |
| Geometry `requiresVisual` row | Grouped by subSkill; `requiresVisual` not in API |
| Science bank row | `possibleErrorPatterns` preserved in internal mistake row (E.2) |
| English `eng_translation_general` fallback | Rolls up to topic, not high-confidence subSkill |
| Hebrew grammar `answerFormat: text` | subSkill stable across mcq/text |
| Moledet low-confidence fallback | Topic-level internal bucket only |
| Book context answer | No metadata consumption |
| Step-by-step answer | Excluded despite rich metadata |
| Legacy row (no canonicalMetadata) | normalizeQuestionMetadata fallback or topic-only bucket |

### 7.4 Controlled consumption tests

1. **Flag off:** full regression — public payloads byte-stable for `meta.evidenceQuality`
2. **Flag on (test env):** internal `_evidenceQuality.bySubSkill` populated; public unchanged
3. **Validator:** update no-consumption scan → consumption allow-list tests pass
4. **Q1 simulation:** 12/12 with flag on in QA env

### 7.5 Ongoing CI (post E.1)

```bash
node scripts/tests/question-metadata-validator.mjs
node --test tests/learning/question-metadata-consumption.test.mjs
node --test tests/learning/evidence-quality-layer.test.mjs
node --env-file=.env.local scripts/qa/parent-report-q1-simulation.mjs --verify-only
```

---

## 8. Proposed Q2-E sub-phases (summary)

| Phase | Deliverable | User-visible? |
|-------|-------------|---------------|
| **Q2-E.0** | This plan | No |
| **Q2-E.1** | Internal `bySubSkill` in `_evidenceQuality` + mistake enrichment | **No** |
| **Q2-E.2** | `possibleErrorPatterns` recurrence routing | No |
| **Q2-E.3** | `metadataConfidence` rollup caps | No |
| **Q2-E.4** | `questionType` pattern filters | No |
| **Q2-E.5** | Parent gating refinement (subSkill sufficiency) | Maybe (suppression only) |
| **Q2-E.6** | `problemClass` / `difficultyDepth` internal | No |
| **Q2-E.7+** | Teacher/school | Separate program |

---

## 9. Safest first implementation recommendation

**Ship Q2-E.1 only** after explicit owner approval:

1. New pure resolver (no side effects)
2. Enrich `recentMistakes` on diagnostic wrongs only — internal fields stripped at API
3. Add `_evidenceQuality.internal.bySubSkill` — **not** public `meta.evidenceQuality.bySubSkill`
4. Default feature flag **off**
5. Before/after public API snapshot tests must show **zero diff**
6. Q2-D validator allow-list updated in same PR as consumption wiring

This delivers skill-level traceability for engineering and QA without moving the parent diagnosis surface.

---

## 10. Explicit non-goals (all of Q2-E until separately approved)

- Public `meta.evidenceQuality` shape extension
- New API fields or endpoints
- Hebrew parent/teacher copy changes
- UI components or report redesign
- SQL migrations or backfill jobs
- Telemetry / audio implementation
- Cross-context merge, parity, hints, or flags
- Teacher/school/guardian report consumption
- Classification override via metadata
- Q1 sufficiency threshold changes
- Diagnosis based on metadata without classified diagnostic evidence
- Exposing `subSkill` to client DE2 or `patternDiagnostics` directly
- Commit/push as part of planning phase

---

## 11. Verification of this planning phase

| Check | Status |
|-------|--------|
| Product behavior changed | **No** — documentation only |
| Code changes | **None** |
| Commit / push | **None** |
| File created | `docs/diagnostics/QUESTION_METADATA_Q2_E_CONSUMPTION_PLAN.md` |

---

## 12. Approval gate before coding Q2-E.1

Owner must confirm:

- [ ] E.1 scope (internal `bySubSkill` only) approved
- [ ] Parent-context only confirmed
- [ ] Public API snapshot test required in PR
- [ ] Q2-D validator allow-list update included in same change set
- [ ] Q1 simulation 12/12 required in PR
- [ ] Hebrew copy / UI / teacher / school remain out of scope
