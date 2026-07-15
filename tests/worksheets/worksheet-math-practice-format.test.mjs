/**
 * Math practice format — pedagogical display rules.
 * Run: node --test tests/worksheets/worksheet-math-practice-format.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { selectMathWorksheetQuestions } from "../../lib/worksheets/worksheet-math-selector.server.js";
import {
  buildWorksheetPayload,
  auditWorksheetPayloadForAnswerLeaks,
  auditWorksheetPayloadForMetadataLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";
import { toPrintableWorksheetQuestion } from "../../lib/worksheets/worksheet-question-sanitize.server.js";
import {
  enrichMathPrintableQuestion,
  hasDualHorizontalAndVerticalDisplay,
} from "../../lib/worksheets/worksheet-math-display.server.js";
import { publicWorksheetPayload } from "../../lib/worksheets/worksheet-generate.server.js";
import {
  listMathPracticeFormatsForGradeTopic,
  WORKSHEET_MATH_PRACTICE_FORMAT_IDS,
} from "../../lib/worksheets/worksheet-math-practice-format.js";
import { WORKSHEET_LEVEL_OPTIONS } from "../../lib/worksheets/worksheet-level-display.js";

const META = {
  titleHe: "דף עבודה - מתמטיקה",
  subjectHe: "מתמטיקה",
  gradeHe: "כיתה ג׳",
  topicHe: "חיבור",
  levelHe: "רגיל",
  inkSave: false,
  subjectId: "math",
  gradeKey: "g3",
  topicKey: "addition",
};

function printableForFormat(topicKey, formatId, gradeKey = "g3", seed = 77) {
  const { questions } = selectMathWorksheetQuestions({
    gradeKey,
    topicKey,
    levelKey: "regular",
    count: 6,
    seed,
    mathPracticeFormat: formatId,
  });
  return questions.map((raw, i) =>
    toPrintableWorksheetQuestion(raw, {
      displayIndex: i + 1,
      subject: "math",
      mathPracticeFormat: formatId,
      gradeKey,
      topicKey,
    })
  );
}

describe("worksheet-math-practice-format", () => {
  test("all initial format ids are registered", () => {
    assert.equal(WORKSHEET_MATH_PRACTICE_FORMAT_IDS.length, 14);
    assert.ok(WORKSHEET_MATH_PRACTICE_FORMAT_IDS.includes("horizontal_add_sub"));
    assert.ok(WORKSHEET_MATH_PRACTICE_FORMAT_IDS.includes("long_division"));
    assert.ok(WORKSHEET_MATH_PRACTICE_FORMAT_IDS.includes("long_division_with_remainder"));
  });

  test("horizontal_add_sub shows horizontal only", () => {
    const printable = printableForFormat("addition", "horizontal_add_sub", "g1", 101);
    assert.ok(printable.length >= 4);
    for (const q of printable) {
      assert.ok(!q.verticalLayoutLtr, "must not have vertical layout");
      assert.ok(q.mathExpressionLtr || /[0-9+\-]/.test(q.stemHe));
      assert.equal(hasDualHorizontalAndVerticalDisplay(q), false);
    }
  });

  test("vertical_add_sub shows vertical only", () => {
    const printable = printableForFormat("addition", "vertical_add_sub", "g3", 102);
    const vertical = printable.filter((q) => q.questionType === "vertical_math");
    assert.ok(vertical.length >= 3);
    for (const q of vertical) {
      assert.ok(q.verticalLayoutLtr);
      assert.equal(hasDualHorizontalAndVerticalDisplay(q), false);
    }
  });

  test("basic_multiplication does not show vertical column", () => {
    const printable = printableForFormat("multiplication", "basic_multiplication", "g2", 103);
    for (const q of printable) {
      assert.ok(!q.verticalLayoutLtr);
      assert.notEqual(q.questionType, "vertical_math");
    }
  });

  test("long_multiplication does not show horizontal and vertical together", () => {
    const printable = printableForFormat("multiplication", "long_multiplication", "g4", 104);
    const vertical = printable.filter((q) => q.verticalLayoutLtr);
    assert.ok(vertical.length >= 2);
    for (const q of printable) {
      assert.equal(hasDualHorizontalAndVerticalDisplay(q), false);
    }
  });

  test("basic_division is not rendered as long division vertical", () => {
    const printable = printableForFormat("division", "basic_division", "g3", 105);
    for (const q of printable) {
      assert.ok(!q.verticalLayoutLtr);
      assert.notEqual(q.questionType, "vertical_math");
    }
  });

  test("division_with_remainder offers basic and long formats from g4", () => {
    const g3 = listMathPracticeFormatsForGradeTopic("g3", "division_with_remainder");
    assert.deepEqual(
      g3.map((f) => f.key),
      ["division_with_remainder"]
    );
    const g4 = listMathPracticeFormatsForGradeTopic("g4", "division_with_remainder");
    assert.deepEqual(
      g4.map((f) => f.key),
      ["division_with_remainder", "long_division_with_remainder"]
    );
    assert.equal(g4[0].label, "חילוק בסיסי");
    assert.equal(g4[1].label, "חילוק ארוך");
  });

  test("division_with_remainder basic stays horizontal", () => {
    const printable = printableForFormat(
      "division_with_remainder",
      "division_with_remainder",
      "g4",
      107
    );
    assert.ok(printable.length >= 4);
    for (const q of printable) {
      assert.ok(!q.verticalLayoutLtr);
      assert.notEqual(q.questionType, "vertical_math");
      assert.ok(q.mathExpressionLtr);
      assert.doesNotMatch(String(q.stemHe || ""), /שארית/);
      assert.doesNotMatch(String(q.mathExpressionLtr || ""), /שארית/);
      assert.match(String(q.mathExpressionLtr || ""), /÷/);
    }
  });

  test("long_division_with_remainder renders vertical bracket", () => {
    const printable = printableForFormat(
      "division_with_remainder",
      "long_division_with_remainder",
      "g4",
      108
    );
    assert.ok(printable.length >= 4);
    for (const q of printable) {
      assert.ok(q.verticalLayoutLtr, "must use vertical long division layout");
      assert.equal(q.questionType, "vertical_math");
      assert.ok(!q.mathExpressionLtr);
      assert.doesNotMatch(String(q.stemHe || ""), /שארית/);
      assert.doesNotMatch(String(q.verticalLayoutLtr || ""), /שארית/);
    }
  });

  test("word_problems do not get automatic verticalLayout", () => {
    const printable = printableForFormat("word_problems", "word_problems", "g1", 106);
    for (const q of printable) {
      assert.equal(q.questionType, "word_problem");
      assert.ok(!q.verticalLayoutLtr);
      assert.ok(q.wordProblemBodyHe);
    }
  });

  test("worksheet payload has no answers when built for print", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g3",
      topicKey: "addition",
      levelKey: "regular",
      count: 4,
      seed: 200,
      mathPracticeFormat: "horizontal_add_sub",
    });
    const payload = buildWorksheetPayload(questions, META, {
      subjectId: "math",
      mathPracticeFormat: "horizontal_add_sub",
    });
    assert.equal(auditWorksheetPayloadForAnswerLeaks(payload).pass, true);
    for (const q of payload.questions) {
      assert.ok(!("correctAnswerHe" in q));
      assert.ok(!q.optionsHe || q.questionType === "mcq");
    }
  });

  test("public payload strips metadata and internal keys", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g3",
      topicKey: "addition",
      levelKey: "regular",
      count: 2,
      seed: 201,
      mathPracticeFormat: "horizontal_add_sub",
    });
    const payload = buildWorksheetPayload(questions, META, {
      subjectId: "math",
      mathPracticeFormat: "horizontal_add_sub",
    });
    const pub = publicWorksheetPayload(payload);
    assert.equal(pub.meta.gradeKey, undefined);
    assert.equal(pub.meta.topicKey, undefined);
    assert.equal(pub.meta.mathPracticeFormat, undefined);
    assert.equal(auditWorksheetPayloadForMetadataLeaks(payload).pass, true);
  });

  test("public UI exposes only regular/advanced levels", () => {
    assert.equal(WORKSHEET_LEVEL_OPTIONS.length, 2);
    const labels = WORKSHEET_LEVEL_OPTIONS.map((l) => l.labelHe);
    assert.ok(labels.includes("רגיל"));
    assert.ok(labels.includes("מתקדם"));
    assert.equal(labels.some((l) => /קל|בינוני|קשה/.test(l)), false);
  });

  test("computation formats prefer open answer over MCQ", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g1",
      topicKey: "addition",
      levelKey: "regular",
      count: 4,
      seed: 300,
      mathPracticeFormat: "horizontal_add_sub",
    });
    const base = {
      displayIndex: 1,
      subject: "math",
      questionType: "mcq",
      stemHe: "1 + 2 = __",
      optionsHe: ["2", "3", "4"],
      printability: "printable",
    };
    const enriched = enrichMathPrintableQuestion(questions[0], base, {
      mathPracticeFormat: "horizontal_add_sub",
      gradeKey: "g1",
      topicKey: "addition",
    });
    assert.equal(enriched.questionType, "open");
    assert.equal(enriched.optionsHe, undefined);
  });

  test("practice formats are filtered by grade and topic", () => {
    const g1Add = listMathPracticeFormatsForGradeTopic("g1", "addition");
    assert.deepEqual(g1Add.map((f) => f.key), ["horizontal_add_sub"]);

    const g2Add = listMathPracticeFormatsForGradeTopic("g2", "addition");
    assert.ok(g2Add.some((f) => f.key === "horizontal_add_sub"));
    assert.ok(g2Add.some((f) => f.key === "vertical_add_sub"));

    const g1LongMul = listMathPracticeFormatsForGradeTopic("g1", "multiplication");
    assert.equal(
      g1LongMul.some((f) => f.key === "long_multiplication"),
      false
    );
  });
});
