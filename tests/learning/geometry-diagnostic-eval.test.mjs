/**
 * Geometry diagnostics — G-01…G-09 TEP eval (exact + 0 FP).
 * Run: node --test tests/learning/geometry-diagnostic-eval.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { classifyMathNumericAnswer } from "../../lib/learning/classifiers/math-numeric-classifier.js";
import { classifyAnswerEvidence } from "../../lib/learning/classifiers/classify-answer-evidence.js";
import {
  proveForgotDivideBy2OnTriangleArea,
  proveForgotDivideBy2OnTrapezoidArea,
  proveParallelogramAreaHalfError,
  provePerimeterAreaConfusion,
  provePerimeterFormulaError,
  proveVolumeDimensionSlip,
  proveTriangleAngleSumError,
  provePythagoreanRelationError,
  classifyGeometryAnswer,
} from "../../lib/learning/fuzzy-tolerance-geometry.js";
import { extractCanonicalOperands } from "../../lib/learning/answer-evidence-contract.js";
import { TAXONOMY_EVIDENCE_RULES } from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";

describe("Geometry answerMode / MCQ fallback", () => {
  test("MCQ without cell tag → forgot_divide_by_2 via geometry prove", () => {
    const ev = classifyAnswerEvidence({
      subject: "geometry",
      topic: "area",
      question: {
        type: "mcq",
        answers: [12, 24, 10, 5],
        correctAnswer: 12,
        params: { kind: "triangle_area", base: 6, height: 4 },
      },
      params: { kind: "triangle_area", base: 6, height: 4 },
      userAnswer: 24,
      expectedAnswer: 12,
      selectedOptionIndex: 1,
      isCorrect: false,
      answerMode: "choice",
    });
    assert.equal(ev.detectedMisconception, "forgot_divide_by_2");
  });

  test("typed numeric geometry path", () => {
    const ev = classifyAnswerEvidence({
      subject: "geometry",
      topic: "area",
      question: { params: { kind: "triangle_area", base: 6, height: 4 } },
      params: { kind: "triangle_area", base: 6, height: 4 },
      userAnswer: 24,
      expectedAnswer: 12,
      isCorrect: false,
      answerMode: "typed",
    });
    assert.equal(ev.detectedMisconception, "forgot_divide_by_2");
  });
});

describe("G-08 triangle / trapezoid area", () => {
  test("forgot_divide_by_2 triangle", () => {
    const hit = proveForgotDivideBy2OnTriangleArea({
      kind: "triangle_area",
      base: 6,
      height: 4,
      userAnswer: 24,
      expectedAnswer: 12,
    });
    assert.equal(hit?.tag, "forgot_divide_by_2");
    assert.equal(
      classifyMathNumericAnswer(24, 12, { kind: "triangle_area", base: 6, height: 4 }, "triangle_area")
        ?.tag,
      "forgot_divide_by_2",
    );
  });

  test("legacy tri_area a/b still works", () => {
    assert.equal(
      classifyMathNumericAnswer(24, 12, { kind: "tri_area", a: 6, b: 4 }, "tri_area")?.tag,
      "forgot_divide_by_2",
    );
  });

  test("trapezoid forgot ÷2", () => {
    // (3+5)*4/2 = 16; without ÷2 = 32
    const hit = proveForgotDivideBy2OnTrapezoidArea({
      kind: "trapezoid_area",
      base1: 3,
      base2: 5,
      height: 4,
      userAnswer: 32,
      expectedAnswer: 16,
    });
    assert.equal(hit?.tag, "forgot_divide_by_2");
  });

  test("far wrong → null", () => {
    assert.equal(
      classifyMathNumericAnswer(999, 12, { kind: "triangle_area", base: 6, height: 4 }, "triangle_area"),
      null,
    );
  });
});

describe("G-06 perimeter ↔ area", () => {
  test("perim for area on rectangle", () => {
    const hit = provePerimeterAreaConfusion({
      kind: "rectangle_area",
      length: 2,
      width: 3,
      userAnswer: 10,
      expectedAnswer: 6,
    });
    assert.equal(hit?.tag, "perimeter_area_confusion");
  });

  test("area for perimeter on square", () => {
    const hit = provePerimeterAreaConfusion({
      kind: "square_perimeter",
      side: 5,
      userAnswer: 25,
      expectedAnswer: 20,
    });
    assert.equal(hit?.tag, "perimeter_area_confusion");
  });

  test("incomplete perimeter formula", () => {
    const hit = provePerimeterFormulaError({
      kind: "rectangle_perimeter",
      length: 4,
      width: 3,
      userAnswer: 7,
      expectedAnswer: 14,
    });
    assert.equal(hit?.tag, "perimeter_formula_error");
  });
});

describe("G-03 parallelogram / height", () => {
  test("parallelogram used triangle half", () => {
    const hit = proveParallelogramAreaHalfError({
      kind: "parallelogram_area",
      base: 8,
      height: 5,
      userAnswer: 20,
      expectedAnswer: 40,
    });
    assert.equal(hit?.tag, "parallelogram_area_error");
  });
});

describe("G-05 volume", () => {
  test("forgot depth on box", () => {
    const hit = proveVolumeDimensionSlip({
      kind: "rectangular_prism_volume",
      length: 3,
      width: 4,
      height: 5,
      userAnswer: 12,
      expectedAnswer: 60,
    });
    assert.equal(hit?.tag, "volume_formula_error");
    assert.equal(hit?.details?.mode, "forgot_depth");
  });

  test("cube face instead of volume", () => {
    const hit = proveVolumeDimensionSlip({
      kind: "cube_volume",
      side: 4,
      userAnswer: 16,
      expectedAnswer: 64,
    });
    assert.equal(hit?.tag, "volume_formula_error");
  });
});

describe("G-02 triangle angles", () => {
  test("sum instead of complement", () => {
    const hit = proveTriangleAngleSumError({
      kind: "triangle_angles",
      angle1: 40,
      angle2: 70,
      angle3: 70,
      userAnswer: 110,
      expectedAnswer: 70,
    });
    assert.equal(hit?.tag, "triangle_angle_sum_error");
  });

  test("used 360°", () => {
    const hit = proveTriangleAngleSumError({
      kind: "triangle_angles",
      angle1: 50,
      angle2: 60,
      angle3: 70,
      userAnswer: 250,
      expectedAnswer: 70,
    });
    assert.equal(hit?.tag, "triangle_angle_sum_error");
    assert.equal(hit?.details?.mode, "used_360");
  });
});

describe("G-09 Pythagoras", () => {
  test("add legs instead of hyp", () => {
    const hit = provePythagoreanRelationError({
      kind: "pythagoras_hyp",
      a: 3,
      b: 4,
      c: 5,
      userAnswer: 7,
      expectedAnswer: 5,
    });
    assert.equal(hit?.tag, "pythagorean_relation_error");
  });

  test("forgot sqrt", () => {
    const hit = provePythagoreanRelationError({
      kind: "pythagoras_hyp",
      a: 3,
      b: 4,
      c: 5,
      userAnswer: 25,
      expectedAnswer: 5,
    });
    assert.equal(hit?.tag, "pythagorean_relation_error");
    assert.equal(hit?.details?.mode, "forgot_sqrt");
  });

  test("far wrong → null", () => {
    assert.equal(
      classifyGeometryAnswer({
        kind: "pythagoras_hyp",
        a: 3,
        b: 4,
        c: 5,
        userAnswer: 999,
        expectedAnswer: 5,
      }),
      null,
    );
  });
});

describe("Geometry structural + operands + taxonomy", () => {
  test("±1 structural after exact miss", () => {
    const hit = classifyGeometryAnswer({
      kind: "rectangle_area",
      length: 5,
      width: 4,
      userAnswer: 21,
      expectedAnswer: 20,
    });
    assert.equal(hit?.tag, "calculation_off_by_one");
  });

  test("canonical operands include base/height/length", () => {
    const ops = extractCanonicalOperands(
      { kind: "triangle_area", base: 6, height: 4 },
      "triangle_area",
    );
    assert.equal(ops?.base, 6);
    assert.equal(ops?.height, 4);
  });

  test("G-02…G-09 evidence rules expanded", () => {
    assert.ok(TAXONOMY_EVIDENCE_RULES["G-02"].requiredTags.includes("triangle_angle_sum_error"));
    assert.ok(TAXONOMY_EVIDENCE_RULES["G-05"].questionKinds.includes("rectangular_prism_volume"));
    assert.ok(TAXONOMY_EVIDENCE_RULES["G-06"].questionKinds.includes("rectangle_area"));
    assert.ok(TAXONOMY_EVIDENCE_RULES["G-08"].questionKinds.includes("triangle_area"));
    assert.ok(TAXONOMY_EVIDENCE_RULES["G-09"].questionKinds.includes("pythagoras_hyp"));
  });
});
