/**
 * לוגיקת אנימציית פיון - מותאם אל `useOv2SnakesSession` / OV2 (צעדים, סולם, נחש).
 */

import { CELL_GOAL, LADDERS, SNAKES } from "./snakesLaddersEngine";

/** Hold on ladder foot / snake head before sliding (ms) — כמו OV2 */
export const ARCADE_SNAKES_EDGE_HOLD_MS = 1180;
/** Keep pawn on final cell after edge (ms) */
export const ARCADE_SNAKES_EDGE_LAND_MS = 1480;
/** Delay between each step along the dice path (ms) — קצב קריא יותר מהיר מדי נראה "מיידי" */
export const ARCADE_SNAKES_WALK_STEP_MS = 185;
/** Pause on final dice cell when no ladder/snake (ms) */
export const ARCADE_SNAKES_WALK_SETTLE_MS = 300;

/** @type {{ ladders: Record<number, number>, snakes: Record<number, number> }} */
export const ARCADE_SNAKES_BOARD_EDGES = {
  ladders: Object.fromEntries(LADDERS),
  snakes: Object.fromEntries(SNAKES),
};

/**
 * תא אחרי זריקת קוביה, לפני סולם/נחש — כולל יציאה מ 0 (בית) כמו מנוע הארקייד.
 * @param {number} fromCell
 * @param {number} dice
 * @returns {number|null}
 */
export function arcadeCellAfterDice(fromCell, dice) {
  const d = Math.floor(Number(dice));
  if (!Number.isFinite(d) || d < 1 || d > 6) return null;
  const from = Math.floor(Number(fromCell));
  if (!Number.isFinite(from)) return null;
  if (from === 0) {
    return Math.min(d, CELL_GOAL);
  }
  if (from < 1 || from > 100) return null;
  if (from + d > 100) return null;
  return from + d;
}

/**
 * @param {number} preCell
 * @param {number} finalCell
 * @param {{ ladders: Record<number, number>, snakes: Record<number, number> }} [edges]
 * @returns {'ladder'|'snake'|null}
 */
export function arcadeSnakesClassifyEdge(preCell, finalCell, edges = ARCADE_SNAKES_BOARD_EDGES) {
  const pre = Math.floor(Number(preCell));
  const fin = Math.floor(Number(finalCell));
  if (!Number.isFinite(pre) || !Number.isFinite(fin) || pre === fin) return null;
  const ladders = edges?.ladders;
  const snakes = edges?.snakes;
  if (!ladders || !snakes) return null;
  if (ladders[pre] === fin) return "ladder";
  if (snakes[pre] === fin) return "snake";
  return null;
}

/**
 * @param {any} snap — צילום ארקייד (מערך positions מקביל אל activeSeats)
 * @param {number} seat
 * @returns {number|null}
 */
export function readArcadeSeatPos(snap, seat) {
  if (!snap || typeof snap !== "object") return null;
  const activeSeats = Array.isArray(snap.activeSeats) ? snap.activeSeats : [];
  const positions = Array.isArray(snap.positions) ? snap.positions : [];
  const si = Number(seat);
  const idx = activeSeats.indexOf(si);
  if (idx < 0 || idx >= positions.length) return null;
  const n = Number(positions[idx]);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

/** @returns {number|null} seat אם בדיוק מושב אחד שינה מיקום */
export function findSingleMovedSeat(prev, next) {
  /** @type {number[]} */
  const changed = [];
  for (let s = 0; s <= 3; s += 1) {
    const a = readArcadeSeatPos(prev, s);
    const b = readArcadeSeatPos(next, s);
    if (a !== b) changed.push(s);
  }
  return changed.length === 1 ? changed[0] : null;
}
