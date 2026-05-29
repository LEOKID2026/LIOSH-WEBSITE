---
name: Live Audio Section 35 Full Implementation Build
overview: Implement the full A–F code package for the Teacher-Controlled Live Audio Classroom feature as defined in `docs/teacher-live-classroom/TEACHER_CONTROLLED_LIVE_AUDIO_CLASSROOM_FULL_PLAN.md` v3.2. No SQL execution, no commit, no push, no deploy.
todos:
  - id: todo-00-preflight
    content: "Preflight repo inspection before any file is created. Must: (1) list supabase/migrations/ sorted by name and determine the actual next unused migration number — never assume 025; (2) check package.json for livekit-server-sdk and livekit-client to know whether they need to be added; (3) locate the existing .env.example file and record which live-audio variable names are already present; (4) confirm pages/api/teacher/activities/ and pages/api/student/activities/ directory structures; (5) confirm lib/teacher-server/ and components/teacher-portal/ exist; (6) report all findings before any file is created."
    status: pending
  - id: todo-01-migration
    content: "Create migration file supabase/migrations/<next_unused_number>_classroom_discussion.sql where <next_unused_number> is determined in todo-00 by inspecting supabase/migrations/. Four core discussion tables + Option A separate entitlement tables (per Section 12 and 23.6 of the v3.2 plan). Indexes, RLS enabled, comments. SQL written only — must not be executed."
    status: pending
  - id: todo-02-dependencies
    content: "Add required npm packages if not already present (determined in todo-00): livekit-server-sdk for server-side token generation, livekit-client for browser SDK. Use npm install. Do not pin versions manually — use latest. Record what was added."
    status: pending
  - id: todo-03-env-example
    content: "Add all new live-audio environment variable names to .env.example (file location confirmed in todo-00). Variables to add if not already present: NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED, LIVE_DISCUSSION_AUDIO_ENABLED, LIVE_AUDIO_PROVIDER, LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_SERVER_URL, NEXT_PUBLIC_LIVEKIT_SERVER_URL. Values must be placeholders only (empty string or commented example). No real secrets."
    status: pending
  - id: todo-04-entitlement
    content: Create entitlement helper lib/teacher-server/live-discussion-entitlement.server.js — checkLiveDiscussionEntitlement, checkSchoolTeacherEntitlement, checkPrivateTeacherEntitlement.
    status: pending
  - id: todo-05-adapter
    content: "Create LiveAudioProvider adapter: lib/live-audio/types.js, lib/live-audio/provider-adapter.js, lib/live-audio/providers/mock.js, lib/live-audio/providers/livekit.js (full implementation using livekit-server-sdk). All LiveKit-specific code isolated inside providers/livekit.js only."
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

## Absolute Restrictions (apply throughout all todos)

- Do not execute SQL
- Do not run migrations
- Do not apply DB changes manually in Supabase
- Do not commit, push, or deploy
- Do not use production student data
- Do not store real provider secrets in committed files
- Do not hard-code LiveKit outside `lib/live-audio/providers/livekit.js`
- Do not enable recording, transcription, or AI audio processing
- Do not expose discussion/audio/private conversation data to parent or guardian reports
- Do not change unrelated Hebrew content or design
- Do not touch learning, arcade, parent, guardian, or subject-expansion flows except for regression tests
- Hebrew UI strings inside new discussion components must use temporary placeholder labels only (e.g. `[speak-to-class]`, `[private-help]`, `[discussion-start]`). Final Hebrew copy requires separate owner approval before production. Do not change any existing Hebrew strings anywhere in the codebase.

## Implementation Order

### 0. Preflight repo inspection
Before any file is created:
- List `supabase/migrations/` sorted by name and determine the actual next unused number. Never assume a number.
- Check `package.json` for `livekit-server-sdk` and `livekit-client`.
- Locate `.env.example` and record which live-audio variable names are already present.
- Confirm `pages/api/teacher/activities/` and `pages/api/student/activities/` directory structures.
- Confirm `lib/teacher-server/` and `components/teacher-portal/` exist.
- Report all findings before creating any file.

### 1. Migration file
- File: `supabase/migrations/<next_unused_number>_classroom_discussion.sql` where `<next_unused_number>` is determined in todo-00 by inspecting `supabase/migrations/`
- Four core discussion tables + Option A separate entitlement tables (per Section 12 and 23.6)
- Indexes, RLS enabled, comments
- **SQL written only — must not be executed**

### 2. Dependencies
- Add `livekit-server-sdk` and `livekit-client` via npm if not already present (determined in todo-00)
- Use latest versions — do not pin manually
- Record what was added

### 3. `.env.example` additions
- Add all new live-audio variable names if not already present (determined in todo-00):
  - `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED`
  - `LIVE_DISCUSSION_AUDIO_ENABLED`
  - `LIVE_AUDIO_PROVIDER`
  - `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP`
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
  - `LIVEKIT_SERVER_URL`
  - `NEXT_PUBLIC_LIVEKIT_SERVER_URL`
- Values must be empty-string or commented placeholders. No real secrets.

### 4. Entitlement helper
- File: `lib/teacher-server/live-discussion-entitlement.server.js`
- Functions: `checkLiveDiscussionEntitlement`, `checkSchoolTeacherEntitlement`, `checkPrivateTeacherEntitlement`
- All teacher discussion/audio routes must call this before any other logic

### 5. LiveAudioProvider adapter + providers
- `lib/live-audio/types.js` — shared types/constants
- `lib/live-audio/provider-adapter.js` — provider-neutral interface
- `lib/live-audio/providers/mock.js` — mock provider (full implementation)
- `lib/live-audio/providers/livekit.js` — full LiveKit provider using `livekit-server-sdk`; all LiveKit-specific code isolated here only

### 6. Discussion server module
- File: `lib/teacher-server/teacher-discussion.server.js`
- Session lifecycle, participant lifecycle, request types (`speak_to_class`, `private_help`), private session lifecycle, activity-close auto-end hook

### 7. Teacher API routes
- Directory: `pages/api/teacher/activities/[activityId]/discussion/`
- Routes: `start`, `index`, `lock`, `approve`, `revoke`, `mute`, `unmute`, `clear-hands`, `mute-all`, `end`, `audio-start`, `audio-stop`, `audio-token`, `approve-private`, `end-private`, `private-audio-token`, `report`
- Every route calls `checkLiveDiscussionEntitlement` before any other logic

### 8. Student API routes
- Directory: `pages/api/student/activities/[activityId]/discussion/`
- Routes: `index`, `raise-hand`, `request-private`, `lower-hand`, `heartbeat`, `audio-token`, `private-audio-token`

### 9. Monitor/live-state payload integration
- Extend teacher monitor poll response to include discussion state
- Extend student live-state poll response to include participant state

### 10. Teacher UI component
- File: `components/teacher-portal/TeacherDiscussionPanel.jsx`
- Entitlement-based visibility gating, compact 40-student queue, request-type badges, audio controls, private conversation indicator
- Hebrew strings: temporary placeholders only inside this component

### 11. Student UI component
- File: `components/student/StudentDiscussionBar.jsx`
- States: listen-only, approved-to-speak, muted, private-conversation-active
- Two request buttons: `speak_to_class`, `private_help`
- Hebrew strings: temporary placeholders only inside this component

### 12. UI integration
- Integrate `TeacherDiscussionPanel.jsx` into teacher monitor page
- Integrate `StudentDiscussionBar.jsx` into student activity page

### 13. Private room implementation (Phase E)
- Implement `createPrivateRoom`, `createTeacherPrivateToken`, `createStudentPrivateToken`, `closePrivateRoom` in `lib/live-audio/providers/livekit.js`
- Wire private room lifecycle through discussion server module

### 14. Teacher-only discussion report
- Report endpoint behind `requireTeacherApiContext` only
- No parent or guardian API exposure
- Teacher-facing discussion summary UI section

### 15. Tests
- Unit, API, entitlement gate (including denied cases), tamper/security, regression (parent/guardian exposure), E2E where practical
- DB-dependent tests marked `BLOCKED_BY_SQL_NOT_EXECUTED`

### 16. Build/lint/test verification
- Run build
- Run lint if available
- Run all tests that do not require executed SQL
- Confirm all DB-dependent tests are marked `BLOCKED_BY_SQL_NOT_EXECUTED`

### 17. Final implementation report
Must list: files created, files modified, migration file path (with actual number from todo-00), SQL-not-executed confirmation, migrations-not-run confirmation, no-commit confirmation, no-push confirmation, no-deploy confirmation, dependencies added, env vars added to `.env.example`, APIs implemented, UI implemented, audio provider status, LiveKit provider status, feature flag defaults (confirm all four remain at safe values), tests passed/failed/blocked, build result, lint result, security/tamper result, entitlement test result, parent/guardian exposure check result, known issues, owner actions still required, recommendation (keep/fix/discard).
