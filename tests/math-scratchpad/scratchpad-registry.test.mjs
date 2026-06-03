import test from "node:test";
import assert from "node:assert/strict";

import { isMathScratchpadV1Enabled } from "../../utils/math-scratchpad/feature-flag.js";
import {
  getScratchpadType,
  SCRATCHPAD_MAP_PHASE2,
} from "../../utils/math-scratchpad/scratchpad-registry.js";
import {
  extractScratchpadOperands,
  digitCount,
  numberToDigitCells,
} from "../../utils/math-scratchpad/extract-operands.js";

test("feature flag defaults OFF", () => {
  const prev = process.env.NEXT_PUBLIC_MATH_SCRATCHPAD_V1;
  delete process.env.NEXT_PUBLIC_MATH_SCRATCHPAD_V1;
  assert.equal(isMathScratchpadV1Enabled(), false);
  assert.equal(isMathScratchpadV1Enabled(true), true);
  assert.equal(isMathScratchpadV1Enabled(false), false);
  if (prev !== undefined) process.env.NEXT_PUBLIC_MATH_SCRATCHPAD_V1 = prev;
});

test("grade 1 addition → object_counter", () => {
  assert.equal(
    getScratchpadType("g1", "addition", { a: 3, b: 2 }),
    "object_counter"
  );
});

test("grade 1 multiplication → null (no scratchpad)", () => {
  assert.equal(getScratchpadType("g1", "multiplication", { a: 4, b: 5 }), null);
  assert.deepEqual(SCRATCHPAD_MAP_PHASE2.g1.multiplication, []);
});

test("grade 1 never gets vertical calculation", () => {
  for (const op of Object.keys(SCRATCHPAD_MAP_PHASE2.g1)) {
    const type = getScratchpadType("g1", op, { a: 12, b: 8 });
    if (type) {
      assert.notEqual(type, "blank_vertical_addition");
      assert.notEqual(type, "blank_vertical_subtraction");
    }
  }
});

test("grade 2 addition → base_ten_blocks", () => {
  assert.equal(
    getScratchpadType("g2", "addition", { a: 24, b: 13 }),
    "base_ten_blocks"
  );
});

test("grade 2 fractions → null", () => {
  assert.equal(getScratchpadType("g2", "fractions", { a: 1, b: 2 }), null);
});

test("grade 3 addition → blank_place_value_table", () => {
  assert.equal(
    getScratchpadType("g3", "addition", { a: 456, b: 278 }),
    "blank_place_value_table"
  );
});

test("grade 4 addition with operands → blank_vertical_addition", () => {
  assert.equal(
    getScratchpadType("g4", "addition", { a: 456, b: 278 }),
    "blank_vertical_addition"
  );
});

test("grade 4 subtraction with operands → blank_vertical_subtraction", () => {
  assert.equal(
    getScratchpadType("g4", "subtraction", { a: 456, b: 278 }),
    "blank_vertical_subtraction"
  );
});

test("grade 4 vertical falls back to place value when operands missing", () => {
  assert.equal(
    getScratchpadType("g4", "addition", { a: null, b: null }),
    "blank_place_value_table"
  );
});

test("unsupported grade g5 → null", () => {
  assert.equal(getScratchpadType("g5", "fractions", { a: 1, b: 2 }), null);
});

test("no free_math_notes in Phase 2 registry", () => {
  for (const gradeMap of Object.values(SCRATCHPAD_MAP_PHASE2)) {
    for (const types of Object.values(gradeMap)) {
      assert.ok(!types.includes("free_math_notes"));
    }
  }
});

test("extractScratchpadOperands reads a/b from question", () => {
  assert.deepEqual(
    extractScratchpadOperands({ operation: "addition", a: 7, b: 3 }),
    { a: 7, b: 3, operation: "addition" }
  );
});

test("extractScratchpadOperands parses simple exercise text", () => {
  const result = extractScratchpadOperands({
    operation: "addition",
    exerciseText: "3 + 2 = __",
  });
  assert.equal(result.a, 3);
  assert.equal(result.b, 2);
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
