# Truth Gates & PASS Contract (Phase 5)

Phase 5 replaces weak/generic PASS labels with named gates that state **which layer** was actually verified.

## Gate definitions

| Gate | What PASS means | What PASS does **NOT** mean |
|------|-----------------|----------------------------|
| **DB_PASS** | Live Supabase rows aggregate via `aggregateParentReportPayload` to the same `totalAnswers` as authenticated `report-data` for the same student/range. | Schema-only check; reading old JSON artifacts; in-memory-only mock. |
| **API_PASS** | Unit contracts for report-data routing/aggregation pass; with env: live HTTP `GET /api/parent/students/:id/report-data` returns `ok` body. | SSR-only; source regex only; mocked Playwright route. |
| **UI_PASS** | Parent logs in; `/learning/parent-report?source=parent&studentId=…` renders; visible totals match live API snapshot for same range. | Empty-state shell; MOCK_UI_PASS; API mocked. |
| **PDF_PASS** | Real `page.pdf()` bytes; `pdf-parse` text; key totals/range match API snapshot; **no print-DOM fallback**. | `qa:parent-pdf-export` localStorage fixture path; artifact ZIP scan only. |
| **E2E_TRUTH_PASS** | **DB_PASS → API_PASS → UI_PASS → PDF_PASS** all **PASS** (not SKIP) for one parent/student/range. | Any single layer skipped; artifact reuse; fixture-only PDF. |
| **PARENT_ACTIVITY_PASS** | **Live** parent login → create activity → student login/session → start/answer/submit → DB/API/report UI/real PDF include answered attempts in general subject/topic totals and do not show a separate “פעילות מהורה” label. | Unit/source-only contract; artifact/PDF fixture reuse; skipped browser/API steps. |
| **PARENT_ACTIVITY_CONTRACT_PASS** | Parent attempts roll into general subject/topic totals; no separate “פעילות מהורה” report heading (unit + source). Marked `usesMock: true`; offline only. | Live product truth. |
| **REWARD_PASS** | **Live** parent activity completion updates coins/progress/minutes according to enabled policy and remains idempotent on submit retry. If `ENABLE_SESSION_COIN_AWARDS` is off, result is `SKIP/CONFIG_BLOCKED`, not PASS. | Unit/source-only reward contracts; invented rewards; bypassing DB/RPC. |
| **REWARD_CONTRACT_PASS** | Time-credit caps, zero-duration coin skip, dashboard server-minutes contracts (unit). Marked `usesMock: true`; offline only. | Live coin persistence E2E. |
| **NO_LOCALSTORAGE_REPORT_PASS** | Official `parent-report` / `parent-report-detailed` pages cannot build from `mleo_*` localStorage. | QA scripts that intentionally seed localStorage for dev PDFs. |
| **DASHBOARD_TRUTH_PASS** | **Live** student dashboard UI matches server `home-profile` after parent activity; questions/minutes/progress update from server and localStorage poison cannot alter truth. | Unit/source-only view-model contracts; mocked home-profile. |
| **DASHBOARD_TRUTH_CONTRACT_PASS** | Missing accuracy ≠ 0%; monthly minutes from `derived`, not raw LEO keys. Marked `usesMock: true`; offline only. | Live student home browser vs DB row compare. |
| **EVIDENCE_THRESHOLD_PASS** | Zero/low/strong evidence wording policy suites pass in-process. | Live UI/PDF thin-data rehearsal without rerun. |
| **PRODUCTION_GUARD_PASS** | Portal gate + isolated API bridge; no product-page localStorage fallback on API failure; DB-writing scripts in Phase 6 scope enforce dry-run/production hard-stop guards. | Master pages still using localStorage for gameplay (separate scope); DB-writing scripts explicitly documented as Phase 6b out of scope. |
| **MOCK_UI_PASS** (non-launch) | Playwright UI shell with **mocked** report-data API. | Product truth; must never be called REAL_UI_PASS. |

## Legacy names (do not treat as truth PASS)

| Script / test | Canonical label |
|---------------|-----------------|
| `test:parent-report-real-ui-load` | **MOCK_UI_PASS** |
| `audit:parent-report-release-gate` | **ARTIFACT_VERIFY** |
| `qa:launch:parent-report-truth` | **ARTIFACT_VERIFY** |
| `qa:parent-pdf-export` | **PDF_QA_FIXTURE** (localStorage snapshot) |
| `test:parent-report-real-output-signoff` | **FIXTURE_VERIFY** |

## Commands

### Offline / CI-safe (no live DB required)

```bash
npm run test:truth-gates:offline
```

Runs: `NO_LOCALSTORAGE_REPORT_PASS`, `PRODUCTION_GUARD_PASS`, `EVIDENCE_THRESHOLD_PASS`, `PARENT_ACTIVITY_CONTRACT_PASS`, `REWARD_CONTRACT_PASS`, `DASHBOARD_TRUTH_CONTRACT_PASS`.

### All gates (live gates SKIP if env missing)

```bash
npm run test:truth-gates
```

### Launch-required gates (SKIP counts as FAIL)

```bash
npm run test:truth-gates:launch
```

### Individual gates

```bash
npm run gate:no-localstorage-report
npm run gate:db-pass
npm run gate:api-pass
npm run gate:ui-pass
npm run gate:pdf-pass
npm run gate:e2e-truth
npm run gate:parent-activity
npm run gate:parent-activity-contract
npm run gate:reward
npm run gate:reward-contract
npm run gate:dashboard-truth
npm run gate:dashboard-truth-contract
npm run gate:evidence-threshold
npm run gate:mock-ui
```

### Full E2E truth chain (requires env + dev server)

**Prerequisites**

1. `.env.local` with Supabase URL + `LEARNING_SUPABASE_SERVICE_ROLE_KEY` + anon key  
2. `.env.e2e.local` with `E2E_PARENT_EMAIL`, `E2E_PARENT_PASSWORD` (linked to a student)  
3. Optional: `TRUTH_GATES_STUDENT_ID`, `TRUTH_GATES_BASE_URL` (default `http://127.0.0.1:3002`)  
4. Dev server: `npm run dev:run-button` (or set `TRUTH_GATES_BASE_URL`)

```bash
npm run gate:e2e-truth
```

## Launch blockers (required before release)

All gates in `test:truth-gates:launch` must **PASS** in staging with real env — not SKIP:

1. `NO_LOCALSTORAGE_REPORT_PASS`
2. `PRODUCTION_GUARD_PASS`
3. `DB_PASS`
4. `API_PASS`
5. `UI_PASS`
6. `PDF_PASS`
7. `E2E_TRUTH_PASS`
8. `PARENT_ACTIVITY_PASS`
9. `REWARD_PASS`
10. `DASHBOARD_TRUTH_PASS`
11. `EVIDENCE_THRESHOLD_PASS`

## Still weak / documented gaps

| Area | Gap |
|------|-----|
| Parent activity | `PARENT_ACTIVITY_PASS` is now the live default gate; `PARENT_ACTIVITY_CONTRACT_PASS` remains offline/source coverage. |
| Rewards | `REWARD_PASS` is now the live coin/progress idempotency gate; `REWARD_CONTRACT_PASS` remains offline/source coverage. |
| Dashboard | `DASHBOARD_TRUTH_PASS` is now the live student home UI vs server `home-profile` gate; `DASHBOARD_TRUTH_CONTRACT_PASS` remains offline/source coverage. |
| Scratchpad / hidden tab | Covered in staging fairness script; not in default truth gates. |
| Detailed report PDF | `PDF_PASS` uses short report `#parent-report-pdf`; detailed print root optional follow-up. |

## Mock / fixture / artifact usage by gate

| Gate | Mock | Fixture | Artifact |
|------|------|---------|----------|
| DB_PASS | — | — | — (live rerun) |
| API_PASS | unit mocks in `parent-assigned-activities.test.mjs` | — | — |
| UI_PASS | — | — | — |
| PDF_PASS | — | — | writes fresh PDF under `qa-visual-output/truth-gates/` |
| E2E_TRUTH_PASS | — | — | — |
| PARENT_ACTIVITY_PASS | — | — | — (generates fresh in-memory `page.pdf()` bytes, no old PDF artifact) |
| PARENT_ACTIVITY_CONTRACT_PASS | in-memory aggregation | — | — |
| REWARD_PASS | — | — | — (live DB/API rerun) |
| REWARD_CONTRACT_PASS | in-memory time ledger tests | — | — |
| DASHBOARD_TRUTH_PASS | — | — | — (live browser/API rerun) |
| DASHBOARD_TRUTH_CONTRACT_PASS | in-memory view builders | — | — |
| EVIDENCE_THRESHOLD_PASS | in-process report builders | zero-evidence fixtures | — |
| NO_LOCALSTORAGE / PRODUCTION_GUARD | — | adapter fixture in phase1 selftest | — |
| MOCK_UI_PASS | **Playwright route mock** | `parent-report-api-body-e2e.mjs` | — |

## Implementation files

- Registry: `scripts/truth-gates/gate-registry.mjs`
- Orchestrator: `scripts/truth-gates/run-truth-gates.mjs`
- Gates: `scripts/truth-gates/gates/*.mjs`
- Contract tests: `tests/truth-gates/*.test.mjs`

Run artifacts (fresh each run): `docs/repair/_artifacts/truth-gates/truth-gates-run-*.json`
