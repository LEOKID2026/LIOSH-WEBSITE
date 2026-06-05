import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  activityChoiceGridClassName,
  shouldUseTwoColumnActivityChoices,
} from "../../lib/classroom-activities/student-activity-choice-layout.client.js";
import { STUDENT_ACTIVITY_LAYOUT } from "../../lib/classroom-activities/student-activity-layout.client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

test("shouldUseTwoColumnActivityChoices: 4 short choices use 2 columns on mobile and desktop", () => {
  assert.equal(shouldUseTwoColumnActivityChoices(["1", "2", "3", "4"]), true);
  assert.equal(activityChoiceGridClassName(["1", "2", "3", "4"]), "grid grid-cols-2 gap-2");
});

test("shouldUseTwoColumnActivityChoices: long text stays one column", () => {
  const long = "תשובה ארוכה מאוד שלא נכנסת בשורה";
  assert.equal(shouldUseTwoColumnActivityChoices(["1", long, "3", "4"]), false);
  assert.equal(activityChoiceGridClassName(["1", long]), "flex flex-col gap-2");
});

test("STUDENT_ACTIVITY_LAYOUT: card has no inner scroll", () => {
  assert.match(STUDENT_ACTIVITY_LAYOUT.card, /overflow-visible/);
  assert.match(STUDENT_ACTIVITY_LAYOUT.questionStage, /overflow-visible/);
  assert.doesNotMatch(STUDENT_ACTIVITY_LAYOUT.card, /overflow-y-auto/);
  assert.doesNotMatch(STUDENT_ACTIVITY_LAYOUT.questionStage, /lg:min-h-\[17rem\]/);
  assert.doesNotMatch(STUDENT_ACTIVITY_LAYOUT.cardGrid, /lg:grid-cols-2/);
});

test("StudentQuestionDisplay: question body must not use overflow-x-hidden (creates inner scroll)", () => {
  const src = readFileSync(
    path.join(repoRoot, "components/learning/StudentQuestionDisplay.jsx"),
    "utf8"
  );
  assert.doesNotMatch(src, /student-question-body[\s\S]*overflow-x-hidden/);
  assert.match(src, /overflow-visible/);
});

test("student activity page uses unified shell components", () => {
  const src = readFileSync(
    path.join(repoRoot, "pages/student/activity/[activityId].js"),
    "utf8"
  );
  assert.match(src, /StudentAssignedActivityShell/);
  assert.match(src, /activity-scratchpad-desktop-actions/);
  assert.match(src, /StudentAssignedActivityQuestionStage/);
  assert.match(src, /STUDENT_ACTIVITY_LAYOUT/);
  assert.doesNotMatch(src, /ClassroomGeometryQuestionDiagram/);
});

test("StudentAssignedActivityShell provides consistent header and full-width stack", () => {
  const shell = readFileSync(
    path.join(repoRoot, "components/student/StudentAssignedActivityShell.jsx"),
    "utf8"
  );
  const layout = readFileSync(
    path.join(repoRoot, "lib/classroom-activities/student-activity-layout.client.js"),
    "utf8"
  );
  assert.match(shell, /STUDENT_ACTIVITY_LAYOUT/);
  assert.match(shell, /← חזרה לבית/);
  assert.match(shell, /activity-question-stage/);
  assert.match(shell, /activity-actions-panel/);
  assert.match(shell, /overlayTopRef/);
  assert.match(shell, /usesScratchpadDock/);
  assert.match(shell, /data-scratchpad-dock/);
  assert.match(layout, /scratchpadDockShell/);
  assert.match(layout, /scratchpadDockDesktopButtonRow/);
  assert.match(layout, /max-w-6xl/);
  assert.match(layout, /flex flex-col/);
});

test("StudentActivityQuestionSurface uses shared layout typography", () => {
  const src = readFileSync(
    path.join(repoRoot, "components/student/StudentActivityQuestionSurface.jsx"),
    "utf8"
  );
  assert.match(src, /STUDENT_ACTIVITY_LAYOUT/);
  assert.match(src, /mathVerticalQuestionSurface/);
  assert.match(src, /mathVerticalExerciseSlot/);
  assert.match(src, /overflow-visible/);
  assert.match(src, /getStudentActivityQuestionFontStyle/);
  assert.doesNotMatch(src, /min-h-\[230px\]/);
  assert.doesNotMatch(src, /flex-1 flex flex-col/);
});

test("Geometry diagram supports embedded mode without svh scroll frame", () => {
  const src = readFileSync(
    path.join(repoRoot, "components/learning/geometry/GeometryExplanationDiagram.jsx"),
    "utf8"
  );
  assert.match(src, /embedded/);
  assert.match(src, /geometry-diagram-embedded/);
  assert.match(src, /overflow-visible/);
});

test("ClassroomGeometryQuestionDiagram passes embedded to activity stage", () => {
  const stage = readFileSync(
    path.join(repoRoot, "components/student/StudentAssignedActivityQuestionStage.jsx"),
    "utf8"
  );
  assert.match(stage, /embedded/);
});
