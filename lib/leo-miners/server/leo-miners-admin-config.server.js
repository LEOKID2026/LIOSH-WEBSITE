import { writeAdminAuditRow } from "../../admin-server/admin-audit.server.js";
import { isDbSchemaNotReadyError } from "../../teacher-server/teacher-audit.server.js";
import { LEO_MINERS_CONFIG_ID, LEO_MINERS_GAME_KEY } from "../leo-miners-constants.js";
import {
  cloneLeoMinersDefaultSettings,
  LEO_MINERS_DEFAULT_SETTINGS,
} from "./leo-miners-default-settings.js";
import {
  invalidateLeoMinersConfigCache,
  mergeLeoMinersConfig,
} from "./leo-miners-config.server.js";
import { checkLeoMinersDbReady } from "./leo-miners-state.server.js";

const BOOLEAN_KEYS = Object.freeze([
  "enabled",
  "economy_enabled",
  "accrue_enabled",
  "claim_enabled",
  "offline_enabled",
  "gifts_enabled",
  "diamond_chest_enabled",
  "guest_play_enabled",
  "guest_claim_enabled",
  "guest_diamond_enabled",
  "reject_impossible_stage_jump",
]);

const NON_NEGATIVE_NUMBER_KEYS = Object.freeze([
  "daily_points_cap",
  "daily_coins_cap",
  "max_coins_per_claim",
  "min_points_to_claim",
  "points_to_coins_ratio",
  "claim_cooldown_sec",
  "diamond_chest_cost",
  "diamond_chest_amount",
  "daily_diamond_cap",
  "max_diamonds_per_claim",
  "offline_cap_hours",
  "offline_factor",
  "offline_min_seconds",
  "offline_max_claims_per_day",
  "max_breaks_per_minute",
  "max_breaks_per_batch",
  "max_stage",
  "max_offline_elapsed_sec",
  "guest_multiplier",
  "guest_daily_points_cap",
  "guest_daily_coins_cap",
  "guest_daily_diamond_cap",
  "base_dps",
  "level_dps_multiplier",
  "rock_base_hp",
  "rock_hp_multiplier",
  "gold_factor",
  "spawn_initial_cost",
  "spawn_cost_multiplier",
  "dps_upgrade_multiplier",
  "gold_upgrade_multiplier",
  "auto_dog_interval_sec",
  "auto_dog_bank_cap",
  "base_stage_v1",
]);

const COINS_ROUNDING_VALUES = Object.freeze(["floor", "ceil", "round"]);

function isMissingConfigTable(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (msg.includes("leo_miners_config") && msg.includes("does not exist"))
  );
}

function validateSoftcut(value) {
  if (!Array.isArray(value) || !value.length) {
    return { ok: false, code: "invalid_softcut", message: "softcut חייב להיות מערך לא ריק" };
  }
  for (const seg of value) {
    if (!seg || typeof seg !== "object") {
      return { ok: false, code: "invalid_softcut", message: "מקטע softcut לא תקין" };
    }
    const upto = Number(seg.upto);
    const factor = Number(seg.factor);
    if (!Number.isFinite(upto) || upto < 0 || !Number.isFinite(factor) || factor < 0) {
      return { ok: false, code: "invalid_softcut", message: "ערכי softcut חייבים להיות לא שליליים" };
    }
  }
  return { ok: true, value };
}

function validateStageBlocks(value) {
  if (!Array.isArray(value) || !value.length) {
    return { ok: false, code: "invalid_stage_blocks", message: "stage_blocks חייב להיות מערך לא ריק" };
  }
  for (const block of value) {
    if (!block || typeof block !== "object") {
      return { ok: false, code: "invalid_stage_blocks", message: "בלוק stage_blocks לא תקין" };
    }
    const start = Math.floor(Number(block.start));
    const end = Math.floor(Number(block.end));
    const r = Number(block.r);
    if (start < 1 || end < start || !Number.isFinite(r) || r <= 0) {
      return { ok: false, code: "invalid_stage_blocks", message: "ערכי stage_blocks לא תקינים" };
    }
  }
  return { ok: true, value };
}

/**
 * @param {Record<string, unknown>} patch
 * @param {Record<string, unknown>} current
 */
export function validateLeoMinersSettingsPatch(patch, current = {}) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return { ok: false, code: "invalid_settings", message: "settings חייב להיות אובייקט" };
  }

  /** @type {Record<string, unknown>} */
  const merged = { ...current };

  for (const [key, raw] of Object.entries(patch)) {
    if (!(key in LEO_MINERS_DEFAULT_SETTINGS) && key !== "softcut" && key !== "stage_blocks") {
      return { ok: false, code: "unknown_setting_key", message: `מפתח לא מוכר: ${key}` };
    }

    if (BOOLEAN_KEYS.includes(key)) {
      if (typeof raw !== "boolean") {
        return { ok: false, code: "invalid_boolean", message: `${key} חייב להיות boolean` };
      }
      merged[key] = raw;
      continue;
    }

    if (key === "coins_rounding") {
      const val = String(raw || "").trim().toLowerCase();
      if (!COINS_ROUNDING_VALUES.includes(val)) {
        return { ok: false, code: "invalid_coins_rounding", message: "coins_rounding לא תקין" };
      }
      merged[key] = val;
      continue;
    }

    if (key === "softcut") {
      const check = validateSoftcut(raw);
      if (!check.ok) return check;
      merged.softcut = check.value;
      continue;
    }

    if (key === "stage_blocks") {
      const check = validateStageBlocks(raw);
      if (!check.ok) return check;
      merged.stage_blocks = check.value;
      continue;
    }

    if (NON_NEGATIVE_NUMBER_KEYS.includes(key)) {
      const num = Number(raw);
      if (!Number.isFinite(num) || num < 0) {
        return { ok: false, code: "invalid_number", message: `${key} חייב להיות מספר לא שלילי` };
      }
      merged[key] = num;
      continue;
    }

    return { ok: false, code: "unknown_setting_key", message: `מפתח לא מוכר: ${key}` };
  }

  return { ok: true, settings: merged };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 */
export async function getLeoMinersAdminConfigView(serviceRole) {
  const dbReady = await checkLeoMinersDbReady(serviceRole);

  let row = null;
  let configError = null;

  if (dbReady) {
    const { data, error } = await serviceRole
      .from("leo_miners_config")
      .select("settings_json, is_active, updated_at")
      .eq("id", LEO_MINERS_CONFIG_ID)
      .maybeSingle();

    if (error) {
      if (isMissingConfigTable(error)) {
        configError = "miners_db_not_ready";
      } else {
        throw error;
      }
    } else {
      row = data;
    }
  }

  const { data: catalogRow } = await serviceRole
    .from("site_game_catalog")
    .select("is_enabled")
    .eq("game_key", LEO_MINERS_GAME_KEY)
    .maybeSingle();

  const { data: soloRow } = await serviceRole
    .from("reward_economy_solo_game_rules")
    .select("is_active, payout_rules_json")
    .eq("game_key", LEO_MINERS_GAME_KEY)
    .maybeSingle();

  const defaults = cloneLeoMinersDefaultSettings();
  const merged = mergeLeoMinersConfig(row?.settings_json || {}, row?.is_active === true);

  return {
    ok: true,
    dbReady: dbReady && !configError,
    configError,
    defaults,
    config: {
      id: LEO_MINERS_CONFIG_ID,
      isActive: row?.is_active === true,
      settings: row?.settings_json && typeof row.settings_json === "object" ? row.settings_json : {},
      merged,
      updatedAt: row?.updated_at || null,
    },
    catalogEnabled: catalogRow?.is_enabled === true,
    soloRuleActive: soloRow?.is_active === true,
    soloPayoutRules: soloRow?.payout_rules_json || null,
    gameEnabled:
      row?.is_active === true &&
      merged.enabled === true &&
      catalogRow?.is_enabled === true,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceRole
 * @param {string} adminUserId
 * @param {Record<string, unknown>} body
 */
export async function updateLeoMinersAdminConfig(serviceRole, adminUserId, body) {
  const dbReady = await checkLeoMinersDbReady(serviceRole);
  if (!dbReady) {
    return { ok: false, status: 503, code: "miners_db_not_ready", message: "miners_db_not_ready" };
  }

  const resetToDefaults = body?.resetToDefaults === true;

  const { data: beforeRow, error: loadError } = await serviceRole
    .from("leo_miners_config")
    .select("settings_json, is_active, updated_at")
    .eq("id", LEO_MINERS_CONFIG_ID)
    .maybeSingle();

  if (loadError) {
    if (isMissingConfigTable(loadError) || isDbSchemaNotReadyError(loadError)) {
      return { ok: false, status: 503, code: "miners_db_not_ready", message: "miners_db_not_ready" };
    }
    throw loadError;
  }

  const beforeSettings =
    beforeRow?.settings_json && typeof beforeRow.settings_json === "object"
      ? beforeRow.settings_json
      : {};

  let nextSettings = resetToDefaults ? cloneLeoMinersDefaultSettings() : { ...beforeSettings };

  if (!resetToDefaults && body?.settings && typeof body.settings === "object") {
    const validated = validateLeoMinersSettingsPatch(body.settings, beforeSettings);
    if (!validated.ok) {
      return { ok: false, status: 400, code: validated.code, message: validated.message };
    }
    nextSettings = validated.settings;
  }

  const nextIsActive =
    typeof body?.isActive === "boolean" ? body.isActive : beforeRow?.is_active === true;

  const { data: updatedRow, error: updateError } = await serviceRole
    .from("leo_miners_config")
    .upsert(
      {
        id: LEO_MINERS_CONFIG_ID,
        settings_json: nextSettings,
        is_active: nextIsActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("settings_json, is_active, updated_at")
    .single();

  if (updateError) throw updateError;

  invalidateLeoMinersConfigCache();

  let catalogEnabled = null;
  if (typeof body?.catalogEnabled === "boolean") {
    const { updateSiteGameCatalogEnabled } = await import(
      "../../games/server/game-access.server.js"
    );
    const catalogResult = await updateSiteGameCatalogEnabled(
      serviceRole,
      LEO_MINERS_GAME_KEY,
      body.catalogEnabled,
      adminUserId
    );
    if (!catalogResult.ok) {
      return { ok: false, status: 404, code: catalogResult.code, message: catalogResult.message };
    }
    catalogEnabled = body.catalogEnabled;
  }

  let soloRuleActive = null;
  if (typeof body?.soloRuleActive === "boolean") {
    const { error: soloError } = await serviceRole
      .from("reward_economy_solo_game_rules")
      .update({ is_active: body.soloRuleActive, updated_at: new Date().toISOString() })
      .eq("game_key", LEO_MINERS_GAME_KEY);

    if (soloError) {
      if (isDbSchemaNotReadyError(soloError)) {
        return { ok: false, status: 503, code: "miners_db_not_ready", message: "miners_db_not_ready" };
      }
      throw soloError;
    }
    soloRuleActive = body.soloRuleActive;
  }

  await writeAdminAuditRow(serviceRole, {
    adminUserId,
    targetType: "leo_miners_config",
    targetId: LEO_MINERS_CONFIG_ID,
    action: resetToDefaults ? "leo_miners_config_reset" : "leo_miners_config_update",
    beforeState: {
      is_active: beforeRow?.is_active ?? null,
      settings_json: beforeSettings,
    },
    afterState: {
      is_active: updatedRow.is_active,
      settings_json: updatedRow.settings_json,
      catalogEnabled,
      soloRuleActive,
    },
    notes: resetToDefaults ? "reset to defaults" : null,
  });

  const view = await getLeoMinersAdminConfigView(serviceRole);

  return {
    ok: true,
    resetToDefaults,
    config: view.config,
    dbReady: view.dbReady,
    catalogEnabled: catalogEnabled ?? view.catalogEnabled,
    soloRuleActive: soloRuleActive ?? view.soloRuleActive,
    gameEnabled: view.gameEnabled,
    merged: view.config.merged,
  };
}

export { BOOLEAN_KEYS, NON_NEGATIVE_NUMBER_KEYS, COINS_ROUNDING_VALUES };
