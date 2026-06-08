# Diagnostic Flags Visible Impact Fix Plan

**Status:** Planning only — no implementation in this document.  
**Based on:** `docs/qa/DIAGNOSTIC_FLAGS_EXPECTED_IMPACT_AUDIT.md` + comparison artifacts (AAA1–AAA12, May–June 2026).  
**Production launch decision:** all diagnostic flags remain **OFF**.

---

## Problem statement

The diagnostic metadata engine **works internally** (subskill rollups, shadow gating, AAA4 active gating decision), but **parent-visible output is unchanged** across modes A/B/C/D. Before any visible activation, we need a **safe wiring plan** so flags can affect the parent report without leaking internal metadata or breaking launch invariants.

---

## A. Subskill visible options

### Option A1 — Shadow only for launch (recommended baseline)

| | |
| --- | --- |
| **Description** | Keep `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED=true` only in staging; public API and parent report unchanged. |
| **Risk** | **Low** — matches Q2-E.1 contract. |
| **Parent value** | None visible; engineering/QA traceability only. |
| **Report change** | None. |
| **Tests** | `parent-report-diagnostic-flags-comparison.mjs` — public A=B; internal B has `bySubSkill`. Sanitization/leak checks PASS. |

### Option A2 — Staging/debug surface only

| | |
| --- | --- |
| **Description** | Expose subskill breakdown in a **non-production** channel: QA JSON artifact, admin-only query param, or `meta.evidenceQuality._debug` gated by env (never in prod). |
| **Risk** | **Low–medium** — leak if env gate misconfigured. |
| **Parent value** | None for real parents; helps product/QA review grouping before copy decisions. |
| **Report change** | Staging UI only; prod unchanged. |
| **Tests** | Prod build: assert `_debug` / internal keys absent. Staging: snapshot internal grouping vs seed expectations. |

### Option A3 — Limited parent-visible subskill (post-launch candidate)

| | |
| --- | --- |
| **Description** | Show **at most one** parent-safe subskill hint per subject/topic when **all** gates pass: |
| | • diagnostic evidence ≥ 12 in range |
| | • recurring mistakes ≥ 2 distinct days |
| | • `metadataConfidenceCap` ∈ {high, medium} and `isMetadataWeak !== true` |
| | • no conflicting subskill signals (single dominant weak subskill) |
| | • **no new Hebrew strings** — reuse existing topic/subject labels only; no raw `skillId` / `subSkill` keys |
| **Risk** | **High** — copy, overdiagnosis, Hebrew review, PDF parity. |
| **Parent value** | Medium — finer “where to practice” without new diagnosis tier. |
| **Report change** | Possible addition to `weaknessTopics` or a new **sanitized** public field (e.g. `meta.evidenceQuality.byTopic[topic].focusSubSkillLabelHe`) — requires explicit product approval. |
| **Tests** | AAA8/AAA10/AAA11 with isolated seeds; before/after public snapshot; Hebrew inventory diff; PDF content verify; comparison A vs B on insights/weaknessTopics only. |

**Subskill recommendation for launch:** **Option A1** — shadow only. Revisit A3 only after gating fix (Section B) is proven in QA.

---

## B. Gating fix options

**Constraint:** Do **not** expose raw `_evidenceQuality`, `gatingDecisions`, `supportingEvidenceIds`, or rollups on the public API.

### Option B1 — Server-only gating before `parentFacing` (recommended)

| | |
| --- | --- |
| **Description** | Ensure `enrichPayloadWithParentFacing` always runs **after** `attachParentContextEvidenceQuality` with gating flags on, using the **full** payload (including `_evidenceQuality`) in-process. Apply gating by **filtering insight/recommendation generation**, not by mutating public eq counts. Extend `buildParentInsightsHe` / `buildHomeRecommendationsHe` to respect gating for **student-level** strong lines when any topic is suppressed (today only topic line is gated). |
| **Risk** | **Low** — no API shape change; client never needs `_evidenceQuality`. |
| **Leak risk** | None if strip unchanged. |
| **Visible effect** | Insights/homeRecommendations differ A vs C when gating fires; `meta.evidenceQuality` unchanged. |
| **Tests** | Compare `parentFacing.insights` A vs C per child; AAA4/AAA9 fixtures; sanitization unchanged. |

### Option B2 — Public-safe gating summary on `meta.evidenceQuality`

| | |
| --- | --- |
| **Description** | Add minimal public fields, e.g. per topic: `{ strongDiagnosisAllowed: false, gatingReason: "metadata_weak" }` or student-level `meta.evidenceQuality.gatingApplied: true` — **no** decision arrays, no evidence IDs. Client `applyServerParentFacingAuthorityToClientReport` reads these instead of `_evidenceQuality`. |
| **Risk** | **Medium** — new public contract; validator allow-list update; must not become metadata leak vector. |
| **Visible effect** | UI/PDF can suppress pattern diagnostics without internal meta. |
| **Tests** | Q2-D validator; leak scan; client rebuild with stripped payload + new public summary; regression on coins/minutes/sessions. |

### Option B3 — Stop client rebuild from re-deriving diagnosis

| | |
| --- | --- |
| **Description** | Treat server `parentFacing` + sanitized public eq as **authoritative**; reduce `generateParentReportV2` / `patternDiagnostics` influence when server says suppress (`shouldSuppressClientPatternDiagnostics` driven from public summary or server-only path). |
| **Risk** | **Medium** — touches report generation pipeline. |
| **Visible effect** | Detailed report / PDF align with server gating. |
| **Tests** | E2E PDF export AAA4/AAA9 modes A vs C; no strong diagnosis in PDF when gating applied. |

### Recommended approach

**Primary: B1** (server-only, no API extension) — smallest surface, fixes the core bug that gating decisions exist but don’t change emitted `parentFacing`.

**Optional follow-up: B2 + B3** — only if PDF/detailed engine still shows strong diagnosis after B1 (today `shouldSuppressClientPatternDiagnostics` is blind on client because `_evidenceQuality` is stripped).

**Explicit non-option:** Re-exposing `_evidenceQuality` on GET report-data.

---

## C. AAA4 / AAA9 expected behavior

### AAA4 — `D_preliminary_no_recurrence` (gating did fire internally)

**Current QA data (May–June, polluted):** student + topic `math::addition` at **`supported_diagnosis`**, d14; mode C `gatingDecisionCount=1`; public insights **identical** to A.

| Question | Answer |
| -------- | ------ |
| Should parent see a change when gating fires? | **Yes, but narrow** — not a change to `dataSufficiency` or diagnostic counts. |
| Expected visible change | **Suppression** of strong diagnosis signals: |
| | • Remove/block topic insight: `"כדאי לשים לב ל…"` for gated topic |
| | • Suppress client `patternDiagnostics` strong actions for that topic |
| | • Optionally soften student-level strong lines **only if** they derive solely from gated topic (product call) |
| **Not expected** | Lowering `confidence`, removing from `weaknessTopics` (public eq unchanged by design), changing coins/minutes/sessions |
| **QA note** | Scenario seed expects **preliminary**; polluted data elevated to supported → gating tests the wrong story. For QA: use **isolated tag-only seed** or accept AAA4 as “supported + weak metadata rollup” case. |

### AAA9 — `I_weak_metadata_suppression` (gating did **not** fire)

**Current data:** student `supported_diagnosis`, topic `math::fractions` **`preliminary_signal`**; mode C `gatingDecisionCount=0`.

| Question | Answer |
| -------- | ------ |
| Seed vs policy? | **Both misaligned with test intent.** Seed uses `weakTopicOnly` (low confidence). Shadow policy requires **topic `supported_diagnosis`** + weak groups for suppression candidate (`question-metadata-shadow-parent-gating.js` L156–179). |
| Should gating fire when topic is `preliminary_signal`? | **No** under current policy — preliminary topics are not “over-diagnosed” at topic tier; suppression targets **supported topic + weak metadata**. |
| Fix QA or code? | **Fix QA expectation first** — rename scenario to “weak metadata at supported topic” with seed that reaches topic supported, **or** add separate policy branch for “student supported / topic preliminary / metadata weak” (product decision, not launch). |
| Expected visible effect (when policy + seed align) | Mode C: fewer strong insights vs A; public eq unchanged. |

---

## D. AAA8 — promotion (deferred)

**Current:** `bySubSkillCount=2`, `promotionDecisionCount=0` all modes.

**Plan:** **Do not implement promotion visible fix before launch.** Requires isolated `H_questionType_contrast` seed, C1/C2 validation audit, and separate approval. No code changes in this phase.

---

## E. Minimal implementation plan (when approved)

### Files likely to change (gating B1 only)

| File | Change |
| ---- | ------ |
| `lib/parent-server/parent-report-parent-facing.server.js` | Apply gating to insight/recommendation paths; optional student-level suppression when all strong topics gated |
| `lib/learning/evidence-quality.js` | Ensure gating helpers used consistently; no public eq mutation |
| `lib/parent-server/parent-facing-report-authority.js` | If B2/B3: read public-safe flags instead of `_evidenceQuality` |
| `scripts/qa/parent-report-diagnostic-flags-comparison.mjs` | Diff `parentFacing.insights` / `homeRecommendations`; per-mode aggregate (already fixed) |

### Files must NOT change (launch invariants)

| Area | Files / behavior |
| ---- | ---------------- |
| Public eq thresholds | `resolveDataSufficiency`, Q1 counts |
| API strip | `stripInternalReportPayloadFields` — keep stripping `_evidenceQuality` |
| Scoring | coins, minutes, monthly progress aggregation |
| Hebrew copy | No new strings without copy review |
| UI/CSS | No layout changes in this phase |
| School | No classroom/school/backfill paths |

### Test plan (post-implementation)

1. **Flags comparison** — `parent-report-diagnostic-flags-comparison.mjs` on AAA1–AAA12, full range:
   - Public eq A=B for counts/sufficiency (still true)
   - **C ≠ A** on `parentFacing.insights` where gating fires (AAA4 minimum)
   - B ≠ A internal only; D deferred
2. **Sanitization** — no `_evidenceQuality`, rollups, leak keys in public payload
3. **Invariants** — coins, minutes, sessions, diagnosticAnswers unchanged across modes
4. **AAA9** — after QA expectation fix: either gating fires with corrected seed or documented no-op
5. **Optional PDF** — A vs C PDF text diff for AAA4 only (no new Hebrew)

### Leak checklist

- Public payload must not contain: `bySubSkill`, `gatingDecisions`, `promotionDecisions`, `supportingEvidenceIds`, `_canonicalMeta`, `_diagnostic*Rollup`
- Any new public gating summary (if B2) must pass Q2-D validator allow-list review

---

## F. Recommendation (single clear path)

| Decision | Recommendation |
| -------- | -------------- |
| **Before launch** | **Do not enable any flag in production.** |
| **Subskill (B)** | **Shadow only** — no parent-visible subskill for launch. |
| **Gating (C)** | **Fix wiring (Option B1) in a follow-up PR**, then re-run comparison with `parentFacing` diffs; **do not** enable in prod until AAA4 shows visible suppression and AAA9 expectation is clarified. |
| **Promotion (D)** | **Defer** — no implementation; fix seeds/policy separately later. |
| **Visible effect before launch?** | **No** — not worth launch risk. Ship baseline parent report (flags OFF). Implement B1 post-launch or in staging-only trial with explicit sign-off. |

**Priority order if implementing later:**

1. Fix gating server-side visible path (B1) + comparison test for insights diff  
2. Clarify AAA9 QA scenario vs policy (documentation + isolated seed)  
3. Re-evaluate subskill visible (A3) only with Hebrew/copy approval  
4. Promotion last (AAA8 isolated program)

---

## References

- Audit: `docs/qa/DIAGNOSTIC_FLAGS_EXPECTED_IMPACT_AUDIT.md`
- Comparison: `docs/qa/PARENT_REPORT_DIAGNOSTIC_FLAGS_COMPARISON.md`
- Q2-E plan: `docs/diagnostics/QUESTION_METADATA_Q2_E_CONSUMPTION_PLAN.md`
- Artifacts: `docs/qa/_artifacts/parent-report-diagnostic-flags-comparison/`

---

## Out of scope (this plan)

- Parent Report Launch QA (regular)
- New QA seeds (except documenting need for isolated AAA4/AAA9)
- School simulation / classroom / backfill
- UI/CSS/Hebrew copy changes
- commit / push / deploy
