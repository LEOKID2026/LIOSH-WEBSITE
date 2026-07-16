/**
 * Focused geometry diagram coverage — every active solid + sample layouts.
 * Run via npm run test:worksheets (included from run-all) or:
 *   node --test tests/worksheets/geometry-diagram-coverage.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { selectGeometryWorksheetQuestions } from "../../lib/worksheets/worksheet-geometry-selector.server.js";
import { toPrintableWorksheetQuestion } from "../../lib/worksheets/worksheet-question-sanitize.server.js";
import { renderGeometryDiagramSvgHtml } from "../../lib/worksheets/worksheet-geometry-diagram-svg.js";
import {
  GEOMETRY_PRINT_SUPPORTED_DIAGRAM_KINDS,
  GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS,
  listGeometryTopicsForGrade,
} from "../../lib/worksheets/worksheet-geometry-allowlist.js";
import { GEOMETRY_GENERIC_ANSWER_FILLER_RE } from "../../utils/geometry-activity-question-stem.js";
import { WORKSHEET_HUB_ENTRY_ENABLED } from "../../lib/worksheets/worksheet-hub-entry-enabled.js";
import { classifyGeometryWorksheetLayout } from "../../lib/worksheets/worksheet-print-layout.js";

const SOLID_KINDS = [
  "solid_box",
  "solid_cylinder",
  "solid_sphere",
  "solid_pyramid",
  "solid_cone",
  "solid_prism",
  "solid_identify",
];

const SOLID_SPECS = [
  { kind: "solid_box", length: 6, width: 4, height: 5, mode: "volume" },
  { kind: "solid_cylinder", radius: 3, height: 7, mode: "volume" },
  { kind: "solid_sphere", radius: 4, mode: "volume" },
  { kind: "solid_pyramid", side: 5, height: 8, mode: "volume" },
  { kind: "solid_cone", radius: 3, height: 6, mode: "volume" },
  { kind: "solid_prism", base: 4, baseHeight: 3, height: 7, mode: "volume", solidShape: "prism" },
  { kind: "solid_identify", solidShape: "cylinder", mode: "identify" },
  { kind: "solid_identify", solidShape: "sphere", mode: "identify" },
  { kind: "solid_identify", solidShape: "cone", mode: "identify" },
  { kind: "solid_identify", solidShape: "pyramid", mode: "identify" },
];

describe("geometry-diagram-coverage", () => {
  test("hub entry is enabled for parent QA", () => {
    assert.equal(WORKSHEET_HUB_ENTRY_ENABLED, true);
  });

  test("all solid diagram kinds are supported and not blocked", () => {
    for (const kind of SOLID_KINDS) {
      assert.ok(GEOMETRY_PRINT_SUPPORTED_DIAGRAM_KINDS.has(kind), kind);
      assert.equal(GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS.has(kind), false, kind);
    }
    assert.ok(GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS.has("pending"));
  });

  test("each solid spec renders real SVG without placeholder rect labels", () => {
    for (const spec of SOLID_SPECS) {
      const svg = renderGeometryDiagramSvgHtml(spec);
      assert.ok(svg.includes("worksheet-geometry-svg"), JSON.stringify(spec));
      assert.ok(svg.includes("viewBox=\"0 0 200 160\""), JSON.stringify(spec));
      assert.ok(!/placeholder/i.test(svg), JSON.stringify(spec));
      // Identify cylinders etc. must not collapse to a lone rounded rect logo.
      if (spec.kind === "solid_identify" && spec.solidShape === "cylinder") {
        assert.ok(svg.includes("<ellipse") || svg.includes("<line"), svg.slice(0, 200));
      }
      if (spec.kind === "solid_identify" && spec.solidShape === "sphere") {
        assert.ok(svg.includes("<circle"), svg.slice(0, 200));
      }
    }
  });

  test("plane families still render", () => {
    const plane = [
      { kind: "triangle_perimeter", side1: 5, side2: 6, side3: 7 },
      { kind: "triangle_angles", angle1: 40, angle2: 60, angle3: 80, hideAngle3: true },
      { kind: "square", side: 4 },
      { kind: "parallelogram", base: 8, height: 3 },
      { kind: "circle", radius: 5 },
      { kind: "pythagoras", a: 3, b: 4, c: 5, hideSide: "c" },
      { kind: "shape_template", template: "rhombus" },
      { kind: "shape_template", template: "kite" },
      { kind: "shape_template", template: "hexagon_regular" },
    ];
    for (const spec of plane) {
      const svg = renderGeometryDiagramSvgHtml(spec);
      assert.ok(svg.includes("<svg"), JSON.stringify(spec));
    }
  });

  test("g6 volume/mixed can produce printable solids; stems avoid generic filler", () => {
    const { questions } = selectGeometryWorksheetQuestions({
      gradeKey: "g6",
      topicKey: "volume",
      levelKey: "medium",
      count: 8,
      seed: 4242,
    });
    assert.ok(questions.length >= 4);
    let sawSolid = false;
    let sawOpen = false;
    let sawMcq = false;
    let sawSingle = false;
    let sawDouble = false;
    for (const q of questions) {
      assert.ok(!GEOMETRY_GENERIC_ANSWER_FILLER_RE.test(String(q.question || "")), q.question);
      const printable = toPrintableWorksheetQuestion(q, {
        displayIndex: 1,
        subject: "geometry",
        gradeKey: "g6",
        topicKey: "volume",
      });
      assert.ok(printable.stemHe);
      if (printable.diagramSpec?.kind?.startsWith("solid_")) {
        sawSolid = true;
        const svg = renderGeometryDiagramSvgHtml(printable.diagramSpec);
        assert.ok(svg.includes("svg"));
      }
      if (q.answerMode === "open") sawOpen = true;
      if (q.answerMode === "mcq") sawMcq = true;
      const layout = classifyGeometryWorksheetLayout(printable);
      if (layout === "layout-geometry-single") sawSingle = true;
      if (layout === "layout-geometry-double") sawDouble = true;
    }
    assert.ok(sawSolid, "expected at least one solid diagram in g6 volume");
    assert.ok(sawOpen || sawMcq);
    assert.ok(sawSingle);
    // double may be absent if every volume item is solid/single — optional
    void sawDouble;
  });

  test("every active grade topic can select something", () => {
    for (const grade of ["g3", "g4", "g5", "g6"]) {
      for (const topic of listGeometryTopicsForGrade(grade)) {
        if (topic === "mixed" && grade === "g3") continue;
        const { questions } = selectGeometryWorksheetQuestions({
          gradeKey: grade,
          topicKey: topic,
          levelKey: "medium",
          count: 3,
          seed: 7000 + grade.length + grade.charCodeAt(1),
        });
        assert.ok(questions.length >= 1, `${grade}/${topic}`);
        for (const q of questions) {
          assert.ok(!GEOMETRY_GENERIC_ANSWER_FILLER_RE.test(String(q.question || "")), q.question);
        }
      }
    }
  });
});
