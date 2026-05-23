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

---

## Resolved driver-quality issues

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
