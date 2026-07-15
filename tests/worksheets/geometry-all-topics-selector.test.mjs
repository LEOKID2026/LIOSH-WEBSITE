/**
 * Geometry topics selector coverage — Wave C.
 * Run: node --test tests/worksheets/geometry-all-topics-selector.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GRADES } from "../../utils/geometry-constants.js";
import {
  GEOMETRY_WORKSHEET_TOPIC_IDS,
  GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS,
  listGeometryTopicsForGrade,
} from "../../lib/worksheets/worksheet-geometry-allowlist.js";
import {
  auditGeometryTopicsSupportMatrix,
  selectGeometryWorksheetQuestions,
} from "../../lib/worksheets/worksheet-geometry-selector.server.js";
import { selectWorksheetQuestions } from "../../lib/worksheets/worksheet-question-selector.server.js";
import {
  buildWorksheetPayload,
  auditWorksheetPayloadForAnswerLeaks,
  auditWorksheetPayloadForMetadataLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";

const META_BASE = {
  titleHe: "דף עבודה - גאומטריה",
  subjectHe: "גאומטריה",
  gradeHe: "כיתה ג׳",
  topicHe: "שטח",
  levelHe: "בינוני",
  inkSave: false,
  subjectId: "geometry",
};

describe("geometry-all-topics-selector", () => {
  test("all 18 geometry topic ids are defined in allowlist", () => {
    assert.equal(GEOMETRY_WORKSHEET_TOPIC_IDS.length, 18);
    assert.ok(GEOMETRY_WORKSHEET_TOPIC_IDS.includes("mixed"));
    assert.ok(GEOMETRY_WORKSHEET_TOPIC_IDS.includes("pythagoras"));
  });

  test("every topic is selectable in at least one grade or documented blocked", () => {
    const matrix = auditGeometryTopicsSupportMatrix();
    const unsupported = matrix.filter((r) => !r.supported);
    if (unsupported.length) {
      console.log(
        "unsupported geometry topics:",
        unsupported.map((r) => `${r.topicKey}@${r.gradeKey}`).join(", ")
      );
    }
    assert.equal(
      unsupported.length,
      0,
      `unsupported: ${unsupported.map((r) => `${r.topicKey}/${r.gradeKey}`).join("; ")}`
    );
  });

  test("selectWorksheetQuestions routes geometry with seed stability", async () => {
    const a = await selectWorksheetQuestions({
      subjectId: "geometry",
      gradeKey: "g4",
      topicKey: "area",
      levelKey: "medium",
      count: 5,
      seed: 7777,
    });
    const b = await selectWorksheetQuestions({
      subjectId: "geometry",
      gradeKey: "g4",
      topicKey: "area",
      levelKey: "medium",
      count: 5,
      seed: 7777,
    });
    assert.equal(a.questions.length, 5);
    assert.equal(a.seed, 7777);
    assert.deepEqual(
      a.questions.map((q) => q.question),
      b.questions.map((q) => q.question)
    );
  });

  test("each grade lists geometry topics from GRADES", () => {
    for (const [gradeKey, cfg] of Object.entries(GRADES)) {
      const topics = listGeometryTopicsForGrade(gradeKey);
      assert.deepEqual(topics, cfg.topics);
    }
  });

  test("geometry payload has no answer or metadata leaks", () => {
    const { questions } = selectGeometryWorksheetQuestions({
      gradeKey: "g5",
      topicKey: "perimeter",
      levelKey: "medium",
      count: 4,
      seed: 9090,
    });
    const payload = buildWorksheetPayload(questions, META_BASE, { subjectId: "geometry" });
    assert.ok(payload.questions.length >= 1);
    const answerAudit = auditWorksheetPayloadForAnswerLeaks(payload);
    assert.equal(answerAudit.pass, true, answerAudit.hits.join(", "));
    const metaAudit = auditWorksheetPayloadForMetadataLeaks(payload);
    assert.equal(metaAudit.pass, true, metaAudit.hits.join(", "));
  });

  test("curved solids are supported diagram kinds (not blocked)", () => {
    assert.ok(GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS.has("pending"));
    for (const kind of ["solid_cylinder", "solid_sphere", "solid_pyramid", "solid_cone", "solid_prism"]) {
      assert.equal(GEOMETRY_PRINT_BLOCKED_DIAGRAM_KINDS.has(kind), false, kind);
    }
  });
});
