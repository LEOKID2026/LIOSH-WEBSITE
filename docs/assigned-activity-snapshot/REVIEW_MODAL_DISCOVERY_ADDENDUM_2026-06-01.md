# Assigned Activity Review Modal — Discovery Addendum

Date: 2026-06-01  
Scope: Section 1.9 / Phase 5 discovery for review modal coverage.

## Teacher / private teacher

| Area | Exists? | Files / routes | Data shown today | Gap |
|---|---|---|---|---|
| Classroom activity monitor | Yes | `pages/teacher/class/[classId]/activities/[activityId]/monitor.js`, button `צפה בתשובות` | Per-student modal via `TeacherActivityStudentAnswersModal` | Extended in this implementation with `questionKey`, `snapshotStatus`, legacy fallback |
| Classroom answer API | Yes | `GET /api/teacher/activities/[activityId]/students/[studentId]/answers` → `buildActivityStudentAnswersPayload` | Question text, choices, student/correct answers, accuracy | Now reads frozen snapshot + `question_key` |
| Individual student activity report | Partial | `GET /api/teacher/student-activities/[activityId]/report`, batch monitor links to report URL | Per-question rows when activity closed | Report link is not a modal; API now returns snapshot-aware `questions` |

## School manager / admin

| Area | Exists before? | Added in this implementation |
|---|---|---|
| Activity list | Yes — `GET /api/school/activities`, `SchoolActivityRow` on dashboard | Review link to `/school/activities/[activityId]/monitor` |
| Activity monitor | No | `pages/school/activities/[activityId]/monitor.js`, `GET /api/school/activities/[activityId]/monitor` |
| Student answer detail | No | `GET /api/school/activities/[activityId]/students/[studentId]/answers` with school scope gate in `lib/school-server/school-activity-review.server.js` |

Authorization: school manager sees only activities whose `teacher_id` is in the school roster (`loadSchoolScope`). No cross-account bridge to parent contexts.

## Parent / private parent

| Area | Exists? | Files / routes | Gap addressed |
|---|---|---|---|
| Sent activities panel | Yes | `components/parent/ParentSentActivitiesPanel.jsx`, button uses existing `parentViewActivityResultsLabelHe` | Modal previously showed attempt scores only; now renders `questions[]` with text, options, correct answer |
| Parent detail API | Yes | `GET /api/parent/activities/[activityId]` → `getParentActivityDetailForParent` | Response extended with `questions` from frozen snapshot reconstruction |

Parent context remains isolated to `parent_assigned_activities` / `parent_activity_attempts` only.

## API dependency summary

| Context | Read API | Uses `question_set` | Uses attempt `question_snapshot` fallback | Uses `question_key` |
|---|---|---|---|---|
| Teacher classroom | `/api/teacher/activities/.../answers` | Yes | Yes | Yes (when frozen) |
| Teacher individual report | `/api/teacher/student-activities/.../report` | Yes | Yes | Yes (when frozen) |
| School manager | `/api/school/activities/.../answers` | Yes (via teacher payload) | Yes | Yes (when frozen) |
| Parent | `/api/parent/activities/[activityId]` | Yes | Yes | Yes (when frozen) |

Reconstruction utility: `mapAssignedActivityQuestionAnswerDetail` in `lib/classroom-activities/assigned-activity-snapshot.server.js` (uses `mergeFrozenQuestionSources` / `frozen-activity-question.server.js`).

## Student side

No new student-facing review UI added (out of scope).
