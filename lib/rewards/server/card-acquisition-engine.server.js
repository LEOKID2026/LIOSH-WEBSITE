/**
 * Unified card acquisition engine — all thresholds from DB (params_json + legacy columns).
 */

import { isCardRewardsEnabled } from "../reward-feature-flags.js";
import { grantCardToStudent } from "./reward-cards.server.js";
import { writeRewardCardTransaction } from "./reward-coins.server.js";
import { getIsraelMonthBounds } from "../../learning-supabase/israel-calendar.server.js";
import { getGradeBand } from "../../learning-supabase/mission-progress.server.js";
import { computeStudentLearningDerived } from "../../learning-supabase/student-learning-profile.server.js";
import { normalizeRuleParams } from "../card-rule-params.js";
import { isGrantableRuleType } from "../card-rule-types.js";

export { normalizeRuleParams };

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
async function loadEvaluatedRules(supabase) {
  const { data, error } = await supabase
    .from("reward_card_rules")
    .select("*, reward_cards(*)")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).filter((r) => r.reward_cards?.is_active !== false);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function loadRulesGroupedByCardId(supabase) {
  const rules = await loadEvaluatedRules(supabase);
  /** @type {Map<string, object[]>} */
  const map = new Map();
  for (const r of rules) {
    const list = map.get(r.card_id) || [];
    list.push(r);
    map.set(r.card_id, list);
  }
  return map;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
async function getStudentContext(supabase, studentId) {
  const { data: student } = await supabase
    .from("students")
    .select("id, grade_level")
    .eq("id", studentId)
    .maybeSingle();
  const gradeBand = getGradeBand(student?.grade_level);
  let monthlyMinutes = 0;
  try {
    const derived = await computeStudentLearningDerived(supabase, studentId);
    monthlyMinutes = Math.floor(Number(derived?.monthlyMinutesIsraelMonth) || 0);
  } catch {
    monthlyMinutes = 0;
  }
  return { gradeBand, monthlyMinutes };
}

/**
 * @param {object|null|undefined} card
 * @param {string} studentGradeBand
 */
export function cardPassesGradeBands(card, studentGradeBand) {
  const bands = card?.grade_bands;
  if (!Array.isArray(bands) || !bands.length) return true;
  return bands.includes(studentGradeBand);
}

/**
 * @param {object} rule
 * @param {string} studentGradeBand
 */
function rulePassesGradeBand(rule, studentGradeBand) {
  const p = normalizeRuleParams(rule);
  if (!p.grade_band) return true;
  return p.grade_band === studentGradeBand;
}

function ruleInTimeWindow(rule, now = new Date()) {
  const start = rule.starts_at ? new Date(rule.starts_at) : null;
  const end = rule.ends_at ? new Date(rule.ends_at) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
async function countTotalQuestions(supabase, studentId) {
  const { count } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);
  return count || 0;
}

async function countSubjectQuestions(supabase, studentId, subject) {
  const { count } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("subject", subject);
  return count || 0;
}

async function countWeeklyQuestions(supabase, studentId) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("created_at", weekAgo.toISOString());
  return count || 0;
}

async function getSubjectTopicAccuracy(supabase, studentId, subject, topic) {
  let q = supabase
    .from("answers")
    .select("is_correct")
    .eq("student_id", studentId)
    .eq("subject", subject);
  if (topic) q = q.eq("topic", topic);
  const { data } = await q.limit(500);
  const rows = data || [];
  if (!rows.length) return { total: 0, accuracy: 0 };
  const correct = rows.filter((r) => r.is_correct === true).length;
  return { total: rows.length, accuracy: (correct / rows.length) * 100 };
}

async function countCompletedParentActivities(supabase, studentId) {
  const { count } = await supabase
    .from("parent_activity_attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "completed");
  return count || 0;
}

async function getLearningStreakDays(supabase, studentId) {
  const { data } = await supabase
    .from("student_learning_state")
    .select("challenges")
    .eq("student_id", studentId)
    .maybeSingle();
  const daily = data?.challenges?.daily;
  if (!daily || typeof daily !== "object") return 0;
  const streak = daily.streakDays ?? daily.streak ?? 0;
  return Math.floor(Number(streak) || 0);
}

async function countDailyMissionsCompleted(supabase, studentId, missionKey) {
  const { data } = await supabase
    .from("student_learning_state")
    .select("challenges")
    .eq("student_id", studentId)
    .maybeSingle();
  const missions = data?.challenges?.daily?.missions;
  if (!Array.isArray(missions)) return 0;
  if (missionKey) {
    const m = missions.find((x) => x.id === missionKey);
    return m?.completed ? 1 : 0;
  }
  return missions.filter((m) => m.completed).length;
}

/**
 * @returns {Promise<{ matches: boolean, current: number|null, target: number|null, hasProgress: boolean }>}
 */
export async function evaluateRuleProgress(supabase, studentId, rule, ctx = null) {
  const p = normalizeRuleParams(rule);
  const rt = rule.rule_type;
  const studentCtx = ctx || (await getStudentContext(supabase, studentId));

  if (!ruleInTimeWindow(rule)) {
    return { matches: false, current: null, target: null, hasProgress: false };
  }
  if (!rulePassesGradeBand(rule, studentCtx.gradeBand)) {
    return { matches: false, current: null, target: null, hasProgress: false };
  }

  if (rt === "total_questions") {
    const current = await countTotalQuestions(supabase, studentId);
    const target = p.min_questions != null ? Number(p.min_questions) : null;
    return {
      matches: target != null && current >= target,
      current,
      target,
      hasProgress: true,
    };
  }
  if (rt === "weekly_questions") {
    const current = await countWeeklyQuestions(supabase, studentId);
    const target = p.min_questions != null ? Number(p.min_questions) : null;
    return {
      matches: target != null && current >= target,
      current,
      target,
      hasProgress: true,
    };
  }
  if (rt === "subject_questions") {
    const current = await countSubjectQuestions(supabase, studentId, p.subject);
    const target = p.min_questions != null ? Number(p.min_questions) : null;
    return {
      matches: target != null && current >= target,
      current,
      target,
      hasProgress: true,
    };
  }
  if (rt === "subject_accuracy") {
    const { total, accuracy } = await getSubjectTopicAccuracy(
      supabase,
      studentId,
      p.subject,
      p.topic
    );
    const minQ = p.min_questions != null ? Number(p.min_questions) : null;
    const minAcc = p.min_accuracy != null ? Number(p.min_accuracy) : null;
    const matches = minQ != null && minAcc != null && total >= minQ && accuracy >= minAcc;
    return {
      matches,
      current: total,
      target: minQ,
      hasProgress: true,
    };
  }
  if (rt === "learning_streak_days" || rt === "active_days_streak") {
    const current = await getLearningStreakDays(supabase, studentId);
    const target = p.min_streak_days != null ? Number(p.min_streak_days) : null;
    return {
      matches: target != null && current >= target,
      current,
      target,
      hasProgress: true,
    };
  }
  if (rt === "parent_activity_complete") {
    const current = await countCompletedParentActivities(supabase, studentId);
    const target =
      p.min_completed_activities != null ? Number(p.min_completed_activities) : null;
    return {
      matches: target != null && current >= target,
      current,
      target,
      hasProgress: true,
    };
  }
  if (rt === "monthly_learning_minutes") {
    const current = Math.floor(studentCtx.monthlyMinutes);
    const target =
      p.min_learning_minutes_monthly != null
        ? Number(p.min_learning_minutes_monthly)
        : null;
    return {
      matches: target != null && current >= target,
      current,
      target,
      hasProgress: true,
    };
  }
  if (rt === "event_window") {
    const now = new Date();
    const card = rule.reward_cards;
    const start = rule.starts_at || card?.starts_at;
    const end = rule.ends_at || card?.ends_at;
    const inWindow =
      (!start || now >= new Date(start)) && (!end || now <= new Date(end));
    return { matches: inWindow, current: null, target: null, hasProgress: false };
  }
  if (rt === "daily_mission_complete") {
    const current = await countDailyMissionsCompleted(supabase, studentId, p.mission_key);
    const target = p.mission_key ? 1 : 1;
    return {
      matches: current >= target,
      current,
      target,
      hasProgress: true,
    };
  }
  if (rt === "grade_band_only") {
    const matches = !p.grade_band || p.grade_band === studentCtx.gradeBand;
    return { matches, current: null, target: null, hasProgress: false };
  }
  if (rt === "subject_improvement") {
    return { matches: false, current: null, target: null, hasProgress: false };
  }

  return { matches: false, current: null, target: null, hasProgress: false };
}

/**
 * All active grant rules for card must match (AND).
 * @param {object[]} rules
 */
export async function cardRulesAllMatch(supabase, studentId, rules, ctx = null) {
  const grantRules = (rules || []).filter(
    (r) => r.is_active !== false && r.grant_enabled !== false && isGrantableRuleType(r.rule_type)
  );
  if (!grantRules.length) return { matches: false, primaryProgress: null, anyProgress: false };

  let primaryProgress = null;
  let anyProgress = false;
  for (const rule of grantRules) {
    const prog = await evaluateRuleProgress(supabase, studentId, rule, ctx);
    if (!primaryProgress && prog.hasProgress) primaryProgress = prog;
    if (prog.current != null && prog.current > 0) anyProgress = true;
    if (!prog.matches) return { matches: false, primaryProgress, anyProgress };
  }
  return { matches: true, primaryProgress, anyProgress };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function evaluateAndGrantAcquisitionCards(supabase, studentId) {
  if (!isCardRewardsEnabled()) return { ok: true, granted: [] };

  const rules = await loadEvaluatedRules(supabase);
  const ctx = await getStudentContext(supabase, studentId);
  const granted = [];

  const byCard = new Map();
  for (const rule of rules) {
    if (!byCard.has(rule.card_id)) byCard.set(rule.card_id, []);
    byCard.get(rule.card_id).push(rule);
  }

  for (const [cardId, cardRules] of byCard) {
    const card = cardRules[0]?.reward_cards;
    if (!card || !cardPassesGradeBands(card, ctx.gradeBand)) continue;

    const grantRules = cardRules.filter(
      (r) => r.grant_enabled !== false && isGrantableRuleType(r.rule_type)
    );
    if (!grantRules.length) continue;

    const { data: owned } = await supabase
      .from("student_reward_cards")
      .select("owned")
      .eq("student_id", studentId)
      .eq("card_id", cardId)
      .maybeSingle();
    if (owned?.owned) continue;

    const { matches } = await cardRulesAllMatch(supabase, studentId, cardRules, ctx);
    if (!matches) continue;

    const grant = await grantCardToStudent(supabase, studentId, cardId, {
      transactionType: "earned_achievement",
    });
    if (!grant.ok || grant.alreadyOwned) continue;

    await writeRewardCardTransaction(supabase, {
      student_id: studentId,
      card_id: cardId,
      transaction_type: "earned_achievement",
      coins_before: null,
      coins_after: null,
      coins_amount: 0,
      reason: "earned_achievement",
      metadata_json: { ruleTypes: grantRules.map((r) => r.rule_type) },
    });

    granted.push({ cardId, nameHe: grant.card?.name_he });
  }

  return { ok: true, granted };
}

/** Back-compat alias */
export async function evaluateAndGrantAchievementCards(supabase, studentId) {
  return evaluateAndGrantAcquisitionCards(supabase, studentId);
}

export { getIsraelMonthBounds };
