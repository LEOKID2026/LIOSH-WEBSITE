/** @typedef {{ id: string, labelHe: string, cells: [number, number][], color: string, glow: string }} BlockShape */

/** @type {BlockShape[]} */
export const SMART_BLOCKS_SHAPE_LIBRARY = [
  {
    id: "dot",
    labelHe: "נקודה",
    cells: [[0, 0]],
    color: "bg-rose-400",
    glow: "shadow-rose-400/40",
  },
  {
    id: "pair-h",
    labelHe: "זוג",
    cells: [
      [0, 0],
      [0, 1],
    ],
    color: "bg-orange-400",
    glow: "shadow-orange-400/40",
  },
  {
    id: "line-3",
    labelHe: "קו 3",
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    color: "bg-sky-400",
    glow: "shadow-sky-400/40",
  },
  {
    id: "line-4",
    labelHe: "קו 4",
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    color: "bg-violet-400",
    glow: "shadow-violet-400/40",
  },
  {
    id: "square-2",
    labelHe: "ריבוע 2×2",
    cells: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    color: "bg-emerald-400",
    glow: "shadow-emerald-400/40",
  },
  {
    id: "L-small",
    labelHe: "L",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
    color: "bg-amber-400",
    glow: "shadow-amber-400/40",
  },
  {
    id: "T-small",
    labelHe: "T",
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
    ],
    color: "bg-fuchsia-400",
    glow: "shadow-fuchsia-400/40",
  },
];

/**
 * @param {number} gridSize
 */
export function pickTrayShapes(gridSize) {
  const pool =
    gridSize <= 7
      ? ["square-2", "line-3", "L-small"]
      : gridSize >= 10
        ? ["line-4", "T-small", "square-2"]
        : ["line-3", "square-2", "pair-h"];

  return pool.map((id) => SMART_BLOCKS_SHAPE_LIBRARY.find((s) => s.id === id)).filter(Boolean);
}

/**
 * @param {BlockShape} shape
 */
export function shapeBounds(shape) {
  let maxR = 0;
  let maxC = 0;
  for (const [r, c] of shape.cells) {
    maxR = Math.max(maxR, r);
    maxC = Math.max(maxC, c);
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}

/**
 * @param {BlockShape} shape
 * @param {number} originRow
 * @param {number} originCol
 * @param {number} gridSize
 * @param {(string|null)[][]} board
 */
export function canPlaceShape(shape, originRow, originCol, gridSize, board) {
  for (const [dr, dc] of shape.cells) {
    const r = originRow + dr;
    const c = originCol + dc;
    if (r < 0 || c < 0 || r >= gridSize || c >= gridSize) return false;
    if (board[r][c]) return false;
  }
  return true;
}

/**
 * @param {BlockShape} shape
 * @param {number} originRow
 * @param {number} originCol
 * @param {(string|null)[][]} board
 */
export function placeShape(shape, originRow, originCol, board) {
  const next = board.map((row) => [...row]);
  for (const [dr, dc] of shape.cells) {
    next[originRow + dr][originCol + dc] = shape.color;
  }
  return next;
}
