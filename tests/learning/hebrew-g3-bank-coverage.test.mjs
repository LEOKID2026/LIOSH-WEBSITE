import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { HEBREW_G3_LITERACY_POOL } from "../../data/hebrew-literacy-g3/literacy-pool-builder.js";
import { filterRichHebrewPool } from "../../utils/hebrew-rich-question-bank.js";
import { getTopicLaunchRow } from "../../lib/launch-readiness/topic-launch-policy.js";
import { finalizeHebrewMcq } from "../../utils/hebrew-question-generator.js";
import { auditMcqQuality } from "../../utils/question-quality.js";

function countByTopicLevel(gradeKey, topic, level) {
  return filterRichHebrewPool(gradeKey, level, topic).length;
}

function assertMcqIntegrity(rows) {
  for (const row of rows) {
    assert.equal(row.minGrade, 3);
    assert.equal(row.maxGrade, 3);
    assert.ok(Array.isArray(row.answers));
    assert.equal(row.answers.length, 4);
    assert.equal(new Set(row.answers).size, 4, `duplicate options: ${row.question}`);
    assert.ok(row.answers.indexOf(row.answers[row.correct]) === row.correct);

    const preview = finalizeHebrewMcq({ ...row }, row.topic, row.levels[0], "g3");
    const aud = auditMcqQuality(preview);
    assert.equal(aud.failures.length, 0, aud.failures.join("; "));
  }
}

describe("hebrew G3 bank coverage (Phase 5A + 5B)", () => {
  it("G3 literacy pool items are grade-3 MCQs with integrity", () => {
    assert.ok(HEBREW_G3_LITERACY_POOL.length >= 400);
    assertMcqIntegrity(HEBREW_G3_LITERACY_POOL);
  });

  it("G3 comprehension reaches 50/40/30 rich-pool thresholds", () => {
    for (const [level, min] of [
      ["easy", 50],
      ["medium", 40],
      ["hard", 30],
    ]) {
      const count = countByTopicLevel("g3", "comprehension", level);
      assert.ok(count >= min, `comprehension ${level}=${count}`);
    }
  });

  it("G3 reading reaches 50/40/30 rich-pool thresholds", () => {
    for (const [level, min] of [
      ["easy", 50],
      ["medium", 40],
      ["hard", 30],
    ]) {
      const count = countByTopicLevel("g3", "reading", level);
      assert.ok(count >= min, `reading ${level}=${count}`);
    }
  });

  it("G3 grammar reaches 50/40/30 rich-pool thresholds", () => {
    for (const [level, min] of [
      ["easy", 50],
      ["medium", 40],
      ["hard", 30],
    ]) {
      const count = countByTopicLevel("g3", "grammar", level);
      assert.ok(count >= min, `grammar ${level}=${count}`);
    }
  });

  it("G3 vocabulary reaches 50/40/30 rich-pool thresholds", () => {
    for (const [level, min] of [
      ["easy", 50],
      ["medium", 40],
      ["hard", 30],
    ]) {
      const count = countByTopicLevel("g3", "vocabulary", level);
      assert.ok(count >= min, `vocabulary ${level}=${count}`);
    }
  });

  it("G3 writing/speaking stay practice-only (not promoted)", () => {
    const writing = getTopicLaunchRow("hebrew", "g3", "writing");
    const speaking = getTopicLaunchRow("hebrew", "g3", "speaking");
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
        assert.ok(!src.includes("launch-readiness"), `${name} must not import launch-readiness`);
      }
    }
  });
});
