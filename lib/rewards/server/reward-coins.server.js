/**
 * Card reward coin moves via existing arcade_coin_apply RPC.
 */

import { applyArcadeCoinMove } from "../../arcade/server/arcade-coins.js";

export const REWARD_COIN_SOURCE_TYPE = "card_reward";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getStudentCoinBalance(supabase, studentId) {
  const { data } = await supabase
    .from("student_coin_balances")
    .select("balance")
    .eq("student_id", studentId)
    .maybeSingle();
  return Math.floor(Number(data?.balance ?? 0));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function earnCardRewardCoins(supabase, {
  studentId,
  amount,
  idempotencyKey,
  reason,
  sourceId,
  metadata,
}) {
  const coinsBefore = await getStudentCoinBalance(supabase, studentId);
  const result = await applyArcadeCoinMove(supabase, {
    studentId,
    direction: "earn",
    amount: Math.floor(Number(amount)),
    idempotencyKey,
    sourceType: REWARD_COIN_SOURCE_TYPE,
    sourceId: sourceId != null ? String(sourceId) : null,
    metadata: metadata && typeof metadata === "object" ? metadata : {},
    reason: reason || "card_reward",
  });
  return {
    ...result,
    coinsBefore,
    coinsAfter: result.balanceAfter ?? coinsBefore,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function spendCardRewardCoins(supabase, {
  studentId,
  amount,
  idempotencyKey,
  reason,
  sourceId,
  metadata,
}) {
  const coinsBefore = await getStudentCoinBalance(supabase, studentId);
  const result = await applyArcadeCoinMove(supabase, {
    studentId,
    direction: "spend",
    amount: Math.floor(Number(amount)),
    idempotencyKey,
    sourceType: REWARD_COIN_SOURCE_TYPE,
    sourceId: sourceId != null ? String(sourceId) : null,
    metadata: metadata && typeof metadata === "object" ? metadata : {},
    reason: reason || "card_shop_purchase",
  });
  return {
    ...result,
    coinsBefore,
    coinsAfter: result.balanceAfter ?? coinsBefore,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function writeRewardCardTransaction(supabase, row) {
  const { data, error } = await supabase
    .from("reward_card_transactions")
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
