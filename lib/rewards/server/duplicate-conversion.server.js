/**
 * Duplicate card conversion to coins.
 */

import {
  getDuplicateConversionValue,
  getDuplicateThreshold,
} from "./reward-settings.server.js";
import { earnCardRewardCoins, writeRewardCardTransaction } from "./reward-coins.server.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} cardId
 */
export async function convertDuplicates(supabase, studentId, cardId) {
  const threshold = await getDuplicateThreshold(supabase);

  const { data: row, error } = await supabase
    .from("student_reward_cards")
    .select("*, reward_cards(*)")
    .eq("student_id", studentId)
    .eq("card_id", cardId)
    .maybeSingle();
  if (error) return { ok: false, code: "db_error", message: error.message };
  if (!row?.owned) return { ok: false, code: "not_owned" };

  const card = row.reward_cards;
  if (card?.card_type === "achievement") {
    return { ok: false, code: "achievement_no_duplicates" };
  }

  if ((row.duplicate_count || 0) < threshold) {
    return { ok: false, code: "insufficient_duplicates" };
  }

  const coinsReceived = await getDuplicateConversionValue(supabase, card.rarity);
  const newDuplicateCount = row.duplicate_count - threshold;

  const { error: updErr } = await supabase
    .from("student_reward_cards")
    .update({ duplicate_count: newDuplicateCount })
    .eq("id", row.id);
  if (updErr) return { ok: false, code: "update_failed", message: updErr.message };

  const conversionId = `${Date.now()}`;
  const coinResult = await earnCardRewardCoins(supabase, {
    studentId,
    amount: coinsReceived,
    idempotencyKey: `card:convert:${studentId}:${cardId}:${conversionId}`,
    reason: "duplicate_conversion",
    sourceId: cardId,
    metadata: { duplicatesSpent: threshold, cardId },
  });

  if (!coinResult.ok) {
    return { ok: false, code: coinResult.code || "coin_failed" };
  }

  await supabase.from("reward_card_conversions").insert({
    student_id: studentId,
    card_id: cardId,
    duplicates_spent: threshold,
    coins_received: coinsReceived,
  });

  await writeRewardCardTransaction(supabase, {
    student_id: studentId,
    card_id: cardId,
    transaction_type: "duplicate_conversion",
    coins_before: coinResult.coinsBefore,
    coins_after: coinResult.coinsAfter,
    coins_amount: coinsReceived,
    reason: "duplicate_conversion",
    metadata_json: { duplicatesSpent: threshold },
  });

  return {
    ok: true,
    coinsReceived,
    duplicateCountRemaining: newDuplicateCount,
    balanceAfter: coinResult.coinsAfter,
  };
}
