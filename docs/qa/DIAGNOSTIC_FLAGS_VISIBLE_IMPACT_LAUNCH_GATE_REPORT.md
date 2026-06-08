# Diagnostic Flags Visible Impact — Launch Gate Report (Phase 3)

**Date:** 2026-06-08  
**Scope:** Launch readiness gates 1–5 for B+C visible impact. **No production activation**, no commit/push/deploy, no school/classroom, no new Hebrew copy.

**Target flags (staging/local QA):**

```env
DIAGNOSTIC_METADATA_SUBSKILL_ENABLED=true
DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED=true
DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED=false
```

---

## 1. Build result

| Command | Result | Notes |
| --- | --- | --- |
| `npm run build` | **PASS** | Next.js 15.5.18 — lint, types, optimized production build completed (exit 0). Prior duplicate-import failure in `literacy-pool-builder.js` no longer reproduces. |

**Gate 1:** **PASS**

---

## 2. Regression tests

| Command | Result |
| --- | --- |
| `tests/learning/evidence-quality-layer.test.mjs` | **14/14 PASS** |
| `tests/learning/question-metadata-consumption.test.mjs` | **88/88 PASS** |
| `tests/reports/diagnostic-truth-consumer-verification.test.mjs` | **24/24 PASS** (126 assertions total) |
| `scripts/qa/parent-report-diagnostic-flags-comparison.mjs --verify-only` | **PASS=48 WARN=0 FAIL=0** |
| `scripts/qa/parent-report-diagnostic-visible-impact-hardening.mjs` | **Leak scan PASS, Invariants PASS** |

**Regression invariants (comparison + hardening):** coins, minutes, `monthlyProgress`, `diagnosticAnswers`, `totalAnswers`, `totalSessions` — unchanged A/B/C/D across scanned scenarios.

**Gate 2:** **PASS**

---

## 3. Browser QA (Gate 3)

**Script:** `scripts/qa/parent-report-diagnostic-visible-impact-browser-pdf-qa.mjs`  
**Server:** `next start -p 3001` (production build from Gate 1)  
**Route:** `/learning/parent-report` — live UI renders `ParentReportParentSections` (`data-testid="parent-report-parent-sections"`). API payload intercepted at `GET /api/parent/students/*/report-data`.

**Artifacts:** `docs/qa/_artifacts/diagnostic-flags-visible-impact-browser/`

| Scenario | Mode | Screenshot | Result | Key checks |
| --- | --- | --- | --- | --- |
| AAA4 | A (all OFF) | `AAA4-mode-A.png` | **PASS** | 5 insight lines; report not empty; no raw keys |
| AAA4 | C (B+C ON, D OFF) | `AAA4-mode-C.png` | **PASS** | Strong diagnosis removed vs A (English repeat + improvement lines gone); soft fallback present; no `כדאי לשים לב ל` |
| GATE-LOW | C | `GATE-LOW-mode-C.png` | **PASS** | No `כדאי לשים לב ל`; soft lines; not empty |
| SUBSKILL-FOCUS | C | `SUBSKILL-FOCUS-mode-C.png` | **PASS** | `נושא לחיזוק: דקדוק`, `מוקד לתרגול: סממן זמן`; Hebrew taxonomy labels only |
| SUBSKILL-CONFLICT | C | `SUBSKILL-CONFLICT-mode-C.png` | **PASS** | No practice-focus lines when subskill groups conflict |

**Machine-readable:** `browser-results.json` — **5/5 PASS**

**Gate 3:** **PASS**

---

## 4. PDF / export QA (Gate 4)

**Method:** Playwright `page.pdf()` on `#parent-report-pdf` with B+C ON payloads (mode C), same intercept harness as browser QA.

**Artifacts:** `docs/qa/_artifacts/diagnostic-flags-visible-impact-pdf/`

| Scenario | PDF | Bytes | Result |
| --- | --- | --- | --- |
| AAA4 | `AAA4-mode-C.pdf` | 832 KB | **PASS** |
| GATE-LOW | `GATE-LOW-mode-C.pdf` | 983 KB | **PASS** |
| SUBSKILL-FOCUS | `SUBSKILL-FOCUS-mode-C.pdf` | 1.03 MB | **PASS** — focus lines in PDF |
| SUBSKILL-CONFLICT | `SUBSKILL-CONFLICT-mode-C.pdf` | 982 KB | **PASS** — no `מוקד לתרגול` |

**PDF leak checks (all scenarios):** no `_evidenceQuality`, `bySubSkill`, `gatingDecisions`, `promotionDecisions`, `supportingEvidenceIds`, raw `skillId`/`subSkill`, `math_*`/`frac_*` keys.

**Gating in PDF:** AAA4 + GATE-LOW — no `כדאי לשים לב ל` in extracted text.

**Machine-readable:** `pdf-results.json` — **4/4 PASS**

**Pre-existing QA seed note:** GATE-LOW / SUBSKILL fixtures show inflated `totalMinutes` in PDF header (seed artifact, not flag regression). Coins/scoring in PDF match payload summary.

**Gate 4:** **PASS** — PDF export path is connected and verified.

---

## 5. Final leak scan

**Artifact:** `docs/qa/_artifacts/diagnostic-flags-visible-impact-hardening/public-payload-hardening.json`

| Check | Result |
| --- | --- |
| `_evidenceQuality` on public surfaces | **Absent** |
| `bySubSkill` / rollups / `gatingDecisions` / `promotionDecisions` | **Absent** |
| `supportingEvidenceIds` / `_canonicalMeta` | **Absent** |
| Raw `skillId` / `subSkill` in new fields | **Absent** |
| Feature-scoped scan (`parentFacing`, `meta`, `summary`) | **PASS** (20/20 mode snapshots) |

**Pre-existing (full payload):** `recentMistakes[].questionId` may embed `math_*` in diagnostic skill strings — predates visible-impact; allowed by diagnostic-truth consumer tests.

**Gate 5 leak scan:** **PASS**

---

## 6. Final invariants

| Invariant | Status |
| --- | --- |
| Promotion stays internal when D OFF | **Holds** — no `promotionDecisions` in public/PDF |
| Gating suppresses strong Hebrew without empty report | **Holds** — browser + PDF |
| Subskill focus only when single dominant group | **Holds** — SUBSKILL-FOCUS shows; SUBSKILL-CONFLICT suppresses |
| New public fields are label-only | **Holds** — `practiceFocus[]`, `gatingApplied`, `diagnosisSuppressed` |
| Scoring / sessions / answers unchanged across A/B/C/D | **Holds** — comparison + hardening |
| No school / classroom surfaces touched | **Holds** |
| No new Hebrew copy introduced | **Holds** — existing approved strings only |

**Gate 5 invariants:** **PASS**

---

## 7. Flag recommendations

| Flag | Recommendation | Rationale |
| --- | --- | --- |
| `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED` | **staging ON** (prod behind env, default OFF until owner approval) | SUBSKILL-FOCUS/CONFLICT behave correctly in browser + PDF; labels from taxonomy only |
| `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED` | **staging ON** (production limited only after explicit owner approval) | AAA4/GATE-LOW gating visible and safe; strong lines suppressed with soft fallback |
| `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED` | **OFF** | Not in scope for launch; internal-only promotion fixtures verified separately |

---

## Overall gate summary

| Gate | Description | Result |
| --- | --- | --- |
| 1 | Production build | **PASS** |
| 2 | Regression tests + comparison + hardening | **PASS** |
| 3 | Live browser QA (B+C ON, D OFF) | **PASS** |
| 4 | PDF/export QA | **PASS** |
| 5 | Leak scan + invariants + recommendation | **PASS** |

---

## Activation decision (pending owner approval)

**Do not activate production yet.**

If owner approves staging promotion:

- Enable **B+C ON** in **staging** only
- Keep **D OFF**
- Production limited rollout **only after separate explicit approval**

**Not done in this pass:** commit, push, deploy, school/classroom work, Hebrew copy changes.

---

## QA harness notes

- Browser/PDF script updated to probe `/learning/parent-report` (canonical `ParentReportParentSections` surface) and accept any HTTP status on reachability check (matches existing PDF export QA pattern).
- Run: `node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-browser-pdf-qa.mjs` with `next start -p 3001` or `npm run dev` on port 3001.

**Related reports:**

- `docs/qa/DIAGNOSTIC_FLAGS_VISIBLE_IMPACT_IMPLEMENTATION_REPORT.md`
- `docs/qa/DIAGNOSTIC_FLAGS_VISIBLE_IMPACT_HARDENING_REPORT.md`
