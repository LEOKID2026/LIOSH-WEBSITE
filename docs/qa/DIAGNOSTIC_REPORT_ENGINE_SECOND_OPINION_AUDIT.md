# Diagnostic / Report Engine — Independent Second-Opinion Audit

Generated: 2026-05-28
Scope: Independent static verification of the diagnostic/report engine correctness across all contexts.
Constraints: No UI/CSS/Hebrew/route/SQL changes. No commits. No pushes.

---

## 0. Audit Ground Rules Confirmed

- This audit was performed independently by reading the actual code paths.
- No code, UI, CSS, Hebrew text, routes, or SQL were changed.
- No commits or pushes were performed.
- The existing audit document was not used as the source of truth for these findings.

---

## A. Verify Route Separation

| Route | Context | Separation Status |
| --- | --- | --- |
| `GET /api/parent/students/[studentId]/report-data` | Normal parent report | PASS. Uses `aggregateParentReportPayload` directly. No classroom rollup. |
| `GET /api/teacher/students/[studentId]/report-data` | Teacher student report | PASS. Uses `buildTeacherStudentReportPayload`, applies classroom rollup, then `applySchoolTeacherReportFilter`. |
| `GET /api/school/students/[studentId]/report-data` | School admin report | PASS. Uses `buildTeacherStudentReportPayload` (with skipAudit), applies classroom rollup, NO subject filter applied. |
| `GET /api/teacher/students/[studentId]/parent-report-data` | Teacher QA preview | PASS. Uses `buildTeacherParentReportPreviewPayload`, applies classroom rollup, then `applySchoolTeacherReportFilter`. |
| `/learning/parent-report?source=parent` | Parent UI | PASS. Fetches from parent API, seeds local storage, runs `generateParentReportV2`. |
| `/learning/parent-report?source=teacher` | Teacher QA UI | PASS. Fetches from teacher QA API, seeds local storage, runs `generateParentReportV2`. |

**Conclusion for A:** Route separation is strictly maintained. The teacher QA preview uses the same client-side engine (`generateParentReportV2`) but is fed by a distinct API endpoint (`parent-report-data`) that correctly applies the teacher's authorization and classroom rollup context. Normal parent reports do not include classroom data.

---

## B. Verify Data-Source Correctness

| Route | `learning_sessions` / `answers` | `classroom_activities` / `status` | Classroom Rollup Merge | localStorage Seeding |
| --- | --- | --- | --- | --- |
| Parent API | YES (`aggregateParentReportPayload`) | NO | NO | NO (API layer) |
| Teacher API | YES | YES | YES | NO (API layer) |
| School Admin API | YES | YES | YES | NO (API layer) |
| Teacher QA API | YES | YES | YES | NO (API layer) |
| Parent UI (source=parent) | N/A (via API) | N/A (via API) | N/A (via API) | YES (`runParentReportGenerationFromApiBody`) |
| Teacher QA UI (source=teacher) | N/A (via API) | N/A (via API) | N/A (via API) | YES (`runParentReportGenerationFromApiBody`) |

**Conclusion for B:** Data sources are correct. All routes use `aggregateParentReportPayload` for home practice. Teacher and school routes correctly merge classroom activity. The UI layer consistently uses the localStorage seeding bridge for the full parent report engine.

---

## C. Verify Subject Scope

**School Subject Teachers:**
- **Numeric summary:** PASS. `recomputeReportSummaryFromSubjects` correctly rebuilds the summary from the filtered `subjects` map.
- **Visible subject cards:** PASS. `filterReportByPermittedSubjects` removes unauthorized subjects from the `subjects` map.
- **Daily activity:** PASS. `applyDailyActivityFilterFromSubjectBreakdown` rebuilds `dailyActivity` using only permitted subjects from `_dailyBySubject`.
- **Parent-facing insights/recommendations:** PASS. `buildParentFacingBlocks` is called *after* the payload is filtered in `filterReportByPermittedSubjects`, ensuring insights are generated only from permitted subjects.
- **Helper fields leak check:** PASS. `delete payload._dailyBySubject` is explicitly called at the end of `applyDailyActivityFilterFromSubjectBreakdown`, preventing the internal breakdown from leaking into the API JSON response for restricted teachers.

**School Admins:**
- PASS. The school API does not call `applySchoolTeacherReportFilter`, and `loadTeacherPermittedSubjects` returns `null` for admins, bypassing the filter.

**Private Teachers:**
- PASS. `loadTeacherPermittedSubjects` returns `null` for teachers without a school membership, bypassing the filter.

**Normal Parents:**
- PASS. The parent API does not apply any subject filtering.

---

## D. Verify Date Ranges

- **Week/Month/Custom:** PASS. `resolveTeacherReportDateRange` and `computeReportRangeForParentApi` handle these correctly, generating inclusive `from` and exclusive `to` ISO strings.
- **UTC boundaries:** PASS. Boundaries are correctly set to `T00:00:00.000Z`.
- **Classroom activity `submitted_at`:** PASS. `buildClassroomActivityRollupsByStudentId` now accepts `fromIso` and `toIsoExclusive` and checks `statusRow.submitted_at`.
- **Fallback:** PASS. It falls back to `activityTimestampIso(activity)` only if `submitted_at` is missing.

---

## E. Verify Diagnostic Correctness

- **Weak/Strong areas:** PASS. `buildStudentTeacherGuidance` and `buildParentFacingBlocks` use consistent accuracy thresholds (< 60 for weak, >= 80 for strong) and minimum answer counts.
- **Recommendations match scope:** PASS. Because `parentFacing` is rebuilt after subject filtering, recommendations only consider permitted subjects.
- **Thin-data messages:** PASS. "לא הייתה פעילות תרגול בתקופה האחרונה" is shown only when `totalAnswers === 0 && totalSessions === 0`.
- **Raw internal keys:** PASS. Keys are passed through `subjectLabelHe` and `topicLabelHe`.
- **Timestamps for parent report engine:** PASS. `mergeClassroomActivityRollupIntoReportPayload` provides fallback timestamps (`lastAnswerAt`, `latestActivityAt`) for classroom-merged topics, ensuring they are not dropped by `sessionInRange` in `generateParentReportV2`.

---

## F. Verify Security / Authorization Logic

- **Parent access:** PASS. Enforced by `students.parent_id === userData.user.id` and RLS.
- **Teacher access to student:** PASS. Enforced by `teacherHasReportAccessToStudent` (checks direct link, class membership, or school admin role).
- **Subject teacher scope:** PASS. Enforced by `applySchoolTeacherReportFilter`.
- **School admin scope:** PASS. Enforced by `requireSchoolManagerApiContext` and `verifyStudentVisibleToSchool`.
- **Service-role leaks:** PASS. Service role clients are only used server-side.
- **QA preview bypass:** PASS. The QA preview API (`parent-report-data`) requires the same `teacherHasReportAccessToStudent` authorization as the standard teacher report API.

---

## G. Compare with Current Tests

- `scripts/tests/diagnostic-report-bundle-self-check.mjs`: Excellent coverage. It correctly verifies the `_dailyBySubject` leak fix, the `submitted_at` date filtering, the `parentFacing` rebuild, and the `dailyActivity` recomputation.
- `scripts/tests/teacher-class-report-aggregation-unit.mjs`: Good coverage for the classroom rollup logic.

The existing tests accurately cover the risks identified and fixed in the recent bundle.

---

## H. Independently Found Risks or Mismatches

| Issue | Severity | Location | Covered by Tests? | Status |
| --- | --- | --- | --- | --- |
| `_dailyBySubject` could leak unauthorized subject data in API JSON | Medium | `lib/school-server/school-subjects.server.js` (`applyDailyActivityFilterFromSubjectBreakdown`) | YES (recently added to `diagnostic-report-bundle-self-check.mjs`) | **FIXED** (The `delete payload._dailyBySubject` line prevents this). |
| `summary.totalSessions` counts unknown subjects | Soft-Risk | `lib/parent-server/report-data-aggregate.server.js` | YES | **FIXED** (Now uses `.filter(s => REPORT_AGG_SUBJECTS.includes(s.subject)).length`). |
| Classroom activities filtered by lifecycle, not submission time | Soft-Risk | `lib/teacher-server/classroom-activity-class-report.server.js` | YES | **FIXED** (Now checks `submitted_at`). |
| `parentFacing` text leaks unauthorized subjects | Medium | `lib/school-server/school-subjects.server.js` | YES | **FIXED** (Rebuilt after filter). |
| `dailyActivity` totals include unauthorized subjects | Soft-Risk | `lib/school-server/school-subjects.server.js` | YES | **FIXED** (Rebuilt from `_dailyBySubject`). |

**Browser/manual verification is still required** to confirm the end-to-end UI rendering matches these server-side fixes, particularly for the Teacher QA preview and the Teacher Dashboard.

**Update (2026-05-28):** Final browser verification completed — see `DIAGNOSTIC_REPORT_ENGINE_CROSS_CONTEXT_AUDIT.md` §13. School-teacher flows and teacher QA parent-report preview **PASS** on local dev; normal-parent and private-teacher API spot-checks **deferred** (dev-server flake) with static audit still **PASS**.

---

## I. Comparison Against Existing Audit

After completing the independent analysis, I reviewed `docs/qa/DIAGNOSTIC_REPORT_ENGINE_CROSS_CONTEXT_AUDIT.md`.

**Agreement:**
- My independent findings perfectly align with the four findings identified in the original audit.
- I agree with the assessment of the `_dailyBySubject` leak risk and confirm that the implemented fix (`delete payload._dailyBySubject`) is correct and effective.
- I agree that the timestamp bridge for classroom activities in the parent report engine is intact and functioning.
- I agree that manual browser verification is the necessary final step.

**Disagreement / Differences:**
- None. The implementation state matches the documented fixes in the original audit's Section 11 and 12.

---

**Explicit Confirmation:**
No code, UI, CSS, Hebrew text, routes, or SQL were changed during this audit. No commits or pushes were performed.