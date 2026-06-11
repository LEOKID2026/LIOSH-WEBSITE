/**
 * English G1/G2 phonics integration — Phase 4B wiring checkpoint.
 * Run: node --test tests/learning/english-phonics-integration.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { ENGLISH_GRADES } from "../../data/english-curriculum.js";
import {
  PHONICS_G1_POOL,
  PHONICS_G2_POOL,
  countRuntimeEligiblePhonicsItems,
  getRuntimeEligiblePhonicsPool,
} from "../../data/english-questions/index.js";
import {
  hasEnglishPracticeTarget,
  resolveEnglishPracticeTarget,
} from "../../lib/learning-book/english-book-practice-map.js";
import { generateQuestion } from "../../utils/english-question-generator.js";
import { resolveStudentQuestionDisplayParts } from "../../utils/student-question-display.js";

const G1_PHONICS_PAGES = [
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

const G2_PHONICS_PAGES = [
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

const FORBIDDEN_TOPICS = new Set(["grammar", "translation", "sentences", "writing"]);

function assertMcqShape(q, label) {
  assert.equal(q.qType, "choice", `${label} qType`);
  assert.ok(Array.isArray(q.answers), `${label} answers`);
  assert.equal(q.answers.length, 4, `${label} answer count`);
  assert.equal(new Set(q.answers).size, 4, `${label} unique answers`);
  assert.ok(q.answers.includes(q.correctAnswer), `${label} correct in answers`);
  const parts = resolveStudentQuestionDisplayParts(q);
  const instructionOnly = String(parts.leadText || q.questionLabel || "").trim();
  const correct = String(q.correctAnswer || "").toLowerCase();
  if (correct.length > 1) {
    assert.equal(
      instructionOnly.toLowerCase().includes(correct),
      false,
      `${label} instruction leak`
    );
  }
}

function generatePhonicsBatch(gradeKey, pageId, n = 12) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push(
      generateQuestion(1, "phonics", gradeKey, null, "easy", {
        forceKind: pageId,
        forceSkillId: `english:phonics:${gradeKey}:${pageId}`,
      })
    );
  }
  return out;
}

describe("english phonics integration", () => {
  it("curriculum exposes phonics for G1/G2 only", () => {
    assert.ok(ENGLISH_GRADES.g1.topics.includes("phonics"));
    assert.ok(ENGLISH_GRADES.g2.topics.includes("phonics"));
    assert.equal(ENGLISH_GRADES.g3.topics.includes("phonics"), false);
  });

  it("runtime-eligible counts exclude requiresAudio rows", () => {
    const counts = countRuntimeEligiblePhonicsItems();
    assert.equal(counts.g1, 15);
    assert.equal(counts.g2, 9);
    assert.equal(counts.total, 24);

    const audioRows = [...PHONICS_G1_POOL, ...PHONICS_G2_POOL].filter((r) => r.requiresAudio);
    assert.equal(audioRows.length, 47);
    for (const row of audioRows) {
      const gradeKey = row.grade === 1 ? "g1" : "g2";
      const pageId = row.bookPageRef.split(":")[2];
      const pool = getRuntimeEligiblePhonicsPool(gradeKey, pageId);
      assert.equal(
        pool.some((p) => p.id === row.id),
        false,
        `${row.id} must not be runtime eligible`
      );
    }
  });

  it("G1 phonics generator returns valid MCQs without topic leakage", () => {
    for (const pageId of G1_PHONICS_PAGES) {
      if (getRuntimeEligiblePhonicsPool("g1", pageId).length === 0) continue;
      const batch = generatePhonicsBatch("g1", pageId, 8);
      for (const q of batch) {
        assert.equal(q.topic, "phonics", pageId);
        assert.equal(FORBIDDEN_TOPICS.has(q.topic), false);
        assert.notEqual(q.params?.patternFamily, "english_empty_pool", pageId);
        assert.equal(q.params?.requiresAudio, false);
        assert.equal(q.params?.promotionEligible, false);
        assertMcqShape(q, `${pageId}:${q.params?.itemType}`);
        assert.match(
          String(q.params?.diagnosticSkillId || q.skillId || ""),
          /^english:phonics:g1:/
        );
      }
    }
  });

  it("G2 phonics generator returns valid MCQs without topic leakage", () => {
    for (const pageId of G2_PHONICS_PAGES) {
      if (getRuntimeEligiblePhonicsPool("g2", pageId).length === 0) continue;
      const batch = generatePhonicsBatch("g2", pageId, 8);
      for (const q of batch) {
        assert.equal(q.topic, "phonics", pageId);
        assert.equal(FORBIDDEN_TOPICS.has(q.topic), false);
        assert.notEqual(q.params?.patternFamily, "english_empty_pool", pageId);
        assert.equal(q.params?.requiresAudio, false);
        assert.equal(q.params?.promotionEligible, false);
        assertMcqShape(q, `${pageId}:${q.params?.itemType}`);
        assert.match(
          String(q.params?.diagnosticSkillId || q.skillId || ""),
          /^english:phonics:g2:/
        );
      }
    }
  });

  it("audio-only phonics pages have no book practice target", () => {
    const audioOnlyG1 = G1_PHONICS_PAGES.filter(
      (pageId) => getRuntimeEligiblePhonicsPool("g1", pageId).length === 0
    );
    const audioOnlyG2 = G2_PHONICS_PAGES.filter(
      (pageId) => getRuntimeEligiblePhonicsPool("g2", pageId).length === 0
    );
    assert.ok(audioOnlyG1.length >= 1);
    assert.ok(audioOnlyG2.length >= 1);
    for (const pageId of audioOnlyG1) {
      assert.equal(hasEnglishPracticeTarget("g1", pageId), false, pageId);
    }
    for (const pageId of audioOnlyG2) {
      assert.equal(hasEnglishPracticeTarget("g2", pageId), false, pageId);
    }
  });

  it("runtime-eligible phonics pages resolve phonics practice targets", () => {
    let wired = 0;
    for (const pageId of G1_PHONICS_PAGES) {
      if (getRuntimeEligiblePhonicsPool("g1", pageId).length === 0) continue;
      wired += 1;
      const target = resolveEnglishPracticeTarget("g1", pageId);
      assert.equal(target?.topic, "phonics");
      assert.equal(target?.forceKind, pageId);
    }
    for (const pageId of G2_PHONICS_PAGES) {
      if (getRuntimeEligiblePhonicsPool("g2", pageId).length === 0) continue;
      wired += 1;
      const target = resolveEnglishPracticeTarget("g2", pageId);
      assert.equal(target?.topic, "phonics");
      assert.equal(target?.forceKind, pageId);
    }
    assert.ok(wired >= 4, "expected wired phonics book pages after copy-leak filtering");
  });
});
