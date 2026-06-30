#!/usr/bin/env node
/**
 * Phase 1 selftest — science internal adaptive.
 * Run: node lib/learning/science-internal-adaptive.selftest.mjs
 */
import assert from "node:assert/strict";
import {
  ADAPTIVE_ADVANCE_STREAK,
  ADAPTIVE_DROP_STREAK,
  applyScienceAdaptiveAnswer,
  createScienceAdaptiveState,
  getScienceDisplayLevel,
  isScienceAdvancedAllowed,
  stepScienceInternalState,
} from "./science-internal-adaptive.js";

assert.equal(isScienceAdvancedAllowed(), false);
assert.equal(getScienceDisplayLevel(), "regular");

assert.equal(stepScienceInternalState("easy", 1), "medium");
assert.equal(stepScienceInternalState("medium", 1), "hard");
assert.equal(stepScienceInternalState("hard", 1), "hard");
assert.equal(stepScienceInternalState("hard", -1), "medium");
assert.equal(stepScienceInternalState("medium", -1), "easy");

let state = createScienceAdaptiveState();
assert.equal(state.internalState, "easy");

// easy → medium → hard via 3↑ each
for (let step = 0; step < ADAPTIVE_ADVANCE_STREAK; step++) {
  state = applyScienceAdaptiveAnswer(state, true);
}
assert.equal(state.internalState, "medium");

for (let step = 0; step < ADAPTIVE_ADVANCE_STREAK; step++) {
  state = applyScienceAdaptiveAnswer(state, true);
}
assert.equal(state.internalState, "hard");

// 2 wrong → down to medium
state = applyScienceAdaptiveAnswer(state, false);
state = applyScienceAdaptiveAnswer(state, false);
assert.equal(state.internalState, "medium");

// down to easy
state = applyScienceAdaptiveAnswer(state, false);
state = applyScienceAdaptiveAnswer(state, false);
assert.equal(state.internalState, "easy");

// assigned fixed — no step
const fixed = createScienceAdaptiveState({ internalState: "hard" });
for (let i = 0; i < ADAPTIVE_ADVANCE_STREAK; i++) {
  const next = applyScienceAdaptiveAnswer(fixed, true, { assignedDifficultyFixed: true });
  assert.equal(next.internalState, "hard");
}

console.log("PASS: science-internal-adaptive.selftest.mjs");
