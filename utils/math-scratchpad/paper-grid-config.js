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

/** @type {PaperGridSpec} */
export const PAPER_GRID_MULTIPLICATION = { cols: 8, workRows: 12 };

/**
 * @param {string[]} cells
 * @param {number} totalCols
 * @returns {string[]}
 */
export function rightAlignDigitCells(cells, totalCols) {
  const row = Array(totalCols).fill("");
  const start = Math.max(0, totalCols - cells.length);
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
