/**
 * No answers in worksheet HTML when answers not requested — Wave A.
 * Run: node --test tests/worksheets/worksheet-no-answers-in-html.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildWorksheetPayload,
  worksheetPayloadToPreviewHtml,
  auditWorksheetPayloadForAnswerLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";

const META = {
  titleHe: "דף עבודה",
  subjectHe: "מתמטיקה",
  gradeHe: "כיתה ב׳",
  topicHe: "חיבור",
  levelHe: "קל",
  inkSave: true,
  subjectId: "math",
};

const RAW = [
  {
    question: "3 + 5 = ?",
    answers: ["6", "7", "8", "9"],
    correctIndex: 2,
    correctAnswer: "8",
    explanation: "3+5=8",
    typingAcceptedAnswers: ["8", "08"],
  },
];

describe("worksheet-no-answers-in-html", () => {
  test("HTML from WorksheetPayload has no answer fields or correct values", () => {
    const payload = buildWorksheetPayload(RAW, META, { subjectId: "math" });
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.equal(html.includes("correctAnswer"), false);
    assert.equal(html.includes("correctIndex"), false);
    assert.equal(html.includes("typingAcceptedAnswers"), false);
    assert.equal(html.includes("explanationHe"), false);
    assert.equal(html.includes("answer-key"), false);
    assert.equal(html.includes("data-answer-key"), false);
    // Options may include distractors; no answer-key markup
    assert.ok(html.includes("worksheet-options"));
    const audit = auditWorksheetPayloadForAnswerLeaks(payload);
    assert.equal(audit.pass, true, `answer leaks: ${audit.hits.join(", ")}`);
  });

  test("options appear as choices without marking correct", () => {
    const payload = buildWorksheetPayload(RAW, META, { subjectId: "math" });
    const html = worksheetPayloadToPreviewHtml(payload);
    assert.ok(html.includes("6"));
    assert.ok(html.includes("7"));
    assert.ok(html.includes("9"));
  });
});
