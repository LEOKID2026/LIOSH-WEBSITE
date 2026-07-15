/**
 * Hebrew requirement text + progress labels for child card UI.
 */

import { subjectLabelHe } from "../platform-ui/hebrew-display-labels.js";
import { CARD_RULE_TYPE_META } from "./card-rule-types.js";
import { normalizeRuleParams } from "./card-rule-params.js";

const SUBJECT_TOPIC_LABELS = {
  addition: "חיבור",
  subtraction: "חיסור",
  multiplication: "כפל",
  division: "חילוק",
  vocabulary: "אוצר מילים",
};

/** @param {string|null|undefined} topic */
function topicLabelHe(topic) {
  const k = String(topic || "").trim().toLowerCase();
  return SUBJECT_TOPIC_LABELS[k] || topic || "";
}

/**
 * @param {object} rule
 * @param {{ current?: number|null, target?: number|null }|null} [progress]
 */
export function buildRuleRequirementHe(rule, progress = null) {
  if (rule?.requirement_text_he) return String(rule.requirement_text_he).trim();

  const p = normalizeRuleParams(rule);
  const rt = rule?.rule_type;

  if (rt === "total_questions" && p.min_questions != null) {
    return `ענה על ${p.min_questions} שאלות בסך הכל`;
  }
  if (rt === "weekly_questions" && p.min_questions != null) {
    return `ענה על ${p.min_questions} שאלות בשבוע האחרון`;
  }
  if (rt === "subject_questions" && p.min_questions != null) {
    const subj = subjectLabelHe(p.subject);
    return `ענה על ${p.min_questions} שאלות ב${subj !== "-" ? subj : "מקצוע"}`;
  }
  if (rt === "subject_accuracy" && p.min_questions != null && p.min_accuracy != null) {
    const subj = subjectLabelHe(p.subject);
    const top = topicLabelHe(p.topic);
    const topicPart = top ? ` בנושא ${top}` : "";
    return `השג ${p.min_accuracy}% דיוק ב${subj}${topicPart} (לפחות ${p.min_questions} שאלות)`;
  }
  if (rt === "learning_streak_days" && p.min_streak_days != null) {
    return `למד ${p.min_streak_days} ימים ברצף`;
  }
  if (rt === "active_days_streak" && p.min_streak_days != null) {
    return `היה פעיל ${p.min_streak_days} ימים ברצף`;
  }
  if (rt === "parent_activity_complete" && p.min_completed_activities != null) {
    return `השלם ${p.min_completed_activities} פעילויות מההורים`;
  }
  if (rt === "monthly_learning_minutes" && p.min_learning_minutes_monthly != null) {
    return `למד ${p.min_learning_minutes_monthly} דקות החודש`;
  }
  if (rt === "event_window") {
    return "קלף אירוע מיוחד - זמין בחלון התאריכים";
  }
  if (rt === "daily_mission_complete") {
    return p.mission_key ? `השלם את המשימה: ${p.mission_key}` : "השלם משימה יומית";
  }
  if (rt === "grade_band_only" && p.grade_band) {
    const bands = { g12: "כיתות א׳–ב׳", g34: "כיתות ג׳–ד׳", g56: "כיתות ה׳–ו׳" };
    return `זמין ל${bands[p.grade_band] || p.grade_band}`;
  }

  const meta = CARD_RULE_TYPE_META[rt];
  return meta?.labelHe ? `השלם את הדרישה: ${meta.labelHe}` : "המשך ללמוד כדי לפתוח את הקלף";
}

/**
 * @param {object} card
 * @param {object[]} [rules]
 * @param {{ current?: number|null, target?: number|null }|null} [primaryProgress]
 */
export function buildCardRequirementHe(card, rules = [], primaryProgress = null) {
  if (card?.requirement_text_he) return String(card.requirement_text_he).trim();
  if (card?.description_he) return String(card.description_he).trim();

  const active = (rules || []).filter((r) => r.is_active !== false);
  if (!active.length) {
    if (card?.can_be_purchased) return "אפשר לקנות בחנות";
    if (card?.can_appear_in_surprise_box) return "אפשר לקבל בקופסת הפתעה";
    return "לא זמין כרגע";
  }

  const primary = active[0];
  let text = buildRuleRequirementHe(primary, primaryProgress);
  if (primaryProgress?.target != null && primaryProgress?.current != null) {
    const cur = Math.floor(Number(primaryProgress.current) || 0);
    const tgt = Math.floor(Number(primaryProgress.target) || 0);
    if (tgt > 0) {
      text = `${text} (${cur.toLocaleString("he-IL")} מתוך ${tgt.toLocaleString("he-IL")})`;
    }
  }
  return text;
}

/**
 * @param {{ current?: number|null, target?: number|null }|null} progress
 */
export function formatProgressLineHe(progress) {
  if (!progress || progress.target == null || progress.target <= 0) return null;
  const cur = Math.max(0, Math.floor(Number(progress.current) || 0));
  const tgt = Math.floor(Number(progress.target) || 0);
  return `${cur.toLocaleString("he-IL")} מתוך ${tgt.toLocaleString("he-IL")}`;
}
