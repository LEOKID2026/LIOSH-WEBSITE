/**
 * Pass-1-style metadata for legacy Science rows that became DIAGNOSTIC_WEAK after NEEDS_MORE closure.
 * Applied via applyPass1ScienceMetadata in science-questions-metadata-pass1-enrich.js
 */
export const SCIENCE_DIAGNOSTIC_WEAK_CLOSURE_BY_ID = {
  exp_5: {
    conceptTag: "experiment_planning_safety",
    diagnosticSkillId: "sci_experiments_planning",
    expectedErrorTags: ["experiment_planning_safety", "procedure_order_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["experiment_planning_safety", "procedure_order_confusion", "fact_recall_gap"],
  },
  plants_5: {
    conceptTag: "stomata_gas_exchange",
    diagnosticSkillId: "sci_plants_stomata_role",
    expectedErrorTags: ["stomata_gas_exchange", "leaf_structure_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["stomata_gas_exchange", "leaf_structure_confusion", "fact_recall_gap"],
  },
  plants_13: {
    conceptTag: "plant_pollination",
    diagnosticSkillId: "sci_plants_pollination",
    expectedErrorTags: ["plant_pollination", "flower_function_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["plant_pollination", "flower_function_confusion", "fact_recall_gap"],
  },
  plants_14: {
    conceptTag: "seed_dispersal",
    diagnosticSkillId: "sci_plants_seed_dispersal",
    expectedErrorTags: ["seed_dispersal", "plant_reproduction_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["seed_dispersal", "plant_reproduction_confusion", "fact_recall_gap"],
  },
  plants_15: {
    conceptTag: "photosynthesis_inputs",
    diagnosticSkillId: "sci_plants_photosynthesis_needs",
    expectedErrorTags: ["photosynthesis_inputs", "plant_growth_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["photosynthesis_inputs", "plant_growth_confusion", "fact_recall_gap"],
  },
  body_5: {
    conceptTag: "circulatory_system_role",
    diagnosticSkillId: "sci_body_circulatory_system",
    expectedErrorTags: ["circulatory_system_role", "body_system_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["circulatory_system_role", "body_system_confusion", "fact_recall_gap"],
  },
  animals_4: {
    conceptTag: "food_chain_sequence",
    diagnosticSkillId: "sci_animals_food_chain",
    expectedErrorTags: ["food_chain_sequence", "ecosystem_relation_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["food_chain_sequence", "ecosystem_relation_confusion", "fact_recall_gap"],
  },
  science_remaining_g56_easy_body: {
    conceptTag: "body_system_overview",
    diagnosticSkillId: "sci_body_system_overview",
    expectedErrorTags: ["body_system_overview", "structure_function_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["body_system_overview", "structure_function_confusion", "fact_recall_gap"],
  },
  p4b1_g6_body_001: {
    conceptTag: "respiratory_gas_exchange",
    diagnosticSkillId: "sci_body_respiratory_role",
    expectedErrorTags: ["respiratory_gas_exchange", "body_system_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["respiratory_gas_exchange", "body_system_confusion", "fact_recall_gap"],
  },
  p4b1_g6_body_002: {
    conceptTag: "digestive_system_role",
    diagnosticSkillId: "sci_body_digestive_role",
    expectedErrorTags: ["digestive_system_role", "body_system_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["digestive_system_role", "body_system_confusion", "fact_recall_gap"],
  },
  p4b1_g6_body_003: {
    conceptTag: "skeletal_support",
    diagnosticSkillId: "sci_body_skeletal_support",
    expectedErrorTags: ["skeletal_support", "structure_function_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["skeletal_support", "structure_function_confusion", "fact_recall_gap"],
  },
  exp_3: {
    conceptTag: "experiment_variable_control",
    diagnosticSkillId: "sci_experiments_variable_control",
    expectedErrorTags: ["experiment_variable_control", "procedure_order_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["experiment_variable_control", "procedure_order_confusion", "fact_recall_gap"],
  },
  exp_29: {
    conceptTag: "experiment_data_recording",
    diagnosticSkillId: "sci_experiments_data_recording",
    expectedErrorTags: ["experiment_data_recording", "procedure_order_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["experiment_data_recording", "procedure_order_confusion", "fact_recall_gap"],
  },
  exp_34: {
    conceptTag: "experiment_safety_rules",
    diagnosticSkillId: "sci_experiments_safety_rules",
    expectedErrorTags: ["experiment_safety_rules", "procedure_order_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["experiment_safety_rules", "procedure_order_confusion", "fact_recall_gap"],
  },
  animals_gapfix_easy_g456: {
    conceptTag: "animal_grouping_easy",
    diagnosticSkillId: "sci_animals_grouping_easy",
    expectedErrorTags: ["animal_grouping_easy", "classification_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["animal_grouping_easy", "classification_confusion", "fact_recall_gap"],
  },
  sci_pb1_g4_animals_easy_01: {
    conceptTag: "animal_habitat_easy",
    diagnosticSkillId: "sci_animals_habitat_easy",
    expectedErrorTags: ["animal_habitat_easy", "habitat_adaptation_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["animal_habitat_easy", "habitat_adaptation_confusion", "fact_recall_gap"],
  },
  science_remaining_g56_easy_experiments: {
    conceptTag: "experiment_observation_easy",
    diagnosticSkillId: "sci_experiments_observation_easy",
    expectedErrorTags: ["experiment_observation_easy", "procedure_order_confusion", "fact_recall_gap"],
    expectedErrorTypes: ["experiment_observation_easy", "procedure_order_confusion", "fact_recall_gap"],
  },
};
