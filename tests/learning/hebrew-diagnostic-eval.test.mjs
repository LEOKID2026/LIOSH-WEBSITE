/**
 * Hebrew diagnostics — H-02/H-03/H-05/H-07 exact TEPs + 0 FP.
 * Run: node --test tests/learning/hebrew-diagnostic-eval.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { classifyHebrewTypedAnswer } from "../../lib/learning/classifiers/hebrew-typed-classifier.js";
import { classifyAnswerEvidence } from "../../lib/learning/classifiers/classify-answer-evidence.js";
import {
  proveHebrewHomophonePair,
  proveHebrewAgreementSlot,
  proveHebrewPunctuationIdentity,
  proveHebrewKnownMisspelling,
  classifyHebrewAnswer,
} from "../../lib/learning/fuzzy-tolerance-hebrew.js";
import { TAXONOMY_EVIDENCE_RULES } from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { taxonomyIdsForReportBucket } from "../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";

describe("Hebrew answerMode isolation", () => {
  test("typing spelling → hebrew typed pipeline", () => {
    const ev = classifyAnswerEvidence({
      subject: "hebrew",
      topic: "writing",
      question: { params: { answerMode: "typing", patternFamily: "spelling", checkSpelling: true } },
      params: { answerMode: "typing", patternFamily: "spelling", checkSpelling: true },
      userAnswer: "ביט",
      expectedAnswer: "בית",
      isCorrect: false,
      answerMode: "typed",
    });
    assert.equal(ev.detectedMisconception, "spelling_pattern_error");
    // answerMode "typed" maps to engine questionType "numeric"
    assert.ok(["numeric", "open", "typed"].includes(ev.questionType));
  });

  test("MCQ agreement untagged → grammar_agreement_error", () => {
    const ev = classifyAnswerEvidence({
      subject: "hebrew",
      topic: "grammar",
      question: {
        type: "mcq",
        answers: ["יושבת", "יושב", "יושבים", "יושבות"],
        correctAnswer: "יושבת",
        params: {
          kind: "grammar",
          patternFamily: "gender_number_agreement",
          wrongForms: ["יושב", "יושבים", "יושבות"],
        },
      },
      params: {
        kind: "grammar",
        patternFamily: "gender_number_agreement",
        wrongForms: ["יושב", "יושבים", "יושבות"],
      },
      userAnswer: "יושב",
      expectedAnswer: "יושבת",
      selectedOptionIndex: 1,
      isCorrect: false,
      answerMode: "choice",
    });
    assert.equal(ev.detectedMisconception, "grammar_agreement_error");
  });
});

describe("Hebrew exact TEPs", () => {
  test("homophone pair", () => {
    const hit = proveHebrewHomophonePair({
      homophonePair: ["יוד", "יור"],
      userAnswer: "יור",
      expectedAnswer: "יוד",
    });
    assert.equal(hit?.tag, "homophone_confusion");
    assert.equal(
      classifyHebrewTypedAnswer("יור", "יוד", {
        answerMode: "typing",
        homophonePair: ["יוד", "יור"],
      })?.tag,
      "homophone_confusion",
    );
  });

  test("agreement slot", () => {
    const hit = proveHebrewAgreementSlot({
      patternFamily: "gender_number",
      correctForm: "יושבת",
      wrongForms: ["יושב", "יושבים", "יושבות"],
      userAnswer: "יושבים",
      expectedAnswer: "יושבת",
    });
    assert.equal(hit?.tag, "grammar_agreement_error");
  });

  test("punctuation end mark", () => {
    const hit = proveHebrewPunctuationIdentity({
      patternFamily: "punctuation_end",
      userAnswer: "איפה הספר.",
      expectedAnswer: "איפה הספר?",
    });
    assert.equal(hit?.tag, "punctuation_error");
  });

  test("known misspelling list", () => {
    const hit = proveHebrewKnownMisspelling({
      knownMisspellings: ["אבל", "עבל"],
      userAnswer: "עבל",
      expectedAnswer: "אבל",
    });
    assert.equal(hit?.tag, "spelling_pattern_error");
  });

  test("far wrong → null (0 FP)", () => {
    assert.equal(
      classifyHebrewAnswer({
        answerMode: "typing",
        patternFamily: "spelling",
        userAnswer: "שלוםעולם",
        expectedAnswer: "בית",
      }),
      null,
    );
  });
});

describe("Hebrew taxonomy bridges", () => {
  test("H-02 / H-05 / H-07 tags present", () => {
    assert.ok(TAXONOMY_EVIDENCE_RULES["H-02"].requiredTags.includes("grammar_agreement_error"));
    assert.ok(TAXONOMY_EVIDENCE_RULES["H-05"].requiredTags.includes("homophone_confusion"));
    assert.ok(TAXONOMY_EVIDENCE_RULES["H-07"].requiredTags.includes("punctuation_error"));
  });

  test("topic bridge punctuation / expression / homophones", () => {
    assert.deepEqual(taxonomyIdsForReportBucket("hebrew", "punctuation"), ["H-07"]);
    assert.deepEqual(taxonomyIdsForReportBucket("hebrew", "expression"), ["H-08"]);
    assert.deepEqual(taxonomyIdsForReportBucket("hebrew", "homophones"), ["H-05"]);
  });
});
