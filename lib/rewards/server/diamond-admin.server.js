import {
  SOLO_GAME_KEYS,
  SOLO_GAME_REGISTRY,
} from "../../solo-games/solo-game-registry.js";
import { invalidateEconomyCache } from "./economy-config.server.js";
import {
  getCardSetting,
  invalidateSettingsCache,
} from "./reward-settings.server.js";

export const DIAMOND_RULE_MODES = Object.freeze(["in_game_collect", "win_only"]);

const SURPRISE_BOX_DIAMOND_KEY = "surprise_box_diamond_rewards";

/**
 * @param {unknown} raw
 */
export function normalizeDiamondRules(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const mode = DIAMOND_RULE_MODES.includes(String(r.mode)) ? String(r.mode) : "win_only";
  return {
    enabled: r.enabled === true,
    mode,
    fixedAmount: Math.max(0, Math.floor(Number(r.fixedAmount) || 0)),
    tiers: (Array.isArray(r.tiers) ? r.tiers : [])
      .map((tier) => ({
        minScore: Math.max(0, Math.floor(Number(tier?.minScore) || 0)),
        amount: Math.max(0, Math.floor(Number(tier?.amount) || 0)),
      }))
      .filter((tier) => tier.amount > 0),
    inGameCollectMultiplier: Math.max(0, Number(r.inGameCollectMultiplier) || 1),
    maxPerSession: Math.max(0, Math.floor(Number(r.maxPerSession) || 0)),
    onlyOnWin: r.onlyOnWin === true,
  };
}

/**
 * @param {unknown} raw
 */
export function validateDiamondRules(raw) {
  const value = normalizeDiamondRules(raw);
  if (value.maxPerSession > 1000) {
    return { ok: false, messageHe: "מקסימום יהלומים למשחק חייב להיות עד 1000" };
  }
  if (value.fixedAmount > 1000) {
    return { ok: false, messageHe: "כמות יהלומים קבועה חייבת להיות עד 1000" };
  }
  if (value.inGameCollectMultiplier > 100) {
    return { ok: false, messageHe: "מכפיל איסוף במשחק חייב להיות עד 100" };
  }
  for (const tier of value.tiers) {
    if (tier.amount > 1000) {
      return { ok: false, messageHe: "כמות יהלומים בדרגה חייבת להיות עד 1000" };
    }
  }
  return { ok: true, value };
}

/**
 * @param {unknown} raw
 */
export function normalizeSurpriseBoxDiamondRewards(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      amount: Math.max(0, Math.floor(Number(row?.amount) || 0)),
      weight: Math.max(0, Math.floor(Number(row?.weight) || 0)),
    }))
    .filter((row) => row.amount > 0 && row.weight > 0);
}

/**
 * @param {unknown} raw
 */
export function validateSurpriseBoxDiamondRewards(raw) {
  const rewards = normalizeSurpriseBoxDiamondRewards(raw);
  if (rewards.length === 0) {
    return { ok: false, messageHe: "חייב לפחות פרס יהלום אחד (סכום + משקל)" };
  }
  if (rewards.length > 20) {
    return { ok: false, messageHe: "עד 20 פרסי יהלומים" };
  }
  return { ok: true, value: rewards };
}

async function logDiamondEconomyChange(supabase, adminUserId, payload) {
  await supabase.from("reward_economy_change_log").insert({
    admin_user_id: adminUserId,
    setting_area: payload.settingArea,
    entity_key: payload.entityKey ?? null,
    field_name: payload.fieldName,
    old_value_json: payload.oldValue ?? null,
    new_value_json: payload.newValue ?? null,
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function listSoloDiamondRulesAdmin(supabase) {
  const { data, error } = await supabase
    .from("reward_economy_solo_game_rules")
    .select("game_key,payout_rules_json,is_active")
    .in("game_key", [...SOLO_GAME_KEYS])
    .order("game_key", { ascending: true });

  if (error) throw new Error(error.message);

  const byKey = new Map((data || []).map((row) => [row.game_key, row]));

  return SOLO_GAME_KEYS.map((gameKey) => {
    const row = byKey.get(gameKey);
    const meta = SOLO_GAME_REGISTRY[gameKey];
    const payout = row?.payout_rules_json && typeof row.payout_rules_json === "object"
      ? row.payout_rules_json
      : {};
    return {
      gameKey,
      titleHe: meta?.titleHe || gameKey,
      isActive: row?.is_active === true,
      diamondRules: normalizeDiamondRules(payout.diamondRules),
    };
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} adminUserId
 * @param {string} gameKey
 * @param {unknown} diamondRulesRaw
 */
export async function updateSoloDiamondRulesAdmin(supabase, adminUserId, gameKey, diamondRulesRaw) {
  const key = String(gameKey || "").trim();
  if (!SOLO_GAME_KEYS.includes(key)) {
    return { ok: false, code: "invalid_game_key", messageHe: "משחק solo לא תקין" };
  }

  const validated = validateDiamondRules(diamondRulesRaw);
  if (!validated.ok) {
    return { ok: false, code: "invalid_rules", messageHe: validated.messageHe };
  }

  const { data: existing, error: loadErr } = await supabase
    .from("reward_economy_solo_game_rules")
    .select("game_key,payout_rules_json")
    .eq("game_key", key)
    .maybeSingle();

  if (loadErr) {
    return { ok: false, code: "db_error", messageHe: loadErr.message };
  }
  if (!existing?.game_key) {
    return { ok: false, code: "not_found", messageHe: "כללי משחק לא נמצאו" };
  }

  const payout =
    existing.payout_rules_json && typeof existing.payout_rules_json === "object"
      ? { ...existing.payout_rules_json }
      : {};
  const oldDiamondRules = payout.diamondRules ?? null;
  payout.diamondRules = validated.value;

  const { data: updated, error: updErr } = await supabase
    .from("reward_economy_solo_game_rules")
    .update({ payout_rules_json: payout, updated_at: new Date().toISOString() })
    .eq("game_key", key)
    .select("game_key,payout_rules_json")
    .single();

  if (updErr) {
    return { ok: false, code: "update_failed", messageHe: updErr.message };
  }

  await logDiamondEconomyChange(supabase, adminUserId, {
    settingArea: "diamond_solo_rules",
    entityKey: key,
    fieldName: "diamondRules",
    oldValue: oldDiamondRules,
    newValue: validated.value,
  });

  invalidateEconomyCache();

  return {
    ok: true,
    gameKey: key,
    diamondRules: normalizeDiamondRules(updated?.payout_rules_json?.diamondRules),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getSurpriseBoxDiamondRewardsAdmin(supabase) {
  try {
    const rewards = await getCardSetting(supabase, SURPRISE_BOX_DIAMOND_KEY);
    return normalizeSurpriseBoxDiamondRewards(rewards);
  } catch {
    return [];
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} adminUserId
 * @param {unknown} rewardsRaw
 */
export async function updateSurpriseBoxDiamondRewardsAdmin(supabase, adminUserId, rewardsRaw) {
  const validated = validateSurpriseBoxDiamondRewards(rewardsRaw);
  if (!validated.ok) {
    return { ok: false, code: "invalid_rewards", messageHe: validated.messageHe };
  }

  let before = [];
  try {
    before = normalizeSurpriseBoxDiamondRewards(
      await getCardSetting(supabase, SURPRISE_BOX_DIAMOND_KEY)
    );
  } catch {
    before = [];
  }

  const { data, error } = await supabase
    .from("reward_card_settings")
    .upsert(
      { setting_key: SURPRISE_BOX_DIAMOND_KEY, setting_value_json: validated.value },
      { onConflict: "setting_key" }
    )
    .select("*")
    .single();

  if (error) {
    return { ok: false, code: "update_failed", messageHe: error.message };
  }

  await logDiamondEconomyChange(supabase, adminUserId, {
    settingArea: "diamond_surprise_box",
    entityKey: SURPRISE_BOX_DIAMOND_KEY,
    fieldName: SURPRISE_BOX_DIAMOND_KEY,
    oldValue: before,
    newValue: validated.value,
  });

  invalidateSettingsCache();

  return {
    ok: true,
    rewards: normalizeSurpriseBoxDiamondRewards(data?.setting_value_json),
  };
}
