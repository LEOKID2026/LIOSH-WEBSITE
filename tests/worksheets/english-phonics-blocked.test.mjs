/**
 * English phonics / audio / picture blocking — Wave D.
 * Run: node --test tests/worksheets/english-phonics-blocked.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ENGLISH_PRINT_BLOCKED_ITEM_TYPES,
  classifyEnglishWorksheetPrintBlock,
} from "../../lib/worksheets/worksheet-english-allowlist.js";
import { toPrintableWorksheetQuestion } from "../../lib/worksheets/worksheet-question-sanitize.server.js";
import { WORKSHEET_PRINTABILITY } from "../../lib/worksheets/worksheet-question-types.js";
import { selectEnglishWorksheetQuestions } from "../../lib/worksheets/worksheet-english-selector.server.js";
import {
  buildWorksheetPayload,
  auditWorksheetPayloadForAnswerLeaks,
  serializeWorksheetPayload,
} from "../../lib/worksheets/worksheet-payload-build.server.js";

describe("english-phonics-blocked", () => {
  test("blocked item types documented in allowlist", () => {
    assert.ok(ENGLISH_PRINT_BLOCKED_ITEM_TYPES.has("picture_word_matching"));
    assert.ok(ENGLISH_PRINT_BLOCKED_ITEM_TYPES.has("hear_word_choose_picture_word"));
    assert.ok(ENGLISH_PRINT_BLOCKED_ITEM_TYPES.has("simple_listening_instruction"));
  });

  test("requiresAudio question classified blocked", () => {
    const block = classifyEnglishWorksheetPrintBlock({
      question: "האזינו ובחרו",
      requiresAudio: true,
      answers: ["a", "b"],
      correctAnswer: "a",
    });
    assert.equal(block.blocked, true);
    assert.equal(block.reason, "requiresAudio");
  });

  test("pictureRef question classified blocked", () => {
    const block = classifyEnglishWorksheetPrintBlock({
      question: "בחרו את התמונה הנכונה",
      pictureRef: "img/cat.png",
      answers: ["a", "b"],
      correctAnswer: "a",
    });
    assert.equal(block.blocked, true);
    assert.equal(block.reason, "pictureRef");
  });

  test("picture_word_matching itemType blocked from printable", () => {
    const printable = toPrintableWorksheetQuestion(
      {
        question: "התאימו מילה לתמונה",
        answers: ["dog", "cat", "bird", "fish"],
        correctAnswer: "dog",
        topic: "phonics",
        params: { itemType: "picture_word_matching", gradeKey: "g1" },
      },
      { displayIndex: 1, subject: "english" }
    );
    assert.equal(printable.printability, WORKSHEET_PRINTABILITY.blocked_image);
    const block = classifyEnglishWorksheetPrintBlock({
      question: "התאימו",
      answers: ["a", "b"],
      correctAnswer: "a",
      params: { itemType: "picture_word_matching" },
    });
    assert.equal(block.blocked, true);
  });

  test("g1 phonics selector returns only printable rows", () => {
    const { questions } = selectEnglishWorksheetQuestions({
      gradeKey: "g1",
      topicKey: "phonics",
      levelKey: "easy",
      count: 3,
      seed: 1010,
    });
    assert.equal(questions.length, 3);
    for (const q of questions) {
      const block = classifyEnglishWorksheetPrintBlock(q);
      assert.equal(block.blocked, false, block.reason || "");
      const printable = toPrintableWorksheetQuestion(q, {
        displayIndex: 1,
        subject: "english",
      });
      assert.equal(printable.printability, WORKSHEET_PRINTABILITY.printable);
    }
    const payload = buildWorksheetPayload(questions, {
      titleHe: "פוניקה",
      subjectHe: "אנגלית",
      gradeHe: "א׳",
      topicHe: "פוניקה",
      levelHe: "קל",
      inkSave: false,
      subjectId: "english",
    }, { subjectId: "english" });
    const json = serializeWorksheetPayload(payload);
    assert.equal(json.includes("requiresAudio"), false);
    assert.equal(json.includes("pictureRef"), false);
    assert.equal(auditWorksheetPayloadForAnswerLeaks(payload).pass, true);
  });
});
