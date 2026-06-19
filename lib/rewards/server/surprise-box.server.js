/**
 * Surprise box — single pending box, server time, 3 rewards per open.
 */

import { getCardSetting } from "./reward-settings.server.js";
import { weightedPick } from "./weighted-pick.js";
import { grantCardToStudent, fetchActiveCardsWithSeries } from "./reward-cards.server.js";
import { earnCardRewardCoins, writeRewardCardTransaction } from "./reward-coins.server.js";
import { formatRarityHe } from "../rewards-ui.he.js";
import { resolveShopCardImageUrlOrPlaceholder } from "../leo-shop-cards-registry.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function ensureSurpriseBoxState(supabase, studentId) {
  const { data: existing } = await supabase
    .from("surprise_box_state")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) return existing;

  const general = await getCardSetting(supabase, "surprise_box_general_settings");
  const firstImmediate = general?.first_box_immediate !== false;

  const row = {
    student_id: studentId,
    has_pending_box: firstImmediate,
    first_box_given: firstImmediate,
    last_opened_at: null,
    next_available_at: null,
  };

  const { data, error } = await supabase.from("surprise_box_state").insert(row).select("*").single();
  if (error) {
    const { data: retry } = await supabase
      .from("surprise_box_state")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();
    return retry;
  }
  return data;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getSurpriseBoxStatus(supabase, studentId) {
  let state = await ensureSurpriseBoxState(supabase, studentId);
  if (!state) return { ready: false, secondsRemaining: null };

  const now = new Date();
  if (!state.has_pending_box && state.next_available_at) {
    const nextAt = new Date(state.next_available_at);
    if (now >= nextAt) {
      const { data: updated } = await supabase
        .from("surprise_box_state")
        .update({ has_pending_box: true })
        .eq("student_id", studentId)
        .select("*")
        .single();
      state = updated || state;
    }
  }

  if (state.has_pending_box) {
    return { ready: true, secondsRemaining: 0 };
  }

  if (state.next_available_at) {
    const sec = Math.max(0, Math.floor((new Date(state.next_available_at).getTime() - now.getTime()) / 1000));
    return { ready: false, secondsRemaining: sec };
  }

  return { ready: false, secondsRemaining: null };
}

async function pickCoinReward(supabase) {
  const rewards = await getCardSetting(supabase, "surprise_box_coin_rewards");
  const amount = weightedPick(
    (rewards || []).map((r) => ({ weight: r.weight, value: r.amount }))
  );
  return Math.floor(Number(amount ?? 500));
}

async function pickBoxCards(supabase, preventDuplicate) {
  const rarityWeights = await getCardSetting(supabase, "surprise_box_card_rarity_weights");
  const all = await fetchActiveCardsWithSeries(supabase);
  const pool = all.filter((c) => c.can_appear_in_surprise_box && c.card_type !== "achievement");
  if (!pool.length) return [];

  const pickOne = (excludeIds = []) => {
    const available = pool.filter((c) => !excludeIds.includes(c.id));
    if (!available.length) return null;
    const rarity = weightedPick(
      Object.entries(rarityWeights || {}).map(([k, w]) => ({ weight: w, value: k }))
    );
    const byRarity = available.filter((c) => c.rarity === rarity);
    const src = byRarity.length ? byRarity : available;
    return src[Math.floor(Math.random() * src.length)];
  };

  const first = pickOne([]);
  if (!first) return [];
  if (!preventDuplicate) {
    const second = pickOne([]);
    return second ? [first, second] : [first];
  }
  const second = pickOne([first.id]);
  return second ? [first, second] : [first];
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} [idempotencyKey]
 */
export async function openSurpriseBox(supabase, studentId, idempotencyKey) {
  const state = await ensureSurpriseBoxState(supabase, studentId);
  if (!state?.has_pending_box) {
    return { ok: false, code: "no_pending_box" };
  }

  if (idempotencyKey) {
    const { data: prior } = await supabase
      .from("surprise_box_openings")
      .select("id")
      .eq("student_id", studentId)
      .order("opened_at", { ascending: false })
      .limit(1);
    if (prior?.length && idempotencyKey.startsWith("retry:")) {
      void prior;
    }
  }

  const general = await getCardSetting(supabase, "surprise_box_general_settings");
  const intervalMinutes = Math.floor(Number(general?.box_interval_minutes ?? 180));
  const preventDup = general?.prevent_duplicate_in_box !== false;

  const coinsReward = await pickCoinReward(supabase);
  const pickedCards = await pickBoxCards(supabase, preventDup);
  if (pickedCards.length < 2) {
    return { ok: false, code: "insufficient_card_pool" };
  }

  const [card1, card2] = pickedCards;
  const now = new Date();
  const nextAvailable = new Date(now.getTime() + intervalMinutes * 60 * 1000).toISOString();

  const coinResult = await earnCardRewardCoins(supabase, {
    studentId,
    amount: coinsReward,
    idempotencyKey: idempotencyKey || `card:box:coins:${studentId}:${now.getTime()}`,
    reason: "surprise_box_reward",
    sourceId: "surprise_box",
    metadata: { coinsReward },
  });

  if (!coinResult.ok) {
    return { ok: false, code: coinResult.code || "coin_failed" };
  }

  const grant1 = await grantCardToStudent(supabase, studentId, card1.id, { transactionType: "surprise_box_reward" });
  const grant2 = await grantCardToStudent(supabase, studentId, card2.id, { transactionType: "surprise_box_reward" });

  const { data: opening, error: openErr } = await supabase
    .from("surprise_box_openings")
    .insert({
      student_id: studentId,
      opened_at: now.toISOString(),
      coins_reward: coinsReward,
      card_1_id: card1.id,
      card_2_id: card2.id,
      card_1_was_duplicate: grant1.duplicate === true,
      card_2_was_duplicate: grant2.duplicate === true,
    })
    .select("id")
    .single();
  if (openErr) return { ok: false, code: "opening_log_failed", message: openErr.message };

  await supabase
    .from("surprise_box_state")
    .update({
      has_pending_box: false,
      last_opened_at: now.toISOString(),
      next_available_at: nextAvailable,
      first_box_given: true,
    })
    .eq("student_id", studentId);

  await writeRewardCardTransaction(supabase, {
    student_id: studentId,
    card_id: null,
    transaction_type: "surprise_box_reward",
    coins_before: coinResult.coinsBefore,
    coins_after: coinResult.coinsAfter,
    coins_amount: coinsReward,
    reason: "surprise_box_reward",
    metadata_json: { openingId: opening.id },
  });

  const threshold = 10;
  const formatCardReward = (card, grant) => ({
    nameHe: card.name_he,
    rarityHe: formatRarityHe(card.rarity),
    imageUrl: resolveShopCardImageUrlOrPlaceholder(card),
    wasDuplicate: grant.duplicate === true,
    duplicateCount: grant.duplicateCount ?? 0,
    conversionProgressHe: grant.duplicate
      ? `יש לך עכשיו ${grant.duplicateCount} מתוך ${threshold} עותקים להמרה.`
      : null,
  });

  return {
    ok: true,
    openingId: opening.id,
    coinsReward,
    cards: [
      formatCardReward(card1, grant1),
      formatCardReward(card2, grant2),
    ],
  };
}
