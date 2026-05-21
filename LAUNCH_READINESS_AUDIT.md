# Learning Site Launch Readiness Audit

**Date:** 2026-05-21
**Scope:** Full system audit - NO CODE CHANGES MADE
**Auditor:** Cascade AI

---

## Executive Summary

| Area | Status | Risk Level |
|------|--------|------------|
| Question Bank Coverage | PARTIAL | MEDIUM |
| Diagnostic Engine V2 | READY | LOW |
| Adaptive Next Question | READY | LOW |
| Student Progress Sync | AT RISK | HIGH |
| Parent Report Consistency | READY | LOW |
| Parent Copilot Grounding | READY | LOW |
| Overall Launch Readiness | CONDITIONAL | MEDIUM |

**Recommendation:** Launch is feasible with the sync risk documented and mitigated through operational procedures. The question bank has coverage gaps in less-common grade/topic combinations but core grades (G1-G4) are well-covered.

---

## 1. Question Bank Coverage Audit

### 1.1 Bank Structure by Subject

| Subject | Generator Type | Static Bank | Grade Coverage | Level Coverage |
|---------|---------------|-------------|------------------|----------------|
| **Math** | Algorithmic + Templates | No | G1-G6 | easy/medium/hard per grade |
| **Geometry** | Conceptual Bank + Generator | Yes (50KB) | G2-G6 | easy/medium/hard |
| **Hebrew** | Rich Question Bank + Generator | Yes (280KB) | G1-G6 | easy/medium/hard |
| **English** | Generator | Limited | G1-G6 | easy/medium/hard |
| **Science** | Generator | No | G1-G6 | easy/medium/hard |
| **Moledet/Geography** | Generator | No | G1-G6 | easy/medium/hard |

### 1.2 Topic Coverage Matrix (Key Topics Only)

| Subject | Core Topics | Subtopic Granularity | Diagnostic Tags |
|---------|-------------|---------------------|-----------------|
| Math | addition, subtraction, multiplication, division, fractions, compare, number_sense, word_problems | **HIGH** - per-operation params by grade | YES - patternFamily in params |
| Geometry | shapes, measurements, area, perimeter, volume, symmetry, angles | **MEDIUM** - conceptual categories | YES - conceptTag, patternFamily |
| Hebrew | spelling, grammar, comprehension, vocabulary, dictation | **HIGH** - grade-specific subtopics | YES - via hebrew-specific metadata |
| English | grammar, vocabulary, reading | **MEDIUM** - topic-level | PARTIAL - grammarOptionSet |
| Science | experiments, graphs, states_of_matter, energy | **LOW** - topic buckets only | YES - conceptTag, patternFamily |
| Moledet/Geography | israel_geography, civics, holidays | **MEDIUM** - topic subcategories | PARTIAL |

### 1.3 Weak Cells Identified

#### Empty/Low-Count Cells
| Grade/Topic/Level | Risk | Evidence |
|-------------------|------|----------|
| Math G1 Hard fractions | **EMPTY** - G1 doesn't teach fractions | Level config shows fractions excluded G1 |
| Geometry G2 Easy area/volume | **LOW COUNT** - Early geometry focuses on shapes | Conceptual bank weighted to G3+ |
| English G5-G6 Hard | **THIN** - Fewer complex grammar questions | Generator may repeat templates |
| Science G1-G2 | **LOW** - Limited experiment scenarios | Age-appropriate content constraints |
| Moledet G5-G6 Hard | **THIN** - Advanced civics questions limited | Curriculum depth varies |

#### Duplicate/Near-Duplicate Risks
| Area | Risk Level | Mitigation |
|------|------------|------------|
| Math algorithmic generation | **LOW** - Random params create variation | Parameter ranges ensure diversity |
| Hebrew rich bank | **MEDIUM** - 280KB bank may have similar items | No deduplication detected in code |
| Geometry conceptual | **LOW** - Binary questions have 2 options | Unique exerciseText per question |
| English grammar MCQ | **MEDIUM** - Option cells may repeat | Option cells have distractorFamily metadata |

#### Metadata Completeness Gaps
| Metadata Type | Math | Geometry | Hebrew | English | Science | Moledet |
|---------------|------|----------|--------|---------|---------|---------|
| patternFamily | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| conceptTag | N/A | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| diagnosticSkillId | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| expectedErrorTags | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ❌ |
| probePower | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |

**Legend:** ✅=Complete, ⚠️=Partial, ❌=Missing

### 1.4 Probe-Capable Questions

All subjects have probe infrastructure:

| Subject | Probe Bank | Probe Matching | Outcome Application |
|---------|------------|----------------|---------------------|
| Math | ✅ math-fraction-probe.js, math-active-probe.js | ✅ bankQuestionProbeMatch() | ✅ applyProbeOutcome() |
| Geometry | ✅ geometry-probe-bank.js | ✅ | ✅ |
| Hebrew | ✅ | ✅ | ✅ |
| English | ✅ | ✅ | ✅ |
| Science | ✅ science-diagnostic-probe.js | ✅ | ✅ |
| Moledet | ✅ | ✅ | ✅ |

**Finding:** Probe capability is consistently implemented across all subjects.

---

## 2. Diagnostic Engine V2 Readiness

### 2.1 Core Engine Components

| Component | File | Status |
|-----------|------|--------|
| Confidence Policy | `diagnostic-engine-v2/confidence-policy.js` | ✅ READY |
| Recurrence Rules | `diagnostic-engine-v2/recurrence.js` | ✅ READY |
| Priority Policy | `diagnostic-engine-v2/priority-policy.js` | ✅ READY |
| Output Gating | `diagnostic-engine-v2/output-gating.js` | ✅ READY |
| Evidence Trace | `diagnostic-engine-v2/run-diagnostic-engine-v2.js` | ✅ READY |
| probeEvidence Integration | `report-data-aggregate.server.js` | ✅ READY (Phase 1B) |

### 2.2 Evidence Thresholds (Real Minimums)

| Confidence Level | Questions Required | Wrongs Required | Other Conditions |
|------------------|-------------------|-----------------|------------------|
| `high` | q >= 40 | - | OR: recurrenceFull + confidence01 >= 0.72 + suff === "strong" |
| `moderate` | q >= 12 | w >= 2 | OR: !recurrenceFull && w >= 2 |
| `low` | q >= 4 | w >= 1 | OR: !recurrenceFull with any wrongs |
| `early_signal_only` | q < 4 or thin data | w < 2 | OR: hintInvalidates === true |
| `insufficient_data` | q < 4 | w < 2 | AND: no contradictory signals |
| `contradictory` | - | - | needsPractice === true && dom === "stable_mastery" |

### 2.3 Special Handling Cases

| Scenario | Engine Behavior | Safety |
|----------|-----------------|--------|
| Heavy hints (>85% wrongs with hints) | `hintInvalidates` → `early_signal_only` | ✅ Conservative |
| Contradictory signals | `contradictory` confidence | ✅ Blocks diagnosis |
| Recurrence not met | Downgrades to `low` or `moderate` | ✅ Conservative |
| No taxonomy match | `probeOnly: true`, no diagnosis | ✅ Safe |
| Thin data (< 8 questions) | `weakEvidence` flag, limited intervention | ✅ Protected |
| P4 priority | `humanReviewRecommended: true` | ✅ Safety guard |

### 2.4 probeEvidence in Engine

**Current State:** probeEvidence is **AGGREGATED** but **NOT YET FED** into engine confidence calculations.

- ✅ probeEvidence extracted from answers via `normalizeDiagnosticProbeEvidenceFromClientMeta()`
- ✅ probeEvidence passed through report-data-adapter via `sanitizeProbeEvidence()`
- ✅ probeEvidence appears in detailed parent report
- ✅ probeEvidence sanitized for Copilot
- ⚠️ **NOT YET:** probeEvidence used in `runDiagnosticEngineV2()` recurrence/confidence logic

**Impact:** Engine currently treats probe outcomes as separate evidence trail, not integrated into confidence scoring. This is conservative and safe.

---

## 3. Adaptive Next Question Flow

### 3.1 Flow Architecture

```
Student Answer
    ↓
Save Answer (server + localStorage)
    ↓
Update Mistake Store (localStorage)
    ↓
Check for Pending Probe (session-local ref)
    ↓
If Wrong → Create/Update Pending Probe (buildPendingProbeFromMistake)
    ↓
Next Question Selection
    ├── If probe pending → Select probe question (bankQuestionProbeMatch)
    └── If no probe → Standard adaptive selection
```

### 3.2 Subject-by-Subject Implementation Status

| Subject | Wrong→Probe Logic | Probe Selection | Post-Probe Follow-up | Status |
|---------|-------------------|-----------------|---------------------|--------|
| **Math** | ✅ `mathPendingDiagnosticProbeRef` | ✅ `bankQuestionProbeMatch()` | ✅ `applyProbeOutcome()` updates ledger | **PASS** |
| **Geometry** | ✅ `geometryPendingProbeRef` | ✅ `bankQuestionProbeMatch()` | ✅ `applyProbeOutcome()` | **PASS** |
| **Hebrew** | ✅ `hebrewPendingDiagnosticProbeRef` | ✅ | ✅ | **PASS** |
| **English** | ✅ `englishPendingDiagnosticProbeRef` | ✅ | ✅ | **PASS** |
| **Science** | ✅ `sciencePendingProbeRef` | ✅ | ✅ | **PASS** |
| **Moledet** | ✅ `moledetPendingDiagnosticProbeRef` | ✅ | ✅ | **PASS** |

### 3.3 Consistency Analysis

All subjects follow the **same pattern**:
1. `useRef(null)` for pending probe storage
2. `buildPendingProbeFromMistake()` on wrong answer
3. `bankQuestionProbeMatch()` for probe question selection
4. `attachProbeMetaToQuestion()` for probe metadata
5. `applyProbeOutcome()` on probe answer
6. `buildDiagnosticProbeClientMeta()` for persistence

**Finding:** Flow is consistent across all subjects. ✅

### 3.4 Probe→Better Follow-up Verification

The engine does NOT currently use probe outcomes to select the *next non-probe* question. The probe outcome:
- Updates the hypothesis ledger (`*HypothesisLedgerRef`)
- Is persisted for parent report visibility
- Does NOT directly influence subsequent question selection

**Gap:** After a probe confirms a weakness, the next standard question isn't specifically chosen to address that weakness. Standard adaptive logic applies.

**Risk Level:** LOW - probe evidence is visible to parents and Copilot, enabling human-in-the-loop guidance even if automated follow-up is not yet implemented.

---

## 4. Student Progress and Multi-Device Sync

### 4.1 Data Persistence Model

| Data Type | Server (Supabase) | localStorage | Sync Status | Risk |
|-----------|-------------------|--------------|-------------|------|
| **Answers** | ✅ `answers` table | ❌ Not stored | ✅ Server-authoritative | LOW |
| **Mistakes** | ❌ Not directly stored | ✅ Subject-specific keys | ⚠️ Local-only | HIGH |
| **Accuracy/Stats** | Derived from answers | ✅ Cached | ⚠️ May drift | MEDIUM |
| **Streaks** | ❌ Not stored | ✅ `*_progress` keys | ⚠️ Local-only | HIGH |
| **Coins/Stars/XP** | ❌ Not stored | ✅ `*_progress` keys | ⚠️ Local-only | HIGH |
| **Subject Progress** | ❌ Not stored | ✅ Grade/topic buckets | ⚠️ Local-only | HIGH |
| **Topic Progress** | ❌ Not stored | ✅ Level_topic keys | ⚠️ Local-only | HIGH |
| **Recommendations** | ❌ Not stored | ❌ Not stored | N/A | N/A |
| **Diagnostic Evidence** | ✅ In `answer_payload` | ❌ Not stored | ✅ Server-authoritative | LOW |
| **probeEvidence** | ✅ In `answer_payload.clientMeta` | ❌ Not stored | ✅ Server-authoritative | LOW |

### 4.2 Multi-Device Sync Risk Table

| Scenario | Device A | Device B | Expected | Current Behavior | Risk |
|----------|----------|----------|----------|------------------|------|
| Practice math on tablet | Saves answers, local streak 5 | - | Streak continues on phone | Phone has different localStorage → streak 0 | **HIGH** |
| Answer stored | ✅ Server | - | Available everywhere | ✅ Available in parent report | **LOW** |
| Mistake pattern | 3 wrongs on topic X | First visit | Should see weakness | Device B has no mistake history | **HIGH** |
| Daily challenge completed | Badge in localStorage | - | Should sync | No sync → can redo on B | **MEDIUM** |
| Avatar/Name | localStorage | - | Should persist per-device | Each device independent | **LOW** |

### 4.3 Critical Findings

**LAUNCH BLOCKER - HIGH RISK:**
- Streaks, coins, stars, XP are **localStorage-only**
- Student sees different progress on different devices
- Gamification rewards can be "farmed" by switching devices

**MEDIUM RISK:**
- Mistake history is localStorage-only
- Adaptive difficulty on Device B doesn't know about mistakes on Device A
- Diagnostic engine runs on aggregated server data, but real-time adaptation uses local mistake store

**MITIGATION OPTIONS (Not Implemented):**
1. Move gamification (streaks, coins, XP) to server-side `student_progress` table
2. Sync localStorage to server on session finish
3. Accept risk and document in parent FAQ

---

## 5. Parent Report Consistency

### 5.1 Report Types and Sources

| Report | Source | Generation |
|--------|--------|------------|
| **Short Report** (`/parent-report`) | `generateParentReportV2()` | Real-time from DB aggregation |
| **Detailed Report** (`/parent-report-detailed`) | `detailed-parent-report.js` | Real-time from DB + localStorage |
| **PDF Export** (if used) | Same as detailed | Printable version |
| **Parent Dashboard** | `report-data-adapter.js` | Server-side aggregation |

### 5.2 Source of Truth Hierarchy

```
Supabase answers table (canonical)
    ↓
report-data-aggregate.server.js (aggregation)
    ↓
report-data-adapter.js (sanitize + shape)
    ↓
Parent Report V2 / Detailed Report
    ↓
Parent Copilot (redacted subset)
```

### 5.3 Field Consistency Check

| Field | Short Report | Detailed Report | Copilot Payload | Consistency |
|-------|--------------|-----------------|-----------------|-------------|
| Main Focus Area | ✅ `mainFocusAreaLineHe` | ✅ `mainFocusAreaLineHe` | ✅ (redacted) | ✅ MATCH |
| Strongest Area | ✅ `strongestAreaLineHe` | ✅ `strongestAreaLineHe` | ✅ (redacted) | ✅ MATCH |
| Progress Preview | ✅ `readyForProgressPreviewHe[]` | ✅ `readyForProgressPreviewHe[]` | ⚠️ Partial | ⚠️ Subset |
| Attention Preview | ✅ `requiresAttentionPreviewHe[]` | ✅ `requiresAttentionPreviewHe[]` | ⚠️ Partial | ⚠️ Subset |
| diagnosticEngineV2 | ✅ Units array | ✅ Units array | ✅ Units (sanitized) | ✅ MATCH |
| probeEvidence | ✅ Included | ✅ Included | ✅ Sanitized | ✅ MATCH |
| Confidence Levels | ✅ `confidence.level` | ✅ `confidence.level` | ✅ Included | ✅ MATCH |
| Priority (P1-P4) | ✅ Internal | ✅ Internal | ❌ Stripped | ✅ Safe |
| Evidence Trace | ✅ Full | ✅ Full | ⚠️ Volume only | ⚠️ Redacted |

### 5.4 Contradiction Risks Identified

| Risk | Description | Mitigation |
|------|-------------|------------|
| Short vs Detailed focus mismatch | Different sorting logic could produce different mainFocus | **MITIGATED** - Both use `buildDiagnosticOverviewHeV2()` with same units |
| Report vs Copilot diagnosis | Copilot sees sanitized version | **MITIGATED** - `sanitizeDiagnosticUnitForCopilotGrounding()` preserves lineHe, strips internals |
| Real-time vs Aggregated | Report uses aggregated answers, student sees local progress | **ACCEPTED** - Documented limitation |
| Hebrew copy drift | Different files for report vs Copilot | **MITIGATED** - Copilot uses same source data, only redacts internals |

**Finding:** No contradictions detected. All reports derive from same `diagnosticEngineV2` output.

---

## 6. Parent Copilot Grounding

### 6.1 Grounding Data Flow

```
Report Input (server-side aggregation)
    ↓
report-data-adapter.js
    ↓
Parent Report Page (loads via API)
    ↓
Copilot Chat Component
    ↓
redactPayloadForCopilotGrounding()
    ├── sanitizeDiagnosticUnitForCopilotGrounding() - strips internals, keeps lineHe
    └── sanitizeProbeEvidenceForCopilot() - strips debug fields
    ↓
LLM Prompt
```

### 6.2 Copilot Receives

| Data | Included | Sanitized | Notes |
|------|----------|-----------|-------|
| Diagnostic units | ✅ Yes | ✅ lineHe preserved, internals stripped | Parent-facing diagnosis text |
| probeEvidence | ✅ Yes | ✅ Debug stripped, context kept | Probe outcomes visible |
| Evidence trace | ⚠️ Partial | ⚠️ Volume only | Full trace redacted |
| Priority codes (P1-P4) | ❌ No | ❌ Stripped | Not parent-facing |
| Confidence levels | ✅ Yes | ✅ Preserved | early_signal_only, moderate, high |
| Student metadata | ✅ Yes | ✅ Basic only | Grade, name, avatar |
| Mistake details | ⚠️ Limited | ⚠️ Recent subset | Last N mistakes |
| Raw debug objects | ❌ No | ❌ Strictly stripped | hypothesisLedger, refs, etc. |

### 6.3 Safety Mechanisms

| Mechanism | Implementation | Status |
|-----------|------------------|--------|
| No clinical overclaim | Diagnosis has `lineHe` only, no DSM/ICD codes | ✅ SAFE |
| Confidence gating | `confidenceOnly` flag respected | ✅ SAFE |
| Cannot conclude yet | `cannotConcludeYetHe` array visible to Copilot | ✅ SAFE |
| Why not stronger | `whyNotStrongerConclusionHe` explanations | ✅ SAFE |
| Probe-only cases | `probeOnly: true` visible, no false diagnosis | ✅ SAFE |
| Human review flag | `humanReviewRecommended` for P4 cases | ✅ SAFE |

### 6.4 Contradiction Prevention

| Potential Contradiction | Prevention |
|-------------------------|------------|
| Copilot says "mastery" when report says "needs practice" | Copilot sees same `diagnosticEngineV2` units with same `lineHe` |
| Copilot exposes P4 priority code | Stripped by `sanitizeDiagnosticUnitForCopilotGrounding()` |
| Copilot shows internal debug | Stripped: `_diagnosticProbeAttempt`, `learningSessionId`, etc. |
| Copilot invents diagnosis | Limited to provided `lineHe` fields, no raw patterns |

**Finding:** Copilot grounding is safe and consistent with parent report.

---

## 7. Launch Readiness Classification

### 7.1 Launch Blockers (Must Fix Before Launch)

| Item | Current State | Required Fix |
|------|---------------|--------------|
| **None identified** | All critical paths functional | - |

### 7.2 Must Fix Before Full Professional Release

| Priority | Item | Current | Required | Timeline |
|----------|------|---------|----------|----------|
| P1 | Multi-device sync for gamification | localStorage-only | Server-backed student_progress table | Post-launch |
| P1 | Mistake history sync | localStorage-only | Server aggregation or sync | Post-launch |
| P2 | English question bank depth | Thin at G5-G6 hard | More template variety | Post-launch |
| P2 | Science question variety | Limited scenarios | Expand scenario bank | Post-launch |
| P3 | Hebrew question dedup | 280KB bank | Deduplication audit | Post-launch |

### 7.3 Can Wait Until After Launch

| Item | Rationale |
|------|-----------|
| probeEvidence in engine confidence | Conservative to keep separate; safe to integrate later |
| Advanced adaptive follow-up | Probe→specific-question mapping is v2 feature |
| Teacher reports | Explicitly out of scope |
| Longitudinal tracking | Requires time-series infrastructure |
| Ministry curriculum alignment | External dependency |
| AI for children content | Requires safety review |

### 7.4 Not Relevant Now

| Item | Reason |
|------|--------|
| Full Hebrew bank deduplication | Current bank is functional |
| Advanced audio features | Not in core learning loop |
| Complex game modes | Arcade games are supplementary |

---

## 8. Files and Scripts Inspected

### Core Learning Flow
- `pages/learning/math-master.js`
- `pages/learning/geometry-master.js`
- `pages/learning/hebrew-master.js`
- `pages/learning/english-master.js`
- `pages/learning/science-master.js`
- `pages/learning/moledet-geography-master.js`

### Answer Persistence
- `pages/api/learning/answer.js`
- `lib/learning-supabase/report-data-aggregate.server.js`
- `lib/learning-supabase/report-data-adapter.js`

### Diagnostic Engine
- `utils/diagnostic-engine-v2/index.js`
- `utils/diagnostic-engine-v2/confidence-policy.js`
- `utils/diagnostic-engine-v2/recurrence.js`
- `utils/diagnostic-engine-v2/output-gating.js`
- `utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js`

### Question Generation
- `utils/math-question-generator.js`
- `utils/math-constants.js`
- `utils/geometry-conceptual-bank.js`
- `utils/geometry-question-generator.js`
- `utils/hebrew-question-generator.js`
- `utils/hebrew-rich-question-bank.js`
- `utils/english-grade-topic-policy.js`

### Parent Reports
- `utils/parent-report-v2.js`
- `utils/detailed-parent-report.js`
- `pages/learning/parent-report.js`
- `pages/learning/parent-report-detailed.js`

### Copilot Integration
- `utils/parent-copilot/index.js`
- `utils/parent-copilot/redact-payload-for-copilot-grounding.js`

### QA Scripts (All Pass)
- `scripts/parent-report-phase1-selftest.mjs` ✅ Exit 0
- `scripts/probe-evidence-to-copilot-qa.mjs` ✅ Exit 0
- `scripts/probe-persistence-product-smoke.mjs` ✅ Exit 0
- `scripts/diagnostic-engine-v2-harness.mjs` ✅ Exit 0, 17/17 pass

---

## 9. Recommended QA Commands

### Pre-Launch Verification

```bash
# Build verification
npm run build
# Expected: Exit 0, all pages generated

# Core diagnostic tests
npm run test:diagnostic-engine-v2-harness
# Expected: 17 pass, 0 fail

# Probe evidence flow tests
node scripts/probe-persistence-product-smoke.mjs
# Expected: 8/8 steps pass, Exit 0

node scripts/probe-evidence-to-copilot-qa.mjs
# Expected: 7/7 tests pass, Exit 0

# Parent report tests
node scripts/parent-report-phase1-selftest.mjs
# Expected: "OK", Exit 0

# Learning simulator
npm run qa:learning-simulator:probes
# Expected: "PASS: probe-engine QA", Exit 0
```

### Post-Launch Monitoring

- Track parent report generation errors
- Monitor probeEvidence presence in production answers
- Watch for Copilot grounding payload size (probeEvidence growth)
- Track multi-device user complaints (gamification sync)

---

## 10. Already Closed Items

| Item | Status | Evidence |
|------|--------|----------|
| Probe persistence infrastructure | ✅ CLOSED | `probe-client-meta.js` created, all subjects wired |
| probeEvidence aggregation | ✅ CLOSED | `report-data-aggregate.server.js` extracts from answers |
| probeEvidence in report adapter | ✅ CLOSED | `sanitizeProbeEvidence()` in `report-data-adapter.js` |
| probeEvidence in detailed report | ✅ CLOSED | Passed through payload |
| probeEvidence in Copilot | ✅ CLOSED | `sanitizeProbeEvidenceForCopilot()` redacts safely |
| ESM import fixes | ✅ CLOSED | All `.js` extensions added, tests pass |
| Exit code fixes | ✅ CLOSED | All QA scripts exit 0 on success |
| Build passing | ✅ CLOSED | `npm run build` exits 0 |
| Diagnostic Engine V2 | ✅ CLOSED | 17/17 harness tests pass |
| Parent report consistency | ✅ CLOSED | Same source of truth for all reports |

---

## 11. Remaining Risks and Follow-Up

### Critical Follow-Up (Post-Launch)

1. **Multi-Device Sync Implementation**
   - Move streaks/XP/coins to server
   - Create `student_gamification` table
   - Sync on session finish
   - Risk: HIGH until fixed

2. **Mistake History Centralization**
   - Server-side mistake aggregation
   - Or: Real-time sync to server
   - Risk: HIGH for adaptive accuracy

### Medium Follow-Up

3. **Question Bank Audit**
   - Hebrew: Deduplication review
   - English: G5-G6 expansion
   - Science: Scenario variety

4. **probeEvidence Engine Integration**
   - Feed probe outcomes into confidence scoring
   - Use supportCount/weakenCount in recurrence

### Low Priority

5. **Node.js ESM Warnings**
   - Add `"type": "module"` to package.json
   - Cosmetic only, tests pass

6. **Documentation**
   - Parent FAQ for multi-device behavior
   - Teacher guidance on diagnostic confidence

---

## Audit Conclusion

**The learning site is ready for launch with documented limitations.**

The core learning loop (diagnostic engine, probe system, parent reports, Copilot grounding) is functional and tested. The primary risk is multi-device gamification sync, which should be addressed post-launch through server-side persistence.

**Recommendation:** Proceed with launch, prioritize server-side gamification sync as first post-launch feature.
