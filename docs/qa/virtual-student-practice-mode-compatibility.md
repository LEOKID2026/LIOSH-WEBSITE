# Virtual Student — Practice mode compatibility (product authority)

> **Owner rule:** Auto/main/product is the source of truth. Simulation must match
> the product — not the other way around.

## Current main/product policy

| Rule | Status on `origin/main` |
|------|-------------------------|
| learning excluded from parent report | **yes** — `parent-report-evidence-gate.js` |
| practice counted | **yes** — `practice` → `diagnostic_independent` |
| parent-assigned countable activity counted | **yes** — attempts loop + homework/quiz modes |
| diagnostic evidence conservative | **yes** — guided/step-by-step/book excluded |

Old AAA rows written as `mode=learning` / `evidenceCategory=learning_guided` **remain
excluded**. No DB relabeling. No report-policy softening.

---

## Driver audit (before fix)

| subject | current driver mode | selects Practice? | fix needed? |
|---------|--------------------|--------------------|-------------|
| math | default page mode (`learning`) | **no** | **yes** |
| geometry | default page mode (`learning`) | **no** | **yes** |
| english | default page mode (`learning`) | **no** | **yes** |
| hebrew | default page mode (`learning`) | **no** | **yes** |
| science | default page mode (`learning`) | **no** | **yes** |
| moledet/geography | default page mode (`learning`) | **no** | **yes** |

All masters default React state to `learning`. Drivers clicked **Start** without
selecting the **תרגול** tab first → `/api/learning/session/start` persisted
`mode=learning` → parent report correctly **excluded** the data.

---

## Driver fix (simulation-only)

Shared helpers in `scripts/virtual-student-qa/lib/learning-session-helpers.mjs`:

- `selectCountablePracticeMode()` — clicks the product **תרגול** button (exact match).
- `assertCountableProductEvidence()` — after the first `/api/learning/answer`, verifies
  `session/start` body has `mode=practice` (not `learning`) and no step-by-step /
  book-context flags.

Updated drivers (all call Practice before start + strict first-answer check):

- `lib/subject-drivers/math-master.mjs`
- `lib/subject-drivers/geometry-master.mjs`
- `lib/subject-drivers/mcq-subject-driver.mjs` → hebrew, science, moledet
- `lib/subject-drivers/english-master.mjs`
- `lib/subject-drivers/hebrew-master.mjs`

**Product files touched:** **no**

---

## One-date validation plan (owner approval required before run)

| Field | Value |
|-------|-------|
| date | `2026-03-31` |
| students | `AAA1`, `AAA3`, `AAA5` |
| expected DB mode | `practice` in `learning_sessions.metadata.mode` |
| expected answer classification | `diagnostic_independent` (countable) |
| expected report result | new practice rows visible in parent report for that date range; old `learning` rows still excluded |

### Suggested command (staging/local only — writes real DB rows)

```powershell
# Dev server must be running; .env.local with Supabase + AAA credentials.
node scripts/virtual-student-qa/run.mjs `
  --phase d2 `
  --mode fast `
  --date 2026-03-31 `
  --students AAA1,AAA3,AAA5 `
  --force
```

After run, verify:

1. Driver logs contain `selected Practice tab (תרגול)` and `countable evidence ok (session.mode=practice)`.
2. Supabase: new sessions for that date have `metadata.mode = "practice"`.
3. Parent report for the student/date shows the new practice activity.
4. Pre-existing `learning` AAA rows unchanged and still absent from countable sections.

**Pass condition:** new rows are practice/countable; old learning rows excluded; site product behavior unchanged.

Only after owner approval on this tiny run → resume larger backfill range.

---

## Per-student snapshot gate (harness fix — owner approval required before run)

After the batch-snapshot bleed false-failure on `2026-04-01`, D2 validation now uses
**per-student** baseline → sessions → after windows (see `KNOWN-ISSUES.md`).

| Field | Value |
|-------|-------|
| date | `2026-04-01` |
| students | `AAA1`, `AAA5`, `AAA11` |
| mode | `fast` |
| reason | AAA1 had false batch bleed; AAA5 moledet/guided; AAA11 math practice |

```powershell
node scripts/virtual-student-qa/run.mjs `
  --phase d2 `
  --mode fast `
  --date 2026-04-01 `
  --students AAA1,AAA5,AAA11
```

Do **not** use `--force` unless explicitly re-running a completed date. State is still
at `lastRunDate=2026-03-31`.

---

## Operator env — parent preflight credentials

When runs source `%LOCALAPPDATA%\liosh-qa\env\virtual-student-qa.env.ps1` first,
those values **override** repo `.env.e2e.local` (`config.mjs` never replaces
keys already in `process.env`).

Parent preflight uses `E2E_PARENT_EMAIL` + `E2E_PARENT_PASSWORD` from that
precedence chain. If preflight reaches the login form but submit does not reach
`/parent/dashboard`, update the **local operator env** password to match live
Vercel — do not commit secrets.

Login field selectors: see `KNOWN-ISSUES.md` — parent preflight selector drift
(resolved 2026-06-15); `parent-auth.mjs` uses `parent-login-identifier` /
`parent-login-secret` test ids first.

---

## Safety checklist

| Check | Status |
|-------|--------|
| no product policy change | **yes** |
| no DB patch / relabel | **yes** |
| no 02:00 / 04:00 change | **yes** |
| no commit/push/deploy (this task) | pending owner approval |
