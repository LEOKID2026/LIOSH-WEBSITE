/**
 * Card acquisition rule types — internal keys + Admin Hebrew labels.
 */

/** @type {Record<string, { labelHe: string, grantable: boolean, hasProgress: boolean }>} */
export const CARD_RULE_TYPE_META = {
  total_questions: { labelHe: "סה״כ שאלות", grantable: true, hasProgress: true },
  weekly_questions: { labelHe: "שאלות בשבוע", grantable: true, hasProgress: true },
  subject_questions: { labelHe: "שאלות במקצוע", grantable: true, hasProgress: true },
  subject_accuracy: { labelHe: "דיוק במקצוע/נושא", grantable: true, hasProgress: true },
  learning_streak_days: { labelHe: "רצף ימי למידה", grantable: true, hasProgress: true },
  parent_activity_complete: { labelHe: "פעילויות הורה שהושלמו", grantable: true, hasProgress: true },
  monthly_learning_minutes: { labelHe: "דקות למידה בחודש", grantable: true, hasProgress: true },
  active_days_streak: { labelHe: "ימי פעילות ברצף", grantable: true, hasProgress: true },
  grade_band_only: { labelHe: "הגבלת כיתה", grantable: false, hasProgress: false },
  event_window: { labelHe: "חלון אירוע (תאריכים)", grantable: true, hasProgress: false },
  daily_mission_complete: { labelHe: "השלמת משימה יומית", grantable: true, hasProgress: true },
  subject_improvement: { labelHe: "שיפור ביצועים (טרם מופעל)", grantable: false, hasProgress: false },
};

/** @returns {{ value: string, labelHe: string, grantable: boolean }[]} */
export function cardRuleTypeOptionsForAdmin() {
  return Object.entries(CARD_RULE_TYPE_META).map(([value, meta]) => ({
    value,
    labelHe: meta.labelHe,
    grantable: meta.grantable,
  }));
}

/** @param {string|null|undefined} ruleType */
export function isGrantableRuleType(ruleType) {
  const k = String(ruleType || "").trim();
  return CARD_RULE_TYPE_META[k]?.grantable === true;
}
