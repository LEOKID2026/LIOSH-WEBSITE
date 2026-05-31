# API Route Security Inventory Plan

**Generated:** 2026-05-23
**Goal:** read-only inventory of every API route, with required-auth posture, data scope, and confirmation method. **No code changes.**

Routes enumerated from `pages/api/**` (52 routes; see [site-map-and-protection-audit.md](../site-map-and-protection-audit.md)).

## Required-auth bands

- **PUB** — must be safely public.
- **STU** — student session cookie required.
- **PAR** — parent bearer required.
- **EITHER** — student session **or** parent bearer (e.g. Copilot).
- **ADMIN** — server-only admin token required.
- **DEV-ONLY** — must 404 in production.

## Inventory

| Route | Band (target) | Touches data of… | Risk rows | Read-only confirmation method |
|-------|---------------|------------------|-----------|-------------------------------|
| `/api/student/login` | PUB → issues STU cookie | own student | R-AUTH-01, R-COOKIE-01 | inspect handler: rate-limit? lockout? cookie flags? |
| `/api/student/logout` | STU | own student | R-COOKIE-01 | confirm cookie cleared properly |
| `/api/student/me` | STU | own student | R-OWN-02 | confirm filters by session, not body |
| `/api/student/dev-add-coins` | **DEV-ONLY** | any student | **R-DEV-01** | grep for `NODE_ENV` gate; confirm `process.env.NODE_ENV === 'production'` returns 404 |
| `/api/student/learning-profile` | STU | own student | R-OWN-02 | confirm session-scoped query |
| `/api/student/home-profile` | STU | own student | R-OWN-02 | same |
| `/api/parent/list-students` | PAR | parent's students only | R-OWN-01 | confirm Supabase filter `parent_id = auth.uid()` (or app-layer equivalent) |
| `/api/parent/create-student` | PAR | own scope | R-OWN-01 | confirm parent_id stamped from token, not body |
| `/api/parent/update-student` | PAR | parent's students only | R-OWN-01 | confirm row check before update |
| `/api/parent/delete-student` | PAR | parent's students only | R-OWN-01 | confirm cascading delete + ownership check |
| `/api/parent/create-student-access-code` | PAR | own scope | R-AUTH-01 | confirm rate-limit; PIN entropy |
| `/api/parent/students/[studentId]/report-data` | PAR | parent's student only | R-OWN-01, R-RLS-01 | confirm `studentId` ownership before query |
| `/api/parent/copilot-turn` | EITHER | parent's student or own student | **R-COPILOT-01..03**, R-RATE-01 | confirm prod 422 on missing snapshot; confirm `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION` unset/false |
| `/api/learning/session/start` | STU | own student | R-RLS-01, R-OWN-02 | confirm filter by session identity |
| `/api/learning/session/finish` | STU | own student | R-RLS-01, R-OWN-02 | same |
| `/api/learning/answer` | STU | own student | R-RLS-01, R-OWN-02 | same |
| `/api/learning/planner-recommendation` | STU | own student | R-OWN-02 | same |
| `/api/learning-simulator/engine-review-pack-status` | **ADMIN** | engine artifacts | **R-AUTH-02/03** | replace `NEXT_PUBLIC_*` gate with server token; timing-safe compare |
| `/api/learning-simulator/generate-expert-review-pack` | **ADMIN** | engine artifacts | R-AUTH-03 | same as above |
| ~~`/api/learning-supabase/health`~~ | *(removed 2026-05)* | — | R-DBG-01 | **Removed** — use `GET /` for uptime only; no DB readiness probe route |
| `/api/dev-student-simulator/login` | **DEV-ONLY** | dev student session | **R-DEV-02** | gate by `NODE_ENV` |
| `/api/dev-student-simulator/logout` | **DEV-ONLY** | dev student session | R-DEV-02 | same |
| `/api/arcade/balance` | STU | own student | R-OWN-02 | confirm session-scoped |
| `/api/arcade/games` | STU | catalog | (low) | confirm public catalog vs. account-scoped flags |
| `/api/arcade/quick-game` | STU | own student | R-OWN-02 | same |
| `/api/arcade/quick-match/enqueue` | STU | own student | R-OWN-02 | same |
| `/api/arcade/quick-match/cancel` | STU | own student | R-OWN-02 | same |
| `/api/arcade/rooms/create` | STU | own student | R-OWN-02 | same |
| `/api/arcade/rooms/join` | STU | own student | R-OWN-02 | same |
| `/api/arcade/rooms/join-by-code` | STU | own student | R-OWN-02 | same |
| `/api/arcade/rooms/leave` | STU | own student | R-OWN-02 | same |
| `/api/arcade/rooms/open` | STU | own student | R-OWN-02 | same |
| `/api/arcade/rooms/[roomId]/snapshot` | STU | participant only | R-OWN-02 | confirm room participation check |
| `/api/arcade/rooms/[roomId]/bingo-snapshot` | STU | participant only | R-OWN-02 | same |
| `/api/arcade/games/{bingo,checkers,chess,dominoes,fourline,ludo,snakes-and-ladders}/action` (×7) | STU | participant only | R-OWN-02 | same |
| `/api/hebrew-nakdan` | PUB (rate-limited) | text | R-RATE-01, R-LOG-02 | rate-limit + log-redaction policy |
| `/api/hebrew-audio-ensure` | PUB (rate-limited) | text | R-RATE-01 | same |
| `/api/hebrew-audio-stream` | PUB (rate-limited) | audio binary | R-RATE-01 | same |
| `/api/hebrew-audio-artifact` | PUB (rate-limited) | audio binary | R-RATE-01 | same |
| `/api/gallery` | PUB | static | R-PUB-01 | rate-limit / static-only confirmation |
| `/api/admin/monthly-persistence-award` | **ADMIN** | parent + student state | R-AUTH-03 | confirm token gate + scope |

## Confirmation procedure (read-only)

1. For each row, open the route file in `pages/api/...`.
2. Identify:
   - Auth check (cookie? bearer? token? none?).
   - Source of identifying ID (token-derived vs. body-supplied).
   - Supabase client variant (anon vs. service-role).
   - Rate-limit / lockout (Vercel KV, Upstash, in-memory, none).
   - Cookie flags emitted (`HttpOnly`, `Secure`, `SameSite`).
3. Record findings as updates to:
   - This doc's "actual band observed" column (added in next pass).
   - Any new `R-*` rows in the [register](./SECURITY_RISK_REGISTER.md).
4. **No code edits.** No live calls.

## What this plan does NOT do

- Does not call any route.
- Does not modify any handler.
- Does not enable additional gating; it merely *documents* the target band.

## Acceptance for next fix pass

- Every **DEV-ONLY** route returns 404 in production env (operationally verified; see doc 8).
- Every **ADMIN** route uses server-only env + timing-safe compare (see doc 8).
- Every **STU/PAR** route derives identity from token, never from body.
- Every **EITHER** route hardens production trust per [parent-ai/copilot-turn-production.md](../parent-ai/copilot-turn-production.md) and R-COPILOT-01.
- Every **PUB** route has documented rate-limit posture (see doc 9).
