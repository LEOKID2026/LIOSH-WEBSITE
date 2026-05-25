# Smoke / E2E artifact cleanup (teacher portal)

## Problem

Teacher-portal smoke scripts create real rows in the learning Supabase project. Those rows appear on the live teacher dashboard when the same teacher account is used for manual teaching and automated tests.

## Scripts that create dashboard-visible artifacts

| Script | Creates |
|--------|---------|
| `scripts/teacher-portal/phase5a-smoke.mjs` | `Phase5A Smoke Class`, `Phase5A Renamed`, `Extra N` classes |
| `scripts/teacher-portal/phase5c-class-limit-smoke.mjs` | `quota-smoke-{timestamp}` class, `Quota Smoke {i}` students |
| `scripts/teacher-portal/phase7-smoke.mjs` | `Phase7 Smoke Class` |
| `scripts/teacher-portal/phase7b-smoke.mjs` | `Phase7B Smoke Class` (direct DB insert) |
| `scripts/teacher-portal/phase5d-individual-activities-smoke.mjs` | `Individual Smoke …`, `Individual IDOR …`, `Indiv Smoke Class …`, activity title `IDOR` |
| `scripts/teacher-portal/phase5d-individual-activities-smoke.mjs` | Uses verify teacher from `.env.e2e.local` |

Other portal smokes (phase5b, phase6, phase8, phase9, phase10, admin-teachers-auth) mostly reuse existing students or guardian flows; they do not add the class names above unless noted in each script.

## App-layer mitigation (no SQL)

`buildTeacherDashboardPayload` filters classes/students matching `lib/teacher-portal/teacher-smoke-artifacts.js` before sending the dashboard API response.

## Owner-approved cleanup (destructive)

Script: `scripts/teacher-portal/cleanup-smoke-artifacts.mjs`

```bash
# List only (default)
node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/cleanup-smoke-artifacts.mjs

# Apply archives (requires explicit flags)
node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/cleanup-smoke-artifacts.mjs --execute --confirm DELETE_SMOKE_ARTIFACTS
```

**Safety rules**

- Only targets classes whose `name` matches the patterns in `teacher-smoke-artifacts.js`.
- Only targets students whose `full_name` matches smoke patterns **and** are linked to the configured verify teacher (`TEACHER_PORTAL_VERIFY_EMAIL`).
- Archives classes via `archiveTeacherClass` (same as product archive).
- Does not delete students or classes by raw SQL.
- Does not touch rows that do not match patterns.

## Going forward

1. Prefer a dedicated QA teacher account not used on mobile/production UI.
2. Smoke scripts should archive/delete artifacts they create in a `finally` block, or use a isolated Supabase project.
3. New smoke data should use a consistent prefix, e.g. `[SMOKE]`, and extend `teacher-smoke-artifacts.js` if needed.

## UI copy pending owner approval

Roster filter key `teacher.roster.filter.directStudents` — direct (no class) tab is hidden until Hebrew is approved in `rosterFilterLabelHe` (`lib/teacher-portal/teacher-ui.he.js`).

Individual student activities UI is off by default (`individual_activities: false`, `NEXT_PUBLIC_INDIVIDUAL_ACTIVITIES_ENABLED` not `true`).
