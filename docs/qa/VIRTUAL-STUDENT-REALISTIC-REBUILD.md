# Virtual Student QA — Realistic Rebuild Architecture

Owner decision (2026-06): prior AAA simulation data from **2026-05-01** is invalid for parent-report realism QA. Rebuild simulation only; scoped DB reset after smoke PASS.

## 1. Daily orchestrator

| Layer | File | Entry |
|-------|------|--------|
| CLI | `scripts/virtual-student-qa/run.mjs` | `main()` → `mainPhaseD2()` → `runPhaseD2FullRun()` |
| Orchestrator | `lib/phase-d2-orchestrator.mjs` | `runPhaseD2Suite()` |
| Planner | `lib/daily-plan-generator.mjs` | `generateDailyPlan()` |
| Adapter | `scenarios/phase-d2-suite.mjs` | `buildPhaseD2StudentRecords()` |

Flow: load state → plan → preflight → **parallel** student workers → state advance on PASS.

## 2. Student selection

- Planner: `planForOneStudent()` attendance roll via persona `consistency`
- Credentials: `VIRTUAL_STUDENT_ACCOUNTS` JSON (AAA1–AAA12)
- CLI filter: `--students AAA1,AAA2`

## 3. Session lifecycle (product — read-only)

| Step | API | Driver trigger |
|------|-----|----------------|
| Start | `POST /api/learning/session/start` | `{subject}-start-game` after Practice tab |
| Answer | `POST /api/learning/answer` | per-question submit |
| Finish | `POST /api/learning/session/finish` | `learning-stop-game` |

Duration: product **question time ledger** accumulates wall-clock ms during visible question → `duration_seconds` at finish. Simulation must **wait in-browser** before submit.

## 4. Root cause (pre-fix)

- Backfill used `run-range.ps1 -Mode fast` → `pacerScale=0`
- `pauseBetweenQuestions()` existed but **was never called** in drivers
- Between-session/student pauses are **outside** session wall-clock → invisible in `duration_seconds`
- Result: ~5–8 s/question in DB vs ~45–90 s intended

## 5. Simulation fixes (this rebuild)

### In-session pacing (`lib/session-pacing.mjs`)

- `targetSecondsPerQuestion = intendedMinutes * 60 / questionCount`
- Jitter 0.85–1.15, clamp ~30–120 s
- Called **before every answer submit** in all drivers:
  - math, geometry, hebrew, english, science, moledet-geography (MCQ factory)

### Production guard (`lib/config.mjs`)

- `assertProductionRealisticPacingGuard()` in `run.mjs`
- Blocks production writes if in-session pacing disabled
- Warns on fast/pacerScale=0 only when synthetic in-session pacing is ON

### Parallelism (`phase-d2-orchestrator.mjs`)

- `Promise.all` over studied students
- Each worker: own parent context (auth + baseline/after snapshots) + own student context
- Wall-clock ≈ longest student day (~20–35 min target), not 12× sequential

### Defaults

- `run-nightly.ps1`: `$Mode = 'realtime'`
- `run-range.ps1`: default `realtime` (catch-up still realistic duration via in-session pacing)

## 6. Reset scope (AAA only, from 2026-05-01)

**Delete/trim:** `learning_sessions`, `answers`, related `coin_transactions`, optional `parent_reports` rows, local `reports/virtual-student-daily/*`, local state → `lastRunDate=2026-04-30`.

**Never delete:** AAA accounts, parent account, schema, non-AAA users, School Sim 04:00.

Dry-run: `node scripts/virtual-student-qa/scripts/dry-run-aaa-reset.mjs --from 2026-05-01`

## 7. Smoke (before reset)

```powershell
Disable-ScheduledTask -TaskName "Liosh QA - virtual student nightly"  # done
.\scripts\virtual-student-qa\scripts\run-realistic-smoke.ps1
```

PASS criteria: `duration_seconds` / sec-per-question realistic, practice mode only, countable evidence, parent report shows plausible minutes.

## 8. Scheduler

Nightly task **disabled** until owner re-enables after realistic range is stable.
