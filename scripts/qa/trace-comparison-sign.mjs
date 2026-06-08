import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const href = (rel) => pathToFileURL(join(root, rel)).href;

const { sanitizeQuestionForStudentDisplay } = await import(
  href("utils/student-question-stem-sanitizer.js")
);
const { buildCompareAnimation } = await import(href("utils/math-animations.js"));
const { resolveCanonicalComparisonSignAnswer } = await import(href("utils/comparison-sign-mcq.js"));
const { splitLearningMixedHebrewMathRuns } = await import(href("utils/learning-mixed-hebrew-math-render.js"));
const { compareMathLearnerAnswer } = await import(href("utils/answer-compare.js"));

function trace(a, b, corrupt = ">") {
  const raw = {
    question: "t",
    correctAnswer: corrupt,
    answers: ["<", "=", ">"],
    operation: "compare",
    params: { kind: "cmp", a, b },
    a,
    b,
  };
  const display = sanitizeQuestionForStudentDisplay(raw);
  const steps = buildCompareAnimation(display.params, display.correctAnswer);
  const calc = steps.find((s) => s.id === "calculate");
  const fin = steps.find((s) => s.id === "final");
  const userSign = a < b ? "<" : a > b ? ">" : "=";
  const val = compareMathLearnerAnswer({
    user: userSign,
    correctAnswer: display.correctAnswer,
    numericTolerance: 0.01,
    params: display.params,
    a: display.a,
    b: display.b,
  });
  const calcChars = [...(calc?.text || "")].filter((c) => c === "<" || c === ">");
  const finChars = [...(fin?.text || "")].filter((c) => c === "<" || c === ">");
  return {
    left: a,
    right: b,
    canonicalSign: resolveCanonicalComparisonSignAnswer(display),
    correctAnswer: display.correctAnswer,
    paramsAb: [display.params?.a, display.params?.b],
    userSign,
    isCorrect: val.isCorrect,
    calcText: calc?.text,
    finText: fin?.text,
    stepAnswer: fin?.answer,
    calcSignChars: calcChars,
    finSignChars: finChars,
    calcHasContradiction:
      calc?.text?.includes(`${a} < ${b}`) && calc?.text?.includes("הסימן") && fin?.answer === ">",
    runs: splitLearningMixedHebrewMathRuns(calc?.text || ""),
  };
}

for (const [a, b] of [
  [32, 93],
  [79, 35],
  [85, 98],
  [12, 12],
]) {
  console.log(JSON.stringify(trace(a, b), null, 2));
}
