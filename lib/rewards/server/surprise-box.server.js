/**
 * Surprise box — stacked pending boxes, admin-controlled prize composition.
 */

import { getCardSetting } from "./reward-settings.server.js";
import {
  parseSurpriseBoxGeneralSettings,
  readPendingCount,
  tickSurpriseBoxAccumulation,
} from "./surprise-box-settings.server.js";
import { loadGuestRuntimeConfig } from "../../guest/guest-settings.server.js";
import { isGuestStudent } from "../../guest/guest-display.js";
import { weightedPick } from "./weighted-pick.js";
import { grantCardToStudent, fetchActiveCardsWithSeries } from "./reward-cards.server.js";
import { earnCardRewardCoins, writeRewardCardTransaction } from "./reward-coins.server.js";
import { applyDiamondMove } from "./diamond-ledger.server.js";
import { formatRarityHe } from "../rewards-ui.he.js";
import { mapRewardCardImageFields } from "../reward-card-image-urls.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
async function loadSurpriseBoxGeneralForStudent(supabase, studentId) {
  const { data: student } = await supabase
    .from("students")
    .select("account_kind")
    .eq("id", studentId)
    .maybeSingle();

  if (isGuestStudent(student || {})) {
    const config = await loadGuestRuntimeConfig(supabase);
    return config.surpriseBox;
  }

  const generalRaw = await getCardSetting(supabase, "surprise_box_general_settings");
  return parseSurpriseBoxGeneralSettings(generalRaw);
}

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

  const general = await loadSurpriseBoxGeneralForStudent(supabase, studentId);

  if (existing) {
    const patch = tickSurpriseBoxAccumulation(existing, general);
    if (patch) {
      const { data: updated } = await supabase
        .from("surprise_box_state")
        .update(patch)
        .eq("student_id", studentId)
        .select("*")
        .single();
      return updated || { ...existing, ...patch };
    }
    return existing;
  }

  const firstImmediate = general.first_box_immediate;
  const initialCount = firstImmediate ? Math.min(1, general.max_pending_boxes) : 0;

  const row = {
    student_id: studentId,
    pending_box_count: initialCount,
    has_pending_box: initialCount > 0,
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
  if (!state) {
    return { ready: false, secondsRemaining: null, pendingBoxCount: 0 };
  }

  const general = await loadSurpriseBoxGeneralForStudent(supabase, studentId);
  const patch = tickSurpriseBoxAccumulation(state, general);
  if (patch) {
    const { data: updated } = await supabase
      .from("surprise_box_state")
      .update(patch)
      .eq("student_id", studentId)
      .select("*")
      .single();
    state = updated || { ...state, ...patch };
  }

  const count = readPendingCount(state);
  if (count > 0) {
    return { ready: true, secondsRemaining: 0, pendingBoxCount: count };
  }

  if (state.next_available_at) {
    const sec = Math.max(
      0,
      Math.floor((new Date(state.next_available_at).getTime() - Date.now()) / 1000)
    );
    return { ready: false, secondsRemaining: sec, pendingBoxCount: 0 };
  }

  return { ready: false, secondsRemaining: null, pendingBoxCount: 0 };
}

async function pickCoinReward(supabase) {
  const rewards = await getCardSetting(supabase, "surprise_box_coin_rewards");
  const amount = weightedPick(
    (rewards || []).map((r) => ({ weight: r.weight, value: r.amount }))
  );
  return Math.floor(Number(amount ?? 500));
}

async function pickDiamondReward(supabase) {
  const rewards = await getCardSetting(supabase, "surprise_box_diamond_rewards");
  const amount = weightedPick(
    (rewards || []).map((r) => ({ weight: r.weight, value: r.amount }))
  );
  return Math.max(0, Math.floor(Number(amount ?? 0)));
}

async function pickBoxCards(supabase, preventDuplicate, count) {
  const need = Math.max(0, Math.floor(Number(count) || 0));
  if (need === 0) return [];

  const rarityWeights = await getCardSetting(supabase, "surprise_box_card_rarity_weights");
  const all = await fetchActiveCardsWithSeries(supabase);
  const pool = all.filter((c) => c.can_appear_in_surprise_box && c.card_type !== "achievement");
  if (!pool.length) return [];

  const excludeIds = [];
  const picked = [];

  const pickOne = () => {
    const available = pool.filter((c) => !excludeIds.includes(c.id));
    if (!available.length) return null;
    const rarity = weightedPick(
      Object.entries(rarityWeights || {}).map(([k, w]) => ({ weight: w, value: k }))
    );
    const byRarity = available.filter((c) => c.rarity === rarity);
    const src = byRarity.length ? byRarity : available;
    return src[Math.floor(Math.random() * src.length)];
  };

  for (let i = 0; i < need; i += 1) {
    const card = pickOne();
    if (!card) break;
    picked.push(card);
    if (preventDuplicate) excludeIds.push(card.id);
  }

  return picked;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} [idempotencyKey]
 */
export async function openSurpriseBox(supabase, studentId, idempotencyKey) {
  const state = await ensureSurpriseBoxState(supabase, studentId);
  const pendingCount = readPendingCount(state);
  if (pendingCount <= 0) {
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

  const general = await loadSurpriseBoxGeneralForStudent(supabase, studentId);
  const preventDup = general.prevent_duplicate_in_box;
  const cardsWanted = general.cards_per_open;
  const coinsWanted = general.coin_prizes_per_open;

  const pickedCards = await pickBoxCards(supabase, preventDup, cardsWanted);
  if (pickedCards.length < cardsWanted) {
    return { ok: false, code: "insufficient_card_pool" };
  }

  const coinAmounts = [];
  for (let i = 0; i < coinsWanted; i += 1) {
    coinAmounts.push(await pickCoinReward(supabase));
  }
  const coinsRewardTotal = coinAmounts.reduce((a, b) => a + b, 0);

  const diamondAmount = await pickDiamondReward(supabase);
  const diamondsRewardTotal = diamondAmount > 0 ? diamondAmount : 0;

  const now = new Date();
  const intervalMs = general.box_interval_minutes * 60 * 1000;
  const newCount = pendingCount - 1;
  let nextAvailable = state.next_available_at;

  if (newCount < general.max_pending_boxes) {
    if (!nextAvailable || new Date(nextAvailable) <= now) {
      nextAvailable = new Date(now.getTime() + intervalMs).toISOString();
    }
  }

  let coinsBefore = null;
  let coinsAfter = null;

  for (let i = 0; i < coinAmounts.length; i += 1) {
    const amount = coinAmounts[i];
    const coinResult = await earnCardRewardCoins(supabase, {
      studentId,
      amount,
      idempotencyKey:
        idempotencyKey && i === 0
          ? idempotencyKey
          : `card:box:coins:${studentId}:${now.getTime()}:${i}`,
      reason: "surprise_box_reward",
      sourceId: "surprise_box",
      metadata: { coinsReward: amount, prizeIndex: i },
    });
    if (!coinResult.ok) {
      return { ok: false, code: coinResult.code || "coin_failed" };
    }
    coinsBefore = coinsBefore ?? coinResult.coinsBefore;
    coinsAfter = coinResult.coinsAfter;
  }

  let diamondsBalanceAfter = null;
  if (diamondsRewardTotal > 0) {
    const diamondResult = await applyDiamondMove(supabase, {
      studentId,
      direction: "earn",
      amount: diamondsRewardTotal,
      idempotencyKey: idempotencyKey
        ? `box_diamond:${idempotencyKey}`
        : `box_diamond:${studentId}:${now.getTime()}`,
      sourceType: "surprise_box",
      sourceId: "surprise_box",
      metadata: { diamondsReward: diamondsRewardTotal },
      reason: "surprise_box_reward",
    });
    if (!diamondResult.ok && !diamondResult.skipped) {
      return { ok: false, code: diamondResult.code || "diamond_failed" };
    }
    diamondsBalanceAfter = diamondResult.balanceAfter ?? null;
  }

  const grants = [];
  for (const card of pickedCards) {
    grants.push(
      await grantCardToStudent(supabase, studentId, card.id, {
        transactionType: "surprise_box_reward",
      })
    );
  }

  const rewardsJson = {
    coin_amounts: coinAmounts,
    coins_total: coinsRewardTotal,
    diamonds_total: diamondsRewardTotal,
    cards: pickedCards.map((c, i) => ({
      card_id: c.id,
      was_duplicate: grants[i]?.duplicate === true,
    })),
    cards_per_open: cardsWanted,
    coin_prizes_per_open: coinsWanted,
  };

  const { data: opening, error: openErr } = await supabase
    .from("surprise_box_openings")
    .insert({
      student_id: studentId,
      opened_at: now.toISOString(),
      coins_reward: coinsRewardTotal,
      diamonds_reward: diamondsRewardTotal,
      card_1_id: pickedCards[0]?.id ?? null,
      card_2_id: pickedCards[1]?.id ?? null,
      card_1_was_duplicate: grants[0]?.duplicate === true,
      card_2_was_duplicate: grants[1]?.duplicate === true,
      rewards_json: rewardsJson,
    })
    .select("id")
    .single();
  if (openErr) return { ok: false, code: "opening_log_failed", message: openErr.message };

  await supabase
    .from("surprise_box_state")
    .update({
      pending_box_count: newCount,
      has_pending_box: newCount > 0,
      last_opened_at: now.toISOString(),
      next_available_at: nextAvailable,
      first_box_given: true,
    })
    .eq("student_id", studentId);

  await writeRewardCardTransaction(supabase, {
    student_id: studentId,
    card_id: null,
    transaction_type: "surprise_box_reward",
    coins_before: coinsBefore,
    coins_after: coinsAfter,
    coins_amount: coinsRewardTotal,
    reason: "surprise_box_reward",
    metadata_json: { openingId: opening.id, coinAmounts, rewardsJson },
  });

  const formatCardReward = (card, grant) => ({
    nameHe: card.name_he,
    rarityHe: formatRarityHe(card.rarity),
    ...mapRewardCardImageFields(card),
    wasDuplicate: grant.duplicate === true,
    duplicateCount: grant.duplicateCount ?? 0,
    conversionProgressHe: grant.duplicate
      ? "יש לך עותק כפול - אפשר למכור בחנות הקלפים."
      : null,
  });

  return {
    ok: true,
    openingId: opening.id,
    coinsReward: coinsRewardTotal,
    coinAmounts,
    diamondsReward: diamondsRewardTotal,
    diamondsBalanceAfter,
    cards: pickedCards.map((card, i) => formatCardReward(card, grants[i])),
    pendingBoxCountAfter: newCount,
  };
}
