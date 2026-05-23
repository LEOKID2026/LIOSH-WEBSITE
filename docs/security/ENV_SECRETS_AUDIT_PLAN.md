# Env / Secrets Audit Plan

> **DO NOT EXECUTE ENV CHANGES UNTIL OWNER APPROVES FINAL PRE-LAUNCH ENV PHASE.**
>
> Per owner decision dated 2026-05-23, this document is **planning / reference only**. No file under it may be modified, no value rotated, no Vercel env updated, no env-flag renamed, no env-flag-driven product behavior changed, and no `.env*` file edited as part of any current security fix wave.
>
> Implementation of every action below is **postponed** to a dedicated **Final Pre-Launch ENV Review / Rotation** phase. See:
> - [SECURITY_MASTER_PLAN.md](./SECURITY_MASTER_PLAN.md) "Owner-deferred ENV decision".
> - [SECURITY_GATES_AND_SIGNOFF_PLAN.md](./SECURITY_GATES_AND_SIGNOFF_PLAN.md) "Final Pre-Launch ENV Review".
> - [reports/security/security-planning-summary.md](../../reports/security/security-planning-summary.md) "Final Pre-Launch ENV Review".
>
> **Status of every action in this doc:** `DEFERRED-BY-OWNER — FINAL PRE-LAUNCH ENV REVIEW / ROTATION`.
>
> The risks remain **real** and **public-launch-blocking** where marked P0. Deferral is not a waiver; it is a sequencing decision.

**Generated:** 2026-05-23
**Risk rows:** **R-ENV-01 (P0)**, R-AUTH-02 (P1), R-DEV-01 (P0), R-COPILOT-01 (P0), R-VERCEL-01 (P1), R-DOC-01 (P3)

## Goal

Classify every environment variable in this repo, confirm `NEXT_PUBLIC_*` variables are not used as authority, identify suspected secret leakage, and define rotation policy.

## Variable classification

Source: [.env.example](../../.env.example) plus references in code.

### Class P (Public — exposed at build time, OK to be visible)

| Variable | Purpose | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_PARENT_COPILOT_V1` | feature flag (UI-only) | OK |
| `NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT` | feature flag (UI hint) | **must remain `false` in public production** until server snapshot ships — R-COPILOT-03 |
| `NEXT_PUBLIC_LEARNING_SUPABASE_URL` | Supabase project URL | OK to be public |
| `NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY` | anon key | OK to be public *if RLS is correctly enforced*; relates to R-RLS-01/02 |
| `NEXT_PUBLIC_ARCADE_DEBUG` | dev-only UI hint | **must remain off in production** |
| `NEXT_PUBLIC_DEBUG_STUDENT_IDENTITY` | dev-only logs | **must remain off in production** |
| `NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN` | UI hint | currently doubles as authority — **fix in dev-route hardening (R-AUTH-02)** |

### Class S (Server-only — must never be `NEXT_PUBLIC_*`)

| Variable | Purpose | Today | Required state |
|----------|---------|-------|----------------|
| `LEARNING_SUPABASE_SERVICE_ROLE_KEY` | full DB access | server-only ✓ | rotation policy (below); never logged |
| `LEARNING_STUDENT_ACCESS_SECRET` | student auth secret | server-only ✓ | rotation policy; never logged |
| `ENGINE_REVIEW_ADMIN_TOKEN` | admin route gate | **`.env.example` ships value `7479` — R-ENV-01 (P0)** | rotate; remove placeholder; require ≥ 32 random bytes |
| `PARENT_COPILOT_LLM_API_KEY` | LLM provider | server-only ✓ | rotation per provider |
| `GEMINI_API_KEY` | Gemini | server-only ✓ | same |
| `PARENT_REPORT_NARRATIVE_LLM_*` | LLM narrative | server-only ✓ | same |
| `PARENT_COPILOT_ALLOW_UNAUTH_LOCAL_PAYLOAD` | dev convenience | server-only ✓ | server enforces `NODE_ENV !== 'production'` regardless |
| `PARENT_COPILOT_ALLOW_CLIENT_PAYLOAD_IN_PRODUCTION` | emergency escape | server-only ✓ | **must be unset / `false` in public production — R-COPILOT-01 (P0)** |
| `ARCADE_ALLOW_FOUNDATION_ACTIONS` | testing | server-only ✓ | must be off in production |
| `PARENT_COPILOT_ROLLOUT_STAGE`, `PARENT_COPILOT_LLM_*`, `PARENT_COPILOT_KPI_*` | tunables | server-only ✓ | OK |

### Class O (Operational, non-secret)

`PARENT_COPILOT_FORCE_DETERMINISTIC`, `PARENT_COPILOT_LLM_TIMEOUT_MS`, `PARENT_COPILOT_KPI_*`, base URLs, model names — operational, not secrets, but should still live in env, not source.

## Suspected secret leakage (act on as IR — record only here)

| ID | Where | Value | Action |
|----|-------|-------|--------|
| R-ENV-01 | [.env.example](../../.env.example) line 76 | `ENGINE_REVIEW_ADMIN_TOKEN=7479` | Treat as **suspected leak**: rotate any deployed value (per [INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md](./INCIDENT_RESPONSE_AND_RECOVERY_PLAN.md) "credential leak" runbook), replace placeholder with `REPLACE_ME_WITH_32_BYTE_RANDOM`, audit git history. |

> This pass **does not** rotate or commit. The risk register row is `known`; the next fix pass moves it to `fixed` after rotation evidence.

## Multi-`.env` files (R-DOC-01)

Repo currently contains: `.env`, `.env.local`, `.env.example`, `.env.development`, `.env.production`, `.env.vercel.local`, `.env.e2e.local`.

Required action in next pass:

1. Confirm `.gitignore` excludes `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.vercel.local`, `.env.e2e.local` (only `.env.example` should be tracked).
2. Run `git log --all -- .env .env.local .env.production` etc. to confirm no historical commit leaked them.
3. Document Next.js env precedence (`.env.local` > `.env.development` > `.env`) in this doc once verified.

## Rotation policy

| Class | Rotation cadence | Trigger |
|-------|------------------|---------|
| `LEARNING_SUPABASE_SERVICE_ROLE_KEY` | yearly + on suspected leak | manual via Supabase dashboard |
| `LEARNING_STUDENT_ACCESS_SECRET` | yearly + on suspected leak | requires student session migration plan |
| `ENGINE_REVIEW_ADMIN_TOKEN` | quarterly + on suspected leak | low coupling; rotate freely |
| LLM provider keys | on provider rotation policy + on suspected leak | provider |

## Pre-deploy env check

See [DEV_ROUTE_HARDENING_PLAN.md](./DEV_ROUTE_HARDENING_PLAN.md) "Pipeline / pre-launch checklist" — the script reads production env and fails the deploy on any unsafe combination.

## Acceptance for the Final Pre-Launch ENV Review / Rotation phase

> **All bullets below are gated behind the owner-approved Final ENV phase.** None of them are part of any current security fix wave; do not execute now.

- `.env.example` placeholder rotated and made obviously fake (e.g. `REPLACE_ME_WITH_32_BYTE_RANDOM`).
- Git history scanned (`git log -p`) for any historical secret commit; if found, rotate immediately.
- All `NEXT_PUBLIC_*` variables documented as "UI hint only, no authority".
- Pre-deploy check active.
- R-ENV-01 may move to `fixed` once rotation is verified.

## What may be done **before** the Final ENV phase (without touching ENV)

The risks linked to ENV remain partially mitigated by code-side changes that do **not** read or write any env value. Those are scheduled in [reports/security/security-planning-summary.md](../../reports/security/security-planning-summary.md) "Wave 1 — Non-ENV Pilot Security Hardening". Examples kept here for cross-reference only:

- Hard-disable dev routes using the **existing** `process.env.NODE_ENV === 'production'` check inside each handler (reads env, does not modify it; allowed). See [DEV_ROUTE_HARDENING_PLAN.md](./DEV_ROUTE_HARDENING_PLAN.md).
- Defense-in-depth ownership check inside `/api/parent/copilot-turn` independent of `PARENT_COPILOT_ALLOW_*` flags. See [PARENT_COPILOT_SECURITY_PLAN.md](./PARENT_COPILOT_SECURITY_PLAN.md).
- `timingSafeEqual` for any token comparison **without** changing the token value. See [DEV_ROUTE_HARDENING_PLAN.md](./DEV_ROUTE_HARDENING_PLAN.md).

These are code-level guardrails that read env state but do not alter env values, names, or flag semantics.
