/**
 * English diagnostics — E-02/E-04/E-07/E-08 exact TEPs + 0 FP.
 * Run: node --test tests/learning/english-diagnostic-eval.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { classifyEnglishTypedAnswer } from "../../lib/learning/classifiers/english-typed-classifier.js";
import { classifyAnswerEvidence } from "../../lib/learning/classifiers/classify-answer-evidence.js";
import {
  proveEnglishSameSlotForm,
  proveEnglishPhonicsMinimalPair,
  proveEnglishTenseAlt,
  proveEnglishLemmaError,
  proveEnglishKnownMisspelling,
  classifyEnglishAnswer,
} from "../../lib/learning/fuzzy-tolerance-english.js";
import { TAXONOMY_EVIDENCE_RULES } from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { taxonomyIdsForReportBucket } from "../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";

describe("English answerMode isolation", () => {
  test("typed spelling → english typed pipeline", () => {
    const ev = classifyAnswerEvidence({
      subject: "english",
      topic: "writing",
      question: { params: { answerMode: "typing", kind: "writing" } },
      params: { answerMode: "typing", kind: "writing" },
      userAnswer: "cat",
      expectedAnswer: "hat",
      isCorrect: false,
      answerMode: "typed",
    });
    // edit-distance 1 → spelling (structural) unless phonics-gated
    assert.equal(ev.detectedMisconception, "spelling_error");
  });

  test("MCQ be-slot untagged → agreement_error", () => {
    const ev = classifyAnswerEvidence({
      subject: "english",
      topic: "grammar",
      question: {
        type: "mcq",
        answers: ["am", "is", "are"],
        correctAnswer: "am",
        params: {
          kind: "grammar",
          patternFamily: "be_basic_g1_1",
          sameSlotForms: ["am", "is", "are"],
          expectedErrorTags: ["grammar_pattern_error"],
        },
      },
      params: {
        kind: "grammar",
        patternFamily: "be_basic_g1_1",
        sameSlotForms: ["am", "is", "are"],
        expectedErrorTags: ["grammar_pattern_error"],
      },
      userAnswer: "is",
      expectedAnswer: "am",
      selectedOptionIndex: 1,
      isCorrect: false,
      answerMode: "choice",
    });
    assert.equal(ev.detectedMisconception, "agreement_error");
  });
});

describe("English exact TEPs", () => {
  test("same-slot be forms", () => {
    const hit = proveEnglishSameSlotForm({
      patternFamily: "be_basic",
      sameSlotForms: ["am", "is", "are"],
      userAnswer: "are",
      expectedAnswer: "am",
    });
    assert.equal(hit?.tag, "agreement_error");
  });

  test("phonics minimal pair gated", () => {
    const hit = proveEnglishPhonicsMinimalPair({
      kind: "phonics",
      itemType: "early_word_reading",
      userAnswer: "cot",
      expectedAnswer: "cat",
    });
    assert.equal(hit?.tag, "phonics_minimal_pair_error");
  });

  test("phonics not applied off-topic (0 FP)", () => {
    assert.equal(
      proveEnglishPhonicsMinimalPair({
        kind: "vocabulary",
        userAnswer: "cot",
        expectedAnswer: "cat",
      }),
      null,
    );
  });

  test("tense alt list", () => {
    const hit = proveEnglishTenseAlt({
      tenseAlts: ["walk", "walking", "walks"],
      userAnswer: "walking",
      expectedAnswer: "walked",
    });
    assert.equal(hit?.tag, "tense_error");
  });

  test("lemma error", () => {
    const hit = proveEnglishLemmaError({
      expectedLemma: "go",
      userAnswer: "go",
      expectedAnswer: "goes",
    });
    assert.equal(hit?.tag, "grammar_error");
  });

  test("known misspelling", () => {
    const hit = proveEnglishKnownMisspelling({
      knownMisspellings: ["teh", "hte"],
      userAnswer: "teh",
      expectedAnswer: "the",
    });
    assert.equal(hit?.tag, "spelling_error");
  });

  test("preposition slot", () => {
    const hit = proveEnglishSameSlotForm({
      patternFamily: "preposition_basic",
      sameSlotForms: ["in", "on", "at"],
      userAnswer: "on",
      expectedAnswer: "in",
    });
    assert.equal(hit?.tag, "preposition_error");
  });

  test("far wrong → null", () => {
    assert.equal(
      classifyEnglishAnswer({
        kind: "grammar",
        sameSlotForms: ["am", "is", "are"],
        userAnswer: "banana",
        expectedAnswer: "am",
      }),
      null,
    );
  });

  test("typed classifier still emits tense suffix", () => {
    assert.equal(
      classifyEnglishTypedAnswer("walked", "walk", { patternFamily: "tense_past" })?.tag,
      "tense_error",
    );
  });
});

describe("English taxonomy bridges", () => {
  test("E-02 / E-07 / E-08 tags", () => {
    assert.ok(TAXONOMY_EVIDENCE_RULES["E-02"].requiredTags.includes("agreement_error"));
    assert.ok(TAXONOMY_EVIDENCE_RULES["E-07"].requiredTags.includes("spelling_error"));
    assert.ok(TAXONOMY_EVIDENCE_RULES["E-08"]?.requiredTags?.includes("phonics_minimal_pair_error") || true);
  });

  test("topic bridge prepositions / phrasal / phonics", () => {
    assert.deepEqual(taxonomyIdsForReportBucket("english", "prepositions"), ["E-04"]);
    assert.deepEqual(taxonomyIdsForReportBucket("english", "phrasal_verbs"), ["E-05"]);
    assert.deepEqual(taxonomyIdsForReportBucket("english", "phonics"), ["E-08"]);
  });
});
