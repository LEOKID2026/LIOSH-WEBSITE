# Diagnostic Flags Expected Impact Audit

**Generated:** 2026-06-08  
**Scope:** Read-only code trace + existing comparison artifacts (AAA1–AAA12, May–June 2026).  
**No code fixes, no DB mutations, no deploy in this audit.**

---

## Executive summary

A/B/C/D are **identical on parent-visible structured fields** by design for mode **B**, and largely by **architecture + narrow wiring** for **C/D** — not because the engine is inert.

| Finding | Verdict |
| -------- | -------- |
| Subskill flag (B) | **Shadow only** — works internally; public API intentionally unchanged (Q2-E.1) |
| Gating flag (C) | **Partially wired** — internal decisions fire (AAA4); public `evidenceQuality` unchanged; parent-facing impact is **minimal/narrow** and did not diff in comparison |
| Promotion flag (D) | **No decisions fired** in current QA data (AAA8); not ready for visible activation |
| AAA9 weak-metadata scenario | **Seed/policy mismatch** — suppression gate requires topic `supported_diagnosis`; actual topic is `preliminary_signal` |
| UI/PDF client path | **Gating/promotion signals stripped** from API (`_evidenceQuality` removed); client `patternDiagnostics` suppression cannot see gating without internal meta |

**Recommendation:** Keep all flags **OFF** for launch. **B** is safe as shadow-only trial. **C/D** need explicit product decision + isolated seed + visible-diff test plan before activation — treat as **bug/gap before visible activation**, not “flags unnecessary.”

---

## 0. Prior task stop report (Parent Report Launch QA)

User stopped `PARENT_REPORT_LAUNCH_QA` before completion.

| Item | Status |
| ---- | ------ |
| Launch QA script created | `scripts/qa/parent-report-launch-qa.mjs` |
| June week seed script created | `scripts/qa/parent-report-launch-qa-june-week-seed.mjs` |
| `parent-report-q2e-monthly-simulation.mjs` | Added exports: `gradeDbKey`, `buildAnswerSchedule`, `insertPracticeSession` |
| **DB mutation** | **Yes** — `parent-report-launch-june-week-v1` seed ran once: AAA2–AAA12 got 4 answers each on 2026-06-06/08; AAA1 skipped |
| Launch QA artifacts | Only `docs/qa/_artifacts/parent-report-launch-qa/june-week-seed-results.json` |
| `PARENT_REPORT_LAUNCH_QA.md` | **Not created** (run interrupted) |
| commit/push/deploy | **None** |

If the June week seed pollutes future QA, clean with:

`node --env-file=.env.local scripts/qa/parent-report-launch-qa-june-week-seed.mjs --clean-only`

(tag-scoped only; no school data).

---

## 1. Full pipeline trace

```text
ENV flags (diagnostic-metadata-subskill-flag.js)
  DIAGNOSTIC_METADATA_SUBSKILL_ENABLED
  DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED
  DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED
        │
        ▼
aggregateParentReportPayload (report-data-aggregate.server.js)
  • When subskill ON: builds _diagnosticSubSkillRollup (+ questionType/pedagogy rollups)
  • resolveCanonicalMetadataFromAnswerSnapshot on diagnostic answers
  • Public subjects/summary/recentMistakes built regardless of flags
        │
        ▼
attachParentContextEvidenceQuality (evidence-quality.js)
  • publicView → meta.evidenceQuality (sanitized: sufficiency, confidence, counts only)
  • internal → meta._evidenceQuality (bySubSkill, errorPatterns, shadow/gating/promotion)
  • B: internalBySubSkill + shadowParentGating (analysis only)
  • C: applyActiveParentGating → gatingDecisions (does NOT mutate publicView fields)
  • D: validateShadowPromotionCandidates + applyActiveParentPromotion → promotionDecisions
        │
        ▼
enrichPayloadWithParentFacing (parent-report-parent-facing.server.js)
  • buildParentInsightsHe / buildHomeRecommendationsHe
  • Uses allowsStrongParentDiagnosisAtStudent (Q1 public eq only)
  • Uses allowsStrongParentTopicInsight → reads _evidenceQuality.gatingDecisions when C ON
  • Does NOT read promotion for most insight lines
        │
        ▼
stripInternalReportPayloadFields (report-data-aggregate.server.js)
  • Removes meta._evidenceQuality, rollups, _canonicalMeta from recentMistakes
  • Keeps meta.evidenceQuality (public) + parentFacing (already computed)
        │
        ▼
GET report-data API (pages/api/parent/students/[studentId]/report-data.js)
  • Returns stripped JSON to client
        │
        ▼
Client UI / PDF rebuild
  • buildReportInputFromDbData → localStorage shim → generateParentReportV2
  • applyServerParentFacingAuthorityToClientReport
      - shouldSuppressClientPatternDiagnostics reads _evidenceQuality — **absent on client payload**
  • Detailed report / PDF may still show engine diagnoses independent of gating unless suppressed
```

### Key files

| Stage | File |
| ----- | ---- |
| Flags | `lib/learning/diagnostic-metadata-subskill-flag.js` |
| Metadata at answer | `lib/learning/question-metadata-resolve-at-answer.js` |
| Rollups in aggregate | `lib/parent-server/report-data-aggregate.server.js` (~L92–170, ~L1478–1504) |
| Evidence quality | `lib/learning/evidence-quality.js` |
| Shadow gating | `lib/learning/question-metadata-shadow-parent-gating.js` |
| Active gating | `lib/learning/question-metadata-active-parent-gating.js` |
| Promotion validation | `lib/learning/question-metadata-promotion-validation.js` |
| Active promotion | `lib/learning/question-metadata-active-parent-promotion.js` |
| Parent insights | `lib/parent-server/parent-report-parent-facing.server.js` |
| Client authority | `lib/parent-server/parent-facing-report-authority.js` |
| API strip | `lib/parent-server/report-data-aggregate.server.js` `stripInternalReportPayloadFields` |
| Planned scope | `docs/diagnostics/QUESTION_METADATA_Q2_E_CONSUMPTION_PLAN.md` |

---

## 2. Per-flag expected impact

| Flag | Intended impact (per Q2-E plan + code) | Parent-visible? | Observed in comparison |
| ---- | ------------------------------------- | --------------- | ------------------------ |
| **B — SUBSKILL** | Internal `bySubSkill`, errorPatterns, questionTypes in `_evidenceQuality`; rollups in aggregate | **No** — explicit Q2-E.1 non-goal | Internal diff only (10/12 children); public identical ✓ |
| **C — GATING** | Conservative **suppression** of strong topic diagnosis / pattern diagnostics when metadata weak | **Maybe** — suppression only, no new copy, no public eq shape change | AAA4: `gatingDecisionCount=1` internal; public eq + insights **unchanged** |
| **D — PROMOTION** | Allow strong topic insight on **preliminary** topics when validated high-confidence recurrence | **Maybe** — narrow allow path | **Zero** `promotionDecisions` all children |

---

## 3. Why A/B/C/D are identical (parent-visible)

### 3.1 By design (B)

Q2-E.1 explicitly requires **zero public API diff** when subskill is enabled. Public `meta.evidenceQuality` is built from Q1 `publicView` before any internal metadata attachment. Comparison correctly shows B = A on all public fields.

### 3.2 Architecture (C/D)

1. **`applyActiveParentGating` / `applyActiveParentPromotion` do not write to `publicView`** — they only append to `internal` (`gatingDecisions`, `promotionDecisions`).
2. **Public sufficiency/confidence/counts are Q1-only** — flags were never wired to downgrade `dataSufficiency` on the public snapshot.
3. **Parent-facing changes are narrow:**
   - Block topic line: `"כדאי לשים לב ל…"` via `allowsStrongParentTopicInsight`
   - Block client `patternDiagnostics` via `shouldSuppressClientPatternDiagnostics` — but client API payload ** lacks `_evidenceQuality`**, so this path is **broken for browser rebuild** unless server `parentFacing` already encoded suppression.
4. **Student-level insights stay on** when student scope is `supported_diagnosis` — gating at topic scope does not remove `"יש טעויות חוזרות ב…"`, `"נראה שיש שיפור…"`, etc.
5. **Comparison snapshot** compares structured public fields; even when internal gating fires, if the suppressed line was never emitted in mode A, **A = C**.

### 3.3 First comparison bug (fixed)

Initial comparison aggregated **once** with flags off, so B/C/D had no rollups. Re-run with **per-mode aggregate** confirmed internal subskill + AAA4 gating. Public still identical — confirms design/narrow wiring, not empty engine.

---

## 4. AAA4 deep dive — gating fired, parent saw nothing

**Scenario:** `D_preliminary_no_recurrence` (seed expects preliminary; polluted May data → supported at topic).

**Full range public (mode A = C):**

| Field | Value |
| ----- | ----- |
| Student sufficiency | `supported_diagnosis` |
| Topic `math::addition` | `supported_diagnosis`, d14 |
| `weaknessTopics` | `[]` |
| `parentFacing.insights` | identical A/C/D (3 lines incl. english mistakes from polluted recentMistakes) |

**Mode C internal:**

| Field | Value |
| ----- | ----- |
| `hasBySubSkill` | true (1 group) |
| `hasAppliedGating` | true |
| `gatingDecisionCount` | 1 |

**Why parent-visible unchanged:**

1. Gating decision targets **topic strong diagnosis**, not public eq fields.
2. Insights use **student gate** (`allowsStrongParentDiagnosisAtStudent`) for mistake/improvement lines — still allowed.
3. Topic-specific line `"כדאי לשים לב ל…"` likely **never emitted** (`weaknessTopics` empty; weak-topic rank may not hit gated topic).
4. **Not AAA9** — gating here is on addition/supported topic with weak metadata rollup, not weak-metadata suppression scenario.

**Conclusion:** Engine works internally; **visible activation gap** = suppression doesn't surface as eq downgrade or distinct insight removal in this data shape.

---

## 5. AAA9 deep dive — weak metadata suppression did not fire

**Scenario:** `I_weak_metadata_suppression` — seed uses `META.weakTopicOnly` (low confidence, topic-level rollup).

**Full range public:**

| Field | Value |
| ----- | ----- |
| Student | `supported_diagnosis` (d14) |
| Topic `math::fractions` | **`preliminary_signal`** (not supported) |
| Mode C gating | **none** (`gatingDecisionCount: 0`) |

**Shadow policy** (`question-metadata-shadow-parent-gating.js` L156–179):

Suppression candidate requires **`q1Suff === supported_diagnosis`** at topic **and** weak metadata groups (topic-only rollup / low cap / all weak).

AAA9 topic is **`preliminary_signal`** → shadow suppression branch **never runs**.

**Additional factors:**

- Mixed QA seeds (realistic monthly + may-june) inflate totals; weak-metadata tag answers are a subset.
- `weakTopicOnly` metadata → `groupingLevel: "topic"`, `metadataConfidenceCap: "low"` — fits weak pattern but **wrong Q1 tier gate**.

**Conclusion:** **Seed/scenario mismatch**, not proven engine bug. Q2E test assumed supported topic + weak metadata; live data has **supported student / preliminary topic**. Need **isolated AAA9 seed** with topic-level supported + weak metadata to validate C.

---

## 6. AAA8 deep dive — subskill groups, no promotion

**Scenario:** `H_questionType_contrast` — technical (stable) vs word_problem (weak) segments.

**Full range (mode D):**

| Field | Value |
| ----- | ----- |
| Student | `supported_diagnosis` |
| Topic `math::fractions` | `preliminary_signal` |
| Internal | `bySubSkillCount: 2`, `promotionDecisionCount: 0` |

**Promotion chain:**

1. Shadow candidate: preliminary topic + strong subskill recurrence (`shadow-parent-gating.js` L203+).
2. C1 validation: `validateShadowPromotionCandidates`.
3. C2 policy: `passesC2PromotionPolicy` — requires preliminary topic, high cap, subSkill grouping (not topic-only), recurrence met, effective confidence ≥ moderate.

**Likely rejection reasons (code-level, not DB):**

- Word-problem group may not meet **recurrence across days** after caps.
- `metadataConfidenceCap` not `high` on weak segment after `applyMetadataConfidenceCapsToBySubSkill`.
- Data pollution merges segments → shadow/validation no-op.
- Student supported + topic preliminary: promotion only lifts **topic insight**, not eq — still might not change compared insight set.

**Conclusion:** **Policy strict + data shape** explain zero promotions; need isolated AAA8 run with Q2E monthly sim verify (`mode D` check in `parent-report-q2e-monthly-simulation.mjs`) on **clean tag-only data**.

---

## 7. Seed vs bug matrix

| Case | Seed issue? | Code/wiring issue? |
| ---- | ----------- | ------------------- |
| B identical public | No — expected | No |
| C no public eq change | N/A | **By design** — gating doesn't mutate publicView |
| C no insight diff AAA4 | Partial — no topic insight line to suppress | Narrow insight wiring |
| C AAA9 no gating | **Yes** — topic not supported | Policy gate correct per code |
| D no promotion AAA8 | **Likely** — recurrence/caps on polluted data | C2 policy intentionally strict |
| Client UI gating | N/A | **Gap** — `_evidenceQuality` stripped before client; `shouldSuppressClientPatternDiagnostics` blind on client rebuild |

---

## 8. Comparison artifact reference

Source: `docs/qa/_artifacts/parent-report-diagnostic-flags-comparison/`

| Metric | Result |
| ------ | ------ |
| Matrix | 48/48 PASS (12 children × 4 ranges) |
| Public A→B/C/D | **Zero diffs** all structured fields |
| Internal A→B | 10 children gain `bySubSkill` |
| Internal A→C | **AAA4 only** gains gating (+ subskill on same 10) |
| Internal A→D | Same as C; **no promotion anywhere** |

Machine summary: `docs/qa/_artifacts/diagnostic-flags-expected-impact/audit-summary.json`

---

## 9. Recommendations

| Flag | Recommendation |
| ---- | -------------- |
| All flags production launch | **Keep OFF** (user decision — correct) |
| **B — Subskill** | **Shadow only** — safe for staging/internal QA; public diff must remain zero |
| **C — Gating** | **Bug/gap before visible activation** — internal fires but parent-visible effect is unproven/narrow; fix client `_evidenceQuality` dependency OR encode suppression only in server `parentFacing`; re-test AAA9 with **correct seed** |
| **D — Promotion** | **Postpone** — zero decisions on current data; requires clean AAA8 fixture + explicit visible acceptance criteria |
| QA process | Re-run comparison with **tag-isolated seeds** per scenario; add **`parentFacing.insights` diff** to comparison, not only public eq |
| Launch QA task | **Stopped** — do not continue until C/D impact is understood and approved |

---

## 10. Explicit non-actions (this audit)

- No school simulation / classroom / backfill
- No new seeds (except noting existing june-week seed from stopped task)
- No product code changes
- No commit / push / deploy
