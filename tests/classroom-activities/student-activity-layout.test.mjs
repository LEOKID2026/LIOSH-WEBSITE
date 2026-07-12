import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  activityChoiceGridClassName,
  shouldUseTwoColumnActivityChoices,
} from "../../lib/classroom-activities/student-activity-choice-layout.client.js";
import {
  STUDENT_ACTIVITY_LAYOUT,
  STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES,
} from "../../lib/classroom-activities/student-activity-layout.client.js";
import {
  isTextualAssignedActivitySubject,
  normalizeAssignedActivitySubjectKey,
} from "../../lib/classroom-activities/student-activity-textual-subjects.client.js";
import { resolveStudentActivityUi } from "../../lib/student-ui/student-theme-resolver.client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

test("shouldUseTwoColumnActivityChoices: 4 short choices use 2 columns on mobile and desktop", () => {
  assert.equal(shouldUseTwoColumnActivityChoices(["1", "2", "3", "4"]), true);
  assert.equal(activityChoiceGridClassName(["1", "2", "3", "4"]), "grid grid-cols-2 gap-2");
});

test("shouldUseTwoColumnActivityChoices: long text stays one column (legacy math/geometry path)", () => {
  const long = "תשובה ארוכה מאוד שלא נכנסת בשורה";
  assert.equal(shouldUseTwoColumnActivityChoices(["1", long, "3", "4"]), false);
  assert.equal(activityChoiceGridClassName(["1", long]), "flex flex-col gap-2");
});

test("textualAssigned: always 2-col at every width, including long answers", () => {
  const long = "תשובה ארוכה מאוד שלא נכנסת בשורה אחת בכלל";
  const cls = activityChoiceGridClassName(["א", long, "ג", "ד"], {
    textualAssigned: true,
  });
  assert.match(cls, /grid-cols-2/);
  assert.doesNotMatch(cls, /grid-cols-1/);
  assert.doesNotMatch(cls, /flex flex-col/);
});

test("textualAssigned: short choices also stay 2-col", () => {
  const cls = activityChoiceGridClassName(["1", "2", "3", "4"], {
    textualAssigned: true,
  });
  assert.match(cls, /grid-cols-2/);
});

test("textual subject allowlist + aliases", () => {
  assert.equal(isTextualAssignedActivitySubject("hebrew"), true);
  assert.equal(isTextualAssignedActivitySubject("english"), true);
  assert.equal(isTextualAssignedActivitySubject("science"), true);
  assert.equal(isTextualAssignedActivitySubject("history"), true);
  assert.equal(isTextualAssignedActivitySubject("moledet_geography"), true);
  assert.equal(isTextualAssignedActivitySubject("moledet"), true);
  assert.equal(isTextualAssignedActivitySubject("geography"), true);
  assert.equal(normalizeAssignedActivitySubjectKey("moledet"), "moledet_geography");
  assert.equal(normalizeAssignedActivitySubjectKey("geography"), "moledet_geography");
  assert.equal(isTextualAssignedActivitySubject("math"), false);
  assert.equal(isTextualAssignedActivitySubject("geometry"), false);
});

test("textualAssigned anchors actions at bottom and grows question area", () => {
  assert.match(STUDENT_ACTIVITY_LAYOUT.questionStage, /min-h-\[9\.5rem\]/);
  assert.match(STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES.page, /100dvh-3\.75rem-72px/);
  assert.match(STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES.page, /overflow-hidden/);
  assert.match(STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES.card, /\bflex-1\b/);
  assert.match(STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES.questionStage, /\bflex-1\b/);
  assert.match(STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES.actionsPanel, /\bshrink-0\b/);
  assert.match(STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES.footerNav, /\bhidden\b/);
  assert.match(
    STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES.scratchpadDockDesktopButtonRow,
    /flex-nowrap/
  );
  assert.match(
    STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES.scratchpadDockDesktopSubmitButton,
    /min-h-\[3\.25rem\]/
  );

  const mathUi = resolveStudentActivityUi("classic", { textualAssigned: false });
  const textUi = resolveStudentActivityUi("classic", { textualAssigned: true });
  assert.match(mathUi.L.questionStage, /min-h-\[9\.5rem\]/);
  assert.doesNotMatch(mathUi.L.page, /100dvh/);
  assert.match(textUi.L.questionStage, /\bflex-1\b/);
  assert.match(textUi.L.actionsPanel, /\bshrink-0\b/);
  assert.match(mathUi.L.scratchpadDockDesktopButtonRow, /flex-wrap/);
  assert.match(textUi.L.scratchpadDockDesktopButtonRow, /flex-nowrap/);
  assert.equal(mathUi.textualAssigned, false);
  assert.equal(textUi.textualAssigned, true);
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

test("student activity page uses unified shell components and textual gate", () => {
  const src = readFileSync(
    path.join(repoRoot, "pages/student/activity/[activityId].js"),
    "utf8"
  );
  assert.match(src, /StudentAssignedActivityShell/);
  assert.match(src, /activity-scratchpad-desktop-actions/);
  assert.match(src, /StudentAssignedActivityQuestionStage/);
  assert.match(src, /isTextualAssignedActivitySubject/);
  assert.match(src, /StudentActivityLayoutVariantProvider/);
  assert.match(src, /textualAssigned/);
  assert.match(src, /renderDesktopDockButtonRow/);
  assert.match(src, /includePerQuestionSubmit: false/);
  assert.doesNotMatch(src, /textualCompact/);
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
  assert.match(shell, /useStudentActivityUi/);
  assert.match(shell, /← חזרה לבית/);
  assert.match(shell, /activity-question-stage/);
  assert.match(shell, /activity-actions-panel/);
  assert.match(shell, /overlayTopRef/);
  assert.match(shell, /usesScratchpadDock/);
  assert.match(shell, /data-scratchpad-dock/);
  assert.match(shell, /textual-assigned/);
  assert.match(layout, /scratchpadDockShell/);
  assert.match(layout, /scratchpadDockDesktopButtonRow/);
  assert.match(layout, /max-w-6xl/);
  assert.match(layout, /flex flex-col/);
  assert.match(layout, /STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES/);
});

test("StudentActivityQuestionSurface uses shared layout typography", () => {
  const src = readFileSync(
    path.join(repoRoot, "components/student/StudentActivityQuestionSurface.jsx"),
    "utf8"
  );
  assert.match(src, /useStudentActivityUi/);
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

test("activity geometry diagram: single mini in stage flow with enlarge, no embedded/actions duplicate", () => {
  const stage = readFileSync(
    path.join(repoRoot, "components/student/StudentAssignedActivityQuestionStage.jsx"),
    "utf8"
  );
  const page = readFileSync(
    path.join(repoRoot, "pages/student/activity/[activityId].js"),
    "utf8"
  );
  assert.match(stage, /GeometryExplanationDiagram/);
  assert.match(stage, /\bmini\b/);
  assert.match(stage, /הגדל/);
  assert.match(stage, /onExpandDiagram/);
  assert.match(stage, /w-full shrink-0 flex justify-center/);
  assert.doesNotMatch(stage, /absolute bottom-0 left-1\/2/);
  assert.doesNotMatch(stage, /-translate-x-1\/2/);
  assert.doesNotMatch(stage, /ClassroomGeometryQuestionDiagram/);
  assert.doesNotMatch(page, /activity-geometry-diagram/);
  assert.match(page, /expandGeometryDiagram/);
  assert.match(page, /showDiagramModal/);
  assert.match(page, /usesGeometryAnswerDock/);
  assert.match(page, /usesAnswerDock/);
});

test("math/geometry base choice path unchanged when textualAssigned is false", () => {
  assert.equal(
    activityChoiceGridClassName(["12", "34", "56", "78"], { textualAssigned: false }),
    "grid grid-cols-2 gap-2"
  );
  assert.equal(
    activityChoiceGridClassName(
      ["תשובה ארוכה מאוד שלא נכנסת", "ב", "ג", "ד"],
      { textualAssigned: false }
    ),
    "flex flex-col gap-2"
  );
});
