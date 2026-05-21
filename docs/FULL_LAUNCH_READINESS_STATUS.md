# Full Launch Readiness — Certified Status Record

**Record date:** 2026-05-21  
**Scope:** Engineering certification via automated QA gates and simulator harnesses (not a substitute for owner manual browser smoke before public rollout).

**Related docs (detail, not duplicated here):**

- [`learning-simulator-qa.md`](./learning-simulator-qa.md) — simulator tiers, orchestrator steps, env vars
- [`question-metadata-qa.md`](./question-metadata-qa.md) — metadata gate policy
- [`parent-ai/final-status.md`](./parent-ai/final-status.md) — Parent AI / Copilot rollout modes
- [`launch-readiness-checklist.md`](./launch-readiness-checklist.md) — manual product-flow checklist (orthogonal to this certification)

**Generated artifacts (do not paste into this doc):** summaries under `reports/`, `qa-visual-output/`, and per-gate JSON/MD files listed in section F.

---

## A. Executive status

| Item | Status |
|------|--------|
| **Full Launch Readiness** | **YES** (automated certification battery) |
| **Certified launch mode** | **Deterministic Parent Copilot** + deterministic Parent AI insight on reports |
| **LLM for launch** | **Not required** — gated off by default; live LLM soak is a separate optional track |
| **Production Copilot default** | Client payloads not trusted in strict production; short-report Copilot remains env-gated OFF until server snapshot (see parent-ai docs) |

---

## B. Closed layers

All layers below passed the final certification run unless noted as informational only.

| Layer | Certification |
|-------|----------------|
| Question bank coverage (calibrated inventory) | `REAL_BLOCKER_VISIBLE: 0` |
| Diagnostic / question metadata (release gate) | `gateDecision: pass_with_advisory`, 0 blocking |
| Question volume / release alignment | `qa:questions:release` |
| Science generated volume quality | NEEDS_MORE / generator path closed in prior passes |
| Science legacy duplicate-density | Phase 4b1 dedupe / density gates |
| Student question stem sanitizer | No metadata leaks in student-facing stems |
| Diagnostic Engine V2 | Harness + simulator engine truth |
| Probe evidence → report → Copilot | Phase 1B + probe QA |
| Adaptive weakness-specific follow-up | All-subject certification matrix |
| Hebrew g3 bank tail | Import path + archive alignment |
| Parent report short/detailed consistency | Final simulation scenarios |
| Thin-data report polish | Report contracts + simulator thin profiles |
| Parent PDF export | Phase C.1 Playwright + print fingerprint |
| Parent Copilot deterministic grounding | Final grounding simulation + mass QA |
| Parent Copilot launch-mode (deterministic) | B-suite / classifier / selftest battery |
| Learning simulator quick | Orchestrator quick (7 steps) |
| Learning simulator deep | 12/12 longitudinal scenarios |
| Learning simulator critical-deep | 108 scenarios, 0 failures |
| Learning simulator profile-stress | 112 scenarios, 0 failures |
| Learning simulator release / full | 43-step orchestrator PASS |
| Build / deploy readiness | `npm run build` PASS |

---

## C. Key fixes completed (summary)

| Area | What was fixed |
|------|----------------|
| Science content | NEEDS_MORE closure + volume generator quality |
| Science metadata | Duplicate-density / phase4b1 dedupe alignment |
| English | Grammar metadata + E2E display closure |
| Moledet | Probe parity with diagnostic contract |
| Hebrew g3 | Bank import path (`g3.js` module path only — no stem edits) |
| Student stems | Prefix/metadata leak sanitizer |
| Metadata release gate | Taxonomy registry aligned with enriched bank `expectedErrorTypes`; `intermediate` difficulty; geometry/hebrew skill allowlists |
| Parent PDF QA | Regression `localStorage` snapshot + init-script apply fix; `period=month` |
| criticalDeep / profile-stress | Thin session caps; thin Q/session band; cautious-tone + short Hebrew topic label detection in **harness only** |
| Geometry generator | g4 `shapes_basic` variant index wrap (`g4w % 3`) — empty stem bug |
| Learning simulator quick | Grade-aware `topicBucketKeys` matching in behavior harness |
| Parent Copilot | B-suite and deterministic grounding closure |
| Adaptive planner | All-subject weakness follow-up certification |

No diagnostic thresholds, report/Copilot product copy, or question-bank Hebrew stems were changed for this certification record.

---

## D. Final commands that passed

Compact certification battery (run from repo root). Orchestrator summary: `reports/learning-simulator/orchestrator/run-summary.json`.

### Questions & metadata

| Command | Role |
|---------|------|
| `node scripts/question-bank-inventory-gate.mjs` | Calibrated visibility inventory |
| `npm run qa:question-metadata` | Blocking metadata gate |
| `npm run qa:student-question-stem-metadata` | Stem metadata leak scan |
| `npm run qa:questions:release` | Student questions release (includes inventory + e2e when dev available) |
| `npm run qa:question-quality` | Quality audit budget |
| `npm run qa:session-question-variety` | Session variety scenarios |
| `npm run test:e2e:question-display` | Playwright 6-subject display closure |

### Diagnostic & adaptive

| Command | Role |
|---------|------|
| `npm run test:diagnostic-engine-v2-harness` | Diagnostic Engine V2 scenarios |
| `npm run qa:learning-simulator:probes` | Probe-engine QA |
| `node scripts/adaptive-weakness-followup-certification.mjs` | Adaptive follow-up matrix |

### Parent report & Copilot

| Command | Role |
|---------|------|
| `node scripts/parent-report-phase1-selftest.mjs` | Phase 1 report pipeline |
| `node scripts/probe-evidence-to-copilot-qa.mjs` | Probe → Copilot redaction |
| `npx tsx scripts/parent-report-consistency-final-simulation.mjs` | Short/detailed consistency |
| `npx tsx scripts/parent-copilot-final-grounding-simulation.mjs` | Copilot grounding turns |
| `npm run test:parent-copilot-qa` | Copilot selftest suite |
| `npm run qa:parent-copilot:mass` | Mass deterministic simulation |
| `npm run qa:parent-pdf-export` | Standalone PDF export gate |

### Learning simulator

| Command | Role |
|---------|------|
| `npm run qa:learning-simulator:quick` | Quick orchestrator (7 steps) |
| `npm run qa:learning-simulator:deep` | Deep longitudinal suite |
| `npm run qa:learning-simulator:critical-deep` | Critical matrix deep assertions |
| `npm run qa:learning-simulator:profile-stress` | Synthetic profile stress |
| `npm run qa:learning-simulator:release` | **Full** orchestrator (43 steps) — same as `:full` |
| `npm run qa:learning-simulator:full` | Alias of release |

### Build

| Command | Role |
|---------|------|
| `npm run build` | Next.js production build |

**Note:** `qa:learning-simulator:release` and `qa:learning-simulator:full` invoke the same `run-orchestrator.mjs full` pipeline.

---

## E. Operational notes

### Dev server for browser gates

These steps expect **one healthy** Next dev server on **port 3001**:

- `npm run dev` (see `package.json` — default port 3001)
- `npm run qa:learning-simulator:release` / `:full` (render + PDF export steps)
- `npm run qa:parent-pdf-export`
- `npm run test:e2e:question-display` (Playwright `reuseExistingServer` uses existing listener when not in CI)

**Avoid:** stale process on 3001 returning 404/500 after a production `build` killed dev, or EADDRINUSE from double-starting dev.

Optional env (orchestrator / gates):

```powershell
$env:RENDER_GATE_TRUST_EXISTING_SERVER='1'
$env:PDF_GATE_TRUST_EXISTING_SERVER='1'
$env:QA_BASE_URL='http://127.0.0.1:3001'
```

### LLM

- Launch certification used **deterministic** Copilot/report paths.
- Keep production LLM flags **off** unless running a deliberate live soak (`qa:parent-copilot:live-*` scripts — separate from launch certification).

### Reports directory

- `reports/` and `qa-visual-output/` are **generated**; not required in git unless intentionally pinned for audit trails.

### Manual smoke

- Owner should still run manual browser smoke (auth, parent dashboard, student practice, print) before real public rollout. See [`launch-readiness-checklist.md`](./launch-readiness-checklist.md).

---

## F. Remaining non-blocking notes

| Item | Severity | Notes |
|------|----------|--------|
| Metadata advisories | Informational | e.g. `missing_prerequisite_skill_ids`, `implicit_id_only`, `missing_explanation` — gate exits 0 with advisories |
| Professional inventory matrix | Informational | `NEEDS_AUTHORING` counts in matrix; not `REAL_BLOCKER_VISIBLE` |
| Moledet session variety | Informational | One THIN cell still passes variety thresholds |
| Parent Copilot LLM path | Future | Live LLM enhancement / soak separate from deterministic launch cert |
| Short-report Copilot in production | Config | Keep off until server snapshot per [`parent-ai/final-status.md`](./parent-ai/final-status.md) |

### Useful report paths (reference only)

| Gate | Typical summary path |
|------|----------------------|
| Question metadata | `reports/question-metadata-qa/summary.json` |
| Inventory | `reports/question-bank-inventory/question-bank-inventory.json` |
| critical-deep | `reports/learning-simulator/critical-matrix-deep.json` |
| profile-stress | `reports/learning-simulator/profile-stress.json` |
| Deep | `reports/learning-simulator/deep/run-summary.json` |
| Release orchestrator | `reports/learning-simulator/orchestrator/run-summary.json` |
| Render | `reports/learning-simulator/render-release-gate.json` |
| PDF export (simulator) | `reports/learning-simulator/pdf-export-gate.json` |
| Standalone parent PDF | `qa-visual-output/parent-*.pdf` |

---

## G. How to re-run launch certification

### Prerequisites

1. Node dependencies installed (`npm ci` or `npm install`).
2. Start dev once: `npm run dev` (port **3001**).
3. In PowerShell (optional but recommended for release/PDF):

```powershell
$env:RENDER_GATE_TRUST_EXISTING_SERVER='1'
$env:PDF_GATE_TRUST_EXISTING_SERVER='1'
$env:QA_BASE_URL='http://127.0.0.1:3001'
```

### Minimal path (fast signal)

```bash
npm run qa:learning-simulator:quick
npm run qa:question-metadata
npm run qa:student-question-stem-metadata
npm run qa:learning-simulator:critical-deep
npm run qa:learning-simulator:profile-stress
```

### Full launch certification (authoritative)

```bash
npm run qa:learning-simulator:release
```

Then run the core non-orchestrator battery (or rely on steps already inside release where duplicated):

```bash
npm run qa:questions:release
npm run test:e2e:question-display
npm run test:diagnostic-engine-v2-harness
npx tsx scripts/parent-report-consistency-final-simulation.mjs
npx tsx scripts/parent-copilot-final-grounding-simulation.mjs
npm run test:parent-copilot-qa
npm run qa:parent-copilot:mass
node scripts/adaptive-weakness-followup-certification.mjs
npm run qa:parent-pdf-export
npm run build
```

### Success criteria

- `qa:question-metadata`: `gateDecision` not `fail_blocking_metadata`; blocking count **0**
- `qa:learning-simulator:critical-deep` / `profile-stress`: `"ok": true`, `"failures": 0`
- `qa:learning-simulator:release`: orchestrator **Finished: PASS**
- `qa:parent-pdf-export`: exits 0; writes under `qa-visual-output/`
- `npm run build`: completes without error

### If release fails on render or PDF

1. Confirm `http://127.0.0.1:3001/` returns 200 (not 404/500).
2. Restart: stop PID on 3001, `npm run dev`, wait for Ready.
3. Re-run with trust-existing-server env vars above.

---

## Document history

| Date | Change |
|------|--------|
| 2026-05-21 | Initial certified status record after Full Launch Readiness closure |
