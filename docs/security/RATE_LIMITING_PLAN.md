# Rate Limiting Plan

**Generated:** 2026-05-23
**Risk rows:** R-AUTH-01 (P0), R-RATE-01 (P1), R-PUB-01 (P1), R-COPILOT-02/03

## Goal

Prevent brute-force, abuse, and runaway cost on the public-facing API surface.

## Buckets

| Bucket | Key | Window | Default cap | Burst | Action on hit |
|--------|-----|--------|-------------|-------|---------------|
| **B-LOGIN** | `student_login_{ip}` + `student_login_{username}` | 60s / 10min / 24h | 10 / 30 / 100 | 3 | progressive backoff + lockout per username |
| **B-PARENT** | `parent_{userId}` | 60s | 60 | 10 | 429 |
| **B-COPILOT** | `copilot_{userId|sessionId}` | 60s | 20 | 5 | 429 + telemetry |
| **B-LEARNING** | `learning_{sessionId}` | 60s | 120 (gameplay-rate) | 30 | 429 |
| **B-HEBREW** | `hebrew_utility_{ip}` | 60s / 1h | 30 / 300 | 10 | 429 |
| **B-PUB** | `pub_{ip}` | 60s | 120 | 30 | 429 |
| **B-CONTACT** | `contact_{ip}` | 1h / 24h | 5 / 20 | 1 | 429 + captcha if enabled |
| **B-ADMIN** | `admin_token` | 60s | 30 | 5 | 429 |
| **B-DEV** | n/a | n/a | n/a | n/a | 404 in production (see [DEV_ROUTE_HARDENING_PLAN.md](./DEV_ROUTE_HARDENING_PLAN.md)) |

## Per-route mapping

| Route | Bucket(s) | Notes |
|-------|-----------|-------|
| `/api/student/login` | B-LOGIN | hardest brute-force surface; double-key (ip + username) is required |
| `/api/student/me`, `/logout` | B-PARENT (per session) | low risk; loose cap |
| `/api/parent/list-students`, `create-student`, `update-student`, `delete-student` | B-PARENT | per parent token |
| `/api/parent/create-student-access-code` | B-PARENT + extra burst guard | PIN issuance must be rare |
| `/api/parent/students/[studentId]/report-data` | B-PARENT | parent-scoped |
| `/api/parent/copilot-turn` | B-COPILOT | also: cost telemetry per turn |
| `/api/learning/session/start`, `/answer`, `/finish`, `/planner-recommendation` | B-LEARNING | gameplay rate |
| `/api/arcade/*` | B-LEARNING | gameplay rate |
| `/api/hebrew-nakdan`, `/hebrew-audio-*` | **B-HEBREW** | TTS / nakdan cost protection |
| `/api/gallery` | B-PUB | |
| `/contact` (page → API TBD) | B-CONTACT | captcha optional |
| `/api/learning-simulator/*` | B-ADMIN | admin-token-keyed |
| `/api/admin/monthly-persistence-award` | B-ADMIN | admin-token-keyed |
| ~~`/api/learning-supabase/health`~~ | — | *(route removed)* |

## Implementation options (next fix pass picks one)

| Option | Pros | Cons |
|--------|------|------|
| **Vercel KV / Upstash Redis** | persistent across instances, token-bucket primitives | vendor + cost; needs key |
| **Edge Middleware + Upstash** | filters before handler runs | edge runtime constraints |
| **In-memory LRU** | zero infra | does not survive restarts; stateless deploy = no protection |
| **Supabase function with row-versioned attempts table** | uses what we have | DB pressure; latency |

Recommendation: **Upstash Redis via `@upstash/ratelimit`**, applied in API handlers (or a small wrapper) for B-LOGIN and B-HEBREW first; expand to others.

## Brute-force specifics for student PIN (R-AUTH-01)

- 4-digit PIN ⇒ 10 000 combinations.
- Without limits, brute-force = minutes.
- Required policy:
  - Per-IP cap (B-LOGIN per-IP).
  - Per-username cap (B-LOGIN per-username) — the dominant control.
  - Progressive backoff: 5 fails → 30s lock; 10 fails → 5min; 20 fails → 1h; 50 fails → 24h + email parent (if email channel exists).
  - Hide whether username exists; uniform 401 on any failure.
  - Optional: parent-side opt-in to 6-digit PIN as a future option (out of scope for this plan).

## Cost / abuse specifics for Hebrew utilities (R-RATE-01)

- TTS calls cost network + provider time; an attacker can drown the budget.
- Required: B-HEBREW per IP, plus per-session cap if reachable from authenticated learning UI.
- Cache hit-rate target: ≥ 90% for repeated Hebrew text. Cache lifetime: indefinite for static curriculum text.

## Telemetry to add (next fix pass)

| Signal | Why |
|--------|-----|
| `auth.login.fail_count_per_username` | early brute-force signal |
| `auth.login.fail_count_per_ip` | botnet detection |
| `copilot.turn.cost_estimate` | LLM cost |
| `hebrew.tts.calls_per_ip_minute` | abuse detection |
| `parent.report.calls_per_token_minute` | scraping detection |

Wired into [INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md](./INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md) "abuse traffic" runbook.

## Acceptance for next fix pass (rate-limit slice)

- B-LOGIN active and verified (test: 11th attempt in 60s returns 429, 51st across 24h locks).
- B-HEBREW active and verified.
- B-COPILOT active and verified.
- All other buckets at least scaffolded and reading from a single config table.
- R-AUTH-01, R-RATE-01 may move toward `fixed` only with these checks recorded under `reports/security/rate-limit/<date>/`.
