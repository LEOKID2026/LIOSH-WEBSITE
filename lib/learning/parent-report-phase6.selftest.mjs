#!/usr/bin/env node
/**
 * Phase 6 selftest — parent report labels, next-step, sanitize, 8 subjects.
 * Run: node lib/learning/parent-report-phase6.selftest.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findForbiddenInternalLevelKeyLeaks,
  findForbiddenLegacyPracticeLevelHe,
  formatPracticeLevelLabelForParent,
  hasRegularMediumEvidence,
  resolvePracticeDisplayLevelKey,
} from "./parent-report-display-level.js";
import { formatParentReportLevelHe } from "../../utils/parent-report-language/parent-report-display-labels.he.js";
import { deepStripInternalReportKeys } from "../parent-server/report-payload-public-sanitize.js";
import { decideTopicNextStep, DEFAULT_TOPIC_NEXT_STEP_CONFIG } from "../../utils/topic-next-step-engine.js";
import { PARENT_COPY_FORBIDDEN_FRAGMENTS, PARENT_READABILITY_LEAK_SUBSTRINGS } from "../../utils/parent-report-language/forbidden-terms.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "../..");

const SUBJECTS_8 = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet_geography",
  "history",
];

const FORBIDDEN_HE = ["קל", "בינוני", "קשה"];

// 1–4: parent report labels
for (const legacy of ["easy", "medium", "mixed"]) {
  assert.equal(formatParentReportLevelHe(legacy, "math"), "רגיל", legacy);
}
assert.equal(formatParentReportLevelHe("hard", "math"), "מתקדם");
assert.equal(formatParentReportLevelHe("hard", "science"), "רגיל");
assert.equal(resolvePracticeDisplayLevelKey("hard", "science"), "regular");

for (const he of FORBIDDEN_HE) {
  assert.equal(formatParentReportLevelHe("regular", "math").includes(he), false);
  assert.equal(formatParentReportLevelHe("advanced", "math").includes(he), false);
}

// 5–6: sanitize internal fields
const sanitized = deepStripInternalReportKeys({
  summary: {
    dominantDisplayLevel: "regular",
    _sourceDifficultyBreakdown: { easy: 2, medium: 3, hard: 0, unknown: 0 },
    displayLevel: "regular",
    sourceDifficulty: "medium",
  },
});
assert.equal(sanitized.summary._sourceDifficultyBreakdown, undefined);
assert.equal(sanitized.summary.sourceDifficulty, undefined);
assert.equal(sanitized.summary.displayLevel, undefined);
assert.equal(sanitized.summary.dominantDisplayLevel, "regular");

// 7–11: topic-next-step engine
function rowBase(over = {}) {
  return {
    displayName: "חיבור",
    bucketKey: "addition",
    modeKey: "learning",
    questions: over.questions ?? 25,
    correct: over.correct ?? 20,
    wrong: over.wrong ?? 5,
    accuracy: over.accuracy ?? 80,
    gradeKey: "g3",
    levelKey: over.levelKey ?? "regular",
    displayLevelKey: over.displayLevelKey ?? "regular",
    level: over.level ?? "רגיל",
    subjectId: over.subjectId ?? "math",
    _sourceDifficultyBreakdown: over._sourceDifficultyBreakdown ?? {
      easy: 2,
      medium: 18,
      hard: 5,
      unknown: 0,
    },
    dataSufficiencyLevel: "strong",
    evidenceStrength: "strong",
    recencyScore: 55,
    ...over.extra,
  };
}

const advanceOk = decideTopicNextStep(
  {
    ...rowBase({
      questions: 30,
      accuracy: 88,
      correct: 26,
      wrong: 4,
      _sourceDifficultyBreakdown: { easy: 3, medium: 22, hard: 5, unknown: 0 },
    }),
    excellent: true,
    trend: {
      version: 1,
      accuracyDirection: "up",
      fluencyDirection: "flat",
      independenceDirection: "up",
      confidence: 0.72,
      summaryHe: "",
      windows: {
        currentPeriod: { accuracy: 88, questions: 30 },
        previousComparablePeriod: { accuracy: 82, questions: 28 },
        recentShortWindow: { accuracy: 90, questions: 10 },
        lastSessionsInRow: { accuracy: 88, questions: 8 },
      },
    },
    behaviorProfile: {
      version: 1,
      dominantType: "stable_mastery",
      strength01: 0.82,
      signals: { hintRate: 0.05, hintKnownCount: 2, wrongEventCount: 1 },
      summaryHe: "",
      decisionTrace: [],
    },
  },
  1,
  DEFAULT_TOPIC_NEXT_STEP_CONFIG
);
assert.equal(advanceOk.step, "advance_level");

const easyOnly = decideTopicNextStep(
  rowBase({
    questions: 25,
    accuracy: 82,
    _sourceDifficultyBreakdown: { easy: 20, medium: 5, hard: 0, unknown: 0 },
  }),
  1,
  DEFAULT_TOPIC_NEXT_STEP_CONFIG
);
assert.equal(easyOnly.step, "maintain_regular_strengthen_medium");

const advancedFail = decideTopicNextStep(
  rowBase({
    displayLevelKey: "advanced",
    levelKey: "advanced",
    level: "מתקדם",
    accuracy: 45,
    correct: 9,
    wrong: 11,
    questions: 20,
  }),
  3,
  DEFAULT_TOPIC_NEXT_STEP_CONFIG
);
assert.equal(advancedFail.step, "suggest_return_to_regular");
const advCopy = `${advancedFail.parentHe || ""} ${advancedFail.reasonHe || ""} ${advancedFail.studentHe || ""}`;
const ADV_FORBIDDEN_RE =
  /פער יסוד|פער יסודי|חוסר בסיס|חוסר הבנה בסיסית|ירידה בכיתה|drop_one_level|drop level/i;
assert.equal(ADV_FORBIDDEN_RE.test(advCopy), false, advCopy);

const scienceAdv = decideTopicNextStep(
  rowBase({
    subjectId: "science",
    displayLevelKey: "regular",
    levelKey: "regular",
    questions: 30,
    accuracy: 90,
    _sourceDifficultyBreakdown: { easy: 5, medium: 20, hard: 5, unknown: 0 },
  }),
  0,
  DEFAULT_TOPIC_NEXT_STEP_CONFIG
);
assert.notEqual(scienceAdv.step, "advance_level");

// medium evidence helper
assert.equal(hasRegularMediumEvidence({ _sourceDifficultyBreakdown: { easy: 2, medium: 18, hard: 0 } }), true);
assert.equal(hasRegularMediumEvidence({ _sourceDifficultyBreakdown: { easy: 18, medium: 2, hard: 0 } }), false);

// 12–15: 8 subjects label smoke + moledet/geography/history in labels SSOT
const labelsFile = readFileSync(
  join(root, "utils/parent-report-language/parent-report-display-labels.he.js"),
  "utf8"
);
assert.match(labelsFile, /history.*היסטוריה/);
assert.match(labelsFile, /moledet.*מולדת/);
assert.match(labelsFile, /geography.*גאוגרפיה/);

for (const sid of SUBJECTS_8) {
  const label = formatPracticeLevelLabelForParent("mixed", sid);
  assert.equal(label, "רגיל", sid);
  if (sid !== "science") {
    assert.equal(formatPracticeLevelLabelForParent("hard", sid), "מתקדם", sid);
  }
}
assert.equal(formatPracticeLevelLabelForParent("hard", "science"), "רגיל");
assert.equal(formatParentReportLevelHe("advanced", "science"), "רגיל");

// typo guard — parent SSOT must use מתקדם, never מתקedם
const typoRe = /מתקedם|מתק edם|מתקe|edם/;
for (const rel of [
  "lib/learning/parent-report-display-level.js",
  "lib/learning/display-level.js",
  "utils/parent-report-language/parent-report-display-labels.he.js",
]) {
  const src = readFileSync(join(root, rel), "utf8");
  assert.equal(typoRe.test(src), false, rel);
}

// copy guard SSOT includes advanced-failure forbidden terms
for (const term of [
  "פער יסוד",
  "פער יסודי",
  "חוסר בסיס",
  "חוסר הבנה בסיסית",
  "ירידה בכיתה",
]) {
  assert.ok(PARENT_COPY_FORBIDDEN_FRAGMENTS.includes(term), term);
}
for (const term of ["drop_one_level", "drop level"]) {
  assert.ok(PARENT_READABILITY_LEAK_SUBSTRINGS.includes(term), term);
}

// internal keys must not leak in serialized parent payload
const publicJson = JSON.stringify(
  deepStripInternalReportKeys({
    topics: [
      {
        displayLevelKey: "advanced",
        sourceDifficulty: "hard",
        regularInternalState: { medium: 3 },
        scienceInternalState: null,
        _sourceDifficultyBreakdown: { easy: 1, medium: 2, hard: 3 },
        level: "מתקדם",
      },
    ],
  })
);
assert.equal(findForbiddenInternalLevelKeyLeaks(publicJson).length, 0, publicJson);

// copy guard helpers
assert.ok(findForbiddenLegacyPracticeLevelHe("רמה קשה").includes("קשה"));
assert.ok(findForbiddenInternalLevelKeyLeaks("sourceDifficulty=medium").includes("sourceDifficulty"));

console.log("parent-report-phase6.selftest.mjs — all PASS");
