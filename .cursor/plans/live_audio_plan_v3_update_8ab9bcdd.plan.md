---
name: Live Audio Plan v3 Update
overview: "Update the existing TEACHER_CONTROLLED_LIVE_AUDIO_CLASSROOM_FULL_PLAN.md from v2.2 to v3.0, incorporating all owner clarifications: audio-first MVP, new phase order A-F, private teacher-student conversation as Phase E, removal of parent-report scope, and new data model fields for request type and audio scope. No code, SQL, commit, push, or deploy."
todos:
  - id: update-header-exec-summary
    content: "Update document header (version 3.0), update Executive Summary: product goal is remote learning, audio is mandatory MVP, new A-F phase table, remove Phase 1 no-audio recommendation and hard-rule block"
    status: completed
  - id: update-architecture-sections
    content: Update Sections 2, 4 (state machine + architecture layers), and 5 (LiveAudioProvider adapter — add 4 private room functions)
    status: completed
  - id: update-db-plan
    content: "Update Section 12 (Database Plan): add request_type and audio_scope columns to classroom_discussion_participants; add new classroom_private_audio_sessions table; add new event types"
    status: completed
  - id: update-api-plan
    content: "Update Section 13 (API Plan): add private conversation routes for teacher and student; update raise-hand route to carry request_type"
    status: pending
  - id: update-realtime-plan
    content: "Update Section 14 (Realtime Plan): add private_help_requested, private_session_started, private_session_ended event payloads"
    status: pending
  - id: renumber-and-rewrite-phases
    content: "Rename and rewrite all phase sections 17-22 to A-F: Phase A (foundation), B (broadcast), C (speak-to-class), D (group discussion), E (private conversation — new), F (QA). Remove old Phase 1 as standalone MVP. Remove Phase 6 from parent-facing reports."
    status: completed
  - id: update-security-ui-qa
    content: Update Sections 24 (Security — add private isolation rule), 25 (UI — teacher queue with type badges, private panel; student two-button UI), 26 (QA — add Phase E tests), 28 (complexity table A-F), 30 (acceptance criteria + private conversation)
    status: completed
  - id: update-owner-checklist-final-sections
    content: "Update Sections 29 (go/no-go), 33 (owner decisions: A1 audio-first, A8 resolved no parent reports, A9-A10 new), 34 (final reminder), 35 (dev run scope)"
    status: pending
isProject: false
---

# Teacher-Controlled Live Audio Classroom — Plan v3.0 Update

## Document to update
[`docs/teacher-live-classroom/TEACHER_CONTROLLED_LIVE_AUDIO_CLASSROOM_FULL_PLAN.md`](docs/teacher-live-classroom/TEACHER_CONTROLLED_LIVE_AUDIO_CLASSROOM_FULL_PLAN.md)

Version bump: **2.2 → 3.0**. All changes are documentation only. No code, no SQL, no commit, no push, no deploy.

---

## Sections Changed or Removed

### Header / Version block
- Bump to v3.0.
- Add update note: "v3.0 — owner clarifications applied: audio-first MVP, phases renumbered A–F, private teacher-student conversation added as Phase E, parent reports confirmed out of scope."

### Section 1 — Executive Summary
**Removed:**
- Statement that Phase 1 (no-audio hand-raise) has standalone product value and is the recommended starting point.
- The hard rule "audio phases must not start before Phase 1 is proven."
- The old 0–7 phase table.

**Added:**
- Product context: primary goal is **remote learning**, not only in-class hand raising.
- Clear statement that **audio is mandatory for the MVP**. A no-audio hand-raise phase is not considered a meaningful MVP.
- New phase table:

| Phase | Description | Complexity | Effort | Risk |
|-------|-------------|-----------|--------|------|
| A | Audio foundation + schema plan | Medium | 1–2 weeks | Medium |
| B | Teacher broadcast + student listen-only | Large | 2–3 weeks | Large |
| C | Speak-to-class hand raise + approved student mic | Large | 2–3 weeks | Large |
| D | Group discussion — up to 5 students | Medium | 1–2 weeks | Medium |
| E | Private teacher-student audio conversation | Large | 2–3 weeks | Large |
| F | Mobile / security / load QA | Medium | 1 week | Medium |

- Updated total-effort estimate: ~9–14 weeks, one or two senior engineers.
- Updated recommended starting point: Phase A (audio foundation + schema plan) must be complete before any audio phase begins.

### Section 2 — Product Architecture Context
**Changed:**
- Section 2.1: Add "The primary use case is **remote learning**. Students and teacher may be in different physical locations." Remove any implication that this is only an in-class feature.
- Section 2.3 (What This Is NOT): Add "Not in-class only — remote learning is the primary goal."

### Section 4 — Full Proposed Architecture

**Section 4.1 — State Machine updated:**

Student discussion state per session now has two hand-raise paths:

```
listening → hand_raised_speak_to_class → approved_to_speak (whole class hears)
          → hand_raised_private_help   → in_private_conversation (teacher + student only)
```

Session audio scope states:
```
idle → teacher_broadcast_only → group_discussion (up to 5) → …
                              → private_session_active (parallel to main room)
```

**Section 4.5 — Audio Layer:** Expand to describe two provider rooms in Phase E:
- Main class room: teacher + all students (listen-only by default).
- Private room: teacher + one student only. Rest of class cannot hear private audio. Separate provider room — not client-side muting.

**Section 4.6 — Feature Flags:** unchanged.

### Section 5 — LiveAudioProvider Adapter

**Added four new adapter functions (planning-only, not implemented):**

```javascript
/**
 * Create a private two-participant room for teacher-student private conversation.
 * Max participants: 2. Recording always disabled.
 * @param {object} opts
 * @param {string} opts.roomName     - e.g. "private-{sessionId}-{studentId}"
 * @returns {Promise<{ roomId: string, roomName: string }>}
 */
async function createPrivateRoom(opts) {}

/**
 * Close a private room.
 * @param {string} roomName
 * @returns {Promise<void>}
 */
async function closePrivateRoom(roomName) {}

/**
 * Generate a teacher token for the private room (can publish + subscribe).
 * @param {object} opts
 * @param {string} opts.roomName
 * @param {string} opts.teacherId
 * @param {number} opts.ttlSeconds
 * @returns {Promise<{ token: string, serverUrl: string }>}
 */
async function createTeacherPrivateToken(opts) {}

/**
 * Generate a student token for the private room (can publish + subscribe).
 * Issued only after server verifies in_private_conversation = true for this student.
 * @param {object} opts
 * @param {string} opts.roomName
 * @param {string} opts.studentId
 * @param {number} opts.ttlSeconds
 * @returns {Promise<{ token: string, serverUrl: string }>}
 */
async function createStudentPrivateToken(opts) {}
```

Section 5.6 (Mock Provider): Mock implements all four new functions as no-ops.

### Section 12 — Database Plan

**Section 12.3 — `classroom_discussion_participants` — two new columns:**

```sql
-- Planning only. Do not create yet.
request_type  text  check (request_type in ('speak_to_class', 'private_help')),
-- null = no hand raised; set when hand is raised; cleared when hand is cleared
audio_scope   text  check (audio_scope in ('class', 'private')),
-- null = not speaking; 'class' = approved to speak to whole class;
-- 'private' = approved for private teacher-student conversation
```

**New table — `classroom_private_audio_sessions`:**

```sql
-- Planning only. Do not create yet.
create table public.classroom_private_audio_sessions (
  id                  uuid        primary key default gen_random_uuid(),
  session_id          uuid        not null references public.classroom_discussion_sessions(id) on delete cascade,
  student_id          uuid        not null references public.students(id) on delete cascade,
  teacher_id          uuid        not null references public.teacher_profiles(teacher_id) on delete cascade,
  private_room_id     text,       -- external room identifier from provider
  private_room_name   text,       -- e.g. "private-{sessionId}-{studentId}"
  status              text        not null default 'active'
                                  check (status in ('active', 'ended')),
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,
  created_at          timestamptz not null default now(),
  unique (session_id, student_id, status)  -- one active private session per student per discussion
);
alter table public.classroom_private_audio_sessions enable row level security;
-- RLS enabled; no client policies. All access via service role.
```

**New event types added to `classroom_discussion_events.event_type` check constraint:**
- `'private_session_started'`
- `'private_session_ended'`
- `'private_help_requested'`
- `'private_help_request_cleared'`

**Section 12.5:** Note that `classroom_private_audio_sessions` is a fourth new table (not three as stated in v2.2).

### Section 13 — API Plan

**Section 13.1 — Teacher Discussion APIs — new routes added:**

| Route | Method | Body | Response | Notes |
|-------|--------|------|---------|-------|
| `approve-private` | POST | `{ studentId }` | `{ ok, privateRoomName }` | Creates private room; issues tokens |
| `end-private` | POST | `{ studentId }` | `{ ok }` | Closes private room |
| `private-audio-token` | POST | `{ studentId }` | `{ token, privateRoomName, serverUrl }` | Teacher token for private room |

**Section 13.2 — Student Discussion APIs — new route added:**

| Route | Method | Body | Response | Notes |
|-------|--------|------|---------|-------|
| `request-private` | POST | `{}` | `{ ok }` | Requests private help; sets request_type='private_help' |
| `private-audio-token` | POST | `{}` | `{ token, privateRoomName, serverUrl }` | Student token; only if in active private session |

**Section 13.2 — `raise-hand` route updated:** Now accepts `{ requestType: 'speak_to_class' | 'private_help' }` in body. Alternatively, a dedicated `request-private` route handles private help. Both approaches are valid — final API shape is an implementation decision.

**Section 13.3 — Role Guard:** Add private session actions (approve-private, end-private: teacher only; request-private, private-audio-token: student only if approved).

### Section 14 — Realtime Plan

**Section 14.4 — New event payloads:**
```json
{ "event": "private_help_requested",   "sessionId": "...", "targetStudentId": "..." }
{ "event": "private_session_started",  "sessionId": "...", "targetStudentId": "..." }
{ "event": "private_session_ended",    "sessionId": "...", "targetStudentId": "..." }
```

### Sections 17–22 — Phase descriptions (renumber A–F)

**Rename and renumber:**
- Old Phase 0 (Architecture/Go-No-Go) → Absorbed into Phase A preamble.
- Old Phase 1 (Hand raise, no audio) → **Removed as standalone MVP phase**. DB schema, state machine, and session APIs are now part of **Phase A** deliverables. Hand-raise UI ships as part of **Phase C** (the first user-visible phase with audio).
- Old Phase 2 (Teacher audio broadcast) → **Phase B**.
- Old Phase 3 (Approved student microphone, speak to class) → **Phase C** (combined with hand-raise infrastructure from old Phase 1).
- Old Phase 4 (Multi-speaker managed discussion) → **Phase D**.
- **(New) Phase E** — Private teacher-student audio conversation.
- Old Phase 5 (Participation logs) → Folded into **Phase F** scope.
- Old Phase 6 (Reports and teacher summary) → **Removed from parent-facing scope**. Teacher-only participation summary retained as a sub-deliverable of Phase F.
- Old Phase 7 (Future extensions) → Retained as deferred section, renumbered.

**New Phase A — Audio Foundation + Schema Plan:**
- Goal: Establish all DB tables, state machine, server modules, adapter interface, mock provider, and feature flags. No browser audio yet.
- Deliverables: `classroom_discussion_sessions`, `classroom_discussion_participants`, `classroom_discussion_events`, `classroom_private_audio_sessions` tables (migration written, not executed). `lib/live-audio/provider-adapter.js` + `mock.js`. All teacher and student discussion APIs (including private help request APIs). Teacher monitor Discussion panel (non-audio controls). Student discussion state bar. POC A: verify state machine, APIs, and page refresh behavior with mock provider at zero audio cost.
- Audio is not yet active in Phase A. Feature flag `LIVE_DISCUSSION_AUDIO_ENABLED=false`. Provider = mock. This phase is infrastructure only, not customer-visible as an audio feature.
- Effort: 1–2 weeks. Risk: Medium. Complexity: Medium.

**New Phase B — Teacher Broadcast + Student Listen-Only:**
- Goal: Teacher can broadcast audio to all students. Students hear teacher. Students cannot publish.
- Behavior: teacher clicks "Start Broadcasting" → microphone requested → all connected students hear teacher. Students are listen-only (canPublish: false enforced at SFU). Students must perform one user gesture (autoplay policy). Teacher can stop at any time.
- Permissions-Policy change required (owner approval gate).
- Effort: 2–3 weeks. Risk: Large. Complexity: Large.
- POC B runs at end of Phase B.

**New Phase C — Speak-to-Class Hand Raise + Approved Student Mic:**
- Goal: Students can raise hand to request speaking to the whole class. Teacher approves one student. That student can publish audio. Whole class hears. Teacher retains full control.
- Two hand raise paths visible in UI: "Raise hand to speak" (request_type = 'speak_to_class'). Private help request (request_type = 'private_help') UI is present but private audio is not active until Phase E.
- Teacher approves speak-to-class student → student gets speaker token (canPublish: true). All class hears.
- Teacher can mute (SFU-enforced), revoke, remove from discussion.
- Effort: 2–3 weeks. Risk: Large. Complexity: Large.

**New Phase D — Group Discussion Up to 5 Students:**
- Goal: Teacher approves up to 5 students simultaneously. All 5 speak at the same time. Whole class hears.
- Mute All: all student speakers muted simultaneously.
- Soft limit: max 5 simultaneous approved class speakers (configurable by owner, not by teacher).
- POC D: 5 students speaking simultaneously, 40 students listening, audio quality acceptable.
- Effort: 1–2 weeks. Risk: Medium. Complexity: Medium.

**New Phase E — Private Teacher-Student Audio Conversation:**
- Goal: Teacher opens a private audio channel with one student. Only the teacher and that student hear it. The rest of the class cannot hear private audio. Main class room continues independently.
- Architecture: a second, separate provider room is created (not client-side muting). The teacher joins both rooms (main + private) simultaneously. The student in private conversation leaves the main audio room (or is muted in main room) and joins the private room. Other students remain in the main room and cannot access the private room.
- Trigger: student requests private help (request_type = 'private_help' hand raise) → teacher sees "Private help" badge in queue → teacher clicks "Open private channel" → `classroom_private_audio_sessions` row created → separate provider room created → teacher and student receive private tokens.
- Only one private conversation active at a time (per discussion session).
- Teacher can end private conversation at any time → private room closed → student returns to listen-only in main room.
- Token security: private tokens are issued only after server verifies `classroom_private_audio_sessions.status = 'active'` for that student.
- Adapter: `createPrivateRoom`, `createTeacherPrivateToken`, `createStudentPrivateToken`, `closePrivateRoom`.
- Effort: 2–3 weeks. Risk: Large. Complexity: Large.

**New Phase F — Mobile / Security / Load QA:**
- Goal: Full QA pass before production readiness.
- Scope: iOS Safari audio tests (autoplay, microphone permission, private room), load test 40 students + 1 teacher, security/tamper test suite (see updated QA checklist below), participation log review (teacher-only, no parent exposure), Permissions-Policy regression.
- Teacher-only participation summary (who attended, who raised hand, who was approved, who was in private conversation) goes here as a final deliverable.
- Effort: 1 week. Risk: Medium. Complexity: Medium.

### Section 21 — Old Phase 5 (Attendance and Participation Logs) → Updated

- Retained as a sub-deliverable of Phase F.
- Parent/guardian APIs confirmed out of scope. This section explicitly states: "Discussion participation data, including attendance, hand-raise history, speaking history, and private conversation metadata, does **not** appear in any parent or guardian report. It is visible only to the class teacher."

### Section 22 — Old Phase 6 (Reports and Teacher Summary) → Removed

- This section is removed.
- The "Parent/guardian APIs remain unchanged" rule is retained in Section 24.3.
- Teacher-only session summary (activity report page) is covered in Phase F.
- Owner decision A8 is now **resolved**: "No — discussion participation data is not visible to parents or guardians."

### Section 24 — Security and Privacy Model

**Section 24.3 — "No Parent Access" rule is strengthened:**
"Discussion participation data — including hand-raise history, approval state, speaking duration, private conversation metadata — is never included in parent-facing or guardian-facing APIs. This is a permanent product decision confirmed by the owner. It is not a phase-specific constraint."

**New Section 24.8 — Private Conversation Isolation:**
"Private teacher-student audio must use a separate provider room, not client-side muting of the main room. This is a hard architectural requirement. The reason: client-side mute can be bypassed by a modified client; a separate provider room ensures the class cannot hear the private conversation at the SFU level. The teacher's private room token does not grant access to any other participant. The student's private token is scoped to the private room only."

### Section 25 — UI Impact

**Section 25.1 — Teacher Screens:**
- Phase C: Hand-raise queue now shows request type badge: "Speak to class" (blue) vs "Private help" (orange/distinct).
- Phase C: Two action buttons per queued student: "Approve for class" (speak_to_class requests) and "Open private channel" (private_help requests).
- Phase E: Private conversation indicator panel: which student is currently in private conversation, "End private conversation" button, duration timer.
- Phase E: Teacher can be in both the main class room and the private room simultaneously — UI must make this dual-connection state clear to the teacher.

**Section 25.2 — Student Screens:**
- Phase A: Discussion status bar shows "Session active" / "Session locked" / "Session ended."
- Phase C: Two request options: "Raise hand to speak to class" and "Request private help from teacher." These can be two buttons or a single "Raise hand" button with a request-type selector.
- Phase E: "You are in a private conversation with your teacher" state — distinct from "You are approved to speak to the class."
- Student in private conversation: microphone is active in the private room only. Main class room audio is paused for that student.

### Section 26 — QA Plan

**New QA items for Phase E (private conversation):**

**Unit tests:**
- Only one active private session per discussion session at a time.
- Student in private session cannot simultaneously be approved to speak to class (request_type and audio_scope cannot both be active in conflicting states).
- Teacher private token is scoped to private room; cannot be used in main room.
- Student private token is scoped to private room only.

**API tests:**
- Student requests private help → `request_type = 'private_help'` set in DB.
- Teacher approves private → `classroom_private_audio_sessions` row created, private room created by provider.
- Teacher ends private → `classroom_private_audio_sessions.status = 'ended'`, private room closed, student returns to listen-only in main room.
- Student cannot call `approve-private` (teacher-only route → 403).
- Student calls `private-audio-token` without an active private session → 403.
- Student from class B attempts to join a private session for class A → 403.

**Security tests:**
- Student in private conversation cannot hear main class room during the private session (verified at provider level, not client only).
- Rest of class cannot join private room (private room name is not exposed to other students; even if guessed, private token is student-specific).
- Two students cannot both have active private sessions simultaneously in the same discussion session.
- Ending private session immediately closes provider room (not just sets a DB flag).

**Section 26.3 — E2E Tests — add:**
- Phase E: teacher opens private channel with student; main class audio continues; student 2 (listening to class) cannot hear private conversation; teacher ends private; student returns to listen-only.
- Phase E: page refresh during private conversation — teacher and student reconnect to private room using REST state + new token.

### Section 28 — Complexity Summary

Replace old table with updated A–F table (see Executive Summary above). Update total estimate to ~9–14 weeks.

### Section 29 — Go/No-Go Decision Points

**Section 29.1 — Go/No-Go: Phase A:**
- Go if: DB schema approved, API routes approved, feature flags approved, data retention policy for discussion metadata approved.
- Recommended: Go.

**Section 29.2 — Go/No-Go: Phase B (first audio phase):**
- Go if: Phase A complete, POC A passed, provider selected (even free tier), DPA in progress, legal review initiated, Permissions-Policy change approved, budget cap configured.
- No-go if: legal review finds audio requires consent mechanisms not yet built; POC B fails on iOS Safari.

**Remove Section 29.1 (old) — "Phase 1 alone is recommended."** This is no longer accurate.

### Section 30 — Final End-to-End Acceptance Criteria

**Add criteria for private conversation:**
- Teacher can approve a private conversation with one student.
- Only the teacher and that student can hear the private conversation.
- Rest of class cannot hear the private conversation (verified at provider level).
- Main class audio continues during private conversation.
- Teacher can end the private conversation; student returns to listen-only.
- Only one active private conversation per discussion session.
- Private conversation cannot be started without a student `request_type = 'private_help'` request in the queue.

**Remove:** Any criteria that imply parent/guardian reports include discussion data.

### Section 33 — Owner Decision Checklist

**Decision A1 updated:** "Is Phase A (audio foundation + schema plan) approved as the first delivery? Audio is mandatory for the MVP. A no-audio delivery is not a meaningful MVP. Phase A alone has no user-visible audio, but it must be complete before Phase B ships. **Decision: owner to confirm.**"

**Decision A8 resolved:** "Should participation data be visible to parents/guardians in reports? **Resolved: No.** Discussion participation data is not visible in any parent or guardian report."

**New Decision A9:** "What is the UI design for two request types? Two separate buttons (raise-hand-to-speak / request-private-help) or one button with type selector? **Owner to confirm.**"

**New Decision A10:** "When a student is in a private conversation, should they be muted in the main class room (SFU-level mute in main room) or removed from the main room entirely and then re-added when private ends? **Recommendation: muted in main room (simpler reconnect). Owner to confirm.**"

**New Decision D4 updated:** "Is the LiveAudioProvider adapter approved including the four new private-room functions (`createPrivateRoom`, `closePrivateRoom`, `createTeacherPrivateToken`, `createStudentPrivateToken`)?"

### Section 34 — Final Reminder

Update all phase references from 0–7 to A–F. Confirm: "No code, no SQL, no commit, no push, no deploy."

### Section 35 — Future Overnight Dev Run Instructions

**Section 35.6 — Implementation Scope updated:**
- Add item: "Phase E — Private teacher-student audio conversation using a separate provider room."
- Remove: "9. Participation and event logging" as a standalone scope item (folded into Phase F).
- Remove all references to parent reports from implementation scope.
- Add explicit prohibition: "Do not include discussion or audio data in any parent or guardian API response."

---

## Confirmed Unchanged

- Provider-neutral `LiveAudioProvider` adapter pattern (extended, not replaced).
- Feature flag safe defaults: `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED=false`, `LIVE_DISCUSSION_AUDIO_ENABLED=false`, `LIVE_AUDIO_PROVIDER=mock`, `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP=0`.
- No video, no recording, no transcription, no AI audio processing.
- Students listen-only by default (`canPublish: false` at SFU).
- Server-side mute enforcement (not client-side only).
- Teacher always has: mute, revoke, remove from discussion, mute all, end audio mode.
- All existing tamper prevention rules (studentId from session, not body; approved_to_speak not writable from student routes).
- Polling + Realtime sync model.
- Budget guard and cost model.
- Permissions-Policy scoped per route (not global).
- Privacy and legal review requirements for audio phases.
- All existing classroom activity, arcade, guardian, parent, student login, and learning flows are unchanged.
- SQL execution remains forbidden. Migrations are written (planning artifact) but not executed.

---

## No code, no SQL, no commit, no push, no deploy

This update is a documentation change to a markdown planning file only. All sections use "Planning only. Do not create yet." markers on SQL. No implementation begins until owner confirms and separately approves execution.
