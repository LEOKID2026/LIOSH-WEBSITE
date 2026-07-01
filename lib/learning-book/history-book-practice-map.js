import { HISTORY_GRADES as HISTORY_CURRICULUM_GRADES } from "../../data/history-curriculum.js";
import { HISTORY_G6_PAGE_ORDER } from "./history-g6-registry.js";

const HISTORY_GRADES = HISTORY_CURRICULUM_GRADES || {};

/** @typedef {{ topic: string, forceKind: string }} HistoryPracticeEntry */

/** @param {string} pageId */
function entry(pageId) {
  return { topic: pageId, forceKind: pageId };
}

/** @type {Record<string, Record<string, HistoryPracticeEntry>>} */
export const HISTORY_PAGE_TO_PRACTICE_BY_GRADE = {
  g6: Object.fromEntries(HISTORY_G6_PAGE_ORDER.map((pageId) => [pageId, entry(pageId)])),
};

/** @type {Record<string, string[]>} */
export const HISTORY_PAGE_ORDER_BY_GRADE = {
  g6: HISTORY_G6_PAGE_ORDER,
};

/**
 * @param {string} grade
 * @param {string} pageId
 */
export function resolveHistoryPracticeTarget(grade, pageId) {
  const gradeKey = String(grade || "").toLowerCase();
  const map = HISTORY_PAGE_TO_PRACTICE_BY_GRADE[gradeKey];
  if (!map) return null;

  const pageOrder = HISTORY_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  if (!pageOrder.includes(pageId)) return null;

  const practice = map[pageId];
  if (!practice) return null;

  const gradeCfg = HISTORY_GRADES[gradeKey];
  if (!gradeCfg?.topics?.includes(practice.topic)) return null;

  return {
    pageId,
    grade: gradeKey,
    mode: "learning",
    topic: practice.topic,
    forceKind: practice.forceKind,
  };
}

export function hasHistoryPracticeTarget(grade, pageId) {
  return resolveHistoryPracticeTarget(grade, pageId) != null;
}
