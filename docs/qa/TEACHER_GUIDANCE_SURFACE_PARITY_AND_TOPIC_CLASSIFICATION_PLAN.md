# Teacher Guidance Surface Parity & Topic Classification Plan

**Status:** Implemented (see closure report).  
**Authoritative build spec:** `.cursor/plans/guidance_parity_&_topic_fix_d7b2cf07.plan.md` (do not edit during implementation).

## Scope summary

1. **Physical Report Hub V2 parity** — `buildSchoolPhysicalClassReportPayload` composes per-subject `subjectGuidanceBlocks` via `buildClassTeacherGuidanceV2`; `parsePhysicalClassReportViewModel` reads V2 blocks when `reportMeta.version === "v2"`.
2. **Session topic canonicalization** — `lib/learning/session-topic-helpers.js` with whitelist validation; `math-master.js` / `geometry-master.js` use helpers (no `"math"` / `"geometry"` subject-name fallbacks).
3. **Math teacher-created activity topics** — canonical dropdown in `pages/teacher/class/[classId]/activities/new.js` using `MATH_GRADES` + `getMathReportBucketDisplayName`.
4. **Classification gaps** — generalised `classifyDroppedTopicReason`: `subject_name_topic`, `cross_subject_topic`, `unmapped_topic`; no mapping of `math`/`geometry` as topic labels.

## Existing data vs new data

- **Immediate:** physical hub parity, cross-subject classification, improved insight text.
- **Forward-only:** master-page and math-activity topic fixes apply to new sessions/activities only.
- **Unchanged:** historical DB rows; demo/sim data; no SQL.

## Out of scope

SQL, simulation scripts, parent/guardian reports, worksheet PDF, broad UI redesign.

## QA

- `node scripts/tests/teacher-guidance-v2-unit.mjs` (TC-1–TC-9)
- `node scripts/tests/school-report-view-model-unit.mjs` (PHYS-1–PHYS-4)
- `npm run build`
- Parent-report file guard on `git diff --name-only`

## Files touched (this implementation)

| File | Change |
| --- | --- |
| `lib/learning/session-topic-helpers.js` | **New** |
| `lib/teacher-server/teacher-guidance-v2.server.js` | Generalised classification + exports |
| `lib/school-server/school-physical-class-report.server.js` | V2 subject blocks |
| `lib/school-portal/school-report-view-model.js` | Physical V2 view-model |
| `pages/learning/math-master.js` | `resolveMathSessionTopic` |
| `pages/learning/geometry-master.js` | `resolveGeometrySessionTopic` |
| `pages/teacher/class/[classId]/activities/new.js` | Math topic dropdown |
| `scripts/tests/teacher-guidance-v2-unit.mjs` | TC-1–TC-9 |
| `scripts/tests/school-report-view-model-unit.mjs` | PHYS-1–PHYS-4 |
