import test from "node:test";
import assert from "node:assert/strict";
import {
  getGeometryDiagramSpec,
  getAssessmentDiagramHiddenAnswerValues,
  getAssessmentDiagramVisibleValues,
} from "../utils/geometry-diagram-spec.js";
import {
  getShapeTemplatePolygon,
  layoutFingerprint,
  polygonAspectRatio,
  resolveQuadrilateralTemplate,
  triangleLayoutFromAngles,
} from "../utils/geometry-diagram-layout.js";

test("triangle layout changes when angle values change", () => {
  const narrow = triangleLayoutFromAngles(40, 40, 100);
  const wide = triangleLayoutFromAngles(70, 70, 40);
  const obtuse = triangleLayoutFromAngles(57, 67, 56);

  assert.notEqual(
    layoutFingerprint(narrow.vertices),
    layoutFingerprint(wide.vertices)
  );
  assert.notEqual(
    layoutFingerprint(narrow.vertices),
    layoutFingerprint(obtuse.vertices)
  );
  assert.notEqual(
    layoutFingerprint(wide.vertices),
    layoutFingerprint(obtuse.vertices)
  );
});

test("triangle layout keeps apex above base within safe bounds", () => {
  const layout = triangleLayoutFromAngles(57, 67, 56);
  const baseY = Math.max(layout.vertices[0].y, layout.vertices[1].y);
  assert.ok(layout.vertices[2].y < baseY - 20);
  for (const v of layout.vertices) {
    assert.ok(v.x >= 24 && v.x <= 336);
    assert.ok(v.y >= 20 && v.y <= 260);
  }
});

test("triangle labels stay inside readable canvas band", () => {
  const layout = triangleLayoutFromAngles(57, 67, 56, { labelInset: 44 });
  for (const key of ["angle1", "angle2", "angle3"]) {
    const p = layout.labels[key];
    assert.ok(p.x >= 24 && p.x <= 336);
    assert.ok(p.y >= 24 && p.y <= 256);
  }
});

test("rectangle and general quadrilateral use different templates", () => {
  const rect = getShapeTemplatePolygon("rectangle");
  const general = getShapeTemplatePolygon("quadrilateral_general");
  assert.notEqual(layoutFingerprint(rect), layoutFingerprint(general));
});

test("square and rectangle templates are visually distinguishable", () => {
  const square = getShapeTemplatePolygon("square");
  const rectangle = getShapeTemplatePolygon("rectangle");
  const squareRatio = polygonAspectRatio(square);
  const rectRatio = polygonAspectRatio(rectangle);
  assert.ok(Math.abs(squareRatio - 1) < 0.2);
  assert.ok(rectRatio > 1.35);
});

test("quadrilateral topic maps to distinct shape templates", () => {
  assert.equal(resolveQuadrilateralTemplate("ריבוע"), "square");
  assert.equal(resolveQuadrilateralTemplate("מלבן"), "rectangle");
  assert.equal(resolveQuadrilateralTemplate("מקבילית"), "parallelogram");
  assert.equal(resolveQuadrilateralTemplate("טרפז"), "trapezoid");

  const squareSpec = getGeometryDiagramSpec({
    topic: "quadrilaterals",
    params: { kind: "quadrilaterals", type: "ריבוע" },
  });
  const paraSpec = getGeometryDiagramSpec({
    topic: "quadrilaterals",
    params: { kind: "quadrilaterals", type: "מקבילית" },
  });
  assert.notEqual(squareSpec.template, paraSpec.template);
});

test("assessment triangle spec still hides third angle and shows known labels", () => {
  const spec = getGeometryDiagramSpec(
    {
      topic: "angles",
      params: { kind: "triangle_angles", angle1: 57, angle2: 67, angle3: 56 },
    },
    { hideUnknownValues: true }
  );
  const visible = getAssessmentDiagramVisibleValues(spec);
  const hidden = getAssessmentDiagramHiddenAnswerValues(spec);

  assert.ok(visible.includes("57°"));
  assert.ok(visible.includes("67°"));
  assert.ok(visible.includes("?"));
  assert.ok(!visible.includes("56°"));
  for (const secret of hidden) {
    assert.ok(!visible.some((label) => label === secret || label === `${secret}°`));
  }
  assert.ok(!/triangle_angles|angle3/.test(visible.join(" ")));
});
