/** Hebrew display labels for Admin rewards / economy UI. */

import { formatCardTypeHe, formatRarityHe } from "../rewards/rewards-ui.he.js";
import { CARD_RULE_TYPE_META } from "../rewards/card-rule-types.js";

export { formatCardTypeHe, formatRarityHe };

export const VISIBILITY_MODE_HE = {
  visible_locked: "גלוי (נעול עד קבלה)",
  hidden_until_eligible: "מוסתר עד עמידה בתנאי",
};

export const CARD_RARITY_OPTIONS = [
  { value: "regular", labelHe: "רגיל" },
  { value: "special", labelHe: "מיוחד" },
  { value: "rare", labelHe: "נדיר" },
  { value: "gold", labelHe: "זהב" },
];

export const CARD_TYPE_OPTIONS = [
  { value: "shop", labelHe: "חנות" },
  { value: "achievement", labelHe: "הישג" },
  { value: "event", labelHe: "אירוע" },
];

/**
 * @param {string|null|undefined} mode
 */
export function formatVisibilityModeHe(mode) {
  return VISIBILITY_MODE_HE[String(mode || "").trim()] || mode || "-";
}

/**
 * @param {string|null|undefined} ruleType
 */
export function formatRuleTypeHe(ruleType) {
  const k = String(ruleType || "").trim();
  return CARD_RULE_TYPE_META[k]?.labelHe || ruleType || "-";
}

export const ADMIN_REWARDS_PAGE_UNAVAILABLE =
  "עמוד תגמולים אינו זמין - הפעל את דגלי השרת: קלפים, כלכלת מטבעות או מטבעות ידנית.";

/** @type {Record<string, string>} */
export const ECONOMY_SETTING_AREA_HE = {
  daily_missions: "משימות יומיות",
  monthly_tiers: "מדרגות חודשיות",
  global_settings: "הגדרות גלובליות",
  session_coins: "מטבעות מתרגול",
  entry_cost_options: "עלויות כניסה לארקייד",
  arcade_payout_rules: "חוקי פרסים בארקייד",
};

/** @type {Record<string, string>} */
export const ECONOMY_ENTITY_KEY_HE = {
  g12: "כיתות א׳–ב׳",
  g34: "כיתות ג׳–ד׳",
  g56: "כיתות ה׳–ו׳",
};

/** @type {Record<string, string>} */
export const ECONOMY_FIELD_NAME_HE = {
  text_he: "טקסט לילד",
  target_value: "יעד",
  reward_coins: "מטבעות",
  minutes_target: "יעד דקות",
  tier_label: "שם מדרגה",
  is_active: "פעיל",
  base_coins: "מטבעות בסיס",
  bonus_80_coins: "בונוס 80%",
  bonus_95_coins: "בונוס 95%",
  daily_cap: "תקרה יומית",
  amount: "סכום",
  label_he: "תווית",
  payout_rules_json: "כללי תשלום",
  display_order: "סדר תצוגה",
  monthly_minutes_cap: "תקרת דקות חודשית",
  monthly_coins_cap: "תקרת מטבעות חודשית",
  row_update: "עדכון שורה",
};

/** @type {Record<string, string>} */
export const ARCADE_GAME_KEY_HE = {
  fourline: "ארבע בשורה",
  ludo: "לודו",
  "snakes-and-ladders": "נחש וסולמות",
  checkers: "דמקה",
  chess: "שחמט",
  dominoes: "דומינו",
  bingo: "בינגו",
};

/**
 * @param {string|null|undefined} area
 */
export function formatEconomySettingAreaHe(area) {
  const key = String(area || "").trim().toLowerCase();
  return ECONOMY_SETTING_AREA_HE[key] || area || "-";
}

/**
 * @param {string|null|undefined} entityKey
 */
export function formatEconomyEntityKeyHe(entityKey) {
  const key = String(entityKey || "").trim().toLowerCase();
  return ECONOMY_ENTITY_KEY_HE[key] || entityKey || "-";
}

/**
 * @param {string|null|undefined} fieldName
 */
export function formatEconomyFieldNameHe(fieldName) {
  const key = String(fieldName || "").trim().toLowerCase();
  return ECONOMY_FIELD_NAME_HE[key] || fieldName || "-";
}

/**
 * @param {string|null|undefined} gameKey
 * @param {string|null|undefined} [titleHe]
 */
export function formatArcadeGameKeyHe(gameKey, titleHe) {
  const title = String(titleHe || "").trim();
  if (title) return title;
  const key = String(gameKey || "").trim().toLowerCase();
  return ARCADE_GAME_KEY_HE[key] || gameKey || "-";
}

/**
 * @param {boolean|null|undefined} ok
 */
export function formatApiOkHe(ok) {
  if (ok === true) return "כן";
  if (ok === false) return "לא";
  return "-";
}
