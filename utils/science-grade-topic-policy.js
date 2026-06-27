/**
 * Science — SCIENCE_GRADES[].topics consistency + conservative curriculum map placement.
 */

import * as scienceCurriculumModule from "../data/science-curriculum.js";
import { findTopicPlacement } from "./curriculum-audit/israeli-primary-curriculum-map.js";

/** tsx interop: named exports from data/ may appear on default only when loaded via QA scripts. */
const SCIENCE_GRADES =
  scienceCurriculumModule.SCIENCE_GRADES ??
  scienceCurriculumModule.default?.SCIENCE_GRADES;

/** Representative normalized keys for UI topic ids (prefix-match in curriculum map). */
export const SCIENCE_TOPIC_TO_REP_NORM = {
  body: "science.life_science_body",
  animals: "science.life_science_animals",
  plants: "science.life_science_plants",
  materials: "science.materials_matter",
  energy: "science.energy",
  earth_space: "science.earth_space_environment",
  environment: "science.earth_space_environment",
  experiments: "science.scientific_inquiry",
  ecosystems: "science.life_science_ecosystems",
  technology: "science.technology_applications",
};

export function minGradeForScienceTopicKey(topicKey) {
  let min = 99;
  for (const [gk, def] of Object.entries(SCIENCE_GRADES)) {
    if (!def?.topics?.includes(topicKey)) continue;
    const n = Number(String(gk).replace("g", ""));
    if (Number.isFinite(n)) min = Math.min(min, n);
  }
  return min === 99 ? null : min;
}

export function maxGradeForScienceTopicKey(topicKey) {
  let max = 0;
  for (const [gk, def] of Object.entries(SCIENCE_GRADES)) {
    if (!def?.topics?.includes(topicKey)) continue;
    const n = Number(String(gk).replace("g", ""));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max === 0 ? null : max;
}

export function assertScienceGradeTopicsMatchPolicy(gradeKey) {
  const violations = [];
  const g = Number(String(gradeKey).replace("g", ""));
  const topics = SCIENCE_GRADES[gradeKey]?.topics || [];
  for (const t of topics) {
    const min = minGradeForScienceTopicKey(t);
    const max = maxGradeForScienceTopicKey(t);
    if (min != null && g < min) {
      violations.push(`${gradeKey}: topic "${t}" listed before product minimum grade ${min}`);
    }
    if (max != null && g > max) {
      violations.push(`${gradeKey}: topic "${t}" listed after product maximum grade ${max}`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function assertAllScienceGradesTopicPolicy() {
  /** @type {string[]} */
  const violations = [];
  for (const gk of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    violations.push(...assertScienceGradeTopicsMatchPolicy(gk).violations);
  }
  return { ok: violations.length === 0, violations };
}

export function assertScienceTopicsCurriculumPlaced(gradeKey) {
  const g = Number(String(gradeKey).replace("g", ""));
  const topics = SCIENCE_GRADES[gradeKey]?.topics || [];
  /** @type {string[]} */
  const violations = [];
  for (const t of topics) {
    const nk = SCIENCE_TOPIC_TO_REP_NORM[t];
    if (!nk) {
      violations.push(`${gradeKey}: unknown topic key "${t}"`);
      continue;
    }
    const hit = findTopicPlacement("science", g, nk);
    if (!hit) violations.push(`${gradeKey}: topic "${t}" (${nk}) has no curriculum placement`);
    else if (hit.bucket === "notExpectedYet") {
      violations.push(`${gradeKey}: topic "${t}" (${nk}) is notExpectedYet in conservative map`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function assertAllScienceCurriculumPlacements() {
  /** @type {string[]} */
  const violations = [];
  for (const gk of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    violations.push(...assertScienceTopicsCurriculumPlaced(gk).violations);
  }
  return { ok: violations.length === 0, violations };
}
