import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { generateActivityQuestionSetClient } from "../../lib/classroom-activities/generate-activity-questions-client.js";
import { stripQuestionSetForStudent } from "../../lib/classroom-activities/classroom-activities-shared.server.js";

const ANSWER_UI_SRC = readFileSync(
  fileURLToPath(new URL("../../utils/geometry-activity-answer-ui.js", import.meta.url)),
  "utf8"
);
const GENERATOR_SRC = readFileSync(
  fileURLToPath(new URL("../../lib/classroom-activities/generate-activity-questions-client.js", import.meta.url)),
  "utf8"
);

/** Mirror of production `assignedActivityQuestionUsesChoiceUi` for math MCQ regression checks. */
function assignedActivityQuestionUsesChoiceUiMirror(question) {
  const subject = String(question?.subject || "").trim().toLowerCase();
  if (subject === "math") return false;
  if (subject === "geometry") {
    const params = question?.params;
    if (!params || typeof params !== "object") return false;
    const baseKind = String(params.kind || "").replace(/^story_/, "");
    const hebrewLabels = {
      parallel_perpendicular: ["מקבילות", "מאונכות"],
      triangles: ["שווה צלעות", "שווה שוקיים", "שונה צלעות"],
      transformations: ["הזזה", "שיקוף", "סיבוב", "ללא תנועה"],
      concept_transform: ["הזזה", "שיקוף", "סיבוב", "ללא תנועה"],
      shapes_basic_square: ["ריבוע", "מלבן"],
      shapes_basic_rectangle: ["ריבוע", "מלבן"],
      shapes_basic_properties_square: ["2", "3", "4", "אין צלעות שוות"],
      shapes_basic_properties_rectangle: ["1", "2", "3", "4"],
      shapes_basic_properties_angles: ["2", "3", "4", "אין זוויות ישרות"],
    };
    const indexKinds = {
      quadrilaterals: 4,
      solids: 6,
    };
    return Boolean(hebrewLabels[baseKind]) || Boolean(indexKinds[baseKind]);
  }
  return Array.isArray(question?.choices) && question.choices.length > 0;
}

test("generator source does not copy math answers into choices", () => {
  const mathBlock = GENERATOR_SRC.slice(
    GENERATOR_SRC.indexOf('if (sub === "math")'),
    GENERATOR_SRC.indexOf('if (sub === "science")')
  );
  assert.doesNotMatch(mathBlock, /choices:\s*Array\.isArray\(q\.answers\)/);
});

test("answer-ui source forces math to numeric path (not MCQ from choices)", () => {
  assert.match(ANSWER_UI_SRC, /if \(subject === "math"\) return false/);
});

test("new math activity questions do not include choices in frozen set", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "math",
    gradeLevel: "g3",
    topic: "addition",
    difficulty: "easy",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.subject, "math");
    assert.equal(item.choices, undefined);
    assert.ok(item.correctAnswer != null && String(item.correctAnswer).trim() !== "");
  }
});

test("legacy math snapshots with choices render as numeric not MCQ", () => {
  const legacyIds = [
    {
      question: "48 + 2 = __",
      choices: ["96", "60", "50", "46"],
      subject: "math",
      topic: "addition",
    },
    {
      question: "663 + 941 = __",
      choices: ["1608", "1604", "278", "1614"],
      subject: "math",
      topic: "addition",
    },
  ];
  for (const q of legacyIds) {
    assert.equal(assignedActivityQuestionUsesChoiceUiMirror(q), false);
  }
});

test("clean legacy math without choices stays numeric", () => {
  const clean = {
    subject: "math",
    topic: "addition",
    question: "66 + 21 = __",
    params: { kind: "add_two", a: 66, b: 21 },
  };
  assert.equal(assignedActivityQuestionUsesChoiceUiMirror(clean), false);
});

test("stripQuestionSetForStudent + math rule keeps scratchpad path available", () => {
  const raw = [
    {
      question: "663 + 941 = __",
      correct_answer: "1604",
      subject: "math",
      topic: "addition",
      choices: ["1608", "1604", "278", "1614"],
      params: { kind: "add_two" },
    },
  ];
  const stripped = stripQuestionSetForStudent(raw, "guided_practice");
  assert.equal(stripped.length, 1);
  assert.equal(assignedActivityQuestionUsesChoiceUiMirror(stripped[0]), false);
});

test("geometry and english with choices still use MCQ UI", () => {
  assert.equal(
    assignedActivityQuestionUsesChoiceUiMirror({
      subject: "geometry",
      choices: ["1", "2", "3", "4"],
      params: { kind: "triangles" },
    }),
    true
  );
  assert.equal(
    assignedActivityQuestionUsesChoiceUiMirror({
      subject: "english",
      choices: ["cat", "dog", "bird", "fish"],
    }),
    true
  );
});
