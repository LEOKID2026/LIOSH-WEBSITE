/**
 * Q2-C1 — Math + Geometry canonical metadata population
 * Run: node --test tests/learning/math-geometry-canonical-metadata.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { attachProfessionalMathMetadata } from "../../utils/math-question-metadata.js";
import { enrichGeometryProceduralParams } from "../../utils/geometry-diagnostic-metadata-bridge.js";
import {
  attachCanonicalMetadataToMathGeometryQuestion,
  inferMathProblemClass,
  inferGeometryProblemClass,
} from "../../lib/learning/math-geometry-canonical-metadata.js";
import { normalizeAndFreezeQuestionSet } from "../../lib/classroom-activities/assigned-activity-snapshot.server.js";
import { QUESTION_METADATA_CONTRACT_VERSION } from "../../lib/learning/question-metadata-normalizer.js";

function assertCanonicalBlock(meta, label = "canonicalMetadata") {
  assert.ok(meta && typeof meta === "object", `${label} must be object`);
  assert.equal(meta.contractVersion, QUESTION_METADATA_CONTRACT_VERSION);
  assert.ok(pick(meta.skillId), `${label}.skillId required`);
  assert.ok(pick(meta.subSkill), `${label}.subSkill required`);
  assert.equal(meta.answerFormat, "mcq");
  assert.ok(["high", "medium", "low"].includes(meta.metadataConfidence));
}

function pick(v) {
  return v != null && String(v).trim() !== "" ? String(v).trim() : null;
}

describe("Q2-C1 - math attachProfessionalMathMetadata", () => {
  test("fractions procedural populates params.canonicalMetadata", () => {
    const out = attachProfessionalMathMetadata(
      {
        operation: "fractions",
        params: { kind: "frac_add_like", subtype: "like_denominators" },
        answers: ["1/2", "2/3", "3/4", "4/5"],
        correctAnswer: "1/2",
      },
      { selectedOp: "fractions", gradeKey: "g4", mathLevelKey: "medium" }
    );

    const cm = out.params?.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.subject, "math");
    assert.equal(cm.skillId, "math_frac_add_like");
    assert.equal(cm.subSkill, "like_denominators");
    assert.equal(cm.questionType, "technical");
    assert.equal(cm.problemClass, "procedural");
    assert.equal(cm.difficultyDepth, "simple_application");
    assert.equal(out.subSkill, "like_denominators");
    assert.ok(Array.isArray(cm.possibleErrorPatterns));
    assert.ok(cm.possibleErrorPatterns.includes("denominator_confusion"));
  });

  test("word problem → mixed problemClass and word_problem questionType", () => {
    const out = attachProfessionalMathMetadata(
      {
        operation: "word_problems",
        params: { kind: "wp_single_step" },
        answers: ["5", "6", "7", "8"],
        correctAnswer: "6",
      },
      { selectedOp: "word_problems", gradeKey: "g3", mathLevelKey: "easy" }
    );
    const cm = out.params.canonicalMetadata;
    assert.equal(cm.problemClass, "mixed");
    assert.equal(cm.questionType, "word_problem");
    assert.equal(cm.difficultyDepth, "simple_application");
  });

  test("probe kind → conceptual problemClass", () => {
    assert.equal(inferMathProblemClass({ kind: "frac_probe_equiv" }), "conceptual");
    const out = attachProfessionalMathMetadata(
      {
        operation: "fractions",
        params: { kind: "frac_probe_equiv", probePower: "high" },
        answers: ["a", "b"],
        correctAnswer: "a",
      },
      { selectedOp: "fractions", gradeKey: "g4", mathLevelKey: "hard" }
    );
    assert.equal(out.params.canonicalMetadata.problemClass, "conceptual");
  });
});

describe("Q2-C1 - geometry procedural", () => {
  test("square_area enrich + canonical attach", () => {
    const enriched = enrichGeometryProceduralParams(
      { kind: "square_area", length: 4 },
      { topic: "area", gradeKey: "g4", levelKey: "medium" }
    );
    const out = attachCanonicalMetadataToMathGeometryQuestion(
      {
        question: "מה שטח הריבוע?",
        topic: "area",
        shape: "square",
        answers: ["16", "12", "8", "4"],
        correctAnswer: "16",
        params: enriched,
      },
      { subject: "geometry", gradeKey: "g4", levelKey: "medium", topic: "area" }
    );

    const cm = out.params.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.subject, "geometry");
    assert.equal(cm.skillId, "geo_area_square_formula");
    assert.equal(cm.problemClass, "procedural");
    assert.equal(cm.questionType, "diagram");
    assert.equal(cm.requiresVisual, true);
    assert.ok(cm.possibleErrorPatterns?.includes("formula_selection_error"));
  });

  test("story geometry kind → mixed problemClass", () => {
    assert.equal(inferGeometryProblemClass({ kind: "story_square_area" }), "mixed");
    const enriched = enrichGeometryProceduralParams(
      { kind: "story_square_area" },
      { topic: "area", gradeKey: "g3", levelKey: "easy" }
    );
    const out = attachCanonicalMetadataToMathGeometryQuestion(
      {
        topic: "area",
        shape: "square",
        params: enriched,
        answers: ["1", "2"],
        correctAnswer: "1",
      },
      { subject: "geometry", gradeKey: "g3", topic: "area" }
    );
    assert.equal(out.params.canonicalMetadata.problemClass, "mixed");
  });

  test("conceptual kind → conceptual problemClass", () => {
    assert.equal(inferGeometryProblemClass({ kind: "conceptual_mcq", conceptTag: "area_perimeter_concept" }), "conceptual");
  });
});

describe("Q2-C1 - freeze preserves canonicalMetadata in params", () => {
  test("normalizeAndFreezeQuestionSet keeps params.canonicalMetadata", () => {
    const out = attachProfessionalMathMetadata(
      {
        operation: "addition",
        params: { kind: "add_two" },
        answers: ["10", "11", "12", "13"],
        correctAnswer: "11",
      },
      { selectedOp: "addition", gradeKey: "g2", mathLevelKey: "easy" }
    );

    const frozen = normalizeAndFreezeQuestionSet([out], {
      subject: "math",
      topic: "addition",
      grade: "g2",
      difficulty: "easy",
    });

    assert.equal(frozen.length, 1);
    const row = frozen[0];
    assert.ok(row.params?.canonicalMetadata);
    assert.equal(row.params.canonicalMetadata.skillId, "math_add_two");
    assert.equal(row.params.canonicalMetadata.answerFormat, "mcq");
  });
});

describe("Q2-C1 - coverage fields present", () => {
  const REQUIRED_CANONICAL_KEYS = [
    "contractVersion",
    "subject",
    "topic",
    "skillId",
    "subSkill",
    "questionType",
    "problemClass",
    "difficulty",
    "difficultyDepth",
    "requiresVisual",
    "requiresAudio",
    "answerFormat",
    "metadataConfidence",
    "diagnosticEligibleByMetadata",
    "possibleErrorPatterns",
  ];

  test("math representative has all Q2-C1 canonical keys", () => {
    const out = attachProfessionalMathMetadata(
      { operation: "fractions", params: { kind: "frac_add_like" }, answers: ["a", "b"], correctAnswer: "a" },
      { selectedOp: "fractions", gradeKey: "g4", mathLevelKey: "medium" }
    );
    const cm = out.params.canonicalMetadata;
    for (const key of REQUIRED_CANONICAL_KEYS) {
      assert.ok(Object.prototype.hasOwnProperty.call(cm, key), `math missing ${key}`);
    }
  });

  test("geometry representative has all Q2-C1 canonical keys", () => {
    const enriched = enrichGeometryProceduralParams(
      { kind: "rectangle_area", length: 5, width: 3 },
      { topic: "area", gradeKey: "g5", levelKey: "medium" }
    );
    const out = attachCanonicalMetadataToMathGeometryQuestion(
      { topic: "area", shape: "rectangle", params: enriched, answers: ["15", "8"], correctAnswer: "15" },
      { subject: "geometry", gradeKey: "g5", topic: "area" }
    );
    const cm = out.params.canonicalMetadata;
    for (const key of REQUIRED_CANONICAL_KEYS) {
      assert.ok(Object.prototype.hasOwnProperty.call(cm, key), `geometry missing ${key}`);
    }
  });
});
