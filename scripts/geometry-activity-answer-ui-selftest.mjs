/**
 * Selftest for utils/geometry-activity-answer-ui.js — run: npm run test:geometry-activity-answer-ui
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const {
  assignedActivityQuestionUsesChoiceUi,
  geometryQuestionUsesChoiceUi,
  gradeAssignedActivityAnswer,
  gradeGeometryActivityAnswer,
} = await import(pathToFileURL(join(ROOT, "utils", "geometry-activity-answer-ui.js")).href);

assert.equal(geometryQuestionUsesChoiceUi({ kind: "triangles" }), true);
assert.equal(geometryQuestionUsesChoiceUi({ kind: "quadrilaterals" }), true);
assert.equal(geometryQuestionUsesChoiceUi({ kind: "story_parallel_perpendicular" }), true);
assert.equal(geometryQuestionUsesChoiceUi({ kind: "square_area" }), false);
assert.equal(geometryQuestionUsesChoiceUi({ kind: "concept_shape_truth", answerMode: "binary" }), true);
assert.equal(geometryQuestionUsesChoiceUi({ kind: "concept_solids", answerMode: "mcq_text" }), true);

assert.equal(
  assignedActivityQuestionUsesChoiceUi({
    subject: "geometry",
    params: { kind: "square_area" },
    choices: ["12", "13", "14", "15"],
  }),
  false
);
assert.equal(
  assignedActivityQuestionUsesChoiceUi({
    subject: "geometry",
    params: { kind: "triangles" },
    choices: ["שווה צלעות", "שווה שוקיים", "שונה צלעות"],
  }),
  true
);
assert.equal(
  assignedActivityQuestionUsesChoiceUi({
    subject: "geometry",
    params: { kind: "concept_shape_truth", answerMode: "binary", optionCount: 2 },
    choices: ["נכון", "לא נכון"],
  }),
  true
);
assert.equal(
  assignedActivityQuestionUsesChoiceUi({
    subject: "math",
    choices: ["4", "5", "6"],
  }),
  false
);

const numericQuestion = {
  subject: "geometry",
  params: { kind: "square_area" },
  choices: ["24", "25", "26", "27"],
};
assert.equal(gradeGeometryActivityAnswer("24.000001", "24", numericQuestion), true);
assert.equal(gradeGeometryActivityAnswer("25", "24", numericQuestion), false);
assert.equal(gradeGeometryActivityAnswer("24,5", "24.5", numericQuestion), true);

const choiceQuestion = {
  subject: "geometry",
  params: { kind: "triangles" },
  choices: ["שווה צלעות", "שווה שוקיים", "שונה צלעות"],
};
assert.equal(gradeGeometryActivityAnswer("שווה שוקיים", "שווה שוקיים", choiceQuestion), true);
assert.equal(gradeGeometryActivityAnswer("24", "שווה שוקיים", choiceQuestion), false);

assert.equal(
  gradeAssignedActivityAnswer("7", "7", { subject: "math", choices: ["7", "8"] }),
  true
);

console.log("geometry-activity-answer-ui-selftest: OK");
