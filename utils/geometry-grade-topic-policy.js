/**
 * Geometry closure - topic exposure must match `GRADES[].topics` in geometry-constants.js (single source).
 */

import { GRADES } from "./geometry-constants.js";

/** Minimum numeric grade (1–6) where a topic key appears in GRADES */
export function minGradeForTopicKey(topicKey) {
  let min = 99;
  for (const [gk, def] of Object.entries(GRADES)) {
    if (!def?.topics?.includes(topicKey)) continue;
    const n = Number(String(gk).replace("g", ""));
    if (Number.isFinite(n)) min = Math.min(min, n);
  }
  return min === 99 ? null : min;
}

/** @param {string} gradeKey */
export function maxGradeForTopicKey(topicKey) {
  let max = 0;
  for (const [gk, def] of Object.entries(GRADES)) {
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
export function assertGradeTopicsMatchPolicy(gradeKey) {
  const violations = [];
  const g = Number(String(gradeKey).replace("g", ""));
  const topics = GRADES[gradeKey]?.topics || [];
  for (const t of topics) {
    if (t === "mixed") continue;
    const min = minGradeForTopicKey(t);
    const max = maxGradeForTopicKey(t);
    if (min != null && g < min) {
      violations.push(`${gradeKey}: topic "${t}" listed before product minimum grade ${min}`);
    }
    if (max != null && g > max) {
      violations.push(`${gradeKey}: topic "${t}" listed after product maximum grade ${max}`);
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function assertAllGradesTopicPolicy() {
  /** @type {string[]} */
  const violations = [];
  for (const gk of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    violations.push(...assertGradeTopicsMatchPolicy(gk).violations);
  }
  return { ok: violations.length === 0, violations };
}
