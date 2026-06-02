import { GRADES } from "../../utils/hebrew-constants.js";
import { HEBREW_G1_PAGE_ORDER } from "./hebrew-g1-registry.js";
import { HEBREW_G2_PAGE_ORDER } from "./hebrew-g2-registry.js";
import { HEBREW_G3_PAGE_ORDER } from "./hebrew-g3-registry.js";
import { HEBREW_G4_PAGE_ORDER } from "./hebrew-g4-registry.js";
import { HEBREW_G5_PAGE_ORDER } from "./hebrew-g5-registry.js";
import { HEBREW_G6_PAGE_ORDER } from "./hebrew-g6-registry.js";
import {
  HEBREW_G1_PAGE_SKILLS,
  HEBREW_G2_PAGE_SKILLS,
  HEBREW_G3_PAGE_SKILLS,
  HEBREW_G4_PAGE_SKILLS,
  HEBREW_G5_PAGE_SKILLS,
  HEBREW_G6_PAGE_SKILLS,
} from "./hebrew-page-skill-index.js";

/** @typedef {{ topic: string, forceKind: string, skillId: string }} HebrewPracticeEntry */

/**
 * @param {string} skillId
 * @returns {string|null}
 */
export function parseHebrewTopicFromSkillId(skillId) {
  const parts = String(skillId || "").split(":");
  if (parts[0] !== "hebrew") return null;
  if (parts[1] === "rich") return parts[2] || null;
  if (/^g[1-6]$/.test(parts[1])) return parts[2] || null;
  return null;
}

/**
 * @param {string} skillId
 * @returns {{ patternFamily: string, subtype: string }|null}
 */
export function parseHebrewRichPatternFromSkillId(skillId) {
  const parts = String(skillId || "").split(":");
  if (parts[0] !== "hebrew" || parts[1] !== "rich") return null;
  if (parts.length < 5) return null;
  return { patternFamily: parts[3], subtype: parts[4] };
}

/**
 * @param {string[]} pageOrder
 * @param {Record<string, { skillId?: string }>} pageSkills
 * @returns {Record<string, HebrewPracticeEntry>}
 */
function buildGradePracticeMap(pageOrder, pageSkills) {
  /** @type {Record<string, HebrewPracticeEntry>} */
  const map = {};
  for (const pageId of pageOrder) {
    const skillId = String(pageSkills[pageId]?.skillId || "").trim();
    const topic = parseHebrewTopicFromSkillId(skillId);
    if (!topic) continue;
    map[pageId] = { topic, forceKind: pageId, skillId };
  }
  return map;
}

/** @type {Record<string, Record<string, HebrewPracticeEntry>>} */
export const HEBREW_PAGE_TO_PRACTICE_BY_GRADE = {
  g1: buildGradePracticeMap(HEBREW_G1_PAGE_ORDER, HEBREW_G1_PAGE_SKILLS),
  g2: buildGradePracticeMap(HEBREW_G2_PAGE_ORDER, HEBREW_G2_PAGE_SKILLS),
  g3: buildGradePracticeMap(HEBREW_G3_PAGE_ORDER, HEBREW_G3_PAGE_SKILLS),
  g4: buildGradePracticeMap(HEBREW_G4_PAGE_ORDER, HEBREW_G4_PAGE_SKILLS),
  g5: buildGradePracticeMap(HEBREW_G5_PAGE_ORDER, HEBREW_G5_PAGE_SKILLS),
  g6: buildGradePracticeMap(HEBREW_G6_PAGE_ORDER, HEBREW_G6_PAGE_SKILLS),
};

/** @type {Record<string, string[]>} */
export const HEBREW_PAGE_ORDER_BY_GRADE = {
  g1: HEBREW_G1_PAGE_ORDER,
  g2: HEBREW_G2_PAGE_ORDER,
  g3: HEBREW_G3_PAGE_ORDER,
  g4: HEBREW_G4_PAGE_ORDER,
  g5: HEBREW_G5_PAGE_ORDER,
  g6: HEBREW_G6_PAGE_ORDER,
};

/**
 * @param {string} grade
 * @param {string} pageId
 */
export function resolveHebrewPracticeTarget(grade, pageId) {
  const gradeKey = String(grade || "").toLowerCase();
  const map = HEBREW_PAGE_TO_PRACTICE_BY_GRADE[gradeKey];
  if (!map) return null;

  const pageOrder = HEBREW_PAGE_ORDER_BY_GRADE[gradeKey] || [];
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
    operation: practice.topic,
    forceKind: practice.forceKind,
    skillId: practice.skillId,
  };
}

export function hasHebrewPracticeTarget(grade, pageId) {
  return resolveHebrewPracticeTarget(grade, pageId) != null;
}

/**
 * @param {string} grade
 * @param {string} patternFamily
 * @param {string} subtype
 * @returns {string|null}
 */
export function findHebrewBookPageByRichPattern(grade, patternFamily, subtype) {
  const gradeKey = String(grade || "").toLowerCase();
  const map = HEBREW_PAGE_TO_PRACTICE_BY_GRADE[gradeKey] || {};
  for (const [pageId, entry] of Object.entries(map)) {
    const pat = parseHebrewRichPatternFromSkillId(entry.skillId);
    if (
      pat &&
      pat.patternFamily === patternFamily &&
      pat.subtype === subtype
    ) {
      return pageId;
    }
  }
  return null;
}

/**
 * @param {string} grade
 * @param {string} topic
 * @returns {string|null}
 */
export function firstHebrewBookPageForTopic(grade, topic) {
  const gradeKey = String(grade || "").toLowerCase();
  const order = HEBREW_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  const map = HEBREW_PAGE_TO_PRACTICE_BY_GRADE[gradeKey] || {};
  for (const pageId of order) {
    if (map[pageId]?.topic === topic) return pageId;
  }
  return null;
}
