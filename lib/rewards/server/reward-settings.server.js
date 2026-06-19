/**
 * reward_card_settings read/write with short cache.
 */

const CACHE_TTL_MS = 60_000;
/** @type {{ map: Map<string, unknown>, loadedAt: number }} */
const cache = { map: new Map(), loadedAt: 0 };

export const DEFAULT_CARD_SETTINGS = {
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
  surprise_box_general_settings: {
    box_interval_minutes: 180,
    max_pending_boxes: 1,
    first_box_immediate: true,
    prevent_duplicate_in_box: true,
  },
};

function defaultsForKey(key) {
  return DEFAULT_CARD_SETTINGS[key];
}

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
  if (cache.map.has(key)) return cache.map.get(key);
  return defaultsForKey(key);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getAllCardSettings(supabase) {
  await loadAllSettings(supabase);
  const out = { ...DEFAULT_CARD_SETTINGS };
  for (const [k, v] of cache.map.entries()) {
    out[k] = v;
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
  return Math.floor(Number(prices?.[rarity] ?? DEFAULT_CARD_SETTINGS.shop_default_prices.regular));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} rarity
 */
export async function getDuplicateConversionValue(supabase, rarity) {
  const values = await getCardSetting(supabase, "duplicate_conversion_values");
  return Math.floor(Number(values?.[rarity] ?? DEFAULT_CARD_SETTINGS.duplicate_conversion_values.regular));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getDuplicateThreshold(supabase) {
  const v = await getCardSetting(supabase, "duplicate_threshold");
  return Math.floor(Number(v ?? DEFAULT_CARD_SETTINGS.duplicate_threshold));
}
