# Teacher Guidance Surface Parity & Topic Classification — Closure Report

**Date:** 2026-05-28  
**Plan:** `docs/qa/TEACHER_GUIDANCE_SURFACE_PARITY_AND_TOPIC_CLASSIFICATION_PLAN.md`  
**Audit reference:** `docs/qa/TEACHER_GUIDANCE_SURFACE_PARITY_AUDIT.md`

---

## Implementation summary

### 1. Session topic helpers (`lib/learning/session-topic-helpers.js`)

- `resolveMathSessionTopic(operation)` — whitelist `OPERATIONS` from `math-constants.js`; rejects `math`, `general`, `mixed`, Hebrew free-text, unknown keys.
- `resolveGeometrySessionTopic(questionOrTopic)` — whitelist `GEOMETRY_TOPICS` keys; rejects `geometry`, `general`, `mixed`, cross-subject keys like `animals`.

### 2. Master pages

- `pages/learning/math-master.js` — session start and answer save use `resolveMathSessionTopic` (removed `|| "math"`).
- `pages/learning/geometry-master.js` — session start and answer save use `resolveGeometrySessionTopic` (removed `|| "geometry"`).

### 3. Teacher guidance V2 classification

- `classifyDroppedTopicReason` generalised: `subject_name_topic`, `cross_subject_topic`, `unmapped_topic`.
- Exported `detectFallbackDominance` for TC-4 structured QA findings.

### 4. Math activity topic dropdown

- `pages/teacher/class/[classId]/activities/new.js` — grade-aware `<select>` for math using `MATH_GRADES[grade].operations` and Hebrew labels via `getMathReportBucketDisplayName`.

### 5. Physical Report Hub V2 parity

- `lib/school-server/school-physical-class-report.server.js` — per-subject `buildClassTeacherGuidanceV2` on scoped aggregation; returns `subjectGuidanceBlocks`, `physicalClassGuidanceSeverityTier`, `reportMeta.version: "v2"`.
- `lib/school-portal/school-report-view-model.js` — V2 physical path for focus areas and tier-based insight.

---

## QA results

| Check | Result |
| --- | --- |
| `node scripts/tests/teacher-guidance-v2-unit.mjs` | **PASS** (TC-1–TC-9) |
| `node scripts/tests/school-report-view-model-unit.mjs` | **PASS** (PHYS-1–PHYS-4) |
| `npm run build` | **PASS** (warnings only, pre-existing) |
| `node scripts/parent-report-insights-selftest.mjs` | **PASS** (67/67) |

---

## Parent report safety

**`git diff --name-only` — parent paths unchanged:**

No changes under:

- `lib/parent-server/**`
- `pages/parent/**`
- `pages/api/parent/**`
- `pages/learning/parent-report*`
- `components/parent/**`
- `utils/parent-report*`
- `utils/detailed-parent-report*`

**Confirmation:** Parent report files unchanged by this implementation.

**Automated smoke:** `parent-report-insights-selftest.mjs` — 67/67 passed.

---

## Existing data expectation (owner browser QA)

- Inspected demo/historical classes (`f3ce0760`, `aaac8e23`, `כיתה ג׳ 3`, student `bfe02b03`) may still show **broad subject fallback** until new post-fix sessions/activities accumulate.
- **Physical hub** should immediately show math/geometry guidance blocks (parity with teacher V2), with updated insight line.
- **Topic-level diagnosis** verification must use **newly generated** math/geometry practice or teacher-created math activities after deploy.

### Manual owner checklist (if spot-checking parent reports)

- [ ] Regular parent report still loads
- [ ] Parent PDF/preview still loads if relevant
- [ ] No “no data” when activity exists
- [ ] No raw English topic keys in parent-facing output
- [ ] No contradiction with subject accuracy

---

## Boundaries confirmed

- No SQL run
- No simulation/parallel workstream files touched (`scripts/school-portal/sim/**` unchanged)
- No commit / push / staging (awaiting owner approval)

---

## Changed files (this workstream increment)

**New:**

- `lib/learning/session-topic-helpers.js`
- `docs/qa/TEACHER_GUIDANCE_SURFACE_PARITY_AND_TOPIC_CLASSIFICATION_PLAN.md`
- `docs/qa/TEACHER_GUIDANCE_SURFACE_PARITY_AND_TOPIC_CLASSIFICATION_CLOSURE_REPORT.md`

**Modified (parity + topic classification increment):**

- `lib/school-server/school-physical-class-report.server.js`
- `lib/school-portal/school-report-view-model.js`
- `lib/teacher-server/teacher-guidance-v2.server.js`
- `pages/learning/math-master.js`
- `pages/learning/geometry-master.js`
- `pages/teacher/class/[classId]/activities/new.js`
- `scripts/tests/teacher-guidance-v2-unit.mjs`
- `scripts/tests/school-report-view-model-unit.mjs`

**Also modified (prior uncommitted Teacher Guidance Engine Correction baseline — not reverted):**

- `lib/teacher-server/teacher-recommendations.server.js`
- `lib/teacher-server/teacher-class-report.server.js`
- `lib/teacher-server/teacher-dashboard.server.js`
- `lib/teacher-portal/teacher-ui.he.js`
- `pages/teacher/class/[classId].js`
- `pages/teacher/student/[studentId].js`
- `components/teacher-portal/TeacherDashboardClient.jsx`
- `scripts/tests/*` (as above)

---

## `git status --short` (at closure)

```
 M lib/school-portal/school-report-view-model.js
 M lib/school-server/school-physical-class-report.server.js
 M lib/teacher-server/teacher-guidance-v2.server.js
 M pages/learning/geometry-master.js
 M pages/learning/math-master.js
 M pages/teacher/class/[classId]/activities/new.js
 M scripts/tests/school-report-view-model-unit.mjs
 M scripts/tests/teacher-guidance-v2-unit.mjs
?? lib/learning/session-topic-helpers.js
 (+ prior correction baseline files — see full `git status`)
```
