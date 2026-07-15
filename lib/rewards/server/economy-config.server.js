/**
 * Admin/DB economy config — single source of truth.
 *
 * Policy:
 * - REWARD_ECONOMY_SETTINGS_ENABLED must be true for runtime economy.
 * - No legacy-economy runtime imports (seed/migration only).
 * - Missing DB rows → EconomyUnavailableError (never silent defaults).
 */
import { isRewardEconomySettingsEnabled } from "../reward-feature-flags.js";
import {
  EconomyUnavailableError,
  ECONOMY_ERROR_CODES,
} from "../economy-errors.js";
const CACHE_TTL_MS = 60_000;
const GRADE_BANDS = Object.freeze(["g12", "g34", "g56"]);
/** @type {{
 *   snapshot: object|null,
 *   sessionCoins: object|null,
 *   entryCosts: object[]|null,
 *   payoutRules: Map<string, object>|null,
 *   soloGameRules: Map<string, object>|null,
 *   educationalGameRules: Map<string, object>|null,
 *   loadedAt: number,
 * }} */
const cache = {
  snapshot: null,
  sessionCoins: null,
  entryCosts: null,
  payoutRules: null,
  soloGameRules: null,
  educationalGameRules: null,
  loadedAt: 0,
};
function cacheFresh() {
  return Date.now() - cache.loadedAt < CACHE_TTL_MS;
}
/**
 * Product policy: legacy hardcoded economy is never allowed at runtime.
 * @returns {false}
 */
export function isLegacyEconomyRuntimeAllowed() {
  return false;
}
export function invalidateEconomyCache() {
  cache.snapshot = null;
  cache.sessionCoins = null;
  cache.entryCosts = null;
  cache.payoutRules = null;
  cache.soloGameRules = null;
  cache.educationalGameRules = null;
  cache.loadedAt = 0;
}
/**
 * @throws {EconomyUnavailableError}
 */
export function assertEconomyEnabled() {
  if (!isRewardEconomySettingsEnabled()) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_disabled,
      "כלכלת המטבעות כבויה - נדרש REWARD_ECONOMY_SETTINGS_ENABLED=true"
    );
  }
  if (isLegacyEconomyRuntimeAllowed()) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_disabled,
      "מצב legacy אינו מותר - כל הערכים חייבים לבוא מ-Admin/DB"
    );
  }
}
/**
 * @param {unknown} row
 */
function mapDailyMissionRow(row) {
  return {
    id: String(row.mission_key || ""),
    missionKey: String(row.mission_key || ""),
    gradeBand: String(row.grade_band || ""),
    textHe: String(row.text_he || ""),
    type: String(row.mission_type || ""),
    target: Math.floor(Number(row.target_value) || 0),
    rewardCoins: Math.floor(Number(row.reward_coins) || 0),
    displayOrder: Math.floor(Number(row.display_order) || 0),
  };
}
/**
 * @param {unknown} row
 */
function mapMonthlyTierRow(row) {
  return {
    minutes: Math.floor(Number(row.minutes_threshold) || 0),
    coins: Math.floor(Number(row.reward_coins) || 0),
    labelHe: String(row.label_he || ""),
    displayOrder: Math.floor(Number(row.display_order) || 0),
  };
}
/**
 * @param {{
 *   monthlyTiers: ReturnType<typeof mapMonthlyTierRow>[],
 *   dailyMissionsByBand: Record<string, ReturnType<typeof mapDailyMissionRow>[]>,
 *   globalCaps: { monthlyMinutesCap: number, monthlyCoinsCap: number },
 * }} snapshot
 */
function validateEconomySnapshot(snapshot) {
  const missing = [];
  if (!snapshot.monthlyTiers?.length) {
    missing.push("reward_economy_monthly_tiers");
  }
  if (!snapshot.globalCaps?.monthlyMinutesCap || !snapshot.globalCaps?.monthlyCoinsCap) {
    missing.push("reward_economy_global_settings");
  }
  for (const band of GRADE_BANDS) {
    const missions = snapshot.dailyMissionsByBand?.[band];
    if (!missions?.length) {
      missing.push(`reward_economy_daily_missions:${band}`);
    }
  }
  if (missing.length) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      "הגדרות כלכלת מטבעות חסרות ב-DB - יש להשלים ב-Admin",
      { details: { missing } }
    );
  }
}
/**
 * Load economy snapshot from DB (cached).
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function loadEconomySnapshotFromDb(supabase) {
  if (!supabase) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      "חסר חיבור DB לכלכלת מטבעות"
    );
  }
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
  if (dailyRes.error) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_db_error,
      `שגיאת DB: ${dailyRes.error.message}`,
      { details: { table: "reward_economy_daily_missions" } }
    );
  }
  if (monthlyRes.error) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_db_error,
      `שגיאת DB: ${monthlyRes.error.message}`,
      { details: { table: "reward_economy_monthly_tiers" } }
    );
  }
  if (globalRes.error) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_db_error,
      `שגיאת DB: ${globalRes.error.message}`,
      { details: { table: "reward_economy_global_settings" } }
    );
  }
  /** @type {Record<string, ReturnType<typeof mapDailyMissionRow>[]>} */
  const dailyMissionsByBand = Object.create(null);
  for (const band of GRADE_BANDS) {
    dailyMissionsByBand[band] = [];
  }
  for (const row of dailyRes.data || []) {
    const band = String(row.grade_band || "");
    if (!dailyMissionsByBand[band]) dailyMissionsByBand[band] = [];
    dailyMissionsByBand[band].push(mapDailyMissionRow(row));
  }
  const monthlyTiers = (monthlyRes.data || []).map(mapMonthlyTierRow);
  const g = globalRes.data;
  const globalCaps = {
    monthlyMinutesCap: g?.monthly_minutes_cap != null ? Math.floor(Number(g.monthly_minutes_cap)) : 0,
    monthlyCoinsCap: g?.monthly_coins_cap != null ? Math.floor(Number(g.monthly_coins_cap)) : 0,
  };
  return {
    monthlyTiers,
    dailyMissionsByBand,
    globalCaps,
    loadedAt: new Date().toISOString(),
  };
}
async function getOrLoadSnapshot(supabase) {
  if (cacheFresh() && cache.snapshot) return cache.snapshot;
  const snapshot = await loadEconomySnapshotFromDb(supabase);
  validateEconomySnapshot(snapshot);
  cache.snapshot = snapshot;
  cache.loadedAt = Date.now();
  return snapshot;
}
/**
 * Assert economy flag + load validated snapshot from DB.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function requireEconomyConfig(supabase) {
  assertEconomyEnabled();
  return getOrLoadSnapshot(supabase);
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getEconomySnapshot(supabase) {
  return requireEconomyConfig(supabase);
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} [gradeBand]
 */
export async function getDailyMissionsForGradeBand(supabase, gradeBand) {
  const snap = await requireEconomyConfig(supabase);
  const band = gradeBand || "g34";
  const missions = snap.dailyMissionsByBand[band];
  if (!missions?.length) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      `משימות יומיות חסרות לרצועת כיתה ${band}`,
      { details: { missing: [`reward_economy_daily_missions:${band}`] } }
    );
  }
  return missions.map((m) => ({
    id: m.id,
    textHe: m.textHe,
    type: m.type,
    target: m.target,
    rewardCoins: m.rewardCoins,
  }));
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getMonthlyPersistenceTiersFromSettings(supabase) {
  const snap = await requireEconomyConfig(supabase);
  return snap.monthlyTiers.map((t) => ({
    minutes: t.minutes,
    coins: t.coins,
    labelHe: t.labelHe,
  }));
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getMonthlyGlobalCaps(supabase) {
  const snap = await requireEconomyConfig(supabase);
  return { ...snap.globalCaps };
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function requireSessionCoinSettings(supabase) {
  assertEconomyEnabled();
  if (cacheFresh() && cache.sessionCoins) return cache.sessionCoins;
  const { data, error } = await supabase
    .from("reward_economy_session_coins")
    .select("base_coins, bonus_80_coins, bonus_95_coins, daily_cap")
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_db_error,
      `שגיאת DB: ${error.message}`,
      { details: { table: "reward_economy_session_coins" } }
    );
  }
  if (!data) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      "הגדרות מטבעות סשן לימוד חסרות ב-DB",
      { details: { missing: ["reward_economy_session_coins"] } }
    );
  }
  const settings = {
    baseCoins: Math.floor(Number(data.base_coins)),
    bonus80Coins: Math.floor(Number(data.bonus_80_coins)),
    bonus95Coins: Math.floor(Number(data.bonus_95_coins)),
    dailyCap: Math.floor(Number(data.daily_cap)),
  };
  if (settings.baseCoins <= 0 || settings.dailyCap <= 0) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      "הגדרות מטבעות סשן לימוד לא תקינות",
      { details: { missing: ["reward_economy_session_coins"] } }
    );
  }
  cache.sessionCoins = settings;
  if (!cache.loadedAt) cache.loadedAt = Date.now();
  return settings;
}
/**
 * @param {number|null|undefined} accuracy
 * @param {number|null|undefined} durationSeconds
 * @param {{ baseCoins: number, bonus80Coins: number, bonus95Coins: number }} settings
 */
export function calculateSessionCoinsFromSettings(accuracy, durationSeconds, settings) {
  if (!settings || settings.baseCoins <= 0) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      "חסרות הגדרות נוסחת מטבעות סשן"
    );
  }
  if (typeof durationSeconds !== "number" || durationSeconds <= 0) return 0;
  const base = settings.baseCoins;
  const acc = typeof accuracy === "number" && isFinite(accuracy) ? accuracy : 0;
  if (acc >= 95) return base + settings.bonus95Coins;
  if (acc >= 80) return base + settings.bonus80Coins;
  return base;
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getEntryCostOptions(supabase) {
  assertEconomyEnabled();
  if (cacheFresh() && cache.entryCosts) return cache.entryCosts.map((o) => ({ ...o }));
  const { data, error } = await supabase
    .from("reward_economy_entry_cost_options")
    .select("amount, label_he, display_order")
    .eq("is_active", true)
    .order("display_order");
  if (error) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_db_error,
      `שגיאת DB: ${error.message}`,
      { details: { table: "reward_economy_entry_cost_options" } }
    );
  }
  if (!data?.length) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      "קטלוג עלויות כניסה לארקייד חסר ב-DB",
      { details: { missing: ["reward_economy_entry_cost_options"] } }
    );
  }
  cache.entryCosts = data.map((row) => ({
    amount: Math.floor(Number(row.amount)),
    labelHe: String(row.label_he || ""),
    displayOrder: Math.floor(Number(row.display_order) || 0),
  }));
  if (!cache.loadedAt) cache.loadedAt = Date.now();
  return cache.entryCosts.map((o) => ({ ...o }));
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getActiveEntryCostAmounts(supabase) {
  const opts = await getEntryCostOptions(supabase);
  return opts.map((o) => o.amount);
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} gameKey
 */
export async function requireArcadePayoutRules(supabase, gameKey) {
  assertEconomyEnabled();
  const key = String(gameKey || "").trim();
  if (!key) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      "חסר מזהה משחק ארקייד"
    );
  }
  if (cacheFresh() && cache.payoutRules?.has(key)) {
    return { ...cache.payoutRules.get(key) };
  }
  const { data, error } = await supabase
    .from("reward_economy_arcade_payout_rules")
    .select("payout_rules_json, is_active")
    .eq("game_key", key)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_db_error,
      `שגיאת DB: ${error.message}`,
      { details: { table: "reward_economy_arcade_payout_rules", gameKey: key } }
    );
  }
  if (!data?.payout_rules_json || typeof data.payout_rules_json !== "object") {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      `כללי תשלום ארקייד חסרים למשחק ${key}`,
      { details: { missing: [`reward_economy_arcade_payout_rules:${key}`] } }
    );
  }
  if (!cache.payoutRules) cache.payoutRules = new Map();
  cache.payoutRules.set(key, data.payout_rules_json);
  if (!cache.loadedAt) cache.loadedAt = Date.now();
  return { ...data.payout_rules_json };
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} gameKey
 */
export async function requireSoloGameRules(supabase, gameKey) {
  assertEconomyEnabled();
  const key = String(gameKey || "").trim();
  if (!key) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      "חסר מזהה משחק solo"
    );
  }
  if (cacheFresh() && cache.soloGameRules?.has(key)) {
    return { ...cache.soloGameRules.get(key) };
  }
  const { data, error } = await supabase
    .from("reward_economy_solo_game_rules")
    .select("payout_rules_json, is_active")
    .eq("game_key", key)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_db_error,
      `שגיאת DB: ${error.message}`,
      { details: { table: "reward_economy_solo_game_rules", gameKey: key } }
    );
  }
  if (!data?.payout_rules_json || typeof data.payout_rules_json !== "object") {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      `כללי תשלום solo חסרים למשחק ${key}`,
      { details: { missing: [`reward_economy_solo_game_rules:${key}`] } }
    );
  }
  if (!cache.soloGameRules) cache.soloGameRules = new Map();
  cache.soloGameRules.set(key, data.payout_rules_json);
  if (!cache.loadedAt) cache.loadedAt = Date.now();
  return { ...data.payout_rules_json };
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} gameKey
 */
export async function requireEducationalGameRules(supabase, gameKey) {
  assertEconomyEnabled();
  const key = String(gameKey || "").trim();
  if (!key) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      "חסר מזהה משחק חינוכי",
    );
  }
  if (cacheFresh() && cache.educationalGameRules?.has(key)) {
    return { ...cache.educationalGameRules.get(key) };
  }
  const { data, error } = await supabase
    .from("reward_economy_educational_game_rules")
    .select("payout_rules_json, is_active")
    .eq("game_key", key)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_db_error,
      `שגיאת DB: ${error.message}`,
      { details: { table: "reward_economy_educational_game_rules", gameKey: key } },
    );
  }
  if (!data?.payout_rules_json || typeof data.payout_rules_json !== "object") {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      `כללי תשלום חינוכי חסרים למשחק ${key}`,
      { details: { missing: [`reward_economy_educational_game_rules:${key}`] } },
    );
  }
  if (!cache.educationalGameRules) cache.educationalGameRules = new Map();
  cache.educationalGameRules.set(key, data.payout_rules_json);
  if (!cache.loadedAt) cache.loadedAt = Date.now();
  return { ...data.payout_rules_json };
}
/**
 * @param {number} entryCost
 * @param {number} playerCount
 * @param {Record<string, unknown>} rules
 */
export function computeArcadeWinnerPot(entryCost, playerCount, rules) {
  const entry = Math.max(0, Math.floor(Number(entryCost)));
  const players = Math.max(0, Math.floor(Number(playerCount)));
  if (entry <= 0 || players <= 0) return 0;
  if (rules?.winner_takes_pot === true) {
    return entry * players;
  }
  const mult = Math.floor(Number(rules?.pot_multiplier));
  if (Number.isFinite(mult) && mult > 0) {
    return entry * mult;
  }
  throw new EconomyUnavailableError(
    ECONOMY_ERROR_CODES.economy_config_missing,
    "כללי תשלום ארקייד לא תקינים - חסר winner_takes_pot או pot_multiplier"
  );
}
/**
 * @param {number} potTotal
 * @param {Record<string, unknown>} rules
 */
export function computeBingoRowPrizeAmount(potTotal, rules) {
  const pot = Math.max(0, Math.floor(Number(potTotal)));
  const pct = Number(rules?.bingo_row_pot_pct);
  if (!Number.isFinite(pct) || pct < 0) {
    throw new EconomyUnavailableError(
      ECONOMY_ERROR_CODES.economy_config_missing,
      "כללי בינגו חסרים - bingo_row_pot_pct"
    );
  }
  return Math.max(0, Math.floor(pot * pct));
}
/**
 * Student-facing economy payload (home + learning profile + economy-config API).
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function buildStudentEconomyConfigPayload(supabase) {
  const [snap, sessionCoins, entryCosts] = await Promise.all([
    requireEconomyConfig(supabase),
    requireSessionCoinSettings(supabase),
    getEntryCostOptions(supabase),
  ]);
  const monthlyTiers = snap.monthlyTiers.map((t) => ({
    minutes: t.minutes,
    coins: t.coins,
    labelHe: `${t.coins.toLocaleString("he-IL")} מטבעות`,
  }));
  return {
    monthlyTiers,
    monthlyMinutesCap: snap.globalCaps.monthlyMinutesCap,
    monthlyCoinsCap: snap.globalCaps.monthlyCoinsCap,
    goalMinutes: snap.globalCaps.monthlyMinutesCap,
    sessionCoins: {
      baseCoins: sessionCoins.baseCoins,
      bonus80Coins: sessionCoins.bonus80Coins,
      bonus95Coins: sessionCoins.bonus95Coins,
      dailyCap: sessionCoins.dailyCap,
    },
    entryCostOptions: entryCosts.map((o) => ({
      amount: o.amount,
      labelHe: o.labelHe,
    })),
    loadedAt: snap.loadedAt,
  };
}
// ── Admin helpers (session coins, entry costs, payout rules) ─────────────────
async function logEconomyChangeInline(supabase, adminUserId, {
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
export async function getSessionCoinsAdmin(supabase) {
  const { data, error } = await supabase
    .from("reward_economy_session_coins")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} adminUserId
 * @param {object} patch
 */
export async function updateSessionCoinsAdmin(supabase, adminUserId, patch) {
  const existing = await getSessionCoinsAdmin(supabase);
  if (!existing?.id) return { ok: false, code: "not_found" };
  const { data, error } = await supabase
    .from("reward_economy_session_coins")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) return { ok: false, code: "update_failed", message: error.message };
  await logEconomyChangeInline(supabase, adminUserId, {
    settingArea: "session_coins",
    entityKey: "singleton",
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
export async function listEntryCostOptionsAdmin(supabase) {
  const { data, error } = await supabase
    .from("reward_economy_entry_cost_options")
    .select("*")
    .order("display_order");
  if (error) throw new Error(error.message);
  return data || [];
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} adminUserId
 * @param {string} id
 * @param {object} patch
 */
export async function updateEntryCostOptionAdmin(supabase, adminUserId, id, patch) {
  const { data: before } = await supabase
    .from("reward_economy_entry_cost_options")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!before) return { ok: false, code: "not_found" };
  const { data, error } = await supabase
    .from("reward_economy_entry_cost_options")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, code: "update_failed", message: error.message };
  await logEconomyChangeInline(supabase, adminUserId, {
    settingArea: "entry_cost_options",
    entityKey: String(before.amount),
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
export async function listArcadePayoutRulesAdmin(supabase) {
  const { data, error } = await supabase
    .from("reward_economy_arcade_payout_rules")
    .select("*, arcade_games(title)")
    .order("game_key");
  if (error) throw new Error(error.message);
  return data || [];
}
/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} adminUserId
 * @param {string} id
 * @param {object} patch
 */
export async function updateArcadePayoutRuleAdmin(supabase, adminUserId, id, patch) {
  const { data: before } = await supabase
    .from("reward_economy_arcade_payout_rules")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!before) return { ok: false, code: "not_found" };
  const { data, error } = await supabase
    .from("reward_economy_arcade_payout_rules")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, code: "update_failed", message: error.message };
  await logEconomyChangeInline(supabase, adminUserId, {
    settingArea: "arcade_payout_rules",
    entityKey: before.game_key,
    fieldName: "row_update",
    oldValue: before,
    newValue: data,
  });
  invalidateEconomyCache();
  return { ok: true, row: data };
}
