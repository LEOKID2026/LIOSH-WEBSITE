/**
 * Moledet / Geography book ↔ practice topic mapping (G2–G6 active grades only).
 */
import { GRADES } from "../../utils/moledet-geography-constants.js";
import { MOLEDET_G2_PAGE_ORDER } from "./moledet-g2-registry.js";
import { MOLEDET_G3_PAGE_ORDER } from "./moledet-g3-registry.js";
import { MOLEDET_G4_PAGE_ORDER } from "./moledet-g4-registry.js";
import { GEOGRAPHY_G5_PAGE_ORDER } from "./geography-g5-registry.js";
import { GEOGRAPHY_G6_PAGE_ORDER } from "./geography-g6-registry.js";
import {
  MG_G2_PAGE_SKILLS,
  MG_G3_PAGE_SKILLS,
  MG_G4_PAGE_SKILLS,
  MG_G5_PAGE_SKILLS,
  MG_G6_PAGE_SKILLS,
} from "./moledet-geography-page-skill-index.js";

/** @typedef {{ topic: string, forceKind: string, skillId: string }} MgPracticeEntry */

/**
 * @param {string} pageId
 * @param {string} skillId
 * @returns {string}
 */
export function resolveMoledetGeographyPracticeTopic(pageId, skillId) {
  const pid = String(pageId || "");
  const sid = String(skillId || "");
  if (sid.includes(":citizenship:") || pid.includes("citizenship") || pid.includes("democracy") || pid.includes("law_society") || pid.includes("government") || pid.includes("state_institutions") || pid.includes("social_involvement") || pid.includes("rights_duties") || pid.includes("group_decisions") || pid.includes("society_responsibility")) {
    return "citizenship";
  }
  if (pid.includes("values") || pid.includes("identity")) return "values";
  if (pid.includes("_map") || pid.includes("coordinates")) return "maps";
  if (pid.includes("israel") || pid.includes("settlement") || pid.includes("homeland")) return "homeland";
  if (pid.includes("neighborhood") || pid.includes("community") || pid.includes("organizations")) return "community";
  if (sid.includes(":geography:") || sid.includes(":skills:")) return "geography";
  return "geography";
}

/** @type {Record<string, Record<string, { skillId?: string }>>} */
const PAGE_SKILLS_BY_GRADE = {
  g2: MG_G2_PAGE_SKILLS,
  g3: MG_G3_PAGE_SKILLS,
  g4: MG_G4_PAGE_SKILLS,
  g5: MG_G5_PAGE_SKILLS,
  g6: MG_G6_PAGE_SKILLS,
};

/**
 * @param {string} grade
 * @returns {Record<string, MgPracticeEntry>}
 */
function buildGradePracticeMap(grade) {
  /** @type {Record<string, MgPracticeEntry>} */
  const map = {};
  const skills = PAGE_SKILLS_BY_GRADE[grade] || {};
  for (const [pageId, meta] of Object.entries(skills)) {
    const skillId = String(meta?.skillId || "").trim();
    map[pageId] = {
      topic: resolveMoledetGeographyPracticeTopic(pageId, skillId),
      forceKind: pageId,
      skillId,
    };
  }
  return map;
}

/** @type {Record<string, Record<string, MgPracticeEntry>>} */
export const MOLEDET_GEOGRAPHY_PAGE_TO_PRACTICE_BY_GRADE = {
  g2: buildGradePracticeMap("g2"),
  g3: buildGradePracticeMap("g3"),
  g4: buildGradePracticeMap("g4"),
  g5: buildGradePracticeMap("g5"),
  g6: buildGradePracticeMap("g6"),
};

/** @type {Record<string, string[]>} */
export const MOLEDET_GEOGRAPHY_PAGE_ORDER_BY_GRADE = {
  g2: MOLEDET_G2_PAGE_ORDER,
  g3: MOLEDET_G3_PAGE_ORDER,
  g4: MOLEDET_G4_PAGE_ORDER,
  g5: GEOGRAPHY_G5_PAGE_ORDER,
  g6: GEOGRAPHY_G6_PAGE_ORDER,
};

/** Active book grades — G1 excluded (not taught). */
export const MOLEDET_GEOGRAPHY_ACTIVE_BOOK_GRADES = ["g2", "g3", "g4", "g5", "g6"];

/**
 * @param {string} grade
 * @param {string} pageId
 */
export function resolveMoledetGeographyPracticeTarget(grade, pageId) {
  const gradeKey = String(grade || "").toLowerCase();
  if (!MOLEDET_GEOGRAPHY_ACTIVE_BOOK_GRADES.includes(gradeKey)) return null;
  const map = MOLEDET_GEOGRAPHY_PAGE_TO_PRACTICE_BY_GRADE[gradeKey];
  if (!map) return null;
  const pageOrder = MOLEDET_GEOGRAPHY_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  if (!pageOrder.includes(pageId)) return null;
  const practice = map[pageId];
  if (!practice) return null;
  const gradeCfg = GRADES[gradeKey];
  if (!gradeCfg?.topics?.includes(practice.topic)) return null;
  return {
    pageId,
    grade: gradeKey,
    mode: "learning",
    topic: practice.topic,
    forceKind: practice.forceKind,
    skillId: practice.skillId,
  };
}

export function hasMoledetGeographyPracticeTarget(grade, pageId) {
  return resolveMoledetGeographyPracticeTarget(grade, pageId) != null;
}

/**
 * @param {string} grade
 * @param {string} topic
 * @returns {string|null}
 */
export function firstMoledetGeographyBookPageForTopic(grade, topic) {
  const gradeKey = String(grade || "").toLowerCase();
  const order = MOLEDET_GEOGRAPHY_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  const map = MOLEDET_GEOGRAPHY_PAGE_TO_PRACTICE_BY_GRADE[gradeKey] || {};
  for (const pageId of order) {
    if (map[pageId]?.topic === topic) return pageId;
  }
  return null;
}
