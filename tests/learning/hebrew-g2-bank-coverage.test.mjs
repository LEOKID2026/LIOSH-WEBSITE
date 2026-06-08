import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { HEBREW_G2_LITERACY_POOL } from "../../data/hebrew-literacy-g2/literacy-pool-builder.js";
import { filterRichHebrewPool } from "../../utils/hebrew-rich-question-bank.js";
import { getTopicLaunchRow } from "../../lib/launch-readiness/topic-launch-policy.js";

function countByTopicLevel(gradeKey, topic, level) {
  return filterRichHebrewPool(gradeKey, level, topic).length;
}

describe("hebrew G2 bank coverage", () => {
  it("G2 literacy pool items are grade-2 MCQs", () => {
    assert.ok(HEBREW_G2_LITERACY_POOL.length >= 100);
    for (const row of HEBREW_G2_LITERACY_POOL) {
      assert.equal(row.minGrade, 2);
      assert.equal(row.maxGrade, 2);
      assert.equal(row.answers.length, 4);
      assert.equal(new Set(row.answers).size, 4);
    }
  });

  it("G2 reading/comprehension/grammar approach 50/40/30 thresholds", () => {
    for (const [topic, easyMin, medMin, hardMin] of [
      ["reading", 50, 40, 30],
      ["comprehension", 50, 40, 30],
      ["grammar", 50, 40, 30],
    ]) {
      const easy = countByTopicLevel("g2", topic, "easy");
      const medium = countByTopicLevel("g2", topic, "medium");
      const hard = countByTopicLevel("g2", topic, "hard");
      assert.ok(easy >= easyMin, `${topic} easy=${easy}`);
      assert.ok(medium >= medMin, `${topic} medium=${medium}`);
      assert.ok(hard >= hardMin, `${topic} hard=${hard}`);
    }
  });

  it("G2 vocabulary approaches 50/40/30 and writing/speaking stay practice-only", () => {
    const vocabEasy = countByTopicLevel("g2", "vocabulary", "easy");
    const vocabMed = countByTopicLevel("g2", "vocabulary", "medium");
    const vocabHard = countByTopicLevel("g2", "vocabulary", "hard");
    assert.ok(vocabEasy >= 50);
    assert.ok(vocabMed >= 40);
    assert.ok(vocabHard >= 30);

    const writing = getTopicLaunchRow("hebrew", "g2", "writing");
    const speaking = getTopicLaunchRow("hebrew", "g2", "speaking");
    assert.equal(writing?.launchLevel, "PRACTICE_ONLY");
    assert.equal(speaking?.launchLevel, "PRACTICE_ONLY");
  });

  it("no launch-readiness imports under lib/parent-server", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const root = join(import.meta.dirname, "..", "..", "lib", "parent-server");
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          stack.push(path);
          continue;
        }
        if (!name.endsWith(".js")) continue;
        const src = readFileSync(path, "utf8");
        assert.ok(
          !src.includes("launch-readiness"),
          `${name} must not import launch-readiness`
        );
      }
    }
  });
});
