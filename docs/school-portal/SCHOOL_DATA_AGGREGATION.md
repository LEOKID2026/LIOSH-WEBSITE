# School manager data aggregation

## Source of truth (read path)

School manager visibility is **not** enrollment-only. For a given `school_id`:

1. **Teachers** — `school_teacher_memberships` (dashboard `teacherCount` = `role = 'teacher'` only; `staffCount` = all memberships).
2. **Classes** — `teacher_classes` where `teacher_id` is any school member (including `school_admin` if they own classes).
3. **Students** — union of:
   - `school_student_enrollments` (active),
   - `teacher_class_students` in those teachers' classes,
   - `teacher_students` for those teachers.
4. **Classroom activities** — `classroom_activities` where `teacher_id` is a school member.
5. **Reports** — class reports use the class owner's `teacher_id`; student reports resolve the first school teacher with `teacherHasReportAccessToStudent`.

`teacher_classes.school_id` / `classroom_activities.school_id` are **denormalized hints** (admin/backfill). Missing `school_id` on a row does **not** hide data if the owning teacher is in `school_teacher_memberships`.

## Enrollment (write path)

`school_student_enrollments` remains required for explicit school enrollment/unenrollment APIs. Listing and reports no longer require enrollment when the student is already visible via teacher/class links.

## Optional data backfill (owner runs manually)

Do **not** run from agent automation. Use only when legacy rows lack `school_id` but `teacher_profiles.school_id` or memberships are set:

```sql
-- Align class.school_id from teacher profile
update public.teacher_classes tc
set school_id = tp.school_id
from public.teacher_profiles tp
where tc.teacher_id = tp.id
  and tc.school_id is null
  and tp.school_id is not null;

-- Align classroom activities from teacher profile
update public.classroom_activities ca
set school_id = tp.school_id
from public.teacher_profiles tp
where ca.teacher_id = tp.id
  and ca.school_id is null
  and tp.school_id is not null;

-- Or from membership (when profile.school_id is null)
update public.teacher_classes tc
set school_id = stm.school_id
from public.school_teacher_memberships stm
where tc.teacher_id = stm.teacher_id
  and tc.school_id is null;

update public.classroom_activities ca
set school_id = stm.school_id
from public.school_teacher_memberships stm
where ca.teacher_id = stm.teacher_id
  and ca.school_id is null;
```

Backfill is **optional** after the aggregation code change; read APIs no longer depend on it.
