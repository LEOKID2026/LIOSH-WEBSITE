/**
 * Hebrew worksheet topic allowlist — Wave D.
 * @module lib/worksheets/worksheet-hebrew-allowlist
 */

import { GRADES, TOPICS } from "../../utils/hebrew-constants.js";

/** All 7 Hebrew hub topics. */
export const HEBREW_WORKSHEET_TOPIC_IDS = /** @type {const} */ ([
  "reading",
  "comprehension",
  "writing",
  "grammar",
  "vocabulary",
  "speaking",
  "mixed",
]);

/**
 * Speaking items that are oral-only prompts without printable stem — rare; most speaking rows are social MCQ.
 */
export const HEBREW_PRINT_BLOCKED_ITEM_TYPES = new Set(["audio", "listening_only"]);

/**
 * @param {string} gradeKey
 * @returns {string[]}
 */
export function listHebrewTopicsForGrade(gradeKey) {
  return (GRADES[gradeKey]?.topics || []).slice();
}

/**
 * @param {string} topicKey
 * @returns {string[]}
 */
export function listGradesForHebrewTopic(topicKey) {
  /** @type {string[]} */
  const grades = [];
  for (const [gradeKey, cfg] of Object.entries(GRADES)) {
    if (cfg.topics?.includes(topicKey)) grades.push(gradeKey);
  }
  return grades;
}

/**
 * @param {string} topicKey
 * @returns {boolean}
 */
export function isKnownHebrewWorksheetTopic(topicKey) {
  return topicKey in TOPICS;
}
