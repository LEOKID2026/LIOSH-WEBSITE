/**
 * Leo Miners accrue + claim formulas — ported from MLEO MLEO_TABLE / softcut / daily cap.
 */

const DEFAULT_STAGE_BLOCKS = Object.freeze([
  { start: 1, end: 10, r: 1.32 },
  { start: 11, end: 20, r: 1.18 },
  { start: 21, end: 30, r: 1.11 },
  { start: 31, end: 40, r: 1.06 },
  { start: 41, end: 50, r: 1.025 },
  { start: 51, end: 1000, r: 1.0004 },
]);

const DEFAULT_SOFTCUT = Object.freeze([
  { upto: 0.55, factor: 1.0 },
  { upto: 0.75, factor: 0.55 },
  { upto: 0.9, factor: 0.3 },
  { upto: 1.0, factor: 0.15 },
  { upto: 9.99, factor: 0.06 },
]);

/** @type {Record<number, number>} */
const stageBaseCache = { 1: 0.2 };

const r6 = (x) => Math.round((x + Number.EPSILON) * 1e6) / 1e6;
const round2 = (x) => Number((Number(x) || 0).toFixed(2));

/**
 * @param {number} stage
 * @param {Array<{ start: number, end: number, r: number }>} stageBlocks
 */
export function stageRatioFor(stage, stageBlocks = DEFAULT_STAGE_BLOCKS) {
  const s = Math.max(1, Math.floor(stage || 1));
  const row = stageBlocks.find((b) => s >= b.start && s <= b.end);
  return row ? Number(row.r) || 1 : 1.0004;
}

/**
 * @param {number} stage
 * @param {{ baseStageV1?: number, stageBlocks?: Array<{ start: number, end: number, r: number }> }} [config]
 */
export function mleoBaseForStage(stage, config = {}) {
  const baseV1 = Number(config.baseStageV1 ?? config.base_stage_v1 ?? 0.2);
  const stageBlocks = Array.isArray(config.stageBlocks)
    ? config.stageBlocks
    : Array.isArray(config.stage_blocks)
      ? config.stage_blocks
      : DEFAULT_STAGE_BLOCKS;

  const s = Math.max(1, Math.floor(stage || 1));
  if (s === 1) return round2(baseV1);

  if (stageBaseCache[s] != null && baseV1 === 0.2) {
    return stageBaseCache[s];
  }

  const prev = mleoBaseForStage(s - 1, config);
  const r = stageRatioFor(s - 1, stageBlocks);
  const val = round2(r6(prev * r));
  if (baseV1 === 0.2) stageBaseCache[s] = val;
  return val;
}

/**
 * @param {number} minedToday
 * @param {number} dailyCap
 * @param {Array<{ upto: number, factor: number }>} [softcut]
 */
export function softcutFactor(minedToday, dailyCap, softcut = DEFAULT_SOFTCUT) {
  const used = dailyCap > 0 ? minedToday / dailyCap : 0;
  for (const seg of softcut) {
    if (used <= Number(seg.upto)) return Number(seg.factor) || 0;
  }
  const last = softcut[softcut.length - 1];
  return last ? Number(last.factor) || 0.06 : 0.06;
}

/**
 * @param {unknown} raw
 * @param {number} [maxStage]
 */
export function normalizeStageCounts(raw, maxStage = 100000) {
  const src = raw && typeof raw === "object" ? raw : {};
  /** @type {Record<string, number>} */
  const out = {};
  let total = 0;

  for (const [k, v] of Object.entries(src)) {
    const stage = Math.floor(Number(k) || 0);
    if (stage < 1 || stage > maxStage) continue;
    const count = Math.max(0, Math.floor(Number(v) || 0));
    if (!count) continue;
    out[String(stage)] = (out[String(stage)] || 0) + count;
    total += count;
  }

  return { stageCounts: out, totalBreaks: total };
}

/**
 * @param {Record<string, number>} stageCounts
 * @param {{ baseStageV1?: number, stageBlocks?: unknown[], offlineFactor?: number, offline_factor?: number }} config
 * @param {{ offline?: boolean, guestMultiplier?: number }} [opts]
 */
export function grossPointsForStageCounts(stageCounts, config, opts = {}) {
  const offlineFactor = Number(config.offlineFactor ?? config.offline_factor ?? 0.35);
  const multiplier = Number(opts.guestMultiplier ?? 1) || 1;
  const offline = opts.offline === true;
  let gross = 0;

  for (const [stageKey, countRaw] of Object.entries(stageCounts || {})) {
    const stage = Math.floor(Number(stageKey) || 0);
    const count = Math.max(0, Math.floor(Number(countRaw) || 0));
    if (!count) continue;
    const base = mleoBaseForStage(stage, config);
    const factor = offline ? offlineFactor : 1;
    gross += base * count * factor * multiplier;
  }

  return round2(gross);
}

/**
 * Apply softcut + daily cap room to a gross points amount.
 * @param {number} grossPoints
 * @param {number} minedToday
 * @param {Record<string, unknown>} config
 * @param {{ isGuest?: boolean }} [opts]
 */
export function applySoftcutAndDailyCap(grossPoints, minedToday, config, opts = {}) {
  const dailyCap = Number(
    opts.isGuest
      ? config.guest_daily_points_cap ?? config.guestDailyPointsCap ?? config.dailyCap ?? config.daily_cap ?? 500
      : config.daily_points_cap ?? config.dailyCap ?? config.daily_cap ?? 2500
  );
  if (grossPoints <= 0) {
    return { awarded: 0, softcutFactor: 1, dailyCap, minedTodayAfter: minedToday };
  }

  const factor = softcutFactor(minedToday, dailyCap, config.softcut || DEFAULT_SOFTCUT);
  const room = Math.max(0, dailyCap - minedToday);
  const afterSoftcut = grossPoints * factor;
  const awarded = round2(Math.min(afterSoftcut, room));
  return {
    awarded,
    softcutFactor: factor,
    dailyCap,
    minedTodayAfter: round2(minedToday + awarded),
  };
}

/**
 * @param {Record<string, number>} stageCounts
 * @param {number} minedToday
 * @param {Record<string, unknown>} config
 * @param {{ offline?: boolean, guestMultiplier?: number, isGuest?: boolean }} [opts]
 */
export function calculateAccruePoints(stageCounts, minedToday, config, opts = {}) {
  const gross = grossPointsForStageCounts(stageCounts, config, opts);
  const capped = applySoftcutAndDailyCap(gross, minedToday, config, opts);
  return { grossPoints: gross, ...capped };
}

function roundCoins(raw, rounding) {
  const val = Number(raw) || 0;
  if (rounding === "ceil") return Math.ceil(val);
  if (rounding === "round") return Math.round(val);
  return Math.floor(val);
}

/**
 * Convert pending mining points to Leo coins for claim.
 * @param {number} pendingPoints
 * @param {Record<string, unknown>} config
 * @param {Record<string, unknown>} [soloRules]
 * @param {{ isGuest?: boolean, dailyCoinsUsed?: number }} [opts]
 */
export function pointsToLeoCoins(pendingPoints, config, soloRules = {}, opts = {}) {
  const points = Math.max(0, Number(pendingPoints) || 0);
  const minPoints = Math.max(0, Number(config.min_points_to_claim ?? config.minPointsToClaim ?? 1));
  if (points < minPoints) return { coins: 0, pointsUsed: 0 };

  const ratio = Number(config.pointsToCoinsRatio ?? config.points_to_coins_ratio ?? 1);
  const rounding = String(config.coins_rounding ?? config.coinsRounding ?? "floor").toLowerCase();
  let coins = roundCoins(points * ratio, rounding);

  const maxFromConfig = Math.floor(Number(config.maxCoinsPerClaim ?? config.max_coins_per_claim ?? 0));
  const maxFromRules = Math.floor(Number(soloRules?.maxCoins ?? soloRules?.max_coins ?? 0));
  const caps = [maxFromConfig, maxFromRules].filter((n) => n > 0);
  if (caps.length) coins = Math.min(coins, ...caps);

  const dailyCoinsCap = Number(
    opts.isGuest
      ? config.guest_daily_coins_cap ?? config.guestDailyCoinsCap ?? 100
      : config.daily_coins_cap ?? config.dailyCoinsCap ?? 500
  );
  const dailyUsed = Math.max(0, Math.floor(Number(opts.dailyCoinsUsed) || 0));
  if (dailyCoinsCap > 0) {
    coins = Math.min(coins, Math.max(0, dailyCoinsCap - dailyUsed));
  }

  coins = Math.max(0, coins);
  const pointsUsed = ratio > 0 ? round2(coins / ratio) : 0;
  return { coins, pointsUsed };
}

/**
 * @param {number} diamondsPending
 * @param {Record<string, unknown>} config
 * @param {Record<string, unknown>} [soloRules]
 * @param {{ isGuest?: boolean, dailyDiamondsUsed?: number }} [opts]
 */
export function diamondsForChestClaim(diamondsPending, config, soloRules = {}, opts = {}) {
  const pending = Math.max(0, Math.floor(Number(diamondsPending) || 0));
  if (pending <= 0) return { diamonds: 0, diamondsUsed: 0 };

  const diamondRules =
    soloRules?.diamondRules && typeof soloRules.diamondRules === "object"
      ? soloRules.diamondRules
      : {};
  if (diamondRules.enabled === false) {
    return { diamonds: 0, diamondsUsed: 0 };
  }

  const fixed = Math.floor(
    Number(config.diamondChestAmount ?? config.diamond_chest_amount ?? diamondRules.fixedAmount ?? 1)
  );
  const maxPerClaim = Math.floor(
    Number(config.max_diamonds_per_claim ?? config.maxDiamondsPerClaim ?? 0)
  );
  const maxPerSession = Math.floor(Number(diamondRules.maxPerSession ?? diamondRules.max_per_session ?? 0));
  let diamonds = Math.min(pending, Math.max(1, fixed));
  if (maxPerClaim > 0) diamonds = Math.min(diamonds, maxPerClaim);
  if (maxPerSession > 0) diamonds = Math.min(diamonds, maxPerSession);

  const dailyDiamondCap = Number(
    opts.isGuest
      ? config.guest_daily_diamond_cap ?? config.guestDailyDiamondCap ?? 0
      : config.daily_diamond_cap ?? config.dailyDiamondCap ?? 1
  );
  const dailyUsed = Math.max(0, Math.floor(Number(opts.dailyDiamondsUsed) || 0));
  if (dailyDiamondCap > 0) {
    diamonds = Math.min(diamonds, Math.max(0, dailyDiamondCap - dailyUsed));
  }

  diamonds = Math.max(0, diamonds);
  return { diamonds, diamondsUsed: diamonds };
}
