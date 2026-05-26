---
name: Full School Simulation Plan
overview: |
  Complete execution-ready demo/QA managed school for LEO KIDS. 18 physical classes × 6 separate subjects = 108 real teacher-owned class records. 11 teachers each owning their subject-class records (math and geometry are separate; hebrew and moledet_geography are separate). 398 students. 6 subjects. Phase 0 owner SQL gate required first (extend teacher_access_audit CHECK constraint). School Manager Operational Controls Phase 1 + Phase 2 both in current delivery scope (student transfer, class teacher reassign, class archive, audit log). Class merge is future only. Nightly simulation, 16-test suite, full delivery report. Full plan at docs/school-portal/FULL_SCHOOL_SIMULATION_PLAN.md.
todos:
  - id: write-plan-doc
    content: |
      docs/school-portal/FULL_SCHOOL_SIMULATION_PLAN.md written and verified — 108 class records (18 physical × 6 separate subjects), math and geometry fully separate, hebrew and moledet_geography fully separate, real subject teacher ownership, no teacher_students-only model, no service-role workaround, Phase 0 owner SQL gate, Phase 1 + Phase 2 operational controls in current delivery (transfer/reassign/archive/audit-log), class merge future only, precise cleanup strategy, operational demo flow, 16-test suite, acceptance criteria.
    status: completed
  - id: phase0-sql-gate
    content: |
      OWNER ACTION FIRST — Apply Phase 0 SQL gate in Supabase SQL editor. Extends teacher_access_audit CHECK constraint with three new values: school_student_class_transferred, school_class_teacher_reassigned, school_class_archived. Full SQL block in Section 9.3 of FULL_SCHOOL_SIMULATION_PLAN.md. Verify with: SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'teacher_access_audit_action_chk';
    status: completed
  - id: seed-script
    content: |
      Create scripts/school-portal/seed-demo-school.mjs — idempotent phased seed: --phase=accounts (demo parent + 12 auth users + teacher_profiles + teacher_limits), --phase=memberships (school_accounts + 12 memberships + subject grants + school_id backfill), --phase=classes (108 teacher_classes rows, 6 per physical class — each subject is a SEPARATE row with its own subject_focus and the correct teacher_id, all tagged school_id), --phase=students (398 students + 2,388 teacher_class_students rows + 398 school_student_enrollments). Writes sim-state.json with schoolId + student profiles.
    status: completed
  - id: nightly-script
    content: |
      Create scripts/school-portal/run-school-nightly-simulation.mjs — ADVANCE mode (timetable-driven, 108 activities/day across all 18 physical classes × 6 subject slots, achievement profiles, weak-topic scoring, sim-state.json tracking, idempotent), SEED-HISTORY mode (--days=10, all closed), RESET mode (archive activities, clear state; --full also removes students/classes). No Playwright — direct service-role inserts only.
    status: completed
  - id: reset-script
    content: |
      Create scripts/school-portal/reset-demo-school-activities.mjs — --mode=activities: archive activities + delete status/attempts, leave accounts/classes/students intact. --mode=full: cascade delete in safe order scoped to DEMO_SCHOOL_ID + DEMO_PARENT_ID from sim-state.json. Exits with error if sim-state.json is missing (safety invariant).
    status: completed
  - id: phase2-api-routes
    content: |
      Create Phase 2 operational API routes (all use requireSchoolManagerApiContext, all write teacher_access_audit, all return 403 for non-managers): pages/api/school/students/[studentId]/class-transfer.js (POST — transfers student across all 6 subject-class records atomically), pages/api/school/classes/[classId]/assign-teacher.js (PATCH — updates teacher_classes.teacher_id; new teacher must be school member with matching subject grant), pages/api/school/classes/[classId]/archive.js (POST — sets is_archived=true, archived_at=now()), pages/api/school/audit-log.js (GET — paginated teacher_access_audit scoped to school teacher IDs).
    status: completed
  - id: school-operations-lib
    content: |
      Create lib/school-server/school-operations.server.js — transferStudentBetweenSections, reassignClassTeacher, archiveSchoolClass, listSchoolAuditLog. All write teacher_access_audit entries with correct action values.
    status: completed
  - id: verify-operational-script
    content: |
      Create scripts/school-portal/verify-school-operational-controls.mjs — --check=all/transfer/reassign/archive/audit-log. Each check runs the operation, verifies counts/teacher-access/audit-entry, then reverses to leave clean state. Used in T13–T16 of the test suite.
    status: completed
  - id: verify-phase1
    content: |
      Pre-flight — verify 027 applied, Phase 0 gate confirmed (audit constraint has all three new values), existing school scripts pass, no prior demo school conflict.
    status: completed
  - id: provision-accounts
    content: Run seed-demo-school.mjs --phase=accounts → demo parent + 12 auth users + profiles + limits
    status: completed
  - id: provision-memberships
    content: Run seed-demo-school.mjs --phase=memberships → school_accounts + 12 memberships + subject grants + school_id backfill
    status: completed
  - id: provision-data
    content: Run seed-demo-school.mjs --phase=classes then --phase=students → 108 classes + 398 students + 2,388 teacher_class_students + 398 enrollments
    status: completed
  - id: seed-history
    content: Run run-school-nightly-simulation.mjs --mode=seed-history --days=10 → 10 school days of closed activities + status + attempts
    status: completed
  - id: run-test-suite
    content: |
      Run full 16-test suite: T1 build, T2 security matrix, T3 aggregation (classes=108 students=398), T4 API compare, T5 data truth, T6 login flow, T7 dry-run, T8 live advance, T9 browser/owner-admin, T10 browser/school-manager, T11 browser/3-teachers, T12 private-teacher-regression, T13 student-class-transfer, T14 class-teacher-reassign, T15 class-archive, T16 audit-log-api.
    status: cancelled
  - id: final-report
    content: Write final delivery report with exact results for all 16 tests
    status: completed
isProject: false
---

# LEO KIDS — Full School Simulation Plan

**Full document:** [`docs/school-portal/FULL_SCHOOL_SIMULATION_PLAN.md`](../../docs/school-portal/FULL_SCHOOL_SIMULATION_PLAN.md) (973 lines)

---

## Core Model (Revised)

### 18 Physical Classes → 108 Subject-Class Records

`teacher_classes.teacher_id` supports one owner per class record. Each subject teacher owns their own set of class records. **Math and geometry are never grouped — they are always separate class records.** **Hebrew and moledet_geography are never grouped — they are always separate class records.** A teacher who teaches two subjects (e.g., Vered teaches math and geometry for grades 3–4) owns 12 class records: 6 with `subject_focus=math` and 6 with `subject_focus=geometry`.

Per physical class (example: כיתה ג׳ 2 — 6 separate records):

| Subject | Teacher | `teacher_classes` row | `subject_focus` |
|---|---|---|---|
| math | ורד (Vered) | כיתה ג׳ 2 | math |
| geometry | ורד (Vered) | כיתה ג׳ 2 | geometry |
| english | מיכל (Michal) | כיתה ג׳ 2 | english |
| hebrew | יעל (Yael) | כיתה ג׳ 2 | hebrew |
| moledet_geography | יעל (Yael) | כיתה ג׳ 2 | moledet_geography |
| science | לירון (Liron) | כיתה ג׳ 2 | science |

**6 records per physical class × 18 physical classes = 108 total class records.**  
All six records share `name = "כיתה ג׳ 2"`, `grade_level = "3"`, differ by `subject_focus` (and sometimes `teacher_id`).  
All are tagged `school_id = DEMO_SCHOOL_ID`. All contain the same ~22 students via `teacher_class_students`.

---

## Teacher Roster (11 teaching teachers + 1 school manager)

All passwords: runtime env only — never committed.

| # | Display Name | Email | Grades | Subjects | Class Records Owned |
|---|---|---|---|---|---|
| 1 | דן כהן | dan@leo-k.com | 1–2 | math, geometry | 12 (6 math + 6 geometry, grades 1–2) |
| 2 | ורד לוי | vered@leo-k.com | 3–4 | math, geometry | 12 (6 math + 6 geometry, grades 3–4) |
| 3 | נועם מזרחי | noam@leo-k.com | 5–6 | math, geometry | 12 (6 math + 6 geometry, grades 5–6) |
| 4 | שרה פרץ | sara@leo-k.com | 1–2 | english | 6 (grades 1–2, subject_focus=english) |
| 5 | מיכל ביטון | michal@leo-k.com | 3–4 | english | 6 (grades 3–4, subject_focus=english) |
| 6 | אלון אברהם | alon@leo-k.com | 5–6 | english | 6 (grades 5–6, subject_focus=english) |
| 7 | רחל פרידמן | rachel@leo-k.com | 1–2 | hebrew, moledet_geography | 12 (6 hebrew + 6 moledet_geography, grades 1–2) |
| 8 | יעל שפירא | yael@leo-k.com | 3–4 | hebrew, moledet_geography | 12 (6 hebrew + 6 moledet_geography, grades 3–4) |
| 9 | דוד דוד | david@leo-k.com | 5–6 | hebrew, moledet_geography | 12 (6 hebrew + 6 moledet_geography, grades 5–6) |
| 10 | לירון אזולאי | liron@leo-k.com | 1–3 | science | 9 (grades 1–3, subject_focus=science) |
| 11 | תמר יוסף | tamar@leo-k.com | 4–6 | science | 9 (grades 4–6, subject_focus=science) |
| — | מנהל/ת בית הספר | school@leo-k.com | — | school_admin | 0 (not a teaching teacher) |

**No `teacher_students only` model. Every subject teacher owns real `teacher_classes` records.**  
**No service-role workaround. Every subject teacher creates `classroom_activities` through the normal teacher portal flow.**

---

## Student Linking Model

Each of the 398 students is linked to all 6 class records for their physical class via `teacher_class_students`:

- 398 students × 6 subject-class records = **~2,388 `teacher_class_students` rows**
- `teacher_students` direct links are **not used** — all visibility flows through `teacher_class_students`
- All 398 students are also in `school_student_enrollments` (school_id = DEMO_SCHOOL_ID)

School manager visibility (`loadSchoolVisibleStudentIds`) aggregates all six class rosters → union = 398 unique students.

---

## Activity Strategy (No Workaround)

Each subject teacher owns their class records → each teacher creates `classroom_activities` for their own classes. Every subject has its own class record — no two subjects share a class record.

| Subject | Teacher(s) | Activity type | Owns class? |
|---|---|---|---|
| math | דן / ורד / נועם | classroom_activities | Yes — owns math class records (subject_focus=math) |
| geometry | דן / ורד / נועם | classroom_activities | Yes — owns geometry class records (subject_focus=geometry) |
| english | שרה / מיכל / אלון | classroom_activities | Yes — owns english class records |
| hebrew | רחל / יעל / דוד | classroom_activities | Yes — owns hebrew class records (subject_focus=hebrew) |
| moledet_geography | רחל / יעל / דוד | classroom_activities | Yes — owns moledet_geography class records (subject_focus=moledet_geography) |
| science | לירון / תמר | classroom_activities | Yes — owns science class records |

Geometry activities are created by the math teacher on their **geometry class records** — not on math class records. Moledet_geography activities are created by the hebrew teacher on their **moledet_geography class records** — not on hebrew class records.

Individual `student_activities` are seeded for the bottom 15% struggling students (targeted remediation).

---

## Dashboard Stats (after seed)

| Stat | Value |
|---|---|
| teacherCount | 11 |
| staffCount | 12 |
| activeClassCount | 108 |
| studentCount | 398 |
| enrolledStudentCount | 398 |

---

## School Manager Operational Controls

### Phase 1 — Now (Existing APIs)

| Operation | API | Audit action |
|---|---|---|
| View teachers, classes, students, activities, dashboard | GET /api/school/* | — |
| Grant subject to teacher | POST /api/school/teachers/[id]/subjects | school_subject_granted |
| Revoke subject | DELETE /api/school/teachers/[id]/subjects/[subjectId] | school_subject_revoked |
| Open class report | GET /api/school/classes/[id]/report-data | school_class_viewed |
| Open student report | GET /api/school/students/[id]/report-data | school_student_report_viewed |
| Enroll / unenroll student | POST/DELETE /api/school/students/[id]/enrollment | school_student_enrolled / _unenrolled |

### Phase 0 — Owner Manual SQL Gate (Runs First, Before Any Scripts)

Before implementation begins, the owner applies one SQL statement in the Supabase SQL editor. This extends the `teacher_access_audit` action CHECK constraint to include three new values required by Phase 2 operations. Full SQL is in Section 9.3 of the main document.

New values: `school_student_class_transferred`, `school_class_teacher_reassigned`, `school_class_archived`

Verification: `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'teacher_access_audit_action_chk';`

### Phase 2 — Current Delivery Scope (New APIs, written in Phase 1)

| Operation | New API | Audit action |
|---|---|---|
| Move student between sections | POST /api/school/students/[id]/class-transfer | school_student_class_transferred |
| Reassign class teacher | PATCH /api/school/classes/[id]/assign-teacher | school_class_teacher_reassigned |
| Archive a class | POST /api/school/classes/[id]/archive | school_class_archived |
| View audit history | GET /api/school/audit-log | — |

Supporting library: `lib/school-server/school-operations.server.js`  
Verification script: `scripts/school-portal/verify-school-operational-controls.mjs` (T13–T16)

### Phase 3 — Future

- Merge classes (move all students from A → B, archive A)

---

## Execution Phases (Continuous After Approval)

| Phase | Who | What | Key output |
|---|---|---|---|
| **0** | **Owner manual** | Apply Phase 0 SQL gate in Supabase SQL editor | Constraint updated + verified |
| 1 | Agent | Write all scripts, API routes, server library | 3 seed/sim scripts + 4 API routes + school-operations.server.js + verify-school-operational-controls.mjs |
| 2 | Agent | Pre-flight checks | 027 + Phase 0 gate confirmed; existing scripts pass |
| 3 | Agent | `--phase=accounts` | 12 auth users + profiles |
| 4 | Agent | `--phase=memberships` | 12 memberships + subject grants |
| 5 | Agent | `--phase=classes` + `--phase=students` | 108 classes + 398 students + 2,388 class links + 398 enrollments |
| 6 | Agent | `--mode=seed-history --days=10` | 10 school days of closed activities |
| 7 | Agent | Full 16-test suite + delivery report | All tests pass |

---

## Acceptance Criteria (Key Items)

- [ ] 108 active class records visible to school manager (`activeClassCount = 108`)
- [ ] 398 students enrolled (`studentCount = enrolledStudentCount = 398`)
- [ ] 11 teachers (`teacherCount = 11`)
- [ ] Dan/Vered/Noam each see 12 class records: 6 math + 6 geometry (as separate entries)
- [ ] Rachel/Yael/David each see 12 class records: 6 hebrew + 6 moledet_geography (as separate entries)
- [ ] Sara/Michal/Alon each see their 6 english class records only
- [ ] Liron sees 9 science class records (grades 1–3); Tamar sees 9 (grades 4–6)
- [ ] No teacher sees another teacher's class records
- [ ] School manager can open all 108 class reports without error (math and geometry reports are distinct; hebrew and moledet_geography reports are distinct)
- [ ] School manager can open all 398 student reports without error
- [ ] Subject permissions grant/revoke creates audit entry
- [ ] Student transfer: all 6 subject-class records for source section lose student; all 6 for dest gain student; history intact; teacher visibility changes; audit entry created
- [ ] Class teacher reassignment: visibility changes; activity history preserved; audit entry created
- [ ] Class archive: `activeClassCount` drops; students remain enrolled; history preserved; audit entry created
- [ ] Audit log API returns 200 for school manager; 403 for others; entries scoped to school
- [ ] All Phase 2 APIs return 403 for non-school-manager tokens
- [ ] Nightly advance dry-run exits 0; live run advances `currentSchoolDay` by 1
- [ ] Private teacher token → 403 on all `/api/school/*`; own teacher portal unchanged
- [ ] Build passes; all 16 QA tests exit 0

---

## Cleanup Safety

All demo rows scoped by `DEMO_SCHOOL_ID` + `DEMO_PARENT_ID` from `sim-state.json`.  
Script aborts if `sim-state.json` is missing — prevents accidental production data deletion.  
Full table inventory with cascade order in Section 18 of the main document.
