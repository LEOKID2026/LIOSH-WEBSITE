/**
 * Moledet/Geography grade gates — oracle G1 = not_in_grade; teaching starts G2.
 */
import { parseGradeKey } from "./grade-gating.js";

/** Official MoE moledet/geography band begins grade 2 (oracle: moledet.g1.official_status not_in_grade). */
export const MOLEDET_GEOGRAPHY_MIN_TEACH_GRADE = 2;

/**
 * @param {string|number|null|undefined} gradeLevel
 * @returns {number|null} 1–6 or null when unknown
 */
export function parseMoledetGeographyGateGrade(gradeLevel) {
  if (gradeLevel == null || gradeLevel === "") return null;
  const fromKey = parseGradeKey(gradeLevel);
  if (fromKey != null) return fromKey;
  if (typeof gradeLevel === "number" && gradeLevel >= 1 && gradeLevel <= 6) {
    return gradeLevel;
  }
  const s = String(gradeLevel).trim().toLowerCase();
  if (/^grade_[1-6]$/.test(s)) return parseInt(s.replace("grade_", ""), 10);
  const m = s.match(/\b([1-6])\b/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * When grade is unknown, do not gate (fail open). Gate only when grade is known and below minimum.
 * @param {string|number|null|undefined} gradeLevel
 * @returns {boolean}
 */
export function isMoledetGeographyGradeAllowed(gradeLevel) {
  const n = parseMoledetGeographyGateGrade(gradeLevel);
  if (n == null) return true;
  return n >= MOLEDET_GEOGRAPHY_MIN_TEACH_GRADE;
}

/**
 * @param {number} gradeNumber 1–6
 * @returns {number} clamped teach grade (min 2 when gated)
 */
export function clampMoledetGeographyGradeNumber(gradeNumber) {
  const n = Number(gradeNumber);
  if (!Number.isFinite(n)) return MOLEDET_GEOGRAPHY_MIN_TEACH_GRADE;
  if (n < MOLEDET_GEOGRAPHY_MIN_TEACH_GRADE) return MOLEDET_GEOGRAPHY_MIN_TEACH_GRADE;
  if (n > 6) return 6;
  return n;
}

/**
 * @param {string|null|undefined} gradeKey e.g. g1
 * @returns {string|null}
 */
export function clampMoledetGeographyGradeKey(gradeKey) {
  const n = parseMoledetGeographyGateGrade(gradeKey);
  if (n == null) return gradeKey ?? null;
  return `g${clampMoledetGeographyGradeNumber(n)}`;
}
