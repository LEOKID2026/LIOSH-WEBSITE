# Teacher Classroom Daily Simulation — Operator Runbook

Isolated daily runner for one fixed QA teacher classroom (20 students).  
**Does not** modify or share state with `scripts/virtual-student-qa/` AAA nightly runner.

## Accounts (dedicated)

| Role | Email |
|------|-------|
| Teacher | `teacher@leo.com` |
| Parent (owns 20 sim students) | `parent-class-sim@liosh-dev.invalid` |
| Students | `simg3-01` … `simg3-20` (PIN default `1234`) |

Env passwords (optional): `SIM_TEACHER_PASSWORD` (default `747975`), `SIM_TEACHER_PARENT_PASSWORD`, `SIM_TEACHER_STUDENT_PIN`.

## Commands

```bash
# Default daily run (auto-rotate subject)
node --env-file=.env.local --env-file=.env.e2e.local \
  scripts/teacher-portal/run-teacher-classroom-daily-simulation.mjs --grade=g3

# Manual subject
node --env-file=.env.local --env-file=.env.e2e.local \
  scripts/teacher-portal/run-teacher-classroom-daily-simulation.mjs --grade=g3 --subject=math

# Dry-run / provision inspect
node --env-file=.env.local --env-file=.env.e2e.local \
  scripts/teacher-portal/run-teacher-classroom-daily-simulation.mjs --grade=g3 --dry-run=true

node --env-file=.env.local --env-file=.env.e2e.local \
  scripts/teacher-portal/run-teacher-classroom-daily-simulation.mjs --grade=g3 --print-only=true

# Reset sim activity only (never AAA/admin)
node --env-file=.env.local --env-file=.env.e2e.local \
  scripts/teacher-portal/run-teacher-classroom-daily-simulation.mjs --grade=g3 --reset-activity=true --force=true
```

## State & logs (separate from AAA nightly)

| Item | Location |
|------|----------|
| State + manifest | `%LOCALAPPDATA%\liosh-qa\teacher-classroom-sim-state\` |
| Run artifacts | `reports/teacher-classroom-daily/YYYY-MM-DD/<subject>/` |

AAA nightly state remains at `%LOCALAPPDATA%\liosh-qa\virtual-student-state\` — **never touched**.

## Nightly laptop integration (NOT auto-scheduled)

Optional wrapper: `scripts/teacher-portal/run-teacher-classroom-nightly.ps1`  
Suggested trigger: **03:00** (offset from AAA 02:00).  
Do **not** register Task Scheduler unless explicitly approved.

If laptop is off: no catch-up; next run uses today's date only.  
If run fails: state not advanced for that day/subject; safe to re-run with `--force=true`.  
Idempotent per `(date, grade, subject)` unless `--force=true`.

## Visual verification

1. Open `/teacher/login`
2. Log in as `teacher@leo.com` (password `747975`)
3. Dashboard → one class `כיתת סימולציה - כיתה ג׳` + 20 students
4. Open class report + 3 student reports (strong / weak / improving slots)
5. On a student report: section **הודעה להורה** — compose and verify history
6. Parent code login (`leo-p01` / `1234`) → child report shows **מה חשוב לדעת**, **מה מומלץ לעשות בבית**, and **הודעות מהמורה** (after seed below)

### Sample teacher messages (after migration 023)

Owner must apply `supabase/migrations/023_teacher_parent_messages.sql`, then:

```bash
node --env-file=.env.local scripts/teacher-portal/seed-simulation-parent-messages.mjs
```
