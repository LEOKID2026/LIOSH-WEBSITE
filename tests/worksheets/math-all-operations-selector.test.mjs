/**
 * Math operations selector coverage — Wave B.
 * Run: node --test tests/worksheets/math-all-operations-selector.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GRADES } from "../../utils/math-constants.js";
import {
  auditMathOperationsSupportMatrix,
  listMathOperationsForGrade,
  selectMathWorksheetQuestions,
} from "../../lib/worksheets/worksheet-math-selector.server.js";
import { selectWorksheetQuestions } from "../../lib/worksheets/worksheet-question-selector.server.js";
import {
  buildWorksheetPayload,
  auditWorksheetPayloadForAnswerLeaks,
  auditWorksheetPayloadForMetadataLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";

const META_BASE = {
  titleHe: "דף עבודה - מתמטיקה",
  subjectHe: "מתמטיקה",
  gradeHe: "כיתה ג׳",
  topicHe: "כפל",
  levelHe: "בינוני",
  inkSave: false,
  subjectId: "math",
};

describe("math-all-operations-selector", () => {
  test("every grade operation in GRADES is selectable or documented unsupported", () => {
    const matrix = auditMathOperationsSupportMatrix();
    const unsupported = matrix.filter((r) => !r.supported);
    if (unsupported.length) {
      console.log(
        "unsupported operations:",
        unsupported.map((r) => `${r.gradeKey}:${r.operation}`).join(", ")
      );
    }
    assert.equal(
      unsupported.length,
      0,
      `unsupported: ${unsupported.map((r) => `${r.gradeKey}/${r.operation}`).join("; ")}`
    );
  });

  test("selectWorksheetQuestions returns math questions with seed stability", async () => {
    const a = await selectWorksheetQuestions({
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "multiplication",
      levelKey: "medium",
      count: 5,
      seed: 12345,
    });
    const b = await selectWorksheetQuestions({
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "multiplication",
      levelKey: "medium",
      count: 5,
      seed: 12345,
    });
    assert.equal(a.questions.length, 5);
    assert.equal(a.seed, 12345);
    assert.deepEqual(
      a.questions.map((q) => q.question),
      b.questions.map((q) => q.question)
    );
  });

  test("each grade has at least one operation and mixed when listed", () => {
    for (const [gradeKey, cfg] of Object.entries(GRADES)) {
      assert.ok(cfg.operations.length >= 3, gradeKey);
      const ops = listMathOperationsForGrade(gradeKey);
      assert.deepEqual(ops, cfg.operations);
    }
  });

  test("worksheet payload from math selection has no answer/metadata leaks", async () => {
    const { questions } = await selectWorksheetQuestions({
      subjectId: "math",
      gradeKey: "g5",
      topicKey: "fractions",
      levelKey: "medium",
      count: 3,
      seed: 99,
    });
    const payload = buildWorksheetPayload(questions, META_BASE, { subjectId: "math" });
    const ansAudit = auditWorksheetPayloadForAnswerLeaks(payload);
    const metaAudit = auditWorksheetPayloadForMetadataLeaks(payload);
    assert.equal(ansAudit.pass, true, ansAudit.hits.join(", "));
    assert.equal(metaAudit.pass, true, metaAudit.hits.join(", "));
  });

  test("decimals percentages ratio scale generate via selector", () => {
    for (const topic of ["decimals", "percentages", "ratio", "scale"]) {
      const grade = topic === "scale" || topic === "ratio" ? "g6" : "g5";
      const { questions } = selectMathWorksheetQuestions({
        gradeKey: grade,
        topicKey: topic,
        levelKey: "medium",
        count: 2,
        seed: 77,
      });
      assert.equal(questions.length, 2, topic);
    }
  });
});
