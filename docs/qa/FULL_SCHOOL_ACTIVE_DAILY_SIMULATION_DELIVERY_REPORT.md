# Full School Active Daily Simulation — Delivery Report

**Date:** 2026-05-28 (operator setup + full run)  
**Final status:** **PASS** (full hybrid pipeline, no skip flags)  
**Artifacts:** `reports/school-sim-daily/2026-05-28/`

---

## Operator setup (this run)

| Step | Result |
|------|--------|
| `.env.local` updated locally | **Yes** — merged `SCHOOL_QA_PASSWORD`, `DEMO_TEACHER_PASSWORD`, `DEMO_PARENT_PASSWORD`, `DEMO_STUDENT_PIN` from existing QA docs (values not recorded here) |
| Student credential artifact | **Yes** — `scripts/school-portal/.local/student-access-credentials.json` (gitignored) |
| Student credentials loaded | **397** (export-assume-seed-pin; one student without active access code in DB) |
| Preflight | **PASS** — staff password: yes; artifact: yes; count 397; UI sample ≥12: yes; baseline 108/398/2388: pass |
| Full simulation (`npm run qa:school:daily`) | **PASS** — exit 0, ~13 min |
| Secrets committed or printed | **No** |
| Commit / push | **No** |

**Helper used (gitignored):** `scripts/school-portal/.local/merge-env-from-docs.mjs` reads passwords from `docs/school-portal/FULL_SCHOOL_SIMULATION_PLAN.md` and student seed PIN hint from teacher delivery doc — nothing hardcoded in tracked source.

**Export fix:** `export-demo-student-credentials.mjs` batches Supabase `.in()` queries (398 IDs exceeded URL length).

---

## Credential model

| Actor | Auth model | Runtime source |
|-------|------------|----------------|
| Teachers / school manager | Email + password | `DEMO_TEACHER_PASSWORD` / `SCHOOL_QA_PASSWORD` in `.env.local` |
| Students (UI sample) | `login_username` + PIN per child | Gitignored `scripts/school-portal/.local/student-access-credentials.json` |
| Scaffolding parent | Email + password | `DEMO_PARENT_PASSWORD` — R1 sanity only |

Full operator notes: [SCHOOL_SIM_CREDENTIALS.md](./SCHOOL_SIM_CREDENTIALS.md)

---

## Preflight summary (2026-05-28)

```
staff password found: yes
student credential artifact found: yes
student credentials count: 397
enough credentials for UI sample (>=12): yes
baseline 108/398/2388: pass
```

---

## Full simulation results

| Phase | Result |
|-------|--------|
| Phase 1 DB sim | **PASS** — 108 activities, school day 16 |
| Phase 2 UI sample | **PASS** — 15/15 (per-student username+PIN from artifact) |
| Phase 3 Reports | **PASS** — R2/R4/R1 + isolation checks |
| R3 browser (Playwright) | **PASS** — 3/3 (`/learning/parent-report?source=teacher`) |

**Artifact root:** `reports/school-sim-daily/2026-05-28/`  
(`run-summary.json`, `run-summary.md`, `db-sim/`, `ui-sample/`, `report-validation/`)

---

## Test checklist T1–T14

| Test | Result | Notes |
|------|--------|-------|
| T1 | **PASS** | Dry-run / planner smoke |
| T2 | **PASS** | Preflight with UI cred requirements |
| T3 | **PASS** | DB simulator |
| T4 | **PASS** | 6 grades in plan |
| T5 | **PASS** | Activity modes |
| T6 | **PASS** | Topic catalog |
| T7 | **PASS** | 15/15 UI (full run artifact) |
| T8a–T8e | **PASS** | Report + R3 browser (full run) |
| T9 | **PASS** | Isolation (full run) |
| T10 | **PASS** | Scaffolding parent R1 (full run) |
| T11 | **PASS** | `run-summary.json` written |
| T12 | **PASS** | Idempotent skip on re-run same date |
| T13 | **PASS** | Reset activities helper |
| T14 | **PASS** | Launch gate: nightly **pass**, `isFullNightlyRun=true`; overall gate **PARTIAL** (coverage/truth layers not_run) |

`npm run qa:school:daily:selftest` without `--env-file` defers T7–T10; full pipeline run above satisfies them.

---

## Code touched (tracked, no secrets)

| File | Change |
|------|--------|
| `scripts/school-portal/export-demo-student-credentials.mjs` | Batched DB export |
| `scripts/school-portal/sim/preflight.mjs` | Summary block; non-throwing checks before summary |
| `scripts/school-portal/run-school-sim-nightly.mjs` | Preflight-only requires UI cred artifact |

---

## Constraints confirmed

- No new users or passwords invented in repo
- No secrets in tracked files or logs/reports
- `.env.local` and `scripts/school-portal/.local/` not committed
- No commit. No push.

---

## Signoff

Operator setup completed with known QA/demo credentials. Full school daily simulation **PASS** on 2026-05-28 with real student credential artifact and complete Phase 1–3 pipeline.
