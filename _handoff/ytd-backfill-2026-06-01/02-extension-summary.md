# Extension summary (`2025-09-01` → `2026-06-01`)

## Scope

Extend simulation by **2 school days** after YTD completion:

- `2026-05-31` (school day 195)
- `2026-06-01` (school day 196)

(`2026-05-29`–`2026-05-30` are weekend/non-school in the calendar engine.)

## State behavior (important)

Running `--from 2025-09-01 --to 2026-06-01` creates a **new state file**:

- `.local/backfill-state/2025-09-01__2026-06-01.json`

It does **not** import completed dates from `2025-09-01__2026-05-28.json`.

**Safe skip:** For each day, if DB already has classroom activities (`countExistingActivitiesForDay > 0`), the runner skips without re-simulating. All **194** YTD days were skipped with log lines like:

```text
backfill: skip 2026-05-28 (108 activities exist)
```

Only **`2026-05-31`** and **`2026-06-01`** received new db-sim + home-practice.

## Outcome

| Metric | Value |
|--------|-------|
| Exit code | **0** |
| `overallStatus` | **PASS** |
| `schoolDaysSimulated` | **2** |
| `daysSkipped` (alreadyExists) | **194** |
| `completedDates` (extension state) | **196/196** |
| Last completed | **`2026-06-01`** |
| UI checkpoints | 1/1 PASS |
| Report checkpoints | 2/2 PASS |
| `--adopt-state` | **false** |

## Command used

```powershell
node --env-file=.env.local scripts/school-portal/run-school-sim-backfill.mjs `
  --from 2025-09-01 --to 2026-06-01 `
  --allow-large-range --home-practice-scope sample --no-confirm
```

## Artifacts

- State: `.local/backfill-state/2025-09-01__2026-06-01.json`
- Reports: `reports/school-sim-backfill/2025-09-01__2026-06-01/`

## Pre-flight checks performed

- No backfill process running
- No `days/2026-05-31/` or `days/2026-06-01/` artifacts before run
- DB: 0 activities / 0 HP for both extension dates before run
