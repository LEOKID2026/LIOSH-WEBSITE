#!/usr/bin/env node
/**
 * Phase 1 selftest — display-level SSOT.
 * Run: node lib/learning/display-level.selftest.mjs
 */
import assert from "node:assert/strict";
import {
  activityDbEnumToDisplayLevel,
  displayLevelLabelHe,
  displayLevelToActivityDbEnum,
  displayLevelToSourceDifficulties,
  isDisplayLevelAllowedForSubject,
  isScienceSubjectId,
  normalizeLegacyLevelToDisplayLevel,
  resolveActivitySourceDifficulties,
  resolveSessionLevels,
  sourceDifficultyToDisplayLevel,
} from "./display-level.js";

const LAUNCH_ADVANCED = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "moledet_geography",
  "moledet-geography",
  "history",
];

const FORBIDDEN_LABELS = ["קל", "בינוני", "קשה"];

// science advanced=false
assert.equal(isDisplayLevelAllowedForSubject("advanced", "science"), false);
assert.equal(isDisplayLevelAllowedForSubject("regular", "science"), true);

// 7 other subjects advanced=true
for (const sid of LAUNCH_ADVANCED) {
  assert.equal(isDisplayLevelAllowedForSubject("advanced", sid), true, sid);
  assert.equal(isDisplayLevelAllowedForSubject("regular", sid), true, sid);
}

// regular non-science → easy+medium
for (const sid of LAUNCH_ADVANCED) {
  assert.deepEqual(displayLevelToSourceDifficulties("regular", sid), ["easy", "medium"], sid);
}

// science regular → easy+medium+hard
assert.deepEqual(displayLevelToSourceDifficulties("regular", "science"), [
  "easy",
  "medium",
  "hard",
]);
assert.equal(isScienceSubjectId("science"), true);

// advanced → hard only
for (const sid of [...LAUNCH_ADVANCED, "science"]) {
  assert.deepEqual(displayLevelToSourceDifficulties("advanced", sid), ["hard"], sid);
}

// legacy mapping
assert.equal(normalizeLegacyLevelToDisplayLevel("easy"), "regular");
assert.equal(normalizeLegacyLevelToDisplayLevel("medium"), "regular");
assert.equal(normalizeLegacyLevelToDisplayLevel("mixed"), "regular");
assert.equal(normalizeLegacyLevelToDisplayLevel("hard"), "advanced");
assert.equal(sourceDifficultyToDisplayLevel("easy"), "regular");
assert.equal(sourceDifficultyToDisplayLevel("medium"), "regular");
assert.equal(sourceDifficultyToDisplayLevel("hard"), "advanced");

// activity DB mapping
assert.equal(displayLevelToActivityDbEnum("regular"), "mixed");
assert.equal(displayLevelToActivityDbEnum("advanced"), "hard");
assert.equal(activityDbEnumToDisplayLevel("mixed"), "regular");
assert.equal(activityDbEnumToDisplayLevel("hard"), "advanced");

// resolveActivitySourceDifficulties — NOT medium-only for mixed
assert.deepEqual(resolveActivitySourceDifficulties("mixed", "math"), ["easy", "medium"]);
assert.deepEqual(resolveActivitySourceDifficulties("mixed", "science"), [
  "easy",
  "medium",
  "hard",
]);
assert.deepEqual(resolveActivitySourceDifficulties("medium", "math"), ["easy", "medium"]);
assert.deepEqual(resolveActivitySourceDifficulties("easy", "math"), ["easy", "medium"]);
assert.deepEqual(resolveActivitySourceDifficulties("hard", "math"), ["hard"]);

// labels — no קל/בינוני/קשה
const regularLabel = displayLevelLabelHe("regular");
const advancedLabel = displayLevelLabelHe("advanced");
assert.equal(regularLabel, "רגיל");
assert.equal(advancedLabel, "מתקדם");
for (const forbidden of FORBIDDEN_LABELS) {
  assert.equal(regularLabel.includes(forbidden), false);
  assert.equal(advancedLabel.includes(forbidden), false);
}

// resolveSessionLevels
assert.deepEqual(resolveSessionLevels({ level: "easy", subjectId: "math" }), {
  displayLevel: "regular",
  regularInternalState: "easy",
});
assert.deepEqual(resolveSessionLevels({ level: "hard", subjectId: "math" }), {
  displayLevel: "advanced",
  sourceDifficulty: "hard",
});
assert.deepEqual(resolveSessionLevels({ level: "medium", subjectId: "science" }), {
  displayLevel: "regular",
  scienceInternalState: "medium",
});
assert.deepEqual(
  resolveSessionLevels({ displayLevel: "advanced", subjectId: "science" }),
  { displayLevel: "regular", scienceInternalState: "easy" },
);

console.log("PASS: display-level.selftest.mjs");
