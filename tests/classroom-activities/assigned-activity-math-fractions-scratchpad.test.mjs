/**
 * Focused smoke: assigned-activity math fractions + scratchpad parity with math-master registry.
 */
import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_MATH_SCRATCHPAD_V1 = "true";

const {
  normalizeStudentActivityMathLayoutQuestion,
  resolveAssignedActivityMathScratchpadContext,
  assignedActivityUsesMathScratchpad,
  parseHorizontalArithmeticExercise,
} = await import("../../lib/classroom-activities/student-activity-question-ui.client.js");
const { getScratchpadType } = await import("../../utils/math-scratchpad/scratchpad-registry.js");
const { extractScratchpadOperands } = await import("../../utils/math-scratchpad/extract-operands.js");
const {
  stripRedundantTrailingAnswerBlank,
  shouldHideFractionsMcqTrailingBlank,
  isMathFractionsQuestionStem,
} = await import("../../utils/math-fraction-question-display.js");
const { hasStackedFractionToken } = await import("../../utils/math-fraction-expression-parse.js");

test("fraction stems are detected and blanks stripped only for MCQ", () => {
  const open = {
    subject: "math",
    topic: "fractions",
    question: "צמצם את השבר 3/15: __",
  };
  assert.equal(isMathFractionsQuestionStem(open), true);
  assert.equal(shouldHideFractionsMcqTrailingBlank(open, { usesChoiceUi: false }), false);
  assert.equal(
    shouldHideFractionsMcqTrailingBlank(
      { ...open, answers: ["1/5", "1/3", "3/5", "1/4"] },
      { usesChoiceUi: true }
    ),
    true
  );
  assert.equal(stripRedundantTrailingAnswerBlank("1/4 + 2/3 = __"), "1/4 + 2/3 =");
  assert.equal(hasStackedFractionToken("1/4 + 2/3 ="), true);
  assert.equal(hasStackedFractionToken("המר את המספר המעורב 1 7/8 לשבר"), true);
});

test("frac_add_sub is not misclassified as addition for scratchpad", () => {
  assert.equal(parseHorizontalArithmeticExercise("1/4 + 2/3 = __"), null);
  const q = {
    subject: "math",
    topic: "fractions",
    gradeLevel: "g5",
    question: "1/4 + 2/3 = __",
    params: { kind: "frac_add_sub", n1: 1, den1: 4, n2: 2, den2: 3, op: "add" },
  };
  const n = normalizeStudentActivityMathLayoutQuestion(q);
  assert.equal(n.operation, "fractions");
  const activity = { gradeLevel: "g5", topic: "fractions" };
  const ctx = resolveAssignedActivityMathScratchpadContext(q, activity);
  assert.equal(ctx.operation, "fractions");
  const operands = extractScratchpadOperands(ctx.question);
  const type = getScratchpadType(ctx.gradeKey, ctx.operation, {
    a: operands.a,
    b: operands.b,
  });
  assert.equal(type, "blank_place_value_table");
  assert.equal(type, getScratchpadType("g5", "fractions", { a: null, b: null }));
  assert.equal(assignedActivityUsesMathScratchpad(q, activity), true);
});

test("scratchpad availability matches registry (compare has none)", () => {
  const q = {
    subject: "math",
    topic: "compare",
    gradeLevel: "g4",
    question: "5 ? 3",
    params: { kind: "cmp" },
  };
  assert.equal(assignedActivityUsesMathScratchpad(q, { gradeLevel: "g4" }), false);
});

test("activity math MCQ for fractions and division_with_remainder", async () => {
  const {
    assignedActivityQuestionUsesChoiceUi,
    assignedActivityMathTopicUsesMcq,
  } = await import("../../utils/geometry-activity-answer-ui.js");
  const {
    extractAssignedActivityMathMcqChoiceList,
    promoteAssignedActivityMathMcqChoices,
  } = await import("../../lib/classroom-activities/assigned-activity-math-mcq.js");
  const { hydrateAssignedActivityMathMcqQuestion } = await import(
    "../../lib/classroom-activities/assigned-activity-math-mcq-hydrate.server.js"
  );

  assert.equal(
    assignedActivityMathTopicUsesMcq({ subject: "math", topic: "fractions" }),
    true
  );
  assert.equal(
    assignedActivityMathTopicUsesMcq({
      subject: "math",
      operation: "division_with_remainder",
    }),
    true
  );
  assert.equal(
    assignedActivityMathTopicUsesMcq({ subject: "math", topic: "addition" }),
    false
  );

  assert.equal(
    assignedActivityQuestionUsesChoiceUi({
      subject: "math",
      topic: "fractions",
      choices: ["1/2", "1/3", "1/4", "2/3"],
    }),
    true
  );
  assert.equal(
    assignedActivityQuestionUsesChoiceUi({
      subject: "math",
      topic: "division_with_remainder",
      answers: ["3 ושארית 1", "3 ושארית 2", "4 ושארית 1", "2 ושארית 1"],
    }),
    true
  );

  // Legacy snapshot: options only under params.answers (live activity shape)
  const legacy = {
    subject: "math",
    topic: "division_with_remainder",
    question: "791 ÷ 10 = __",
    params: {
      kind: "div_with_remainder",
      answers: ["79 ושארית 2", "79 ושארית 1", "78 ושארית 1", "80 ושארית 1"],
      dividend: 791,
      divisor: 10,
      quotient: 79,
      remainder: 1,
    },
  };
  assert.deepEqual(extractAssignedActivityMathMcqChoiceList(legacy), [
    "79 ושארית 2",
    "79 ושארית 1",
    "78 ושארית 1",
    "80 ושארית 1",
  ]);
  assert.equal(assignedActivityQuestionUsesChoiceUi(legacy), true);
  const promoted = promoteAssignedActivityMathMcqChoices(legacy);
  assert.equal(promoted.choices.length, 4);
  assert.equal(assignedActivityQuestionUsesChoiceUi(promoted), true);

  const rebuilt = hydrateAssignedActivityMathMcqQuestion(
    {
      subject: "math",
      topic: "division_with_remainder",
      qk: "stable-seed-1",
      question: "79 ÷ 5 = __",
      params: { kind: "div_with_remainder", dividend: 79, divisor: 5, quotient: 15, remainder: 4 },
    },
    { correctAnswer: "15 ושארית 4" }
  );
  assert.ok(Array.isArray(rebuilt.choices) && rebuilt.choices.length >= 2);
  assert.ok(rebuilt.choices.includes("15 ושארית 4"));
  const rebuilt2 = hydrateAssignedActivityMathMcqQuestion(
    {
      subject: "math",
      topic: "division_with_remainder",
      qk: "stable-seed-1",
      question: "79 ÷ 5 = __",
      params: { kind: "div_with_remainder", dividend: 79, divisor: 5, quotient: 15, remainder: 4 },
    },
    { correctAnswer: "15 ושארית 4" }
  );
  assert.deepEqual(rebuilt.choices, rebuilt2.choices);

  assert.equal(
    assignedActivityQuestionUsesChoiceUi({
      subject: "math",
      topic: "fractions",
    }),
    false
  );
  assert.equal(
    assignedActivityQuestionUsesChoiceUi({
      subject: "math",
      topic: "addition",
      answers: ["1", "2", "3", "4"],
    }),
    false
  );
});

test("addition scratchpad type matches math-master registry", () => {
  const q = {
    subject: "math",
    topic: "addition",
    gradeLevel: "g4",
    question: "347 + 89 = __",
    params: { kind: "add_two", a: 347, b: 89 },
    a: 347,
    b: 89,
  };
  const ctx = resolveAssignedActivityMathScratchpadContext(q, { gradeLevel: "g4" });
  const operands = extractScratchpadOperands(ctx.question);
  const type = getScratchpadType(ctx.gradeKey, ctx.operation, {
    a: operands.a,
    b: operands.b,
  });
  assert.equal(type, "blank_place_value_table");
  assert.equal(assignedActivityUsesMathScratchpad(q, { gradeLevel: "g4" }), true);
});
