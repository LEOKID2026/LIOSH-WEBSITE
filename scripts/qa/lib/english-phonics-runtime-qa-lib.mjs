/**
 * Shared English G1/G2 phonics runtime QA helpers (Phase 4B post-integration).
 */
import assert from "node:assert/strict";

import { getRuntimeEligiblePhonicsPool } from "../../../data/english-questions/index.js";
import {
  hasEnglishPracticeTarget,
  resolveEnglishPracticeTarget,
} from "../../../lib/learning-book/english-book-practice-map.js";
import { generateQuestion } from "../../../utils/english-question-generator.js";
import { resolveStudentQuestionDisplayParts } from "../../../utils/student-question-display.js";
import { generateActivityQuestionSetClient } from "../../../lib/classroom-activities/generate-activity-questions-client.js";

export const G1_PHONICS_PAGES = [
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

export const G2_PHONICS_PAGES = [
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

/** Pages expected to expose book practice targets after wiring. */
export const EXPECTED_WIRED_G1 = [
  "letters_upper",
  "letters_lower",
  "letters_match",
  "first_words_cvc",
];

export const EXPECTED_WIRED_G2 = [
  "letters_review",
  "letters_order",
  "phonics_blending",
  "first_word_reading",
  "word_families_cvc",
  "picture_audio_word_match",
];

/** Wired in book map but filtered from runtime (picture / picture-stem prompts). */
export const EXPECTED_DISPLAY_BLOCKED_G1 = [
  "letter_names",
  "classroom_words",
  "first_words_simple",
  "picture_word_match",
];

export const EXPECTED_AUDIO_ONLY_G1 = [
  "phonics_sounds",
  "phonics_first_sound",
  "listening_classroom",
  "listening_commands",
];

export const EXPECTED_AUDIO_ONLY_G2 = [
  "phonics_sounds_review",
  "sound_letter_match",
  "listening_comprehension",
  "early_sentences_exposure",
];

export const EXPECTED_DISPLAY_BLOCKED_G2 = ["classroom_vocab_g2"];

const FORBIDDEN_TOPICS = new Set(["grammar", "translation", "vocabulary", "sentences", "writing"]);

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

function assertRuntimePhonicsQuestion(q, label) {
  assert.equal(q.topic, "phonics", `${label} topic`);
  assert.equal(FORBIDDEN_TOPICS.has(q.topic), false, `${label} forbidden topic`);
  assert.notEqual(q.params?.patternFamily, "english_empty_pool", `${label} empty pool`);
  assert.equal(q.params?.requiresAudio, false, `${label} requiresAudio runtime`);
  assert.equal(q.params?.promotionEligible, false, `${label} promotionEligible`);
  assertMcqShape(q, label);
}

export function runGeneratorSmoke({ samplesPerPage = 6 } = {}) {
  /** @type {Array<Record<string, unknown>>} */
  const checks = [];
  let generated = 0;

  for (const pageId of G1_PHONICS_PAGES) {
    if (getRuntimeEligiblePhonicsPool("g1", pageId).length === 0) continue;
    for (let i = 0; i < samplesPerPage; i += 1) {
      const q = generateQuestion(1, "phonics", "g1", null, "easy", {
        forceKind: pageId,
        forceSkillId: `english:phonics:g1:${pageId}`,
      });
      assertRuntimePhonicsQuestion(q, `g1:${pageId}:${i}`);
      generated += 1;
    }
    checks.push({ name: `g1_generator_${pageId}`, pass: true });
  }

  for (const pageId of G2_PHONICS_PAGES) {
    if (getRuntimeEligiblePhonicsPool("g2", pageId).length === 0) continue;
    for (let i = 0; i < samplesPerPage; i += 1) {
      const q = generateQuestion(1, "phonics", "g2", null, "easy", {
        forceKind: pageId,
        forceSkillId: `english:phonics:g2:${pageId}`,
      });
      assertRuntimePhonicsQuestion(q, `g2:${pageId}:${i}`);
      generated += 1;
    }
    checks.push({ name: `g2_generator_${pageId}`, pass: true });
  }

  return { checks, generated, pass: true };
}

export async function runActivityClientSmoke() {
  const g1 = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g1",
    topic: "phonics",
    difficulty: "easy",
    count: 8,
  });
  const g2 = await generateActivityQuestionSetClient({
    subject: "english",
    gradeLevel: "g2",
    topic: "phonics",
    difficulty: "easy",
    count: 8,
  });

  for (const item of [...g1, ...g2]) {
    assert.equal(item.subject, "english");
    assert.equal(item.topic, "phonics");
    assert.equal(FORBIDDEN_TOPICS.has(item.topic), false);
    assert.notEqual(item.params?.requiresAudio, true);
    assert.ok(Array.isArray(item.choices));
    assert.equal(item.choices.length, 4);
    assert.equal(new Set(item.choices).size, 4);
    assert.ok(item.choices.includes(item.correctAnswer));
  }

  return {
    pass: true,
    g1Count: g1.length,
    g2Count: g2.length,
    checks: [
      { name: "activity_client_g1_phonics", pass: true, count: g1.length },
      { name: "activity_client_g2_phonics", pass: true, count: g2.length },
    ],
  };
}

export function runPracticeMapSmoke() {
  /** @type {Array<Record<string, unknown>>} */
  const checks = [];
  const wired = [];
  const audioOnly = [];
  const displayBlocked = [];

  for (const pageId of G1_PHONICS_PAGES) {
    const eligible = getRuntimeEligiblePhonicsPool("g1", pageId).length > 0;
    const hasTarget = hasEnglishPracticeTarget("g1", pageId);
    const target = resolveEnglishPracticeTarget("g1", pageId);
    const expectWired = EXPECTED_WIRED_G1.includes(pageId);
    const expectAudioOnly = EXPECTED_AUDIO_ONLY_G1.includes(pageId);
    const expectDisplayBlocked = EXPECTED_DISPLAY_BLOCKED_G1.includes(pageId);

    assert.equal(expectWired || expectAudioOnly || expectDisplayBlocked, true, `g1:${pageId} classification`);
    assert.equal(expectWired, eligible, `g1:${pageId} wired/eligible mismatch`);
    assert.equal(hasTarget, eligible, `g1:${pageId} hasTarget/eligible mismatch`);
    if (eligible) {
      assert.equal(target?.topic, "phonics");
      assert.equal(target?.forceKind, pageId);
      wired.push(`g1:${pageId}`);
    } else {
      assert.equal(target, null);
      if (expectDisplayBlocked) {
        displayBlocked.push(`g1:${pageId}`);
      } else {
        audioOnly.push(`g1:${pageId}`);
      }
    }
    checks.push({ name: `g1_practice_map_${pageId}`, pass: true, wired: eligible });
  }

  for (const pageId of G2_PHONICS_PAGES) {
    const eligible = getRuntimeEligiblePhonicsPool("g2", pageId).length > 0;
    const hasTarget = hasEnglishPracticeTarget("g2", pageId);
    const target = resolveEnglishPracticeTarget("g2", pageId);
    const expectWired = EXPECTED_WIRED_G2.includes(pageId);
    const expectAudioOnly = EXPECTED_AUDIO_ONLY_G2.includes(pageId);
    const expectDisplayBlocked = EXPECTED_DISPLAY_BLOCKED_G2.includes(pageId);

    assert.equal(expectWired || expectAudioOnly || expectDisplayBlocked, true, `g2:${pageId} classification`);
    assert.equal(expectWired, eligible, `g2:${pageId} wired/eligible mismatch`);
    assert.equal(hasTarget, eligible, `g2:${pageId} hasTarget/eligible mismatch`);
    if (eligible) {
      assert.equal(target?.topic, "phonics");
      assert.equal(target?.forceKind, pageId);
      wired.push(`g2:${pageId}`);
    } else {
      assert.equal(target, null);
      if (expectDisplayBlocked) {
        displayBlocked.push(`g2:${pageId}`);
      } else {
        audioOnly.push(`g2:${pageId}`);
      }
    }
    checks.push({ name: `g2_practice_map_${pageId}`, pass: true, wired: eligible });
  }

  assert.equal(wired.length, 10);
  assert.equal(audioOnly.length, 8);
  assert.equal(displayBlocked.length, 5);

  return {
    pass: true,
    wiredCount: wired.length,
    audioOnlyCount: audioOnly.length,
    displayBlockedCount: displayBlocked.length,
    wired,
    audioOnly,
    checks,
  };
}
