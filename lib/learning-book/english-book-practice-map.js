import { ENGLISH_G1_PAGE_ORDER } from "./english-g1-registry.js";
import { ENGLISH_G2_PAGE_ORDER } from "./english-g2-registry.js";
import { ENGLISH_G3_PAGE_ORDER } from "./english-g3-registry.js";
import { ENGLISH_G4_PAGE_ORDER } from "./english-g4-registry.js";
import { ENGLISH_G5_PAGE_ORDER } from "./english-g5-registry.js";
import { ENGLISH_G6_PAGE_ORDER } from "./english-g6-registry.js";
import {
  ENGLISH_G1_PAGE_SKILLS,
  ENGLISH_G2_PAGE_SKILLS,
  ENGLISH_G3_PAGE_SKILLS,
  ENGLISH_G4_PAGE_SKILLS,
  ENGLISH_G5_PAGE_SKILLS,
  ENGLISH_G6_PAGE_SKILLS,
} from "./english-page-skill-index.js";
import { getRuntimeEligiblePhonicsPool } from "../../data/english-questions/index.js";

/** @typedef {{ topic: string, forceKind: string, skillId: string }} EnglishPracticeEntry */

export const ENGLISH_MASTER_TOPICS = new Set([
  "phonics",
  "vocabulary",
  "grammar",
  "translation",
  "sentences",
  "writing",
  "mixed",
]);

/**
 * @param {string} skillId
 * @returns {string|null}
 */
export function parseEnglishTopicFromSkillId(skillId) {
  const parts = String(skillId || "").split(":");
  if (parts[0] !== "english") return null;
  if (parts[1] === "phonics") return "phonics";
  if (parts[1] === "vocabulary") return "vocabulary";
  if (parts[1] === "pool") {
    if (parts[2] === "grammar") return "grammar";
    if (parts[2] === "sentence") return "sentences";
    if (parts[2] === "translation") return "translation";
  }
  if (parts[1] === "grammar") return "grammar";
  return null;
}

/**
 * @param {string} skillId
 * @returns {string|null}
 */
export function parseEnglishWordListKeyFromSkillId(skillId) {
  const parts = String(skillId || "").split(":");
  if (parts[0] === "english" && parts[1] === "vocabulary" && parts[2] === "wordlist") {
    return parts[3] || null;
  }
  return null;
}

/**
 * @param {string} skillId
 * @returns {string|null}
 */
export function parseEnglishPoolKeyFromSkillId(skillId) {
  const parts = String(skillId || "").split(":");
  if (parts[0] === "english" && parts[1] === "pool") {
    return parts[3] || null;
  }
  return null;
}

/**
 * @param {string} pageId
 * @returns {string|null}
 */
export function englishWordListKeyFromPageId(pageId) {
  const m = /^vocab_(.+)$/.exec(String(pageId || "").trim());
  return m ? m[1] : null;
}

/**
 * @param {string} bookPageRef e.g. english:g1:letters_upper
 * @returns {string|null} english:phonics:g1:letters_upper
 */
export function englishPhonicsSkillIdFromBookPageRef(bookPageRef) {
  const parts = String(bookPageRef || "").split(":");
  if (parts.length >= 3 && parts[0] === "english" && /^g[12]$/.test(parts[1]) && parts[2]) {
    return `english:phonics:${parts[1]}:${parts[2]}`;
  }
  return null;
}

/**
 * @param {string} skillId
 * @returns {{ grade: string, pageId: string }|null}
 */
export function parseEnglishPhonicsPageFromSkillId(skillId) {
  const parts = String(skillId || "").split(":");
  if (parts[0] === "english" && parts[1] === "phonics" && /^g[12]$/.test(parts[2]) && parts[3]) {
    return { grade: parts[2], pageId: parts[3] };
  }
  return null;
}

/**
 * @param {string} gradeKey
 * @param {string[]} pageOrder
 * @param {Record<string, { skillId?: string }>} pageSkills
 * @returns {Record<string, EnglishPracticeEntry>}
 */
function buildGradePracticeMap(gradeKey, pageOrder, pageSkills) {
  /** @type {Record<string, EnglishPracticeEntry>} */
  const map = {};
  for (const pageId of pageOrder) {
    const skillId = String(pageSkills[pageId]?.skillId || "").trim();
    const topic = parseEnglishTopicFromSkillId(skillId);
    if (!topic) continue;
    if (
      topic === "phonics" &&
      getRuntimeEligiblePhonicsPool(gradeKey, pageId).length === 0
    ) {
      continue;
    }
    map[pageId] = { topic, forceKind: pageId, skillId };
  }
  return map;
}

/** @type {Record<string, Record<string, EnglishPracticeEntry>>} */
export const ENGLISH_PAGE_TO_PRACTICE_BY_GRADE = {
  g1: buildGradePracticeMap("g1", ENGLISH_G1_PAGE_ORDER, ENGLISH_G1_PAGE_SKILLS),
  g2: buildGradePracticeMap("g2", ENGLISH_G2_PAGE_ORDER, ENGLISH_G2_PAGE_SKILLS),
  g3: buildGradePracticeMap("g3", ENGLISH_G3_PAGE_ORDER, ENGLISH_G3_PAGE_SKILLS),
  g4: buildGradePracticeMap("g4", ENGLISH_G4_PAGE_ORDER, ENGLISH_G4_PAGE_SKILLS),
  g5: buildGradePracticeMap("g5", ENGLISH_G5_PAGE_ORDER, ENGLISH_G5_PAGE_SKILLS),
  g6: buildGradePracticeMap("g6", ENGLISH_G6_PAGE_ORDER, ENGLISH_G6_PAGE_SKILLS),
};

/** @type {Record<string, string[]>} */
export const ENGLISH_PAGE_ORDER_BY_GRADE = {
  g1: ENGLISH_G1_PAGE_ORDER,
  g2: ENGLISH_G2_PAGE_ORDER,
  g3: ENGLISH_G3_PAGE_ORDER,
  g4: ENGLISH_G4_PAGE_ORDER,
  g5: ENGLISH_G5_PAGE_ORDER,
  g6: ENGLISH_G6_PAGE_ORDER,
};

/**
 * @param {string} grade
 * @param {string} pageId
 */
export function resolveEnglishPracticeTarget(grade, pageId) {
  const gradeKey = String(grade || "").toLowerCase();
  const map = ENGLISH_PAGE_TO_PRACTICE_BY_GRADE[gradeKey];
  if (!map) return null;

  const pageOrder = ENGLISH_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  if (!pageOrder.includes(pageId)) return null;

  const practice = map[pageId];
  if (!practice || !ENGLISH_MASTER_TOPICS.has(practice.topic)) return null;

  return {
    pageId,
    grade: gradeKey,
    mode: "learning",
    topic: practice.topic,
    forceKind: practice.forceKind,
    skillId: practice.skillId,
  };
}

export function hasEnglishPracticeTarget(grade, pageId) {
  return resolveEnglishPracticeTarget(grade, pageId) != null;
}

/**
 * @param {string} grade
 * @param {string} topic
 * @param {string} poolKey
 * @returns {string|null}
 */
export function findEnglishBookPageByPoolKey(grade, topic, poolKey) {
  const gradeKey = String(grade || "").toLowerCase();
  const map = ENGLISH_PAGE_TO_PRACTICE_BY_GRADE[gradeKey] || {};
  const order = ENGLISH_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  for (const pageId of order) {
    const entry = map[pageId];
    if (!entry || entry.topic !== topic) continue;
    if (topic === "vocabulary") {
      const listKey = parseEnglishWordListKeyFromSkillId(entry.skillId);
      if (listKey === poolKey) return pageId;
    } else {
      const pk = parseEnglishPoolKeyFromSkillId(entry.skillId);
      if (pk === poolKey) return pageId;
    }
  }
  return null;
}

/**
 * @param {string} grade
 * @param {string} topic
 * @returns {string|null}
 */
export function firstEnglishBookPageForTopic(grade, topic) {
  const gradeKey = String(grade || "").toLowerCase();
  const order = ENGLISH_PAGE_ORDER_BY_GRADE[gradeKey] || [];
  const map = ENGLISH_PAGE_TO_PRACTICE_BY_GRADE[gradeKey] || {};
  for (const pageId of order) {
    if (map[pageId]?.topic === topic) return pageId;
  }
  return null;
}
