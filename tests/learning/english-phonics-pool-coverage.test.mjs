/**
 * English G1/G2 phonics pool coverage — Phase 4B Step 3B static banks.
 * Run: node --test tests/learning/english-phonics-pool-coverage.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { PHONICS_G1_POOL } from "../../data/english-questions/phonics-g1.js";
import { PHONICS_G2_POOL } from "../../data/english-questions/phonics-g2.js";

const G1_PAGES = [
  "letters_upper",
  "letters_lower",
  "letters_match",
  "letter_names",
  "phonics_sounds",
  "phonics_first_sound",
  "classroom_words",
  "first_words_simple",
  "first_words_cvc",
  "picture_word_match",
  "listening_classroom",
  "listening_commands",
];

const G2_PAGES = [
  "letters_review",
  "letters_order",
  "phonics_sounds_review",
  "phonics_blending",
  "sound_letter_match",
  "first_word_reading",
  "word_families_cvc",
  "classroom_vocab_g2",
  "listening_comprehension",
  "picture_audio_word_match",
  "early_sentences_exposure",
];

const G1_ITEM_TYPES = new Set([
  "choose_matching_letter",
  "match_uppercase_lowercase",
  "hear_sound_choose_letter",
  "first_sound_recognition",
  "picture_word_matching",
  "hear_word_choose_picture_word",
  "simple_listening_instruction",
  "early_word_reading",
]);

const G2_ITEM_TYPES = new Set([
  ...G1_ITEM_TYPES,
  "simple_sentence_exposure",
]);

const AUDIO_REQUIRED_TYPES = new Set([
  "hear_sound_choose_letter",
  "hear_word_choose_picture_word",
  "first_sound_recognition",
  "simple_listening_instruction",
  "simple_sentence_exposure",
]);

const SAFE_DIAGNOSTIC = new Set(["manual_only", "thin"]);

function pageFromRef(ref) {
  const parts = String(ref || "").split(":");
  return parts.length === 3 ? parts[2] : null;
}

function assertPoolIntegrity(pool, grade, allowedTypes, expectedPages) {
  assert.ok(pool.length >= 50, `grade ${grade} pool length ${pool.length}`);

  const ids = new Set();
  const byType = {};
  const byPage = {};
  let audioCount = 0;

  for (const row of pool) {
    assert.ok(row.id, "missing id");
    assert.equal(ids.has(row.id), false, `duplicate id ${row.id}`);
    ids.add(row.id);

    assert.equal(row.grade, grade);
    assert.equal(row.minGrade, grade);
    assert.equal(row.maxGrade, grade);
    assert.equal(row.topic, "phonics");
    assert.equal(row.difficulty, "easy");
    assert.ok(allowedTypes.has(row.itemType), `${row.id} itemType ${row.itemType}`);
    assert.ok(row.patternFamily, `${row.id} missing patternFamily`);
    assert.match(row.bookPageRef, new RegExp(`^english:g${grade}:`));
    assert.ok(SAFE_DIAGNOSTIC.has(row.diagnosticContribution), row.id);
    assert.equal(row.promotionEligible, false, row.id);

    assert.ok(Array.isArray(row.options), row.id);
    assert.equal(row.options.length, 4, `${row.id} options`);
    assert.equal(new Set(row.options).size, 4, `${row.id} duplicate options`);
    assert.ok(row.options.includes(row.correct), `${row.id} correct not in options`);
    assert.ok(typeof row.question === "string" && row.question.length > 0, row.id);

    const stem = row.question.toLowerCase();
    const correct = String(row.correct).toLowerCase();
    if (correct.length > 1) {
      assert.equal(
        stem.includes(correct),
        false,
        `${row.id} answer leaked in stem: ${row.correct}`
      );
    }

    if (AUDIO_REQUIRED_TYPES.has(row.itemType)) {
      assert.equal(row.requiresAudio, true, `${row.id} requiresAudio`);
      audioCount += 1;
    }

    byType[row.itemType] = (byType[row.itemType] || 0) + 1;
    const page = pageFromRef(row.bookPageRef);
    byPage[page] = (byPage[page] || 0) + 1;
  }

  for (const pageId of expectedPages) {
    assert.ok(byPage[pageId] >= 1, `missing coverage for ${pageId}`);
  }

  if (grade === 1) {
    assert.equal(byType.simple_sentence_exposure || 0, 0, "G1 must not use simple_sentence_exposure");
  } else {
    assert.ok((byType.simple_sentence_exposure || 0) >= 1, "G2 needs simple_sentence_exposure");
  }

  return { byType, byPage, audioCount, total: pool.length };
}

describe("english phonics pool coverage", () => {
  it("G1 pool meets volume, MCQ, page coverage, and diagnostic safety", () => {
    const stats = assertPoolIntegrity(PHONICS_G1_POOL, 1, G1_ITEM_TYPES, G1_PAGES);
    assert.ok(stats.total >= 50);
    assert.equal(Object.keys(stats.byPage).length, G1_PAGES.length);
  });

  it("G2 pool meets volume, MCQ, page coverage, and diagnostic safety", () => {
    const stats = assertPoolIntegrity(PHONICS_G2_POOL, 2, G2_ITEM_TYPES, G2_PAGES);
    assert.ok(stats.total >= 50);
    assert.equal(Object.keys(stats.byPage).length, G2_PAGES.length);
  });

  it("listening item types always mark requiresAudio without assuming runtime audio", () => {
    const listenRows = [...PHONICS_G1_POOL, ...PHONICS_G2_POOL].filter((row) =>
      AUDIO_REQUIRED_TYPES.has(row.itemType)
    );
    assert.ok(listenRows.length >= 20);
    for (const row of listenRows) {
      assert.equal(row.requiresAudio, true, row.id);
      assert.ok(row.audioRef || row.audioRef === undefined, row.id);
    }
  });

  it("pools are wired into english-questions index with runtime audio filter", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../../data/english-questions/index.js", import.meta.url), "utf8");
    assert.ok(src.includes("phonics-g1"));
    assert.ok(src.includes("phonics-g2"));
    assert.ok(src.includes("PHONICS_POOLS"));
    assert.ok(src.includes("getRuntimeEligiblePhonicsPool"));

    const { countRuntimeEligiblePhonicsItems } = await import(
      "../../data/english-questions/index.js"
    );
    const counts = countRuntimeEligiblePhonicsItems();
    assert.equal(counts.g1, 15);
    assert.equal(counts.g2, 9);
    assert.equal(counts.total, 24);
  });
});

export function summarizePhonicsPools() {
  const g1 = assertPoolIntegrity(PHONICS_G1_POOL, 1, G1_ITEM_TYPES, G1_PAGES);
  const g2 = assertPoolIntegrity(PHONICS_G2_POOL, 2, G2_ITEM_TYPES, G2_PAGES);
  return { g1, g2 };
}
