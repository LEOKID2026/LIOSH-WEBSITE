/**
 * Phase 2 test gate — Step-by-step tracking and diagnostic exclusion
 *
 * Proves:
 *  1. afterStepByStep=true forces isDiagnosticEligible=false for EVERY normally-eligible mode
 *  2. afterStepByStep=true always sets evidenceCategory="learning_guided"
 *  3. afterStepByStep=true always sets contextFlags.stepByStepOverride=true
 *  4. afterStepByStep=false (or absent) leaves eligibility unchanged for all modes
 *  5. Non-eligible modes remain non-eligible with or without afterStepByStep
 *  6. clientMeta field afterStepByStep presence is checked via classifyActivityEvidence round-trip
 *  7. Timing: the wrong answer itself is NOT marked afterStepByStep — only the retry is
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyActivityEvidence,
  EVIDENCE_CATEGORIES,
  DIAGNOSTIC_ELIGIBLE_MODES,
} from "../../lib/learning/activity-classification.js";

// ── All normally-eligible modes must be blocked by afterStepByStep=true ────────

const ALL_ELIGIBLE_MODES = [
  // Free-practice independent
  "practice",
  "graded",
  "drill",
  "review",
  "normal",
  // Guided (still eligible)
  "practice_mistakes",
  // Competitive — the key ones per Phase 2 requirements
  "challenge",
  "speed",
  "marathon",
  // Assigned
  "quiz",
  "homework",
  "worksheet",
  "live_lesson",
];

for (const mode of ALL_ELIGIBLE_MODES) {
  test(`afterStepByStep=true blocks mode="${mode}" → NOT eligible, learning_guided`, () => {
    const r = classifyActivityEvidence(mode, "free_practice", { afterStepByStep: true });
    assert.equal(
      r.isDiagnosticEligible,
      false,
      `mode=${mode}: expected isDiagnosticEligible=false when afterStepByStep=true`
    );
    assert.equal(
      r.evidenceCategory,
      EVIDENCE_CATEGORIES.LEARNING_GUIDED,
      `mode=${mode}: expected evidenceCategory=learning_guided when afterStepByStep=true`
    );
    assert.equal(
      r.contextFlags.stepByStepOverride,
      true,
      `mode=${mode}: expected contextFlags.stepByStepOverride=true`
    );
    assert.equal(
      r.contextFlags.afterStepByStep,
      true,
      `mode=${mode}: expected contextFlags.afterStepByStep=true`
    );
  });
}

// ── Without afterStepByStep, all eligible modes remain eligible ────────────────

for (const mode of ALL_ELIGIBLE_MODES) {
  test(`afterStepByStep absent → mode="${mode}" stays eligible`, () => {
    const r = classifyActivityEvidence(mode);
    assert.equal(
      r.isDiagnosticEligible,
      true,
      `mode=${mode}: should remain eligible when afterStepByStep not set`
    );
    assert.equal(
      r.contextFlags.stepByStepOverride,
      undefined,
      `mode=${mode}: stepByStepOverride should be undefined (not set)`
    );
  });
}

// ── afterStepByStep=false explicitly → same as absent ─────────────────────────

for (const mode of ALL_ELIGIBLE_MODES) {
  test(`afterStepByStep=false explicitly → mode="${mode}" stays eligible`, () => {
    const r = classifyActivityEvidence(mode, "free_practice", { afterStepByStep: false });
    assert.equal(
      r.isDiagnosticEligible,
      true,
      `mode=${mode}: should remain eligible when afterStepByStep=false`
    );
    assert.equal(r.contextFlags.afterStepByStep, false);
    assert.equal(r.contextFlags.stepByStepOverride, undefined);
  });
}

// ── Non-eligible modes stay non-eligible regardless of afterStepByStep ─────────

const NON_ELIGIBLE_MODES = ["learning", "mistakes", "guided_practice", "discussion", "learning_book"];

for (const mode of NON_ELIGIBLE_MODES) {
  test(`mode="${mode}" stays NOT eligible with afterStepByStep=true (already non-eligible)`, () => {
    const r = classifyActivityEvidence(mode, "free_practice", { afterStepByStep: true });
    assert.equal(r.isDiagnosticEligible, false, `mode=${mode}: already not eligible`);
  });

  test(`mode="${mode}" stays NOT eligible without afterStepByStep`, () => {
    const r = classifyActivityEvidence(mode);
    assert.equal(r.isDiagnosticEligible, false, `mode=${mode}: already not eligible`);
  });
}

// ── Specific Phase 2 requirement: speed and marathon with afterStepByStep ──────

test("speed + afterStepByStep=true → NOT diagnostic (Phase 2 explicit requirement)", () => {
  const r = classifyActivityEvidence("speed", "free_practice", { afterStepByStep: true });
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);
});

test("marathon + afterStepByStep=true → NOT diagnostic (Phase 2 explicit requirement)", () => {
  const r = classifyActivityEvidence("marathon", "free_practice", { afterStepByStep: true });
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);
});

test("challenge + afterStepByStep=true → NOT diagnostic (Phase 2 explicit requirement)", () => {
  const r = classifyActivityEvidence("challenge", "free_practice", { afterStepByStep: true });
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);
});

test("practice + afterStepByStep=true → NOT diagnostic (Phase 2 explicit requirement)", () => {
  const r = classifyActivityEvidence("practice", "free_practice", { afterStepByStep: true });
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);
});

// ── afterStepByStep=true does NOT remove learning activity credit ──────────────
// (learning_guided IS a positive learning behavior per the plan)

test("afterStepByStep=true results in LEARNING_GUIDED (positive learning behavior, credited)", () => {
  const r = classifyActivityEvidence("practice", "free_practice", { afterStepByStep: true });
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);
  // LEARNING_GUIDED is a credited learning category (per plan: counts as learningActivity)
  assert.notEqual(r.evidenceCategory, EVIDENCE_CATEGORIES.UNCLASSIFIED);
});

// ── DIAGNOSTIC_ELIGIBLE_MODES set is consistent with classification ────────────

test("DIAGNOSTIC_ELIGIBLE_MODES set matches classifyActivityEvidence without context flags", () => {
  for (const mode of ALL_ELIGIBLE_MODES) {
    assert.ok(
      DIAGNOSTIC_ELIGIBLE_MODES.has(mode),
      `${mode} should be in DIAGNOSTIC_ELIGIBLE_MODES`
    );
    const r = classifyActivityEvidence(mode);
    assert.equal(
      r.isDiagnosticEligible,
      true,
      `${mode} classify result should match DIAGNOSTIC_ELIGIBLE_MODES membership`
    );
  }
  for (const mode of NON_ELIGIBLE_MODES) {
    assert.ok(
      !DIAGNOSTIC_ELIGIBLE_MODES.has(mode),
      `${mode} should NOT be in DIAGNOSTIC_ELIGIBLE_MODES`
    );
    const r = classifyActivityEvidence(mode);
    assert.equal(
      r.isDiagnosticEligible,
      false,
      `${mode} classify result should match DIAGNOSTIC_ELIGIBLE_MODES exclusion`
    );
  }
});

// ── clientMeta round-trip: afterStepByStep value flows into classification ─────

test("clientMeta.afterStepByStep=true round-trip: classifies as learning_guided", () => {
  const clientMeta = { source: "math-master", afterStepByStep: true };
  const r = classifyActivityEvidence(
    "challenge",
    clientMeta.source,
    { afterStepByStep: clientMeta.afterStepByStep }
  );
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);
});

test("clientMeta.afterStepByStep=false round-trip: challenge stays eligible", () => {
  const clientMeta = { source: "math-master", afterStepByStep: false };
  const r = classifyActivityEvidence(
    "challenge",
    clientMeta.source,
    { afterStepByStep: clientMeta.afterStepByStep }
  );
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE);
});

// ── TIMING: wrong answer saves BEFORE explanation is set ──────────────────────
//
// This section models the exact execution order in all 6 masters:
//   1. saveAnswerInParallel(...)        ← captures stepByStepViewedRef.current
//   2. if (isCorrect) { ... } else {
//        setErrorExplanation(errExpl);
//        if (errExpl) stepByStepViewedRef.current = true;  ← set AFTER save
//      }
//
// The test simulates this as a pure state machine using a plain object ref.

test("timing: wrong answer answered alone → saved with afterStepByStep=false (diagnostic eligible)", () => {
  // Simulates: no hint/step opened before answering
  const ref = { current: false };

  // === ANSWER SUBMIT MOMENT (save call happens here) ===
  const savedAfterStepByStep = ref.current; // false - no help viewed before this answer
  const resultOfWrongAnswer = classifyActivityEvidence("practice", "free_practice", {
    afterStepByStep: savedAfterStepByStep,
  });

  // === AFTER SAVE: wrong branch sets ref ===
  const errExpl = "הסבר: הדרך הנכונה היא...";
  if (errExpl) ref.current = true;

  // Assertion: the wrong answer itself is diagnostic-eligible
  assert.equal(
    resultOfWrongAnswer.isDiagnosticEligible,
    true,
    "wrong answer with no prior help: should remain diagnostic eligible"
  );
  assert.equal(
    resultOfWrongAnswer.contextFlags.afterStepByStep,
    false,
    "wrong answer: afterStepByStep must be false at time of save"
  );
  // Confirm ref is now true for next answer
  assert.equal(ref.current, true, "ref should be true after error explanation shown");
});

test("timing: retry after error explanation → saved with afterStepByStep=true (excluded from diagnostic)", () => {
  // Simulates: student saw error explanation (ref is now true), then retries
  const ref = { current: true }; // ref was set true after the wrong answer

  // === RETRY SUBMIT MOMENT ===
  const savedAfterStepByStep = ref.current; // true - error explanation was shown
  const resultOfRetry = classifyActivityEvidence("practice", "free_practice", {
    afterStepByStep: savedAfterStepByStep,
  });

  assert.equal(
    resultOfRetry.isDiagnosticEligible,
    false,
    "retry after error explanation: must NOT be diagnostic eligible"
  );
  assert.equal(
    resultOfRetry.evidenceCategory,
    EVIDENCE_CATEGORIES.LEARNING_GUIDED,
    "retry: evidenceCategory must be learning_guided"
  );
  assert.equal(
    resultOfRetry.contextFlags.afterStepByStep,
    true
  );
});

test("timing: new question after wrong → ref resets to false, next answer is diagnostic eligible again", () => {
  // Simulates: student moves to new question (reset), then answers without help
  const ref = { current: true }; // set from previous question's error explanation

  // === NEW QUESTION STARTS (displayQuestion resets the ref) ===
  ref.current = false;

  // === ANSWER SUBMIT ON NEW QUESTION ===
  const savedAfterStepByStep = ref.current; // false - reset for new question
  const result = classifyActivityEvidence("practice", "free_practice", {
    afterStepByStep: savedAfterStepByStep,
  });

  assert.equal(
    result.isDiagnosticEligible,
    true,
    "fresh question after reset: should be diagnostic eligible"
  );
  assert.equal(result.contextFlags.afterStepByStep, false);
});

test("timing: full wrong→explanation→retry→new-question lifecycle", () => {
  const ref = { current: false };

  // Q1: answer wrong (no prior help)
  const q1WrongSaved = ref.current; // false
  const errExpl = "הסבר שגיאה";
  if (errExpl) ref.current = true;

  const q1WrongResult = classifyActivityEvidence("challenge", "free_practice", {
    afterStepByStep: q1WrongSaved,
  });
  assert.equal(q1WrongResult.isDiagnosticEligible, true, "Q1 wrong: diagnostic eligible (no prior help)");

  // Q1: retry (after error explanation)
  const q1RetrySaved = ref.current; // true
  const q1RetryResult = classifyActivityEvidence("challenge", "free_practice", {
    afterStepByStep: q1RetrySaved,
  });
  assert.equal(q1RetryResult.isDiagnosticEligible, false, "Q1 retry: NOT eligible (saw error explanation)");
  assert.equal(q1RetryResult.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);

  // NEW QUESTION (ref reset)
  ref.current = false;

  // Q2: answer correctly with no help
  const q2Saved = ref.current; // false
  const q2Result = classifyActivityEvidence("speed", "free_practice", {
    afterStepByStep: q2Saved,
  });
  assert.equal(q2Result.isDiagnosticEligible, true, "Q2: fresh question, speed mode, no help → eligible");
  assert.equal(q2Result.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE);
});
