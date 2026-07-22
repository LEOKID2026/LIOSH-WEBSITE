/**
 * Teacher guidance — evidence recurrence only; no wrong-count-only taxonomy assignment.
 * Run: node --test tests/learning/teacher-guidance-evidence.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { normalizeMistakeEvent } from "../../utils/mistake-event.js";
import { TAXONOMY_BY_ID } from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import { passesEvidenceRecurrenceRules } from "../../utils/diagnostic-engine-v2/evidence-recurrence.js";

function makeSubWrong(a, b, ua, tag, ts) {
  return normalizeMistakeEvent(
    {
      topic: "subtraction",
      bucketKey: "subtraction",
      isCorrect: false,
      userAnswer: ua,
      correctAnswer: a - b,
      params: { kind: "sub_two", a, b },
      ...(tag ? { misconceptionTag: tag, distractorFamily: tag } : {}),
      timestamp: ts,
    },
    "math"
  );
}

describe("teacher guidance evidence gate", () => {
  test("wrong-count alone does not pass evidence recurrence for M-09", () => {
    const wrongs = [999, 100, 50].map((ua, i) => makeSubWrong(33000, 34898, ua, null, Date.now() - i * 1000));
    assert.equal(passesEvidenceRecurrenceRules(wrongs, TAXONOMY_BY_ID["M-09"]), false);
    assert.equal(wrongs.length >= TAXONOMY_BY_ID["M-09"].minWrong, true);
  });

  test("tagged add_instead_of_sub passes evidence recurrence", () => {
    const wrongs = [120, 230, 340].map((ua, i) =>
      makeSubWrong(100, 20, ua, "add_instead_of_sub", Date.now() - i * 1000)
    );
    assert.ok(passesEvidenceRecurrenceRules(wrongs, TAXONOMY_BY_ID["M-09"]));
  });

  test("diverse wrong patterns without shared tag do not pass", () => {
    const tags = ["unknown", "generic_proximity", null];
    const wrongs = tags.map((tag, i) => makeSubWrong(100, 20, 50 + i, tag, Date.now() - i * 1000));
    assert.equal(passesEvidenceRecurrenceRules(wrongs, TAXONOMY_BY_ID["M-09"]), false);
  });
});
