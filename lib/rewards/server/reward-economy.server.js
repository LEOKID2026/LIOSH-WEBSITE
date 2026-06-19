/**
 * Admin-managed coin economy — read with short cache when REWARD_ECONOMY_SETTINGS_ENABLED.
 */

import { isRewardEconomySettingsEnabled } from "../reward-feature-flags.js";
import {
  LEGACY_MISSION_POOL,
  LEGACY_MONTHLY_PERSISTENCE_TIERS,
  LEGACY_MONTHLY_GLOBAL,
} from "../legacy-economy.js";

const CACHE_TTL_MS = 60_000;

/** @type {{ daily: Map<string, object[]>, monthly: object[]|null, global: object|null, loadedAt: number }} */
const cache = {
  daily: new Map(),
  monthly: null,
  global: null,
  loadedAt: 0,
};

function cacheFresh() {
  return Date.now() - cache.loadedAt < CACHE_TTL_MS;
}

function mapDailyRow(row) {
  return {
    id: row.mission_key,
    textHe: row.text_he,
    type: row.mission_type,
    target: row.target_value,
    rewardCoins: row.reward_coins,
  };
}

export function getLegacyDailyMissionsForGradeBand(gradeBand) {
  return LEGACY_MISSION_POOL[gradeBand] ?? LEGACY_MISSION_POOL.g34;
}

export function getLegacyMonthlyTiers() {
  return LEGACY_MONTHLY_PERSISTENCE_TIERS.map((t) => ({ ...t }));
}

export function getLegacyMonthlyGlobalCaps() {
  return { ...LEGACY_MONTHLY_GLOBAL };
}

async function loadEconomyFromDb(supabase) {
  if (cacheFresh() && cache.monthly && cache.global) return;

  const [dailyRes, monthlyRes, globalRes] = await Promise.all([
    supabase
      .from("reward_economy_daily_missions")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("reward_economy_monthly_tiers")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase.from("reward_economy_global_settings").select("*").limit(1).maybeSingle(),
  ]);

  cache.daily = new Map();
  for (const row of dailyRes.data || []) {
    const band = row.grade_band;
    if (!cache.daily.has(band)) cache.daily.set(band, []);
    cache.daily.get(band).push(mapDailyRow(row));
  }

  cache.monthly = (monthlyRes.data || []).map((row) => ({
    minutes: row.minutes_threshold,
    coins: row.reward_coins,
    labelHe: row.label_he,
  }));

  const g = globalRes.data;
  cache.global = {
    monthlyMinutesCap: g?.monthly_minutes_cap ?? LEGACY_MONTHLY_GLOBAL.monthlyMinutesCap,
    monthlyCoinsCap: g?.monthly_coins_cap ?? LEGACY_MONTHLY_GLOBAL.monthlyCoinsCap,
  };

  cache.loadedAt = Date.now();
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} [supabase]
 */
export async function getDailyMissionsForGradeBand(supabase, gradeBand) {
  const band = gradeBand || "g34";
  if (!isRewardEconomySettingsEnabled()) {
    return getLegacyDailyMissionsForGradeBand(band);
  }
  if (!supabase) return getLegacyDailyMissionsForGradeBand(band);
  await loadEconomyFromDb(supabase);
  const missions = cache.daily.get(band);
  if (!missions?.length) return getLegacyDailyMissionsForGradeBand(band);
  return missions.map((m) => ({ ...m }));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} [supabase]
 */
export async function getMonthlyPersistenceTiersFromSettings(supabase) {
  if (!isRewardEconomySettingsEnabled()) return getLegacyMonthlyTiers();
  if (!supabase) return getLegacyMonthlyTiers();
  await loadEconomyFromDb(supabase);
  if (!cache.monthly?.length) return getLegacyMonthlyTiers();
  return cache.monthly.map((t) => ({ ...t }));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} [supabase]
 */
export async function getMonthlyGlobalCaps(supabase) {
  if (!isRewardEconomySettingsEnabled()) return getLegacyMonthlyGlobalCaps();
  if (!supabase) return getLegacyMonthlyGlobalCaps();
  await loadEconomyFromDb(supabase);
  return cache.global ? { ...cache.global } : getLegacyMonthlyGlobalCaps();
}

export function invalidateEconomyCache() {
  cache.loadedAt = 0;
  cache.daily = new Map();
  cache.monthly = null;
  cache.global = null;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} adminUserId
 */
export async function logEconomyChange(supabase, adminUserId, {
  settingArea,
  entityKey,
  fieldName,
  oldValue,
  newValue,
}) {
  await supabase.from("reward_economy_change_log").insert({
    admin_user_id: adminUserId,
    setting_area: settingArea,
    entity_key: entityKey ?? null,
    field_name: fieldName,
    old_value_json: oldValue ?? null,
    new_value_json: newValue ?? null,
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function listDailyMissionsAdmin(supabase) {
  const { data, error } = await supabase
    .from("reward_economy_daily_missions")
    .select("*")
    .order("grade_band")
    .order("display_order");
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function listMonthlyTiersAdmin(supabase) {
  const { data, error } = await supabase
    .from("reward_economy_monthly_tiers")
    .select("*")
    .order("display_order");
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getGlobalSettingsAdmin(supabase) {
  const { data, error } = await supabase
    .from("reward_economy_global_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function updateDailyMissionAdmin(supabase, adminUserId, id, patch) {
  const { data: before } = await supabase
    .from("reward_economy_daily_missions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!before) return { ok: false, code: "not_found" };

  const { data, error } = await supabase
    .from("reward_economy_daily_missions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, code: "update_failed", message: error.message };

  await logEconomyChange(supabase, adminUserId, {
    settingArea: "daily_missions",
    entityKey: before.mission_key,
    fieldName: "row_update",
    oldValue: before,
    newValue: data,
  });
  invalidateEconomyCache();
  return { ok: true, row: data };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function updateMonthlyTierAdmin(supabase, adminUserId, id, patch) {
  const { data: before } = await supabase
    .from("reward_economy_monthly_tiers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!before) return { ok: false, code: "not_found" };

  const { data, error } = await supabase
    .from("reward_economy_monthly_tiers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, code: "update_failed", message: error.message };

  await logEconomyChange(supabase, adminUserId, {
    settingArea: "monthly_tiers",
    entityKey: String(before.minutes_threshold),
    fieldName: "row_update",
    oldValue: before,
    newValue: data,
  });
  invalidateEconomyCache();
  return { ok: true, row: data };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function updateGlobalSettingsAdmin(supabase, adminUserId, patch) {
  const existing = await getGlobalSettingsAdmin(supabase);
  if (!existing?.id) return { ok: false, code: "not_found" };

  const { data, error } = await supabase
    .from("reward_economy_global_settings")
    .update(patch)
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) return { ok: false, code: "update_failed", message: error.message };

  await logEconomyChange(supabase, adminUserId, {
    settingArea: "global_settings",
    entityKey: "global",
    fieldName: "row_update",
    oldValue: existing,
    newValue: data,
  });
  invalidateEconomyCache();
  return { ok: true, row: data };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function listEconomyChangeLog(supabase, { limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from("reward_economy_change_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return data || [];
}
