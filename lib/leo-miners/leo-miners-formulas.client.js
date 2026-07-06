/**
 * Client-safe stage points helpers (mirrors server formulas for HUD popups only).
 */
const STAGE_BLOCKS = [
  { start: 1, end: 10, r: 1.32 },
  { start: 11, end: 20, r: 1.18 },
  { start: 21, end: 30, r: 1.11 },
  { start: 31, end: 40, r: 1.06 },
  { start: 41, end: 50, r: 1.025 },
  { start: 51, end: 1000, r: 1.0004 },
];

const cache = { 1: 0.2 };
const r6 = (x) => Math.round((x + Number.EPSILON) * 1e6) / 1e6;

function stageRatioFor(stage) {
  const s = Math.max(1, Math.floor(stage || 1));
  const row = STAGE_BLOCKS.find((b) => s >= b.start && s <= b.end);
  return row ? row.r : 1.0004;
}

export function pointsBaseForStage(stage) {
  const s = Math.max(1, Math.floor(stage || 1));
  if (cache[s] != null) return cache[s];
  const prev = pointsBaseForStage(s - 1);
  const val = r6(prev * stageRatioFor(s - 1));
  cache[s] = val;
  return val;
}

export const OFFLINE_DPS_FACTOR = 0.35;
export const DAILY_CAP_DISPLAY = 2500;
