# YTD Backfill Handoff Archive (2026-06-01)

This folder is **handoff and archive material only**. It is **not runtime application code**.

## Purpose

Package YTD school backfill simulation work, QA/backfill infrastructure, and the production report aggregation fix for review on a separate machine (desktop Cursor) without mixing handoff artifacts into active production paths.

## Rules

- **Do not import** any file from `_handoff/` into the Next.js app, API routes, or server bundles.
- **Vercel must ignore** this tree — see repo-root `.vercelignore` (`_handoff/`).
- **No secrets** are stored here: no `.env*`, tokens, service-role keys, or raw credential passwords.
- **State and report artifacts** are indexed by path only; large JSON/report trees are not duplicated in this folder.

## Contents

| Path | Description |
|------|-------------|
| `00-current-status.md` | Snapshot of approved simulation/checkpoint state |
| `01-final-ytd-summary.md` | YTD run through `2026-05-28` |
| `02-extension-summary.md` | Extension through `2026-06-01` |
| `03-production-report-fix-summary.md` | Product bug, fix files, production verification |
| `04-known-risks-and-next-actions.md` | Deploy drift, commit plan, adopt-state, nightly/daily |
| `patches/` | Scoped diffs: product fix vs QA/backfill WIP |
| `files/` | Full copies of changed source for offline review |
| `git/` | `git status`, stash list, diff stat at handoff time |
| `artifacts-index/` | Paths to local state and report artifacts |

## Branch

Created on git branch `handoff/ytd-backfill-2026-06-01`. **Not merged to `main`.**

## Applying patches (review only)

```powershell
# Product fix (from repo root, on a review branch)
git apply _handoff/ytd-backfill-2026-06-01/patches/product-report-fix.patch

# QA/backfill WIP (separate)
git apply _handoff/ytd-backfill-2026-06-01/patches/qa-backfill-wip.patch
```

Review patches before applying; paths assume repo-root layout.
