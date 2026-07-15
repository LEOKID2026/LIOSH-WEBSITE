/**
 * Professional Diagnostic Framework V1 (internal, educational support only).
 * Enriches diagnosticEngineV2 units — does not replace the engine.
 *
 * No clinical or medical claims. Language is educational and cautious.
 */
import { mathReportBaseOperationKey } from "../math-report-generator.js";

export const PROFESSIONAL_FRAMEWORK_V1 = {
  version: "1.1.0",
  name: "Professional Diagnostic Framework V1",
  supportedSubjectIds: /** @type {const} */ ([
    "math",
    "hebrew",
    "english",
    "science",
    "geometry",
    "moledet-geography",
  ]),
  evidenceLevelEnum: /** @type {const} */ (["none", "thin", "limited", "medium", "strong"]),
  confidenceEnum: /** @type {const} */ (["very_low", "low", "medium", "high"]),
  recommendationTypeEnum: /** @type {const} */ ([
    "continue_current_level",
    "advance_cautiously",
    "targeted_practice",
    "review_foundation",
    "collect_more_data",
    "slow_down_and_check",
    "teacher_review_recommended",
    "professional_review_consideration",
  ]),
  bannedConclusionPhrases: [
    "dyslexia",
    "dyscalculia",
    "adhd",
    "learning disability",
    "קושי למידה קליני",
    "אבחון רפואי",
    "אבחון קליני",
  ],
};

/** @type {Record<string, Record<string, { label: string, subskills: string[] }>>} */
export const SKILL_PACK_BY_SUBJECT_ID = {
  math: {
    arithmetic_operations: {
      label: "Arithmetic / operations",
      subskills: ["addition", "subtraction", "multiplication", "division", "order_of_operations"],
    },
    fractions: {
      label: "Fractions",
      subskills: [
        "numerator_denominator_understanding",
        "compare_fractions",
        "unlike_denominators",
        "equivalent_fractions",
        "add_fractions",
        "subtract_fractions",
        "simplify_fractions",
        "mixed_numbers",
        "fraction_word_problems",
      ],
    },
    word_problems: {
      label: "Word problems",
      subskills: [
        "identify_operation_from_text",
        "translate_text_to_equation",
        "multi_step_reasoning",
        "irrelevant_information",
        "reading_the_question",
      ],
    },
    number_sense: {
      label: "Place value / number sense",
      subskills: ["place_value", "rounding", "estimation", "number_line_reasoning"],
    },
  },
  hebrew: {
    reading_comprehension: {
      label: "Reading comprehension",
      subskills: [
        "explicit_information",
        "inference",
        "main_idea",
        "sequence_of_events",
        "cause_and_effect",
        "vocabulary_in_context",
        "fact_vs_opinion",
        "understanding_instructions",
        "character_or_text_intent",
      ],
    },
    language_grammar: {
      label: "Language / grammar",
      subskills: ["sentence_structure", "verb_tense_recognition", "word_meaning", "spelling_morphology"],
    },
  },
  english: {
    vocabulary: {
      label: "Vocabulary",
      subskills: ["word_meaning", "collocations", "context_clues", "synonyms_antonyms"],
    },
    grammar: {
      label: "Grammar",
      subskills: ["tense_agreement", "sentence_structure", "articles_prepositions", "word_order"],
    },
    reading_comprehension: {
      label: "Reading comprehension",
      subskills: ["main_idea", "details", "inference", "sequence"],
    },
    sentence_understanding: {
      label: "Sentence understanding",
      subskills: ["sentence_meaning", "connectors", "negation_scope"],
    },
    translation: {
      label: "Translation / bilingual bridge",
      subskills: ["alignment_meaning", "false_friends", "instruction_transfer"],
    },
  },
  science: {
    cause_and_effect: {
      label: "Cause and effect",
      subskills: ["identify_cause", "identify_effect", "chain_reasoning"],
    },
    experiments: {
      label: "Experiments",
      subskills: ["variables", "hypothesis", "steps", "interpret_results"],
    },
    observation: {
      label: "Observation",
      subskills: ["describe_patterns", "collect_evidence", "measurement_basics"],
    },
    classification: {
      label: "Classification",
      subskills: ["sorting_rules", "taxonomy", "compare_groups"],
    },
    systems_understanding: {
      label: "Systems understanding",
      subskills: ["parts_roles", "cycles", "interactions"],
    },
    scientific_reasoning: {
      label: "Scientific reasoning",
      subskills: ["models", "predictions", "evidence_vs_opinion"],
    },
  },
  geometry: {
    shapes: {
      label: "Shapes",
      subskills: ["identify_shapes", "properties", "compare_shapes"],
    },
    angles: {
      label: "Angles",
      subskills: ["measure_angles", "angle_types", "angle_relationships"],
    },
    area: {
      label: "Area",
      subskills: ["area_formulas", "composite_figures", "units"],
    },
    perimeter: {
      label: "Perimeter",
      subskills: ["perimeter_reasoning", "units", "composite_bounds"],
    },
    symmetry: {
      label: "Symmetry",
      subskills: ["line_symmetry", "reflections"],
    },
    spatial_reasoning: {
      label: "Spatial reasoning",
      subskills: ["nets", "views", "transformations"],
    },
  },
  "moledet-geography": {
    maps: {
      label: "Maps",
      subskills: ["legend_scale", "coordinates_grid", "symbols"],
    },
    directions: {
      label: "Directions",
      subskills: ["cardinal_relative", "routes", "orientation"],
    },
    landmarks: {
      label: "Landmarks",
      subskills: ["recognize_features", "relations_between_places"],
    },
    community: {
      label: "Community",
      subskills: ["roles_services", "local_context"],
    },
    environment: {
      label: "Environment",
      subskills: ["climate_landforms", "resources", "human_environment"],
    },
    location_reasoning: {
      label: "Location reasoning",
      subskills: ["near_far", "borders_regions", "spatial_comparison"],
    },
  },
};

export const MATH_ERROR_TYPES_V1 = [
  "calculation_error",
  "conceptual_misunderstanding",
  "denominator_confusion",
  "numerator_denominator_confusion",
  "operation_selection_error",
  "place_value_error",
  "skipped_step",
  "reading_instruction_error",
  "careless_error",
  "fast_guessing_pattern",
  "insufficient_evidence",
];

export const HEBREW_ERROR_TYPES_V1 = [
  "missed_explicit_information",
  "weak_inference",
  "sequence_confusion",
  "vocabulary_context_error",
  "main_idea_confusion",
  "cause_effect_confusion",
  "instruction_misread",
  "careless_error",
  "guessing_pattern",
  "insufficient_evidence",
];

export const ENGLISH_ERROR_TYPES_V1 = [
  "vocabulary_gap",
  "grammar_pattern_error",
  "translation_confusion",
  "instruction_misread",
  "guessing_pattern",
  "insufficient_evidence",
];

export const SCIENCE_ERROR_TYPES_V1 = [
  "cause_effect_confusion",
  "experiment_logic_error",
  "concept_confusion",
  "classification_error",
  "instruction_misread",
  "insufficient_evidence",
];

export const GEOMETRY_ERROR_TYPES_V1 = [
  "formula_selection_error",
  "measurement_confusion",
  "shape_property_confusion",
  "angle_reasoning_error",
  "calculation_error",
  "insufficient_evidence",
];

export const MOLEDET_ERROR_TYPES_V1 = [
  "map_reading_error",
  "direction_confusion",
  "symbol_legend_confusion",
  "place_relationship_error",
  "instruction_misread",
  "insufficient_evidence",
];

/** @type {Record<string, string[]>} */
export const ERROR_TYPES_BY_SUBJECT_ID = {
  math: MATH_ERROR_TYPES_V1,
  hebrew: HEBREW_ERROR_TYPES_V1,
  english: ENGLISH_ERROR_TYPES_V1,
  science: SCIENCE_ERROR_TYPES_V1,
  geometry: GEOMETRY_ERROR_TYPES_V1,
  "moledet-geography": MOLEDET_ERROR_TYPES_V1,
};

export function mathSkillIdFromBucketKey(bucketKeyRaw) {
  const base = mathReportBaseOperationKey(String(bucketKeyRaw || ""));
  if (["fractions", "decimals", "percentages", "rounding"].includes(base)) return "fractions";
  if (["word_problems", "sequences", "equations", "mixed"].includes(base)) return "word_problems";
  if (
    ["addition", "subtraction", "multiplication", "division", "division_with_remainder", "order_of_operations"].includes(
      base
    )
  )
    return "arithmetic_operations";
  if (["number_sense", "compare", "scale", "estimation", "prime_composite", "zero_one_properties"].includes(base))
    return "number_sense";
  return "arithmetic_operations";
}

export function hebrewSkillIdFromBucketKey(bucketKeyRaw) {
  const b = String(bucketKeyRaw || "").trim();
  if (["comprehension", "reading"].includes(b)) return "reading_comprehension";
  if (["grammar", "vocabulary", "writing", "speaking"].includes(b)) return "language_grammar";
  return "reading_comprehension";
}

export function englishSkillIdFromBucketKey(bucketKeyRaw) {
  const b = String(bucketKeyRaw || "").toLowerCase();
  if (b.includes("grammar") || b.includes("syntax")) return "grammar";
  if (b.includes("vocab") || b.includes("word")) return "vocabulary";
  if (b.includes("sentence")) return "sentence_understanding";
  if (b.includes("translat")) return "translation";
  if (b.includes("read") || b.includes("comprehen")) return "reading_comprehension";
  return "reading_comprehension";
}

export function scienceSkillIdFromBucketKey(bucketKeyRaw) {
  const b = String(bucketKeyRaw || "").toLowerCase();
  if (b.includes("experiment") || b.includes("lab")) return "experiments";
  if (b.includes("cause") || b.includes("effect")) return "cause_and_effect";
  if (b.includes("classif") || b.includes("categor")) return "classification";
  if (b.includes("system") || b.includes("body") || b.includes("ecosystem")) return "systems_understanding";
  if (b.includes("observ") || b.includes("sense")) return "observation";
  return "scientific_reasoning";
}

export function geometrySkillIdFromBucketKey(bucketKeyRaw) {
  const b = String(bucketKeyRaw || "").toLowerCase();
  if (b.includes("angle")) return "angles";
  if (b.includes("area")) return "area";
  if (b.includes("perimeter")) return "perimeter";
  if (b.includes("symmetry")) return "symmetry";
  if (b.includes("shape") || b.includes("triangle") || b.includes("polygon") || b.includes("circle")) return "shapes";
  if (b.includes("spatial") || b.includes("coordinate")) return "spatial_reasoning";
  return "spatial_reasoning";
}

export function moledetSkillIdFromBucketKey(bucketKeyRaw) {
  const b = String(bucketKeyRaw || "").toLowerCase();
  if (b.includes("map")) return "maps";
  if (b.includes("direction")) return "directions";
  if (b.includes("landmark")) return "landmarks";
  if (b.includes("community") || b.includes("society")) return "community";
  if (b.includes("environment") || b.includes("climate") || b.includes("nature")) return "environment";
  return "location_reasoning";
}

/** @type {Record<string, (raw: string) => string>} */
export const SKILL_RESOLVER_BY_SUBJECT_ID = {
  math: mathSkillIdFromBucketKey,
  hebrew: hebrewSkillIdFromBucketKey,
  english: englishSkillIdFromBucketKey,
  science: scienceSkillIdFromBucketKey,
  geometry: geometrySkillIdFromBucketKey,
  "moledet-geography": moledetSkillIdFromBucketKey,
};

/** Summary counts keys aligned with parent-report-v2 enrich call */
const SUBJECT_VOLUME_KEYS = {
  math: "mathQuestions",
  hebrew: "hebrewQuestions",
  english: "englishQuestions",
  science: "scienceQuestions",
  geometry: "geometryQuestions",
  "moledet-geography": "moledetGeographyQuestions",
};

const SUBJECT_ACCURACY_KEYS = {
  math: "mathAccuracy",
  hebrew: "hebrewAccuracy",
  english: "englishAccuracy",
  science: "scienceAccuracy",
  geometry: "geometryAccuracy",
  "moledet-geography": "moledetGeographyAccuracy",
};

export function getSubjectQuestionTotalFromSummary(summaryCounts, subjectId) {
  const k = SUBJECT_VOLUME_KEYS[subjectId];
  if (!k) return 0;
  return Number(summaryCounts?.[k]) || 0;
}

export function getSubjectAccuracyFromSummary(summaryCounts, subjectId) {
  const k = SUBJECT_ACCURACY_KEYS[subjectId];
  if (!k) return NaN;
  const n = Number(summaryCounts?.[k]);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Derive internal evidence level from row + subject volume (does not override engine confidence strings).
 */
export function deriveEvidenceLevelV1({ rowQuestions, subjectQuestionTotal, accuracy, dataSufficiencyLevel }) {
  const q = Number(rowQuestions) || 0;
  const sub = Number(subjectQuestionTotal) || 0;
  const acc = Number(accuracy);
  const dsl = String(dataSufficiencyLevel || "").toLowerCase();

  if (q <= 0 && sub <= 0) return "none";
  if (q < 5 || dsl === "low") return "thin";
  if (q < 12 || sub < 20) return "limited";
  if (q >= 40 && sub >= 60) return "strong";
  if (q >= 25 && sub >= 40 && Number.isFinite(acc)) return "medium";
  return "limited";
}

export function recommendationTypeFromSignals({
  actionState,
  evidenceLevel,
  dominantBehavior,
  counterEvidenceStrong,
  narrowSample,
}) {
  const a = String(actionState || "withhold");
  const ev = String(evidenceLevel || "thin");
  const dom = String(dominantBehavior || "");

  if (ev === "none" || ev === "thin") return "collect_more_data";
  if (a === "withhold" || a === "probe_only") {
    if (narrowSample) return "collect_more_data";
    return "targeted_practice";
  }
  if (a === "maintain") return "continue_current_level";
  if (a === "expand_cautiously") return "advance_cautiously";
  if (counterEvidenceStrong && dom === "speed_pressure") return "slow_down_and_check";
  if (dom === "speed_pressure" && ev !== "none" && ev !== "thin") return "slow_down_and_check";
  if (a === "diagnose_only") return "teacher_review_recommended";
  if (a === "intervene") return "targeted_practice";
  return "collect_more_data";
}

function inferErrorTypesV1(subjectId, row, behaviorDom) {
  const acc = Number(row?.accuracy);
  const wrong = Number(row?.wrong) || 0;
  const rowQ = Number(row?.questions) || 0;
  const dom = String(behaviorDom || "");
  const out = [];

  if (subjectId === "math") {
    if (dom === "knowledge_gap") out.push("conceptual_misunderstanding");
    if (dom === "careless_pattern") out.push("careless_error");
    if (dom === "speed_pressure" && wrong > 0) out.push("fast_guessing_pattern");
    if (wrong === 0 && Number.isFinite(acc) && acc < 70) out.push("insufficient_evidence");
    if (out.length === 0 && wrong > 0) out.push("calculation_error");
  } else if (subjectId === "hebrew") {
    if (dom === "knowledge_gap") out.push("weak_inference");
    if (dom === "instruction_friction") out.push("instruction_misread");
    if (dom === "speed_pressure") out.push("guessing_pattern");
    if (rowQ > 0 && rowQ < 8 && wrong === 0) out.push("insufficient_evidence");
    if (out.length === 0 && wrong > 0) out.push("missed_explicit_information");
  } else if (subjectId === "english") {
    if (dom === "knowledge_gap") out.push("vocabulary_gap");
    if (dom === "instruction_friction") out.push("instruction_misread");
    if (dom === "speed_pressure") out.push("guessing_pattern");
    if (out.length === 0 && wrong > 0) out.push("grammar_pattern_error");
    if (rowQ < 8) out.push("insufficient_evidence");
  } else if (subjectId === "science") {
    if (dom === "knowledge_gap") out.push("concept_confusion");
    if (dom === "instruction_friction") out.push("instruction_misread");
    if (out.length === 0 && wrong > 0) out.push("cause_effect_confusion");
    if (rowQ < 8) out.push("insufficient_evidence");
  } else if (subjectId === "geometry") {
    if (dom === "knowledge_gap") out.push("shape_property_confusion");
    if (dom === "careless_pattern") out.push("calculation_error");
    if (out.length === 0 && wrong > 0) out.push("formula_selection_error");
    if (rowQ < 8) out.push("insufficient_evidence");
  } else if (subjectId === "moledet-geography") {
    if (dom === "knowledge_gap") out.push("place_relationship_error");
    if (dom === "instruction_friction") out.push("instruction_misread");
    if (out.length === 0 && wrong > 0) out.push("map_reading_error");
    if (rowQ < 8) out.push("insufficient_evidence");
  }

  return [...new Set(out)].slice(0, 6);
}

function subjectWideWeaknessBlockedReasoning(subjectId, maps) {
  const m = maps?.[subjectId];
  if (!m || typeof m !== "object") {
    return ["Subject map unavailable-do not infer subject-wide patterns without topic rows."];
  }
  const rows = Object.values(m).filter((r) => (Number(r?.questions) || 0) > 0);
  const weakRows = rows.filter((r) => Number(r.accuracy) < 70 || r.needsPractice);
  return [
    weakRows.length <= 1
      ? "Subject-wide weakness is not asserted from a single weak topic; other topics in this subject should show weakness across multiple skills."
      : "Multiple weak topic rows exist-subject-level concern may be considered only when breadth criteria are met.",
  ];
}

/**
 * Attach professionalFrameworkV1 to diagnostic units (all supported subjects) and rollup on diagnosticEngineV2 root.
 */
export function enrichDiagnosticEngineV2WithProfessionalFrameworkV1(diagnosticEngineV2, maps, summaryCounts = {}) {
  if (!diagnosticEngineV2 || typeof diagnosticEngineV2 !== "object") return diagnosticEngineV2;

  const supported = new Set(PROFESSIONAL_FRAMEWORK_V1.supportedSubjectIds);
  const units = Array.isArray(diagnosticEngineV2.units) ? diagnosticEngineV2.units : [];

  const globalDoNotConclude = [
    "Do not infer clinical or medical conditions from practice patterns.",
    "Do not conclude subject-wide weakness from a single weak topic without breadth evidence.",
    "Do not conclude mastery from high accuracy on very few questions.",
    "Do not treat slow response time as weakness when accuracy remains strong.",
    "Do not treat subjects with no activity as failed.",
  ];

  /** @type {object[]} */
  const structuredFindings = [];
  /** @type {Set<string>} */
  const subjectsTouched = new Set();

  for (const u of units) {
    if (!u || typeof u !== "object") continue;
    const sid = String(u.subjectId || "");
    if (!supported.has(sid)) continue;

    const subjQ = getSubjectQuestionTotalFromSummary(summaryCounts, sid);
    if (subjQ <= 0) continue;

    const trk = String(u.topicRowKey || "");
    const row = maps[sid]?.[trk];
    const bucketKey = String(u.bucketKey || "");
    const skillPack = SKILL_PACK_BY_SUBJECT_ID[sid] || {};
    const resolver = SKILL_RESOLVER_BY_SUBJECT_ID[sid];
    const skillId = resolver ? resolver(bucketKey) : "general";
    const rowQ = Number(row?.questions) || Number(u.evidenceTrace?.[0]?.value?.questions) || 0;

    if (rowQ <= 0 && subjQ <= 0) continue;

    const acc = Number(row?.accuracy);
    const evidenceLevel = deriveEvidenceLevelV1({
      rowQuestions: rowQ,
      subjectQuestionTotal: subjQ,
      accuracy: acc,
      dataSufficiencyLevel: row?.dataSufficiencyLevel,
    });

    const cs = u.canonicalState;
    const actionState = cs?.actionState || "withhold";
    const narrowSample = rowQ > 0 && rowQ < 10;

    const confidence =
      evidenceLevel === "strong" && !narrowSample
        ? "high"
        : evidenceLevel === "medium"
          ? "medium"
          : evidenceLevel === "limited"
            ? "low"
            : "very_low";

    const behaviorDom = row?.behaviorProfile?.dominantType || u.strengthProfile?.dominantBehavior || "";
    const counterEvidenceStrong = Number(row?.accuracy) >= 88 && (Number(row?.wrong) || 0) >= 4;

    const nextType = recommendationTypeFromSignals({
      actionState,
      evidenceLevel,
      dominantBehavior: behaviorDom,
      counterEvidenceStrong: !!counterEvidenceStrong,
      narrowSample,
    });

    const errorTypes = inferErrorTypesV1(sid, row, behaviorDom);

    const reasoning = [];
    if (Number.isFinite(acc)) reasoning.push(`Observed topic accuracy is approximately ${Math.round(acc)}% over ${rowQ} questions in-window.`);
    if (subjQ > 0) reasoning.push(`Subject-level question volume in-window is approximately ${subjQ}.`);
    if (behaviorDom) reasoning.push(`Dominant behavior signal on the row: ${behaviorDom} (informational, not a diagnosis).`);
    if (evidenceLevel === "thin" || evidenceLevel === "limited") {
      reasoning.push("Evidence is limited-interpretation should stay cautious.");
    }
    if (row?.modeKey === "speed" && Number(row?.accuracy) >= 75) {
      reasoning.push(
        "Speed-mode performance with solid accuracy should not be treated as a knowledge weakness by itself."
      );
    }
    if (nextType === "teacher_review_recommended" || nextType === "professional_review_consideration") {
      reasoning.push(
        "If this pattern persists across multiple weeks, consider discussing with a teacher or qualified professional."
      );
    }

    const doNotConclude = [
      ...(u.diagnosis?.forbiddenInferencesHe || []).slice(0, 4).map((x) => String(x)),
      ...subjectWideWeaknessBlockedReasoning(sid, maps).slice(0, 2),
    ];
    if (evidenceLevel === "thin" || evidenceLevel === "limited") {
      doNotConclude.push("Do not draw strong conclusions until more practice data is collected.");
    }

    let findingType = "topic_signal";
    if (actionState === "intervene" || actionState === "diagnose_only") findingType = "topic_weakness_candidate";
    if (actionState === "maintain" || actionState === "expand_cautiously") findingType = "topic_strength_signal";
    if (evidenceLevel === "none" || evidenceLevel === "thin") findingType = "insufficient_evidence_signal";

    const subjAvgN = (() => {
      const v = getSubjectAccuracyFromSummary(summaryCounts, sid);
      return Number.isFinite(v) ? v : null;
    })();

    const structuredFinding = {
      findingType,
      subjectId: sid,
      topicId: bucketKey || null,
      skillId,
      evidenceLevel,
      confidence,
      basedOn: {
        questionCount: rowQ,
        accuracy: Number.isFinite(acc) ? Math.round(acc * 10) / 10 : null,
        sessionsApprox: null,
        trend: row?.trend?.accuracyDirection || "unknown",
        comparedToSubjectAverage:
          Number.isFinite(acc) && subjQ > 0 && subjAvgN !== null ? Math.round((acc - subjAvgN) * 10) / 10 : null,
      },
      reasoning,
      doNotConclude: [...new Set(doNotConclude)].filter(Boolean).slice(0, 14),
      nextAction: {
        type: nextType,
      },
      frameworkMeta: {
        frameworkVersion: PROFESSIONAL_FRAMEWORK_V1.version,
        skillPackKey: skillId,
        subskillsAvailable: skillPack[skillId]?.subskills || [],
        errorTypesConsidered: errorTypes,
      },
    };

    const errList = ERROR_TYPES_BY_SUBJECT_ID[sid] || MATH_ERROR_TYPES_V1;
    u.professionalFrameworkV1 = {
      structuredFinding,
      errorTypesV1: errList,
    };
    structuredFindings.push(structuredFinding);
    subjectsTouched.add(sid);
  }

  diagnosticEngineV2.professionalFrameworkV1 = {
    frameworkVersion: PROFESSIONAL_FRAMEWORK_V1.version,
    subjectsCoveredThisPass: [...subjectsTouched].sort(),
    structuredFindings,
    globalDoNotConclude,
    clinicalLanguageGuard: PROFESSIONAL_FRAMEWORK_V1.bannedConclusionPhrases,
  };

  return diagnosticEngineV2;
}

/** Legacy export names for QA / callers */
export const MATH_SKILLS_V1 = SKILL_PACK_BY_SUBJECT_ID.math;
export const HEBREW_SKILLS_V1 = SKILL_PACK_BY_SUBJECT_ID.hebrew;
export const ENGLISH_SKILLS_V1 = SKILL_PACK_BY_SUBJECT_ID.english;
export const SCIENCE_SKILLS_V1 = SKILL_PACK_BY_SUBJECT_ID.science;
export const GEOMETRY_SKILLS_V1 = SKILL_PACK_BY_SUBJECT_ID.geometry;
export const MOLEDET_SKILLS_V1 = SKILL_PACK_BY_SUBJECT_ID["moledet-geography"];
