/**
 * Math scratchpad mapping: grade + operation → one primary scratchpad type.
 * Returns null when no safe type exists (button hidden). Math / math-master only.
 */

/** @typedef {'object_counter'|'movable_objects'|'ten_frame'|'base_ten_blocks'|'manual_number_line'|'blank_place_value_table'|'blank_vertical_addition'|'blank_vertical_subtraction'|'blank_multiplication_array'|'blank_division_groups'|'blank_long_division_grid'|'blank_fraction_strips'|'blank_decimal_place_value_table'|'blank_percent_grid'|'blank_ratio_table'|'manual_order_workspace'|'word_problem_structure_board'} ScratchpadType */

/** @type {ScratchpadType[]} */
export const ALL_SCRATCHPAD_TYPES = [
  "object_counter",
  "movable_objects",
  "ten_frame",
  "base_ten_blocks",
  "manual_number_line",
  "blank_place_value_table",
  "blank_vertical_addition",
  "blank_vertical_subtraction",
  "blank_multiplication_array",
  "blank_division_groups",
  "blank_long_division_grid",
  "blank_fraction_strips",
  "blank_decimal_place_value_table",
  "blank_percent_grid",
  "blank_ratio_table",
  "manual_order_workspace",
  "word_problem_structure_board",
];

/** @type {Record<string, Record<string, ScratchpadType[]>>} */
export const SCRATCHPAD_MAP = {
  g1: {
    addition: ["object_counter"],
    subtraction: ["movable_objects"],
    multiplication: [],
    compare: ["object_counter"],
    number_sense: ["ten_frame"],
    word_problems: ["word_problem_structure_board"],
    mixed: ["object_counter"],
  },
  g2: {
    addition: ["base_ten_blocks"],
    subtraction: ["base_ten_blocks"],
    multiplication: ["blank_multiplication_array"],
    division: ["blank_division_groups"],
    fractions: ["blank_place_value_table"],
    compare: ["object_counter"],
    number_sense: ["base_ten_blocks"],
    word_problems: ["word_problem_structure_board"],
    mixed: ["base_ten_blocks"],
  },
  g3: {
    addition: ["blank_place_value_table"],
    subtraction: ["blank_place_value_table"],
    multiplication: ["blank_multiplication_array"],
    division: ["blank_division_groups"],
    division_with_remainder: ["blank_division_groups"],
    fractions: ["blank_place_value_table"],
    sequences: ["manual_number_line"],
    decimals: ["blank_decimal_place_value_table"],
    divisibility: [],
    order_of_operations: ["manual_order_workspace"],
    compare: ["object_counter"],
    number_sense: ["base_ten_blocks"],
    word_problems: ["word_problem_structure_board"],
    mixed: ["blank_place_value_table"],
  },
  g4: {
    addition: ["blank_place_value_table"],
    subtraction: ["blank_place_value_table"],
    multiplication: ["blank_multiplication_array"],
    division: ["blank_place_value_table"],
    division_with_remainder: ["blank_place_value_table"],
    fractions: ["blank_place_value_table"],
    decimals: ["blank_decimal_place_value_table"],
    sequences: ["manual_number_line"],
    rounding: ["blank_place_value_table"],
    divisibility: [],
    prime_composite: [],
    powers: [],
    zero_one_properties: [],
    equations: [],
    compare: [],
    number_sense: ["base_ten_blocks"],
    factors_multiples: [],
    estimation: ["blank_place_value_table"],
    word_problems: ["word_problem_structure_board"],
    mixed: ["blank_place_value_table"],
  },
  g5: {
    addition: ["blank_place_value_table"],
    subtraction: ["blank_place_value_table"],
    multiplication: ["blank_multiplication_array"],
    division: ["blank_place_value_table"],
    division_with_remainder: ["blank_place_value_table"],
    fractions: ["blank_place_value_table"],
    percentages: ["blank_percent_grid"],
    sequences: ["manual_number_line"],
    decimals: ["blank_decimal_place_value_table"],
    rounding: ["blank_decimal_place_value_table"],
    equations: [],
    compare: [],
    number_sense: ["blank_place_value_table"],
    factors_multiples: [],
    word_problems: ["word_problem_structure_board"],
    estimation: ["blank_place_value_table"],
    mixed: ["blank_place_value_table"],
  },
  g6: {
    addition: ["blank_place_value_table"],
    subtraction: ["blank_place_value_table"],
    multiplication: ["blank_multiplication_array"],
    division: ["blank_place_value_table"],
    division_with_remainder: ["blank_place_value_table"],
    fractions: ["blank_place_value_table"],
    percentages: ["blank_percent_grid"],
    ratio: ["blank_ratio_table"],
    sequences: ["manual_number_line"],
    decimals: ["blank_decimal_place_value_table"],
    rounding: ["blank_decimal_place_value_table"],
    equations: ["manual_order_workspace"],
    compare: [],
    number_sense: ["blank_place_value_table"],
    factors_multiples: [],
    word_problems: ["word_problem_structure_board"],
    scale: [],
    mixed: ["blank_place_value_table"],
  },
};

/** @deprecated use SCRATCHPAD_MAP */
export const SCRATCHPAD_MAP_PHASE2 = SCRATCHPAD_MAP;

const VERTICAL_TYPES = new Set([
  "blank_vertical_addition",
  "blank_vertical_subtraction",
]);

const OPERAND_A_TYPES = new Set([
  "object_counter",
  "movable_objects",
  "ten_frame",
]);

const OPERAND_AB_TYPES = new Set([
  "blank_multiplication_array",
  "blank_division_groups",
  "blank_long_division_grid",
  "blank_place_value_table",
  ...VERTICAL_TYPES,
]);

const NO_OPERAND_TYPES = new Set([
  "blank_fraction_strips",
  "blank_percent_grid",
  "blank_ratio_table",
  "manual_order_workspace",
  "word_problem_structure_board",
  "base_ten_blocks",
  "manual_number_line",
  "blank_decimal_place_value_table",
]);

const G1_FORBIDDEN_TYPES = new Set([
  "blank_vertical_addition",
  "blank_vertical_subtraction",
  "blank_multiplication_array",
  "blank_division_groups",
  "blank_long_division_grid",
  "blank_fraction_strips",
  "blank_decimal_place_value_table",
  "blank_percent_grid",
  "blank_ratio_table",
  "manual_order_workspace",
]);

const MAX_COUNTER_OPERAND = 100;
const MAX_ARRAY_DIM = 12;
const MAX_DIVISION_DOTS = 60;

/**
 * @param {number|null|undefined} n
 * @returns {boolean}
 */
function isFiniteOperand(n) {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * @param {string} gradeKey
 * @param {ScratchpadType} type
 * @returns {ScratchpadType|null}
 */
function enforceGradeRules(gradeKey, type) {
  if (gradeKey === "g1" && G1_FORBIDDEN_TYPES.has(type)) {
    return null;
  }
  if (gradeKey === "g1" && type === "movable_objects") {
    return type;
  }
  if (gradeKey === "g2" && VERTICAL_TYPES.has(type)) {
    return null;
  }
  return type;
}

/**
 * @param {ScratchpadType} primary
 * @param {{ a?: number|null, b?: number|null }} operandHint
 * @param {string} gradeKey
 * @returns {ScratchpadType|null}
 */
function validatePrimaryType(primary, operandHint, gradeKey, operation = "") {
  const guarded = enforceGradeRules(gradeKey, primary);
  if (!guarded) return null;

  if (NO_OPERAND_TYPES.has(guarded)) {
    return guarded;
  }

  if (guarded === "blank_place_value_table" && operation === "fractions") {
    return guarded;
  }

  const a = operandHint.a;
  const b = operandHint.b;

  if (OPERAND_A_TYPES.has(guarded)) {
    if (!isFiniteOperand(a) || a < 0 || a > MAX_COUNTER_OPERAND) {
      return null;
    }
    if (guarded === "object_counter" && isFiniteOperand(b)) {
      if (b < 0 || b > MAX_COUNTER_OPERAND) return null;
    }
    return guarded;
  }

  if (OPERAND_AB_TYPES.has(guarded)) {
    if (!isFiniteOperand(a) || !isFiniteOperand(b)) {
      if (VERTICAL_TYPES.has(guarded)) {
        return enforceGradeRules(gradeKey, "blank_place_value_table");
      }
      return null;
    }
    if (a < 0 || b < 0) return null;
    if (guarded === "blank_multiplication_array") {
      if (a > MAX_ARRAY_DIM || b > MAX_ARRAY_DIM) {
        return enforceGradeRules(gradeKey, "blank_place_value_table");
      }
    }
    if (guarded === "blank_division_groups") {
      if (a > MAX_DIVISION_DOTS || b < 1) return null;
    }
    if (guarded === "blank_long_division_grid") {
      if (b < 1) return null;
    }
    return guarded;
  }

  return guarded;
}

/**
 * @param {string} gradeKey — g1..g6
 * @param {string} operation
 * @param {{ a?: number|null, b?: number|null }} [operandHint]
 * @returns {ScratchpadType|null}
 */
export function getScratchpadType(gradeKey, operation, operandHint = {}) {
  const gradeMap = SCRATCHPAD_MAP[gradeKey];
  if (!gradeMap) return null;

  const op = String(operation || "").trim();
  const types = gradeMap[op];
  if (!types || types.length === 0) return null;

  const primary = types[0];
  return validatePrimaryType(primary, operandHint, gradeKey, op);
}

/**
 * @param {string} gradeKey
 * @param {string} operation
 * @returns {ScratchpadType|null}
 */
export function getRegistryPrimaryType(gradeKey, operation) {
  const types = SCRATCHPAD_MAP[gradeKey]?.[operation];
  if (!types || types.length === 0) return null;
  return types[0];
}
