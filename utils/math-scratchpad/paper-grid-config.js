/**
 * Fixed paper-style grid sizes for scratchpad workspaces.
 * Not derived from answer length — generous blank work area only.
 */

/** @typedef {{ cols: number, workRows: number }} PaperGridSpec */

/** @type {PaperGridSpec} */
export const PAPER_GRID_ADD_SUB = { cols: 8, workRows: 9 };

/** @type {PaperGridSpec} */
export const PAPER_GRID_VERTICAL = { cols: 8, workRows: 10 };

/** @type {PaperGridSpec} */
export const PAPER_GRID_PLACE_VALUE = { cols: 8, workRows: 8 };

/** Empty grid cells before place-value operand digits (away from grid edge). */
export const PLACE_VALUE_OPERAND_EDGE_PADDING = 2;

/** Generous fixed notebook grid — not derived from answer length. */
/** @type {PaperGridSpec} */
export const PAPER_GRID_NOTEBOOK = { cols: 14, workRows: 16 };

/** @type {PaperGridSpec} */
export const PAPER_GRID_LONG_DIVISION = PAPER_GRID_NOTEBOOK;

/** @type {PaperGridSpec} */
export const PAPER_GRID_MULTIPLICATION = PAPER_GRID_NOTEBOOK;

/**
 * @param {string[]} cells
 * @param {number} totalCols
 * @param {number} [edgePadding=0]
 * @returns {string[]}
 */
export function rightAlignDigitCells(cells, totalCols, edgePadding = 0) {
  const row = Array(totalCols).fill("");
  const start = Math.max(0, totalCols - cells.length - edgePadding);
  cells.forEach((cell, i) => {
    row[start + i] = cell;
  });
  return row;
}

/**
 * @param {string[]} cells
 * @param {number} totalCols
 * @returns {string[]}
 */
export function centerAlignDigitCells(cells, totalCols) {
  const row = Array(totalCols).fill("");
  const start = Math.max(0, Math.floor((totalCols - cells.length) / 2));
  cells.forEach((cell, i) => {
    row[start + i] = cell;
  });
  return row;
}

/**
 * @param {number} rows
 * @param {number} cols
 * @returns {string[][]}
 */
export function createEmptyPaperGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(""));
}

/**
 * @param {number} cols
 * @param {number} [edgePadding=0]
 * @returns {string[]}
 */
export function placeValueHeaderLabels(cols, edgePadding = 0) {
  const named = ["א", "ע", "מ", "אלף"];
  return Array.from({ length: cols }, (_, i) => {
    const fromRight = cols - 1 - edgePadding - i;
    return fromRight >= 0 && fromRight < named.length ? named[fromRight] : "";
  });
}

/**
 * Shared column mapping for place-value scratchpad rows (addition, subtraction, multiplication, etc.).
 *
 * @param {number|null|undefined} a
 * @param {number|null|undefined} b
 * @param {number} totalCols
 * @param {number} [edgePadding=PLACE_VALUE_OPERAND_EDGE_PADDING]
 * @param {(n: number|null|undefined) => number} digitCountFn
 * @param {(n: number|null|undefined, width: number) => string[]} numberToDigitCellsFn
 * @returns {{ topRow: string[], bottomRow: string[], headerLabels: string[] }}
 */
export function buildPlaceValueOperandLayout(
  a,
  b,
  totalCols,
  edgePadding = PLACE_VALUE_OPERAND_EDGE_PADDING,
  digitCountFn,
  numberToDigitCellsFn
) {
  const width = Math.max(digitCountFn(a ?? 0), digitCountFn(b ?? 0), 1);
  return {
    topRow: rightAlignDigitCells(numberToDigitCellsFn(a, width), totalCols, edgePadding),
    bottomRow: rightAlignDigitCells(numberToDigitCellsFn(b, width), totalCols, edgePadding),
    headerLabels: placeValueHeaderLabels(totalCols, edgePadding),
  };
}
