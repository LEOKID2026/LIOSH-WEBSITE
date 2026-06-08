/**
 * Selftest for utils/answer-compare.js — run: npm run test:answer-compare
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const m = await import(pathToFileURL(join(ROOT, "utils", "answer-compare.js")).href);

const {
  compareAnswers,
  compareMathLearnerAnswer,
  compareGeometryLearnerAnswer,
  normalizeAnswerExactText,
  normalizeHebrewRelaxedAnswer,
  MAX_NUMERIC_ABSOLUTE_TOLERANCE,
  parsePureNumericDecimalString,
} = m;

const TOL = 0.01;

// --- compareAnswers core ---
assert.equal(
  compareAnswers({ mode: "exact_text", user: "Hello", expected: "hello" })
    .isCorrect,
  true
);
assert.equal(
  compareAnswers({
    mode: "exact_integer",
    user: " 7 ",
    expected: 7,
  }).isCorrect,
  true
);
assert.equal(
  compareAnswers({ mode: "exact_integer", user: "8", expected: 7 }).isCorrect,
  false
);
assert.equal(
  compareAnswers({ mode: "exact_integer", user: "42x", expected: 42 }).isCorrect,
  false,
  "exact_integer rejects parseInt-style prefix junk"
);
assert.equal(
  compareAnswers({ mode: "exact_integer", user: "42.0", expected: 42 }).isCorrect,
  false,
  "exact_integer is whole-string integer only"
);
assert.equal(
  compareAnswers({ mode: "exact_integer", user: "", expected: 0 }).isCorrect,
  false
);
assert.equal(
  compareAnswers({ mode: "mcq_index", user: 2, expectedIndex: 2 }).isCorrect,
  true
);

// --- trim_string_equal ---
assert.equal(
  compareAnswers({
    mode: "trim_string_equal",
    user: "  3/4  ",
    expected: "3/4",
  }).isCorrect,
  true
);

// --- numeric_absolute_tolerance (caller supplies tolerance) ---
assert.equal(
  compareAnswers({
    mode: "numeric_absolute_tolerance",
    user: 2,
    expected: 2,
    tolerance: TOL,
  }).isCorrect,
  true
);
assert.equal(
  compareAnswers({
    mode: "numeric_absolute_tolerance",
    user: 2.005,
    expected: 2,
    tolerance: TOL,
  }).isCorrect,
  true
);
assert.equal(
  compareAnswers({
    mode: "numeric_absolute_tolerance",
    user: 2.02,
    expected: 2,
    tolerance: TOL,
  }).isCorrect,
  false
);

assert.throws(() =>
  compareAnswers({
    mode: "numeric_absolute_tolerance",
    user: 1,
    expected: 1,
  })
);

assert.equal(MAX_NUMERIC_ABSOLUTE_TOLERANCE, 0.05);
assert.equal(
  compareAnswers({
    mode: "numeric_absolute_tolerance",
    user: 2.04,
    expected: 2,
    tolerance: 100,
  }).isCorrect,
  true,
  "oversized tolerance is clamped to MAX_NUMERIC_ABSOLUTE_TOLERANCE"
);
assert.equal(
  compareAnswers({
    mode: "numeric_absolute_tolerance",
    user: 2.06,
    expected: 2,
    tolerance: 100,
  }).isCorrect,
  false
);

// --- numeric_scale_relative_tolerance (caller supplies all) ---
const SF = 1e-6;
const RF = 1e-5;
const MT = 1e-9;
assert.equal(
  compareAnswers({
    mode: "numeric_scale_relative_tolerance",
    user: 1.5,
    expected: 1.5,
    scaleFloor: SF,
    relativeFactor: RF,
    minTolerance: MT,
  }).isCorrect,
  true
);
assert.equal(
  compareAnswers({
    mode: "numeric_scale_relative_tolerance",
    user: 1.5,
    expected: 1.50000000001,
    scaleFloor: SF,
    relativeFactor: RF,
    minTolerance: MT,
  }).isCorrect,
  true
);

assert.throws(() =>
  compareAnswers({
    mode: "numeric_scale_relative_tolerance",
    user: 1,
    expected: 1,
    scaleFloor: SF,
    relativeFactor: RF,
  })
);

// --- compareMathLearnerAnswer (parity with math-master) ---
assert.equal(
  compareMathLearnerAnswer({
    user: "3/4",
    correctAnswer: "3/4",
    numericTolerance: TOL,
  }).isCorrect,
  true
);
assert.equal(
  compareMathLearnerAnswer({
    user: "1/2",
    correctAnswer: "2/4",
    numericTolerance: TOL,
  }).isCorrect,
  true,
  "equivalent fractions should be accepted"
);
assert.equal(
  compareMathLearnerAnswer({
    user: "2/4",
    correctAnswer: "1/2",
    numericTolerance: TOL,
  }).isCorrect,
  true
);
assert.equal(
  compareMathLearnerAnswer({
    user: "1 / 2",
    correctAnswer: "1/2",
    numericTolerance: TOL,
  }).isCorrect,
  true,
  "fraction spaces around slash should normalize"
);
assert.equal(
  compareMathLearnerAnswer({
    user: "1 1/2",
    correctAnswer: "3/2",
    numericTolerance: TOL,
  }).isCorrect,
  true,
  "mixed number and improper fraction equivalence"
);
assert.equal(
  compareMathLearnerAnswer({
    user: "1/3",
    correctAnswer: "1/2",
    numericTolerance: TOL,
  }).isCorrect,
  false,
  "different fractions must remain incorrect"
);
assert.equal(
  compareMathLearnerAnswer({
    user: "50%",
    correctAnswer: 0.5,
    numericTolerance: TOL,
    percentageCompatible: true,
  }).isCorrect,
  true,
  "percent should map to decimal only in percentage-compatible mode"
);
assert.equal(
  compareMathLearnerAnswer({
    user: "50%",
    correctAnswer: 0.5,
    numericTolerance: TOL,
  }).isCorrect,
  false,
  "without percentage-compatible context, keep strict behavior"
);
assert.equal(
  compareMathLearnerAnswer({
    user: "100 cm",
    correctAnswer: "1 m",
    numericTolerance: TOL,
    unitConversionEnabled: true,
    unitConversionKind: "wp_unit_cm_to_m",
  }).isCorrect,
  true,
  "cm/m conversion only for allowed unit-conversion kind"
);
assert.equal(
  compareMathLearnerAnswer({
    user: "100 cm",
    correctAnswer: "1 m",
    numericTolerance: TOL,
    unitConversionEnabled: true,
    unitConversionKind: "dec_multiply",
  }).isCorrect,
  false,
  "unit conversion must not leak to non-unit kinds"
);
assert.equal(
  compareMathLearnerAnswer({
    user: "<",
    correctAnswer: "<",
    numericTolerance: TOL,
  }).isCorrect,
  true
);
assert.equal(
  compareMathLearnerAnswer({
    user: ">",
    correctAnswer: "<",
    numericTolerance: TOL,
    params: { kind: "cmp", a: 79, b: 35 },
    a: 79,
    b: 35,
  }).isCorrect,
  true,
  "cmp: operand canonical sign wins over stale correctAnswer"
);
assert.equal(
  compareMathLearnerAnswer({
    user: "2.005",
    correctAnswer: 2,
    numericTolerance: TOL,
  }).isCorrect,
  true
);
assert.equal(
  compareMathLearnerAnswer({
    user: "2.02",
    correctAnswer: 2,
    numericTolerance: TOL,
  }).isCorrect,
  false
);
assert.equal(
  compareMathLearnerAnswer({
    user: "1,5",
    correctAnswer: 1.5,
    numericTolerance: TOL,
  }).isCorrect,
  true,
  "comma decimal only on pure numeric branch"
);
assert.equal(
  compareMathLearnerAnswer({
    user: "2abc",
    correctAnswer: 2,
    numericTolerance: TOL,
  }).isCorrect,
  false,
  "no parseFloat prefix: junk stays string path"
);
assert.equal(
  compareMathLearnerAnswer({
    user: "2.06",
    correctAnswer: 2,
    numericTolerance: 100,
  }).isCorrect,
  false,
  "compareMathLearnerAnswer clamps numericTolerance"
);
assert.throws(() =>
  compareMathLearnerAnswer({ user: 1, correctAnswer: 1 })
);

assert.equal(parsePureNumericDecimalString("1,5"), 1.5);
assert.equal(parsePureNumericDecimalString("1.2.3"), null);
assert.equal(parsePureNumericDecimalString("1,2,3"), null);

// --- compareGeometryLearnerAnswer ---
assert.equal(
  compareGeometryLearnerAnswer({
    user: "1,5",
    correctAnswer: "1.5",
    scaleFloor: SF,
    relativeFactor: RF,
    minTolerance: MT,
  }).isCorrect,
  true
);
assert.equal(
  compareGeometryLearnerAnswer({
    user: "  hello ",
    correctAnswer: "hello",
    scaleFloor: SF,
    relativeFactor: RF,
    minTolerance: MT,
  }).isCorrect,
  true
);

// --- Hebrew modes ---
assert.equal(
  compareAnswers({
    mode: "hebrew_relaxed_text",
    user: "  שלום  ",
    acceptedList: ["שלום"],
  }).isCorrect,
  true
);

// normalizeHebrewRelaxedAnswer export parity
const n1 = normalizeHebrewRelaxedAnswer('  א  ');
assert.ok(typeof n1 === "string" && n1.length > 0);
assert.equal(normalizeAnswerExactText("  Hi  "), "hi");

console.log("answer-compare-selftest: OK");
