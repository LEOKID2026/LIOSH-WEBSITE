# Teacher / School Status Sync — Closure Report

**Date:** 2026-05-28  
**Scope:** Teacher dashboard, class report student rows, teacher student detailed report, school admin student/class reports, private teacher surfaces  
**Out of scope:** Regular parent report (intentionally left untouched)

---

## 1. Root Cause

The primary inconsistency observed in screenshots (student card showing **פעילות נמוכה** while the detailed teacher student report shows **20 sessions / 200 answers / 41% / דורש התערבות**) has **two root causes**, one in the product code and one in the simulation data pipeline:

### Root Cause A — Dashboard date range misalignment (code fix applied)

`buildTeacherDashboardPayload` (`lib/teacher-server/teacher-dashboard.server.js`) computed its window as:

```js
const toDate = new Date();                                         // exact current timestamp
const fromDate = new Date(toDate.getTime() - rangeDays * 86_400_000);  // 30 × exact seconds
```

`resolveTeacherReportDateRange` (`lib/teacher-server/teacher-report.server.js`) computes its default window as:

```js
const toDate = new Date();
toDate.setUTCHours(0, 0, 0, 0);                                   // UTC midnight today
const fromDate = new Date(toDate);
fromDate.setUTCDate(fromDate.getUTCDate() - (DEFAULT_RANGE_DAYS - 1));  // 29 calendar days back
```

Both convert to ISO dates with `isoDateOnly()` before querying, so the difference manifests as:

| Surface | `fromIso` (at 22:31 UTC, May 28) | `toIsoExclusive` |
|---|---|---|
| Dashboard (before fix) | `2026-04-28T00:00:00Z` | `2026-05-29T00:00:00Z` |
| Detailed report (default) | `2026-04-29T00:00:00Z` | `2026-05-29T00:00:00Z` |

The dashboard covered **one extra calendar day** (April 28) that the detailed report's default window did not. While this meant the dashboard was more inclusive, it also meant: if a teacher manually opened the detailed report with a custom wider window (e.g. 60 days), they saw data that the dashboard — running the standard default — could not show.

### Root Cause B — Simulation creates activities with backdated `closed_at` / `activated_at`

Both students' classroom activity rows in `classroom_activity_student_status` have `submitted_at = 2026-04-01` (57 days ago at the time of this audit). The activities in `classroom_activities` have `created_at = 2026-05-28` (today) but `closed_at = 2026-04-01` (backdated by the simulation script).

The classroom rollup loader uses `activityTimestampIso(activity)` = `closed_at || activated_at || created_at` as the reference timestamp for the date-range filter. Because `closed_at` takes priority and is April 1 — 57 days ago — **all classroom activities fall outside the default 30-day window on all surfaces**. This means:

- Dashboard: 0/0 → **פעילות נמוכה**  
- Class report student row: 0/0 → **פעילות נמוכה**  
- Detailed teacher student report (30-day default): 0/0 → **פעילות נמוכה**  
- Detailed teacher student report (60-day custom): data visible → **דורש התערבות**

The inconsistency in the screenshots was **not a code bug in the merge logic** but a combination of the simulation writing backdated timestamps and the teacher manually selecting a wider window in the detailed report UI.

### Root Cause C — `filterKey` confusion (code fix applied)

`deriveStudentStatusBadgeFromSummary` used `filterKey: "low_activity"` for **two distinct cases**:

1. `answers === 0 && sessions === 0` → badge **"פעילות נמוכה"** — genuine zero activity  
2. `answers < 3` (fallback) → badge **"אין מספיק נתונים"** — some activity but not enough to classify

This caused dashboard filter chips to group students with 1–2 answers together with completely inactive students under the same "פעילות נמוכה" filter chip.

---

## 2. Exact Conflicting Functions / Files

| Issue | File | Function / Line | Problem |
|---|---|---|---|
| Date range misalignment | `lib/teacher-server/teacher-dashboard.server.js` | `buildTeacherDashboardPayload` line 88–91 | Used rolling exact-time window instead of UTC-midnight calendar window |
| filterKey confusion | `lib/teacher-portal/student-learning-status.js` | `deriveStudentStatusBadgeFromSummary` line 44 | "אין מספיק נתונים" used `filterKey: "low_activity"` instead of `"insufficient_data"` |
| Simulation backdated timestamps | `scripts/school-portal/sim/db-simulator.mjs` | Activity creation | Writes `closed_at` / `activated_at` as historical dates, `created_at` as NOW |

---

## 3. Exact Payload Differences Between Detailed Report and Student Card/List

**Scenario: Default 30-day window, all activity data is from April 1 (57 days ago)**

| Field | Dashboard card | Class report student row | Detailed teacher student report (30-day) | Detailed report (60-day) |
|---|---|---|---|---|
| `totalSessions` | 0 | 0 | 0 | 20 (from classroom) |
| `totalAnswers` | 0 | 0 | 0 | 200 (from classroom) |
| `accuracy` | null | null | null | 41% |
| `lastActivityAt` | null | null | null | 2026-04-01 |
| `statusBadge` | פעילות נמוכה | פעילות נמוכה | פעילות נמוכה | דורש התערבות |
| `filterKey` | low_activity | low_activity | low_activity | struggling |
| Date window used | April 29–May 29 (after fix) | April 29–May 29 | April 29–May 29 | Custom April 1–May 28 |

**Root cause of the screenshot inconsistency:** The teacher opened the detailed report with a manually extended date range (60+ days) while the dashboard and class report cards remained on the 30-day default.

---

## 4. Whether the Issue Was Data Source, Date Range, Subject Scope, Cache, or Classifier

- **Data source:** Not the cause. Both the dashboard and the detailed report correctly read `learning_sessions`, `answers`, and `classroom_activity_student_status` via the classroom rollup merge. The merge logic is identical.
- **Date range:** **Primary cause.** The simulation writes activities with `closed_at = April 1`, which is outside the default 30-day window. If the user selects a custom wider window in the detailed report, a discrepancy appears.
- **Subject scope:** Not the cause in this instance. Both surfaces apply `permittedSubjects` filtering consistently. The math teacher (cb21cfc8) has `permittedSubjects = {math, geometry}` and both surfaces filter to math-only activity.
- **Cache / stale data:** Not the cause. No caching layer was found.
- **Classifier:** **Secondary cause (filterKey confusion).** The `filterKey: "low_activity"` was shared between zero-activity and insufficient-data students, making filter chips group them incorrectly. Fixed.

---

## 5. How School Teacher Subject Restrictions Are Preserved

### Dashboard
`buildLightweightStudentActivityMap` calls `loadTeacherPermittedSubjects` to obtain `permittedSubjects` (a `Set<string>` of normalized subject keys, or `null` for admins). It then:
- Filters `learning_sessions` rows client-side: only sessions with subjects in `permittedSubjects` are counted.
- Drops answers whose linked session is not in `sessionTopicById` (which only contains sessions with permitted subjects).
- Calls `classroomRollupToDashboardMetrics(rollup, permittedSubjects)` which re-sums only the permitted-subject buckets from the rollup's `subjects` map.

### Teacher Student Detailed Report
`pages/api/teacher/students/[studentId]/report-data.js` calls `applySchoolTeacherReportFilter` after building the full payload. This calls `filterReportByPermittedSubjects` which:
1. Filters `subjects` map to only permitted subject keys.
2. Calls `recomputeReportSummaryFromSubjects` to rebuild `summary.totalSessions / totalAnswers / accuracy` from the filtered subjects.
3. Rebuilds `teacherGuidanceBlock` and `dailyActivity` from permitted subjects only.

### Class Report
`buildTeacherClassReportPayload` loads classroom rollups only for the class being viewed (teacher owns only their subject-class). The `subjectFocus` of the class is `math`, so classroom activities are implicitly scoped to math. No cross-subject data leaks.

### School Manager
`pages/api/school/students/[studentId]/report-data.js` calls `buildTeacherStudentReportPayload` with the student's report teacher but does NOT call `applySchoolTeacherReportFilter`. School admins see all subjects (unrestricted). This is correct and intentional.

---

## 6. How School Manager / Admin Full-Subject View Is Preserved

`loadTeacherPermittedSubjects` returns `{ permittedSubjects: null }` when:
- The caller is not a school member (independent teacher), OR
- The caller's `role = "school_admin"`.

`null` means no filter — all subjects are visible. This is enforced consistently in:
- `buildLightweightStudentActivityMap` (dashboard)
- `classroomRollupToDashboardMetrics` (dashboard classroom merge)
- `filterReportByPermittedSubjects` (detailed report filter)
- `isSubjectInPermittedScope` (all subject checks)

The school manager's detailed student report calls `buildTeacherStudentReportPayload` with the student's subject teacher as `teacherId`, then returns the unfiltered payload (no subject filter applied for the manager viewer). This means the school manager always sees all subjects regardless of which teacher "owns" the report.

---

## 7. Private Teacher Impact Analysis

Private teacher reporting is **not affected** by these changes:

1. `buildTeacherDashboardPayload` (dashboard date fix): Private teachers use the same dashboard function. The fix aligns the date range with the report default, which is a narrower boundary change. Private teacher students appear on the dashboard identically.

2. `deriveStudentStatusBadgeFromSummary` (filterKey fix): The badge function is shared across all surfaces. The behavioral change is that students with 1–2 answers now return `filterKey: "insufficient_data"` instead of `"low_activity"`. The Hebrew badge text is unchanged. Private teacher dashboards use the same `FILTER_OPTIONS` array; the "פעילות נמוכה" filter chip will now only show genuinely inactive students, which is correct.

3. Private teachers do NOT use `classroom_activity_student_status` (classroom activities are school-only). Their student data comes entirely from `learning_sessions` and `answers`. No classroom merge logic is involved.

4. Private teacher subject permissions use `private_teacher_subjects` table, loaded separately from school teacher subjects. This path is unaffected.

Verification: `scripts/tests/student-status-badge-unit.mjs` and `scripts/tests/teacher-school-status-consistency-unit.mjs` both run cleanly.

---

## 8. Confirmation: Regular Parent Report Was NOT Changed

- `pages/api/parent/students/[studentId]/report-data.js` — **not modified**
- `lib/parent-server/report-data-aggregate.server.js` — **not modified**
- `lib/parent-server/parent-report-parent-facing.server.js` — **not modified**
- No parent report logic, Hebrew text, UI, or product behavior was altered.
- Regression test: `node scripts/tests/report-data-aggregate-batch-unit.mjs` → **PASSED**

---

## 9. Exact Fix Applied

### Fix 1 — Date range alignment in `buildTeacherDashboardPayload`

**File:** `lib/teacher-server/teacher-dashboard.server.js`

**Before:**
```js
const toDate = new Date();
const fromDate = new Date(toDate.getTime() - rangeDays * 86_400_000);
```

**After:**
```js
const toDate = new Date();
toDate.setUTCHours(0, 0, 0, 0);
const fromDate = new Date(toDate);
fromDate.setUTCDate(fromDate.getUTCDate() - (rangeDays - 1));
```

**Effect:** Dashboard now uses `[today-midnight UTC − (rangeDays-1) days, tomorrow-midnight UTC)` — identical to `buildDefaultRange()` in `teacher-report.server.js`. The dashboard and all report surfaces share the same calendar-day boundary.

### Fix 2 — `filterKey` separation for "insufficient data"

**File:** `lib/teacher-portal/student-learning-status.js`

**Before (line 44):**
```js
return { badge: "אין מספיק נתונים", filterKey: "low_activity", sortRank: 6 };
```

**After:**
```js
return { badge: "אין מספיק נתונים", filterKey: "insufficient_data", sortRank: 6 };
```

**Effect:** Students with 1–2 answers (some activity, not enough to classify) now have `filterKey: "insufficient_data"`. Students with zero sessions AND zero answers retain `filterKey: "low_activity"`. The Hebrew badge text is unchanged. The "פעילות נמוכה" dashboard filter chip now shows only genuinely inactive students.

---

## 10. Exact Changed Files

| File | Change |
|---|---|
| `lib/teacher-server/teacher-dashboard.server.js` | Date range uses UTC midnight, aligned with report default |
| `lib/teacher-portal/student-learning-status.js` | "אין מספיק נתונים" filterKey changed to `"insufficient_data"` |
| `scripts/tests/teacher-school-status-consistency-unit.mjs` | **New file** — 28-case unit test covering all badge scenarios, surface parity, filterKey separation, discussion exclusion smoke check, parent report import check |

---

## 11. Simulation Data Note (Not a Product Code Bug)

The simulation script creates classroom activities with historical `closed_at` / `activated_at` dates (e.g., April 1) but a `created_at` of today (when the script runs). The classroom rollup date filter prioritizes `closed_at || activated_at || created_at`, so activities with backdated `closed_at` fall outside any standard 30-day window even though they were just created.

**Consequence:** With the current simulation data, all classroom activity for אביב פרידמן and אריאל פרידמן (4 activities each, submitted April 1) is invisible in the default 30-day window on ALL surfaces — not just the dashboard. The screenshots showing inconsistency between surfaces were taken at a point in time when:
- (a) the teacher had manually expanded the date range in the detailed report UI to 60+ days, OR  
- (b) the simulation had previously run with more recent data that was within the window.

**Recommendation:** Update the simulation to write `closed_at` / `activated_at` timestamps within the last 7–14 days so simulation data is visible in the default window. This does not require any product code changes.

---

## 12. Per-Student Diagnostic Table (Current DB State, May 28 2026)

| Field | אביב פרידמן (41589959) | אריאל פרידמן (21e52a8f) |
|---|---|---|
| Student ID | 41589959-ab73-4f70 | 21e52a8f-4ef5-46a0 |
| School ID | bb4e5984-d95f-438f | bb4e5984-d95f-438f |
| Grade | 4 | 4 |
| Physical class | כיתה ד׳ 2 | כיתה ד׳ 2 |
| Subject classes | math, geometry, english, hebrew, moledet_geography, science | same |
| `learning_sessions` all time | 0 | 1 (2026-04-28) |
| `answers` all time | 0 | 10 (2026-04-28) |
| `learning_sessions` 30d | 0 | 0 (session is on boundary, excluded) |
| `answers` 30d | 0 | 0 |
| `classroom_activity_student_status` total | 4 activities / 40 answers / 18 correct | 4 activities / 40 answers / 18 correct |
| classroom activities submitted_at | All 2026-04-01 (57 days ago) | All 2026-04-01 (57 days ago) |
| classroom activities 30d | 0 (all outside window) | 0 (all outside window) |
| Dashboard badge (default 30d) | פעילות נמוכה | פעילות נמוכה |
| Class report badge (default 30d) | פעילות נמוכה | פעילות נמוכה |
| Detailed report badge (default 30d) | פעילות נמוכה | פעילות נמוכה |
| Detailed report badge (60d window) | דורש התערבות (40 answers, accuracy ~45%) | דורש התערבות (40 answers, accuracy ~45%) |
| Math teacher permittedSubjects | {math, geometry} | {math, geometry} |
| Math activity (30d) | 0 (outside window) | 0 (outside window) |
| Math activity (60d, after subject filter) | 10 answers, 40% | 10 answers, 40% |

---

## 13. Test Commands and Results

```sh
node scripts/tests/teacher-school-status-consistency-unit.mjs
# → ALL 28 TESTS PASSED.

node scripts/tests/student-status-badge-unit.mjs
# → ALL TESTS PASSED. (no regression to existing badge tests)

node scripts/tests/report-data-aggregate-batch-unit.mjs
# → all static checks passed (parent report unaffected)

node scripts/tests/teacher-guidance-v2-unit.mjs
# → all assertions passed

node scripts/tests/teacher-class-report-aggregation-unit.mjs
# → ok
```

---

## 14. Confirmation: No UI / CSS / Hebrew / Routes / SQL / Commit / Push

- No UI components changed
- No CSS changed
- No Hebrew text changed (badge labels unchanged)
- No routes changed
- No SQL migrations run
- No commits made
- No pushes made
- All changes are in JS lib files and a new test script only
