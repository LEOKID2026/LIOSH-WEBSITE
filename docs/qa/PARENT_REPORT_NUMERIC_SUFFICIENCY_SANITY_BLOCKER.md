# Parent Report Numeric & Sufficiency Sanity Blocker

**Status:** **PASS (local QA closure)** — pending owner review  
**Date:** 2026-06-08 (status-label fix re-verified)  
**Environment:** Local QA only — **no staging, no production, no commit/push/deploy**

---

## Final verdict: **PASS**

| Gate | Result |
|------|--------|
| Numeric audit (AAA + fixtures) | **115/115 PASS** |
| PDF matrix (20 cells) | **20/20 captured, leak PASS** |
| PDF numeric scan (no 30602/5881, ≤300 min, no insufficient-session on Q≥12 rows) | **PASS** |
| Hardening leak + invariants (B/C) | **PASS** (prior run) |
| `npm run build` | **PASS** |
| B/C diagnostic behavior | **PASS** (see matrix verdicts) |

---

## Blocker summary

| Symptom | Before | After (PDF matrix) |
|---------|--------|---------------------|
| GATE-LOW / AAA9 | ~30,602 min | **38 דק'** (mode-C PDF) |
| SUBSKILL-FOCUS | ~5,881 min | **5–35 דק'** (mode-C PDF) |
| Status with many Q (GATE-LOW 25Q, SUBSKILL-FOCUS 20Q) | `"אין מספיק מפגשי"` (truncated from trend copy) | **Sufficiency label** — e.g. `"יש מספיק שאלות"` / `"המידע עדיין חלקי"` |
| Status with few Q (<12) | same phrase | **Allowed** — trend session warning still valid when volume is low |

---

## Status-label fix (second closure pass)

**Root cause:** Progress-table status footnote preferred `trend.summaryHe`, which appended session-count warnings (`"אין מספיק מפגשים…"`) even when the row had ≥12 questions. PDF line-clamp truncated this to `"אין מספיק מפגשי"`.

**Fix:**

1. `utils/parent-report-row-trend.js` — do not append session-insufficiency lines when `nCur ≥ 12`.
2. `pages/learning/parent-report.js` — `ParentReportRowDiagnosticsFootnote` prefers `dataSufficiencyLabelHe` when Q≥12 and trend copy matches `/אין\s+מספיק\s+מפגש/`; compact fallback guarded the same way.
3. `scripts/qa/parent-report-numeric-pdf-scan.mjs` — regex `/אין\s+מספיק\s+מפגש/`; fails only when phrase appears on a progress-table row with **≥12 questions** (parses `דק' … Q …` rows).

**Manual confirmation (mode-C PDFs):**

| Scenario | High-Q row status | Low-Q row (<12) |
|----------|-------------------|-----------------|
| GATE-LOW | No insufficient-session phrase | — |
| SUBSKILL-FOCUS | דקדוק 20Q → `"יש מספיק שאלות"` | אוצר מילים 3Q → `"אין מספיק מפגשי"` (expected) |

---

## A. Root cause — duration inflation

**Primary:** QA seed stored `duration_seconds` as multi-day wall-clock span.

**Secondary:** Aggregation passed raw values until caps in `report-duration-sanity.js`.

**Trace:** `docs/qa/_artifacts/parent-report-numeric-sanity/root-cause-GATE-LOW.json`

---

## B. Re-run commands (2026-06-08)

```bash
npm run build
npx next start -p 3001
node --env-file=.env.local scripts/qa/parent-report-diagnostic-flags-pdf-comparison-matrix.mjs
node --env-file=.env.local scripts/qa/parent-report-numeric-pdf-scan.mjs
node --env-file=.env.local scripts/qa/parent-report-numeric-sanity-audit.mjs
```

| Run | Result |
|-----|--------|
| Build | **PASS** |
| Matrix | **20/20**, leak **PASS** |
| PDF scan | **PASS** (`pdf-numeric-scan.json`) |
| Numeric audit | **115/115 PASS** |

---

## C. PDF numeric confirmation

**Artifact:** `docs/qa/_artifacts/parent-report-numeric-sanity/after/pdf-numeric-scan.json`

| Check | Result |
|-------|--------|
| 30602 / 5881 / 13141 / 36483 / 24902 | **None** |
| Minutes > 300 in duration lines | **None** |
| `"אין מספיק מפגש…"` on rows with Q≥12 | **None** |
| GATE-LOW mode-C total minutes | **38** |
| SUBSKILL-FOCUS mode-C minutes | **5, 10, 30, 35** |

---

## D. After artifacts

```text
docs/qa/_artifacts/parent-report-numeric-sanity/after/
  GATE-LOW-mode-C.pdf / .png
  SUBSKILL-FOCUS-mode-C.pdf / .png
  all-pdfs/          (20 PDFs)
  pdf-numeric-scan.json
```

---

## Owner actions

1. Review after PDFs (especially GATE-LOW / SUBSKILL-FOCUS mode-C status column).  
2. Approve commit when ready — **not committed in this closure**.  
3. Staging / production remain **OFF** until separate approval.

**Note:** Matrix QA requires May–June seed before PDF capture for AAA4 window.
