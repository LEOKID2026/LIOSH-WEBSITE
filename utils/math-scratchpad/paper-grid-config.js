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
