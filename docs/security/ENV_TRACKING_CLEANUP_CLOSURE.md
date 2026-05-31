# ENV Tracking Cleanup — Closure

**Status:** Closed (repo tracking)  
**Date:** 2026-05-31  
**Cleanup commit:** `396712e1` — `chore: stop tracking local env files`

## Summary

Repo-level ENV tracking cleanup is **complete**. Real `.env*` files are no longer tracked by Git; local copies remain on disk for development; Vercel environment variables were **not** changed as part of this work.

## What was done

| Action | Detail |
|--------|--------|
| Untracked from Git | `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.vercel.prod.check` |
| Kept tracked | `.env.example` only (placeholders, no real secrets) |
| Updated `.gitignore` | `.env*` with `!.env.example`; `.env.vercel*` with `!.env.vercel*.example` |
| Local files | **Not deleted** — developers keep `.env.local` and other local env files on disk |
| Vercel | **Not modified** — production/preview env vars unchanged |
| Deploy | **Not triggered** |

## Verification (2026-05-31)

### Tracked env files

`git ls-files | findstr /i env` shows `.env.example` among env-related paths. Real env files (`.env`, `.env.local`, `.env.development`, `.env.production`, `.env.vercel.prod.check`, `.env.e2e.local`, `.env.vercel.local`) do **not** appear as tracked.

### Ignore rules

`git check-ignore -v` confirms all real env files above are ignored by `.gitignore` (rules `.env*` and `.env.vercel*`).

### Local presence

`.env.local` (and other local env files) remain on disk for development.

### Tracked secret assignments

Current tracked tree: no live secret values in env files. `.env.example` contains empty or placeholder assignments only. `VERCEL_OIDC_TOKEN=` does not appear in tracked files.

## Scope of this closure

This document closes the **active repo-tracking issue** (accidental commit / tracking of real `.env*` files).

It does **not** close:

- **Historical Git exposure** — secrets that appeared in past commits remain in history until rotation and optional history rewrite are performed.
- **Launch-readiness rotation** — see [ENV_SECRETS_AUDIT_PLAN.md](./ENV_SECRETS_AUDIT_PLAN.md) and the broader secrets audit for rotation policy.

## Related docs

- [ENV_SECRETS_AUDIT_PLAN.md](./ENV_SECRETS_AUDIT_PLAN.md) — variable classification and rotation (deferred pre-launch phase)
- [VERCEL_DEPLOYMENT_SECURITY_PLAN.md](./VERCEL_DEPLOYMENT_SECURITY_PLAN.md) — production env checklist
