/**
 * Hebrew open-answer / writing print — Wave D.
 * Run: node --test tests/worksheets/hebrew-open-answer-print.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { toPrintableWorksheetQuestion } from "../../lib/worksheets/worksheet-question-sanitize.server.js";
import {
  buildWorksheetPayload,
  worksheetPayloadToPreviewHtml,
  auditWorksheetPayloadForAnswerLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";

const WRITING_RAW = {
  question: "כתבו משפט אחד על החיה האהובה עליכם.",
  correctAnswer: "הכלב שלי שמח",
  acceptedAnswers: ["הכלב שלי שמח"],
  answerMode: "typing",
  topic: "writing",
  params: { answerMode: "typing", gradeKey: "g3" },
};

const META = {
  titleHe: "כתיבה",
  subjectHe: "עברית",
  gradeHe: "כיתה ג׳",
  topicHe: "כתיבה",
  levelHe: "בינוני",
  inkSave: false,
  subjectId: "hebrew",
};

describe("hebrew-open-answer-print", () => {
  test("writing question maps to open with writing lines", () => {
    const printable = toPrintableWorksheetQuestion(WRITING_RAW, {
      displayIndex: 1,
      subject: "hebrew",
    });
    assert.equal(printable.questionType, "open");
    assert.ok(printable.writingSpaceLines && printable.writingSpaceLines >= 4);
    assert.equal(printable.optionsHe, undefined);
  });

  test("HTML includes writing lines without answer leak", () => {
    const payload = buildWorksheetPayload([WRITING_RAW], META, { subjectId: "hebrew" });
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.ok(html.includes("worksheet-writing-lines"));
    assert.equal(html.includes("acceptedAnswers"), false);
    assert.equal(html.includes("correctAnswer"), false);
    assert.equal(auditWorksheetPayloadForAnswerLeaks(payload).pass, true);
  });

  test("speaking social MCQ stays printable mcq", () => {
    const raw = {
      question: "מישהו אומר 'תודה רבה'. מה עונים בנימוס?",
      answers: ["בשמחה", "למה לי", "לא מעניין", "תשלם לי"],
      correctAnswer: "בשמחה",
      topic: "speaking",
      params: { gradeKey: "g2" },
    };
    const printable = toPrintableWorksheetQuestion(raw, {
      displayIndex: 1,
      subject: "hebrew",
    });
    assert.equal(printable.questionType, "mcq");
    assert.ok(printable.optionsHe?.length);
  });
});
