import test from "node:test";
import assert from "node:assert/strict";

import { creditLearningUnitMs } from "../../lib/learning/learning-time-credit-policy.js";
import { computeAssignedActivityTiming } from "../../lib/learning/timing-policy.js";
import { computeParentVisitTimingFromStart } from "../../lib/learning-client/parentActivityLearningVisit.client.js";

test("parent visit — 8 min first visit credits 8 min", () => {
  const started = Date.now() - 480_000;
  const timing = computeParentVisitTimingFromStart(started);
  assert.equal(timing.creditedDwellMs, 480_000);
});

test("parent visit — 15 min visit caps at 10 min", () => {
  const started = Date.now() - 900_000;
  const timing = computeParentVisitTimingFromStart(started);
  assert.equal(timing.creditedDwellMs, 600_000);
});

test("parent visits aggregate — two visits same question sum (8+6)", () => {
  const first = creditLearningUnitMs(480_000);
  const second = creditLearningUnitMs(360_000);
  assert.equal(first + second, 840_000);
  assert.equal((first + second) / 60_000, 14);
});

test("assigned activity timing uses 10 min cap per visit", () => {
  assert.equal(computeAssignedActivityTiming(900_000).creditedTimeMs, 600_000);
  assert.equal(computeAssignedActivityTiming(360_000).creditedTimeMs, 360_000);
});
