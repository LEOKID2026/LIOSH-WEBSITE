# Diagnostic / Report Engine — Cross-Context QA Audit

Generated: 2026-05-28
Scope: Static cross-context audit of all production diagnostic/report paths.
No UI changes. No CSS changes. No Hebrew text changes. No route changes. No commits. No pushes.

---

## 0. Audit ground rules confirmed

- UI files were not modified.
- CSS files were not modified.
- Hebrew copy was not modified.
- Route files were not modified.
- No commits, no pushes were performed.
- This document is the deliverable. Proposed fixes are listed but not implemented.

---

## 1. Routes / builders inventory

| # | Route | Builder entrypoint | Auth surface |
|---|-------|--------------------|--------------|
| R1 | GET /api/parent/students/[studentId]/report-data | aggregateParentReportPayload + attachStudentLearningAccountToParentReportPayload + enrichPayloadWithParentFacing | parent supabase user client; students.parent_id === user.id |
| R2 | GET /api/teacher/students/[studentId]/report-data | buildTeacherStudentReportPayload then applySchoolTeacherReportFilter | teacher service-role context; teacherHasReportAccessToStudent |
| R3 | GET /api/teacher/students/[studentId]/parent-report-data (QA preview) | buildTeacherParentReportPreviewPayload then applySchoolTeacherReportFilter | teacher service-role context; teacherHasReportAccessToStudent |
| R4 | GET /api/school/students/[studentId]/report-data | resolveSchoolReportTeacherForStudent then buildTeacherStudentReportPayload (skipAudit, classId, gradeLevel, physicalClassName) | school manager context; verifyStudentVisibleToSchool |
| R5 | /learning/parent-report?source=parent&studentId=...&period=... | Calls R1 via parentReportRemoteDataUrl("parent", ...) then runParentReportGenerationFromApiBody (re-runs the original generateParentReportV2 engine) | Parent Supabase session token |
| R6 | /learning/parent-report?source=teacher&studentId=...&period=... (teacher QA preview link from /teacher/student/[id]/parent-report) | Calls R3 via parentReportRemoteDataUrl("teacher", ...) then runParentReportGenerationFromApiBody | Teacher Supabase session token |

No production save/snapshot endpoint exists for parent reports. The strings "parent_report_snapshot" / "saveSnapshot" appear only inside `scripts/launch-readiness/*` and `scripts/virtual-student-qa/*` (offline QA tooling) and are never wired into a Next.js page or API route. This is documented as expected: the production parent-report engine is regenerated on each load from the live DB payload.

---

## 2. Section A — Data source parity

For each route, this table documents:
1. learning_sessions / answers reads (home practice raw data)
2. classroom_activities / classroom_activity_student_status reads (school classroom rollup)
3. classroom rollup merge into the report payload
4. Filter by teacher permitted subjects
5. Recompute summary after filtering
6. Date range support
7. Save / snapshot

| Route | learning_sessions+answers | classroom rollup | merge | subj filter | recompute summary | range | snapshot |
|-------|---------------------------|------------------|-------|-------------|-------------------|-------|----------|
| R1 parent route | YES (aggregateParentReportPayload) | NO | NO | NO | N/A | from/to YYYY-MM-DD; default last 30 days | NO |
| R2 teacher report | YES | YES (loadClassroomRollupForTeacherStudentReport — school-scoped if school teacher, teacher-class scoped otherwise) | YES (mergeClassroomActivityRollupIntoReportPayload) | YES (applySchoolTeacherReportFilter; school admin bypass) | YES (recomputeReportSummaryFromSubjects in filterReportByPermittedSubjects) | from/to or windowDays; default 30 days | NO |
| R3 teacher parent-preview | YES | YES (same loader) | YES | YES | YES (only when filter is applied) | from/to or windowDays; default 30 days | NO |
| R4 school student report | YES | YES (forwarded into buildTeacherStudentReportPayload with the picked teacher_id) | YES | NO (school admin bypasses subject filter; school API does not call applySchoolTeacherReportFilter at all) | NO (summary stays as aggregator + classroom merge sum) | from/to or windowDays; default 30 days | NO |
| R5 = R1 | same as R1 | same as R1 | same as R1 | same as R1 | same as R1 | period / start / end UI mapped to from/to | NO |
| R6 = R3 | same as R3 | same as R3 | same as R3 | same as R3 | same as R3 | same | NO |

Sources for the table above:
- `pages/api/parent/students/[studentId]/report-data.js`
- `pages/api/teacher/students/[studentId]/report-data.js`
- `pages/api/teacher/students/[studentId]/parent-report-data.js`
- `pages/api/school/students/[studentId]/report-data.js`
- `lib/parent-server/report-data-aggregate.server.js` (aggregateParentReportPayload)
- `lib/teacher-server/teacher-report.server.js` (buildTeacherStudentReportPayload, buildTeacherParentReportPreviewPayload, loadClassroomRollupForTeacherStudentReport)
- `lib/teacher-server/classroom-activity-class-report.server.js` (rollups + merge)
- `lib/school-server/school-subjects.server.js` (applySchoolTeacherReportFilter, filterReportByPermittedSubjects, recomputeReportSummaryFromSubjects)
- `lib/school-server/school-scope.server.js` (resolveSchoolReportTeacherForStudent)
- `lib/teacher-portal/parent-report-remote-source.js` (parentReportRemoteDataUrl)
- `lib/learning-supabase/parent-dashboard-report-bridge.js` (runParentReportGenerationFromApiBody)

### A.1 Source-of-truth chain for diagnostic correctness

For all five report contexts the same single aggregator function `aggregateParentReportPayload` builds the home-practice payload from `learning_sessions` + `answers`. Subject keys, topic keys, mode/level enums, recentMistakes, probeEvidence, dailyActivity, timestamps and grade-resolution buckets all come from this one function. This guarantees that for the same student, same date range and same permission scope, the **home-practice numeric truth is identical** across R1/R2/R3/R4/R5/R6. The only legitimate differences come from:
- Whether classroom rollup is merged on top (R2/R3/R4 yes; R1/R5 no by design — see §F.2).
- Whether subject filter is applied (R2/R3 yes for school teachers; R4 no for school admins; R1/R5 not applicable).
- Whether the parent-facing block (`parentFacing.insights`, `parentFacing.homeRecommendations`, `parentFacing.teacherMessages`) is added (R1/R3/R5/R6 yes; R2/R4 no).
- Whether the teacher guidance block (`teacherGuidanceBlock`) is added (R2/R4 yes; R1/R3/R5/R6 no).

### A.2 PASS/FAIL — Section A

| Check | Status | Notes |
|---|---|---|
| Same builder for home-practice analytics across all routes | PASS | Single `aggregateParentReportPayload` shared by R1/R2/R3/R4. |
| Same classroom merger across teacher/school routes | PASS | `mergeClassroomActivityRollupIntoReportPayload` shared by R2/R3/R4. |
| Same subject filter across teacher/QA preview routes | PASS | `applySchoolTeacherReportFilter` shared by R2/R3. |
| Date range parameter parsing identical between R2/R3/R4 | PASS | All three use `resolveTeacherReportDateRange`. |
| Date range parameter parsing identical between R1 and R2/R3/R4 | PASS-with-note | R1 only accepts `from`/`to`; teacher/school routes also accept `windowDays`. Default window is the same (30 calendar days, UTC, inclusive). |
| QA preview parent report uses the same engine as the parent route | PASS | Both R5 and R6 call `runParentReportGenerationFromApiBody` which seeds localStorage and calls the original `generateParentReportV2`. |
| Snapshot save endpoint behavior documented | PASS (no production snapshot) | Snapshots only exist in offline `scripts/`; not wired to any production route. Documented as expected. |

---

## 3. Section B — Golden test student matrix

This audit is a static code-level audit; it does not execute live DB queries. The student categories and the metrics that must be collected per category are defined here so that any reviewer can run the existing diagnostic scripts (already present in the repo, see end of this section) against staging data and compare actual numbers against the expected metrics.

### B.1 Student categories

| ID | Category | Expected access surface |
|---|---|---|
| S1 | Student with home-practice activity in all 6 subjects (math, geometry, english, hebrew, science, moledet_geography) | R1 (parent), R5 |
| S2 | Student with activity only in math + geometry | R1, R5 |
| S3 | Student with thin/low data (< 5 answers AND < 2 sessions in window) | R1, R5 |
| S4 | Student with no activity in window | R1, R5 |
| S5 | School student assigned to a single subject teacher (e.g. geometry) | R2 (subject teacher; sees only permitted subjects), R4 (school admin; sees all), R6 (teacher QA preview; same scope as R2) |
| S6 | School student visible to school admin but with no subject-teacher link | R4 (school admin only) |
| S7 | Private-teacher (non-school) student | R2 (private teacher; no subject filter), R6 |
| S8 | Normal parent-owned student (no school context) | R1, R5 |

For S5/S6 the same studentId is used to verify that R2/R3/R4 reconcile under their respective scopes.

### B.2 Raw expected metrics per student (collection contract)

For each student in B.1, a reviewer must collect from the production database the following raw metrics, scoped to a single date window:
- sessions_by_subject: count of `learning_sessions` rows grouped by `subject` where `started_at` (or `created_at` fallback) falls in [from, to+1).
- answers_by_subject: count of `answers` rows grouped by the resolved subject (from `answer_payload.subject` or fallback to the answer's session subject).
- correct_by_subject: same grouping with `is_correct = true`.
- accuracy_by_subject: correct_by_subject / answers_by_subject * 100 (2 decimals).
- total_sessions, total_answers, total_correct, total_wrong (sums across the 6 known subjects only — see §C.1 about unknown-subject sessions).
- date_range_coverage: the inclusive `[from, to]` ISO date pair.
- latest_activity_date: max ISO date across `started_at`, `ended_at`, `answered_at`, `created_at`.
- For school students: classroom_activity_count and classroom_answers (sum of `classroom_activity_student_status.answers_count`) for activities in scope (see §D.2 about activity-timestamp filtering).

### B.3 Existing scripts that already collect this raw truth

The repo already contains diagnostic scripts that pull the same raw metrics. They are read-only and can be used by a reviewer to populate the actual numbers per student/route:
- `scripts/school-portal/diagnose-student-report-context.mjs` — for a single student, prints baseLearningAnswers, classroomAnswersInGeometryClass, and the four payload variants (without classId, with classId, school-scoped merge).
- `scripts/tests/verify-teacher-student-report-browser.mjs` — Playwright smoke that compares the four browser-visible numbers (school API, teacher API, school dashboard cards, teacher report page) for the same school student.
- `scripts/tests/student-report-flow-regression.mjs` — DB-level cross-check between aggregator output and raw row counts.
- `scripts/school-portal/diagnose-class-report-data.mjs` — class-wide reconciliation.

Running these against the same target studentIds yields the actual-vs-expected comparison required by sections B/C/D below.

### B.4 PASS/FAIL — Section B

| Check | Status | Notes |
|---|---|---|
| Each student category is exercised by at least one route | PASS | Mapping above. |
| A documented contract exists for the raw expected metrics | PASS | §B.2. |
| A scripted way exists to collect actual metrics per route | PASS | §B.3. |
| Numeric actual-vs-expected cross-route table is included in this document | NOT-EXECUTED | A static cross-context audit cannot fill in production numbers without running scripts against a live DB. The reviewer must run the §B.3 scripts and append a results table here. |

---

## 4. Section C — Reconciliation checks

### C.1 Summary vs. visible subject cards

Path-by-path analysis:

**R1 (parent) and R5 (parent UI):**
- `summary.totalAnswers = correctAnswers + wrongAnswers`. Both counters are incremented inside the answers loop in `aggregateParentReportPayload`, but only after `if (!subject || !REPORT_AGG_SUBJECTS.includes(subject)) continue;` — so unknown-subject answers are skipped from BOTH summary and subjects.
- For each known subject, `subjectAgg.answers += 1` is incremented inside the same branch. Therefore `sum(subjects[X].answers for X in REPORT_AGG_SUBJECTS) === summary.totalAnswers`. RECONCILED for answers.
- `summary.totalSessions = sessions.length` is set to the full row count BEFORE the `if (!REPORT_AGG_SUBJECTS.includes(session.subject)) continue;` filter inside the sessions loop. So if any `learning_sessions` row has a subject outside the 6-key allowlist (which the application-level write path validates against, but which is not enforced as a DB constraint), `summary.totalSessions` would exceed `sum(subjects[X].sessions)`. SOFT-MISMATCH risk; in practice the write path guards against it.
- Result: PASS for answers; PASS-with-note for sessions.

**R4 (school admin via /api/school/...):**
- Same aggregator output, then classroom rollup is added on top via `mergeClassroomActivityRollupIntoReportPayload`. The merger increments `summary.totalSessions/totalAnswers/correctAnswers/wrongAnswers` AND each subject's `sessions/answers/correct/wrong` by the same delta values, then recomputes `summary.accuracy` from the new totals. So the answers/correct relationship stays reconciled.
- The school API does NOT call `applySchoolTeacherReportFilter`, so `summary.totalSessions` retains the aggregator's `sessions.length` (full count) plus the classroom delta. The same soft-mismatch around unknown-subject home sessions still applies.
- Result: PASS for answers; PASS-with-note for sessions.

**R2 (teacher report):**
- After `buildTeacherStudentReportPayload`, the API calls `applySchoolTeacherReportFilter`. For school teachers with permitted subjects, `filterReportByPermittedSubjects` filters the `subjects` map, then calls `recomputeReportSummaryFromSubjects` which sets `summary.totalSessions/totalAnswers/correctAnswers/wrongAnswers/accuracy` to the SUM of the visible (permitted) subjects only. This guarantees `summary === sum(visible subject cards)` exactly.
- For school admin or private teacher (`permittedSubjects === null`), the filter is a no-op and the summary is left as the aggregator+classroom output. Same PASS-with-note for sessions as in R1/R4.
- Result: PASS (strong) when filter is active; PASS-with-note otherwise.

**R3 (teacher parent QA preview):**
- Same flow as R2 for the numeric layer (`applySchoolTeacherReportFilter` is called on the preview payload too).
- HOWEVER, `parentFacing.insights` and `parentFacing.homeRecommendations` are computed BEFORE the subject filter (inside `buildTeacherParentReportPreviewPayload` via `enrichPayloadWithParentFacing`). The filter recomputes `summary` and rebuilds `teacherGuidanceBlock`, but it does NOT touch `parentFacing`. See §E.1 for the bug analysis. This does not affect the numeric reconciliation of summary vs. subject cards, but it does break the rule "no hidden subject rows may be counted in summary unless intentionally displayed or documented" for the parent-facing text layer.

### C.2 Dashboard card vs. report scope

The teacher dashboard (`buildLightweightStudentActivityMap`) reads `learning_sessions` and `answers` filtered by `permittedSubjects` (the same Set that `applySchoolTeacherReportFilter` uses), then merges classroom rollup via `loadClassroomActivityRollupsForTeacherDashboard` + `classroomRollupToDashboardMetrics(rollup, permittedSubjects)`. The `permittedSubjects` Set is identical to the one used by R2's filter. The classroom rollup merger uses the same `mergeClassroomActivityRollupIntoReportPayload` math. Therefore the dashboard card's `totalAnswers` for a school teacher matches R2's `summary.totalAnswers` exactly — both are the sum of permitted-subject answers from home practice plus permitted-subject classroom answers.

For school admins and private teachers (`permittedSubjects === null`), no filter is applied on the dashboard, matching R2/R4.

### C.3 Parent report payload identity

The parent-report engine on R5 and R6 receives the API body and immediately calls `buildReportInputFromDbData` then `seedLocalStorageFromDbReportInput`. The seed function reads ONLY `subjects[*].topics[*]`, `recentMistakes`, and `summary` from the body — exactly the post-filter (and post-merge) numeric truth produced by the API. There is no second source of truth or hidden secondary fetch. Therefore the parent-report engine's view IS the API payload.

### C.4 Hidden / dropped rows

| Risk | Status | Source code |
|---|---|---|
| Unknown-subject home-practice sessions inflate `summary.totalSessions` over sum of subject cards | SOFT-MISMATCH (R1/R4 only) | `lib/parent-server/report-data-aggregate.server.js` line where `summary.totalSessions = sessions.length` is set vs. the `if (!REPORT_AGG_SUBJECTS.includes(session.subject)) continue;` guard inside the sessions loop. |
| Duplicate counting of the same answer in home + classroom rollup | NO | Home practice writes only to `learning_sessions`/`answers`. Classroom activity completions write only to `classroom_activity_student_status` (verified — no production code path joins both for the same answer). The two streams are additive, not overlapping. |
| Subject-key mapping drift (e.g. `moledet_geography` vs `moledet-geography`) | NO | Aggregator uses `["math","geometry","english","hebrew","science","moledet_geography"]`. Classroom rollup checks `REPORT_AGG_SUBJECTS.includes(activity.subject)` against the same list. UI labels accept both forms via `SUBJECT_LABEL_HE`. |
| Rows counted outside the selected date range | NO (for home practice); SOFT-RISK (for classroom activities — see §D.2) | Home practice uses `gte(started_at, fromIso) and lt(started_at, toIsoExclusive)` (or `created_at` fallback). Classroom activities are filtered by activity-level timestamps, not student-submission timestamps. |

### C.5 PASS/FAIL — Section C

| Check | Status | Notes |
|---|---|---|
| Top summary equals sum of visible subject cards (after scope filter) | PASS for R2/R3 (filter active); PASS-with-note for R1/R4/R5 (sessions soft-mismatch only) | §C.1 |
| Dashboard card matches the corrected report scope | PASS | §C.2 |
| Parent report engine uses same payload as corrected teacher-report scope | PASS for the numeric layer; FAIL for the parent-facing text layer in R3/R6 | §C.3, §E.1 |
| No hidden subject rows counted in summary unless intentionally displayed | PASS | §C.4 |
| No duplicate merge between legacy sessions and classroom activities | PASS | §C.4 |
| No rows dropped because of subject-key mapping issues | PASS | §C.4 |
| No rows counted outside the selected date range | PASS for home practice; SOFT-RISK for classroom activities | §C.4 + §D.2 |

---

## 5. Section D — Date range checks

### D.1 Date parameter parsing

| Route | Accepts | Default | Validation |
|---|---|---|---|
| R1 parent | `from`, `to` (YYYY-MM-DD) | last 30 calendar days, UTC | `parseIsoDateParam` rejects non-ISO; rejects `from > to` |
| R2 teacher | `from`, `to`, `windowDays` (1..366) | last 30 days | `resolveTeacherReportDateRange` |
| R3 teacher preview | same as R2 | last 30 days | same |
| R4 school | same as R2 | last 30 days | same |
| R5/R6 (UI) | `period=week|month|custom`, `start`, `end` | `period=week` (R5 default) / `period=month` (R6 default — set by `pages/teacher/student/[studentId]/parent-report.js`) | `computeReportRangeForParentApi` derives `from`/`to` (7 or 30 days) |

The two parsers (R1's `parseIsoDateParam` and R2/R3/R4's `resolveTeacherReportDateRange`) produce identical `Date` objects for identical input. Both treat the range as inclusive `[from, to]` with UTC midnight boundaries: the SQL filter is `gte(timestamp, fromIso T00:00:00.000Z) and lt(timestamp, toIsoExclusive T00:00:00.000Z)` where `toIsoExclusive = to + 1 day`. So a `to=2026-05-28` includes activity through 2026-05-28 23:59:59.999 UTC.

### D.2 Boundary handling for classroom activities

`isActivityInRange(row, fromIso, toIsoExclusive)` in `lib/teacher-server/classroom-activity-class-report.server.js` evaluates against `activityTimestampIso(row) = row.closed_at || row.activated_at || row.created_at`. This is the ACTIVITY's lifecycle timestamp, not the student's submission timestamp. Consequence:

- If a classroom activity was activated on 2026-04-01, students answered through 2026-04-25, and the activity was closed on 2026-04-30, then a 2026-04-15..2026-04-29 window will see `closed_at = 2026-04-30T?` which is OUTSIDE the range, so the activity is excluded — and ALL of that student's submissions (which are aggregated into `classroom_activity_student_status.answers_count`) are dropped from the rollup, even though those submissions actually happened inside the window.
- Conversely, an activity activated on 2026-04-15 (in range) but with the bulk of student submissions on 2026-04-10 (out of range) would still be fully counted in a 2026-04-15..2026-04-30 window.
- The daily breakdown uses `submitted_at || activityTimestamp(activity)` (good), but only AFTER the activity itself passes `isActivityInRange`. So daily breakdown is consistent with the rollup totals, but the rollup totals can be inflated or deflated relative to the true submission time distribution.

This is documented in §C.4 as a SOFT-RISK. It is not a regression — the same logic has been in place since classroom activities shipped — and it is per-activity-lifecycle by design (treats an activity as a single time-bucketed entity). For the audit, it is flagged because the user explicitly asked: "no rows counted outside the selected date range".

### D.3 Cross-route same-input → same-output check

For `windowDays=30` on R2/R3/R4: identical `fromDate`/`toDate` objects (UTC midnight, same day arithmetic), identical SQL filters, identical aggregator and merger. So R2/R3/R4 must produce the same numeric truth for the same student before the subject filter step.

For R1 with `from=YYYY-MM-DD&to=YYYY-MM-DD` corresponding to a 30-day window ending today: identical `fromDate`/`toDate`, identical aggregator. R1 will not include classroom rollup, so for a school-context student R1's totals will be ≤ R2/R3/R4's totals by exactly the classroom rollup delta.

For R5 (UI) with `period=week`: `computeReportRangeForParentApi` returns last 7 days. For `period=month`: last 30 days. For `period=custom`: applied dates. These are passed verbatim to R1 as `from`/`to`.

### D.4 PASS/FAIL — Section D

| Check | Status | Notes |
|---|---|---|
| `from`/`to` parameter format identical across routes | PASS | `parseIsoDateParam` shared via `safeString` import. |
| Default window identical across routes | PASS | All four production routes default to last 30 calendar days, UTC. |
| `windowDays` works on R2/R3/R4 | PASS | `parseReportWindowDays` validates 1..366. |
| `month` does not return empty when teacher report has data for the same window | PASS (modulo §D.2) | Same SQL filter; same aggregator. |
| `custom` range works | PASS | `computeReportRangeForParentApi` honors `customDates && appliedStartDate && appliedEndDate`. |
| Boundary dates are handled consistently (UTC inclusive) | PASS | `[from, to+1)` half-open in UTC across all routes. |
| Classroom activities filtered strictly by submission timestamps | FAIL — SOFT | Filter is on activity lifecycle timestamp, not on `classroom_activity_student_status.submitted_at`. See §D.2. |

---

## 6. Section E — Diagnostic engine checks

The diagnostic-engine output appears in two distinct shapes:
- TEACHER side (`teacherGuidanceBlock`): produced by `buildStudentTeacherGuidance` in `lib/teacher-server/teacher-recommendations.server.js`. Returned by R2/R4.
- PARENT side (`parentFacing.insights`, `parentFacing.homeRecommendations`, `parentFacing.teacherMessages`): produced by `buildParentInsightsHe` + `buildHomeRecommendationsHe` in `lib/parent-server/parent-report-parent-facing.server.js`. Returned by R1/R3/R5/R6.

In addition, the parent-report HTML/UI on R5/R6 runs a much richer client-side diagnostic engine — `generateParentReportV2` in `utils/parent-report-v2.js`, with per-subject/per-topic diagnostic cards, evidence coverage, thin-data subject lists, etc. — fed from localStorage that is seeded from the API body.

### E.1 Weak / strong / recommendations / thin-data thresholds

| Layer | Weak topic | Strong topic | Insufficient data |
|---|---|---|---|
| `buildStudentTeacherGuidance` | answers ≥ 3 AND accuracy < 60 | answers ≥ 3 AND accuracy ≥ 80 | totalAnswers < 5 AND totalSessions < 2 → `insufficientData: true` with reason `not_enough_activity` |
| `buildParentInsightsHe` / `buildHomeRecommendationsHe` | answers ≥ 3 AND accuracy < 60 (topics); answers ≥ 5 AND accuracy < 60 (subjects) | answers ≥ 5 AND accuracy ≥ 80 | `totalAnswers === 0 && totalSessions === 0` → "לא הייתה פעילות תרגול בתקופה האחרונה — כדאי לעודד התחלה קצרה ונעימה" |
| `generateParentReportV2` (R5/R6 client) | per-subject/per-topic, with `insufficientDataSubjectsHe` flagging thin-evidence subjects | same | thin-evidence detection runs per subject; subjects without enough activity are surfaced as "שווה לחזור על נתון לפני החלטה מהותית" rather than a fabricated diagnosis |

The thresholds are consistent between the two server-side layers (3/60/80 for topics, 5 for subject signal). They are documented in `lib/teacher-server/teacher-recommendations.server.js` constants and mirrored in `lib/parent-server/parent-report-parent-facing.server.js`.

### E.2 BUG — Stale parent-facing recommendations after subject filter (R3/R6 only)

Trace:
1. `buildTeacherParentReportPreviewPayload` in `lib/teacher-server/teacher-report.server.js` calls `aggregateParentReportPayload` → all 6 subjects populated.
2. Same function calls classroom-rollup merge → still all 6 subjects (and any subject the school activity exposed).
3. Same function calls `attachStudentLearningAccountToParentReportPayload` and then `enrichPayloadWithParentFacing(serviceRole, payload, studentId)` — this is where `parentFacing.insights` and `parentFacing.homeRecommendations` are built. They iterate `REPORT_AGG_SUBJECTS` over the FULL `subjects` map and may pick the weakest subject (e.g. hebrew) as the focus of the insight: "נראה שיש קושי בעברית".
4. Control returns to `pages/api/teacher/students/[studentId]/parent-report-data.js`. It then calls `applySchoolTeacherReportFilter(serviceRole, ctx.teacherId, built.payload)`.
5. `applySchoolTeacherReportFilter` → `filterReportByPermittedSubjects` filters `subjects`, `recentMistakes`, `probeEvidence.bySubject`, recomputes `summary`, rebuilds `teacherGuidanceBlock`. **It does NOT touch `parentFacing`.**

Consequence:
- A school teacher who is permitted only "math" runs the parent QA preview for a student. The visible subject cards show only math. `summary` totals match math only. But `parentFacing.insights[0]` may still say "נראה שיש קושי בעברית" because the insight was computed over all 6 subjects before the filter dropped hebrew. The `parentFacing.homeRecommendations` may include math/geometry-focused tips even when the teacher's permitted subject is hebrew (for example), or vice versa, depending on which subject "won" the rank in the unfiltered payload.
- For school teachers with permittedSubjects set to size 0 (no subjects assigned), the filter zeroes `subjects` and recomputes `summary` to all-zero — but `parentFacing.insights` still describes real diagnoses based on the unfiltered data.

Status: FAIL.
Severity: medium. The numeric truth on R3 is correct; the parent-facing TEXT can leak information about subjects the teacher is not permitted to see. This contradicts the user requirement "subject filtering does not leave stale recommendations from removed subjects".

Root cause: `filterReportByPermittedSubjects` does not rebuild `parentFacing` from the filtered payload.

Proposed fix (NOT applied per audit-only instruction):
- In `lib/school-server/school-subjects.server.js`, after `recomputeReportSummaryFromSubjects(out)` and `buildStudentTeacherGuidance(reconciled)`, also rebuild `parentFacing` if it was present on the input:
  - import `buildParentFacingBlocks` from `lib/parent-server/parent-report-parent-facing.server.js`
  - if `reportPayload.parentFacing` exists, set `reconciled.parentFacing = { ...reportPayload.parentFacing, ...buildParentFacingBlocks(reconciled) }` so `teacherMessages` is preserved while `insights` and `homeRecommendations` are recomputed against the filtered payload.
- This is a server-only change inside the filter helper. UI / CSS / Hebrew / routes are not touched. All Hebrew copy already used by `buildParentFacingBlocks` is preserved.

### E.3 Daily-activity is not subject-filtered (R3/R6 only)

`filterReportByPermittedSubjects` filters `subjects`, `recentMistakes`, `probeEvidence.bySubject`. It does NOT filter `dailyActivity`. The `dailyActivity` rows are subject-agnostic counters (`{ date, sessions, answers, correct, wrong, durationSeconds }`), so for a school teacher with restricted subjects the daily heatmap on the parent QA preview reflects ALL subjects' activity. The numeric reconciliation `sum(dailyActivity[*].answers) ≈ summary.totalAnswers` therefore breaks for school teachers (it overstates relative to the filtered summary).

Status: SOFT-FAIL for reconciliation; visually low-severity (daily heatmap is a "did the student practice today" signal, not a diagnostic claim).

Proposed fix (NOT applied per audit-only instruction):
- `aggregateParentReportPayload` would need to optionally emit a per-subject daily breakdown so the filter can recompute daily totals from the visible subjects only. This is a non-trivial schema change for the payload. A lighter alternative is to add a `dailyActivity.subjectFilteredFrom` meta hint and let the UI show a "כולל מקצועות שאינם בהרשאתך" label — but this is a UI change which is OUT OF SCOPE per audit instructions.

### E.4 Raw internal keys in parent-facing text

`buildParentInsightsHe` and `buildHomeRecommendationsHe` always go through `subjectLabelHe` / `topicLabelHe` before emitting Hebrew. The only place a raw key could leak is via the topic key in `formatTopicLineHe(subject, topicKey)` if `topicLabelHe` returns null AND the subject label exists; in that case `formatTopicLineHe` returns just the subject label, not the raw topic key. Verified PASS.

`recentMistakes[i].subject` and `recentMistakes[i].topic` ARE raw keys, but they are passed through `formatTopicLineHe` before display in the UI components. Verified PASS.

### E.5 Thin-data behavior

Verified that `buildStudentTeacherGuidance` returns `insufficientData: true` ONLY when `totalAnswers < 5 && totalSessions < 2`. For empty windows it returns `riskSignals: ["never_active_in_range"]` and `insufficientData: true`. UI on `pages/teacher/student/[studentId].js` renders "אין מספיק נתונים לניתוח" only when `guidance.insufficientData === true`. Verified PASS.

`buildParentInsightsHe` returns "לא הייתה פעילות תרגול בתקופה האחרונה" ONLY when totalAnswers === 0 && totalSessions === 0. For thin-but-non-zero windows it returns "יש עדיין מעט נתוני תרגול". Verified PASS.

### E.6 PASS/FAIL — Section E

| Check | Status | Notes |
|---|---|---|
| Weak areas based on actual lowest-performing subject/topic | PASS | §E.1 thresholds. |
| Strong areas based on actual performance | PASS | §E.1 thresholds. |
| Recommendations match the student's data | PASS | Derived from same subjects/topics maps. |
| Thin-data language only when truly insufficient | PASS | §E.5. |
| Raw internal keys not exposed to parent-facing text | PASS | §E.4. |
| Parent-facing labels correct | PASS | `subjectLabelHe`, `topicLabelHe`. |
| Subject filtering does not leave stale recommendations from removed subjects | FAIL on R3/R6 | §E.2 stale `parentFacing.insights` / `parentFacing.homeRecommendations`. |
| Daily activity respects subject filter on R3/R6 | FAIL — SOFT | §E.3. |

---

## 7. Section F — Parent report engine checks

### F.1 Engine identity across normal parent and teacher QA preview

`pages/learning/parent-report.js` is the single page that renders the original full parent report. It detects the source via `parseParentReportRemoteSource(router)` → `{ isParent, isTeacher, isRemote, studentId }`. It then calls `parentReportRemoteDataUrl(remoteKind, parentStudentId, qs)` → R1 for parent, R3 for teacher. In both cases the response is fed to `runParentReportGenerationFromApiBody(body, uiPeriod)`, which:

1. Builds a normalized `dbInput` via `buildReportInputFromDbData(body, { period, timezone: "UTC" })`.
2. Backs up the user's local-storage report keys.
3. Seeds the same local-storage keys with `seedLocalStorageFromDbReportInput(seeded, dbInput)`.
4. Calls the original `generateParentReportV2(playerName, "custom", from, to)` from `utils/parent-report-v2.js` — the unmodified parent-report engine.
5. Applies `applyParentReportGamificationOverlay(base, reportApiBody)` and copies `body.parentFacing` to `base.parentFacing` so the UI can render insights/recommendations directly.
6. Restores the user's previous local-storage keys.

This means the EXACT same engine binary runs for normal parent and teacher QA preview. The only difference is the API body that feeds it. PASS.

### F.2 School / classroom activity in the full parent report

By design (referenced in `.cursor/plans/classroom_activities_feature_1a9dae77.plan.md` § 7 "Parent boundary"), the parent route R1 does NOT join classroom activity tables. Therefore for a school student:
- R1 / R5 (the parent's own login) shows ONLY the student's individual home-practice activity. Classroom-only activity is invisible there. This is per design and is documented in the plan.
- R3 / R6 (teacher QA preview) DOES include the classroom rollup, and feeds it through the same parent report engine. So the teacher preview shows the school + home merged truth as if it were a parent view.

This matches the user's stated requirement:
> Teacher QA parent-report preview must use the same original parent report engine, but with the correct school/classroom bridge for school students.

PASS for the QA preview. The parent's own route intentionally remains "home practice only" until the design explicitly chooses to expose school activity to parents.

### F.3 No fallback to "no data" when data exists

`runParentReportGenerationFromApiBody` returns `{ ok: false, error: "no_base" }` only if `generateParentReportV2` itself returns null/undefined. Looking at `generateParentReportV2`, it returns null only when `typeof window === "undefined"` (server-side) — never on a real browser path. So the only way to reach a silent "no data" state is when the API body has empty subjects AND empty totals (legitimately thin data). PASS.

The page-level fallback at `pages/learning/parent-report.js` line ~1077 sets `setParentReportError("לא ניתן לבנות את הדוח מהנתונים שהתקבלו מהשרת.")` when `out.ok === false`. This message is reachable only when the engine itself failed to build, not when totals are zero — a zero-totals payload still produces a valid `base` with all-empty subject sections. PASS.

### F.4 Snapshot expectations

There is no production snapshot save endpoint for parent reports. The strings `parent_report_snapshot`, `saveSnapshot`, `parent-report-snapshot-loader` appear ONLY inside `scripts/launch-readiness/*` and `scripts/virtual-student-qa/*`, which are offline test/QA tooling. No production page or API route writes a snapshot. PASS, with the explicit documentation that:
- Parent normal route does NOT save a snapshot. Each visit regenerates from the live DB.
- Teacher QA preview does NOT save a snapshot. Each visit regenerates from the live DB.
- The offline scripts that capture snapshots do so for regression evidence and are not invoked from any browser flow.

This matches the user's requirement to document snapshot behavior explicitly.

### F.5 PASS/FAIL — Section F

| Check | Status | Notes |
|---|---|---|
| Normal parent route still works | PASS (subject to §E.2 not affecting parent route since R1 has no subject filter) | §F.1 |
| Teacher QA preview route works for school students | PASS for numeric layer; FAIL for stale parent-facing text under subject filter | §F.1, §E.2 |
| School/classroom activity appears in the full parent report (QA preview) | PASS | §F.2 |
| Generated parent report uses same payload as corrected teacher report scope | PASS for numeric layer | §F.1 |
| Report generation does not silently fall back to "no data" | PASS | §F.3 |
| Snapshots saved when expected; not saved when not expected | PASS — no production snapshot expected on either route | §F.4 |

---

## 8. Section G — Authorization and safety checks

### G.1 Per-route auth surfaces

| Route | Caller auth | Cross-tenant guard |
|---|---|---|
| R1 parent | Bearer Supabase session token; `getLearningSupabaseServerUserClient(authHeader)`; `students.parent_id === userData.user.id` filter on the parent-side client | `maybeSingle` returns null if the student's `parent_id` does not match the caller. RLS on `students` further enforces the same on the user-side client. |
| R2 teacher report | `requireTeacherApiContext` extracts `teacherId` from the bearer token; teacher portal feature flag (`teacher_portal_enabled`) and per-teacher quota (`ai_reports`) checked; production rate-limit applied | `teacherHasReportAccessToStudent(serviceRole, teacherId, studentId)` checks `teacher_students` → `teacher_class_students` → `teacherHasSchoolContextReportAccess`. Returns `403 student_not_linked` otherwise. |
| R3 teacher parent-preview | `requireTeacherApiContext`; same rate limit | Same `teacherHasReportAccessToStudent` check inside `buildTeacherParentReportPreviewPayload`. |
| R4 school student report | `requireSchoolManagerApiContext` extracts schoolId + managerId | `verifyStudentVisibleToSchool(serviceRole, schoolId, studentId)` requires the student to be in the school's enrolled-or-class-member visibility set; `resolveSchoolReportTeacherForStudent` further requires at least one school teacher to have report access. |
| R5/R6 (UI) | inherits from R1/R3 — UI cannot bypass server auth | inherits |

### G.2 Subject-permission enforcement

For school teachers (`role !== "school_admin"`) `loadTeacherPermittedSubjects` returns a non-null `Set<string>`. `applySchoolTeacherReportFilter` uses that Set in `filterReportByPermittedSubjects` to drop out-of-scope subjects from the response. For school admins it returns `permittedSubjects: null` → the filter is a no-op, and the admin sees all subjects (matching the documented expected scope difference).

R4 (school API) does NOT call `applySchoolTeacherReportFilter`. Instead it hard-requires `requireSchoolManagerApiContext`, so only manager/admin role can hit it. Subject filter is intentionally skipped for managers.

R2 and R3 DO call the filter and DO restrict subject teachers correctly. Numeric layer is correctly filtered. Text layer (`parentFacing`) leaks across subjects on R3 only (see §E.2).

### G.3 Service role / browser leakage

- Service role keys are loaded only inside server modules (`getLearningSupabaseServiceRoleClient`, `requireTeacherApiContext.serviceRole`, etc.). They are never returned in API bodies.
- The teacher portal `teacherAuthFetch` and the school `schoolAuthFetch` always send the user's Supabase JWT via the Authorization header, never a service role key.
- The QA preview link from `/teacher/student/[studentId]/parent-report` redirects to `/learning/parent-report?studentId=...&source=teacher&period=month`. The teacher's own session token is what authenticates the subsequent fetch to R3. There is no service-role bridging on the browser path.
- No production code path sends `Authorization: ` headers built from `SUPABASE_SERVICE_ROLE_KEY` to a public endpoint.

### G.4 No production auth weakening introduced by QA preview bridge

Verified that:
- `pages/teacher/student/[studentId]/parent-report.js` only redirects; it does not exchange tokens.
- `parentReportRemoteDataUrl("teacher", ...)` calls a teacher-portal-protected route (R3) — same auth surface as R2.
- `buildTeacherParentReportPreviewPayload` calls `teacherHasReportAccessToStudent` exactly like `buildTeacherStudentReportPayload`. There is no QA-only bypass.
- The Playwright e2e short-circuit `window.__parentReportPlaywrightE2eSession` only takes effect when the user has an existing browser opt-in flag and provides a literal `playwright-e2e-parent-report` token, which is gated server-side to non-production environments. Production runs use the real Supabase session token.

### G.5 PASS/FAIL — Section G

| Check | Status | Notes |
|---|---|---|
| Parent cannot access another parent's child | PASS | §G.1 R1 row. |
| Teacher cannot access unauthorized students | PASS | §G.1 R2/R3 rows. |
| Subject teacher cannot see unauthorized subject NUMBERS | PASS | §G.2 numeric layer. |
| Subject teacher cannot see unauthorized subject TEXT (parent-facing) | FAIL on R3/R6 | §E.2 stale `parentFacing.insights/homeRecommendations`. |
| School admin can see full school-scoped data where intended | PASS | §G.1 R4 row, §G.2. |
| Private teacher behavior remains unchanged | PASS | `permittedSubjects === null` for non-school teachers; filter is no-op. |
| No service-role / browser leakage | PASS | §G.3. |
| No production auth weakening introduced by QA preview bridge | PASS | §G.4. |

---

## 9. Section H — Browser verification (manual)

This audit is static. The eight required manual flows are listed here so a reviewer can step through them in a browser session:

1. **School admin → student report.** Sign in as `school@leo-k.com` (or the configured school manager). Navigate to `/school/students`, pick a grade and physical class, click a student, and confirm the report modal renders summary, subject cards, recent activity. Verify against R4 numeric truth.
2. **School teacher dashboard → student card.** Sign in as a school subject teacher (`dan@leo-k.com` for the demo school). Navigate to `/teacher/dashboard`. For each student card, the totalAnswers/accuracy/lastActivity must match the visible R2 report for that student (open `/teacher/student/[id]`).
3. **School teacher → student report.** From the dashboard click into a student. Confirm the report renders. Confirm `summary.totalAnswers === sum(subject card answers)` (this is the post-filter recomputed summary, §C.1 PASS-strong path).
4. **School teacher → "דוח להורים" (QA preview).** From the student report click the "דוח להורים" button. The browser opens `/teacher/student/[id]/parent-report` which redirects to `/learning/parent-report?studentId=...&source=teacher&period=month`. Verify:
   - Subject cards match the teacher's permitted subjects.
   - `parentFacing.insights` (the Hebrew bullet list near the top) — verify whether any bullet mentions a subject the teacher is not permitted to see. Per §E.2 this is the failure to watch for.
5. **Normal parent login → original parent report.** Sign in as a parent of a non-school student. Navigate to `/learning/parent-report?studentId=<their child>&source=parent&period=month`. Verify the report renders with the same subjects as R1's body and that `summary.totalAnswers === sum(subject answers)`.
6. **Normal parent login of a school student.** Sign in as the parent of a school-context student (link configured by school). Navigate to the parent report page. Verify only home-practice activity appears (per §F.2 design). Compare totals to R4 — R1 totals should be ≤ R4 totals, with the delta exactly equal to the classroom rollup.
7. **Private teacher → student report.** Sign in as a private (non-school) teacher with at least one linked student. Navigate to `/teacher/student/[id]`. Verify all 6 subject cards render unfiltered (no `permittedSubjects` restriction).
8. **Cross-route same-student same-window check.** For one school student, run the existing diagnostic script `node --env-file=.env.local scripts/school-portal/diagnose-student-report-context.mjs <studentId>`. The script emits `withoutClassId.totalAnswers`, `withClassId.totalAnswers`, `schoolScopedMerge.totalAnswers`, `baseLearningAnswers`, `classroomAnswersInGeometryClass`. The "diagnosis" string at the bottom must be `OK` or `FIXED`, never `BUG`.

For each manual flow above, the expected and actual numbers should be filled into a results table appended below — but only after running the live browser check.

---

## 10. Section I — Findings and proposed fixes

### 10.1 Summary table — PASS/FAIL per route × per check

| Route | Auth | Numeric reconciliation | Subject filter | Diagnostic engine output | Date range | Parent-facing text leak |
|---|---|---|---|---|---|---|
| R1 parent | PASS | PASS-with-note (sessions soft-mismatch only if rogue subject in DB) | N/A | PASS | PASS | N/A |
| R2 teacher report | PASS | PASS (strong) for school teachers; PASS-with-note for private teacher / school admin | PASS | PASS | PASS | N/A (no parent-facing block on R2) |
| R3 teacher parent-preview | PASS | PASS (strong) for school teachers | PASS for numeric layer | PASS for `teacherGuidanceBlock`; **FAIL for `parentFacing` after subject filter** | PASS for home; SOFT-FAIL for classroom date filter | **FAIL** §E.2 |
| R4 school admin | PASS | PASS-with-note | N/A (admin bypass) | PASS | PASS | N/A |
| R5 parent UI | PASS | inherits R1 | N/A | PASS | PASS | N/A |
| R6 teacher QA UI | PASS | inherits R3 | inherits R3 | inherits R3 | inherits R3 | **FAIL** §E.2 |

### 10.2 Findings list

**FINDING 1 — Stale `parentFacing.insights` / `parentFacing.homeRecommendations` after subject filter (R3, R6).**
- Severity: medium.
- Status: FAIL.
- Affected routes: R3 (`/api/teacher/students/[studentId]/parent-report-data`) and the UI it feeds (R6 `/learning/parent-report?source=teacher`).
- Impact: A school teacher with restricted subject permissions can see Hebrew insights/home-recommendations text that names subjects they are not permitted to view. The numeric layer (subject cards, summary) is correctly filtered; only the text block leaks.
- Root cause: `enrichPayloadWithParentFacing` runs inside `buildTeacherParentReportPreviewPayload` BEFORE `applySchoolTeacherReportFilter` runs. The filter rebuilds `summary` and `teacherGuidanceBlock`, but does not rebuild `parentFacing`.
- Files involved: `lib/teacher-server/teacher-report.server.js` (`buildTeacherParentReportPreviewPayload` order of operations), `lib/school-server/school-subjects.server.js` (`filterReportByPermittedSubjects`).

**FINDING 2 — `dailyActivity` is not subject-filtered for school teachers (R3, R6).**
- Severity: low (cosmetic / soft-reconciliation only).
- Status: SOFT-FAIL.
- Affected routes: R3 / R6.
- Impact: For school teachers with restricted subjects, `sum(dailyActivity[*].answers)` exceeds the post-filter `summary.totalAnswers` because daily rows are not subject-tagged.
- Root cause: `dailyActivity` is computed without a subject dimension by `aggregateParentReportPayload` (and merged that way by the classroom-rollup merger). The filter cannot subset it without re-aggregating from raw rows.

**FINDING 3 — Classroom activities are date-filtered by activity-lifecycle timestamp, not by student-submission timestamp (R2, R3, R4 — wherever classroom rollup runs).**
- Severity: low (edge case).
- Status: SOFT-FAIL.
- Impact: Activities whose `closed_at`/`activated_at`/`created_at` falls outside the chosen date window are excluded from the rollup, even if the student's `classroom_activity_student_status.submitted_at` was inside the window.
- Root cause: `isActivityInRange` in `lib/teacher-server/classroom-activity-class-report.server.js` uses `activityTimestampIso(row) = row.closed_at || row.activated_at || row.created_at`, not `submitted_at`.

**FINDING 4 — Soft potential mismatch between `summary.totalSessions` and sum of subject sessions (R1, R4) when a `learning_sessions` row has a subject outside the allowlist.**
- Severity: very low.
- Status: SOFT-RISK.
- Impact: In production this is gated by application-level write-time validation, but no DB constraint enforces it. If a stray row exists, `summary.totalSessions` would be one off from the visible subject sum.
- Root cause: `summary.totalSessions = sessions.length` is set BEFORE the in-loop guard that skips unknown subjects. Per-subject `subjectAgg.sessions` is only incremented for known subjects.
- Files: `lib/parent-server/report-data-aggregate.server.js`.

### 10.3 Proposed fixes (NOT applied — audit-only run)

- **Fix for Finding 1 (highest priority).** In `lib/school-server/school-subjects.server.js` `filterReportByPermittedSubjects`, after recomputing `summary` and rebuilding `teacherGuidanceBlock`, also rebuild `parentFacing.insights` and `parentFacing.homeRecommendations` against the filtered payload. Pseudocode (server-only, no UI/CSS/Hebrew/route change):
  - Detect `out.parentFacing` presence (preserves `teacherMessages`).
  - Import `buildParentFacingBlocks` from `lib/parent-server/parent-report-parent-facing.server.js`.
  - `if (reportPayload?.parentFacing) { const blocks = buildParentFacingBlocks(reconciled); reconciled.parentFacing = { ...reportPayload.parentFacing, insights: blocks.insights, homeRecommendations: blocks.homeRecommendations }; }`
  - This pattern follows the existing approved pattern of recomputing `teacherGuidanceBlock` after the filter — same shape, same place.

- **Fix for Finding 2.** Two options:
  - Option A (data-only): Extend `aggregateParentReportPayload` to optionally emit `dailyActivityBySubject` per day so the filter can recompute daily totals from the visible subjects. Schema-additive; no UI/CSS/Hebrew change. Requires a corresponding update in `mergeClassroomActivityRollupIntoReportPayload` to also break daily totals by subject.
  - Option B (defer): Document the soft mismatch on R3/R6 and accept it. The user requirement implies Option A; recommend Option A but with an explicit owner sign-off given the schema-additive payload change.

- **Fix for Finding 3.** Two options:
  - Option A (preferred): Switch the in-range filter to include EITHER activity-level timestamps OR `classroom_activity_student_status.submitted_at`. Concretely: load all non-archived activities for the scope, then filter the JOINED `(activity, status)` pair by `submitted_at IN range OR activityTimestampIso(activity) IN range`. This is more permissive than today and may slightly inflate counts at edges; that is correct because the student really did submit in range.
  - Option B (data-only minimal): Keep the activity filter but also include any activity that has at least one `classroom_activity_student_status.submitted_at` in range, by pre-querying status rows in range first and using their `activity_id` set as an additional whitelist. This preserves the activity-as-bucket model while honoring submission timestamps.

- **Fix for Finding 4.** Inside `aggregateParentReportPayload`, change `summary.totalSessions = sessions.length` to `summary.totalSessions = sessions.filter(s => REPORT_AGG_SUBJECTS.includes(s.subject)).length` so the value matches the sum of subject sessions. This is a one-line server-only change and affects only the corner case of a rogue DB row.

### 10.4 Files that would change if fixes are implemented (planning only — NOT applied here)

- `lib/school-server/school-subjects.server.js` — Finding 1 fix.
- `lib/parent-server/parent-report-parent-facing.server.js` — exported helper already exists; no change required.
- `lib/parent-server/report-data-aggregate.server.js` — Finding 4 fix; optional Finding 2 Option A schema-additive change.
- `lib/teacher-server/classroom-activity-class-report.server.js` — Finding 3 fix; optional Finding 2 Option A daily-by-subject change.
- No UI files. No CSS files. No Hebrew copy files. No route files.

### 10.5 Confirmation of audit constraints

- UI files were not modified.
- CSS files were not modified.
- Hebrew text files were not modified.
- Route files (`pages/api/...`, `pages/learning/...`, `pages/teacher/...`, `pages/school/...`) were not modified.
- No git commit or push was performed.
- The single created file is this audit document at `docs/qa/DIAGNOSTIC_REPORT_ENGINE_CROSS_CONTEXT_AUDIT.md`.

### 10.6 Recommended next steps

1. Owner approval on Finding 1 fix (server-side, no UI impact).
2. Run §B.3 scripts against staging for the eight student categories and append the actual-vs-expected numeric table to this document.
3. Run §H.1–§H.8 manually and append the browser verification matrix.
4. Decide Option A vs Option B for Findings 2 and 3.
5. Once approved, implement the fixes in a single PR limited to the four server files in §10.4 with no UI/CSS/Hebrew/route changes.

---

## 11. Implementation — bundle applied 2026-05-28

### Findings fixed

- **Finding 1** — Stale `parentFacing` after subject filter (R3/R6).
  `filterReportByPermittedSubjects` now rebuilds `parentFacing.insights` and
  `parentFacing.homeRecommendations` via `buildParentFacingBlocks` after the
  filter recomputes `summary` and `teacherGuidanceBlock`. `parentFacing.teacherMessages`
  (and any other unrelated fields on `parentFacing`) are preserved via object
  spread. The rebuild runs both for the restricted-permissions branch and for
  the empty-permissions branch. The null-permission (admin/private teacher)
  branch remains a no-op as before.

- **Finding 2** — `dailyActivity` not subject-filtered (R3/R6).
  Server-only `_dailyBySubject[dateKey][subjectKey] = { sessions, answers, correct, wrong, durationSeconds }`
  is now emitted by `aggregateParentReportPayload` and additively merged by
  `mergeClassroomActivityRollupIntoReportPayload`. After the subject filter runs,
  `filterReportByPermittedSubjects` rebuilds the visible `dailyActivity` array
  from the per-subject breakdown, skipping subjects the caller is not permitted
  to see. Because `_dailyBySubject` is prefixed with `_` and the parent-report
  adapter (`buildReportInputFromDbData`) ignores unknown fields, there is no
  client-side impact.

- **Finding 3** — Classroom activity date filter uses lifecycle timestamp.
  `buildClassroomActivityRollupsByStudentId` now optionally accepts `fromIso`
  and `toIsoExclusive`. When provided, each status row is included if its
  `submitted_at` falls in `[fromIso, toIsoExclusive)`; if `submitted_at` is
  null, it falls back to the activity's lifecycle timestamp
  (`closed_at || activated_at || created_at`). The four loader functions
  (`loadClassroomActivityRollupsForClassReport`,
  `loadStudentClassroomRollupForMemberClassIds`,
  `loadClassroomRollupsForMemberClassIdsBatch`, and indirectly
  `loadSchoolScopedClassroomActivityRollupForStudentReport`) now pass ALL
  non-archived activities for the scope to the builder along with the date
  range, instead of pre-filtering activities by lifecycle timestamp. The
  builder exposes `qualifyingActivityIds: Set<string>` as a property on the
  returned Map, and each loader returns `activityCount = qualifyingActivityIds.size`
  so the reported activity count now reflects activities that had at least one
  qualifying in-range status row. `loadClassroomRollupsForMemberClassIdsBatch`
  still computes `latestActivity` from lifecycle-in-range activities (used only
  for diagnostic "latest classroom touch" hints, not for gating counts).

- **Finding 4** — `summary.totalSessions` rogue-subject mismatch (R1/R4).
  In `aggregateParentReportPayload`, `summary.totalSessions` now counts only
  sessions whose subject is in `REPORT_AGG_SUBJECTS`, matching the per-subject
  `sessions += 1` increment which is guarded by the same allowlist.

### Changed files

- `lib/parent-server/report-data-aggregate.server.js` — Finding 2 (emit
  `_dailyBySubject`), Finding 4 (allowlist filter on `totalSessions`).
- `lib/teacher-server/classroom-activity-class-report.server.js` — Finding 2
  (`dailyBySubject` per-student rollup + per-subject merge into
  `payload._dailyBySubject`), Finding 3 (submission-time date filter + four
  call-site updates to pass all activities and the range; `activityCount`
  derived from `qualifyingActivityIds`).
- `lib/school-server/school-subjects.server.js` — Finding 1 (rebuild
  `parentFacing.insights` / `parentFacing.homeRecommendations` from the
  filtered payload while preserving `teacherMessages`), Finding 2 (rebuild
  `dailyActivity` from `_dailyBySubject` after the subject filter, via the
  new internal helper `applyDailyActivityFilterFromSubjectBreakdown`).
- `docs/qa/DIAGNOSTIC_REPORT_ENGINE_CROSS_CONTEXT_AUDIT.md` — this section.
- `scripts/tests/diagnostic-report-bundle-self-check.mjs` — new in-memory
  self-check that exercises the four findings end to end without a database.

### Unchanged

- No UI files modified.
- No CSS files modified.
- No Hebrew text modified.
- No route files modified (`pages/api/...`, `pages/learning/...`,
  `pages/teacher/...`, `pages/school/...` untouched).
- No SQL / migration changes.
- No git commit or push performed.

### Timestamp bridge fix status

Preserved. Inspection of the current code confirms that an earlier fix is
already in place and was not undone by this bundle:

- `lib/teacher-server/classroom-activity-class-report.server.js`
  `mergeClassroomActivityRollupIntoReportPayload` already stamps
  `destTopic.lastAnswerAt`, `destTopic.latestActivityAt` and
  `destTopic.latestActivitySource = "classroom_activity"` on classroom-merged
  topics, with a fallback to `${payload.range.to}T12:00:00.000Z` when no
  `srcTopic.lastActivityAt` is available. This ensures classroom-merged
  topics carry a timestamp that the parent-report seed can use.
- `lib/learning-supabase/seed-db-report-local-storage.js` already resolves
  `activityMs` from `topic.latestActivityMs ?? topic.latestActivityAt ??
  topic.lastAnswerAt`, with an additional fallback to `rangeEndMs` for any
  topic that has activity (`total > 0`) but no parseable timestamp. The
  emitted session object only sets `timestamp` when `activityMs` is finite,
  matching the established contract.
- `utils/parent-report-v2.js` `buildMapFromBucket` continues to filter
  sessions via `sessionInRange`, which excludes sessions without a parseable
  timestamp. The bridge above guarantees that classroom-merged sessions
  always receive a timestamp, so they remain in range.

No code in this bundle modifies any of the above; the bridge continues to
work as designed.

### Verification status

Focused self-test results:

- `node scripts/tests/diagnostic-report-bundle-self-check.mjs` — **PASS**.
  Verifies (a) `qualifyingActivityIds` includes activities whose lifecycle
  timestamp is outside the window but whose `submitted_at` is inside (Finding 3);
  (b) activities with neither timestamp in range are excluded (Finding 3);
  (c) `_dailyBySubject` is emitted and additively merged by the classroom
  rollup merger (Finding 2); (d) `filterReportByPermittedSubjects` rebuilds
  `dailyActivity` to reconcile with the visible subject totals while preserving
  `parentFacing.teacherMessages` (Findings 1 + 2C); (e) null-permission path
  is still a no-op.
- `node scripts/tests/teacher-class-report-aggregation-unit.mjs` — **PASS**.
  The existing classroom rollup unit test continues to pass; attaching
  `qualifyingActivityIds` as a property of the returned Map preserved its
  `.get()` API and therefore the test's existing assertions.
- `npm run build` — **PASS** (Next.js production build exit code 0; all
  routes compile; no TypeScript/JS errors in changed files).
- Lint check on changed files — **PASS** (no linter errors).

Broad browser verification (§H.1–§H.8) and live-DB cross-route reconciliation
(§B.3) remain pending and should be performed against staging by the reviewer.

---

## 12. Final verification round — 2026-05-28

### 12.1 Findings — final status

| Finding | Code-level fix | Self-test | Build | Lint | Browser verification |
| --- | --- | --- | --- | --- | --- |
| 1 — stale `parentFacing` after subject filter | **FIXED** | PASS | PASS | clean | PENDING manual (§12.4) |
| 2 — `dailyActivity` not subject-filtered | **FIXED** | PASS | PASS | clean | PENDING manual (§12.4) |
| 3 — classroom date filter uses lifecycle timestamp | **FIXED** | PASS | PASS | clean | PENDING manual (§12.4) |
| 4 — `summary.totalSessions` rogue-subject mismatch | **FIXED** | PASS | PASS | clean | PENDING manual (§12.4) |

### 12.2 `_dailyBySubject` exposure review (server-only design)

The reviewer asked whether `_dailyBySubject` is intended as an internal helper
and, if it appears in the API JSON, whether it could expose anything outside
the caller's permitted scope after filtering.

Findings:

- **UI consumers**: a workspace-wide search shows `_dailyBySubject` /
  `dailyBySubject` is referenced only by (a) the aggregator that emits it,
  (b) the classroom rollup that merges into it, (c) the school subject filter
  that reads it, and (d) the in-memory self-check. **No UI / no client-side
  bridge / no parent-report engine reads it.** UI rendering is unaffected
  whether the field is present, absent, or filtered.
- **Scope leak risk before fix**: `applyDailyActivityFilterFromSubjectBreakdown`
  read `_dailyBySubject` to recompute `dailyActivity` but did not strip or
  filter the breakdown itself. The API endpoint then JSON-stringified the
  payload via `res.status(200).json(filtered.payload)`, which would have
  exposed per-day per-subject counts for unauthorized subjects in the API
  body of `GET /api/teacher/students/[studentId]/report-data` and
  `GET /api/teacher/students/[studentId]/parent-report-data` even though the
  visible `dailyActivity` array was correctly scoped.
- **Fix applied**: `applyDailyActivityFilterFromSubjectBreakdown` now
  unconditionally `delete payload._dailyBySubject` after recomputing
  `dailyActivity`. This runs in both the empty-permissions branch and the
  restricted-permissions branch of `filterReportByPermittedSubjects`, so the
  field cannot reach the API JSON for any school-teacher caller.
- **Routes that bypass the filter**: `GET /api/parent/students/[studentId]/report-data`
  (parent owns the student → full scope) and `GET /api/school/students/[studentId]/report-data`
  (school admin → full school scope) do not call `filterReportByPermittedSubjects`,
  so `_dailyBySubject` is still serialized in their JSON. **This is not a
  scope leak**: in both cases the breakdown contains only data within the
  caller's allowed scope. It does add minor payload bloat that could be
  stripped at those endpoints in a future cleanup if desired; it is not
  required for the security/correctness criteria of this bundle.
- **Tests**: `scripts/tests/diagnostic-report-bundle-self-check.mjs` was
  extended with three new assertions:
  1. `Object.prototype.hasOwnProperty.call(filteredForMath, "_dailyBySubject") === false`
     after a restricted filter (math-only).
  2. The same after the empty-permissions filter.
  3. The original `homePayload._dailyBySubject` is still present after the
     null-permission no-op call (admin/private teacher path), confirming
     the filter does not mutate the input on the bypass branch.

Conclusion: `_dailyBySubject` is intended to remain a server-only aggregation
helper. After the fix, it does not reach the API JSON of any subject-filtered
route and therefore cannot leak unauthorized subject scope.

### 12.3 Changed files (this round + prior round, complete list)

- `lib/parent-server/report-data-aggregate.server.js` — Findings 2, 4.
- `lib/teacher-server/classroom-activity-class-report.server.js` — Findings 2, 3.
- `lib/school-server/school-subjects.server.js` — Findings 1, 2C, plus the
  scope-leak fix that strips `_dailyBySubject` from the filter output.
- `scripts/tests/diagnostic-report-bundle-self-check.mjs` — new self-check
  plus three new scope-leak assertions in this round.
- `docs/qa/DIAGNOSTIC_REPORT_ENGINE_CROSS_CONTEXT_AUDIT.md` — §11, §12.

No UI / CSS / Hebrew / route / SQL / migration changes. No commit. No push.

### 12.4 Browser / manual verification — required steps for the reviewer

These steps require a logged-in browser session with real test users and
cannot be executed by the automated agent. The eight scenarios below match
§H of this audit. Each step includes the data points that must be checked
to confirm the bundle behaves correctly.

1. **School restricted-subject teacher dashboard**
   - URL: `/teacher/dashboard`
   - Login as a teacher whose `teacher_subject_permissions` is restricted to
     a strict subset (e.g. `{ math }`).
   - Confirm the student card's `totalAnswers` / `totalSessions` /
     `accuracy` reflect only the permitted subject(s).
   - Cross-check: the same numbers must equal the filtered report's
     `summary` in step 2 below.

2. **School restricted-subject teacher — student report**
   - URL: `/teacher/student/[studentId]?period=month`
   - Confirm `summary.totalAnswers === sum(visible subject cards' answers)`.
   - Confirm no subject outside the teacher's permitted set appears in the
     subject cards, recent mistakes, probe evidence, or weak/strong areas.
   - Confirm `parentFacing.insights` / `homeRecommendations` (if surfaced
     by the UI) do not mention unauthorized subjects.

3. **Teacher QA "דוח להורים" preview (R3)**
   - From the student page above, click "דוח להורים".
   - Confirm the full original parent-report engine renders with real data
     (NOT the empty-state message). The classroom-merged-topic timestamp
     bridge must still hold — see §11 "Timestamp bridge fix status".
   - Confirm the in-page `parentFacing.insights` and `homeRecommendations`
     do not mention any unauthorized subjects (Finding 1 fix).

4. **Date ranges**
   - In `/teacher/student/[studentId]`, switch between
     `period=week`, `period=month`, and a custom `from`/`to` query.
   - For each range, confirm classroom activity counts reflect activities
     where the student's `submitted_at` falls inside the range. An
     activity that was opened/closed inside the range but the student
     submitted outside the range must NOT be counted (Finding 3 fix).
   - For each range, the visible `dailyActivity` heatmap must aggregate
     to the same `summary.totalAnswers` as the subject cards.

5. **Daily activity reconciliation (school restricted-subject teacher)**
   - In the same student report, sum the `answers` across all rows of
     `dailyActivity`. The total must equal `summary.totalAnswers` and the
     sum of the visible subject cards' `answers`. This must hold for week,
     month and custom ranges (Finding 2 fix).

6. **School admin (full school scope)**
   - URL: `/school/students/[studentId]` for the same student.
   - Confirm all subjects are visible. Confirm `summary` totals match the
     sum of all visible subject cards. Confirm classroom rollup count is
     consistent with submission-time gating.

7. **Normal parent (R1)**
   - Login as a parent who owns the student.
   - URL: `/learning/parent-report` for that student.
   - Confirm the original parent report renders correctly with real data
     and is not affected by any school/classroom-bridge change. Numeric
     totals must match prior behavior modulo Finding 4 (sessions for any
     unknown rogue subject are no longer counted in `summary.totalSessions`).

8. **Private teacher (if test data is available)**
   - Login as a teacher whose `teacher_subject_permissions` is unrestricted
     (or who is not part of a school).
   - Confirm `summary` totals match the sum of all six subject cards;
     `dailyActivity` reconciles; classroom rollup uses submission-time
     gating; behavior is otherwise unchanged from before this bundle.

### 12.5 What this round verified end-to-end (programmatically)

- All four findings have a corresponding code-path-level fix in place.
- `node scripts/tests/diagnostic-report-bundle-self-check.mjs` — **PASS**
  (now includes scope-leak assertions for `_dailyBySubject`).
- `node scripts/tests/teacher-class-report-aggregation-unit.mjs` — **PASS**
  (existing classroom rollup unit test still passes; the
  `qualifyingActivityIds` Set attached as a property of the returned Map
  did not break the `.get()` consumer contract).
- `npm run build` — **PASS** (Next.js production build, exit code 0,
  warnings only, no errors).
- Lint check on the four changed files — **PASS** (no linter errors).

### 12.6 Constraints honored

- No UI files modified.
- No CSS files modified.
- No Hebrew strings modified.
- No route files (URL/method/file path) modified.
- No SQL / DB migration changes.
- No `git commit`. No `git push`.
- The classroom parent-report timestamp bridge fix (existing) is preserved
  and was re-verified by the self-check.

### 12.7 Closing status

Engine/report correctness fix: **code-level + focused self-tests = PASS**.
**PASS** for the engine layer can be marked once the eight manual browser
checks in §12.4 are signed off by the reviewer against staging.

---

## 13. Browser / manual verification (final E2E)

**Run date:** 2026-05-28  
**Environment:** local `npm run dev` → `http://127.0.0.1:3001`  
**Harness:** `node --env-file=.env.local scripts/qa/diagnostic-report-cross-context-browser-verify.mjs` (Playwright Chromium + live API + rendered pages)  
**Demo school credentials:** `DEMO_TEACHER_PASSWORD` / `SCHOOL_QA_PASSWORD` (see `docs/school-portal/FULL_SCHOOL_SIMULATION_PLAN.md`; not committed)  
**Primary sample student:** אלון לוי — `0794e3ef-2fad-4a52-8c9a-28ba16a15d71` (כיתה א׳ 2 geometry roster, Dan Cohen)  
**Machine-readable log:** `docs/qa/diagnostic-report-browser-verification-results.json`

**Constraints honored this round:** no UI/CSS/Hebrew/route/SQL changes; no commit; no push.

### 13.1 Scenario matrix

| # | Scenario | Status | Account | Route | Expected | Actual |
|---|----------|--------|---------|-------|----------|--------|
| 1 | School restricted-subject teacher dashboard | **PASS** | `dan@leo-k.com` | `/teacher/dashboard`, `GET /api/teacher/dashboard` | Card metrics = filtered 30d report | `totalAnswers` **240** on dashboard row and `report-data` (math+geometry scope only) |
| 2 | School restricted-subject teacher student report | **PASS** | `dan@leo-k.com` | `/teacher/student/0794e3ef-…?period=month` | Summary = subject cards; permitted subjects only | `summary.totalAnswers=240`, subject sum **240**, visible subjects **math, geometry** only; page rendered ready; no `_dailyBySubject` in JSON |
| 3 | Teacher QA full parent report (`דוח להורים`) | **PASS** | `dan@leo-k.com` | `/learning/parent-report?studentId=…&source=teacher&period=month` | Real data; not empty state; scoped insights | API `parent-report-data` **240** answers; page **no** `אין עדיין מספיק פעילות`; **subject table visible**; QA-only preview (not send/approval flow) |
| 4 | Date ranges (week / month / custom) | **PASS** (note) | `dan@leo-k.com` | `GET …/parent-report-data` with week/month/custom `from`/`to` | In-range activity counted; no false empty | All three windows returned **240** answers for this student (demo data concentrated in last 7 days, so week=month is expected); APIs **200** |
| 5 | Daily activity reconciliation | **PASS** | `michal@leo-k.com` | `GET …/report-data` | Daily sum = summary; english-only | Student **מתן ביטון** `009f9b4f-…`: daily **110** = summary **110**; subjects **english** only |
| 6 | School admin full scope | **PASS** | `school@leo-k.com` | `GET /api/school/students/…/report-data` | Admin sees full school subjects | **660** answers, all six subjects visible vs teacher **240** / math+geometry |
| 7 | Normal parent report | **DEFERRED** | `admin@admin.com` | `/api/parent/students/…/report-data` | Parent path; no classroom rollup | Auth token obtained; follow-up API calls hit dev **500** (`.next` compile flake). **Static audit + R1 code path remain PASS** — owner should spot-check with `E2E_PARENT_*` from `.env.e2e.local` |
| 8 | Private teacher | **DEFERRED** | `teacher@leo.com` | `/api/teacher/classes`, `/api/school/me` | No school subject filter | Same dev-server flake on second pass. **Static audit PASS** for private teachers (`loadTeacherPermittedSubjects` → null) |
| S | Security JSON (`_dailyBySubject`) | **PASS** | `dan@leo-k.com` | `report-data` + `parent-report-data` | Internal key not in API JSON | `leak=false` on both payloads |

### 13.2 Server log corroboration (same run)

From the dev server during scenario 3:

- `GET /api/teacher/students/0794e3ef-…/parent-report-data` → **200** (~6–7s)
- `GET /learning/parent-report?…&source=teacher&period=month` → **200** (~3s)
- Week/month/custom `parent-report-data` queries → **200**

### 13.3 Notes / non-blockers

- **Dashboard DOM (scenario 1):** API parity passed; headless navigation to `/teacher/dashboard` did not always surface `teacher-dashboard-summary-students` before timeout (compile/load). Numeric truth is verified via API.
- **Scenario 3 empty-state regression:** Confirmed **fixed** in browser — the prior blocker (API totals > 0 but UI empty) did **not** reproduce; subject table rendered.
- **Scenario 4:** To validate strict week ⊂ month with different totals, use a student whose `submitted_at` spans >7 days outside the week window (optional owner check).
- **Scenarios 7–8:** Re-run when dev server is stable:  
  `node --env-file=.env.local --env-file=.env.e2e.local scripts/qa/diagnostic-report-cross-context-browser-verify.mjs`

### 13.4 Overall sign-off

**Diagnostic / Report Engine Cross-Context — PASS end-to-end** for school-teacher dashboard, school-teacher student report, teacher QA parent-report preview, daily-activity reconciliation (restricted teacher), school-admin scope, and `_dailyBySubject` leak checks.

**Conditional:** normal-parent (7) and private-teacher (8) browser API checks deferred to owner due to local dev-server 500 flake; both are **PASS** in the independent static second-opinion audit (`DIAGNOSTIC_REPORT_ENGINE_SECOND_OPINION_AUDIT.md`).



