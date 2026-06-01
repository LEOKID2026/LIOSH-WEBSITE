# Artifact and state index

Large state/report trees are **not copied** into the handoff folder. Paths below are relative to repo root on the machine where simulation ran.

## Backfill state (local sandbox)

| Path | Description |
|------|-------------|
| `.local/backfill-state/2025-09-01__2026-05-28.json` | YTD state — 194 completed dates, ends `2026-05-28` |
| `.local/backfill-state/2025-09-01__2026-06-01.json` | Extension state — 196 completed dates, ends `2026-06-01` |
| `.local/backfill-state/2025-09-01__2026-05-28.lock` | May be stale — check PID before removal |
| `.local/backfill-state/2025-09-01__2026-06-01.lock` | May be stale — check PID before removal |

**Not included:** `.local/backfill-state/backups/` (if present)

## Report artifacts

| Path | Description |
|------|-------------|
| `reports/school-sim-backfill/2025-09-01__2026-05-28/` | YTD run artifacts (weeks, months, final, days/) |
| `reports/school-sim-backfill/2025-09-01__2026-06-01/` | Extension run artifacts |

### Key checkpoint JSON files

| File | Last known status |
|------|-------------------|
| `reports/school-sim-backfill/2025-09-01__2026-05-28/final/report-checkpoint.json` | PASS (after promote + rerun) |
| `reports/school-sim-backfill/2025-09-01__2026-05-28/weeks/week-20260517/report-checkpoint.json` | PASS |
| `reports/school-sim-backfill/2025-09-01__2026-05-28/weeks/week-20260510/report-checkpoint.json` | PASS |
| `reports/school-sim-backfill/2025-09-01__2026-06-01/final/report-checkpoint.json` | PASS (extension run) |

## Sim runtime state (separate from backfill state)

| Path | Description |
|------|-------------|
| `scripts/school-portal/sim-state.json` | Longitudinal sim personas / school IDs (not adopted from backfill) |

## Excluded from handoff (by design)

- `.env*`, `.vercel`, `.next`, `node_modules`
- Service-role keys, tokens, raw passwords
- Full report JSON trees (large)
- DB dumps

## Production reference

- Promoted fix deployment: `dpl_5CJYPnjEMdbac2w23ZhaUZTJAJAp`
- Production URL: `https://liosh-website.vercel.app`
