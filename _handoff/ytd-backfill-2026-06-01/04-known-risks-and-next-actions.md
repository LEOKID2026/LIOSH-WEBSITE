# Known risks and next actions

## Critical risks

### 1. Production deploy drift (uncommitted fix)

The report aggregation fix exists only in:

- Local working tree (uncommitted on `main`)
- Promoted Vercel deployment `dpl_5CJYPnjEMdbac2w23ZhaUZTJAJAp`

Any **git-triggered deploy from `main`** can revert production to unfixed behavior (explicit May ranges → 0).

**Mitigation:** Commit and merge product fix to `main`, or pin/promote known-good deployment after each deploy.

### 2. Fresh `vercel deploy --archive=tgz` failures

During handoff period, upload failed with Vercel API internal error at ~1.2GB. Workaround: `vercel promote <known-good-dpl-id>`.

### 3. `--adopt-state` not run

`sim-state.json` was **not** updated with final backfill counters/dates via adopt-state. Backfill state lives in separate `.local/backfill-state/*.json` files.

### 4. Dual state files

| Key | completedDates |
|-----|----------------|
| `2025-09-01__2026-05-28` | 194 |
| `2025-09-01__2026-06-01` | 196 |

Extension state includes `2026-05-28` via DB-skip adoption into `completedDates` during the extension run.

## Recommended next actions (in order)

1. **Review and merge product fix to `main`** (two lib files + regression test) — separate PR from QA/backfill WIP.
2. **Verify production** explicit ranges after any deploy (see `scripts/tests/verify-prod-may-ranges.mjs` in QA handoff copy).
3. **Decide on `--adopt-state`** only after full checkpoint PASS with zero blockers and owner approval.
4. **Nightly/daily sim:** remain off until explicitly approved.
5. **Optional:** Rerun checkpoint-only on extension range if production drift suspected:
   ```powershell
   node --env-file=.env.local scripts/school-portal/rerun-backfill-checkpoints.mjs `
     --from 2025-09-01 --to 2026-06-01 --kinds final
   ```

## Do not (unless explicitly approved)

- Merge QA/backfill WIP to `main` without review
- Run `--reset-first` on completed ranges
- Copy `.env*`, service-role keys, or credential secrets into handoff or commits
- Import anything from `_handoff/` into app runtime

## Stale locks

Check `.local/backfill-state/*.lock` before any resume; remove only after confirming PID is dead.

## Git stashes (local)

```
stash@{0}: wip-all-before-report-fix-deploy
stash@{1}: qa-wip-backfill-scripts
```

Pop carefully on a review branch; may conflict with current working tree.
