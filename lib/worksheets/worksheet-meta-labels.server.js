/**
 * Hebrew labels for worksheet meta fields — hub + preview.
 * @module lib/worksheets/worksheet-meta-labels.server
 */

import { formatGradeLevelHe } from "../learning-student-defaults.js";
import { WORKSHEET_SUBJECT_ALLOWLIST } from "./worksheet-print-allowlist.js";
import { TOPICS as GEOMETRY_TOPICS } from "../../utils/geometry-constants.js";
import { TOPICS as HEBREW_TOPICS } from "../../utils/hebrew-constants.js";
import { ENGLISH_TOPICS } from "../../utils/english-question-generator.js";
import { getMathReportBucketDisplayName } from "../../utils/math-report-generator.js";
import {
  isWorksheetPublicLevelKey,
  worksheetPublicLevelLabelHe,
} from "./worksheet-level-display.js";
import { mathPracticeFormatTitleHe } from "./worksheet-math-practice-format.js";

/** @typedef {import("./worksheet-question-types.js").WorksheetSubjectId} WorksheetSubjectId */

/**
 * @param {WorksheetSubjectId} subjectId
 * @param {string} gradeKey
 * @returns {string}
 */
export function worksheetGradeLabelHe(subjectId, gradeKey) {
  const fromKey = formatGradeLevelHe(gradeKey);
  if (fromKey) return fromKey;
  const g = String(gradeKey || "").match(/^g([1-6])$/i);
  if (g) return formatGradeLevelHe(`grade_${g[1]}`) || gradeKey;
  return gradeKey || "-";
}

/**
 * @param {WorksheetSubjectId} subjectId
 * @param {string} topicKey
 * @returns {string}
 */
export function worksheetTopicLabelHe(subjectId, topicKey) {
  const key = String(topicKey || "");
  if (subjectId === "math") {
    return getMathReportBucketDisplayName(key) || key;
  }
  if (subjectId === "geometry") {
    if (key === "mixed") return "תרגול מעורב";
    return GEOMETRY_TOPICS[key]?.name || key;
  }
  if (subjectId === "hebrew") {
    if (key === "mixed") return "תרגול מעורב";
    return HEBREW_TOPICS[key]?.name || key;
  }
  if (subjectId === "english") {
    if (key === "mixed") return "תרגול מעורב";
    return ENGLISH_TOPICS[key]?.name || key;
  }
  return key;
}

/**
 * Parent-facing level label — רגיל / מתקדם only.
 * @param {string} levelKey - `regular` | `advanced`
 * @returns {string}
 */
export function worksheetLevelLabelHe(_subjectId, levelKey) {
  if (isWorksheetPublicLevelKey(levelKey)) {
    return worksheetPublicLevelLabelHe(levelKey);
  }
  return "-";
}

/**
 * @param {WorksheetSubjectId} subjectId
 * @returns {string}
 */
export function worksheetSubjectLabelHe(subjectId) {
  return WORKSHEET_SUBJECT_ALLOWLIST[subjectId]?.labelHe || subjectId;
}

/**
 * @param {{
 *   subjectId: WorksheetSubjectId,
 *   gradeKey: string,
 *   topicKey: string,
 *   levelKey: string,
 *   inkSave?: boolean,
 *   titleHe?: string,
 *   mathPracticeFormat?: string,
 * }} params - levelKey must be public (`regular` | `advanced`)
 * @returns {import("./worksheet-question-types.js").WorksheetPayloadMeta}
 */
export function buildWorksheetPayloadMeta(params) {
  const subjectHe = worksheetSubjectLabelHe(params.subjectId);
  const gradeHe = worksheetGradeLabelHe(params.subjectId, params.gradeKey);
  let topicHe = worksheetTopicLabelHe(params.subjectId, params.topicKey);
  if (params.subjectId === "math" && params.mathPracticeFormat) {
    topicHe = mathPracticeFormatTitleHe(
      params.mathPracticeFormat,
      params.topicKey,
      params.gradeKey
    );
  }
  const levelHe = worksheetLevelLabelHe(params.subjectId, params.levelKey);
  const titleHe =
    params.titleHe ||
    `דף עבודה - ${subjectHe} · ${topicHe}`;

  return {
    titleHe,
    subjectHe,
    gradeHe,
    topicHe,
    levelHe,
    inkSave: params.inkSave === true,
    subjectId: params.subjectId,
    gradeKey: params.gradeKey,
    topicKey: params.topicKey,
    levelKey: params.levelKey,
    mathPracticeFormat: params.mathPracticeFormat,
  };
}
