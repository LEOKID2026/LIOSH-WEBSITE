/**
 * Pedagogical math practice format — defines how worksheet pages look and what is practiced.
 * @module lib/worksheets/worksheet-math-practice-format
 */

/** @typedef {import("./worksheet-question-types.js").WorksheetQuestionType} WorksheetQuestionType */

/**
 * @typedef {(
 *   | "horizontal_add_sub"
 *   | "vertical_add_sub"
 *   | "basic_multiplication"
 *   | "long_multiplication"
 *   | "basic_division"
 *   | "long_division"
 *   | "division_with_remainder"
 *   | "long_division_with_remainder"
 *   | "fractions"
 *   | "decimals"
 *   | "percentages"
 *   | "ratio_scale"
 *   | "word_problems"
 *   | "mixed"
 * )} WorksheetMathPracticeFormatId}
 */

/** @type {WorksheetMathPracticeFormatId[]} */
export const WORKSHEET_MATH_PRACTICE_FORMAT_IDS = [
  "horizontal_add_sub",
  "vertical_add_sub",
  "basic_multiplication",
  "long_multiplication",
  "basic_division",
  "long_division",
  "division_with_remainder",
  "long_division_with_remainder",
  "fractions",
  "decimals",
  "percentages",
  "ratio_scale",
  "word_problems",
  "mixed",
];

/**
 * @typedef {Object} WorksheetMathPracticeFormatSpec
 * @property {WorksheetMathPracticeFormatId} id
 * @property {string} labelHe
 * @property {string[]} topicKeys
 * @property {number} minGrade
 * @property {number} maxGrade
 * @property {string[]} allowedKinds
 * @property {"horizontal" | "vertical" | "fraction" | "word_problem" | "mcq" | "mixed"} displayMode
 * @property {boolean} preferOpen
 * @property {number} [writingSpaceLines]
 */

/** @type {Record<WorksheetMathPracticeFormatId, WorksheetMathPracticeFormatSpec>} */
export const WORKSHEET_MATH_PRACTICE_FORMATS = {
  horizontal_add_sub: {
    id: "horizontal_add_sub",
    labelHe: "חיבור וחיסור במאוזן",
    topicKeys: ["addition", "subtraction"],
    minGrade: 1,
    maxGrade: 6,
    allowedKinds: ["add_two", "add_tens_only", "add_second_decade", "add_three", "sub_two"],
    displayMode: "horizontal",
    preferOpen: true,
  },
  vertical_add_sub: {
    id: "vertical_add_sub",
    labelHe: "חיבור וחיסור במאונך",
    topicKeys: ["addition", "subtraction"],
    minGrade: 2,
    maxGrade: 6,
    allowedKinds: ["add_vertical", "sub_vertical"],
    displayMode: "vertical",
    preferOpen: true,
    writingSpaceLines: 3,
  },
  basic_multiplication: {
    id: "basic_multiplication",
    labelHe: "כפל בסיסי",
    topicKeys: ["multiplication"],
    minGrade: 1,
    maxGrade: 6,
    allowedKinds: ["mul", "mul_tens", "mul_hundreds", "mul_groups_g1", "mul_skip_count_g1"],
    displayMode: "horizontal",
    preferOpen: true,
  },
  long_multiplication: {
    id: "long_multiplication",
    labelHe: "כפל ארוך",
    topicKeys: ["multiplication"],
    minGrade: 4,
    maxGrade: 6,
    allowedKinds: ["mul_vertical"],
    displayMode: "vertical",
    preferOpen: true,
    writingSpaceLines: 4,
  },
  basic_division: {
    id: "basic_division",
    labelHe: "חילוק בסיסי",
    topicKeys: ["division"],
    minGrade: 2,
    maxGrade: 6,
    allowedKinds: ["div"],
    displayMode: "horizontal",
    preferOpen: true,
  },
  long_division: {
    id: "long_division",
    labelHe: "חילוק ארוך",
    topicKeys: ["division"],
    minGrade: 4,
    maxGrade: 6,
    allowedKinds: ["div_long", "div_two_digit"],
    displayMode: "vertical",
    preferOpen: true,
  },
  division_with_remainder: {
    id: "division_with_remainder",
    labelHe: "חילוק בסיסי",
    topicKeys: ["division_with_remainder"],
    minGrade: 3,
    maxGrade: 6,
    allowedKinds: ["div_with_remainder"],
    displayMode: "horizontal",
    preferOpen: true,
  },
  long_division_with_remainder: {
    id: "long_division_with_remainder",
    labelHe: "חילוק ארוך",
    topicKeys: ["division_with_remainder"],
    minGrade: 4,
    maxGrade: 6,
    allowedKinds: ["div_with_remainder_long"],
    displayMode: "vertical",
    preferOpen: true,
  },
  fractions: {
    id: "fractions",
    labelHe: "שברים",
    topicKeys: ["fractions"],
    minGrade: 2,
    maxGrade: 6,
    allowedKinds: [],
    displayMode: "fraction",
    preferOpen: true,
  },
  decimals: {
    id: "decimals",
    labelHe: "עשרוניים",
    topicKeys: ["decimals"],
    minGrade: 3,
    maxGrade: 6,
    allowedKinds: [],
    displayMode: "mixed",
    preferOpen: true,
  },
  percentages: {
    id: "percentages",
    labelHe: "אחוזים",
    topicKeys: ["percentages"],
    minGrade: 5,
    maxGrade: 6,
    allowedKinds: ["perc_part_of", "perc_discount"],
    // פתוח כברירת מחדל — MCQ רק אם ההורה סימן "שאלות אמריקאיות".
    displayMode: "horizontal",
    preferOpen: true,
  },
  ratio_scale: {
    id: "ratio_scale",
    labelHe: "יחס וקנה מידה",
    topicKeys: ["ratio", "scale"],
    minGrade: 6,
    maxGrade: 6,
    allowedKinds: ["ratio_find", "ratio_first", "ratio_second", "scale_find", "scale_map_to_real", "scale_real_to_map"],
    // פתוח כברירת מחדל — MCQ רק אם ההורה סימן "שאלות אמריקאיות".
    displayMode: "horizontal",
    preferOpen: true,
  },
  word_problems: {
    id: "word_problems",
    labelHe: "בעיות מילוליות",
    topicKeys: ["word_problems"],
    minGrade: 1,
    maxGrade: 6,
    allowedKinds: [],
    displayMode: "word_problem",
    preferOpen: true,
    // קווי כתיבה כמו מחברת בתוך כרטיס 2×2.
    writingSpaceLines: 4,
  },
  mixed: {
    id: "mixed",
    labelHe: "תרגול מעורב",
    topicKeys: ["mixed"],
    minGrade: 1,
    maxGrade: 6,
    allowedKinds: [],
    displayMode: "mixed",
    preferOpen: true,
  },
};

const FRACTION_KIND_PREFIX = "frac_";
const DECIMAL_VERTICAL_KINDS = new Set(["dec_add", "dec_sub"]);
const DECIMAL_HORIZONTAL_KINDS = new Set([
  "dec_compare_max",
  "dec_round_whole_standard",
  "dec_multiply",
  "dec_divide",
  "dec_multiply_10_100",
  "dec_divide_10_100",
  "dec_repeating",
]);

/**
 * @param {string} id
 * @returns {id is WorksheetMathPracticeFormatId}
 */
export function isWorksheetMathPracticeFormat(id) {
  return WORKSHEET_MATH_PRACTICE_FORMAT_IDS.includes(
    /** @type {WorksheetMathPracticeFormatId} */ (id)
  );
}

/**
 * @param {string} gradeKey
 * @returns {number}
 */
function gradeNumberFromKey(gradeKey) {
  const n = parseInt(String(gradeKey || "").replace(/\D/g, ""), 10);
  return n >= 1 && n <= 6 ? n : 0;
}

/**
 * @param {WorksheetMathPracticeFormatId} formatId
 * @returns {WorksheetMathPracticeFormatSpec}
 */
export function getMathPracticeFormatSpec(formatId) {
  return WORKSHEET_MATH_PRACTICE_FORMATS[formatId];
}

/**
 * @param {string} formatId
 * @param {string} gradeKey
 * @param {string} topicKey
 * @returns {boolean}
 */
export function isMathPracticeFormatAllowedForGradeTopic(formatId, gradeKey, topicKey) {
  if (!isWorksheetMathPracticeFormat(formatId)) return false;
  const spec = getMathPracticeFormatSpec(formatId);
  const g = gradeNumberFromKey(gradeKey);
  if (g < spec.minGrade || g > spec.maxGrade) return false;
  return spec.topicKeys.includes(String(topicKey || "").trim().toLowerCase());
}

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @returns {{ key: WorksheetMathPracticeFormatId, label: string }[]}
 */
export function listMathPracticeFormatsForGradeTopic(gradeKey, topicKey) {
  const topic = String(topicKey || "").trim().toLowerCase();
  const out = [];
  for (const id of WORKSHEET_MATH_PRACTICE_FORMAT_IDS) {
    if (isMathPracticeFormatAllowedForGradeTopic(id, gradeKey, topic)) {
      const spec = getMathPracticeFormatSpec(id);
      out.push({ key: id, label: spec.labelHe });
    }
  }
  return out;
}

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @returns {WorksheetMathPracticeFormatId | null}
 */
export function defaultMathPracticeFormatForGradeTopic(gradeKey, topicKey) {
  const options = listMathPracticeFormatsForGradeTopic(gradeKey, topicKey);
  return options[0]?.key || null;
}

/**
 * @param {string} topicKey
 * @param {string} [gradeKey]
 * @returns {WorksheetMathPracticeFormatId | null}
 */
export function inferMathPracticeFormat(topicKey, gradeKey = "g3") {
  const topic = String(topicKey || "").trim().toLowerCase();
  const formats = listMathPracticeFormatsForGradeTopic(gradeKey, topic);
  if (formats.length === 1) return formats[0].key;
  if (topic === "addition" || topic === "subtraction") {
    return gradeNumberFromKey(gradeKey) <= 1 ? "horizontal_add_sub" : "horizontal_add_sub";
  }
  if (topic === "multiplication") return "basic_multiplication";
  if (topic === "division") return "basic_division";
  if (topic === "division_with_remainder") return "division_with_remainder";
  if (topic === "fractions") return "fractions";
  if (topic === "decimals") return "decimals";
  if (topic === "percentages") return "percentages";
  if (topic === "ratio" || topic === "scale") return "ratio_scale";
  if (topic === "word_problems") return "word_problems";
  if (topic === "mixed") return "mixed";
  return formats[0]?.key || null;
}

/**
 * @param {string} kind
 * @param {WorksheetMathPracticeFormatId} formatId
 * @returns {boolean}
 */
export function isMathKindAllowedForPracticeFormat(kind, formatId) {
  const spec = getMathPracticeFormatSpec(formatId);
  const k = String(kind || "");
  if (spec.allowedKinds.length === 0) {
    if (formatId === "fractions") return k.startsWith(FRACTION_KIND_PREFIX);
    if (formatId === "decimals") {
      return DECIMAL_VERTICAL_KINDS.has(k) || DECIMAL_HORIZONTAL_KINDS.has(k);
    }
    if (formatId === "word_problems") return k.startsWith("wp_");
    if (formatId === "mixed") return true;
    return true;
  }
  return spec.allowedKinds.includes(k);
}

/**
 * @param {string} kind
 * @returns {"horizontal" | "vertical" | "fraction" | "word_problem" | "mcq"}
 */
export function displayModeForMixedMathKind(kind) {
  const k = String(kind || "");
  if (k.startsWith("wp_")) return "word_problem";
  if (k.startsWith(FRACTION_KIND_PREFIX)) return "fraction";
  if (k === "add_vertical" || k === "sub_vertical" || k === "mul_vertical") return "vertical";
  if (k === "div_long" || k === "div_two_digit" || k === "div_with_remainder_long") {
    return "vertical";
  }
  if (k === "div_with_remainder") return "horizontal";
  if (DECIMAL_VERTICAL_KINDS.has(k)) return "vertical";
  if (
    k.startsWith("perc_") ||
    k.startsWith("ratio_") ||
    k.startsWith("scale_")
  ) {
    return "horizontal";
  }
  if (k.startsWith("order_") || k.startsWith("eq_")) {
    return "mcq";
  }
  return "horizontal";
}

/**
 * @param {WorksheetMathPracticeFormatId} formatId
 * @param {string} [kind]
 * @returns {"horizontal" | "vertical" | "fraction" | "word_problem" | "mcq" | "mixed"}
 */
export function resolveMathDisplayMode(formatId, kind) {
  const spec = getMathPracticeFormatSpec(formatId);
  if (spec.displayMode === "mixed") {
    if (formatId === "decimals" && kind) {
      return DECIMAL_VERTICAL_KINDS.has(kind) ? "vertical" : "horizontal";
    }
    if (kind) return displayModeForMixedMathKind(kind);
    return "horizontal";
  }
  return spec.displayMode;
}

/**
 * Mixed worksheet pool: approved practice formats × topics that exist for the grade.
 * @param {string} gradeKey
 * @returns {{ formatId: WorksheetMathPracticeFormatId, topicKey: string }[]}
 */
export function listMixedPracticeSlotsForGrade(gradeKey) {
  const g = gradeNumberFromKey(gradeKey);
  /** @type {{ formatId: WorksheetMathPracticeFormatId, topicKey: string }[]} */
  const slots = [];
  for (const id of WORKSHEET_MATH_PRACTICE_FORMAT_IDS) {
    if (id === "mixed") continue;
    const spec = getMathPracticeFormatSpec(id);
    if (g < spec.minGrade || g > spec.maxGrade) continue;
    for (const topicKey of spec.topicKeys) {
      if (topicKey === "mixed") continue;
      if (!isMathPracticeFormatAllowedForGradeTopic(id, gradeKey, topicKey)) continue;
      // Topic must be taught this grade (from math GRADES constants via operations check happens in selector).
      slots.push({ formatId: id, topicKey });
    }
  }
  return slots;
}

/**
 * Resolve the best practice format for a single mixed/math question.
 * @param {Record<string, unknown>} raw
 * @param {string} gradeKey
 * @param {string} [fallbackFormatId]
 * @returns {string}
 */
export function resolvePracticeFormatForMathQuestion(raw, gradeKey, fallbackFormatId = "") {
  const hint = String(raw?.params?.worksheetPracticeFormat || "").trim();
  if (hint && isWorksheetMathPracticeFormat(hint)) return hint;

  const kind = String(raw?.params?.kind || "");
  if (kind === "mul_vertical") return "long_multiplication";
  if (kind === "div_long" || kind === "div_two_digit") return "long_division";
  if (kind === "div_with_remainder_long") return "long_division_with_remainder";
  if (kind === "div_with_remainder") return "division_with_remainder";
  if (kind === "add_vertical" || kind === "sub_vertical") return "vertical_add_sub";
  if (kind.startsWith("wp_")) return "word_problems";
  if (kind.startsWith("frac_")) return "fractions";
  if (kind.startsWith("perc_")) return "percentages";
  if (kind.startsWith("ratio_") || kind.startsWith("scale_")) return "ratio_scale";
  if (kind.startsWith("dec_")) return "decimals";
  if (kind === "mul") return "basic_multiplication";
  if (kind === "div") return "basic_division";

  const op = String(raw?.operation || raw?.topic || "").trim().toLowerCase();
  if (op === "addition" || op === "subtraction") {
    if (/vertical/i.test(kind)) return "vertical_add_sub";
    return "horizontal_add_sub";
  }
  if (op === "multiplication") {
    return kind === "mul_vertical" ? "long_multiplication" : "basic_multiplication";
  }
  if (op === "division") {
    return kind === "div_long" || kind === "div_two_digit"
      ? "long_division"
      : "basic_division";
  }
  if (op === "division_with_remainder") {
    return kind === "div_with_remainder_long"
      ? "long_division_with_remainder"
      : "division_with_remainder";
  }
  if (op === "fractions") return "fractions";
  if (op === "decimals") return "decimals";
  if (op === "percentages") return "percentages";
  if (op === "ratio" || op === "scale") return "ratio_scale";
  if (op === "word_problems") return "word_problems";

  const inferred = inferMathPracticeFormat(op, gradeKey);
  if (inferred) return inferred;
  return fallbackFormatId || "";
}

/**
 * @param {WorksheetMathPracticeFormatId} formatId
 * @param {string} topicKey
 * @param {string} [gradeKey]
 * @returns {string}
 */
export function mathPracticeFormatTitleHe(formatId, topicKey, gradeKey) {
  const spec = getMathPracticeFormatSpec(formatId);
  const topic = String(topicKey || "");
  if (topic === "addition" && formatId === "horizontal_add_sub") return "חיבור במאוזן";
  if (topic === "addition" && formatId === "vertical_add_sub") return "חיבור במאונך";
  if (topic === "subtraction" && formatId === "horizontal_add_sub") return "חיסור במאוזן";
  if (topic === "subtraction" && formatId === "vertical_add_sub") return "חיסור במאונך";
  if (topic === "multiplication" && formatId === "basic_multiplication") return "כפל בסיסי";
  if (topic === "multiplication" && formatId === "long_multiplication") return "כפל ארוך";
  if (topic === "division" && formatId === "basic_division") return "חילוק בסיסי";
  if (topic === "division" && formatId === "long_division") return "חילוק ארוך";
  if (topic === "division_with_remainder" && formatId === "division_with_remainder") {
    return "חילוק בסיסי";
  }
  if (topic === "division_with_remainder" && formatId === "long_division_with_remainder") {
    return "חילוק ארוך";
  }
  if (topic === "scale" && formatId === "ratio_scale") return "קנה מידה";
  if (topic === "ratio" && formatId === "ratio_scale") return "יחס";
  if (topic === "fractions" && gradeKey === "g2") return "שברי יחידה - חצי ורבע";
  return spec.labelHe;
}

/**
 * @param {WorksheetMathPracticeFormatId} formatId
 * @param {"horizontal" | "vertical" | "fraction" | "word_problem" | "mcq"} displayMode
 * @param {boolean} preferOpen
 * @returns {WorksheetQuestionType}
 */
export function mathQuestionTypeForDisplayMode(displayMode, preferOpen) {
  if (displayMode === "word_problem") return "word_problem";
  if (displayMode === "fraction") return "fraction";
  if (displayMode === "vertical") return "vertical_math";
  if (displayMode === "mcq") return "mcq";
  return preferOpen ? "open" : "open";
}
