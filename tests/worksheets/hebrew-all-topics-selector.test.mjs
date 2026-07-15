/**
 * Hebrew topics selector coverage — Wave D.
 * Run: node --test tests/worksheets/hebrew-all-topics-selector.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GRADES } from "../../utils/hebrew-constants.js";
import {
  HEBREW_WORKSHEET_TOPIC_IDS,
  listHebrewTopicsForGrade,
} from "../../lib/worksheets/worksheet-hebrew-allowlist.js";
import {
  auditHebrewTopicsSupportMatrix,
  selectHebrewWorksheetQuestions,
} from "../../lib/worksheets/worksheet-hebrew-selector.server.js";
import { selectWorksheetQuestions } from "../../lib/worksheets/worksheet-question-selector.server.js";
import {
  buildWorksheetPayload,
  auditWorksheetPayloadForAnswerLeaks,
  auditWorksheetPayloadForMetadataLeaks,
} from "../../lib/worksheets/worksheet-payload-build.server.js";

const META = {
  titleHe: "דף עבודה - עברית",
  subjectHe: "עברית",
  gradeHe: "כיתה ג׳",
  topicHe: "דקדוק",
  levelHe: "בינוני",
  inkSave: false,
  subjectId: "hebrew",
};

describe("hebrew-all-topics-selector", () => {
  test("all 7 hebrew topic ids in allowlist", () => {
    assert.equal(HEBREW_WORKSHEET_TOPIC_IDS.length, 7);
    assert.ok(HEBREW_WORKSHEET_TOPIC_IDS.includes("mixed"));
    assert.ok(HEBREW_WORKSHEET_TOPIC_IDS.includes("speaking"));
  });

  test("every hebrew topic selectable in at least one grade", () => {
    const matrix = auditHebrewTopicsSupportMatrix();
    const unsupported = matrix.filter((r) => !r.supported);
    if (unsupported.length) {
      console.log(
        "unsupported hebrew:",
        unsupported.map((r) => `${r.topicKey}@${r.gradeKey}`).join(", ")
      );
    }
    assert.equal(
      unsupported.length,
      0,
      unsupported.map((r) => `${r.topicKey}/${r.gradeKey}`).join("; ")
    );
  });

  test("selectWorksheetQuestions routes hebrew with seed stability", async () => {
    const a = await selectWorksheetQuestions({
      subjectId: "hebrew",
      gradeKey: "g3",
      topicKey: "grammar",
      levelKey: "medium",
      count: 4,
      seed: 5555,
    });
    const b = await selectWorksheetQuestions({
      subjectId: "hebrew",
      gradeKey: "g3",
      topicKey: "grammar",
      levelKey: "medium",
      count: 4,
      seed: 5555,
    });
    assert.equal(a.questions.length, 4);
    assert.deepEqual(
      a.questions.map((q) => q.question),
      b.questions.map((q) => q.question)
    );
  });

  test("grade topics match GRADES constant", () => {
    for (const [gradeKey, cfg] of Object.entries(GRADES)) {
      assert.deepEqual(listHebrewTopicsForGrade(gradeKey), cfg.topics);
    }
  });

  test("hebrew payload has no answer or metadata leaks", () => {
    const { questions } = selectHebrewWorksheetQuestions({
      gradeKey: "g4",
      topicKey: "comprehension",
      levelKey: "medium",
      count: 3,
      seed: 1212,
    });
    const payload = buildWorksheetPayload(questions, META, { subjectId: "hebrew" });
    assert.ok(payload.questions.length >= 1);
    assert.equal(auditWorksheetPayloadForAnswerLeaks(payload).pass, true);
    assert.equal(auditWorksheetPayloadForMetadataLeaks(payload).pass, true);
  });
});
