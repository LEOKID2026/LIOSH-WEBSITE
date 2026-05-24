# Help Center Videos — Sign-off

> **Remediation (May 2026):** Previously published placeholder clips were **removed from `public/`** and must **not** be treated as approved tutorials. All 42 manifest entries are `assetKind: "placeholder"` until real per-article capture runs.

## Current status (post-remediation)

| Metric | Target (future) | Actual now |
|--------|-----------------|------------|
| Articles | 42 | 42 (manifest only) |
| Captured desktop WebM in `public/` | 42 | **0** |
| Captured mobile WebM in `public/` | 42 | **0** |
| Placeholder assets published | **0** | **0** |
| Help Center UI shows videos | only when `assetKind=captured` | **hidden** |

## What was wrong (prior pass)

- `help:placeholders-videos` seeded identical `/help` hub clips for all articles.
- Those bytes were published via `help:publish-videos` and incorrectly marked `internalReview: passed`.
- `help:verify-videos` only checked file existence/size — not uniqueness or capture kind.

## Commands (remediation pass)

| Command | Exit code | Notes |
|---------|-----------|-------|
| Removed `public/help-center/videos/**` | — | Quarantined from user-facing static assets |
| Manifest patched (`assetKind: placeholder`) | — | `internalReview` reset to `excluded` |
| `npm run help:verify-videos` | (see remediation report) | |
| `npm run build` | (see remediation report) | |

## Not run (by owner directive)

- `help:capture-videos` — **deferred** until screenshot phase completes
- `help:placeholders-videos` — must not be published to `public/` again

## Safety

- Placeholder clips recorded only `/help` (no login flows in those files)
- No placeholder assets remain in `public/help-center/videos/`

## Git

- No commit, no push (remediation pass)
