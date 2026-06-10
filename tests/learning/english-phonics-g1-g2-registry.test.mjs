/**
 * English G1/G2 phonics registry checkpoint — Phase 4B step 2.
 * Run: node --test tests/learning/english-phonics-g1-g2-registry.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  ENGLISH_G1_PAGE_ORDER,
  ENGLISH_G1_BOOK_BATCHES,
} from "../../lib/learning-book/english-g1-registry.js";
import {
  ENGLISH_G2_PAGE_ORDER,
  ENGLISH_G2_BOOK_BATCHES,
} from "../../lib/learning-book/english-g2-registry.js";
import {
  ENGLISH_G1_PAGE_SKILLS,
  ENGLISH_G2_PAGE_SKILLS,
} from "../../lib/learning-book/english-page-skill-index.js";
import {
  hasEnglishPracticeTarget,
  resolveEnglishPracticeTarget,
} from "../../lib/learning-book/english-book-practice-map.js";
import { getRuntimeEligiblePhonicsPool } from "../../data/english-questions/index.js";

const G1_PHONICS = [
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

const G2_PHONICS = [
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

const ROOT = process.cwd();

test("G1 phonics batches prepend existing vocab/grammar batches", () => {
  assert.equal(ENGLISH_G1_BOOK_BATCHES[0].id, "phonics-a");
  assert.equal(ENGLISH_G1_BOOK_BATCHES.at(-1).id, "c");
  assert.deepEqual(ENGLISH_G1_PAGE_ORDER.slice(0, 4), G1_PHONICS.slice(0, 4));
  assert.equal(ENGLISH_G1_PAGE_ORDER[12], "vocab_colors");
  assert.equal(ENGLISH_G1_PAGE_ORDER.at(-1), "translation_classroom");
});

test("G2 phonics-review batch prepends existing batches", () => {
  assert.equal(ENGLISH_G2_BOOK_BATCHES[0].id, "phonics-review");
  assert.equal(ENGLISH_G2_BOOK_BATCHES.at(-1).id, "d");
  assert.deepEqual(ENGLISH_G2_PAGE_ORDER.slice(0, 11), G2_PHONICS);
  assert.equal(ENGLISH_G2_PAGE_ORDER[11], "vocab_colors");
});

test("all 23 phonics pages have skill index entries and draft files", () => {
  for (const pageId of G1_PHONICS) {
    assert.ok(ENGLISH_G1_PAGE_SKILLS[pageId], `missing G1 skill index: ${pageId}`);
    const draft = path.join(ROOT, "docs/learning-book/english/g1/drafts", `${pageId}.md`);
    assert.ok(fs.existsSync(draft), `missing G1 draft: ${pageId}.md`);
  }
  for (const pageId of G2_PHONICS) {
    assert.ok(ENGLISH_G2_PAGE_SKILLS[pageId], `missing G2 skill index: ${pageId}`);
    const draft = path.join(ROOT, "docs/learning-book/english/g2/drafts", `${pageId}.md`);
    assert.ok(fs.existsSync(draft), `missing G2 draft: ${pageId}.md`);
  }
});

test("phonics pages resolve phonics practice targets only when runtime-eligible", () => {
  for (const pageId of G1_PHONICS) {
    const eligible = getRuntimeEligiblePhonicsPool("g1", pageId).length > 0;
    assert.equal(hasEnglishPracticeTarget("g1", pageId), eligible, pageId);
    const target = resolveEnglishPracticeTarget("g1", pageId);
    if (eligible) {
      assert.equal(target?.topic, "phonics");
      assert.equal(target?.forceKind, pageId);
      assert.match(target?.skillId || "", /^english:phonics:g1:/);
    } else {
      assert.equal(target, null);
    }
  }
  for (const pageId of G2_PHONICS) {
    const eligible = getRuntimeEligiblePhonicsPool("g2", pageId).length > 0;
    assert.equal(hasEnglishPracticeTarget("g2", pageId), eligible, pageId);
    const target = resolveEnglishPracticeTarget("g2", pageId);
    if (eligible) {
      assert.equal(target?.topic, "phonics");
      assert.equal(target?.forceKind, pageId);
      assert.match(target?.skillId || "", /^english:phonics:g2:/);
    } else {
      assert.equal(target, null);
    }
  }
});

test("existing vocab pages still resolve practice targets", () => {
  assert.equal(hasEnglishPracticeTarget("g1", "vocab_colors"), true);
  assert.equal(hasEnglishPracticeTarget("g2", "vocab_colors"), true);
});
