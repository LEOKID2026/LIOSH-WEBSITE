---
name: Live Audio Classroom Plan
overview: A full implementation plan for Teacher-Controlled Live Audio Classroom — analyzing the current codebase, proposing a 4-phase architecture (hand-raise state → teacher audio → approved student mic → multi-speaker discussion), and assessing complexity, risks, and open questions before any code is written.
todos:
  - id: write-plan-doc
    content: Write docs/teacher-live-audio-classroom/TEACHER_CONTROLLED_AUDIO_CLASSROOM_PLAN.md
    status: pending
isProject: false
---

# Teacher-Controlled Live Audio Classroom — Implementation Plan

## Scope

Planning document only. No code, SQL, migrations, env changes, commits, or pushes.

## Phases

- Phase 1: Hand raise / request-to-speak / teacher approval state (no audio)
- Phase 2: Teacher audio broadcast only (one-way, teacher → all students)
- Phase 3: Teacher-approved student microphone (selective)
- Phase 4: Multiple approved speakers / managed discussion mode

## Key Current-State Findings

- No Supabase Realtime in use anywhere; live sync is HTTP polling (3 s student, 5 s teacher)
- No WebRTC, no audio streaming, no socket.io
- `next.config.js` has `Permissions-Policy: microphone=()` — microphone is currently **blocked**
- Student auth: HttpOnly cookie session, not Supabase Auth JWT
- All classroom activity tables: RLS enabled, zero policies — service-role API only
- `@supabase/realtime-js` is a transitive dependency, not wired to any channel

## Output

Full document at `docs/teacher-live-audio-classroom/TEACHER_CONTROLLED_AUDIO_CLASSROOM_PLAN.md`
