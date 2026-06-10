import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { HEBREW_G6_LITERACY_POOL } from "../../data/hebrew-literacy-g6/literacy-pool-builder.js";
import { filterRichHebrewPool } from "../../utils/hebrew-rich-question-bank.js";
import { getTopicLaunchRow } from "../../lib/launch-readiness/topic-launch-policy.js";
import { finalizeHebrewMcq } from "../../utils/hebrew-question-generator.js";
import { auditMcqQuality } from "../../utils/question-quality.js";
import {
  assertNoTextQualityBlockers,
  scanHebrewTextQuality,
} from "./hebrew-literacy-text-quality.mjs";

function countByTopicLevel(gradeKey, topic, level) {
  return filterRichHebrewPool(gradeKey, level, topic).length;
}

function assertMcqIntegrity(rows) {
  for (const row of rows) {
    assert.equal(row.minGrade, 6);
    assert.equal(row.maxGrade, 6);
    assert.ok(Array.isArray(row.answers));
    assert.equal(row.answers.length, 4);
    assert.equal(new Set(row.answers).size, 4, `duplicate options: ${row.question}`);
    assert.ok(row.answers.indexOf(row.answers[row.correct]) === row.correct);

    const preview = finalizeHebrewMcq({ ...row }, row.topic, row.levels[0], "g6");
    const aud = auditMcqQuality(preview);
    assert.equal(aud.failures.length, 0, aud.failures.join("; "));
  }
}

describe("hebrew G6 bank coverage (Phase 5G + 5H)", () => {
  it("G6 literacy pool items are grade-6 MCQs with integrity", () => {
    assert.ok(HEBREW_G6_LITERACY_POOL.length >= 550);
    assertMcqIntegrity(HEBREW_G6_LITERACY_POOL);
  });

  it("G6 comprehension reaches 50/40/30 rich-pool thresholds", () => {
    for (const [level, min] of [
      ["easy", 50],
      ["medium", 40],
      ["hard", 30],
    ]) {
      const count = countByTopicLevel("g6", "comprehension", level);
      assert.ok(count >= min, `comprehension ${level}=${count}`);
    }
  });

  it("G6 reading reaches 50/40/30 rich-pool thresholds", () => {
    for (const [level, min] of [
      ["easy", 50],
      ["medium", 40],
      ["hard", 30],
    ]) {
      const count = countByTopicLevel("g6", "reading", level);
      assert.ok(count >= min, `reading ${level}=${count}`);
    }
  });

  it("G6 grammar reaches 50/40/30 rich-pool thresholds", () => {
    for (const [level, min] of [
      ["easy", 50],
      ["medium", 40],
      ["hard", 30],
    ]) {
      const count = countByTopicLevel("g6", "grammar", level);
      assert.ok(count >= min, `grammar ${level}=${count}`);
    }
  });

  it("G6 vocabulary reaches 50/40/30 rich-pool thresholds", () => {
    for (const [level, min] of [
      ["easy", 50],
      ["medium", 40],
      ["hard", 30],
    ]) {
      const count = countByTopicLevel("g6", "vocabulary", level);
      assert.ok(count >= min, `vocabulary ${level}=${count}`);
    }
  });

  it("G6 writing/speaking stay practice-only (not promoted)", () => {
    const writing = getTopicLaunchRow("hebrew", "g6", "writing");
    const speaking = getTopicLaunchRow("hebrew", "g6", "speaking");
    assert.equal(writing?.launchLevel, "PRACTICE_ONLY");
    assert.equal(speaking?.launchLevel, "PRACTICE_ONLY");
  });
});

describe("hebrew G6 text quality (Phase 5G + 5H)", () => {
  it("G6 literacy pool has no text-quality blockers", () => {
    const failures = assertNoTextQualityBlockers(HEBREW_G6_LITERACY_POOL, "g6");
    assert.equal(failures.length, 0, failures.slice(0, 8).join("\n"));
  });

  it("G6 pool has no gender-slash or סימון patterns", () => {
    const critical = [];
    for (const row of HEBREW_G6_LITERACY_POOL) {
      const hits = scanHebrewTextQuality(row.question);
      const blockers = hits.filter((h) => h === "gender-slash form" || h === "סימון tag");
      if (blockers.length) critical.push(`${row.question?.slice(0, 70)} → ${blockers.join(", ")}`);
    }
    assert.equal(critical.length, 0, critical.slice(0, 8).join("\n"));
  });
});

describe("hebrew G3/G4/G5 completed topics remain PROFESSIONAL_READY (Phase 5H guard)", () => {
  it("G3 all four literacy topics stay at or above 50/40/30", () => {
    for (const topic of ["comprehension", "reading", "grammar", "vocabulary"]) {
      for (const [level, min] of [
        ["easy", 50],
        ["medium", 40],
        ["hard", 30],
      ]) {
        const count = countByTopicLevel("g3", topic, level);
        assert.ok(count >= min, `g3 ${topic} ${level}=${count}`);
      }
    }
  });

  it("G4 all four literacy topics stay at or above 50/40/30 after G6 grammar/vocabulary wiring", () => {
    for (const topic of ["comprehension", "reading", "grammar", "vocabulary"]) {
      for (const [level, min] of [
        ["easy", 50],
        ["medium", 40],
        ["hard", 30],
      ]) {
        const count = countByTopicLevel("g4", topic, level);
        assert.ok(count >= min, `g4 ${topic} ${level}=${count}`);
      }
    }
  });

  it("G5 all four literacy topics stay at or above 50/40/30 after G6 grammar/vocabulary wiring", () => {
    for (const topic of ["comprehension", "reading", "grammar", "vocabulary"]) {
      for (const [level, min] of [
        ["easy", 50],
        ["medium", 40],
        ["hard", 30],
      ]) {
        const count = countByTopicLevel("g5", topic, level);
        assert.ok(count >= min, `g5 ${topic} ${level}=${count}`);
      }
    }
  });

  it("G6 comprehension/reading stay at or above 50/40/30 after grammar/vocabulary wiring", () => {
    for (const topic of ["comprehension", "reading"]) {
      for (const [level, min] of [
        ["easy", 50],
        ["medium", 40],
        ["hard", 30],
      ]) {
        const count = countByTopicLevel("g6", topic, level);
        assert.ok(count >= min, `g6 ${topic} ${level}=${count}`);
      }
    }
  });
});
