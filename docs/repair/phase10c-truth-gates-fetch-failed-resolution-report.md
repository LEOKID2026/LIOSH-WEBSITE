# Phase 10C — Truth Gates Fetch Failed Resolution

## Scope

Phase 10C focused only on the `PARENT_ACTIVITY_PASS: FAIL — fetch failed` blocker seen during `npm run test:truth-gates`.

No product/UI/view-model/dashboard/reward/parent-report logic was changed. All changes were limited to `scripts/truth-gates` test infrastructure and diagnostics.

## Clean Server

- Port used: `3014`
- Base URL used by gates: `http://127.0.0.1:3014`
- `npm run build`: PASS
- `npx next start -p 3014`: started from the production build and kept running through all gate runs.

Preflight checks:

- `GET http://127.0.0.1:3014/parent/login`: `200`
- `parent-login-identifier` testid: found
- `POST http://127.0.0.1:3014/api/student/login` with `username=eran`, masked PIN `****`: `200`
- `liosh_student_session` cookie: set
- `GET http://127.0.0.1:3014/learning/parent-report?...`: `200`, not `404`

Credentials were used once per required flow and are recorded masked only:

- Parent email: `18e***@gmail.com`
- Parent password: `****7479`
- Student username: `eran`
- Student PIN: `****`

## Root Cause

The focused gate passed first:

- `npm run gate:parent-activity`: PASS
- Base URL: `http://127.0.0.1:3014`
- Student ID: `2352e8c7-ac0b-4daa-afbf-cb7d130062b3`
- Example live activity ID: `9ba16497-4c64-4065-8c05-01065988c252`

The first full-suite run reproduced the blocker and, after adding diagnostics, identified the exact failure:

- Failing command: `npm run test:truth-gates`
- Artifact: `docs/repair/_artifacts/truth-gates/truth-gates-run-1781523314246.json`
- Gate: `PARENT_ACTIVITY_PASS`
- Step: `answer activity 1`
- URL: `http://127.0.0.1:3014/api/student/activities/c4a2fcfd-15a5-4586-9de4-0683be36bb7e/answer`
- Error: `fetch failed`
- Code: `ETIMEDOUT`
- `TRUTH_GATES_BASE_URL`: confirmed as `http://127.0.0.1:3014`
- Server status during failure: still alive; later gates in the same run continued and passed, including `REWARD_PASS` and `DASHBOARD_TRUTH_PASS`.

Classification:

- Root cause type: test infrastructure / transient local network timeout during the live E2E gate.
- Not classified as product bug: the request did not return a product `4xx/5xx`, and the same live parent activity gate passed standalone before the full run.

## Changes Made

Changed files:

- `scripts/truth-gates/lib/live-parent-activity-flow.mjs`
- `scripts/truth-gates/lib/live-parent-report.mjs`
- `scripts/truth-gates/gates/parent-activity-pass.mjs`

Changes:

- Added step and URL diagnostics to live gate fetch failures.
- Added diagnostics for `report-data`, `list students`, parent auth, student login, parent activity create, start, answer, submit, dashboard/home-profile, and relevant DB lookup steps.
- Added a bounded single retry only for network failures during the answer step.
- If the first answer request actually committed but the response timed out, a retry returning `409 question_already_answered` is treated as evidence that the original answer was already recorded, avoiding double-answer behavior.
- Added short stack details to `PARENT_ACTIVITY_PASS` failure artifacts.

## Gate Results

Required commands:

- `npm run gate:parent-activity`: PASS
- `npm run test:truth-gates`: PASS after test-infra retry fix
  - Artifact: `docs/repair/_artifacts/truth-gates/truth-gates-run-1781523662529.json`
  - Summary: `14 PASS / 0 FAIL / 0 SKIP`
- `npm run test:truth-gates:launch`: PASS
  - Artifact: `docs/repair/_artifacts/truth-gates/truth-gates-run-1781523928344.json`
  - Summary: `11 PASS / 0 FAIL / 0 SKIP`
- `npm run test:truth-gates:offline`: PASS
  - Artifacts:
    - `docs/repair/_artifacts/truth-gates/truth-gates-run-1781523937523.json`
    - `docs/repair/_artifacts/truth-gates/truth-gates-run-1781523937886.json`
    - `docs/repair/_artifacts/truth-gates/truth-gates-run-1781523942754.json`
    - `docs/repair/_artifacts/truth-gates/truth-gates-run-1781523945221.json`
    - `docs/repair/_artifacts/truth-gates/truth-gates-run-1781523946595.json`
    - `docs/repair/_artifacts/truth-gates/truth-gates-run-1781523947178.json`
- `npm run test:production-script-guards`: PASS
  - `11` production-script-guard tests passed.
- `git diff --check`: PASS
  - Only existing Windows line-ending warnings were printed; no whitespace errors.

Launch gate status:

- All launch gates passed.
- No launch gate returned `SKIP`.
- No launch gate returned `FAIL`.

## Blockers

No remaining Phase 10C blockers.
