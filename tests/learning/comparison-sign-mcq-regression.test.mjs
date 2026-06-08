import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const href = (rel) => pathToFileURL(join(root, rel)).href;

const {
  COMPARISON_SIGN_OPTIONS,
  computeComparisonSign,
  isExactComparisonSignOptionSet,
} = await import(href("utils/comparison-sign-mcq.js"));
const { generateQuestion } = await import(href("utils/math-question-generator.js"));
const { getLevelConfig } = await import(href("utils/math-storage.js"));
const { sanitizeQuestionForStudentDisplay } = await import(
  href("utils/student-question-stem-sanitizer.js")
).then((m) => (m.default?.sanitizeQuestionForStudentDisplay ? m.default : m));
const { ensureMcqFourOptions, shouldEnforceFourMcqOptions, NORMAL_MCQ_OPTION_COUNT } =
  await import(href("utils/mcq-four-options.js")).then((m) =>
    m.default?.ensureMcqFourOptions ? m.default : m
  );
const { buildAnimationForOperation } = await import(href("utils/math-animations.js"));

function buildCompareQuestion(a, b) {
  const symbol = computeComparisonSign(a, b);
  return {
    question: `השלם את הסימן: ${a} __ ${b}`,
    exerciseText: `${a} __ ${b}`,
    correctAnswer: symbol,
    answers: [...COMPARISON_SIGN_OPTIONS],
    operation: "compare",
    params: { kind: "cmp", a, b, exerciseText: `${a} __ ${b}` },
    a,
    b,
  };
}

function assertStudentVisibleCompareChoices(q, label) {
  assert.equal(q.answers.length, 3, `${label}: expected 3 options`);
  assert.ok(isExactComparisonSignOptionSet(q.answers), `${label}: options must be >, =, <`);
  for (const bad of ["><", "1<", "<x", ">1", ">x", "<1", "<x", "לא תמיד"]) {
    assert.ok(!q.answers.includes(bad), `${label}: malformed option ${bad}`);
  }
}

test("comparison-sign student-visible choices stay exactly >, =, <", () => {
  const lc = getLevelConfig(2, "easy");
  for (let i = 0; i < 40; i++) {
    const raw = generateQuestion(lc, "compare", "g2", null);
    const display = sanitizeQuestionForStudentDisplay(raw);
    assertStudentVisibleCompareChoices(display, `generated#${i}`);
    assert.equal(display.params?.kind, "cmp");
  }
});

test("comparison-sign answer correctness for fixed examples", () => {
  const cases = [
    [16, 7, ">"],
    [44, 24, ">"],
    [8, 8, "="],
    [3, 9, "<"],
  ];
  for (const [a, b, expected] of cases) {
    assert.equal(computeComparisonSign(a, b), expected, `${a} vs ${b}`);
    const q = sanitizeQuestionForStudentDisplay(buildCompareQuestion(a, b));
    assert.equal(q.correctAnswer, expected, `display correctAnswer ${a} vs ${b}`);
    assert.ok(q.answers.includes(expected), `options include ${expected}`);
  }
});

test("comparison-sign step-by-step matches exercise and has no NaN", () => {
  const cases = [
    [16, 7, ">"],
    [44, 24, ">"],
    [8, 8, "="],
    [3, 9, "<"],
  ];
  for (const [a, b, expected] of cases) {
    const q = sanitizeQuestionForStudentDisplay(buildCompareQuestion(a, b));
    const steps = buildAnimationForOperation(q, "compare", "g3");
    assert.ok(Array.isArray(steps) && steps.length > 0);
    const calc = steps.find((s) => s.id === "calculate");
    const fin = steps.find((s) => s.id === "final");
    assert.ok(calc?.text?.includes(expected), `calculate step mentions ${expected}`);
    assert.equal(fin?.text, `הסימן הנכון הוא ${expected}`);
    assert.equal(fin?.answer, expected);
    for (const step of steps) {
      assert.ok(!String(step.text || "").includes("NaN"), `NaN in step ${step.id}`);
    }
  }
});

test("string operands still compare numerically in step-by-step", () => {
  const q = sanitizeQuestionForStudentDisplay(
    buildCompareQuestion("16", "7")
  );
  const steps = buildAnimationForOperation(q, "compare", "g3");
  const calc = steps.find((s) => s.id === "calculate");
  assert.match(calc.text, /16 > 7/);
  assert.doesNotMatch(calc.text, /16 < 7/);
  assert.equal(steps.find((s) => s.id === "final")?.answer, ">");
});

test("normal MCQ still enforces four options after comparison-sign exemption", () => {
  const q = {
    question: "Choose: test",
    answers: ["have", "has", "having"],
    correctAnswer: "have",
    params: { answerMode: "choice", subject: "english" },
  };
  assert.equal(shouldEnforceFourMcqOptions(q), true);
  const out = ensureMcqFourOptions(q, { subject: "english" });
  assert.equal(out.answers.length, NORMAL_MCQ_OPTION_COUNT);

  const cmp = buildCompareQuestion(10, 3);
  assert.equal(shouldEnforceFourMcqOptions(cmp), false);
  const cmpOut = ensureMcqFourOptions(cmp);
  assert.equal(cmpOut.answers.length, 3);
});
