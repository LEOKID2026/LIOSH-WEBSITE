import {
  canPlaceShape,
  clearFullLines,
  createEmptyBoard,
  createTrayShapes,
  findFullLines,
  getDifficultySettings,
  hasAnyValidMove,
  placeShapeOnBoard,
  scoreClearedLines,
} from "./smart-blocks-shapes.js";

/**
 * @typedef {{
 *   board: (string|null)[][],
 *   trayShapes: import("./smart-blocks-shapes.js").BlockShape[],
 *   score: number,
 *   moves: number,
 *   placedBlocks: number,
 *   clearedRows: number,
 *   clearedColumns: number,
 *   clearedLinesTotal: number,
 *   combos: number,
 *   bestCombo: number,
 * }} SmartBlocksState
 */

/**
 * @param {string} difficulty
 */
export function createInitialSmartBlocksState(difficulty) {
  const settings = getDifficultySettings(difficulty);
  return {
    board: createEmptyBoard(settings.gridSize),
    trayShapes: createTrayShapes(settings.shapeIds),
    score: 0,
    moves: 0,
    placedBlocks: 0,
    clearedRows: 0,
    clearedColumns: 0,
    clearedLinesTotal: 0,
    combos: 0,
    bestCombo: 0,
  };
}

/**
 * Apply a legal placement and return updated state + outcome flags.
 *
 * @param {SmartBlocksState} state
 * @param {string} difficulty
 * @param {number} slotIndex
 * @param {import("./smart-blocks-shapes.js").BlockShape} shape
 * @param {number} originRow
 * @param {number} originCol
 */
export function applyShapePlacement(state, difficulty, slotIndex, shape, originRow, originCol) {
  const settings = getDifficultySettings(difficulty);
  const gridSize = settings.gridSize;

  if (!canPlaceShape(shape, originRow, originCol, gridSize, state.board)) {
    return { ok: false, state };
  }

  let board = placeShapeOnBoard(shape, originRow, originCol, state.board);
  const blockCount = shape.cells.length;

  const { fullRows, fullCols } = findFullLines(board, gridSize);
  if (fullRows.length || fullCols.length) {
    board = clearFullLines(board, gridSize, fullRows, fullCols);
  }

  const { points, linesTotal } = scoreClearedLines(blockCount, fullRows.length, fullCols.length);
  const score = state.score + points;

  let clearedRows = state.clearedRows;
  let clearedColumns = state.clearedColumns;
  let clearedLinesTotal = state.clearedLinesTotal;
  let combos = state.combos;
  let bestCombo = state.bestCombo;

  if (linesTotal > 0) {
    clearedRows += fullRows.length;
    clearedColumns += fullCols.length;
    clearedLinesTotal += linesTotal;
    if (linesTotal >= 2) combos += 1;
    if (linesTotal > bestCombo) bestCombo = linesTotal;
  }

  const trayShapes = [...state.trayShapes];
  trayShapes[slotIndex] = createTrayShapes(settings.shapeIds, 1)[0];

  const nextState = {
    board,
    trayShapes,
    score,
    moves: state.moves + 1,
    placedBlocks: state.placedBlocks + blockCount,
    clearedRows,
    clearedColumns,
    clearedLinesTotal,
    combos,
    bestCombo,
  };

  const didWin = score >= settings.scoreTarget;
  const noMovesLeft = !didWin && !hasAnyValidMove(board, gridSize, trayShapes);

  return {
    ok: true,
    state: nextState,
    didWin,
    noMovesLeft,
  };
}
