#!/usr/bin/env node
/**
 * Point check: shapes_basic MCQ uses Hebrew labels, no index legend, no harness inputMismatch.
 */
import { generateQuestion } from "../utils/geometry-question-generator.js";
import { analyzeVisibleText, sampleHasIssues } from "../scripts/qa/lib/visual-qa-analyze.mjs";
import { sanitizeQuestionForStudentDisplay } from "../utils/student-question-stem-sanitizer.js";

const SHAPES_KINDS = new Set([
  "shapes_basic_square",
  "shapes_basic_rectangle",
  "shapes_basic_properties_square",
  "shapes_basic_properties_rectangle",
  "shapes_basic_properties_angles",
]);

const GRADES = ["g1", "g2", "g3", "g4"];
const LEVELS = ["easy", "medium", "hard"];
const TRIALS = 40;

const failures = [];
let checked = 0;
let shapesBasicCount = 0;

for (const gradeKey of GRADES) {
  for (let t = 0; t < TRIALS; t++) {
    const levelKey = LEVELS[t % LEVELS.length];
    const level = { maxSide: 6, key: levelKey };
    const q = generateQuestion(level, "shapes_basic", gradeKey);
    const kind = q?.params?.kind || "";
    if (!SHAPES_KINDS.has(kind)) continue;

    shapesBasicCount++;
    const display = sanitizeQuestionForStudentDisplay(q);
    const stem = String(display.question || q.question || "");
    const answers = (display.answers || q.answers || []).map(String);
    const correct = String(display.correctAnswer ?? q.correctAnswer ?? "");
    checked++;

    const legend = /\(\s*1\s*=\s*[^)]+\)/.test(stem);
    const indexAnswers = answers.some((a) => a === "1" || a === "2");
    const idKind = kind === "shapes_basic_square" || kind === "shapes_basic_rectangle";
    const badIdAnswers = idKind && indexAnswers;
    const badIdLabels =
      idKind && !answers.every((a) => a === "ריבוע" || a === "מלבן");
    const missingCorrect = !answers.includes(correct);

    const analysis = analyzeVisibleText(stem, {
      inputType: "mcq",
      answersDisplayed: answers,
      questionText: stem,
    });

    if (legend) failures.push({ gradeKey, kind, issue: "legend-in-stem", stem, answers });
    if (badIdAnswers) failures.push({ gradeKey, kind, issue: "index-answers-1-2", stem, answers });
    if (badIdLabels) failures.push({ gradeKey, kind, issue: "non-hebrew-shape-labels", stem, answers });
    if (missingCorrect) failures.push({ gradeKey, kind, issue: "correct-not-in-answers", stem, answers, correct });
    if (analysis.inputMismatch) {
      failures.push({
        gradeKey,
        kind,
        issue: "harness-inputMismatch",
        details: analysis.details,
        stem,
        answers,
      });
    }
    if (sampleHasIssues({ issues: analysis })) {
      failures.push({ gradeKey, kind, issue: "harness-sampleHasIssues", details: analysis.details, stem, answers });
    }
  }
}

console.log(
  JSON.stringify(
    {
      shapesBasicSamples: shapesBasicCount,
      checked,
      failures: failures.length,
      failureSamples: failures.slice(0, 12),
      pass: failures.length === 0,
    },
    null,
    2
  )
);

process.exit(failures.length ? 1 : 0);
