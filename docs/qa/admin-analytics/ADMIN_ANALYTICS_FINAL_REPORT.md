# Admin Analytics Final Report

Date: 2026-06-16

## Verdict

PASS for the long-term admin-only analytics center foundation.

The dashboard is no longer treated as a tactical MVP. It now includes permanent sections for DB-truth metrics, event-tracked product usage, funnels, retention, abandonment, and feature usage. Sections with no real data show honest empty/not-enough-data states.

Important SQL status: `supabase/migrations/057_admin_analytics_events.sql` has **not** been applied to Supabase by the owner yet. It was modified in place because it is not applied. No extra patch migration was created.

Correction update, 2026-06-17: account growth, parent join-date, child join-date, and private-teacher analytics were added. No school analytics scope was added. `057_admin_analytics_events.sql` did not require another change for this correction because it already supports `actor_type='teacher'`, flexible event names, event families, feature keys, and idempotency.

## Files Changed

- `docs/qa/admin-analytics/AUDIT_EXISTING_DATA_SOURCES.md`
- `docs/qa/admin-analytics/ADMIN_ANALYTICS_IMPLEMENTATION_PLAN.md`
- `docs/qa/admin-analytics/ANALYTICS_EVENT_CATALOG.md`
- `docs/qa/admin-analytics/ADMIN_ANALYTICS_FINAL_REPORT.md`
- `components/admin/AdminShell.jsx`
- `lib/admin-portal/admin-ui.he.js`
- `lib/admin-server/admin-analytics.server.js`
- `pages/api/admin/analytics.js`
- `pages/admin/analytics.js`
- `supabase/migrations/057_admin_analytics_events.sql`
- `pages/api/analytics/events.js`
- `lib/analytics/event-catalog.js`
- `lib/analytics/track-event.server.js`
- `lib/analytics/track-event.client.js`
- `pages/teacher/login.js`
- `pages/api/teacher/dashboard.js`
- `pages/api/teacher/activities/index.js`
- `pages/api/teacher/worksheet-activities/index.js`
- `pages/api/teacher/students/[studentId]/report-data.js`
- `pages/api/teacher/classes/[classId]/report-data.js`
- `pages/api/student/login.js`
- `pages/api/student/home-profile.js`
- `pages/api/learning/session/start.js`
- `pages/api/learning/answer.js`
- `pages/api/learning/session/finish.js`
- `pages/api/learning/book-events.js`
- `pages/api/student/worksheet-activities/[worksheetId]/pdf-url.js`
- `lib/parent-server/parent-activity.server.js`
- `lib/learning-supabase/parent-activity-completion-reward.server.js`
- `pages/learning/parent-report.js`
- `components/HebrewAudioBuild1Panel.js`
- `components/EnglishPhonicsAudioPanel.js`
- `pages/learning/english-master.js`
- `pages/parent/login.js`
- `pages/parent/dashboard.js`
- `components/parent/AssignActivityModal.js`
- `components/parent/ParentSentActivitiesPanel.jsx`
- `scripts/tests/admin-analytics-selftest.mjs`

## Migration Status

- `057_admin_analytics_events.sql` was added and then modified in place.
- It has not been applied to Supabase yet.
- No new SQL migration was created to patch 057.
- No extra SQL change was needed for teacher/account/join-date analytics.

Creates `public.analytics_events` with:

- `event_version`
- `actor_type`, `actor_id`, `parent_id`, `student_id`, `session_id`
- `event_name`, `event_family`, `feature_key`
- `object_type`, `object_id`
- `page_path`, `subject`, `topic`, `grade`
- `device_type`, `app_surface`, `idempotency_key`
- sanitized `metadata`
- Required indexes
- Unique partial index on `idempotency_key`
- DB check against common sensitive metadata keys
- RLS enabled
- No broad authenticated read policy

After review and approval, you should run the final `057_admin_analytics_events.sql` manually in Supabase.

## Routes Added

- Admin page: `/admin/analytics`
- Admin API: `/api/admin/analytics`
- Event ingestion API: `/api/analytics/events`

## Admin Pages Added

- `pages/admin/analytics.js`

Hebrew-first, RTL, compact desktop dashboard with filters:

- Today
- Last 7 days
- Last 30 days
- Current month
- Custom date range
- Grade
- Subject
- Child active/inactive status

## APIs Added

- `/api/admin/analytics`
  - Uses `requireAdminApiContext`
  - Aggregates server-side with service role only after admin auth/entitlement
  - Returns metric status/source metadata

- `/api/analytics/events`
  - Supports student cookie auth and Supabase bearer auth
  - Inserts via service role
  - Sanitizes metadata
  - Rejects unauthenticated browser callers
  - Returns non-blocking skipped responses on insert/internal failures

## Existing DB Metrics Implemented

- Parent/profile counts
- Total children/students
- Children by grade
- Active/inactive child breakdowns
- Active children from `learning_sessions`
- Learning minutes from `learning_sessions.duration_seconds`
- Session counts and average session length
- Answer counts and accuracy from `answers`
- Daily sessions/minutes/questions/accuracy
- Subject/topic usage and usage by grade
- Short sessions and incomplete sessions as abandonment candidates
- Parent activity created/started/completed counts
- Parent activity completion rate and average score
- Parent activity by subject/topic/child grade
- Parent activity explanation viewed count
- Raw report truth checks from sessions/answers/activity/book rows
- Book sessions/page visits/dwell/pages read
- Worksheet PDF open counts
- Coin/reward counts from `coin_transactions`
- Account totals and join dates from `auth.users`, `account_persona_entitlements`, `parent_profiles`, `teacher_profiles`
- Parent join-date/onboarding metrics from `parent_profiles.created_at`, `students.created_at`, and all-time `learning_sessions`
- Child join-date/first-learning metrics from `students.created_at` and all-time `learning_sessions`
- Private-teacher metrics from `teacher_profiles`, `account_persona_entitlements`, `teacher_classes`, `teacher_students`, `student_activities`, `classroom_activities`, and `worksheet_activities`

## New Event-Tracked Metrics Implemented

Fully instrumented now:

- `admin_analytics_opened`
- `parent_login`
- `teacher_login`
- `teacher_dashboard_opened`
- `teacher_report_opened`
- `teacher_activity_created`
- `teacher_worksheet_created`
- `parent_dashboard_opened`
- `child_created`
- `parent_report_opened`
- `parent_report_pdf_exported`
- `personal_activity_created`
- `personal_activity_results_opened`
- `student_login`
- `student_home_opened`
- `subject_opened`
- `topic_opened`
- `practice_started`
- `question_answered`
- `practice_completed`
- `book_opened`
- `book_section_opened`
- `audio_played`
- `explanation_opened`
- `worksheet_opened`
- `personal_activity_started`
- `personal_activity_completed`
- `reward_earned`

Partially instrumented:

- `practice_abandoned`
  - Schema/API/dashboard support exists.
  - Dashboard also shows inferred candidates from sessions started but not completed and very short sessions.
  - Exact browser-unload abandonment is not broadly attached to all learning pages yet because unload/pagehide tracking can be unreliable and should not distort learning flows.

Intentionally unavailable for now:

- `analytics_truth_check_run`
  - Reserved for a dedicated truth-check runner.
- `analytics_event_ingestion_error`
  - Reserved for safe ingestion monitoring if needed.

## UI Sections Added

- Overview
- Children
- Learning
- Parent behavior
- Parent activities
- Reports / PDF / truth
- Books / audio / explanations / worksheets
- Rewards / coins
- Funnels
- Retention
- Abandonment
- Feature usage
- Account / registration growth
- Parent join-date and onboarding
- Child join-date and first-learning timing
- Private-teacher analytics

All advanced sections render now. Empty sections show:

- `אין נתונים עדיין`
- `אין מספיק נתונים עדיין`
- `דורש מעקב אירועים`
- `מקור נתונים חסר`

## Metrics Ready But Waiting For Real Event Data

- D1/D7/D30 retention
- Returning parents/children
- Parent/student funnels
- Report funnel
- Book/audio funnel
- Feature usage by grade/subject
- Report/PDF usage over time
- Audio/book/worksheet/explanation usage over time
- Reward event usage
- Teacher login/dashboard/report/activity/worksheet usage over time

## Account / Join-Date / Teacher Metrics Implemented

DB-truth immediately available:

- Total Auth accounts from `auth.users` via service-role admin API.
- Accounts by Auth `app_metadata.role`.
- Accounts by persona/status from `account_persona_entitlements`.
- Parent count and join dates from `parent_profiles.created_at`.
- Teacher/private-teacher count and join dates from `teacher_profiles.created_at` plus `account_persona_entitlements.persona='private_teacher'`.
- Admin count from `account_persona_entitlements.persona='admin'`.
- Unknown/unlinked accounts by comparing Auth users against parent/teacher profiles and persona entitlements.
- Persona entitlements missing parent/teacher profile by joining `account_persona_entitlements` with `parent_profiles` / `teacher_profiles`.
- Children added by day/week/month from `students.created_at`.
- Children active/inactive from `students.is_active`.
- Children added but never started learning from `students` + all-time `learning_sessions`.
- Child first learning date and days to first learning from `students.created_at` + all-time `learning_sessions.started_at`.
- Parent days to first child from `parent_profiles.created_at` + `students.created_at`.
- Private-teacher meaningful usage from teacher-owned tables: `teacher_classes`, `teacher_students`, `student_activities`, `classroom_activities`, `worksheet_activities`.

Requires `analytics_events` after 057 is manually applied:

- Teacher login/dashboard/report events.
- Parent onboarding funnel event steps beyond DB truth.
- Returning account/user behavior over time.

Unavailable / intentionally not added:

- School manager/staff/school dashboard analytics. This scope was explicitly not added.

## Security / RLS Notes

- Admin analytics page uses existing admin session pattern.
- Admin analytics API uses `requireAdminApiContext`.
- No RLS policy changes were made to existing tables.
- `analytics_events` has RLS enabled and no broad authenticated read policy.
- Normal users cannot read analytics rows through the new API.
- Event ingestion does not expose cross-user analytics reads.
- Event metadata blocks sensitive keys such as answers, prompts, report payloads, passwords, tokens, and address-like fields.
- The final SQL migration also blocks common sensitive metadata keys at DB level.
- No school analytics tables are queried by `lib/admin-server/admin-analytics.server.js`.

## Tests Run

- `ReadLints` on edited files: PASS
- `node scripts/tests/admin-analytics-selftest.mjs`: PASS
- `npm run build`: PASS

Build notes:

- Existing warning: port 3001 is in use, likely a dev server.
- Existing warning: `utils/question-metadata-qa/question-metadata-scanner.js` critical dependency due dynamic expression import.
- New routes appeared in build output:
  - `/admin/analytics`
  - `/api/admin/analytics`

## Build Result

PASS.

Last build completed successfully after final dashboard/event/schema changes.

## Known Limitations

- `analytics_events` metrics appear only after you manually apply `057` and real users generate events.
- Teacher event metrics appear only after `057` is applied and teacher flows are used.
- Retention metrics show not-enough-data until enough calendar time passes.
- Report truth comparison is conservative: it shows raw source checks and suspicious gaps, but does not claim a full report PASS for every child/range.
- Parent activity same/lower/higher grade analytics remains unavailable until real payload shape is verified.
- No screenshot QA was run for this page in this pass.

## Screenshot Paths

No screenshots captured in this implementation pass.

## Final PASS Criteria Check

- Admin analytics is admin-only: PASS.
- Numbers are real DB-derived sources: PASS.
- Dashboard separates DB truth / event-tracked / not-tracked metrics: PASS.
- No fake/demo data: PASS.
- Missing metrics are not shown as fake zero: PASS.
- Advanced dashboard sections exist: PASS.
- Empty/no-data/not-enough-data states exist: PASS.
- 057 is final and ready for manual review/execution: PASS.
- No unnecessary extra SQL migration created: PASS.
- Account/join-date analytics exist: PASS.
- Parent join-date analytics exist: PASS.
- Child join-date analytics exist: PASS.
- Teacher/private-teacher analytics exist: PASS.
- No school analytics were added: PASS.
- Date filters work through API query parsing and page controls: PASS.
- Core children/learning/parent activity metrics implemented: PASS.
- Tests/build pass: PASS.
