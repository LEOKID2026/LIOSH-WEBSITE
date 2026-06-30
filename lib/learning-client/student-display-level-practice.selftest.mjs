#!/usr/bin/env node
/**
 * Phase 4 selftest — student display level UI wiring.
 * Run: node lib/learning-client/student-display-level-practice.selftest.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyStudentAdaptiveAnswer,
  buildStudentAnswerLevelFields,
  buildStudentSessionStartLevelFields,
  createStudentAdaptiveState,
  migrateLegacyPracticeKeyToDisplayLevel,
  migratePracticeResumeSnapshot,
  resolveSourceDifficultyForPractice,
  studentDisplayLevelKeys,
  studentDisplayLevelLabel,
  tagQuestionWithLevelFields,
} from "./student-display-level-practice.js";
import {
  applyRegularAdaptiveAnswer,
  ADAPTIVE_ADVANCE_STREAK,
} from "../learning/regular-internal-adaptive.js";
import { applyScienceAdaptiveAnswer } from "../learning/science-internal-adaptive.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const NON_SCIENCE = ["math", "geometry", "hebrew", "english", "history", "moledet_geography"];

// 1. Non-science: regular + advanced
for (const sid of NON_SCIENCE) {
  assert.deepEqual(studentDisplayLevelKeys(sid), ["regular", "advanced"], sid);
}

// 2. Science: regular only
assert.deepEqual(studentDisplayLevelKeys("science"), ["regular"]);

// 3. Labels — no קל/בינוני/קשה in display labels
assert.equal(studentDisplayLevelLabel("regular"), "רגיל");
assert.equal(studentDisplayLevelLabel("advanced"), "מתקדם");

// 4. English g1-g2 advanced allowed (keys include advanced)
assert.ok(studentDisplayLevelKeys("english").includes("advanced"));

// 5–6. Session start displayLevel
const regularSession = buildStudentSessionStartLevelFields("math", "regular", createStudentAdaptiveState("math"));
assert.equal(regularSession.displayLevel, "regular");
const advancedSession = buildStudentSessionStartLevelFields("math", "advanced", createStudentAdaptiveState("math"));
assert.equal(advancedSession.displayLevel, "advanced");

// 7. sourceDifficulty mapping
assert.equal(resolveSourceDifficultyForPractice("math", "advanced", null), "hard");
assert.equal(
  resolveSourceDifficultyForPractice("math", "regular", createStudentAdaptiveState("math", { internalState: "medium" })),
  "medium"
);

// 8. Science hard internal → displayLevel regular
const scienceAns = buildStudentAnswerLevelFields(
  "science",
  "regular",
  "hard",
  createStudentAdaptiveState("science", { internalState: "hard" })
);
assert.equal(scienceAns.displayLevel, "regular");
assert.equal(scienceAns.sourceDifficulty, "hard");
assert.equal(scienceAns.scienceInternalState, "hard");

// 9. Legacy resume
const migrated = migratePracticeResumeSnapshot({ level: "hard", gameActive: true }, "math");
assert.equal(migrated.displayLevel, "advanced");
assert.equal(migrated.level, "hard");
const scienceLegacy = migratePracticeResumeSnapshot({ level: "hard" }, "science");
assert.equal(scienceLegacy.displayLevel, "regular");

// 10. Moledet + geography separate masters file
assert.ok(fs.existsSync(path.join(root, "pages/learning/moledet-master.js")));
assert.ok(fs.existsSync(path.join(root, "pages/learning/geography-master.js")));
const mg = fs.readFileSync(path.join(root, "pages/learning/moledet-geography-master.js"), "utf8");
assert.match(mg, /StudentDisplayLevelSelect/);
assert.match(mg, /useStudentDisplayLevelPractice/);

// Adaptive: 3 correct → medium
let reg = createStudentAdaptiveState("math");
for (let i = 0; i < ADAPTIVE_ADVANCE_STREAK; i++) {
  reg = applyRegularAdaptiveAnswer(reg, true, { displayLevel: "regular" });
}
assert.equal(reg.internalState, "medium");

// Science adaptive steps
let sci = createStudentAdaptiveState("science");
for (let i = 0; i < ADAPTIVE_ADVANCE_STREAK; i++) sci = applyScienceAdaptiveAnswer(sci, true, {});
assert.equal(sci.internalState, "medium");

// Question tagging
const q = tagQuestionWithLevelFields({ id: 1 }, "advanced", "hard");
assert.equal(q.displayLevel, "advanced");
assert.equal(q.sourceDifficulty, "hard");
assert.equal(q.difficulty, "hard");

// Masters wired (grep smoke)
for (const file of [
  "math-master.js",
  "geometry-master.js",
  "hebrew-master.js",
  "english-master.js",
  "science-master.js",
  "history-master.js",
  "moledet-geography-master.js",
]) {
  const src = fs.readFileSync(path.join(root, "pages/learning", file), "utf8");
  assert.match(src, /StudentDisplayLevel(Select|RegularOnly)|useStudentDisplayLevelPractice/, file);
}

console.log("student-display-level-practice.selftest.mjs: all Phase 4 checks passed");
