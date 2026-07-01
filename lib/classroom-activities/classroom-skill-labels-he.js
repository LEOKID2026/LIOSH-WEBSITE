/**
 * Hebrew display labels for classroom activity diagnostic skill keys.
 * Teacher/school/student-facing surfaces must never show raw internal keys.
 */

import { hebrewFromEnglishSlug } from "../../utils/diagnostic-labels-he.js";
import { isTriangleAreaFormulaGradeAllowed } from "../../utils/geometry-curriculum-gates.js";
import { HISTORY_SKILL_LABEL_HE as HISTORY_CURRICULUM_SKILL_LABEL_HE } from "../../data/history-curriculum.js";

const HISTORY_SKILL_LABEL_HE = HISTORY_CURRICULUM_SKILL_LABEL_HE || {};

/** @type {Record<string, string>} */
export const GEO_DIAGNOSTIC_SKILL_LABEL_HE = {
  geo_angle_measure: "חישוב זוויות",
  geo_angle_right_identify: "זיהוי זווית ישרה",
  geo_angle_parallel_perpendicular: "מקבילות ומאונכות",
  geo_area_square_formula: "שטח ריבוע",
  geo_rect_area_plan: "שטח מלבן",
  geo_area_triangle_formula: "שטח משולש",
  geo_area_parallelogram_formula: "שטח מקבילית",
  geo_area_trapezoid_formula: "שטח טרפז",
  geo_area_circle_formula: "שטח מעגל",
  geo_perimeter_formula: "חישוב היקף",
  geo_pv_area_vs_perimeter: "היקף מול שטח",
  geo_volume_prism_formula: "נפח גוף",
  geo_volume_cylinder_formula: "נפח גליל",
  geo_volume_sphere_formula: "נפח כדור",
  geo_volume_pyramid_formula: "נפח פירמידה",
  geo_volume_cone_formula: "נפח כד",
  geo_volume_unit_reasoning: "יחידות נפח",
  geo_pythagoras_apply: "משפט פיתגורס",
  geo_shape_classification: "זיהוי צורות",
  geo_shape_properties: "תכונות צורות",
  geo_triangle_classify: "סיווג משולשים",
  geo_quad_classification: "סיווג מרובעים",
  geo_quad_properties: "תכונות מרובעים",
  geo_triangle_properties: "תכונות משולש",
  geo_symmetry_reflection: "סימטרייה",
  geo_symmetry_rotation: "סיבוב",
  geo_shape_diagonal: "אלכסון",
};

const SUBJECT_FALLBACK_HE = {
  geometry: "מיומנות בגאומטריה",
  math: "מיומנות בחשבון",
  english: "מיומנות באנגלית",
  hebrew: "מיומנות בעברית",
  science: "מיומנות במדעים",
  history: "מיומנות בהיסטוריה",
  moledet_geography: "מיומנות במולדת וגאוגרפיה",
  moledet_geography: "מיומנות במולדת וגאוגרפיה",
  general: "מיומנות לתרגול",
};

const SPECIAL_SKILL_KEY_HE = {
  general: "תרגול כללי",
};

const FORMULA_GATED_GEO_SKILL_KEYS = new Set(["geo_area_triangle_formula"]);

/**
 * Formula-specific labels require a known grade at G5+; unknown grade fails closed.
 * @param {string} skillKey
 * @param {string|number|null|undefined} gradeLevel
 */
function isFormulaGatedGeoSkillLabelAllowed(skillKey, gradeLevel) {
  if (!FORMULA_GATED_GEO_SKILL_KEYS.has(skillKey)) return true;
  return isTriangleAreaFormulaGradeAllowed(gradeLevel);
}

const RAW_INTERNAL_KEY_RE =
  /^(?:geo|sci|hist|math|hebrew|eng|mg|moledet)_[a-z0-9_]+$/i;

function hasHebrewLetters(value) {
  return /[\u0590-\u05FF]/.test(String(value || ""));
}

function normalizeSubject(subject) {
  return String(subject || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
}

function resolvePrefixedSkillLabelHe(skillKey, prefix, subjectFallback) {
  if (GEO_DIAGNOSTIC_SKILL_LABEL_HE[skillKey]) {
    return GEO_DIAGNOSTIC_SKILL_LABEL_HE[skillKey];
  }
  const tail = skillKey.slice(prefix.length);
  const fromSlug = hebrewFromEnglishSlug(tail);
  if (fromSlug && hasHebrewLetters(fromSlug)) return fromSlug;
  return subjectFallback;
}

/**
 * @param {string|null|undefined} skillKey
 * @param {{ subject?: string|null, gradeLevel?: string|number|null }} [options]
 * @returns {string}
 */
export function resolveClassroomSkillLabelHe(skillKey, options = {}) {
  const key = String(skillKey || "").trim();
  if (!key) return SUBJECT_FALLBACK_HE.general;

  if (SPECIAL_SKILL_KEY_HE[key]) return SPECIAL_SKILL_KEY_HE[key];

  const gradeLevel = options.gradeLevel ?? null;

  if (GEO_DIAGNOSTIC_SKILL_LABEL_HE[key]) {
    if (!isFormulaGatedGeoSkillLabelAllowed(key, gradeLevel)) {
      return SUBJECT_FALLBACK_HE.geometry;
    }
    return GEO_DIAGNOSTIC_SKILL_LABEL_HE[key];
  }

  const subject = normalizeSubject(options.subject);

  if (key.startsWith("geo_")) {
    if (!isFormulaGatedGeoSkillLabelAllowed(key, gradeLevel)) {
      return SUBJECT_FALLBACK_HE.geometry;
    }
    return resolvePrefixedSkillLabelHe(
      key,
      "geo_",
      SUBJECT_FALLBACK_HE.geometry
    );
  }

  if (key.startsWith("sci_")) {
    return resolvePrefixedSkillLabelHe(key, "sci_", SUBJECT_FALLBACK_HE.science);
  }

  if (HISTORY_SKILL_LABEL_HE[key]) {
    return HISTORY_SKILL_LABEL_HE[key];
  }

  if (key.startsWith("hist_")) {
    return resolvePrefixedSkillLabelHe(key, "hist_", SUBJECT_FALLBACK_HE.history);
  }

  if (key.startsWith("math_")) {
    return resolvePrefixedSkillLabelHe(key, "math_", SUBJECT_FALLBACK_HE.math);
  }

  if (key.startsWith("hebrew_")) {
    return resolvePrefixedSkillLabelHe(key, "hebrew_", SUBJECT_FALLBACK_HE.hebrew);
  }

  if (key.startsWith("moledet_geo_") || key.startsWith("mg_")) {
    return resolvePrefixedSkillLabelHe(
      key,
      key.startsWith("moledet_geo_") ? "moledet_geo_" : "mg_",
      SUBJECT_FALLBACK_HE.moledet_geography
    );
  }

  const fromSlug = hebrewFromEnglishSlug(key);
  if (fromSlug && hasHebrewLetters(fromSlug)) return fromSlug;

  if (SUBJECT_FALLBACK_HE[subject]) return SUBJECT_FALLBACK_HE[subject];

  if (RAW_INTERNAL_KEY_RE.test(key)) return SUBJECT_FALLBACK_HE.general;

  if (/^[a-z][a-z0-9_]*$/i.test(key) && !hasHebrewLetters(key)) {
    return SUBJECT_FALLBACK_HE.general;
  }

  return hasHebrewLetters(key) ? key : SUBJECT_FALLBACK_HE.general;
}

/**
 * True when a string looks like an unresolved internal diagnostic key.
 * @param {string|null|undefined} value
 */
export function looksLikeRawInternalSkillKey(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  return RAW_INTERNAL_KEY_RE.test(s);
}

/**
 * @param {Array<{ skillKey?: string, accuracyPct?: number, answers?: number, correct?: number }>} weakSkills
 * @param {string|null|undefined} subject
 * @param {{ gradeLevel?: string|number|null }} [options]
 */
export function decorateWeakSkillsForTeacherDisplay(weakSkills, subject, options = {}) {
  const gradeLevel = options.gradeLevel ?? null;
  return (weakSkills || []).map((row) => {
    const skillKey = String(row.skillKey || "general");
    const skillLabelHe = resolveClassroomSkillLabelHe(skillKey, { subject, gradeLevel });
    return {
      ...row,
      skillKey,
      skillLabelHe,
    };
  });
}
