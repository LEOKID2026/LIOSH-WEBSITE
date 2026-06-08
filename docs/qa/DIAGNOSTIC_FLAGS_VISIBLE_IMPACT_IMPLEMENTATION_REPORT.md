# Diagnostic Flags Visible Impact — Implementation Report

**Date:** 2026-06-08  
**Status:** Code implemented; **production flags remain OFF** pending sign-off.  
**Scope:** Parent report diagnostic flags only — no school/classroom data touched.

---

## 1. What was implemented

### Phase 0 — Seed env bug fix

Fixed `QA_PARENT_SEED_*` being read at module import time (before env was set):

- `scripts/qa/parent-report-launch-qa-june-week-seed.mjs` — dynamic import after env setup
- `scripts/qa/parent-report-qa-may-june-seed.mjs` — same pattern

Future `--clean-only` / seed runs use the correct tag/meta key, not the Q2E default.

### Phase 1 — Server-side gating (Option B1)

Extended server `parentFacing` generation to respect active gating **before** API strip:

- `shouldSoftenStudentLevelParentInsights` — removes strong student-level lines when gating suppresses all actionable weak topics
- `parentFacing.gatingApplied` / `parentFacing.diagnosisSuppressed` — public-safe flags (no `_evidenceQuality`, no decision arrays)
- Existing `allowsStrongParentTopicInsight` gating path now produces visible A≠C diffs (e.g. suppresses `"כדאי לשים לב ל…"`)

**Unchanged by design:** `diagnosticAnswers`, coins, minutes, `meta.evidenceQuality` public thresholds.

### Phase 2 — Subskill visible (limited)

New module wires internal `bySubSkill` → public-safe hints when strict gates pass:

- `parentFacing.practiceFocus[]` — `{ topicLabelHe, focusLabelHe }` only
- Insight lines (existing Hebrew templates): `"נושא לחיזוק: …"`, `"מוקד לתרגול: …"`
- Labels from existing taxonomy bridge (`topicLabelHe` + `TAXONOMY_BY_ID.subskillHe`)
- **Not shown:** raw keys, `skillId`, `metadataConfidence`, `_evidenceQuality`, `bySubSkill`, `supportingEvidenceIds`
- **Conflict rule:** 2+ subSkill-level groups on same topic → no visible focus

### Phase 3 — Promotion isolated fixture

- Fixture `PROMOTE-STRONG` on AAA5 (tag `parent-report-diagnostic-visible-impact-v1`)
- Mode D: `promotionDecisionCount = 1` in isolated window `2026-05-04..2026-05-11`
- No production promotion activation

### Phase 4 — Comparison script

Updated `scripts/qa/parent-report-diagnostic-flags-comparison.mjs` to diff:

- `parentFacingInsights`, `parentFacingHomeRecommendations`
- `parentFacingPracticeFocus`, `gatingApplied`, `diagnosisSuppressed`
- Added `visibleImpact` summary + `--seed-visible-impact` flag

### Phase 5 — QA fixtures

| Fixture | Child | Tag | Isolated window |
| --- | --- | --- | --- |
| GATE-LOW | AAA9 | `parent-report-diagnostic-visible-impact-v1` | 2026-05-10..18 |
| SUBSKILL-FOCUS | AAA10 | same | 2026-05-06..20 |
| SUBSKILL-CONFLICT | AAA8 | same | 2026-05-20..24 |
| PROMOTE-STRONG | AAA5 | same | 2026-05-04..11 |

Scripts:

- `scripts/qa/parent-report-diagnostic-visible-impact-seed.mjs`
- `scripts/qa/parent-report-diagnostic-visible-impact-verify.mjs`

---

## 2. Files changed

| File | Change |
| --- | --- |
| `lib/parent-server/parent-report-diagnostic-visible.server.js` | **New** — gating soften, practice focus, public flags |
| `lib/parent-server/parent-report-parent-facing.server.js` | Wire visible gating + subskill into `parentFacing` |
| `scripts/qa/parent-report-launch-qa-june-week-seed.mjs` | Dynamic import env fix |
| `scripts/qa/parent-report-qa-may-june-seed.mjs` | Dynamic import env fix |
| `scripts/qa/parent-report-q2e-monthly-simulation.mjs` | Export `META` for fixture seeds |
| `scripts/qa/parent-report-diagnostic-flags-comparison.mjs` | Extended public diff + visibleImpact |
| `scripts/qa/parent-report-diagnostic-visible-impact-seed.mjs` | **New** — isolated fixtures |
| `scripts/qa/parent-report-diagnostic-visible-impact-verify.mjs` | **New** — narrow-window verify |

---

## 3. Visible behavior (summary)

| Mode | Visible effect |
| --- | --- |
| **A** | Baseline — no metadata flags |
| **B** | Internal `bySubSkill` + optional `practiceFocus` / focus insight lines when gates pass |
| **C** | B + gating suppresses strong topic/student insights; `gatingApplied: true` |
| **D** | C + internal promotion decisions (fixture only); topic insight promotion when student gate alone would block |

---

## 4. A/B/C/D comparison (before → after)

### Before (prior audit)

- Public A=B=C=D for all AAA children
- Internal shadow only (`bySubSkill`, `gatingDecisions` stripped from API)

### After — full range (May–June, polluted AAA data)

| Pair | Public diff | Notes |
| --- | --- | --- |
| A→B | Mostly none on full range | Subskill visible when isolated window + gates pass |
| A→C | **AAA4** full range | Strong insights removed; `gatingApplied: true` |
| A→D | Same as C where gating applies | Promotion internal on AAA5 fixture window only |

**Sanitization:** PASS=48/48 — no `_evidenceQuality`, no leak keys in public payload.

### After — isolated fixture verify (`visible-impact-fixture-verify.json`)

| Fixture | B | C | D |
| --- | --- | --- | --- |
| GATE-LOW | internal bySubSkill ✓ | **A≠C insights** ✓ gating ✓ | gating ✓ |
| SUBSKILL-FOCUS | **practiceFocus + insight lines** ✓ | — | — |
| SUBSKILL-CONFLICT | **no practiceFocus** ✓ (2 groups) | — | — |
| PROMOTE-STRONG | internal bySubSkill ✓ | — | **promotionDecisionCount=1** ✓ |

---

## 5. Examples

### Subskill visible (AAA10, mode B, window 2026-05-06..20)

```json
"practiceFocus": [{ "topicLabelHe": "דקדוק", "focusLabelHe": "סממן זמן" }]
```

Insights include:

```text
נושא לחיזוק: דקדוק
מוקד לתרגול: סממן זמן
```

### Gating suppression (AAA9 GATE-LOW, mode C)

**A:**

```text
נראה שיש קושי במתמטיקה…
הביצועים הכלליים…
כדאי לשים לב לשברים — זה נושא שחוזר בתרגולים.
```

**C:**

```text
יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע.
```

`gatingApplied: true`, `diagnosisSuppressed: true`, `gatingDecisionCount: 1`

### Promotion fixture (AAA5 PROMOTE-STRONG, mode D, window 2026-05-04..11)

- `promotionDecisionCount: 1`
- Public insights unchanged in this window (student already passes strong-diagnosis gate from mistakes)
- Promotion path validated internally; visible topic-insight promotion requires student-level insufficient + validated subskill recurrence (see unit tests)

---

## 6. Safety

| Check | Result |
| --- | --- |
| No `_evidenceQuality` on public API | PASS |
| No `bySubSkill` / `gatingDecisions` / `promotionDecisions` / `supportingEvidenceIds` | PASS |
| No school/classroom scope | PASS (parent-context seeds only) |
| Coins / minutes / monthly progress invariant A=B=C=D | PASS |
| `diagnosticAnswers` / public eq thresholds unchanged | PASS |
| Metadata consumption tests | 88/88 PASS |
| Evidence-quality layer tests | 14/14 PASS |
| Diagnostic truth unit | PASS |

---

## 7. Activation recommendation

| Flag | Recommend now? | Rationale |
| --- | --- | --- |
| **Subskill visible (B)** | Staging trial after isolated PASS | SUBSKILL-FOCUS fixture PASS; full-range still dominated by legacy AAA pollution |
| **Gating visible (C)** | Staging trial after isolated PASS | GATE-LOW + AAA4 full-range show real A≠C suppression |
| **Promotion (D)** | **No** — fixture only | Decision fires in PROMOTE-STRONG window; no safe public diff yet when student gate already open |

**Production:** keep all three flags **OFF** until product sign-off on Hebrew copy and PDF parity.

---

## 8. Remaining before production activation

1. PDF / detailed report client path — ensure `applyServerParentFacingAuthorityToClientReport` uses new `diagnosisSuppressed` (B3 follow-up if PDF still shows strong diagnosis)
2. Clean or isolate AAA May–June pollution for full-range comparison clarity
3. PROMOTE-STRONG: tune seed so mode D shows visible topic-insight diff (student preliminary + promotion) or document as internal-only trial
4. Product approval for `practiceFocus` Hebrew lines (reuses taxonomy labels only — no new copy authored)
5. Explicit env flag rollout plan (staging → canary → prod)

---

## Artifacts

- `docs/qa/_artifacts/diagnostic-flags-visible-impact/visible-impact-seed-results.json`
- `docs/qa/_artifacts/diagnostic-flags-visible-impact/visible-impact-fixture-verify.json`
- `docs/qa/_artifacts/parent-report-diagnostic-flags-comparison/comparison-full.json` (regenerated)

## Commands run

```bash
node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-seed.mjs
node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-verify.mjs
node --env-file=.env.local scripts/qa/parent-report-diagnostic-flags-comparison.mjs --verify-only
node --test tests/learning/evidence-quality-layer.test.mjs
node --test tests/learning/question-metadata-consumption.test.mjs
node --test scripts/tests/diagnostic-report-truth-fix-unit.mjs
npm run build
```
