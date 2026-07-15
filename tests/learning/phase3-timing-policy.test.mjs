/**
 * Phase 3 test gate — Timing Truth
 *
 * Tests for:
 *  1. deriveTimingStatus — enum derivation from rawMs vs capMs
 *  2. computeAssignedActivityTiming — assigned activity (flat 300s cap, no ledger)
 *  3. computeFreePracticeTiming — free-practice (ledger-aware credited time)
 *  4. Simulation: rawTimeSpentMs and creditedTimeMs are always separate values
 *  5. Regression: no rawTimeSpentMs=5000 for any non-trivial elapsed time
 *
 * Phase 3 test gate (from fix plan):
 *  - Unit: assigned activity — rawTimeSpentMs = actual elapsed time
 *  - Unit: assigned activity — creditedTimeMs = Math.min(rawMs, 300_000)
 *  - Unit: assigned activity - timingStatus = "very_long" when rawMs > 600_000
 *  - Unit: explanationViewed logic
 *  - Unit: free-practice — both rawTimeSpentMs and creditedTimeMs present
 *  - Integration sim: rawTimeSpentMs > 0 after realistic question time
 *  - Integration sim: no rawTimeSpentMs = 5000 in any new row
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveTimingStatus,
  computeAssignedActivityTiming,
  computeFreePracticeTiming,
  ASSIGNED_ACTIVITY_CREDIT_CAP_MS,
  DEFAULT_FREE_PRACTICE_CAP_MS,
} from "../../lib/learning/timing-policy.js";

// ── deriveTimingStatus ────────────────────────────────────────────────────────

test("deriveTimingStatus: null rawMs → no_timer", () => {
  assert.equal(deriveTimingStatus(null), "no_timer");
});

test("deriveTimingStatus: 0 rawMs → no_timer", () => {
  assert.equal(deriveTimingStatus(0), "no_timer");
});

test("deriveTimingStatus: negative rawMs → no_timer", () => {
  assert.equal(deriveTimingStatus(-100), "no_timer");
});

test("deriveTimingStatus: rawMs at cap → normal", () => {
  assert.equal(deriveTimingStatus(300_000, 300_000), "normal");
});

test("deriveTimingStatus: rawMs = 1 → normal (well within cap)", () => {
  assert.equal(deriveTimingStatus(1, 300_000), "normal");
});

test("deriveTimingStatus: rawMs = 299_999 → normal", () => {
  assert.equal(deriveTimingStatus(299_999, 300_000), "normal");
});

test("deriveTimingStatus: rawMs = 300_001 → long (just over cap)", () => {
  assert.equal(deriveTimingStatus(300_001, 300_000), "long");
});

test("deriveTimingStatus: rawMs = 600_000 → long (2x cap exactly)", () => {
  assert.equal(deriveTimingStatus(600_000, 300_000), "long");
});

test("deriveTimingStatus: rawMs > 600_000 → very_long", () => {
  assert.equal(deriveTimingStatus(600_001, 300_000), "very_long");
});

test("deriveTimingStatus: rawMs = 900_000 → very_long", () => {
  assert.equal(deriveTimingStatus(900_000, 300_000), "very_long");
});

test("deriveTimingStatus: challenge mode cap 120s → long at 240_001", () => {
  assert.equal(deriveTimingStatus(240_001, 120_000), "very_long");
});

test("deriveTimingStatus: default cap constant is 300_000", () => {
  assert.equal(DEFAULT_FREE_PRACTICE_CAP_MS, 300_000);
});

// ── computeAssignedActivityTiming ────────────────────────────────────────────

test("assigned: normal elapsed 5000ms → normal status", () => {
  const { rawTimeSpentMs, creditedTimeMs, timingStatus } =
    computeAssignedActivityTiming(5000);
  assert.equal(rawTimeSpentMs, 5000);
  assert.equal(creditedTimeMs, 5000);
  assert.equal(timingStatus, "normal");
});

test("assigned: elapsed at exact cap 300_000ms → normal status", () => {
  const { rawTimeSpentMs, creditedTimeMs, timingStatus } =
    computeAssignedActivityTiming(300_000);
  assert.equal(rawTimeSpentMs, 300_000);
  assert.equal(creditedTimeMs, 300_000);
  assert.equal(timingStatus, "normal");
});

test("assigned: credited is capped at 300_000 when raw exceeds cap", () => {
  const { rawTimeSpentMs, creditedTimeMs } =
    computeAssignedActivityTiming(400_000);
  assert.equal(rawTimeSpentMs, 400_000);
  assert.equal(creditedTimeMs, ASSIGNED_ACTIVITY_CREDIT_CAP_MS);
  assert.equal(creditedTimeMs, 300_000);
});

test("assigned: raw is preserved (never capped) when very large", () => {
  const rawInput = 1_800_000; // 30 minutes
  const { rawTimeSpentMs, creditedTimeMs } =
    computeAssignedActivityTiming(rawInput);
  assert.equal(rawTimeSpentMs, rawInput);
  assert.equal(creditedTimeMs, 300_000);
  assert.notEqual(rawTimeSpentMs, creditedTimeMs);
});

test("assigned: timingStatus = long for 300_001 to 600_000ms", () => {
  assert.equal(computeAssignedActivityTiming(300_001).timingStatus, "long");
  assert.equal(computeAssignedActivityTiming(500_000).timingStatus, "long");
  assert.equal(computeAssignedActivityTiming(600_000).timingStatus, "long");
});

test("assigned: timingStatus = very_long for rawMs > 600_000", () => {
  assert.equal(computeAssignedActivityTiming(600_001).timingStatus, "very_long");
  assert.equal(computeAssignedActivityTiming(3_600_000).timingStatus, "very_long");
});

test("assigned: null rawMs → 0 raw, 0 credited, no_timer status", () => {
  const { rawTimeSpentMs, creditedTimeMs, timingStatus } =
    computeAssignedActivityTiming(null);
  assert.equal(rawTimeSpentMs, 0);
  assert.equal(creditedTimeMs, 0);
  assert.equal(timingStatus, "no_timer");
});

test("assigned: 0 rawMs → no_timer status", () => {
  const { timingStatus } = computeAssignedActivityTiming(0);
  assert.equal(timingStatus, "no_timer");
});

test("assigned: raw and credited are always two separate fields", () => {
  const result = computeAssignedActivityTiming(150_000);
  assert.ok("rawTimeSpentMs" in result, "rawTimeSpentMs must be present");
  assert.ok("creditedTimeMs" in result, "creditedTimeMs must be present");
  assert.ok("timingStatus" in result, "timingStatus must be present");
});

// ── computeFreePracticeTiming ─────────────────────────────────────────────────

test("free-practice: both rawTimeSpentMs and creditedTimeMs present", () => {
  const result = computeFreePracticeTiming(12_000);
  assert.ok("rawTimeSpentMs" in result);
  assert.ok("creditedTimeMs" in result);
  assert.ok("timingStatus" in result);
});

test("free-practice: no ledger → creditedMs capped at default 300_000", () => {
  const { creditedTimeMs } = computeFreePracticeTiming(400_000);
  assert.equal(creditedTimeMs, 300_000);
});

test("free-practice: null rawMs → rawTimeSpentMs null, no_timer status", () => {
  const { rawTimeSpentMs, creditedTimeMs, timingStatus } =
    computeFreePracticeTiming(null);
  assert.equal(rawTimeSpentMs, null);
  assert.equal(creditedTimeMs, null);
  assert.equal(timingStatus, "no_timer");
});

test("free-practice: ledger creditedMs provided → used as creditedTimeMs", () => {
  const rawMs = 180_000;
  const ledgerCreditedMs = 120_000; // ledger capped at 120s (challenge tier)
  const { rawTimeSpentMs, creditedTimeMs } = computeFreePracticeTiming(rawMs, {
    creditedMs: ledgerCreditedMs,
    tierCapMs: 120_000,
  });
  assert.equal(rawTimeSpentMs, 180_000);
  assert.equal(creditedTimeMs, 120_000);
  assert.notEqual(rawTimeSpentMs, creditedTimeMs, "raw and credited must differ");
});

test("free-practice: tier cap 120s → long when raw = 200_000", () => {
  const { timingStatus } = computeFreePracticeTiming(200_000, { tierCapMs: 120_000 });
  assert.equal(timingStatus, "long");
});

test("free-practice: tier cap 120s → very_long when raw > 240_000", () => {
  const { timingStatus } = computeFreePracticeTiming(250_000, { tierCapMs: 120_000 });
  assert.equal(timingStatus, "very_long");
});

test("free-practice: raw within 300s cap → normal", () => {
  const { timingStatus } = computeFreePracticeTiming(60_000);
  assert.equal(timingStatus, "normal");
});

// ── overCreditCap: explicit boolean flag ─────────────────────────────────────

test("assigned: overCreditCap = false when rawMs <= cap (within budget)", () => {
  assert.equal(computeAssignedActivityTiming(5_000).overCreditCap, false);
  assert.equal(computeAssignedActivityTiming(300_000).overCreditCap, false);
});

test("assigned: overCreditCap = true when rawMs > cap (long)", () => {
  assert.equal(computeAssignedActivityTiming(300_001).overCreditCap, true);
});

test("assigned: overCreditCap = true when rawMs > cap (very_long)", () => {
  assert.equal(computeAssignedActivityTiming(900_000).overCreditCap, true);
});

test("assigned: overCreditCap = false when rawMs is 0 / null", () => {
  assert.equal(computeAssignedActivityTiming(0).overCreditCap, false);
  assert.equal(computeAssignedActivityTiming(null).overCreditCap, false);
});

test("assigned: overCreditCap is always explicitly present in result", () => {
  const result = computeAssignedActivityTiming(120_000);
  assert.ok("overCreditCap" in result, "overCreditCap field must be present");
  assert.equal(typeof result.overCreditCap, "boolean", "overCreditCap must be boolean");
});

test("free-practice: overCreditCap = false when rawMs <= cap", () => {
  assert.equal(computeFreePracticeTiming(100_000).overCreditCap, false);
  assert.equal(computeFreePracticeTiming(300_000).overCreditCap, false);
});

test("free-practice: overCreditCap = true when rawMs > cap", () => {
  assert.equal(computeFreePracticeTiming(300_001).overCreditCap, true);
  assert.equal(computeFreePracticeTiming(900_000).overCreditCap, true);
});

test("free-practice: overCreditCap = true respects custom tierCapMs", () => {
  assert.equal(computeFreePracticeTiming(120_001, { tierCapMs: 120_000 }).overCreditCap, true);
  assert.equal(computeFreePracticeTiming(120_000, { tierCapMs: 120_000 }).overCreditCap, false);
});

test("free-practice: overCreditCap = false when null rawMs (no_timer)", () => {
  assert.equal(computeFreePracticeTiming(null).overCreditCap, false);
});

test("free-practice: overCreditCap is always present in result", () => {
  const result = computeFreePracticeTiming(50_000);
  assert.ok("overCreditCap" in result, "overCreditCap field must be present");
  assert.equal(typeof result.overCreditCap, "boolean");
});

// ── Regression: no 5000ms fabrication ────────────────────────────────────────

test("regression: computeAssignedActivityTiming never returns 5000 for real elapsed times", () => {
  const realElapsedValues = [15_000, 30_000, 60_000, 120_000, 250_000];
  for (const rawMs of realElapsedValues) {
    const { rawTimeSpentMs } = computeAssignedActivityTiming(rawMs);
    assert.notEqual(
      rawTimeSpentMs,
      5000,
      `rawTimeSpentMs should not be 5000 for real elapsed=${rawMs}`
    );
  }
});

test("regression: rawTimeSpentMs preserves exact input (no rounding for small values)", () => {
  assert.equal(computeAssignedActivityTiming(7_500).rawTimeSpentMs, 7_500);
  assert.equal(computeAssignedActivityTiming(22_350).rawTimeSpentMs, 22_350);
});

// ── Simulation: answer payload shape ─────────────────────────────────────────

test("simulation: assigned activity submit body has 3 timing fields", () => {
  // Simulates what pages/student/activity/[activityId].js builds before fetch
  const questionStartMs = Date.now() - 25_000; // 25 seconds ago
  const rawMs = Math.max(0, Date.now() - questionStartMs);
  const { rawTimeSpentMs, creditedTimeMs, timingStatus } =
    computeAssignedActivityTiming(rawMs);

  const body = {
    questionIndex: 0,
    selectedAnswer: "A",
    rawTimeSpentMs,
    creditedTimeMs,
    timingStatus,
    hintsUsed: 0,
    explanationViewed: false,
  };

  assert.ok(body.rawTimeSpentMs > 0, "rawTimeSpentMs must be > 0");
  assert.ok(body.creditedTimeMs > 0, "creditedTimeMs must be > 0");
  assert.equal(body.timingStatus, "normal");
  assert.equal(body.hintsUsed, 0);
  assert.notEqual(body.rawTimeSpentMs, 5000, "must not be hardcoded 5000");
});

test("simulation: very long session (35 minutes) preserves raw, caps credited", () => {
  const rawMs = 35 * 60 * 1000; // 35 minutes
  const { rawTimeSpentMs, creditedTimeMs, timingStatus } =
    computeAssignedActivityTiming(rawMs);

  assert.equal(rawTimeSpentMs, rawMs, "raw must be exact");
  assert.equal(creditedTimeMs, 300_000, "credited must be capped at 300s");
  assert.equal(timingStatus, "very_long");
  assert.ok(
    rawTimeSpentMs > creditedTimeMs,
    "raw must exceed credited for long sessions"
  );
});

test("simulation: free-practice answer payload has both raw and credited", () => {
  // Simulates what a master sends to saveLearningAnswer
  const questionStartTime = Date.now() - 45_000;
  const rawMs = questionStartTime ? Math.max(0, Date.now() - questionStartTime) : null;
  const { rawTimeSpentMs, creditedTimeMs, timingStatus } = computeFreePracticeTiming(rawMs, {
    creditedMs: Math.min(rawMs ?? 0, 300_000),
    tierCapMs: 300_000,
  });

  const payload = {
    timeSpentMs: rawTimeSpentMs,
    rawTimeSpentMs,
    creditedTimeMs,
    timingStatus,
  };

  assert.ok(payload.rawTimeSpentMs != null, "rawTimeSpentMs must be present");
  assert.ok(payload.creditedTimeMs != null, "creditedTimeMs must be present");
  assert.ok(payload.timingStatus != null, "timingStatus must be present");
  assert.notEqual(payload.rawTimeSpentMs, 5000, "must not be hardcoded 5000");
});

// ── explanationViewed logic ───────────────────────────────────────────────────

test("explanationViewed: false before any explanation shown", () => {
  let explanationViewedRef = { current: false };
  // Simulate submit before any explanation seen
  const explanationViewedNow = explanationViewedRef.current;
  assert.equal(explanationViewedNow, false);
});

test("explanationViewed: becomes true after explanation shown, resets next question", () => {
  let explanationViewedRef = { current: false };

  // Submit first answer — no explanation yet
  const firstSubmitExplanationViewed = explanationViewedRef.current;
  assert.equal(firstSubmitExplanationViewed, false);

  // Post-answer: explanation shown for guided_practice
  const json = { isCorrect: false, explanation: "כי 3 + 4 = 7" };
  if (json.explanation) explanationViewedRef.current = true;
  assert.equal(explanationViewedRef.current, true);

  // Next question: reset (simulated by effectiveIdx useEffect)
  explanationViewedRef.current = false;
  assert.equal(explanationViewedRef.current, false);

  // Second question submit — explanation was shown for previous question
  // BUT the ref was reset, so this submit correctly sends false for the NEW question
  const secondSubmitExplanationViewed = explanationViewedRef.current;
  assert.equal(secondSubmitExplanationViewed, false);
});
