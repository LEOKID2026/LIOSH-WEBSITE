export const CURRICULUM_SKILL_ENTITY_REGISTRY = Object.freeze({
  sci_body_fact_recall: Object.freeze({
    id: "sci_body_fact_recall",
    subjectId: "science",
    topicKey: "body",
    label: "Body-system fact recall",
    gradeKeys: Object.freeze(["g1", "g2"]),
    confidence: "high",
    evidenceSources: Object.freeze([
      "data/science-questions.js",
      "utils/question-metadata-qa/question-metadata-taxonomy.js",
    ]),
  }),
  sci_respiration_concept: Object.freeze({
    id: "sci_respiration_concept",
    subjectId: "science",
    topicKey: "body",
    label: "Respiration-system concept",
    gradeKeys: Object.freeze(["g3", "g4"]),
    confidence: "high",
    evidenceSources: Object.freeze([
      "data/science-questions.js",
      "utils/question-metadata-qa/question-metadata-taxonomy.js",
    ]),
  }),
  he_comp_explicit_detail: Object.freeze({
    id: "he_comp_explicit_detail",
    subjectId: "hebrew",
    topicKey: "comprehension",
    label: "Explicit detail comprehension",
    gradeKeys: Object.freeze(["g3", "g4"]),
    confidence: "high",
    evidenceSources: Object.freeze([
      "utils/hebrew-rich-question-bank.js",
      "utils/question-metadata-qa/question-metadata-taxonomy.js",
    ]),
  }),
  he_comp_inference_intro: Object.freeze({
    id: "he_comp_inference_intro",
    subjectId: "hebrew",
    topicKey: "comprehension",
    label: "Introductory reading inference",
    gradeKeys: Object.freeze(["g3", "g4"]),
    confidence: "high",
    evidenceSources: Object.freeze([
      "utils/hebrew-rich-question-bank.js",
      "utils/question-metadata-qa/question-metadata-taxonomy.js",
    ]),
  }),
  geo_pv_area_vs_perimeter: Object.freeze({
    id: "geo_pv_area_vs_perimeter",
    subjectId: "geometry",
    topicKey: "area",
    label: "Distinguish area from perimeter",
    gradeBands: Object.freeze(["mid", "late"]),
    confidence: "high",
    evidenceSources: Object.freeze([
      "utils/geometry-conceptual-bank.js",
      "utils/question-metadata-qa/question-metadata-taxonomy.js",
    ]),
  }),
  geo_rect_area_plan: Object.freeze({
    id: "geo_rect_area_plan",
    subjectId: "geometry",
    topicKey: "area",
    label: "Rectangle area planning",
    gradeBands: Object.freeze(["mid", "late"]),
    confidence: "high",
    evidenceSources: Object.freeze([
      "utils/geometry-conceptual-bank.js",
      "utils/question-metadata-qa/question-metadata-taxonomy.js",
    ]),
  }),
  tri_sum_180: Object.freeze({
    id: "tri_sum_180",
    subjectId: "geometry",
    topicKey: "angles",
    label: "Triangle interior-angle sum",
    gradeBands: Object.freeze(["mid"]),
    confidence: "high",
    evidenceSources: Object.freeze([
      "utils/geometry-conceptual-bank.js",
      "utils/question-metadata-qa/question-metadata-taxonomy.js",
    ]),
  }),
  geo_angle_measure: Object.freeze({
    id: "geo_angle_measure",
    subjectId: "geometry",
    topicKey: "angles",
    label: "Angle measurement and inference",
    gradeBands: Object.freeze(["late"]),
    confidence: "high",
    evidenceSources: Object.freeze([
      "utils/geometry-conceptual-bank.js",
      "utils/question-metadata-qa/question-metadata-taxonomy.js",
    ]),
  }),
});

export const CURRICULUM_PREREQUISITE_RELATIONS = Object.freeze([
  Object.freeze({
    subjectId: "science",
    targetSkillId: "sci_respiration_concept",
    prerequisiteSkillId: "sci_body_fact_recall",
    applicableSubskillIds: Object.freeze([
      "sci_body_general",
      "sci_body_g3_authored",
    ]),
    precision: "exact_skill",
    confidence: "high",
    evidenceSource: "data/science-questions.js",
  }),
  Object.freeze({
    subjectId: "hebrew",
    targetSkillId: "he_comp_inference_intro",
    prerequisiteSkillId: "he_comp_explicit_detail",
    applicableSubskillIds: Object.freeze(["implied"]),
    precision: "exact_skill",
    confidence: "high",
    evidenceSource: "utils/hebrew-rich-question-bank.js",
  }),
  Object.freeze({
    subjectId: "geometry",
    targetSkillId: "geo_rect_area_plan",
    prerequisiteSkillId: "geo_pv_area_vs_perimeter",
    applicableSubskillIds: Object.freeze([
      "area_rectangle",
      "area_rectangle_site",
    ]),
    precision: "exact_skill",
    confidence: "high",
    evidenceSource: "utils/geometry-conceptual-bank.js",
  }),
  Object.freeze({
    subjectId: "geometry",
    targetSkillId: "geo_angle_measure",
    prerequisiteSkillId: "tri_sum_180",
    applicableSubskillIds: Object.freeze(["inference_reasoning"]),
    precision: "exact_skill",
    confidence: "high",
    evidenceSource: "utils/geometry-conceptual-bank.js",
  }),
]);

export function curriculumSkillEntity(id) {
  return CURRICULUM_SKILL_ENTITY_REGISTRY[String(id || "").trim()] || null;
}

export function isRegisteredCurriculumSkill(id, subjectId = null) {
  const entity = curriculumSkillEntity(id);
  if (!entity) return false;
  return !subjectId || entity.subjectId === String(subjectId);
}

export function prerequisiteRelationsForSkill(
  subjectId,
  targetSkillId,
  subskillId = null,
) {
  return CURRICULUM_PREREQUISITE_RELATIONS.filter(
    (relation) =>
      relation.subjectId === String(subjectId || "") &&
      relation.targetSkillId === String(targetSkillId || "") &&
      (!subskillId ||
        !Array.isArray(relation.applicableSubskillIds) ||
        relation.applicableSubskillIds.includes(String(subskillId))),
  );
}
