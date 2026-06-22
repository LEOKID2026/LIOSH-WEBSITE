/**
 * Map between engine board coordinates and on-screen view coordinates.
 * Flipping 180° lets each player see their own pieces at the bottom.
 */

/**
 * @param {number} r
 * @param {number} c
 * @param {boolean} flip
 */
export function viewToEngineCoord(r, c, flip) {
  if (!flip) return { r, c };
  return { r: 7 - r, c: 7 - c };
}

/**
 * @param {null|0|1} mySeat
 */
export function shouldFlipCheckersBoard(mySeat) {
  // Engine: seat 0 (black) starts rows 0–2 (top). Seat 1 (white) starts rows 5–7 (bottom).
  return mySeat === 0;
}

/**
 * @param {null|0|1} mySeat
 */
export function shouldFlipChessBoard(mySeat) {
  // Engine grid: row 0 = rank 8 (black), row 7 = rank 1 (white). Seat 0 = white, seat 1 = black.
  return mySeat === 1;
}

/**
 * @param {[string, string]} seatLabels
 * @param {null|0|1} mySeat
 * @param {{ seat: 0|1, color: string }} sides
 */
export function boardSideLabels(seatLabels, mySeat, sides) {
  const fallbackTop = { name: seatLabels[sides[0].seat] || `שחקן ${sides[0].seat + 1}`, color: sides[0].color };
  const fallbackBottom = { name: seatLabels[sides[1].seat] || `שחקן ${sides[1].seat + 1}`, color: sides[1].color };

  if (mySeat !== 0 && mySeat !== 1) {
    return { top: fallbackTop, bottom: fallbackBottom };
  }

  const me = {
    name: seatLabels[mySeat] || `שחקן ${mySeat + 1}`,
    color: sides.find((s) => s.seat === mySeat)?.color || "",
    isMe: true,
  };
  const otherSeat = /** @type {0|1} */ (mySeat === 0 ? 1 : 0);
  const them = {
    name: seatLabels[otherSeat] || `שחקן ${otherSeat + 1}`,
    color: sides.find((s) => s.seat === otherSeat)?.color || "",
    isMe: false,
  };

  return { top: them, bottom: me };
}
