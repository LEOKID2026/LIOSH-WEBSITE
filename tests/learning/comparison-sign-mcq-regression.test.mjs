import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const href = (rel) => pathToFileURL(join(root, rel)).href;

const {
  COMPARISON_SIGN_DISPLAY_ORDER,
  COMPARISON_SIGN_OPTIONS,
  computeComparisonSign,
  getComparisonSign,
  finalizeComparisonSignMcq,
  isExactComparisonSignOptionSet,
  isolateComparisonSignForDisplay,
  resolveCanonicalComparisonSignAnswer,
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
const { splitLearningMixedHebrewMathRuns } = await import(
  href("utils/learning-mixed-hebrew-math-render.js")
);

function cmpUserMatchesCanonical(q, user) {
  const expected = resolveCanonicalComparisonSignAnswer(q);
  return expected != null && String(user ?? "").trim() === expected;
}

function buildCompareQuestion(a, b, corruptCorrect = null) {
  const symbol = computeComparisonSign(a, b);
  return {
    question: `השלם את הסימן: ${a} __ ${b}`,
    exerciseText: `${a} __ ${b}`,
    correctAnswer: corruptCorrect ?? symbol,
    answers: [...COMPARISON_SIGN_DISPLAY_ORDER],
    operation: "compare",
    params: { kind: "cmp", a, b, exerciseText: `${a} __ ${b}` },
    a,
    b,
  };
}

function assertStudentVisibleCompareChoices(q, label) {
  assert.equal(q.answers.length, 3, `${label}: expected 3 options`);
  assert.ok(isExactComparisonSignOptionSet(q.answers), `${label}: options must be >, =, <`);
  assert.deepEqual(q.answers, COMPARISON_SIGN_DISPLAY_ORDER, `${label}: display order <, =, >`);
  for (const bad of ["><", "1<", "<x", ">1", ">x", "<1", "לא תמיד"]) {
    assert.ok(!q.answers.includes(bad), `${label}: malformed option ${bad}`);
  }
}

test("A - canonical helper getComparisonSign / computeComparisonSign", () => {
  const cases = [
    [16, 7, ">"],
    [44, 24, ">"],
    [79, 35, ">"],
    [85, 98, "<"],
    [7, 16, "<"],
    [24, 44, "<"],
    [12, 12, "="],
  ];
  for (const [a, b, expected] of cases) {
    assert.equal(computeComparisonSign(a, b), expected, `${a} vs ${b}`);
    assert.equal(getComparisonSign(a, b), expected, `alias ${a} vs ${b}`);
  }
});

test("B - generated comparison questions stay canonical", () => {
  const lc = getLevelConfig(2, "easy");
  for (let i = 0; i < 40; i++) {
    const raw = generateQuestion(lc, "compare", "g2", null);
    const display = sanitizeQuestionForStudentDisplay(raw);
    assertStudentVisibleCompareChoices(display, `generated#${i}`);
    const a = display.params?.a ?? display.a;
    const b = display.params?.b ?? display.b;
    assert.equal(display.correctAnswer, computeComparisonSign(a, b));
    assert.ok(!String(display.correctAnswer).includes("NaN"));
  }
});

test("C - student payload after sanitize keeps internal sign values", () => {
  const q = sanitizeQuestionForStudentDisplay(buildCompareQuestion(79, 35));
  assertStudentVisibleCompareChoices(q, "79/35");
  assert.equal(q.correctAnswer, ">");
  for (const opt of q.answers) {
    assert.ok(COMPARISON_SIGN_OPTIONS.includes(opt), `internal label ${opt}`);
  }
  const reSanitized = sanitizeQuestionForStudentDisplay({ ...q, correctAnswer: "<" });
  assert.equal(reSanitized.correctAnswer, ">", "finalizeComparisonSignMcq repairs stale sign");
});

test("D - validation uses operands even when correctAnswer field is stale", () => {
  const stale = buildCompareQuestion(79, 35, "<");
  assert.equal(cmpUserMatchesCanonical(stale, ">"), true, "79 __ 35 with > must be correct");
  assert.equal(cmpUserMatchesCanonical(stale, "<"), false);

  const q85 = buildCompareQuestion(85, 98);
  assert.equal(cmpUserMatchesCanonical(q85, "<"), true);

  const q12 = buildCompareQuestion(12, 12);
  assert.equal(cmpUserMatchesCanonical(q12, "="), true);
});

test("E - step-by-step explanation sign matches canonical answer (no contradiction)", () => {
  const cases = [
    [79, 35, ">", /79 > 35/, /הסימן .*>/],
    [85, 98, "<", /85 < 98/, /הסימן .*</],
    [12, 12, "=", /12 = 12/, /הסימן .*=/],
  ];
  for (const [a, b, expected, mathRe, signRe] of cases) {
    const q = sanitizeQuestionForStudentDisplay(buildCompareQuestion(a, b, expected === ">" ? "<" : ">"));
    const steps = buildAnimationForOperation(q, "compare", "g3");
    const calc = steps.find((s) => s.id === "calculate");
    const fin = steps.find((s) => s.id === "final");
    assert.match(calc.text, mathRe, `math clause ${a} ${b}`);
    assert.match(calc.text, signRe, `sign clause ${a} ${b}`);
    assert.doesNotMatch(
      calc.text,
      a > b ? /הסימן .*</ : a < b ? /הסימן .*>/ : /הסימן .*[<>]/,
      `must not contradict for ${a} ${b}`
    );
    assert.ok(fin.text.includes(isolateComparisonSignForDisplay(expected)));
    for (const step of steps) {
      assert.ok(!String(step.text || "").includes("NaN"));
    }
  }
});

test("comparison expressions parse as LTR math runs in mixed Hebrew renderer", () => {
  const runs = splitLearningMixedHebrewMathRuns("⁦79 > 35⁩ כי 79 גדול מ-35.");
  assert.ok(runs.some((r) => r.type === "math" && r.value.includes("79") && r.value.includes(">")));
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

  const cmp = finalizeComparisonSignMcq(buildCompareQuestion(10, 3));
  assert.equal(shouldEnforceFourMcqOptions(cmp), false);
  assert.equal(ensureMcqFourOptions(cmp).answers.length, 3);
});
