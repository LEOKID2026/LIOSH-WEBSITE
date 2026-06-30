#!/usr/bin/env node
/**
 * Phase 3 selftest — session/answer/evidence level roundtrip.
 * Run: node lib/learning/session-evidence-levels.selftest.mjs
 */
import assert from "node:assert/strict";
import {
  buildAnswerLevelFields,
  buildSessionStartLevelMetadata,
  bumpAnswerLevelRollups,
  dominantDisplayLevelFromCounts,
  finalizeDisplayLevelRollups,
  resolveAnswerLevelFromPayload,
} from "./session-evidence-levels.js";
import { buildDiagnosticEvidenceRow } from "../../utils/diagnostic-evidence.js";
import { deepStripInternalReportKeys } from "../parent-server/report-payload-public-sanitize.js";
import { resolveSessionLevels } from "./display-level.js";

// 1. Answer payload includes displayLevel + sourceDifficulty
const answerFields = buildAnswerLevelFields({
  subjectId: "math",
  bodyDisplayLevel: "advanced",
  bodySourceDifficulty: "hard",
  clientMeta: {},
  sessionMeta: { displayLevel: "regular", level: "easy" },
  questionEngine: { difficulty: "hard" },
});
assert.equal(answerFields.displayLevel, "advanced");
assert.equal(answerFields.sourceDifficulty, "hard");
assert.equal(answerFields.level, "hard");

// 2. questionLevel stays sourceDifficulty (via diagnostic evidence)
const evidence = buildDiagnosticEvidenceRow({
  subject: "math",
  topic: "addition",
  displayLevel: "advanced",
  sourceDifficulty: "hard",
  level: "mixed",
  mode: "learning",
});
assert.equal(evidence.questionLevel, "hard");
assert.equal(evidence.sourceDifficulty, "hard");
assert.equal(evidence.level, "hard");

// 3. science hard → displayLevel regular
const scienceAnswer = buildAnswerLevelFields({
  subjectId: "science",
  bodySourceDifficulty: "hard",
  clientMeta: {},
  sessionMeta: { level: "hard" },
  questionEngine: { difficulty: "hard" },
});
assert.equal(scienceAnswer.displayLevel, "regular");
assert.equal(scienceAnswer.sourceDifficulty, "hard");

const scienceEvidence = buildDiagnosticEvidenceRow({
  subject: "science",
  sourceDifficulty: "hard",
  level: "hard",
});
assert.equal(scienceEvidence.displayLevel, "regular");
assert.equal(scienceEvidence.questionLevel, "hard");

// 4. Legacy easy/medium/hard/mixed mapping (resume)
assert.deepEqual(resolveSessionLevels({ subjectId: "math", level: "easy" }), {
  displayLevel: "regular",
  regularInternalState: "easy",
});
assert.deepEqual(resolveSessionLevels({ subjectId: "math", level: "medium" }), {
  displayLevel: "regular",
  regularInternalState: "medium",
});
assert.deepEqual(resolveSessionLevels({ subjectId: "math", level: "hard" }), {
  displayLevel: "advanced",
  sourceDifficulty: "hard",
});
assert.deepEqual(resolveSessionLevels({ subjectId: "math", level: "mixed" }), {
  displayLevel: "regular",
  regularInternalState: "easy",
});
assert.deepEqual(resolveSessionLevels({ subjectId: "science", level: "hard" }), {
  displayLevel: "regular",
  scienceInternalState: "hard",
});

const legacyResume = resolveAnswerLevelFromPayload(
  { level: "easy", clientMeta: { level: "easy" } },
  { level: "easy", displayLevel: "regular", regularInternalState: "easy" },
  "math"
);
assert.equal(legacyResume.displayLevel, "regular");
assert.equal(legacyResume.sourceDifficulty, "easy");

// 5. Activity Phase 2 fields preserved through evidence
const activityPayload = resolveAnswerLevelFromPayload(
  {
    displayLevel: "regular",
    sourceDifficulty: "medium",
    questionEngine: { difficulty: "medium" },
    params: { sourceDifficulty: "medium" },
  },
  {},
  "hebrew"
);
assert.equal(activityPayload.displayLevel, "regular");
assert.equal(activityPayload.sourceDifficulty, "medium");

// 6–7. Aggregate rollups: dominantDisplayLevel + internal breakdown
const topicSlice = { displayLevelCounts: { regular: 0, advanced: 0, unknown: 0 } };
bumpAnswerLevelRollups(topicSlice, { displayLevel: "regular", sourceDifficulty: "easy" });
bumpAnswerLevelRollups(topicSlice, { displayLevel: "advanced", sourceDifficulty: "hard" });
bumpAnswerLevelRollups(topicSlice, { displayLevel: "advanced", sourceDifficulty: "hard" });
bumpAnswerLevelRollups(topicSlice, { displayLevel: "advanced", sourceDifficulty: "medium" });
finalizeDisplayLevelRollups(topicSlice);
assert.equal(topicSlice.dominantDisplayLevel, "advanced");
assert.deepEqual(topicSlice._sourceDifficultyBreakdown, {
  easy: 1,
  medium: 1,
  hard: 2,
  unknown: 0,
});

// 8. Old resume session metadata does not break
const sessionMeta = buildSessionStartLevelMetadata({
  subjectId: "math",
  level: "medium",
  clientMeta: {},
});
assert.equal(sessionMeta.level, "medium");
assert.equal(sessionMeta.displayLevel, "regular");
assert.equal(sessionMeta.regularInternalState, "medium");

// 9. _sourceDifficultyBreakdown not exposed to parent sanitize
const publicPayload = deepStripInternalReportKeys({
  summary: {
    dominantDisplayLevel: "regular",
    _sourceDifficultyBreakdown: { easy: 3, medium: 2, hard: 0, unknown: 0 },
  },
});
assert.equal(publicPayload.summary.dominantDisplayLevel, "regular");
assert.equal(publicPayload.summary._sourceDifficultyBreakdown, undefined);

// 10. questionEngine.difficulty = sourceDifficulty (not displayLevel)
const engineFields = buildAnswerLevelFields({
  subjectId: "math",
  bodyDisplayLevel: "regular",
  bodySourceDifficulty: "easy",
  clientMeta: {},
  sessionMeta: {},
  questionEngine: { difficulty: "medium" },
});
assert.equal(engineFields.questionEngineDifficulty, "easy");
assert.equal(engineFields.clientMeta.level, "easy");

assert.equal(dominantDisplayLevelFromCounts({ regular: 5, advanced: 2, unknown: 0 }), "regular");

console.log("session-evidence-levels.selftest.mjs: all Phase 3 checks passed");
