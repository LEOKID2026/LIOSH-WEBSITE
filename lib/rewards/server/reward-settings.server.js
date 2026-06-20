/**
 * reward_card_settings read/write with short cache — fail-closed (no runtime defaults).
 */

import {
  EconomyUnavailableError,
  ECONOMY_ERROR_CODES,
} from "../economy-errors.js";
import { validateSurpriseBoxGeneralSettings } from "./surprise-box-settings.server.js";

const CACHE_TTL_MS = 60_000;

/** Seed values for migrations only — never used at runtime. */
export const SEED_CARD_SETTINGS = {
  system_enabled: false,
  shop_default_prices: { regular: 8000, special: 18000, rare: 40000, gold: 90000 },
  surprise_box_coin_rewards: [
    { amount: 500, weight: 4500 },
    { amount: 1000, weight: 3000 },
    { amount: 2000, weight: 1500 },
    { amount: 4000, weight: 800 },
    { amount: 10000, weight: 200 },
  ],
  surprise_box_card_rarity_weights: { regular: 7800, special: 1700, rare: 450, gold: 50 },
  duplicate_conversion_values: { regular: 2500, special: 6000, rare: 15000, gold: 35000 },
  duplicate_threshold: 10,
  duplicate_sellback_percent: 25,
  surprise_box_general_settings: {
    box_interval_minutes: 180,
    max_pending_boxes: 1,
    first_box_immediate: true,
    prevent_duplicate_in_box: true,
    cards_per_open: 2,
    coin_prizes_per_open: 1,
  },
};

export const CARD_SETTING_KEYS = Object.freeze([
  "system_enabled",
  "shop_default_prices",
  "surprise_box_coin_rewards",
  "surprise_box_card_rarity_weights",
  "duplicate_conversion_values",
  "duplicate_threshold",
  "duplicate_sellback_percent",
  "surprise_box_general_settings",
]);

/** @type {{ map: Map<string, unknown>, loadedAt: number }} */
const cache = { map: new Map(), loadedAt: 0 };

async function loadAllSettings(supabase) {
  if (Date.now() - cache.loadedAt < CACHE_TTL_MS && cache.map.size > 0) return;
  const { data, error } = await supabase.from("reward_card_settings").select("setting_key, setting_value_json");
  if (error) throw new Error(error.message);
  cache.map = new Map();
  for (const row of data || []) {
    cache.map.set(row.setting_key, row.setting_value_json);
  }
  cache.loadedAt = Date.now();
}

export function invalidateSettingsCache() {
  cache.loadedAt = 0;
  cache.map = new Map();
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getCardSetting(supabase, key) {
  await loadAllSettings(supabase);
  if (!cache.map.has(key)) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      `הגדרת קלפים חסרה ב-DB: ${key}`,
      { details: { missing: [`reward_card_settings:${key}`] } }
    );
  }
  return cache.map.get(key);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getAllCardSettings(supabase) {
  await loadAllSettings(supabase);
  const missing = CARD_SETTING_KEYS.filter((k) => !cache.map.has(k));
  if (missing.length) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      "הגדרות קלפים חסרות ב-DB",
      { details: { missing: missing.map((k) => `reward_card_settings:${k}`) } }
    );
  }
  const out = {};
  for (const k of CARD_SETTING_KEYS) {
    out[k] = cache.map.get(k);
  }
  return out;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function isCardRewardsSystemEnabledInDb(supabase) {
  const v = await getCardSetting(supabase, "system_enabled");
  return v === true;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function updateCardSetting(supabase, key, valueJson) {
  if (key === "duplicate_sellback_percent") {
    const n = Math.floor(Number(valueJson));
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new Error("אחוז מכירת כפילויות חייב להיות בין 0 ל-100");
    }
    valueJson = n;
  }
  if (key === "surprise_box_general_settings") {
    const validated = validateSurpriseBoxGeneralSettings(valueJson);
    if (!validated.ok) {
      throw new Error(validated.messageHe);
    }
    valueJson = validated.value;
  }
  const { data, error } = await supabase
    .from("reward_card_settings")
    .upsert({ setting_key: key, setting_value_json: valueJson }, { onConflict: "setting_key" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  invalidateSettingsCache();
  return data;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {object} card
 */
export async function resolveCardPrice(supabase, card) {
  if (!card.use_default_price && card.price_coins != null) {
    return Math.floor(Number(card.price_coins));
  }
  const prices = await getCardSetting(supabase, "shop_default_prices");
  const rarity = card.rarity || "regular";
  const price = prices?.[rarity];
  if (price == null) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      `מחיר ברירת מחדל חסר לנדירות ${rarity}`
    );
  }
  return Math.floor(Number(price));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} rarity
 */
export async function getDuplicateConversionValue(supabase, rarity) {
  const values = await getCardSetting(supabase, "duplicate_conversion_values");
  const v = values?.[rarity];
  if (v == null) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      `ערך המרת כפילות חסר לנדירות ${rarity}`
    );
  }
  return Math.floor(Number(v));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getDuplicateThreshold(supabase) {
  const v = await getCardSetting(supabase, "duplicate_threshold");
  return Math.floor(Number(v));
}

/**
 * @param {number} priceCoins
 * @param {number} sellbackPercent
 */
export function computeCardSellbackCoins(priceCoins, sellbackPercent) {
  const price = Math.floor(Number(priceCoins) || 0);
  const pct = Math.floor(Number(sellbackPercent) || 0);
  if (price <= 0 || pct <= 0) return 0;
  return Math.floor((price * pct) / 100);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getDuplicateSellbackPercent(supabase) {
  const v = await getCardSetting(supabase, "duplicate_sellback_percent");
  return Math.floor(Number(v));
}
