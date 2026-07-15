import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const href = (rel) => pathToFileURL(join(root, rel)).href;

const {
  COMPARISON_SIGN_DISPLAY_ORDER,
  COMPARISON_SIGN_OPTIONS,
  COMPARISON_SIGN_LRM,
  buildComparisonSignWrongAnswerExplanation,
  embedComparisonSignInRtlProse,
  finalizeComparisonSignMcq,
  getCanonicalComparisonSign,
  isExactComparisonSignOptionSet,
  shouldUseComparisonSignErrorExplanation,
  traceComparisonSignFields,
} = await import(href("utils/comparison-sign-mcq.js"));
const { buildCompareAnimation } = await import(href("utils/math-animations.js"));
const { sanitizeQuestionForStudentDisplay } = await import(
  href("utils/student-question-stem-sanitizer.js")
).then((m) => (m.default?.sanitizeQuestionForStudentDisplay ? m.default : m));

function buildCompareQuestion(a, b, corruptCorrect = null) {
  const symbol = getCanonicalComparisonSign(a, b);
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

function validateCompare(a, b, userSign, corruptCorrect = null) {
  const q = sanitizeQuestionForStudentDisplay(buildCompareQuestion(a, b, corruptCorrect));
  const trace = traceComparisonSignFields(q, userSign);
  return { isCorrect: trace.isCorrect, trace };
}

function wrongAnswerFeedback(q, operation = "compare") {
  if (!shouldUseComparisonSignErrorExplanation(q, operation)) {
    return "";
  }
  return buildComparisonSignWrongAnswerExplanation(q);
}

function proseSignFromWrongFeedback(text) {
  const marker = "הסימן הנכון הוא";
  const idx = text.indexOf(marker);
  if (idx < 0) return null;
  const tail = text.slice(idx + marker.length);
  const re = new RegExp(`${COMPARISON_SIGN_LRM}?([<>=])${COMPARISON_SIGN_LRM}?`);
  const m = tail.match(re);
  return m ? m[1] : null;
}

function explanationSteps(a, b) {
  const q = sanitizeQuestionForStudentDisplay(buildCompareQuestion(a, b));
  return buildCompareAnimation(q.params, null);
}

function proseSignFromCalcText(text, expectedSign) {
  const marker = "הסימן";
  const idx = text.indexOf(marker);
  if (idx < 0) return null;
  const tail = text.slice(idx + marker.length);
  const re = new RegExp(`${COMPARISON_SIGN_LRM}?([<>=])${COMPARISON_SIGN_LRM}?`);
  const m = tail.match(re);
  return m ? m[1] : null;
}

test("1 - canonical helper getCanonicalComparisonSign", () => {
  const cases = [
    [32, 93, "<"],
    [85, 98, "<"],
    [79, 35, ">"],
    [44, 24, ">"],
    [16, 7, ">"],
    [7, 16, "<"],
    [12, 12, "="],
  ];
  for (const [a, b, expected] of cases) {
    assert.equal(getCanonicalComparisonSign(a, b), expected, `${a}, ${b}`);
  }
});

test("2 - validation: correct selections and opposite signs wrong", () => {
  const correctCases = [
    [25, 21, ">"],
    [32, 93, "<"],
    [79, 35, ">"],
    [85, 98, "<"],
    [12, 12, "="],
  ];
  for (const [a, b, sign] of correctCases) {
    const withStale = validateCompare(a, b, sign, sign === ">" ? "<" : ">");
    assert.equal(withStale.isCorrect, true, `${a} __ ${b} with ${sign}`);
    const trace = traceComparisonSignFields(
      buildCompareQuestion(a, b, sign === ">" ? "<" : ">"),
      sign
    );
    assert.equal(trace.isCorrect, true);
    assert.equal(trace.canonicalSign, sign);
  }

  assert.equal(validateCompare(32, 93, ">").isCorrect, false);
  assert.equal(validateCompare(79, 35, "<").isCorrect, false);
  assert.equal(validateCompare(85, 98, ">").isCorrect, false);
  assert.equal(validateCompare(12, 12, "<").isCorrect, false);
});

test("3 - explanation text matches canonical sign (no contradictions)", () => {
  const cases = [
    [32, 93, "<", "32 < 93", "<"],
    [79, 35, ">", "79 > 35", ">"],
    [85, 98, "<", "85 < 98", "<"],
    [12, 12, "=", "12 = 12", "="],
  ];
  for (const [a, b, sign, mathSnippet, proseSign] of cases) {
    const steps = explanationSteps(a, b);
    const calc = steps.find((s) => s.id === "calculate");
    const fin = steps.find((s) => s.id === "final");
    assert.ok(calc?.text?.includes(mathSnippet), `calc math ${a} ${b}: ${calc?.text}`);
    assert.equal(proseSignFromCalcText(calc.text, proseSign), proseSign, `prose sign ${a} ${b}`);
    assert.ok(
      fin?.text?.includes(embedComparisonSignInRtlProse(sign)),
      `final banner ${a} ${b}`
    );
    assert.equal(fin?.answer, sign);
  }

  const contradictions = [
    [32, 93, /32 < 93.*הסימן\s*\u200E?>/],
    [79, 35, /79 > 35.*הסימן\s*\u200E?</],
    [85, 98, /85 < 98.*הסימן\s*\u200E?>/],
  ];
  for (const [a, b, badRe] of contradictions) {
    const calc = explanationSteps(a, b).find((s) => s.id === "calculate");
    assert.doesNotMatch(calc.text, badRe, `must not contradict for ${a} ${b}`);
  }
});

test("4 - wrong-answer feedback: operand explanation, no NaN", () => {
  const cases = [
    [25, 21, "<", "25 > 21", ">"],
    [32, 93, ">", "32 < 93", "<"],
    [12, 12, ">", "12 = 12", "="],
  ];
  for (const [a, b, wrongSign, mathSnippet, canonicalSign] of cases) {
    const q = sanitizeQuestionForStudentDisplay(buildCompareQuestion(a, b));
    assert.equal(validateCompare(a, b, wrongSign).isCorrect, false);
    const feedback = wrongAnswerFeedback(q);
    assert.ok(feedback.includes(mathSnippet), `${a}/${b}: ${feedback}`);
    assert.equal(proseSignFromWrongFeedback(feedback), canonicalSign, `${a}/${b} sign`);
    for (const bad of ["NaN", "undefined", "null"]) {
      assert.ok(!feedback.includes(bad), `${a}/${b} must not contain ${bad}`);
    }
    // Regression: stale operation label must not fall through to numeric NaN path.
    const viaAdditionOp = wrongAnswerFeedback(q, "addition");
    assert.ok(viaAdditionOp.includes(mathSnippet), `addition op ${a}/${b}`);
    assert.ok(!viaAdditionOp.includes("NaN"), `addition op NaN ${a}/${b}`);
  }
});

test("4b - no NaN in step-by-step explanations", () => {
  const cases = [
    [32, 93],
    [79, 35],
    [85, 98],
    [12, 12],
    [25, 21],
  ];
  for (const [a, b] of cases) {
    const q = sanitizeQuestionForStudentDisplay(buildCompareQuestion(a, b));
    const err = wrongAnswerFeedback(q);
    for (const step of explanationSteps(a, b)) {
      const t = String(step.text || "");
      assert.ok(!t.includes("NaN"), `${a}/${b} step ${step.id}`);
      assert.ok(!t.includes("undefined"), `${a}/${b} step ${step.id}`);
      assert.ok(!t.includes("null"), `${a}/${b} step ${step.id}`);
    }
    assert.ok(!err.includes("NaN"), `error expl ${a}/${b}`);
    assert.ok(!err.includes("undefined"), `error expl ${a}/${b}`);
  }
});

test("5 - student payload shows exactly >, =, < with value/display match", () => {
  const cases = [
    [32, 93],
    [79, 35],
    [85, 98],
    [12, 12],
  ];
  for (const [a, b] of cases) {
    const q = sanitizeQuestionForStudentDisplay(buildCompareQuestion(a, b));
    assert.equal(q.answers.length, 3);
    assert.deepEqual(q.answers, COMPARISON_SIGN_DISPLAY_ORDER);
    assert.ok(isExactComparisonSignOptionSet(q.answers));
    for (const opt of q.answers) {
      assert.ok(COMPARISON_SIGN_OPTIONS.includes(opt), `label equals value ${opt}`);
    }
    assert.equal(q.correctAnswer, getCanonicalComparisonSign(a, b));
  }
});

test("6 - deterministic field trace for owner cases", () => {
  const cases = [
    [32, 93, "<"],
    [79, 35, ">"],
    [85, 98, "<"],
    [12, 12, "="],
  ];
  for (const [a, b, sign] of cases) {
    const trace = traceComparisonSignFields(buildCompareQuestion(a, b, ">"), sign);
    assert.equal(trace.left, a);
    assert.equal(trace.right, b);
    assert.equal(trace.canonicalSign, sign);
    assert.equal(trace.correctAnswer, sign);
    assert.equal(trace.feedbackCorrectAnswer, sign);
    assert.equal(trace.explanationSign, sign);
    assert.equal(trace.isCorrect, true);
  }
});
