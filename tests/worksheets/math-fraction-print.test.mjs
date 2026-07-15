/**
 * Math fraction print mapping — Wave B.
 * Run: node --test tests/worksheets/math-fraction-print.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hasStackedFractionToken, parseMathFractionExpression } from "../../utils/math-fraction-expression-parse.js";
import { selectMathWorksheetQuestions } from "../../lib/worksheets/worksheet-math-selector.server.js";
import {
  buildWorksheetPayload,
  buildAnswerKeyPayload,
  worksheetPayloadToPreviewHtml,
  answerKeyPayloadToPreviewHtml,
  auditWorksheetPayloadForAnswerLeaks,
  auditWorksheetPayloadForMetadataLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";
import { toPrintableWorksheetQuestion } from "../../lib/worksheets/worksheet-question-sanitize.server.js";

const META = {
  titleHe: "דף עבודה - שברים",
  subjectHe: "מתמטיקה",
  gradeHe: "כיתה ד׳",
  topicHe: "שברים",
  levelHe: "בינוני",
  inkSave: false,
  subjectId: "math",
};

describe("math-fraction-print", () => {
  test("fractions questions map to fraction questionType with mathExpressionLtr", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g4",
      topicKey: "fractions",
      levelKey: "medium",
      count: 5,
      seed: 2024,
      mathPracticeFormat: "fractions",
    });
    const printable = questions.map((raw, i) =>
      toPrintableWorksheetQuestion(raw, {
        displayIndex: i + 1,
        subject: "math",
        mathPracticeFormat: "fractions",
        gradeKey: "g4",
        topicKey: "fractions",
      })
    );
    const fractionQs = printable.filter(
      (q) => q.questionType === "fraction" && q.mathExpressionLtr
    );
    assert.ok(fractionQs.length >= 3, "expected fraction renderers");
    for (const q of fractionQs) {
      assert.ok(q.mathExpressionLtr, "mathExpressionLtr required");
      assert.ok(q.mathExpressionLtr.length > 2, `expression too short: ${q.mathExpressionLtr}`);
      const hasFracToken =
        hasStackedFractionToken(q.mathExpressionLtr) ||
        /\d+\s*\/\s*\d+/.test(q.mathExpressionLtr) ||
        /שבר/.test(q.mathExpressionLtr) ||
        /[+\-×÷=]/.test(q.mathExpressionLtr);
      assert.ok(hasFracToken, `expression: ${q.mathExpressionLtr}`);
      const tokens = parseMathFractionExpression(q.mathExpressionLtr);
      assert.ok(tokens.length > 0);
    }
  });

  test("fraction worksheet HTML has expression block without answers", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g5",
      topicKey: "fractions",
      levelKey: "hard",
      count: 3,
      seed: 55,
    });
    const payload = buildWorksheetPayload(questions, META, { subjectId: "math" });
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.ok(html.includes("worksheet-math-expression"));
    assert.equal(html.includes("correctAnswer"), false);
    assert.equal(auditWorksheetPayloadForAnswerLeaks(payload).pass, true);
    assert.equal(auditWorksheetPayloadForMetadataLeaks(payload).pass, true);
  });

  test("fraction answer key HTML uses stacked fraction display", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g4",
      topicKey: "fractions",
      levelKey: "hard",
      count: 4,
      seed: 50112,
    });
    const answerKey = buildAnswerKeyPayload(questions, META, { subjectId: "math" });
    const html = answerKeyPayloadToPreviewHtml(answerKey);
    assert.ok(html.includes("worksheet-fraction-stack"));
    assert.ok(html.includes("worksheet-fraction-bar"));
    assert.equal(html.includes("correctAnswer"), false);
  });

  test("g2 fractions (unit fractions) are printable", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g2",
      topicKey: "fractions",
      levelKey: "easy",
      count: 2,
      seed: 8,
    });
    assert.equal(questions.length, 2);
    const payload = buildWorksheetPayload(questions, META, { subjectId: "math" });
    assert.ok(payload.questions.length >= 1);
  });
});
