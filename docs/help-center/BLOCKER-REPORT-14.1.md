# §14.1 Blocker Report — Help Center Final Phase

**Date:** 2026-05-23  
**Outcome:** Final screenshot phase and sign-off **not complete**. Structure/build OK; blocked on environment data + parent credentials.

## What was completed

| Item | Status |
|------|--------|
| Help Center routes, content (42 articles), components, manifest fix | Done (prior + this pass) |
| Removed invalid `public/help-center/screenshots/` (placeholders + wrong paths) | Done |
| `npm run help:build-manifest` (135 paths, correct `section/slug/viewport/region.png`) | Exit **0** |
| Live capture attempt `npm run help:capture -- --base-url=http://127.0.0.1:3001` | Partial raw frames only |
| `npm run build` (after `.next` clean) | Exit **0** — 89 pages, all `/help/**` SSG |
| Manual HTTP QA — 47/47 help URLs on dev | Exit **0** |
| `docs/help-center/MANUAL-QA.md`, `SIGNOFF.md` | Updated with actual results |
| Data-safety review / publish / verify | **Not run** (no approved frames) |

## What failed

1. **Demo student `ADMIN` / PIN `1234`** — cannot authenticate against local Supabase (`POST /api/student/login` → **401**).
2. **Visible child `ישראל ישראלי`** — student row exists in DB but has **no** active `student_access_codes` row; cannot log in as that identity.
3. **Parent-authenticated captures** — `E2E_PARENT_EMAIL` / `E2E_PARENT_PASSWORD` and `VIRTUAL_STUDENT_PARENT_ACCOUNTS` **not set** in `.env.e2e.local` / `.env.local`.
4. **`npm run help:verify`** — exit **1** (135 published files missing; intentional — no placeholders republished).

## Root cause

The approved plan assumes a pre-provisioned demo account **ADMIN/1234** linked to **ישראל ישראלי**. The connected **LEO-KID** Supabase project (`ajxwmlwbzxwffrtlfuoe`) does not match that assumption:

- Student `ישראל ישראלי` (`students.id` = `d119f721-05b3-4fe2-ac58-4174ac06f733`) has **no** access code.
- The only active `login_username` matching `admin` (normalized from `ADMIN`) is tied to student **בדיקה**, and PIN **1234** fails; PIN **7479** succeeds for **בדיקה** (wrong display name).
- Working E2E student in `.env.e2e.local` is **ERAN/7479** → **ערן יוסף** (not plan-approved for screenshots).

Parent capture requires credentials the agent must not invent; none are present in gitignored env files.

## Raw capture summary (this run)

- **OK (public, no auth):** ~8 frames under `qa-evidence-audit/help-center/parents/` (mobile/tablet only for welcome, parent login, install, offline) + `students/student-login` login screen.
- **Skipped:** all `parent-report/*`, most `parents/*` (parent auth), all student home / subjects / authenticated student flows.
- Stale wrong-path artifacts from an earlier buggy manifest may still exist under `qa-evidence-audit/help-center/` (Hebrew filenames); **not** published.

## Commands run (exit codes)

| Command | Exit |
|---------|------|
| `npm run help:build-manifest` | 0 |
| `npm run dev` (port in use / restart) | 0 / EADDRINUSE then restart |
| `npm run help:capture -- --base-url=http://127.0.0.1:3001` | Stopped mid-run; many SKIP |
| `POST /api/student/login` ADMIN/1234 | 401 |
| `POST /api/student/login` ERAN/7479 | 200 (wrong demo) |
| `npm run build` (1st, stale `.next`) | 1 |
| `npm run build` (after `Remove-Item .next`) | 0 |
| `npm run help:verify` | 1 |
| HTTP QA 47 help paths | 0 |

## Skipped items (why)

| Step | Reason |
|------|--------|
| `help:data-safety-review` | No complete raw capture set |
| `help:publish-screenshots` | Would publish incomplete/wrong evidence |
| Full Playwright 135-frame capture | Auth blockers above |
| Interactive multi-browser manual QA | Agent limitation; partial HTTP + build only |
| SIGNOFF approval | Blocked |

## Unblock checklist (owner)

1. In Supabase, create/activate `student_access_codes` for **ישראל ישראלי**: `login_username` → `admin` (normalizes to ADMIN), PIN **1234**, active.
2. Add to `.env.e2e.local` (gitignored): `E2E_PARENT_EMAIL` + `E2E_PARENT_PASSWORD` for a parent that owns that student (e.g. QA `admin@admin.com` account).
3. `npm run dev` → `npm run help:capture -- --base-url=http://127.0.0.1:3001` → data-safety review → `help:publish-screenshots` → `help:verify` → `npm run build`.

## Files changed (this pass)

- `scripts/help-center/verify-screenshots.mjs` — prefer approved manifest
- `docs/help-center/MANUAL-QA.md`, `SIGNOFF.md`, `BLOCKER-REPORT-14.1.md`
- Deleted: `public/help-center/screenshots/**`

No commit. No push. No new dependencies.
