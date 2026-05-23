---
name: Wave 2C Next.js Upgrade Prep
overview: Documentation-only preparation pass for the owner-approved future upgrade of `next@14.1.0` to a patched 14.2.x release, with PDF stack tracked separately. No package files, no ENV, no Git push, no Vercel deploy, no UI changes.
todos:
  - id: report
    content: Create reports/security/wave-2c-nextjs-upgrade-prep.md with target version 14.2.35, compatibility review, future commands, smoke checklist, rollback plan, and explicit out-of-scope items
    status: completed
  - id: register
    content: If needed, append a one-line Wave 2C prep note to docs/security/SECURITY_RISK_REGISTER.md keeping R-DEP-01 open; otherwise leave untouched
    status: completed
  - id: verify
    content: "Run no-op verification: confirm git diff for package.json, package-lock.json, .env* is empty"
    status: completed
isProject: false
---

# Wave 2C — Next.js Upgrade Preparation (docs only)

## Scope

Create a single new report and (optionally) append a one-line Wave 2C entry to the risk register. **No** package, lockfile, ENV, UI, or product changes. **No** `npm audit fix`. **No** Git push. **No** Vercel deploy.

## Current state (read-only confirmed)

- [package.json](package.json) line 365: `"next": "14.1.0"` (exact pin, no caret).
- [package.json](package.json) lines 367-368: `"react": "18.2.0"`, `"react-dom": "18.2.0"` (compatible with 14.2.x; do not change).
- PDF stack: `html2pdf.js@^0.10.1`, `jspdf@^3.0.4`, `jspdf-autotable@^5.0.2` ([package.json](package.json) lines 361-364).
- Existing triage already documents 11 advisories: [reports/security/wave-2b-dependency-risk-triage.md](reports/security/wave-2b-dependency-risk-triage.md).
- `npm audit` suggests `next@14.2.35` as the in-range patched target.

## Recommended target

- **Next.js:** stay in 14.x line, target `14.2.35` (latest 14.2.x patch indicated by `npm audit`). No React change. No major migration.
- **PDF stack:** out of scope for Wave 2C execution; deferred to a separate owner-approved Wave (already triaged in Wave 2B).
- **Tooling transitives** (`flatted`, `minimatch`, `ajv`, `brace-expansion`, `ws`): batch under `npm audit fix` (non-force) **after** Next upgrade verifies green; not in this prep pass.

## Deliverables

### 1. New file: `reports/security/wave-2c-nextjs-upgrade-prep.md`

Sections to include:

- **Current dependency / audit state** — quote `next@14.1.0` from [package.json](package.json), summarize the 11 advisories from Wave 2B triage.
- **Recommended target version** — `next@14.2.35` within 14.x, React unchanged.
- **Rationale** — patches all listed Next GHSA advisories; semver-minor; React 18 compatibility preserved; avoids Next 15 / App Router migration.
- **Files that would change later** (not now): only `package.json` and `package-lock.json`.
- **Compatibility risk review** — explicit list: pages router routes (`pages/api/**`, `pages/**`), middleware (none detected), [next.config.js](next.config.js) headers + Report-Only CSP, image/static assets, PDF export (separate scope), student session cookie code paths, parent dashboard/report routes, Parent Copilot API ([pages/api/parent/copilot-turn.js](pages/api/parent/copilot-turn.js)), learning routes, arcade/game routes, Vercel build behavior.
- **Future commands (do not execute now)**:
  1. Next.js-only attempt: `npm install --save-exact next@14.2.35`
  2. Audit verification: `npm audit`
  3. Build/lint/typecheck: `npm run build`
  4. Targeted security selftests: Wave 1, 2A, 2B selftests + ownership matrix dry-run
  5. Rollback: `git checkout -- package.json package-lock.json && npm ci`
- **Future minimal smoke checklist** (post-upgrade, owner-driven):
  - `npm run build`
  - `node scripts/security/wave1-security-selftest.mjs`
  - `node scripts/security/wave2a-security-selftest.mjs`
  - `node scripts/security/wave2b-security-selftest.mjs`
  - `node scripts/security/ownership-boundary-http-matrix.mjs --dry-run`
  - Local smoke: student login, session start/answer/finish, parent login → dashboard → report
  - Local smoke: Parent Copilot turn (cookie path) — no live LLM forced
  - Local smoke: `/api/hebrew-nakdan` POST, `/api/hebrew-audio-ensure` POST, `/api/hebrew-audio-stream` GET
  - PDF export smoke: skip (PDF stack is separate Wave)
  - Arcade smoke: one chess and one bingo action
  - `git diff --name-only -- ".env" ".env.local" ".env.example"` is empty
  - No diff in any `pages/**` Hebrew strings, CSS, or layout files
- **Rollback plan** — `git checkout`, `npm ci`, re-run selftests.
- **What stays separate** — PDF stack, durable rate limits, ENV phase, CSP enforce promotion, ownership HTTP execute (D-OWNERSHIP-1).

### 2. Optional: append Wave 2C prep note to `docs/security/SECURITY_RISK_REGISTER.md`

Single short block under existing Wave 2B log:

- R-DEP-01 remains **partially-fixed** (open) — Wave 2C produced an owner-approval upgrade plan only; **no package upgrade executed**.

If the existing wording already conveys this, the register is left untouched.

## Files NOT touched

- `package.json`
- `package-lock.json`
- `next.config.js`
- Any `.env*` file
- Any `pages/**` route, component, or Hebrew text
- Any selftest under `scripts/security/`

## Final response back to owner

Will report:

- Files changed: 1 new report (+ optional 1-line risk register append).
- Recommended target: `next@14.2.35`.
- Package files modified: **no**.
- ENV touched: **no**.
- Git push / Vercel deploy: **no**.
- Owner decision needed before execution: **approve `next@14.1.0 → 14.2.35` minor upgrade with the listed verification suite, in a dedicated upgrade pass**.
- Ready for owner-approved Next.js upgrade execution: **yes** (after explicit approval).