import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  normalizeStudentActivityScope,
  studentActivityScopeBadgeHe,
} from "../../lib/classroom-activities/student-activity-scope-labels.client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

test("studentActivityScopeBadgeHe: parent renders פעילות אישית", () => {
  assert.equal(studentActivityScopeBadgeHe("parent"), "פעילות אישית");
});

test("studentActivityScopeBadgeHe: class has no badge", () => {
  assert.equal(studentActivityScopeBadgeHe("class"), null);
  assert.equal(studentActivityScopeBadgeHe(undefined), null);
});

test("studentActivityScopeBadgeHe: student keeps existing individual badge", () => {
  assert.equal(studentActivityScopeBadgeHe("student"), "אישי");
});

test("normalizeStudentActivityScope maps scopes safely", () => {
  assert.equal(normalizeStudentActivityScope("class"), "class");
  assert.equal(normalizeStudentActivityScope("student"), "student");
  assert.equal(normalizeStudentActivityScope("parent"), "parent");
  assert.equal(normalizeStudentActivityScope(undefined), "class");
});

test("StudentClassroomActivitiesPanel: parent scope not grouped as classroom", () => {
  const src = readFileSync(
    path.join(repoRoot, "components/student/StudentClassroomActivitiesPanel.jsx"),
    "utf8"
  );
  assert.match(src, /normalizeStudentActivityScope\(a\.scope\) === "class"/);
  assert.match(src, /normalizeStudentActivityScope\(a\.scope\) === "parent"/);
  assert.match(src, /studentActivityScopeBadgeHe\("parent"\)/);
  assert.match(src, /פעילויות כיתה/);
  assert.doesNotMatch(src, /a\.scope !== "student"/);
});

test("StudentClassroomActivitiesPanel: class section keeps classroom title", () => {
  const src = readFileSync(
    path.join(repoRoot, "components/student/StudentClassroomActivitiesPanel.jsx"),
    "utf8"
  );
  assert.match(src, /פעילויות כיתה/);
  assert.match(src, /studentActivityScopeBadgeHe\("student"\)/);
});

test("formatActivityTopicDisplayHe maps internal keys to Hebrew", async () => {
  const { formatActivityTopicDisplayHe } = await import(
    "../../lib/classroom-activities/student-activity-display-labels.client.js"
  );
  assert.equal(formatActivityTopicDisplayHe("math", "addition"), "חיבור");
  assert.doesNotMatch(formatActivityTopicDisplayHe("math", "addition"), /addition/i);
});

test("ParentSentActivitiesPanel uses modal trigger not inline list", () => {
  const src = readFileSync(
    path.join(repoRoot, "components/parent/ParentSentActivitiesPanel.jsx"),
    "utf8"
  );
  assert.match(src, /parentSentActivitiesSectionTitleHe\(\)/);
  assert.match(src, /ParentSentActivitiesModal/);
  assert.match(src, /formatActivityTopicDisplayHe/);
  assert.doesNotMatch(src, /mt-3 rounded border border-emerald-500\/25 bg-emerald-950\/20 p-3 space-y-2/);
});

test("student home personal activities tile label and count", () => {
  const src = readFileSync(path.join(repoRoot, "pages/student/home.js"), "utf8");
  assert.match(src, /פעילויות אישיות/);
  assert.doesNotMatch(src, /פעילויות מהמורה/);
  assert.match(src, /personalActivityCount/);
  assert.match(src, /normalizeStudentActivityScope/);
});

test("student activity page supports layout toggle and numeric input", () => {
  const activityPage = readFileSync(
    path.join(repoRoot, "pages/student/activity/[activityId].js"),
    "utf8"
  );
  assert.match(activityPage, /StudentAssignedActivityShell/);
  assert.match(activityPage, /StudentAssignedActivityQuestionStage/);
  assert.match(activityPage, /assignedActivityUsesNumericKeyboard/);
  assert.match(activityPage, /StudentNumericAnswerField/);
  assert.match(activityPage, /useMobileEmbeddedNumericSubmit/);
  assert.match(activityPage, /onSubmit=\{/);
  assert.match(activityPage, /activity-submit-answer/);
  assert.match(activityPage, /mobileEmbeddedNumericSubmit/);
  assert.match(activityPage, /MathScratchpadSlot/);
  assert.match(activityPage, /ScratchpadVirtualInputProvider/);
  assert.match(activityPage, /assignedActivityUsesMathScratchpad/);

  const ui = readFileSync(
    path.join(repoRoot, "lib/classroom-activities/student-activity-question-ui.client.js"),
    "utf8"
  );
  assert.match(ui, /assignedActivityUsesNumericKeyboard/);
  assert.match(ui, /inputMode: "decimal"/);
  assert.match(ui, /buildVerticalOperation/);

  const surface = readFileSync(
    path.join(repoRoot, "components/student/StudentActivityQuestionSurface.jsx"),
    "utf8"
  );
  assert.match(surface, /↕️ מאונך/);
  assert.match(surface, /↔️ מאוזן/);
  assert.match(surface, /activity-math-layout-toggle/);
});

test("assigned activity math layout: params.a/b enables vertical toggle", async () => {
  const {
    canStudentActivityQuestionDisplayVertically,
    getStudentActivityVerticalExerciseText,
    parseHorizontalArithmeticExercise,
    normalizeStudentActivityMathLayoutQuestion,
  } = await import("../../lib/classroom-activities/student-activity-question-ui.client.js");

  const activityQuestion = {
    subject: "math",
    topic: "addition",
    question: "3 + 13 = __",
    params: { kind: "add_basic", a: 3, b: 13, op: "add", exerciseText: "3 + 13 = __" },
  };

  assert.equal(parseHorizontalArithmeticExercise("3 + 13 = __")?.a, 3);
  assert.equal(parseHorizontalArithmeticExercise("3 + 13 = __")?.b, 13);

  const normalized = normalizeStudentActivityMathLayoutQuestion(activityQuestion);
  assert.equal(normalized.a, 3);
  assert.equal(normalized.b, 13);
  assert.equal(normalized.operation, "addition");

  assert.equal(canStudentActivityQuestionDisplayVertically(activityQuestion), true);
  const vertical = getStudentActivityVerticalExerciseText(activityQuestion);
  assert.match(vertical, /3/);
  assert.match(vertical, /13/);
});
