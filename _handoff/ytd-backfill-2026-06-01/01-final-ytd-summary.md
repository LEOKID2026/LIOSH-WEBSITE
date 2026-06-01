# Final YTD summary (`2025-09-01` → `2026-05-28`)

## Scope

- **School:** Demo school (398 students, 108 classes)
- **Calendar range:** `2025-09-01` → `2026-05-28`
- **School days:** 194
- **Home practice scope:** `sample`

## Outcome

| Metric | Value |
|--------|-------|
| `completedDates` | **194/194** |
| Last completed | **`2026-05-28`** |
| Final UI checkpoint | **PASS** |
| Final report checkpoint | **PASS** (after product fix promote + checkpoint rerun) |
| `historicalFails` (final rerun) | **0** |
| `--adopt-state` | **Not run** |

## Timeline highlights

1. **Initial YTD progress:** 184/194 through `2026-05-14`; `week-20260510` report checkpoint failed (explicit May ranges returned 0 on production).
2. **Product fix identified:** PostgREST 1000-row cap + oversized `.in("activity_id", …)` in school-scoped classroom rollup.
3. **Scoped deploy + `week-20260510` rerun:** PASS (R2/R3/R4 May totals 160/160/420 for spot student).
4. **Resume final 5 days (`2026-05-17` → `2026-05-21`):** Sim OK; `week-20260517` failed when production reverted to unfixed `main`.
5. **Re-promote fix + `week-20260517` rerun:** PASS.
6. **Resume final 5 days (`2026-05-24` → `2026-05-28`):** Sim OK; first final checkpoint failed (production reverted again).
7. **Re-promote fix + final checkpoint rerun:** PASS.

## Final production verification (spot student `f1ee3d3d…`, promoted fix)

| Range | R2 | R3 | R4 |
|-------|----|----|-----|
| `2026-05-01` → `2026-05-14` | 160 | 160 | 420 |
| `2026-05-17` → `2026-05-21` | 60 | 60 | 180 |
| `2026-05-24` → `2026-05-28` | 60 | 60 | 180 |
| `2026-05-01` → `2026-05-28` | 280 | 280 | 780 |
| `2025-09-01` → `2026-05-28` (full_range) | 2760 | 2760 | 7560 |

## Artifacts

- State: `.local/backfill-state/2025-09-01__2026-05-28.json`
- Reports: `reports/school-sim-backfill/2025-09-01__2026-05-28/`

## Standard resume command (historical reference — YTD now complete)

```powershell
node --env-file=.env.local scripts/school-portal/run-school-sim-backfill.mjs `
  --from 2025-09-01 --to 2026-05-28 `
  --allow-large-range --home-practice-scope sample --no-confirm
```

Do **not** use `--reset-first` or `--adopt-state` unless explicitly approved.
