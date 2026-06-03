/**
 * Phase 2 MVP scratchpad mapping: grade + operation → primary scratchpad type.
 * Returns null when no safe type exists (button hidden).
 * One primary type per question — no switcher in Phase 2.
 */

/** @typedef {'object_counter'|'movable_objects'|'ten_frame'|'base_ten_blocks'|'manual_number_line'|'blank_place_value_table'|'blank_vertical_addition'|'blank_vertical_subtraction'} ScratchpadType */

/** @type {Record<string, Record<string, ScratchpadType[]>>} */
export const SCRATCHPAD_MAP_PHASE2 = {
  g1: {
    addition: ["object_counter"],
    subtraction: ["movable_objects"],
    compare: ["object_counter"],
    number_sense: ["ten_frame"],
    word_problems: ["movable_objects"],
    multiplication: [],
    mixed: ["object_counter"],
  },
  g2: {
    addition: ["base_ten_blocks"],
    subtraction: ["base_ten_blocks"],
    number_sense: ["base_ten_blocks"],
    word_problems: ["manual_number_line"],
    compare: [],
    division: [],
    fractions: [],
    mixed: ["base_ten_blocks"],
  },
  g3: {
    addition: ["blank_place_value_table"],
    subtraction: ["blank_place_value_table"],
    multiplication: [],
    division: [],
    division_with_remainder: [],
    sequences: ["manual_number_line"],
    decimals: [],
    divisibility: [],
    order_of_operations: [],
    word_problems: [],
    mixed: ["blank_place_value_table"],
  },
  g4: {
    addition: ["blank_vertical_addition"],
    subtraction: ["blank_vertical_subtraction"],
    multiplication: ["blank_place_value_table"],
    division: [],
    fractions: [],
    rounding: ["blank_place_value_table"],
    estimation: [],
    equations: [],
    factors_multiples: [],
    prime_composite: [],
    word_problems: [],
    mixed: ["blank_place_value_table"],
  },
};

/**
 * @param {string} gradeKey — g1..g4 for Phase 2 MVP
 * @param {string} operation
 * @param {{ a?: number|null, b?: number|null }} [operandHint]
 * @returns {ScratchpadType|null}
 */
export function getScratchpadType(gradeKey, operation, operandHint = {}) {
  const gradeMap = SCRATCHPAD_MAP_PHASE2[gradeKey];
  if (!gradeMap) return null;

  const op = String(operation || "").trim();
  const types = gradeMap[op];
  if (!types || types.length === 0) return null;

  const primary = types[0];

  if (
    primary === "blank_vertical_addition" ||
    primary === "blank_vertical_subtraction"
  ) {
    const a = operandHint.a;
    const b = operandHint.b;
    if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)) {
      return "blank_place_value_table";
    }
  }

  if (
    primary === "object_counter" ||
    primary === "movable_objects" ||
    primary === "ten_frame"
  ) {
    const a = operandHint.a;
    if (typeof a !== "number" || !Number.isFinite(a) || a < 0 || a > 100) {
      return null;
    }
  }

  return primary;
}
