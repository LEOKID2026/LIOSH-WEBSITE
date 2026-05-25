# Teacher-Controlled Live Audio Classroom — Full Project Plan

**Status:** Final planning document. Includes approved future development-run instructions in Section 35. No implementation has started yet. No SQL may be executed. No commit, push, or deploy is approved.

**Version:** 2.2 — added Section 35 future overnight development-run instructions — 2026-05-25

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
16. [Phase 0 — Architecture Mapping and Go/No-Go](#16-phase-0--architecture-mapping-and-gono-go)
17. [Phase 1 — Realtime Hand Raise / Approval State (No Audio)](#17-phase-1--realtime-hand-raise--approval-state-no-audio)
18. [Phase 2 — Teacher Audio Broadcast Only](#18-phase-2--teacher-audio-broadcast-only)
19. [Phase 3 — Teacher-Approved Student Microphone](#19-phase-3--teacher-approved-student-microphone)
20. [Phase 4 — Multiple Approved Speakers / Managed Discussion Mode](#20-phase-4--multiple-approved-speakers--managed-discussion-mode)
21. [Phase 5 — Attendance and Participation Logs](#21-phase-5--attendance-and-participation-logs)
22. [Phase 6 — Reports and Teacher Summary Integration](#22-phase-6--reports-and-teacher-summary-integration)
23. [Phase 7 — Future Extensions (Deferred)](#23-phase-7--future-extensions-deferred)
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

The feature allows a teacher to run a teacher-mediated classroom discussion alongside a `live_lesson` classroom activity. The teacher broadcasts audio to all students. Students can raise their hand to request speaking rights. The teacher approves or revokes speaking rights. Only approved students may broadcast audio. The teacher maintains full control at all times. This is not Zoom, not video, not student-to-student communication.

### Phase Summary

| Phase | Description | Complexity | Effort | Risk |
|-------|-------------|-----------|--------|------|
| 0 | Architecture decisions + owner approvals | Small | 1–2 days | Low |
| 1 | Hand raise / approval state (no audio) | Medium | 1–2 weeks | Medium |
| 2 | Teacher audio broadcast only | Large | 2–4 weeks | Large |
| 3 | Approved student microphone | Large | 2–3 weeks | Large |
| 4 | Multi-speaker managed discussion | Medium | 2–3 weeks | Medium |
| 5 | Attendance and participation logs | Small | 3–5 days | Low |
| 6 | Report integration | Medium | 1 week | Low |
| 7 | Future extensions (recording, AI, breakout) | Very Large | Deferred | Very Large |

**Total estimated effort to Phase 4:** 8–14 weeks, one or two senior engineers, tested audio provider.

**Recommended starting point:** Phase 1 alone (hand raise, no audio) has standalone product value. It introduces no audio infrastructure, no provider cost, and no Permissions-Policy change. Phase 1 has no audio or voice-data exposure and therefore much lower privacy risk than audio phases, but it still requires an owner-approved retention policy for discussion metadata (hand-raise events, approval timestamps, mute state, participation event logs for minors). It should be built first, regardless of whether audio phases are approved.

---

> **Hard rule — audio phases must not start before Phase 1 is proven (production rule).**
>
> Audio phases (2–4) must not be implemented before: (a) Phase 1 is implemented and stable in a test environment, (b) POC A passes all acceptance criteria, and (c) Phase 1 has demonstrated product value. POC B and POC C may be researched concurrently with Phase 1 development, but no audio production implementation begins before Phase 1 is validated. This rule is not negotiable for production, deployment, commit, push, or live use.
>
> **Development prototype exception (Section 35 only):** A future owner-approved development run (as defined in Section 35) may prepare audio code and LiveKit integration for local testing and prototype review only. That does not mean audio is approved for production, deployment, commit, push, or live use with real students. Audio remains blocked for production until Phase 1 is proven and all provider, legal, and cost decisions are resolved.

---

**Audio phases are additionally blocked until:**
- Owner selects audio provider after reviewing POC B/C results.
- Legal/privacy review is complete for all operating jurisdictions including Israel.
- Audio provider DPA is signed.
- Permissions-Policy change is approved.
- Cost assumptions are verified against the provider's current pricing page (see Section 6).

---

## 2. Product Architecture Context — Active Digital Classroom

### 2.1 This Feature Is Not a Standalone Tool

The Teacher-Controlled Live Audio Classroom is one layer of a larger **Active Digital Classroom** system. It must remain connected to learning activity data and teacher control. It must not become a generic audio conferencing tool that operates independently of classroom context.

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
- Not a recording product (in initial versions).
- Not an AI transcript product (in initial versions).

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

**Student discussion state per session:**
```
listening → hand_raised → approved_to_speak ⇆ muted
          ↗ (cleared by teacher)           ↘ speaking (audio phases)
```

### 4.2 Layers

```
┌─────────────────────────────────────────────────────────┐
│  Teacher UI (monitor.js)   Student UI (activity page)   │
├─────────────────────────────────────────────────────────┤
│  Discussion REST APIs       Discussion REST APIs         │
│  /api/teacher/…/discussion  /api/student/…/discussion    │
├─────────────────────────────────────────────────────────┤
│  Discussion Server Module   (lib/teacher-server/         │
│  teacher-discussion.server.js)                          │
├─────────────────────────────────────────────────────────┤
│  Supabase DB (service role)  Supabase Realtime Broadcast │
│  classroom_discussion_*      discussion:{sessionId}      │
├─────────────────────────────────────────────────────────┤
│  LiveAudioProvider Adapter   (Phase 2+)                  │
│  lib/live-audio/provider-adapter.js                     │
├─────────────────────────────────────────────────────────┤
│  Concrete Provider          (Phase 2+)                   │
│  lib/live-audio/providers/livekit.js  (or agora.js etc.) │
└─────────────────────────────────────────────────────────┘
```

### 4.3 DB Layer

Three new tables (do not create yet):
- `classroom_discussion_sessions` — one per teacher-initiated discussion, anchored to an activity.
- `classroom_discussion_participants` — one row per student per session; tracks hand raise, approval, mute.
- `classroom_discussion_events` — append-only event log.

Full schema in Section 12.

### 4.4 Realtime Layer

- First use of Supabase Realtime in the project.
- Channel per session: `discussion:{sessionId}`.
- All authoritative state writes go through REST API, never directly through Realtime from client.
- Realtime carries event notifications only (optimistic signals). DB is source of truth.
- Full security analysis in Section 8.
- Full sync model definition in Section 9.

### 4.5 Audio Layer (Phases 2–4)

- Isolated behind a provider-neutral `LiveAudioProvider` adapter (Section 5).
- Provider selected by owner from comparison in Section 6.
- Teacher audio token: `canPublish: true`, `canSubscribe: true`.
- Student listener token: `canPublish: false`, `canSubscribe: true`.
- Student speaker token: issued only after server verifies `approved_to_speak = true AND is_muted = false`.
- Mute enforced server-side via provider API, not client-only.

### 4.6 Feature Flags

- `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` — client-side flag; gates all discussion UI.
- `LIVE_DISCUSSION_AUDIO_ENABLED` — server-side flag; gates audio token issuance.
- Both start `false`. Never enabled without owner approval.
- Kill switch: setting either flag to `false` immediately disables the feature with no code change.

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
 * @param {boolean} opts.recordingEnabled  - always false in Phase 2–4
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

### 5.6 Mock Provider for Phase 1 and Testing

`lib/live-audio/providers/mock.js` implements the full interface but does nothing — all functions return immediately with success. Used in:
- Phase 1 (no audio, mock is the active provider).
- Unit tests for discussion session logic.
- POC A (no-audio discussion state test).

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

#### Example scenario

- **Class size:** 21 participants (20 students + 1 teacher)
- **Session length:** 45 minutes
- **Participant-minutes per session:** 21 × 45 = **945 participant-minutes**

#### Corrected cost table (using unverified rate estimates — must verify before use)

| Scale | Sessions/month | Participant-minutes | LiveKit Cloud (at $0.002/pm est.) | Agora / Daily (at $0.00099/pm est.) |
|-------|---------------|--------------------:|:---------------------------------:|:------------------------------------:|
| Low | 10 | 9,450 | ~$18.90 | ~$0 (under free tier) |
| Medium | 40 | 37,800 | ~$75.60 | ~$27.52 (27,800 pm × $0.00099) |
| High | 100 | 94,500 | ~$189.00 | ~$83.66 (84,500 pm × $0.00099) |
| Very High | 500 | 472,500 | ~$945.00 | ~$457.87 (462,500 pm × $0.00099) |

**"pm" = participant-minute.**

Agora/Daily: the free 10,000 participant-minutes/month is deducted first. The remaining participant-minutes are billed at the stated rate. Verify the current free allowance on the provider's pricing page — it may have changed.

LiveKit Self-Host (alternative): fixed infrastructure cost of ~$5–20/month regardless of session volume. At medium to high scale (40–500 sessions/month), self-host becomes cheaper than LiveKit Cloud. At low scale (10 sessions/month), managed cloud is more economical.

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

1. **Agora** — approximately 10,000 free participant-minutes/month (verify current allowance). No credit card required for trial. Console at console.agora.io. The POC scenario (21 participants × 45 minutes × 1 session = 945 participant-minutes) is well within any reasonable free tier.
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

**Billing unit:** one participant-minute = one participant connected for one minute. A 21-person session lasting 45 minutes = 21 × 45 = 945 participant-minutes. This is confirmed for Agora and Daily. LiveKit Cloud billing unit must be verified on their current pricing page.

**Reference scenario (21 participants, 45 min/session):**
```
low_volume   = 21 × 45 × 10  sessions =  9,450 participant-minutes/month
mid_volume   = 21 × 45 × 40  sessions = 37,800 participant-minutes/month
high_volume  = 21 × 45 × 100 sessions = 94,500 participant-minutes/month
```

**Estimated costs (unverified — must verify rates before setting budget cap):**

At $0.002 per participant-minute (LiveKit Cloud mid-range estimate):
```
low_volume  cost:  9,450 × $0.002 = ~$18.90/month
mid_volume  cost: 37,800 × $0.002 = ~$75.60/month
high_volume cost: 94,500 × $0.002 = ~$189.00/month
```

At $0.00099 per participant-minute (Agora/Daily estimate, after free tier):
```
low_volume  cost:  9,450 participant-minutes → likely $0 (under free tier)
mid_volume  cost: 27,800 paid pm × $0.00099 = ~$27.52/month
high_volume cost: 84,500 paid pm × $0.00099 = ~$83.66/month
```

> **Warning:** The v2.0 draft of this plan contained a math error in these cost examples (values were off by a factor of 1,000, e.g., showing $0.019 instead of $18.90). The figures above are the corrected values. All cost figures remain unverified estimates that must be confirmed against current provider pricing pages before any budget cap is set.

At current anticipated scale (10–40 sessions/month), audio cost is modest but not negligible for LiveKit Cloud at mid-range rates. The budget guard is a safeguard against unexpected usage spikes (e.g., a configuration error that starts audio for all students on all devices).

### 7.2 Usage Tracking

Each discussion session that uses audio must log:
- `session_id`
- `audio_provider`
- `audio_room_id`
- `started_at`, `ended_at`
- `participant_count_peak`
- `estimated_participant_minutes` (computed on session end)

This data is stored in `classroom_discussion_sessions` (columns added in Phase 2+) and can be queried by an admin API.

### 7.3 Budget Guard Plan

| Threshold | Action |
|-----------|--------|
| Monthly usage reaches 70% of cap | Log warning event; optionally email admin |
| Monthly usage reaches 90% of cap | Log critical warning; display alert in teacher dashboard (admin-configurable) |
| Monthly usage reaches 100% of cap | Disable audio token issuance server-side; discussion continues in Phase 1 mode (hand raise only) |
| `LIVE_DISCUSSION_AUDIO_ENABLED=false` | Instant kill switch; audio disabled immediately, no code deploy needed |
| Provider API returns billing error | Log error; disable audio for the session; continue in Phase 1 mode |
| Provider outage | Log outage event; discussion continues without audio; banner shown to teacher |

### 7.4 No-Surprise Billing Rules

- `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP` environment variable (server-side) sets the monthly cap.
- Default value in all environments: `0` (audio disabled until explicitly set).
- Setting this value to a non-zero number is an explicit owner action that enables billing.
- The server checks cumulative usage before issuing any audio token. If cap is reached, token is denied.
- No audio provider auto-renewal or credit card charging happens without a configured account limit on the provider's side.

### 7.5 Admin Usage Summary

Phase 5/6 adds an admin API:
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
- **For Phase 1, anon channel with payload sanitization is the recommended approach.** The risk is low given UUID channel names and read-only student access.
- **For a future security hardening phase, server-issued short-lived Realtime JWTs can be implemented if required.** This is listed as a future option, not a Phase 1 requirement.

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

### 8.7 Should Phase 1 Start With Polling Only?

**Yes. Phase 1 should implement polling first, Realtime second.**

Rationale:
- The existing codebase is 100% polling-based. Adding polling support for discussion state follows the existing pattern exactly.
- Realtime is an optimization for lower latency (sub-second vs. 3–5 second updates).
- Polling-only Phase 1 is lower risk, easier to debug, and delivers the product value.
- Realtime can be added in a Phase 1.5 or Phase 2 hardening step once the core state machine is proven.
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

### 9.3 Realtime as Optimization (Phase 1.5+)

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
- But when the student requests an audio token (Phase 2+), the server re-checks `approved_to_speak` in the DB. The token is not issued based on the Realtime event alone.

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

Only audio phases (Phase 2+) require microphone access. Only on specific pages:

| Route | Needs Microphone | Role |
|-------|:---------------:|------|
| `/teacher/class/[classId]/activities/[activityId]/monitor` | Yes (Phase 2+) | Teacher broadcasts audio |
| `/student/activity/[activityId]` | Yes (Phase 2+, approved students) | Student speaks |
| All other routes | **No** | Microphone stays blocked |

### 10.4 Recommended `next.config.js` Headers Configuration (Phase 2+ Only)

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

### 10.5 Phase 1 Impact

**Phase 1 (no audio) requires no Permissions-Policy change.** The existing `microphone=()` header remains unchanged.

### 10.6 Required Tests After Permissions-Policy Change

Before shipping audio phases:
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
| Children's privacy review under Israeli law | Not started | Audio Phase 2 |
| Children's privacy review for other jurisdictions in scope | Not started | Audio Phase 2 |
| Voice transmission disclosure in privacy policy | Not done | Audio Phase 2 |
| Parental notification mechanism | Not defined | Audio Phase 2 |
| Parental consent requirement (if legally required) | Not determined | Audio Phase 2 |
| Data retention policy for discussion event logs | Not defined | Phase 1 |
| Data retention policy for participant metadata | Not defined | Phase 1 |
| DPA with audio provider | Not signed | Audio Phase 2 |
| Privacy policy update (add: real-time audio transmission) | Not done | Audio Phase 2 |
| No recording by default — documented and verified | Planned | Audio Phase 2 |
| No transcription by default — documented and verified | Planned | Audio Phase 2 |
| No AI processing of audio by default — documented and verified | Planned | Audio Phase 2 |
| Sub-processor list updated (new audio provider) | Not done | Audio Phase 2 |
| DPA with Supabase (if not already signed) | Unknown | Phase 1 |

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

Three new tables. No changes to any existing table. Same RLS posture as all classroom tables: RLS enabled, no client policies, service-role-only via API.

### 12.2 `classroom_discussion_sessions`

```sql
-- Do not create yet. Planning only.
create table public.classroom_discussion_sessions (
  id                          uuid        primary key default gen_random_uuid(),
  activity_id                 uuid        references public.classroom_activities(id) on delete cascade,
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
  approved_to_speak     boolean     not null default false,
  approved_at           timestamptz,
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

alter table public.classroom_discussion_participants enable row level security;
comment on table public.classroom_discussion_participants is
  'RLS enabled; no client policies. All access via service role.';
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
                                      'audio_stopped'
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

### 12.5 Relationship to Existing Tables

- New tables do **not** modify `classroom_activities`, `classroom_activity_student_status`, or `classroom_activity_attempts`.
- `activity_id` on `classroom_discussion_sessions` is nullable (for potential future standalone discussions).
- Class and teacher validation still goes through `teacher_classes`, `teacher_class_students`, `teacher_profiles`.

### 12.6 Data Retention

Owner must define a retention policy. Suggested defaults:
- `classroom_discussion_events`: retain for 90 days, then archive or delete.
- `classroom_discussion_participants`: retain for 90 days.
- `classroom_discussion_sessions`: retain indefinitely (summary metadata only).

These are suggestions, not implemented policies.

---

## 13. API Plan

### 13.1 Teacher Discussion APIs

All routes under `pages/api/teacher/activities/[activityId]/discussion/`.

All routes: validate `Authorization: Bearer` → JWT → `role === 'teacher'` → `classroom_activities.teacher_id = auth.uid()`.

| Route | Method | Body | Response | Key Error Codes |
|-------|--------|------|---------|----------------|
| `start` | POST | `{}` | `{ sessionId, status }` | `404` activity; `403` not owner; `409` session_already_active |
| `index` | GET | — | `{ session, participants[] }` | `404` no session; `403` |
| `lock` | PATCH | `{ locked: bool }` | `{ status }` | `409` session_ended |
| `approve` | POST | `{ studentId }` | `{ ok }` | `404` student; `409` session_locked |
| `revoke` | POST | `{ studentId }` | `{ ok }` | `404`; `403` |
| `mute` | POST | `{ studentId }` | `{ ok }` | `404`; `403` |
| `unmute` | POST | `{ studentId }` | `{ ok }` | `404`; `403` |
| `clear-hands` | POST | `{}` | `{ count }` | `403` |
| `mute-all` | POST | `{}` | `{ count }` | `403` |
| `end` | POST | `{}` | `{ ok }` | `409` already_ended |
| `audio-token` | POST | `{}` | `{ token, roomId, serverUrl }` | `503` provider_error; `402` budget_cap_reached |
| `audio-start` | POST | `{}` | `{ ok }` | `503` |
| `audio-stop` | POST | `{}` | `{ ok }` | |
| `report` | GET | — | `{ participants[] }` | `404` |

### 13.2 Student Discussion APIs

All routes under `pages/api/student/activities/[activityId]/discussion/`.

All routes: validate `liosh_student_session` cookie → `student_sessions` → active student → student is class member.

`studentId` is **always** taken from the validated session, never from request body.

| Route | Method | Body | Response | Key Error Codes |
|-------|--------|------|---------|----------------|
| `index` | GET | — | `{ session: { status, audioEnabled }, self: { handRaised, approved, muted } }` | `404` no session |
| `raise-hand` | POST | `{}` | `{ ok }` | `409` already_raised; `409` session_locked; `404` |
| `lower-hand` | POST | `{}` | `{ ok }` | `409` hand_not_raised |
| `heartbeat` | POST | `{}` | `{ ok }` | `404` |
| `audio-token` | POST | `{}` | `{ token, serverUrl, canPublish }` | `403`; `503`; `404` |

Note: student `audio-token` returns `canPublish: false` by default. Returns `canPublish: true` only if `approved_to_speak = true AND is_muted = false` in DB, and `LIVE_DISCUSSION_AUDIO_ENABLED = true`.

### 13.3 Role Guard Summary

| Action | Teacher API | Student API |
|--------|:-----------:|:-----------:|
| Start session | Yes | No |
| End session | Yes | No |
| Lock/unlock | Yes | No |
| Approve student | Yes | No |
| Revoke student | Yes | No |
| Mute student | Yes | No |
| Mute all | Yes | No |
| Clear hands | Yes | No |
| Raise own hand | No | Yes |
| Lower own hand | No | Yes |
| Get own state | No | Yes |
| Get full session state | Yes | No |
| Audio token (publish) | Yes | Only if approved |
| Audio token (listen) | No | Yes |

### 13.4 Tamper Prevention Rules

- `studentId` in student routes always taken from session, not body. Any `studentId` in body is ignored.
- `approved_to_speak`, `is_muted` are never writable from student routes.
- Teacher routes reject if `teacher_id !== classroom_activities.teacher_id`.
- Student routes reject if student is not in `teacher_class_students` for the activity's class.
- Audio tokens include `roomName` derived from `sessionId`. A token for session A cannot be used in session B.

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
{ "event": "session_started",  "sessionId": "..." }
{ "event": "session_locked",   "sessionId": "..." }
{ "event": "session_unlocked", "sessionId": "..." }
{ "event": "session_ended",    "sessionId": "..." }
{ "event": "hands_cleared",    "sessionId": "..." }
{ "event": "audio_started",    "sessionId": "..." }
{ "event": "audio_stopped",    "sessionId": "..." }
{ "event": "hand_raised",      "sessionId": "...", "targetStudentId": "..." }
{ "event": "speak_approved",   "sessionId": "...", "targetStudentId": "..." }
{ "event": "speak_revoked",    "sessionId": "...", "targetStudentId": "..." }
{ "event": "student_muted",    "sessionId": "...", "targetStudentId": "..." }
{ "event": "student_unmuted",  "sessionId": "...", "targetStudentId": "..." }
```

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

**Estimated duration:** 2–3 days to run after Phase 1 implementation is complete.

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

**Estimated duration:** 3–5 days to run after Phase 2 implementation is complete.

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

## 16. Phase 0 — Architecture Mapping and Go/No-Go

### 16.1 Goal

Resolve all owner decisions before implementation begins. Produce written owner approvals.

### 16.2 Tasks

- Owner reviews and approves DB schema (Section 12).
- Owner reviews and approves API routes (Section 13).
- Owner reviews and approves Realtime plan (Section 14).
- Owner selects whether Phase 1 alone is the first delivery.
- Owner decides on audio provider (or defers audio entirely).
- Owner approves feature flag strategy.
- Owner decides on budget cap (`LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP`).
- Owner confirms legal review is planned for audio phases.
- Owner signs off on privacy design principles (Section 11.5).
- Owner defines and approves data retention policy for Phase 1 discussion metadata (required before the Phase 1 migration is executed — see decision B8).
- Owner confirms that verified provider pricing will be reviewed before any budget cap is configured (decision C9).

### 16.3 Acceptance Criteria

- All Section 33 owner decisions answered.
- Audio provider selected (or audio deferred).
- Written approval exists for Phase 1 to begin.

### 16.4 Risk

Low (planning only).

### 16.5 Estimated Effort

1–2 days.

---

## 17. Phase 1 — Realtime Hand Raise / Approval State (No Audio)

### 17.1 Goal

Ship a real-time hand-raise and teacher-approval system with zero audio. Standalone product value.

### 17.2 Product Behavior

- Teacher opens monitor page during active `live_lesson`.
- New "Discussion" panel with "Start Discussion" button.
- On click: session created in DB; student UI updates within 3s (polling) or ~1s (Realtime).
- Students see "Raise Hand" button.
- Student raises hand → teacher sees the student in queue within 3s.
- Teacher approves → student UI shows "approved" state.
- Teacher can clear individual hands, clear all hands, lock discussion, mute (state only), revoke approval, end session.
- All state restores correctly on page refresh.
- Activity pause/close auto-ends the discussion session.

### 17.3 Implementation Approach (Polling First)

Phase 1 initial implementation uses **polling only** (no Realtime):
- Discussion state appended to existing teacher monitor poll response.
- Discussion state appended to existing student live-state poll response.
- No Supabase Realtime code in Phase 1.0.

Phase 1.1 (optional enhancement): add Supabase Realtime broadcast for lower-latency updates. Polling remains as fallback.

### 17.4 DB Changes

Three new tables: `classroom_discussion_sessions`, `classroom_discussion_participants`, `classroom_discussion_events` (see Section 12). No changes to existing tables.

### 17.5 New APIs

All routes listed in Section 13. Phase 1 does not include `audio-token`, `audio-start`, `audio-stop` routes.

### 17.6 Teacher UI Changes

`pages/teacher/class/[classId]/activities/[activityId]/monitor.js`:
- New "Discussion" collapsible panel.
- "Start Discussion" button (visible when `mode === 'live_lesson'` and `status === 'active'`).
- Hand-raise queue: student list with "Approve" and "Clear" buttons.
- Approved list: students with "Mute" (state only, no audio) and "Revoke" buttons.
- "Lock Discussion", "Clear All Hands", "End Discussion" controls.
- Session status badge.

### 17.7 Student UI Changes

`pages/student/activity/[activityId].js`:
- Discussion status bar (fixed bottom or inline, only when session active).
- "Raise Hand" / "Lower Hand" button.
- "Awaiting approval" state.
- "Approved to speak" badge.
- "Muted" badge.
- Session locked / ended messages.

### 17.8 Security

- Teacher ownership validated on all teacher routes.
- Class membership validated on all student routes.
- `studentId` always from session cookie, never from request body.
- `approved_to_speak` and `is_muted` never writable from student routes.
- Rate limit: max 10 raise-hand requests per student per minute per session.

### 17.9 Failure Cases

| Failure | Behavior |
|---------|---------|
| Student raises hand when session is locked | API returns 409 `discussion_locked`; UI shows message |
| Student raises hand after session ended | API returns 404 `session_not_found`; UI shows "session ended" |
| Teacher closes activity while discussion active | Server auto-ends discussion session |
| Teacher refreshes page | Discussion state restored from REST poll within 5s |
| Student refreshes page | Discussion state restored from REST poll within 3s |
| DB write fails on approve | API returns 500; client shows error; state consistent in DB |

### 17.10 QA Tests

- Unit: session state machine (all transitions)
- Unit: student cannot approve self (studentId from session only)
- Unit: locked session rejects hand raise
- Unit: activity close triggers session auto-end
- API: full teacher discussion lifecycle
- API: unauthorized student calling teacher routes → 403
- API: 20 students raising hands simultaneously (concurrency)
- E2E: full Phase 1 flow from teacher start to session end
- E2E: page refresh mid-session restores state

### 17.11 Build/Test Commands

```bash
# Regression: existing classroom activities
node --experimental-vm-modules node_modules/.bin/jest tests/classroom-activities/

# New: discussion unit tests
node --experimental-vm-modules node_modules/.bin/jest tests/classroom-discussion/

# E2E
npx playwright test tests/e2e/classroom-discussion/phase1/

# Dev server
npm run dev

# Lint
npm run lint
```

### 17.12 Acceptance Criteria

- Teacher can start a discussion on an active live_lesson.
- Students see raise-hand button within 3s of session start.
- Teacher sees student's hand within 3s of raise.
- Teacher can approve, mute (state), revoke, lock, clear all, end.
- Page refresh by either party restores correct state.
- No existing classroom activity, login, or parent functionality is affected.
- All Phase 1 API tests pass.
- POC A passes.

### 17.13 Risk Level

Medium (first Supabase Realtime use; new DB tables; new API surface).

### 17.14 Estimated Effort

1–2 weeks.

---

## 18. Phase 2 — Teacher Audio Broadcast Only

### 18.1 Goal

Teacher can broadcast live audio to all students. Students hear teacher. Students cannot publish. One-to-many audio.

### 18.2 Product Behavior

- All Phase 1 behaviors unchanged.
- Teacher sees "Start Speaking" button in discussion panel (only when session active and `LIVE_DISCUSSION_AUDIO_ENABLED=true`).
- Teacher clicks "Start Speaking" → browser requests microphone permission → teacher audio is broadcast.
- Students automatically join audio room as listeners when session has active audio.
- Students must tap "Tap to Hear Teacher" due to browser autoplay policy. After one tap, audio plays.
- Teacher clicks "Stop Speaking" → audio stops.
- Students cannot publish audio.

### 18.3 DB Changes

Additional columns on `classroom_discussion_sessions`:
- `audio_enabled` (boolean, default false)
- `audio_provider` (text)
- `audio_room_id` (text)
- `audio_room_name` (text)
- `participant_count_peak` (integer)
- `estimated_participant_min` (numeric)

New event types in `classroom_discussion_events`: `audio_started`, `audio_stopped`.

### 18.4 New APIs

- `POST .../discussion/audio-token` (teacher) — returns publish-capable token.
- `POST .../discussion/audio-token` (student) — returns subscribe-only token.
- `POST .../discussion/audio-start` — creates provider room, marks session audio_enabled.
- `POST .../discussion/audio-stop` — stops audio, marks session.

### 18.5 Realtime Events (additional)

```json
{ "event": "audio_started", "sessionId": "..." }
{ "event": "audio_stopped", "sessionId": "..." }
```

### 18.6 Provider Adapter

`provider.createRoom()` is called on `audio-start`.
`provider.createTeacherToken()` is called when teacher requests audio token.
`provider.createStudentListenerToken()` is called when student requests audio token.
`provider.closeRoom()` is called on session end.

### 18.7 Permissions-Policy Change

`next.config.js` updated to allow `microphone=(self)` only on monitor and student activity routes (see Section 10.4). **Owner approval required before this change.**

### 18.8 Security

- Student audio token: `canPublish: false` always. Enforced at SFU level.
- Teacher token includes provider room name derived from `sessionId`.
- Budget cap checked before any token is issued.

### 18.9 Failure Cases

| Failure | Behavior |
|---------|---------|
| Teacher mic permission denied | Error shown; session continues in Phase 1 mode |
| Provider API outage | Error logged; session continues in Phase 1 mode; banner shown |
| Budget cap reached | Audio token denied with 402; teacher sees "monthly audio limit reached" |
| Student autoplay blocked | "Tap to Hear Teacher" CTA shown |
| Teacher navigates away | Audio stops; session stays in Phase 1 mode |

### 18.10 Acceptance Criteria

- Teacher audio reaches all connected students.
- Students cannot publish audio (verified at provider dashboard, not only client UI).
- No audio is recorded (verified in provider dashboard settings).
- Permissions-Policy change confirmed: microphone blocked on all other pages.
- Budget cap enforced: token denied when cap reached.
- Phase 1 hand-raise still works during audio broadcast.

### 18.11 Risk Level

Large.

### 18.12 Estimated Effort

2–4 weeks.

---

## 19. Phase 3 — Teacher-Approved Student Microphone

### 19.1 Goal

Approved student can publish audio. Mute is server-side enforced. Teacher retains full control.

### 19.2 Product Behavior

- All Phase 2 behaviors unchanged.
- Teacher approves a student (Phase 1 action).
- Server immediately calls `provider.grantStudentSpeak(roomName, studentId)`.
- Student's UI shows "You may speak" + "Speak" toggle.
- Student taps "Speak" → browser requests mic permission → student broadcasts audio.
- Teacher taps "Mute" next to student → `provider.muteStudent(roomName, studentId)` called server-side.
- Student's audio stops immediately at SFU level. Client cannot bypass.
- Teacher taps "Revoke" → `provider.revokeStudentSpeak(roomName, studentId)` → student loses publish rights.

### 19.3 DB Changes

No new tables. Optional new columns on `classroom_discussion_participants`:
- `audio_token_issued_at` — for token rotation tracking.
- `speaking_started_at` — for participation log.

### 19.4 New API Changes

- Teacher `approve` route now calls `provider.grantStudentSpeak()` after DB update.
- Teacher `mute` route now calls `provider.muteStudent()` after DB update.
- Teacher `revoke` route now calls `provider.revokeStudentSpeak()` after DB update.
- Student `audio-token` route: returns speaker token only if `approved_to_speak=true AND is_muted=false`.

### 19.5 Security

- Student cannot request speaker token without server-side approval check.
- Muted student's token request returns listener-only token.
- Server-side mute is enforced by the SFU, not by client code.

### 19.6 Failure Cases

| Failure | Behavior |
|---------|---------|
| Student mic permission denied | Error shown; hand-raise still works; state consistent |
| Provider grant API fails | DB updated; retry logged; partial failure banner shown to teacher |
| Student connection drops while speaking | SFU removes tracks; student must re-request token on reconnect |
| Teacher revokes during student speech | Audio stops within 3s; student UI updates |

### 19.7 Acceptance Criteria

- Only teacher-approved students can publish audio (verified at SFU).
- Teacher mute stops student audio within 3s, enforced at provider level.
- Muted student cannot unmute without teacher re-approval.
- POC B passes.

### 19.8 Risk Level

Large.

### 19.9 Estimated Effort

2–3 weeks.

---

## 20. Phase 4 — Multiple Approved Speakers / Managed Discussion Mode

### 20.1 Goal

Teacher can approve multiple students simultaneously. Teacher can mute all. Full classroom discussion mode.

### 20.2 Product Behavior

- All Phase 3 behaviors unchanged.
- Teacher can approve multiple students (up to `max_speakers` soft limit, recommended: 5).
- All approved students can speak simultaneously.
- "Mute All Students" button mutes all approved speakers in one action.
- Visual indicator shows who is currently transmitting audio (if provider supports active-speaker detection).

### 20.3 DB Changes

Optional: `max_speakers` column on `classroom_discussion_sessions` (settable by teacher at session start).

### 20.4 New APIs

- `POST .../discussion/mute-all` — calls `provider.muteAll(roomName, teacherIdentity)`.
- `POST .../discussion/approve-multiple` — body: `{ studentIds: [] }` — approves multiple in one call.

### 20.5 QA Tests

- 5 students approved simultaneously — all can speak.
- Teacher "Mute All" — all 5 muted simultaneously.
- Audio quality with 5 simultaneous speakers on typical school WiFi.
- Provider handles 20-student room with 5 publishers without degradation.

### 20.6 Acceptance Criteria

- Teacher can approve and mute multiple students.
- "Mute All" stops all student audio.
- System handles 20 students + 5 speakers without audio degradation.
- Existing Phase 1–3 behaviors unchanged.

### 20.7 Risk Level

Medium.

### 20.8 Estimated Effort

2–3 weeks.

---

## 21. Phase 5 — Attendance and Participation Logs

### 21.1 Goal

Record discussion participation metadata for teacher review. No audio content stored.

### 21.2 Product Behavior

- After session ends, teacher can view a participation summary on the activity report page.
- Summary: which students were present, who raised hand, who was approved, who spoke.
- No audio content. No transcript. Metadata only.

### 21.3 DB Changes

`speaking_duration_s` column on `classroom_discussion_participants` (already included in schema above).

### 21.4 New APIs

`GET /api/teacher/activities/[id]/discussion/report` → returns participation summary.

### 21.5 Teacher UI Changes

New "Discussion Summary" section on `pages/teacher/class/[classId]/activities/[activityId]/report.js`.

Per-student row: attended (yes/no), raised hand, approved to speak, speaking duration.

### 21.6 Acceptance Criteria

- Teacher sees participation table after session ends.
- No audio content in any log or report.
- Parent/guardian APIs do not include discussion data.

### 21.7 Risk Level

Low.

### 21.8 Estimated Effort

3–5 days.

---

## 22. Phase 6 — Reports and Teacher Summary Integration

### 22.1 Goal

Discussion participation appears in class and student reports, alongside existing activity data.

### 22.2 Product Behavior

- Class report: discussion session count, participation rate, engagement trend.
- Student report: per-session discussion participation history.
- No audio content. No transcript.

### 22.3 DB Changes

No new tables. Aggregation queries over existing tables.

### 22.4 New APIs

- Extend `GET /api/teacher/classes/[classId]/report-data` to include discussion aggregate.
- Extend `GET /api/teacher/students/[studentId]` to include discussion participation.

### 22.5 Acceptance Criteria

- Class report includes discussion participation metrics.
- Student report includes per-session discussion participation.
- No existing report data is changed or removed.
- Parent/guardian APIs remain unchanged.

### 22.6 Risk Level

Low.

### 22.7 Estimated Effort

1 week.

---

## 23. Phase 7 — Future Extensions (Deferred)

The following are out of scope for all initial phases. Listed for completeness only.

- **Recording:** Server-side audio recording. Requires parental consent workflow, data retention policy, GDPR compliance, provider storage configuration. **Not in scope.**
- **Transcription:** Speech-to-text. Requires recording. **Not in scope.**
- **AI session summary:** LLM summary from transcript. Requires transcription. **Not in scope.**
- **Breakout groups:** Teacher splits class into audio sub-rooms. Requires complex multi-room permission model. **Deferred.**
- **Push notifications:** "Discussion starting soon" pushed to student devices. Service worker stub exists in `public/sw.js`. **Deferred.**
- **Parent live observation:** Read-only audio listener for parents. Requires parental auth, consent, complex privacy analysis. **Deferred.**
- **AI moderation:** Automatic detection of inappropriate content. Requires audio processing, privacy review, consent. **Not in scope.**
- **Student-to-student private messages:** Explicitly excluded by product definition.
- **Video:** Explicitly excluded by product definition.

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

### 24.3 No Parent Access to Discussion APIs

- Discussion APIs are teacher or student routes only.
- Guardian and parent report APIs do not include discussion data.
- Phase 6 report extensions do not expose discussion data to parent-facing APIs.

### 24.4 Student Cannot Approve Self

- No student API route writes `approved_to_speak`.
- `studentId` in student routes always from session, never body.
- Even if a student sends `{ approved_to_speak: true }` in a body, the server ignores the field.

### 24.5 Server-Side Audio Enforcement

- Mute, revoke, and room close are enforced at the provider SFU level.
- Tokens with `canPublish: false` are rejected by the SFU regardless of client-side code.
- A student cannot publish audio unless: (1) server has verified `approved_to_speak = true AND is_muted = false`, AND (2) server has called `provider.grantStudentSpeak()`, AND (3) server has issued a `canPublish: true` token.

### 24.6 No Recording

No recording is initiated server-side. Provider recording is disabled by default in room creation. The `createRoom()` adapter call always sets `recordingEnabled: false`. Any future recording feature requires explicit separate implementation and owner approval.

### 24.7 Data Minimization in Realtime

See Section 8.3. No student names, no rosters, no approval lists in anon-channel broadcast payloads.

---

## 25. UI Impact

### 25.1 Teacher Screens Affected

| File | Phase | Change |
|------|-------|-------|
| `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` | 1 | Add Discussion panel: start, hand queue, approved list, controls |
| `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` | 2–4 | Add audio controls to Discussion panel |
| `pages/teacher/class/[classId]/activities/[activityId]/report.js` | 5–6 | Add Discussion Summary section |

### 25.2 Student Screens Affected

| File | Phase | Change |
|------|-------|-------|
| `pages/student/activity/[activityId].js` | 1 | Add discussion status bar, raise/lower hand buttons |
| `pages/student/activity/[activityId].js` | 2 | Add audio playback, "Tap to Hear" CTA |
| `pages/student/activity/[activityId].js` | 3–4 | Add microphone controls for approved students |
| `pages/student/home.js` | 1 (optional) | Activity card badge if discussion active |

### 25.3 Screens That Must Remain Unchanged

All learning master pages, arcade/game pages, teacher dashboard, teacher class report, student login, teacher login, all guardian/parent pages, all existing classroom activity create/list flows.

### 25.4 Hebrew Copy

No existing Hebrew strings are changed. New Hebrew labels for discussion UI will be added to `lib/classroom-activities/classroom-activities-labels.client.js` and the relevant teacher UI labels file during implementation. This is not done yet.

---

## 26. QA Plan

### 26.1 Unit Tests

- Session state machine: all valid and invalid transitions.
- Participant state transitions: hand raise → approved → muted → unmuted.
- Auth validation: teacher ownership, student class membership.
- Token issuance logic: approved + not muted → speaker token; otherwise → listener token.
- Budget cap: usage at 99% → token allowed; usage at 100% → token denied.

### 26.2 API Tests

- Full teacher discussion lifecycle: start → approve → mute → clear → end.
- Student raise/lower hand.
- Unauthorized student calling teacher routes → 403.
- Student raising hand while locked → 409.
- Student raising hand after ended → 404.
- 20 students raising hands simultaneously → all recorded.
- Audio token for non-approved student → `canPublish: false`.
- Audio token for approved, non-muted student → `canPublish: true`.
- Audio token when budget cap reached → 402.

### 26.3 E2E Tests

- Phase 1 full flow: start → raise → approve → mute → end.
- Page refresh mid-session: state restored.
- Activity close while discussion active: discussion auto-ended.
- Phase 2: teacher audio reaches students.
- Phase 3: approved student speaks; muted student's audio stops.
- Phase 4: multiple speakers; mute all.

### 26.4 Mobile Smoke Tests

- Phase 1: raise hand and approval flow on iOS Safari, Android Chrome.
- Phase 2+: microphone permission request on iOS Safari.
- Phase 2+: audio autoplay unlock (user gesture) on iOS Safari.
- Phase 2+: microphone capture for approved student on iOS Safari.
- Touch target size for raise-hand button: minimum 44×44px.

### 26.5 Audio Permission Tests (Phase 2+)

- Mic denied → teacher: error shown, session continues without audio.
- Mic denied → student: raise-hand still works; audio error shown separately.
- Mic permission reset after denial: re-request flow works.
- School MDM blocks mic: graceful error, no crash.
- Multiple tabs: conflict warning shown.

### 26.6 Permissions-Policy Tests (Phase 2+)

- `/teacher/dashboard` cannot access microphone (verified in browser devtools).
- `/student/home` cannot access microphone.
- `/learning/math-master` cannot access microphone.
- Arcade pages cannot access microphone.
- `/teacher/.../monitor` can access microphone with user gesture.
- `/student/activity/[id]` can access microphone with user gesture.

### 26.7 Security/Tamper Tests

- Student calls teacher approve route → 403.
- Student sends `{ approved_to_speak: true }` in raise-hand body → field ignored; student remains unapproved.
- Student from class B attempts to join class A session → 403.
- Student with listener token attempts to publish track → SFU rejects.
- Muted student requests new audio token → listener token returned.
- Token from session A used in session B → rejected by provider.

### 26.8 Load/Concurrency Tests

- 20 students simultaneously raising hands → all recorded; no DB race condition.
- 20 students connected to audio room → audio quality acceptable.
- Teacher mutes all 5 approved speakers → all muted within 3 seconds.
- Budget cap enforcement at exact threshold: 20 sessions × 21 participants × 45 min = 18,900 participant-minutes. Set cap to 18,900. Session 21 should be blocked.

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

# E2E - Phase 1
npx playwright test tests/e2e/classroom-discussion/phase1/

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
| `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` | Client | `false` | Gates all discussion UI for both teacher and student |
| `LIVE_DISCUSSION_AUDIO_ENABLED` | Server | `false` | Gates audio token issuance; false = Phase 1 only even if UI enabled |
| `LIVE_AUDIO_PROVIDER` | Server | `"mock"` | Selects provider adapter; `"mock"` is safe default |
| `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP` | Server | `0` | Budget cap; `0` = audio disabled regardless of other flags |

Setting any of these to a restrictive value disables the feature instantly without code deployment.

### 27.2 Dev-Only Mode

Phase 1: `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED=true` + `LIVE_DISCUSSION_AUDIO_ENABLED=false` + `LIVE_AUDIO_PROVIDER=mock`. No provider needed. No cost.

Phase 2+: Use free tier of selected provider in staging.

### 27.3 Teacher-Only Hidden Pilot

Before enabling for students:
1. Enable `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED=true` in staging.
2. Teacher uses test student accounts to simulate the full flow.
3. Verify all state transitions, polling integration, and UI updates.
4. Run POC A.

### 27.4 Student Visibility Gating

Students only see discussion UI when a session is actually active for their current activity. The feature flag alone is not enough — there must be an active session in DB. Students with no active session see no new UI regardless of flag state.

### 27.5 Manual Smoke Before Each Phase Goes to Production

- Teacher smoke: go through all controls end-to-end.
- Student smoke: raise hand, see approval, see muted state, see session end.
- Regression smoke: existing classroom activity end-to-end.
- Load smoke: 5 simulated students simultaneously.

### 27.6 Production Readiness Criteria (Per Phase)

- All acceptance criteria for the phase are met.
- All regression tests pass.
- POC for the phase is complete and documented.
- Audio provider DPA signed (Phase 2+).
- Privacy policy updated (Phase 2+).
- Permissions-Policy change approved and tested (Phase 2+).
- Budget cap configured.
- Owner written sign-off on the phase.

---

## 28. Complexity Summary

| Phase | Description | Complexity | Effort | Risk |
|-------|-------------|-----------|--------|------|
| 0 | Architecture decisions | Small | 1–2 days | Low |
| 1 | Hand raise / approval (no audio) | Medium | 1–2 weeks | Medium |
| 2 | Teacher audio broadcast | Large | 2–4 weeks | Large |
| 3 | Approved student mic | Large | 2–3 weeks | Large |
| 4 | Multi-speaker discussion | Medium | 2–3 weeks | Medium |
| 5 | Participation logs | Small | 3–5 days | Low |
| 6 | Report integration | Medium | 1 week | Low |
| 7 | Future extensions | Very Large | Deferred | Very Large |

**Total Phase 0–6:** ~10–16 weeks focused senior development.

**Phase 1 alone:** 1–2 weeks. Standalone product value. Lowest risk start.

### What Makes This Large

- **Audio infrastructure:** SFU/WebRTC provider is a new category of tooling not previously in the project.
- **Children's privacy compliance:** Legal review is not optional for audio. This takes calendar time.
- **iOS Safari:** Strictest audio environment. Must be first-class test target.
- **Server-side mute enforcement:** Must be verified at provider level, not just client UI.
- **First Supabase Realtime use:** New infrastructure pattern for this codebase.

### What Makes Phase 1 Manageable

- No audio at all.
- No provider account needed.
- No Permissions-Policy change.
- No audio or voice-data exposure. Phase 1 has much lower privacy risk than audio phases, but still stores discussion metadata for minors (hand-raise events, approval timestamps, participation logs) and requires an owner-approved retention policy before the migration runs.
- Builds on existing polling infrastructure.
- New tables + ~15 API routes + 2 pages extended.
- `@supabase/realtime-js` already available as transitive dep (for future Phase 1.1).

---

## 29. Go/No-Go Decision Points

### 29.1 Go/No-Go: Phase 1

**Go if:**
- DB schema approved (Section 12).
- API routes approved (Section 13).
- Feature flag strategy approved.
- Polling-first sync model approved.

**No-go if:**
- Phase 1 alone (no audio) has insufficient product value to justify 1–2 week investment.

**Recommendation: Go.** Phase 1 delivers real teacher control value at low risk.

### 29.2 Go/No-Go: Phase 2–4 (Audio)

**Go if:**
- Phase 1 is stable in production.
- Audio provider selected and POC B complete.
- Provider DPA signed.
- Legal review complete for all operating jurisdictions including Israel.
- Permissions-Policy change approved by owner.
- Budget cap configured and budget guard implemented.
- `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP` set to a non-zero owner-approved value.

**No-go if:**
- Legal review finds audio is not permissible without additional consent mechanisms not yet built.
- POC B fails on mobile Safari for student audio.
- Provider cost exceeds owner-approved budget.

**Recommendation: Defer audio until Phase 1 is proven.**

### 29.3 Go/No-Go: Phase 5–6

**Go if:** Phase 1 is complete. No additional blockers.

---

## 30. Final End-to-End Acceptance Criteria

These criteria describe the complete working system from Phase 0 through Phase 4. All must be met before the feature is considered production-ready.

**State machine:**
- Teacher can start a live_lesson.
- Teacher can start a managed discussion while the live_lesson is active.
- Students see the discussion state within 3 seconds of session start.
- All state restores correctly after any page refresh.
- Discussion session auto-ends when the activity is closed.

**Hand raise and approval:**
- Student can raise hand.
- Teacher sees the raised hand within 3 seconds.
- Teacher can approve one student.
- Teacher can approve multiple students simultaneously.
- Teacher can revoke any student's approval.
- Teacher can clear individual hands.
- Teacher can clear all hands.
- Teacher can lock discussion — no new hand raises accepted while locked.
- Teacher can unlock discussion.

**Teacher audio (Phase 2+):**
- Teacher can broadcast audio to all students.
- All connected students hear teacher audio.
- Teacher can stop broadcasting.
- Student audio playback begins with one user gesture on iOS Safari.

**Student audio (Phase 3+):**
- Only approved students can publish audio.
- Non-approved students cannot publish audio (enforced at SFU, not just client).
- Teacher can mute any approved student.
- Muted student's audio stops within 3 seconds of teacher action.
- Muted student cannot unmute themselves.
- Teacher can unmute a muted student.
- Teacher can mute all students simultaneously.

**Security:**
- Student cannot approve themselves.
- Student cannot grant themselves an audio token with publish rights.
- Student cannot join a session for a class they are not a member of.
- Student cannot call teacher API routes.
- Muted student's SFU-level mute cannot be bypassed from client code.

**Data integrity:**
- No recording occurs (verified in provider dashboard).
- No transcript is created.
- No audio content appears in any log, event, or database field.
- Discussion cost per session is logged.
- Budget cap enforcement: sessions denied when cap reached.

**Regression:**
- Existing classroom activity question-answer scoring is unaffected.
- Existing teacher dashboard loads correctly.
- Existing student home and activity list unchanged.
- Existing parent/guardian login and reports unchanged.
- Existing student login and arcade unchanged.

**Kill switch:**
- Setting `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED=false` disables all discussion UI immediately.
- Setting `LIVE_DISCUSSION_AUDIO_ENABLED=false` disables audio immediately while keeping hand-raise state functional.

---

## 31. Files by Phase — Refined List

### 31.1 Phase 1 — Files Touched

**New files to create:**
- `supabase/migrations/025_classroom_discussion.sql` (when approved — not yet)
- `lib/teacher-server/teacher-discussion.server.js`
- `lib/classroom-discussion/classroom-discussion-shared.server.js`
- `lib/live-audio/provider-adapter.js` (adapter dispatch, Phase 1 wires mock)
- `lib/live-audio/providers/mock.js` (no-op mock for Phase 1 and tests)
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
- `pages/api/student/activities/[activityId]/discussion/index.js`
- `pages/api/student/activities/[activityId]/discussion/raise-hand.js`
- `pages/api/student/activities/[activityId]/discussion/lower-hand.js`
- `pages/api/student/activities/[activityId]/discussion/heartbeat.js`
- `components/teacher-portal/TeacherDiscussionPanel.jsx`
- `components/student/StudentDiscussionBar.jsx`
- `tests/classroom-discussion/session-state-machine.test.mjs`
- `tests/classroom-discussion/participant-state.test.mjs`
- `tests/classroom-discussion/auth-validation.test.mjs`
- `tests/e2e/classroom-discussion/phase1-flow.spec.js`

**Existing files to modify (Phase 1):**
- `pages/teacher/class/[classId]/activities/[activityId]/monitor.js` — add Discussion panel
- `pages/student/activity/[activityId].js` — add discussion status bar
- `lib/teacher-server/teacher-activities.server.js` — extend monitor payload with discussion state; add auto-end hook on activity close
- `lib/classroom-activities/classroom-activities-labels.client.js` — new discussion labels

### 31.2 Audio Phases — Additional Files Touched (Phase 2–4 Only)

**New files:**
- `lib/live-audio/providers/livekit.js` (or selected provider)
- `lib/live-audio/providers/agora.js` (if POC C selects Agora)
- `lib/classroom-discussion/classroom-discussion-realtime.server.js` (server-side Realtime broadcast)
- `pages/api/teacher/activities/[activityId]/discussion/audio-token.js`
- `pages/api/teacher/activities/[activityId]/discussion/audio-start.js`
- `pages/api/teacher/activities/[activityId]/discussion/audio-stop.js`
- `pages/api/teacher/activities/[activityId]/discussion/mute-all.js`
- `pages/api/teacher/activities/[activityId]/discussion/approve-multiple.js` (Phase 4)
- `pages/api/student/activities/[activityId]/discussion/audio-token.js`
- `tests/e2e/classroom-discussion/phase2-audio.spec.js`
- `tests/e2e/classroom-discussion/phase3-student-mic.spec.js`
- `tests/e2e/classroom-discussion/phase4-multi-speaker.spec.js`

**Existing files modified (audio phases only):**
- `next.config.js` — Permissions-Policy scoping (owner approval required)

### 31.3 Reports Phase — Additional Files Touched (Phase 5–6 Only)

**New files:**
- `pages/api/teacher/activities/[activityId]/discussion/report.js`
- `pages/api/admin/discussion/usage.js` (optional admin usage API)

**Existing files modified (Phase 5–6 only):**
- `pages/teacher/class/[classId]/activities/[activityId]/report.js` — Discussion Summary section

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

### Phase 1 Variables

| Variable | Location | Purpose | Safe Default |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED` | All envs | Client-side feature flag | `false` |
| `LIVE_DISCUSSION_AUDIO_ENABLED` | Server envs | Gates audio token issuance | `false` |
| `LIVE_AUDIO_PROVIDER` | Server envs | Provider adapter selector | `"mock"` |
| `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP` | Server envs | Budget hard cap | `0` (disabled) |

### Audio Phase Variables (Phase 2+)

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
| A1 | Is Phase 1 alone (no audio) approved as the first delivery? | Phase 1 start | Open |
| A2 | Should discussion be limited to `live_lesson` mode only, or available for other activity modes? | Phase 1 design | Open |
| A3 | Should a discussion session always be anchored to a `live_lesson` activity, or can it run standalone? | Phase 1 design | Open |
| A4 | What is the maximum class size that must be supported for Phase 1? (Plan assumes 20–30 students) | Phase 1 capacity | Open |
| A5 | Should the teacher's existing 5s monitor poll carry discussion state (polling fallback), or should Realtime be added in Phase 1? | Phase 1 sync model | Open |
| A6 | Should discussion auto-end when the activity is paused, or only when it is closed? | Phase 1 state machine | Open |
| A7 | What is the soft maximum number of simultaneous speakers? (Recommendation: 5) | Phase 4 design | Open |
| A8 | Should participation data (who attended, who spoke) be visible to parents/guardians in reports? (Recommendation: no) | Phase 5–6 design | Open |

### Group B — Privacy and Legal Decisions

| # | Decision | Blocks | Status |
|---|---------|--------|--------|
| B1 | What are the exact operating jurisdictions for this product? (Israel? EU? US? Other?) | All audio phases | Open |
| B2 | Has Israeli privacy law review been initiated for real-time voice transmission to minors? | Audio Phase 2 | Open |
| B3 | Is a parental notification mechanism required before audio is enabled for a student? If yes, what is the mechanism? | Audio Phase 2 | Open |
| B4 | What is the data retention policy for `classroom_discussion_events` and participant records? | Phase 1 | Open |
| B5 | Is the privacy policy update planned before audio phases ship? | Audio Phase 2 | Open |
| B6 | Is the sub-processor list update planned (for new audio provider)? | Audio Phase 2 | Open |
| B7 | Is a Supabase DPA already in place? | Phase 1 | Open |
| B8 | **Is the data retention policy for Phase 1 discussion metadata (hand-raise events, approval logs, participant records for minors) approved before the first migration is executed?** | Phase 1 migration | Open |

### Group C — Provider and Cost Decisions

| # | Decision | Blocks | Status |
|---|---------|--------|--------|
| C1 | Is Phase 1 POC A approved on free/no-cost basis? | Phase 1 POC | Open |
| C2 | **Is the first POC (POC B) allowed to use a free external provider account with test accounts only, with no production student data?** | Audio POC B | Open |
| C3 | Which provider should be used for POC B? (Recommendation: Agora or LiveKit Cloud free tier) | Audio POC B | Open |
| C4 | Which provider is approved for production? (Recommendation: LiveKit Cloud → self-host if volume justifies) | Audio Phase 2 production | Open |
| C5 | What is the approved monthly budget cap for audio provider costs? | Audio Phase 2 | Open |
| C6 | What is the `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP` value at launch? | Audio Phase 2 | Open |
| C7 | Has the provider DPA been reviewed and is it suitable for a children's product? | Audio Phase 2 | Open |
| C8 | Who owns provider account management and monitors billing? | Audio Phase 2 | Open |
| C9 | **Are the corrected cost assumptions (Section 7) accepted after the owner has verified them against the provider's current pricing page? No budget cap may be set until this decision is answered with verified numbers.** | Audio Phase 2 budget | Open |

### Group D — Technical Architecture Decisions

| # | Decision | Blocks | Status |
|---|---------|--------|--------|
| D1 | Is the proposed DB schema (Section 12) approved? | Phase 1 | Open |
| D2 | Is the API route plan (Section 13) approved? | Phase 1 | Open |
| D3 | Is the Realtime channel design (Section 14) approved? | Phase 1.1 (Realtime enhancement) | Open |
| D4 | Is the `LiveAudioProvider` adapter interface (Section 5) approved? | Audio Phase 2 | Open |
| D5 | Is the Permissions-Policy scoping change (Section 10.4) approved? | Audio Phase 2 | Open |
| D6 | Should Phase 1 start with polling-only (no Realtime), or polling + Realtime from the start? | Phase 1 implementation | Open |
| D7 | Should short-lived Realtime tokens be issued to students (full private channels) instead of anon-key broadcast? | Phase 1 security | Open |

### Group E — Rollout Decisions

| # | Decision | Blocks | Status |
|---|---------|--------|--------|
| E1 | Which classes/teachers will receive Phase 1 pilot? | Rollout | Open |
| E2 | Who is authorized to toggle the feature flags in production? | Rollout | Open |
| E3 | What is the smoke test procedure before each phase goes live? | Rollout | Open |
| E4 | Is there a rollback procedure if Phase 1 causes issues in the existing monitor page? | Rollout | Open |

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
- Resolve Phase 0 (Section 33 decisions for Phase 1).
- Implement and ship Phase 1 (hand raise, no audio, ~1–2 weeks).
- Run POC A to validate Phase 1.
- Evaluate whether audio phases are worth the additional investment.
- If audio approved: resolve Group B, C, D decisions for audio.
- Run POC B and C on free provider tiers.
- Then implement Phase 2.

**Audio phases (2–4) must not be deployed or committed until Phase 1 is stable in production and all privacy/legal reviews are complete for the product's operating jurisdictions. A development prototype under Section 35 is exempt from this production rule, but is not exempt from the no-commit, no-push, no-deploy rules stated there.**

---

---

## 35. Future Overnight Full Dev Implementation Run Instructions

### 35.1 Purpose

**This section does not start implementation by itself. It only defines the allowed and forbidden actions for a future run after the owner gives a separate explicit execution instruction.**

This section defines the rules for an owner-approved future development-site implementation run. When the owner explicitly instructs an implementation agent to begin, the agent must follow the rules in this section exactly.

The owner has pre-approved the scope and boundaries of such a run. When triggered, the goal is to build as much of the complete implementation package as possible in the development environment, then review, test, keep, fix, or discard the work.

This is not a production launch. This is not a Git push. This is not a deployment. This is not permission to execute SQL.

The goal is to build as much of the complete implementation package as possible in the development environment, then review, test, keep, fix, or discard the work.

### 35.2 Owner Implementation Decision

The owner approves a full development implementation run covering the complete project plan, not only Phase 1.

The implementation agent may work normally on the development site and may build code, components, APIs, adapter layers, tests, audio provider integration, and reports according to this document.

The only absolute technical restriction is:

**Do not execute SQL. Do not run migrations. Do not apply DB changes manually in Supabase.**

### 35.3 Allowed During the Run

The implementation agent may:

- Create files.
- Modify existing files required by this plan.
- Create a migration file (SQL written inside it, not executed).
- Write SQL inside a migration file.
- Create server modules.
- Create API routes.
- Create UI components.
- Update feature flag handling.
- Add or update tests.
- Run unit tests.
- Run API tests.
- Run Playwright/E2E tests.
- Run build.
- Run lint.
- Run the dev server.
- Use LiveKit Free for development/POC if environment values are available.
- Implement the provider-neutral `LiveAudioProvider` adapter.
- Implement a mock provider.
- Implement a LiveKit provider for development testing.
- Update `.env.example` with variable names only.
- Produce a detailed final implementation report.

### 35.4 Forbidden During the Run

The implementation agent must not:

- Execute SQL against Supabase.
- Run Supabase migrations.
- Apply DB changes manually.
- Commit.
- Push.
- Deploy.
- Use production student data.
- Store real provider secrets in committed files.
- Remove the provider-neutral adapter.
- Hard-code the product directly to LiveKit outside the provider adapter.
- Enable recording, transcription, or AI audio processing.
- Expose discussion/audio data to parent or guardian reports.
- Change unrelated Hebrew content or design.
- Touch subject expansion work.
- Touch unrelated learning, arcade, parent, or guardian flows except for regression tests.

### 35.5 SQL and Migration Rule

The implementation agent may create:

`supabase/migrations/025_classroom_discussion.sql`

The migration may contain all tables, indexes, comments, RLS enablement, and schema needed for the feature. The migration must not be executed.

Any test or feature that cannot complete because the DB schema does not exist yet must be marked clearly as:

`BLOCKED_BY_SQL_NOT_EXECUTED`

The final report must list exactly which tests are blocked only because the migration was not run.

### 35.6 Implementation Scope

The overnight implementation covers:

1. Phase 1 — managed discussion state without audio.
2. Audio foundation — LiveAudioProvider adapter and mock provider.
3. LiveKit provider for development/POC.
4. Teacher audio broadcast.
5. Student listener mode.
6. Approved student microphone.
7. Mute and revoke enforcement through the adapter.
8. Multiple approved speakers and mute-all.
9. Participation and event logging.
10. Teacher report foundation.
11. Feature flags and kill switches.
12. Unit, API, E2E, security, and regression tests.

### 35.7 Provider Decision for Development Run

For this development run:

- LiveKit Free is the first POC/development provider.
- The architecture must remain provider-neutral.
- Product code must call the internal `LiveAudioProvider` adapter only.
- LiveKit-specific code must remain isolated under `lib/live-audio/providers/livekit.js`.
- Future replacement with Agora, Daily, VideoSDK, 100ms, or another provider must remain possible via the adapter.

### 35.8 Feature Flag Safe Defaults

The implementation must preserve safe defaults. Nothing is enabled without explicit environment variable overrides:

- `NEXT_PUBLIC_LIVE_DISCUSSION_ENABLED=false`
- `LIVE_DISCUSSION_AUDIO_ENABLED=false`
- `LIVE_AUDIO_PROVIDER=mock`
- `LIVE_AUDIO_MONTHLY_PARTICIPANT_MINUTE_CAP=0`

### 35.9 Required Final Report

At the end of the run, the implementation agent must return a detailed report covering:

- Files created.
- Files modified.
- Migration file created (SQL written, not executed).
- Confirmation SQL was not executed.
- Dependencies added, if any.
- Environment variable names added or referenced.
- APIs implemented.
- UI implemented.
- Audio provider and LiveKit status.
- Feature flag status.
- Tests run, passed, failed, and blocked by `BLOCKED_BY_SQL_NOT_EXECUTED`.
- Build result and lint result.
- Known issues and security/tamper test results.
- What still needs owner action.
- Whether the implementation is worth keeping, fixing, or discarding.

### 35.10 Review Rule

No commit, push, deployment, or production enablement may happen before owner review.

After the run, the owner will decide: keep and fix / partially keep and refactor / discard and restore from Git.

---

*End of plan document.*
*Version 2.2 — 2026-05-25*
*Section 35 added: Future overnight development-run instructions (owner-approved scope and rules). No implementation has started.*
