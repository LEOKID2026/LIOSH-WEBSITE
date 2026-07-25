/**
 * Science diagnostics — exact TEPs (experiment variables, units, concept slots).
 * Structural edit-distance only after exact under spelling gate; far wrongs → null (0 FP).
 */

import {
  asNormHumanitiesList,
  collectWrongForms,
  humanitiesEditDistance,
  humanitiesHit,
  isHumanitiesSpellingGate,
  matchesConfusionPair,
  normalizeHumanitiesText,
  resolveListedTag,
} from "./fuzzy-tolerance-humanities-shared.js";

/** @type {Record<string, string>} */
export const SCIENCE_PATTERN_TO_TAG = Object.freeze({
  science_experiment: "variable_control_error",
  science_body_heart_location: "body_system_confusion",
  science_body_sense_organs: "body_system_confusion",
  science_respiratory_gas_exchange: "body_system_confusion",
  sci_body_systems: "body_system_confusion",
  sci_animals_classification: "animal_classification_error",
  science_classification: "classification_error",
  sci_environment_ecosystems: "ecosystem_confusion",
  science_ecosystem: "environment_error",
  sci_materials_properties: "material_property_error",
  science_materials: "material_property_error",
  sci_earth_space_cycles: "planet_confusion",
  science_earth: "earth_space_error",
  sci_plants_growth: "concept_confusion",
  science_measurement: "material_property_error",
});

function scienceGateBlob(p) {
  return [
    p?.patternFamily,
    p?.kind,
    p?.topic,
    p?.conceptTag,
    p?.diagnosticSkillId,
    ...(Array.isArray(p?.expectedErrorTags) ? p.expectedErrorTags : []),
  ]
    .map((x) => String(x || "").toLowerCase())
    .join(" ");
}

/**
 * Scientific method / variable control: listed wrong IV/DV / controls.
 * @param {object} p
 */
export function proveScienceVariableControl(p) {
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const blob = scienceGateBlob(p);
  const experimentGate =
    blob.includes("experiment") ||
    blob.includes("variable") ||
    blob.includes("control") ||
    Array.isArray(p?.wrongVariableAnswers) ||
    Array.isArray(p?.wrongForms);
  if (!experimentGate) return null;
  if (
    !blob.includes("experiment") &&
    !blob.includes("variable") &&
    !blob.includes("control") &&
    !Array.isArray(p?.wrongVariableAnswers)
  ) {
    // bare wrongForms without experiment cue → not this TEP
    return null;
  }

  const wrong = [
    ...asNormHumanitiesList(p?.wrongVariableAnswers),
    ...collectWrongForms(p, expected),
  ];
  if (!wrong.includes(user) && !matchesConfusionPair(p, user, expected)) return null;

  return humanitiesHit(
    resolveListedTag(p, "variable_control_error", SCIENCE_PATTERN_TO_TAG),
    { user, expected, mode: "variable_control_slot" },
    "science_exact:variable_control_error",
    0.92,
  );
}

/**
 * Unit / measurement confusion: explicit unitConfusionPair or unit-gated wrongForms.
 * @param {object} p
 */
export function proveScienceUnitConfusion(p) {
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const blob = scienceGateBlob(p);
  const unitGate =
    blob.includes("unit") ||
    blob.includes("measure") ||
    Array.isArray(p?.unitConfusionPair);
  if (!unitGate) return null;

  const listed =
    matchesConfusionPair(p, user, expected) ||
    (collectWrongForms(p, expected).includes(user) &&
      (blob.includes("unit") || blob.includes("measure") || Array.isArray(p?.unitConfusionPair)));
  if (!listed) return null;

  return humanitiesHit(
    resolveListedTag(p, "material_property_error", SCIENCE_PATTERN_TO_TAG),
    { user, expected, mode: "unit_confusion_pair" },
    "science_exact:unit_confusion",
    0.9,
  );
}

/**
 * Concept / classification / body / ecosystem slot from explicit lists.
 * @param {object} p
 */
export function proveScienceConceptSlot(p) {
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const hasList =
    matchesConfusionPair(p, user, expected) ||
    collectWrongForms(p, expected).includes(user) ||
    asNormHumanitiesList(p?.knownMisconceptions).includes(user);
  if (!hasList) return null;

  const blob = scienceGateBlob(p);
  const hasCue =
    blob.length > 0 ||
    Array.isArray(p?.wrongForms) ||
    Array.isArray(p?.confusionPair) ||
    Array.isArray(p?.expectedErrorTags) ||
    Array.isArray(p?.knownMisconceptions);
  if (!hasCue) return null;

  const tag = resolveListedTag(p, "concept_confusion", SCIENCE_PATTERN_TO_TAG);
  return humanitiesHit(
    tag,
    { user, expected, mode: "concept_slot", tag },
    `science_exact:${tag}`,
    0.9,
  );
}

/**
 * Structural spelling for typed science labels only.
 * @param {object} p
 */
export function proveScienceSpellingStructural(p) {
  if (!isHumanitiesSpellingGate(p)) return null;
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer ?? p?.expectedWord);
  if (!user || !expected || user === expected) return null;
  const dist = humanitiesEditDistance(user, expected);
  const len = Math.max(user.length, expected.length);
  if (dist === 1 && len >= 2 && len <= 24) {
    return humanitiesHit(
      "concept_confusion",
      { user, expected, editDistance: dist, tier: "structural" },
      "science_structural:concept_confusion",
      0.82,
    );
  }
  return null;
}

/**
 * @param {object} p
 */
export function classifyScienceAnswer(p) {
  const exact = [proveScienceVariableControl, proveScienceUnitConfusion, proveScienceConceptSlot];
  for (const fn of exact) {
    const r = fn(p);
    if (r) return r;
  }
  return proveScienceSpellingStructural(p);
}
