# Parent Report Numeric & Sufficiency Sanity Blocker

**Status:** **PASS (local QA closure)** — pending owner review  
**Date:** 2026-06-08  
**Environment:** Local QA only — **no staging, no production, no commit/push/deploy**

---

## Final verdict: **PASS**

| Gate | Result |
|------|--------|
| Numeric audit (AAA + fixtures) | **115/115 PASS** |
| PDF matrix (20 cells) | **20/20 captured, leak PASS** |
| PDF numeric scan (no 30602/5881, ≤300 min) | **PASS** |
| Hardening leak + invariants (B/C) | **PASS** |
| `npm run build` | **PASS** |
| B/C diagnostic behavior | **PASS** (see matrix verdicts) |

---

## Blocker summary (original)

| Symptom | Before | After (PDF matrix) |
|---------|--------|---------------------|
| GATE-LOW / AAA9 | ~30,602 min | **38 דק'** (mode-C PDF) |
| SUBSKILL-FOCUS | ~5,881 min | **5–35 דק'** (mode-C PDF) |
| Status with many Q | `"אין מספיק מפגשים"` (reported) | **0 hits** in 20 PDFs |

---

## A. Root cause — duration inflation

**Primary:** QA seed stored `duration_seconds` as multi-day wall-clock span (`first_answer_at` → `last_answer_at` in one session row).

**Secondary:** Aggregation passed raw values until caps were added in `report-duration-sanity.js`.

**Source field:** `learning_sessions.duration_seconds` → aggregation → `subjects.*.durationSeconds` → PDF `totalTimeMinutes`.

**Trace:** `docs/qa/_artifacts/parent-report-numeric-sanity/root-cause-GATE-LOW.json`  
**Pre-fix metrics:** `docs/qa/_artifacts/parent-report-numeric-sanity/before/before-metrics.json`

---

## B. PDF matrix failure (post-fix) — resolved

Matrix initially timed out on `[data-testid="parent-report-parent-sections"]`. Debug trace (`matrix-debug.json`):

| Issue | Cause | Fix |
|-------|-------|-----|
| Empty report / no sections | Missing **May–June seed** (`parent-report-qa-may-june-v1`) for AAA4 window | Re-ran `parent-report-qa-may-june-seed.mjs` + visible-impact seed |
| `לא ניתן לבנות את הדוח…` | **`ReferenceError: TOPIC_EVIDENCE_THRESHOLDS is not defined`** in `detailed-parent-report.js` (`gateReadiness`) | Added import from `parent-report-topic-evidence.js` |

**Auth / intercept:** unchanged and working — intercept hits `/api/parent/students/*/report-data`, parent auth via `admin@admin.com` + Playwright e2e session flag.

**Matrix run (2026-06-08):**

```bash
npx next start -p 3001   # after npm run build
node --env-file=.env.local scripts/qa/parent-report-diagnostic-flags-pdf-comparison-matrix.mjs
```

- **Cells:** 20/20  
- **Leak scan:** PASS  
- **Report:** `docs/qa/DIAGNOSTIC_FLAGS_PDF_COMPARISON_MATRIX_REPORT.md`  
- **Artifacts:** `docs/qa/_artifacts/diagnostic-flags-pdf-comparison-matrix/`

---

## C. PDF numeric confirmation

**Scan:** `node --env-file=.env.local scripts/qa/parent-report-numeric-pdf-scan.mjs`  
**Artifact:** `docs/qa/_artifacts/parent-report-numeric-sanity/after/pdf-numeric-scan.json`

| Check | Result |
|-------|--------|
| 30602 / 5881 / 13141 / 36483 / 24902 in PDF text | **None** |
| Minutes > 300 in duration lines | **None** |
| `"אין מספיק מפגשים"` in 20 PDFs | **None** |
| GATE-LOW mode-C total minutes | **38** (was ~30k+) |
| SUBSKILL-FOCUS mode-C minutes | **5, 10, 30, 35** |

---

## D. B/C diagnostic behavior (matrix)

| Scenario | Expected | Actual (matrix) | Verdict |
|----------|----------|-----------------|---------|
| SUBSKILL-FOCUS | B/C/D show focus | B/C/D: `focus, pf=1` | PASS |
| GATE-LOW / AAA4 | C/D suppress strong | C/D: `gating, suppressed` | PASS |
| PROMOTE-STRONG | Promotion not visible to parent | No promotion leak in PDF scan | PASS |

Matrix scenario verdicts: all **pass** in `matrix-results.json`.

---

## E. Fixes applied (code + seed)

### Seed
- `parent-report-q2e-monthly-simulation.mjs` — per-day sessions + `estimatePracticeDurationSeconds()`
- Re-seed: `parent-report-q2e-monthly-simulation.mjs`, **`parent-report-qa-may-june-seed.mjs`**, `parent-report-diagnostic-visible-impact-seed.mjs`

### Guards
- `lib/parent-server/report-duration-sanity.js` — caps + rollup pass
- `lib/parent-server/report-data-aggregate.server.js` — per-session + subject/topic sanitize
- `utils/parent-report-v2.js`, `report-data-adapter.js`, `seed-db-report-local-storage.js`

### Sufficiency / render bug
- `utils/parent-report-row-diagnostics.js` — `evaluateDataSufficiency` q≥12 path
- `utils/detailed-parent-report.js` — `gateReadiness` + **TOPIC_EVIDENCE_THRESHOLDS import**
- `lib/learning-supabase/parent-report-from-api-payload.js` — exposes `__parentReportGenerationLastError` on failure (QA aid)

---

## F. Audit & hardening

```bash
node --env-file=.env.local scripts/qa/parent-report-numeric-sanity-audit.mjs
node --env-file=.env.local scripts/qa/parent-report-diagnostic-visible-impact-hardening.mjs
npm run build
```

| Run | Result |
|-----|--------|
| Numeric audit | **115 rows PASS / 0 FAIL** |
| Hardening leak | **PASS** |
| Build | **PASS** |

---

## G. After artifacts

```text
docs/qa/_artifacts/parent-report-numeric-sanity/after/
  GATE-LOW-mode-C.pdf / .png
  SUBSKILL-FOCUS-mode-C.pdf / .png
  all-pdfs/          (20 PDFs)
  pdf-numeric-scan.json
```

Debug / trace:

```text
docs/qa/_artifacts/parent-report-numeric-sanity/
  audit-results.json
  root-cause-GATE-LOW.json
  matrix-debug.json
  before/before-metrics.json
```

---

## Owner actions

1. Review after PDFs (especially GATE-LOW / SUBSKILL-FOCUS mode-C).  
2. Approve commit when ready — **not committed in this closure**.  
3. Staging / production remain **OFF** until separate approval.

**Note:** Matrix QA requires May–June seed (`parent-report-qa-may-june-seed.mjs`) before PDF capture; visible-impact seed alone is not sufficient for AAA4 window.
