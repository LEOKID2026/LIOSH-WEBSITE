/**
 * Math vertical layout print — format-driven display.
 * Run: node --test tests/worksheets/math-vertical-layout.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { selectMathWorksheetQuestions } from "../../lib/worksheets/worksheet-math-selector.server.js";
import {
  buildWorksheetPayload,
  buildAnswerKeyPayload,
  worksheetPayloadToPreviewHtml,
  auditWorksheetPayloadForAnswerLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";
import { toPrintableWorksheetQuestion } from "../../lib/worksheets/worksheet-question-sanitize.server.js";
import {
  stripMathLtrMarkers,
  hasDualHorizontalAndVerticalDisplay,
} from "../../lib/worksheets/worksheet-math-display.server.js";

const META = {
  titleHe: "דף עבודה - חיבור במאונך",
  subjectHe: "מתמטיקה",
  gradeHe: "כיתה ג׳",
  topicHe: "חיבור במאונך",
  levelHe: "רגיל",
  inkSave: false,
  subjectId: "math",
  gradeKey: "g3",
  topicKey: "addition",
  mathPracticeFormat: "vertical_add_sub",
};

describe("math-vertical-layout", () => {
  test("vertical_add_sub produces vertical_math without dual horizontal stem", () => {
    for (const topic of ["addition", "subtraction"]) {
      const { questions } = selectMathWorksheetQuestions({
        gradeKey: "g3",
        topicKey: topic,
        levelKey: "regular",
        count: 4,
        seed: 300 + topic.length,
        mathPracticeFormat: "vertical_add_sub",
      });
      const printable = questions.map((raw, i) =>
        toPrintableWorksheetQuestion(raw, {
          displayIndex: i + 1,
          subject: "math",
          mathPracticeFormat: "vertical_add_sub",
          gradeKey: "g3",
          topicKey: topic,
        })
      );
      const vertical = printable.filter((q) => q.questionType === "vertical_math");
      assert.ok(vertical.length >= 2, `${topic} vertical count`);
      for (const q of vertical) {
        const text = stripMathLtrMarkers(q.verticalLayoutLtr || "");
        assert.ok(text.includes("\n") || text.includes("×") || text.includes("+"));
        assert.ok(text.length > 3);
        assert.equal(hasDualHorizontalAndVerticalDisplay(q), false);
      }
    }
  });

  test("horizontal_add_sub does not auto-add vertical layout", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g3",
      topicKey: "addition",
      levelKey: "regular",
      count: 4,
      seed: 901,
      mathPracticeFormat: "horizontal_add_sub",
    });
    const printable = questions.map((raw, i) =>
      toPrintableWorksheetQuestion(raw, {
        displayIndex: i + 1,
        subject: "math",
        mathPracticeFormat: "horizontal_add_sub",
        gradeKey: "g3",
        topicKey: "addition",
      })
    );
    assert.equal(
      printable.filter((q) => q.verticalLayoutLtr).length,
      0
    );
  });

  test("vertical HTML uses pre.worksheet-math-vertical without answer leak", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g4",
      topicKey: "addition",
      levelKey: "regular",
      count: 3,
      seed: 901,
      mathPracticeFormat: "vertical_add_sub",
    });
    const payload = buildWorksheetPayload(questions, META, {
      subjectId: "math",
      mathPracticeFormat: "vertical_add_sub",
    });
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.ok(html.includes('class="worksheet-math-vertical"'));
    assert.ok(html.includes("<pre"));
    assert.equal(auditWorksheetPayloadForAnswerLeaks(payload).pass, true);
  });

  test("AnswerKeyPayload is separate when answers requested", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g3",
      topicKey: "decimals",
      levelKey: "regular",
      count: 2,
      seed: 44,
      mathPracticeFormat: "decimals",
    });
    const worksheet = buildWorksheetPayload(questions, { ...META, topicKey: "decimals" }, {
      subjectId: "math",
      mathPracticeFormat: "decimals",
    });
    const answerKey = buildAnswerKeyPayload(questions, { ...META, topicKey: "decimals" }, {
      subjectId: "math",
      mathPracticeFormat: "decimals",
    });
    assert.equal(worksheet.questions.length, 2);
    assert.equal(answerKey.answers.length, 2);
    assert.ok(answerKey.answers[0].correctAnswerHe.length > 0);
    const html = worksheetPayloadToPreviewHtml(worksheet);
    assert.equal(html.includes("correctAnswerHe"), false);
  });

  test("decimal add/sub vertical layout preserves decimal alignment markers", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g5",
      topicKey: "decimals",
      levelKey: "regular",
      count: 6,
      seed: 120,
      mathPracticeFormat: "decimals",
    });
    const printable = questions.map((raw, i) =>
      toPrintableWorksheetQuestion(raw, {
        displayIndex: i + 1,
        subject: "math",
        mathPracticeFormat: "decimals",
        gradeKey: "g5",
        topicKey: "decimals",
      })
    );
    const verticalDecimals = printable.filter(
      (q) =>
        q.questionType === "vertical_math" &&
        q.verticalLayoutLtr &&
        q.verticalLayoutLtr.includes(".")
    );
    assert.ok(
      verticalDecimals.length >= 1,
      "expected at least one vertical decimal add/sub"
    );
  });

  test("long division prints continuous corner bracket html", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g4",
      topicKey: "division",
      levelKey: "regular",
      count: 4,
      seed: 440,
      mathPracticeFormat: "long_division",
    });
    assert.ok(questions.length >= 2);
    const payload = buildWorksheetPayload(
      questions,
      {
        ...META,
        topicKey: "division",
        topicHe: "חילוק ארוך",
        gradeKey: "g4",
        gradeHe: "כיתה ד׳",
        mathPracticeFormat: "long_division",
      },
      {
        subjectId: "math",
        mathPracticeFormat: "long_division",
      }
    );
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.match(html, /worksheet-long-division/);
    assert.match(html, /worksheet-long-division-dividend/);
    assert.doesNotMatch(html, /<pre class="worksheet-math-vertical"[^>]*>[^<]*│/);
  });
});
