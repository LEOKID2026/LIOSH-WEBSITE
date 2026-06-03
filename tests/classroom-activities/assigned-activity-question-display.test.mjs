import test from "node:test";
import assert from "node:assert/strict";
import {
  assignedActivityInlineTextProps,
  assignedActivityTextIsMixedHebrewMath,
  extractAssignedActivityQuestionFields,
  shouldIsolateAssignedActivityTextLtr,
} from "../../lib/classroom-activities/assigned-activity-question-display.client.js";
import { resolveStudentQuestionDisplayParts } from "../../utils/student-question-display.js";

test("shouldIsolateAssignedActivityTextLtr detects math equations", () => {
  assert.equal(shouldIsolateAssignedActivityTextLtr("442 + 20 = __"), true);
  assert.equal(shouldIsolateAssignedActivityTextLtr("276.06 + 48.83 = __"), true);
  assert.equal(
    shouldIsolateAssignedActivityTextLtr("396₪ אחרי הנחה של 25%"),
    false
  );
});

test("assignedActivityInlineTextProps uses ltr isolate for equations", () => {
  const props = assignedActivityInlineTextProps("442 + 20 = __");
  assert.equal(props.dir, "ltr");
  assert.equal(props.style?.unicodeBidi, "isolate");
});

test("extractAssignedActivityQuestionFields reads frozen activity shape", () => {
  const fields = extractAssignedActivityQuestionFields({
    question: "442 + 20 = __",
    params: { kind: "add_two" },
    subject: "math",
  });
  assert.equal(fields.question, "442 + 20 = __");
});

test("resolveStudentQuestionDisplayParts treats plain equation as ltr body", () => {
  const parts = resolveStudentQuestionDisplayParts({ question: "442 + 20 = __" });
  assert.equal(parts.bodyKind, "equation");
  assert.equal(parts.bodyText.includes("442"), true);
  assert.equal(parts.leadText, "");
});

test("mixed Hebrew math prose is flagged for MixedHebrewMathText rendering", () => {
  assert.equal(
    assignedActivityTextIsMixedHebrewMath("במשולש, שתי זוויות ידועות (51° ו-55°)."),
    true
  );
});

test("english-leading instructions use ltr plaintext", () => {
  const props = assignedActivityInlineTextProps("Choose the correct word:");
  assert.equal(props.dir, "ltr");
});

test("pure Hebrew stays rtl", () => {
  const props = assignedActivityInlineTextProps("מה פירוש המילה בטקסט?");
  assert.equal(props.dir, "rtl");
});
