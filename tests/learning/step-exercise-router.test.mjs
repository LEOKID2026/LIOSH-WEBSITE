import assert from "node:assert/strict";
import test from "node:test";
import {
  EXERCISE_VIEWS,
  annotateAnimationSteps,
  resolveExerciseView,
  shouldShowStandaloneExerciseView,
} from "../../utils/learning-step-exercise-types.js";
import { finalizeAnimationSteps } from "../../utils/learning-step-animation-pipeline.js";
import {
  buildAdditionOrSubtractionAnimation,
  buildMultiplicationAnimation,
  buildDivisionAnimation,
  buildFractionsAnimation,
  buildAnimationForOperation,
} from "../../utils/math-animations.js";
import { parseMultiplicationPre } from "../../utils/learning-step-multiplication-exercise.js";
import { parseDivisionPre } from "../../utils/learning-step-division-exercise.js";
import { parseFractionPreLines } from "../../utils/learning-step-fraction-exercise.js";

test("resolveExerciseView routes place-value addition steps", () => {
  const steps = buildAdditionOrSubtractionAnimation(12, 8, 20, "addition");
  const annotated = annotateAnimationSteps(steps, { operation: "addition" }, "addition");
  assert.equal(annotated[0].exerciseView, EXERCISE_VIEWS.placeValue);
});

test("shouldShowStandaloneExerciseView hides wordProblem and expression text-only", () => {
  assert.equal(
    shouldShowStandaloneExerciseView(
      { exerciseView: "wordProblem", text: "סיפור" },
      { operation: "word_problems" },
      {}
    ),
    false
  );
  assert.equal(
    shouldShowStandaloneExerciseView(
      { exerciseView: "expression", text: "3 + 4" },
      { operation: "compare" },
      {}
    ),
    false
  );
  assert.equal(
    shouldShowStandaloneExerciseView(
      { exerciseView: "expression", pre: "3 + 4", text: "..." },
      { operation: "fractions" },
      {}
    ),
    true
  );
});

test("finalizeAnimationSteps assigns multiplication exerciseView", () => {
  const steps = buildMultiplicationAnimation(23, 45, 1035);
  const out = finalizeAnimationSteps(steps, { operation: "multiplication" }, "multiplication");
  assert.ok(out.every((s) => s.exerciseView === "multiplication"));
  const rowStep = out.find((s) => s.id?.includes("row-0-mul-0"));
  assert.ok(rowStep?.highlights?.includes("aCol0"));
});

test("finalizeAnimationSteps assigns longDivision exerciseView", () => {
  const steps = buildDivisionAnimation(94, 3, 31);
  const out = finalizeAnimationSteps(steps, { operation: "division" }, "division");
  assert.ok(out.every((s) => s.exerciseView === "longDivision"));
});

test("finalizeAnimationSteps assigns fraction exerciseView", () => {
  const steps = buildFractionsAnimation(
    { kind: "frac_same_den", n1: 1, n2: 2, den: 4, op: "add" },
    "3/4"
  );
  const out = finalizeAnimationSteps(steps, { operation: "fractions" }, "fractions");
  assert.ok(out.every((s) => s.exerciseView === "fraction"));
});

test("parseMultiplicationPre reads vertical layout", () => {
  const pre = "  12\n×  3\n------\n  36";
  const parsed = parseMultiplicationPre(pre);
  assert.ok(parsed);
  assert.match(parsed.top.trim(), /12/);
});

test("parseDivisionPre reads dividend and divisor", () => {
  const pre = "\u206694\n____\n94│3\u2069";
  const parsed = parseDivisionPre(pre);
  assert.equal(parsed?.dividend, "94");
  assert.equal(parsed?.divisor, "3");
});

test("parseFractionPreLines splits fraction pre", () => {
  const lines = parseFractionPreLines("\u20661/4 + 2/4\n= 3/4\u2069");
  assert.equal(lines.length, 2);
});

test("buildAnimationForOperation smoke - each step gets exerciseView", () => {
  const cases = [
    {
      operation: "multiplication",
      question: { operation: "multiplication", params: { a: 12, b: 3 }, correctAnswer: 36 },
    },
    {
      operation: "division",
      question: { operation: "division", params: { dividend: 94, divisor: 3, quotient: 31 }, correctAnswer: 31 },
    },
    {
      operation: "fractions",
      question: {
        operation: "fractions",
        params: { kind: "frac_same_den", n1: 1, n2: 1, den: 2, op: "add" },
        correctAnswer: "1",
      },
    },
    {
      operation: "compare",
      question: { operation: "compare", params: { a: 3, b: 7 }, correctAnswer: "<" },
    },
  ];

  for (const { operation, question } of cases) {
    const built = buildAnimationForOperation(question, operation, "g3");
    assert.ok(Array.isArray(built) && built.length > 0, `expected steps for ${operation}`);
    const out = finalizeAnimationSteps(built, question, operation);
    for (const step of out) {
      assert.ok(
        resolveExerciseView(step, question, operation),
        `missing exerciseView for ${operation} step ${step.id}`
      );
    }
  }
});
