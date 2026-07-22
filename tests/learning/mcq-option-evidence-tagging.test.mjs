/**
 * MCQ runtime tagging — science/history expectedErrorTags → per-option distractorFamily
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { enrichMcqChoicesWithEvidenceTags } from "../../lib/learning/mcq-option-evidence-tagging.js";
import { classifyMcqDistractorAnswer } from "../../lib/learning/classifiers/mcq-distractor-classifier.js";
import { SCIENCE_QUESTIONS } from "../../data/science-questions.js";

describe("mcq option evidence tagging", () => {
  test("science body_1 tags wrong options from expectedErrorTags", () => {
    const q = SCIENCE_QUESTIONS[0];
    const enriched = enrichMcqChoicesWithEvidenceTags(
      q.options,
      q.params,
      q.options[q.correctIndex],
      q.correctIndex
    );
    const wrongs = enriched.filter((_, i) => i !== q.correctIndex);
    assert.ok(wrongs.length >= 2);
    for (const cell of wrongs) {
      assert.ok(cell.distractorFamily);
      assert.notEqual(cell.distractorFamily, "unknown");
    }
    const hit = classifyMcqDistractorAnswer(wrongs[0], wrongs[0].value, q.options[q.correctIndex]);
    assert.ok(hit?.tag);
  });

  test("generic_proximity only when no metadata tags", () => {
    const enriched = enrichMcqChoicesWithEvidenceTags(
      ["a", "b", "c"],
      {},
      "b",
      1
    );
    assert.equal(enriched[0].distractorFamily, "generic_proximity");
  });
});
