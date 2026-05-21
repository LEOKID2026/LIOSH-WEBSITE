#!/usr/bin/env node
/**
 * Builds data/science-questions-metadata-pass1-enrich.js for 14 remaining Science weak cells.
 * Run: node scripts/gen-science-metadata-pass1.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "science-questions-metadata-pass1-enrich.js");

const WEAK_CELLS = new Set([
  "g1:animals:easy",
  "g1:body:easy",
  "g1:plants:easy",
  "g2:animals:easy",
  "g2:body:easy",
  "g2:plants:easy",
  "g3:animals:medium",
  "g3:experiments:medium",
  "g3:plants:medium",
  "g4:animals:medium",
  "g4:body:medium",
  "g4:experiments:medium",
  "g5:experiments:hard",
  "g6:experiments:hard",
]);

const FAMILY_ERROR_TAGS = {
  animals_mammal_groups: ["mammal_group_confusion", "fact_recall_gap"],
  animals_aquatic_adaptation: ["habitat_adaptation_confusion", "fact_recall_gap"],
  animals_reptile_traits: ["vertebrate_group_confusion", "fact_recall_gap"],
  animals_bird_traits: ["vertebrate_group_confusion", "fact_recall_gap"],
  animals_life_cycle: ["life_cycle_order_confusion", "cause_effect_gap"],
  animals_food_chain: ["food_chain_direction_confusion", "cause_effect_gap"],
  animals_habitat_adaptation: ["habitat_adaptation_confusion", "cause_effect_gap"],
  animals_classification_groups: ["classification_confusion", "fact_recall_gap"],
  animals_life_processes: ["life_process_confusion", "fact_recall_gap"],
  plants_light_photosynthesis: ["photosynthesis_confusion", "cause_effect_gap"],
  plants_structure_parts: ["plant_part_function_confusion", "fact_recall_gap"],
  plants_water_needs: ["plant_needs_confusion", "fact_recall_gap"],
  plants_air_needs: ["plant_needs_confusion", "fact_recall_gap"],
  plants_growth_needs: ["plant_growth_confusion", "fact_recall_gap"],
  plants_structure: ["plant_part_function_confusion", "fact_recall_gap"],
  experiments_fair_test: ["variable_control_confusion", "strategy_error"],
  experiments_hypothesis: ["hypothesis_conclusion_confusion", "strategy_error"],
  experiments_measurement: ["measurement_tool_confusion", "strategy_error"],
  experiments_lab_safety: ["lab_safety_gap", "strategy_error"],
  experiments_data_recording: ["data_recording_gap", "strategy_error"],
  experiments_evidence_conclusion: ["evidence_conclusion_gap", "cause_effect_gap"],
  experiments_control_group: ["control_group_confusion", "strategy_error"],
  experiments_observation_inference: ["observation_inference_gap", "reading_comprehension_error"],
  experiments_scientific_method: ["method_step_confusion", "strategy_error"],
  experiments_earth_cycles: ["earth_cycle_confusion", "concept_confusion"],
  body_respiration: ["respiration_system_confusion", "cause_effect_gap"],
  body_circulation: ["circulation_confusion", "cause_effect_gap"],
  body_digestion: ["digestion_system_confusion", "organ_system_confusion"],
  body_skeleton_muscles: ["structure_function_confusion", "fact_recall_gap"],
  body_senses: ["sense_organ_confusion", "fact_recall_gap"],
  body_excretory: ["excretory_system_confusion", "organ_system_confusion"],
  body_nervous: ["nervous_system_confusion", "system_role_confusion"],
  body_systems_basic: ["organ_system_confusion", "fact_recall_gap"],
};

function inWeakCell(q) {
  for (const g of q.grades || []) {
    const lv = q.minLevel || q.maxLevel || "medium";
    if (WEAK_CELLS.has(`${g}:${q.topic}:${lv}`)) return true;
  }
  return false;
}

function resolveAnimals(stem, patternFamily) {
  const s = stem;
  if (/יונק|חלב|מינק/.test(s))
    return { skill: "sci_animals_mammal_groups", concept: "mammal_classification", family: "animals_mammal_groups" };
  if (/דג|סנפיר|זימ|מים/.test(s))
    return { skill: "sci_animals_aquatic_adaptation", concept: "fish_water_adaptation", family: "animals_aquatic_adaptation" };
  if (/זוחל|קשקש/.test(s))
    return { skill: "sci_animals_reptile_traits", concept: "reptile_traits", family: "animals_reptile_traits" };
  if (/עוף|נוצ|תרנגול|אייג/.test(s))
    return { skill: "sci_animals_bird_traits", concept: "bird_traits", family: "animals_bird_traits" };
  if (/מחזור|זחל|גולם|ביצה.*פרפר|פרפר/.test(s))
    return { skill: "sci_animals_life_cycle", concept: "animal_life_cycle", family: "animals_life_cycle" };
  if (/טורף|טרף|שרשרת מזון|אוכל.*בשר|צמחוני|טורפ/.test(s))
    return { skill: "sci_animals_food_chain", concept: "food_chain_roles", family: "animals_food_chain" };
  if (/מדבר|התאמה|הסוואה|בית גידול|גמל/.test(s))
    return { skill: "sci_animals_habitat_adaptation", concept: "habitat_adaptation", family: "animals_habitat_adaptation" };
  if (patternFamily === "sci_animals_life_processes")
    return { skill: "sci_animals_life_processes", concept: "animal_life_process", family: "animals_life_processes" };
  return {
    skill: "sci_animals_classification_groups",
    concept: "animal_grouping",
    family: "animals_classification_groups",
  };
}

function resolvePlants(stem, patternFamily) {
  const s = stem;
  if (/שמש|אור|צל/.test(s))
    return { skill: "sci_plants_light_photosynthesis", concept: "light_and_plants", family: "plants_light_photosynthesis" };
  if (/שורש|גזע|עלה|פרח|זרע|גבעול/.test(s))
    return {
      skill: patternFamily === "sci_plants_parts" ? "sci_plants_structure" : "sci_plants_structure",
      concept: "plant_parts_roles",
      family: "plants_structure_parts",
    };
  if (/מים|השקיה|לחות/.test(s))
    return { skill: "sci_plants_water_needs", concept: "plant_water_needs", family: "plants_water_needs" };
  if (/אוויר|אויר/.test(s))
    return { skill: "sci_plants_air_needs", concept: "plant_air_needs", family: "plants_air_needs" };
  if (patternFamily === "sci_plants_parts")
    return { skill: "sci_plants_structure", concept: "plant_parts", family: "plants_structure" };
  return { skill: "sci_plants_growth_needs", concept: "plant_growth_needs", family: "plants_growth_needs" };
}

function resolveExperiments(stem, patternFamily) {
  const s = stem;
  if (patternFamily === "sci_experiments_observation_inference" || /תצפית/.test(s))
    return {
      skill: "sci_experiments_observation_inference",
      concept: "observation_inference",
      family: "experiments_observation_inference",
    };
  if (patternFamily === "sci_earth_space_cycles" || /יום ולילה|עונות|מחזור/.test(s))
    return { skill: "sci_experiments_earth_cycles", concept: "earth_cycle_observation", family: "experiments_earth_cycles" };
  if (/משתנה|משתנ|בודד/.test(s))
    return { skill: "sci_experiments_fair_test", concept: "controlled_variable", family: "experiments_fair_test" };
  if (/השערה/.test(s))
    return { skill: "sci_experiments_hypothesis", concept: "testable_hypothesis", family: "experiments_hypothesis" };
  if (/מדיד|סרגל|משקל|שעון|יחידות/.test(s))
    return { skill: "sci_experiments_measurement", concept: "measurement_tools", family: "experiments_measurement" };
  if (/בטיח|מסוכן|לא לטעום/.test(s))
    return { skill: "sci_experiments_lab_safety", concept: "lab_safety_rules", family: "experiments_lab_safety" };
  if (/טבלה|רישום|תיעוד|יומן/.test(s))
    return { skill: "sci_experiments_data_recording", concept: "experiment_recording", family: "experiments_data_recording" };
  if (/מסקנה|ראיות|נתונים/.test(s))
    return { skill: "sci_experiments_evidence_conclusion", concept: "data_based_conclusion", family: "experiments_evidence_conclusion" };
  if (/ביקורת|קבוצת ביקורת|השוואה/.test(s))
    return { skill: "sci_experiments_control_group", concept: "control_comparison", family: "experiments_control_group" };
  return { skill: "sci_experiments_scientific_method", concept: "scientific_method_step", family: "experiments_scientific_method" };
}

function resolveBody(stem) {
  const s = stem;
  if (/ריאות|נשימ|חמצן|פחמן דו|פחמן-דו|אוויר/.test(s))
    return { skill: "sci_respiration_concept", concept: "respiration_gas_exchange", family: "body_respiration", probePower: "high" };
  if (/לב|דם|דופק|עורק|וריד/.test(s))
    return { skill: "sci_body_circulation", concept: "heart_blood_circulation", family: "body_circulation" };
  if (/עיכול|קיבה|מעי|מזון|רוק|לעיס|בליעה|כבד/.test(s))
    return { skill: "sci_body_digestion", concept: "digestion_pathway", family: "body_digestion" };
  if (/עצם|שלד|שריר|מפרק|סידן/.test(s))
    return { skill: "sci_body_skeleton_muscles", concept: "skeleton_muscles_role", family: "body_skeleton_muscles" };
  if (/עור|חוש|עין|אוזן|אף|לשון|ראייה|שמיע|מישוש/.test(s))
    return { skill: "sci_body_senses", concept: "senses_and_skin", family: "body_senses" };
  if (/כליה|פסולת|שתן|הפרשה/.test(s))
    return { skill: "sci_body_excretory", concept: "excretory_filtration", family: "body_excretory" };
  if (/עצב|מוח|חוט שדרה|רפלקס/.test(s))
    return { skill: "sci_body_nervous", concept: "nervous_coordination", family: "body_nervous" };
  return { skill: "sci_body_systems_basic", concept: "body_system_role", family: "body_systems_basic" };
}

function buildMeta(q) {
  const p = q.params || {};
  if (p.diagnosticSkillId) return null;
  const stem = q.stem || "";
  const pf = p.patternFamily || "";
  let resolved;
  if (q.topic === "animals") resolved = resolveAnimals(stem, pf);
  else if (q.topic === "plants") resolved = resolvePlants(stem, pf);
  else if (q.topic === "experiments") resolved = resolveExperiments(stem, pf);
  else if (q.topic === "body") resolved = resolveBody(stem);
  else return null;

  const familyTags = FAMILY_ERROR_TAGS[resolved.family] || ["fact_recall_gap"];
  const expectedErrorTags = [resolved.concept, ...familyTags];
  const meta = {
    conceptTag: resolved.concept,
    diagnosticSkillId: resolved.skill,
    expectedErrorTags,
    expectedErrorTypes: expectedErrorTags,
  };
  if (resolved.probePower) meta.probePower = resolved.probePower;
  return meta;
}

async function main() {
  const { SCIENCE_QUESTIONS } = await import(
    new URL("../data/science-questions.js", import.meta.url).href
  );

  /** @type {Record<string, object>} */
  const byId = {};
  for (const q of SCIENCE_QUESTIONS) {
    if (!inWeakCell(q)) continue;
    const patch = buildMeta(q);
    if (!patch) continue;
    byId[q.id] = patch;
  }

  const ids = Object.keys(byId);
  if (ids.length < 140) {
    console.error(`Expected ~150 patches, got ${ids.length}`);
    process.exit(1);
  }

  const body = `/**
 * Science diagnostic metadata — Pass 1 (14 weak cells). Generated by scripts/gen-science-metadata-pass1.mjs
 * Applied in data/science-questions.js — do not hand-edit.
 */
export const SCIENCE_PASS1_METADATA_BY_ID = ${JSON.stringify(byId, null, 2)};

export function applyPass1ScienceMetadata(question) {
  const patch = SCIENCE_PASS1_METADATA_BY_ID[question.id];
  if (!patch) return question;
  const params = { ...(question.params || {}), ...patch };
  return { ...question, params };
}
`;
  writeFileSync(OUT, body, "utf8");
  console.log(`Wrote ${ids.length} metadata patches to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
