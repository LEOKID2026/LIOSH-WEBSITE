/**
 * Worksheet / AnswerKey payload split tests — Wave A.
 * Run: node --test tests/worksheets/worksheet-payload-split.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildWorksheetPayload,
  buildAnswerKeyPayload,
  serializeWorksheetPayload,
  serializeAnswerKeyPayload,
} from "../../lib/worksheets/worksheet-payload-build.server.js";
import {
  WORKSHEET_PAYLOAD_KIND,
  ANSWER_KEY_PAYLOAD_KIND,
} from "../../lib/worksheets/worksheet-question-types.js";

const META = {
  titleHe: "דף עבודה - כפל",
  subjectHe: "מתמטיקה",
  gradeHe: "כיתה ג׳",
  topicHe: "כפל",
  levelHe: "בינוני",
  inkSave: false,
  subjectId: "math",
};

const RAW_QUESTIONS = [
  {
    question: "כמה זה 2 × 3?",
    answers: ["5", "6", "7", "8"],
    correctIndex: 1,
    explanation: "2×3=6",
    skillId: "math_mul",
    seedId: 42,
  },
  {
    question: "כמה זה 4 + 1?",
    answers: ["4", "5", "6", "7"],
    correctIndex: 1,
    diagnosticSkillId: "diag_add",
  },
];

describe("worksheet-payload-split", () => {
  test("WorksheetPayload has payloadKind worksheet and no answers", () => {
    const payload = buildWorksheetPayload(RAW_QUESTIONS, META, {
      subjectId: "math",
    });
    assert.equal(payload.payloadKind, WORKSHEET_PAYLOAD_KIND);
    assert.equal(payload.questions.length, 2);
    const json = serializeWorksheetPayload(payload);
    assert.equal(json.includes("correctIndex"), false);
    assert.equal(json.includes("correctAnswer"), false);
    assert.equal(json.includes("explanation"), false);
    assert.equal(json.includes("skillId"), false);
    assert.equal(json.includes("seedId"), false);
  });

  test("AnswerKeyPayload is separate with payloadKind answer_key", () => {
    const key = buildAnswerKeyPayload(RAW_QUESTIONS, META);
    assert.equal(key.payloadKind, ANSWER_KEY_PAYLOAD_KIND);
    assert.equal(key.answers.length, 2);
    assert.equal(key.answers[0].correctAnswerHe, "6");
    assert.equal(key.answers[1].correctAnswerHe, "5");
    const json = serializeAnswerKeyPayload(key);
    assert.ok(json.includes("correctAnswerHe"));
    assert.equal(json.includes("skillId"), false);
  });

  test("includeAnswers=false means AnswerKeyPayload not merged into worksheet", () => {
    const worksheet = buildWorksheetPayload(RAW_QUESTIONS, META, {
      subjectId: "math",
    });
    const answerKey = buildAnswerKeyPayload(RAW_QUESTIONS, META);
    const merged = { ...worksheet, answers: answerKey.answers };
    const json = JSON.stringify(merged);
    assert.ok(json.includes("correctAnswerHe"), "test setup");
    const worksheetOnly = serializeWorksheetPayload(worksheet);
    assert.equal(worksheetOnly.includes("correctAnswerHe"), false);
    assert.equal(worksheetOnly.includes("answer_key"), false);
  });
});
