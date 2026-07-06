import { LEO_MINERS_CONFIG_ID } from "../leo-miners-constants.js";
import { LEO_MINERS_DEFAULT_SETTINGS } from "./leo-miners-default-settings.js";

export { LEO_MINERS_DEFAULT_SETTINGS };

const CACHE_TTL_MS = 30_000;

/** @type {{ config: object|null, loadedAt: number }} */
const cache = { config: null, loadedAt: 0 };

function isMissingConfigTable(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (msg.includes("leo_miners_config") && msg.includes("does not exist"))
  );
}

function num(raw, fallback) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Add camelCase aliases and derived keys for legacy server code.
 * @param {Record<string, unknown>} raw
 */
export function normalizeLeoMinersConfigAliases(raw) {
  const dailyPointsCap = num(raw.daily_points_cap ?? raw.dailyCap ?? raw.daily_cap, 2500);
  const offlineCapHours = num(raw.offline_cap_hours ?? raw.offlineCapHours, 12);

  return {
    ...raw,
    daily_points_cap: dailyPointsCap,
    dailyCap: dailyPointsCap,
    daily_cap: dailyPointsCap,
    daily_coins_cap: num(raw.daily_coins_cap ?? raw.dailyCoinsCap, 500),
    offline_cap_hours: offlineCapHours,
    offlineCapHours,
    offline_factor: num(raw.offline_factor ?? raw.offlineFactor, 0.35),
    offlineFactor: num(raw.offline_factor ?? raw.offlineFactor, 0.35),
    max_breaks_per_minute: Math.floor(num(raw.max_breaks_per_minute ?? raw.maxBreaksPerMinute, 60)),
    maxBreaksPerMinute: Math.floor(num(raw.max_breaks_per_minute ?? raw.maxBreaksPerMinute, 60)),
    max_breaks_per_batch: Math.floor(num(raw.max_breaks_per_batch ?? raw.maxBreaksPerBatch, 120)),
    maxBreaksPerBatch: Math.floor(num(raw.max_breaks_per_batch ?? raw.maxBreaksPerBatch, 120)),
    points_to_coins_ratio: num(raw.points_to_coins_ratio ?? raw.pointsToCoinsRatio, 1),
    pointsToCoinsRatio: num(raw.points_to_coins_ratio ?? raw.pointsToCoinsRatio, 1),
    guest_multiplier: num(raw.guest_multiplier ?? raw.guestMultiplier, 0.5),
    guestMultiplier: num(raw.guest_multiplier ?? raw.guestMultiplier, 0.5),
    guest_claim_enabled: raw.guest_claim_enabled !== false && raw.guestClaimEnabled !== false,
    guestClaimEnabled: raw.guest_claim_enabled !== false && raw.guestClaimEnabled !== false,
    base_stage_v1: num(raw.base_stage_v1 ?? raw.baseStageV1, 0.2),
    baseStageV1: num(raw.base_stage_v1 ?? raw.baseStageV1, 0.2),
    max_stage: Math.floor(num(raw.max_stage ?? raw.maxStage, 100000)),
    maxStage: Math.floor(num(raw.max_stage ?? raw.maxStage, 100000)),
    diamond_chest_amount: Math.floor(num(raw.diamond_chest_amount ?? raw.diamondChestAmount, 1)),
    diamondChestAmount: Math.floor(num(raw.diamond_chest_amount ?? raw.diamondChestAmount, 1)),
    max_coins_per_claim: Math.floor(num(raw.max_coins_per_claim ?? raw.maxCoinsPerClaim, 500)),
    maxCoinsPerClaim: Math.floor(num(raw.max_coins_per_claim ?? raw.maxCoinsPerClaim, 500)),
    softcut: Array.isArray(raw.softcut) ? raw.softcut : LEO_MINERS_DEFAULT_SETTINGS.softcut,
    stage_blocks: Array.isArray(raw.stage_blocks)
      ? raw.stage_blocks
      : Array.isArray(raw.stageBlocks)
        ? raw.stageBlocks
        : LEO_MINERS_DEFAULT_SETTINGS.stage_blocks,
    stageBlocks: Array.isArray(raw.stage_blocks)
      ? raw.stage_blocks
      : Array.isArray(raw.stageBlocks)
        ? raw.stageBlocks
        : LEO_MINERS_DEFAULT_SETTINGS.stage_blocks,
  };
}

/**
 * @param {Record<string, unknown>} settings
 * @param {boolean} isActive
 */
export function mergeLeoMinersConfig(settings, isActive) {
  const merged = normalizeLeoMinersConfigAliases({
    ...LEO_MINERS_DEFAULT_SETTINGS,
    ...(settings && typeof settings === "object" ? settings : {}),
  });

  merged.isActive = isActive === true;
  return merged;
}

export function invalidateLeoMinersConfigCache() {
  cache.config = null;
  cache.loadedAt = 0;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function loadLeoMinersConfig(supabase) {
  const now = Date.now();
  if (cache.config && now - cache.loadedAt < CACHE_TTL_MS) {
    return { ...cache.config };
  }

  const { data, error } = await supabase
    .from("leo_miners_config")
    .select("settings_json, is_active, updated_at")
    .eq("id", LEO_MINERS_CONFIG_ID)
    .maybeSingle();

  if (error) {
    if (isMissingConfigTable(error)) {
      return mergeLeoMinersConfig({}, false);
    }
    throw error;
  }

  const merged = mergeLeoMinersConfig(data?.settings_json || {}, data?.is_active === true);
  merged.updatedAt = data?.updated_at || null;
  cache.config = merged;
  cache.loadedAt = now;
  return { ...merged };
}

/**
 * @param {Record<string, unknown>} config
 * @param {{ isGuest?: boolean }} [opts]
 */
export function resolveDailyPointsCap(config, opts = {}) {
  if (opts.isGuest) {
    return num(
      config.guest_daily_points_cap ?? config.guestDailyPointsCap,
      num(config.daily_points_cap ?? config.dailyCap, 500)
    );
  }
  return num(config.daily_points_cap ?? config.dailyCap ?? config.daily_cap, 2500);
}

/**
 * @param {Record<string, unknown>} config
 * @param {{ isGuest?: boolean }} [opts]
 */
export function resolveDailyCoinsCap(config, opts = {}) {
  if (opts.isGuest) {
    return num(
      config.guest_daily_coins_cap ?? config.guestDailyCoinsCap,
      num(config.daily_coins_cap ?? config.dailyCoinsCap, 100)
    );
  }
  return num(config.daily_coins_cap ?? config.dailyCoinsCap, 500);
}

/**
 * @param {Record<string, unknown>} config
 */
export function extractGameplayTuningForClient(config) {
  return {
    base_dps: num(config.base_dps, LEO_MINERS_DEFAULT_SETTINGS.base_dps),
    level_dps_multiplier: num(
      config.level_dps_multiplier,
      LEO_MINERS_DEFAULT_SETTINGS.level_dps_multiplier
    ),
    rock_base_hp: num(config.rock_base_hp, LEO_MINERS_DEFAULT_SETTINGS.rock_base_hp),
    rock_hp_multiplier: num(
      config.rock_hp_multiplier,
      LEO_MINERS_DEFAULT_SETTINGS.rock_hp_multiplier
    ),
    gold_factor: num(config.gold_factor, LEO_MINERS_DEFAULT_SETTINGS.gold_factor),
    spawn_initial_cost: num(
      config.spawn_initial_cost,
      LEO_MINERS_DEFAULT_SETTINGS.spawn_initial_cost
    ),
    spawn_cost_multiplier: num(
      config.spawn_cost_multiplier,
      LEO_MINERS_DEFAULT_SETTINGS.spawn_cost_multiplier
    ),
    dps_upgrade_multiplier: num(
      config.dps_upgrade_multiplier,
      LEO_MINERS_DEFAULT_SETTINGS.dps_upgrade_multiplier
    ),
    gold_upgrade_multiplier: num(
      config.gold_upgrade_multiplier,
      LEO_MINERS_DEFAULT_SETTINGS.gold_upgrade_multiplier
    ),
    auto_dog_interval_sec: num(
      config.auto_dog_interval_sec,
      LEO_MINERS_DEFAULT_SETTINGS.auto_dog_interval_sec
    ),
    auto_dog_bank_cap: Math.floor(
      num(config.auto_dog_bank_cap, LEO_MINERS_DEFAULT_SETTINGS.auto_dog_bank_cap)
    ),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function loadLeoMinersSoloPayoutRules(supabase) {
  const { data, error } = await supabase
    .from("reward_economy_solo_game_rules")
    .select("payout_rules_json, is_active")
    .eq("game_key", "leo-miners")
    .maybeSingle();

  if (error) throw error;
  if (!data?.payout_rules_json || typeof data.payout_rules_json !== "object") {
    return { rules: {}, isActive: false };
  }
  return { rules: { ...data.payout_rules_json }, isActive: data.is_active === true };
}
