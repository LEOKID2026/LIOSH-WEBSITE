# Virtual-Student QA — Known driver-quality issues

> Living list of **subject-driver** issues that are not D2 blockers but
> should be cleaned up before this runner is left running unattended on
> a long-term nightly schedule (D2.6+).
>
> Scope of this file: **issues inside `scripts/virtual-student-qa/`**
> only. Product issues (UI / Hebrew copy / parent-report logic /
> learning engine / Supabase schema) belong elsewhere — those are out
> of scope for this runner by design.

## Open driver-quality issues

_(none currently)_

---

## Resolved driver-quality issues

### English driver — observed-vs-intended accuracy mismatch (RESOLVED 2026-05-22)

**Status:** Fixed in QA tooling only. Validated end-to-end on Vercel.
**Surfaced in:** D2.4 medium Vercel fast smoke (2026-05-25).
**Resolved in:** D2.5 follow-up smoke (2026-05-27, AAA1 math+english).

**Symptom (before fix).** The english driver's per-question log line
showed `correctAnswer(probe)` returning the *previous* question's
answer for q2 onward, with `intendedCorrect=null` and the profile
silently falling back to "answer index 0":

```
english-master: q1 stem="פיצה"     correctAnswer(probe)=pizza  intendedCorrect=true
english-master: q2 stem="חום בהיר" correctAnswer(probe)=pizza  intendedCorrect=null
english-master: q3 stem="draw"     correctAnswer(probe)=tan    intendedCorrect=null
...
english-master: profile=strong intendedCorrect=1/16 observedCorrect=7/16 probeFailures=15
```

**Root cause.** The fiber probe (`lib/mcq-fiber-probe.mjs`) walked the
React fiber tree from the root and returned the **first** state hook
that looked like a question (had `correctAnswer` / `correctIndex+options`
/ `answers`). All the learning pages also keep a sibling state hook
called `previousExplanationQuestion` that holds the *previous* question
for the explanation modal. Under certain commit timings — most often
on `english-master` — the probe would either find
`previousExplanationQuestion` first or hit the live `currentQuestion`
hook before its commit had landed, and either way return the previous
question's `correctAnswer`. The driver then matched that answer
against the *new* question's visible MCQ buttons, didn't find it,
classified the question as "fiber probe failed", and fell back to
"answer index 0".

**Fix (QA tooling only — no product change).**

1. **Disambiguate by DOM ground truth.**
   `mcq-fiber-probe.mjs` now does two passes through the fiber tree:
   - **Pass 1:** find the first question-shaped state hook *whose
     `options` / `answers` set matches the visible MCQ buttons
     currently rendered in the DOM* (using a multiset compare with
     the same normalization Playwright uses on `allTextContents()`).
     The DOM is the ground truth for which question the student is
     currently looking at.
   - **Pass 2 (fallback):** any question-shaped state hook. Preserves
     the original behaviour for callers that don't pass `expectedLabels`
     (e.g. text-input subjects via `entryTestid`) and for first-question
     scenarios where there is no stale alternate to disambiguate
     against.
   - The probe now also returns `matchedByLabels: boolean` so callers
     can tell which pass produced the result.
2. **Short retry loop.**
   `mcq-subject-driver.mjs` wraps the probe in
   `probeWithLabelMatchRetry({ maxAttempts: 6, intervalMs: 100 })` —
   capped at ~600 ms total. If `matchedByLabels` is false on the first
   read, the driver waits one render tick and re-probes. After q1, q2
   converged on the first retry; q3+ converged immediately. A real
   probe failure (e.g. structural change in a future page) still
   surfaces within ~600 ms instead of silently degrading the profile.

**Validation (D2.5 follow-up smoke, 2026-05-27 fast Vercel, AAA1 only):**

| Subject | Driver | Intended correct | Observed correct | probeFailures | matchedByLabels |
|---|---|---|---|---|---|
| math (control) | math-master | 8/8 | 8/8 | n/a (text-input) | n/a |
| english | english-master | 8/8 | 8/8 | **0** | **all true** |

Compare to the pre-fix english baseline on the same input shape:
`intendedCorrect=1/16 observedCorrect=7/16 probeFailures=15`.

Hebrew / science / moledet-geography drivers also use the same MCQ
probe path; they were already at `probeFailures=0` and remain so —
the new code paths are no-ops when `matchedByLabels` is true on the
first attempt.

**Files touched (QA-tooling only):**

- `scripts/virtual-student-qa/lib/mcq-fiber-probe.mjs` — two-pass
  search, `matchedByLabels` field, normalization helper.
- `scripts/virtual-student-qa/lib/subject-drivers/mcq-subject-driver.mjs`
  — `probeWithLabelMatchRetry` helper, `matchedByLabels` log line.

**No changes to:** `pages/`, `components/`, root `lib/`, `supabase/`,
Hebrew copy, parent-report logic, learning engine, or Supabase schema.
