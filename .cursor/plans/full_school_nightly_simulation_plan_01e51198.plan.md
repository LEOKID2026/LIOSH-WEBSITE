---
name: Full School Nightly Simulation Plan
overview: Document the status of all existing nightly / virtual-student / launch-readiness infrastructure, identify gaps, and produce a concrete plan for reaching a fully automated nightly full-school simulation with a wired launch-readiness gate.
todos:
  - id: create-plan-doc
    content: Create docs/qa/FULL_SCHOOL_NIGHTLY_SIMULATION_PLAN.md with the full plan
    status: pending
  - id: operator-env-file
    content: "Owner: create private env file per SCHEDULER-SETUP.md Step 1"
    status: pending
  - id: operator-validate-dry
    content: "Owner: validate env + toolchain with -DryRun and -PreflightOnly"
    status: pending
  - id: operator-scheduler
    content: "Owner: register Windows Task Scheduler per SCHEDULER-SETUP.md Step 4"
    status: pending
  - id: operator-first-run
    content: "Owner: run first supervised nightly; inspect run-summary.md and run gate"
    status: pending
  - id: wire-core-layers
    content: "Code: wire coverage, parentReportTruth, dataIntegrity layers in aggregator.mjs"
    status: pending
  - id: auto-gate-ps1
    content: "Code: append auto-gate invocation to run-nightly.ps1 (optional)"
    status: pending
isProject: false
---

# Full School Nightly Simulation — Status and Plan

## 1. Current Status (read-only audit, 2026-05-28)

### A. What exists and is fully built

#### Nightly simulator — Phase D2 (`scripts/virtual-student-qa/`)

All 39 files are present and the simulation is functionally complete. The last documented run was the D2.5 realtime Vercel smoke on 2026-05-27 (KNOWN-ISSUES.md). Key components:

- [`run.mjs`](scripts/virtual-student-qa/run.mjs) — CLI entry (phases A / B / C / D / D2)
- [`scripts/run-nightly.ps1`](scripts/virtual-student-qa/scripts/run-nightly.ps1) — Windows Task Scheduler wrapper. Loads private env, invokes `node run.mjs --phase d2 --mode realtime`, tees to `%LOCALAPPDATA%\liosh-qa\nightly-logs\`
- [`docs/SCHEDULER-SETUP.md`](scripts/virtual-student-qa/docs/SCHEDULER-SETUP.md) — Complete operator runbook; includes the `schtasks /Create` one-liner
- [`scenarios/student-personas.mjs`](scripts/virtual-student-qa/scenarios/student-personas.mjs) — All 12 personas (AAA1–AAA12), grades 1–6, 2 per grade, with consistency, weaknesses, and evolution

**Subjects covered by drivers:** math, geometry, hebrew, english, science, moledet-geography

**What the full D2 run does:**

1. Preflight — parent UI login, `/api/parent/list-students` validation (expects AAA1–AAA12 with name + grade), 12 student UI logins sequentially in isolated contexts
2. Daily plan generation — probabilistic attendance per persona (Bernoulli(consistency))
3. For each studied student: opens parent report baseline → runs multi-session learning (subject driver) → takes after-report snapshot → verifies delta
4. Cross-student bleed check — subjects the student did NOT study today must show zero delta
5. Atomic `state.json` advance (longitudinal, outside repo)
6. Writes `reports/virtual-student-daily/<YYYY-MM-DD>/run-summary.json` and supporting artifacts

**Known issues:** 0 open, 2 resolved (english driver rewritten 2026-05-23 for typing questions and fiber-probe accuracy)

#### Launch-readiness gate (`scripts/launch-readiness/`)

All 26 files present. Entry: `npm run qa:launch:daily-gate -- --date YYYY-MM-DD`

Writes:
- `reports/launch-readiness/<date>/LAUNCH_READINESS_DAILY.json`
- `reports/launch-readiness/<date>/LAUNCH_READINESS_DAILY.md`

13 layers defined in `lib/verdict-rules.mjs`:
- **4 core** (must all be `pass` for READY verdict): `nightly`, `coverage`, `parentReportTruth`, `dataIntegrity`
- **9 non-core**: diagnosticGroundTruth, similarQuestions, recommendation, copilotTruth, mobile, crossDevicePersistence, failureRecovery, pdfExport, questionQuality

`isFullNightlyRun` is a first-class top-level field in the JSON. It is computed by `classifyRunKind()` in `lib/aggregator.mjs` by reading `run-summary.json`'s `studentLabelsFilter` and comparing plan vs suite counts.

#### `npm run` scripts wired (package.json lines 68–79)

```
qa:launch:daily-gate           → build-launch-readiness-daily.mjs
qa:launch:coverage             → build-coverage-matrix.mjs
qa:launch:parent-report-truth  → build-parent-report-truth-audit.mjs
qa:launch:data-integrity       → build-data-integrity-audit.mjs
qa:launch:diagnostic-ground-truth → build-diagnostic-ground-truth-report.mjs
qa:capture:parent-report-snapshots → capture-parent-report-snapshots.mjs
qa:launch:similar-questions    → build-similar-question-audit.mjs
qa:launch:parent-recommendation → build-parent-recommendation-audit.mjs
qa:launch:parent-copilot-truth → run-copilot-truth-prompts.mjs
qa:launch:mobile               → probe-mobile-rtl.mjs
qa:launch:cross-device         → probe-cross-device-persistence.mjs
qa:launch:failure-recovery     → probe-failure-recovery.mjs
```

---

### B. What is NOT yet in place (gaps)

| Gap | Severity | Details |
|---|---|---|
| No run artifacts exist | P0 | `reports/virtual-student-daily/` and `reports/launch-readiness/` are both empty. The gate has no `run-summary.json` to read, so all layers are `not_run`. |
| Task Scheduler not registered | P0 | SCHEDULER-SETUP.md documents the `schtasks /Create` one-liner exactly. Operator must run it once. Private env file must be created first. |
| Private env file not created | P0 | `%LOCALAPPDATA%\liosh-qa\env\virtual-student-qa.env.ps1` must exist with real credentials. Template is in SCHEDULER-SETUP.md. |
| 3 of 4 core gate layers return `not_run` | P1 | `coverage`, `parentReportTruth`, `dataIntegrity` are wired but their build scripts have not been connected to a real data source yet (they read from artifacts that don't exist). Gate verdict will be PARTIAL, not READY. |
| No post-nightly auto-gate | P1 | After the nightly finishes, `npm run qa:launch:daily-gate` must be run manually. There is no automatic chaining. |
| No combined nightly+gate command | P2 | Two separate invocations needed today. |
| No planning doc | P2 | `docs/qa/FULL_SCHOOL_NIGHTLY_SIMULATION_PLAN.md` does not exist yet. |

---

## 2. What the current simulation does and does NOT do

### Does
- Parent preflight login (real `/parent/login` UI)
- 12 student UI logins (real `/student/login` UI, all 12 AAA)
- `/api/parent/list-students` — validates all 12 are linked with name + grade
- Grades 1–6 covered: AAA1+AAA2 (g1), AAA3+AAA4 (g2), AAA5+AAA6 (g3), AAA7+AAA8 (g4), AAA9+AAA10 (g5), AAA11+AAA12 (g6)
- Probabilistic attendance (not all 12 study every night — correct, by design)
- Multi-subject, multi-session learning per student
- Session start + answer + finish via real product UI
- Parent report before/after snapshot + delta verification
- Cross-student bleed check (zero delta in unrelated subjects)
- Atomic `state.json` advance (only on pass/partial)
- Per-student and per-run artifacts with screenshots and logs
- `isFullNightlyRun` computed and surfaced in gate JSON

### Does NOT (yet, because no run has happened)
- Produce any artifact for the gate to read (no `run-summary.json` exists)
- Run automatically (Task Scheduler not registered)
- Auto-trigger the launch gate after finishing
- Have 3 of 4 core gate layers wired to real data (coverage, parentReportTruth, dataIntegrity)

---

## 3. Proposed implementation steps

Steps are ordered by dependency. Steps 1–3 are operator actions (not code).

### Step 1 — Create private env file (operator action, 5 min)

Per SCHEDULER-SETUP.md Step 1. Creates `%LOCALAPPDATA%\liosh-qa\env\virtual-student-qa.env.ps1` with `E2E_PARENT_EMAIL`, `E2E_PARENT_PASSWORD`, `VIRTUAL_STUDENT_ACCOUNTS` (all 12 AAA credentials in JSON), and `VIRTUAL_STUDENT_DAILY_MAX_MINUTES=600`.

Validate:
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\virtual-student-qa\scripts\run-nightly.ps1 -DryRun
```

### Step 2 — Validate preflight against Vercel (operator action, 10 min)

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\virtual-student-qa\scripts\run-nightly.ps1 -PreflightOnly
```

Expected: `slice: D2.2, stage: preflight-only, status: PASS`. If any student login fails, fix before continuing.

### Step 3 — Register Task Scheduler (operator action, 5 min)

Exact `schtasks /Create` command is in SCHEDULER-SETUP.md Option A. Then open GUI and set "Stop the task if it runs longer than: 10 hours". Trigger: 02:00 daily.

Alternatively, right-click the task → Run once manually with eyes on screen first.

### Step 4 — First official nightly run (produces initial artifacts)

After Step 3, the first run writes:
```
reports/virtual-student-daily/<date>/
  run-summary.json       ← gate reads this
  run-summary.md
  plan.json
  state-snapshot.json
  s01-AAA1/ ... s12-AAA12/
```

### Step 5 — Run the gate after the nightly

```
npm run qa:launch:daily-gate -- --date <YYYY-MM-DD>
```

Writes `reports/launch-readiness/<date>/LAUNCH_READINESS_DAILY.{json,md}`. At this point, verdict will be PARTIAL (nightly layer=pass, coverage/parentReportTruth/dataIntegrity=not_run).

### Step 6 — Wire the three remaining core gate layers (code work, future sprint)

- `coverage` — connect `build-coverage-matrix.mjs` to produce `reports/launch-readiness/<date>/coverage-summary.json` and have `aggregator.mjs` read it
- `parentReportTruth` — connect `build-parent-report-truth-audit.mjs` to read the per-student parent-report snapshots from `reports/virtual-student-daily/<date>/`
- `dataIntegrity` — connect `build-data-integrity-audit.mjs` to run Supabase row-count and cross-student isolation checks

Only after these are wired can the gate reach `READY`.

### Step 7 — Add auto-gate to nightly wrapper (optional, code work)

Append to `run-nightly.ps1` after the `node @nodeArgs` call (exit-code check gating):
```powershell
if ($runnerExit -eq 0 -or $runnerExit -eq 1) {
  node scripts/launch-readiness/build-launch-readiness-daily.mjs --date $Date 2>&1 | ForEach-Object { Write-Tee $_ }
}
```
This makes the gate artifact appear automatically every morning.

---

## 4. Proposed nightly command (already exists)

The nightly is invoked via Task Scheduler automatically. For manual runs:

```powershell
# Full nightly + gate (after Step 7)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\virtual-student-qa\scripts\run-nightly.ps1

# Gate only (to regenerate report for a past date)
npm run qa:launch:daily-gate -- --date 2026-05-28
```

---

## 5. Proposed report outputs

Per nightly run:
```
reports/virtual-student-daily/<YYYY-MM-DD>/
  run-summary.json        (machine-readable; gate reads this)
  run-summary.md          (human-readable morning report)
  plan.json               (which students studied, which skipped)
  state-snapshot.json     (longitudinal state after the run)
  failure-repro.md        (only present on FAIL)
  s01-AAA1/               (per-student: screenshots + per-subject logs)
  ...
  s12-AAA12/
```

Per gate run:
```
reports/launch-readiness/<YYYY-MM-DD>/
  LAUNCH_READINESS_DAILY.json   (machine-readable; includes isFullNightlyRun)
  LAUNCH_READINESS_DAILY.md     (human-readable verdict + layer table)
```

---

## 6. Pass/fail criteria

### Nightly runner (`run-summary.json`)

| Signal | Classification |
|---|---|
| `status=pass`, `preflight.parent.ok=true`, all student logins `ok=true`, no bleed | Pass — state.json advances |
| `status=partial` — some students studied, some skipped due to attendance | Acceptable — state.json advances |
| `status=fail` — preflight failure OR per-student crash | Fail — state.json NOT advanced |
| `isFullNightlyRun=false` (studentLabelsFilter non-empty) | Gate refuses READY verdict |

### Launch gate (`LAUNCH_READINESS_DAILY.json`)

| Verdict | Condition |
|---|---|
| `READY` | 0 P0 blockers, ≤3 P1 warnings, all 4 core layers=pass, nightly=pass, `isFullNightlyRun=true` |
| `PARTIAL` | 0 P0, ≥1 P1 warning OR ≥1 core layer `not_run` |
| `BLOCKED` | ≥1 P0 blocker present |
| `NOT READY` | ≥1 P0 blocker AND nightly=fail |

---

## 7. P0 blockers / P1 warnings / P2 notes

### P0 — blocks READY verdict and must be fixed first

- Private env file missing — nightly cannot start
- Task Scheduler not registered — nightly never fires automatically
- Parent login fails at preflight — nightly aborts before any learning
- Any of the 12 student logins fails at preflight — P0 per `aggregator.mjs`
- `run-summary.json` missing for the target date — gate cannot evaluate
- `isFullNightlyRun=false` (filtered run used as readiness data)
- `status=fail` in `run-summary.json`

### P1 — warnings that keep verdict at PARTIAL

- `coverage` / `parentReportTruth` / `dataIntegrity` layers not yet wired (current state)
- Some students consistently skip (low-consistency personas like AAA8=0.3 or AAA12=0.45)
- Any per-student `verdict=partial` in the suite

### P2 — informational

- Filtered/manual smoke runs produce `isFullNightlyRun=false`; gate flags this but does not block a PARTIAL verdict
- `state.lastRunDate` ahead of wall clock (from validation runs) — date-safety guard fires, use state reset procedure in SCHEDULER-SETUP.md

---

## 8. What must remain read-only / must not be touched

The simulation tooling is designed around these hard invariants (from `student-personas.mjs` and orchestrator comments):

- The personas drive simulator intent only — they never modify product UI, Hebrew copy, diagnostic logic, parent-report logic, or any Supabase row
- The nightly runner never modifies `pages/`, `components/`, root `lib/`, `supabase/`, migrations, routes, or CSS
- `state.json` lives outside the repo (`%LOCALAPPDATA%\liosh-qa\virtual-student-state\`) — never committed
- Private env file (`virtual-student-qa.env.ps1`) lives outside the repo — never committed
- The launch gate is read-only (reads artifacts, never writes to product or Supabase)
- No changes to: UI routes, SQL/migrations, Hebrew copy, CSS, authentication logic

The three items the plan proposes to change (Steps 6–7) are:
- `scripts/launch-readiness/lib/aggregator.mjs` — wiring 3 new layer readers
- `scripts/launch-readiness/scripts/run-nightly.ps1` — optional auto-gate append
- `docs/qa/FULL_SCHOOL_NIGHTLY_SIMULATION_PLAN.md` — the doc itself

---

## 9. Immediate next actions (in order)

1. Create `docs/qa/FULL_SCHOOL_NIGHTLY_SIMULATION_PLAN.md` (this plan, persisted)
2. Owner: create private env file per SCHEDULER-SETUP.md Step 1
3. Owner: validate with `-DryRun` then `-PreflightOnly`
4. Owner: register Task Scheduler per SCHEDULER-SETUP.md Step 4
5. Owner: do one manual supervised run; inspect `reports/virtual-student-daily/<date>/run-summary.md`
6. Run `npm run qa:launch:daily-gate -- --date <date>` and inspect verdict (expect PARTIAL)
7. Code sprint: wire `coverage`, `parentReportTruth`, `dataIntegrity` layers in `aggregator.mjs`
8. Code sprint: add auto-gate invocation to `run-nightly.ps1`
