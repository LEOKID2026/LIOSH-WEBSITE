/**
 * Admin-managed coin economy — DB only (no legacy runtime fallbacks).
 */

import {
  getDailyMissionsForGradeBand,
  getMonthlyPersistenceTiersFromSettings,
  getMonthlyGlobalCaps,
  invalidateEconomyCache,
} from "./economy-config.server.js";

export {
  getDailyMissionsForGradeBand,
  getMonthlyPersistenceTiersFromSettings,
  getMonthlyGlobalCaps,
  invalidateEconomyCache,
};

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
