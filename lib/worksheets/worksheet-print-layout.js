/**
 * Print layout classification for worksheet questions — display only.
 * @module lib/worksheets/worksheet-print-layout
 */

import { isWorksheetMathLtrExpression } from "./worksheet-math-ltr-display.js";

/** @typedef {"layout-full" | "layout-compact-2" | "layout-geometry-double" | "layout-geometry-single"} WorksheetQuestionLayout */

/** Default total questions per ready worksheet catalog entry. */
export const WORKSHEET_DEFAULT_QUESTION_COUNT = 12;

/** @deprecated No longer used — print fills pages naturally without a fixed per-page count. */
export const WORKSHEET_COMPACT_QUESTIONS_PER_PAGE = null;

const COMPACT_MATH_TYPES = new Set([
  "vertical_math",
  "fraction",
  "mcq",
  "open",
  "word_problem",
]);

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} question
 * @param {import("./worksheet-question-types.js").WorksheetSubjectId} [subjectId]
 * @returns {import("./worksheet-question-types.js").PrintableWorksheetQuestion}
 */
export function withWorksheetLayoutSubject(question, subjectId) {
  if (!subjectId || question.subject) return question;
  return { ...question, subject: subjectId };
}

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} question
 * @param {number} index
 * @param {import("./worksheet-question-types.js").WorksheetSubjectId} [subjectId]
 * @returns {string} extra class names for print break behavior
 */
export function geometryQuestionPrintModifierClasses(question, index, subjectId) {
  const normalized = withWorksheetLayoutSubject(question, subjectId);
  if (normalized.subject !== "geometry") return "";
  const layout = classifyGeometryWorksheetLayout(normalized);
  /** @type {string[]} */
  const mods = [];
  if (index === 0) {
    mods.push("is-first-print-question");
  }
  // Single opens a new page only after prior sheet content (never before item 0).
  if (layout === "layout-geometry-single" && index > 0) {
    mods.push("layout-geometry-break-before");
  }
  return mods.length ? ` ${mods.join(" ")}` : "";
}

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion[]} pageQuestions
 * @returns {import("./worksheet-question-types.js").PrintableWorksheetQuestion[][]}
 */
export function buildMathPrintPageRows(pageQuestions) {
  /** @type {import("./worksheet-question-types.js").PrintableWorksheetQuestion[][]} */
  const rows = [];
  for (let i = 0; i < pageQuestions.length; i += 2) {
    rows.push(pageQuestions.slice(i, i + 2));
  }
  return rows;
}

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion[]} questions
 * @param {import("./worksheet-question-types.js").WorksheetSubjectId} [subjectId]
 * @returns {boolean}
 */
export function shouldRenderMathPrintPages(questions, subjectId) {
  if (!questions.length) return false;
  const resolvedSubject = subjectId || questions[0]?.subject;
  if (resolvedSubject !== "math") return false;
  return questions.every((q) => {
    const normalized = withWorksheetLayoutSubject(q, subjectId);
    return classifyWorksheetQuestionLayout(normalized) === "layout-compact-2";
  });
}

/**
 * Geometry print density: half-page doubles vs full-page singles.
 * Never uses math 2×2 cards.
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} question
 * @returns {"layout-geometry-double" | "layout-geometry-single"}
 */
export function classifyGeometryWorksheetLayout(question) {
  const stemHe = String(question.stemHe || "");
  const optionsHe = question.optionsHe || [];
  const optionsTotal = optionsHe.join("").length;
  const diagramKind = String(question.diagramSpec?.kind || "");
  const hasDiagram = Boolean(diagramKind);

  // Always single: solids and Pythagoras — never share a page.
  if (
    diagramKind === "pythagoras" ||
    diagramKind.startsWith("solid_")
  ) {
    return "layout-geometry-single";
  }

  // Dense mark-up or long copy → single page.
  if (hasDiagram && (stemHe.length > 100 || stemHe.length + optionsTotal > 170)) {
    return "layout-geometry-single";
  }

  // Concept / text-only geometry: two per page.
  if (!hasDiagram) {
    return "layout-geometry-double";
  }

  // Simple–medium plane diagrams: two per page.
  return "layout-geometry-double";
}

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
    englishPhonicsMode,
  } = question;

  if (subject === "geometry") {
    return classifyGeometryWorksheetLayout(question);
  }

  // Math word problems / card writing stay on 2×2 math print pages.
  const mathCardWriting =
    subject === "math" &&
    (questionType === "word_problem" ||
      (Boolean(writingSpaceLines) && COMPACT_MATH_TYPES.has(questionType)));

  if (questionType === "word_problem" && subject !== "math") return "layout-full";
  if (longPassage) return "layout-full";
  if (questionType === "diagram_mcq" || diagramSpec) return "layout-full";
  if (writingSpaceLines && writingSpaceLines > 0 && !mathCardWriting) {
    return "layout-full";
  }
  if (question.verticalLayoutLtr && String(question.verticalLayoutLtr).split("\n").length > 8) {
    return "layout-full";
  }
  if (passageHe) return "layout-full";
  // Unsplit Hebrew reading prompts must not land in compact cards.
  if (subject === "hebrew" && /קראו?(?:\s+את\s+הטקסט)?\s*:/u.test(stemHe)) {
    return "layout-full";
  }
  if (stemHe.length > 110 && !(subject === "math" && questionType === "word_problem")) {
    return "layout-full";
  }
  if (
    subject === "english" &&
    (englishPhonicsMode || englishSentenceMode || stemHe.length > 70)
  ) {
    return "layout-full";
  }
  if (subject === "hebrew" && questionType === "open" && stemHe.length > 60) {
    return "layout-full";
  }

  const optionsTotal = optionsHe.join("").length;

  if (subject === "math" && questionType === "word_problem" && !passageHe) {
    // Keep word problems on math card pages even with short writing lines.
    if (stemHe.length <= 160) return "layout-compact-2";
  }

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

  if (
    subject === "english" &&
    questionType === "mcq" &&
    stemHe.length <= 55 &&
    !englishSentenceMode &&
    !englishPhonicsMode
  ) {
    return "layout-compact-2";
  }

  return "layout-full";
}

/** Short math cards per printed page — 2 columns × 2 rows. */
export const WORKSHEET_MATH_CARDS_PER_PAGE = 4;

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion[]} questions
 * @param {number} [chunkSize]
 * @returns {import("./worksheet-question-types.js").PrintableWorksheetQuestion[][]}
 */
export function chunkWorksheetQuestionsForMathPrint(
  questions,
  chunkSize = WORKSHEET_MATH_CARDS_PER_PAGE
) {
  const size = Math.max(1, Math.floor(chunkSize));
  /** @type {import("./worksheet-question-types.js").PrintableWorksheetQuestion[][]} */
  const pages = [];
  for (let i = 0; i < questions.length; i += size) {
    pages.push(questions.slice(i, i + size));
  }
  return pages;
}

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion[]} questions
 * @param {import("./worksheet-question-types.js").WorksheetSubjectId} [subjectId]
 * @returns {"math-card-pages" | "compact-grid" | "stacked"}
 */
export function getWorksheetPrintLayoutMode(questions, subjectId) {
  if (shouldRenderMathPrintPages(questions, subjectId)) return "math-card-pages";
  const hasCompact = questions.some(
    (q) => classifyWorksheetQuestionLayout(withWorksheetLayoutSubject(q, subjectId)) === "layout-compact-2"
  );
  if (hasCompact) return "compact-grid";
  return "stacked";
}

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion[]} questions
 * @param {import("./worksheet-question-types.js").WorksheetSubjectId} [subjectId]
 * @returns {boolean}
 */
export function usesUniformMathPrintCards(questions, subjectId) {
  return shouldRenderMathPrintPages(questions, subjectId);
}

/**
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion[]} questions
 * @returns {string}
 */
export function getWorksheetBodyGridClass(questions, subjectId) {
  if (usesUniformMathPrintCards(questions, subjectId)) {
    return "worksheet-print-grid worksheet-print-grid-2 worksheet-print-grid-math-cards";
  }
  const normalized = questions.map((q) => withWorksheetLayoutSubject(q, subjectId));
  const isGeometry = (subjectId || normalized[0]?.subject) === "geometry";
  if (isGeometry) {
    const hasDouble = normalized.some(
      (q) => classifyWorksheetQuestionLayout(q) === "layout-geometry-double"
    );
    return hasDouble
      ? "worksheet-print-geometry worksheet-print-geometry-flow"
      : "worksheet-print-geometry";
  }
  const hasCompact = normalized.some(
    (q) => classifyWorksheetQuestionLayout(q) === "layout-compact-2"
  );
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
