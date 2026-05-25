# Teacher/student UI copy — pending owner approval

English placeholders were removed from production UI. The following keys still need **approved Hebrew** before the related UI is shown.

## Roster filter (`lib/teacher-portal/teacher-ui.he.js` → `rosterFilterLabelHe`)

| Key | Current English (removed) | Status |
|-----|---------------------------|--------|
| `teacher.roster.filter.allStudents` | All students | **Shown as** `הכל (N)` — reuses existing dashboard filter label |
| `teacher.roster.filter.class` | Class: {name} | **Shown as** `{className} (N)` — teacher-defined class name |
| `teacher.roster.filter.directStudents` | Direct students (no class) | **Hidden** until Hebrew returned for this key |

## Student home personal activities section

| Key | Current English (removed) | Status |
|-----|---------------------------|--------|
| `student.activities.personalSectionTitle` | Personal activities | **Hidden** via `personalActivitiesSectionTitleHe()` → `null` |
| `student.activities.individualBadge` | Individual | **Removed** (badge not shown) |

## Teacher student report — individual activities panel

Entire panel hidden unless `NEXT_PUBLIC_INDIVIDUAL_ACTIVITIES_ENABLED=true` **and** plan flag `individual_activities`.

When re-enabled, align copy with `pages/teacher/class/[classId]/activities/new.js` (כותרת, מקצוע, תצוגה מקדימה של שאלות, שמירה כטיוטה, etc.). Section title still needs owner string (was: "Individual activities for this student").

| Key | Current English (removed) |
|-----|---------------------------|
| `teacher.student.individualActivities.title` | Individual activities for this student |
| `teacher.student.individualActivities.createCta` | Create activity for this student |
| `teacher.student.individualActivities.cancel` | Cancel |
| `teacher.student.individualActivities.preview` | Preview questions |
| `teacher.student.individualActivities.saveActivate` | Save & activate |

## Admin (optional)

| Location | English |
|----------|---------|
| `components/admin/TeacherQuotaForm.jsx` | Individual student activities |
| `pages/admin/teachers/[teacherId].js` | Individual activities: |
