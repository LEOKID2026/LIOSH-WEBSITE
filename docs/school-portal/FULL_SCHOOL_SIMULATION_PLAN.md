# LEO KIDS — Full School Simulation Plan

**Status:** Planning only — no implementation, no SQL, no commits.  
**Approval required** before any script is written or executed.  
**After approval:** implementation runs continuously to completion, tests run at the end, one delivery report.

---

## 1. Goals and Scope

This plan creates a complete demo/QA managed school inside LEO KIDS that can be used for:

- Product QA and regression testing
- School manager dashboard demos and marketing
- Teacher, class, student, and report testing
- Operational management testing (move students, reassign teachers, change permissions)
- Nightly learning simulation with realistic progress over time

### Non-goals

- No changes to the learning engine, parent portal, or private teacher flows
- No schema changes required (027 is sufficient for all Phase 1 operations)
- No real student or parent data involved

---

## 2. Schema Assessment

All required tables are present after migrations 025–027. **No schema changes are needed for Phase 1.**

| Table | Migration | Role in demo |
|---|---|---|
| `school_accounts` | 025 | Demo school row |
| `school_teacher_memberships` | 025 | 12 rows (11 teachers + 1 manager) |
| `school_teacher_subjects` | 027 | Subject grants per teacher |
| `school_student_enrollments` | 027 | Explicit enrollment for all 398 students |
| `teacher_profiles` | 019 | 12 teacher profiles (incl. manager) |
| `teacher_limits` | 019 | 12 limit rows (plan_code, feature flags) |
| `teacher_classes` | 019 | 108 class records (18 physical × 6 separate subjects) |
| `teacher_class_students` | 019 | ~2,388 rows (398 students × 6 subject-class records each) |
| `classroom_activities` | 024 | Seeded per subject per class per day |
| `classroom_activity_student_status` | 024 | Per-student status rows |
| `classroom_activity_attempts` | 024 | Per-question attempt rows |
| `student_activities` | 026 | Individual activities for weak students |
| `teacher_access_audit` | 021 | Audit trail for subject grants and school actions |
| `parent_profiles` | 001 | 1 demo parent (scaffolding only) |
| `students` | 001 | 398 demo students |

**Phase 0 owner SQL gate (documented in Section 9.3):** Before any scripts run, the owner applies one manual SQL statement in the Supabase SQL editor to extend the `teacher_access_audit` action CHECK constraint with three new school-operation values. This is the only SQL that requires owner action and it must be applied first.

---

## 3. School Account

| Field | Value |
|---|---|
| Name | בית ספר ניסוי לאו קידס |
| Contact email | school@leo-k.com |
| City | תל אביב |
| Country code | IL |
| Max teachers | 15 |
| is_active | true |
| Demo marker | city = 'תל אביב — QA' (used for safe scoping in cleanup) |

---

## 4. Teacher Roster (11 teachers)

All teacher auth users: `app_metadata.role = 'teacher'`.  
All passwords: runtime env `DEMO_TEACHER_PASSWORD` only — never committed.

| # | Display Name | Email | Grade Coverage | Subjects | `school_teacher_memberships.role` |
|---|---|---|---|---|---|
| 1 | דן כהן | dan@leo-k.com | 1–2 | math, geometry | teacher |
| 2 | ורד לוי | vered@leo-k.com | 3–4 | math, geometry | teacher |
| 3 | נועם מזרחי | noam@leo-k.com | 5–6 | math, geometry | teacher |
| 4 | שרה פרץ | sara@leo-k.com | 1–2 | english | teacher |
| 5 | מיכל ביטון | michal@leo-k.com | 3–4 | english | teacher |
| 6 | אלון אברהם | alon@leo-k.com | 5–6 | english | teacher |
| 7 | רחל פרידמן | rachel@leo-k.com | 1–2 | hebrew, moledet_geography | teacher |
| 8 | יעל שפירא | yael@leo-k.com | 3–4 | hebrew, moledet_geography | teacher |
| 9 | דוד דוד | david@leo-k.com | 5–6 | hebrew, moledet_geography | teacher |
| 10 | לירון אזולאי | liron@leo-k.com | 1–3 | science | teacher |
| 11 | תמר יוסף | tamar@leo-k.com | 4–6 | science | teacher |

**School manager (not a teaching teacher):**

| Display Name | Email | `school_teacher_memberships.role` |
|---|---|---|
| מנהל/ת בית הספר | school@leo-k.com | school_admin |

The school manager has a `teacher_profiles` row (required by membership FK) but owns no classes, is not linked to students, and does not appear in the `teacherCount` stat (which counts `role = 'teacher'` only).

---

## 5. Subject Assignment Matrix

Each physical class has **6 separate subject-class records**, one per subject. Where one teacher teaches two subjects (math+geometry, or hebrew+moledet_geography), they own separate `teacher_classes` rows with separate `subject_focus` values — not a grouped record.

| Physical Class Block | math | geometry | english | hebrew | moledet_geography | science |
|---|---|---|---|---|---|---|
| Grades 1–2 (6 classes) | דן | דן | שרה | רחל | רחל | לירון |
| Grade 3 (3 classes) | ורד | ורד | מיכל | יעל | יעל | לירון |
| Grade 4 (3 classes) | ורד | ורד | מיכל | יעל | יעל | תמר |
| Grades 5–6 (6 classes) | נועם | נועם | אלון | דוד | דוד | תמר |

**Per-class example — כיתה ג׳ 2 (Grade 3, Section 2) — 6 separate class records:**

| Subject | Teacher | `teacher_classes` row | `subject_focus` |
|---|---|---|---|
| math | ורד (Vered) | כיתה ג׳ 2 | math |
| geometry | ורד (Vered) | כיתה ג׳ 2 | geometry |
| english | מיכל (Michal) | כיתה ג׳ 2 | english |
| hebrew | יעל (Yael) | כיתה ג׳ 2 | hebrew |
| moledet_geography | יעל (Yael) | כיתה ג׳ 2 | moledet_geography |
| science | לירון (Liron) | כיתה ג׳ 2 | science |

All six class records share `name = "כיתה ג׳ 2"` and `grade_level = "3"`. They differ by `subject_focus` (and `teacher_id` where different teachers teach different subjects). All are tagged `school_id = DEMO_SCHOOL_ID`. All contain the same ~22 students via `teacher_class_students`.

---

## 6. Class Structure — 18 Physical × 6 Subjects = 108 Class Records

### Rationale

`teacher_classes.teacher_id` supports one owner per class record. Every subject is represented by its own class record — **math and geometry are never grouped**, and **hebrew and moledet_geography are never grouped**. A teacher who teaches two subjects (e.g., Vered teaches both math and geometry for grades 3–4) owns separate `teacher_classes` rows with separate `subject_focus` values, separate timetable lessons, separate classroom activities, and separate report streams.

This means:

- 6 separate subject-class records per physical class
- Each record has its own `subject_focus`, its own activity history, its own reports
- School manager sees all 108 records and can open a report per subject per class
- A teacher who teaches two subjects sees both sets of class records but as distinct entries

### Class Naming Convention

```
name: "כיתה א׳ 1"   subject_focus: "math"              grade_level: "1"   teacher: Dan
name: "כיתה א׳ 1"   subject_focus: "geometry"           grade_level: "1"   teacher: Dan
name: "כיתה א׳ 1"   subject_focus: "english"            grade_level: "1"   teacher: Sara
name: "כיתה א׳ 1"   subject_focus: "hebrew"             grade_level: "1"   teacher: Rachel
name: "כיתה א׳ 1"   subject_focus: "moledet_geography"  grade_level: "1"   teacher: Rachel
name: "כיתה א׳ 1"   subject_focus: "science"            grade_level: "1"   teacher: Liron
```

School manager class list displays `name + SUBJECT_LABEL_HE[subject_focus]`, e.g. "כיתה א׳ 1 — גיאומטריה" and "כיתה א׳ 1 — גאוגרפיה" as distinct entries.

### Class Record Summary per Teacher

| Teacher | Classes Owned | Grade Level | Subject Focus |
|---|---|---|---|
| דן | 6 | 1, 2 | math |
| דן | 6 | 1, 2 | geometry |
| ורד | 6 | 3, 4 | math |
| ורד | 6 | 3, 4 | geometry |
| נועם | 6 | 5, 6 | math |
| נועם | 6 | 5, 6 | geometry |
| שרה | 6 | 1, 2 | english |
| מיכל | 6 | 3, 4 | english |
| אלון | 6 | 5, 6 | english |
| רחל | 6 | 1, 2 | hebrew |
| רחל | 6 | 1, 2 | moledet_geography |
| יעל | 6 | 3, 4 | hebrew |
| יעל | 6 | 3, 4 | moledet_geography |
| דוד | 6 | 5, 6 | hebrew |
| דוד | 6 | 5, 6 | moledet_geography |
| לירון | 9 | 1, 2, 3 | science |
| תמר | 9 | 4, 5, 6 | science |
| **Total** | **108** | | |

**Per-teacher totals:**

| Teacher | Total class records |
|---|---|
| דן | 12 (6 math + 6 geometry) |
| ורד | 12 (6 math + 6 geometry) |
| נועם | 12 (6 math + 6 geometry) |
| שרה | 6 (english) |
| מיכל | 6 (english) |
| אלון | 6 (english) |
| רחל | 12 (6 hebrew + 6 moledet_geography) |
| יעל | 12 (6 hebrew + 6 moledet_geography) |
| דוד | 12 (6 hebrew + 6 moledet_geography) |
| לירון | 9 (science) |
| תמר | 9 (science) |

### Dashboard Impact

School manager `buildSchoolDashboardStats` will return:

- `teacherCount`: 11
- `staffCount`: 12
- `activeClassCount`: 108
- `studentCount`: 398 (union of 6 class rosters per physical class = same 22 students)
- `enrolledStudentCount`: 398 (all enrolled in `school_student_enrollments`)

---

## 7. Student Distribution

### Per-Class Student Count

Each physical class has a slightly varied count for realism. The SAME students appear in all **6** subject-class records for their physical class.

| Grade | Section 1 | Section 2 | Section 3 | Grade Total |
|---|---|---|---|---|
| א׳ (1) | 24 | 22 | 20 | 66 |
| ב׳ (2) | 24 | 22 | 22 | 68 |
| ג׳ (3) | 22 | 22 | 22 | 66 |
| ד׳ (4) | 24 | 22 | 20 | 66 |
| ה׳ (5) | 22 | 22 | 22 | 66 |
| ו׳ (6) | 24 | 22 | 20 | 66 |
| **Total** | | | | **398** |

### Demo Parent

All 398 students share a single demo parent for schema compliance (`students.parent_id NOT NULL`).

| Field | Value |
|---|---|
| Email | demofamily@leo-k.com |
| Display name | משפחת הדגמה |
| Role in demo | DB scaffolding only; not used in any demo flow |

### Hebrew Student Name Pool

**Female names (35):** נועה, מיה, שירה, תמר, ליאור, חן, רותם, יעל, מיכל, ורד, גלי, הדס, לילך, נרית, עדי, שחר, רעות, דנה, עינב, טל, הילה, אורית, שני, יונית, ליאת, קרן, אמית, שיר, ספיר, גל, ניצן, עמית, איה, נגה, אריאל

**Male names (35):** עומר, יואב, אדם, נדב, אורי, ניר, ליאם, גיל, אלון, רון, יונתן, מתן, תמיר, איתי, אסף, גלעד, עמרי, דרור, עידן, אוהד, אמיר, שחר, ידין, נתן, ראם, אביב, ישי, ברק, מאור, ליעד, יוסף, אלי, שי, מיכה, אריאל

**Family names (20):** כהן, לוי, מזרחי, פרץ, ביטון, אברהם, פרידמן, שפירא, דוד, אזולאי, יוסף, חדד, רוזן, שמש, בן-דוד, ברק, שטרן, גרוס, אלון, נחום

Names are assigned deterministically by student index within each class so reruns produce identical data.

### Achievement Profiles

Each student is assigned a persistent profile at seed time:

| Profile | Percentage | Score Range | Description |
|---|---|---|---|
| Strong | 15% | 85–100% | Consistent high scorers |
| Average | 70% | 55–80% | Normal variation around grade level |
| Struggling | 15% | 20–50% | Systematic low performance |

Profile assignment: deterministic by student index (e.g., index % 20 < 3 → struggling, index % 20 >= 17 → strong). Stored in seed state so it is stable across nightly advances.

### Weak Topics per Class

Each physical class has 1–2 pre-assigned weak topics where ALL students score 15–20 points lower than their profile baseline:

| Class | Weak Topic | Subject |
|---|---|---|
| כיתה א׳ 1 | subtraction | math |
| כיתה א׳ 2 | vowels_reading | hebrew |
| כיתה ב׳ 1 | plurals | hebrew |
| כיתה ב׳ 3 | simple_sentences | english |
| כיתה ג׳ 2 | fractions | math |
| כיתה ג׳ 3 | animals | science |
| כיתה ד׳ 1 | angles | math (geometry) |
| כיתה ד׳ 2 | community | moledet_geography |
| כיתה ה׳ 2 | environment | science |
| כיתה ה׳ 3 | multiplication_advanced | math |
| כיתה ו׳ 1 | maps | moledet_geography |
| כיתה ו׳ 3 | pythagoras | math (geometry) |

Remaining classes have no predefined weak topic (performance follows individual profiles only).

---

## 8. Data Visibility Model

The school manager visibility logic in `lib/school-server/school-scope.server.js` aggregates:

1. Teachers via `school_teacher_memberships`
2. Classes via `teacher_classes WHERE teacher_id IN (school_teacher_ids)`
3. Students via union of:
   - `school_student_enrollments` (active)
   - `teacher_class_students` (students in school teachers' classes)
   - `teacher_students` (direct links — not used in this demo; class-based only)

Because every subject teacher owns class records and every student is in all **6** subject-class records for their physical class, the union of `teacher_class_students` already covers all 398 students. `school_student_enrollments` provides explicit enrollment as an additional signal.

### Teacher Visibility

Each teacher sees:

- Their own `teacher_classes` records (6 per subject for English/Science teachers; 12 for Math+Geometry or Hebrew+Moledet teachers)
- Students in those classes via `teacher_class_students`
- Activities they created (`classroom_activities.teacher_id = their_id`)
- Reports for their own subject-class records only

A teacher who teaches both math and geometry (e.g., Vered) sees **12 class records** — 6 math and 6 geometry — as distinct entries. Math activities and geometry activities are separate streams. A school manager sees all 108 records and can compare math performance vs. geometry performance for the same physical class.

---

## 9. School Manager Operational Controls

### 9.1 Phase 1 — Implementable Now (Existing APIs)

All Phase 1 controls work with the current API layer. The seed script configures all initial state; the school manager can perform these during a live demo.

| Operation | API | Audit Action |
|---|---|---|
| View all teachers | GET /api/school/teachers | school_class_viewed (on class open) |
| View teacher detail + subjects | GET /api/school/teachers/[id] | — |
| Grant subject permission to teacher | POST /api/school/teachers/[id]/subjects | school_subject_granted |
| Revoke subject permission | DELETE /api/school/teachers/[id]/subjects/[subjectId] | school_subject_revoked |
| View all classes | GET /api/school/classes | — |
| Open class report | GET /api/school/classes/[id]/report-data | school_class_viewed |
| View all students | GET /api/school/students | — |
| Open student report | GET /api/school/students/[id]/report-data | school_student_report_viewed |
| Enroll student in school | POST /api/school/students/[id]/enrollment | school_student_enrolled |
| Unenroll student from school | DELETE /api/school/students/[id]/enrollment | school_student_unenrolled |
| View recent school activities | GET /api/school/activities | — |
| View school dashboard | GET /api/school/dashboard | — |

### 9.2 Phase 2 — Current Execution Scope (New APIs + Owner SQL Gate)

These operations are part of the current delivery. They require new API routes, a new server library module (`lib/school-server/school-operations.server.js`), and the owner SQL gate in Phase 0 (Section 9.3 below). All four operations are implemented, verified with a dedicated test script, and included in the final test suite.

#### Move Student Between Class Sections

**Use case:** Student transfers from כיתה א׳ 1 to כיתה א׳ 2 mid-year.

**Data changes:**
- For each subject (math, geometry, english, hebrew, moledet_geography, science):
  - Remove `teacher_class_students` row linking student to old section's class record
  - Insert `teacher_class_students` row linking student to new section's class record
- `school_student_enrollments` unchanged (student stays enrolled in school)
- Activity history (completed activities) is preserved untouched

**New API:** `POST /api/school/students/[studentId]/class-transfer`

**Request body:**
```json
{ "fromPhysicalClass": "כיתה א׳ 1", "toPhysicalClass": "כיתה א׳ 2", "gradeLevel": "1" }
```

**Audit action:** `school_student_class_transferred` (added in Phase 0 SQL gate)

**Acceptance criteria after transfer:**
- Old section student count drops by 1
- New section student count rises by 1
- School manager still sees the student in all students list
- Previous activity attempts remain unchanged
- New section teachers see the student; old section teachers do not
- Audit entry exists

#### Reassign Subject Teacher to a Class

**Use case:** Sara goes on leave; a substitute takes over Grade 1 English.

**Data change:** `UPDATE teacher_classes SET teacher_id = $newTeacherId WHERE id = $classId`

**New API:** `PATCH /api/school/classes/[classId]` with `{ teacherId: "..." }`

**Precondition:** New teacher must be a school member with the correct subject grant.

**Audit action:** `school_class_teacher_reassigned` (added in Phase 0 SQL gate)

**Acceptance criteria:**
- New teacher sees the class in their dashboard
- Old teacher no longer sees the class
- Existing classroom activities retain their original `teacher_id` (history preserved)
- Future activities created by new teacher have their `teacher_id`

#### Archive a Class

**Use case:** A section is dissolved at end of year.

**Data change:** `UPDATE teacher_classes SET is_archived = true, archived_at = now() WHERE id = $classId`

**New API:** `PATCH /api/school/classes/[classId]` with `{ archived: true }`

**Audit action:** `school_class_archived` (added in Phase 0 SQL gate)

**Acceptance criteria:**
- Class no longer counted in `activeClassCount`
- Students remain enrolled in school (not removed)
- Activity history for the class is preserved
- Class still visible in archived view

#### View Audit History

**New API:** `GET /api/school/audit-log?limit=50&offset=0`

Queries `teacher_access_audit` for school-related action types, filtering by `teacher_id IN (school_teacher_ids)`.

#### Merge Classes (Phase 3 — Future)

Complex operation: moves all students from class A into class B, archives class A. Depends on Phase 2 student transfer being stable first. Out of scope for initial implementation.

### 9.3 Phase 0 — Owner Manual SQL Gate (Must Run Before Any Scripts)

Before the seed scripts are written or run, the owner applies the following SQL once in the Supabase SQL editor (or psql). This extends the `teacher_access_audit` action CHECK constraint to allow the three new school-operation audit values.

This is the **only SQL requiring owner manual action** in the entire execution. It must be applied first because the seed verification scripts check audit constraint health, and all Phase 2 API routes write to `teacher_access_audit`.

The constraint below preserves **all existing values from migrations 024 and 027** exactly, and appends the three new values at the end.

```sql
-- Phase 0 owner gate — extend teacher_access_audit action CHECK
-- Apply ONCE in Supabase SQL editor before running any seed or operational scripts.
-- All existing values from 024_classroom_activities + 027_school_managed_portal are preserved.

ALTER TABLE public.teacher_access_audit
  DROP CONSTRAINT IF EXISTS teacher_access_audit_action_check,
  DROP CONSTRAINT IF EXISTS teacher_access_audit_action_chk;

ALTER TABLE public.teacher_access_audit
  ADD CONSTRAINT teacher_access_audit_action_chk CHECK (action IN (
    'grant_created',
    'grant_revoked',
    'grant_expired',
    'pin_rotated',
    'username_rotated',
    'magic_link_sent',
    'magic_link_consumed',
    'magic_link_expired',
    'guardian_login_success',
    'guardian_login_failed',
    'guardian_logout',
    'teacher_link_created',
    'teacher_link_archived',
    'teacher_onboarded',
    'class_created',
    'class_archived',
    'class_updated',
    'class_member_added',
    'class_member_removed',
    'viewed_student_report',
    'viewed_class_report',
    'link_created',
    'link_archived',
    'link_consent_failed',
    'link_limit_reached',
    'consent_issued',
    'consent_revoked',
    'magic_link_issued',
    'student_created_by_teacher',
    'student_name_updated',
    'activity_created',
    'activity_activated',
    'activity_paused',
    'activity_closed',
    'activity_archived',
    'school_subject_granted',
    'school_subject_revoked',
    'school_student_enrolled',
    'school_student_unenrolled',
    'school_class_viewed',
    'school_student_report_viewed',
    -- New Phase 2 school operational actions:
    'school_student_class_transferred',
    'school_class_teacher_reassigned',
    'school_class_archived'
  ));
```

**Verification after apply:**

```sql
-- Should return 0 rows (confirms constraint is active and accepts known values):
INSERT INTO public.teacher_access_audit
  (teacher_id, action) VALUES ('00000000-0000-0000-0000-000000000000', 'unknown_action');
-- Expected: ERROR: new row violates check constraint "teacher_access_audit_action_chk"
```

Or simply:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'teacher_access_audit_action_chk';
```

Confirm all three new values appear in the constraint definition before proceeding to Phase 1.

### 9.4 Gap Summary

| Capability | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| View teachers/classes/students | ✓ | | |
| Subject permission management | ✓ | | |
| Enrollment management | ✓ | | |
| Class and student reports | ✓ | | |
| Activity history view | ✓ | | |
| Move student between sections | — | ✓ Current delivery | |
| Reassign class teacher | — | ✓ Current delivery | |
| Archive class | — | ✓ Current delivery | |
| Audit log viewer | — | ✓ Current delivery | |
| Merge classes | — | — | Future |

---

## 10. Activity Strategy

### Classroom Activities (All Subjects)

Each subject teacher creates `classroom_activities` for their own class records. Every subject has its own class record — no subject is grouped with another. Math and geometry are fully separate activity streams. Hebrew and moledet_geography are fully separate activity streams.

| Subject | Teacher(s) | Class records | Activity mode | Frequency |
|---|---|---|---|---|
| math | דן / ורד / נועם | own math class records | guided_practice, quiz | Daily (per timetable) |
| geometry | דן / ורד / נועם | own geometry class records | guided_practice, quiz | Per timetable (own lesson slots) |
| english | שרה / מיכל / אלון | own english class records | guided_practice, homework | Daily |
| hebrew | רחל / יעל / דוד | own hebrew class records | guided_practice, homework | Daily |
| moledet_geography | רחל / יעל / דוד | own moledet_geography class records | guided_practice | Per timetable (own lesson slots) |
| science | לירון / תמר | own science class records | guided_practice, quiz | Per timetable |

A geometry lesson creates an activity on the **geometry class record** (subject_focus=geometry), not on the math class record. A moledet_geography lesson creates an activity on the **moledet_geography class record**, not on the hebrew class record.

### Individual Student Activities

`student_activities` are seeded for struggling students (bottom 15%) who need targeted remediation. One individual activity per week per subject for each identified student. Teacher_id = subject teacher for that grade.

### Question Set Stub Format

The seed does not call the learning engine. Activities use minimal valid stubs:

```json
[
  {
    "questionId": "stub-q01",
    "topic": "addition",
    "difficulty": "easy",
    "questionText": "שאלה 1",
    "options": ["א", "ב", "ג", "ד"],
    "correctAnswer": "ב",
    "skillKey": "addition_basic"
  }
]
```

`question_count = 10`. All 10 questions have the same structure with incrementing `questionId`. `correct_answer` is stored on `classroom_activity_attempts` from the question_set entry.

`question_snapshot` on attempt rows:

```json
{ "questionId": "stub-q01", "topic": "addition", "difficulty": "easy" }
```

### Activity Status in Seed

| Time Period | Status | Purpose |
|---|---|---|
| Days 1–8 (history) | closed | Historical data for reports |
| Days 9–10 (recent) | closed | Recent trend data |
| Current day active lessons | active | Live dashboard activity count |
| Upcoming (next lesson) | draft | Shows active lesson prep |

---

## 11. Daily Timetable

Israeli school week: Sunday–Thursday (5 days). Each physical class has 6 lesson slots per day, each mapping to one of the 6 separate subjects. Each slot generates one `classroom_activities` row on the correct **subject-specific class record** for that subject.

**Geometry and moledet_geography each appear as their own independent lesson slots — not as subtypes of math or hebrew.**

| Hour | Sunday | Monday | Tuesday | Wednesday | Thursday |
|---|---|---|---|---|---|
| 1 | math | math | geometry | math | math |
| 2 | hebrew | english | hebrew | english | geometry |
| 3 | english | hebrew | english | science | hebrew |
| 4 | science | math | math | hebrew | english |
| 5 | moledet_geography | science | science | math | math |
| 6 | geometry | moledet_geography | moledet_geography | moledet_geography | science |

Each slot maps to a class record lookup: `teacher_classes WHERE teacher_id = <subject_teacher>, grade_level = <grade>, subject_focus = <subject>`. Geometry activities are created by the math teacher on their **geometry class records**. Moledet_geography activities are created by the hebrew teacher on their **moledet_geography class records**.

**Weekly lesson totals per physical class:**

| Subject | Lessons/week | Class records used |
|---|---|---|
| math | 8 | geometry teacher's math records |
| geometry | 3 | geometry teacher's geometry records |
| english | 5 | english teacher's english records |
| hebrew | 5 | hebrew teacher's hebrew records |
| moledet_geography | 4 | hebrew teacher's moledet_geography records |
| science | 5 | science teacher's science records |

**Activities per school day across all 18 physical classes:**
6 slots × 18 classes = **108 classroom activities** per simulated school day.

---

## 12. Nightly Simulation Model

### Script: `run-school-nightly-simulation.mjs`

Runs as a Node.js process using Supabase service role. No Playwright. Direct inserts/updates only.

### State File

`scripts/school-portal/sim-state.json` (gitignored):

```json
{
  "schoolId": "...",
  "demoSchoolName": "בית ספר ניסוי לאו קידס",
  "currentSchoolDay": 14,
  "startDate": "2025-09-01",
  "lastRunAt": "2026-05-26T00:00:00.000Z",
  "studentProfiles": { "<studentId>": "strong|average|struggling" },
  "classWeakTopics": { "<classId>": ["topic1", "topic2"] }
}
```

### ADVANCE Mode (default)

```
--mode=advance [--force]
```

1. Load sim-state.json; read `currentSchoolDay`
2. Compute day-of-week from `startDate + currentSchoolDay` (skip weekends/holidays)
3. For each of the 18 physical classes:
   - For each of the 6 lesson slots (from timetable):
     - Identify subject → find correct teacher → find correct class record (`teacher_classes` where `teacher_id = subject_teacher, grade_level = grade, subject_focus = subject`)
     - Geometry slot → activity on the **geometry** class record (not math)
     - Moledet slot → activity on the **moledet_geography** class record (not hebrew)
     - Insert `classroom_activities` row (status = 'active' for today's slots, 'closed' for past)
     - Insert `classroom_activity_student_status` rows (one per class student, status = 'submitted' for past, 'in_progress' for current)
     - Insert `classroom_activity_attempts` rows (one per student per question — 10 questions)
     - Score each attempt: base score from student profile, adjusted down for weak topics
4. For each struggling student: optionally insert 1 `student_activity` (mode = 'homework')
5. Increment `currentSchoolDay`, update `lastRunAt`, save state
6. Print summary: activities created, students simulated, pass/fail breakdown

Idempotent: before inserting, check for existing activities on the same class+day+subject slot. Skip if found (unless `--force`).

### SEED-HISTORY Mode

```
--mode=seed-history --days=10
```

Loops ADVANCE mode for the last 10 school days (all status = 'closed'). Run once during provisioning.

### RESET Mode

```
--mode=reset [--full]
```

- Archives all `classroom_activities` and `student_activities` for the demo school (sets `status = 'archived'`, `archived_at = now()`)
- Deletes all `classroom_activity_student_status`, `classroom_activity_attempts`, `student_activity_status`, `student_activity_attempts` for those activities
- Resets `sim-state.json` to `currentSchoolDay = 0`
- `--full` additionally deletes all teacher_class_students, teacher_students, school_student_enrollments, students, and teacher_classes for the demo school (full re-seed required after)

### Answer Scoring Formula

```
baseScore = profile score range midpoint (strong=92, average=67, struggling=35)
randomVariance = ±8 points (deterministic from student+question hash)
weakTopicPenalty = -18 if activity.topic IN classWeakTopics[classId]
finalScore = clamp(baseScore + randomVariance + weakTopicPenalty, 0, 100)
isCorrect = random() < (finalScore / 100)
```

`answers_count = 10`, `correct_count = round(finalScore / 100 * 10)`, `score_pct = finalScore`.

---

## 13. New Scripts

### `scripts/school-portal/seed-demo-school.mjs`

Idempotent full school seed. All phases safe to re-run; upsert/insert-if-not-exists throughout.

**Phases (run via `--phase` flag):**

| Phase | Flag | What it does |
|---|---|---|
| All | `--phase=all` | Runs all phases in order |
| Accounts | `--phase=accounts` | Demo parent + 12 auth users (manager + 11 teachers) + teacher_profiles + teacher_limits |
| Memberships | `--phase=memberships` | school_accounts row + school_teacher_memberships + school_teacher_subjects + backfill teacher_profiles.school_id |
| Classes | `--phase=classes` | 108 teacher_classes rows (18 physical × 6 subjects, correct teacher_id + subject_focus per row, all tagged school_id) |
| Students | `--phase=students` | 398 students + teacher_class_students (2,388 rows) + school_student_enrollments (398 rows) |

**Environment variables required at runtime:**

```
NEXT_PUBLIC_LEARNING_SUPABASE_URL
LEARNING_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY
SCHOOL_QA_PASSWORD          # school manager password (leo7479 for demo)
DEMO_TEACHER_PASSWORD       # all teachers (leo7479 for demo)
DEMO_PARENT_PASSWORD        # demo parent (leo7479 for demo)
```

**Writes `scripts/school-portal/sim-state.json`** with schoolId and student profiles after `--phase=students`.

### `scripts/school-portal/run-school-nightly-simulation.mjs`

Runs school day simulation. See Section 12.

**Invocation:**

```bash
node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=advance
node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=seed-history --days=10
node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=advance --dry-run
node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=reset
node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=reset --full
```

### `scripts/school-portal/reset-demo-school-activities.mjs`

Safe standalone cleanup script for activity data only (no accounts or students affected unless `--full`).

```bash
node --env-file=.env.local scripts/school-portal/reset-demo-school-activities.mjs --mode=activities
node --env-file=.env.local scripts/school-portal/reset-demo-school-activities.mjs --mode=full
```

### New Operational API Routes (Phase 2, written in Phase 1)

Four new API route files and one server library module:

| File | Method | Purpose |
|---|---|---|
| `pages/api/school/students/[studentId]/class-transfer.js` | POST | Move student between physical class sections |
| `pages/api/school/classes/[classId]/assign-teacher.js` | PATCH | Reassign class to a different school teacher |
| `pages/api/school/classes/[classId]/archive.js` | POST | Archive/close a class |
| `pages/api/school/audit-log.js` | GET | Paginated school audit history |
| `lib/school-server/school-operations.server.js` | library | `transferStudentBetweenSections`, `reassignClassTeacher`, `archiveSchoolClass`, `listSchoolAuditLog` |

All routes use `requireSchoolManagerApiContext` (same auth guard as existing school routes). All write operations insert a `teacher_access_audit` row before returning. All return 403 for non-school-manager tokens.

**`class-transfer.js` request body:**
```json
{ "fromPhysicalClass": "כיתה א׳ 1", "toPhysicalClass": "כיתה א׳ 2", "gradeLevel": "1" }
```
Removes the student from all 6 subject-class records for the source section and inserts into all 6 for the destination section in a single transaction.

**`assign-teacher.js` request body:**
```json
{ "teacherId": "<uuid>" }
```
Precondition: new teacher must be a school member with a matching subject grant for the class's `subject_focus`.

**`assign-teacher.js` — activity history rule:** Existing `classroom_activities` rows retain their original `teacher_id`. Only the class ownership (`teacher_classes.teacher_id`) changes.

**`audit-log.js` query params:** `?limit=50&offset=0&action=school_student_class_transferred` (action filter optional).

### `scripts/school-portal/verify-school-operational-controls.mjs`

Dedicated verification script that runs each Phase 2 operation end-to-end and then reverses it to leave the demo school in a clean state. Used in T13–T16 of the test plan.

```bash
node --env-file=.env.local scripts/school-portal/verify-school-operational-controls.mjs --check=all
node --env-file=.env.local scripts/school-portal/verify-school-operational-controls.mjs --check=transfer
node --env-file=.env.local scripts/school-portal/verify-school-operational-controls.mjs --check=reassign
node --env-file=.env.local scripts/school-portal/verify-school-operational-controls.mjs --check=archive
node --env-file=.env.local scripts/school-portal/verify-school-operational-controls.mjs --check=audit-log
```

---

## 14. Execution Phases (Continuous After Approval)

After owner approval, execution runs from Phase 0 through Phase 7 without stops. Phase 0 is the only manual owner action. All other phases run as scripted commands.

| Phase | Who | Duration | Description | Key outputs |
|---|---|---|---|---|
| **0** | **Owner manual** | ~2 min | Apply Phase 0 SQL gate in Supabase SQL editor — extend `teacher_access_audit` CHECK constraint | Constraint updated; verified with SELECT |
| 1 | Agent | ~30 min | Write all new scripts, API routes, and server library | seed-demo-school.mjs, run-school-nightly-simulation.mjs, reset-demo-school-activities.mjs, 4 new API routes (class-transfer, assign-teacher, archive, audit-log), school-operations.server.js, verify-school-operational-controls.mjs |
| 2 | Agent | ~5 min | Pre-flight checks | 027 applied; Phase 0 gate confirmed; existing school scripts pass; no demo school conflict |
| 3 | Agent | ~10 min | Account provisioning | `seed-demo-school.mjs --phase=accounts` → 12 auth users + profiles |
| 4 | Agent | ~5 min | Memberships + subjects | `seed-demo-school.mjs --phase=memberships` → 12 memberships + subject grants |
| 5 | Agent | ~10 min | Classes + students | `seed-demo-school.mjs --phase=classes` then `--phase=students` → 108 classes, 398 students, 2,388 class links, 398 enrollments |
| 6 | Agent | ~10 min | History seed | `run-school-nightly-simulation.mjs --mode=seed-history --days=10` → 10 school days of closed activities |
| 7 | Agent | ~30 min | Full 16-test suite + delivery report | All tests pass; one final report |

No raw SQL required after Phase 0. All phases are idempotent (safe to re-run if interrupted).

---

## 15. Operational Demo Flow

This flow is the reference walkthrough for owner demo, school manager QA, and marketing presentations.

### Step-by-step

1. **Login as school manager**
   - Open `/teacher/login`, enter `school@leo-k.com` + password
   - App detects `isSchoolManager = true`, redirects to `/school/dashboard`

2. **School dashboard**
   - See stats: 11 teachers, 108 classes, 398 students, N active activities
   - Stats reflect real data — not mocked

3. **Open class report**
   - Navigate to `/school/classes`
   - Open "כיתה ג׳ 2 — מתמטיקה" (Vered's math class)
   - View subject performance, strong/struggling students, recent activities

4. **Open student report**
   - Click into a student from the class report
   - View per-subject breakdown, activity history, progress trend

5. **Navigate to teachers**
   - Go to `/school/teachers`
   - Open מיכל (Michal, English grade 3–4)
   - See: 6 classes, assigned subjects (english), subject_focus per class

6. **Change subject permission — live demo**
   - Add `geometry` subject grant to Michal (for demo purposes)
   - Observe audit event logged
   - Remove it — observe revoke audit event
   - (This demonstrates school manager controls)

7. **Move student — Phase 2 demo (once implemented)**
   - Open student from כיתה א׳ 1
   - Use class-transfer action: move to כיתה א׳ 2
   - Return to class list — כיתה א׳ 1 student count decreases, כיתה א׳ 2 increases
   - Student report still accessible from school manager view
   - Old teacher (Dan's class 1) no longer shows student in roster
   - New teacher (Dan's class 2) now shows student

8. **Advance school simulation**
   - Owner (or scheduler) runs `run-school-nightly-simulation.mjs --mode=advance`
   - Refresh school dashboard — activity count increases
   - Open a class report — new day's activities appear in history
   - Open student report — progress has advanced

9. **Verify teacher isolation**
   - Login as מיכל (michal@leo-k.com)
   - See only Grade 3–4 English classes (6 classes)
   - Cannot access Grade 5 data, cannot see other subjects' activities
   - Cannot reach `/school/*` (blocked with 403)

10. **Verify private teacher regression**
    - Confirm no private teacher accounts have been modified
    - Confirm private teacher token returns 403 on all `/api/school/*` routes
    - Confirm private teacher sees their own students only

---

## 16. Test Plan

All tests run after Phase 7. All must pass before delivery report is written.

### T1 — Build

```bash
npm run build
```

Expected: exit 0, zero TypeScript/build errors.

### T2 — School Security Matrix

```bash
node --env-file=.env.local scripts/school-portal/school-portal-security-matrix.mjs
```

Expected: all access control cells PASS. Key checks:
- School manager: 200 on all `/api/school/*`
- Regular teacher: 403 on `/api/school/*` (only admin school teacher gets 200)
- Private teacher: 403 on all `/api/school/*`
- Admin: 200 on `/api/admin/schools/*`
- Unauthenticated: 401

### T3 — School Aggregation Verification

```bash
node --env-file=.env.local scripts/school-portal/verify-school-aggregation.mjs $DEMO_SCHOOL_ID
```

Expected: ALL PASS. Key checks:
- `teacherCount` matches `role='teacher'` membership count (11)
- `studentCount` >= `enrolledStudentCount` (both = 398)
- `classes.length` == `activeClassCount` (108)
- `students.length` == `studentCount` (398)

### T4 — Teacher vs School Manager API Comparison

```bash
node --env-file=.env.local scripts/school-portal/compare-teacher-vs-school-apis.mjs
```

Expected: school manager API counts match per-teacher DB totals.

### T5 — Audit Data Truth

```bash
node --env-file=.env.local scripts/school-portal/audit-school-data-truth.mjs $DEMO_SCHOOL_ID
```

Expected: teacher_classes count by teacher matches, class_student counts match enrollment count, no `school_id` gaps on classes.

### T6 — School Manager Login Flow

```bash
SCHOOL_QA_PASSWORD=leo7479 node --env-file=.env.local scripts/school-portal/verify-school-manager-login-flow.mjs
```

Expected: all PASS — signIn, teacher/me, school/me, admin blocked, school/dashboard loads.

### T7 — Nightly Simulation Dry Run

```bash
node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=advance --dry-run
```

Expected: prints next school day's plan with 108 activities, exits 0. No DB writes.

### T8 — Nightly Simulation Live Run

```bash
node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=advance
```

Expected: advances `currentSchoolDay` by 1, inserts 108 classroom activities + student_status/attempts rows. Prints summary. Exit 0.

### T9 — Browser Smoke: Owner Admin

Manual check in browser as owner:
- `/admin/schools` — demo school appears in list
- Click into school — teachers/classes/students counts correct
- Audit log for school shows entries

### T10 — Browser Smoke: School Manager

Manual check in browser as `school@leo-k.com`:
- `/school/dashboard` loads, stats match T3
- `/school/classes` — 108 classes listed, grouped by grade, each showing subject label (e.g. "כיתה א׳ 1 — גיאומטריה" distinct from "כיתה א׳ 1 — מתמטיקה")
- `/school/teachers` — 11 teachers listed with subjects
- `/school/students` — 398 students
- Open one class report — loads without error
- Open one student report — loads without error
- Grant a subject permission — UI updates

### T11 — Browser Smoke: Teachers (3 teachers)

Manual check for Dan (math), Michal (English), Liron (science):
- Each sees only their 6 or 9 classes
- Cannot see other teachers' classes
- Activities list shows only their subject activities
- `/school/*` returns 403 for all three

### T12 — Private Teacher Regression

Using any pre-existing private teacher account (not part of demo school):
- `GET /api/school/me` → 403
- `GET /api/school/dashboard` → 403
- `GET /api/school/teachers` → 403
- `GET /api/teacher/me` → 200 (still works normally)
- Teacher's own classes, students, activities unchanged
- Count of teacher's students/classes in teacher dashboard unchanged

### T13 — Student Class Transfer

```bash
node --env-file=.env.local scripts/school-portal/verify-school-operational-controls.mjs --check=transfer
```

Expected:
- Student X transferred from כיתה א׳ 1 to כיתה א׳ 2
- All 6 subject-class records for כיתה א׳ 1 lose student X (`teacher_class_students` removed)
- All 6 subject-class records for כיתה א׳ 2 gain student X (`teacher_class_students` added)
- School manager still sees student X in `/api/school/students`
- Previous `classroom_activity_attempts` for student X are untouched
- Dan/Sara/Rachel/Liron's class-2 rosters now include student X
- Dan/Sara/Rachel/Liron's class-1 rosters no longer include student X
- `teacher_access_audit` row with `action = 'school_student_class_transferred'` exists
- Script reverses the transfer to restore clean state before exiting

### T14 — Class Teacher Reassignment

```bash
node --env-file=.env.local scripts/school-portal/verify-school-operational-controls.mjs --check=reassign
```

Expected:
- One English class (כיתה ג׳ 1, grade 3 section 1) reassigned from מיכל to a second eligible teacher
- New teacher sees the class in their `teacher_classes` query; מיכל no longer does
- Existing `classroom_activities` rows for that class retain original `teacher_id` (history preserved)
- `teacher_access_audit` row with `action = 'school_class_teacher_reassigned'` exists
- Script reverses the reassignment before exiting

### T15 — Class Archive

```bash
node --env-file=.env.local scripts/school-portal/verify-school-operational-controls.mjs --check=archive
```

Expected:
- One test class archived (`is_archived = true`, `archived_at` set)
- `activeClassCount` in school dashboard decreases by 1
- Students in that class remain in `school_student_enrollments` (not unenrolled)
- Existing `classroom_activities` for the archived class are preserved
- `teacher_access_audit` row with `action = 'school_class_archived'` exists
- Script unarchives the class to restore clean state before exiting

### T16 — Audit Log API

```bash
node --env-file=.env.local scripts/school-portal/verify-school-operational-controls.mjs --check=audit-log
```

Expected:
- `GET /api/school/audit-log` returns 200 with `data.entries` array
- Entries include rows from T13, T14, T15 (transfer, reassign, archive audit actions)
- All entries have `teacher_id` belonging to a demo school teacher — no outside records
- Pagination with `?limit=10&offset=0` and `?limit=10&offset=10` both return correctly
- `GET /api/school/audit-log` with non-school-manager token returns 403

---

## 17. Acceptance Criteria

### Structure

- [ ] School account exists: name = "בית ספר ניסוי לאו קידס"
- [ ] 12 auth users provisioned (1 manager + 11 teachers)
- [ ] 108 active class records in school (18 physical × 6 separate subjects)
- [ ] 398 demo students enrolled
- [ ] ~2,388 `teacher_class_students` rows (398 × 6)
- [ ] 398 `school_student_enrollments` rows
- [ ] Subject grants: Dan/Vered/Noam have math+geometry; Sara/Michal/Alon have english; Rachel/Yael/David have hebrew+moledet_geography; Liron/Tamar have science
- [ ] Math and geometry are fully separate class records (not grouped)
- [ ] Hebrew and moledet_geography are fully separate class records (not grouped)

### Dashboard

- [ ] School manager dashboard shows: teacherCount=11, activeClassCount=108, studentCount=398, enrolledStudentCount=398
- [ ] Active activities count increases after each nightly advance
- [ ] Dashboard loads in under 3 seconds

### Teacher Visibility

- [ ] Dan sees exactly 6 classes (grades 1–2, subject_focus=math)
- [ ] Sara sees exactly 6 classes (grades 1–2, subject_focus=english)
- [ ] Liron sees exactly 9 classes (grades 1–3, subject_focus=science)
- [ ] No teacher sees another teacher's classes via teacher portal
- [ ] Each teacher's student list matches their class rosters exactly

### Reports

- [ ] School manager can open every class report for all 108 classes without error (including separate geometry and moledet_geography class reports)
- [ ] School manager can open every student report for all 398 students without error
- [ ] Each teacher can open class reports for their own classes
- [ ] Each teacher cannot open class reports for other teachers' classes (403 or scoped empty)
- [ ] Class reports show realistic subject performance with strong/average/struggling distribution
- [ ] Student reports show varied achievement (not all 100% or all 0%)
- [ ] Weak topic classes show measurably lower scores on their weak topic

### Operational Management (Phase 1)

- [ ] School manager can grant subject permission to a teacher via UI — audit entry created
- [ ] School manager can revoke subject permission — audit entry created
- [ ] School manager can enroll a new student — student appears in student list
- [ ] School manager can unenroll a student — student disappears from student list
- [ ] All operations reflected immediately in subsequent API calls

### Operational Management (Phase 2 — included in current delivery)

- [ ] Student transfer: all 6 subject-class records for source section lose the student; all 6 for destination gain the student
- [ ] After transfer: school manager still sees the student in `/api/school/students`
- [ ] After transfer: student's previous `classroom_activity_attempts` are intact and unchanged
- [ ] After transfer: destination section teachers see the student; source section teachers do not
- [ ] After transfer: `teacher_access_audit` entry with `school_student_class_transferred` created
- [ ] Class teacher reassignment: new teacher sees the class; previous teacher does not
- [ ] Class teacher reassignment: existing activity history retains original `teacher_id`
- [ ] Class teacher reassignment: `teacher_access_audit` entry with `school_class_teacher_reassigned` created
- [ ] Class archive: `activeClassCount` decreases by 1; students remain enrolled in school
- [ ] Class archive: activity history for archived class is preserved
- [ ] Class archive: `teacher_access_audit` entry with `school_class_archived` created
- [ ] Audit log API: returns paginated entries scoped to demo school teachers only
- [ ] Audit log API: returns 403 for non-school-manager tokens
- [ ] All Phase 2 API routes return 403 for regular teacher and private teacher tokens
- [ ] Private teachers are unaffected by all Phase 2 operations

### Nightly Simulation

- [ ] Advance dry-run exits 0 with correct plan output
- [ ] Advance live run exits 0, `currentSchoolDay` increments by 1
- [ ] After 5 advances, reports show progress trend (not flat scores)
- [ ] Reset mode archives all activities, state resets to 0
- [ ] Full reset leaves school structure intact (accounts, classes, students, enrollments)

### Security / Isolation

- [ ] No pre-existing private teacher account modified
- [ ] No pre-existing parent or student account modified
- [ ] Private teacher token → 403 on all `/api/school/*`
- [ ] School manager token → 403 on `/api/admin/*`
- [ ] Demo school activities cannot interfere with parent report generation for real students

---

## 18. Cleanup / Reset Strategy

### Table Inventory with Safe Scope

All demo rows are scopeable without touching real data. The anchor is `DEMO_SCHOOL_ID` stored in `sim-state.json`.

| Table | How demo rows are identified | Cleanup method |
|---|---|---|
| `school_accounts` | `id = DEMO_SCHOOL_ID` | DELETE by id (cascades to memberships/subjects/enrollments) |
| `school_teacher_memberships` | `school_id = DEMO_SCHOOL_ID` | Cascaded from school_accounts |
| `school_teacher_subjects` | `school_id = DEMO_SCHOOL_ID` | Cascaded |
| `school_student_enrollments` | `school_id = DEMO_SCHOOL_ID` | Cascaded |
| `teacher_profiles` | `id IN (DEMO_TEACHER_IDS from sim-state.json)` | DELETE after removing memberships |
| `teacher_limits` | `teacher_id IN (DEMO_TEACHER_IDS)` | DELETE by teacher_id |
| `teacher_classes` | `school_id = DEMO_SCHOOL_ID` | DELETE by school_id (cascades class_students) |
| `teacher_class_students` | `class_id IN (DEMO_CLASS_IDS)` | Cascaded from teacher_classes |
| `classroom_activities` | `school_id = DEMO_SCHOOL_ID` | DELETE by school_id (cascades status/attempts) |
| `classroom_activity_student_status` | `activity_id IN (DEMO_ACTIVITY_IDS)` | Cascaded |
| `classroom_activity_attempts` | `activity_id IN (DEMO_ACTIVITY_IDS)` | Cascaded |
| `student_activities` | `school_id = DEMO_SCHOOL_ID` | DELETE by school_id (cascades status/attempts) |
| `student_activity_status` | `activity_id IN (DEMO_SA_IDS)` | Cascaded |
| `student_activity_attempts` | `activity_id IN (DEMO_SA_IDS)` | Cascaded |
| `students` | `parent_id = DEMO_PARENT_ID` | DELETE after class_students + enrollments removed |
| `parent_profiles` | `id = DEMO_PARENT_ID` | DELETE after students removed |
| `student_access_codes` | `student_id IN (DEMO_STUDENT_IDS)` | DELETE by student_id |
| `student_coin_balances` | `student_id IN (DEMO_STUDENT_IDS)` | DELETE by student_id |
| `teacher_access_audit` | `teacher_id IN (DEMO_TEACHER_IDS)` | DELETE by teacher_id (demo audit only) |
| `admin_audit_log` | `target_id IN (DEMO_SCHOOL_ID, DEMO_TEACHER_IDS)` | DELETE by target_id |

### What is NOT touched by cleanup

- Any `students` row with `parent_id != DEMO_PARENT_ID`
- Any `teacher_profiles` row with `id NOT IN DEMO_TEACHER_IDS`
- Any `school_accounts` row with `id != DEMO_SCHOOL_ID`
- All arcade tables, learning sessions, parent reports for real users

### Cleanup Modes

**Activities only (safe, nightly reset):**
```bash
node --env-file=.env.local scripts/school-portal/reset-demo-school-activities.mjs --mode=activities
```
Archives activities + deletes status/attempt rows. Students, classes, and accounts untouched.

**Full wipe (owner operation only, destructive):**
```bash
node --env-file=.env.local scripts/school-portal/reset-demo-school-activities.mjs --mode=full
```
Deletes in cascade order: attempts → status → activities → class_students → enrollments → students → classes → teacher_limits → teacher_profiles → school_accounts → parent_profiles. Demo auth users are then deleted via Supabase admin API.

After full wipe, re-provisioning runs `seed-demo-school.mjs --phase=all` again.

### Safety Invariant

The `reset-demo-school-activities.mjs` script reads `DEMO_SCHOOL_ID` and `DEMO_PARENT_ID` from `sim-state.json` only. If `sim-state.json` is missing, the script exits with an error and does nothing. This prevents accidental deletion of non-demo data.

---

## 19. Credentials Summary

For planning documentation only. Passwords must be passed at runtime via env vars — never committed to code or test files.

| Account | Email | Role | Password env var | Used for |
|---|---|---|---|---|
| School manager | school@leo-k.com | school_admin | SCHOOL_QA_PASSWORD | Demo, QA |
| דן כהן | dan@leo-k.com | teacher | DEMO_TEACHER_PASSWORD | Math+Geometry grades 1–2 (12 separate class records: 6 math + 6 geometry) |
| ורד לוי | vered@leo-k.com | teacher | DEMO_TEACHER_PASSWORD | Math+Geometry grades 3–4 (12 separate class records: 6 math + 6 geometry) |
| נועם מזרחי | noam@leo-k.com | teacher | DEMO_TEACHER_PASSWORD | Math+Geometry grades 5–6 (12 separate class records: 6 math + 6 geometry) |
| שרה פרץ | sara@leo-k.com | teacher | DEMO_TEACHER_PASSWORD | English grades 1–2 |
| מיכל ביטון | michal@leo-k.com | teacher | DEMO_TEACHER_PASSWORD | English grades 3–4 |
| אלון אברהם | alon@leo-k.com | teacher | DEMO_TEACHER_PASSWORD | English grades 5–6 |
| רחל פרידמן | rachel@leo-k.com | teacher | DEMO_TEACHER_PASSWORD | Hebrew and Moledet/Geo grades 1–2 (12 separate class records: 6 hebrew + 6 moledet_geography) |
| יעל שפירא | yael@leo-k.com | teacher | DEMO_TEACHER_PASSWORD | Hebrew and Moledet/Geo grades 3–4 (12 separate class records: 6 hebrew + 6 moledet_geography) |
| דוד דוד | david@leo-k.com | teacher | DEMO_TEACHER_PASSWORD | Hebrew and Moledet/Geo grades 5–6 (12 separate class records: 6 hebrew + 6 moledet_geography) |
| לירון אזולאי | liron@leo-k.com | teacher | DEMO_TEACHER_PASSWORD | Science grades 1–3 |
| תמר יוסף | tamar@leo-k.com | teacher | DEMO_TEACHER_PASSWORD | Science grades 4–6 |
| משפחת הדגמה | demofamily@leo-k.com | parent | DEMO_PARENT_PASSWORD | DB scaffolding only |

Intended runtime values for demo/dev: `leo7479` for all. Must not appear in committed code.

---

## 20. File Deliverables

| File | Purpose |
|---|---|
| `docs/school-portal/FULL_SCHOOL_SIMULATION_PLAN.md` | This document |
| `scripts/school-portal/seed-demo-school.mjs` | Idempotent full seed (phased) |
| `scripts/school-portal/run-school-nightly-simulation.mjs` | Nightly ADVANCE / RESET simulation |
| `scripts/school-portal/reset-demo-school-activities.mjs` | Safe activity cleanup |
| `scripts/school-portal/verify-school-operational-controls.mjs` | Phase 2 operational controls verification (T13–T16) |
| `scripts/school-portal/sim-state.json` | Runtime state (gitignored) |
| `pages/api/school/students/[studentId]/class-transfer.js` | POST — student section transfer |
| `pages/api/school/classes/[classId]/assign-teacher.js` | PATCH — reassign class teacher |
| `pages/api/school/classes/[classId]/archive.js` | POST — archive a class |
| `pages/api/school/audit-log.js` | GET — paginated school audit log |
| `lib/school-server/school-operations.server.js` | Server library for all Phase 2 operations |

Existing scripts are not modified. They continue to be used in the test plan:
- `ensure-qa-school-manager.mjs` — reference for auth/profile pattern
- `verify-school-aggregation.mjs` — T3
- `compare-teacher-vs-school-apis.mjs` — T4
- `audit-school-data-truth.mjs` — T5
- `school-portal-security-matrix.mjs` — T2
- `verify-school-manager-login-flow.mjs` — T6
