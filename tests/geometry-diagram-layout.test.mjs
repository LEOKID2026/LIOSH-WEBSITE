import test from "node:test";
import assert from "node:assert/strict";
import {
  getGeometryDiagramSpec,
  getAssessmentDiagramHiddenAnswerValues,
  getAssessmentDiagramVisibleValues,
} from "../utils/geometry-diagram-spec.js";
import {
  computeTriangleAngleLabels,
  distance2d,
  getShapeTemplatePolygon,
  layoutFingerprint,
  polygonAspectRatio,
  resolveQuadrilateralTemplate,
  triangleLayoutFromAngles,
} from "../utils/geometry-diagram-layout.js";

function closestVertexIndex(label, vertices) {
  let best = 0;
  let bestDist = Infinity;
  vertices.forEach((v, i) => {
    const d = distance2d(label, v);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

function labelFingerprint(labels) {
  return ["angle1", "angle2", "angle3"]
    .map((k) => {
      const p = labels[k];
      return `${Math.round(p.x)}:${Math.round(p.y)}`;
    })
    .join("|");
}

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

test("triangle labels move when triangle vertices change", () => {
  const a = triangleLayoutFromAngles(57, 67, 56);
  const b = triangleLayoutFromAngles(40, 60, 80);
  const c = triangleLayoutFromAngles(70, 55, 55);

  assert.notEqual(labelFingerprint(a.labels), labelFingerprint(b.labels));
  assert.notEqual(labelFingerprint(a.labels), labelFingerprint(c.labels));
});

test("left angle label stays closest to left base vertex", () => {
  const cases = [
    [57, 67, 56],
    [40, 60, 80],
    [68, 38, 74],
    [70, 55, 55],
    [30, 80, 70],
  ];
  for (const [a1, a2, a3] of cases) {
    const layout = triangleLayoutFromAngles(a1, a2, a3);
    const left = layout.vertices[0];
    const right = layout.vertices[1];
    const apex = layout.vertices[2];
    const label = layout.labels.angle1;
    assert.ok(distance2d(label, left) < distance2d(label, right), `${a1}/${a2}/${a3}`);
    assert.ok(distance2d(label, left) < distance2d(label, apex), `${a1}/${a2}/${a3}`);
    assert.equal(closestVertexIndex(label, layout.vertices), 0);
  }
});

test("right angle label stays closest to right base vertex", () => {
  const cases = [
    [57, 67, 56],
    [40, 60, 80],
    [68, 38, 74],
    [70, 55, 55],
  ];
  for (const [a1, a2, a3] of cases) {
    const layout = triangleLayoutFromAngles(a1, a2, a3);
    const label = layout.labels.angle2;
    assert.equal(closestVertexIndex(label, layout.vertices), 1);
  }
});

test("unknown label follows hidden apex vertex when angle3 is hidden", () => {
  const layout = triangleLayoutFromAngles(68, 38, 74, { hiddenAngle: "angle3" });
  const unknown = layout.labels.angle3;
  const apex = layout.vertices[2];
  assert.equal(layout.hiddenAngle, "angle3");
  assert.equal(closestVertexIndex(unknown, layout.vertices), 2);
  assert.ok(distance2d(unknown, apex) < distance2d(unknown, layout.vertices[0]));
  assert.ok(distance2d(unknown, apex) < distance2d(unknown, layout.vertices[1]));
});

test("labels are derived from vertex-centroid factors, not fixed constants", () => {
  const layout = triangleLayoutFromAngles(68, 38, 74);
  assert.ok(layout.labelFactors.angle1 > 0.2 && layout.labelFactors.angle1 < 0.55);
  assert.ok(layout.labelFactors.angle3 > 0.2 && layout.labelFactors.angle3 < 0.55);

  const rebuilt = computeTriangleAngleLabels(layout.vertices, layout.centroid);
  assert.equal(labelFingerprint(rebuilt.labels), labelFingerprint(layout.labels));

  const shifted = computeTriangleAngleLabels(
    layout.vertices.map((v) => ({ x: v.x + 40, y: v.y + 10 })),
    { x: layout.centroid.x + 40, y: layout.centroid.y + 10 }
  );
  assert.notEqual(labelFingerprint(shifted.labels), labelFingerprint(layout.labels));
});

test("triangle labels stay inside readable canvas band", () => {
  const cases = [
    [57, 67, 56],
    [40, 60, 80],
    [68, 38, 74],
    [70, 55, 55],
  ];
  for (const [a1, a2, a3] of cases) {
    const layout = triangleLayoutFromAngles(a1, a2, a3);
    for (const key of ["angle1", "angle2", "angle3"]) {
      const p = layout.labels[key];
      assert.ok(p.x >= 24 && p.x <= 336, `${a1}/${a2}/${a3} ${key} x`);
      assert.ok(p.y >= 24 && p.y <= 256, `${a1}/${a2}/${a3} ${key} y`);
    }
  }
});

test("each label sits between its vertex and the centroid", () => {
  const layout = triangleLayoutFromAngles(68, 38, 74);
  for (const key of ["angle1", "angle2", "angle3"]) {
    const vertex = layout.verticesByAngle[key];
    const label = layout.labels[key];
    const vToC = distance2d(vertex, layout.centroid);
    const vToL = distance2d(vertex, label);
    assert.ok(vToL > 8, key);
    assert.ok(vToL < vToC - 4, key);
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

test("volume solid diagram specs resolve for 3D shapes", () => {
  const specs = [
    getGeometryDiagramSpec({
      topic: "volume",
      shape: "rectangular_prism",
      params: { kind: "prism_volume_rectangular", length: 4, width: 3, height: 5 },
    }),
    getGeometryDiagramSpec({
      topic: "volume",
      shape: "cylinder",
      params: { kind: "cylinder_volume", radius: 2, height: 6 },
    }),
    getGeometryDiagramSpec({
      topic: "solids",
      shape: "cube",
      params: { kind: "solids_identify", solidShape: "cube" },
    }),
  ];
  assert.equal(specs[0]?.kind, "solid_box");
  assert.equal(specs[1]?.kind, "solid_cylinder");
  assert.equal(specs[2]?.kind, "solid_identify");
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
