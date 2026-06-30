#!/usr/bin/env node
/**
 * Phase 5 selftest — parent/teacher activity displayLevel.
 * Run: node lib/learning/activity-display-level.selftest.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTIVITY_FORBIDDEN_UI_LABELS,
  activityDbDifficultyLabelHe,
  activityDisplayLevelKeys,
  activityDisplayLevelLabelHe,
  buildAssignedActivityPlayLevelFields,
  enrichActivityQuestionLevelFieldsForPlay,
  readActivityDisplayLevelFromDb,
  writeActivityDifficultyFromDisplayLevel,
} from "./activity-display-level.js";
import { resolveActivityGenerationPlan } from "./activity-question-selection.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "../..");

const LAUNCH_SUBJECTS = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet_geography",
  "geography",
  "history",
];

// 1–2: parent/teacher UI options — regular/advanced only (not easy/medium/hard)
for (const sid of LAUNCH_SUBJECTS.filter((s) => s !== "science")) {
  assert.deepEqual(activityDisplayLevelKeys(sid), ["regular", "advanced"], sid);
}
assert.deepEqual(activityDisplayLevelKeys("science"), ["regular"]);

for (const label of ACTIVITY_FORBIDDEN_UI_LABELS) {
  assert.equal(activityDisplayLevelLabelHe("regular").includes(label), false);
  assert.equal(activityDisplayLevelLabelHe("advanced").includes(label), false);
}

// 3: science regular only
assert.equal(activityDisplayLevelKeys("science").length, 1);
assert.equal(activityDisplayLevelLabelHe("regular"), "רגיל");

// 4–6: write mapping
assert.equal(writeActivityDifficultyFromDisplayLevel("regular", "math"), "mixed");
assert.equal(writeActivityDifficultyFromDisplayLevel("advanced", "math"), "hard");
assert.equal(writeActivityDifficultyFromDisplayLevel("advanced", "science"), "mixed");
assert.equal(writeActivityDifficultyFromDisplayLevel("regular", "science"), "mixed");

// 7–8: legacy read
assert.equal(readActivityDisplayLevelFromDb("easy", "math"), "regular");
assert.equal(readActivityDisplayLevelFromDb("medium", "math"), "regular");
assert.equal(readActivityDisplayLevelFromDb("mixed", "math"), "regular");
assert.equal(readActivityDisplayLevelFromDb("hard", "math"), "advanced");

// 9: science hard legacy → regular display
assert.equal(readActivityDisplayLevelFromDb("hard", "science"), "regular");
assert.equal(activityDbDifficultyLabelHe("hard", "science"), "רגיל");
assert.equal(activityDbDifficultyLabelHe("hard", "math"), "מתקדם");

// 10: child play metadata
const playMeta = buildAssignedActivityPlayLevelFields(
  { difficulty_level: "mixed", subject: "math" },
  "math"
);
assert.equal(playMeta.displayLevel, "regular");
assert.equal(playMeta.regularInternalState, "easy");

const advMeta = buildAssignedActivityPlayLevelFields(
  { difficulty_level: "hard", subject: "geometry" },
  "geometry"
);
assert.equal(advMeta.displayLevel, "advanced");
assert.equal(advMeta.sourceDifficulty, "hard");

const scienceHardMeta = buildAssignedActivityPlayLevelFields(
  { difficulty_level: "hard", subject: "science" },
  "science"
);
assert.equal(scienceHardMeta.displayLevel, "regular");
assert.equal(scienceHardMeta.scienceInternalState, "hard");
assert.equal(scienceHardMeta.sourceDifficulty, undefined);

const enriched = enrichActivityQuestionLevelFieldsForPlay(
  { difficulty: "medium" },
  { displayLevel: "regular", sourceDifficulty: "medium" },
  { subject: "hebrew", difficultyLevel: "mixed" }
);
assert.equal(enriched.displayLevel, "regular");
assert.equal(enriched.sourceDifficulty, "medium");

// 11: 8-subject activity generation smoke (resolveActivityGenerationPlan SSOT)
for (const sid of LAUNCH_SUBJECTS) {
  const dbWrite = writeActivityDifficultyFromDisplayLevel("regular", sid);
  const plan = resolveActivityGenerationPlan(dbWrite, sid);
  assert.equal(plan.displayLevel, "regular", sid);
  assert.ok(plan.sourceDifficulties.length >= 1, sid);
  if (sid !== "science") {
    const advPlan = resolveActivityGenerationPlan("hard", sid);
    assert.equal(advPlan.displayLevel, "advanced", sid);
  }
}

// UI files must not expose legacy difficulty labels in assign flows
const uiFiles = [
  "components/parent/AssignActivityModal.js",
  "pages/teacher/class/[classId]/activities/new.js",
  "pages/teacher/students/activities/new.js",
  "components/teacher-portal/TeacherDiscussionQuestionPicker.jsx",
  "components/teacher-portal/TeacherStudentIndividualActivitiesPanel.jsx",
];

for (const rel of uiFiles) {
  const src = readFileSync(join(root, rel), "utf8");
  for (const forbidden of ["קל", "בינוני", "קשה"]) {
    assert.equal(
      src.includes(`>${forbidden}<`) || src.includes(`"${forbidden}"`),
      false,
      `${rel} must not show legacy label ${forbidden}`
    );
  }
}

// 12: no DB migration in Phase 5 scope (sanity — module only uses existing enums)
assert.equal(writeActivityDifficultyFromDisplayLevel("regular", "math"), "mixed");
assert.equal(writeActivityDifficultyFromDisplayLevel("advanced", "english"), "hard");

console.log("activity-display-level.selftest.mjs — all PASS");
