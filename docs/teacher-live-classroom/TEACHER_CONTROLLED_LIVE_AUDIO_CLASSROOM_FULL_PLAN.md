# Teacher-Controlled Live Audio Classroom — Full Project Plan

**Status:** Final planning and build-ready execution-control document. Implementation is not active by default. Implementation begins only after the owner manually approves the IDE/agent Build/Accept/Agent execution action for this plan after reviewing it. After that manual approval, the agent must begin code implementation or explicitly state it is still in plan/documentation mode and cannot edit code. No SQL execution, migration execution, commit, push, or deploy is approved.

**Version:** 3.2 — Final Build-Ready Execution Protocol — 2026-05-29

**Change summary (v3.2):**
- Converted Section 35 from future-run language into a build-ready execution protocol.
- Clarified that chat-body approval is never sufficient as an implementation trigger.
- Clarified that manual IDE Build/Accept/Agent execution approval is the only implementation trigger after the plan is approved.
- Closed all development-run decisions required to avoid implementation ambiguity.
- Resolved D9 for development run as Option A: separate entitlement tables.
- Resolved D10 for development run as central entitlement helper from Section 23.7.
- Resolved Phase A/D technical defaults for the development run.
- Defined valid and invalid first responses after manual build approval.
- Defined exact implementation scope, order, restrictions, and final report.
- All Group A, B, C, D, E decisions in Section 33 are now resolved for the development run (production blockers remain open for production only).
- No code, no SQL execution, no commit, no push, no deploy in this documentation pass.

**Change summary (v3.1):**
- Added Section 23: Admin Entitlement and Permission Model for Live Discussion/Audio.
- Main ADMIN controls all live discussion/audio access. No automatic access for any school, teacher, or private teacher.
- School entitlement: ADMIN grants school; school manager delegates to individual teachers.
- Private teacher entitlement: ADMIN grants directly; subject grants still apply.
- Nine-gate permission order documented (Section 23.5).
- DB planning notes for entitlement tables added (Section 23.6 and Section 12.6).
- Server helper planning added (Section 23.7).
- All teacher discussion/audio API routes must call entitlement check before any logic.
- Section 13 (API), Section 24 (Security), Section 25 (UI), Section 26 (QA), Section 30 (Acceptance), Section 33 (Decisions), Section 35 (Dev run) all updated.
- New resolved owner decisions: A11, A12, A13 (entitlement model approved).
- New open owner decisions: D9 (entitlement DB structure), D10 (entitlement helper design).
- No code, no SQL execution, no commit, no push, no deploy.

**Change summary (v3.0):**
- Product goal updated: primary use case is **remote learning**, not only in-class hand raising.
- **Audio is mandatory for the MVP.** A no-audio hand-raise-only phase is not a meaningful product MVP.
- Phase structure renumbered **A–F** (audio-first). The previous no-audio-only phase is removed as a standalone MVP; audio is mandatory from the start.
- Added **Phase E**: private teacher-student audio conversation using a separate provider room.
- **Parent reports confirmed fully out of scope.** Discussion/live-audio participation must never appear in any parent or guardian report. Owner decision A8 resolved.
- Two student request types defined: `speak_to_class` and `private_help`.
- Data model extended: `request_type` and `audio_scope` columns; new `classroom_private_audio_sessions` table.
- `LiveAudioProvider` adapter extended with four private-room functions.
- No code, no SQL execution, no commit, no push, no deploy.

**Prepared for:** Owner review and go/no-go decision

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Architecture Context — Active Digital Classroom](#2-product-architecture-context--active-digital-classroom)
3. [Current Codebase Map](#3-current-codebase-map)
4. [Full Proposed Architecture](#4-full-proposed-architecture)
5. [LiveAudioProvider Adapter — Provider-Neutral Interface](#5-liveaudioprovider-adapter--provider-neutral-interface)
6. [Provider Comparison and Evaluation](#6-provider-comparison-and-evaluation)
7. [Cost Model and Budget Guard](#7-cost-model-and-budget-guard)
8. [Realtime Security Hardening](#8-realtime-security-hardening)
9. [Polling Fallback vs Realtime — Sync Model](#9-polling-fallback-vs-realtime--sync-model)
10. [Permissions-Policy Scoping Analysis](#10-permissions-policy-scoping-analysis)
11. [Privacy and Legal Analysis](#11-privacy-and-legal-analysis)
12. [Database Plan](#12-database-plan)
13. [API Plan](#13-api-plan)
14. [Realtime Plan](#14-realtime-plan)
15. [POC Plan](#15-poc-plan)
16. [Phase A — Audio Foundation + Schema Plan](#16-phase-a--audio-foundation--schema-plan)
17. [Phase B — Teacher Broadcast + Student Listen-Only](#17-phase-b--teacher-broadcast--student-listen-only)
18. [Phase C — Speak-to-Class Hand Raise + Approved Student Mic](#18-phase-c--speak-to-class-hand-raise--approved-student-mic)
19. [Phase D — Group Discussion Up to 5 Students](#19-phase-d--group-discussion-up-to-5-students)
20. [Phase E — Private Teacher-Student Audio Conversation](#20-phase-e--private-teacher-student-audio-conversation)
21. [Phase F — Mobile / Security / Load QA](#21-phase-f--mobile--security--load-qa)
22. [Future Extensions (Deferred)](#22-future-extensions-deferred)
23. [Admin Entitlement and Permission Model for Live Discussion/Audio](#23-admin-entitlement-and-permission-model-for-live-discussionaudio)
24. [Security and Privacy Model](#24-security-and-privacy-model)
25. [UI Impact](#25-ui-impact)
26. [QA Plan](#26-qa-plan)
27. [Rollout Plan](#27-rollout-plan)
28. [Complexity Summary](#28-complexity-summary)
29. [Go/No-Go Decision Points](#29-gono-go-decision-points)
30. [Final End-to-End Acceptance Criteria](#30-final-end-to-end-acceptance-criteria)
31. [Files by Phase — Refined List](#31-files-by-phase--refined-list)
32. [Required Future Environment Variables](#32-required-future-environment-variables)
33. [Owner Decision Checklist](#33-owner-decision-checklist)
34. [Final Reminder](#34-final-reminder)
35. [Future Overnight Full Dev Implementation Run Instructions](#35-future-overnight-full-dev-implementation-run-instructions)

---

## 1. Executive Summary

This document is the full project plan for a **Teacher-Controlled Live Audio Classroom** feature. It is an execution-ready planning artifact. No implementation has been done. The plan covers all phases from architecture decisions through production delivery.

**Product goal: remote learning.** The primary use case is a teacher-led remote learning session where teacher and students are in different physical locations. This is not an in-class hand-raise helper. Audio is the core delivery mechanism for this product.

The feature enables a teacher to run a teacher-mediated live audio session alongside a `live_lesson` classroom activity. The teacher broadcasts audio to all students. Students are listen-only by default. Students can raise their hand to request speaking to the whole class, or request private help from the teacher. The teacher approves, revokes, and controls all audio at all times. The teacher can approve a managed group discussion with up to 5 simultaneous student speakers. The teacher can open a private audio channel with one student that the rest of the class cannot hear. This is not Zoom, not video, not student-to-student communication.

**Audio is mandatory for the MVP.** A no-audio hand-raise-only phase is not a meaningful product MVP and is not a deliverable on its own.

**Parent reports are out of scope.** Discussion participation, hand-raise history, audio session metadata, and private conversation records are never added to any parent or guardian report. This is a permanent product decision.

### Phase Summary

| Phase | Description | Complexity | Effort | Risk |
|-------|-------------|-----------|--------|------|
| A | Audio foundation + schema plan | Medium | 1–2 weeks | Medium |
| B | Teacher broadcast + student listen-only | Large | 2–3 weeks | Large |
| C | Speak-to-class hand raise + approved student mic | Large | 2–3 weeks | Large |
| D | Group discussion — up to 5 students | Medium | 1–2 weeks | Medium |
| E | Private teacher-student audio conversation | Large | 2–3 weeks | Large |
| F | Mobile / security / load QA | Medium | 1 week | Medium |
| — | Future extensions (recording, AI, breakout) | Very Large | Deferred | Very Large |

**Total estimated effort Phase A–F:** 9–14 weeks, one or two senior engineers, tested audio provider.

**Recommended starting point:** Phase A (audio foundation + schema plan). Phase A establishes all DB tables, the state machine, the server module, the provider adapter, and the mock provider. No browser audio is active in Phase A — it is infrastructure only. Phase B is the first user-visible audio delivery. Phases A and B together constitute the minimum meaningful MVP.

---

**Audio phases (B–E) are blocked until:**
- Owner selects audio provider after reviewing POC B/C results.
- Legal/privacy review is complete for all operating jurisdictions including Israel.
- Audio provider DPA is signed.
- Permissions-Policy change is approved.
- Cost assumptions are verified against the provider's current pricing page (see Section 6).

---

## 2. Product Architecture Context — Active Digital Classroom

### 2.1 This Feature Is Not a Standalone Tool

The Teacher-Controlled Live Audio Classroom is one layer of a larger **Active Digital Classroom** system. It must remain connected to learning activity data and teacher control. It must not become a generic audio conferencing tool that operates independently of classroom context.

**Primary use case: remote learning.** Teacher and students may be in different physical locations. Audio is the primary delivery channel for the learning session. The feature must function fully over the internet without requiring physical co-location.

The Active Digital Classroom vision:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Active Digital Classroom                      │
├─────────────────┬──────────────────┬────────────────────────────┤
│  Classroom      │  Live Discussion  │  Teacher Intelligence      │
│  Activities     │  Layer           │  Layer                     │
│                 │                  │                            │
│  live_lesson    │  hand raise      │  participation logs        │
│  guided_prac.   │  managed audio   │  post-lesson summary       │
│  quiz           │  teacher control │  follow-up homework        │
│  homework       │  realtime state  │  adaptive grouping (future)│
│                 │                  │  teacher dashboard         │
└─────────────────┴──────────────────┴────────────────────────────┘
```

### 2.2 Architecture Constraints

- A discussion session is always anchored to an active `live_lesson` classroom activity.
- Teacher controls discussion the same way they control the live lesson: from the monitor page.
- Student discussion state is visible on the same student activity page as the live lesson.
- Discussion participation data feeds into teacher reports alongside question-answer data.
- The system remains subject to the same teacher ownership and class membership rules as all existing classroom features.

### 2.3 What This Is NOT

- Not a general-purpose audio conferencing tool.
- Not Zoom, Teams, Meet, or any video call product.
- Not a student-to-student communication channel.
- Not an open classroom chat.
- Not a standalone audio session that runs without a live_lesson activity.
- Not a recording product (in initial versions — recording is explicitly out of scope for the MVP).
- Not an AI transcript product — no transcription, no speech-to-text, no AI audio processing.
- Not a video product — video is out of scope.
- Not an in-class-only tool — remote learning is the primary use case.

---

## 3. Current Codebase Map

### 3.1 Project Structure

- **Router:** Next.js Pages Router (`pages/`). No App Router. All routes under `pages/`.
- **UI:** Tailwind CSS v4, custom Hebrew RTL components, no shadcn/Radix/MUI.
- **Language:** JavaScript (not TypeScript). All files `.js` or `.jsx`.
- **Auth models:** Two separate systems: Supabase JWT for teachers/parents; HttpOnly cookie session for students.

### 3.2 Teacher Portal

**Routes (`pages/teacher/`):**

| Route | File | Purpose |
|-------|------|---------|
| `/teacher/login` | `pages/teacher/login.js` | Supabase email/password login |
| `/teacher/dashboard` | `pages/teacher/dashboard.js` | Teacher home |
| `/teacher/class/[classId]` | `pages/teacher/class/[classId].js` | Class report |
| `/teacher/class/[classId]/activities` | `.../activities/index.js` | Activity list |
| `/teacher/class/[classId]/activities/new` | `.../activities/new.js` | Create activity |
| `/teacher/class/[classId]/activities/[activityId]/monitor` | `.../monitor.js` | **Primary integration point** |
| `/teacher/class/[classId]/activities/[activityId]/report` | `.../report.js` | Post-close report |

**Teacher auth (`lib/teacher-server/teacher-session.server.js`):**
- All teacher API routes call `requireTeacherApiContext(req)`.
- Validates `Authorization: Bearer <supabase_access_token>`.
- Checks `app_metadata.role === "teacher"` on JWT.
- `teacher_id` always equals the Supabase `auth.users.id`, never taken from request body.

**Teacher client (`lib/teacher-portal/use-teacher-portal-session.js`):**
- `useTeacherPortalSession()` → `{ session, token, teacherAuthFetch }`.
- `teacherAuthFetch(url, opts)` attaches `Authorization: Bearer` automatically.

### 3.3 Classroom Activities

**DB tables (from `supabase/migrations/024_classroom_activities.sql`):**
- `classroom_activities` — assignment definition; `mode` ∈ `{live_lesson, guided_practice, quiz, homework}`; `status` ∈ `{draft, active, paused, closed, archived}`; `current_question_idx` for live sync.
- `classroom_activity_student_status` — per-student progress; `last_seen_at` heartbeat.
- `classroom_activity_attempts` — per-question answers; `correct_answer` server-derived only.

**RLS posture:** RLS enabled, no policies on all three tables. Service-role-only access via API. Browser cannot access these tables directly.

**Server entry point:** `lib/teacher-server/teacher-activities.server.js` (~1200+ lines).

### 3.4 `live_lesson` Mode

- `live_lesson` is a `mode` value on `classroom_activities`, not a separate table.
- Teacher controls broadcast index via `current_question_idx`.
- Students may only answer the currently broadcast question.
- Teacher can pause/resume only `live_lesson` activities.
- **Sync today: HTTP polling only.** Students poll every 3 s. Teacher monitor polls every 5 s. No Realtime.

### 3.5 Teacher Activity Monitor

- File: `pages/teacher/class/[classId]/activities/[activityId]/monitor.js`
- Polls `GET /api/teacher/activities/[id]/monitor` every 5 s.
- Displays: student status grid, question controls, pause/resume/close buttons.
- **This is where all discussion controls will live** for this feature.

### 3.6 Student Activity Page

- File: `pages/student/activity/[activityId].js`
- Polls `GET /api/student/activities/[id]/live-state` every 3 s in live_lesson mode.
- Shows "ממתינים למורה..." while paused.
- **This is where the raise-hand button and discussion status will live** for this feature.

### 3.7 Student Auth

- Login: username + 4-digit PIN → `POST /api/student/login`.
- Cookie: `liosh_student_session` (HttpOnly, SameSite=Lax, Secure in prod, 7-day).
- Validated server-side via `getAuthenticatedStudentSession(req)` → `student_sessions` lookup by service role.
- **Students are not Supabase Auth users. They have no Supabase JWT. They cannot authenticate directly to Supabase DB or Realtime as named identities.**

### 3.8 Existing Supabase Usage

- **Supabase Auth:** Teachers and parents only.
- **Supabase DB (service role):** All student and activity data. All new discussion tables will follow this pattern.
- **Supabase Realtime:** `@supabase/realtime-js` is a transitive dependency only. **Not wired anywhere in the app.** No `supabase.channel()`, no `.subscribe()`, no `.on('broadcast')` in any source file.
- **CSP:** `wss://*.supabase.co` is already allowed in `next.config.js`. WebSocket connections to Supabase Realtime are not blocked.
- **No Supabase Storage usage** for this feature.

### 3.9 Critical Existing Constraint

`next.config.js` currently sets:
```
Permissions-Policy: camera=(), microphone=()
```
This **blocks all microphone access** site-wide. Any audio phase requires a controlled change to this header. See Section 10 for the scoped analysis.

### 3.10 Existing Audio Code

No WebRTC. No audio streaming. No socket.io. The only audio in the project is:
- `utils/audio-recording-core.js` — short Hebrew utterance recording for learning tasks (MediaRecorder, not live streaming).
- `utils/audio-playback-core.js` — playback of pre-generated Hebrew TTS audio.
- `node-edge-tts` — server-side TTS for Hebrew content generation.

None of these are relevant to live classroom audio.

---

## 4. Full Proposed Architecture

### 4.1 State Machine

**Discussion session states:**
```
idle → active → locked → ended
              ↘ ended
```

**Student discussion state per session — two request paths:**
```
                        ┌─ approved_to_speak (class) ⇆ muted
listening → hand_raised─┤  (request_type = 'speak_to_class', audio_scope = 'class')
              │         └─ (cleared by teacher or session end)
              │
              ├─ hand_raised_private ─→ in_private_conversation ─→ listening
              │  (request_type = 'private_help', audio_scope = 'private')
              │  (teacher opens separate private room)
              │
              └─ (cleared by teacher)
```

**Audio scope values (stored in `audio_scope` column):**
- `null` — student is listening only; no active audio permission.
- `'class'` — student is approved to speak; whole class hears them.
- `'private'` — student is in a private conversation with the teacher only.

**Session-level audio mode (tracked via `classroom_discussion_sessions` flags):**
```
teacher_broadcast_only  → main class room active; teacher publishes; all students subscribe
group_discussion        → up to 5 student speakers; whole class hears all approved speakers
private_active          → one student is in private room with teacher; main room continues
```

Note: `private_active` is not mutually exclusive with `teacher_broadcast_only` or `group_discussion`. A private conversation may run in parallel with the main class room.

### 4.2 Layers

```
┌─────────────────────────────────────────────────────────┐
│  Teacher UI (monitor.js)   Student UI (activity page)   │
│  [controls hidden if teacher has no entitlement]        │
├─────────────────────────────────────────────────────────┤
│  Discussion REST APIs       Discussion REST APIs         │
│  /api/teacher/…/discussion  /api/student/…/discussion    │
├─────────────────────────────────────────────────────────┤
│  Admin Entitlement Gate     (see Section 23)             │
│  Global flag → ADMIN grant → School/Teacher grant        │
├─────────────────────────────────────────────────────────┤
│  Discussion Server Module   (lib/teacher-server/         │
│  teacher-discussion.server.js)                          │
├─────────────────────────────────────────────────────────┤
│  Supabase DB (service role)  Supabase Realtime Broadcast │
│  classroom_discussion_*      discussion:{sessionId}      │
├─────────────────────────────────────────────────────────┤
│  LiveAudioProvider Adapter   (Phase B+)                  │
│  lib/live-audio/provider-adapter.js                     │
├─────────────────────────────────────────────────────────┤
│  Concrete Provider          (Phase B+)                   │
│  lib/live-audio/providers/livekit.js  (or agora.js etc.) │
└─────────────────────────────────────────────────────────┘
```

### 4.3 DB Layer

Four new discussion tables (do not create yet):
- `classroom_discussion_sessions` — one per teacher-initiated discussion, anchored to an activity.
- `classroom_discussion_participants` — one row per student per session; tracks hand raise, request type, audio scope, approval, mute.
- `classroom_discussion_events` — append-only event log.
- `classroom_private_audio_sessions` — one row per private teacher-student audio conversation (Phase E).

Entitlement storage (Section 12.6, Section 23.6) is planned separately and is not part of these four tables.

Full schema in Section 12.

### 4.4 Realtime Layer

- First use of Supabase Realtime in the project.
- Channel per session: `discussion:{sessionId}`.
- All authoritative state writes go through REST API, never directly through Realtime from client.
- Realtime carries event notifications only (optimistic signals). DB is source of truth.
- Full security analysis in Section 8.
- Full sync model definition in Section 9.

### 4.5 Audio Layer (Phases B–E)

- Isolated behind a provider-neutral `LiveAudioProvider` adapter (Section 5).
- Provider selected by owner from comparison in Section 6.

**Main class room (Phases B–D):**
- Teacher audio token: `canPublish: true`, `canSubscribe: true`.
- Student listener token: `canPublish: false`, `canSubscribe: true`. Default for all students.
- Student speaker token: issued only after server verifies `audio_scope = 'class'` and `is_muted = false`.
- Mute enforced server-side via provider API, not client-only.

**Private room (Phase E):**
- A second, separate provider room is created for each private teacher-student conversation.
- Room name: `"private-{sessionId}-{studentId}"`.
- Teacher private token: `canPublish: true`, `canSubscribe: true`, scoped to the private room only.
- Student private token: `canPublish: true`, `canSubscribe: true`, scoped to the private room only. Issued only after server verifies `audio_scope = 'private'` for that student.
- **The private room is a provider-level isolation, not a client-side mute.** The rest of the class has no token for the private room and cannot access it regardless of client behavior.
- The teacher joins two rooms simultaneously during a private conversation: the main class room (as publisher) and the private room (as publisher). The private room audio is entirely separate from the main room.
- The student in the private conversation joins the private room only. Their main room subscription is suspended while the private conversation is active.

### 4.6 Feature Flags and Entitlement Layering

- `LIVE_DISCUSSION_ENABLED` — server-side runtime flag; authoritative kill switch for all live discussion server APIs and server-side gates. Setting this to `false` disables discussion at the API layer immediately, with no code deploy required.
- `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` — client/UI hint only. May be inlined at build time and does not take effect without a rebuild and redeploy. Must never be treated as an authoritative runtime kill switch. Server APIs must remain blocked when `LIVE_DISCUSSION_ENABLED=false` even if the client bundle displays stale UI.
- `LIVE_DISCUSSION_AUDIO_ENABLED` — server-side flag; gates audio token issuance globally.
- All flags start `false`. Never enabled without owner approval.
- Server-side kill switch: setting `LIVE_DISCUSSION_ENABLED=false` immediately disables all discussion APIs at runtime with no code deploy. Client UI may lag until next rebuild/redeploy if only `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` is changed.

**The global feature flag is not sufficient on its own.** Enabling it does not grant access to any school, school teacher, or private teacher. See Section 23 for the full entitlement model that sits between the feature flag and actual API access.

---

## 5. LiveAudioProvider Adapter — Provider-Neutral Interface

### 5.1 Why an Adapter

The project must not be hard-coupled to a single audio provider. If the chosen provider changes pricing, sunsets, or proves unsuitable for mobile in Israel, the product code must not need rewriting. The adapter isolates all provider-specific calls behind a single internal interface.

### 5.2 Adapter Location

```
lib/live-audio/
  provider-adapter.js         ← adapter interface and dispatcher
  providers/
    livekit.js                ← LiveKit implementation
    agora.js                  ← Agora implementation (future)
    daily.js                  ← Daily.co implementation (future)
    mock.js                   ← mock for POC A and testing
  types.js                    ← JSDoc type definitions
```

### 5.3 Adapter Interface

The following functions form the internal interface. All provider implementations must implement all functions. Feature code calls only these functions, never provider SDK methods directly.

```javascript
// Do not implement yet. This is the planned interface.

/**
 * Create a new audio room for a discussion session.
 * @param {object} opts
 * @param {string} opts.roomName   - derived from sessionId, e.g. "discussion-{sessionId}"
 * @param {number} opts.maxParticipants
 * @param {boolean} opts.recordingEnabled  - always false in Phases B–E
 * @returns {Promise<{ roomId: string, roomName: string }>}
 */
async function createRoom(opts) {}

/**
 * Close a room. Disconnects all participants.
 * @param {string} roomName
 * @returns {Promise<void>}
 */
async function closeRoom(roomName) {}

/**
 * Generate a token for the teacher (can publish + subscribe).
 * @param {object} opts
 * @param {string} opts.roomName
 * @param {string} opts.teacherId        - used as participant identity
 * @param {number} opts.ttlSeconds       - token lifetime, max 3600
 * @returns {Promise<{ token: string, serverUrl: string }>}
 */
async function createTeacherToken(opts) {}

/**
 * Generate a token for a student who is a listener only (cannot publish).
 * @param {object} opts
 * @param {string} opts.roomName
 * @param {string} opts.studentId        - used as participant identity
 * @param {number} opts.ttlSeconds
 * @returns {Promise<{ token: string, serverUrl: string }>}
 */
async function createStudentListenerToken(opts) {}

/**
 * Generate a token for a student who is approved to speak (can publish).
 * Called only after server verifies approved_to_speak=true and is_muted=false.
 * @param {object} opts
 * @param {string} opts.roomName
 * @param {string} opts.studentId
 * @param {number} opts.ttlSeconds
 * @returns {Promise<{ token: string, serverUrl: string, canPublish: true }>}
 */
async function createStudentSpeakerToken(opts) {}

/**
 * Grant publish permission to a specific participant already in the room.
 * Used when teacher approves a student who is already connected.
 * @param {string} roomName
 * @param {string} participantIdentity   - studentId
 * @returns {Promise<void>}
 */
async function grantStudentSpeak(roomName, participantIdentity) {}

/**
 * Revoke publish permission from a specific participant.
 * Used when teacher revokes a student's speaking rights.
 * Enforced at SFU level, not client-side.
 * @param {string} roomName
 * @param {string} participantIdentity
 * @returns {Promise<void>}
 */
async function revokeStudentSpeak(roomName, participantIdentity) {}

/**
 * Mute a specific participant. Removes publish permission at SFU level.
 * @param {string} roomName
 * @param {string} participantIdentity
 * @returns {Promise<void>}
 */
async function muteStudent(roomName, participantIdentity) {}

/**
 * Mute all participants except the teacher.
 * @param {string} roomName
 * @param {string} teacherIdentity       - excluded from mute
 * @returns {Promise<void>}
 */
async function muteAll(roomName, teacherIdentity) {}

/**
 * Get the current publish/subscribe state of a participant.
 * @param {string} roomName
 * @param {string} participantIdentity
 * @returns {Promise<{ connected: boolean, canPublish: boolean, isSpeaking: boolean }>}
 */
async function getParticipantState(roomName, participantIdentity) {}

/**
 * Get room-level usage stats if the provider supports it.
 * Used for the budget guard (Section 7).
 * @param {string} roomName
 * @returns {Promise<{ participantMinutes: number, participantCount: number } | null>}
 */
async function getUsageStats(roomName) {}

// ── Private teacher-student conversation (Phase E) ──────────────────────────

/**
 * Create a private two-participant room for a teacher-student private conversation.
 * Max participants: 2 (teacher + one student). Recording always disabled.
 * @param {object} opts
 * @param {string} opts.roomName   - e.g. "private-{sessionId}-{studentId}"
 * @param {boolean} opts.recordingEnabled  - always false
 * @returns {Promise<{ roomId: string, roomName: string }>}
 */
async function createPrivateRoom(opts) {}

/**
 * Close a private room. Disconnects teacher and student.
 * @param {string} roomName
 * @returns {Promise<void>}
 */
async function closePrivateRoom(roomName) {}

/**
 * Generate a teacher token for the private room (can publish + subscribe).
 * Scoped to the private room name — cannot be used in the main class room.
 * @param {object} opts
 * @param {string} opts.roomName
 * @param {string} opts.teacherId
 * @param {number} opts.ttlSeconds  - max 3600
 * @returns {Promise<{ token: string, serverUrl: string }>}
 */
async function createTeacherPrivateToken(opts) {}

/**
 * Generate a student token for the private room (can publish + subscribe).
 * Called only after server verifies classroom_private_audio_sessions.status = 'active'
 * for this student in this session.
 * Scoped to the private room name — cannot be used in the main class room.
 * @param {object} opts
 * @param {string} opts.roomName
 * @param {string} opts.studentId
 * @param {number} opts.ttlSeconds
 * @returns {Promise<{ token: string, serverUrl: string }>}
 */
async function createStudentPrivateToken(opts) {}
```

### 5.4 Provider Dispatch

`provider-adapter.js` reads `LIVE_AUDIO_PROVIDER` environment variable (default `"livekit"`) and imports the corresponding provider module. All feature code imports only from `provider-adapter.js`.

```javascript
// Do not implement yet. This shows the intended pattern.

import { getLiveAudioProvider } from '@/lib/live-audio/provider-adapter';

const provider = getLiveAudioProvider(); // reads env var, returns the right impl
const { token } = await provider.createTeacherToken({ roomName, teacherId, ttlSeconds: 3600 });
```

### 5.5 How to Switch Providers

When switching from LiveKit to another provider:
1. Create `lib/live-audio/providers/{newprovider}.js` implementing all adapter functions.
2. Change `LIVE_AUDIO_PROVIDER` environment variable.
3. No product code changes.
4. Run the POC B test scenario against the new provider before switching production.

### 5.6 Mock Provider for Phase A and Testing

`lib/live-audio/providers/mock.js` implements the full interface but does nothing — all functions return immediately with success. This includes all four new private-room functions (`createPrivateRoom`, `closePrivateRoom`, `createTeacherPrivateToken`, `createStudentPrivateToken`). Used in:
- Phase A (audio infrastructure, mock is the active provider — no real audio connection).
- Unit tests for discussion session logic.
- POC A (state machine and API validation with no real provider).

---

## 6. Provider Comparison and Evaluation

### 6.1 Comparison Matrix

The following table evaluates the four primary candidates for the audio provider role.

| Criteria | LiveKit Cloud | LiveKit Self-Host | Agora | Daily.co |
|----------|:------------:|:-----------------:|:-----:|:--------:|
| **Free tier / trial** | Yes (limited free tier) | Free (OSS, pay only for infra) | Yes (10,000 free min/month) | Yes (10,000 free min/month) |
| **POC without payment** | Yes | Yes (VPS cost only) | Yes | Yes |
| **Audio-only rooms** | Yes | Yes | Yes | Yes |
| **Chrome support** | Excellent | Excellent | Excellent | Excellent |
| **Firefox support** | Good | Good | Good | Good |
| **Safari iOS support** | Good | Good | Fair (known issues) | Good |
| **Server-side listener token** | Yes (`canPublish: false`) | Yes | Yes (audience role) | Yes |
| **Server-side grant publish** | Yes (API + SDK) | Yes | Yes (host promote) | Yes (REST API) |
| **Server-side forced mute** | Yes (SFU-enforced) | Yes | Yes (API) | Yes (REST API) |
| **Server close room** | Yes | Yes | Yes | Yes |
| **Webhooks** | Yes | Yes | Yes | Yes |
| **Usage stats API** | Yes | Limited | Yes | Yes |
| **DPA available** | Yes | N/A (self-hosted) | Yes | Yes |
| **Privacy suitability (children)** | Good | Best (no 3rd party) | Requires review | Requires review |
| **Next.js Pages Router complexity** | Low | Low | Medium | Low |
| **Student cookie auth integration** | Server-side token only — clean | Same | Same | Same |
| **Teacher JWT integration** | Server-side token only — clean | Same | Same | Same |
| **Open source / auditable** | Yes | Yes | No | No |
| **OSS Node.js SDK** | `livekit-server-sdk` | Same | `agora-token` + REST | `@daily-co/daily-js` + REST |

### 6.2 Cost Estimates

> **All pricing figures below are unverified estimates based on publicly available documentation as of early 2026. They must be verified against each provider's current pricing page before any provider is approved for production. Billing unit definitions vary by provider and must be confirmed.**

#### Billing unit clarification

| Provider | Billing unit | Unit definition |
|---------|-------------|----------------|
| LiveKit Cloud | per participant-minute | One participant connected for one minute in an audio room |
| LiveKit Self-Host | per VPS/hour (fixed infra) | Not per-participant; fixed server cost regardless of session count |
| Agora | per participant-minute | One participant connected for one minute in a channel |
| Daily.co | per participant-minute | One participant connected for one minute in a room |

#### Unverified rate estimates (must verify before provider approval)

| Provider | Estimated rate | Billing model | Free allowance |
|---------|---------------|--------------|----------------|
| LiveKit Cloud | ~$0.001–0.003 per participant-minute | Usage-based | Limited free tier (verify) |
| LiveKit Self-Host | ~$5–20/month VPS (fixed) | Fixed infra | N/A — you pay for the server |
| Agora | ~$0.00099 per participant-minute | Usage-based | ~10,000 participant-minutes/month (verify) |
| Daily.co | ~$0.00099 per participant-minute | Usage-based | ~10,000 participant-minutes/month (verify) |

#### Example scenario — official capacity target

- **Class size:** 41 participants (40 students + 1 teacher) — official plan target
- **Session length:** 45 minutes
- **Participant-minutes per session:** 41 × 45 = **1,845 participant-minutes**
- **Safety margin for load testing:** 46 participants (45 students + 1 teacher)

The old 20-student (21-participant) figure is retained below as a small-class comparison only. All load tests and QA targets use the 40-student (41-participant) baseline.

#### Corrected cost table — 40-student class (using unverified rate estimates — must verify before use)

| Scale | Sessions/month | Participant-minutes | LiveKit Cloud (at $0.002/pm est.) | Agora / Daily (at $0.00099/pm est.) |
|-------|---------------|--------------------:|:---------------------------------:|:------------------------------------:|
| Low | 10 | 18,450 | ~$36.90 | ~$8.37 (8,450 paid pm × $0.00099) |
| Medium | 40 | 73,800 | ~$147.60 | ~$63.16 (63,800 paid pm × $0.00099) |
| High | 100 | 184,500 | ~$369.00 | ~$172.76 (174,500 paid pm × $0.00099) |
| Very High | 500 | 922,500 | ~$1,845.00 | ~$902.28 (912,500 paid pm × $0.00099) |

#### Small-class comparison — 20-student class (reference only)

| Scale | Sessions/month | Participant-minutes | LiveKit Cloud (at $0.002/pm est.) | Agora / Daily (at $0.00099/pm est.) |
|-------|---------------|--------------------:|:---------------------------------:|:------------------------------------:|
| Low | 10 | 9,450 | ~$18.90 | ~$0 (under free tier) |
| Medium | 40 | 37,800 | ~$75.60 | ~$27.52 |
| High | 100 | 94,500 | ~$189.00 | ~$83.66 |

#### LiveKit Ship plan estimate (per-session marginal cost, 40-student class)

If using LiveKit's Ship plan or a similar plan with included monthly WebRTC minutes and an overage rate of approximately $0.0005 per WebRTC minute:

```
41 participants × 45 minutes = 1,845 WebRTC minutes per session
1,845 × $0.0005 = ~$0.92 marginal usage cost per session after included quota
```

This estimate applies only to sessions that exceed the monthly included quota. The exact breakeven point (where the plan's included minutes are exhausted) depends on total monthly session volume. Verify current LiveKit plan pricing before using this figure.

**"pm" = participant-minute.**

Agora/Daily: the free 10,000 participant-minutes/month is deducted first. At 40 students, a single session (1,845 pm) uses roughly 18% of the free monthly allowance, so the free tier is exhausted after approximately 5–6 sessions per month. Beyond that, the paid rate applies.

LiveKit Self-Host (alternative): fixed infrastructure cost of ~$5–20/month regardless of session volume. At 40-student scale and medium-to-high session frequency (40–500 sessions/month), self-host typically becomes cheaper than managed cloud. At low volume (≤10 sessions/month), managed cloud is more economical.

**Important:** These are approximate estimates. Real costs depend on the provider's current pricing tier, regional pricing, minimum monthly fees, and support tier. **Always verify on the provider's pricing page before committing to a provider or setting a budget cap.**

#### LiveKit Self-Host cost structure

A basic VPS (e.g., Hetzner CX21, 2 vCPU, 4 GB RAM) is sufficient for ~5 simultaneous classrooms.
- Fixed cost: ~$4–8/month regardless of usage.
- Requires DevOps setup (Docker, TURN server, monitoring).
- No per-minute cost after infra is paid.
- Best for predictable or high-volume use.

### 6.3 POC Recommendation

**For free/no-cost POC (POC B and C):**

The goal is to run POC B with zero or near-zero cost using a free sandbox account. Either of the following is suitable as the first POC provider:

1. **Agora** — approximately 10,000 free participant-minutes/month (verify current allowance). No credit card required for trial. Console at console.agora.io. The POC scenario for a 40-student class (41 participants × 45 minutes × 1 session = 1,845 participant-minutes) remains well within any reasonable free tier; 5–6 such sessions exhaust the typical 10,000 pm/month free allowance, which is sufficient for POC purposes.
2. **Daily.co** — similar free tier. Good documentation. Clean REST API. Also a valid first POC choice.

**Important:** The POC provider is not the production provider. The free-tier POC is specifically for proving audio control mechanics (server-side mute enforcement, speaker token model, iOS Safari behavior) at zero cost and zero risk.

**LiveKit must be separately evaluated** regardless of which provider runs POC B first. LiveKit's server-side permission model (granular `canPublish` per participant, room-level SFU enforcement, open-source auditability) is critical for a children's product where teacher control must be SFU-enforced, not just client-enforced. LiveKit Cloud has a free tier sufficient for POC use.

**Production provider is not selected until:**
- POC B passes on at least one provider.
- POC C comparison results are reviewed.
- LiveKit has been evaluated even if POC B runs on Agora or Daily first.
- Owner reviews cost assumptions from verified pricing pages (see decision C9 in Section 33).

### 6.4 Production Recommendation

**Recommended production path:**

- Start with **LiveKit Cloud** (managed, auditable, strong permission model).
- If volume grows significantly, migrate to **LiveKit Self-Host** (same SDK, no product code changes via adapter).
- The adapter pattern (Section 5) makes this migration a configuration change, not a code rewrite.

**Do not commit to any provider before POC C is complete.**

### 6.5 100ms / VideoSDK

- **100ms:** Primarily video-first. Audio-only support exists but less mature. More complex pricing. Not recommended as first choice.
- **VideoSDK:** Good for React Native. Browser support is sufficient. Less documentation for Next.js Pages Router integration. Not recommended as first choice.

---

## 7. Cost Model and Budget Guard

### 7.1 Cost Model Formula

```
participant_minutes = participants × session_minutes × sessions_per_month
estimated_cost      = participant_minutes × provider_rate_per_participant_minute
```

**Billing unit:** one participant-minute = one participant connected for one minute. A 41-person session (40 students + 1 teacher) lasting 45 minutes = 41 × 45 = 1,845 participant-minutes. This is confirmed for Agora and Daily. LiveKit Cloud billing unit must be verified on their current pricing page.

**Official capacity target:** 40 students + 1 teacher = **41 concurrent audio participants** per session. Load tests must target 40 students (41 participants). Safety-margin tests should target 45 students + 1 teacher = 46 participants.

**Reference scenario (41 participants — 40 students + 1 teacher — 45 min/session):**
```
low_volume   = 41 × 45 × 10  sessions =  18,450 participant-minutes/month
mid_volume   = 41 × 45 × 40  sessions =  73,800 participant-minutes/month
high_volume  = 41 × 45 × 100 sessions = 184,500 participant-minutes/month
```

**Estimated costs (unverified — must verify rates before setting budget cap):**

At $0.002 per participant-minute (LiveKit Cloud mid-range estimate):
```
low_volume  cost:  18,450 × $0.002 = ~$36.90/month
mid_volume  cost:  73,800 × $0.002 = ~$147.60/month
high_volume cost: 184,500 × $0.002 = ~$369.00/month
```

At $0.0005 per WebRTC minute (LiveKit Ship plan overage estimate, after included quota):
```
per session marginal cost: 1,845 WebRTC minutes × $0.0005 = ~$0.92/session after quota
(verify current plan pricing; exact breakeven depends on monthly volume)
```

At $0.00099 per participant-minute (Agora/Daily estimate, after 10,000 pm/month free tier):
```
low_volume  cost:  8,450 paid pm × $0.00099 = ~$8.37/month   (10k free deducted)
mid_volume  cost: 63,800 paid pm × $0.00099 = ~$63.16/month  (10k free deducted)
high_volume cost: 174,500 paid pm × $0.00099 = ~$172.76/month (10k free deducted)
```

> **Warning:** The v2.0 draft of this plan contained a math error in these cost examples (values were off by a factor of 1,000, e.g., showing $0.019 instead of $18.90). The figures above are the corrected values using the updated 40-student class size. All cost figures remain unverified estimates that must be confirmed against current provider pricing pages before any budget cap is set.

At 40-student scale and 10–40 sessions/month, audio cost with Agora/Daily free tier is meaningful (free tier exhausted after ~5–6 sessions/month at this class size). LiveKit Cloud at mid-range rates is $36–148/month for low-to-medium volume. These costs require explicit owner budget approval before enabling audio. The budget guard (Section 7.3) is a safeguard against unexpected usage spikes.

### 7.2 Usage Tracking

Each discussion session that uses audio must log:
- `session_id`
- `audio_provider`
- `audio_room_id`
- `started_at`, `ended_at`
- `participant_count_peak`
- `estimated_participant_minutes` (computed on session end)

This data is stored in `classroom_discussion_sessions` (columns added in Phase B) and can be queried by an admin API.

### 7.3 Budget Guard Plan

| Threshold | Action |
|-----------|--------|
| Monthly usage reaches 70% of cap | Log warning event; optionally email admin |
| Monthly usage reaches 90% of cap | Log critical warning; display alert in teacher dashboard (admin-configurable) |
| Monthly usage reaches 100% of cap | Disable audio token issuance server-side; discussion continues without audio (listen-only / hand-raise state preserved) |
| `LIVE_DISCUSSION_AUDIO_ENABLED=false` | Instant kill switch; audio disabled immediately, no code deploy needed |
| Provider API returns billing error | Log error; disable audio for the session; discussion state preserved without audio |
| Provider outage | Log outage event; discussion continues without audio; banner shown to teacher |

### 7.4 No-Surprise Billing Rules

- `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP` environment variable (server-side) sets the monthly cap.
- Default value in all environments: `0` (audio disabled until explicitly set).
- Setting this value to a non-zero number is an explicit owner action that enables billing.
- The server checks cumulative usage before issuing any audio token. If cap is reached, token is denied.
- No audio provider auto-renewal or credit card charging happens without a configured account limit on the provider's side.

### 7.5 Admin Usage Summary

Phase F adds an admin API:
```
GET /api/admin/discussion/usage?month=2026-05
→ { totalParticipantMinutes, sessionCount, estimatedCostCents }
```
This endpoint is teacher-role accessible for their own classes, and admin-only for cross-class aggregate.

---

## 8. Realtime Security Hardening

### 8.1 Are Channels Public or Private?

Supabase Realtime Broadcast channels using the anon key are **publicly subscribable by anyone who knows the channel name and has the anon key**. The anon key is intentionally public-facing (it's prefixed `NEXT_PUBLIC_`).

This means: **if a student (or anyone with the anon key) knows a `sessionId`, they can subscribe to `discussion:{sessionId}` without authentication.**

This is the primary security risk of using anon-key Supabase Realtime for this feature.

### 8.2 Risk Assessment of Anon Channel

| Risk | Severity | Mitigation |
|------|---------|-----------|
| Outsider subscribes to `discussion:{sessionId}` if they know the UUID | Low | UUIDs are not guessable; not exposed in any public URL or HTML |
| Student from class B subscribes to class A session | Low | Cannot act on it; read-only broadcast |
| Student receives another student's name in payload | Medium | **Do not put student names in broadcast payloads** |
| Student receives a roster of who raised hand | Medium | **Do not put full hand-raise roster in broadcast payloads** |
| Student broadcasts directly to channel (bypassing REST API) | None | Students never broadcast; all events are server-broadcast only |
| Attacker replays a captured payload | None | Payloads are notifications, not commands; server holds authoritative state |

### 8.3 Payload Sanitization Rules

**Teacher-only payloads (never sent to anon channel):**
- Full class roster with names and approval states.
- Aggregate "who raised hand" list.
- Any payload that would identify specific students by name to other students.

**Safe payloads for anon channel:**
- `{ event: "speak_approved", targetStudentId: "..." }` — only the target student acts on this; other students ignore it.
- `{ event: "student_muted", targetStudentId: "..." }` — same pattern.
- `{ event: "session_ended" }` — no student-identifying data.
- `{ event: "session_locked" }` — no student-identifying data.
- `{ event: "hand_raised", targetStudentId: "..." }` — student ID only, no name. **Do not include student names.**

Each student's client only acts on events where `targetStudentId` matches their own `studentId`. Events targeting other students are ignored on the client.

**The teacher's monitor page must get the full state (names, roster, full approval list) only via authenticated teacher REST API calls, not from the Realtime channel.**

### 8.4 Should All Realtime Events Be Server-Broadcast Only?

**Yes. This is a firm rule for this feature.**

- Students do not call `channel.send()` or `channel.broadcast()` from the browser.
- Teachers do not call `channel.send()` directly from the browser (the teacher UI uses REST API calls, which trigger server-side broadcasts).
- The Next.js API routes (server-side) are the only code that calls the Supabase admin Realtime broadcast API.
- This ensures all events are authenticated, logged, and validated before broadcast.

### 8.5 Private Channels with RLS (Alternative Analysis)

Supabase Realtime supports private channels that require a JWT to subscribe. However:
- Students do not have Supabase JWTs (they use cookie sessions).
- Giving students Supabase JWTs would require a significant auth model change.
- Short-lived signed Realtime tokens (as supported by Supabase `REALTIME_JWT_SECRET`) could be issued server-side, but this adds complexity.
- **For Phase A, anon channel with payload sanitization is the recommended approach.** The risk is low given UUID channel names and read-only student access.
- **For a future security hardening phase, server-issued short-lived Realtime JWTs can be implemented if required.** This is listed as a future option, not a Phase A requirement.

### 8.6 What Students Can See vs. Cannot See

| Data | Student Can See | Why |
|------|:--------------:|-----|
| Their own hand-raise state | Yes | From REST API response |
| Their own approval state | Yes | From REST API response |
| Their own muted state | Yes | From REST API response |
| Whether the session is active/locked/ended | Yes | From Realtime broadcast + REST |
| Other students' names | **No** | Never in broadcast payload |
| Other students' hand-raise state | **No** | Not exposed to students at all |
| Number of students in session | **No** | Not needed for student UI |
| Teacher's audio state | Yes (simple flag) | Needed to start audio playback |

### 8.7 Should Phase A Start With Polling Only?

**Yes. Phase A should implement polling first, Realtime second.**

Rationale:
- The existing codebase is 100% polling-based. Adding polling support for discussion state follows the existing pattern exactly.
- Realtime is an optimization for lower latency (sub-second vs. 3–5 second updates).
- Polling-only Phase A is lower risk, easier to debug, and delivers the product value.
- Realtime can be added in a Phase A.1 hardening step once the core state machine is proven.
- If Realtime is added, polling must remain as the fallback.

---

## 9. Polling Fallback vs Realtime — Sync Model

### 9.1 Definitive Sync Model

The DB is the **single source of truth** for all discussion state. All other sync mechanisms (polling, Realtime) are delivery optimizations.

```
DB (authoritative state)
  ↑ writes via service-role API only
  ↓ reads via:
      (a) REST polling — always available, always correct, 3–5s latency
      (b) Realtime broadcast — low latency (~200ms), requires WebSocket, optimistic
```

### 9.2 Polling Integration

**Teacher monitor (`monitor.js`):**
- Existing 5s poll of `GET /api/teacher/activities/[id]/monitor` is extended to include discussion state.
- No new polling interval is added for discussion.
- Teacher always has correct state within 5s, even without Realtime.

**Student activity page (`pages/student/activity/[activityId].js`):**
- Existing 3s poll of `GET /api/student/activities/[id]/live-state` is extended to include discussion state for the student.
- No new polling interval is added.
- Student always has correct state within 3s, even without Realtime.

### 9.3 Realtime as Optimization (Phase A.1+)

When Realtime is added:
- Teacher UI subscribes to `discussion:{sessionId}` to receive instant updates (< 1s).
- Student UI subscribes to receive instant updates for their own approval/mute events.
- On Realtime event: update local UI state immediately (optimistic).
- Poll continues in background. On next poll: reconcile any drift.

### 9.4 Reconnect Behavior

On any client reconnect or page reload:
1. Fetch REST API to get authoritative state.
2. Render UI based on REST response.
3. Subscribe to Realtime channel.
4. Apply any Realtime events received after the REST fetch.

Realtime events received before the REST fetch completes are queued and applied after.

### 9.5 Realtime Events Are Never Authoritative

A Realtime event should never be the only basis for a security decision. For example:
- A `speak_approved` Realtime event is used to update the student UI optimistically.
- But when the student requests an audio token (Phase B+), the server re-checks `audio_scope` and `is_muted` in the DB. The token is not issued based on the Realtime event alone.

---

## 10. Permissions-Policy Scoping Analysis

### 10.1 Current Situation

`next.config.js` sets a global `Permissions-Policy: camera=(), microphone=()` header for all routes. This is a global HTTP response header applied to every page and API route.

### 10.2 Can the Header Be Scoped Per Route in Next.js Pages Router?

Yes. Next.js `headers()` configuration supports path-based header matching. Different routes can have different `Permissions-Policy` values.

The approach:
- Keep `microphone=()` as the **default** applied globally.
- Add override rules for specific paths that need microphone access.

### 10.3 Which Routes Need Microphone Access

Only audio phases (Phase B+) require microphone access. Only on specific pages:

| Route | Needs Microphone | Role |
|-------|:---------------:|------|
| `/teacher/class/[classId]/activities/[activityId]/monitor` | Yes (Phase B+) | Teacher broadcasts audio |
| `/student/activity/[activityId]` | Yes (Phase B+, approved students) | Student speaks |
| All other routes | **No** | Microphone stays blocked |

### 10.4 Recommended `next.config.js` Headers Configuration (Phase B+ Only)

```javascript
// Do not implement yet. For planning only.
// Shows the intended configuration change for audio phases.

{
  headers: [
    {
      // Default: block microphone on all pages
      source: '/(.*)',
      headers: [
        { key: 'Permissions-Policy', value: 'camera=(), microphone=()' }
      ]
    },
    {
      // Override: allow microphone on teacher monitor page only
      source: '/teacher/class/:classId/activities/:activityId/monitor',
      headers: [
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(self)' }
      ]
    },
    {
      // Override: allow microphone on student activity page only
      source: '/student/activity/:activityId',
      headers: [
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(self)' }
      ]
    }
  ]
}
```

`microphone=(self)` means microphone access is allowed from the same origin only. No third-party iframes can access the microphone.

### 10.5 Phase A Impact

**Phase A (no live audio) requires no Permissions-Policy change.** The existing `microphone=()` header remains unchanged. The Permissions-Policy change is only needed for Phase B when live audio is introduced.

### 10.6 Required Tests After Permissions-Policy Change

Before shipping Phase B (first audio phase):
- Verify that `/teacher/dashboard` cannot access the microphone (browser console logs permission denied).
- Verify that `/student/home` cannot access the microphone.
- Verify that `/learning/math-master` cannot access the microphone.
- Verify that the arcade pages cannot access the microphone.
- Verify that `/teacher/.../monitor` can access the microphone (with user gesture).
- Verify that `/student/activity/[id]` can access the microphone (with user gesture).

These tests should be automated in the QA suite (Section 26.6).

---

## 11. Privacy and Legal Analysis

### 11.1 Scope of This Section

This section identifies the privacy and legal items that **must be reviewed** before audio phases are implemented. It does not provide legal conclusions. The owner must engage appropriate legal counsel.

### 11.2 Jurisdiction — Israel First

The product owner operates from Israel. The product serves Israeli students and families. The primary jurisdiction for privacy analysis is **Israeli law**, specifically:

- **Privacy Protection Law 5741-1981 (Israel)** and its regulations.
- **Regulations on Protection of Privacy (Data Security) 5777-2017**.
- **The Israeli Privacy Protection Authority (PPA) guidelines** for collecting personal data of minors.

If the product serves users in additional jurisdictions (EU, US, UK), the following also apply:
- **GDPR** (EU) — including stricter provisions for children's data under Article 8.
- **COPPA** (US) — children under 13 require verifiable parental consent before audio data collection.
- **UK GDPR / Age Appropriate Design Code**.

**Owner must determine the exact operating jurisdiction(s) before audio phases are approved.**

### 11.3 Voice Data Classification

Voice/audio data transmitted in real time is personal data under Israeli law and GDPR. In some jurisdictions and contexts, voice data may qualify as biometric data (special category under GDPR), which carries stricter processing requirements.

### 11.4 Required Review Items (No Legal Conclusions)

| Item | Status | Required Before |
|------|--------|----------------|
| Children's privacy review under Israeli law | Not started | Audio Phase B |
| Children's privacy review for other jurisdictions in scope | Not started | Audio Phase B |
| Voice transmission disclosure in privacy policy | Not done | Audio Phase B |
| Parental notification mechanism | Not defined | Audio Phase B |
| Parental consent requirement (if legally required) | Not determined | Audio Phase B |
| Data retention policy for discussion event logs | Not defined | Phase A |
| Data retention policy for participant metadata | Not defined | Phase A |
| DPA with audio provider | Not signed | Audio Phase B |
| Privacy policy update (add: real-time audio transmission) | Not done | Audio Phase B |
| No recording by default — documented and verified | Planned | Audio Phase B |
| No transcription by default — documented and verified | Planned | Audio Phase B |
| No AI processing of audio by default — documented and verified | Planned | Audio Phase B |
| Sub-processor list updated (new audio provider) | Not done | Audio Phase B |
| DPA with Supabase (if not already signed) | Unknown | Phase A |

### 11.5 Privacy-Safe Design Principles

The following principles are built into the architecture regardless of legal outcome:

- **No audio recording** — no server-side recording is initiated. Provider recording is disabled by default.
- **No transcription** — no speech-to-text processing of any audio.
- **No AI processing** — audio is never sent to any AI or ML model.
- **Minimal metadata logging** — `classroom_discussion_events` contains only: event type, actor ID, timestamp. No audio content, no transcript, no audio file references.
- **Data minimization** — participant data collected is limited to what is needed for the discussion state machine (hand raise, approval, mute). No additional profiling.
- **Short-lived audio tokens** — audio tokens expire within 1 hour. No persistent audio credentials.
- **Session-scoped data** — discussion data is scoped to a specific session and linked to the classroom activity. Not re-used across sessions.

### 11.6 Parental Notification Recommendation

Regardless of legal requirement, it is recommended that before audio phases are enabled for any class, the teacher and/or platform administrator communicates to parents:
- What the feature does.
- That audio is transmitted in real time but not recorded.
- How to opt out (e.g., student's microphone can be disabled by parent at device level).

The mechanism for this notification is an owner decision (Section 33).

---

## 12. Database Plan

### 12.1 Overview

Four new discussion tables (Sections 12.2–12.5). Entitlement tables are planned separately in Section 12.6 (see Section 23.6). No changes to any existing table. Same RLS posture as all classroom tables: RLS enabled, no client policies, service-role-only via API.

### 12.2 `classroom_discussion_sessions`

```sql
-- Do not create yet. Planning only.
create table public.classroom_discussion_sessions (
  id                          uuid        primary key default gen_random_uuid(),
  activity_id                 uuid        not null references public.classroom_activities(id) on delete cascade,
  class_id                    uuid        not null references public.teacher_classes(id) on delete cascade,
  teacher_id                  uuid        not null references public.teacher_profiles(teacher_id) on delete cascade,
  status                      text        not null default 'active'
                                          check (status in ('active', 'locked', 'ended')),
  audio_enabled               boolean     not null default false,
  audio_provider              text,       -- 'livekit', 'agora', 'daily', 'mock', null
  audio_room_id               text,       -- external room identifier
  audio_room_name             text,       -- derived name used with provider API
  max_speakers                integer,    -- soft limit on simultaneous speakers
  participant_count_peak      integer,    -- for cost tracking
  estimated_participant_min   numeric,    -- computed on session end, for budget guard
  started_at                  timestamptz not null default now(),
  locked_at                   timestamptz,
  ended_at                    timestamptz,
  created_at                  timestamptz not null default now()
);

create index on public.classroom_discussion_sessions (activity_id);
create index on public.classroom_discussion_sessions (class_id, status);
create index on public.classroom_discussion_sessions (teacher_id, created_at desc);

alter table public.classroom_discussion_sessions enable row level security;
comment on table public.classroom_discussion_sessions is
  'RLS enabled; no client policies. All access via service role (/api/teacher/*, /api/student/*).';
```

### 12.3 `classroom_discussion_participants`

```sql
-- Do not create yet. Planning only.
create table public.classroom_discussion_participants (
  id                    uuid        primary key default gen_random_uuid(),
  session_id            uuid        not null references public.classroom_discussion_sessions(id) on delete cascade,
  student_id            uuid        not null references public.students(id) on delete cascade,
  hand_raised           boolean     not null default false,
  hand_raised_at        timestamptz,
  -- request_type: set when hand is raised; null when hand is not raised.
  -- 'speak_to_class' = student wants to address the whole class.
  -- 'private_help'   = student wants a private conversation with the teacher.
  request_type          text        check (request_type in ('speak_to_class', 'private_help')),
  approved_to_speak     boolean     not null default false,
  approved_at           timestamptz,
  -- audio_scope: set when audio permission is granted; null when listen-only.
  -- 'class'   = student is approved to speak to the whole class.
  -- 'private' = student is in an active private conversation with the teacher.
  audio_scope           text        check (audio_scope in ('class', 'private')),
  is_muted              boolean     not null default false,
  muted_at              timestamptz,
  speaking_duration_s   integer     not null default 0,
  joined_at             timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  unique (session_id, student_id)
);

create index on public.classroom_discussion_participants (session_id);
create index on public.classroom_discussion_participants (session_id, hand_raised) where hand_raised = true;
create index on public.classroom_discussion_participants (session_id, approved_to_speak) where approved_to_speak = true;
create index on public.classroom_discussion_participants (session_id, request_type);
create index on public.classroom_discussion_participants (session_id, audio_scope);

alter table public.classroom_discussion_participants enable row level security;
comment on table public.classroom_discussion_participants is
  'RLS enabled; no client policies. All access via service role. '
  'request_type: speak_to_class | private_help. audio_scope: class | private.';
```

### 12.4 `classroom_discussion_events`

```sql
-- Do not create yet. Planning only.
create table public.classroom_discussion_events (
  id                    uuid        primary key default gen_random_uuid(),
  session_id            uuid        not null references public.classroom_discussion_sessions(id) on delete cascade,
  event_type            text        not null
                                    check (event_type in (
                                      'session_started',
                                      'session_ended',
                                      'session_locked',
                                      'session_unlocked',
                                      'hand_raised',
                                      'hand_lowered',
                                      'hand_cleared_by_teacher',
                                      'hands_cleared_all',
                                      'speak_approved',
                                      'speak_revoked',
                                      'student_muted',
                                      'student_unmuted',
                                      'mute_all',
                                      'audio_started',
                                      'audio_stopped',
                                      -- Phase E: private conversation events
                                      'private_help_requested',
                                      'private_help_request_cleared',
                                      'private_session_started',
                                      'private_session_ended'
                                    )),
  actor_id              uuid        not null,
  actor_role            text        not null check (actor_role in ('teacher', 'student')),
  target_student_id     uuid        references public.students(id),
  payload               jsonb,      -- metadata only, never audio content
  created_at            timestamptz not null default now()
);

create index on public.classroom_discussion_events (session_id, created_at);
create index on public.classroom_discussion_events (session_id, event_type);

alter table public.classroom_discussion_events enable row level security;
comment on table public.classroom_discussion_events is
  'RLS enabled; no client policies. Append-only event log. No audio content ever stored.';
```

### 12.5 `classroom_private_audio_sessions` (Phase E)

A fourth new table. Tracks each private teacher-student audio conversation with its own provider room.

```sql
-- Do not create yet. Planning only.
create table public.classroom_private_audio_sessions (
  id                  uuid        primary key default gen_random_uuid(),
  session_id          uuid        not null references public.classroom_discussion_sessions(id) on delete cascade,
  student_id          uuid        not null references public.students(id) on delete cascade,
  teacher_id          uuid        not null references public.teacher_profiles(teacher_id) on delete cascade,
  private_room_id     text,       -- external room identifier from the provider
  private_room_name   text,       -- e.g. "private-{sessionId}-{studentId}"
  status              text        not null default 'active'
                                  check (status in ('active', 'ended')),
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,
  created_at          timestamptz not null default now()
  -- No full unique constraint here; partial unique indexes below enforce active-session rules
  -- while allowing multiple ended/historical rows.
);

-- Only one active private session per discussion session at a time.
create unique index classroom_private_audio_sessions_one_active_per_session
  on public.classroom_private_audio_sessions (session_id)
  where status = 'active';

-- Only one active private session per student per discussion session at a time.
create unique index classroom_private_audio_sessions_one_active_per_student
  on public.classroom_private_audio_sessions (session_id, student_id)
  where status = 'active';

create index on public.classroom_private_audio_sessions (session_id, status);
create index on public.classroom_private_audio_sessions (session_id, student_id);

alter table public.classroom_private_audio_sessions enable row level security;
comment on table public.classroom_private_audio_sessions is
  'RLS enabled; no client policies. All access via service role. '
  'One row per private teacher-student audio conversation. '
  'private_room_name is a separate provider room, not a muted channel. '
  'No audio content ever stored here.';
```

**Design notes:**
- Two partial unique indexes enforce active-session rules: at most one active private session per discussion session (`session_id WHERE status='active'`), and at most one active private session per student per discussion session (`session_id, student_id WHERE status='active'`). Multiple ended/historical rows are allowed — a full unique constraint on `(session_id, student_id, status)` would incorrectly block them.
- `private_room_name` is never exposed to any student other than the student in the private session.
- On `ended`, the server must call `provider.closePrivateRoom(private_room_name)` before setting `status = 'ended'`.

### 12.6 Entitlement Tables (Planning Note — See Section 23.6)

Implementation of the Admin Entitlement model (Section 23) will require additional tables. Candidate structures are documented in Section 23.6. The exact design is an open owner decision (D9). No migration for entitlement tables is created until D9 is resolved.

Candidate new tables (planning names only):
- `school_live_discussion_entitlements` — ADMIN-granted school entitlement.
- `school_teacher_live_discussion_permissions` — school-manager-granted teacher permission.
- `private_teacher_live_discussion_entitlements` — ADMIN-granted private teacher entitlement.

These tables are separate from the four discussion tables above and must not be confused with them.

### 12.7 Relationship to Existing Tables

- New tables do **not** modify `classroom_activities`, `classroom_activity_student_status`, or `classroom_activity_attempts`.
- `activity_id` on `classroom_discussion_sessions` is `NOT NULL` in this development run. Standalone discussion sessions are not supported and require a future explicit owner-approved redesign.
- Class and teacher validation still goes through `teacher_classes`, `teacher_class_students`, `teacher_profiles`.
- Entitlement checks cross-reference `schools`, `teacher_profiles`, and `private_teacher_subjects`; those tables are read but not modified by the discussion system.

### 12.8 Data Retention

Owner must define a retention policy. Suggested defaults:
- `classroom_discussion_events`: retain for 90 days, then archive or delete.
- `classroom_discussion_participants`: retain for 90 days.
- `classroom_discussion_sessions`: retain indefinitely (summary metadata only).
- `classroom_private_audio_sessions`: retain for 90 days (metadata only — no audio content is stored).

These are suggestions, not implemented policies.

> **Private conversation metadata:** The fact that a private conversation occurred (teacher + student, timestamp, duration) is stored in `classroom_private_audio_sessions`. This is metadata only. No audio content, no transcript, no recording is ever stored. This metadata is visible only to the class teacher. It is never exposed to parent or guardian APIs.

---

## 13. API Plan

### 13.1 Teacher Discussion APIs

All routes under `pages/api/teacher/activities/[activityId]/discussion/`.

All routes: validate `Authorization: Bearer` → JWT → `role === 'teacher'` → `classroom_activities.teacher_id = auth.uid()`.

**Entitlement gate (required before any route logic executes):** After JWT validation, every teacher discussion API route must call `checkLiveDiscussionEntitlement({ teacherId, activityId })` (Section 23.7). If the result is `{ allowed: false }`, the route returns `403 Forbidden`. This gate runs before any discussion state is read or written. It covers all nine gates defined in Section 23.5.

The following routes additionally enforce entitlement sub-gates listed in parentheses:
- `start` — all gates 1–8.
- `audio-start`, `audio-token` — gates 1–9 (full audio issuance path).
- `approve`, `approve-private` — gates 1–8.
- `private-audio-token` — gates 1–9.
- `report` — gates 1–7 (teacher-only; no audio token issued).

| Route | Method | Body | Response | Key Error Codes |
|-------|--------|------|---------|----------------|
| `start` | POST | `{}` | `{ sessionId, status }` | `404` activity; `403` not owner; `409` session_already_active |
| `index` | GET | — | `{ session, participants[] }` | `404` no session; `403` |
| `lock` | PATCH | `{ locked: bool }` | `{ status }` | `409` session_ended |
| `approve` | POST | `{ studentId }` | `{ ok }` | `404` student; `409` session_locked — approves speak_to_class request; sets `audio_scope='class'` |
| `revoke` | POST | `{ studentId }` | `{ ok }` | `404`; `403` |
| `mute` | POST | `{ studentId }` | `{ ok }` | `404`; `403` |
| `unmute` | POST | `{ studentId }` | `{ ok }` | `404`; `403` |
| `clear-hands` | POST | `{}` | `{ count }` | `403` |
| `mute-all` | POST | `{}` | `{ count }` | `403` |
| `end` | POST | `{}` | `{ ok }` | `409` already_ended — also closes any active private room |
| `audio-token` | POST | `{}` | `{ token, roomId, serverUrl }` | `503` provider_error; `402` budget_cap_reached |
| `audio-start` | POST | `{}` | `{ ok }` | `503` |
| `audio-stop` | POST | `{}` | `{ ok }` | |
| `report` | GET | — | `{ participants[] }` | `404` — teacher-only; never exposed to parent/guardian APIs |
| `approve-private` | POST | `{ studentId }` | `{ ok, privateRoomName }` | `404`; `409` private_already_active — creates private room; sets `audio_scope='private'` |
| `end-private` | POST | `{ studentId }` | `{ ok }` | `404`; `409` no_active_private — closes private room; resets `audio_scope` |
| `private-audio-token` | POST | `{ studentId }` | `{ token, privateRoomName, serverUrl }` | `403`; `503` — teacher token for private room |

### 13.2 Student Discussion APIs

All routes under `pages/api/student/activities/[activityId]/discussion/`.

All routes: validate `liosh_student_session` cookie → `student_sessions` → active student → student is class member.

`studentId` is **always** taken from the validated session, never from request body.

| Route | Method | Body | Response | Key Error Codes |
|-------|--------|------|---------|----------------|
| `index` | GET | — | `{ session: { status, audioEnabled }, self: { handRaised, requestType, approved, audioScope, muted, inPrivate } }` | `404` no session |
| `raise-hand` | POST | `{ requestType: 'speak_to_class' }` | `{ ok }` | `409` already_raised; `409` session_locked; `404` |
| `request-private` | POST | `{}` | `{ ok }` | `409` already_requested; `409` session_locked; `404` — sets `request_type='private_help'` |
| `lower-hand` | POST | `{}` | `{ ok }` | `409` hand_not_raised — clears both raise-hand and request-private |
| `heartbeat` | POST | `{}` | `{ ok }` | `404` |
| `audio-token` | POST | `{}` | `{ token, serverUrl, canPublish }` | `403`; `503`; `404` — main class room; `canPublish: true` only if `audio_scope='class'` and not muted |
| `private-audio-token` | POST | `{}` | `{ token, privateRoomName, serverUrl }` | `403`; `503` — student token for private room; only if `audio_scope='private'` |

Notes:
- Student `audio-token` returns `canPublish: false` (listen-only) by default. Returns `canPublish: true` only if `audio_scope = 'class'` and `is_muted = false` in DB, and `LIVE_DISCUSSION_AUDIO_ENABLED = true`.
- Student `private-audio-token` is only issued if `classroom_private_audio_sessions.status = 'active'` for this student in this session.
- `raise-hand` now requires `requestType` in the body. Invalid or missing `requestType` returns `400`. Only `'speak_to_class'` is valid on this route; use `request-private` for private help.
- `studentId` is always taken from the validated session cookie, never from request body on any route.

### 13.3 Role Guard Summary

| Action | Teacher API | Student API |
|--------|:-----------:|:-----------:|
| Start session | Yes | No |
| End session | Yes | No |
| Lock/unlock | Yes | No |
| Approve student (speak to class) | Yes | No |
| Revoke student | Yes | No |
| Mute student | Yes | No |
| Mute all | Yes | No |
| Clear hands | Yes | No |
| Approve private conversation | Yes | No |
| End private conversation | Yes | No |
| Teacher private-audio-token | Yes | No |
| Raise own hand (speak_to_class) | No | Yes |
| Request private help | No | Yes |
| Lower own hand / cancel request | No | Yes |
| Get own state | No | Yes |
| Get full session state (all students) | Yes | No |
| Audio token — class room publish | Yes | Only if `audio_scope='class'` |
| Audio token — class room listen | No | Yes (default) |
| Audio token — private room | Yes (teacher) | Only if `audio_scope='private'` |

### 13.4 Tamper Prevention Rules

- `studentId` in student routes always taken from session, not body. Any `studentId` in body is ignored.
- `approved_to_speak`, `is_muted`, `audio_scope`, `request_type` are never writable from student routes.
- Teacher routes reject if `teacher_id !== classroom_activities.teacher_id`.
- Student routes reject if student is not in `teacher_class_students` for the activity's class.
- Audio tokens include `roomName` derived from `sessionId`. A token for session A cannot be used in session B.
- Private room tokens are scoped to `private_room_name`. A student's private token cannot be used in the main class room.
- The `private_room_name` is never included in any Realtime broadcast or student-facing API response for other students. Only the teacher and the specific student in the private conversation receive it.
- Student `private-audio-token` server verifies `classroom_private_audio_sessions.status = 'active'` AND `student_id` matches session user before issuing token. No other student can receive a private room token.
- **Entitlement bypass prevention:** A teacher cannot access discussion APIs by manipulating the activity ID or teacher ID. The entitlement check always uses the `teacher_id` from the validated JWT and the school/private-teacher context derived from the DB — never from the request body.
- A school teacher cannot gain private-teacher entitlement and vice versa. The entitlement check determines teacher type from the DB, not from a client-supplied parameter.
- A school manager cannot grant teacher permission if the school's own entitlement has been revoked. The gate order enforces this: school-level entitlement (Gate 3) is checked before teacher-level permission (Gate 4).

---

## 14. Realtime Plan

### 14.1 Channel Naming

`discussion:{sessionId}` — where `sessionId` is the UUID from `classroom_discussion_sessions.id`.

The UUID is not guessable. It is not exposed in any public URL or page HTML. It is only returned to authenticated teacher and student API clients.

### 14.2 Who Subscribes

- **Teacher:** Uses authenticated Supabase client (has JWT). Subscribes for low-latency updates. Also polls every 5s as fallback.
- **Students:** Use anon Supabase client. Subscribe for low-latency updates about their own state. Also poll every 3s as fallback.

### 14.3 Who Broadcasts

**Only the Next.js API server.** No client-side broadcasts. All events are server-side broadcasts triggered by REST API calls that first update the DB.

### 14.4 Event Payloads

All events are minimal. No student names. No rosters. Student-targeted events include only the `studentId` so the target student's client can identify relevant events.

```json
{ "event": "session_started",           "sessionId": "..." }
{ "event": "session_locked",            "sessionId": "..." }
{ "event": "session_unlocked",          "sessionId": "..." }
{ "event": "session_ended",             "sessionId": "..." }
{ "event": "hands_cleared",             "sessionId": "..." }
{ "event": "audio_started",             "sessionId": "..." }
{ "event": "audio_stopped",             "sessionId": "..." }
{ "event": "hand_raised",               "sessionId": "...", "targetStudentId": "..." }
{ "event": "speak_approved",            "sessionId": "...", "targetStudentId": "..." }
{ "event": "speak_revoked",             "sessionId": "...", "targetStudentId": "..." }
{ "event": "student_muted",             "sessionId": "...", "targetStudentId": "..." }
{ "event": "student_unmuted",           "sessionId": "...", "targetStudentId": "..." }
{ "event": "private_help_requested",    "sessionId": "...", "targetStudentId": "..." }
{ "event": "private_session_started",   "sessionId": "...", "targetStudentId": "..." }
{ "event": "private_session_ended",     "sessionId": "...", "targetStudentId": "..." }
```

**Private event payload security rules:**
- `private_help_requested` — only the `targetStudentId` is included; no private room name, no token.
- `private_session_started` — signals to the target student only that their private session is ready. The student must call `GET .../discussion` (REST) to get the `privateRoomName` needed to request their private token. The `privateRoomName` is never put in the Realtime broadcast payload.
- `private_session_ended` — signals to the target student that the private session is over; they return to listen-only in the main room.
- Other students receiving a `private_session_started` event for a different `targetStudentId` ignore it (same as all targeted events).

The teacher monitor does **not** use these payloads to render the full hand-raise queue. It uses the REST API poll for that. Realtime events are used only to trigger a faster re-fetch.

### 14.5 Reconnect Behavior

On any disconnect or page reload:
1. Fetch `GET /api/{role}/activities/{id}/discussion` to restore authoritative state.
2. Subscribe to `discussion:{sessionId}`.
3. Apply subsequent Realtime events on top of REST state.

### 14.6 Channel Lifecycle

- Channel exists while `session.status` is `active` or `locked`.
- Server broadcasts `session_ended` before closing.
- Clients unsubscribe on `session_ended` event or on leaving the activity page.

---

## 15. POC Plan

### 15.1 POC A — No-Audio Discussion State

**Goal:** Prove that the hand-raise state machine, DB schema, and API routes work correctly before any audio infrastructure is involved.

**Environment:** Local development or staging only. No production student data.

**Participants:** 1 teacher account + 5 test student accounts (existing test accounts or seeded data).

**What to test:**
- Teacher starts a live_lesson activity.
- Teacher starts a discussion session.
- 5 test students see the raise-hand button.
- All 5 students raise hand simultaneously.
- Teacher sees all 5 in the hand-raise queue.
- Teacher approves student 1.
- Student 1 UI shows "approved."
- Teacher mutes student 1.
- Student 1 UI shows "muted."
- Teacher clears all hands.
- Teacher locks discussion. Student 2 tries to raise hand. Rejected.
- Teacher ends discussion. All student UIs reset.
- Teacher refreshes monitor page. State restored correctly.
- Student refreshes activity page. State restored correctly.

**Success criteria:** All state transitions work. Page refresh restores state. No errors in server logs. No regressions in existing classroom activity tests.

**Provider needed:** None. Mock provider is active. No audio.

**Cost:** $0.

**Estimated duration:** 2–3 days to run after Phase A implementation is complete.

### 15.2 POC B — Audio Provider Sandbox

**Goal:** Prove that the chosen provider can deliver teacher-controlled audio with enforced server-side mute in a controlled test environment.

**Environment:** Staging only. No production student data. Test accounts only.

**Participants:** 1 teacher device + 3–5 test student devices (or emulated via multiple browser windows/tabs on different machines).

**What to test:**
- Teacher joins audio room with publish permissions.
- Students join audio room with subscribe-only permissions.
- Teacher speaks. Students hear teacher.
- Teacher approves student 1 to speak.
- Student 1 requests speaker token. Provider grants publish.
- Student 1 speaks. All others hear student 1.
- Teacher mutes student 1. Verify at provider that publish is revoked (not client-side only).
- Student 1 attempts to speak again. Audio stops (SFU-enforced).
- Teacher approves student 2. Students 1 and 2 both speak simultaneously.
- Teacher "Mute All." Both students' audio stops.
- Teacher ends session. Room closes. All clients disconnected from audio.
- Test on iOS Safari (student side): microphone permission request → audio playback of teacher.
- Test autoplay block: student loads page → teacher starts audio → student sees "tap to hear" → taps → audio plays.

**Success criteria:**
- Server-side mute is enforced (verified in provider dashboard, not just client UI).
- iOS Safari audio playback works (at least with user gesture).
- iOS Safari microphone capture works for approved student (at least with user gesture).
- No recording in provider dashboard.

**Provider needed:** Free tier of Agora or LiveKit Cloud (no payment required for this scale).

**Cost:** Within free tier. $0.

**Estimated duration:** 3–5 days to run after Phase B implementation is complete.

### 15.3 POC C — Provider Comparison

**Goal:** If more than one provider passes POC B criteria, compare them on the key dimensions.

**What to compare:**
- Audio latency (teacher speaks → student hears) on WiFi and mobile data.
- Mute enforcement latency (teacher mutes → student audio stops) — must be < 3 seconds.
- Safari iOS audio playback behavior.
- Safari iOS microphone capture behavior.
- Integration complexity (lines of code in the provider-specific adapter module).
- Observed cost per session (compare against estimate in Section 6).

**Decision:** Choose the provider that passes all POC B criteria and has the lowest integration complexity and best mobile behavior. Document the decision with the comparison results.

**Note:** POC C only runs if POC B passes on multiple providers. If only one provider passes POC B, it is selected by default.

---

## 16. Phase A — Audio Foundation + Schema Plan

### 16.1 Goal

Establish all DB tables, state machine, server modules, `LiveAudioProvider` adapter, mock provider, and feature flags. Deliver all APIs and UI shells. No live audio connection is active in Phase A — the mock provider handles all adapter calls with no-ops. Phase A is infrastructure only, not a user-visible audio feature.

Audio must be designed in from the start. Phase A is not a no-audio MVP; it is the foundation that Phases B–E are built on.

### 16.2 Owner Decisions Required Before Phase A Starts

- DB schema approved (Section 12).
- API routes approved (Section 13).
- Feature flag strategy approved.
- Data retention policy for discussion metadata approved (decision B8).
- Realtime plan approved (Section 14).

### 16.3 DB Changes

Four new tables (migration file written; not executed until separately approved):
- `classroom_discussion_sessions`
- `classroom_discussion_participants` (with `request_type` and `audio_scope` columns)
- `classroom_discussion_events`
- `classroom_private_audio_sessions`

See Section 12 for full schema. No changes to existing tables.

### 16.4 New Code

- `lib/live-audio/provider-adapter.js` — adapter dispatch; default provider: `mock`.
- `lib/live-audio/providers/mock.js` — all adapter functions return success, no real provider.
- `lib/live-audio/types.js` — JSDoc type definitions.
- `lib/teacher-server/teacher-discussion.server.js` — server module for all discussion logic.
- All teacher discussion API routes (Section 13.1) including private routes.
- All student discussion API routes (Section 13.2) including `request-private`.
- `components/teacher-portal/TeacherDiscussionPanel.jsx` — discussion controls (non-audio controls operational; audio controls shown as disabled pending Phase B).
- `components/student/StudentDiscussionBar.jsx` — discussion status bar with raise-hand and request-private buttons.
- Feature flag checks: `LIVE_DISCUSSION_ENABLED` (server kill switch), `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` (client UI hint only), `LIVE_DISCUSSION_AUDIO_ENABLED` (audio gate).

### 16.5 Teacher UI Changes

`pages/teacher/class/[classId]/activities/[activityId]/monitor.js`:
- New "Discussion" collapsible panel.
- "Start Discussion" button (visible when `mode === 'live_lesson'` and `status === 'active'`).
- Hand-raise queue: shows each student's `request_type` badge ("Speak to class" / "Private help").
- Action buttons: "Approve for class" (for `speak_to_class` requests); "Open private channel" (for `private_help` requests — disabled until Phase E).
- Approved list: students with "Mute" and "Revoke" buttons.
- "Lock Discussion", "Clear All Hands", "End Discussion" controls.
- Audio controls visible but disabled until `LIVE_DISCUSSION_AUDIO_ENABLED=true`.
- Session status badge.

### 16.6 Student UI Changes

`pages/student/activity/[activityId].js`:
- Discussion status bar (only when session active).
- Two request buttons: "Raise hand to speak" (sets `request_type='speak_to_class'`) and "Request private help" (sets `request_type='private_help'`).
- "Awaiting approval" state (shows request type).
- "You are approved to speak to the class" badge (Phase C).
- "You are in a private conversation with your teacher" badge (Phase E).
- "Muted" badge.
- Session locked / ended messages.

### 16.7 Implementation Approach (Polling First)

Phase A initial implementation uses **polling only** (no Realtime):
- Discussion state appended to existing teacher monitor poll response.
- Discussion state appended to existing student live-state poll response.
- No Supabase Realtime code in Phase A.0.

Phase A.1 (optional enhancement): add Supabase Realtime broadcast for lower-latency updates. Polling remains as fallback.

### 16.8 Security

- Teacher ownership validated on all teacher routes.
- Class membership validated on all student routes.
- `studentId` always from session cookie, never from request body.
- `approved_to_speak`, `is_muted`, `audio_scope`, `request_type` never writable from student routes.
- Rate limit: max 10 raise-hand / request-private calls per student per minute per session.

### 16.9 Failure Cases

| Failure | Behavior |
|---------|---------|
| Student raises hand when session is locked | API returns 409 `discussion_locked`; UI shows message |
| Student raises hand after session ended | API returns 404 `session_not_found`; UI shows "session ended" |
| Teacher closes activity while discussion active | Server auto-ends discussion session; any active private room is closed |
| Teacher refreshes page | Discussion state restored from REST poll within 5s |
| Student refreshes page | Discussion state restored from REST poll within 3s |
| DB write fails on approve | API returns 500; client shows error; state consistent in DB |

### 16.10 QA Tests (Phase A)

- Unit: session state machine (all transitions).
- Unit: student cannot approve self (studentId from session only).
- Unit: locked session rejects hand raise and request-private.
- Unit: activity close triggers session auto-end.
- Unit: `request_type` set correctly for raise-hand vs request-private.
- API: full teacher discussion lifecycle (start → approve → mute → clear → end).
- API: unauthorized student calling teacher routes → 403.
- API: 40 students raising hands simultaneously (concurrency, no DB race condition).
- E2E: full Phase A flow from teacher start to session end.
- E2E: page refresh mid-session restores state.
- POC A: verify all of the above with mock provider at zero audio cost.

### 16.11 Acceptance Criteria

- Teacher can start a discussion on an active live_lesson.
- Students see raise-hand and request-private buttons within 3s of session start.
- Teacher sees student's request (with type badge) within 3s of submission.
- Teacher can approve (speak-to-class), clear, lock, clear all, end.
- Page refresh by either party restores correct state.
- No existing classroom activity, login, or parent functionality is affected.
- All Phase A API tests pass. POC A passes.

### 16.12 Risk Level

Medium (first Supabase Realtime use; new DB tables; new API surface; four new tables including private sessions table).

### 16.13 Estimated Effort

1–2 weeks.

---

## 17. Phase B — Teacher Broadcast + Student Listen-Only

### 17.1 Goal

Teacher can broadcast live audio to all students. Students hear teacher. Students cannot publish. One-to-many remote learning audio.

### 17.2 Product Behavior

- All Phase A behaviors unchanged.
- Teacher sees "Start Broadcasting" button in discussion panel (only when session active and `LIVE_DISCUSSION_AUDIO_ENABLED=true`).
- Teacher clicks "Start Broadcasting" → browser requests microphone permission → teacher audio is broadcast to all students.
- Students automatically join audio room as listeners when session has active audio.
- Students must tap "Tap to Hear Teacher" due to browser autoplay policy. After one tap, audio plays.
- Teacher clicks "Stop Broadcasting" → audio stops for all students.
- Students remain listen-only. `canPublish: false` enforced at SFU level.

### 17.3 DB Changes

Additional columns on `classroom_discussion_sessions` (added in Phase B migration, not Phase A):
- `audio_enabled` (boolean, default false)
- `audio_provider` (text)
- `audio_room_id` (text)
- `audio_room_name` (text)
- `participant_count_peak` (integer)
- `estimated_participant_min` (numeric)

New event types used: `audio_started`, `audio_stopped` (already in schema from Phase A).

### 17.4 New APIs

- `POST .../discussion/audio-token` (teacher) — returns publish-capable token for main class room.
- `POST .../discussion/audio-token` (student) — returns subscribe-only token for main class room.
- `POST .../discussion/audio-start` — creates provider room, marks session `audio_enabled = true`.
- `POST .../discussion/audio-stop` — stops audio, marks session.

### 17.5 Realtime Events (additional)

```json
{ "event": "audio_started", "sessionId": "..." }
{ "event": "audio_stopped", "sessionId": "..." }
```

### 17.6 Provider Adapter Calls

- `provider.createRoom()` on `audio-start`.
- `provider.createTeacherToken()` when teacher requests audio token.
- `provider.createStudentListenerToken()` when student requests audio token.
- `provider.closeRoom()` on session end.

### 17.7 Permissions-Policy Change

`next.config.js` updated to allow `microphone=(self)` only on monitor and student activity routes (see Section 10.4). **Owner approval required before this change.**

### 17.8 Security

- Student audio token: `canPublish: false` always. Enforced at SFU level.
- Teacher token scoped to room derived from `sessionId`.
- Budget cap checked before any token is issued.

### 17.9 Failure Cases

| Failure | Behavior |
|---------|---------|
| Teacher mic permission denied | Error shown; session continues without audio; hand-raise still works |
| Provider API outage | Error logged; session continues without audio; banner shown to teacher |
| Budget cap reached | Audio token denied with 402; teacher sees "monthly audio limit reached" |
| Student autoplay blocked | "Tap to Hear Teacher" CTA shown |
| Teacher navigates away | Audio stops; session state preserved |
| Student on mobile (iOS Safari) | Autoplay unlock required; tested in Phase F |

### 17.10 Acceptance Criteria

- Teacher audio reaches all connected students.
- Students cannot publish audio (verified at provider dashboard, not only client UI).
- No audio is recorded (verified in provider dashboard settings).
- Permissions-Policy change confirmed: microphone blocked on all other pages.
- Budget cap enforced: token denied when cap reached.
- Phase A hand-raise still works during audio broadcast.
- POC B passes.

### 17.11 Risk Level

Large.

### 17.12 Estimated Effort

2–3 weeks.

---

## 18. Phase C — Speak-to-Class Hand Raise + Approved Student Mic

### 18.1 Goal

Students can raise their hand to speak to the whole class. Teacher approves one student. That student can publish audio. Whole class hears. Teacher retains full control (mute, revoke, end). The private-help request type is present in the UI but private audio is not active until Phase E.

### 18.2 Product Behavior

- All Phase B behaviors unchanged.
- Student raises hand with `request_type = 'speak_to_class'`.
- Teacher sees the request in queue with "Speak to class" badge.
- Teacher clicks "Approve for class" → server sets `audio_scope = 'class'` on participant; calls `provider.grantStudentSpeak(roomName, studentId)`.
- Approved student's UI shows "You are approved to speak to the class" + microphone toggle.
- Student taps microphone → browser requests mic permission → student publishes audio.
- Whole class hears the approved student.
- Teacher clicks "Mute" → `provider.muteStudent(roomName, studentId)` — SFU-enforced, client cannot bypass.
- Teacher clicks "Revoke" → `provider.revokeStudentSpeak(roomName, studentId)` → `audio_scope` cleared.
- Private-help requests: student can submit `request_type = 'private_help'` via "Request private help" button. Teacher sees the request with "Private help" badge. "Open private channel" button is visible but inactive until Phase E.

### 18.3 DB Changes

No new tables beyond Phase A. Optional new columns on `classroom_discussion_participants`:
- `audio_token_issued_at` — for token rotation tracking.
- `speaking_started_at` — for participation log.

### 18.4 API Changes

- Teacher `approve` route: also calls `provider.grantStudentSpeak()` after DB update; sets `audio_scope = 'class'`.
- Teacher `mute` route: also calls `provider.muteStudent()` after DB update.
- Teacher `revoke` route: also calls `provider.revokeStudentSpeak()` after DB update; clears `audio_scope`.
- Student `audio-token` route: returns speaker token (`canPublish: true`) only if `audio_scope = 'class'` and `is_muted = false`.

### 18.5 Security

- Student cannot request speaker token without server-side `audio_scope = 'class'` check.
- Muted student's token request returns listener-only token.
- Server-side mute enforced by the SFU, not client code.

### 18.6 Failure Cases

| Failure | Behavior |
|---------|---------|
| Student mic permission denied | Error shown; hand-raise still works; state consistent |
| Provider grant API fails | DB updated; retry logged; banner shown to teacher |
| Student connection drops while speaking | SFU removes tracks; student must re-request token on reconnect |
| Teacher revokes during student speech | Audio stops within 3s at SFU level; student UI updates |

### 18.7 Acceptance Criteria

- Only teacher-approved students can publish audio (verified at SFU, not client-only).
- Teacher mute stops student audio within 3s, enforced at provider level.
- Muted student cannot unmute themselves.
- Non-approved student cannot publish audio regardless of client behavior.
- Private-help requests are accepted and displayed in teacher queue with correct badge.
- POC B passes.

### 18.8 Risk Level

Large.

### 18.9 Estimated Effort

2–3 weeks.

---

## 19. Phase D — Group Discussion Up to 5 Students

### 19.1 Goal

Teacher can approve up to 5 students simultaneously to speak to the whole class. Teacher can mute all. Full managed classroom discussion mode.

### 19.2 Product Behavior

- All Phase C behaviors unchanged.
- Teacher can approve multiple students (up to `max_speakers` soft limit, default: 5).
- All approved students can speak simultaneously. Whole class hears all approved speakers.
- "Mute All Students" button mutes all approved speakers in one action.
- Visual indicator shows who is currently transmitting audio (if provider supports active-speaker detection).
- A 40-student class does not mean 40 open microphones. Students are listen-only by default. Only the teacher and up to 5 approved students may speak simultaneously.

### 19.3 DB Changes

Optional: `max_speakers` column on `classroom_discussion_sessions` (settable by teacher at session start; default 5; maximum 5).

### 19.4 New APIs

- `POST .../discussion/mute-all` — calls `provider.muteAll(roomName, teacherIdentity)`.
- `POST .../discussion/approve-multiple` — body: `{ studentIds: [] }` — approves multiple in one call.

### 19.5 QA Tests

- 5 students approved simultaneously — all can speak; whole class hears all 5.
- Teacher "Mute All" — all 5 muted simultaneously at SFU level.
- Audio quality with 5 simultaneous speakers on typical WiFi / mobile connection.
- Provider handles 40-student room (41 participants total) with up to 5 publishers without audio degradation.

### 19.6 Acceptance Criteria

- Teacher can approve and mute multiple students (up to 5 simultaneously).
- "Mute All" stops all student audio at SFU level.
- System handles 40 students + 1 teacher (41 participants) with up to 5 simultaneous speakers without degradation.
- Existing Phase A–C behaviors unchanged.

### 19.7 Risk Level

Medium.

### 19.8 Estimated Effort

1–2 weeks.

---

## 20. Phase E — Private Teacher-Student Audio Conversation

### 20.1 Goal

Teacher can open a private audio channel with one student. Only the teacher and that student can hear the private conversation. The rest of the class cannot access or hear it. Main class room audio continues independently.

### 20.2 Architecture Requirement

**The private conversation must use a separate provider room — not client-side muting of the main room.** Client-side muting can be bypassed. A separate provider room means the rest of the class has no token for the private room and cannot join it at the SFU level regardless of any client-side behavior.

### 20.3 Product Behavior

- Student clicks "Request private help" → API sets `request_type = 'private_help'` on their participant row.
- Teacher sees the request in the hand-raise queue with a distinct "Private help" badge.
- Teacher clicks "Open private channel" for that student:
  - Server creates a new provider room: `"private-{sessionId}-{studentId}"`.
  - `classroom_private_audio_sessions` row is created with `status = 'active'`.
  - Participant `audio_scope` set to `'private'`.
  - Realtime event `private_session_started` broadcast to the target student only.
- Teacher requests `private-audio-token` → server issues token scoped to the private room.
- Student requests `private-audio-token` → server verifies `audio_scope = 'private'` and active private session; issues student token.
- Teacher and student join the private room. Both can hear each other. No one else can hear this.
- Main class room continues: other students still hear teacher's main room audio (or are in listen-only mode).
- Only one private conversation can be active at a time per discussion session.
- Teacher ends private conversation: server calls `provider.closePrivateRoom(privateRoomName)`; sets `classroom_private_audio_sessions.status = 'ended'`; clears `audio_scope`; broadcasts `private_session_ended` to student.
- Student returns to listen-only in main class room.

### 20.4 DB Changes

- `classroom_private_audio_sessions` table (already planned in Phase A migration).
- No additional columns needed beyond what Phase A defined.

### 20.5 New APIs

- `POST .../discussion/approve-private` — teacher action; creates private room; sets `audio_scope = 'private'`.
- `POST .../discussion/end-private` — teacher action; closes private room; resets `audio_scope`.
- `POST .../discussion/private-audio-token` (teacher) — teacher token for private room.
- `POST .../discussion/private-audio-token` (student) — student token for private room (only if `audio_scope = 'private'`).

### 20.6 Provider Adapter Calls

- `provider.createPrivateRoom(opts)` on `approve-private`.
- `provider.createTeacherPrivateToken(opts)` when teacher requests private token.
- `provider.createStudentPrivateToken(opts)` when approved student requests private token.
- `provider.closePrivateRoom(roomName)` on `end-private` or session end.

### 20.7 Security

- Private room name is never included in any Realtime broadcast or in any student API response for other students.
- Student can only obtain a private token if `classroom_private_audio_sessions.status = 'active'` and their `student_id` matches the session.
- Private tokens are scoped to `private_room_name` — they cannot be used in the main class room.
- On session end, all active private rooms are closed before the session status is set to `'ended'`.
- No other student can join the private room (they have no token and no room name).

### 20.8 Failure Cases

| Failure | Behavior |
|---------|---------|
| Teacher mic permission for private room | Uses same microphone already in use for main room; no second permission needed |
| Provider fails to create private room | Error logged; teacher shown error; private conversation not started; student's request remains in queue |
| Private room drops mid-conversation | Teacher and student notified; server marks `private_session` ended; student returns to main room |
| Teacher ends main session while private active | Server closes private room first, then ends main session |
| Student disconnects mid-private | Private session remains active; student can reconnect and request private token again (server re-validates) |

### 20.9 Acceptance Criteria

- Teacher can open a private conversation with any student who has `request_type = 'private_help'` in the queue.
- Only the teacher and that student can hear the private conversation (verified at provider level — separate room, not client mute).
- Rest of class cannot hear the private conversation.
- Main class audio continues independently during private conversation.
- Only one private conversation active at a time per session.
- Teacher can end private conversation; student returns to listen-only in main room.
- No private room name, token, or metadata is accessible to any student other than the one in the private conversation.
- POC B (or a dedicated Phase E POC run) passes the private room test.

### 20.10 Risk Level

Large.

### 20.11 Estimated Effort

2–3 weeks.

---

## 21. Phase F — Mobile / Security / Load QA

### 21.1 Goal

Full QA pass across all phases before production readiness sign-off. Includes iOS Safari audio validation, load testing, security/tamper testing, and the teacher-only participation summary.

### 21.2 Mobile Smoke Tests

- Phase B+: microphone permission request on iOS Safari.
- Phase B+: audio autoplay unlock (one user gesture) on iOS Safari.
- Phase C+: approved student microphone capture on iOS Safari.
- Phase E: private room audio on iOS Safari.
- Touch target size for all discussion buttons: minimum 44×44px.
- All discussion UI usable on Android Chrome (student side).

### 21.3 Load / Concurrency Tests

- 40 students simultaneously raising hands → all recorded; no DB race condition.
- 40 students connected to audio room (41 participants including teacher) → audio quality acceptable.
- Teacher mutes all 5 approved speakers → all muted within 3 seconds at SFU.
- Teacher monitor remains usable with 40 student rows displayed (compact list, scrollable).
- 40 students simultaneously polling live-state → server handles without degradation.
- Safety-margin test: 45 students + 1 teacher (46 participants) → no crash; graceful degradation at most.
- Budget cap enforcement at exact threshold: set cap to 18,450 participant-minutes (10 × 41 × 45); session 11 audio token denied.

### 21.4 Security / Tamper Tests

- Student calls teacher `approve` route → 403.
- Student sends `{ approved_to_speak: true, audio_scope: 'class' }` in raise-hand body → fields ignored.
- Student from class B attempts to join class A session → 403.
- Student with listener token attempts to publish track → SFU rejects.
- Muted student requests new audio token → listener token returned.
- Token from session A used in session B → rejected by provider.
- Student calls `private-audio-token` without active private session → 403.
- Student attempts to construct private room name and join directly → no token issued; SFU rejects.
- Two students cannot both have active private sessions simultaneously.
- Ending private session immediately closes provider room (not just DB flag).

### 21.5 Teacher-Only Participation Summary

After session ends, teacher can view a participation summary on the activity report page.

- Summary data: which students were present, who raised hand, request type for each raise, who was approved, speaking duration, whether a private conversation occurred.
- No audio content. No transcript. Metadata only.
- **This data is visible to the class teacher only.** It is never included in any parent-facing or guardian-facing API.

New API: `GET /api/teacher/activities/[id]/discussion/report` → returns teacher-only participation summary.

New UI: "Discussion Summary" section on `pages/teacher/class/[classId]/activities/[activityId]/report.js`.

Per-student row: attended (yes/no), raised hand (and request type), approved to speak, speaking duration, private conversation (yes/no).

### 21.6 Regression Tests

- All existing classroom activity tests pass.
- Teacher dashboard loads correctly.
- Student home page and activities panel unchanged.
- Parent/guardian login and report pages unaffected.
- Arcade sessions unaffected.

### 21.7 Acceptance Criteria

- All Phase A–E acceptance criteria pass.
- iOS Safari audio playback and microphone work with one user gesture.
- 40-student load test passes without audio degradation.
- All security/tamper tests pass.
- Teacher-only participation summary visible; parent APIs unaffected.
- Build passes. Lint passes. All tests pass (minus any blocked by migration not yet executed).

### 21.8 Risk Level

Medium.

### 21.9 Estimated Effort

1 week.

---

## 22. Future Extensions (Deferred)

The following are out of scope for all initial phases (A–F). Listed for completeness only.

- **Recording:** Server-side audio recording. Requires parental consent workflow, data retention policy, GDPR compliance, provider storage configuration. **Not in scope for any current phase.**
- **Transcription:** Speech-to-text. Requires recording. **Not in scope.**
- **AI session summary:** LLM summary from transcript. Requires transcription. **Not in scope.**
- **Video:** Explicitly excluded by product definition. **Not in scope for any phase.**
- **Breakout groups:** Teacher splits class into audio sub-rooms. Requires complex multi-room permission model. **Deferred.**
- **Push notifications:** "Discussion starting soon" pushed to student devices. Service worker stub exists in `public/sw.js`. **Deferred.**
- **Parent live observation:** Read-only audio listener for parents. Requires parental auth, consent, complex privacy analysis. **Deferred.**
- **AI moderation:** Automatic detection of inappropriate content. Requires audio processing, privacy review, consent. **Not in scope.**
- **Student-to-student private messages:** Explicitly excluded by product definition.
- **Discussion data in parent reports:** Confirmed permanently out of scope. Discussion participation, hand-raise history, and private conversation metadata are not added to parent or guardian reports in any current or planned phase.

---

## 23. Admin Entitlement and Permission Model for Live Discussion/Audio

### 23.1 Overview

The live discussion/audio system is not available by default to any school, school teacher, or private teacher. The **main platform ADMIN** is the sole authority who controls which entities may use live discussion/audio. Enabling `LIVE_DISCUSSION_ENABLED` does not grant access — it is only the top-level prerequisite. All entitlement decisions are made by the main ADMIN independently of flag state.

**This section is planning-only. No code or SQL is written or executed here. Entitlement storage requirements are noted in Section 23.6.**

### 23.2 Entitlement Actors

| Actor | Receives access from | Scope of access |
|-------|---------------------|----------------|
| Main ADMIN | Built-in platform role | Can grant/revoke all schools and private teachers |
| School (school manager/admin) | Main ADMIN grants school-level entitlement | Can delegate to individual school teachers after receiving school entitlement |
| School teacher | School manager grants teacher-level permission (after school has entitlement from ADMIN) | Can use live discussion/audio for their own classes and granted subjects |
| Private teacher | Main ADMIN grants direct entitlement | Can use live discussion/audio for own students and granted subjects only |

> **Hard rule:** A school manager cannot grant live discussion/audio permission to any teacher if the main ADMIN has not first granted the school-level entitlement. The delegation chain cannot skip the ADMIN grant step.

### 23.3 School Entitlement and Manager Delegation

**Main ADMIN grants school entitlement:**
- The main ADMIN adds a live-discussion entitlement record for a specific school.
- Without this record, no teacher at that school can access live discussion/audio, regardless of `LIVE_DISCUSSION_ENABLED` state.
- The main ADMIN can revoke school entitlement at any time; revocation immediately blocks all teachers at that school.

**School manager delegates to teachers:**
- After the school has ADMIN-granted entitlement, the school manager may grant individual school teachers permission to use live discussion/audio.
- School teachers do not receive this permission automatically from the school's entitlement — each teacher requires an explicit grant from the school manager.
- Removing the school's entitlement (by ADMIN) automatically invalidates all teacher-level grants at that school (no orphan permissions).

**School teacher access requirements (all must pass):**
1. Server-side feature flag `LIVE_DISCUSSION_ENABLED = true`. (`NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` is a UI hint only and is never trusted by the server.)
2. Server-side audio flag `LIVE_DISCUSSION_AUDIO_ENABLED = true` (for audio operations).
3. School has main ADMIN entitlement for live discussion/audio.
4. School manager has granted this teacher permission to use live discussion/audio.
5. Teacher owns or is assigned to the relevant classroom activity.
6. Subject permission gate (if subject-level permissions apply to this school context).
7. Session/activity state is valid (live_lesson active).
8. Audio token issuance gate (all prior checks passed; budget cap not exceeded).

### 23.4 Private Teacher Entitlement

**Main ADMIN grants private teacher entitlement directly:**
- The main ADMIN adds a live-discussion entitlement record for a specific private teacher.
- There is no intermediate delegation layer for private teachers — ADMIN grants directly, and the private teacher is either entitled or not.
- The main ADMIN can revoke entitlement at any time.

**Private teacher access requirements (all must pass):**
1. Server-side feature flag `LIVE_DISCUSSION_ENABLED = true`. (`NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` is a UI hint only and is never trusted by the server.)
2. Server-side audio flag `LIVE_DISCUSSION_AUDIO_ENABLED = true` (for audio operations).
3. Main ADMIN has granted this private teacher live discussion/audio entitlement.
4. Subject permission gate: private teacher must have the relevant subject explicitly listed in `private_teacher_subjects`. Private teachers must not receive all subjects by default.
5. The students in the session must be explicitly linked to this private teacher.
6. Private teacher must not access school rosters or school classes unless explicitly part of a school context.
7. Session/activity state is valid.
8. Audio token issuance gate.

### 23.5 Permission Gate Order

Every teacher live discussion/audio API route must check gates in this order. The first failing gate rejects the request. Audio tokens are never issued unless all applicable gates pass.

```
Gate 1: Server-side feature flag
         LIVE_DISCUSSION_ENABLED = true
         (LIVE_DISCUSSION_AUDIO_ENABLED = true additionally required for audio operations)
         Note: NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED is a client/UI hint only; it is never checked here.
         ↓ pass
Gate 2: Main ADMIN entitlement
         School or private teacher has been granted live discussion/audio by main ADMIN
         ↓ pass
Gate 3: School-level entitlement (school context only)
         The teacher's school has active ADMIN-granted entitlement
         ↓ pass (or skip if private teacher context)
Gate 4: School manager teacher-level grant (school context only)
         The school manager has granted this specific teacher permission
         ↓ pass (or skip if private teacher context)
Gate 5: Private teacher direct entitlement (private teacher context only)
         Main ADMIN has granted this private teacher entitlement directly
         ↓ pass (or skip if school teacher context)
Gate 6: Subject permission gate
         Teacher is allowed for the subject of the relevant activity.
         For private teachers: subject must be in private_teacher_subjects.
         ↓ pass
Gate 7: Class/student ownership or membership gate
         Teacher owns the classroom or the students are linked to this teacher.
         ↓ pass
Gate 8: Session/activity state gate
         Activity is in valid state (live_lesson, active/not-closed).
         Discussion session exists and is active.
         ↓ pass
Gate 9: Audio token issuance gate
         LIVE_DISCUSSION_AUDIO_ENABLED = true.
         Budget cap not exceeded.
         For student speaker token: audio_scope = 'class' and not muted.
         For private room token: active classroom_private_audio_sessions row for this student.
         ↓ token issued
```

**Any gate failure returns an appropriate HTTP error code** (403 for entitlement/permission failures, 402 for budget cap, 409 for state failures). The error response must not reveal which specific gate failed beyond what is needed for the client to handle gracefully.

### 23.6 Database Planning: Entitlement Storage

> **Planning only. No SQL is executed. No migration is created until this section is explicitly approved and a separate implementation instruction is given.**

Implementation of the entitlement model will require one or more of the following structures. The exact table/column design is an owner decision (D9):

**Option A — Separate entitlement tables (recommended):**

```sql
-- Planning only. Do not create yet.

-- Grants live discussion/audio to a school (by main ADMIN).
-- school_live_discussion_entitlements
--   id, school_id (FK to schools), granted_by (admin user id),
--   granted_at, revoked_at (null = active), notes

-- Grants live discussion/audio to an individual school teacher
-- (by school manager, after school has entitlement).
-- school_teacher_live_discussion_permissions
--   id, teacher_id, school_id, granted_by (school manager id),
--   granted_at, revoked_at (null = active)

-- Grants live discussion/audio to a private teacher (by main ADMIN).
-- private_teacher_live_discussion_entitlements
--   id, private_teacher_id (FK to teachers or private_teacher_profiles),
--   granted_by (admin user id), granted_at, revoked_at (null = active)
```

**Option B — Flag columns on existing teacher/school tables:**
Add `live_discussion_enabled` boolean columns to the existing `schools` or `teacher_profiles` tables. Simpler but less auditable.

**Recommended approach:** Option A (separate tables) for auditability — revocation history is preserved, granting actor is recorded, and no existing tables are modified. Decision D9 must be resolved before implementation.

**All existing table RLS rules remain unchanged.** Entitlement tables follow the same pattern: RLS enabled, no client policies, service-role-only access via API.

### 23.7 Server Helper Planning

Implementation will require a central server-side entitlement check helper. Decision D10 covers this.

Planned helper location: `lib/teacher-server/live-discussion-entitlement.server.js`

Planned functions (do not implement yet):

```javascript
// Planning only. Do not implement yet.

/**
 * Check if a school teacher is entitled to use live discussion/audio.
 * Runs all gates 1–4 + 6 relevant to school teachers.
 * Returns { allowed: boolean, reason: string | null }.
 */
async function checkSchoolTeacherEntitlement({ teacherId, schoolId, activityId, subjectId }) {}

/**
 * Check if a private teacher is entitled to use live discussion/audio.
 * Runs all gates 1–3 (private path) + 5 + 6 relevant to private teachers.
 * Returns { allowed: boolean, reason: string | null }.
 */
async function checkPrivateTeacherEntitlement({ teacherId, activityId, subjectId }) {}

/**
 * Unified entitlement check called from all teacher discussion/audio API routes.
 * Determines teacher type (school vs. private) and delegates to the appropriate checker.
 * Returns { allowed: boolean, reason: string | null }.
 */
async function checkLiveDiscussionEntitlement({ teacherId, activityId }) {}
```

All teacher discussion API routes must call `checkLiveDiscussionEntitlement` after validating the teacher JWT and before executing any discussion or audio logic.

### 23.8 Resolved Owner Decisions

The following entitlement decisions are **already resolved** by owner direction:

| Decision | Resolution |
|----------|-----------|
| Does main ADMIN control school/private-teacher live discussion entitlement? | **Yes.** No school or private teacher receives access automatically. |
| Can school managers delegate live discussion permission to individual teachers? | **Yes, but only after the school has ADMIN-granted entitlement.** |
| Do private teachers require direct ADMIN entitlement? | **Yes.** No intermediate delegation. |
| Do subject grants still apply to private teachers? | **Yes.** Subject must be in `private_teacher_subjects`. |
| Can private teachers access school rosters/classes by default? | **No.** Only if explicitly part of a school context. |

---

## 24. Security and Privacy Model

### 24.1 Teacher-Only Control

All discussion management actions (start, approve, mute, revoke, lock, end, audio-start) are gated by `requireTeacherApiContext`. The `teacher_id` is from the Supabase JWT, never from request body. Teacher can only act on activities they own.

### 24.2 Student Membership Validation

Every student API call validates:
1. Cookie session is valid.
2. Student is in `teacher_class_students` for the activity's class.
3. Discussion session belongs to this activity.
4. Student is not from another class.

### 24.3 No Parent Access to Discussion APIs — Permanent Rule

Discussion participation data is **permanently out of scope** for parent and guardian reports. This is an explicit owner decision, not a phase-specific constraint.

- Discussion APIs are teacher-only or student-only routes.
- Guardian and parent report APIs must never include discussion data of any kind: hand-raise history, approval state, speaking duration, session metadata, or private conversation records.
- The teacher-only participation summary (Phase F) is accessible via `GET .../discussion/report` — a teacher-authenticated route only. It is not piped into any parent-facing API.
- Any future report feature that touches discussion or audio data must re-confirm this rule before implementation.

### 24.4 Student Cannot Approve Self

- No student API route writes `approved_to_speak`, `audio_scope`, or `request_type` directly.
- `studentId` in student routes always from session, never body.
- Even if a student sends `{ approved_to_speak: true, audio_scope: 'class' }` in a body, the server ignores these fields.
- Students cannot set their own `audio_scope` to `'class'` or `'private'` through any student route.

### 24.5 Server-Side Audio Enforcement

- Mute, revoke, and room close are enforced at the provider SFU level.
- Tokens with `canPublish: false` are rejected by the SFU regardless of client-side code.
- A student cannot publish audio to the class room unless: (1) server has verified `audio_scope = 'class'` and `is_muted = false`, AND (2) server has called `provider.grantStudentSpeak()`, AND (3) server has issued a `canPublish: true` token.
- A student cannot publish audio in the private room unless: (1) server has verified `classroom_private_audio_sessions.status = 'active'` for that student in that session, AND (2) server has issued a private room token via `provider.createStudentPrivateToken()`.

### 24.6 No Recording

No recording is initiated server-side. Provider recording is disabled by default in room creation. The `createRoom()` adapter call always sets `recordingEnabled: false`. Any future recording feature requires explicit separate implementation and owner approval.

### 24.7 Data Minimization in Realtime

See Section 8.3. No student names, no rosters, no approval lists in anon-channel broadcast payloads. Private room names and tokens are never put in any Realtime broadcast payload.

### 24.8 Admin Entitlement as a Security Layer

The entitlement model (Section 23) is a security control, not just a product feature. It ensures that:
- Teachers without ADMIN-granted entitlement cannot create discussion sessions, issue audio tokens, or access private rooms — even if they somehow know valid session IDs or room names.
- The entitlement check runs server-side against DB-stored records, not against client-supplied parameters.
- Revoking entitlement (ADMIN revokes school or private teacher) immediately blocks all subsequent API calls, regardless of any active session state. Active sessions should be closed as part of revocation (implementation detail for D10).
- The entitlement gate cannot be bypassed by feature flag manipulation alone.

### 24.9 Private Conversation Room Isolation

Private teacher-student audio uses a **separate provider room** — not a client-side mute of the main class room.

- **Why:** Client-side muting can be bypassed by a modified client or a browser extension. A separate SFU room means the rest of the class has no token for the private room and cannot join it at the infrastructure level.
- **Token scoping:** The teacher's private room token and the student's private room token are scoped to the private room name. They cannot be used in the main class room.
- **Room name confidentiality:** `private_room_name` is known only to the server, the teacher, and the specific student in the private session. It is never broadcast on the Realtime channel and never returned to any other student via the REST API.
- **Maximum isolation:** Even if an attacker knows the session UUID, they cannot derive the private room name because it includes the student UUID: `"private-{sessionId}-{studentId}"`. Both UUIDs are required, and no student receives another student's UUID.
- **Teacher dual connection:** The teacher may simultaneously hold connections to both the main class room and the private room. The two connections are completely independent; audio in one does not leak into the other.

---

## 25. UI Impact

### 25.1 Teacher Screens Affected

| File | Phase | Change |
|------|-------|-------|
| `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` | A | Add Discussion panel: start, hand queue with request-type badges, approved list, controls |
| `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` | B–D | Add audio controls to Discussion panel |
| `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` | E | Add private conversation controls and active-private indicator |
| `pages/teacher/class/[classId]/activities/[activityId]/report.js` | F | Add teacher-only Discussion Summary section (not exposed to parent APIs) |

#### Teacher Monitor UI Requirements for 40-Student Classes

The teacher monitor Discussion panel must be designed for up to 40 students. This is a planning requirement only — do not implement now.

Required capabilities:
- Hand-raise queue must support 40 simultaneous entries without visual overflow.
- Each entry in the queue displays a **request-type badge**: "Speak to class" (for `request_type = 'speak_to_class'`) and "Private help" (for `request_type = 'private_help'`). These must be visually distinct (e.g., different colors or icons).
- Per-entry action buttons: "Approve for class" (speak_to_class only) and "Open private channel" (private_help only). Both disabled during Phase A; private channel button disabled until Phase E.
- Approved speakers list must remain readable when multiple students are approved.
- Student list must support a search or filter mechanism (filter by: raised hand / approved / muted / inactive / private).
- Compact display mode: each student row compact enough for a 40-student scrollable panel.
- Desktop-first: primary target is a teacher on a laptop or desktop monitor.
- No redesign of the existing monitor page layout is required. The Discussion panel is a new collapsible section within the existing page.

**Private conversation indicator (Phase E):**
- When a private conversation is active, a distinct panel section shows: "Private conversation active — [student name]" with an "End private conversation" button and a duration timer.
- The teacher's dual-room connection state (main room + private room) must be clearly communicated in the UI so the teacher knows their main room audio is still active.

A 40-student class does not mean 40 open microphones. Students are listeners by default. Only the teacher and up to 5 approved students may speak to the class simultaneously. The monitor UI must make this constraint clear to the teacher.

### 25.2 Student Screens Affected

| File | Phase | Change |
|------|-------|-------|
| `pages/student/activity/[activityId].js` | A | Add discussion status bar; "Raise hand to speak" button; "Request private help" button |
| `pages/student/activity/[activityId].js` | B | Add audio playback, "Tap to Hear Teacher" CTA for listen-only mode |
| `pages/student/activity/[activityId].js` | C | Add microphone toggle for approved-to-speak-to-class state |
| `pages/student/activity/[activityId].js` | E | Add "In private conversation with teacher" state and private room connection |
| `pages/student/home.js` | A (optional) | Activity card badge if discussion session is active |

**Student UI state descriptions:**
- **Default / listen-only:** Discussion status bar visible. Two buttons: "Raise hand to speak to the class" and "Request private help from teacher."
- **Hand raised (speak_to_class):** "Raise hand to speak" button changes to "Lower hand." Status: "Awaiting approval to speak."
- **Private help requested:** "Request private help" button changes to "Cancel request." Status: "Waiting for teacher."
- **Approved to speak to class (`audio_scope = 'class'`):** Status: "You are approved to speak to the class." Microphone toggle appears. Whole class will hear the student when toggle is on.
- **In private conversation (`audio_scope = 'private'`):** Status: "You are in a private conversation with your teacher." Private microphone toggle. Main class audio suspended for this student.
- **Muted:** Microphone toggle disabled. Status: "Your microphone has been muted by the teacher."
- **Session locked:** Raise hand and request-private buttons disabled. Status: "Discussion is paused."
- **Session ended:** All discussion UI hidden or shows "Discussion has ended."

### 25.3 Entitlement-Based UI Gating

The teacher monitor Discussion panel visibility must reflect the entitlement model:

| Teacher situation | Discussion panel state |
|------------------|----------------------|
| Main ADMIN has not granted school entitlement | Discussion panel must not be visible or must be shown as unavailable with an appropriate message |
| School has entitlement but this specific teacher has not been granted permission by school manager | Discussion panel must not be visible or must show a "contact your school admin" message |
| Private teacher has no ADMIN-granted entitlement | Discussion panel must not be visible or must be shown as unavailable |
| All entitlement checks pass, but `LIVE_DISCUSSION_ENABLED=false` | Discussion panel not visible (server blocks all APIs; client UI also hidden if `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED=false`) |
| All entitlement checks pass, `LIVE_DISCUSSION_ENABLED=true`, `LIVE_DISCUSSION_AUDIO_ENABLED=false` | Non-audio discussion controls visible; audio controls hidden or disabled |
| All checks pass | Full discussion panel available |

**Rules for disabled/unavailable states:**
- A teacher who lacks entitlement must not see an actionable "Start Discussion" button.
- The exact Hebrew copy for entitlement-denied messages is not yet approved. The copy must be owner-approved before implementation. Placeholder: `[ADMIN_ENTITLEMENT_DENIED_MESSAGE]`.
- The client-side entitlement state is populated from a server-side check at page load (via the teacher monitor API poll response). The server never trusts the client to self-report entitlement.
- The UI check is a display convenience only; the server enforces entitlement on every API call regardless of UI state.

### 25.4 Screens That Must Remain Unchanged

All learning master pages, arcade/game pages, teacher dashboard, teacher class report, student login, teacher login, all guardian/parent pages, all existing classroom activity create/list flows.

### 25.5 Hebrew Copy

No existing Hebrew strings are changed. Do not modify `lib/classroom-activities/classroom-activities-labels.client.js` or any existing label/translation file in Waves 0–4. Use placeholder labels only inside new scoped discussion components (e.g. `[speak-to-class]`, `[private-help]`, `[discussion-start]`). Final Hebrew copy and centralized label integration require separate owner approval before any label file is modified.

---

## 26. QA Plan

### 26.1 Unit Tests

- Session state machine: all valid and invalid transitions (including private session states).
- Participant state transitions: hand raise → approved → muted → unmuted; hand raise → private request → in private → return to listen-only.
- Auth validation: teacher ownership, student class membership.
- Token issuance logic: `audio_scope = 'class'` + not muted → speaker token; otherwise → listener token.
- Private token issuance: active private session + matching student → private token; otherwise → 403.
- Budget cap: usage at 99% → token allowed; usage at 100% → token denied.
- Only one active private session per discussion session at a time (uniqueness constraint enforced).
- `request_type` correctly set on raise-hand vs request-private routes.
- Ending session closes all active private rooms before setting status `'ended'`.
- **Entitlement unit tests:**
  - School teacher with no school entitlement → `checkLiveDiscussionEntitlement` returns `{ allowed: false }`.
  - School has entitlement but teacher has no school manager grant → `{ allowed: false }`.
  - School teacher with full entitlement chain → `{ allowed: true }`.
  - Private teacher with no ADMIN entitlement → `{ allowed: false }`.
  - Private teacher with ADMIN entitlement but wrong subject → `{ allowed: false }` (subject gate).
  - Private teacher with full entitlement + correct subject → `{ allowed: true }`.
  - Revoking school entitlement invalidates teacher-level permissions (cascade check).

### 26.2 API Tests

- Full teacher discussion lifecycle: start → approve → mute → clear → end.
- Student raise/lower hand.
- Unauthorized student calling teacher routes → 403.
- Student raising hand while locked → 409.
- Student raising hand after ended → 404.
- 40 students raising hands simultaneously → all recorded.
- Audio token for non-approved student → `canPublish: false`.
- Audio token for approved, non-muted student → `canPublish: true`.
- Audio token when budget cap reached → 402.

### 26.3 E2E Tests

- Phase A full flow: start → raise (speak_to_class) → approve → mute → end; request-private submitted.
- Page refresh mid-session: state restored (both teacher and student).
- Activity close while discussion active: discussion auto-ended; any active private room closed.
- Phase B: teacher audio reaches all students; student hears after one tap (autoplay).
- Phase C: approved student speaks to class; muted student's audio stops at SFU level.
- Phase D: multiple speakers (up to 5); mute all; whole class hears all speakers.
- Phase E: teacher opens private channel with student; main class audio continues; student 2 (listening to class) cannot hear private conversation (verified at provider); teacher ends private; student returns to listen-only.
- Phase E: page refresh during active private conversation — teacher and student reconnect to private room using REST state + new token request.

### 26.4 Mobile Smoke Tests

- Phase A: raise hand and request-private flow on iOS Safari, Android Chrome.
- Phase B+: microphone permission request on iOS Safari.
- Phase B+: audio autoplay unlock (user gesture) on iOS Safari.
- Phase B+: microphone capture for approved student on iOS Safari.
- Touch target size for raise-hand button: minimum 44×44px.

### 26.5 Audio Permission Tests (Phase B+)

- Mic denied → teacher: error shown, session continues without audio.
- Mic denied → student: raise-hand still works; audio error shown separately.
- Mic permission reset after denial: re-request flow works.
- School MDM blocks mic: graceful error, no crash.
- Multiple tabs: conflict warning shown.

### 26.6 Permissions-Policy Tests (Phase B+)

- `/teacher/dashboard` cannot access microphone (verified in browser devtools).
- `/student/home` cannot access microphone.
- `/learning/math-master` cannot access microphone.
- Arcade pages cannot access microphone.
- `/teacher/.../monitor` can access microphone with user gesture.
- `/student/activity/[id]` can access microphone with user gesture.

### 26.7 Security/Tamper Tests

- **Entitlement tamper tests:**
  - School teacher without school entitlement calls `start` → 403.
  - School teacher without school manager grant calls `audio-start` → 403.
  - Private teacher without ADMIN entitlement calls `start` → 403.
  - Private teacher with entitlement but wrong subject calls `start` → 403.
  - Teacher attempts to supply `schoolId` or `entitlementId` in request body to bypass entitlement check → ignored; entitlement determined from DB only.
  - ADMIN revokes school entitlement mid-session: subsequent `audio-token` call → 403.
  - School teacher entitlement check uses teacher's own `teacher_id` from JWT, not a body parameter.
- Student calls teacher `approve` route → 403.
- Student sends `{ approved_to_speak: true, audio_scope: 'class' }` in raise-hand body → fields ignored; student remains unapproved.
- Student from class B attempts to join class A session → 403.
- Student with listener token attempts to publish track in main room → SFU rejects.
- Muted student requests new audio token → listener token returned.
- Token from session A used in session B → rejected by provider.
- Student calls `private-audio-token` with no active private session → 403.
- Student calls `approve-private` (teacher-only route) → 403.
- Student attempts to join private room using guessed private room name → no token issued; SFU rejects.
- Two students submit `request-private` simultaneously → only one private session can be approved and active at a time; second attempt returns 409 `private_already_active`.
- Ending private session at provider (closePrivateRoom) happens before DB status is set to `'ended'` — verified by checking provider dashboard.
- Other students receive `private_session_started` event for different `targetStudentId` → client ignores it; no `private_room_name` in payload.
- Participant-count verification: private room has exactly 2 participants (teacher + student) at provider level.

### 26.8 Load/Concurrency Tests

- 40 students simultaneously raising hands (mix of `speak_to_class` and `private_help`) → all recorded; no DB race condition.
- 40 students connected to audio room (41 participants including teacher) → audio quality acceptable.
- Teacher mutes all 5 approved speakers → all muted within 3 seconds at SFU level.
- Teacher monitor remains usable with 40 student rows displayed (compact list, no horizontal overflow, scrollable).
- 40 students simultaneously polling live-state or discussion state → server handles without degradation.
- Safety-margin test: 45 students + 1 teacher (46 participants) connected → no crash; graceful degradation at most.
- Budget cap enforcement at exact threshold (40-student class): 10 sessions × 41 participants × 45 min = 18,450 participant-minutes. Set cap to 18,450. Session 11 should be denied an audio token.
- Phase E concurrent load: main room (40 students + teacher) active while 1 private room (teacher + student) also active → teacher has 2 provider connections simultaneously → audio quality in main room is not degraded by the private room connection.

### 26.9 Regression Tests

- All existing classroom activities tests pass with new migrations applied.
- Teacher dashboard loads correctly.
- Student home page and activities panel unchanged.
- Parent/guardian login and report pages unaffected.
- Arcade sessions unaffected.

### 26.10 Build/Test Commands

```bash
# Existing classroom activities regression
node --experimental-vm-modules node_modules/.bin/jest tests/classroom-activities/

# New discussion tests
node --experimental-vm-modules node_modules/.bin/jest tests/classroom-discussion/

# All tests
node --experimental-vm-modules node_modules/.bin/jest

# E2E - Phase A
npx playwright test tests/e2e/classroom-discussion/phaseA/

# E2E - full regression
npx playwright test tests/e2e/

# Dev server
npm run dev

# Lint
npm run lint
```

---

## 27. Rollout Plan

### 27.1 Feature Flags

| Flag | Type | Default | Purpose |
|------|------|---------|---------|
| `LIVE_DISCUSSION_ENABLED` | Server | `false` | Authoritative runtime kill switch for all live discussion server APIs and server-side gates. Setting to `false` disables discussion immediately at the API layer with no code deploy. |
| `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` | Client (UI hint only) | `false` | Client/UI display hint. May be inlined at build time — changing it without a rebuild/redeploy may not affect client UI. Never trusted by server APIs. |
| `LIVE_DISCUSSION_AUDIO_ENABLED` | Server | `false` | Gates audio token issuance; `false` = non-audio mode even if discussion is enabled |
| `LIVE_AUDIO_PROVIDER` | Server | `"mock"` | Selects provider adapter; `"mock"` is safe default |
| `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP` | Server | `0` | Budget cap; `0` = audio disabled regardless of other flags |

Only server-side flags can disable behavior immediately at runtime. Setting `LIVE_DISCUSSION_ENABLED=false` blocks all discussion APIs instantly without code deployment. `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` may require a rebuild and redeploy to take effect on the client because it can be inlined at build time. Server APIs must remain blocked when `LIVE_DISCUSSION_ENABLED=false` even if the client bundle still displays stale UI.

### 27.2 Dev-Only Mode

Phase A: `LIVE_DISCUSSION_ENABLED=true` + `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED=true` (UI hint) + `LIVE_DISCUSSION_AUDIO_ENABLED=false` + `LIVE_AUDIO_PROVIDER=mock`. No provider needed. No cost.

Phase B+: Use free tier of selected provider in staging.

### 27.3 Teacher-Only Hidden Pilot

Before enabling for students:
1. Enable `LIVE_DISCUSSION_ENABLED=true` and `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED=true` in staging.
2. Teacher uses test student accounts to simulate the full flow.
3. Verify all state transitions, polling integration, and UI updates.
4. Run POC A.

### 27.4 Student Visibility Gating

Students only see discussion UI when a session is actually active for their current activity. The feature flag alone is not enough — there must be an active session in DB. Students with no active session see no new UI regardless of flag state.

### 27.5 Manual Smoke Before Each Phase Goes to Production

- Teacher smoke: go through all controls end-to-end.
- Student smoke: raise hand, see approval, see muted state, see session end.
- Regression smoke: existing classroom activity end-to-end.
- Load smoke: at least 10 simulated students simultaneously (targeting 40 for full load smoke before production release).

### 27.6 Production Readiness Criteria (Per Phase)

- All acceptance criteria for the phase are met.
- All regression tests pass.
- POC for the phase is complete and documented.
- Audio provider DPA signed (Phase B+).
- Privacy policy updated (Phase B+).
- Permissions-Policy change approved and tested (Phase B+).
- Budget cap configured.
- Owner written sign-off on the phase.

---

## 28. Complexity Summary

| Phase | Description | Complexity | Effort | Risk |
|-------|-------------|-----------|--------|------|
| A | Audio foundation + schema plan | Medium | 1–2 weeks | Medium |
| B | Teacher broadcast + student listen-only | Large | 2–3 weeks | Large |
| C | Speak-to-class hand raise + approved student mic | Large | 2–3 weeks | Large |
| D | Group discussion up to 5 students | Medium | 1–2 weeks | Medium |
| E | Private teacher-student audio conversation | Large | 2–3 weeks | Large |
| F | Mobile / security / load QA | Medium | 1 week | Medium |
| — | Future extensions | Very Large | Deferred | Very Large |

**Total Phase A–F:** ~9–14 weeks focused senior development.

**Minimum meaningful MVP:** Phase A + Phase B (audio foundation + teacher broadcast). Phase A alone (no live audio) is infrastructure, not a user-visible MVP.

### What Makes This Large

- **Audio infrastructure:** SFU/WebRTC provider is a new category of tooling not previously in the project.
- **Children's privacy compliance:** Legal review is not optional for audio. This takes calendar time.
- **iOS Safari:** Strictest audio environment. Must be first-class test target.
- **Server-side mute enforcement:** Must be verified at provider level, not just client UI.
- **First Supabase Realtime use:** New infrastructure pattern for this codebase.
- **Phase E private rooms:** Teacher dual-connection (main room + private room) adds provider and client complexity. Separate room architecture requires additional adapter functions and token management.

### What Makes Phase A Manageable

- No live audio connection in Phase A. Mock provider is active.
- No provider account needed for Phase A.
- No Permissions-Policy change needed for Phase A.
- Stores discussion metadata for minors (hand-raise events, approval timestamps, participation logs) — owner-approved retention policy required before the migration runs.
- Builds on existing polling infrastructure.
- Four new tables + ~20 API routes + 2 pages extended.
- `@supabase/realtime-js` already available as transitive dep (for Phase A.1 Realtime enhancement).

---

## 29. Go/No-Go Decision Points

### 29.1 Go/No-Go: Phase A (Audio Foundation)

**Go if:**
- DB schema approved (Section 12).
- API routes approved (Section 13).
- Feature flag strategy approved.
- Polling-first sync model approved.
- Data retention policy for discussion metadata approved (decision B8).

**No-go if:**
- Owner has not approved the DB schema or API routes.

**Recommendation: Go.** Phase A is the essential foundation for all audio phases. Building Phase A without committing to any specific audio provider is low risk.

### 29.2 Go/No-Go: Phase B (First Audio — Teacher Broadcast)

**Go if:**
- Phase A is complete and POC A passed.
- Audio provider selected (at minimum a free-tier POC provider for Phase B testing).
- Legal review initiated for audio transmission to minors.
- Permissions-Policy change approved by owner.
- Budget cap configured.
- `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP` set to a non-zero owner-approved value.

**No-go if:**
- Legal review finds audio is not permissible without additional consent mechanisms not yet built.
- No provider available for testing.
- Provider cost exceeds owner-approved budget.

**Recommendation: Go to Phase B immediately after Phase A is complete.** The product MVP requires audio. Phase A + Phase B together constitute the minimum meaningful product.

### 29.3 Go/No-Go: Phase C–D (Student Mic + Group Discussion)

**Go if:**
- Phase B is stable and POC B passed.
- Provider DPA signed.
- Legal review complete.

**No-go if:** POC B fails on mobile Safari for student audio.

### 29.4 Go/No-Go: Phase E (Private Conversation)

**Go if:**
- Phase C is stable.
- Provider supports separate room creation and per-participant scoped tokens (verified in POC B or a dedicated Phase E POC).
- Owner approves the dual-connection architecture (teacher in main room + private room simultaneously).

**No-go if:**
- Provider does not support separate room scoping cleanly.
- Owner decides private conversations are lower priority than other features.

### 29.5 Go/No-Go: Phase F (QA)

**Go if:** Phases A–E are substantially complete. No additional blockers.

---

## 30. Final End-to-End Acceptance Criteria

These criteria describe the complete working system through Phase F. All must be met before the feature is considered production-ready.

**State machine:**
- Teacher can start a live_lesson.
- Teacher can start a managed discussion while the live_lesson is active.
- Students see the discussion state within 3 seconds of session start.
- All state restores correctly after any page refresh.
- Discussion session auto-ends when the activity is closed; any active private rooms are closed first.

**Hand raise — two request types:**
- Student can raise hand with `request_type = 'speak_to_class'`.
- Student can submit `request_type = 'private_help'` via the request-private action.
- Teacher sees each request in the queue with the correct type badge ("Speak to class" / "Private help").
- Teacher can clear individual requests.
- Teacher can clear all hands.
- Teacher can lock discussion — no new requests accepted while locked.
- Teacher can unlock discussion.

**Teacher audio broadcast (Phase B+):**
- Teacher can broadcast audio to all students.
- All connected students hear teacher audio.
- Teacher can stop broadcasting.
- Student audio playback begins with one user gesture on iOS Safari.

**Approved student — speak to class (Phase C+):**
- Only students with `audio_scope = 'class'` and `is_muted = false` can publish audio to the class room.
- Non-approved students cannot publish audio (enforced at SFU, not just client).
- Teacher can mute any approved student. Muted student's audio stops within 3 seconds at SFU level.
- Muted student cannot unmute themselves.
- Teacher can unmute a muted student.
- Teacher can revoke any student's approval.

**Group discussion (Phase D+):**
- Teacher can approve and mute multiple students simultaneously (up to 5).
- "Mute All" stops all approved student audio at SFU level.

**Private teacher-student conversation (Phase E+):**
- Teacher can approve a private conversation with a student who has `request_type = 'private_help'`.
- Only the teacher and that student can hear the private conversation (verified at provider level — separate room).
- Rest of class cannot hear the private conversation.
- Main class audio continues during private conversation.
- Only one private conversation active per session at a time.
- Teacher can end private conversation; student returns to listen-only.
- No private room name or token is accessible to any student other than the one in the private session.

**Security:**
- Student cannot approve themselves or set their own `audio_scope`.
- Student cannot grant themselves an audio token with publish rights.
- Student cannot obtain a private room token without an active private session.
- Student cannot join a session for a class they are not a member of.
- Student cannot call teacher API routes.
- Muted student's SFU-level mute cannot be bypassed from client code.

**Data integrity:**
- No recording occurs (verified in provider dashboard).
- No transcript is created.
- No audio content appears in any log, event, or database field.
- Discussion cost per session is logged.
- Budget cap enforcement: sessions denied when cap reached.
- Discussion/audio participation data is never included in any parent or guardian API response.

**Regression:**
- Existing classroom activity question-answer scoring is unaffected.
- Existing teacher dashboard loads correctly.
- Existing student home and activity list unchanged.
- Existing parent/guardian login and reports unchanged.
- Existing student login and arcade unchanged.

**Admin Entitlement:**
- Teacher without main ADMIN entitlement (or without school manager grant for school teachers) cannot start a session, issue audio tokens, or open private rooms — 403 returned at every route.
- Revoking school entitlement blocks all teachers at that school from further discussion/audio API calls.
- Revoking private teacher entitlement blocks that teacher from further calls.
- Private teacher cannot use live discussion/audio for subjects not in `private_teacher_subjects`.
- School teacher cannot gain access through a private teacher entitlement path and vice versa.
- Discussion UI controls are not shown to teachers who lack entitlement.

**Kill switch:**
- `LIVE_DISCUSSION_ENABLED=false` is the authoritative server-side runtime kill switch. All server-side feature gates must check this variable. Setting it to `false` disables discussion immediately at the API layer without requiring a code deploy.
- `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` is a client/UI hint only. It must not be described as a runtime kill switch because `NEXT_PUBLIC_` variables may be inlined at build time and do not take effect without a rebuild and redeploy.
- Setting `LIVE_DISCUSSION_AUDIO_ENABLED=false` disables audio immediately while keeping discussion state functional.

---

## 31. Files by Phase — Refined List

### 31.1 Phase A — Files Touched

**New files to create:**
- `supabase/migrations/<next_unused_number>_classroom_discussion.sql` (when approved — not yet; all 4 tables; number determined by inspecting `supabase/migrations/` at implementation time)
- `lib/teacher-server/teacher-discussion.server.js`
- `lib/classroom-discussion/classroom-discussion-shared.server.js`
- `lib/live-audio/provider-adapter.js` (adapter dispatch; Phase A wires mock)
- `lib/live-audio/providers/mock.js` (no-op mock for Phase A and tests)
- `lib/live-audio/types.js` (JSDoc type definitions)
- `pages/api/teacher/activities/[activityId]/discussion/start.js`
- `pages/api/teacher/activities/[activityId]/discussion/index.js`
- `pages/api/teacher/activities/[activityId]/discussion/lock.js`
- `pages/api/teacher/activities/[activityId]/discussion/approve.js`
- `pages/api/teacher/activities/[activityId]/discussion/revoke.js`
- `pages/api/teacher/activities/[activityId]/discussion/mute.js`
- `pages/api/teacher/activities/[activityId]/discussion/unmute.js`
- `pages/api/teacher/activities/[activityId]/discussion/clear-hands.js`
- `pages/api/teacher/activities/[activityId]/discussion/end.js`
- `pages/api/teacher/activities/[activityId]/discussion/approve-private.js`
- `pages/api/teacher/activities/[activityId]/discussion/end-private.js`
- `pages/api/student/activities/[activityId]/discussion/index.js`
- `pages/api/student/activities/[activityId]/discussion/raise-hand.js`
- `pages/api/student/activities/[activityId]/discussion/request-private.js`
- `pages/api/student/activities/[activityId]/discussion/lower-hand.js`
- `pages/api/student/activities/[activityId]/discussion/heartbeat.js`
- `components/teacher-portal/TeacherDiscussionPanel.jsx`
- `components/student/StudentDiscussionBar.jsx`
- `tests/classroom-discussion/session-state-machine.test.mjs`
- `tests/classroom-discussion/participant-state.test.mjs`
- `tests/classroom-discussion/auth-validation.test.mjs`
- `tests/e2e/classroom-discussion/phaseA-flow.spec.js`

**Existing files to modify (Phase A):**
- `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` — add Discussion panel with request-type badges
- `pages/student/activity/[activityId].js` — add discussion status bar, raise-hand and request-private buttons
- `lib/teacher-server/teacher-activities.server.js` — extend monitor payload with discussion state; add auto-end hook on activity close
- `lib/classroom-activities/classroom-activities-labels.client.js` — **do not modify in Waves 0–4**. Final Hebrew copy and label integration require separate owner approval. New discussion components use placeholder labels only.

### 31.2 Audio Phases — Additional Files Touched (Phases B–D)

**New files:**
- `lib/live-audio/providers/livekit.js` (or selected provider)
- `lib/live-audio/providers/agora.js` (if POC C selects Agora)
- `lib/classroom-discussion/classroom-discussion-realtime.server.js` (server-side Realtime broadcast)
- `pages/api/teacher/activities/[activityId]/discussion/audio-token.js`
- `pages/api/teacher/activities/[activityId]/discussion/audio-start.js`
- `pages/api/teacher/activities/[activityId]/discussion/audio-stop.js`
- `pages/api/teacher/activities/[activityId]/discussion/mute-all.js`
- `pages/api/teacher/activities/[activityId]/discussion/approve-multiple.js` (Phase D)
- `pages/api/student/activities/[activityId]/discussion/audio-token.js`
- `tests/e2e/classroom-discussion/phaseB-audio.spec.js`
- `tests/e2e/classroom-discussion/phaseC-student-mic.spec.js`
- `tests/e2e/classroom-discussion/phaseD-multi-speaker.spec.js`

**Existing files modified (audio phases only):**
- `next.config.js` — Permissions-Policy scoping (owner approval required)

### 31.3 Phase E — Additional Files Touched (Private Conversation)

**New files:**
- `pages/api/teacher/activities/[activityId]/discussion/private-audio-token.js` (teacher)
- `pages/api/student/activities/[activityId]/discussion/private-audio-token.js` (student)
- `tests/e2e/classroom-discussion/phaseE-private-conversation.spec.js`

### 31.4 Phase F — Additional Files Touched (QA + Teacher Summary)

**New files:**
- `pages/api/teacher/activities/[activityId]/discussion/report.js` (teacher-only)
- `pages/api/admin/discussion/usage.js` (optional admin usage API)

**Existing files modified (Phase F only):**
- `pages/teacher/class/[classId]/activities/[activityId]/report.js` — teacher-only Discussion Summary section

### 31.4 Files That Must Remain Untouched

- All files in `lib/classroom-activities/` except the labels file.
- `lib/teacher-server/teacher-activities.server.js` — no changes except extending the monitor payload return value and adding the auto-end hook.
- All arcade files (`lib/arcade/`, `pages/student/games/`, `pages/student/arcade.js`).
- All learning master files (`pages/learning/`).
- All guardian/parent files (`lib/guardian-server/`, `lib/parent-server/`, `pages/guardian/`).
- All existing migrations (`supabase/migrations/001` through `024`).
- `lib/classroom-activities/classroom-activities-preview.js` — subject expansion project.
- `lib/classroom-activities/classroom-activities-shared.server.js` — existing Phase A logic.

### 31.5 Environment Files That Must Not Change Until Owner Approval

- `.env`
- `.env.local`
- `.env.production`
- `.env.example`

When the owner approves the feature flags and provider configuration, the `.env.example` should be updated first to document the new variables, followed by the appropriate environment files.

---

## 32. Required Future Environment Variables

Do not add or edit any environment file yet. This list is for planning only.

### Phase A Variables (required from the start)

| Variable | Location | Purpose | Safe Default |
|----------|----------|---------|-------------|
| `LIVE_DISCUSSION_ENABLED` | Server envs | Authoritative server-side runtime kill switch for all discussion APIs and gates | `false` |
| `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` | All envs (client hint only) | Client/UI hint; may be inlined at build time; never trusted by server | `false` |
| `LIVE_DISCUSSION_AUDIO_ENABLED` | Server envs | Gates audio token issuance | `false` |
| `LIVE_AUDIO_PROVIDER` | Server envs | Provider adapter selector | `"mock"` |
| `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP` | Server envs | Budget hard cap | `0` (disabled) |

### Audio Phase Variables (Phase B+)

| Variable | Location | Purpose | Notes |
|----------|----------|---------|-------|
| `LIVEKIT_API_KEY` | Server only | LiveKit server SDK auth | Never `NEXT_PUBLIC_` |
| `LIVEKIT_API_SECRET` | Server only | LiveKit server SDK auth | Never `NEXT_PUBLIC_` |
| `LIVEKIT_SERVER_URL` | Server only | LiveKit internal server URL | `wss://project.livekit.cloud` |
| `NEXT_PUBLIC_LIVEKIT_SERVER_URL` | Client envs | Browser SDK server URL | Same value, public |
| `AGORA_APP_ID` | Server only | Agora App ID (if Agora used) | Never `NEXT_PUBLIC_` |
| `AGORA_APP_CERTIFICATE` | Server only | Agora token signing (if used) | Never `NEXT_PUBLIC_` |

All provider secret keys are server-only. None should ever be prefixed `NEXT_PUBLIC_`.

---

## 33. Owner Decision Checklist

All items below must be resolved before implementation of each phase begins. Items are grouped by decision category.

### Group A — Product Decisions

| # | Decision | Blocks | Status |
|---|---------|--------|--------|
| A1 | Is Phase A (audio foundation + schema plan) approved as the first delivery? | Phase A start | **Resolved for dev run:** Full A–F development implementation package is approved only after manual IDE build approval. Phase A alone is infrastructure, not user-visible MVP. Phase A+B is the minimum meaningful MVP. |
| A2 | Should discussion be limited to `live_lesson` mode only, or available for other activity modes? | Phase A design | **Resolved for dev run:** Discussion is limited to `live_lesson` mode only. |
| A3 | Should a discussion session always be anchored to a `live_lesson` activity, or can it run standalone? | Phase A design | **Resolved for dev run:** Discussion must always be anchored to a `live_lesson` classroom activity. No standalone discussion sessions in this run. |
| A4 | **Resolved 2026-05-25:** Target support is up to 40 students per teacher class. Audio and session calculations assume 40 students + 1 teacher = 41 concurrent participants. Load tests target 40 students as baseline; safety-margin tests target 45 students + 1 teacher = 46 participants. | Phase A capacity | **Resolved** |
| A5 | Should the teacher's existing 5s monitor poll carry discussion state (polling fallback), or should Realtime be added in Phase A? | Phase A sync model | **Resolved for dev run:** Existing teacher/student polling carries discussion state first. Realtime is deferred and must not be required for Phase A. |
| A6 | Should discussion auto-end when the activity is paused, or only when it is closed? | Phase A state machine | **Resolved for dev run:** Discussion does not auto-end when the activity is paused. Paused/locked activity state may block new requests as appropriate. Discussion auto-ends when the activity is closed or archived. |
| A7 | What is the soft maximum number of simultaneous speakers for group discussion? | Phase D design | **Resolved for dev run:** Maximum simultaneous approved student speakers is 5. |
| A8 | **Resolved 2026-05-29:** Should participation data be visible to parents/guardians in reports? **No. Discussion participation, hand-raise history, audio session metadata, and private conversation records are permanently out of scope for parent and guardian reports.** | All phases | **Resolved: No** |
| A9 | What is the UI design for two student request types: two separate buttons or one button with type selector? | Phase A student UI | **Resolved for dev run:** Student UI uses two separate request buttons: `speak_to_class` and `private_help`. Final Hebrew copy still requires owner approval before production, but implementation may use existing/placeholder labels only inside the scoped discussion UI. |
| A10 | When a student enters a private conversation, how is class-room isolation handled? | Phase E architecture | **Resolved for dev run:** Student is isolated through a separate provider room. The student's class-room speaking/publish permission must be suspended/revoked while private is active. The main class room continues for the rest of the class. |
| A11 | **Resolved 2026-05-29:** Is the main ADMIN entitlement model approved? The main platform ADMIN controls who can use live discussion/audio. No school, school teacher, or private teacher receives this capability automatically. | All phases | **Resolved: Yes** |
| A12 | **Resolved 2026-05-29:** Should school managers be able to delegate live discussion/audio permission to individual school teachers after the school receives entitlement from the main ADMIN? | Phase A entitlement | **Resolved: Yes, after school has ADMIN entitlement** |
| A13 | **Resolved 2026-05-29:** Should private teachers require direct main ADMIN entitlement plus subject grants from `private_teacher_subjects`? | Phase A entitlement | **Resolved: Yes** |

### Group B — Privacy and Legal Decisions

| # | Decision | Blocks | Status |
|---|---------|--------|--------|
| B1 | What are the exact operating jurisdictions for this product? (Israel? EU? US? Other?) | All audio phases | **Open for production.** Does not block local/development implementation because no production launch, no SQL execution, no deploy, no real student data, no recording, no transcription, and no AI audio processing are approved. |
| B2 | Has Israeli privacy law review been initiated for real-time voice transmission to minors? | Audio Phase B | **Open for production.** Does not block development implementation. |
| B3 | Is a parental notification mechanism required before audio is enabled for a student? | Audio Phase B | **Open for production.** Does not block development implementation. |
| B4 | What is the data retention policy for `classroom_discussion_events` and participant records? | Phase A | **Open for production.** Does not block development implementation. |
| B5 | Is the privacy policy update planned before audio phases ship? | Audio Phase B | **Open for production.** Does not block development implementation. |
| B6 | Is the sub-processor list update planned (for new audio provider)? | Audio Phase B | **Open for production.** Does not block development implementation. |
| B7 | Is a Supabase DPA already in place? | Phase A | **Open for production.** Does not block development implementation. |
| B8 | Data retention policy for Phase A discussion metadata approved before first migration is executed? | Phase A migration | **Resolved for dev run only:** Migration may include metadata tables and comments, but the migration must not be executed. Production data-retention policy remains open and must be resolved before migration execution or production enablement. |

### Group C — Provider and Cost Decisions

| # | Decision | Blocks | Status |
|---|---------|--------|--------|
| C1 | Is Phase A POC A approved on free/no-cost basis? | Phase A POC | **Resolved for dev run:** POC A with mock provider is approved after manual build approval. |
| C2 | Is the first POC (POC B) allowed to use a free external provider account with test accounts only, with no production student data? | Audio POC B | **Resolved for dev run:** External provider testing may use test accounts only if environment values are available. No production student data. |
| C3 | Which provider should be used for POC B? | Audio POC B | **Resolved for dev run:** LiveKit Free is the first development/POC provider. Architecture must remain provider-neutral. |
| C4 | Which provider is approved for production? | Audio Phase B production | **Open for production.** Development run may implement LiveKit provider behind adapter only. No production provider is selected. |
| C5 | What is the approved monthly budget cap for audio provider costs? | Audio Phase B | **Open for production.** Development run must preserve budget cap default 0. |
| C6 | What is the `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP` value at launch? | Audio Phase B | **Resolved for dev run:** `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP` default remains 0. No billing is enabled by default. |
| C7 | Has the provider DPA been reviewed and is it suitable for a children's product? | Audio Phase B | **Open for production.** Does not block development implementation without production launch. |
| C8 | Who owns provider account management and monitors billing? | Audio Phase B | **Open for production.** Does not block development implementation. |
| C9 | Are the corrected cost assumptions (Section 7) accepted after the owner has verified them against the provider's current pricing page? | Audio Phase B budget | **Open for production.** Cost assumptions must be verified before production budget approval. Development run keeps audio disabled by default. |

### Group D — Technical Architecture Decisions

| # | Decision | Blocks | Status |
|---|---------|--------|--------|
| D1 | Is the proposed DB schema (Section 12) approved? Includes `request_type`, `audio_scope` columns and the `classroom_private_audio_sessions` table. | Phase A | **Resolved for dev run:** DB schema from Section 12 is approved to be written into a migration file only. SQL must not be executed. |
| D2 | Is the API route plan (Section 13) approved? Includes private conversation routes. | Phase A | **Resolved for dev run:** API route plan from Section 13 is approved for implementation. |
| D3 | Is the Realtime channel design (Section 14) approved? | Phase A.1 (Realtime enhancement) | **Resolved for dev run:** Realtime is deferred. Phase A starts polling-first. Realtime code may not be required for core Phase A acceptance. |
| D4 | Is the `LiveAudioProvider` adapter interface (Section 5) approved? Includes the four new private-room functions (`createPrivateRoom`, `closePrivateRoom`, `createTeacherPrivateToken`, `createStudentPrivateToken`). | Phase B | **Resolved for dev run:** `LiveAudioProvider` adapter interface from Section 5 is approved, including private-room functions. |
| D5 | Is the Permissions-Policy scoping change (Section 10.4) approved? | Phase B | **Resolved for dev run:** Permissions-Policy may be scoped only for the teacher monitor route and student activity route if browser microphone implementation requires it. Camera remains blocked. No other route may receive microphone permission. |
| D6 | Should Phase A start with polling-only (no Realtime), or polling + Realtime from the start? | Phase A implementation | **Resolved for dev run:** Polling-only first. No Realtime dependency for Phase A. |
| D7 | Should short-lived Realtime tokens be issued to students instead of anon-key broadcast? | Phase A security | **Resolved for dev run:** No short-lived Realtime JWTs in this run. Use REST polling as source of truth. If Realtime is later added, server-broadcast-only and sanitized payload rules apply. |
| D8 | Is the Phase E separate-provider-room architecture for private conversations approved? | Phase E | **Resolved for dev run:** Phase E must use separate provider room architecture, not client-side mute isolation. |
| D9 | What DB structure will store school and private-teacher live discussion/audio entitlements? | Phase A migration | **Resolved for dev run:** Option A — separate entitlement tables. SQL may be written only inside the migration file. SQL must not be executed. |
| D10 | What is the server helper design for centralizing live discussion/audio entitlement checks? | Phase A implementation | **Resolved for dev run:** Central helper from Section 23.7. Implement in `lib/teacher-server/live-discussion-entitlement.server.js` with `checkLiveDiscussionEntitlement`, `checkSchoolTeacherEntitlement`, `checkPrivateTeacherEntitlement`. |

### Group E — Rollout Decisions

| # | Decision | Blocks | Status |
|---|---------|--------|--------|
| E1 | Which classes/teachers will receive Phase A pilot? | Rollout | **Resolved for dev run:** Test/demo accounts only. No production student data. |
| E2 | Who is authorized to toggle the feature flags in production? | Rollout | **Resolved for dev run:** Owner/main ADMIN only may later enable feature flags. Implementation must keep safe defaults false/disabled. |
| E3 | What is the smoke test procedure before each phase goes live? | Rollout | **Resolved for dev run:** Use QA plan from Section 26 and final report requirements from Section 35. |
| E4 | Is there a rollback procedure if Phase A causes issues in the existing monitor page? | Rollout | **Resolved for dev run:** No commit/push/deploy. Rollback is by discarding working tree changes or using Git review before any commit. |

---

## 34. Final Reminder

**This document is a planning and source-of-truth artifact.**

As of the time of writing, no implementation has started:

- No code has been written.
- No SQL has been executed.
- No migrations have been applied.
- No environment files have been edited.
- No dependencies have been installed.
- No existing features have been changed.
- No Hebrew copy has been changed.
- No design has been changed.
- No commits have been made.
- No pushes have been made.

**Section 35 of this document defines the rules for a future owner-approved development run.** That section does not start implementation by itself. Implementation begins only when the owner gives a separate explicit execution instruction. Until then, no code, SQL, migration execution, commit, push, or deploy is approved.

**For production readiness, implementation may only proceed after:**
1. The owner has reviewed and answered all applicable items in Section 33 (Owner Decision Checklist).
2. Written approval has been received for the specific phase to be implemented.
3. For audio phases: legal review is complete and DPA is signed (applies to production launch, not a development prototype run under Section 35).

**Recommended production path:**
- Resolve Section 33 Group A+D decisions for Phase A.
- Implement Phase A (audio foundation, schema, all APIs, mock provider, ~1–2 weeks).
- Run POC A to validate state machine, APIs, page refresh, and request-type routing with mock provider.
- Resolve Group B, C decisions for Phase B (legal, provider, budget, Permissions-Policy).
- Run POC B on free provider tier (Phase B delivers the minimum meaningful MVP with audio).
- Implement Phase B (teacher broadcast, ~2–3 weeks).
- Continue with Phase C → D → E → F.

**Audio phases (B–E) must not be deployed or committed until Phase A is stable in production and all privacy/legal reviews are complete for the product's operating jurisdictions. A development prototype under Section 35 is exempt from this production rule, but is not exempt from the no-commit, no-push, no-deploy rules stated there.**

**Parent/guardian report rule is permanent and does not require per-phase re-confirmation. No discussion or audio participation data is ever added to parent or guardian reports.**

---

---

## 35. Build-Ready Full Development Implementation Protocol

### 35.1 Purpose

This section defines the exact implementation protocol that applies after the owner manually approves the IDE/agent Build/Accept/Agent execution action for this plan. Until that manual approval, this is documentation only. After that manual approval, the agent must start code implementation according to this section. The agent must not return another planning-only summary.

Implementation is wave-gated. Manual build approval does not authorize the entire A–F package in one uninterrupted run. The owner may approve a specific wave or a specific wave range only. The agent must stop after each approved wave and return the wave report. No next wave may begin without the owner explicitly approving it.

### 35.2 Controlled Wave Execution Rule

Implementation is divided into waves. Each wave is a discrete, reviewable unit of work.

**Wave structure:**
- Wave 0 — Preflight repo inspection (no file creation)
- Wave 1 — Isolated foundation (migration file, dependencies, env, entitlement helper, adapter)
- Wave 2 — Backend APIs without UI
- Wave 3 — Payload integration only
- Wave 4 — UI components and integration, feature disabled by default
- Wave 5 — LiveKit audio and private room
- Wave 6 — Teacher-only report and final verification

**Rules:**
- Manual build approval for this plan authorizes only the wave or wave range the owner explicitly names.
- The agent must stop after each wave and return the required wave report.
- The agent must not start the next wave based on its own judgment.
- A successful build or passing tests do not constitute approval to continue.
- After each wave, run only the critical checks defined for that wave.
- Full comprehensive QA runs in Wave 6 only.
- If a critical check fails, stop and report. Do not continue to the next wave.
- Non-critical QA items not run before Wave 6 must be marked deferred to Wave 6, not as blockers.

### 35.3 Manual Build Approval Rule

Implementation starts only after the owner manually approves the IDE/agent Build/Accept/Agent execution action for this approved plan.

Chat-body approval is not sufficient.

A general message saying approved, go ahead, implement, continue, looks good, or any Hebrew approval phrase is not sufficient unless the owner also manually approves the IDE/agent Build/Accept/Agent execution action.

After manual build approval, the agent must begin code implementation for the approved wave only, or explicitly state it is still in plan/documentation mode and cannot edit code.

If the agent cannot edit `.js`, `.jsx`, API route, migration, or test files, it must stop and say exactly: **I am still in plan/documentation mode and cannot implement code.**

### 35.4 Valid First Response After Manual Build Approval

The first response after manual build approval must not be a plan summary.

It must be one of only two valid response types.

**Valid response A — implementation starts:**

The response must state which wave is starting and must list at least four real non-doc implementation files being created or modified in that wave. Examples of valid Wave 1 implementation files:

- `supabase/migrations/<next_unused_number>_classroom_discussion.sql` (number determined from Wave 0 preflight)
- `lib/teacher-server/live-discussion-entitlement.server.js`
- `lib/teacher-server/teacher-discussion.server.js`
- `lib/live-audio/provider-adapter.js`
- `lib/live-audio/providers/mock.js`
- `lib/live-audio/providers/livekit.js`
- `components/teacher-portal/TeacherDiscussionPanel.jsx`
- `components/student/StudentDiscussionBar.jsx`
- `pages/api/teacher/activities/[activityId]/discussion/start.js`
- `pages/api/student/activities/[activityId]/discussion/index.js`
- `tests/classroom-discussion/session-state-machine.test.mjs`

**Valid response B — cannot implement:**

`I am still in plan/documentation mode and cannot implement code.`

Any other response is invalid.

### 35.5 Invalid Response After Manual Build Approval

After manual build approval, these responses are invalid:

- Another markdown-only plan update.
- Another plan summary.
- Another stale-reference checklist.
- Another "plan is ready" message.
- Another explanation of Section 35.
- Another request for implementation permission.
- Editing only documentation files.
- Reporting "No code, no SQL, no implementation" as if that is the final result.

If any of the above occurs, the implementation run is failed and should be stopped.

### 35.6 Implementation Scope

The full A–F development package includes the following. All items are in scope after manual build approval.

**1. Migration file**

- `supabase/migrations/<next_unused_number>_classroom_discussion.sql` — number must be determined at implementation time by inspecting `supabase/migrations/`. Never hardcode a number.
- Four core discussion tables.
- Option A entitlement tables (separate tables per Section 23.6 and D9 resolution).
- Indexes, comments, RLS enabled.
- SQL written only — SQL must not be executed.

**2. Admin entitlement model**

- `lib/teacher-server/live-discussion-entitlement.server.js`
- All required entitlement helper functions: `checkLiveDiscussionEntitlement`, `checkSchoolTeacherEntitlement`, `checkPrivateTeacherEntitlement`.
- All teacher discussion/audio routes must call the entitlement helper before any other logic.
- Entitlement-based UI gating in `TeacherDiscussionPanel.jsx`.
- Unit tests for all gate scenarios including entitlement-denied cases.

**3. Discussion server module**

- `lib/teacher-server/teacher-discussion.server.js`
- Session lifecycle: start, lock, end, auto-end on activity close/archive.
- Participant lifecycle: raise hand, approve, revoke, mute, unmute, clear-all-hands, mute-all.
- Request types: `speak_to_class`, `private_help`.
- Private session lifecycle: start, end, auto-end.
- Activity close auto-end hook.

**4. LiveAudioProvider adapter**

- Provider-neutral adapter interface (`lib/live-audio/provider-adapter.js`).
- Mock provider (`lib/live-audio/providers/mock.js`).
- LiveKit development provider (`lib/live-audio/providers/livekit.js`).
- No LiveKit-specific code outside the provider file.

**5. Teacher API routes (Section 13 scope)**

- `start`, `index`, `lock`, `approve`, `revoke`, `mute`, `unmute`, `clear-hands`, `mute-all`, `end`.
- `audio-start`, `audio-stop`, `audio-token`.
- `approve-private`, `end-private`, `private-audio-token`.
- `report` (teacher-only, no parent/guardian exposure).

**6. Student API routes (Section 13 scope)**

- `index`, `raise-hand`, `request-private`, `lower-hand`, `heartbeat`.
- `audio-token`, `private-audio-token`.

**7. Teacher UI**

- `components/teacher-portal/TeacherDiscussionPanel.jsx`.
- Integration into teacher monitor page.
- Entitlement-based visibility gating.
- Compact display supporting up to 40 student rows.
- Request-type badges for `speak_to_class` and `private_help`.
- Audio controls, private conversation indicator.

**8. Student UI**

- `components/student/StudentDiscussionBar.jsx`.
- Integration into student activity page.
- `speak_to_class` request button.
- `private_help` request button.
- States: listen-only, approved-to-speak, muted, private conversation active.

**9. Teacher-only discussion report**

- Report endpoint behind `requireTeacherApiContext` only.
- No parent or guardian API exposure.
- Teacher-facing discussion summary.

**10. Tests**

- Unit tests.
- API tests.
- Entitlement gate tests (including denied cases).
- Tamper/security tests.
- Regression tests (prove no parent/guardian data exposure).
- E2E where practical.
- Tests blocked only by missing DB schema must be clearly marked `BLOCKED_BY_SQL_NOT_EXECUTED`.

### 35.7 Required Implementation Order

1. Migration file only (`supabase/migrations/<next_unused_number>_classroom_discussion.sql` — number determined by inspecting `supabase/migrations/` before any file is created).
2. Entitlement helper (`lib/teacher-server/live-discussion-entitlement.server.js`).
3. LiveAudioProvider adapter + mock provider.
4. Discussion server module (`lib/teacher-server/teacher-discussion.server.js`).
5. Teacher API routes.
6. Student API routes.
7. Monitor/live-state payload integration.
8. Teacher UI component (`TeacherDiscussionPanel.jsx`).
9. Student UI component (`StudentDiscussionBar.jsx`).
10. Audio provider implementation (LiveKit development provider).
11. Private-room implementation (Phase E).
12. Teacher-only discussion report (Phase F).
13. Tests.
14. Build/lint/test verification.
15. Final implementation report.

### 35.8 Absolute Restrictions

These restrictions apply during the entire implementation run without exception:

- Do not execute SQL.
- Do not run migrations.
- Do not apply DB changes manually in Supabase.
- Do not commit.
- Do not push.
- Do not deploy.
- Do not use production student data.
- Do not store real provider secrets in committed files.
- Do not enable recording.
- Do not enable transcription.
- Do not enable AI audio processing.
- Do not expose discussion, audio, or private conversation data to parent or guardian reports.
- Do not touch unrelated Hebrew content.
- Do not touch unrelated design.
- Do not touch learning, arcade, parent, guardian, or subject-expansion flows except for regression tests or explicit no-op guards required to prove no exposure.

### 35.9 Safe Defaults

The implementation must preserve these safe defaults. Nothing is enabled without explicit environment variable overrides.

- `LIVE_DISCUSSION_ENABLED=false` — server-side runtime kill switch; all discussion APIs blocked by default
- `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED=false` — client/UI hint; may be inlined at build time; never trusted by server
- `LIVE_DISCUSSION_AUDIO_ENABLED=false`
- `LIVE_AUDIO_PROVIDER=mock`
- `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP=0`

No feature is enabled by default. No audio is enabled by default. No school, school teacher, or private teacher gets access automatically.

### 35.10 Required Final Implementation Report

The final report after the implementation run must list actual implementation work, not plan status.

It must include:

- Files created.
- Files modified.
- Migration file created (confirm file path).
- Confirmation SQL was not executed.
- Confirmation migrations were not run.
- Confirmation no commit.
- Confirmation no push.
- Confirmation no deploy.
- Dependencies added, if any.
- Environment variable names added or referenced.
- APIs implemented.
- UI implemented.
- Audio provider status (mock/LiveKit).
- LiveKit provider status.
- Feature flag defaults (confirm all safe default values from Section 35.9 remain unchanged).
- Tests run.
- Tests passed.
- Tests failed.
- Tests blocked by `BLOCKED_BY_SQL_NOT_EXECUTED`.
- Build result.
- Lint result.
- Security/tamper test result.
- Entitlement gate test result.
- Parent/guardian exposure check result.
- Known issues.
- Owner actions still required before production.
- Recommendation: keep / fix / discard.

A final report that lists only documentation changes is invalid.

---

*End of plan document.*
*Version 3.2 — 2026-05-29*
*Build-ready execution protocol. Section 35 rewritten as implementation protocol triggered only by manual IDE Build/Accept/Agent approval. All Section 33 Group A–E decisions resolved for development run. D9 resolved as Option A (separate entitlement tables). D10 resolved as central entitlement helper in lib/teacher-server/live-discussion-entitlement.server.js. Valid and invalid first responses defined. Full implementation scope, order, restrictions, and final report requirements defined. No code, no SQL execution, no commit, no push, no deploy.*
