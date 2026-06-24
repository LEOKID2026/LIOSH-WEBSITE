/** @typedef {{ id: string, labelHe: string, cells: [number, number][], colorHex: string, shadowColor: string }} BlockShape */

/** @type {BlockShape[]} */
export const SMART_BLOCKS_SHAPE_LIBRARY = [
  {
    id: "dot",
    labelHe: "נקודה",
    cells: [[0, 0]],
    colorHex: "#fb7185",
    shadowColor: "rgba(251, 113, 133, 0.45)",
  },
  {
    id: "pair-h",
    labelHe: "זוג אופקי",
    cells: [
      [0, 0],
      [0, 1],
    ],
    colorHex: "#fb923c",
    shadowColor: "rgba(251, 146, 60, 0.45)",
  },
  {
    id: "pair-v",
    labelHe: "זוג אנכי",
    cells: [
      [0, 0],
      [1, 0],
    ],
    colorHex: "#fdba74",
    shadowColor: "rgba(253, 186, 116, 0.45)",
  },
  {
    id: "line-3",
    labelHe: "קו 3 אופקי",
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    colorHex: "#38bdf8",
    shadowColor: "rgba(56, 189, 248, 0.45)",
  },
  {
    id: "line-3-v",
    labelHe: "קו 3 אנכי",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    colorHex: "#7dd3fc",
    shadowColor: "rgba(125, 211, 252, 0.45)",
  },
  {
    id: "line-4",
    labelHe: "קו 4 אופקי",
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
    colorHex: "#a78bfa",
    shadowColor: "rgba(167, 139, 250, 0.45)",
  },
  {
    id: "line-4-v",
    labelHe: "קו 4 אנכי",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
    colorHex: "#c4b5fd",
    shadowColor: "rgba(196, 181, 253, 0.45)",
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
    colorHex: "#34d399",
    shadowColor: "rgba(52, 211, 153, 0.45)",
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
    colorHex: "#fbbf24",
    shadowColor: "rgba(251, 191, 36, 0.45)",
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
    colorHex: "#e879f9",
    shadowColor: "rgba(232, 121, 249, 0.45)",
  },
];

/** @type {Record<string, { gridSize: number, scoreTarget: number, shapeIds: string[] }>} */
export const SMART_BLOCKS_DIFFICULTY = Object.freeze({
  easy: {
    gridSize: 7,
    scoreTarget: 500,
    shapeIds: ["dot", "pair-h", "pair-v", "line-3", "line-3-v", "square-2"],
  },
  medium: {
    gridSize: 8,
    scoreTarget: 900,
    shapeIds: [
      "dot",
      "pair-h",
      "pair-v",
      "line-3",
      "line-3-v",
      "line-4",
      "square-2",
      "L-small",
      "T-small",
    ],
  },
  hard: {
    gridSize: 10,
    scoreTarget: 1400,
    shapeIds: SMART_BLOCKS_SHAPE_LIBRARY.map((s) => s.id),
  },
});

const SHAPE_BY_ID = Object.fromEntries(SMART_BLOCKS_SHAPE_LIBRARY.map((s) => [s.id, s]));

/**
 * @param {string} shapeId
 */
export function getShapeById(shapeId) {
  return SHAPE_BY_ID[shapeId] || SMART_BLOCKS_SHAPE_LIBRARY[0];
}

/**
 * @param {string} difficulty
 */
export function getDifficultySettings(difficulty) {
  return SMART_BLOCKS_DIFFICULTY[difficulty] || SMART_BLOCKS_DIFFICULTY.medium;
}

/**
 * @param {string[]} shapeIds
 */
export function randomShapeFromPool(shapeIds) {
  const id = shapeIds[Math.floor(Math.random() * shapeIds.length)];
  return getShapeById(id);
}

/**
 * @param {string[]} shapeIds
 * @param {number} count
 */
export function createTrayShapes(shapeIds, count = 3) {
  return Array.from({ length: count }, () => randomShapeFromPool(shapeIds));
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
 * @param {number} size
 */
export function createEmptyBoard(size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
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
export function placeShapeOnBoard(shape, originRow, originCol, board) {
  const next = board.map((row) => [...row]);
  for (const [dr, dc] of shape.cells) {
    next[originRow + dr][originCol + dc] = shape.colorHex;
  }
  return next;
}

/**
 * @param {(string|null)[][]} board
 * @param {number} gridSize
 */
export function findFullLines(board, gridSize) {
  const fullRows = [];
  const fullCols = [];

  for (let r = 0; r < gridSize; r += 1) {
    if (board[r].every((cell) => cell)) fullRows.push(r);
  }

  for (let c = 0; c < gridSize; c += 1) {
    let full = true;
    for (let r = 0; r < gridSize; r += 1) {
      if (!board[r][c]) {
        full = false;
        break;
      }
    }
    if (full) fullCols.push(c);
  }

  return { fullRows, fullCols };
}

/**
 * @param {(string|null)[][]} board
 * @param {number} gridSize
 * @param {number[]} fullRows
 * @param {number[]} fullCols
 */
export function clearFullLines(board, gridSize, fullRows, fullCols) {
  const next = board.map((row) => [...row]);
  for (const r of fullRows) {
    for (let c = 0; c < gridSize; c += 1) next[r][c] = null;
  }
  for (const c of fullCols) {
    for (let r = 0; r < gridSize; r += 1) next[r][c] = null;
  }
  return next;
}

export const SMART_BLOCKS_SCORING = Object.freeze({
  pointsPerBlock: 10,
  rowClear: 100,
  colClear: 100,
  doubleClearBonus: 50,
  comboThreePlusBonus: 150,
});

/**
 * @param {number} blockCount
 * @param {number} rowsCleared
 * @param {number} colsCleared
 */
export function scoreClearedLines(blockCount, rowsCleared, colsCleared) {
  const { pointsPerBlock, rowClear, colClear, doubleClearBonus, comboThreePlusBonus } =
    SMART_BLOCKS_SCORING;

  let points = blockCount * pointsPerBlock;
  points += rowsCleared * rowClear + colsCleared * colClear;

  const linesTotal = rowsCleared + colsCleared;
  if (linesTotal >= 3) points += comboThreePlusBonus;
  else if (linesTotal >= 2) points += doubleClearBonus;

  return { points, linesTotal };
}

/**
 * @param {(string|null)[][]} board
 * @param {number} gridSize
 * @param {BlockShape[]} trayShapes
 */
export function hasAnyValidMove(board, gridSize, trayShapes) {
  for (const shape of trayShapes) {
    if (!shape) continue;
    for (let r = 0; r < gridSize; r += 1) {
      for (let c = 0; c < gridSize; c += 1) {
        if (canPlaceShape(shape, r, c, gridSize, board)) return true;
      }
    }
  }
  return false;
}

/**
 * @param {HTMLElement} boardEl
 * @param {number} gridSize
 */
export function getBoardGridMetrics(boardEl, gridSize) {
  const rect = boardEl.getBoundingClientRect();
  const style = typeof window !== "undefined" ? getComputedStyle(boardEl) : null;
  const padL = style ? parseFloat(style.paddingLeft) || 0 : 0;
  const padT = style ? parseFloat(style.paddingTop) || 0 : 0;
  const padR = style ? parseFloat(style.paddingRight) || 0 : 0;
  const padB = style ? parseFloat(style.paddingBottom) || 0 : 0;

  const innerW = rect.width - padL - padR;
  const innerH = rect.height - padT - padB;
  const cellW = innerW / gridSize;
  const cellH = innerH / gridSize;

  return {
    rect,
    padL,
    padT,
    padR,
    padB,
    innerW,
    innerH,
    cellW,
    cellH,
    originLeft: rect.left + padL,
    originTop: rect.top + padT,
  };
}

/**
 * Map pointer position to shape origin cell (top-left of shape bounds).
 * Drag visual is centered on pointer — same center anchor used for preview and drop.
 *
 * @param {HTMLElement} boardEl
 * @param {number} gridSize
 * @param {number} clientX
 * @param {number} clientY
 * @param {BlockShape | null | undefined} shape
 */
export function pointerToGridCell(boardEl, gridSize, clientX, clientY, shape = null) {
  if (!boardEl || gridSize < 1) return null;

  const m = getBoardGridMetrics(boardEl, gridSize);

  let anchorX = clientX;
  let anchorY = clientY;

  if (shape) {
    const { rows, cols } = shapeBounds(shape);
    const shapeW = cols * m.cellW;
    const shapeH = rows * m.cellH;
    anchorX = clientX - shapeW / 2;
    anchorY = clientY - shapeH / 2;
  }

  const relX = anchorX - m.originLeft;
  const relY = anchorY - m.originTop;

  if (relX < 0 || relY < 0 || relX >= m.innerW || relY >= m.innerH) {
    return null;
  }

  const col = Math.floor(relX / m.cellW);
  const row = Math.floor(relY / m.cellH);

  if (row < 0 || col < 0 || row >= gridSize || col >= gridSize) return null;

  return { row, col };
}

/**
 * @param {BlockShape[]} trayShapes
 * @param {string[]} shapeIds
 */
export function normalizeTraySlots(trayShapes, shapeIds) {
  const slots = trayShapes.slice(0, 3);
  while (slots.length < 3) {
    slots.push(randomShapeFromPool(shapeIds));
  }
  return slots;
}
