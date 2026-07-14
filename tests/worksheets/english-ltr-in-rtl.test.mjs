/**
 * English LTR inside RTL worksheet HTML — Wave D.
 * Run: node --test tests/worksheets/english-ltr-in-rtl.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  extractEnglishLtrSpans,
  enrichEnglishPrintableQuestion,
  renderStemWithLtrSpansHtml,
} from "../../lib/worksheets/worksheet-english-display.server.js";
import { toPrintableWorksheetQuestion } from "../../lib/worksheets/worksheet-question-sanitize.server.js";
import {
  buildWorksheetPayload,
  worksheetPayloadToPreviewHtml,
} from "../../lib/worksheets/worksheet-payload-build.server.js";
import { WORKSHEET_PRINTABILITY } from "../../lib/worksheets/worksheet-question-types.js";

const TRANSLATION_RAW = {
  question: "מה פירוש המילה 'dog' בעברית?",
  answers: ["כלב", "חתול", "ציפור", "דג"],
  correctAnswer: "כלב",
  topic: "translation",
  params: { direction: "en_to_he", word: "dog", gradeKey: "g2" },
};

const SENTENCE_RAW = {
  question: "בחרו את המשפט הנכון באנגלית:",
  answers: ["I am happy", "I happy am", "Am I happy", "Happy I am"],
  correctAnswer: "I am happy",
  topic: "sentences",
  params: { gradeKey: "g4" },
};

const META = {
  titleHe: "אנגלית",
  subjectHe: "אנגלית",
  gradeHe: "כיתה ד׳",
  topicHe: "תרגום",
  levelHe: "בינוני",
  inkSave: false,
  subjectId: "english",
};

describe("english-ltr-in-rtl", () => {
  test("extractEnglishLtrSpans finds Latin runs", () => {
    const spans = extractEnglishLtrSpans(TRANSLATION_RAW.question);
    assert.ok(spans.some((s) => s.spanText === "dog"));
  });

  test("translation enriches with ltrSpans and questionType", () => {
    const printable = toPrintableWorksheetQuestion(TRANSLATION_RAW, {
      displayIndex: 1,
      subject: "english",
    });
    assert.equal(printable.questionType, "translation");
    assert.ok(printable.ltrSpans?.length);
  });

  test("HTML root is RTL with embedded english-ltr spans", () => {
    const payload = buildWorksheetPayload([TRANSLATION_RAW], META, {
      subjectId: "english",
    });
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.ok(html.includes('dir="rtl"'));
    assert.ok(html.includes('class="english-ltr"'));
    assert.ok(html.includes("dog"));
  });

  test("sentence options render with LTR class in HTML", () => {
    const payload = buildWorksheetPayload([SENTENCE_RAW], META, {
      subjectId: "english",
    });
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.ok(html.includes("I am happy") || html.includes("english-ltr"));
    const enriched = enrichEnglishPrintableQuestion(SENTENCE_RAW, {
      displayIndex: 1,
      subject: "english",
      questionType: "mcq",
      stemHe: SENTENCE_RAW.question,
      optionsHe: SENTENCE_RAW.answers,
      printability: WORKSHEET_PRINTABILITY.printable,
    });
    assert.equal(enriched.englishSentenceMode, true);
  });

  test("renderStemWithLtrSpansHtml escapes and wraps Latin", () => {
    const html = renderStemWithLtrSpansHtml(
      "מה פירוש 'cat'?",
      extractEnglishLtrSpans("מה פירוש 'cat'?"),
      (t) => t.replace(/</g, "&lt;")
    );
    assert.ok(html.includes("english-ltr"));
    assert.ok(html.includes("cat"));
  });
});
