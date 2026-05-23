# Final Product Closure Map

**Record date:** 2026-05-23
**Owner approval:** 2026-05-23 — closure-control pass approved. Reopen rules in [DO_NOT_REOPEN_WITHOUT_REGRESSION.md](./DO_NOT_REOPEN_WITHOUT_REGRESSION.md) are binding.
**Document type:** Final closure-control layer (read-only mapping; no product change in this pass).
**Scope:** Hebrew learning website, grades 1–6, fixed subject set
(`math`, `geometry`, `hebrew`, `english`, `science`, `moledet/geography`).
No schools, no teachers, no classroom management.
**Sibling docs (must be read together):**
- [docs/FINAL_CLOSURE_EVIDENCE_REGISTRY.md](./FINAL_CLOSURE_EVIDENCE_REGISTRY.md) — full evidence file list per area.
- [docs/DO_NOT_REOPEN_WITHOUT_REGRESSION.md](./DO_NOT_REOPEN_WITHOUT_REGRESSION.md) — reopen rules.
- [reports/final-closure-control-summary.md](../reports/final-closure-control-summary.md) — executive summary.

---

## How to read this document

| Status | Meaning |
|--------|---------|
| **CLOSED** | Approved. Do not reopen unless concrete regression evidence exists (see [DO_NOT_REOPEN_WITHOUT_REGRESSION.md](./DO_NOT_REOPEN_WITHOUT_REGRESSION.md)). |
| **CLOSED-WATCH** | Approved, but a runtime/nightly/lightweight guard continues to monitor it. Monitoring is *not* reopening. |
| **OPEN** | Real work still required. |
| **OPEN-WORKING** | Active work in progress on a separate track. Do not duplicate, do not pre-judge. |
| **BLOCKED** | Cannot be closed until missing evidence/access/files arrive. |
| **DEFERRED** | Intentionally out of current launch scope. Must not distract the launch path. |
| **UNKNOWN / EVIDENCE-MISSING** | A result may exist somewhere, but this pass found insufficient evidence to claim closure. |

This map only **classifies** state. It does not rerun heavy QA, does not change product behavior, does not modify Hebrew UI/content, does not refactor code.

---

## Closure principle

> **Evidence or do not reopen.**

A closed area is only reopened on one of:
1. A failing QA report with date and source path.
2. A real UI/browser failure reproduced against the live site.
3. A code change that touched files inside the closed area.
4. A contradiction in current evidence (one signed gate disagrees with another).
5. A clear owner requirement change.

A general concern, a hunch, or a future hypothetical is **not** sufficient.

---

## Closure map by area

### A. Product Scope

| Field | Value |
|-------|-------|
| **Status** | **CLOSED** |
| **Evidence** | [docs/FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) §A; [docs/launch-readiness-checklist.md](./launch-readiness-checklist.md) §"Subject coverage"; [docs/site-map-and-protection-audit.md](./site-map-and-protection-audit.md) (route map limited to grades 1–6 + 6 subjects, parent + student only). |
| **Last known result** | Scope frozen: Hebrew site, grades 1–6, six fixed subjects, parent/student roles only. No schools/teachers/classroom code paths exist in `pages/`. |
| **Remaining risks** | None at scope level. Risk is only in implementation of in-scope flows (covered by other areas). |
| **Reopen rule** | Only on explicit owner requirement change to scope. |
| **Next action** | None. |

### B. Curriculum & Subjects

| Field | Value |
|-------|-------|
| **Status** | **CLOSED-WATCH** |
| **Evidence** | [docs/FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) §B (Question bank coverage `REAL_BLOCKER_VISIBLE: 0`, Question volume / release alignment, Science/English/Hebrew/Geometry phase docs); [docs/product-quality-phase-26-subject-content-readiness-summary.md](./product-quality-phase-26-subject-content-readiness-summary.md) (12,157 rows across 6 subjects × G1–G6); product-quality-phase 8–30 series for per-subject deep audits; [docs/hebrew-current-status.md](./hebrew-current-status.md), [docs/curriculum-audit.md](./curriculum-audit.md). |
| **Last known result** | All six subjects have content across G1–G6. Hebrew "Perfect Close" / "True Done" is signed; English expanded in phases 27–30; geometry/math/science/moledet have audit + representation-fix docs. |
| **Remaining risks** | Hebrew G3–G6 thin vs G1 (documented, not blocking). English/Hebrew taxonomy may surface advisories in nightly question-quality runs. |
| **Reopen rule** | Failing `qa:question-metadata` or `qa:question-quality` report; owner requirement to add a new grade/subject (out of scope per freeze). |
| **Watch (runtime guard)** | `qa:question-metadata` (release gate) + `qa:question-quality` budget; nightly question shape coverage in virtual-student-daily run-summary. |
| **Next action** | None in this pass. |

### C. Question Quality

| Field | Value |
|-------|-------|
| **Status** | **CLOSED-WATCH** |
| **Evidence** | [docs/FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) §B (Diagnostic / question metadata `gateDecision: pass_with_advisory`, 0 blocking); [docs/question-metadata-qa.md](./question-metadata-qa.md); [docs/question-metadata-final-stabilization.md](./question-metadata-final-stabilization.md); per-subject phase docs (geometry phase 16–17, science phase 9–13, English phase 24–30, Hebrew phase 20–22). |
| **Last known result** | Metadata release gate `pass_with_advisory`, 0 blocking; student-question-stem sanitizer closed; advisories (`missing_prerequisite_skill_ids`, `implicit_id_only`, `missing_explanation`) are informational only. |
| **Remaining risks** | Advisories accumulating over time without periodic re-check. |
| **Reopen rule** | Any future `gateDecision: fail_blocking_metadata`, or any new raw key leak detected by `qa:student-question-stem-metadata`. |
| **Watch (runtime guard)** | Nightly aggregator can wire `reports/question-metadata-qa/summary.json` into the `questionQuality` layer (currently `not_run` in the daily gate; this is by design — the gate stays `PARTIAL` until wired, not `fail`). |
| **Next action** | None required for closure; optional: wire `questionQuality` layer when convenient. |

### D. Student Experience

| Field | Value |
|-------|-------|
| **Status** | **CLOSED-WATCH** |
| **Evidence** | [docs/FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) §B (Learning simulator quick / deep / critical-deep / profile-stress / release / full all PASS); [docs/site-map-and-protection-audit.md](./site-map-and-protection-audit.md) §Student-Facing Pages (8 student pages incl. 6 `*-master` learning pages, home, arcade, games); QA driver fix log [scripts/virtual-student-qa/KNOWN-ISSUES.md](../scripts/virtual-student-qa/KNOWN-ISSUES.md) (English typing + double-advance fixes 2026-05-22/23 — driver-only, no product change). |
| **Last known result** | 43-step orchestrator PASS; critical-deep 108 scenarios 0 failures; profile-stress 112 scenarios 0 failures; all 6 subject `*-master` pages exercised by E2E + simulator. Real-UI virtual-student runner Phase A–D2 closed (multi-student, multi-subject, real persistence). |
| **Remaining risks** | Mobile/RTL real-device experience and cross-device persistence still EVIDENCE-MISSING (see L). Manual owner browser smoke per [docs/launch-readiness-checklist.md](./launch-readiness-checklist.md) is not yet signed off. |
| **Reopen rule** | Failing nightly run with student-side blocker (`student cannot answer`, `session/finish` missing, `cross-student bleed`); failing release/critical-deep simulator. |
| **Watch (runtime guard)** | Nightly virtual-student Phase D2 + planned full-suite nightly runs. |
| **Next action** | None for closure; mobile/RTL probe is separately tracked under L. |

### E. Parent Dashboard

| Field | Value |
|-------|-------|
| **Status** | **CLOSED-WATCH** |
| **Evidence** | [docs/site-map-and-protection-audit.md](./site-map-and-protection-audit.md) §Parent-Facing Pages (`/parent/login`, `/parent/dashboard`, `/parent/rewards`); [scripts/virtual-student-qa/lib/daily-preflight.mjs](../scripts/virtual-student-qa/lib/daily-preflight.mjs) (parent UI login + `/api/parent/list-students` returns 12 AAA students with full_name + grade_level — runtime guard); [docs/FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) §B (Parent report short/detailed/PDF closed). |
| **Last known result** | Parent dashboard login + linked students listing exercised every nightly preflight; D2 orchestrator opens parent report from dashboard via real UI click; cross-student matrix `bleedOk=true` on the latest run. |
| **Remaining risks** | Owner manual browser smoke not signed in [docs/launch-readiness-checklist.md](./launch-readiness-checklist.md) (every parent-flow line is `unchecked`). |
| **Reopen rule** | Failing preflight (parent login, list-students missing AAA1–12); failing dashboard render in nightly. |
| **Watch (runtime guard)** | Nightly Phase D2 preflight (4 checks) before any UI is driven. |
| **Next action** | Owner-side: run [docs/launch-readiness-checklist.md](./launch-readiness-checklist.md) parent flow rows once before public rollout. Not a code task. |

### F. Parent Report

| Field | Value |
|-------|-------|
| **Status** | **CLOSED-WATCH** |
| **Evidence** | [docs/FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) §B (engine closed 2026-05-21); [reports/launch-readiness/2026-05-23/parent-report-truth-audit.md](../reports/launch-readiness/2026-05-23/parent-report-truth-audit.md) (full nightly source: `runKind=full`, `isFullNightlyRun=true`); primary artifact [reports/virtual-student-daily/2026-05-23/run-summary.json](../reports/virtual-student-daily/2026-05-23/run-summary.json) restored from `2026-05-23.zip`. |
| **Last known result** | **Re-classified 2026-05-23 (post full nightly):** 8 studied personas audited (AAA1, AAA3, AAA5, AAA6, AAA7, AAA9, AAA10, AAA11). **0 P0 blockers.** All 8: report artifacts present, identity pass, activity pass, cross-student bleed pass. AAA7 partial session (3/16 answers) is a **QA driver issue**, not a parent-report engine regression. |
| **Remaining risks** | Raw-key scan `unknown` for 7 personas (no text snapshot — screenshot-only MVP). Full DB / numeric accuracy audit still deferred. |
| **Reopen rule** | P0 in `parent-report-truth-audit`: raw keys present, cross-student bleed, HTTP ≠ 200, missing student name/activity. AAA7 partial driver outcome is **not** a reopen trigger. |
| **Watch (runtime guard)** | Nightly `parent-report-truth-audit.{md,json}` (E3). |
| **Next action** | None for engine. Optional: add text snapshots to nightly artifacts for reliable raw-key scan. |

### G. Parent Copilot / AI

| Field | Value |
|-------|-------|
| **Status** | **CLOSED** (deterministic launch path) **+ DEFERRED** (LLM live + short-report Copilot in production) |
| **Evidence** | [docs/parent-ai/final-status.md](./parent-ai/final-status.md) (Phases A–G closed; deterministic launch-ready; short-report Copilot **must remain off** in production until server-side snapshot ships); [docs/PARENT_COPILOT_ROLLOUT.md](./PARENT_COPILOT_ROLLOUT.md); [docs/parent-ai/copilot-turn-production.md](./parent-ai/copilot-turn-production.md); [docs/FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) §B (Parent Copilot deterministic grounding + launch-mode + B-suite/classifier/selftest battery). |
| **Last known result** | Deterministic Parent Copilot Q&A on detailed report = launch-ready. `/api/parent/copilot-turn` strict production refuses untrusted client payloads (HTTP 422). Short-report Copilot is implemented behind `NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT` and must stay **off** for launch. |
| **Remaining risks** | E8 nightly Copilot Truth audit (10 prompts × 12 personas) is `not_run` in the launch gate — by design; not a regression. Live LLM path is intentionally not certified for launch. |
| **Reopen rule** | Hallucination, raw key in Copilot output, scope leak, medical/psychological claim — observed in real run or in any future Copilot Truth audit. Anything else (style polish, Hebrew tone) is content QA, not engine reopen. |
| **Watch (runtime guard)** | E8 (`run-copilot-truth-prompts.mjs`) when implemented; until then, deterministic regression tests under `npm run test:parent-copilot-*`. |
| **Next action** | Keep `NEXT_PUBLIC_ENABLE_PARENT_COPILOT_ON_SHORT=false` in production. No engine work this pass. |

### H. Data Integrity

| Field | Value |
|-------|-------|
| **Status** | **CLOSED-WATCH** (MVP) **+ OPEN** (Full DB row-level audit deferred) |
| **Evidence** | [reports/launch-readiness/2026-05-23/data-integrity-audit.md](../reports/launch-readiness/2026-05-23/data-integrity-audit.md) (full nightly: `runKind=full`, `isFullNightlyRun=true`); [reports/virtual-student-daily/2026-05-23/run-summary.json](../reports/virtual-student-daily/2026-05-23/run-summary.json). |
| **Last known result** | **Re-classified 2026-05-23 (post full nightly):** **0 P0 blockers.** 8 students, 12 sessions: start 12/12 ok, answer 167/167 ok, finish 12/12 ok. Cross-student bleedFindings=0, state-advance pass. AAA7 partial (3 answers) — session integrity pass; driver early-exit at q4, not a data-integrity P0. |
| **Remaining risks** | Full DB row-level scan (orphans, duplicate finishes, cross-tenant rows) still deferred (E4-Full). Cross-device persistence unverified. |
| **Reopen rule** | P0: cross-student bleed; `session/finish` not saved; start≠finish on non-driver-known case. |
| **Watch (runtime guard)** | Nightly MVP `data-integrity-audit` (E4). |
| **Next action** | Schedule E4-Full (read-only Supabase scan) as separate scoped task when owner approves. Not an engine reopen. |

### I. Nightly 12-Student Simulation

| Field | Value |
|-------|-------|
| **Status** | **OPEN-WORKING** (primary full artifact landed; AAA7 repair + scheduler cadence remain) |
| **Evidence** | Primary: [reports/virtual-student-daily/2026-05-23/run-summary.json](../reports/virtual-student-daily/2026-05-23/run-summary.json) (`stage=full-run`, `studentLabelsFilter=null`, `expectedStudentLabels` AAA1–AAA12, `filteredOut=[]`) restored from [reports/virtual-student-daily/2026-05-23.zip](../reports/virtual-student-daily/2026-05-23.zip). **Do not use AAA7-only repair slice as the primary source.** Secondary AAA7 repair: follow-up QA-driver validation per [scripts/virtual-student-qa/KNOWN-ISSUES.md](../scripts/virtual-student-qa/KNOWN-ISSUES.md). Gate: [reports/launch-readiness/2026-05-23/LAUNCH_READINESS_DAILY.md](../reports/launch-readiness/2026-05-23/LAUNCH_READINESS_DAILY.md). |
| **Last known result** | **Re-classified 2026-05-23:** Real full nightly ran (Vercel, realtime, D2.5). Preflight 12/12 pass. Plan: 8 studied, 4 attendance-skipped (AAA2, AAA4, AAA8, AAA12). Suite: 7 pass, 1 partial (AAA7 english — `mcq-buttons-not-ready-q4`, known driver issue). `isFullNightlyRun=true`. Outcome `partial` — not a filtered run. |
| **Remaining risks** | AAA7 English driver repair must be validated in a secondary focused run. Task Scheduler multi-night cadence not yet confirmed. |
| **Reopen rule** | Do not duplicate nightly work in another plan. Re-evaluate after AAA7 repair artifact lands clean + scheduler runs. |
| **Watch (runtime guard)** | Phase D2 nightly + launch gate aggregator. |
| **Next action** | Complete AAA7 repair validation (secondary artifact only). Register Task Scheduler per [scripts/virtual-student-qa/docs/SCHEDULER-SETUP.md](../scripts/virtual-student-qa/docs/SCHEDULER-SETUP.md). |

### J. Public Site / Marketing Surface

| Field | Value |
|-------|-------|
| **Status** | **UNKNOWN / EVIDENCE-MISSING** (for marketing copy/SEO) **+ CLOSED-WATCH** (for route exposure) |
| **Evidence** | [docs/site-map-and-protection-audit.md](./site-map-and-protection-audit.md) §Public Routes (`/`, `/about`, `/contact`, `/gallery`, `/game`, mleo-* mini-games, offline games); [docs/auth-security-readonly-audit.md](./auth-security-readonly-audit.md) (dev/simulator routes flagged for production gating). |
| **Last known result** | Public route inventory exists. No dedicated launch QA report for marketing copy quality, SEO meta, OG images, public-page Hebrew tone, or `/contact` form behavior was found in this pass. |
| **Remaining risks** | Marketing copy, SEO meta, accessibility, and public-page mobile/RTL not certified by any signed gate visible to this pass. |
| **Reopen rule** | n/a (cannot reopen what was never closed). |
| **Watch (runtime guard)** | None currently. |
| **Next action** | Owner decision: is the launch a "controlled pilot" (where marketing surface is intentionally minimal) or a "public launch"? If the latter, a small dedicated public-surface QA pass is warranted. **Do not** roll this into the nightly virtual-student work. |

### K. Security / Privacy

| Field | Value |
|-------|-------|
| **Status** | **CLOSED-WATCH** (auth-security audit findings tracked) **+ partial OPEN** (a few pre-launch fixes still recommended) |
| **Evidence** | [docs/auth-security-readonly-audit.md](./auth-security-readonly-audit.md) (Critical: dev coin top-up + brute-force; High: engine-review status gating, public env flags in privileged controls, Copilot multi-auth modes); [docs/parent-ai/final-status.md](./parent-ai/final-status.md) (`/api/parent/copilot-turn` strict production refuses untrusted client payloads); [docs/site-map-and-protection-audit.md](./site-map-and-protection-audit.md) §"Routes That Must Never Be Public In Production". |
| **Last known result** | Audit identifies items that should be hardened before public exposure (e.g. `pages/api/student/dev-add-coins.js` hard-gate in production, student PIN brute-force rate-limit, replace `NEXT_PUBLIC_*` with server-only flags for dev/admin gates). RLS / service-role usage is documented but ownership-boundary tests are recommended. |
| **Remaining risks** | The audit is **read-only** — fixes are not yet implemented. For a pilot scope, owner may accept some items as documented risk; for a public launch, the Critical and High items should be addressed. |
| **Reopen rule** | New endpoint added without auth; failing ownership boundary check; secret leak. |
| **Watch (runtime guard)** | Nightly preflight verifies parent + student auth flows succeed. No automated rate-limit / brute-force guard yet. |
| **Next action** | Owner decision: accept-as-pilot vs harden-before-public. If hardening: small focused fix pass for dev routes + rate limits + token comparison. **Out of scope for this closure-control pass.** |

### L. Release Readiness

| Field | Value |
|-------|-------|
| **Status** | **OPEN-WORKING** |
| **Evidence** | [reports/launch-readiness/2026-05-23/LAUNCH_READINESS_DAILY.md](../reports/launch-readiness/2026-05-23/LAUNCH_READINESS_DAILY.md) (gate `NOT READY`, `runKind=full`, `isFullNightlyRun=true`); [docs/FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) (engineering cert 2026-05-21). |
| **Last known result** | **Re-classified 2026-05-23:** Gate verdict `NOT READY` — nightly `warn` (partial: AAA7 driver) + 5 E5 diagnostic-ground-truth P0 flags. **F and H have 0 P0** and remain CLOSED-WATCH (can move forward in closure terms). E5 P0 are MVP aggregator flags on coarse snapshot parsing — **not** authorization to reopen diagnostic engine without deeper evidence per [DO_NOT_REOPEN_WITHOUT_REGRESSION.md](./DO_NOT_REOPEN_WITHOUT_REGRESSION.md). |
| **Remaining risks** | Owner manual smoke unsigned; security hardening (K); mobile/RTL E9 `not_run`; AAA7 repair + scheduler cadence (I). |
| **Reopen rule** | Signed gate flips to fail with engine regression evidence; owner scope change. |
| **Watch (runtime guard)** | `LAUNCH_READINESS_DAILY` aggregator (E1). |
| **Next action** | Owner review of E5 P0 (artifact limitation vs real engine issue). AAA7 repair validation. Manual checklist. Pilot-vs-public for J/K. **No engine reopen.** |

### Deferred areas (intentionally out of current launch scope)

| Area | Status | Note |
|------|--------|------|
| Schools | **DEFERRED** | Not in product scope. Do not start. |
| Teachers / classroom management | **DEFERRED** | Not in product scope. Do not start. |
| New grades (G7+, K) | **DEFERRED** | Frozen at G1–G6. Do not start. |
| New subjects | **DEFERRED** | Frozen at six subjects. Do not start. |
| Major redesign / new large features | **DEFERRED** | Frozen for this launch. Do not start. |
| LLM live Parent Copilot in production | **DEFERRED** | Deterministic path is launch-ready; live LLM is a separate optional track per [docs/parent-ai/final-status.md](./parent-ai/final-status.md). |
| Short-report Copilot in production | **DEFERRED** | Stays `OFF` until server-side snapshot ships. |
| Child-world MVP coins/missions | **DEFERRED** | Tracked separately at [.cursor/plans/child_world_mvp_work_plan_35ce8c98.plan.md](../.cursor/plans/child_world_mvp_work_plan_35ce8c98.plan.md). Do not pull into launch. |
| Extra QA personas (AAA13/AAA14/QAX1/QAX2) | **DEFERRED** | E10 — only if real coverage gaps emerge after the full nightly. |
| Full DB row-level Supabase audit | **DEFERRED** | E4-Full layer; after MVP nightly stabilizes. |

---

## Summary table (one row per area)

| Area | Status | Watched by |
|------|--------|------------|
| A. Product Scope | CLOSED | — |
| B. Curriculum & Subjects | CLOSED-WATCH | `qa:question-metadata`, `qa:question-quality` |
| C. Question Quality | CLOSED-WATCH | `qa:question-metadata` (release gate) |
| D. Student Experience | CLOSED-WATCH | nightly Phase D2 + simulator release/critical-deep |
| E. Parent Dashboard | CLOSED-WATCH | nightly preflight (parent UI + list-students) |
| F. Parent Report | CLOSED-WATCH | nightly `parent-report-truth-audit` (E3) |
| G. Parent Copilot / AI | CLOSED (deterministic) + DEFERRED (LLM live + short-report production) | deterministic regression suites |
| H. Data Integrity | CLOSED-WATCH (MVP) + OPEN (Full DB scan deferred) | nightly `data-integrity-audit` (E4) |
| I. Nightly 12-Student Simulation | **OPEN-WORKING** (full artifact landed; AAA7 repair + scheduler remain) | Phase D2 nightly + launch gate |
| J. Public Site / Marketing | UNKNOWN / EVIDENCE-MISSING (copy/SEO) + CLOSED-WATCH (route exposure) | — |
| K. Security / Privacy | CLOSED-WATCH (audit) + partial OPEN (recommended fixes) | nightly preflight |
| L. Release Readiness | OPEN-WORKING (gate NOT READY; F/H 0 P0) | `LAUNCH_READINESS_DAILY` aggregator (E1) |

---

## What this pass did **not** do (by design)

- Did not rerun heavy QA (no `qa:learning-simulator:release`, no `qa:question-metadata` rerun).
- Did not change product behavior or Hebrew copy.
- Did not refactor any code.
- Did not modify the in-progress nightly simulation implementation.
- Did not create or delete student/parent accounts.
- Did not write to Supabase.
- Did not delete or reorganize old reports.
- Did not commit or push.

This document is **read-only mapping plus reopen rules**. All updates to closed areas require evidence per [DO_NOT_REOPEN_WITHOUT_REGRESSION.md](./DO_NOT_REOPEN_WITHOUT_REGRESSION.md).

---

## Owner-approved next execution protocol (2026-05-23)

**Current priority:** Continue/complete the in-progress full 12-student nightly track only. Area **I** remains `OPEN-WORKING` — do not classify PASS/FAIL yet; do not duplicate this work in another plan.

**When a real full nightly artifact exists** (`reports/virtual-student-daily/<YYYY-MM-DD>/run-summary.json`):

```bash
npm run qa:launch:daily-gate -- --date <YYYY-MM-DD>
```

**Re-classify only:** F (Parent Report), H (Data Integrity), I (Nightly 12-Student Simulation), L (Release Readiness).

**Do not touch (frozen):** product scope; subjects; question banks; diagnostic engine; parent report engine; deterministic Parent Copilot; 12 QA accounts / parent linkage; Hebrew UI/content; schools/teachers/new grades/new subjects; child-world MVP; LLM live; short-report Copilot in production.

**Post-run report must include:**
1. Whether it was a real 12/12 run.
2. Whether `isFullNightlyRun=true`.
3. Whether there were any P0 blockers.
4. Whether F/H/L can move forward.
5. Any remaining P1/P2 warnings, clearly separated from launch blockers.

Forward work only. No engine reopen.
