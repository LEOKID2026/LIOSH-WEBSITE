/**
 * Hebrew nikud + passage split — Wave D.
 * Run: node --test tests/worksheets/hebrew-nikud-passage.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  splitHebrewPassageFromStem,
  enrichHebrewPrintableQuestion,
  fixHebrewFinalLettersMidWord,
} from "../../lib/worksheets/worksheet-hebrew-display.server.js";
import { toPrintableWorksheetQuestion } from "../../lib/worksheets/worksheet-question-sanitize.server.js";
import {
  buildWorksheetPayload,
  worksheetPayloadToPreviewHtml,
} from "../../lib/worksheets/worksheet-payload-build.server.js";
import { WORKSHEET_PRINTABILITY } from "../../lib/worksheets/worksheet-question-types.js";

const PASSAGE_RAW = {
  question:
    "כיתה ג׳ - קראו: 'דני שם את הספר בתיק לפני שיצא לבית הספר.' מה עשה דני לפני היציאה?",
  answers: ["שם ספר בתיק", "אכל ארוחת בוקר", "שיחק בחצר", "קרא ספר"],
  correctAnswer: "שם ספר בתיק",
  topic: "comprehension",
  params: { gradeKey: "g3" },
};

const NIKUD_RAW = {
  question: "מה פירוש המילה 'בַּיִת'?",
  answers: ["בית", "שמש", "עץ", "מים"],
  correctAnswer: "בית",
  topic: "reading",
  params: { gradeKey: "g1" },
};

const META = {
  titleHe: "עברית",
  subjectHe: "עברית",
  gradeHe: "כיתה א׳",
  topicHe: "קריאה",
  levelHe: "קל",
  inkSave: false,
  subjectId: "hebrew",
};

describe("hebrew-nikud-passage", () => {
  test("passage split removes grade prefix and extracts passage", () => {
    const split = splitHebrewPassageFromStem(PASSAGE_RAW.question);
    assert.ok(split.passageHe?.includes("דני"));
    assert.ok(split.stemHe.includes("מה עשה"));
    assert.equal(split.stemHe.includes("כיתה ג׳"), false);
  });

  test("קרא את הטקסט passage splits for reading bank prompts", () => {
    const split = splitHebrewPassageFromStem(
      "קרא את הטקסט: 'בבוקר שיר הכינה את כדור בפארק.' מה שיר בדקה בקשת?"
    );
    assert.ok(split.passageHe?.includes("בבוקר"));
    assert.ok(split.stemHe.includes("מה שיר"));
    assert.equal(split.stemHe.includes("קרא את הטקסט"), false);
  });

  test("fixHebrewFinalLettersMidWord converts mid-word sofit letters", () => {
    assert.equal(fixHebrewFinalLettersMidWord("הכיןה"), "הכינה");
    assert.equal(fixHebrewFinalLettersMidWord("החליףה"), "החליפה");
    assert.equal(fixHebrewFinalLettersMidWord("שולחן יפה"), "שולחן יפה");
  });

  test("comprehension enriches to passage_mcq", () => {
    const printable = toPrintableWorksheetQuestion(PASSAGE_RAW, {
      displayIndex: 1,
      subject: "hebrew",
    });
    assert.equal(printable.questionType, "passage_mcq");
    assert.ok(printable.passageHe);
    assert.ok(printable.stemHe);
  });

  test("g1 nikud preserved in printable question", () => {
    const printable = toPrintableWorksheetQuestion(NIKUD_RAW, {
      displayIndex: 1,
      subject: "hebrew",
    });
    assert.ok(printable.stemHe.includes("בַּיִת") || printable.stemHe.includes("בית"));
    assert.equal(printable.hasNikud, true);
  });

  test("passage HTML has worksheet-passage without metadata", () => {
    const payload = buildWorksheetPayload([PASSAGE_RAW], META, { subjectId: "hebrew" });
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.ok(html.includes("worksheet-passage"));
    assert.equal(html.includes("skillId"), false);
    assert.equal(html.includes("patternFamily"), false);
    assert.equal(html.includes("subtopicId"), false);
  });

  test("enrich marks long passages", () => {
    const longStem =
      "קראו: '" +
      "א".repeat(130) +
      "' מה הרעיון המרכזי?";
    const enriched = enrichHebrewPrintableQuestion(
      { topic: "comprehension", params: { gradeKey: "g5" } },
      {
        displayIndex: 1,
        subject: "hebrew",
        questionType: "mcq",
        stemHe: longStem,
        optionsHe: ["א", "ב", "ג", "ד"],
        printability: WORKSHEET_PRINTABILITY.printable,
      }
    );
    assert.equal(enriched.longPassage, true);
  });
});
