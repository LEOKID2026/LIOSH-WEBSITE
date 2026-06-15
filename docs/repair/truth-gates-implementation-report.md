# Truth Gates — Phase 5 Implementation Report

Date: 2026-06-15  
Scope: QA/tests/scripts only (no product code changes).

## 1. Tests / scripts added

| Path | Role |
|------|------|
| `scripts/truth-gates/gate-registry.mjs` | Canonical gate names + legacy PASS rename map |
| `scripts/truth-gates/run-truth-gates.mjs` | Orchestrator; writes fresh JSON under `docs/repair/_artifacts/truth-gates/` |
| `scripts/truth-gates/lib/gate-result.mjs` | PASS / FAIL / SKIP contract + exit codes |
| `scripts/truth-gates/lib/env.mjs` | Env loading helpers |
| `scripts/truth-gates/lib/run-child.mjs` | Child process runners |
| `scripts/truth-gates/lib/live-parent-report.mjs` | Live Supabase + parent bearer + report-data fetch |
| `scripts/truth-gates/lib/report-field-extract.mjs` | API/UI/PDF field extraction + parity asserts |
| `scripts/truth-gates/gates/*.mjs` | One script per gate (11 launch + MOCK_UI) |
| `tests/truth-gates/parent-activity-truth-contract.test.mjs` | Parent activity aggregation + no separate label |
| `tests/truth-gates/reward-truth-contract.test.mjs` | Time/coin/dashboard source contracts |
| `docs/repair/truth-gates-and-pass-contract.md` | PASS contract + commands |

## 2. Tests / scripts fixed or relabeled

| Item | Change |
|------|--------|
| `tests/e2e/parent-report-real-ui-load.spec.ts` | Tagged `@mock-ui-pass`; describe renamed to MOCK_UI_PASS |
| `scripts/parent-report-real-ui-load.mjs` | Header documents MOCK_UI_PASS (API mocked) |
| `scripts/parent-report-server-truth-phase1-selftest.mjs` | Wired as `NO_LOCALSTORAGE_REPORT_PASS` (unchanged logic) |
| `package.json` | Added `test:truth-gates*`, `gate:*` scripts |

## 3. PASS names now in repo

| Gate | Script |
|------|--------|
| **DB_PASS** | `gate:db-pass` |
| **API_PASS** | `gate:api-pass` |
| **UI_PASS** | `gate:ui-pass` |
| **PDF_PASS** | `gate:pdf-pass` |
| **E2E_TRUTH_PASS** | `gate:e2e-truth` |
| **PARENT_ACTIVITY_PASS** | `gate:parent-activity` |
| **REWARD_PASS** | `gate:reward` |
| **NO_LOCALSTORAGE_REPORT_PASS** | `gate:no-localstorage-report` |
| **DASHBOARD_TRUTH_PASS** | `gate:dashboard-truth` |
| **EVIDENCE_THRESHOLD_PASS** | `gate:evidence-threshold` |
| **PRODUCTION_GUARD_PASS** | `gate:production-guard` |
| **MOCK_UI_PASS** (non-launch) | `gate:mock-ui` |

Legacy relabels (documented only): `ARTIFACT_VERIFY`, `PDF_QA_FIXTURE`, `FIXTURE_VERIFY`, `SOURCE_GUARD`.

## 4. Tests still weak

| Gate | Weakness |
|------|----------|
| **DB_PASS** | PASS even when dev server down (in-process aggregate only); full DB↔API compare needs server + parent auth |
| **API_PASS** | SKIP live HTTP without env/server; unit mocks in `parent-assigned-activities.test.mjs` |
| **UI_PASS** | **Fails live**: API `totalAnswers=188`, UI summary `שאלות=0` for same browser `report-data` response — product bridge bug |
| **PDF_PASS** | Depends on UI_PASS parity; not verified PASS in this run |
| **E2E_TRUTH_PASS** | Chain fails at UI_PASS (see blocker) |
| **PARENT_ACTIVITY_PASS** | Unit/source only; no live parent-create→student-submit→report flow |
| **REWARD_PASS** | Unit/source; live browser rewards in `staging-e2e-learning-time-fairness.mjs` |
| **DASHBOARD_TRUTH_PASS** | Unit/source; no live home-profile vs DB |
| **EVIDENCE_THRESHOLD_PASS** | In-process fixtures; not live UI/PDF surfaces |
| **MOCK_UI_PASS** | Playwright + mocked API — intentionally not product truth |

## 5. Commands

```bash
# CI-safe offline launch contracts
npm run test:truth-gates:offline

# All gates (live gates SKIP without env/server)
npm run test:truth-gates

# Launch set — SKIP counts as FAIL
npm run test:truth-gates:launch

# Full DB→API→UI→PDF chain (needs .env.local + .env.e2e.local + dev server)
npm run dev:run-button
npm run gate:e2e-truth
```

See `docs/repair/truth-gates-and-pass-contract.md` for per-gate commands.

## 6. Run results (this session)

### Offline gates — **all PASS**

```
npm run test:truth-gates:offline
→ NO_LOCALSTORAGE, PRODUCTION_GUARD, EVIDENCE_THRESHOLD,
  PARENT_ACTIVITY, REWARD, DASHBOARD_TRUTH: PASS
```

### Full orchestrator without dev server — **7 PASS, 4 SKIP**

```
npm run test:truth-gates
→ DB_PASS PASS (in-process live Supabase, 447 answers; API compare skipped — no server)
→ API_PASS, UI_PASS, PDF_PASS, E2E_TRUTH_PASS: SKIP (no dev server)
→ contract/source gates: PASS
```

### With dev server (`npm run dev:run-button`)

| Gate | Result | Notes |
|------|--------|-------|
| DB_PASS | PASS | Live Supabase + API agree when server up |
| API_PASS | PASS | Live `report-data` HTTP OK |
| UI_PASS | **FAIL** | `totalQuestions api=188 surface=0` (same browser API response) |
| E2E_TRUTH_PASS | **FAIL** | Stopped at UI_PASS |
| PDF_PASS | Not run to PASS | Blocked by UI parity |

Artifact: `docs/repair/_artifacts/truth-gates/truth-gates-run-*.json` (fresh each run).

## 7. Blockers remaining

1. **UI summary vs API totals (CRITICAL for E2E_TRUTH_PASS)**  
   - Browser fetches `report-data` with `totalAnswers: 188` (7-day custom range).  
   - Rendered summary card `שאלות` shows `0`.  
   - Time range/minutes can match; question count does not.  
   - **Root cause hypothesis**: API→bridge→`report.summary.totalQuestions` path for official parent remote report.  
   - **Owner**: product/bridge agent (not modified in Phase 5 per scope).

2. **E2E_TRUTH_PASS / PDF_PASS** blocked until UI_PASS passes.

3. **Live parent-activity E2E** (create→answer→report) still manual / `staging-e2e-learning-time-fairness.mjs`.

4. **DB_PASS** partial PASS when API compare skipped — tighten to SKIP if no live API compare when launch gate runs.

## 8. Dependencies on other agents

| Agent / area | Need |
|--------------|------|
| Product / bridge | Fix `runParentReportGenerationFromApiBody` so UI `totalQuestions` matches API `summary.totalAnswers` for `source=parent` + custom range |
| CI | Add `npm run test:truth-gates:offline` to `.github/workflows/parent-report-tests.yml` (recommended) |
| Staging QA | Wire `gate:e2e-truth` into pre-launch checklist with dev server + E2E parent creds |
| Rewards | Optional: promote `scripts/qa/staging-e2e-learning-time-fairness.mjs` into `REWARD_PASS` live leg |

## Definition of Done checklist

| Requirement | Status |
|-------------|--------|
| E2E truth gate connecting DB/API/UI/PDF | **Implemented** (`gate:e2e-truth`); **FAIL** on UI parity blocker |
| Parent activity truth gate | **PASS** (unit) |
| Reward truth gate | **PASS** (unit) |
| No-localStorage parent report gate | **PASS** |
| Dashboard truth gate | **PASS** (unit) |
| PDF real gate | **Implemented**; not PASS until UI fixed |
| Gates rerun fresh (no old artifact PASS) | **Yes** |
| New/updated tests pass or failures documented | **Yes** |
