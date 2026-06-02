import { SCIENCE_GRADES } from "../../data/science-curriculum.js";
import { SCIENCE_G1_PAGE_ORDER } from "./science-g1-registry.js";
import { SCIENCE_G2_PAGE_ORDER } from "./science-g2-registry.js";
import { SCIENCE_G3_PAGE_ORDER } from "./science-g3-registry.js";
import { SCIENCE_G4_PAGE_ORDER } from "./science-g4-registry.js";
import { SCIENCE_G5_PAGE_ORDER } from "./science-g5-registry.js";
import { SCIENCE_G6_PAGE_ORDER } from "./science-g6-registry.js";

/** @typedef {{ topic: string, forceKind: string }} SciencePracticeEntry */

/** @param {string} pageId */
function entry(pageId) {
  return { topic: pageId, forceKind: pageId };
}

/** @type {Record<string, Record<string, SciencePracticeEntry>>} */
export const SCIENCE_PAGE_TO_PRACTICE_BY_GRADE = {
  g1: Object.fromEntries(
    SCIENCE_G1_PAGE_ORDER.map((pageId) => [pageId, entry(pageId)])
  ),
  g2: Object.fromEntries(
    SCIENCE_G2_PAGE_ORDER.map((pageId) => [pageId, entry(pageId)])
  ),
  g3: Object.fromEntries(
    SCIENCE_G3_PAGE_ORDER.map((pageId) => [pageId, entry(pageId)])
  ),
  g4: Object.fromEntries(
    SCIENCE_G4_PAGE_ORDER.map((pageId) => [pageId, entry(pageId)])
  ),
  g5: Object.fromEntries(
    SCIENCE_G5_PAGE_ORDER.map((pageId) => [pageId, entry(pageId)])
  ),
  g6: Object.fromEntries(
    SCIENCE_G6_PAGE_ORDER.map((pageId) => [pageId, entry(pageId)])
  ),
};

/** @type {Record<string, string[]>} */
export const SCIENCE_PAGE_ORDER_BY_GRADE = {
  g1: SCIENCE_G1_PAGE_ORDER,
  g2: SCIENCE_G2_PAGE_ORDER,
  g3: SCIENCE_G3_PAGE_ORDER,
  g4: SCIENCE_G4_PAGE_ORDER,
  g5: SCIENCE_G5_PAGE_ORDER,
  g6: SCIENCE_G6_PAGE_ORDER,
};

/**
 * @param {string} grade
 * @param {string} pageId
 */
export function resolveSciencePracticeTarget(grade, pageId) {
  const gradeKey = String(grade || "").toLowerCase();
  const map = SCIENCE_PAGE_TO_PRACTICE_BY_GRADE[gradeKey];
  if (!map) return null;

  const pageOrder = SCIENCE_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  if (!pageOrder.includes(pageId)) return null;

  const practice = map[pageId];
  if (!practice) return null;

  const gradeCfg = SCIENCE_GRADES[gradeKey];
  if (!gradeCfg?.topics?.includes(practice.topic)) return null;

  return {
    pageId,
    grade: gradeKey,
    mode: "learning",
    topic: practice.topic,
    forceKind: practice.forceKind,
  };
}

export function hasSciencePracticeTarget(grade, pageId) {
  return resolveSciencePracticeTarget(grade, pageId) != null;
}
