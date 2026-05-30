# School student creation — current product flow

## Primary flow (after this pass)

**Route:** `/school/students`  
**UI:** `SchoolStudentCreateForm` — name, grade, class, optional notes, optional login credentials  
**API:** `POST /api/school/students` with `{ fullName, gradeLevel, physicalClassName?, notes?, createLoginAccess? }`

### Server steps (`createSchoolManagedStudent`)

1. Validate name / grade; check `max_school_students` quota.
2. Insert row in `students` (technical parent = classroom sim parent — same pattern as private teacher-created students).
3. Insert `school_student_enrollments`.
4. If class selected → add roster rows to all subject `teacher_classes` for that physical class (`addSchoolStudentToPhysicalClass`).
5. If enabled → `createSchoolStudentAccess` (school-issued username + PIN, `created_by_school_id`).

Credentials shown once in UI via `SchoolCredentialShownOnceBox`.

## Advanced / legacy flow

**UI:** Collapsed «רישום תלמיד קיים (מתקדם — לפי מזהה)»  
**API:** `POST /api/school/students` with `{ studentId: UUID }` — enrolls an **existing** platform student only.

## Manager step-by-step

1. Ensure teachers and subject classes exist for the target grade/class (physical class name must match `teacher_classes.name`).
2. Open **תלמידים** → **הוספת תלמיד/ה חדש/ה**.
3. Enter name, choose grade and class, submit **יצירת תלמיד/ה**.
4. Copy username + PIN shown once; share with student/parent.
5. Browse grade → class to view student report.

## Deferred

- Dedicated `/school/students/new` route (form lives on index).
- Parent-linked student creation from school portal.
- Creating physical classes from manager UI (still requires teacher-side class setup).
