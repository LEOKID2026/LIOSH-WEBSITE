/**
 * Placement (slot) puzzle logic for picture puzzle.
 */

/**
 * @param {number} gridSize
 * @param {number} tileIndex
 * @param {string} imageSrc
 */
export function pieceBackgroundStyle(gridSize, tileIndex, imageSrc) {
  const row = Math.floor(tileIndex / gridSize);
  const col = tileIndex % gridSize;
  const posX = gridSize > 1 ? (col / (gridSize - 1)) * 100 : 0;
  const posY = gridSize > 1 ? (row / (gridSize - 1)) * 100 : 0;
  return {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
    backgroundPosition: `${posX}% ${posY}%`,
  };
}

/**
 * @template T
 * @param {T[]} arr
 */
function shuffleArray(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * @param {number} gridSize
 * @param {number} holeCount
 */
export function createPlacementBoard(gridSize, holeCount) {
  const total = gridSize * gridSize;
  const safeHoles = Math.max(1, Math.min(holeCount, total - 1));
  const shuffled = shuffleArray(Array.from({ length: total }, (_, i) => i));
  const holeIndices = shuffled.slice(0, safeHoles);
  const holeSet = new Set(holeIndices);
  const fixedIndices = shuffled.slice(safeHoles);

  /** @type {{ slotId: number, tileIndex: number, correctPieceId: number, placedPieceId: number|null }[]} */
  const boardSlots = holeIndices.map((tileIndex) => ({
    slotId: tileIndex,
    tileIndex,
    correctPieceId: tileIndex,
    placedPieceId: null,
  }));

  /** @type {{ pieceId: number, tileIndex: number }[]} */
  const trayPieces = shuffleArray(
    holeIndices.map((tileIndex) => ({
      pieceId: tileIndex,
      tileIndex,
    }))
  );

  return { boardSlots, trayPieces, fixedIndices, gridSize, holeSet };
}

/**
 * @param {{ placedPieceId: number|null }[]} boardSlots
 */
export function isPlacementComplete(boardSlots) {
  return boardSlots.length > 0 && boardSlots.every((slot) => slot.placedPieceId != null);
}

/**
 * @param {{ slotId: number, tileIndex: number, correctPieceId: number, placedPieceId: number|null }[]} boardSlots
 * @param {number} slotId
 * @param {number} pieceId
 */
export function applyPlacement(boardSlots, slotId, pieceId) {
  const slot = boardSlots.find((s) => s.slotId === slotId);
  if (!slot || slot.placedPieceId != null) {
    return { ok: false, boardSlots, correct: false };
  }
  const correct = slot.correctPieceId === pieceId;
  if (!correct) {
    return { ok: true, boardSlots, correct: false };
  }
  const next = boardSlots.map((s) =>
    s.slotId === slotId ? { ...s, placedPieceId: pieceId } : s
  );
  return { ok: true, boardSlots: next, correct: true };
}

/**
 * @param {{ pieceId: number, tileIndex: number }[]} trayPieces
 * @param {number} pieceId
 */
export function removeTrayPiece(trayPieces, pieceId) {
  return trayPieces.filter((p) => p.pieceId !== pieceId);
}
