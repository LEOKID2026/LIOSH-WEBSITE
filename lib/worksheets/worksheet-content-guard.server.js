/**
 * Worksheet content guard — post-generation validation with reason codes (tests/debug).
 * @module lib/worksheets/worksheet-content-guard.server
 */

import { isPrintableQuestion } from "./worksheet-print-allowlist.js";
import { toPrintableWorksheetQuestion } from "./worksheet-question-sanitize.server.js";
import { isWorksheetMathKindSelectable } from "./worksheet-math-kind-allowlist.js";
import { checkMathQuestionBounds } from "./worksheet-math-content-bounds.server.js";
import { wouldBreakPageConsistency } from "./worksheet-page-consistency.server.js";
import { worksheetQuestionFingerprint } from "./worksheet-fingerprint.server.js";
import { isGeometryWorksheetParamsMathValid } from "./worksheet-geometry-math-valid.js";
import { isGeometryWorksheetStemIncomplete } from "../../utils/geometry-activity-question-stem.js";

/** @typedef {string} WorksheetGuardReasonCode */

/**
 * @param {Object} ctx
 * @param {string} ctx.subjectId
 * @param {string} ctx.gradeKey
 * @param {string} ctx.topicKey
 * @param {string} ctx.levelKey
 * @param {string} ctx.sourceDifficulty
 * @param {"regular"|"advanced"} ctx.displayLevel
 * @param {string} [ctx.mathPracticeFormat]
 * @param {Set<string>} ctx.seenFingerprints
 * @param {Record<string, unknown>[]} ctx.existingQuestions
 */

/**
 * @param {Record<string, unknown>} item
 * @param {Object} ctx
 * @returns {{ ok: true } | { ok: false, reason: WorksheetGuardReasonCode, detail?: string }}
 */
export function guardWorksheetQuestion(item, ctx) {
  const subjectId = String(ctx.subjectId || item.subject || "").toLowerCase();
  const gradeKey = String(ctx.gradeKey || item.gradeLevel || "");
  const topicKey = String(ctx.topicKey || item.topic || item.operation || "");
  const levelKey = String(ctx.levelKey || "");
  const sourceDifficulty = String(ctx.sourceDifficulty || "medium");

  if (!item || typeof item !== "object") {
    return { ok: false, reason: "INVALID_ITEM" };
  }
  if (String(item.subject || "").toLowerCase() !== subjectId) {
    return { ok: false, reason: "SUBJECT_MISMATCH" };
  }
  if (String(item.gradeLevel || gradeKey) !== gradeKey) {
    return { ok: false, reason: "GRADE_MISMATCH" };
  }
  const itemTopic = String(item.topic || item.operation || "").toLowerCase();
  if (ctx.topicKey !== "mixed" && itemTopic && itemTopic !== topicKey.toLowerCase()) {
    return { ok: false, reason: "TOPIC_MISMATCH" };
  }

  if (item.params?.gradeFallbackFromTopic || item.params?.levelRelaxedFrom) {
    return { ok: false, reason: "FALLBACK_POOL" };
  }

  const stem = String(item.question || item.questionLabel || item.exerciseText || "").trim();
  if (!stem) return { ok: false, reason: "EMPTY_STEM" };

  const answer = item.correctAnswer;
  if (answer == null || String(answer).trim() === "") {
    if (!Array.isArray(item.acceptedAnswers) || !item.acceptedAnswers.length) {
      return { ok: false, reason: "MISSING_ANSWER" };
    }
  }

  const printable = toPrintableWorksheetQuestion(item, {
    displayIndex: 1,
    subject: subjectId,
    ...(ctx.mathPracticeFormat ? { mathPracticeFormat: ctx.mathPracticeFormat } : {}),
  });
  const hasPrintStem =
    Boolean(printable.stemHe?.trim()) ||
    Boolean(String(item.question || item.questionLabel || item.exerciseText || "").trim());
  if (!isPrintableQuestion(printable.printability) || !hasPrintStem) {
    return { ok: false, reason: "NOT_PRINTABLE", detail: String(printable.printability || "") };
  }

  const fp = worksheetQuestionFingerprint(item, subjectId);
  if (!fp || ctx.seenFingerprints?.has(fp)) {
    return { ok: false, reason: "DUPLICATE_FINGERPRINT" };
  }

  if (subjectId === "math") {
    const kind = String(item.params?.kind || "");
    const format = ctx.mathPracticeFormat || "";
    if (
      kind &&
      !isWorksheetMathKindSelectable(kind, format, gradeKey, topicKey)
    ) {
      return { ok: false, reason: "KIND_NOT_ALLOWED_FOR_GRADE", detail: kind };
    }
    const bounds = checkMathQuestionBounds(item, {
      gradeKey,
      topicKey,
      sourceDifficulty,
      displayLevel: ctx.displayLevel,
    });
    if (!bounds.ok) {
      const flag = bounds.flags[0] || "BOUNDS";
      if (flag.startsWith("too_hard")) {
        return { ok: false, reason: "OPERAND_ABOVE_GRADE_CEILING", detail: flag };
      }
      return { ok: false, reason: "OPERAND_BELOW_GRADE_FLOOR", detail: flag };
    }
    if (
      !ctx.isMixedPage &&
      ctx.topicKey !== "mixed" &&
      ctx.existingQuestions?.length &&
      wouldBreakPageConsistency(item, ctx.existingQuestions, { subjectId, topicKey })
    ) {
      return { ok: false, reason: "PAGE_CONSISTENCY_BREAK" };
    }
    if (ctx.displayLevel === "advanced" && sourceDifficulty !== "hard") {
      return { ok: false, reason: "LEVEL_MISMATCH_ADVANCED" };
    }
  }

  if (subjectId === "geometry") {
    if (!isGeometryWorksheetParamsMathValid(item.params)) {
      return { ok: false, reason: "GEOMETRY_PARAMS_INVALID" };
    }
    if (isGeometryWorksheetStemIncomplete(printable.stemHe, String(item.params?.kind || ""))) {
      return { ok: false, reason: "GEOMETRY_STEM_INCOMPLETE" };
    }
  }

  if (subjectId === "hebrew" || subjectId === "english") {
    const mode = String(item.answerMode || item.params?.answerMode || "");
    if (mode === "choice" || mode === "mcq") {
      const choices = item.answers || item.choices;
      if (!Array.isArray(choices) || choices.length < 2) {
        return { ok: false, reason: "MCQ_INTEGRITY" };
      }
      if (!choices.map(String).includes(String(item.correctAnswer))) {
        return { ok: false, reason: "MCQ_ANSWER_NOT_IN_CHOICES" };
      }
    }
  }

  return { ok: true, fingerprint: fp };
}

/**
 * @param {Record<string, unknown>[]} questions
 * @param {Object} ctx
 */
export function guardWorksheetPage(questions, ctx) {
  /** @type {Array<{ index: number, reason: WorksheetGuardReasonCode }>} */
  const failures = [];
  const seen = new Set();
  for (let i = 0; i < questions.length; i += 1) {
    const prior = questions.slice(0, i);
    const result = guardWorksheetQuestion(questions[i], {
      ...ctx,
      seenFingerprints: seen,
      existingQuestions: prior,
    });
    if (!result.ok) {
      failures.push({ index: i, reason: result.reason, detail: result.detail });
    } else if (result.fingerprint) {
      seen.add(result.fingerprint);
    }
  }
  return { ok: failures.length === 0, failures };
}

export const WORKSHEET_GUARD_REASON_CODES = [
  "INVALID_ITEM",
  "SUBJECT_MISMATCH",
  "GRADE_MISMATCH",
  "TOPIC_MISMATCH",
  "FALLBACK_POOL",
  "EMPTY_STEM",
  "MISSING_ANSWER",
  "NOT_PRINTABLE",
  "DUPLICATE_FINGERPRINT",
  "KIND_NOT_ALLOWED_FOR_GRADE",
  "OPERAND_BELOW_GRADE_FLOOR",
  "OPERAND_ABOVE_GRADE_CEILING",
  "PAGE_CONSISTENCY_BREAK",
  "LEVEL_MISMATCH_ADVANCED",
  "GEOMETRY_PARAMS_INVALID",
  "GEOMETRY_STEM_INCOMPLETE",
  "MCQ_INTEGRITY",
  "MCQ_ANSWER_NOT_IN_CHOICES",
];
