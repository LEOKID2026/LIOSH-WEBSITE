# Phase 9 — Live Parent Activity / Reward / Dashboard Gates Report

תאריך: 2026-06-15  
Scope: `PARENT_ACTIVITY_PASS`, `REWARD_PASS`, `DASHBOARD_TRUTH_PASS` live gates.

## 1. Clean Server

- Port used: `3011`.
- Server type: local production server via `npx next start -p 3011`.
- `npm run build`: PASS before server start.
- Port check: `Get-NetTCPConnection -LocalPort 3011` returned no listener before start.
- Product-server verification:
  - `GET http://127.0.0.1:3011/parent/login` returned `200`.
  - `/parent/login` contained `data-testid="parent-login-identifier"`.
  - `GET /learning/parent-report?source=parent&studentId=00000000-0000-4000-8000-000000000000` returned `200`, not `404`.
- `TRUTH_GATES_BASE_URL` was explicitly set to `http://127.0.0.1:3011`.
- Port `3002` was not used.

## 2. What Changed

- Split mock/source contracts from live gates:
  - `PARENT_ACTIVITY_PASS` is now intended to be live only.
  - `PARENT_ACTIVITY_CONTRACT_PASS` keeps the offline unit/source contract and is marked `usesMock: true`.
  - `REWARD_PASS` is now intended to be live only.
  - `REWARD_CONTRACT_PASS` keeps the offline unit/source contract and is marked `usesMock: true`.
  - `DASHBOARD_TRUTH_PASS` is now intended to be live only.
  - `DASHBOARD_TRUTH_CONTRACT_PASS` keeps the offline unit/source contract and is marked `usesMock: true`.
- Added `scripts/truth-gates/lib/live-parent-activity-flow.mjs`:
  - parent bearer login,
  - student login through `/api/student/login`,
  - parent creates an activity through `/api/parent/activities`,
  - student starts/answers/submits through `/api/student/activities/*`,
  - DB/API/report/dashboard assertions,
  - parent report UI/PDF no-label checks,
  - dashboard localStorage poison check.
- Updated `docs/repair/truth-gates-and-pass-contract.md` so no mock/source gate remains under an unqualified PASS meaning.
- Updated `package.json` so `test:truth-gates:offline` runs `*_CONTRACT_PASS` gates, while `gate:parent-activity`, `gate:reward`, and `gate:dashboard-truth` run the live gates.

## 3. Live Flow Status

The live flow was implemented but could not complete in this environment because student authentication is blocked by invalid E2E student credentials.

Observed blocker:

- `POST /api/student/login` returned `401` with `{"ok":false,"error":"שם משתמש או PIN שגויים"}` for configured `E2E_STUDENT_*` credentials and known E2E aliases.
- Repeated live gate attempts then also hit `429` rate limiting on the same invalid credential path.
- Parent auth/report live gates still work: `DB_PASS`, `API_PASS`, `UI_PASS`, `PDF_PASS`, and `E2E_TRUTH_PASS` passed against the same server on `3011`.

Therefore:

| Gate | Status | Reality |
|------|--------|---------|
| `PARENT_ACTIVITY_PASS` | `SKIP / CONFIG_BLOCKED` | Live gate exists, but did not complete parent create → student submit because student login failed. Not PASS. |
| `REWARD_PASS` | `SKIP / CONFIG_BLOCKED` | Live gate exists, but reward/idempotency flow depends on student submit and was blocked by student login. Not PASS. |
| `DASHBOARD_TRUTH_PASS` | `SKIP / CONFIG_BLOCKED` | Live gate exists, but dashboard-after-activity flow depends on student login. Not PASS. |
| `PARENT_ACTIVITY_CONTRACT_PASS` | PASS | Offline/source/unit only, `usesMock: true`. |
| `REWARD_CONTRACT_PASS` | PASS | Offline/source/unit only, `usesMock: true`. |
| `DASHBOARD_TRUTH_CONTRACT_PASS` | PASS | Offline/source/unit only, `usesMock: true`. |

## 4. Gate Results

| Command | Result |
|---------|--------|
| `npm run build` | PASS. Existing warning: port `3001` in use; build still completed. |
| `npm run gate:e2e-truth` | PASS live on `http://127.0.0.1:3011`. |
| `npm run gate:parent-activity` | SKIP / CONFIG_BLOCKED: student login 401. |
| `npm run gate:reward` | SKIP / CONFIG_BLOCKED: student login 401/429. |
| `npm run gate:dashboard-truth` | SKIP / CONFIG_BLOCKED: student login 401/429. |
| `npm run test:truth-gates` | Exit 0; summary `pass=11`, `fail=0`, `skip=3`. Fresh artifact: `docs/repair/_artifacts/truth-gates/truth-gates-run-1781483735910.json`. |
| `npm run test:truth-gates:launch` | Exit 1; summary `pass=8`, `fail=0`, `skip=3`. Launch failed because live Phase 9 gates skipped. Fresh artifact: `docs/repair/_artifacts/truth-gates/truth-gates-run-1781483832864.json`. |
| `npm run test:truth-gates:offline` | PASS; contract gates run under `*_CONTRACT_PASS`. |
| `npm run test:production-script-guards` | PASS, 11/11. |
| `git diff --check` | PASS; CRLF warnings only. |
| IDE lints on changed Phase 9 files | PASS, no linter errors. |

## 5. Files Changed In Phase 9

- `scripts/truth-gates/lib/live-parent-activity-flow.mjs`
- `scripts/truth-gates/gates/parent-activity-pass.mjs`
- `scripts/truth-gates/gates/reward-pass.mjs`
- `scripts/truth-gates/gates/dashboard-truth-pass.mjs`
- `scripts/truth-gates/gates/parent-activity-contract-pass.mjs`
- `scripts/truth-gates/gates/reward-contract-pass.mjs`
- `scripts/truth-gates/gates/dashboard-truth-contract-pass.mjs`
- `scripts/truth-gates/gate-registry.mjs`
- `docs/repair/truth-gates-and-pass-contract.md`
- `package.json`
- `docs/repair/phase9-live-parent-activity-reward-dashboard-gates-report.md`

Fresh artifacts:

- `docs/repair/_artifacts/truth-gates/truth-gates-run-1781483735910.json`
- `docs/repair/_artifacts/truth-gates/truth-gates-run-1781483832864.json`
- Additional offline single-gate artifacts under `docs/repair/_artifacts/truth-gates/`
- Fresh `PDF_PASS` output under `qa-visual-output/truth-gates/`

## 6. Blockers Remaining

1. Live student credentials are not valid for `/api/student/login`.
   - Root cause category: `CONFIG_BLOCKED`, not product code failure.
   - Required fix: provide valid `E2E_STUDENT_USERNAME` or `E2E_STUDENT_CODE` plus valid `E2E_STUDENT_PIN` for the parent-linked student used by truth gates.
2. Because student login is blocked, Phase 9 could not prove:
   - parent activity live create → student submit → report-data/UI/PDF,
   - no double counting after submit/retry,
   - live reward coin transaction idempotency,
   - live dashboard-after-activity UI truth,
   - localStorage poison resistance after real activity.

No mock was marked as live PASS.

## 7. Re-run Commands

```powershell
npm run build
npx next start -p 3011

$env:TRUTH_GATES_BASE_URL='http://127.0.0.1:3011'

# Server verification
Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3011/parent/login'
Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3011/learning/parent-report?source=parent&studentId=00000000-0000-4000-8000-000000000000'

# Required gates
npm run gate:e2e-truth
npm run gate:parent-activity
npm run gate:reward
npm run gate:dashboard-truth
npm run test:truth-gates
npm run test:truth-gates:launch
npm run test:truth-gates:offline
npm run test:production-script-guards
git diff --check
```

To convert the three Phase 9 live gates from `SKIP / CONFIG_BLOCKED` to real PASS, first set valid student E2E credentials for the same parent-linked student:

```powershell
$env:E2E_STUDENT_USERNAME='...'
$env:E2E_STUDENT_PIN='....'
# or
$env:E2E_STUDENT_CODE='...'
$env:E2E_STUDENT_PIN='....'
```
