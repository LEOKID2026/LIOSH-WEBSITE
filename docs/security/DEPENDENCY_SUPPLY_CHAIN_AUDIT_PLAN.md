# Dependency / Supply Chain Audit Plan

**Generated:** 2026-05-23
**Risk rows:** R-DEP-01 (P1)

## Goal

Establish a periodic dependency audit and a lockfile policy. **Read-only audit; no upgrades in this pass.**

## Current top-level dependencies

From [package.json](../../package.json) — **reconciled 2026-05-23 (Wave 2J)** after Waves 2D–2G:

### Runtime (current)

- `next@15.5.18` (upgraded Wave 2D — **do not downgrade**; `14.2.35` superseded)
- `react@18.2.0`, `react-dom@18.2.0`
- `jspdf@4.2.1`, `html2pdf.js@0.14.0`, `jspdf-autotable@5.0.8` (Wave 2G)
- `@supabase/supabase-js@^2.105.1`
- `framer-motion@^10.18.0`, `recharts@^3.5.0`, `canvas-confetti@^1.9.2`, `chess.js@^1.4.0`
- `js-sha256@^0.11.1`, `node-edge-tts@^1.2.10`

### Dev / build

- `@playwright/test@^1.59.1`, `playwright@^1.49.1`
- `tailwindcss@^4.1.17`, `@tailwindcss/postcss@^4.1.17`, `postcss@^8.5.6`, `autoprefixer@^10.4.22`
- `pdf-parse@^2.4.5`, `tsx@^4.19.2`

> **Historical baseline (pre-2D):** `next@14.1.0`, `jspdf@^3.0.4` — see [wave-2b-dependency-risk-triage.md](../../reports/security/wave-2b-dependency-risk-triage.md).

## Specific concerns

| Dep | Concern |
|-----|---------|
| `next@15.5.18` | Next **critical** closed at 2D; **2 moderate** PostCSS residue remain — accept; do not `npm audit fix --force` |
| `node-edge-tts` | calls Microsoft Edge TTS via WS; runs server-side; confirm no sensitive text logged client-side |
| `html2pdf.js`, `jspdf` | client PDF — upgraded 2G; QA PASS |
| `recharts@^3.5.0` | major-version churn historically; pin and review |
| `framer-motion@^10.18.0` | confirm peer-deps OK with React 18 |

## Audit method (next fix pass; read-only steps shown for reference)

1. `npm audit --omit=dev` and `npm audit` — record output under `reports/security/npm-audit-<date>.json`.
2. `npm outdated` — record under `reports/security/npm-outdated-<date>.txt`.
3. Dependency graph snapshot: `npm ls --all --json > reports/security/npm-tree-<date>.json`.
4. Cross-check against [GitHub Advisory DB](https://github.com/advisories) for each top-level dep.
5. Document **every High / Critical advisory** as a register row (e.g. `R-DEP-02`, `R-DEP-03`).

## Lockfile policy

- `package-lock.json` (or `pnpm-lock.yaml`) is the source of truth — no installs without it.
- CI runs `npm ci` (no resolution drift).
- Renovate / Dependabot enabled with weekly cadence (next fix pass).

## Patch cadence (target)

| Severity | SLA |
|----------|-----|
| Critical | within 24h |
| High | within 7d |
| Medium | within 30d |
| Low | next regular cycle |

## Supply-chain hygiene

- All deps installed from npmjs.org by default. No tarball deps. Confirm via `package.json` (currently true).
- No `postinstall` scripts that run network code (verify per `npm-tree-<date>.json` flagging packages with lifecycle scripts).
- For LLM keys: provider-specific advisories (OpenAI, Google AI) tracked manually.

## Acceptance for next fix pass (deps slice)

- `npm audit` clean (or every reported issue has a register row + plan).
- `npm outdated` reviewed; `next` patched if a security release exists.
- Renovate / Dependabot wired.
- Lockfile pinned to current contents.
- `package-lock.json` committed (verify).
- R-DEP-01 may move to `fixed` once audit is clean **or** remaining issues are accepted with evidence (current: **2 moderate PostCSS residue**, 0 critical/high — see [wave-2j-non-env-security-closure-map.md](../../reports/security/wave-2j-non-env-security-closure-map.md)).
