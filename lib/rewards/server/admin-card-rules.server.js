/**
 * Admin card rules CRUD helpers.
 */

import { buildRuleRowFromAdminPayload } from "../card-rule-params.js";
import { isGrantableRuleType } from "../card-rule-types.js";

const ALLOWED_RULE_TYPES = new Set([
  "total_questions",
  "weekly_questions",
  "subject_questions",
  "subject_accuracy",
  "learning_streak_days",
  "parent_activity_complete",
  "monthly_learning_minutes",
  "active_days_streak",
  "grade_band_only",
  "event_window",
  "daily_mission_complete",
  "subject_improvement",
]);

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} cardId
 */
export async function listCardRules(supabase, cardId) {
  const { data, error } = await supabase
    .from("reward_card_rules")
    .select("*")
    .eq("card_id", cardId)
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * @param {object} body
 */
export function validateRulePayload(body) {
  const ruleType = String(body?.rule_type || "").trim();
  if (!ALLOWED_RULE_TYPES.has(ruleType)) {
    return { ok: false, code: "invalid_rule_type", message: "סוג חוק לא תקין" };
  }
  if (body.grant_enabled !== false && !isGrantableRuleType(ruleType)) {
    return { ok: true, grantEnabled: false };
  }
  return { ok: true };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} cardId
 * @param {object} body
 */
export async function createCardRule(supabase, cardId, body) {
  const v = validateRulePayload(body);
  if (!v.ok) return v;

  const row = { ...buildRuleRowFromAdminPayload(body), card_id: cardId };
  if (v.grantEnabled === false) row.grant_enabled = false;

  const { data, error } = await supabase
    .from("reward_card_rules")
    .insert(row)
    .select("*")
    .single();
  if (error) return { ok: false, code: "insert_failed", message: error.message };
  return { ok: true, rule: data };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} ruleId
 * @param {object} body
 */
export async function updateCardRule(supabase, ruleId, body) {
  const v = validateRulePayload(body);
  if (!v.ok) return v;

  const row = buildRuleRowFromAdminPayload(body);
  if (v.grantEnabled === false) row.grant_enabled = false;

  const { data, error } = await supabase
    .from("reward_card_rules")
    .update(row)
    .eq("id", ruleId)
    .select("*")
    .single();
  if (error) return { ok: false, code: "update_failed", message: error.message };
  return { ok: true, rule: data };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} ruleId
 */
export async function deleteCardRule(supabase, ruleId) {
  const { error } = await supabase.from("reward_card_rules").delete().eq("id", ruleId);
  if (error) return { ok: false, code: "delete_failed", message: error.message };
  return { ok: true };
}

/** Allowed card fields for admin create/update */
export const ADMIN_CARD_WRITABLE_FIELDS = [
  "card_key",
  "name_he",
  "description_he",
  "image_url",
  "image_asset_key",
  "series_id",
  "rarity",
  "card_type",
  "event_reward_mode",
  "subject",
  "topic",
  "price_coins",
  "use_default_price",
  "can_be_purchased",
  "can_appear_in_surprise_box",
  "box_weight",
  "is_active",
  "starts_at",
  "ends_at",
  "visibility_mode",
  "requirement_text_he",
  "grade_bands",
];

/**
 * @param {object} body
 */
export function pickCardWritableFields(body) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of ADMIN_CARD_WRITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      out[key] = body[key];
    }
  }
  return out;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} cardId
 * @param {string} studentId
 * @param {{ reason?: string }} [opts]
 */
export async function adminGrantCardToStudent(supabase, cardId, studentId, opts = {}) {
  if (!cardId || !studentId) {
    return { ok: false, code: "validation_failed", message: "חסר מזהה קלף או תלמיד" };
  }

  const { data: card } = await supabase.from("reward_cards").select("*").eq("id", cardId).maybeSingle();
  if (!card) return { ok: false, code: "card_not_found", message: "קלף לא נמצא" };
  if (!card.is_active) {
    return { ok: false, code: "card_not_available", message: "הקלף אינו פעיל" };
  }

  const { data: student } = await supabase.from("students").select("id").eq("id", studentId).maybeSingle();
  if (!student) return { ok: false, code: "student_not_found", message: "תלמיד לא נמצא" };

  const { grantCardToStudent } = await import("./reward-cards.server.js");
  const { writeRewardCardTransaction } = await import("./reward-coins.server.js");

  const grant = await grantCardToStudent(supabase, studentId, cardId, {
    transactionType: "admin_grant",
    metadata: { reason: opts.reason || "admin_grant" },
  });
  if (!grant.ok) return grant;

  await writeRewardCardTransaction(supabase, {
    student_id: studentId,
    card_id: cardId,
    transaction_type: "admin_grant",
    coins_before: null,
    coins_after: null,
    coins_amount: 0,
    reason: opts.reason || "admin_grant",
    metadata_json: { adminGrant: true, duplicate: grant.duplicate === true },
  });

  return {
    ok: true,
    grant,
    alreadyOwned: grant.alreadyOwned === true,
    duplicate: grant.duplicate === true,
  };
}

/**
 * @param {object} card
 */
export function validateCardPayload(card) {
  if (!card.name_he || !String(card.name_he).trim()) {
    return { ok: false, code: "validation_failed", message: "שם הקלף חובה" };
  }
  if (!card.series_id) {
    return { ok: false, code: "validation_failed", message: "סדרה חובה" };
  }
  if (!card.rarity) {
    return { ok: false, code: "validation_failed", message: "נדירות חובה" };
  }
  if (!card.card_type) {
    return { ok: false, code: "validation_failed", message: "סוג קלף חובה" };
  }
  if (card.card_type === "achievement" && (card.can_be_purchased || card.can_appear_in_surprise_box)) {
    return { ok: false, code: "invalid_achievement", message: "קלף הישג לא יכול להיות בחנות או בקופסה" };
  }
  if (card.card_type === "event" && !card.event_reward_mode) {
    return { ok: false, code: "validation_failed", message: "מצב אירוע חובה לקלף אירוע" };
  }
  return { ok: true };
}
