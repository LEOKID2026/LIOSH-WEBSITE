/**
 * English — GRADES[].topics consistency with data/english-curriculum.js + curriculum map placement.
 */

import { ENGLISH_GRADES } from "../data/english-curriculum.js";
import { findTopicPlacement } from "./curriculum-audit/israeli-primary-curriculum-map.js";

/** Representative normalized keys for UI topic tabs (prefix-match via curriculum map). */
export const ENGLISH_TOPIC_TO_REP_NORM = {
  phonics: "english.exposure_oral_listening",
  vocabulary: "english.vocabulary_translation",
  grammar: "english.grammar",
  translation: "english.vocabulary_translation",
  sentences: "english.sentence_writing_patterns",
  writing: "english.sentence_writing_patterns",
};

export function minGradeForEnglishTopicKey(topicKey) {
  let min = 99;
  for (const [gk, def] of Object.entries(ENGLISH_GRADES)) {
    if (!def?.topics?.includes(topicKey)) continue;
    const n = Number(String(gk).replace("g", ""));
    if (Number.isFinite(n)) min = Math.min(min, n);
  }
  return min === 99 ? null : min;
}

export function maxGradeForEnglishTopicKey(topicKey) {
  let max = 0;
  for (const [gk, def] of Object.entries(ENGLISH_GRADES)) {
    if (!def?.topics?.includes(topicKey)) continue;
    const n = Number(String(gk).replace("g", ""));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max === 0 ? null : max;
}

/**
 * @param {string} gradeKey g1..g6
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function assertEnglishGradeTopicsMatchPolicy(gradeKey) {
  const violations = [];
  const g = Number(String(gradeKey).replace("g", ""));
  const topics = ENGLISH_GRADES[gradeKey]?.topics || [];
  for (const t of topics) {
    if (t === "mixed") continue;
    const min = minGradeForEnglishTopicKey(t);
    const max = maxGradeForEnglishTopicKey(t);
    if (min != null && g < min) {
      violations.push(`${gradeKey}: topic "${t}" listed before product minimum grade ${min}`);
    }
    if (max != null && g > max) {
      violations.push(`${gradeKey}: topic "${t}" listed after product maximum grade ${max}`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function assertAllEnglishGradesTopicPolicy() {
  /** @type {string[]} */
  const violations = [];
  for (const gk of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    violations.push(...assertEnglishGradeTopicsMatchPolicy(gk).violations);
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Conservative map: each visible topic must resolve to a strand that is not notExpectedYet for that grade.
 */
export function assertEnglishTopicsCurriculumPlaced(gradeKey) {
  const g = Number(String(gradeKey).replace("g", ""));
  const topics = ENGLISH_GRADES[gradeKey]?.topics || [];
  /** @type {string[]} */
  const violations = [];
  for (const t of topics) {
    if (t === "mixed") continue;
    const nk = ENGLISH_TOPIC_TO_REP_NORM[t];
    if (!nk) {
      violations.push(`${gradeKey}: unknown topic key "${t}"`);
      continue;
    }
    const hit = findTopicPlacement("english", g, nk);
    if (!hit) violations.push(`${gradeKey}: topic "${t}" (${nk}) has no curriculum placement`);
    else if (hit.bucket === "notExpectedYet") {
      violations.push(`${gradeKey}: topic "${t}" (${nk}) is notExpectedYet in conservative map`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function assertAllEnglishCurriculumPlacements() {
  /** @type {string[]} */
  const violations = [];
  for (const gk of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    violations.push(...assertEnglishTopicsCurriculumPlaced(gk).violations);
  }
  return { ok: violations.length === 0, violations };
}
