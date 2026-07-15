/**
 * Q2-C2 — Science canonical metadata population
 * Run: node --test tests/learning/science-canonical-metadata.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  enrichScienceBankRowWithCanonicalMetadata,
  inferScienceQuestionType,
  inferScienceProblemClass,
  deriveScienceRequiresVisual,
  mapScienceRowTypeToAnswerFormat,
} from "../../lib/learning/science-canonical-metadata.js";
import { QUESTION_METADATA_CONTRACT_VERSION } from "../../lib/learning/question-metadata-normalizer.js";
import { normalizeAndFreezeQuestionSet } from "../../lib/classroom-activities/assigned-activity-snapshot.server.js";

const BODY_1_ROW = {
  id: "body_1",
  topic: "body",
  grades: ["g1", "g2"],
  minLevel: "easy",
  type: "mcq",
  stem: "איפה נמצא הלב בגוף האדם?",
  options: ["a", "b", "c", "d"],
  correctIndex: 1,
  params: {
    patternFamily: "science_body_heart_location",
    subtype: "sci_body_general",
    conceptTag: "body_heart_place",
    diagnosticSkillId: "sci_body_fact_recall",
    probePower: "medium",
    expectedErrorTags: ["fact_recall_gap", "concept_confusion"],
    cognitiveLevel: "understanding",
    difficulty: "basic",
  },
};

const EXP_SPARSE_ROW = {
  id: "exp_1",
  topic: "experiments",
  grades: ["g3", "g4"],
  minLevel: "easy",
  type: "mcq",
  stem: "ביצעת ניסוי עם שני כוסות מים: אחת בשמש ואחת בצל. באיזו כוס המים יתחממו יותר?",
  options: ["a", "b", "c", "d"],
  correctIndex: 2,
  params: {
    patternFamily: "sci_experiments_scientific_method",
    subtype: "sci_experiments_general",
    cognitiveLevel: "recall",
    expectedErrorTypes: ["strategy_error", "reading_comprehension_error"],
    difficulty: "basic",
  },
};

function assertCanonicalBlock(cm) {
  assert.equal(cm.contractVersion, QUESTION_METADATA_CONTRACT_VERSION);
  assert.equal(cm.subject, "science");
  assert.ok(cm.skillId);
  assert.ok(cm.subSkill);
  assert.equal(cm.answerFormat, "mcq");
  assert.equal(cm.requiresAudio, false);
  assert.ok(["high", "medium", "low"].includes(cm.metadataConfidence));
}

describe("Q2-C2 - science bank enrichment", () => {
  test("rich body row populates full canonicalMetadata", () => {
    const out = enrichScienceBankRowWithCanonicalMetadata(BODY_1_ROW);
    const cm = out.params.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "sci_body_fact_recall");
    assert.equal(cm.subSkill, "sci_body_general");
    assert.equal(cm.questionType, "technical");
    assert.equal(cm.problemClass, "conceptual");
    assert.equal(cm.difficulty, "basic");
    assert.equal(cm.difficultyDepth, "simple_application");
    assert.equal(cm.requiresVisual, false);
    assert.ok(cm.possibleErrorPatterns?.includes("fact_recall_gap"));
    assert.equal(out.subSkill, "sci_body_general");
  });

  test("sparse experiments row gets skill fallback and mixed problemClass", () => {
    const out = enrichScienceBankRowWithCanonicalMetadata(EXP_SPARSE_ROW);
    const cm = out.params.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "sci_experiments_general");
    assert.equal(cm.problemClass, "mixed");
    assert.equal(cm.questionType, "reading_comprehension");
    assert.equal(out.params.diagnosticSkillId, "sci_experiments_general");
  });

  test("idempotent when canonicalMetadata already present", () => {
    const once = enrichScienceBankRowWithCanonicalMetadata(BODY_1_ROW);
    const twice = enrichScienceBankRowWithCanonicalMetadata(once);
    assert.strictEqual(twice, once);
  });

  test("vocabulary error tags → vocabulary questionType", () => {
    const qt = inferScienceQuestionType(
      { topic: "earth_space" },
      { expectedErrorTags: ["vocabulary_confusion", "fact_recall_gap"] }
    );
    assert.equal(qt, "vocabulary");
  });

  test("experiments topic → mixed problemClass", () => {
    assert.equal(inferScienceProblemClass({ cognitiveLevel: "recall" }, { topic: "experiments" }), "mixed");
  });

  test("mapScienceRowTypeToAnswerFormat defaults mcq", () => {
    assert.equal(mapScienceRowTypeToAnswerFormat("mcq"), "mcq");
    assert.equal(mapScienceRowTypeToAnswerFormat(undefined), "mcq");
  });

  test("deriveScienceRequiresVisual false without assets", () => {
    assert.equal(deriveScienceRequiresVisual({ topic: "body" }, {}), false);
    assert.equal(deriveScienceRequiresVisual({ diagram: "heart.svg" }, {}), true);
  });
});

describe("Q2-C2 - SCIENCE_QUESTIONS bank coverage", () => {
  test("all exported bank rows have params.canonicalMetadata", async () => {
    const { SCIENCE_QUESTIONS } = await import("../../data/science-questions.js");
    assert.ok(Array.isArray(SCIENCE_QUESTIONS));
    assert.ok(SCIENCE_QUESTIONS.length > 100);

    let withCanonical = 0;
    let withSkillId = 0;
    for (const row of SCIENCE_QUESTIONS) {
      const cm = row?.params?.canonicalMetadata;
      if (cm && typeof cm === "object") withCanonical += 1;
      if (cm?.skillId) withSkillId += 1;
    }

    assert.equal(withCanonical, SCIENCE_QUESTIONS.length);
    assert.equal(withSkillId, SCIENCE_QUESTIONS.length);
  });
});

describe("Q2-C2 - freeze preserves science canonicalMetadata", () => {
  test("normalizeAndFreezeQuestionSet keeps params.canonicalMetadata", () => {
    const enriched = enrichScienceBankRowWithCanonicalMetadata(BODY_1_ROW);
    const playable = {
      question: enriched.stem,
      correct_answer: enriched.options[enriched.correctIndex],
      choices: enriched.options,
      subject: "science",
      topic: enriched.topic,
      grade: "g2",
      difficulty: "easy",
      skill_key: enriched.params.diagnosticSkillId,
      params: enriched.params,
    };

    const frozen = normalizeAndFreezeQuestionSet([playable], {
      subject: "science",
      topic: "body",
      grade: "g2",
    });

    assert.equal(frozen[0].params?.canonicalMetadata?.skillId, "sci_body_fact_recall");
    assert.equal(frozen[0].params?.canonicalMetadata?.answerFormat, "mcq");
  });
});
