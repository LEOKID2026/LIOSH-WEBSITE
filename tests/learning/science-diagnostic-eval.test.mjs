/**
 * Science diagnostics — S-02/S-03/S-04 exact TEPs + answerMode isolation + 0 FP.
 * Run: node --test tests/learning/science-diagnostic-eval.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { classifyScienceTypedAnswer } from "../../lib/learning/classifiers/science-typed-classifier.js";
import { classifyAnswerEvidence } from "../../lib/learning/classifiers/classify-answer-evidence.js";
import {
  proveScienceVariableControl,
  proveScienceUnitConfusion,
  proveScienceConceptSlot,
  classifyScienceAnswer,
} from "../../lib/learning/fuzzy-tolerance-science.js";
import { TAXONOMY_EVIDENCE_RULES } from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { taxonomyIdsForReportBucket } from "../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";

describe("Science answerMode isolation", () => {
  test("typed concept → science typed pipeline (not MCQ)", () => {
    const ev = classifyAnswerEvidence({
      subject: "science",
      topic: "body",
      question: {
        answers: ["לב", "ריאה", "כבד"],
        params: {
          answerMode: "typing",
          patternFamily: "sci_body_systems",
          wrongForms: ["ריאה", "כבד"],
          expectedErrorTags: ["body_system_confusion"],
        },
      },
      params: {
        answerMode: "typing",
        patternFamily: "sci_body_systems",
        wrongForms: ["ריאה", "כבד"],
        expectedErrorTags: ["body_system_confusion"],
      },
      userAnswer: "ריאה",
      expectedAnswer: "לב",
      isCorrect: false,
      answerMode: "typed",
    });
    assert.equal(ev.detectedMisconception, "body_system_confusion");
    assert.ok(["numeric", "open", "typed"].includes(ev.questionType));
  });

  test("MCQ untagged variable control → variable_control_error", () => {
    const ev = classifyAnswerEvidence({
      subject: "science",
      topic: "experiments",
      question: {
        type: "mcq",
        answers: ["טמפרטורה", "זמן", "אור"],
        correctAnswer: "טמפרטורה",
        params: {
          kind: "experiments",
          patternFamily: "science_experiment",
          wrongForms: ["זמן", "אור"],
          expectedErrorTags: ["variable_control_error"],
        },
      },
      params: {
        kind: "experiments",
        patternFamily: "science_experiment",
        wrongForms: ["זמן", "אור"],
        expectedErrorTags: ["variable_control_error"],
      },
      userAnswer: "זמן",
      expectedAnswer: "טמפרטורה",
      selectedOptionIndex: 1,
      isCorrect: false,
      answerMode: "choice",
    });
    assert.equal(ev.detectedMisconception, "variable_control_error");
  });
});

describe("Science exact TEPs", () => {
  test("variable control slot", () => {
    const hit = proveScienceVariableControl({
      patternFamily: "science_experiment",
      wrongVariableAnswers: ["זמן"],
      userAnswer: "זמן",
      expectedAnswer: "טמפרטורה",
    });
    assert.equal(hit?.tag, "variable_control_error");
  });

  test("unit confusion pair", () => {
    const hit = proveScienceUnitConfusion({
      patternFamily: "science_measurement",
      unitConfusionPair: ["מטר", "סנטימטר"],
      userAnswer: "סנטימטר",
      expectedAnswer: "מטר",
    });
    assert.equal(hit?.tag, "material_property_error");
  });

  test("body system concept slot", () => {
    const hit = proveScienceConceptSlot({
      patternFamily: "sci_body_systems",
      expectedErrorTags: ["body_system_confusion"],
      wrongForms: ["ריאה"],
      userAnswer: "ריאה",
      expectedAnswer: "לב",
    });
    assert.equal(hit?.tag, "body_system_confusion");
  });

  test("far wrong → null (0 FP)", () => {
    assert.equal(
      classifyScienceAnswer({
        patternFamily: "sci_body_systems",
        userAnswer: "חללית_רחוקה",
        expectedAnswer: "לב",
      }),
      null,
    );
    assert.equal(
      classifyScienceTypedAnswer("xyz_far", "לב", {
        patternFamily: "sci_body_systems",
        answerMode: "typing",
      }),
      null,
    );
  });
});

describe("Science taxonomy bridges", () => {
  test("S-02 / S-03 / S-08 tags", () => {
    assert.ok(TAXONOMY_EVIDENCE_RULES["S-02"]?.requiredTags?.includes("variable_control_error"));
    assert.ok(TAXONOMY_EVIDENCE_RULES["S-03"]?.requiredTags?.includes("body_system_confusion"));
    assert.deepEqual(taxonomyIdsForReportBucket("science", "experiments"), ["S-02"]);
    assert.deepEqual(taxonomyIdsForReportBucket("science", "body"), ["S-03"]);
  });
});
