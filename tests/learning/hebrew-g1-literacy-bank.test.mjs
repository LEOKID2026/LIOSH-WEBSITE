import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { HEBREW_G1_LITERACY_POOL } from "../../data/hebrew-literacy-g1/literacy-pool-builder.js";
import { filterRichHebrewPool } from "../../utils/hebrew-rich-question-bank.js";

const LITERACY_FAMILIES = new Set([
  "literacy_letters",
  "literacy_sounds",
  "literacy_syllables",
  "literacy_niqqud",
  "literacy_sound_letter_match",
  "literacy_simple_words",
]);

function countByTopicLevel(gradeKey, topic, level) {
  return filterRichHebrewPool(gradeKey, level, topic).length;
}

function assertMcqIntegrity(rows) {
  for (const row of rows) {
    assert.equal(row.minGrade, 1);
    assert.equal(row.maxGrade, 1);
    assert.ok(Array.isArray(row.answers));
    assert.equal(row.answers.length, 4);
    assert.ok(row.answers.indexOf(row.answers[row.correct]) === row.correct);
    assert.equal(new Set(row.answers).size, 4, `duplicate options: ${row.question}`);
    assert.ok(LITERACY_FAMILIES.has(row.patternFamily), row.patternFamily);
  }
}

describe("hebrew G1 literacy bank", () => {
  it("G1 literacy pool has literacy pattern families and valid MCQs", () => {
    assert.ok(HEBREW_G1_LITERACY_POOL.length >= 80);
    assertMcqIntegrity(HEBREW_G1_LITERACY_POOL);
  });

  it("G1 reading easy reaches at least 50 usable rich items", () => {
    const count = countByTopicLevel("g1", "reading", "easy");
    assert.ok(count >= 50, `g1 reading easy=${count}, need >= 50`);
  });

  it("G1 comprehension and grammar easy improve materially", () => {
    const compEasy = countByTopicLevel("g1", "comprehension", "easy");
    const grammarEasy = countByTopicLevel("g1", "grammar", "easy");
    assert.ok(compEasy >= 45, `g1 comprehension easy=${compEasy}`);
    assert.ok(grammarEasy >= 40, `g1 grammar easy=${grammarEasy}`);
  });
});
