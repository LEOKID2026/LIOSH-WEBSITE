/**
 * Moledet / geography / homeland diagnostics — MG exact TEPs + answerMode + 0 FP.
 * Run: node --test tests/learning/moledet-diagnostic-eval.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { classifyMoledetTypedAnswer } from "../../lib/learning/classifiers/moledet-typed-classifier.js";
import { classifyAnswerEvidence } from "../../lib/learning/classifiers/classify-answer-evidence.js";
import {
  proveMoledetDirectionOpposite,
  proveMoledetMapSymbolSlot,
  proveMoledetCivicsSlot,
  proveMoledetGeographySlot,
  classifyMoledetAnswer,
} from "../../lib/learning/fuzzy-tolerance-moledet.js";
import { TAXONOMY_EVIDENCE_RULES } from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { taxonomyIdsForReportBucket } from "../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";

describe("Moledet / geography / homeland answerMode isolation", () => {
  test("typed direction → moledet typed pipeline", () => {
    const ev = classifyAnswerEvidence({
      subject: "geography",
      topic: "maps",
      question: {
        params: {
          answerMode: "typing",
          patternFamily: "geography_map",
          isDirectionQuestion: true,
          expectedErrorTags: ["direction_error"],
        },
      },
      params: {
        answerMode: "typing",
        patternFamily: "geography_map",
        isDirectionQuestion: true,
        expectedErrorTags: ["direction_error"],
      },
      userAnswer: "דרום",
      expectedAnswer: "צפון",
      isCorrect: false,
      answerMode: "typed",
    });
    assert.equal(ev.detectedMisconception, "direction_error");
    assert.ok(["numeric", "open", "typed"].includes(ev.questionType));
  });

  test("homeland MCQ untagged citizenship → citizenship_error", () => {
    const ev = classifyAnswerEvidence({
      subject: "homeland",
      topic: "citizenship",
      question: {
        type: "mcq",
        answers: ["חובה", "זכות", "רשות"],
        correctAnswer: "זכות",
        params: {
          kind: "citizenship",
          patternFamily: "moledet_citizenship",
          wrongForms: ["חובה", "רשות"],
          expectedErrorTags: ["citizenship_error"],
        },
      },
      params: {
        kind: "citizenship",
        patternFamily: "moledet_citizenship",
        wrongForms: ["חובה", "רשות"],
        expectedErrorTags: ["citizenship_error"],
      },
      userAnswer: "חובה",
      expectedAnswer: "זכות",
      selectedOptionIndex: 0,
      isCorrect: false,
      answerMode: "choice",
    });
    assert.equal(ev.detectedMisconception, "citizenship_error");
  });

  test("moledet_geography subject alias routes same TEPs", () => {
    const ev = classifyAnswerEvidence({
      subject: "moledet_geography",
      topic: "maps",
      question: {
        type: "mcq",
        answers: ["נהר", "הר", "אגם"],
        correctAnswer: "נהר",
        params: {
          kind: "maps",
          patternFamily: "geography_map",
          legendWrongForms: ["הר", "אגם"],
          expectedErrorTags: ["map_symbol_error"],
        },
      },
      params: {
        kind: "maps",
        patternFamily: "geography_map",
        legendWrongForms: ["הר", "אגם"],
        expectedErrorTags: ["map_symbol_error"],
      },
      userAnswer: "הר",
      expectedAnswer: "נהר",
      selectedOptionIndex: 1,
      isCorrect: false,
      answerMode: "choice",
    });
    assert.equal(ev.detectedMisconception, "map_symbol_error");
  });
});

describe("Moledet exact TEPs", () => {
  test("direction opposite", () => {
    const hit = proveMoledetDirectionOpposite({
      patternFamily: "geography_map",
      isDirectionQuestion: true,
      userAnswer: "south",
      expectedAnswer: "north",
    });
    assert.equal(hit?.tag, "direction_error");
  });

  test("map symbol slot", () => {
    const hit = proveMoledetMapSymbolSlot({
      patternFamily: "geography_map",
      legendWrongForms: ["בית ספר"],
      userAnswer: "בית ספר",
      expectedAnswer: "בית חולים",
    });
    assert.equal(hit?.tag, "map_symbol_error");
  });

  test("civics / homeland slot", () => {
    const hit = proveMoledetCivicsSlot({
      topic: "homeland",
      patternFamily: "moledet_heritage",
      expectedErrorTags: ["homeland_identity_error"],
      wrongForms: ["עיר זרה"],
      userAnswer: "עיר זרה",
      expectedAnswer: "ירושלים",
    });
    assert.equal(hit?.tag, "homeland_identity_error");
  });

  test("location confusion pair", () => {
    const hit = proveMoledetGeographySlot({
      patternFamily: "geography_location",
      confusionPair: ["צפון", "דרום"],
      userAnswer: "דרום",
      expectedAnswer: "צפון",
    });
    assert.equal(hit?.tag, "location_error");
  });

  test("far wrong → null (0 FP)", () => {
    assert.equal(
      classifyMoledetAnswer({
        patternFamily: "geography_map",
        userAnswer: "תשובה_רחוקה_מאוד",
        expectedAnswer: "צפון",
      }),
      null,
    );
    assert.equal(
      classifyMoledetTypedAnswer("zzz_far", "צפון", {
        patternFamily: "geography_map",
        answerMode: "typing",
      }),
      null,
    );
  });
});

describe("Moledet / geography / homeland taxonomy bridges", () => {
  test("MG-01 / MG-03 / MG-04 / MG-08", () => {
    assert.ok(TAXONOMY_EVIDENCE_RULES["MG-01"]?.requiredTags?.includes("map_reading_error"));
    assert.ok(TAXONOMY_EVIDENCE_RULES["MG-03"]?.requiredTags?.includes("citizenship_error"));
    assert.deepEqual(taxonomyIdsForReportBucket("moledet-geography", "maps"), [
      "MG-01",
      "MG-02",
      "MG-08",
    ]);
    assert.deepEqual(taxonomyIdsForReportBucket("geography", "maps"), [
      "MG-01",
      "MG-02",
      "MG-08",
    ]);
    assert.deepEqual(taxonomyIdsForReportBucket("homeland", "citizenship"), ["MG-03"]);
    assert.ok(taxonomyIdsForReportBucket("homeland", "homeland").includes("MG-04"));
  });
});
