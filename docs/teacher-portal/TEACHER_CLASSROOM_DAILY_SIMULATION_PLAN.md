# Teacher Classroom Daily Simulation — Plan

Approved implementation plan. See also `scripts/teacher-portal/teacher-classroom-sim/README.md` for operator commands.

## Goal

Daily Playwright/UI-driven simulation maintaining one fixed QA teacher, one class per grade, 20 fixed students — realistic learning activity accumulating over time for teacher dashboard, class report, student reports, recommendations.

## Locked decisions

- **Mechanism:** Playwright + real `/api/learning/*` (reuse `scripts/virtual-student-qa/` read-only)
- **NOT** direct Supabase row injection
- **Dedicated parent:** `parent-class-sim@liosh-dev.invalid`
- **Dedicated teacher:** `teacher@leo.com` (password `747975`), `app_metadata.role="teacher"`, plan `teacher_basic_20`
- **Default grade:** `g3`
- **Isolation:** no changes to AAA nightly, admin@admin.com, AAA1–12, ADMIN demo

## Implementation files

```
scripts/teacher-portal/run-teacher-classroom-daily-simulation.mjs
scripts/teacher-portal/teacher-classroom-sim/
  config.mjs bootstrap.mjs personas.mjs subjects.mjs daily-plan.mjs
  orchestrator.mjs state.mjs output.mjs README.md
scripts/teacher-portal/run-teacher-classroom-nightly.ps1  (wrapper only, not registered)
docs/teacher-portal/TEACHER_CLASSROOM_DAILY_SIMULATION_PLAN.md
```

## Safety

- No SQL migrations / RLS changes
- `--reset-activity=true` only for sim students (name prefix + manifest parent)
- Separate state dir: `%LOCALAPPDATA%\liosh-qa\teacher-classroom-sim-state\`
