import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  getAssessmentDiagramHiddenAnswerValues,
  getAssessmentDiagramVisibleValues,
  getGeometryDiagramSpec,
} from "../utils/geometry-diagram-spec.js";
import { answersMatch } from "../lib/classroom-activities/classroom-activities-shared.server.js";
import { generateActivityQuestionSetClient } from "../lib/classroom-activities/generate-activity-questions-client.js";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const studentActivitySrc = readFileSync(
  join(repoRoot, "../pages/student/activity/[activityId].js"),
  "utf8"
);

const TRIANGLE_Q = {
  topic: "angles",
  params: { kind: "triangle_angles", angle1: 57, angle2: 72, angle3: 51 },
};

test("assessment triangle diagram hides third angle but keeps internal value", () => {
  const spec = getGeometryDiagramSpec(TRIANGLE_Q, { hideUnknownValues: true });
  assert.equal(spec.hideAngle3, true);
  assert.equal(spec.angle3, 51);

  const visible = getAssessmentDiagramVisibleValues(spec);
  const hidden = getAssessmentDiagramHiddenAnswerValues(spec);

  assert.ok(visible.includes("57°"));
  assert.ok(visible.includes("72°"));
  assert.ok(visible.includes("?"));
  assert.ok(!visible.includes("51°"));
  for (const secret of hidden) {
    assert.ok(!visible.some((label) => label === secret || label === `${secret}°`));
  }
});

test("explanation triangle diagram may show all angles", () => {
  const spec = getGeometryDiagramSpec(TRIANGLE_Q);
  assert.notEqual(spec.hideAngle3, true);
  const visible = getAssessmentDiagramVisibleValues(spec);
  assert.ok(visible.includes("51°"));
});

test("assessment pythagoras hypotenuse hides c", () => {
  const spec = getGeometryDiagramSpec(
    {
      topic: "pythagoras",
      params: { kind: "pythagoras_hyp", a: 3, b: 4, c: 5, which: "hypotenuse" },
    },
    { hideUnknownValues: true }
  );
  assert.equal(spec.hideSide, "c");
  const visible = getAssessmentDiagramVisibleValues(spec).join(" ");
  assert.match(visible, /c = \?/);
  assert.ok(!visible.includes("c = 5"));
  assert.match(visible, /a = 3/);
  assert.match(visible, /b = 4/);
});

test("generated geometry angles items preserve grading answer while hiding diagram secret", async () => {
  const qs = await generateActivityQuestionSetClient({
    subject: "geometry",
    gradeLevel: "g4",
    topic: "angles",
    difficulty: "medium",
    count: 5,
  });
  assert.equal(qs.length, 5);
  for (const item of qs) {
    assert.equal(item.params?.kind, "triangle_angles");
    const spec = getGeometryDiagramSpec(
      { topic: item.topic, params: item.params },
      { hideUnknownValues: true }
    );
    assert.equal(String(item.correctAnswer), String(spec.angle3));
    const hidden = getAssessmentDiagramHiddenAnswerValues(spec);
    const visible = getAssessmentDiagramVisibleValues(spec);
    assert.ok(visible.includes("?"));
    assert.ok(!visible.includes(`${spec.angle3}°`));
    for (const secret of hidden) {
      assert.ok(!visible.some((label) => label === secret || label === `${secret}°`));
    }
    assert.equal(answersMatch(item.correctAnswer, String(spec.angle3)), true);
  }
});

test("assessment diagram labels are Hebrew notes, not raw keys", () => {
  const spec = getGeometryDiagramSpec(TRIANGLE_Q, { hideUnknownValues: true });
  const visible = getAssessmentDiagramVisibleValues(spec).join(" ");
  assert.ok(!/triangle_angles|angle3|pythagoras_hyp/.test(visible));
  assert.ok(!visible.includes("סכום זוויות במשולש = 180°"));
  assert.ok(visible.includes("57°"));
  assert.ok(visible.includes("?"));
});

test("student activity answer choices use compact responsive grid", () => {
  assert.ok(studentActivitySrc.includes('data-testid="activity-answer-choices"'));
  assert.ok(studentActivitySrc.includes("grid grid-cols-1 sm:grid-cols-2"));
});

test("triangle diagram layout is value-driven via geometry-diagram-layout", async () => {
  const { triangleLayoutFromAngles, layoutFingerprint } = await import(
    "../utils/geometry-diagram-layout.js"
  );
  const a = triangleLayoutFromAngles(57, 67, 56);
  const b = triangleLayoutFromAngles(45, 45, 90);
  assert.notEqual(layoutFingerprint(a.vertices), layoutFingerprint(b.vertices));
  assert.match(a.pointsString, /^[\d.]+,\d+ [\d.]+,\d+ [\d.]+,\d+$/);
});
