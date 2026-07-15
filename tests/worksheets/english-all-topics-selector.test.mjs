/**
 * English topics selector coverage — Wave D.
 * Run: node --test tests/worksheets/english-all-topics-selector.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ENGLISH_GRADES } from "../../data/english-curriculum.js";
import {
  ENGLISH_WORKSHEET_TOPIC_IDS,
  listEnglishTopicsForGrade,
} from "../../lib/worksheets/worksheet-english-allowlist.js";
import {
  auditEnglishTopicsSupportMatrix,
  selectEnglishWorksheetQuestions,
} from "../../lib/worksheets/worksheet-english-selector.server.js";
import { selectWorksheetQuestions } from "../../lib/worksheets/worksheet-question-selector.server.js";
import {
  buildWorksheetPayload,
  auditWorksheetPayloadForAnswerLeaks,
  auditWorksheetPayloadForMetadataLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";

const META = {
  titleHe: "דף עבודה - אנגלית",
  subjectHe: "אנגלית",
  gradeHe: "כיתה ג׳",
  topicHe: "אוצר מילים",
  levelHe: "בינוני",
  inkSave: false,
  subjectId: "english",
};

describe("english-all-topics-selector", () => {
  test("english worksheet topic ids defined", () => {
    assert.ok(ENGLISH_WORKSHEET_TOPIC_IDS.includes("phonics"));
    assert.ok(ENGLISH_WORKSHEET_TOPIC_IDS.includes("mixed"));
  });

  test("every english topic selectable where in curriculum", () => {
    const matrix = auditEnglishTopicsSupportMatrix();
    const unsupported = matrix.filter((r) => !r.supported && r.grades.length > 0);
    if (unsupported.length) {
      console.log(
        "unsupported english:",
        unsupported.map((r) => `${r.topicKey}@${r.gradeKey}`).join(", ")
      );
    }
    assert.equal(
      unsupported.length,
      0,
      unsupported.map((r) => `${r.topicKey}/${r.gradeKey}`).join("; ")
    );
  });

  test("selectWorksheetQuestions routes english with seed stability", async () => {
    const a = await selectWorksheetQuestions({
      subjectId: "english",
      gradeKey: "g4",
      topicKey: "grammar",
      levelKey: "medium",
      count: 4,
      seed: 8888,
    });
    const b = await selectWorksheetQuestions({
      subjectId: "english",
      gradeKey: "g4",
      topicKey: "grammar",
      levelKey: "medium",
      count: 4,
      seed: 8888,
    });
    assert.equal(a.questions.length, 4);
    assert.deepEqual(
      a.questions.map((q) => q.question),
      b.questions.map((q) => q.question)
    );
  });

  test("grade topics match ENGLISH_GRADES", () => {
    for (const [gradeKey, cfg] of Object.entries(ENGLISH_GRADES)) {
      assert.deepEqual(listEnglishTopicsForGrade(gradeKey), cfg.topics);
    }
  });

  test("english payload has no answer or metadata leaks", () => {
    const { questions } = selectEnglishWorksheetQuestions({
      gradeKey: "g3",
      topicKey: "translation",
      levelKey: "medium",
      count: 3,
      seed: 3434,
    });
    const payload = buildWorksheetPayload(questions, META, { subjectId: "english" });
    assert.ok(payload.questions.length >= 1);
    assert.equal(auditWorksheetPayloadForAnswerLeaks(payload).pass, true);
    assert.equal(auditWorksheetPayloadForMetadataLeaks(payload).pass, true);
  });
});
