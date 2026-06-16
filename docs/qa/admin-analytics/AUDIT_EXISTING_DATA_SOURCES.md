# Admin Analytics - Phase 0 Existing Data Source Audit

Date: 2026-06-16

Scope: internal admin analytics for the Hebrew learning site. This audit intentionally precedes UI, migration, and event-tracking work. The goal is to identify DB-truth sources that can safely power `/admin/analytics` without fake/demo values and without changing existing parent/student/teacher/school flows.

Update note: at audit time there was no applied `analytics_events` table. This branch now contains a final not-yet-applied migration at `supabase/migrations/057_admin_analytics_events.sql`; the owner still needs to review and run it manually in Supabase.

Correction note: the implemented owner analytics scope now includes account/registration growth, parent join-date analytics, child join-date analytics, and teacher/private-teacher analytics. School analytics are explicitly out of scope and were not added.

## Executive Verdict

Phase 1 can safely implement an admin-only analytics MVP from existing DB truth for:

- Parents/auth users and parent profiles.
- Students/children, parent-child relation, grade, active flag.
- Student login/session activity from `student_sessions`.
- Learning sessions, learning minutes, subjects, topics, status, and duration from `learning_sessions`.
- Question answers, correctness, subject/topic/grade metadata from `answers.answer_payload`.
- Parent-assigned activities, status, attempts, scores, and timing from `parent_assigned_activities`, `parent_activity_status`, and `parent_activity_attempts`.
- Teacher/classroom/student/worksheet activity truth where needed, from existing server-owned activity tables.
- Book reading/session/page usage when `book_reading_sessions` and `book_page_visits` are enabled.
- Rewards/coins from `coin_transactions` and `student_coin_balances`.
- Parent report source totals by reusing the existing report aggregation code, not by reimplementing report behavior.

Phase 1 must not claim DB truth for:

- Parent report opens.
- Parent report PDF exports.
- Parent dashboard opens.
- Audio play counts.
- Explanation opens outside already-persisted attempt fields.
- General page/feature usage.
- Practice abandonment beyond inferable session/answer heuristics.

Those require Phase 2 `analytics_events` or a dedicated existing counter if one is later found.

## 1. Parents / Auth Users

### Exact Tables Found

`auth.users`

- Supabase Auth user rows. Existing admin code reads this via `serviceRole.auth.admin.listUsers()` and `serviceRole.auth.admin.getUserById()`.
- Admin role is checked from `user.app_metadata.role === "admin"`.

`parent_profiles` from `supabase/migrations/001_learning_core_foundation.sql`

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text`
- `preferred_language text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

`account_persona_entitlements` from `supabase/migrations/040_account_persona_entitlements.sql` (referenced by code)

- Used for persona access checks: `parent`, `admin`, `private_teacher`, etc.
- Exact fields were not fully expanded in this audit pass, but code references `user_id`, `persona`, `status`, `created_at`.

`parent_account_settings` from `supabase/migrations/041_parent_account_settings.sql` (referenced by code)

- Code references:
  - `parent_user_id`
  - `plan_code`
  - `account_status`
  - `subscription_status`
  - `max_children`
  - `reports_enabled`
  - `copilot_enabled`
  - `advanced_diagnostics_enabled`
  - `export_enabled`
  - `monthly_ai_limit`
  - `monthly_report_limit`
  - `billing_provider`
  - `provider_customer_id`
  - `provider_subscription_id`
  - `trial_ends_at`
  - `current_period_ends_at`
  - `created_at`
  - `updated_at`

### Code Paths Found

- `lib/admin-server/admin-parent-settings.server.js`
  - `listAdminParents(serviceRole)` reads `account_persona_entitlements`, Auth users, and `parent_profiles`.
  - `getAdminParentDetail(serviceRole, parentUserId)` reads Auth user, parent entitlement, `parent_profiles`, and `parent_account_settings`.
- `pages/admin/parents/index.js`
  - Existing admin parent page.
- `pages/api/admin/parents/index.js`
  - Existing admin parent API.
- `pages/parent/login.js`
  - Parent login flow; rejects `teacher` and `admin` roles in metadata.
- `pages/parent/dashboard.js`
  - Parent dashboard uses Supabase browser session and parent APIs.

### Metrics Available Today

- Total auth users, if counted through Admin API/service role.
- Total parent profiles from `parent_profiles`.
- Total entitled parent accounts from `account_persona_entitlements where persona='parent'`.
- Parents with/without children by joining `parent_profiles`/entitlements to `students.parent_id`.
- Parent account status/plan/report-feature availability from `parent_account_settings`.

### Not Available Yet

- Parent active today/7/30 from page usage is not tracked.
- Parent dashboard opens are not tracked.
- Parent report opens are not tracked.
- Parent PDF exports are not tracked.

## 2. Children / Students

### Exact Tables Found

`students` from `001_learning_core_foundation.sql`

- `id uuid primary key default gen_random_uuid()`
- `parent_id uuid not null references parent_profiles(id) on delete cascade`
- `full_name text not null`
- `grade_level text`
- `is_active boolean not null default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

`student_access_codes`

- `id uuid primary key default gen_random_uuid()`
- `student_id uuid not null references students(id)`
- `code_hash text not null`
- `pin_hash text not null`
- `is_active boolean not null default true`
- `revoked_at timestamptz`
- `expires_at timestamptz`
- `created_at`
- `updated_at`

`student_sessions`

- `id uuid primary key default gen_random_uuid()`
- `student_id uuid not null references students(id)`
- `access_code_id uuid references student_access_codes(id)`
- `session_token_hash text not null`
- `started_at timestamptz default now()`
- `last_seen_at timestamptz default now()`
- `ended_at timestamptz`
- `client_meta jsonb default '{}'`
- `created_at timestamptz default now()`

Later code also supports optional `expires_at` and `revoked_at` on `student_sessions`.

### Code Paths Found

- `lib/learning-supabase/student-auth.js`
  - Validates student session cookie.
  - Loads `student_sessions`, `student_access_codes`, and `students`.
  - Requires `students.is_active === true`.
- `pages/api/student/login.js`
  - Student login endpoint.
- `pages/api/parent/create-student.js`, `pages/api/parent/list-students.js`, `pages/api/parent/update-student.js`
  - Parent child-management APIs exist.
- `pages/parent/dashboard.js`
  - Parent creates, edits, deletes, and views child cards.

### Metrics Available Today

- Total children/students.
- Children by grade.
- Active/inactive children from `students.is_active`.
- Children created by day/month from `students.created_at`.
- Children with/without active access codes.
- Student login/session activity from `student_sessions.started_at` and `last_seen_at`.
- Children created but never started learning by checking no `learning_sessions` rows.

### Not Available Yet

- Precise student home page opens are not tracked unless inferred from `student_sessions.last_seen_at`.
- Device type/app surface for student usage is not reliably tracked in existing rows.

## 3. Learning Sessions

### Exact Tables Found

`learning_sessions` from `001_learning_core_foundation.sql`

- `id uuid primary key default gen_random_uuid()`
- `student_id uuid not null references students(id)`
- `subject text`
- `topic text`
- `started_at timestamptz default now()`
- `ended_at timestamptz`
- `duration_seconds integer not null default 0 check >= 0`
- `status text not null default 'active'`
- `metadata jsonb not null default '{}'`
- `created_at`
- `updated_at`

### Code Paths Found

- `pages/api/learning/session/start.js`
  - Authenticates student cookie.
  - Inserts `learning_sessions` with `student_id`, `subject`, `topic`, `started_at`, `status='active'`, and `metadata`.
  - Metadata includes `mode`, `level`, `registeredGradeLevel`, `contentGradeLevel`, `gradeRelation`, and `gradeLevel`.
- `pages/api/learning/session/finish.js`
  - Authenticates student cookie.
  - Verifies ownership.
  - Updates `ended_at`, `duration_seconds`, `status='completed'`, and `metadata.summary`.
  - Calls coin award and daily mission progress, with failures isolated.
- `lib/parent-server/report-data-aggregate.server.js`
  - Fetches sessions by `started_at` or fallback `created_at`.
  - Aggregates `duration_seconds`, subject/topic activity, modes, and evidence timestamps.
- `lib/learning-supabase/monthly-persistence-reward.server.js`
  - Uses `learning_sessions.duration_seconds` and `status='completed'` as reward source truth.
- `lib/learning-supabase/student-learning-profile.server.js`
  - Uses `learning_sessions` for derived student profile.

### Metrics Available Today

- Active children today/7/30 based on distinct `student_id` in `learning_sessions` by `started_at`.
- Total learning minutes by date range from `sum(duration_seconds) / 60`.
- Sessions by day.
- Sessions by subject/topic/grade via `subject`, `topic`, `students.grade_level`, and `metadata.gradeLevel`.
- Average session length from `duration_seconds`.
- Short-session / abandonment candidates from completed sessions with low `duration_seconds`, and active sessions that never finished.
- Children inactive for 7/30 days by last `learning_sessions.started_at`.

### Caveats

- `duration_seconds` is written by the client to the finish endpoint and then persisted server-side. It is DB truth, but not a server stopwatch.
- Open/abandoned sessions can be inferred but not perfectly classified without event tracking.

## 4. Answers / Attempts

### Exact Tables Found

`answers` from `001_learning_core_foundation.sql`

- `id uuid primary key default gen_random_uuid()`
- `student_id uuid not null references students(id)`
- `learning_session_id uuid references learning_sessions(id)`
- `question_id text not null`
- `answer_payload jsonb not null default '{}'`
- `is_correct boolean`
- `answered_at timestamptz default now()`
- `created_at timestamptz default now()`

### Code Paths Found

- `pages/api/learning/answer.js`
  - Authenticates student.
  - Verifies `learning_session_id` belongs to student.
  - Inserts into `answers`.
  - `answer_payload` includes:
    - `subject`
    - `topic`
    - `questionFingerprint`
    - `prompt`
    - `expectedAnswer`
    - `userAnswer`
    - `questionEngine`
    - `hintsUsed`
    - `timeSpentMs`
    - `rawTimeSpentMs`
    - `creditedTimeMs`
    - `timingStatus`
    - `clientMeta`
    - `registeredGradeLevel`
    - `contentGradeLevel`
    - `gradeRelation`
    - `gradeLevel`
    - `gameMode`
    - `evidenceCategory`
    - `isDiagnosticEligible`
    - `contextFlags`
- `lib/parent-server/report-data-aggregate.server.js`
  - Fetches `answers` by `answered_at` or fallback `created_at`.
  - Uses `answer_payload` for subject/topic/grade/mode/timing/evidence classification.

### Metrics Available Today

- Total answered questions today/7/30/date range.
- Average questions per active child.
- Average accuracy.
- Accuracy by day/subject/topic/grade.
- Topics with high wrong-answer rate.
- Topics with high success rate.
- Topics with low usage.
- Children with only 1-3 answered questions and no continuation.

### Privacy Note

`answers.answer_payload` currently stores prompt/expected answer/user answer as part of the official learning answer system. Admin analytics must not copy answer text into any future `analytics_events` table.

## 5. Parent-Assigned Activities

### Exact Tables Found

`parent_assigned_activities` from `051_parent_assigned_activities.sql`

- `id uuid primary key default gen_random_uuid()`
- `parent_id uuid not null references parent_profiles(id)`
- `student_id uuid not null references students(id)`
- `title text not null`
- `subject text not null`
- `topic text not null`
- `subtopic text null`
- `skill_key text null`
- `difficulty_level text null`
- `question_count integer not null`
- `mode text not null check in ('guided_practice', 'homework')`
- `question_set jsonb not null default '[]'`
- `due_at timestamptz`
- `status text default 'active' check in ('active', 'closed', 'archived')`
- `activated_at timestamptz default now()`
- `closed_at timestamptz`
- `archived_at timestamptz`
- `created_at`
- `updated_at`

`parent_activity_status`

- `id uuid primary key default gen_random_uuid()`
- `activity_id uuid not null`
- `student_id uuid not null references students(id)`
- `status text default 'not_started' check in ('not_started', 'in_progress', 'submitted')`
- `started_at timestamptz`
- `submitted_at timestamptz`
- `last_seen_at timestamptz`
- `answers_count integer default 0`
- `correct_count integer default 0`
- `score_pct numeric(5,2)`
- `created_at`
- `updated_at`

`parent_activity_attempts`

- `id uuid primary key default gen_random_uuid()`
- `activity_id uuid not null`
- `student_id uuid not null references students(id)`
- `question_index integer not null`
- `skill_key text`
- `question_snapshot jsonb default '{}'`
- `selected_answer text`
- `correct_answer text`
- `is_correct boolean`
- `time_spent_ms integer`
- `hints_used integer default 0`
- `explanation_viewed boolean default false`
- `answered_at timestamptz`
- `created_at`

`055_phase3_raw_credited_time_columns.sql` adds optional columns:

- `raw_time_spent_ms integer`
- `credited_time_ms integer`
- `timing_status text`

### Code Paths Found

- `lib/parent-server/parent-activity.server.js`
  - Creates, lists, starts, answers, submits, and reports parent activities.
  - Inserts `parent_assigned_activities`.
  - Inserts/updates `parent_activity_status`.
  - Upserts `parent_activity_attempts`.
  - Syncs completion rewards after submit.
- `pages/api/parent/activities/index.js`
- `pages/api/parent/activities/[activityId].js`
- `pages/api/student/activities/[activityId]/answer.js`
- `components/parent/AssignActivityModal.js`
- `components/parent/ParentSentActivitiesPanel.jsx`
- `lib/learning-supabase/parent-activity-learning-credit.server.js`
  - Credits parent activity time to learning/report progress.
- `lib/learning-supabase/parent-activity-completion-reward.server.js`
  - Awards parent activity completion rewards.
- `lib/parent-server/report-data-aggregate.server.js`
  - Includes parent activity attempts in report aggregation.

### Metrics Available Today

- Activities created, started, completed/submitted.
- Completion rate.
- Average score.
- By subject/topic.
- Activities created but never started.
- Activities started but not completed.
- Parent activity answers/correctness/timing.
- Explanation viewed within parent activity attempts via `explanation_viewed`.

### Partially Available

- Content grade vs child profile grade may be derivable from `question_snapshot`, `skill_key`, and grade evidence if present. Must verify row payloads before presenting same/lower/higher counts as DB truth.

## 6. Parent Reports

### Exact Tables Found

`parent_reports` from `001_learning_core_foundation.sql`

- `id uuid primary key default gen_random_uuid()`
- `student_id uuid not null references students(id)`
- `report_type text not null`
- `report_payload jsonb default '{}'`
- `source_range jsonb default '{}'`
- `created_at`
- `updated_at`

No clear current code path was found that writes or reads `parent_reports` for the live parent report page.

### Code Paths Found

- `pages/api/parent/students/[studentId]/report-data.js`
  - Parent-only API guarded by `requireParentApiContext(..., { requireFeature: "reports_enabled" })`.
  - Verifies `students.parent_id = parentUserId`.
  - Calls `aggregateParentReportPayload(serviceClient, student, fromDate, toDate, { includeParentActivities: true })`.
  - Attaches student learning account data and parent-facing enrichment.
  - Returns `stripInternalReportPayloadFields(enriched)`.
- `lib/parent-server/report-data-aggregate.server.js`
  - Raw source reads:
    - `learning_sessions`
    - `answers`
    - `parent_activity_attempts`
    - `book_page_visits`
    - `book_reading_sessions`
  - Applies report duration sanity and evidence classification.
- `pages/learning/parent-report.js`
  - Parent report UI.
  - Uses `parentReportRemoteDataUrl(...)` from `lib/teacher-portal/parent-report-remote-source.js`.
- `utils/math-report-generator` exports `exportReportToPDF` used in `pages/learning/parent-report.js`.

### Metrics Available Today

- Raw learning session count for a selected range.
- Raw answer count for a selected range.
- Raw learning minutes for a selected range.
- Raw parent-assigned activity attempts for a selected range.
- Report-source totals by running the same server aggregation function used by the report API.
- Potential comparisons between raw DB totals and aggregation payload totals, if carefully labeled as a truth check.

### Not Available Yet

- Parent report open count.
- Parent report PDF export count.
- Persisted report generation count, unless `parent_reports` is actively used in an uninspected path.

### Risks

- Reimplementing report calculations separately could recreate past report-truth bugs. Admin analytics should call shared server aggregation helpers or explicitly compare raw table totals against report aggregation output.
- Do not change parent report behavior while adding analytics.

## 7. Rewards / Coins

### Exact Tables Found

`student_coin_balances`

- `student_id uuid primary key references students(id)`
- `balance integer default 0`
- `lifetime_earned integer default 0`
- `lifetime_spent integer default 0`
- `created_at`
- `updated_at`

`coin_transactions`

- `id uuid primary key default gen_random_uuid()`
- `student_id uuid not null references students(id)`
- `direction text check in ('earn', 'spend', 'adjust', 'reversal')`
- `amount integer not null`
- `reason text not null`
- `source_type text`
- `source_id text`
- `idempotency_key text`
- `metadata jsonb default '{}'`
- `created_by text default 'system'`
- `created_at`

`coin_reward_rules`

- `rule_key`, `enabled`, `subject`, `event_type`, `amount`, `daily_cap`, `cooldown_seconds`, `criteria`, timestamps.

### Code Paths Found

- `pages/api/learning/session/finish.js`
  - Calls `awardLearningSessionCoins`.
- `lib/learning-supabase/monthly-persistence-reward.server.js`
  - Uses `learning_sessions.duration_seconds` and `coin_transactions`.
- `lib/learning-supabase/parent-activity-completion-reward.server.js`
  - Awards coins for parent activity completion.
- `lib/arcade/server/arcade-coins.js`
  - Arcade earn/spend/refund coin transactions.
- `pages/api/parent/students/[studentId]/coin-history.js`
  - Parent coin history API reads `student_coin_balances` and `coin_transactions`.

### Metrics Available Today

- Coins earned/spent/adjusted/reversed by day.
- Rewards/coin transactions by reason/source type/subject if metadata/source fields contain subject.
- Children earning rewards.
- Active children with no coin transactions in selected range.

### Caveats

- UI-only streak reward modals in learning pages are not DB reward events unless backed by `coin_transactions`.

## 8. Books / Audio / Explanations / Worksheets

### Books

`book_reading_sessions` from `056_book_reading_tracking.sql`

- `id`
- `student_id`
- `subject`
- `grade`
- `started_at`
- `ended_at`
- `total_raw_dwell_ms`
- `total_credited_dwell_ms`
- `total_hidden_tab_ms`
- `pages_read_count`
- `pages_skipped_count`
- `triggered_cta`
- `cta_page_id`
- `client_session_token`
- `metadata`
- `created_at`
- `updated_at`

`book_page_visits`

- `id`
- `book_reading_session_id`
- `student_id`
- `subject`
- `grade`
- `page_id`
- `batch_id`
- `sequence_index`
- `started_at`
- `ended_at`
- `raw_dwell_ms`
- `credited_dwell_ms`
- `hidden_tab_ms`
- `sections_viewed integer[]`
- `sections_skipped integer[]`
- `page_read boolean`
- `triggered_cta boolean`
- `client_visit_token`
- `metadata`
- `created_at`

Code paths:

- `pages/api/learning/book-events.js`
- `lib/learning-supabase/book-events.server.js`
- `lib/parent-server/report-data-aggregate.server.js`

Available metrics:

- Book sessions.
- Book page visits.
- Pages read/skipped.
- Book dwell time.
- Usage by subject/grade/page.
- CTA trigger counts.

### Audio

Code paths found:

- `components/HebrewAudioBuild1Panel.js`
- `components/EnglishPhonicsAudioPanel.js`
- `utils/audio-playback-core.js`
- `pages/api/hebrew-audio-ensure.js`
- `pages/api/hebrew-audio-artifact.js`

Current behavior:

- Audio play count is component state (`replayCount`) and not persisted to DB.
- Hebrew audio ensure/artifact APIs support audio generation/artifact handling, but no analytics table was found for audio play events.

Available metrics:

- Audio question availability may be inferred from answer payload/question metadata if present, but not actual plays.

Requires `analytics_events`:

- `audio_played`.
- Audio usage by grade/subject.

### Explanations

Available today:

- Parent/teacher/classroom/student activity attempt tables have `explanation_viewed boolean`.
- Free learning answer payload has `clientMeta.afterStepByStep` and classification flags for step-by-step context.

Not available:

- Generic explanation open events outside attempt rows.

### Worksheets

`worksheet_activities`, `worksheet_files`, `worksheet_questions`, `worksheet_student_status`, `worksheet_student_answers` from `029_worksheet_activities.sql`.

Important fields:

- `worksheet_activities`: `teacher_id`, `class_id`, `school_id`, `title`, `subject`, `worksheet_mode`, `question_count`, `status`, timestamps.
- `worksheet_student_status`: `pdf_first_opened_at`, `pdf_last_opened_at`, `pdf_open_count`, completion/submission/grading fields.
- `worksheet_student_answers`: digital answer and grading fields.

Available metrics:

- Worksheet activities created/active/closed.
- PDF open counts.
- First/last worksheet open.
- Digital submissions and grading status.

## 9. Admin / Security

### Existing Admin UI Pattern

- Admin pages live under `pages/admin/*`.
- Existing route examples:
  - `pages/admin/parents/index.js`
  - `pages/admin/teachers/index.js`
  - `pages/admin/schools/index.js`
  - `pages/admin/accounts/index.js`
- Admin pages use:
  - `components/admin/AdminShell`
  - `lib/admin-portal/use-admin-session`
  - `adminAuthFetch(token, "/api/admin/...")`

### Existing Admin API Pattern

- Admin APIs live under `pages/api/admin/*`.
- Existing APIs call `requireAdminApiContext(res, req.headers.authorization || "")`.
- `requireAdminApiContext`:
  - Requires `Authorization: Bearer ...`.
  - Validates Supabase Auth user.
  - Requires `user.app_metadata.role === "admin"`.
  - Requires active `admin` persona entitlement via `assertActivePersonaEntitlement`.
  - Returns `serviceRole: getLearningSupabaseServiceRoleClient()`.

### Service Role Pattern

- `lib/learning-supabase/server.js`
  - `getLearningSupabaseServiceRoleClient()` uses `LEARNING_SUPABASE_SERVICE_ROLE_KEY`.
  - Server only.
  - Bypasses RLS for trusted API routes.

### RLS Pattern

- Core parent-owned tables have parent read/write policies where appropriate.
- Server-owned tables often enable RLS and intentionally add no broad authenticated policies.
- Existing admin APIs use service-role after admin entitlement checks.

### Admin Analytics Security Recommendation

- Use `/admin/analytics` and `/api/admin/analytics`.
- Reuse `AdminShell`, `useAdminSession`, `adminAuthFetch`.
- Reuse `requireAdminApiContext`.
- Aggregate server-side only; do not send raw child answer text or full raw rows to the browser.
- No RLS changes are required for Phase 1 if the API uses the existing admin service-role pattern.

## 10. Metrics Calculable Today From Existing DB Truth

### Overview

- Total parents from `parent_profiles`, `account_persona_entitlements`, and/or Auth users.
- Total children/students from `students`.
- Active children today/7/30 from distinct `learning_sessions.student_id`.
- Total learning minutes from `learning_sessions.duration_seconds`.
- Total answered questions from `answers`.
- Average minutes/questions per active child.
- Average accuracy from `answers.is_correct`.
- Number of learning sessions.
- Average session length.

### Children

- Children by grade.
- Active children by grade.
- Children with no learning sessions.
- Children created but never started learning.
- Children inactive for 7/30 days.
- Children with very short sessions.
- Children with 1-3 answered questions and no continuation.
- Average learning minutes by grade.
- Average accuracy by grade.

### Learning

- Sessions by day.
- Learning minutes by day.
- Questions by day.
- Accuracy by day.
- Top subjects/topics.
- Subject/topic usage by grade.
- Short session candidates.
- High wrong-answer topics.
- High success topics.
- Low usage topics.

### Parent Analytics

- Total parents.
- Parents with at least one child.
- Parents without children.
- Parents whose children are active/inactive by child learning activity.
- Parents who created personal activities from `parent_assigned_activities`.
- Parents registered but no child/no child learning/no meaningful usage.

### Parent Activities

- Activities created/started/submitted.
- Completion rate.
- Average score.
- By subject/topic.
- Created but never started.
- Started but not completed.

### Report Truth

- Raw session/answer/minute/activity counts.
- Report-source totals via existing aggregation helper.
- Suspected gaps where raw rows exist but report aggregation returns zero, if safely detectable.

### Books / Worksheets / Rewards

- Book sessions/page visits/dwell/page reads from book tables.
- Worksheet PDF opens from worksheet status.
- Coins/rewards from `coin_transactions` and balances.

## 11. Metrics Not Calculable Yet

- Parent active today/7/30 from actual parent page usage.
- Parent dashboard opens.
- Parent report opens.
- Parent report PDF exports.
- Audio plays.
- Generic feature usage.
- Student home opens.
- Subject/topic open without a learning session.
- Practice started/completed/abandoned as explicit funnel events beyond session/answer inference.
- Book section opens as explicit event names beyond `sections_viewed` arrays in page visit rows.
- Explanation opens outside persisted attempt fields.
- Worksheet opens outside worksheet PDF counters.
- Retention/funnels by precise page/event transitions.

## 12. Metrics Requiring New Event Tracking

Requires Phase 2 `analytics_events`:

- `parent_login`
- `parent_dashboard_opened`
- `child_created` as a product event, even though child rows already exist
- `parent_report_opened`
- `parent_report_pdf_exported`
- `personal_activity_created` as a product event, even though activity rows already exist
- `personal_activity_results_opened`
- `student_login`
- `student_home_opened`
- `subject_opened`
- `topic_opened`
- `practice_started`
- `question_answered` as an event, if funnel-level event timing is needed beyond `answers`
- `practice_completed`
- `practice_abandoned`
- `book_opened`
- `book_section_opened`
- `audio_played`
- `explanation_opened`
- `worksheet_opened`
- `personal_activity_started`
- `personal_activity_completed`
- `reward_earned` as an event, if feature funnel usage is needed beyond `coin_transactions`
- `admin_analytics_opened`
- `analytics_truth_check_run`

## 13. Risks / Missing Truth Sources

- Do not show missing metrics as `0`; use "עדיין לא נמדד" or "דורש מעקב אירועים".
- Do not fetch massive raw tables to the client.
- Do not duplicate parent-report logic. Use or compare against `aggregateParentReportPayload`.
- Do not store answer text in future analytics events.
- Avoid presenting inferred abandonment as exact behavior. Label it as "candidates".
- Parent activity grade relation must be verified from actual row payloads before surfacing as exact same/lower/higher analytics.
- Book tracking may be feature-flagged; if disabled or tables missing, show not tracked rather than zero.
- `parent_reports` table exists but live report page appears aggregation-based, not persisted-report based.
- Audio play usage is browser-only today.

## 14. Recommended Phased Implementation

### Phase 1 - Safe DB Truth MVP

Implement:

- `pages/admin/analytics.js`
- `pages/api/admin/analytics.js` or smaller grouped admin analytics APIs.
- `lib/admin-server/admin-analytics.server.js`

Use existing service-role admin API pattern. Aggregate from:

- `parent_profiles`
- `account_persona_entitlements`
- `parent_account_settings`
- `students`
- `student_sessions`
- `learning_sessions`
- `answers`
- `parent_assigned_activities`
- `parent_activity_status`
- `parent_activity_attempts`
- `book_reading_sessions`
- `book_page_visits`
- `coin_transactions`
- `student_coin_balances`
- worksheet tables where useful

Show unavailable metrics explicitly as "עדיין לא נמדד" or "דורש מעקב אירועים".

### Phase 2 - Event Tracking

Add `analytics_events` migration and ingestion endpoint only after Phase 1. Track product interaction events without sensitive payloads.

### Phase 3 - Funnels / Retention

Build funnels and retention only after `analytics_events` has enough real event volume.

### Phase 4 - Truth Gates

Add tests/scripts that compare admin analytics totals against raw source tables and verify admin-only access.

## 15. Do Not Implement Yet

Do not implement these until event tracking exists:

- Report open counts.
- PDF export counts.
- Parent dashboard usage counts.
- Audio play counts.
- Full funnels.
- D1/D7/D30 event retention.
- Generic feature usage ranking.

Do not implement as exact truth without further verification:

- Same-grade/lower-grade/higher-grade parent activity analytics.
- Report discrepancy PASS verdicts.
- Abandonment as a definitive user intent.

## Phase 0 Gate Decision

Safe to continue to Phase 1 for the DB-truth MVP.

Reason: the repository has clear, server-written source tables and admin service-role patterns for core parent, child, learning, answer, parent activity, book, worksheet, and reward metrics. Phase 1 must keep missing product-interaction metrics visibly marked as not tracked.
