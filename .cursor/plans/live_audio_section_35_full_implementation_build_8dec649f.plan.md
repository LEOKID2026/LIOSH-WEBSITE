---
name: Live Audio Section 35 Full Implementation Build
overview: Implement the full A–F code package for the Teacher-Controlled Live Audio Classroom feature as defined in `docs/teacher-live-classroom/TEACHER_CONTROLLED_LIVE_AUDIO_CLASSROOM_FULL_PLAN.md` v3.2. No SQL execution, no commit, no push, no deploy.
todos:
  - id: todo-00-preflight
    content: "Preflight repo inspection before any file is created. Must: (1) list supabase/migrations/ sorted by name and determine the actual next unused migration number — never assume 025; (2) check package.json for livekit-server-sdk and livekit-client to know whether they need to be added; (3) locate the existing .env.example file and record which live-audio variable names are already present; (4) confirm pages/api/teacher/activities/ and pages/api/student/activities/ directory structures; (5) confirm lib/teacher-server/ and components/teacher-portal/ exist; (6) report all findings before any file is created."
    status: pending
  - id: todo-01-migration
    content: "Create migration file supabase/migrations/<next_unused_number>_classroom_discussion.sql where <next_unused_number> is determined in todo-00 by inspecting supabase/migrations/. Four core discussion tables + Option A separate entitlement tables (per Section 12 and 23.6 of the v3.2 plan). Required schema constraints: (1) classroom_discussion_sessions.activity_id must be NOT NULL — standalone sessions are not supported in this run; (2) replace any unique(session_id, student_id, status) constraint on classroom_private_audio_sessions with partial unique indexes: unique(session_id) WHERE status='active' and unique(session_id, student_id) WHERE status='active' — do not block multiple ended/historical rows; (3) add a DB-level guard unique(activity_id) WHERE status IN ('active','locked') on classroom_discussion_sessions to prevent duplicate active sessions per activity. Indexes, RLS enabled, comments. SQL written only — must not be executed."
    status: pending
  - id: todo-02-dependencies
    content: "Add required npm packages if not already present (determined in todo-00): livekit-server-sdk for server-side token generation, livekit-client for browser SDK. Use npm install. Do not pin versions manually — use latest. Record what was added."
    status: pending
  - id: todo-03-env-example
    content: "Add all new live-audio environment variable names to .env.example (file location confirmed in todo-00). Variables to add if not already present: LIVE_DISCUSSION_ENABLED (server-side runtime kill switch, default false), NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED (client/UI hint only — may be inlined at build time, not a runtime kill switch), LIVE_DISCUSSION_AUDIO_ENABLED, LIVE_AUDIO_PROVIDER, LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_SERVER_URL, NEXT_PUBLIC_LIVEKIT_SERVER_URL. Values must be placeholders only (empty string or commented example). No real secrets."
    status: pending
  - id: todo-04-entitlement
    content: Create entitlement helper lib/teacher-server/live-discussion-entitlement.server.js — checkLiveDiscussionEntitlement, checkSchoolTeacherEntitlement, checkPrivateTeacherEntitlement.
    status: pending
  - id: todo-05-adapter
    content: "Create LiveAudioProvider adapter: lib/live-audio/types.js, lib/live-audio/provider-adapter.js, lib/live-audio/providers/mock.js, lib/live-audio/providers/livekit.js (server-only shell using livekit-server-sdk — does not require real credentials, browser audio flow, or full private-room lifecycle in Wave 1; full LiveKit/private-room lifecycle completes in Wave 5). All LiveKit-specific code isolated inside providers/livekit.js only. livekit-client must not be imported by any production page or component in this wave."
    status: pending
  - id: todo-06-server-module
    content: Create discussion server module lib/teacher-server/teacher-discussion.server.js — session lifecycle, participant lifecycle, request types (speak_to_class, private_help), private session lifecycle, activity-close auto-end hook.
    status: pending
  - id: todo-07-teacher-api
    content: Create all teacher discussion API routes under pages/api/teacher/activities/[activityId]/discussion/ — start, index, lock, approve, revoke, mute, unmute, clear-hands, mute-all, end, audio-start, audio-stop, audio-token, approve-private, end-private, private-audio-token, report. All routes must call checkLiveDiscussionEntitlement before any other logic.
    status: pending
  - id: todo-08-student-api
    content: Create all student discussion API routes under pages/api/student/activities/[activityId]/discussion/ — index, raise-hand, request-private, lower-hand, heartbeat, audio-token, private-audio-token.
    status: pending
  - id: todo-09-payload
    content: Extend teacher monitor poll response and student live-state poll response to include discussion and participant state.
    status: pending
  - id: todo-10-teacher-ui
    content: "Create components/teacher-portal/TeacherDiscussionPanel.jsx — entitlement gating, compact 40-student queue, request-type badges, audio controls, private conversation indicator. Hebrew UI strings: use temporary placeholder labels (e.g. [discussion-start], [raise-hand], [private-help]) inside scoped discussion components only. Do not change any existing Hebrew strings outside this feature."
    status: pending
  - id: todo-11-student-ui
    content: "Create components/student/StudentDiscussionBar.jsx — speak_to_class and private_help request buttons, all participant states (listen-only, approved-to-speak, muted, private-conversation-active). Hebrew UI strings: temporary placeholder labels only (e.g. [speak-to-class], [private-help]) inside this component only. Do not change any existing Hebrew strings."
    status: pending
  - id: todo-12-ui-integration
    content: Integrate TeacherDiscussionPanel.jsx into teacher monitor page and StudentDiscussionBar.jsx into student activity page.
    status: pending
  - id: todo-13-private-room
    content: "Implement Phase E private room: createPrivateRoom, createTeacherPrivateToken, createStudentPrivateToken, closePrivateRoom in lib/live-audio/providers/livekit.js. Wire private room lifecycle through discussion server module."
    status: pending
  - id: todo-14-report
    content: Add teacher-only discussion report endpoint (requireTeacherApiContext only) and teacher-facing report UI section. No parent/guardian API exposure.
    status: pending
  - id: todo-15-tests
    content: Add unit, API, entitlement gate (including denied cases), tamper/security, regression (parent/guardian exposure), and E2E tests where practical. Mark all DB-dependent tests BLOCKED_BY_SQL_NOT_EXECUTED.
    status: pending
  - id: todo-16-verify
    content: Run build, lint if available, and all tests that do not require executed SQL. Confirm all DB-dependent tests are marked BLOCKED_BY_SQL_NOT_EXECUTED.
    status: pending
  - id: todo-17-report
    content: "Return final implementation report: files created, files modified, migration file path (with actual number from todo-00), SQL not executed, migrations not run, no commit, no push, no deploy, dependencies added, env vars added, APIs implemented, UI implemented, audio provider status, LiveKit provider status, feature flag defaults, tests passed/failed/blocked, build result, lint result, security/tamper result, entitlement result, parent/guardian exposure check result, known issues, owner actions still required, recommendation (keep/fix/discard)."
    status: pending
isProject: true
---

# Live Audio Section 35 Full Implementation Build

Implement the actual code package described in [`docs/teacher-live-classroom/TEACHER_CONTROLLED_LIVE_AUDIO_CLASSROOM_FULL_PLAN.md`](docs/teacher-live-classroom/TEACHER_CONTROLLED_LIVE_AUDIO_CLASSROOM_FULL_PLAN.md) v3.2.

**Source of truth:** The v3.2 plan document. Do not edit it unless a blocking contradiction is found. If a contradiction is found, stop and report it before coding.

## Absolute Restrictions (apply throughout all todos and all waves)

- Do not execute SQL
- Do not run migrations
- Do not apply DB changes manually in Supabase
- Do not commit, push, or deploy
- Do not use production student data
- Do not store real provider secrets in committed files
- Do not hard-code LiveKit outside `lib/live-audio/providers/livekit.js`
- Do not import `livekit-client` in any production page or component until browser audio UI phases (Wave 5+). Server SDK imports must remain isolated to `lib/live-audio/providers/livekit.js`.
- Do not enable recording, transcription, or AI audio processing
- Do not expose discussion/audio/private conversation data to parent or guardian reports
- Do not change unrelated Hebrew content or design
- Do not modify `classroom-activities-labels.client.js` or any other existing label/translation file in Waves 0–4. Use placeholder labels only inside new scoped discussion components. Final Hebrew copy and centralized labels require separate owner approval.
- Do not touch learning, arcade, parent, guardian, or subject-expansion flows except for regression tests
- Hebrew UI strings inside new discussion components must use temporary placeholder labels only (e.g. `[speak-to-class]`, `[private-help]`, `[discussion-start]`). Do not change any existing Hebrew strings anywhere in the codebase.
- `LIVE_DISCUSSION_ENABLED` is the authoritative server-side runtime kill switch. `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` is a client/UI hint only and must not be described as a runtime kill switch because `NEXT_PUBLIC_` variables may be inlined at build time. All server-side feature gates must check `LIVE_DISCUSSION_ENABLED`.

## Controlled Wave Execution Rule

This plan must be executed in controlled waves.

Manual Build/Agent approval for this plan authorizes only the first approved wave (or wave range explicitly named by the owner), not the entire A–F package in one uninterrupted run.

The agent must stop after each wave and return the required wave report.

The agent must not start the next wave until the owner explicitly approves it.

If the owner approves "Wave 0–1", the agent may execute only Wave 0 and Wave 1, then must stop.

If the owner approves "Wave 2", the agent may execute only Wave 2, then must stop.

No automatic continuation is allowed. A successful build or passing tests do not constitute approval to continue to the next wave.

After each wave, run only the critical checks defined for that wave. Full comprehensive QA runs in Wave 6 only.

If a critical check fails, stop and report. Do not continue to the next wave.

Non-critical or broad QA items not run before Wave 6 must be marked as deferred to Wave 6, not as blockers.

---

## Wave 0 — Preflight only

**Todos:** `todo-00-preflight`

**Allowed:**
- Inspect repository structure
- List `supabase/migrations/` sorted by name and determine the actual next unused migration number — never assume a number
- Inspect `package.json` for `livekit-server-sdk` and `livekit-client`
- Locate `.env.example` and record which live-audio variable names are already present
- Confirm `pages/api/teacher/activities/` and `pages/api/student/activities/` directory structures
- Confirm `lib/teacher-server/` and `components/teacher-portal/` exist
- Report findings

**Forbidden in Wave 0:**
- No file creation
- No code changes
- No dependency installation
- No SQL, no migration, no commit, no push, no deploy

**Wave 0 report must include:**
- Actual next migration number determined
- Current last migration file found
- Dependency status: `livekit-server-sdk`, `livekit-client`
- `.env.example` status (present/absent, variables already listed)
- Required directory status
- Blockers, if any

**Stop after Wave 0** unless Wave 0 and Wave 1 were explicitly approved together.

---

## Wave 1 — Isolated foundation

**Todos:** `todo-01-migration`, `todo-02-dependencies`, `todo-03-env-example`, `todo-04-entitlement`, `todo-05-adapter`

**Allowed:**
- Create migration file using the actual next unused number determined in Wave 0 — never hardcode a number. Required schema constraints (see todo-01-migration): `activity_id NOT NULL`, partial unique indexes on `classroom_private_audio_sessions`, DB-level guard `unique(activity_id) WHERE status IN ('active','locked')`.
- Add `livekit-server-sdk` and `livekit-client` via npm if missing — use latest, do not pin manually
- Add all new live-audio variable names to `.env.example` with placeholder values only (no real secrets): `LIVE_DISCUSSION_ENABLED` (server kill switch), `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` (UI hint only), `LIVE_DISCUSSION_AUDIO_ENABLED`, `LIVE_AUDIO_PROVIDER`, `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_SERVER_URL`, `NEXT_PUBLIC_LIVEKIT_SERVER_URL`
- Create `lib/teacher-server/live-discussion-entitlement.server.js` with `checkLiveDiscussionEntitlement`, `checkSchoolTeacherEntitlement`, `checkPrivateTeacherEntitlement`
- Create `lib/live-audio/types.js`, `lib/live-audio/provider-adapter.js`, `lib/live-audio/providers/mock.js`, `lib/live-audio/providers/livekit.js` as a **server-only shell**. The LiveKit provider shell must not require real credentials, browser audio flow, full private-room lifecycle, or production provider values. Full LiveKit/private-room lifecycle completes in Wave 5.

**Forbidden in Wave 1:**
- Do not create teacher API routes
- Do not create student API routes
- Do not touch teacher monitor page
- Do not touch student activity page
- Do not create UI components
- Do not create report UI
- Do not modify `classroom-activities-labels.client.js` or any existing label/translation file
- Do not run SQL or migrations
- Do not commit, push, or deploy

**Critical checks after Wave 1:**
- Build if practical
- Dependency install result if packages were added
- Import/syntax check where practical
- Confirm `livekit-client` is not imported by any production page or component — server SDK imports must remain isolated to `lib/live-audio/providers/livekit.js`
- Confirm SQL was not executed
- Confirm no migrations were run
- Confirm no existing Hebrew strings changed
- Confirm `classroom-activities-labels.client.js` was not modified
- Confirm no parent/guardian files changed

**Wave 1 report must include:** files created, files modified, actual migration file path, schema constraints included (NOT NULL, partial indexes, active-session guard), dependencies added, `.env.example` changes, livekit-client import isolation check result, build result if run, blockers, recommendation whether Wave 2 can start.

**Stop after Wave 1.**

---

## Wave 2 — Backend APIs without UI

**Todos:** `todo-06-server-module`, `todo-07-teacher-api`, `todo-08-student-api`

**Allowed:**
- Create `lib/teacher-server/teacher-discussion.server.js` — session lifecycle, participant lifecycle, request types, private session lifecycle, activity-close auto-end hook
- Create all teacher discussion API routes under `pages/api/teacher/activities/[activityId]/discussion/`
- Create all student discussion API routes under `pages/api/student/activities/[activityId]/discussion/`
- Every teacher discussion/audio route must call `checkLiveDiscussionEntitlement` before any other logic
- Add critical API/unit tests that do not require executed SQL

**Rate limiting requirement (Wave 2):**
- `raise-hand` and `request-private` routes must enforce a rate limit of maximum 10 requests per student per discussion session per minute
- Add a test for this rate limit where practical

**Concurrency-safety requirement (Wave 2):**
- `startDiscussion`, `approvePrivate`, `endPrivate`, and `endSession` must be safe against repeated clicks and parallel requests
- Use the DB constraints from Wave 1 (partial unique indexes, active-session guard) as the primary safety layer
- Add server-side checks as a secondary layer where the DB cannot enforce alone
- Document which operations rely on DB constraints and which require server-side guards

**Forbidden in Wave 2:**
- No UI integration
- No teacher monitor page changes (except only if absolutely required for route imports — must be reported)
- No student activity page changes
- No LiveKit browser UI
- No report UI
- No modification of `classroom-activities-labels.client.js` or any existing label/translation file
- No SQL execution
- No commit, push, or deploy

**Critical checks after Wave 2:**
- Build
- Entitlement unit/API checks where possible
- Tamper checks: student cannot approve self, teacher without entitlement is denied, private teacher subject gate denied when subject missing
- Rate limit check: raise-hand/request-private enforces max 10 requests per student per session per minute
- Concurrency check: startDiscussion idempotent against duplicate calls, approvePrivate/endPrivate/endSession safe against parallel requests
- No parent/guardian exposure check at code/import level

**Stop after Wave 2.**

---

## Wave 3 — Payload integration only

**Todos:** `todo-09-payload`

**Allowed:**
- Extend teacher monitor poll response to include discussion state (behind safe flags/gates)
- Extend student live-state response to include participant/self discussion state (behind safe flags/gates)

**Forbidden in Wave 3:**
- No UI components
- No visible UI change
- No full LiveKit browser flow
- No report UI
- No SQL execution
- No commit, push, or deploy

**Critical checks after Wave 3:**
- Build
- Teacher monitor existing response still works when feature flag is off
- Student live-state existing response still works when feature flag is off
- No parent/guardian exposure

**Stop after Wave 3.**

---

## Wave 4 — UI components and integration (feature disabled by default)

**Todos:** `todo-10-teacher-ui`, `todo-11-student-ui`, `todo-12-ui-integration`

**Allowed:**
- Create `components/teacher-portal/TeacherDiscussionPanel.jsx`
- Create `components/student/StudentDiscussionBar.jsx`
- Integrate into teacher monitor page and student activity page
- Use temporary placeholder labels only inside new components
- Feature must remain hidden/disabled when flags and entitlement are off

**Forbidden in Wave 4:**
- No final Hebrew copy
- No existing Hebrew string changes anywhere in the codebase
- Do not modify `classroom-activities-labels.client.js` or any existing label/translation file
- No unrelated design changes
- No full audio provider testing
- No report UI
- No SQL execution
- No commit, push, or deploy

**Critical checks after Wave 4:**
- Build
- With flags off, teacher monitor remains unchanged or feature is hidden
- With flags off, student activity remains unchanged or feature is hidden
- No existing Hebrew strings changed
- No parent/guardian exposure

**Stop after Wave 4.**

---

## Wave 5 — LiveKit audio and private room

**Todos:** `todo-13-private-room` and any remaining LiveKit provider work from `todo-05`

**Allowed:**
- Complete LiveKit provider calls behind adapter only
- Implement `createPrivateRoom`, `createTeacherPrivateToken`, `createStudentPrivateToken`, `closePrivateRoom` in `lib/live-audio/providers/livekit.js`
- Wire private room lifecycle through `teacher-discussion.server.js`
- Implement token logic server-side only
- Add provider-level tests/mocks where practical

**Forbidden in Wave 5:**
- No real provider secrets
- No production provider values
- No recording, transcription, or AI audio processing
- No hardcoded LiveKit logic outside `lib/live-audio/providers/livekit.js`
- No SQL execution
- No commit, push, or deploy

**Critical checks after Wave 5:**
- Build
- Adapter isolation check (no LiveKit code outside its provider file)
- No provider secrets committed
- No recording/transcription/AI flags enabled
- No parent/guardian exposure
- Token routes still gated server-side

**Stop after Wave 5.**

---

## Wave 6 — Teacher-only report and final verification

**Todos:** `todo-14-report`, `todo-15-tests`, `todo-16-verify`, `todo-17-report`

**Allowed:**
- Add teacher-only discussion report endpoint (`requireTeacherApiContext` only)
- Add teacher-facing report UI section
- Run full comprehensive tests (unit, API, entitlement, security, regression, E2E where practical)
- Run build and lint
- Produce final implementation report

**Forbidden in Wave 6:**
- No parent/guardian report exposure
- No SQL execution
- No migrations
- No commit, push, or deploy

**Critical checks after Wave 6:**
- Build
- Lint if available
- Unit/API/entitlement/security tests that do not require executed SQL
- Parent/guardian exposure regression
- No existing Hebrew strings changed
- All DB-dependent tests must be marked `BLOCKED_BY_SQL_NOT_EXECUTED`

**Final report must include:**
- Files created / files modified
- Migration file path (with actual number from Wave 0)
- SQL not executed / migrations not run
- No commit / no push / no deploy
- Dependencies added / `.env.example` changes
- APIs implemented / UI implemented
- Audio provider status / LiveKit provider status
- Feature flag defaults (confirm all four at safe values)
- Tests: passed / failed / blocked by `BLOCKED_BY_SQL_NOT_EXECUTED`
- Build result / lint result
- Security/tamper result / entitlement result / parent/guardian exposure result
- Known issues
- Owner actions still required
- Recommendation: keep / fix / discard
