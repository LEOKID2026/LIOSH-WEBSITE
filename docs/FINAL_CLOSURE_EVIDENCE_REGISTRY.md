# Final Closure Evidence Registry

**Record date:** 2026-05-23
**Document type:** Read-only registry of files/reports cited as evidence by [docs/FINAL_PRODUCT_CLOSURE_MAP.md](./FINAL_PRODUCT_CLOSURE_MAP.md).
**Purpose:** Single place to look up *which file proves what* and *what would be required to overturn it*.

> **Rule:** A closed area cannot be reopened without **a specific named file or live observation** that contradicts the evidence below. See [DO_NOT_REOPEN_WITHOUT_REGRESSION.md](./DO_NOT_REOPEN_WITHOUT_REGRESSION.md).

---

## Evidence kinds

| Kind | Meaning |
|------|---------|
| **gate report** | Output of an automated QA script in `reports/`; cited with date. |
| **doc** | Markdown signoff in `docs/`. |
| **plan** | `.cursor/plans/*.md` plan or status file. |
| **script** | Source script that *is* the runtime guard (e.g. preflight). |
| **inventory** | Static map (route map, persona table). |

---

## Area A — Product Scope

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| Full Launch Readiness Status | doc | [docs/FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) | Engineering certification limited to in-scope flows (parent + student, 6 subjects). |
| Launch Readiness Checklist | doc | [docs/launch-readiness-checklist.md](./launch-readiness-checklist.md) | Manual checklist limited to in-scope flows. No school/teacher rows. |
| Site map and protection audit | inventory | [docs/site-map-and-protection-audit.md](./site-map-and-protection-audit.md) | Route inventory contains only parent/student/learning surfaces. No teacher/school routes exist. |

**Counter-evidence required to reopen A:** owner sends a written scope-change request, OR new route appears in `pages/` outside the documented list.

---

## Area B — Curriculum & Subjects

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| Subject coverage readiness summary | doc | [docs/product-quality-phase-26-subject-content-readiness-summary.md](./product-quality-phase-26-subject-content-readiness-summary.md) | 12,157 rows across math, geometry, hebrew, english, science, geography × G1–G6. |
| Per-subject phase docs (8–30) | doc | [docs/product-quality-phase-8-subject-coverage-content-plan.md](./product-quality-phase-8-subject-coverage-content-plan.md), phases 9–13 (science), 14–15 (English), 16–17 (geometry), 18–19 (math), 20–23 (Hebrew), 24–30 (English expansion) | Per-subject audits + representation fixes signed. |
| Hebrew Perfect Close + True Done | doc | [docs/hebrew-current-status.md](./hebrew-current-status.md), [docs/hebrew-perfect-close-handoff.md](./hebrew-perfect-close-handoff.md), [docs/hebrew-true-done-handoff.md](./hebrew-true-done-handoff.md) | Hebrew curriculum signed (with documented exclusions: long free writing, audio). |
| Question bank professional QA plan | doc | [docs/question-bank-professional-qa-plan.md](./question-bank-professional-qa-plan.md) | Per-subject QA standard. |
| Curriculum audit | doc | [docs/curriculum-audit.md](./curriculum-audit.md) | Subject/grade matrix. |
| Question bank inventory gate | gate report | reports under `reports/question-bank-inventory/question-bank-inventory.json` | Latest signed run cited in [FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) §B: `REAL_BLOCKER_VISIBLE: 0`. |

**Counter-evidence required to reopen B:** new failing run of `node scripts/question-bank-inventory-gate.mjs` with a non-zero `REAL_BLOCKER_VISIBLE`, OR a per-subject phase doc gets re-signed with a blocker.

---

## Area C — Question Quality

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| Question metadata QA doc | doc | [docs/question-metadata-qa.md](./question-metadata-qa.md) | Release gate policy. |
| Question metadata final stabilization | doc | [docs/question-metadata-final-stabilization.md](./question-metadata-final-stabilization.md) | Latest taxonomy/registry alignment signoff. |
| Unified question schema | doc | [docs/UNIFIED_QUESTION_SCHEMA.md](./UNIFIED_QUESTION_SCHEMA.md) | Schema source of truth. |
| Question metadata taxonomy | doc | [docs/question-metadata-taxonomy.md](./question-metadata-taxonomy.md) | Active taxonomy registry. |
| Question metadata gate (latest) | gate report | `reports/question-metadata-qa/summary.json` (when present from `npm run qa:question-metadata`) | `gateDecision: pass_with_advisory`, blocking count 0 per [FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) §B. |

**Counter-evidence required to reopen C:** any future `gateDecision: fail_blocking_metadata`, or any `qa:student-question-stem-metadata` failure showing raw key leak.

---

## Area D — Student Experience

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| Learning simulator release / full | gate report | `reports/learning-simulator/orchestrator/run-summary.json` | 43-step orchestrator PASS. |
| Critical-deep simulator | gate report | `reports/learning-simulator/critical-matrix-deep.json` | 108 scenarios, 0 failures. |
| Profile-stress simulator | gate report | `reports/learning-simulator/profile-stress.json` | 112 scenarios, 0 failures. |
| Deep simulator | gate report | `reports/learning-simulator/deep/run-summary.json` | Longitudinal scenarios PASS. |
| Site map (student pages) | inventory | [docs/site-map-and-protection-audit.md](./site-map-and-protection-audit.md) §Student-Facing Pages | All 6 `*-master` pages + `/student/home`, arcade, games. |
| Real-UI virtual-student runner plan | plan | [.cursor/plans/real_ui_virtual_student_qa_runner_323742ea.plan.md](../.cursor/plans/real_ui_virtual_student_qa_runner_323742ea.plan.md) | Phase A–D closed; multi-student multi-subject real-UI persistence proven. |
| QA driver fix log | doc | [scripts/virtual-student-qa/KNOWN-ISSUES.md](../scripts/virtual-student-qa/KNOWN-ISSUES.md) | English typing + double-advance fixes 2026-05-22/23 are **driver-only**, no product change. |

**Counter-evidence required to reopen D:** failing release/critical-deep/profile-stress simulator, OR failing `*-master` page in nightly, OR cross-student bleed in nightly.

---

## Area E — Parent Dashboard

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| Daily preflight | script | [scripts/virtual-student-qa/lib/daily-preflight.mjs](../scripts/virtual-student-qa/lib/daily-preflight.mjs) | Runtime guard: parent UI login + `/api/parent/list-students` returns 12 AAA students with full_name + grade_level + each can student-login. |
| Parent dashboard helper | script | `scripts/virtual-student-qa/lib/parent-dashboard.mjs` (referenced by D2 plan) | Real UI click → student → parent report. |
| Site map (parent pages) | inventory | [docs/site-map-and-protection-audit.md](./site-map-and-protection-audit.md) §Parent-Facing Pages | 3 parent pages enumerated. |
| 2026-05-23 parent-report truth | gate report | [reports/launch-readiness/2026-05-23/parent-report-truth-audit.md](../reports/launch-readiness/2026-05-23/parent-report-truth-audit.md) | AAA7 cross-student bleed `pass`; activity evidence `pass`; identity `pass`. |

**Counter-evidence required to reopen E:** failing nightly preflight, OR failing dashboard render, OR cross-student row.

---

## Area F — Parent Report

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| Parent report system map | doc | [docs/PARENT_REPORT.md](./PARENT_REPORT.md) | Pipeline layers + ownership. |
| Parent report engine | doc | [docs/PARENT_REPORT_ENGINE.md](./PARENT_REPORT_ENGINE.md) | Engine merge precedence + Phase 15 UI consolidation. |
| QA calibration / red-team log | doc | [docs/PARENT_REPORT_QA_CALIBRATION.md](./PARENT_REPORT_QA_CALIBRATION.md) | Red-team coverage. |
| Editorial signoff | doc | [docs/PARENT_REPORT_EDITORIAL_SIGNOFF.md](./PARENT_REPORT_EDITORIAL_SIGNOFF.md) | Hebrew copy signoff. |
| Hebrew style guide | doc | [docs/PARENT_REPORT_HEBREW_STYLE_GUIDE.md](./PARENT_REPORT_HEBREW_STYLE_GUIDE.md) | Style rules. |
| Text source map | doc | [docs/PARENT_REPORT_TEXT_SOURCE_MAP.md](./PARENT_REPORT_TEXT_SOURCE_MAP.md) | Where each Hebrew string lives. |
| Diagnostic engine V2 | doc | [docs/DIAGNOSTIC_ENGINE_V2.md](./DIAGNOSTIC_ENGINE_V2.md) | Engine spec. |
| Parent PDF QA matrix | doc | [docs/pdf-qa-matrix.md](./pdf-qa-matrix.md) | PDF gate spec. |
| Parent PDF gate (latest) | gate report | `reports/learning-simulator/pdf-export-gate.json` + `qa-visual-output/parent-*.pdf` | PDF export PASS. |
| 2026-05-23 parent-report truth audit | gate report | [reports/launch-readiness/2026-05-23/parent-report-truth-audit.md](../reports/launch-readiness/2026-05-23/parent-report-truth-audit.md) | MVP truth audit `warn` only because nightly was filtered to AAA7. 0 P0 blockers; 2 P1 (filtered run + missing text snapshot). For AAA7: identity `pass`, activity `pass`, cross-student `pass`. |

**Counter-evidence required to reopen F:** P0 in any future `parent-report-truth-audit`: raw keys present, cross-student bleed, HTTP ≠ 200, or missing student name/activity. P1 from a filtered nightly is **not** a reopen trigger.

---

## Area G — Parent Copilot / AI

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| Parent AI final status (Phases A–G) | doc | [docs/parent-ai/final-status.md](./parent-ai/final-status.md) | Deterministic launch-ready; short-report Copilot **must remain off** in production until server snapshot ships. |
| Parent Copilot rollout | doc | [docs/PARENT_COPILOT_ROLLOUT.md](./PARENT_COPILOT_ROLLOUT.md) | Rollout flags + stages. |
| Copilot-turn production | doc | [docs/parent-ai/copilot-turn-production.md](./parent-ai/copilot-turn-production.md) | Strict production refuses untrusted client payload (HTTP 422). |
| Parent AI current state | doc | [docs/parent-ai/current-state.md](./parent-ai/current-state.md) | Phase A audit. |
| Hybrid reviewer / engine | doc | [docs/AI_HYBRID_REVIEWER.md](./AI_HYBRID_REVIEWER.md), [docs/AI_HYBRID_ENGINE.md](./AI_HYBRID_ENGINE.md) | Validator pipeline. |
| Existing AI system audit | doc | [docs/existing-ai-system-intelligence-audit.md](./existing-ai-system-intelligence-audit.md) | Baseline audit. |
| Deterministic Copilot grounding (latest) | gate report | per `npm run qa:parent-copilot:mass` + `npx tsx scripts/parent-copilot-final-grounding-simulation.mjs` | Mass + final grounding PASS per [FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) §B/D. |

**Counter-evidence required to reopen G:** observed hallucination, raw key, scope leak, or medical/psychological claim in any Copilot output (live or recorded).

---

## Area H — Data Integrity

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| Data integrity audit script (MVP) | script | [scripts/launch-readiness/build-data-integrity-audit.mjs](../scripts/launch-readiness/build-data-integrity-audit.mjs) | start=finish, 0 fail/blocked, cross-student bleedFindings, state-advance check. |
| 2026-05-23 data integrity audit | gate report | [reports/launch-readiness/2026-05-23/data-integrity-audit.md](../reports/launch-readiness/2026-05-23/data-integrity-audit.md) | overallStatus=`warn` (filtered run); for AAA7: start 1/1 ok, answer 16/16 ok, finish 1/1 ok, cross-student `pass`, state-advance `pass`. |
| D2 cross-student bleed classifier | script | `scripts/virtual-student-qa/lib/phase-d2-orchestrator.mjs` (referenced by D2 plan) | Cross-student bleed checked every nightly. |
| Phase 1 Supabase foundation report | doc | [docs/PHASE1_SUPABASE_FOUNDATION_REPORT.md](./PHASE1_SUPABASE_FOUNDATION_REPORT.md) | Schema + RLS baseline. |

**Counter-evidence required to reopen H (P0):** cross-student answer event in nightly log; `session/finish` not saved; start≠finish on a non-driver-known case.

---

## Area I — Nightly 12-Student Simulation (OPEN-WORKING)

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| D2 daily simulator plan | plan | [.cursor/plans/phase-d2-daily-simulator_27839697.plan.md](../.cursor/plans/phase-d2-daily-simulator_27839697.plan.md) | D2 orchestrator implemented; validation gate 1 ✅; gates 2/3/4 owner-side pending. |
| Nightly Task Scheduler wrapper | script | [scripts/virtual-student-qa/scripts/run-nightly.ps1](../scripts/virtual-student-qa/scripts/run-nightly.ps1) | PS1 wrapper for `schtasks` install pending. |
| Scheduler setup runbook | doc | [scripts/virtual-student-qa/docs/SCHEDULER-SETUP.md](../scripts/virtual-student-qa/docs/SCHEDULER-SETUP.md) | Owner-side install steps. |
| Personas table | inventory | [scripts/virtual-student-qa/scenarios/student-personas.mjs](../scripts/virtual-student-qa/scenarios/student-personas.mjs) | AAA1–AAA12, 2 per grade, weakness/strength/evolution metadata. |
| Daily preflight | script | [scripts/virtual-student-qa/lib/daily-preflight.mjs](../scripts/virtual-student-qa/lib/daily-preflight.mjs) | Aborts day if any of 4 prerequisites fails before driving UI. |
| Latest daily run | gate report | [reports/launch-readiness/2026-05-23/LAUNCH_READINESS_DAILY.md](../reports/launch-readiness/2026-05-23/LAUNCH_READINESS_DAILY.md) | `PARTIAL` because the 2026-05-23 nightly is `runKind=filtered` (AAA7 only). 0 P0 blockers. **Do not interpret this as failure.** |
| Launch Readiness Master Plan | plan | [.cursor/plans/launch_readiness_qa_master_plan_9756f606.plan.md](../.cursor/plans/launch_readiness_qa_master_plan_9756f606.plan.md), [docs/LAUNCH_READINESS_QA_MASTER_PLAN.md](./LAUNCH_READINESS_QA_MASTER_PLAN.md) | E0–E5 implemented; E6–E11 pending. |
| Aggregator scripts | script | [scripts/launch-readiness/build-launch-readiness-daily.mjs](../scripts/launch-readiness/build-launch-readiness-daily.mjs), [scripts/launch-readiness/build-coverage-matrix.mjs](../scripts/launch-readiness/build-coverage-matrix.mjs), [scripts/launch-readiness/build-parent-report-truth-audit.mjs](../scripts/launch-readiness/build-parent-report-truth-audit.mjs), [scripts/launch-readiness/build-data-integrity-audit.mjs](../scripts/launch-readiness/build-data-integrity-audit.mjs), [scripts/launch-readiness/build-diagnostic-ground-truth-report.mjs](../scripts/launch-readiness/build-diagnostic-ground-truth-report.mjs) | Aggregators E1–E5. |

**Status note:** This area is **OPEN-WORKING**. It is not the role of this closure-control pass to mark it pass/fail or to expand it.

---

## Area J — Public Site / Marketing Surface

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| Site map | inventory | [docs/site-map-and-protection-audit.md](./site-map-and-protection-audit.md) §Public Routes | Public routes enumerated: `/`, `/about`, `/contact`, `/gallery`, `/game`, mleo-* mini-games, offline games. |
| Auth-security audit | doc | [docs/auth-security-readonly-audit.md](./auth-security-readonly-audit.md) | Dev/simulator routes flagged for production gating. |

**Evidence gap:** no signed gate for marketing copy quality, SEO meta, OG images, public-page Hebrew tone, accessibility, or `/contact` form behavior was found in this pass. Mark **EVIDENCE-MISSING** for the marketing-copy slice.

---

## Area K — Security / Privacy

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| Auth-security read-only audit | doc | [docs/auth-security-readonly-audit.md](./auth-security-readonly-audit.md) | Critical: dev coin top-up + brute-force; High: engine-review status gating, public env flags in privileged controls, Copilot multi-auth modes; Medium: unauthenticated Hebrew utility endpoints, broad service-role usage, token comparison. |
| Site map (must-be-protected routes) | inventory | [docs/site-map-and-protection-audit.md](./site-map-and-protection-audit.md) §"Routes That Must Never Be Public In Production" | Lists `/api/parent/*`, `/api/student/dev-add-coins`, dev-simulator/admin routes. |
| Copilot strict production | doc | [docs/parent-ai/copilot-turn-production.md](./parent-ai/copilot-turn-production.md) | HTTP 422 for untrusted client payloads. |
| Parent AI rollout flags | doc | [docs/PARENT_COPILOT_ROLLOUT.md](./PARENT_COPILOT_ROLLOUT.md) | Documented env flag posture. |

**Counter-evidence required to reopen K:** new endpoint without auth; failing ownership boundary check; secret leak. Implementing the recommended fixes is forward work, not a reopen.

---

## Area L — Release Readiness

| Evidence | Kind | Path | What it proves |
|----------|------|------|----------------|
| Full Launch Readiness Status | doc | [docs/FULL_LAUNCH_READINESS_STATUS.md](./FULL_LAUNCH_READINESS_STATUS.md) | Engineering certification YES (2026-05-21). |
| Manual launch-readiness checklist | doc | [docs/launch-readiness-checklist.md](./launch-readiness-checklist.md) | Owner-side rows currently `unchecked`. |
| Release checklist | doc | [docs/release-checklist.md](./release-checklist.md) | Wording/PDF/manual matrices reopen status. |
| Final verdict | doc | [docs/final-verdict.md](./final-verdict.md) | Older bundled verdict (predates 2026-05-21 cert). |
| Final verification pack | doc | [docs/final-verification-pack.md](./final-verification-pack.md) | Required artifacts list. |
| LAUNCH_READINESS_DAILY (latest) | gate report | [reports/launch-readiness/2026-05-23/LAUNCH_READINESS_DAILY.md](../reports/launch-readiness/2026-05-23/LAUNCH_READINESS_DAILY.md) | Aggregator verdict `PARTIAL` (0 P0); reason = filtered nightly. |

---

## How to add a new evidence row

1. Add an entry to the right area table above.
2. Cite the file with a relative link from this doc.
3. State *what it proves* in one short sentence — not what it does in general.
4. If the evidence is a gate report, include the date.
5. If the evidence is a doc that has been re-signed, update the linked doc's "Last updated" line; don't fork it.
6. **Do not** add evidence rows that are themselves unverified hypotheses.

---

## How to remove an evidence row

Only remove if:

- The cited file was deleted (and the area should be re-classified — flag in the closure map).
- The cited file was superseded by a newer signed file (link the newer file).
- The cited file was found to be wrong (treat as a regression — open a follow-up).

Never silently remove evidence to make an area look more closed than it is.
