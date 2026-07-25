/**
 * History diagnostics — HI-02/HI-03/HI-01 exact TEPs + answerMode isolation + 0 FP.
 * Run: node --test tests/learning/history-diagnostic-eval.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { classifyHistoryTypedAnswer } from "../../lib/learning/classifiers/history-typed-classifier.js";
import { classifyAnswerEvidence } from "../../lib/learning/classifiers/classify-answer-evidence.js";
import {
  proveHistoryTimelineAlt,
  proveHistoryCauseEffectSwap,
  proveHistoryConceptSlot,
  classifyHistoryAnswer,
} from "../../lib/learning/fuzzy-tolerance-history.js";
import { TAXONOMY_EVIDENCE_RULES } from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { taxonomyIdsForReportBucket } from "../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";

describe("History answerMode isolation", () => {
  test("typed timeline → history typed pipeline", () => {
    const ev = classifyAnswerEvidence({
      subject: "history",
      topic: "hasmonaeans",
      question: {
        answers: ["167 לפנהס", "63 לפנהס", "70 לספירה"],
        params: {
          answerMode: "typing",
          patternFamily: "history_timeline",
          timelineAlts: ["63 לפנהס", "70 לספירה"],
          expectedErrorTags: ["timeline_sequence_error"],
        },
      },
      params: {
        answerMode: "typing",
        patternFamily: "history_timeline",
        timelineAlts: ["63 לפנהס", "70 לספירה"],
        expectedErrorTags: ["timeline_sequence_error"],
      },
      userAnswer: "63 לפנהס",
      expectedAnswer: "167 לפנהס",
      isCorrect: false,
      answerMode: "typed",
    });
    assert.equal(ev.detectedMisconception, "timeline_sequence_error");
    assert.ok(["numeric", "open", "typed"].includes(ev.questionType));
  });

  test("MCQ untagged cause/effect → cause_effect_error", () => {
    const ev = classifyAnswerEvidence({
      subject: "history",
      topic: "hellenism_jews",
      question: {
        type: "mcq",
        answers: ["גזירות", "מרד", "שלום"],
        correctAnswer: "מרד",
        params: {
          kind: "hellenism_jews",
          patternFamily: "history_cause_effect",
          causeEffectPair: { cause: "גזירות", effect: "מרד" },
          expectedErrorTags: ["cause_effect_error"],
        },
      },
      params: {
        kind: "hellenism_jews",
        patternFamily: "history_cause_effect",
        causeEffectPair: { cause: "גזירות", effect: "מרד" },
        expectedErrorTags: ["cause_effect_error"],
      },
      userAnswer: "גזירות",
      expectedAnswer: "מרד",
      selectedOptionIndex: 0,
      isCorrect: false,
      answerMode: "choice",
    });
    assert.equal(ev.detectedMisconception, "cause_effect_error");
  });
});

describe("History exact TEPs", () => {
  test("timeline alt", () => {
    const hit = proveHistoryTimelineAlt({
      patternFamily: "hist_timeline_sequence",
      timelineAlts: ["70", "63"],
      userAnswer: "70",
      expectedAnswer: "167",
    });
    assert.equal(hit?.tag, "timeline_sequence_error");
  });

  test("cause effect swap", () => {
    const hit = proveHistoryCauseEffectSwap({
      patternFamily: "history_cause_effect",
      causeEffectPair: ["גזירות", "מרד"],
      userAnswer: "גזירות",
      expectedAnswer: "מרד",
    });
    assert.equal(hit?.tag, "cause_effect_error");
  });

  test("source concept slot", () => {
    const hit = proveHistoryConceptSlot({
      patternFamily: "history_source",
      expectedErrorTags: ["source_comprehension_error"],
      wrongForms: ["דעה"],
      userAnswer: "דעה",
      expectedAnswer: "עובדה",
    });
    assert.equal(hit?.tag, "source_comprehension_error");
  });

  test("far wrong → null (0 FP)", () => {
    assert.equal(
      classifyHistoryAnswer({
        patternFamily: "history_timeline",
        userAnswer: "תשובה_רחוקה_מאוד",
        expectedAnswer: "167",
      }),
      null,
    );
    assert.equal(
      classifyHistoryTypedAnswer("zzz_far", "167", {
        patternFamily: "history_timeline",
        answerMode: "typing",
      }),
      null,
    );
  });
});

describe("History taxonomy bridges", () => {
  test("HI-02 / HI-03 / HI-08", () => {
    assert.ok(TAXONOMY_EVIDENCE_RULES["HI-02"]?.requiredTags?.includes("timeline_sequence_error"));
    assert.ok(TAXONOMY_EVIDENCE_RULES["HI-03"]?.requiredTags?.includes("cause_effect_error"));
    assert.ok(taxonomyIdsForReportBucket("history", "hasmonaeans").includes("HI-02"));
    assert.ok(taxonomyIdsForReportBucket("history", "what_is_history").includes("HI-08"));
  });
});
