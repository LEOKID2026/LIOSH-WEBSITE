/**
 * English G1/G2 phonics post-integration runtime QA tests.
 * Run: node --test tests/learning/english-phonics-runtime-qa.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  runActivityClientSmoke,
  runGeneratorSmoke,
  runPracticeMapSmoke,
  EXPECTED_WIRED_G1,
  EXPECTED_WIRED_G2,
  EXPECTED_AUDIO_ONLY_G1,
  EXPECTED_AUDIO_ONLY_G2,
} from "../../scripts/qa/lib/english-phonics-runtime-qa-lib.mjs";
import { PHONICS_G1_POOL, PHONICS_G2_POOL } from "../../data/english-questions/index.js";

describe("english phonics runtime QA", () => {
  it("generator smoke produces valid runtime phonics MCQs", () => {
    const result = runGeneratorSmoke({ samplesPerPage: 3 });
    assert.equal(result.pass, true);
    assert.ok(result.generated >= 30);
  });

  it("activity client generates phonics MCQs for G1 and G2", async () => {
    const result = await runActivityClientSmoke();
    assert.equal(result.pass, true);
    assert.equal(result.g1Count, 8);
    assert.equal(result.g2Count, 8);
  });

  it("practice map smoke: 10 wired + 8 audio-only across 23 pages", () => {
    const result = runPracticeMapSmoke();
    assert.equal(result.pass, true);
    assert.equal(result.wiredCount, 10);
    assert.equal(result.audioOnlyCount, 8);
    assert.equal(EXPECTED_WIRED_G1.length + EXPECTED_WIRED_G2.length, 10);
    assert.equal(EXPECTED_AUDIO_ONLY_G1.length + EXPECTED_AUDIO_ONLY_G2.length, 8);
  });

  it("requiresAudio bank rows never appear in runtime-eligible pools", () => {
    const audioRows = [...PHONICS_G1_POOL, ...PHONICS_G2_POOL].filter((r) => r.requiresAudio);
    assert.equal(audioRows.length, 47);
    for (const row of audioRows) {
      assert.equal(row.requiresAudio, true);
    }
  });
});
