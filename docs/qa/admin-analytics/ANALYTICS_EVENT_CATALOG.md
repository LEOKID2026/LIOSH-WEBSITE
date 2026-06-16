# Admin Analytics Event Catalog

Date: 2026-06-16

This catalog documents the long-term analytics event contract for the admin-only analytics center. `supabase/migrations/057_admin_analytics_events.sql` has not been applied yet; this catalog describes the final intended schema and instrumentation.

Scope note: teacher events in this catalog mean private-teacher / teacher portal usage only. No school analytics, school manager analytics, school staff analytics, or school dashboard analytics are added here.

## Global Rules

- Source of truth timestamp is `analytics_events.created_at` from the server/database.
- Client timestamps are not accepted as truth.
- Event failures must never break learning, parent reports, rewards, login, dashboard, or activity flows.
- Normal users never read `analytics_events`.
- Admin analytics reads events only through `/api/admin/analytics`.
- Metadata must be small and non-sensitive.

Forbidden in metadata:

- Child free text
- Answer text
- Prompts
- Expected answers
- User answers
- Report payloads
- Passwords
- Tokens
- Exact addresses
- National IDs
- Medical data
- Sensitive personal data

The ingestion endpoint and SQL check both block common sensitive metadata keys.

## Schema Fields

- `actor_type`: `parent`, `student`, `teacher`, `admin`, or `system`
- `actor_id`: auth user id for parent/teacher/admin, student id for student-cookie events
- `parent_id`: parent auth/profile id when known
- `student_id`: student id when known
- `session_id`: learning/session id when known
- `event_name`: catalog event
- `event_family`: auth/navigation/learning/report/activity/book/audio/worksheet/reward/admin/system
- `feature_key`: stable feature grouping for feature-usage analytics
- `object_type` / `object_id`: related entity reference without raw private content
- `page_path`: current route/query, capped
- `subject` / `topic` / `grade`: normalized context when known
- `device_type`: mobile/desktop/tablet
- `app_surface`: web by default
- `idempotency_key`: optional dedupe key for rerenders/polls/noisy events
- `metadata`: sanitized shallow object only

## Events

| Event | Actor | Where it fires | IDs / context | Metadata allowed | Deduplication | Type | Status |
|---|---|---|---|---|---|---|---|
| `parent_login` | parent | `pages/parent/login.js` after Supabase login success | actor from bearer, page path | none required | timestamp key from client | funnel/retention | fully instrumented |
| `teacher_login` | teacher | `pages/teacher/login.js` after teacher auth and `/api/teacher/me` success | actor from bearer | none required | timestamp key from client | funnel/retention | fully instrumented |
| `teacher_dashboard_opened` | teacher | `pages/api/teacher/dashboard.js` after dashboard payload succeeds | teacher actor id | phase | hourly per teacher/phase | feature/retention | fully instrumented |
| `teacher_report_opened` | teacher | teacher student/class report-data APIs after report payload succeeds | teacher actor id, student/class object | reportScope only | teacher/object/range key | report/feature | fully instrumented |
| `teacher_activity_created` | teacher | `pages/api/teacher/activities/index.js` after activity create succeeds | teacher actor id, activity id, subject/topic/grade | mode, questionCount | activity id | DB-truth duplicate + feature | fully instrumented |
| `teacher_worksheet_created` | teacher | `pages/api/teacher/worksheet-activities/index.js` after worksheet create succeeds | teacher actor id, worksheet id, subject | assignmentScope, questionCount | worksheet id | DB-truth duplicate + feature | fully instrumented |
| `parent_dashboard_opened` | parent | `pages/parent/dashboard.js` once per dashboard session | actor from bearer | none | `useRef` per page session | funnel/feature | fully instrumented |
| `child_created` | parent | `pages/parent/dashboard.js` after create-student success | student_id if API returns it, grade | grade | one event per successful create | DB-truth duplicate + funnel | fully instrumented |
| `parent_report_opened` | parent | `pages/learning/parent-report.js` after report payload loads | student_id, range metadata | period/from/to | one per successful report load/filter | report/funnel | fully instrumented |
| `parent_report_pdf_exported` | parent | `pages/learning/parent-report.js` before existing PDF export call | student_id | period | one per export click | report/feature | fully instrumented |
| `personal_activity_created` | parent | `components/parent/AssignActivityModal.js` after create activity success | student_id, subject/topic/grade, activityId metadata | activityId, mode, questionCount | one per successful create | DB-truth duplicate + funnel | fully instrumented |
| `personal_activity_results_opened` | parent | `components/parent/ParentSentActivitiesPanel.jsx` when results modal opens | student_id, subject/topic, object id | none | per click | feature/funnel | fully instrumented |
| `student_login` | student | `pages/api/student/login.js` after session row write | student_id, student_session id, grade | none | `student_login:{sessionId}` | funnel/retention | fully instrumented |
| `student_home_opened` | student | `pages/api/student/home-profile.js` after home profile builds | student_id, session_id, grade | none | hourly per student | funnel/retention | fully instrumented |
| `subject_opened` | student | `pages/api/learning/session/start.js` after learning session row write | student_id, session_id, subject/topic/grade | mode, level | `subject_opened:{sessionId}` | funnel/navigation | fully instrumented |
| `topic_opened` | student | `pages/api/learning/session/start.js` after learning session row write | student_id, session_id, subject/topic/grade | mode, level | `topic_opened:{sessionId}` | funnel/navigation | fully instrumented |
| `practice_started` | student | `pages/api/learning/session/start.js` after learning session row write | student_id, session_id, subject/topic/grade | mode, level | `practice_started:{sessionId}` | DB-truth duplicate + funnel | fully instrumented |
| `question_answered` | student | `pages/api/learning/answer.js`; parent activity answer path | student_id, session/activity, subject/topic/grade | isCorrect, mode/evidence/sourceType | answer/attempt idempotency | DB-truth duplicate + funnel | fully instrumented |
| `practice_completed` | student | `pages/api/learning/session/finish.js` after session finish write | student_id, session_id, subject/grade | duration, totalQuestions, accuracy, mode | `practice_completed:{sessionId}` | DB-truth duplicate + funnel | fully instrumented |
| `practice_abandoned` | student | Supported by schema/API/dashboard | student/session when available | reason/status only | session-based | abandonment | partially instrumented: dashboard also uses session-not-completed candidates |
| `book_opened` | student | `pages/api/learning/book-events.js` on `book_reading_session_start` | student_id, book session, subject/grade | entryPageId | clientSessionToken | DB-truth duplicate + feature/funnel | fully instrumented |
| `book_section_opened` | student | `pages/api/learning/book-events.js` on `book_page_visit_start` | student_id, visit id, subject/page/grade | pageId, batchId, sequenceIndex | clientVisitToken | DB-truth duplicate + feature/funnel | fully instrumented |
| `audio_played` | student | `HebrewAudioBuild1Panel`, `EnglishPhonicsAudioPanel` after successful play | student cookie/bearer, subject/topic/grade | taskMode, playbackKind, replayCount | one per successful play | feature/funnel | fully instrumented |
| `explanation_opened` | student | `pages/api/learning/answer.js` when afterStepByStep; parent activity answer when explanationViewed | student_id, answer/attempt id, subject/topic/grade | source/sourceType only | answer/attempt idempotency | feature/learning | fully instrumented for persisted learning contexts |
| `worksheet_opened` | student | `pages/api/student/worksheet-activities/[worksheetId]/pdf-url.js` after existing PDF open counter succeeds | student_id, worksheet id | fileRole | hourly per worksheet/student | DB-truth duplicate + feature | fully instrumented |
| `personal_activity_started` | student | `lib/parent-server/parent-activity.server.js` after parent activity status starts | parent_id, student_id, activity id, subject/topic/grade | mode | activity/student idempotency | funnel/activity | fully instrumented |
| `personal_activity_completed` | student | `lib/parent-server/parent-activity.server.js` after parent activity submit succeeds | parent_id, student_id, activity id, subject/topic | score/answers/correct counts | activity/student idempotency | funnel/activity | fully instrumented |
| `reward_earned` | student | learning session coin award; parent activity reward sync when coins awarded | student_id, session/activity id, subject/topic/grade | sourceType, coinsAwarded | source idempotency | DB-truth duplicate + feature | fully instrumented for learning + parent activity rewards |
| `admin_analytics_opened` | admin | `pages/admin/analytics.js` after dashboard loads | admin actor from bearer | filter selections | one per filter query in page session | admin feature | fully instrumented |
| `analytics_truth_check_run` | admin/system | Reserved for future truth-check scripts | admin/system | check name/result summary only | script-defined | admin/system | intentionally unavailable until a truth-check runner is added |
| `analytics_event_ingestion_error` | system | Reserved for safe server-side ingestion monitoring | no PII | eventName/errorCode only | server-defined | system | intentionally unavailable unless ingestion monitoring is needed |

## Deduplication Notes

- Server events use stable `idempotency_key` where an entity id exists.
- Poll/open events use an hourly or per-page-session key.
- Repeated intentional clicks, such as PDF export or audio replay, are allowed to create repeated usage events unless explicitly idempotent.

## DB Truth Duplicate vs Product Interaction

Some events intentionally duplicate DB truth:

- `practice_started` duplicates `learning_sessions`
- `question_answered` duplicates `answers` / activity attempts
- `personal_activity_created` duplicates `parent_assigned_activities`
- `book_opened` / `book_section_opened` duplicate book tables
- `worksheet_opened` duplicates worksheet counters
- `reward_earned` duplicates `coin_transactions`

Reason: these events power funnels, retention, and feature-usage analytics without reinterpreting multiple operational tables. Operational tables remain the source for numeric truth.
