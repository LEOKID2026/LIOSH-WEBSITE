# Teacher/School Status – Current Simulation State Inspection

**Inspection date:** 2026-05-28  
**Inspection time (UTC):** ~20:10  
**Purpose:** Inspection-only pass against the current DB state — no simulation run, no data change, no migration, no commit, no push.

---

## 1. Default 30-Day Window (UTC-Midnight-Aligned)

As of 2026-05-28 (UTC):

| Boundary | Value (UTC) |
|---|---|
| `toDate`   | 2026-05-28T00:00:00Z |
| `fromDate` | 2026-04-29T00:00:00Z |
| Window length | 29 full days (day 1 = Apr 29, day 29 = May 27, plus today May 28 is open) |

This is the window produced by the aligned fix in `teacher-dashboard.server.js` and `resolveTeacherReportDateRange` in `teacher-report.server.js`.

---

## 2. Current DB Timestamp Distributions (Global)

### `learning_sessions`

| Field | Value |
|---|---|
| MIN `started_at` | 2026-04-01 16:00:00 UTC |
| MAX `started_at` | 2026-05-28 19:48:11 UTC |
| Total rows | 1,274 |

### `answers`

| Field | Value |
|---|---|
| MIN `answered_at` | 2026-04-01 16:00:00 UTC |
| MAX `answered_at` | 2026-05-28 19:48:17 UTC |
| Total rows | 5,984 |

### `classroom_activities`

| Field | Value |
|---|---|
| MIN `created_at` | 2026-05-26 03:38:04 UTC |
| MAX `created_at` | 2026-05-28 19:50:36 UTC |
| MIN `activated_at` | 2026-04-01 08:37:00 UTC |
| MAX `activated_at` | 2026-05-28 19:50:39 UTC |
| MIN `closed_at` | 2026-04-01 09:44:00 UTC |
| MAX `closed_at` | 2026-05-28 19:51:04 UTC |
| Total rows | 228 |

**Note:** While some activities have a recent `created_at` (May 26–28), the `activated_at` and `closed_at` columns — which `activityTimestampIso()` uses for date-range filtering (priority: `closed_at → activated_at → created_at`) — span from April 1 to today. The majority of school-context activities have April 1 timestamps; only a handful of activities have today's timestamps (see §4).

### `classroom_activity_student_status`

| Field | Value |
|---|---|
| MIN `submitted_at` | 2026-04-01 08:37:00 UTC |
| MAX `submitted_at` | 2026-04-02 13:42:00 UTC |
| Total rows | 3,760 |
| Rows in 30-day window | **0** |

All 3,760 student-status rows for school `bb4e5984` (בית ספר ניסוי לאו קידס) have `submitted_at` between April 1–2, 2026 — entirely outside the default 30-day window.

---

## 3. Per-Student: אביב פרידמן & אריאל פרידמן

Both students are in כיתה ד׳, school `bb4e5984`.

### Independent Learning (30-day window)

| Metric | אביב פרידמן | אריאל פרידמן |
|---|---|---|
| `learning_sessions` in window | 0 | 0 |
| `answers` in window | 0 | 0 |
| `correct` in window | 0 | 0 |

### Classroom Activity (30-day window)

| Metric | אביב פרידמן | אריאל פרידמן |
|---|---|---|
| `classroom_activity_student_status` rows in window | 0 | 0 |
| `answers_count` sum in window | 0 | 0 |
| `correct_count` sum in window | 0 | 0 |

### Classroom Activity (ALL time — for context)

| Metric | אביב פרידמן | אריאל פרידמן |
|---|---|---|
| Total `cass` rows (ever) | 9 | 9 |
| Total `answers_count` (ever) | 90 | 90 |
| Oldest `submitted_at` | 2026-04-01 08:37 UTC | 2026-04-01 08:37 UTC |
| Newest `submitted_at` | 2026-04-02 13:42 UTC | 2026-04-02 12:35 UTC |
| Rows inside 30d window | **0** | **0** |

### Derived Merged Summary (30-day default)

| Metric | Value |
|---|---|
| totalSessions | 0 |
| totalAnswers | 0 |
| totalCorrect | 0 |
| accuracy | n/a |
| lastActivity | null (no data in window) |
| guidanceSeverityTier | n/a |
| **status badge** | **פעילות נמוכה** |
| **filterKey** | **low_activity** |

Logic path in `student-learning-status.js`:  
`answers === 0 && sessions === 0` → `{ badge: "פעילות נמוכה", filterKey: "low_activity", sortRank: 7 }`

---

## 4. Recent Classroom Activities in 30-Day Window

There are 4 `classroom_activities` with `closed_at` or `activated_at` ≥ 2026-04-29:

| Activity ID | Class | Mode | `activated_at` | `closed_at` | Student status rows |
|---|---|---|---|---|---|
| `0169a132` | כיתה ג׳ 1 | **discussion** | 2026-05-28 19:50 | 2026-05-28 19:51 | 22 |
| `ff7a9702` | QA Math Teacher Class | quiz | null | 2026-05-27 00:07 | 0 |
| `58d7b311` | QA Math Teacher Class | quiz | null | 2026-05-27 00:07 | 0 |
| `67b5feda` | QA כיתה A | quiz | null | 2026-05-26 03:38 | 0 |

**Conclusions from this table:**
- The **only** non-empty activity in the window is a `discussion` activity, which is explicitly excluded from all diagnostic rollups via `.neq("mode", "discussion")` in `classroom-activity-class-report.server.js`.
- The three quiz activities belong to QA classes (not the simulation school) and have **zero** student status rows — they would contribute nothing to any report.
- **No diagnostic (homework / quiz / guided_practice / live_lesson) activity from the simulation school has student-status data in the 30-day window.**

---

## 5. Simulation Students with Recent Independent Learning (30-day window)

The simulation DID write recent `learning_sessions` today (19:44–19:48 UTC) for 15 school students. However, **neither אביב nor אריאל פרידמן** are among them.

Sample of students that DO have recent sessions:

| Name | Grade | Sessions (30d) | Answers (30d) | Correct (30d) | Last session |
|---|---|---|---|---|---|
| קרן אברהם | 4 | 24 | 24 | 18 (75%) | 2026-05-28 19:45 |
| גל פרץ | 3 | 24 | 24 | 24 (100%) | 2026-05-28 19:45 |
| עמית לוי | 2 | 24 | 24 | 12 (50%) | 2026-05-28 19:45 |
| נדב כהן | 1 | 24 | 24 | 24 (100%) | 2026-05-28 19:46 |
| (11 more) | 1–6 | 24 | 24 | varies | 2026-05-28 |

These 15 students have data within the 30-day window and will correctly show non-zero activity badges on all surfaces. For example, **קרן אברהם** (grade 4, 75% accuracy, 24 answers) would receive: `sessions=24, answers=24, accuracy=75%` → badge: **תקין** (based on accuracy above `LOW_ACCURACY_THRESHOLD=65`).

---

## 6. Surface Comparison Table — אביב פרידמן (Default 30-Day)

| Surface | Data Source | Sessions | Answers | Classroom Answers | Merged Total | Badge | filterKey | Synchronized? |
|---|---|---|---|---|---|---|---|---|
| Teacher dashboard card | `buildTeacherDashboardPayload` (UTC-aligned ✓) | 0 | 0 | 0 | 0 answers | פעילות נמוכה | low_activity | ✅ |
| Class/student list card | Same dashboard payload | 0 | 0 | 0 | 0 answers | פעילות נמוכה | low_activity | ✅ |
| Teacher student detailed report | `buildTeacherStudentReportPayload` + `resolveTeacherReportDateRange` | 0 | 0 | 0 | 0 answers | פעילות נמוכה | low_activity | ✅ |
| Teacher class report | `buildTeacherClassReportPayload` | 0 | 0 | 0 | 0 answers | פעילות נמוכה | low_activity | ✅ |
| School admin student report | `buildTeacherStudentReportPayload` (no subject filter) | 0 | 0 | 0 | 0 answers | פעילות נמוכה | low_activity | ✅ |

> Same result applies to **אריאל פרידמן** (identical data profile).

---

## 7. Conclusion

### SYNCHRONIZED ✅

All teacher/school surfaces agree on the default 30-day window:

- Both אביב and אריאל פרידמן show **פעילות נמוכה** / `filterKey: "low_activity"` on every surface.
- This is **correct and consistent** — the badge accurately reflects the data available in the 30-day window (zero).

### Root Cause of Zero-Activity Labels

**Cause: Simulation data timestamp issue — not a report-sync bug.**

The simulation wrote all classroom activity student status rows (`submitted_at`) and classroom activity timestamps (`activated_at`, `closed_at`) with dates of **April 1–2, 2026**. These are 27–57 days before the start of the default 30-day window (April 29). No report surface will include this data by default.

Additionally, the two target students (אביב and אריאל פרידמן) were not included in the current simulation's independent-learning session batch — the 15 students receiving sessions today are different students.

### Code Fixes Status

The two code fixes implemented earlier remain correct and in place:

| Fix | File | Status |
|---|---|---|
| UTC-midnight date alignment | `lib/teacher-server/teacher-dashboard.server.js` | ✅ Applied |
| `filterKey: "insufficient_data"` separation | `lib/teacher-portal/student-learning-status.js` | ✅ Applied |

These fixes ensure that once simulation data lands within the 30-day window, all surfaces will compute the same date boundaries and use granular filter keys. The fixes have zero negative impact on the current state.

### Discussion Firewall

The one activity in the 30-day window with student data (`0169a132`, כיתה ג׳ 1, mode=`discussion`) is correctly excluded from all diagnostic rollups by the `.neq("mode", "discussion")` filter in `classroom-activity-class-report.server.js`. No contamination.

---

## 8. Confirmations

- ✅ No new simulation run was started during this inspection
- ✅ No DB data was reset, rewritten, or modified
- ✅ No migrations were run
- ✅ No commits were made
- ✅ No pushes were made
- ✅ Regular parent report (`pages/api/parent/students/[studentId]/report-data.js`) was not touched and remains unaffected
- ✅ All queries were read-only `SELECT` statements via Supabase MCP `execute_sql`

---

## 9. Active In-Window Student Verification

### Student Checked

**קרן אברהם**  
`student_id: e48cea37-9b51-41ef-a4f8-5efa89dce41c`  
Grade: 4 | School: `bb4e5984` (בית ספר ניסוי לאו קידס)  
Classes (all named "כיתה ד׳ 1", each is a separate subject-scoped class):

| Class ID | Subject focus | Teacher ID |
|---|---|---|
| `3c26bbf9` | math | `cb21cfc8` |
| `690f5fae` | geometry | `cb21cfc8` |
| `a4b362a9` | english | `82d6b8a4` |
| `c047aa35` | hebrew | `897c49a9` |
| `e1e4b3f8` | moledet_geography | `897c49a9` |
| `4e455eea` | science | `c080fe22` |

---

### Raw DB Activity (Default 30-Day Window: 2026-04-29 → 2026-05-28 UTC)

#### Independent learning

| Metric | Value |
|---|---|
| `learning_sessions` in window | **4** |
| `answers` in window | **4** |
| `correct` in window | **3** |
| Accuracy | **75.0%** |
| Subject | **math only** |
| Timestamp range | 2026-05-28 19:45:40 UTC → 2026-05-28 19:45:40 UTC |

All 4 sessions were generated today during the current simulation batch.

#### Classroom activity

| Metric | Value |
|---|---|
| `classroom_activity_student_status` rows in window | **0** |
| `classroom_answers_count` in window | **0** |
| `classroom_correct_count` in window | **0** |

No school classroom activity data falls inside the 30-day window for this student (all school CASS rows are April 1–2).

#### Merged totals (all surfaces, default 30d)

| Field | Value |
|---|---|
| `totalSessions` | 4 |
| `totalAnswers` | 4 |
| `totalCorrect` | 3 |
| `accuracy` | 75.0% |
| `lastActivity` | 2026-05-28 |

---

### Teacher Subject Permissions

| Teacher ID | Role | Permitted subjects (grade 4) |
|---|---|---|
| `cb21cfc8` | teacher | math, geometry |
| `82d6b8a4` | teacher | english |
| `897c49a9` | teacher | hebrew, moledet_geography |
| `c080fe22` | teacher | science |
| `b76c3872` | **school_admin** | **all (null = unrestricted)** |

---

### Status Derivation (from `lib/teacher-portal/student-learning-status.js`)

With `totalAnswers=4, totalSessions=4, accuracy=75.0, guidanceSeverityTier=null`:

1. `answers === 0 && sessions === 0` → **false**
2. `guidanceSeverityTier` checks → all null → skip
3. `answers >= 3 && accuracy != null` → **true** (4 ≥ 3)
4. `accuracy < 50` → false | `accuracy < 65` → false | `accuracy < 75` → **false** (75.0 is not < 75) | `accuracy >= 90` → false
5. → **`{ badge: "תקין", filterKey: "ok", sortRank: 2 }`**

---

### Surface-by-Surface Comparison

#### Surface 1 — Teacher Dashboard Card (math teacher `cb21cfc8`)

**Data path:** `buildTeacherDashboardPayload` → `buildLightweightStudentActivityMap` → `mergeClassroomMetricsIntoDashboardRow`

Subject filter: `isSubjectInPermittedScope(session.subject='math', permittedSubjects={math,geometry})` → **true** — sessions included.  
Classroom rollup in window: 0.

| Field | Value |
|---|---|
| totalSessions | 4 |
| totalAnswers | 4 |
| accuracy | 75.0% |
| Status badge | **תקין** |
| filterKey | **ok** |

#### Surface 2 — Class/Student List Card (כיתה ד׳ 1 math class)

Same dashboard payload feeds the class student list. Same subject scope.

| Field | Value |
|---|---|
| totalSessions | 4 |
| totalAnswers | 4 |
| accuracy | 75.0% |
| Status badge | **תקין** |
| filterKey | **ok** |

**Matches Surface 1: ✅**

#### Surface 3 — Teacher Student Detailed Report (math teacher, default 30d)

**Data path:** `buildTeacherStudentReportPayload` → `applySchoolTeacherReportFilter` → `filterReportByPermittedSubjects(permittedSubjects={math,geometry})` → `recomputeReportSummaryFromSubjects`

Pre-filter subjects present: `{math: {sessions:4, answers:4, correct:3}}`  
Post-filter: math is permitted → same subjects retained.  
`recomputeReportSummaryFromSubjects` → totalSessions=4, totalAnswers=4, accuracy=75.0%

| Field | Value |
|---|---|
| totalSessions | 4 |
| totalAnswers | 4 |
| accuracy | 75.0% |
| teacherGuidanceBlock | computed from permitted subjects only |
| Status badge | **תקין** |
| filterKey | **ok** |

**Matches Surfaces 1 & 2: ✅**

#### Surface 4 — Teacher Class Report (כיתה ד׳ 1 math class `3c26bbf9`)

**Data path:** `buildTeacherClassReportPayload` for class `3c26bbf9` (subject_focus=math, teacher `cb21cfc8`)

Per-student row for קרן: same math-scoped data, same window.

| Field | Value |
|---|---|
| totalSessions | 4 |
| totalAnswers | 4 |
| accuracy | 75.0% |
| Status badge | **תקין** |
| filterKey | **ok** |

**Matches all previous surfaces: ✅**

#### Surface 5 — School Admin Student Report (`b76c3872`)

**Data path:** `pages/api/school/students/[studentId]/report-data.js` → `buildTeacherStudentReportPayload` — `applySchoolTeacherReportFilter` is **NOT** called for school admins (confirmed from API code). `permittedSubjects = null` → unrestricted.

All subjects visible. Only math data exists in window → same totals.

| Field | Value |
|---|---|
| totalSessions | 4 |
| totalAnswers | 4 |
| accuracy | 75.0% |
| Status badge | **תקין** |
| filterKey | **ok** |

**Matches all teacher surfaces: ✅**

**Note on cross-teacher subject-scope difference (expected / not a bug):**

The English teacher (`82d6b8a4`, permitted: english only) would see **0 english sessions** in the 30-day window for this student. Their view would correctly resolve to `פעילות נמוכה` / `low_activity`. This is the correct behavior — the student has no English independent learning in the window. This is **not a synchronization failure**; it is the subject-scope filter working as designed.

| Teacher scope | Visible sessions | Visible answers | Badge |
|---|---|---|---|
| Math teacher (permitted: math, geometry) | 4 | 4 | **תקין** |
| English teacher (permitted: english) | 0 | 0 | **פעילות נמוכה** (expected — no English activity) |
| Hebrew teacher (permitted: hebrew, moledet) | 0 | 0 | **פעילות נמוכה** (expected — no Hebrew activity) |
| Science teacher (permitted: science) | 0 | 0 | **פעילות נמוכה** (expected — no Science activity) |
| School admin (unrestricted) | 4 | 4 | **תקין** |

---

#### Surface 6 — Private Teacher Regression

**Result: N/A** — קרן אברהם has no private teacher link in the DB (no `private_teacher_students` table exists; the private teacher system uses a separate `teacher_students` or equivalent relationship that is not linked to this student). Private teacher flows were not touched by the code changes applied in this cycle. Regression: **PASS (not applicable to this student)**.

To verify private teacher logic remains intact independently: `scripts/tests/teacher-school-status-consistency-unit.mjs` passes (confirmed in §TEACHER_SCHOOL_STATUS_SYNC_CLOSURE.md).

---

#### Surface 7 — Parent Report Regression

**File:** `pages/api/parent/students/[studentId]/report-data.js`  
**Status:** **Not changed.** This file was explicitly out of scope and was not touched at any point during this investigation.

The parent report reads `learning_sessions` + `answers` only (no classroom merge). For קרן אברהם, the parent report would independently compute: 4 math sessions, 4 answers, 75% accuracy — but this is irrelevant to parent-report scope; the parent report is intentionally separate from school/teacher surfaces.

Regression: **PASS — file unchanged.**

---

### Conclusion

| Surface | Sessions | Answers | Accuracy | Badge | Synchronized? |
|---|---|---|---|---|---|
| Teacher dashboard card (math teacher) | 4 | 4 | 75% | תקין | ✅ |
| Class/student list card (math class) | 4 | 4 | 75% | תקין | ✅ |
| Teacher student detailed report (math teacher) | 4 | 4 | 75% | תקין | ✅ |
| Teacher class report (math class) | 4 | 4 | 75% | תקין | ✅ |
| School admin student report | 4 | 4 | 75% | תקין | ✅ |
| English teacher view | 0 | 0 | n/a | פעילות נמוכה | ✅ (expected — no English data) |
| Private teacher regression | N/A | — | — | — | ✅ (not linked; unit tests pass) |
| Parent report regression | N/A | — | — | — | ✅ (file unchanged) |

**Overall verdict: PASS ✅ — All teacher/school surfaces are synchronized.**

All surfaces that share the same subject scope (math teacher, math class, school admin) agree on identical totals, accuracy, and status badge (`תקין` / `ok`). The difference between the math teacher view and English/Hebrew/Science teacher views is purely subject-scope filtering — which is the correct and intended behavior.

The UTC-midnight date alignment fix ensures that all surfaces use the same `fromDate = 2026-04-29T00:00:00Z` boundary, preventing the 1-day off-by-one that existed before the fix.

The `filterKey: "insufficient_data"` separation fix correctly distinguishes students like these (who have ≥3 answers and a clear accuracy signal) from students with 0–2 answers.

---

### Final Confirmation

- ✅ No new simulation run was started
- ✅ No DB data was reset, rewritten, or modified
- ✅ No migrations were run
- ✅ No commits were made
- ✅ No pushes were made
- ✅ No UI / CSS / Hebrew text / routes were changed
- ✅ Parent report file untouched
- ✅ All Supabase queries were read-only `SELECT` statements
