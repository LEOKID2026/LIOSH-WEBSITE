# Production report aggregation fix

## Symptom

Report checkpoints failed on explicit historical `from`/`to` ranges for school-scoped students with large classroom activity volume:

- R2/R3/R4 returned **HTTP 200** with **total=0** for May explicit ranges
- R3 browser **full_range** still **PASS** (rolling/custom full-range path had data)
- Example failure: `week-20260510`, `week-20260517`, `final` — spot student `f1ee3d3d-77b5-48cd-96d2-f42eb60a3bea`

## Root cause

Two bugs in school-scoped classroom rollup (`lib/teacher-server/classroom-activity-class-report.server.js`):

### 1. PostgREST 1000-row cap

`classroom_activities` for school-scoped member classes (6+ classes, 1000+ activities) was fetched without pagination. May backfill activities (inserted last) were dropped beyond the first 1000 rows.

**Effect:** `full_range` could include pre-May data; explicit May-only ranges returned **0**.

### 2. Oversized `.in("activity_id", …)` queries

~394+ activity UUIDs in a single `.in()` caused `TypeError: fetch failed` (header overflow). Status/answer fetches now chunk at **80 IDs** (`ACTIVITY_ID_IN_CHUNK`).

### 3. R2 grade level (secondary)

`teacher-report.server.js`: R2 aligned with R3 — pass `gradeLevel: options.gradeLevel ?? loaded.student?.grade_level ?? null` into school-scoped rollup.

## Fix files (product only)

| File | Change |
|------|--------|
| `lib/teacher-server/classroom-activity-class-report.server.js` | Paginated `fetchScopedClassroomActivitiesForClassIds`, chunked `fetchClassroomStatusRowsForActivities`, `isTimestampInRange` |
| `lib/teacher-server/teacher-report.server.js` | R2 grade_level passthrough |

## Regression test (local, not production runtime)

`scripts/tests/report-explicit-may-range-regression.mjs` — verifies local R2/R3/R4 builds for explicit May ranges.

## Production verification (promoted deployment `dpl_5CJYPnjEMdbac2w23ZhaUZTJAJAp`)

Spot student `f1ee3d3d…`:

| Range | R2 | R3 | R4 |
|-------|----|----|-----|
| `2026-05-01` → `2026-05-14` | 160 | 160 | 420 |
| `2026-05-17` → `2026-05-21` | 60 | 60 | 180 |
| `2026-05-24` → `2026-05-28` | 60 | 60 | 180 |
| `2026-05-01` → `2026-05-28` | 280 | 280 | 780 |
| `2025-09-01` → `2026-05-28` (full_range) | 2760 | 2760 | 7560 |

## Deploy notes

- Fix was deployed via **uncommitted** `npx vercel deploy --prod --yes --archive=tgz` from local working tree.
- **Git `main` auto-deploy** repeatedly overwrote production with unfixed code.
- Recovery: `vercel promote dpl_5CJYPnjEMdbac2w23ZhaUZTJAJAp`
- **Fix is NOT on `main`** until committed and merged — high regression risk on next deploy.

## Patch

See `patches/product-report-fix.patch` and full files under `files/product-fix/`.
