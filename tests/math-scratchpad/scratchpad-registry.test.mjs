import test from "node:test";
import assert from "node:assert/strict";

import { GRADES } from "../../utils/math-constants.js";
import { isMathScratchpadV1Enabled } from "../../utils/math-scratchpad/feature-flag.js";
import {
  ALL_SCRATCHPAD_TYPES,
  getScratchpadType,
  getRegistryPrimaryType,
  SCRATCHPAD_MAP,
  SCRATCHPAD_MAP_PHASE2,
} from "../../utils/math-scratchpad/scratchpad-registry.js";
import {
  extractScratchpadOperands,
  digitCount,
  numberToDigitCells,
} from "../../utils/math-scratchpad/extract-operands.js";

const SAMPLE_OPERANDS = { a: 12, b: 8 };
const VERTICAL_TYPES = new Set([
  "blank_vertical_addition",
  "blank_vertical_subtraction",
]);
const G1_FORBIDDEN = new Set([
  "blank_vertical_addition",
  "blank_vertical_subtraction",
  "blank_multiplication_array",
  "blank_division_groups",
  "manual_order_workspace",
]);

test("feature flag defaults OFF", () => {
  const prev = process.env.NEXT_PUBLIC_MATH_SCRATCHPAD_V1;
  delete process.env.NEXT_PUBLIC_MATH_SCRATCHPAD_V1;
  assert.equal(isMathScratchpadV1Enabled(), false);
  assert.equal(isMathScratchpadV1Enabled(true), true);
  assert.equal(isMathScratchpadV1Enabled(false), false);
  if (prev !== undefined) process.env.NEXT_PUBLIC_MATH_SCRATCHPAD_V1 = prev;
});

test("SCRATCHPAD_MAP covers every math grade operation key", () => {
  for (const [gradeKey, gradeCfg] of Object.entries(GRADES)) {
    assert.ok(SCRATCHPAD_MAP[gradeKey], `missing scratchpad map for ${gradeKey}`);
    for (const op of gradeCfg.operations) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(SCRATCHPAD_MAP[gradeKey], op),
        `missing ${gradeKey}/${op} in SCRATCHPAD_MAP`
      );
    }
  }
});

test("every mapped grade/topic resolves via getScratchpadType", () => {
  for (const [gradeKey, gradeMap] of Object.entries(SCRATCHPAD_MAP)) {
    for (const [operation, types] of Object.entries(gradeMap)) {
      const expected = types[0] ?? null;
      const actual = getScratchpadType(gradeKey, operation, SAMPLE_OPERANDS);
      if (!expected) {
        assert.equal(actual, null, `${gradeKey}/${operation} should be null`);
        continue;
      }
      assert.equal(
        actual,
        expected,
        `${gradeKey}/${operation} expected ${expected}, got ${actual}`
      );
    }
  }
});

test("registry primary matches getScratchpadType for supported topics", () => {
  for (const [gradeKey, gradeMap] of Object.entries(SCRATCHPAD_MAP)) {
    for (const [operation, types] of Object.entries(gradeMap)) {
      if (!types.length) continue;
      assert.equal(
        getRegistryPrimaryType(gradeKey, operation),
        types[0],
        `${gradeKey}/${operation}`
      );
      assert.equal(
        getScratchpadType(gradeKey, operation, SAMPLE_OPERANDS),
        types[0],
        `${gradeKey}/${operation} runtime`
      );
    }
  }
});

test("grade 1 multiplication → null (no scratchpad)", () => {
  assert.equal(getScratchpadType("g1", "multiplication", SAMPLE_OPERANDS), null);
  assert.deepEqual(SCRATCHPAD_MAP.g1.multiplication, []);
});

test("grade 1 never gets vertical or advanced workspaces", () => {
  for (const op of Object.keys(SCRATCHPAD_MAP.g1)) {
    const type = getScratchpadType("g1", op, SAMPLE_OPERANDS);
    if (type) {
      assert.ok(!VERTICAL_TYPES.has(type), `g1/${op} returned vertical type`);
      assert.ok(!G1_FORBIDDEN.has(type), `g1/${op} returned forbidden ${type}`);
    }
  }
});

test("grade 2 never gets vertical calculation", () => {
  for (const op of Object.keys(SCRATCHPAD_MAP.g2)) {
    const type = getScratchpadType("g2", op, SAMPLE_OPERANDS);
    if (type) {
      assert.notEqual(type, "blank_vertical_addition");
      assert.notEqual(type, "blank_vertical_subtraction");
    }
  }
});

test("grades 3-6 addition and subtraction use place value table", () => {
  assert.equal(
    getScratchpadType("g3", "addition", { a: 45, b: 23 }),
    "blank_place_value_table"
  );
  assert.equal(
    getScratchpadType("g4", "subtraction", { a: 120, b: 45 }),
    "blank_place_value_table"
  );
  assert.equal(
    getScratchpadType("g6", "addition", { a: 999, b: 111 }),
    "blank_place_value_table"
  );
});

test("grade 4 addition hidden when operands missing", () => {
  assert.equal(
    getScratchpadType("g4", "addition", { a: null, b: null }),
    null
  );
});

test("multiplication array hidden when operands missing", () => {
  assert.equal(
    getScratchpadType("g3", "multiplication", { a: null, b: null }),
    null
  );
});

test("no free_math_notes in registry", () => {
  for (const gradeMap of Object.values(SCRATCHPAD_MAP)) {
    for (const types of Object.values(gradeMap)) {
      assert.ok(!types.includes("free_math_notes"));
    }
  }
});

test("all registry types are known workspace types", () => {
  for (const gradeMap of Object.values(SCRATCHPAD_MAP)) {
    for (const types of Object.values(gradeMap)) {
      for (const type of types) {
        assert.ok(ALL_SCRATCHPAD_TYPES.includes(type), `unknown type ${type}`);
      }
    }
  }
});

test("SCRATCHPAD_MAP_PHASE2 alias points to SCRATCHPAD_MAP", () => {
  assert.equal(SCRATCHPAD_MAP_PHASE2, SCRATCHPAD_MAP);
});

test("deferred topics return null", () => {
  const deferred = [
    ["g3", "divisibility"],
    ["g4", "divisibility"],
    ["g4", "prime_composite"],
    ["g4", "powers"],
    ["g4", "zero_one_properties"],
    ["g4", "equations"],
    ["g4", "compare"],
    ["g4", "factors_multiples"],
    ["g5", "equations"],
    ["g5", "compare"],
    ["g5", "factors_multiples"],
    ["g6", "compare"],
    ["g6", "factors_multiples"],
    ["g6", "scale"],
  ];
  for (const [grade, op] of deferred) {
    assert.equal(
      getScratchpadType(grade, op, SAMPLE_OPERANDS),
      null,
      `${grade}/${op} should stay deferred`
    );
  }
});

test("word problems use structure board without operation hints", () => {
  assert.equal(
    getScratchpadType("g1", "word_problems", {}),
    "word_problem_structure_board"
  );
  assert.equal(
    getScratchpadType("g6", "word_problems", {}),
    "word_problem_structure_board"
  );
});

test("extractScratchpadOperands reads a/b from question", () => {
  assert.deepEqual(
    extractScratchpadOperands({ operation: "addition", a: 7, b: 3 }),
    {
      a: 7,
      b: 3,
      operation: "addition",
      fractionOperands: [],
      fractionOperator: null,
    }
  );
});

test("extractScratchpadOperands reads dividend/divisor", () => {
  const result = extractScratchpadOperands({
    operation: "division",
    params: { dividend: 24, divisor: 6 },
  });
  assert.equal(result.a, 24);
  assert.equal(result.b, 6);
});

test("extractScratchpadOperands parses simple exercise text", () => {
  const result = extractScratchpadOperands({
    operation: "addition",
    exerciseText: "3 + 2 = __",
  });
  assert.equal(result.a, 3);
  assert.equal(result.b, 2);
});

test("extractScratchpadOperands never returns answer fields", () => {
  const result = extractScratchpadOperands({
    operation: "addition",
    a: 5,
    b: 3,
    correctAnswer: 8,
    params: { answer: 8, result: 8, resNum: 8, commonDen: 12, finalNum: 2, finalDen: 3 },
  });
  assert.deepEqual(Object.keys(result).sort(), [
    "a",
    "b",
    "fractionOperands",
    "fractionOperator",
    "operation",
  ]);
  assert.equal(result.a, 5);
  assert.equal(result.b, 3);
});

test("extractScratchpadFractionLayout reads add/sub fractions from params", () => {
  const result = extractScratchpadOperands({
    operation: "fractions",
    params: { kind: "frac_same_den_add", n1: 2, n2: 1, den: 4, op: "add" },
  });
  assert.deepEqual(result.fractionOperands, [
    { num: 2, den: 4 },
    { num: 1, den: 4 },
  ]);
  assert.equal(result.fractionOperator, "+");
});

test("extractScratchpadFractionLayout parses exercise text", () => {
  const result = extractScratchpadOperands({
    operation: "fractions",
    exerciseText: "3/4 + 1/4 = __",
  });
  assert.deepEqual(result.fractionOperands, [
    { num: 3, den: 4 },
    { num: 1, den: 4 },
  ]);
  assert.equal(result.fractionOperator, "+");
});

test("digitCount helper", () => {
  assert.equal(digitCount(0), 1);
  assert.equal(digitCount(456), 3);
});

test("numberToDigitCells right-aligns operands without answer", () => {
  assert.deepEqual(numberToDigitCells(82, 2), ["8", "2"]);
  assert.deepEqual(numberToDigitCells(5, 2), ["", "5"]);
  assert.deepEqual(numberToDigitCells(null, 3), ["", "", ""]);
});

test("g5 fractions and percentages supported", () => {
  assert.equal(
    getScratchpadType("g5", "fractions", SAMPLE_OPERANDS),
    "blank_place_value_table"
  );
  assert.equal(
    getScratchpadType("g5", "fractions", {}),
    "blank_place_value_table"
  );
  assert.equal(
    getScratchpadType("g5", "percentages", SAMPLE_OPERANDS),
    "blank_percent_grid"
  );
});

test("g6 ratio and order of operations supported", () => {
  assert.equal(
    getScratchpadType("g6", "ratio", SAMPLE_OPERANDS),
    "blank_ratio_table"
  );
  assert.equal(
    getScratchpadType("g6", "equations", SAMPLE_OPERANDS),
    "manual_order_workspace"
  );
});

test("basic division uses groups in lower grades", () => {
  assert.equal(
    getScratchpadType("g2", "division", { a: 24, b: 6 }),
    "blank_division_groups"
  );
  assert.equal(
    getScratchpadType("g3", "division_with_remainder", { a: 17, b: 5 }),
    "blank_division_groups"
  );
});

test("long division uses place value table in grades 4-6", () => {
  assert.equal(
    getScratchpadType("g4", "division", { a: 456, b: 12 }),
    "blank_place_value_table"
  );
  assert.equal(
    getScratchpadType("g5", "division_with_remainder", { a: 789, b: 23 }),
    "blank_place_value_table"
  );
  assert.equal(
    getScratchpadType("g6", "division", { a: 1234, b: 56 }),
    "blank_place_value_table"
  );
});

test("large multiplication falls back to same place value table", () => {
  assert.equal(
    getScratchpadType("g4", "multiplication", { a: 34, b: 40 }),
    "blank_place_value_table"
  );
});

test("long division hidden when operands missing", () => {
  assert.equal(
    getScratchpadType("g4", "division", { a: null, b: null }),
    null
  );
});
