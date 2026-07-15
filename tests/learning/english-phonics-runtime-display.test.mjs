/**
 * English G1/G2 phonics runtime display fixes — MCQ shuffle, stimulus, prompt hygiene.
 * Run: node --test tests/learning/english-phonics-runtime-display.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  countRuntimeEligiblePhonicsItems,
  getRuntimeEligiblePhonicsPool,
  PHONICS_RUNTIME_BLOCKED_ITEM_TYPES,
} from "../../data/english-questions/index.js";
import { generateQuestion } from "../../utils/english-question-generator.js";
import { resolveStudentQuestionDisplayParts } from "../../utils/student-question-display.js";

const G1_PAGES = [
  "letters_upper",
  "letters_lower",
  "letters_match",
  "first_words_cvc",
];

const G2_PAGES = [
  "letters_review",
  "letters_order",
  "phonics_blending",
  "first_word_reading",
  "word_families_cvc",
  "picture_audio_word_match",
];

const PICTURE_STEM = /תמונה/u;
const BROKEN_SLASH_PROMPT = /\/\s+'\s|קרא\s+\/\s+'/u;
const MANGLED_HEBREW_SLASH = /(?:^|[\s-])\/\s+[\u05d0-\u05ea]\s/u;

function displayTextFromQuestion(q) {
  const parts = resolveStudentQuestionDisplayParts(q);
  return [
    parts.leadText,
    parts.bodyText,
    q.questionLabel,
    q.exerciseText,
    q.question,
  ]
    .filter((s) => typeof s === "string" && s.trim())
    .join("\n");
}

function generatePhonics(gradeKey, pageId) {
  return generateQuestion(1, "phonics", gradeKey, null, "easy", {
    forceKind: pageId,
    forceSkillId: `english:phonics:${gradeKey}:${pageId}`,
  });
}

describe("english phonics runtime display", () => {
  it("runtime-eligible pool excludes picture/listening-only item types", () => {
    const counts = countRuntimeEligiblePhonicsItems();
    assert.equal(counts.g1, 15);
    assert.equal(counts.g2, 9);
    assert.equal(counts.total, 24);

    for (const gradeKey of ["g1", "g2"]) {
      const pool = getRuntimeEligiblePhonicsPool(gradeKey);
      for (const row of pool) {
        assert.equal(
          PHONICS_RUNTIME_BLOCKED_ITEM_TYPES.has(row.itemType),
          false,
          `${row.id} blocked type`
        );
        assert.equal(Boolean(row.pictureRef), false, `${row.id} pictureRef`);
      }
    }
  });

  it("MCQ correct answer appears in more than one option slot across samples", () => {
    const positions = new Set();
    const samples = 240;

    for (let i = 0; i < samples; i += 1) {
      const gradeKey = i % 2 === 0 ? "g1" : "g2";
      const pages =
        gradeKey === "g1"
          ? ["letters_upper", "first_words_cvc", "letters_match"]
          : ["phonics_blending", "first_word_reading", "letters_review"];
      const pageId = pages[i % pages.length];
      if (getRuntimeEligiblePhonicsPool(gradeKey, pageId).length === 0) continue;
      const q = generatePhonics(gradeKey, pageId);
      const idx = q.answers.indexOf(q.correctAnswer);
      assert.ok(idx >= 0, "correct answer must remain in options after shuffle");
      positions.add(idx);
    }

    assert.ok(
      positions.size >= 2,
      `expected varied correct positions, saw only: ${[...positions].join(", ")}`
    );
  });

  it("never emits picture prompts without a renderable stimulus", () => {
    for (const gradeKey of ["g1", "g2"]) {
      const pages = gradeKey === "g1" ? G1_PAGES : G2_PAGES;
      for (const pageId of pages) {
        if (getRuntimeEligiblePhonicsPool(gradeKey, pageId).length === 0) continue;
        for (let i = 0; i < 12; i += 1) {
          const q = generatePhonics(gradeKey, pageId);
          assert.equal(
            PHONICS_RUNTIME_BLOCKED_ITEM_TYPES.has(q.params?.itemType),
            false,
            `${pageId}:${q.params?.itemType}`
          );
          const text = displayTextFromQuestion(q);
          if (PICTURE_STEM.test(text)) {
            assert.fail(`picture stem without image support: ${pageId} -> ${text}`);
          }
        }
      }
    }
  });

  it("prompts stay clean and show visible stimulus for word/letter items", () => {
    for (const gradeKey of ["g1", "g2"]) {
      const pages = gradeKey === "g1" ? G1_PAGES : G2_PAGES;
      for (const pageId of pages) {
        if (getRuntimeEligiblePhonicsPool(gradeKey, pageId).length === 0) continue;
        for (let i = 0; i < 12; i += 1) {
          const q = generatePhonics(gradeKey, pageId);
          const text = displayTextFromQuestion(q);
          assert.equal(BROKEN_SLASH_PROMPT.test(text), false, `broken slash: ${text}`);
          assert.equal(MANGLED_HEBREW_SLASH.test(text), false, `mangled /: ${text}`);

          const stimulus = String(q.params?.phonicsStimulus || q.exerciseText || "").trim();
          if (stimulus) {
            assert.ok(
              text.includes(stimulus),
              `stimulus "${stimulus}" missing from display for ${pageId}`
            );
          }
        }
      }
    }
  });
});
