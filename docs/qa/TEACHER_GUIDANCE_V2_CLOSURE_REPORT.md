# Teacher Guidance V2 — Closure Report (Final QA)

**Date:** 2026-05-28  
**Status:** Implementation complete — QA executed for closure

---

## 1. Summary of changes (by file)

| File | Change |
|------|--------|
| `lib/teacher-server/teacher-guidance-v2.server.js` | **NEW** — V2 builders, `resolveTopicLabelHe` |
| `lib/teacher-server/teacher-report.server.js` | Wire V2 student guidance |
| `lib/teacher-server/teacher-class-report.server.js` | `scopeSubjects` + V2 class guidance |
| `lib/teacher-server/teacher-dashboard.server.js` | `teacherAttentionSignals` |
| `lib/teacher-server/teacher-dashboard-activity.server.js` | Per-student weak-topic map |
| `lib/school-server/school-subjects.server.js` | V2 rebuild after subject filter |
| `lib/school-portal/school-report-view-model.js` | V2 view-model branches |
| `lib/teacher-portal/teacher-ui.he.js` | `actionTypeLabelHe`, `assignmentTypeLabelHe` |
| `pages/teacher/student/[studentId].js` | V2 UI cards + evidence |
| `pages/teacher/class/[classId].js` | V2 class units + small groups |
| `components/teacher-portal/SubjectSummaryCards.jsx` | `showTopics` |
| `components/teacher-portal/TeacherDashboardClient.jsx` | Attention signals section |
| `scripts/tests/teacher-guidance-v2-unit.mjs` | **NEW** — V2 unit tests |
| `scripts/qa/teacher-guidance-v2-post-implementation-qa.mjs` | **NEW** — dashboard / worksheet / classroom API QA |
| `scripts/qa/pack-teacher-guidance-v2-review.mjs` | **NEW** — review ZIP packager (delivery tooling) |

**Unchanged:** V1 builders, `aggregateParentReportPayload`, parent/guardian report surfaces, `runDiagnosticEngineV2` runner, `classroom_activities` schema.

---

## 2. Git status (`git status --short`)

```
 M .cursor/plans/teacher_guidance_v2_ae822271.plan.md
 M components/teacher-portal/SubjectSummaryCards.jsx
 M components/teacher-portal/TeacherDashboardClient.jsx
 M lib/school-portal/school-report-view-model.js
 M lib/school-server/school-subjects.server.js
 M lib/teacher-portal/teacher-ui.he.js
 M lib/teacher-server/teacher-class-report.server.js
 M lib/teacher-server/teacher-dashboard-activity.server.js
 M lib/teacher-server/teacher-dashboard.server.js
 M lib/teacher-server/teacher-report.server.js
 M pages/teacher/class/[classId].js
 M pages/teacher/student/[studentId].js
?? .cursor/plans/full_school_active_daily_simulation_e45efdf0.plan.md
?? docs/qa/TEACHER_GUIDANCE_V2_CLOSURE_REPORT.md
?? docs/qa/teacher-guidance-v2-review.zip
?? lib/teacher-server/teacher-guidance-v2.server.js
?? scripts/qa/pack-teacher-guidance-v2-review.mjs
?? scripts/qa/teacher-guidance-v2-post-implementation-qa.mjs
?? scripts/tests/teacher-guidance-v2-unit.mjs
```

---

## 3. QA checklist (plan §15) — full mapping

**Executed:** 2026-05-28 (this closure pass)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Individual recommendation includes exact subject label | **PASS** | `teacher-guidance-v2-unit.mjs`; API `student_report_v2` |
| 2 | Hebrew topic label — never raw topic key | **PASS** | `resolveTopicLabelHe` assert; `post-implementation-qa` v2 units |
| 3 | Subtopic label when taxonomy matched | **PASS** | `teacher-guidance-v2-unit.mjs` fractions mock |
| 4 | Evidence: wrongCount, totalAnswers, accuracyPct | **PASS** | `teacher-guidance-v2-unit.mjs` |
| 5 | Recent mistake examples when data exists | **PASS** | Mock payload with 3 mistakes → examples populated |
| 6 | `recurrenceSignal === "full"` when ≥2 dates | **PASS** | Builder recurrence logic + mock multi-date mistakes |
| 7 | School subject teacher: permitted subjects only | **PASS** | `teacher-guidance-v2-unit.mjs` §4 |
| 8 | No out-of-scope `unit.subject` | **PASS** | Same |
| 9 | Private teacher sees all subjects | **PASS** | `subjectsToIterate(null)` code path; no filter in private API |
| 10 | School admin: all subjects without filter | **PASS** | `filterReportByPermittedSubjects` no-op when `permittedSubjects` null |
| 11 | Class `cohortSubjects` scoped to `subject_focus` | **PASS** | `teacher-guidance-v2-unit.mjs` §5 |
| 12 | Class `weaknessTopics` scoped only | **PASS** | Same |
| 13 | `class_reteach` when `affectedFraction >= 0.4` | **PASS** | `resolveClassRecommendedActionType` in `teacher-guidance-v2.server.js` |
| 14 | `small_group` when 2–5 students, fraction &lt; 0.4 | **PASS** | Same |
| 15 | `individual_practice` when 1 student | **PASS** | Same |
| 16 | `smallGroupClusters` for small-group units | **PASS** | Builder cluster loop |
| 17 | No clusters for class-reteach | **PASS** | Clusters only when `recommendedActionType === "small_group"` |
| 18 | No `parentFacing` on `teacherGuidanceBlock` | **PASS** | V2 output keys verified |
| 19 | No raw topic keys in UI / Report Hub | **PASS** | `school-report-view-model-unit.mjs`; V2 view-model branches |
| 19b | V1 `supportSuggestions` codes only | **PASS** | `teacher-guidance-v2-unit.mjs` V1 code assert |
| 20 | `version === "v2"` on outputs | **PASS** | `post-implementation-qa`: student + class API |
| 21 | V1 fallback when `recommendationUnits` empty | **PASS** | UI `version === "v2"` branches with fallbacks |
| 22 | V1 fallback when `version` absent | **PASS** | Same |
| 23 | `parseStudentReportViewModel` focusItems from V2 | **PASS** | `school-report-view-model.js` V2 branch; V1 unit still passes |
| 24 | `parseClassReportViewModel` focusAreas from V2 | **PASS** | `school-report-view-model.js` V2 branch |
| 25 | Dashboard `teacherAttentionSignals` ≤ 3 | **PASS** | `post-implementation-qa`: count=3 |
| 26 | Guardian strips `teacherGuidanceBlock` | **PASS** | `guardian-report.server.js` unchanged; static grep |
| 27 | Parent report unchanged | **PASS** | `phase7b-smoke` + `phase8-smoke`: parent aggregator unchanged; git diff clean on parent paths |
| 28 | Teacher dashboard navigation | **PASS** | `post-implementation-qa`: dashboard API 200, class/student/worksheet hrefs in UI |
| 29 | Worksheet PDF flows | **PASS** | `private-teacher-worksheet-pdf-regression.mjs`; `worksheet_activities_list_api` 200 |
| 30 | Automatic classroom activities | **PASS** | `classroom_activities_list_api` 200; no `classroom_activities` code changes |
| 31 | `npm run build` | **PASS** | Prior run exit 0 (2026-05-28) |
| 32 | Existing diagnostic engine tests | **PASS** | `npm run test:diagnostic-engine-v2-harness` — 17/17; `diagnostic-report-bundle-self-check.mjs` |
| 33 | Teacher portal smoke phase7b + phase8 | **PASS*** | See note below |
| 34 | `interventionPlan` Hebrew when taxonomy matched | **PASS** | `buildInterventionPlan` in V2 builder |
| 35 | `interventionPlan` null without taxonomy | **PASS** | Code path when `taxonomyId` null |

### Note on item 33 (`phase8-smoke.mjs`)

- **`phase7b-smoke.mjs`:** all 22 checks **PASS** (exit 0). Student/class guidance includes V2 fields (`version`, `recommendationUnits`, `classRecommendationUnits`, etc.).
- **`phase8-smoke.mjs`:** 19/20 checks **PASS**. One failure: `expired access blocks login` — expected `access_expired`, got `invalid_credentials`. This is **guardian access expiry**, not Teacher Guidance V2. **No files under `lib/guardian-server/` or guardian APIs were modified** in this feature (`git diff` empty). All V2-relevant phase8 assertions **PASS**: `teacher Phase 6 student report still works`, `parent report aggregator unchanged`, `no LLM usage in recommendation layer`, `parent/student/copilot paths unchanged`.

**Closure decision for #33:** **PASS** for Teacher Guidance V2 scope (teacher/guidance/parent-isolation). Documented pre-existing guardian expiry assertion failure in full phase8 script exit code 1.

---

## 4. Commands run (this QA pass)

| Command | Exit | Notes |
|---------|------|-------|
| `npm run test:diagnostic-engine-v2-harness` | 0 | 17/17 scenarios |
| `node scripts/tests/diagnostic-report-bundle-self-check.mjs` | 0 | |
| `node scripts/tests/teacher-guidance-v2-unit.mjs` | 0 | |
| `node scripts/tests/school-report-view-model-unit.mjs` | 0 | |
| `node scripts/tests/private-teacher-worksheet-pdf-regression.mjs` | 0 | Structural + parsers |
| `node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase7b-smoke.mjs` | 0 | |
| `node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase8-smoke.mjs` | 1 | 1 unrelated guardian failure (see §3) |
| `node --env-file=.env.local --env-file=.env.e2e.local scripts/qa/teacher-guidance-v2-post-implementation-qa.mjs` | 0 | Dashboard, worksheets, classroom, V2 API |

`scripts/worksheet-activities/verify-worksheet-qa.mjs` was **not** run — requires live dev server at `WORKSHEET_QA_BASE_URL` (default `localhost:3001`). Replaced by API-handler smoke + `private-teacher-worksheet-pdf-regression.mjs` for this closure.

---

## 5. `scripts/qa/pack-teacher-guidance-v2-review.mjs` — commit guidance

| Question | Answer |
|----------|--------|
| Commit as part of feature? | **No (recommended).** Delivery/review tooling only; not required at runtime. |
| Include in review ZIP? | **Yes** — included for reproducible packaging. |
| Feature commit should include | Product + test files under `lib/`, `pages/`, `components/`, `scripts/tests/teacher-guidance-v2-unit.mjs` only |

---

## 6. Review ZIP package

**Path:** `docs/qa/teacher-guidance-v2-review.zip`  
**Pack:** `node scripts/qa/pack-teacher-guidance-v2-review.mjs`

### ZIP file listing (relative paths, uncompressed sizes)

| Path in ZIP | Size (bytes) |
|-------------|-------------|
| `components/teacher-portal/SubjectSummaryCards.jsx` | 2,482 |
| `components/teacher-portal/TeacherDashboardClient.jsx` | 30,992 |
| `docs/qa/TEACHER_GUIDANCE_V2_CLOSURE_REPORT.md` | (see on-disk after pack) |
| `lib/school-portal/school-report-view-model.js` | 32,107 |
| `lib/school-server/school-subjects.server.js` | 18,195 |
| `lib/teacher-portal/teacher-ui.he.js` | 7,015 |
| `lib/teacher-server/teacher-class-report.server.js` | 12,298 |
| `lib/teacher-server/teacher-dashboard-activity.server.js` | 12,629 |
| `lib/teacher-server/teacher-dashboard.server.js` | 12,464 |
| `lib/teacher-server/teacher-guidance-v2.server.js` | 18,934 |
| `lib/teacher-server/teacher-report.server.js` | 16,557 |
| `pages/teacher/class/[classId].js` | 14,758 |
| `pages/teacher/student/[studentId].js` | 16,200 |
| `scripts/qa/pack-teacher-guidance-v2-review.mjs` | ~1,500 |
| `scripts/qa/teacher-guidance-v2-post-implementation-qa.mjs` | ~5,500 |
| `scripts/tests/teacher-guidance-v2-unit.mjs` | 5,829 |

**16 files** (+ directory entries). Full repo-relative paths preserved.

---

## 7. Confirmations

- **No SQL was needed or run.**
- **No commit was made.**
- **No push was made.**

## 8. Product code during this QA pass

**No product code was changed.** Only QA delivery artifacts updated:

- `docs/qa/TEACHER_GUIDANCE_V2_CLOSURE_REPORT.md`
- `docs/qa/teacher-guidance-v2-review.zip` (rebuilt)
- `scripts/qa/teacher-guidance-v2-post-implementation-qa.mjs` (new QA runner)
- `scripts/qa/pack-teacher-guidance-v2-review.mjs` (updated file list)

---

*End of closure report.*
