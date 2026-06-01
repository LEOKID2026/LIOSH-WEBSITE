# Current status (handoff snapshot)

**Handoff date:** 2026-06-01  
**Branch:** `handoff/ytd-backfill-2026-06-01`

## Simulation checkpoints

| Range | Status | Notes |
|-------|--------|-------|
| YTD `2025-09-01` → `2026-05-28` | **PASS** | 194/194 school days; final report checkpoint PASS after promoted fix deploy |
| Extension `2025-09-01` → `2026-06-01` | **PASS** | +2 days (`2026-05-31`, `2026-06-01`); 196/196; final checkpoint PASS |

## Backfill state files (local, not in this handoff folder)

| State key | File | completedDates | Last date |
|-----------|------|----------------|-----------|
| YTD | `.local/backfill-state/2025-09-01__2026-05-28.json` | 194/194 | `2026-05-28` |
| Extension | `.local/backfill-state/2025-09-01__2026-06-01.json` | 196/196 | `2026-06-01` |

Extension run used a **new state file** (keyed by `from__to`). Existing YTD days were skipped via DB activity guard (`108 activities exist`), not by importing the YTD state file.

## Operational flags

| Item | Status |
|------|--------|
| `--adopt-state` | **Not run** |
| Nightly/daily sim | **Off** (not resumed) |
| `--reset-first` | **Not used** on extension |
| Partial day beyond `2026-06-01` | **None** |

## Production report fix

- Fix is **live on production** only via **promoted deployment** `dpl_5CJYPnjEMdbac2w23ZhaUZTJAJAp` (not committed to `main`).
- Git `main` auto-deploys have **overwritten** the fix multiple times; fresh `vercel deploy --archive=tgz` hit Vercel API errors during handoff period — recovery used `vercel promote` of the known-good deployment.
- **Until the two product files are committed and merged to `main`, production can regress again on any git-triggered deploy.**

## Git WIP (not committed on `main`)

- Product fix: modified `lib/teacher-server/classroom-activity-class-report.server.js`, `teacher-report.server.js`
- QA/backfill: scripts under `scripts/school-portal/` (see `patches/qa-backfill-wip.patch`)
- Stashes: `stash@{0}` wip-all-before-report-fix-deploy, `stash@{1}` qa-wip-backfill-scripts
