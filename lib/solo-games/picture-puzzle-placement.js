/**
 * Placement (slot) puzzle logic for picture puzzle.
 * Tile indices are LTR row-major: 0 = top-left, +1 = right, +gridSize = down.
 */

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
 * CSS sprite tile — requires square source image (1024×1024).
 * @param {number} gridSize
 * @param {number} tileIndex
 * @param {string} imageSrc
 */
export function pieceTileStyle(gridSize, tileIndex, imageSrc) {
  const row = Math.floor(tileIndex / gridSize);
  const col = tileIndex % gridSize;
  const posX = gridSize > 1 ? (col / (gridSize - 1)) * 100 : 0;
  const posY = gridSize > 1 ? (row / (gridSize - 1)) * 100 : 0;
  return {
    backgroundImage: `url(${imageSrc})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
    backgroundPosition: `${posX}% ${posY}%`,
  };
}

/**
 * Full-grid placement board — every piece starts in the tray, board starts empty.
 * @param {number} gridSize
 */
export function createPlacementBoard(gridSize) {
  const total = gridSize * gridSize;

  /** @type {{ slotId: number, tileIndex: number, correctPieceId: number, placedPieceId: number|null }[]} */
  const boardSlots = Array.from({ length: total }, (_, tileIndex) => ({
    slotId: tileIndex,
    tileIndex,
    correctPieceId: tileIndex,
    placedPieceId: null,
  }));

  /** @type {{ pieceId: number, tileIndex: number }[]} */
  const trayPieces = shuffleArray(
    Array.from({ length: total }, (_, tileIndex) => ({
      pieceId: tileIndex,
      tileIndex,
    }))
  );

  return { boardSlots, trayPieces, gridSize };
}

/**
 * Win only when every slot is filled and each piece is in its correct slot.
 * @param {{ placedPieceId: number|null, correctPieceId: number }[]} boardSlots
 */
export function isPlacementComplete(boardSlots) {
  return (
    boardSlots.length > 0 &&
    boardSlots.every(
      (slot) =>
        slot.placedPieceId != null && slot.placedPieceId === slot.correctPieceId
    )
  );
}

/**
 * @param {{ pieceId: number, tileIndex: number }[]} trayPieces
 * @param {number} pieceId
 */
export function removeTrayPiece(trayPieces, pieceId) {
  return trayPieces.filter((p) => p.pieceId !== pieceId);
}

/**
 * @param {{ pieceId: number, tileIndex: number }[]} trayPieces
 * @param {number} pieceId
 */
export function addTrayPiece(trayPieces, pieceId) {
  if (trayPieces.some((p) => p.pieceId === pieceId)) return trayPieces;
  return [...trayPieces, { pieceId, tileIndex: pieceId }];
}

/**
 * Free-move placement: no correctness check, swap when target occupied.
 * @param {{ slotId: number, tileIndex: number, correctPieceId: number, placedPieceId: number|null }[]} boardSlots
 * @param {{ pieceId: number, tileIndex: number }[]} trayPieces
 * @param {number} targetSlotId
 * @param {number} pieceId
 * @param {number|null} sourceSlotId null when piece comes from tray
 */
export function applyFreeMoveToSlot(
  boardSlots,
  trayPieces,
  targetSlotId,
  pieceId,
  sourceSlotId
) {
  const target = boardSlots.find((s) => s.slotId === targetSlotId);
  if (!target) {
    return { boardSlots, trayPieces, changed: false };
  }
  if (sourceSlotId != null && sourceSlotId === targetSlotId) {
    return { boardSlots, trayPieces, changed: false };
  }

  const displaced = target.placedPieceId;
  let nextTray = trayPieces;
  let nextBoard = boardSlots;

  if (sourceSlotId == null) {
    nextTray = removeTrayPiece(trayPieces, pieceId);
    if (displaced != null) {
      nextTray = addTrayPiece(nextTray, displaced);
    }
    nextBoard = boardSlots.map((s) => {
      if (s.slotId === targetSlotId) return { ...s, placedPieceId: pieceId };
      return s;
    });
  } else {
    nextBoard = boardSlots.map((s) => {
      if (s.slotId === sourceSlotId) {
        return { ...s, placedPieceId: displaced };
      }
      if (s.slotId === targetSlotId) {
        return { ...s, placedPieceId: pieceId };
      }
      return s;
    });
  }

  return { boardSlots: nextBoard, trayPieces: nextTray, changed: true };
}

/**
 * Move a board piece back to the tray.
 * @param {{ slotId: number, tileIndex: number, correctPieceId: number, placedPieceId: number|null }[]} boardSlots
 * @param {{ pieceId: number, tileIndex: number }[]} trayPieces
 * @param {number} sourceSlotId
 */
export function returnPieceToTray(boardSlots, trayPieces, sourceSlotId) {
  const source = boardSlots.find((s) => s.slotId === sourceSlotId);
  if (!source || source.placedPieceId == null) {
    return { boardSlots, trayPieces, changed: false };
  }
  const pieceId = source.placedPieceId;
  return {
    boardSlots: boardSlots.map((s) =>
      s.slotId === sourceSlotId ? { ...s, placedPieceId: null } : s
    ),
    trayPieces: addTrayPiece(trayPieces, pieceId),
    changed: true,
  };
}

/** @param {{ pieceId: number, tileIndex: number }[]} pieces */
export function splitTrayPieces(pieces) {
  const mid = Math.ceil(pieces.length / 2);
  return {
    first: pieces.slice(0, mid),
    second: pieces.slice(mid),
  };
}
