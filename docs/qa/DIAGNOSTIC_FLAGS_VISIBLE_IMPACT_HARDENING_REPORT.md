# Diagnostic Flags Visible Impact — Hardening Report (Phase 2)

**Date:** 2026-06-08  
**Scope:** Verification & review only — **no production flag activation**, no commit/push/deploy.  
**Implementation frozen:** no new features, no Hebrew/UI/CSS changes, no school/classroom work.

---

## 1. Tests & build

| Command | Result | Notes |
| --- | --- | --- |
| `npm run build` | **FAIL** | Pre-existing webpack error: duplicate `HEBREW_G2_GAP_POOL` in `data/hebrew-literacy-g2/literacy-pool-builder.js` — **unrelated to diagnostic flags** |
| `tests/learning/evidence-quality-layer.test.mjs` | **14/14 PASS** | |
| `tests/learning/question-metadata-consumption.test.mjs` | **88/88 PASS** | |
| `tests/reports/diagnostic-truth-consumer-verification.test.mjs` | **24/24 PASS** | |
| `scripts/qa/parent-report-diagnostic-flags-comparison.mjs --verify-only` | **PASS=48 WARN=0 FAIL=0** | ~6.3 min |
| `scripts/qa/parent-report-diagnostic-visible-impact-hardening.mjs` | **Leak scan PASS, Invariants PASS** | Feature-scoped payload scan |

**Regression invariants (comparison + hardening):** coins, minutes, `monthlyProgress`, `diagnosticAnswers`, `totalAnswers`, `totalSessions` — **unchanged A/B/C/D** across all scanned scenarios.

---

## 2. Public payload leak scan

**Artifact:** `docs/qa/_artifacts/diagnostic-flags-visible-impact-hardening/`

Per scenario × mode (A/B/C/D) snapshots:

| Scenario | Child | Window |
| --- | --- | --- |
| AAA4 | AAA4 | 2026-05-01..2026-06-08 |
| GATE-LOW | AAA9 | 2026-05-10..2026-05-18 |
| SUBSKILL-FOCUS | AAA10 | 2026-05-06..2026-05-20 |
| SUBSKILL-CONFLICT | AAA8 | 2026-05-20..2026-05-24 |
| PROMOTE-STRONG | AAA5 | 2026-05-04..2026-05-11 |

### Feature-scoped scan (`parentFacing`, `meta`, `summary`, `monthlyProgress`)

| Check | Result |
| --- | --- |
| `_evidenceQuality` | **Absent** |
| `bySubSkill` / rollups / `gatingDecisions` / `promotionDecisions` | **Absent** |
| `supportingEvidenceIds` / `_canonicalMeta` | **Absent** |
| Raw `skillId` / `subSkill` keys in new fields | **Absent** |
| **Overall** | **PASS** (20/20 mode snapshots) |

### Pre-existing note (full payload)

`recentMistakes[].questionId` may embed `diagnosticSkillId:"math_*"` strings (e.g. AAA4: 6 hits). This predates visible-impact work; `diagnostic-truth-consumer-verification` explicitly allows stripped `questionEngine` on mistakes. **Not a regression from flags B/C/D.**

### New public fields (safe)

| Field | Type | Why safe |
| --- | --- | --- |
| `parentFacing.practiceFocus` | `{ topicLabelHe, focusLabelHe }[]` | Hebrew taxonomy labels only; no raw keys |
| `parentFacing.gatingApplied` | `boolean` | No decision arrays |
| `parentFacing.diagnosisSuppressed` | `boolean` | Client pattern-diagnostics authority mirror |

Example SUBSKILL-FOCUS mode B (`public-snapshots/SUBSKILL-FOCUS/mode-B.json`):

```json
"practiceFocus": [{ "topicLabelHe": "דקדוק", "focusLabelHe": "סממן זמן" }],
"insights": [ "…", "נושא לחיזוק: דקדוק", "מוקד לתרגול: סממן זמן" ]
```

Example AAA4 mode C (`public-snapshots/AAA4/mode-C.json`):

```json
"gatingApplied": true,
"diagnosisSuppressed": true,
"insights": [ "יש עדיין מעט נתוני תרגול — מומלץ לשמור על תרגול קצר וקבוע." ]
```

(mode A had strong lines + English mistake line — removed/suppressed in C)

---

## 3. Before/after comparison (visible impact)

| Case | A → C or B visible change | Verified |
| --- | --- | --- |
| **AAA4** full range | Strong insights removed; `gatingApplied: true` | comparison + hardening |
| **GATE-LOW** | `"כדאי לשים לב לשברים…"` removed; softened to thin-data line | fixture verify |
| **SUBSKILL-FOCUS** | B adds `practiceFocus` + 2 insight lines (taxonomy Hebrew) | fixture verify + hardening |
| **SUBSKILL-CONFLICT** | B/C/D: `practiceFocus: []` (2 subSkill groups) | fixture verify |
| **PROMOTE-STRONG** | D: `promotionDecisionCount: 1` internal; public insights unchanged in window | fixture verify |

Full-range comparison still dominated by legacy May–June AAA pollution; **isolated windows required** for fixture truth.

---

## 4. UI verification (code-path + payload projection)

**Method:** Server payload → `ParentReportParentSections` / `parent-report-detailed.js` trace (no live browser session in this hardening pass).

| Check | Finding |
| --- | --- |
| **AAA4 A vs C** | `normalizeParentFacing` renders `insights[]` only; mode C has 1 line vs 3 in A — strong lines not shown. Report not empty (home recs remain). |
| **SUBSKILL-FOCUS** | Focus lines appear in **`insights`** (`נושא לחיזוק` / `מוקד לתרגול`); `practiceFocus[]` is **not** a separate UI section today — structured field is API/export-ready only. |
| **Raw keys in UI** | UI renders string lines only; no `skillId`/`subSkill` components. |
| **Hebrew** | Labels from existing taxonomy (`סממן זמן`, `דקדוק`, `שברים`, `חלק־כלל`) — **no new copy authored**. |
| **SUBSKILL-CONFLICT** | No focus lines in insights when conflict rule fires. |
| **GATE-LOW** | No `"כדאי לשים לב ל…"` in mode C; `gatingApplied` not displayed as label (boolean only in JSON). |

**Gap:** Live visual QA (browser/PDF pixel check) not run in this pass — recommend manual spot-check on staging with flags ON before production.

**UI projection artifact:** `public-payload-hardening.json` → `uiProjection` per scenario.

---

## 5. PDF / export verification

| Item | Status |
| --- | --- |
| Parent PDF export path | Exists (`scripts/qa/parent-report-launch-qa.mjs`, Q2E monthly PDF scripts) |
| Wired to new `practiceFocus` field | **Gap** — PDF/detailed page use `insights` + `homeRecommendations` via `normalizeParentFacing`; focus lines **do** flow via duplicated insight strings |
| Gating suppression in PDF | **Partial** — fewer insight lines export if server `parentFacing` authoritative; `diagnosisSuppressed` not rendered as text |
| Raw metadata in PDF | **Not re-verified** in this pass; API strip unchanged |
| coins/minutes/scoring in PDF | Invariant PASS on payload; PDF numeric parity **not re-run** |

**Recommendation:** Run `parent-report-launch-qa.mjs` (or Q2E PDF export) on AAA4 + SUBSKILL-FOCUS with flags ON in staging before prod — **not executed here** (scope: verification docs only).

---

## 6. Changed files (code review list)

### Modified (tracked)

| File | Role |
| --- | --- |
| `lib/parent-server/parent-report-parent-facing.server.js` | Wire gating soften + practice focus into `parentFacing` |
| `scripts/qa/parent-report-q2e-monthly-simulation.mjs` | Export `META` for fixture seeds |

### New (untracked — visible-impact implementation)

| File | Role |
| --- | --- |
| `lib/parent-server/parent-report-diagnostic-visible.server.js` | Gating soften, practice focus, safe flags |
| `scripts/qa/parent-report-diagnostic-flags-comparison.mjs` | A/B/C/D comparison |
| `scripts/qa/parent-report-diagnostic-visible-impact-{seed,verify,hardening}.mjs` | Fixtures + hardening |
| `scripts/qa/parent-report-{qa-may-june,launch-qa-june-week}-seed.mjs` | Seed env fix |
| `docs/qa/DIAGNOSTIC_FLAGS_VISIBLE_IMPACT_IMPLEMENTATION_REPORT.md` | Phase 1 report |

### Not changed (review requested — no diff)

| File | Status |
| --- | --- |
| `lib/learning/evidence-quality.js` | **Unchanged** — gating helpers pre-existed |
| `lib/parent-server/parent-facing-report-authority.js` | **Unchanged** — uses existing `shouldSuppressClientPatternDiagnostics` |

---

## 7. Remaining risks

1. **Full-range AAA pollution** masks fixture signals — use isolated tag + narrow windows for activation QA.
2. **`recentMistakes.questionId`** skill embed — pre-existing; separate hygiene task if parent-facing scrub needed.
3. **Build failure** — Hebrew G2 literacy pool duplicate import blocks deploy (unrelated).
4. **Promotion visible diff** — internal decision fires; public insight diff only when student gate blocks topic insight.
5. **`practiceFocus` UI** — data in API + insight lines; no dedicated UI block (by design freeze).
6. **PDF parity** — not re-validated end-to-end in this hardening pass.

---

## 8. Activation recommendation

| Flag | Technical status | Visible value | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED` | Engine + public `practiceFocus` + insight lines proven in isolated SUBSKILL-FOCUS | Medium — finer practice hint | Medium — copy/ over-diagnosis if gates mis-fire | **Staging only** → then **production behind env** after manual UI/PDF spot-check |
| `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED` | AAA4 + GATE-LOW A≠C proven; invariants PASS | High — prevents over-strong diagnosis | Low–medium — false suppression if policy too aggressive | **Staging only** → **production limited** (env flag, monitor AAA4-like cases) after staging UI pass |
| `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED` | Internal decision in PROMOTE-STRONG; weak public diff when student gate open | Low visible today | High — promotes preliminary→strong diagnosis | **Not ready for production** — fixture/isolated QA only; keep **OFF** until visible diff policy signed off |

**Production today:** keep all three **OFF**.  
**Next gate:** staging with flags B+C ON, manual parent-report + PDF check, then env-gated rollout.

---

## Artifacts

```
docs/qa/_artifacts/diagnostic-flags-visible-impact-hardening/
  public-payload-hardening.json
  public-snapshots/{AAA4,GATE-LOW,SUBSKILL-FOCUS,SUBSKILL-CONFLICT,PROMOTE-STRONG}/mode-{A,B,C,D}.json

docs/qa/_artifacts/diagnostic-flags-visible-impact/
  visible-impact-fixture-verify.json

docs/qa/_artifacts/parent-report-diagnostic-flags-comparison/
  comparison-full.json
```

## Commands (this hardening pass)

```bash
npm run build   # FAIL — pre-existing Hebrew literacy build error
node --test tests/learning/evidence-quality-layer.test.mjs
node --test tests/learning/question-metadata-consumption.test.mjs
node --test tests/reports/diagnostic-truth-consumer-verification.test.mjs
node --env-file=.env.local scripts/qa/parent-report-diagnostic-flags-comparison.mjs --verify-only
node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-hardening.mjs
```
