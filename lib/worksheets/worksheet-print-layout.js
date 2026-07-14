/**
 * Print layout classification for worksheet questions — display only.
 * @module lib/worksheets/worksheet-print-layout
 */

import { isWorksheetMathLtrExpression } from "./worksheet-math-ltr-display.js";

/** @typedef {"layout-full" | "layout-compact-2"} WorksheetQuestionLayout */

/** Default total questions per ready worksheet catalog entry. */
export const WORKSHEET_DEFAULT_QUESTION_COUNT = 12;

/** @deprecated No longer used — print fills pages naturally without a fixed per-page count. */
export const WORKSHEET_COMPACT_QUESTIONS_PER_PAGE = null;

const COMPACT_MATH_TYPES = new Set(["vertical_math", "fraction", "mcq", "open"]);

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} question
 * @returns {WorksheetQuestionLayout}
 */
export function classifyWorksheetQuestionLayout(question) {
  const {
    questionType,
    subject,
    stemHe = "",
    passageHe,
    longPassage,
    writingSpaceLines,
    diagramSpec,
    optionsHe = [],
    englishSentenceMode,
  } = question;

  if (questionType === "word_problem" || longPassage) return "layout-full";
  if (questionType === "diagram_mcq" || diagramSpec) return "layout-full";
  if (writingSpaceLines && writingSpaceLines > 0) return "layout-full";
  if (question.verticalLayoutLtr && String(question.verticalLayoutLtr).split("\n").length > 8) {
    return "layout-full";
  }
  if (passageHe && passageHe.length > 100) return "layout-full";
  if (stemHe.length > 110) return "layout-full";
  if (subject === "english" && (englishSentenceMode || stemHe.length > 70)) {
    return "layout-full";
  }
  if (subject === "hebrew" && questionType === "open" && stemHe.length > 60) {
    return "layout-full";
  }

  const optionsTotal = optionsHe.join("").length;
  const compactMath =
    subject === "math" &&
    COMPACT_MATH_TYPES.has(questionType) &&
    !passageHe &&
    stemHe.length < 90;

  if (compactMath) return "layout-compact-2";

  if (questionType === "mcq" && !passageHe) {
    const total = stemHe.length + optionsTotal;
    if (total <= 140 && stemHe.length <= 80) return "layout-compact-2";
  }

  if (subject === "hebrew" && questionType === "mcq" && !passageHe && stemHe.length <= 70) {
    return "layout-compact-2";
  }

  if (subject === "geometry" && questionType === "mcq" && stemHe.length <= 80 && !diagramSpec) {
    return "layout-compact-2";
  }

  if (subject === "english" && questionType === "mcq" && stemHe.length <= 55 && !englishSentenceMode) {
    return "layout-compact-2";
  }

  return "layout-full";
}

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion[]} questions
 * @returns {string}
 */
export function getWorksheetBodyGridClass(questions) {
  const hasCompact = questions.some((q) => classifyWorksheetQuestionLayout(q) === "layout-compact-2");
  if (!hasCompact) return "";
  return "worksheet-print-grid worksheet-print-grid-2";
}

/**
 * @param {import("./worksheet-question-types.js").AnswerKeyEntry[]} answers
 * @returns {string}
 */
export function getAnswerKeyGridClass(answers) {
  if (!answers.length) return "answer-key-list";
  return "answer-key-list answer-key-print-grid answer-key-print-grid-2";
}

/**
 * Whether a question uses the uniform short-math card shell.
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} question
 * @returns {boolean}
 */
export function isUniformMathCompactCard(question) {
  return (
    question.subject === "math" &&
    classifyWorksheetQuestionLayout(question) === "layout-compact-2" &&
    (question.questionType === "vertical_math" ||
      question.questionType === "fraction" ||
      question.questionType === "mcq" ||
      (question.questionType === "open" && isWorksheetMathLtrExpression(question.stemHe)))
  );
}
