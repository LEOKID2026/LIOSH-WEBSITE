import { parseSurpriseBoxGeneralSettings } from "../rewards/server/surprise-box-settings.server.js";

const GUEST_SETTING_KEYS = Object.freeze([
  "guest_mode_enabled",
  "guest_defaults",
  "guest_economy",
  "surprise_box_guest_settings",
]);

/** @type {{ map: Map<string, unknown>, loadedAt: number }} */
const cache = { map: new Map(), loadedAt: 0 };
const CACHE_TTL_MS = 30_000;

function isMissingGuestSettingsTable(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return msg.includes("guest_mode_settings") && (msg.includes("does not exist") || msg.includes("relation"));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function loadGuestSettingsMap(supabase) {
  const now = Date.now();
  if (cache.map.size > 0 && now - cache.loadedAt < CACHE_TTL_MS) {
    return cache.map;
  }

  const { data, error } = await supabase
    .from("guest_mode_settings")
    .select("setting_key, setting_value_json")
    .in("setting_key", [...GUEST_SETTING_KEYS]);

  if (error) {
    if (isMissingGuestSettingsTable(error)) {
      return new Map();
    }
    throw error;
  }

  const map = new Map();
  for (const row of data || []) {
    if (row?.setting_key) map.set(row.setting_key, row.setting_value_json);
  }
  cache.map = map;
  cache.loadedAt = now;
  return map;
}

/** @param {unknown} raw */
export function parseGuestModeEnabled(raw) {
  if (raw && typeof raw === "object" && "enabled" in raw) {
    return raw.enabled === true;
  }
  return false;
}

/** @param {unknown} raw */
export function parseGuestDefaults(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};
  const games = Number(obj.games_per_category);
  const topics = Number(obj.topics_per_subject);
  return {
    gamesPerCategory: Number.isFinite(games) && games > 0 ? Math.min(games, 20) : 2,
    topicsPerSubject: Number.isFinite(topics) && topics > 0 ? Math.min(topics, 20) : 2,
  };
}

/** @param {unknown} raw */
export function parseGuestEconomy(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};
  return {
    shopEnabled: obj.shop_enabled !== false,
    cardsEnabled: obj.cards_enabled !== false,
  };
}

/** @param {unknown} raw */
export function parseGuestSurpriseBoxSettings(raw) {
  return parseSurpriseBoxGeneralSettings(raw);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function loadGuestRuntimeConfig(supabase) {
  const map = await loadGuestSettingsMap(supabase);
  return {
    enabled: parseGuestModeEnabled(map.get("guest_mode_enabled")),
    defaults: parseGuestDefaults(map.get("guest_defaults")),
    economy: parseGuestEconomy(map.get("guest_economy")),
    surpriseBox: parseGuestSurpriseBoxSettings(map.get("surprise_box_guest_settings")),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} settingKey
 * @param {unknown} valueJson
 */
export async function upsertGuestSetting(supabase, settingKey, valueJson) {
  const { data, error } = await supabase
    .from("guest_mode_settings")
    .upsert(
      {
        setting_key: settingKey,
        setting_value_json: valueJson,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" }
    )
    .select("setting_key, setting_value_json, updated_at")
    .single();

  if (error) throw error;
  cache.loadedAt = 0;
  return data;
}

export function invalidateGuestSettingsCache() {
  cache.loadedAt = 0;
  cache.map.clear();
}
