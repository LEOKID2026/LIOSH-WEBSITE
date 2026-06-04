import assert from "node:assert/strict";
import test from "node:test";
import { digitCount, numberToDigitCells } from "../../utils/math-scratchpad/extract-operands.js";
import {
  PAPER_GRID_PLACE_VALUE,
  rightAlignDigitCells,
} from "../../utils/math-scratchpad/paper-grid-config.js";

function alignPlaceValueOperands(a, b) {
  const width = Math.max(digitCount(a ?? 0), digitCount(b ?? 0), 1);
  return {
    topRow: rightAlignDigitCells(numberToDigitCells(a, width), PAPER_GRID_PLACE_VALUE.cols),
    bottomRow: rightAlignDigitCells(numberToDigitCells(b, width), PAPER_GRID_PLACE_VALUE.cols),
  };
}

function lastNonEmptyIndex(row) {
  for (let i = row.length - 1; i >= 0; i -= 1) {
    if (row[i] !== "") return i;
  }
  return -1;
}

test("two-digit over one-digit: ones align in same column", () => {
  const { topRow, bottomRow } = alignPlaceValueOperands(42, 3);
  assert.equal(topRow[7], "2");
  assert.equal(bottomRow[7], "3");
  assert.equal(topRow[6], "4");
  assert.equal(bottomRow[6], "");
});

test("two-digit over two-digit: all columns match", () => {
  const { topRow, bottomRow } = alignPlaceValueOperands(42, 15);
  assert.deepEqual(
    topRow.map((cell, i) => cell || bottomRow[i] ? [topRow[i], bottomRow[i]] : null).filter(Boolean),
    [
      ["4", "1"],
      ["2", "5"],
    ]
  );
});

test("three-digit over shorter operands: shared right edge", () => {
  const { topRow, bottomRow: bottom42 } = alignPlaceValueOperands(123, 42);
  const { bottomRow: bottom3 } = alignPlaceValueOperands(123, 3);
  assert.equal(topRow[7], "3");
  assert.equal(bottom42[7], "2");
  assert.equal(bottom42[6], "4");
  assert.equal(bottom3[7], "3");
  assert.equal(lastNonEmptyIndex(topRow), lastNonEmptyIndex(bottom42));
  assert.equal(lastNonEmptyIndex(topRow), lastNonEmptyIndex(bottom3));
});
