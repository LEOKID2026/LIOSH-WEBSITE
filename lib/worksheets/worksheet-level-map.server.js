/**
 * Map parent-facing levels (רגיל/מתקדם) to internal selector keys — server only.
 * @module lib/worksheets/worksheet-level-map.server
 */

import { isCoreWorksheetSubject } from "./worksheet-print-allowlist.js";
import {
  isWorksheetPublicLevelKey,
  worksheetPublicLevelLabelHe,
} from "./worksheet-level-display.js";
import {
  defaultMathPracticeFormatForGradeTopic,
  isMathPracticeFormatAllowedForGradeTopic,
  isWorksheetMathPracticeFormat,
} from "./worksheet-math-practice-format.js";
import { normalizePreferMcq } from "./worksheet-mcq-preference.js";
import { normalizeWorksheetMixedTopicKeys } from "./worksheet-mixed-topics.js";

/** @typedef {import("./worksheet-level-display.js").WorksheetPublicLevelKey} WorksheetPublicLevelKey */


/**
 * Internal generator keys — never exposed in parent UI/HTML/public payload.
 * regular → medium (default practice mix)
 * advanced → hard (more challenging)
 * @param {WorksheetPublicLevelKey} publicLevelKey
 * @returns {"medium" | "hard"}
 */
export function mapPublicLevelToInternal(publicLevelKey) {
  if (publicLevelKey === "advanced") return "hard";
  return "medium";
}

/**
 * @param {Partial<{
 *   subjectId: string,
 *   gradeKey: string,
 *   topicKey: string,
 *   levelKey: string,
 *   count: number | string,
 *   seed?: number,
 *   mathPracticeFormat?: string,
 *   preferMcq?: boolean,
 *   titleHe?: string,
 *   mixedTopicKeys?: string[] | null,
 * }>} params
 * @returns {{
 *   ok: true,
 *   publicLevelKey: WorksheetPublicLevelKey,
 *   selectorParams: import("./worksheet-question-selector.server.js").WorksheetSelectorParams,
 * } | { ok: false, error: string }}
 */
export function validateWorksheetPublicGenerationParams(params) {
  const subjectId = params.subjectId;
  if (!subjectId || !isCoreWorksheetSubject(subjectId)) {
    return { ok: false, error: "INVALID_SUBJECT" };
  }

  const count = Number(params.count);
  if (!Number.isFinite(count) || count < 1 || count > 20) {
    return { ok: false, error: "INVALID_COUNT" };
  }

  if (!params.gradeKey || !params.topicKey) {
    return { ok: false, error: "MISSING_FILTERS" };
  }

  const levelKey = String(params.levelKey || "").trim();
  if (!isWorksheetPublicLevelKey(levelKey)) {
    return { ok: false, error: "INVALID_LEVEL" };
  }

  const publicLevelKey = /** @type {WorksheetPublicLevelKey} */ (levelKey);

  let mathPracticeFormat =
    typeof params.mathPracticeFormat === "string" && params.mathPracticeFormat.trim()
      ? params.mathPracticeFormat.trim()
      : undefined;

  if (subjectId === "math") {
    if (mathPracticeFormat) {
      if (!isWorksheetMathPracticeFormat(mathPracticeFormat)) {
        return { ok: false, error: "INVALID_MATH_PRACTICE_FORMAT" };
      }
      if (
        !isMathPracticeFormatAllowedForGradeTopic(
          mathPracticeFormat,
          String(params.gradeKey),
          String(params.topicKey)
        )
      ) {
        return { ok: false, error: "INVALID_MATH_PRACTICE_FORMAT_FOR_TOPIC" };
      }
    } else {
      mathPracticeFormat =
        defaultMathPracticeFormatForGradeTopic(
          String(params.gradeKey),
          String(params.topicKey)
        ) || undefined;
    }
  }

  const preferMcq = normalizePreferMcq(params.preferMcq);

  /** @type {string[] | null | undefined} */
  let mixedTopicKeys;
  const topicKey = String(params.topicKey);
  if (topicKey === "mixed") {
    const mixedNorm = normalizeWorksheetMixedTopicKeys(
      subjectId,
      String(params.gradeKey),
      Object.prototype.hasOwnProperty.call(params, "mixedTopicKeys")
        ? params.mixedTopicKeys
        : undefined
    );
    if (!mixedNorm.ok) {
      return { ok: false, error: mixedNorm.error };
    }
    mixedTopicKeys = mixedNorm.mixedTopicKeys;
  }

  return {
    ok: true,
    publicLevelKey,
    selectorParams: {
      subjectId,
      gradeKey: String(params.gradeKey),
      topicKey,
      levelKey: mapPublicLevelToInternal(publicLevelKey),
      count: Math.floor(count),
      seed: params.seed,
      mathPracticeFormat,
      ...(preferMcq !== undefined ? { preferMcq } : {}),
      ...(Array.isArray(mixedTopicKeys) ? { mixedTopicKeys } : {}),
    },
  };
}

export { worksheetPublicLevelLabelHe };
