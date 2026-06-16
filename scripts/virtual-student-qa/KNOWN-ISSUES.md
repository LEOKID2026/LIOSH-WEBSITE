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

_(none currently — see Resolved section below)_

### Operator env — parent credential precedence (documented 2026-06-15)

**Not a product bug.** When the nightly wrapper or manual runs source
`%LOCALAPPDATA%\liosh-qa\env\virtual-student-qa.env.ps1` **before** invoking
`run.mjs`, those variables override repo `.env.e2e.local` / `.env.local`
(`config.mjs` skips dotenv keys already set in `process.env`).

If parent preflight fails **after** submit (stays on `/parent/login`, no
dashboard redirect), verify the operator env password matches the live Vercel
parent account. Update the **local** `virtual-student-qa.env.ps1` only — do
not commit secrets or change repo env files for this.

---

## Resolved driver-quality issues

### D2 parent-report validation — batch snapshot false bleed (RESOLVED 2026-06-15)

**Status:** Fixed in QA harness only. No product change.

**Symptom (before fix).** D2 full-run on `2026-04-01` failed AAA1 with
`cross-subject bleed: math+13` even though drivers selected Practice and created
countable practice evidence. Batch baselines were taken for all students, then ~22
minutes of multi-student activity, then batch after-snapshots — unrelated concurrent
activity on AAA1 before its driver sessions inflated the math delta.

**Fix (QA harness only).** `phase-d2-orchestrator.mjs` now validates per student:
baseline immediately before sessions → driver activity → after immediately after.
Records `runWindow` (timestamps, planned subjects, driver session/answer ids).
Non-planned-subject deltas are logged as `external/concurrent same-student activity`
(informational) — not product bleed failures. Fails only on real evidence failures
(own-subject delta miss, driver learning mode, wrong student report, etc.).

**Do not:** change product report policy, relabel DB rows, or require stopping unrelated
site work.

---

### All subject drivers — Practice (תרגול) mode for countable parent-report evidence (RESOLVED 2026-06-15)

**Status:** Fixed in QA tooling only. No product change.

**Symptom (before fix).** Virtual Student D2 runs persisted `mode=learning` because
every learning master defaults to Learning mode and drivers clicked Start without
selecting Practice first. Parent report correctly excluded that data per product
policy — simulation appeared "broken" but product was correct.

**Fix (QA driver only).** All subject drivers now call `selectCountablePracticeMode()`
(clicks product button **תרגול**) before `{subject}-start-game`, and use
`createPracticeEvidenceTracker()` per session: fail on `session.mode=learning`,
log excluded `afterStepByStep` rows, require ≥1 countable answer per session.
See `docs/qa/virtual-student-practice-mode-compatibility.md`.

**Do not:** relabel old AAA `learning` rows, soften the evidence gate, or change
product masters/APIs to match simulation.

---

### Parent preflight — login selector drift (RESOLVED 2026-06-15)

**Status:** Fixed in QA tooling only. No product change.

**Symptom (before fix).** D2 preflight on Vercel failed with
`parent-auth/ui: login form did not render and no dashboard redirect within 15s`.
The live `/parent/login` **login tab** uses `data-testid="parent-login-identifier"`
and `data-testid="parent-login-secret"`. Legacy placeholders `אימייל הורה` /
`סיסמה` exist only on the signup tab.

**Fix (QA driver only).** `parent-auth.mjs` resolves fields via test ids first,
with placeholder fallback for older deployments.

**Also required:** sync `%LOCALAPPDATA%\liosh-qa\env\virtual-student-qa.env.ps1`
parent password with the live Vercel account when operator env overrides repo
`.env.e2e.local` (see Open issues — Operator env precedence).

---

### Parent dashboard — children section selector drift (RESOLVED 2026-06-15)

**Status:** Fixed in QA tooling only. No product change.

**Symptom (before fix).** D2 full-run failed at baseline parent-report snapshot:
`getByRole('heading', { name: /^הילדים שלי \(\d+\)$/u })` timed out. Live
dashboard uses `h1` **דשבורד הורים** + student card grid with **דוח הורים**
links; the old `הילדים שלי (N)` heading is gone.

**Fix (QA driver only).** `parent-dashboard.mjs` waits for list-students + student
cards / report links; legacy `הילדים שלי (N)` heading path kept as fallback.

---

### English driver — typing questions not handled; mcq-buttons-not-ready timeout (RESOLVED 2026-05-23)

**Status:** Fixed in QA tooling only. No product change.
**Surfaced in:** D2.5 nightly run 2026-05-23 (laptop), AAA7 grade 4 English, q4.
**Resolved in:** Desktop fix session 2026-05-23 (two-part fix).

**Symptom (before fix).** AAA7 grade 4 English session answered 3 questions
then hit `mcq-buttons-not-ready-q4: page.waitForFunction: Timeout 20000ms exceeded`.
The session finished cleanly (session/finish was called) but only 3/16 questions
were answered → run status `partial`.

**Root cause — Part 1: driver not handling typing questions.**
The English learning page renders TWO question shapes within the same vocabulary session:

- **MCQ ("choice")** for `en_to_he` direction questions (e.g. "What is 'ninety'?"
  → Hebrew buttons shown).
- **Free-text typing** for `he_to_en` direction questions (e.g. "What does 'נמל'
  mean?" → student types the English word).

Typing mode is triggered by `determineMcqOrTyping()` in
`pages/learning/english-master.js`:
```js
if (selectedTopic === "vocabulary") {
  if (params?.direction === "en_to_he") return "choice";
  ...
  if (isHardLevel || gNum >= 4) return "typing";  // ← grade 4 he_to_en
```

q1–q3 were `en_to_he` → MCQ (worked fine). q4 was `he_to_en` + grade 4 → typing
mode; the generic MCQ driver waited 20 s for MCQ buttons that would never appear.

**Root cause — Part 2: double-advance from "שאלה הבאה" click (found during desktop validation).**
The English page in "learning" mode (the default) calls `generateNewQuestion()`
automatically via `setTimeout` in `handleAnswer`:

- correct answer → 1 000 ms delay
- wrong answer   → 1 500 ms delay

The initial fix clicked the "שאלה הבאה" button after each typing answer, which
triggered an IMMEDIATE `generateNewQuestion()` call. The pending auto-advance
`setTimeout` then fired ~1–1.5 s later and called `generateNewQuestion()` again —
a **double-advance** that replaced the intended next question mid-interaction.
When the driver tried to press Enter into the now-removed typing input, Playwright
waited 10 s for a locator that would never reappear → `locator.press: Timeout
10000ms exceeded`.

**Fix (QA driver only — no product change).**

`scripts/virtual-student-qa/lib/subject-drivers/english-master.mjs` was rewritten
from a thin wrapper around `makeMcqSubjectDriver` into a standalone driver that:

1. Uses a per-question shape detector (`waitForAnswerableQuestion`) that polls for
   either MCQ buttons *or* the free-text typing input — returns `"mcq"` or
   `"typing"`.
2. For `"mcq"` shape: same fiber-probe-based `probeWithLabelMatchRetry` +
   `pickMcqIndex` + `clickMcqRobustly` path as before, with added stability wait
   for entrance animations.
3. For `"typing"` shape: probes `currentQuestion` via the always-present
   `learning-stop-game` fiber anchor, picks the answer per profile (correct or
   wrong sentinel), types into `input[placeholder="כתוב את התשובה שלך כאן..."]`,
   and submits with `page.keyboard.press("Enter")` (no locator actionability
   re-checks that could race with React re-renders after `fill()`).
4. **Never clicks "שאלה הבאה"** — waits passively (up to 3.5 s) for the page's
   own auto-advance `setTimeout` to commit the next question (stem text change or
   typing input disappearance).
5. Logs `shapes={mcq:N,typing:N}` for observability.

**Files touched (QA-tooling only):**
- `scripts/virtual-student-qa/lib/subject-drivers/english-master.mjs` — rewritten.
- `scripts/virtual-student-qa/KNOWN-ISSUES.md` — this entry.

**No changes to:** `pages/`, `components/`, root `lib/`, `supabase/`, Hebrew copy,
English educational content, parent-report logic, learning engine, or Supabase schema.

---

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
