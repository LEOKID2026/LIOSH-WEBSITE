#!/usr/bin/env node
/**
 * Phase 2 selftest — activity question selection helpers.
 * Run: node lib/learning/activity-question-selection.selftest.mjs
 */
import assert from "node:assert/strict";
import {
  mixedMapsToMultipleSourceDifficulties,
  resolveActivityGenerationPlan,
  resolveActivitySourceDifficulties,
} from "./activity-question-selection.js";

assert.equal(mixedMapsToMultipleSourceDifficulties("mixed", "math"), true);
assert.notDeepEqual(resolveActivitySourceDifficulties("mixed", "math"), ["medium"]);

const scienceMixed = resolveActivityGenerationPlan("mixed", "science");
assert.deepEqual(scienceMixed.sourceDifficulties, ["easy", "medium", "hard"]);
assert.equal(scienceMixed.displayLevel, "regular");

const mathHard = resolveActivityGenerationPlan("hard", "math");
assert.deepEqual(mathHard.sourceDifficulties, ["hard"]);
assert.equal(mathHard.displayLevel, "advanced");

console.log("PASS: activity-question-selection.selftest.mjs");
