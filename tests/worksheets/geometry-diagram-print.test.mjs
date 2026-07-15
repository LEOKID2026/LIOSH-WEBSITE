/**
 * Geometry diagram SVG in worksheet HTML — Wave C.
 * Run: node --test tests/worksheets/geometry-diagram-print.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { enrichGeometryPrintableQuestion } from "../../lib/worksheets/worksheet-geometry-display.server.js";
import { renderGeometryDiagramSvgHtml } from "../../lib/worksheets/worksheet-geometry-diagram-svg.js";
import {
  buildWorksheetPayload,
  worksheetPayloadToPreviewHtml,
  auditWorksheetPayloadForAnswerLeaks,
  auditWorksheetPayloadForMetadataLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";
import { WORKSHEET_PRINTABILITY } from "../../lib/worksheets/worksheet-question-types.js";

const META = {
  titleHe: "דף עבודה - גאומטריה",
  subjectHe: "גאומטריה",
  gradeHe: "כיתה ד׳",
  topicHe: "שטח",
  levelHe: "בינוני",
  inkSave: false,
  subjectId: "geometry",
};

const AREA_SQUARE_RAW = {
  question: "מה שטח הריבוע?",
  answers: ["16", "20", "25", "30"],
  correctAnswer: "25",
  topic: "area",
  shape: "square",
  params: { kind: "area_square", side: 5 },
};

describe("geometry-diagram-print", () => {
  test("diagram spec resolves for area square and renders SVG", () => {
    const base = {
      displayIndex: 1,
      subject: "geometry",
      questionType: "mcq",
      stemHe: AREA_SQUARE_RAW.question,
      optionsHe: AREA_SQUARE_RAW.answers,
      printability: WORKSHEET_PRINTABILITY.printable,
    };
    const enriched = enrichGeometryPrintableQuestion(AREA_SQUARE_RAW, base);
    assert.equal(enriched.questionType, "diagram_mcq");
    assert.equal(enriched.diagramSpec?.kind, "square");
    const svg = renderGeometryDiagramSvgHtml(enriched.diagramSpec);
    assert.ok(svg.includes("<svg"));
    assert.ok(svg.includes("worksheet-geometry-svg"));
    assert.ok(svg.includes("<rect"));
  });

  test("SVG appears in worksheet preview HTML", () => {
    const payload = buildWorksheetPayload([AREA_SQUARE_RAW], META, {
      subjectId: "geometry",
    });
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.ok(html.includes("worksheet-diagram-wrap"));
    assert.ok(html.includes("worksheet-geometry-svg"));
    assert.ok(html.includes("<polygon") || html.includes("<rect") || html.includes("<circle"));
    assert.equal(html.includes("correctAnswer"), false);
    assert.equal(html.includes("params"), false);
    assert.equal(html.includes("seedId"), false);
  });

  test("ink-save mode still renders diagram markup", () => {
    const payload = buildWorksheetPayload([AREA_SQUARE_RAW], { ...META, inkSave: true }, {
      subjectId: "geometry",
    });
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.ok(html.includes("ink-save"));
    assert.ok(html.includes("worksheet-geometry-svg"));
    const svg = renderGeometryDiagramSvgHtml(
      { kind: "square", side: 4 },
      { inkSave: true }
    );
    assert.ok(svg.includes('fill="none"'));
  });

  test("pythagoras diagram renders right triangle", () => {
    const raw = {
      question: "מה אורך היתר?",
      answers: ["5", "10", "13", "15"],
      correctAnswer: "13",
      topic: "pythagoras",
      params: {
        kind: "pythagoras_hyp",
        a: 5,
        b: 12,
        c: 13,
      },
    };
    const enriched = enrichGeometryPrintableQuestion(raw, {
      displayIndex: 1,
      subject: "geometry",
      questionType: "mcq",
      stemHe: raw.question,
      optionsHe: raw.answers,
      printability: WORKSHEET_PRINTABILITY.printable,
    });
    assert.equal(enriched.diagramSpec?.kind, "pythagoras");
    const svg = renderGeometryDiagramSvgHtml(enriched.diagramSpec);
    assert.ok(svg.includes("<polygon"));
    const audit = auditWorksheetPayloadForAnswerLeaks(
      buildWorksheetPayload([raw], META, { subjectId: "geometry" })
    );
    assert.equal(audit.pass, true);
    const meta = auditWorksheetPayloadForMetadataLeaks(
      buildWorksheetPayload([raw], META, { subjectId: "geometry" })
    );
    assert.equal(meta.pass, true);
  });
});
