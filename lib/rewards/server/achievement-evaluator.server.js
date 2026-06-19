/**
 * Achievement card evaluator — listens to learning activity, never touches diagnosis engine.
 */

import { isCardRewardsEnabled } from "../reward-feature-flags.js";
import { grantCardToStudent } from "./reward-cards.server.js";
import { writeRewardCardTransaction } from "./reward-coins.server.js";
import { getIsraelDateString, getIsraelMonthBounds } from "../../learning-supabase/israel-calendar.server.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
async function loadAchievementRules(supabase) {
  const { data, error } = await supabase
    .from("reward_card_rules")
    .select("*, reward_cards(*)")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return (data || []).filter((r) => r.reward_cards?.card_type === "achievement");
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
async function countTotalQuestions(supabase, studentId) {
  const { count } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);
  return count || 0;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
async function countSubjectQuestions(supabase, studentId, subject) {
  const { count } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("subject", subject);
  return count || 0;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
async function countWeeklyQuestions(supabase, studentId) {
  const today = getIsraelDateString();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("created_at", weekAgo.toISOString());
  void today;
  return count || 0;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
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

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
async function countCompletedParentActivities(supabase, studentId) {
  const { count } = await supabase
    .from("parent_activity_attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "completed");
  return count || 0;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
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

async function ruleMatches(supabase, studentId, rule) {
  const rt = rule.rule_type;
  if (rt === "total_questions") {
    const total = await countTotalQuestions(supabase, studentId);
    return rule.min_questions != null && total >= rule.min_questions;
  }
  if (rt === "weekly_questions") {
    const total = await countWeeklyQuestions(supabase, studentId);
    return rule.min_questions != null && total >= rule.min_questions;
  }
  if (rt === "subject_questions") {
    const total = await countSubjectQuestions(supabase, studentId, rule.subject);
    return rule.min_questions != null && total >= rule.min_questions;
  }
  if (rt === "subject_accuracy") {
    const { total, accuracy } = await getSubjectTopicAccuracy(
      supabase,
      studentId,
      rule.subject,
      rule.topic
    );
    const minQ = rule.min_questions ?? 30;
    const minAcc = Number(rule.min_accuracy ?? 80);
    return total >= minQ && accuracy >= minAcc;
  }
  if (rt === "learning_streak_days") {
    const streak = await getLearningStreakDays(supabase, studentId);
    return rule.min_streak_days != null && streak >= rule.min_streak_days;
  }
  if (rt === "parent_activity_complete") {
    const n = await countCompletedParentActivities(supabase, studentId);
    const min = rule.min_completed_activities ?? 1;
    return n >= min;
  }
  if (rt === "subject_improvement") {
    return false;
  }
  return false;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function evaluateAndGrantAchievementCards(supabase, studentId) {
  if (!isCardRewardsEnabled()) return { ok: true, granted: [] };

  const rules = await loadAchievementRules(supabase);
  const granted = [];

  for (const rule of rules) {
    const cardId = rule.card_id;
    const { data: owned } = await supabase
      .from("student_reward_cards")
      .select("owned")
      .eq("student_id", studentId)
      .eq("card_id", cardId)
      .maybeSingle();
    if (owned?.owned) continue;

    const matches = await ruleMatches(supabase, studentId, rule);
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
      metadata_json: { ruleType: rule.rule_type },
    });

    granted.push({ cardId, nameHe: grant.card?.name_he });
  }

  return { ok: true, granted };
}

export { getIsraelMonthBounds };
