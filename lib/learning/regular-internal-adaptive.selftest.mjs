#!/usr/bin/env node
/**
 * Phase 1 selftest — regular internal adaptive.
 * Run: node lib/learning/regular-internal-adaptive.selftest.mjs
 */
import assert from "node:assert/strict";
import {
  ADAPTIVE_ADVANCE_STREAK,
  ADAPTIVE_DROP_STREAK,
  applyRegularAdaptiveAnswer,
  createRegularAdaptiveState,
  isRegularAdaptiveActive,
  stepRegularInternalState,
} from "./regular-internal-adaptive.js";

assert.equal(stepRegularInternalState("easy", 1), "medium");
assert.equal(stepRegularInternalState("medium", 1), "medium");
assert.equal(stepRegularInternalState("medium", -1), "easy");
assert.equal(stepRegularInternalState("easy", -1), "easy");

let state = createRegularAdaptiveState();
assert.equal(state.internalState, "easy");

// 3 correct → up
for (let i = 0; i < ADAPTIVE_ADVANCE_STREAK; i++) {
  state = applyRegularAdaptiveAnswer(state, true);
}
assert.equal(state.internalState, "medium");
assert.equal(state.correctStreak, 0);

// 2 wrong → down
state = applyRegularAdaptiveAnswer(state, false);
state = applyRegularAdaptiveAnswer(state, false);
assert.equal(state.internalState, "easy");
assert.equal(state.wrongStreak, 0);

// no adaptive in mistakes/graded
const frozen = createRegularAdaptiveState({ internalState: "medium" });
for (let i = 0; i < ADAPTIVE_ADVANCE_STREAK; i++) {
  const next = applyRegularAdaptiveAnswer(frozen, true, { mode: "mistakes" });
  assert.equal(next.internalState, "medium");
}
for (let i = 0; i < ADAPTIVE_DROP_STREAK; i++) {
  const next = applyRegularAdaptiveAnswer(frozen, false, { mode: "graded" });
  assert.equal(next.internalState, "medium");
}

assert.equal(isRegularAdaptiveActive({ mode: "learning" }), true);
assert.equal(isRegularAdaptiveActive({ mode: "mistakes" }), false);
assert.equal(isRegularAdaptiveActive({ assignedDifficultyFixed: true }), false);

console.log("PASS: regular-internal-adaptive.selftest.mjs");
