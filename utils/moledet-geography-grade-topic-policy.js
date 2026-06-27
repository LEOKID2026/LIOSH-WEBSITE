/**
 * Moledet/Geography — GRADES topics vs data/moledet-geography-curriculum.js + curriculum map (moledet.bank.*).
 */
import * as moledetCurriculumModule from "../data/moledet-geography-curriculum.js";
const MOLEDET_GEOGRAPHY_GRADES =
  moledetCurriculumModule.default?.MOLEDET_GEOGRAPHY_GRADES ??
  moledetCurriculumModule.MOLEDET_GEOGRAPHY_GRADES;
import { GRADES as MG_UI_GRADES } from "./moledet-geography-constants.js";
import { findTopicPlacement } from "./curriculum-audit/israeli-primary-curriculum-map.js";

/** Bank topic id → normalized curriculum key (prefix match under moledet.bank). */
export const MOLEDET_GEO_TOPIC_TO_NORM = {
  homeland: "moledet.bank.homeland",
  community: "moledet.bank.community",
  citizenship: "moledet.bank.citizenship",
  geography: "moledet.bank.geography",
  values: "moledet.bank.values",
  maps: "moledet.bank.maps",
  mixed: "moledet.bank.mixed",
};

export function assertMoledetGeographyCurriculumTopicsMatchData() {
  /** @type {string[]} */
  const violations = [];
  for (const gk of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    const a = new Set(MOLEDET_GEOGRAPHY_GRADES[gk]?.topics || []);
    const b = new Set(MG_UI_GRADES[gk]?.topics || []);
    for (const t of a) {
      if (!b.has(t)) violations.push(`${gk}: curriculum lists topic "${t}" missing from GRADES[].topics (constants)`);
    }
    for (const t of b) {
      if (t !== "mixed" && !a.has(t))
        violations.push(`${gk}: GRADES[].topics lists "${t}" missing from MOLEDET_GEOGRAPHY_GRADES[].topics`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function assertMoledetGeographyTopicCurriculumPlacement(gradeKey) {
  const g = Number(String(gradeKey).replace(/\D/g, ""));
  const topics = MG_UI_GRADES[gradeKey]?.topics || [];
  /** @type {string[]} */
  const violations = [];
  for (const t of topics) {
    if (t === "mixed") continue;
    const nk = MOLEDET_GEO_TOPIC_TO_NORM[t];
    if (!nk) {
      violations.push(`${gradeKey}: unknown UI topic "${t}"`);
      continue;
    }
    const hit = findTopicPlacement("moledet-geography", g, nk);
    if (!hit) violations.push(`${gradeKey}: topic "${t}" (${nk}) has no curriculum map placement`);
  }
  return { ok: violations.length === 0, violations };
}

export function assertAllMoledetGeographyCurriculumPlacements() {
  /** @type {string[]} */
  const violations = [];
  for (const gk of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
    violations.push(...assertMoledetGeographyTopicCurriculumPlacement(gk).violations);
  }
  return { ok: violations.length === 0, violations };
}
