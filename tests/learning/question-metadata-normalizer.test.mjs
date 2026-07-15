/**
 * Q2-B — question metadata normalizer unit tests
 * Run: node --test tests/learning/question-metadata-normalizer.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeQuestionMetadata,
  mapPhase8MetadataConfidence,
  mapEngineQuestionTypeToAnswerFormat,
  deriveDifficultyDepth,
  deriveRequiresVisual,
  deriveRequiresAudio,
  computeDiagnosticEligibleByMetadataHint,
  normalizeDifficultyBand,
  QUESTION_METADATA_CONTRACT_VERSION,
} from "../../lib/learning/question-metadata-normalizer.js";

import { SUBJECT_FIXTURES } from "./fixtures/question-metadata-fixtures.mjs";

describe("Q2-B - legacy mapping", () => {
  test("diagnosticSkillId / skill_key / questionEngine.skillId → skillId", () => {
    assert.equal(
      normalizeQuestionMetadata({ skill_key: "math_add_two" }).skillId,
      "math_add_two"
    );
    assert.equal(
      normalizeQuestionMetadata({
        params: { diagnosticSkillId: "sci_body_fact_recall" },
      }).skillId,
      "sci_body_fact_recall"
    );
    assert.equal(
      normalizeQuestionMetadata({
        questionEngine: { skillId: "geo_square_area" },
      }).skillId,
      "geo_square_area"
    );
    assert.equal(
      normalizeQuestionMetadata(SUBJECT_FIXTURES.math).skillId,
      "math_frac_add_like"
    );
  });

  test("subtype / subtopic / subtopicId / questionEngine.subtopic → subSkill", () => {
    assert.equal(
      normalizeQuestionMetadata({
        subtopic: "carry",
        params: { subtype: "two_digit_carry" },
      }).subSkill,
      "two_digit_carry"
    );
    assert.equal(
      normalizeQuestionMetadata({ subtopicId: "g1.phoneme_awareness" }).subSkill,
      "g1.phoneme_awareness"
    );
    assert.equal(
      normalizeQuestionMetadata({
        questionEngine: { subtopic: "square_side" },
      }).subSkill,
      "square_side"
    );
    assert.equal(
      normalizeQuestionMetadata(SUBJECT_FIXTURES.hebrew).subSkill,
      "initial_sound"
    );
  });

  test("Phase 8 metadataConfidence → high/medium/low", () => {
    assert.equal(mapPhase8MetadataConfidence("full"), "high");
    assert.equal(mapPhase8MetadataConfidence("partial"), "medium");
    assert.equal(mapPhase8MetadataConfidence("minimal"), "low");
    assert.equal(mapPhase8MetadataConfidence("unknown"), "low");
    assert.equal(mapPhase8MetadataConfidence("high"), "high");
  });

  test("questionEngine.questionType → answerFormat", () => {
    assert.equal(mapEngineQuestionTypeToAnswerFormat("mcq"), "mcq");
    assert.equal(mapEngineQuestionTypeToAnswerFormat("numeric"), "numeric");
    assert.equal(mapEngineQuestionTypeToAnswerFormat("open"), "text");
    assert.equal(
      normalizeQuestionMetadata(SUBJECT_FIXTURES.math).answerFormat,
      "mcq"
    );
  });
});

describe("Q2-B - subject fixtures", () => {
  for (const [name, fixture] of Object.entries(SUBJECT_FIXTURES)) {
    test(`${name} normalizes with contractVersion`, () => {
      const out = normalizeQuestionMetadata(fixture);
      assert.equal(out.contractVersion, QUESTION_METADATA_CONTRACT_VERSION);
      assert.ok(typeof out === "object");
      if (fixture.subject) assert.equal(out.subject, fixture.subject);
      if (fixture.topic) assert.equal(out.topic, fixture.topic);
    });
  }

  test("math - difficultyDepth from cognitiveLevel", () => {
    const out = normalizeQuestionMetadata(SUBJECT_FIXTURES.math);
    assert.equal(out.difficultyDepth, "simple_application");
    assert.equal(out.difficulty, "medium");
    assert.ok(Array.isArray(out.possibleErrorPatterns));
    assert.ok(out.possibleErrorPatterns.includes("denominator_confusion"));
  });

  test("geometry - requiresVisual from shape", () => {
    const out = normalizeQuestionMetadata(SUBJECT_FIXTURES.geometry);
    assert.equal(out.requiresVisual, true);
    assert.equal(out.questionType, "diagram");
    assert.equal(out.metadataConfidence, "medium");
  });

  test("science - skillId and error patterns", () => {
    const out = normalizeQuestionMetadata(SUBJECT_FIXTURES.science);
    assert.equal(out.skillId, "sci_body_fact_recall");
    assert.equal(out.metadataConfidence, "high");
    assert.equal(out.questionType, "technical");
  });

  test("english - questionType from topic grammar", () => {
    const out = normalizeQuestionMetadata(SUBJECT_FIXTURES.english);
    assert.equal(out.questionType, "grammar");
    assert.equal(out.subSkill, "past_simple");
  });

  test("hebrew - difficultyDepth from difficultyBand", () => {
    const out = normalizeQuestionMetadata(SUBJECT_FIXTURES.hebrew);
    assert.equal(out.difficultyDepth, "recall");
    assert.equal(out.metadataConfidence, "low");
  });

  test("moledet - skillId from params", () => {
    const out = normalizeQuestionMetadata(SUBJECT_FIXTURES.moledet);
    assert.equal(out.skillId, "moledet_geo_homeland");
    assert.equal(out.subSkill, "map_regions");
  });

  test("frozen assigned snapshot - skill_key mapping", () => {
    const out = normalizeQuestionMetadata(SUBJECT_FIXTURES.frozenAssigned);
    assert.equal(out.skillId, "math_add_two");
    assert.equal(out.subSkill, "carry");
    assert.equal(out.grade, "g2");
    assert.equal(out.difficulty, "basic");
  });

  test("math word problem - questionType word_problem", () => {
    const out = normalizeQuestionMetadata(SUBJECT_FIXTURES.mathWordProblem);
    assert.equal(out.questionType, "word_problem");
    assert.equal(out.difficultyDepth, "simple_application");
  });
});

describe("Q2-B - safe derivations", () => {
  test("requiresVisual from shape and geometry kind", () => {
    assert.equal(deriveRequiresVisual({ shape: "triangle" }), true);
    assert.equal(
      deriveRequiresVisual({ subject: "geometry", params: { kind: "square_area" } }),
      true
    );
    assert.equal(deriveRequiresVisual({ subject: "math" }), false);
  });

  test("requiresAudio from type audio", () => {
    assert.equal(deriveRequiresAudio({ type: "audio" }, null), true);
    assert.equal(deriveRequiresAudio({}, { questionType: "audio" }), true);
    assert.equal(deriveRequiresAudio({ subject: "math" }, { questionType: "mcq" }), false);
  });

  test("difficultyDepth multi_step from wp_multi kind", () => {
    assert.equal(
      deriveDifficultyDepth({}, { kind: "wp_multi_step_ratio" }),
      "multi_step"
    );
  });

  test("normalizeDifficultyBand canonical values", () => {
    assert.equal(normalizeDifficultyBand("easy"), "basic");
    assert.equal(normalizeDifficultyBand("standard"), "medium");
    assert.equal(normalizeDifficultyBand("advanced"), "hard");
  });
});

describe("Q2-B - diagnosticEligibleByMetadata hint only", () => {
  test("true when skillId present and not learning-only kind", () => {
    assert.equal(
      computeDiagnosticEligibleByMetadataHint("math_frac_add_like", { kind: "frac_add_like" }),
      true
    );
    assert.equal(
      normalizeQuestionMetadata(SUBJECT_FIXTURES.math).diagnosticEligibleByMetadata,
      true
    );
  });

  test("false for learning-only kind hint", () => {
    assert.equal(
      computeDiagnosticEligibleByMetadataHint("some_skill", { kind: "learning_review" }),
      false
    );
    assert.equal(
      normalizeQuestionMetadata(SUBJECT_FIXTURES.bookLearningContext).diagnosticEligibleByMetadata,
      false
    );
  });

  test("step-by-step context does not flip product flags - hint may still be true", () => {
    const out = normalizeQuestionMetadata(SUBJECT_FIXTURES.stepByStepContext);
    assert.equal(out.diagnosticEligibleByMetadata, true);
    assert.equal(SUBJECT_FIXTURES.stepByStepContext.isDiagnosticEligible, false);
    assert.equal(SUBJECT_FIXTURES.stepByStepContext.evidenceCategory, "learning_guided");
    assert.notEqual(out.diagnosticEligibleByMetadata, SUBJECT_FIXTURES.stepByStepContext.isDiagnosticEligible);
  });

  test("normalizer never emits isDiagnosticEligible or evidenceCategory", () => {
    const out = normalizeQuestionMetadata(SUBJECT_FIXTURES.stepByStepContext);
    assert.equal(Object.prototype.hasOwnProperty.call(out, "isDiagnosticEligible"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(out, "evidenceCategory"), false);
  });
});

describe("Q2-B - includeLegacy debug option", () => {
  test("includeLegacy adds _legacy block without changing canonical fields", () => {
    const base = normalizeQuestionMetadata(SUBJECT_FIXTURES.math);
    const withLegacy = normalizeQuestionMetadata(SUBJECT_FIXTURES.math, { includeLegacy: true });
    const { _legacy, ...canonicalFromLegacy } = withLegacy;
    assert.deepEqual(canonicalFromLegacy, base);
    assert.ok(_legacy);
    assert.equal(_legacy.diagnosticSkillId, "math_frac_add_like");
    assert.equal(_legacy.engineQuestionType, "mcq");
  });
});

describe("Q2-B - edge cases", () => {
  test("null/empty input returns contractVersion only", () => {
    assert.deepEqual(normalizeQuestionMetadata(null), {
      contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
    });
    assert.deepEqual(normalizeQuestionMetadata(undefined), {
      contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
    });
  });

  test("questionEngine-only minimal record", () => {
    const out = normalizeQuestionMetadata({
      questionEngine: {
        questionType: "numeric",
        skillId: "math_place_value",
        metadataConfidence: "partial",
      },
    });
    assert.equal(out.skillId, "math_place_value");
    assert.equal(out.answerFormat, "numeric");
    assert.equal(out.metadataConfidence, "medium");
  });
});
