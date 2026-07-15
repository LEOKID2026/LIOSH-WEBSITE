/**
 * Math LTR + print layout — Wave print fix.
 * Run: node --test tests/worksheets/worksheet-print-layout-math-ltr.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { selectMathWorksheetQuestions } from "../../lib/worksheets/worksheet-math-selector.server.js";
import {
  buildWorksheetPayload,
  worksheetPayloadToPreviewHtml,
  auditWorksheetPayloadForAnswerLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";
import { enrichMathPrintableQuestion } from "../../lib/worksheets/worksheet-math-display.server.js";
import { toPrintableWorksheetQuestion } from "../../lib/worksheets/worksheet-question-sanitize.server.js";
import {
  isWorksheetMathLtrExpression,
  renderWorksheetMathLtrHtml,
  splitWorksheetStemProseAndMath,
  formatAnswerKeyStemDisplay,
} from "../../lib/worksheets/worksheet-math-ltr-display.js";
import {
  WORKSHEET_DEFAULT_QUESTION_COUNT,
  WORKSHEET_MATH_CARDS_PER_PAGE,
  classifyWorksheetQuestionLayout,
  chunkWorksheetQuestionsForMathPrint,
  buildMathPrintPageRows,
  getWorksheetPrintLayoutMode,
  getWorksheetBodyGridClass,
  getAnswerKeyGridClass,
  shouldRenderMathPrintPages,
} from "../../lib/worksheets/worksheet-print-layout.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const PRINT_CSS = readFileSync(join(__dirname, "../../styles/worksheet-print.css"), "utf8");
import { renderMathFractionExpressionHtml } from "../../lib/worksheets/worksheet-fraction-html.js";

const META = {
  titleHe: "דף עבודה - חיבור",
  subjectHe: "מתמטיקה",
  gradeHe: "כיתה א׳",
  topicHe: "חיבור",
  levelHe: "רגיל",
  inkSave: false,
  subjectId: "math",
};

describe("worksheet-print-layout-math-ltr", () => {
  test("detects balanced math expressions for LTR isolation", () => {
    assert.equal(isWorksheetMathLtrExpression("7 + 1 = __"), true);
    assert.equal(isWorksheetMathLtrExpression("13 - 5 = __"), true);
    assert.equal(isWorksheetMathLtrExpression("4 × 6 = __"), true);
    assert.equal(isWorksheetMathLtrExpression("3/4 + 1/4 = __"), true);
    assert.equal(isWorksheetMathLtrExpression("דני קנה 3 תפוחים"), false);
  });

  test("math addition worksheet uses 2-column grid only with centered header", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g1",
      topicKey: "addition",
      levelKey: "medium",
      count: 6,
      seed: 8801,
      mathPracticeFormat: "horizontal_add_sub",
    });
    const payload = buildWorksheetPayload(questions, META, {
      subjectId: "math",
      mathPracticeFormat: "horizontal_add_sub",
    });
    const html = worksheetPayloadToPreviewHtml(payload);

    assert.ok(html.includes('class="worksheet-header worksheet-header-centered"'));
    assert.ok(html.includes("worksheet-brand-center"));
    assert.ok(html.includes("worksheet-print-math-pages"));
    assert.ok(html.includes("worksheet-print-math-table"));
    assert.ok(!html.includes("worksheet-print-card-row"));
    assert.ok(!html.includes("worksheet-print-grid-3"));
    assert.ok(!html.includes("layout-compact-3"));
    assert.ok(html.includes("layout-compact-2"));
    assert.ok(html.includes("worksheet-math-ltr"));
    assert.ok(html.includes('dir="ltr"'));
    assert.equal(auditWorksheetPayloadForAnswerLeaks(payload).pass, true);
  });

  test("vertical_add_sub shows vertical pre without duplicate horizontal stem", () => {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey: "g2",
      topicKey: "addition",
      levelKey: "medium",
      count: 4,
      seed: 991,
      mathPracticeFormat: "vertical_add_sub",
    });
    const printable = questions.map((raw, i) =>
      toPrintableWorksheetQuestion(raw, {
        displayIndex: i + 1,
        subject: "math",
        mathPracticeFormat: "vertical_add_sub",
        gradeKey: "g2",
        topicKey: "addition",
      })
    );
    const vertical = printable.filter((q) => q.questionType === "vertical_math");
    assert.ok(vertical.length >= 1, "expected vertical_math question");

    const payload = buildWorksheetPayload(questions, META, {
      subjectId: "math",
      mathPracticeFormat: "vertical_add_sub",
    });
    const html = worksheetPayloadToPreviewHtml(payload);

    for (const q of vertical) {
      assert.equal(
        /[0-9+\-×÷=]/.test(q.stemHe || ""),
        false,
        "vertical format must not duplicate horizontal exercise in stem"
      );
    }
    assert.ok(html.includes("worksheet-math-vertical"));
    assert.ok(!html.includes("worksheet-math-balanced-slot"));
  });

  test("uniform math worksheets use explicit 2x2 page chunks with table rows", () => {
    const questions = Array.from({ length: 12 }, (_, i) => ({
      displayIndex: i + 1,
      subject: "math",
      questionType: "open",
      stemHe: `${10 + i} + ${2 + i} = __`,
      optionsHe: [],
    }));
    assert.equal(getWorksheetPrintLayoutMode(questions, "math"), "math-card-pages");
    const pages = chunkWorksheetQuestionsForMathPrint(questions);
    assert.equal(pages.length, 3);
    assert.equal(pages[0].length, 4);
    assert.equal(buildMathPrintPageRows(pages[0]).length, 2);
    assert.equal(buildMathPrintPageRows(pages[0])[0].length, 2);
    assert.equal(WORKSHEET_MATH_CARDS_PER_PAGE, 4);
    assert.ok(PRINT_CSS.includes("worksheet-print-page--math-cards"));
    assert.ok(PRINT_CSS.includes("worksheet-print-math-table"));
    assert.ok(PRINT_CSS.includes("worksheet-print-math-card"));
    assert.ok(!PRINT_CSS.includes("worksheet-print-card-row"));
  });

  test("math print React path uses WorksheetMathPrintPages with table layout", () => {
    const qList = readFileSync(
      join(ROOT, "components/worksheets/WorksheetQuestionList.jsx"),
      "utf8"
    );
    const printDoc = readFileSync(
      join(ROOT, "components/worksheets/WorksheetPrintDocument.jsx"),
      "utf8"
    );
    const mathPages = readFileSync(
      join(ROOT, "components/worksheets/WorksheetMathPrintPages.jsx"),
      "utf8"
    );
    assert.match(qList, /WorksheetMathPrintPages/);
    assert.match(qList, /shouldRenderMathPrintPages/);
    assert.match(qList, /subjectId=\{subjectId\}/);
    assert.match(printDoc, /subjectId=\{meta\.subjectId\}/);
    assert.doesNotMatch(printDoc, /aria-hidden="true"/);
    assert.match(mathPages, /worksheet-print-math-table/);
    assert.doesNotMatch(mathPages, /worksheet-print-card-row/);
  });

  test("math short print HTML uses table layout with 4 cards on first page", () => {
    const { questions: rawQuestions } = selectMathWorksheetQuestions({
      gradeKey: "g3",
      topicKey: "addition",
      levelKey: "regular",
      count: 12,
      seed: 88001,
      mathPracticeFormat: "horizontal_add_sub",
      preferMcq: false,
    });
    const payload = buildWorksheetPayload(rawQuestions, {
      titleHe: "דף",
      subjectHe: "מתמטיקה",
      gradeHe: "ג׳",
      topicHe: "חיבור",
      levelHe: "רגיל",
      inkSave: false,
      subjectId: "math",
      gradeKey: "g3",
      topicKey: "addition",
      levelKey: "regular",
      mathPracticeFormat: "horizontal_add_sub",
    }, { subjectId: "math", mathPracticeFormat: "horizontal_add_sub", preferMcq: false });
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.ok(html.includes("worksheet-print-math-pages"));
    assert.ok(html.includes("worksheet-print-page--math-cards"));
    assert.ok(html.includes("worksheet-print-math-table"));
    assert.ok(html.includes("worksheet-print-math-card"));
    assert.ok(!html.includes("worksheet-print-card-row"));

    const pageCount = (html.match(/worksheet-print-page--math-cards/g) || []).length;
    assert.equal(pageCount, 3);

    const firstPageMatch = html.match(
      /<section class="worksheet-print-page worksheet-print-page--math-cards" data-print-page="1">([\s\S]*?)<\/section>/
    );
    assert.ok(firstPageMatch, "expected first math print page section");
    const firstPageHtml = firstPageMatch[1];
    const rowCount = (firstPageHtml.match(/<tr>/g) || []).length;
    assert.equal(rowCount, 2, "first page must have 2 table rows");
    const cellCount = (firstPageHtml.match(/<td>/g) || []).length;
    assert.equal(cellCount, 4, "first page must have 4 table cells");
    const cardCount = (firstPageHtml.match(/worksheet-print-math-card/g) || []).length;
    assert.equal(cardCount, 4, "first page must have 4 math cards");

    assert.equal(
      payload.questions.every((q) => classifyWorksheetQuestionLayout(q) === "layout-compact-2"),
      true
    );
  });

  test("print CSS keeps answer key on white background", () => {
    assert.ok(PRINT_CSS.includes(".answer-key-root"));
    assert.ok(PRINT_CSS.includes("background: #fff !important"));
  });

  test("answer key uses 2-column grid without forced page chunks", () => {
    const tiny = getAnswerKeyGridClass(
      Array.from({ length: 12 }, (_, i) => ({
        displayIndex: i + 1,
        correctAnswerHe: String(i + 2),
      }))
    );
    assert.ok(tiny.includes("answer-key-print-grid-2"));
    assert.equal(tiny.includes("answer-key-print-grid-3"), false);

    const mixed = getAnswerKeyGridClass([
      { displayIndex: 1, correctAnswerHe: "42", explanationHe: "x" },
      {
        displayIndex: 2,
        correctAnswerHe: "very long answer text that exceeds compact threshold",
        explanationHe: "a".repeat(120),
      },
    ]);
    assert.ok(mixed.includes("answer-key-print-grid-2"));
  });

  test("word problems stay on math 2×2 card pages", () => {
    const question = {
      displayIndex: 1,
      subject: "math",
      questionType: "word_problem",
      stemHe: "דני קנה 3 תפוחים ו-2 בננות. כמה פירות יש לו?",
      wordProblemBodyHe: "דני קנה 3 תפוחים ו-2 בננות. כמה פירות יש לו?",
      writingSpaceLines: 4,
      optionsHe: [],
    };
    assert.equal(classifyWorksheetQuestionLayout(question), "layout-compact-2");
    assert.equal(shouldRenderMathPrintPages([question], "math"), true);
  });

  test("renderWorksheetMathLtrHtml wraps expression", () => {
    const out = renderWorksheetMathLtrHtml("7 + 1 = __", (s) => s);
    assert.ok(out.includes('class="worksheet-math-ltr"'));
    assert.ok(out.includes('dir="ltr"'));
    assert.ok(out.includes("7 + 1 = __"));
  });

  test("fraction stems with Hebrew label split into prose + math lines", () => {
    const split = splitWorksheetStemProseAndMath("חיסור במכנה זהה: 3/4 − 1/4:");
    assert.equal(split.mode, "split");
    assert.equal(split.proseHe, "חיסור במכנה זהה:");
    assert.equal(split.mathLtr, "3/4 − 1/4");

    const reduce = splitWorksheetStemProseAndMath("צמצם את השבר 4/8:");
    assert.equal(reduce.mode, "split");
    assert.equal(reduce.proseHe, "צמצם את השבר:");
    assert.equal(reduce.mathLtr, "4/8");

    const denom = splitWorksheetStemProseAndMath("חיבור שברים במכנה 2: 1/2 + 1/2:");
    assert.equal(denom.mode, "split");
    assert.equal(denom.proseHe, "חיבור שברים במכנה 2:");
    assert.equal(denom.mathLtr, "1/2 + 1/2");

    const compare = splitWorksheetStemProseAndMath(
      "איזה שבר גדול יותר - 3/4 או 1/4? רשמו את השבר הגדול:"
    );
    assert.equal(compare.mode, "mixed-inline");
    assert.ok(compare.proseHe?.includes("איזה שבר גדול יותר"));

    const embedded = splitWorksheetStemProseAndMath("מצא שבר שקול פשוט יותר ל-8/8:");
    assert.equal(embedded.mode, "split");
    assert.equal(embedded.proseHe, "מצא שבר שקול פשוט יותר:");
    assert.equal(embedded.mathLtr, "8/8");

    const parens = splitWorksheetStemProseAndMath("חיסור שברים (מכנה 5): 3/5 − 2/5:");
    assert.equal(parens.mode, "split");
    assert.equal(parens.proseHe, "חיסור שברים (מכנה 5):");
    assert.equal(parens.mathLtr, "3/5 − 2/5");

    const answerSplit = formatAnswerKeyStemDisplay(
      "חיסור במכנה זהה: 3/4 − 1/4:",
      "2/4"
    );
    assert.equal(answerSplit.mode, "split");
    assert.equal(answerSplit.proseHe, "חיסור במכנה זהה:");
    assert.equal(answerSplit.mathLtr, "3/4 − 1/4 = 2/4");

    const answerCompare = formatAnswerKeyStemDisplay(
      "איזה שבר גדול יותר - 3/4 או 1/4? רשמו את השבר הגדול:",
      "3/4"
    );
    assert.equal(answerCompare.mode, "split");
    assert.equal(answerCompare.mathLtr, "3/4");

    const fracHtml = renderMathFractionExpressionHtml("2/5", (s) => s);
    assert.ok(fracHtml.includes("worksheet-fraction-stack"));
    assert.ok(fracHtml.includes("worksheet-fraction-bar"));
    assert.ok(fracHtml.includes("2"));
    assert.ok(fracHtml.includes("5"));
  });
});
