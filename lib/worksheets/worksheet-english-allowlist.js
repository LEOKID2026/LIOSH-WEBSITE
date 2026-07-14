/**
 * English worksheet topic allowlist and print block rules — Wave D.
 * @module lib/worksheets/worksheet-english-allowlist
 */

import { ENGLISH_GRADES } from "../../data/english-curriculum.js";
import { PHONICS_RUNTIME_BLOCKED_ITEM_TYPES } from "../../data/english-questions/index.js";

/** Printable worksheet topics (phonics g1/g2 only when text-displayable). */
export const ENGLISH_WORKSHEET_TOPIC_IDS = /** @type {const} */ ([
  "phonics",
  "vocabulary",
  "grammar",
  "translation",
  "sentences",
  "writing",
  "mixed",
]);

/**
 * English item types / diagram kinds blocked from printable worksheets.
 * Documented in Wave D report — not silently dropped.
 */
export const ENGLISH_PRINT_BLOCKED_ITEM_TYPES = PHONICS_RUNTIME_BLOCKED_ITEM_TYPES;

/**
 * Phonics rows that require audio playback to answer — blocked even if stem exists.
 */
export const ENGLISH_PRINT_BLOCKED_AUDIO_ITEM_TYPES = new Set([
  "simple_listening_instruction",
  "hear_word_choose_picture_word",
]);

/**
 * @param {string} gradeKey
 * @returns {string[]}
 */
export function listEnglishTopicsForGrade(gradeKey) {
  return (ENGLISH_GRADES[gradeKey]?.topics || []).slice();
}

/**
 * @param {string} topicKey
 * @returns {string[]}
 */
export function listGradesForEnglishTopic(topicKey) {
  /** @type {string[]} */
  const grades = [];
  for (const [gradeKey, cfg] of Object.entries(ENGLISH_GRADES)) {
    if (cfg.topics?.includes(topicKey)) grades.push(gradeKey);
  }
  return grades;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ blocked: boolean, reason: string|null }}
 */
export function classifyEnglishWorksheetPrintBlock(raw) {
  if (!raw || typeof raw !== "object") {
    return { blocked: true, reason: "invalid_question" };
  }
  if (raw.requiresAudio === true) {
    return { blocked: true, reason: "requiresAudio" };
  }
  if (raw.pictureRef || raw.imageUrl || raw.requiresImage === true) {
    return { blocked: true, reason: "pictureRef" };
  }
  const params = raw.params && typeof raw.params === "object" ? raw.params : {};
  if (params.requiresAudio === true) {
    return { blocked: true, reason: "params_requiresAudio" };
  }
  if (params.pictureRef) {
    return { blocked: true, reason: "params_pictureRef" };
  }
  const itemType = String(params.itemType || raw.itemType || "");
  if (ENGLISH_PRINT_BLOCKED_ITEM_TYPES.has(itemType)) {
    return { blocked: true, reason: `blocked_itemType:${itemType}` };
  }
  if (ENGLISH_PRINT_BLOCKED_AUDIO_ITEM_TYPES.has(itemType)) {
    return { blocked: true, reason: `audio_itemType:${itemType}` };
  }
  if (/תמונה/u.test(String(raw.question || ""))) {
    return { blocked: true, reason: "stem_picture_hint" };
  }
  return { blocked: false, reason: null };
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isMostlyLatinText(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  const latin = (s.match(/[A-Za-z]/g) || []).length;
  const hebrew = (s.match(/[\u0590-\u05FF]/g) || []).length;
  return latin > 0 && latin >= hebrew;
}
