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





