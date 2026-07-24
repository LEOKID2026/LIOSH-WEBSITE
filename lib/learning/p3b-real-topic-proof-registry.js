/**
 * A topic is listed only when the real-runtime fixture's source question belongs
 * to that product topic. Rule reuse in the topic bridge is not sufficient.
 */
export const P3B_REAL_TOPIC_PROOF_BY_RULE = Object.freeze({
  "M-01": Object.freeze(["number_sense"]),
  "M-02": Object.freeze(["addition"]),
  "M-03": Object.freeze(["multiplication"]),
  "M-04": Object.freeze(["fractions"]),
  "M-05": Object.freeze(["fractions"]),
  "M-06": Object.freeze(["rounding"]),
  "M-07": Object.freeze(["word_problems"]),
  "M-08": Object.freeze(["addition"]),
  "M-09": Object.freeze(["subtraction"]),
  "M-10": Object.freeze(["word_problems"]),
  "G-01": Object.freeze(["shapes_basic"]),
  "G-02": Object.freeze(["angles"]),
  "G-03": Object.freeze(["area"]),
  "G-04": Object.freeze(["transformations"]),
  "G-05": Object.freeze(["volume"]),
  "G-06": Object.freeze(["area"]),
  "G-07": Object.freeze(["symmetry"]),
  "G-08": Object.freeze(["area"]),
  "H-01": Object.freeze(["vocabulary"]),
  "H-02": Object.freeze(["grammar"]),
  "H-03": Object.freeze(["writing"]),
  "H-04": Object.freeze(["comprehension"]),
  "H-05": Object.freeze(["homophones"]),
  "H-06": Object.freeze(["grammar"]),
  "H-07": Object.freeze(["writing"]),
  "H-08": Object.freeze(["speaking"]),
  "E-01": Object.freeze(["vocabulary"]),
  "E-02": Object.freeze(["grammar"]),
  "E-03": Object.freeze(["translation"]),
  "E-04": Object.freeze(["grammar"]),
  "E-05": Object.freeze(["vocabulary"]),
  "E-06": Object.freeze(["sentences"]),
  "E-07": Object.freeze(["writing"]),
  "S-02": Object.freeze(["experiments"]),
  "S-03": Object.freeze(["body"]),
  "S-04": Object.freeze(["materials"]),
  "S-05": Object.freeze(["materials"]),
  "S-06": Object.freeze(["earth_space"]),
  "S-08": Object.freeze(["animals"]),
  "MG-01": Object.freeze([]),
  "MG-02": Object.freeze(["geography"]),
  "MG-03": Object.freeze(["citizenship"]),
  "MG-04": Object.freeze(["homeland"]),
  "MG-05": Object.freeze(["geography"]),
  "MG-06": Object.freeze(["values"]),
  "MG-07": Object.freeze(["community"]),
  "MG-08": Object.freeze(["maps"]),
  "HI-01": Object.freeze(["what_is_history"]),
  "HI-03": Object.freeze(["hellenism_jews"]),
  "HI-04": Object.freeze(["classical_greece"]),
  "HI-05": Object.freeze(["hellenism_jews"]),
  "HI-06": Object.freeze(["classical_greece"]),
  "HI-07": Object.freeze(["classical_greece"]),
  "HI-08": Object.freeze(["what_is_history"]),
  "HI-09": Object.freeze(["rome_jews"]),
});

export function realTopicProofRule(subjectTopicRow) {
  const topicKey = String(subjectTopicRow?.topicKey || "");
  for (const ruleId of subjectTopicRow?.taxonomyIds || []) {
    if (P3B_REAL_TOPIC_PROOF_BY_RULE[ruleId]?.includes(topicKey)) {
      return ruleId;
    }
  }
  return null;
}

const G1_6 = Object.freeze(["g1", "g2", "g3", "g4", "g5", "g6"]);
const G2_6 = Object.freeze(["g2", "g3", "g4", "g5", "g6"]);
const G3_6 = Object.freeze(["g3", "g4", "g5", "g6"]);
const G4_6 = Object.freeze(["g4", "g5", "g6"]);

const SUBJECT_GRADE_SOURCE = Object.freeze({
  math: "utils/math-constants.js",
  geometry: "utils/geometry-constants.js",
  english: "data/english-curriculum.js",
  hebrew: "utils/hebrew-constants.js",
  science: "data/science-curriculum.js",
  history: "data/history-questions/g6-generated.js",
  "moledet-geography": "data/moledet-geography-curriculum.js",
});

const TOPIC_GRADES = Object.freeze({
  math: Object.freeze({
    number_sense: G1_6,
    compare: G1_6,
    scale: Object.freeze(["g6"]),
    addition: G1_6,
    subtraction: G1_6,
    multiplication: G1_6,
    division: G2_6,
    division_with_remainder: Object.freeze(["g3", "g4", "g5", "g6"]),
    fractions: G2_6,
    decimals: G3_6,
    rounding: G4_6,
    word_problems: G1_6,
    sequences: G3_6,
    percentages: Object.freeze(["g5", "g6"]),
    ratio: Object.freeze(["g6"]),
    equations: G4_6,
    order_of_operations: Object.freeze(["g3"]),
    mixed: G1_6,
    divisibility: Object.freeze(["g3", "g4"]),
    prime_composite: Object.freeze(["g4"]),
    powers: Object.freeze(["g4"]),
    zero_one_properties: Object.freeze(["g4"]),
    estimation: Object.freeze(["g4", "g5"]),
    factors_multiples: G4_6,
  }),
  geometry: Object.freeze({
    shapes_basic: Object.freeze(["g1", "g2", "g3", "g4"]),
    quadrilaterals: Object.freeze(["g3", "g4", "g5"]),
    area: Object.freeze(["g2", "g3", "g4", "g5", "g6"]),
    perimeter: Object.freeze(["g3", "g4", "g5", "g6"]),
    volume: Object.freeze(["g4", "g5", "g6"]),
    angles: Object.freeze(["g3", "g5", "g6"]),
    parallel_perpendicular: Object.freeze(["g3", "g4", "g5"]),
    triangles: Object.freeze(["g3", "g6"]),
    transformations: Object.freeze(["g1", "g2"]),
    rotation: Object.freeze(["g3"]),
    symmetry: Object.freeze(["g4"]),
    diagonal: Object.freeze(["g4", "g5"]),
    heights: Object.freeze(["g5"]),
    tiling: Object.freeze(["g5"]),
    circles: Object.freeze(["g6"]),
    solids: Object.freeze(["g2", "g3", "g4", "g5", "g6"]),
    pythagoras: Object.freeze(["g6"]),
    mixed: Object.freeze(["g5", "g6"]),
  }),
  english: Object.freeze({
    vocabulary: G1_6,
    grammar: G3_6,
    translation: G2_6,
    sentences: G3_6,
    sentence: G3_6,
    writing: G2_6,
    phonics: Object.freeze(["g1", "g2"]),
    mixed: G1_6,
  }),
  hebrew: Object.freeze({
    vocabulary: G1_6,
    grammar: G1_6,
    writing: G1_6,
    reading: G1_6,
    comprehension: G1_6,
    speaking: G1_6,
    mixed: G1_6,
  }),
  science: Object.freeze({
    body: G1_6,
    animals: G1_6,
    plants: Object.freeze(["g1", "g2", "g3"]),
    materials: G1_6,
    earth_space: G1_6,
    environment: G1_6,
    experiments: G2_6,
    mixed: G1_6,
  }),
  history: Object.freeze({
    what_is_history: Object.freeze(["g6"]),
    classical_greece: Object.freeze(["g6"]),
    hellenism_jews: Object.freeze(["g6"]),
    hasmonaeans: Object.freeze(["g6"]),
    rome_jews: Object.freeze(["g6"]),
    mixed: Object.freeze(["g6"]),
  }),
  "moledet-geography": Object.freeze({
    maps: G2_6,
    geography: G2_6,
    citizenship: G2_6,
    homeland: G2_6,
    community: G2_6,
    values: G2_6,
    mixed: G2_6,
  }),
});

export function topicGradeAvailability(subjectId, topicKey) {
  const subject = String(subjectId || "");
  const topic = String(topicKey || "");
  if (subject === "hebrew" && topic === "homophones") {
    return {
      gradeKeys: [],
      status: "unsupported_topic_not_in_curriculum",
      source: SUBJECT_GRADE_SOURCE.hebrew,
      reasonCode: "grade:topic_absent_from_curriculum_map",
    };
  }
  const gradeKeys = TOPIC_GRADES[subject]?.[topic] || null;
  return gradeKeys
    ? {
        gradeKeys: [...gradeKeys],
        status: "curriculum_map_declared",
        source: SUBJECT_GRADE_SOURCE[subject],
        reasonCode: "grade:curriculum_or_generator_map_declared",
      }
    : {
        gradeKeys: [],
        status: "unsupported_no_grade_mapping",
        source: SUBJECT_GRADE_SOURCE[subject] || null,
        reasonCode: "grade:no_existing_content_map_entry",
      };
}
