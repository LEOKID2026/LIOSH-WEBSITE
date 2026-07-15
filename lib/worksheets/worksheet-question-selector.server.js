/**
 * Worksheet question selector — skeleton for Wave A.
 * Full implementation in Waves B–D (per-subject generators).
 * @module lib/worksheets/worksheet-question-selector.server
 */

import { isCoreWorksheetSubject } from "./worksheet-print-allowlist.js";
import { selectMathWorksheetQuestions } from "./worksheet-math-selector.server.js";
import { selectGeometryWorksheetQuestions } from "./worksheet-geometry-selector.server.js";
import { selectHebrewWorksheetQuestions } from "./worksheet-hebrew-selector.server.js";
import { selectEnglishWorksheetQuestions } from "./worksheet-english-selector.server.js";

/**
 * @typedef {Object} WorksheetSelectorParams
 * @property {import("./worksheet-question-types.js").WorksheetSubjectId} subjectId
 * @property {string} gradeKey
 * @property {string} topicKey
 * @property {string} levelKey
 * @property {number} count
 * @property {number} [seed]
 * @property {string} [mathPracticeFormat]
 * @property {boolean} [preferMcq]
 * @property {string[] | null} [mixedTopicKeys]
 */

/**
 * Select questions for a worksheet — stub returns empty until Wave B+.
 * @param {WorksheetSelectorParams} params
 * @returns {Promise<{ questions: Record<string, unknown>[], seed: number }>}
 */
export async function selectWorksheetQuestions(params) {
  if (!isCoreWorksheetSubject(params.subjectId)) {
    throw new Error(`WORKSHEET_SUBJECT_NOT_SUPPORTED:${params.subjectId}`);
  }

  if (params.subjectId === "math") {
    const { questions, seed, mathPracticeFormat } = selectMathWorksheetQuestions({
      gradeKey: params.gradeKey,
      topicKey: params.topicKey,
      levelKey: params.levelKey,
      count: params.count,
      seed: params.seed,
      mathPracticeFormat: params.mathPracticeFormat,
      preferMcq: params.preferMcq === true,
      mixedTopicKeys: params.mixedTopicKeys,
    });
    return { questions, seed, mathPracticeFormat };
  }

  if (params.subjectId === "geometry") {
    const { questions, seed } = selectGeometryWorksheetQuestions({
      gradeKey: params.gradeKey,
      topicKey: params.topicKey,
      levelKey: params.levelKey,
      count: params.count,
      seed: params.seed,
      preferMcq: params.preferMcq === true,
      mixedTopicKeys: params.mixedTopicKeys,
    });
    return { questions, seed };
  }

  if (params.subjectId === "hebrew") {
    const { questions, seed } = selectHebrewWorksheetQuestions({
      gradeKey: params.gradeKey,
      topicKey: params.topicKey,
      levelKey: params.levelKey,
      count: params.count,
      seed: params.seed,
      mixedTopicKeys: params.mixedTopicKeys,
    });
    return { questions, seed };
  }

  if (params.subjectId === "english") {
    const { questions, seed } = selectEnglishWorksheetQuestions({
      gradeKey: params.gradeKey,
      topicKey: params.topicKey,
      levelKey: params.levelKey,
      count: params.count,
      seed: params.seed,
      mixedTopicKeys: params.mixedTopicKeys,
    });
    return { questions, seed };
  }

  const seed = typeof params.seed === "number" ? params.seed : Date.now() % 1_000_000;
  return { questions: [], seed };
}

/**
 * Validate selector params shape (shared by API routes in Wave E).
 * @param {Partial<WorksheetSelectorParams>} params
 * @returns {{ ok: true, params: WorksheetSelectorParams } | { ok: false, error: string }}
 */
export function validateWorksheetSelectorParams(params) {
  const subjectId = params.subjectId;
  if (!subjectId || !isCoreWorksheetSubject(subjectId)) {
    return { ok: false, error: "INVALID_SUBJECT" };
  }
  const count = Number(params.count);
  if (!Number.isFinite(count) || count < 1 || count > 20) {
    return { ok: false, error: "INVALID_COUNT" };
  }
  if (!params.gradeKey || !params.topicKey || !params.levelKey) {
    return { ok: false, error: "MISSING_FILTERS" };
  }
  return {
    ok: true,
    params: {
      subjectId,
      gradeKey: String(params.gradeKey),
      topicKey: String(params.topicKey),
      levelKey: String(params.levelKey),
      count: Math.floor(count),
      seed: params.seed,
    },
  };
}
