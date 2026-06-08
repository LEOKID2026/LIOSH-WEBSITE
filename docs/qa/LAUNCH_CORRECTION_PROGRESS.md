# Launch Correction — Progress Checkpoint

**Checkpoint date:** 2026-06-08  
**Status:** **SAFE PAUSE** — Phases 1–3C complete and verified. Phase 4 not started.  
**Master plan:** [`LAUNCH_CORRECTION_MASTER_PLAN.md`](LAUNCH_CORRECTION_MASTER_PLAN.md)

---

## Completed phases

### Phase 1 — Central launch-readiness SSOT ✓

- `lib/launch-readiness/*` implemented; `data/launch-readiness/topic-launch-registry.json` seeded (255 rows).
- Teacher/classroom topic pickers read launch policy.
- `scripts/qa/verify-topic-launch-policy.mjs` + `tests/learning/launch-readiness-policy.test.mjs` pass.
- **No** `lib/parent-server/` consumption of launch-readiness.
- Diagnostic metadata flags remain **OFF**.

### Phase 2 + 2B — Critical blockers + verification cleanup ✓

- `CRITICAL_BLOCKING`: **0** (was 5).
- `math:g4:prime_composite` — 4-option MCQs; promoted per policy.
- `geometry:g1/g2:transformations` — no longer blocking.
- MCQ obvious-answer audit: **PASS**.
- Question-bank integrity audit: **PASS** (0 `leakRisk`).
- Assigned-activity topic availability issue resolved.
- Build passes.

### Phase 3 — Hebrew G1/G2 literacy path (directional) ✓

- Hebrew G1 soft book-first path (`lib/learning-book/hebrew-g1-literacy-progress.js`, `pages/learning/hebrew-master.js`).
- G1/G2 literacy banks merged via `data/hebrew-literacy-g1/`, `data/hebrew-literacy-g2/`.
- Hebrew G1 audio path verified (existing manifest; no new generation).
- Hebrew G2 audio **not** generated.
- Writing/speaking remain `PRACTICE_ONLY` / `manual_only`.

### Phase 3B — Hebrew completion + integrity cleanup ✓

- Question-bank integrity: **PASS** (154 Hebrew `leakRisk` → 0).
- G1/G2 comprehension + grammar scoped inventory targets closed.
- Registry/matrix rebuilt; audits green.

### Phase 3C — Hebrew G2 reading easy micro-close ✓

- `hebrew:g2:reading:easy`: **44 → 55** usable unique (target ≥50).
- All G1/G2 reading/comprehension/grammar per-level targets now at or above 50/40/30.
- Integrity + MCQ audits **PASS**; `CRITICAL_BLOCKING: 0`; build passes.

---

## Hebrew G1/G2 inventory snapshot (post–3C)

| Grade | Topic | easy | medium | hard |
|-------|-------|-----:|-------:|-----:|
| G1 | reading | 166 | 69 | 45 |
| G1 | comprehension | 77 | 53 | 33 |
| G1 | grammar | 61 | 44 | 35 |
| G2 | reading | **55** | 50 | 38 |
| G2 | comprehension | 54 | 43 | 32 |
| G2 | grammar | 55 | 42 | 40 |

Source: `reports/question-audit/QUESTION_INVENTORY_MATRIX.csv` (2026-06-08).

---

## Constraints still in force

| Constraint | Status |
|------------|--------|
| SQL / migrations | No changes |
| Parent report behavior | No changes |
| Diagnostic flags (`DIAGNOSTIC_METADATA_*`) | **OFF** |
| English Phase 4 | **Not started** |
| Audio generation | Hebrew G1 verify only; no G2/English generation |
| Public marketing / homepage / curriculum copy | No changes |
| UI redesign | No changes |

---

## Safe pause point — next step (not started)

**Phase 4A — English G1/G2 phonics content map** opens only after explicit owner approval.

Planning-only deliverable (no implementation, no audio generation):

- Letters/sounds scope
- Book page list
- Question types
- Audio script text
- Audio manifest structure

Required artifact before Phase 4B: `docs/qa/ENGLISH_G1_G2_PHONICS_CONTENT_MAP.md` (not yet written).

**Do not** implement Phase 4 or generate English audio until separately approved.

---

## Verification commands (last green run)

```powershell
node --test tests/learning/launch-readiness-policy.test.mjs
node --test tests/learning/hebrew-g1-literacy-progress.test.mjs
node --test tests/learning/hebrew-g1-literacy-bank.test.mjs
node --test tests/learning/hebrew-g2-bank-coverage.test.mjs
npx tsx scripts/qa/verify-topic-launch-policy.mjs
npx tsx scripts/qa/launch-readiness-matrix.mjs
npm run qa:question-inventory-matrix
npx tsx scripts/qa/system-health-mcq-option-count-audit.mjs
npx tsx scripts/qa/system-health-mcq-obvious-answer-risk-audit.mjs
npx tsx scripts/qa/system-health-question-bank-integrity-audit.mjs
npm run build
```

---

## Phases not started

| Phase | Scope | Status |
|-------|-------|--------|
| **4A** | English G1/G2 phonics content map | **Paused** — awaiting approval |
| **4B** | English book pages, banks, manifest, audio | **Not started** |
| **5** | Hebrew G3–G6 expansion | Not started |
| **6** | English G3–G6 expansion | Not started |
| **7** | Geometry / Science / Moledet depth | Not started |
| **8** | Final launch QA gate | Not started |

---

## Diagnostic Visible Impact Addendum — 2026-06-08

**Launch Correction progress (this document) is unchanged:** Phases 1–3C content/inventory work stands as recorded above. English Phase 4 has **not started**.

**Separate track — Diagnostic Flags Visible Impact (parent report):**

| Gate | Result |
| --- | --- |
| Build | PASS |
| Regression | PASS |
| Browser QA | PASS |
| PDF QA | PASS |
| Leak scan | PASS |

**Owner decision (staging only, 2026-06-08):**

- `DIAGNOSTIC_METADATA_SUBSKILL_ENABLED=true` — **staging ON**
- `DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED=true` — **staging ON**
- `DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED=false` — **OFF**

Production activation of B or C is **not approved**. Promotion (D) stays off. Full evidence: `docs/qa/DIAGNOSTIC_FLAGS_VISIBLE_IMPACT_LAUNCH_GATE_REPORT.md`.
