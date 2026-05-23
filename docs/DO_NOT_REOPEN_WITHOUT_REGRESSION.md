# Do Not Reopen Without Regression

**Record date:** 2026-05-23
**Document type:** Reopen rules for closed product areas.
**Companion docs:** [docs/FINAL_PRODUCT_CLOSURE_MAP.md](./FINAL_PRODUCT_CLOSURE_MAP.md), [docs/FINAL_CLOSURE_EVIDENCE_REGISTRY.md](./FINAL_CLOSURE_EVIDENCE_REGISTRY.md).

---

## Why this document exists

Closed work is expensive to reopen. Each casual reopen costs (a) duplicated QA, (b) churn on already-signed Hebrew copy/engine logic, (c) confusion about whether the launch path is moving forward or backward.

This document defines, for every closed area, the **only** conditions that justify reopening it. If none of those conditions is met, the area stays closed even if a concern is raised.

---

## Universal reopen criteria (must be one of)

A **CLOSED** or **CLOSED-WATCH** area may be reopened only if **at least one** of the following is true and is documented in the reopen request:

1. **Failing QA report.** A specific, dated, named report under `reports/` shows a `fail` or P0 result for the area. Path + date are mandatory in the reopen request.
2. **Real UI/browser failure.** A reproducible failure observed against the live site (or against `localhost:3001` with a saved log/screenshot). "I think it might break" is not enough.
3. **Code change that touched the area.** A commit/PR has modified files inside the closed area's source tree (e.g. `utils/parent-report-v2.js` for area F, `pages/learning/*-master.js` for area D). The reopen is then *targeted* to verifying that change, not a full re-audit.
4. **Contradiction in current evidence.** Two signed evidence files in [FINAL_CLOSURE_EVIDENCE_REGISTRY.md](./FINAL_CLOSURE_EVIDENCE_REGISTRY.md) disagree (e.g. one says coverage `pass`, another says coverage `fail` on the same date).
5. **Owner requirement change.** The owner explicitly states that scope, acceptance criteria, or the closure rule itself has changed.

A reopen request without one of these is **out of scope** and must be rejected with a pointer to this document.

---

## What is NOT a valid reopen trigger

The following are **explicitly insufficient**:

- "I want to be extra safe."
- "Maybe something regressed."
- "It's been a while since we ran it."
- "The aggregator gate is `PARTIAL`." (The gate's design is to be `PARTIAL` until all 13 layers wire up; that is not a regression.)
- "The 2026-05-23 daily run only covered AAA7." (That run is intentionally a filtered validation run; the in-progress nightly will replace it.)
- A general concern raised in chat without pointing to a file or observation.
- A failing test inside the QA driver that was already explained in [scripts/virtual-student-qa/KNOWN-ISSUES.md](../scripts/virtual-student-qa/KNOWN-ISSUES.md) as driver-only.
- A failing test on a feature that is **DEFERRED** (schools, teachers, new grades, new subjects, child-world MVP coins/missions, LLM live, short-report Copilot in production).

If your concern is one of these, **do not open work**. Either (a) wait for the in-progress nightly to land real results, or (b) raise it as a question in the closure-control summary, not as a code change.

---

## Per-area reopen rules

### A. Product Scope — CLOSED

**Reopen only if:** owner sends a written scope-change request.
**Do not reopen for:** any QA finding (those land in B–H, not in scope).

### B. Curriculum & Subjects — CLOSED-WATCH

**Reopen if:**
- A new run of `node scripts/question-bank-inventory-gate.mjs` reports `REAL_BLOCKER_VISIBLE > 0`.
- Any per-subject phase doc (8–30 series, Hebrew Perfect Close, etc.) gets a new blocker entry.
**Do not reopen for:**
- Hebrew tone polish suggestions (those are content QA, tracked separately).
- Owner asking for new grades/subjects (DEFERRED).
- Adviseries from `qa:question-metadata` (informational only).

### C. Question Quality — CLOSED-WATCH

**Reopen if:**
- `qa:question-metadata` returns `gateDecision: fail_blocking_metadata`.
- `qa:student-question-stem-metadata` finds raw key leak.
**Do not reopen for:**
- Advisory-level findings (`missing_prerequisite_skill_ids`, `implicit_id_only`, `missing_explanation`).
- Questions about taxonomy organization that don't change behavior.

### D. Student Experience — CLOSED-WATCH

**Reopen if:**
- `npm run qa:learning-simulator:release` fails.
- `npm run qa:learning-simulator:critical-deep` reports any failure.
- Nightly virtual-student run reports `student-cannot-answer` repeated on ≥2 personas, or session/finish missing, or cross-student bleed.
**Do not reopen for:**
- Driver-only fixes already logged in [KNOWN-ISSUES.md](../scripts/virtual-student-qa/KNOWN-ISSUES.md) as `RESOLVED`.
- Mobile/RTL concerns — those go to the separate L-Mobile track (not yet wired into the gate).

### E. Parent Dashboard — CLOSED-WATCH

**Reopen if:**
- Daily preflight fails (parent UI login, or `/api/parent/list-students` missing AAA1–12, or any AAA student cannot UI-login).
- Cross-student row appears in any nightly.
**Do not reopen for:**
- Owner-side manual smoke being unsigned — that's an owner action, not an engine reopen.

### F. Parent Report — CLOSED-WATCH

**Reopen if (all are P0 in `parent-report-truth-audit`):**
- Raw keys (e.g. `m04_fractions_*`, `confidence_level`) appear in any rendered report.
- Cross-student bleed: a student's report shows another student's data.
- Report HTTP ≠ 200 in nightly.
- Student name or activity missing from report.
**Do not reopen for:**
- P1 "filtered run" warnings (they vanish when full nightly lands).
- Hebrew copy polish (content QA, not engine).
- Recommendation phrasing being "general" (P1, polish track).

### G. Parent Copilot / AI — CLOSED (deterministic)

**Reopen if (all are P0 in copilot-truth):**
- Hallucination / unsupported claim about a child.
- Raw key in Copilot output.
- Scope leak (Copilot answering outside parent-report scope).
- Medical or psychological claim.
**Do not reopen for:**
- LLM live-path performance — that's the **DEFERRED** track.
- Short-report Copilot in production — stays `OFF` until server snapshot ships; not a defect.

### H. Data Integrity — CLOSED-WATCH (MVP)

**Reopen if:**
- Cross-student answer event appears in any nightly log.
- `session/finish` not saved on a passing-driver run.
- start ≠ finish count on a non-driver-known case.
**Do not reopen for:**
- The MVP not yet covering DB row-level scan (that's the **OPEN** Full track, separate task).
- A filtered run not covering all 12 personas.

### I. Nightly 12-Student Simulation — OPEN-WORKING

**Special rule:** **Do not classify as PASS or FAIL in this pass.**
**Do not duplicate this work** in any other plan.
**Wait for:** the in-progress nightly to land a real full run + at least one Task Scheduler-driven invocation.
After that lands: re-run `npm run qa:launch:daily-gate -- --date <date>` and re-classify F, H, I together.

### J. Public Site / Marketing Surface — UNKNOWN / EVIDENCE-MISSING

**Cannot be reopened** because it was never closed in the first place.
**Action instead:** owner decides pilot-vs-public. If public, schedule a small dedicated marketing-surface QA pass. **Do not** roll this into any other area's reopen.

### K. Security / Privacy — CLOSED-WATCH (audit) + partial OPEN

**Reopen if:**
- New endpoint added without auth.
- Ownership boundary test fails.
- Secret leak observed.
**Do not reopen for:**
- The recommended fixes from [auth-security-readonly-audit.md](./auth-security-readonly-audit.md) being not yet applied — those are forward work; choose pilot-vs-public and apply if needed. They are not a regression.

### L. Release Readiness — OPEN-WORKING

**Reopen the gate verdict if:**
- Any signed gate flips to `fail`.
- Nightly produces a P0.
- Owner explicitly changes scope.
**Do not reopen for:**
- The aggregator showing `PARTIAL` because of unwired layers — that's expected per the master plan.
- Owner-side manual smoke being unsigned — that's an owner action.

---

## How to file a reopen request

If the universal criteria are met, the reopen request must contain:

1. **Area code** (A–L).
2. **Reopen trigger** chosen from the 5 universal criteria.
3. **Specific evidence** (file path + date, OR live URL + log/screenshot, OR commit SHA, OR conflicting evidence rows from [FINAL_CLOSURE_EVIDENCE_REGISTRY.md](./FINAL_CLOSURE_EVIDENCE_REGISTRY.md), OR owner statement).
4. **Scope of reopen** (full re-audit vs targeted to the change). Default to *targeted*.
5. **Expected exit criteria** (what file/result will close it again).

A reopen request without all five fields is incomplete and should be rejected.

---

## Special protections

These cannot be touched without an explicit, separately-signed owner instruction — even if a reopen request is filed:

- **Hebrew strings** in any product file. Hebrew copy is signed per [docs/PARENT_REPORT_EDITORIAL_SIGNOFF.md](./PARENT_REPORT_EDITORIAL_SIGNOFF.md), [docs/hebrew-perfect-close-handoff.md](./hebrew-perfect-close-handoff.md), and the per-subject phase docs.
- **Diagnostic engine V2 thresholds** (`utils/diagnostic-engine-v2/`).
- **Parent report v2 logic** (`utils/parent-report-v2.js`).
- **Existing 12 QA student personas** (AAA1–AAA12) and the parent linkage. The accounts exist; **do not** create/delete/PIN-reset them as part of any reopen.
- **Question banks** in `data/` (no Hebrew/English/etc. stems edited as part of a reopen; only via per-subject phase work with its own signoff).
- **Supabase migrations** (`supabase/migrations/`) — schema changes are out of scope for reopens and require a separate plan.

If a reopen would require touching any of the above, stop and escalate to the owner instead.

---

## What "reopen" actually means

Reopen does **not** mean "open chat about the area". It means: a tracked task with a target file/area, a measurable exit criterion, and a finite scope. If a reopen does not fit those three constraints, it should not be filed.

---

## Final principle

> If you cannot point to a specific failing report, a specific real failure, a specific code change, a specific evidence contradiction, or a specific owner statement — the area stays closed.
>
> "Evidence or do not reopen."
