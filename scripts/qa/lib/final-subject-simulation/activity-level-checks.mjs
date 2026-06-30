/**
 * Parent/teacher activity level checks via display-level SSOT (no legacy UI selection).
 */
import { resolveActivityGenerationPlan } from "../../../../lib/learning/activity-question-selection.js";
import {
  displayLevelToActivityDbEnum,
  isDisplayLevelAllowedForSubject,
  isScienceSubjectId,
} from "../../../../lib/learning/display-level.js";

/** @param {string} subjectKey product key (moledet-geography, history, …) */
export function activitySubjectId(subjectKey) {
  if (subjectKey === "moledet-geography") return "moledet_geography";
  return subjectKey;
}

/**
 * @param {string} subjectKey
 * @returns {{ regular: object, advanced: object, advancedExpected: boolean }}
 */
export function verifyActivityLevelPlans(subjectKey) {
  const subjectId = activitySubjectId(subjectKey);
  const regularOnly = isScienceSubjectId(subjectId);

  const regularDb = displayLevelToActivityDbEnum("regular");
  const advancedDb = displayLevelToActivityDbEnum("advanced");
  const regularPlan = resolveActivityGenerationPlan(regularDb, subjectId);
  const advancedPlan = resolveActivityGenerationPlan(advancedDb, subjectId);

  const regularPass =
    regularPlan.displayLevel === "regular" &&
    Array.isArray(regularPlan.sourceDifficulties) &&
    regularPlan.sourceDifficulties.length > 0;

  if (regularOnly) {
    const mixedPlan = resolveActivityGenerationPlan("mixed", subjectId);
    const advancedBlocked =
      mixedPlan.rejectAdvanced === true &&
      !isDisplayLevelAllowedForSubject("advanced", subjectId);
    return {
      advancedExpected: false,
      regular: {
        pass: regularPass && advancedBlocked,
        detail: regularPass
          ? `regular pool ${regularPlan.sourceDifficulties.join("+")}; rejectAdvanced=${mixedPlan.rejectAdvanced}`
          : "regular activity plan invalid",
      },
      advanced: {
        pass: advancedBlocked,
        detail: advancedBlocked
          ? "advanced not offered for science (SSOT)"
          : "science must reject advanced displayLevel",
        status: "N/A",
      },
    };
  }

  const advancedPass =
    advancedPlan.displayLevel === "advanced" &&
    advancedPlan.sourceDifficulties.includes("hard") &&
    isDisplayLevelAllowedForSubject("advanced", subjectId);

  return {
    advancedExpected: true,
    regular: {
      pass: regularPass,
      detail: `regular → ${regularPlan.sourceDifficulties.join("+")}`,
    },
    advanced: {
      pass: advancedPass,
      detail: advancedPass ? "advanced → hard pool" : "advanced activity plan invalid",
      status: advancedPass ? "PASS" : "FAIL",
    },
  };
}

/**
 * Scan student activities payload for invalid advanced offerings (science).
 * @param {unknown} body
 * @param {string} subjectKey
 */
export function scanActivitiesForDisplayLevels(body, subjectKey) {
  const subjectId = activitySubjectId(subjectKey);
  const list = body?.activities || body?.data?.activities || [];
  if (!Array.isArray(list)) {
    return { pass: false, detail: "activities list missing" };
  }

  const subjectRows = list.filter((a) => {
    const s = String(a?.subject || a?.subjectId || "").toLowerCase();
    return s === subjectId || s === subjectKey.replace("-", "_");
  });

  if (isScienceSubjectId(subjectId)) {
    const advancedRows = subjectRows.filter((a) => {
      const dl = String(a?.displayLevel || a?.difficulty || "").toLowerCase();
      return dl === "advanced" || dl === "hard";
    });
    if (advancedRows.length) {
      return { pass: false, detail: `science activities expose advanced/hard (${advancedRows.length})` };
    }
    return {
      pass: true,
      detail: `science activities=${subjectRows.length}; no advanced offered`,
    };
  }

  return {
    pass: true,
    detail: `activities=${subjectRows.length} (regular+advanced allowed at SSOT)`,
  };
}
