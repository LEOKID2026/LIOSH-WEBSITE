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
import { assertGuestCardsAllowed } from "../../guest/guest-economy-guard.server.js";

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

async function pickDiamondReward(supabase) {
  const rewards = await getCardSetting(supabase, "surprise_box_diamond_rewards");
  const amount = weightedPick(
    (rewards || []).map((r) => ({ weight: r.weight, value: r.amount }))
  );
  return Math.max(0, Math.floor(Number(amount ?? 0)));
}

/**
 * Card display mapping must never throw — opening already consumed the box.
 * @param {object} card
 * @param {object|null} grant
 */
function safeFormatCardReward(card, grant) {
  const base = {
    nameHe: String(card?.name_he || "קלף").trim() || "קלף",
    rarityHe: formatRarityHe(card?.rarity),
    wasDuplicate: grant?.duplicate === true,
    duplicateCount: grant?.duplicateCount ?? 0,
    conversionProgressHe: grant?.duplicate
      ? "יש לך עותק כפול — אפשר למכור בחנות הקלפים."
      : null,
  };
  try {
    return { ...base, ...mapRewardCardImageFields(card) };
  } catch {
    return {
      ...base,
      imageUrl: null,
      imageThumbUrl: null,
      imageVariantsReady: false,
    };
  }
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {{ newCount: number, now: Date, state: object }} claim
 * @param {object} rewards
 */
async function buildSurpriseBoxOpenSuccess(supabase, studentId, claim, rewards) {
  const { newCount, now, state } = claim;
  const {
    coinAmounts,
    coinsBefore,
    coinsAfter,
    diamondsRewardTotal,
    diamondsBalanceAfter,
    pickedCards,
    grants,
    cardsWanted,
    coinsWanted,
  } = rewards;

  const coinsRewardTotal = coinAmounts.reduce((a, b) => a + b, 0);
  const cardsGranted = pickedCards.length;

  const rewardsJson = {
    coin_amounts: coinAmounts,
    coins_total: coinsRewardTotal,
    diamonds_total: diamondsRewardTotal,
    cards: pickedCards.map((c, i) => ({
      card_id: c.id,
      was_duplicate: grants[i]?.duplicate === true,
    })),
    cards_per_open: cardsGranted,
    cards_requested: cardsWanted,
    coin_prizes_per_open: coinsWanted,
  };

  let openingId = null;
  try {
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
    if (!openErr && opening?.id) openingId = opening.id;
  } catch {
    /* best-effort audit log — do not fail child-facing open */
  }

  if (openingId && coinsRewardTotal > 0) {
    try {
      await writeRewardCardTransaction(supabase, {
        student_id: studentId,
        card_id: null,
        transaction_type: "surprise_box_reward",
        coins_before: coinsBefore,
        coins_after: coinsAfter,
        coins_amount: coinsRewardTotal,
        reason: "surprise_box_reward",
        metadata_json: { openingId, coinAmounts, rewardsJson },
      });
    } catch {
      /* best-effort */
    }
  }

  const nextAvailableAt = state?.next_available_at ?? null;
  const cards = pickedCards.map((card, i) => safeFormatCardReward(card, grants[i]));

  return {
    ok: true,
    openingId,
    coinsReward: coinsRewardTotal,
    coinAmounts,
    diamondsReward: diamondsRewardTotal,
    diamondsBalanceAfter,
    cards,
    pendingBoxCountAfter: newCount,
    pendingBoxCount: newCount,
    rewards: {
      coins: coinAmounts,
      diamonds: diamondsRewardTotal,
      cards,
    },
    nextAvailableAt,
    secondsRemaining:
      newCount > 0
        ? 0
        : nextAvailableAt
          ? Math.max(0, Math.floor((new Date(nextAvailableAt).getTime() - Date.now()) / 1000))
          : null,
  };
}

/**
 * @returns {Promise<{ ok: true, state: object, newCount: number, now: Date } | { ok: false, code: string }>}
 */
async function claimOnePendingSurpriseBox(supabase, studentId, general) {
  const maxRetries = 4;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    let state = await ensureSurpriseBoxState(supabase, studentId);
    if (!state) {
      return { ok: false, code: "no_pending_box" };
    }

    const patch = tickSurpriseBoxAccumulation(state, general);
    if (patch) {
      const { data: updated } = await supabase
        .from("surprise_box_state")
        .update(patch)
        .eq("student_id", studentId)
        .eq("pending_box_count", readPendingCount(state))
        .select("*")
        .maybeSingle();
      state = updated || { ...state, ...patch };
    }

    const pendingCount = readPendingCount(state);
    if (pendingCount <= 0) {
      return { ok: false, code: "no_pending_box" };
    }

    const now = new Date();
    const newCount = pendingCount - 1;
    const intervalMs = general.box_interval_minutes * 60 * 1000;
    let nextAvailable = state.next_available_at;

    if (newCount < general.max_pending_boxes) {
      if (!nextAvailable || new Date(nextAvailable) <= now) {
        nextAvailable = new Date(now.getTime() + intervalMs).toISOString();
      }
    }

    const { data: claimed, error: claimErr } = await supabase
      .from("surprise_box_state")
      .update({
        pending_box_count: newCount,
        has_pending_box: newCount > 0,
        last_opened_at: now.toISOString(),
        next_available_at: nextAvailable,
        first_box_given: true,
      })
      .eq("student_id", studentId)
      .eq("pending_box_count", pendingCount)
      .gt("pending_box_count", 0)
      .select("*")
      .maybeSingle();

    if (claimErr) {
      return { ok: false, code: "state_update_failed", message: claimErr.message };
    }

    if (claimed?.student_id) {
      return {
        ok: true,
        state: claimed,
        newCount,
        now,
        preClaim: {
          pendingCount,
          lastOpenedAt: state.last_opened_at ?? null,
          nextAvailableAt: state.next_available_at ?? null,
          firstBoxGiven: state.first_box_given ?? false,
        },
      };
    }
  }

  return { ok: false, code: "no_pending_box" };
}

/**
 * Restore pending_box_count (and open timestamps) after a failed grant path.
 * Uses compare-and-swap on the post-claim count so concurrent opens stay safe.
 * @returns {Promise<{ ok: true, pendingBoxCount: number } | { ok: false, code: string }>}
 */
export async function rollbackSurpriseBoxClaim(supabase, studentId, { claimedCount, preClaim }) {
  const targetCount = Math.max(0, Math.floor(Number(preClaim?.pendingCount) || 0));
  const expectedAfterClaim = Math.max(0, Math.floor(Number(claimedCount) || 0));

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data: state, error: readErr } = await supabase
      .from("surprise_box_state")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();
    if (readErr) {
      return { ok: false, code: "rollback_read_failed", message: readErr.message };
    }
    if (!state) {
      return { ok: false, code: "rollback_no_state" };
    }

    const current = readPendingCount(state);
    if (current === targetCount) {
      return { ok: true, pendingBoxCount: targetCount, alreadyRestored: true };
    }
    if (current !== expectedAfterClaim) {
      return {
        ok: false,
        code: "rollback_count_mismatch",
        current,
        expectedAfterClaim,
        targetCount,
      };
    }

    const { data: restored, error: restoreErr } = await supabase
      .from("surprise_box_state")
      .update({
        pending_box_count: targetCount,
        has_pending_box: targetCount > 0,
        last_opened_at: preClaim.lastOpenedAt,
        next_available_at: preClaim.nextAvailableAt,
        first_box_given: preClaim.firstBoxGiven,
      })
      .eq("student_id", studentId)
      .eq("pending_box_count", expectedAfterClaim)
      .select("*")
      .maybeSingle();

    if (restoreErr) {
      return { ok: false, code: "rollback_failed", message: restoreErr.message };
    }
    if (restored?.student_id) {
      return { ok: true, pendingBoxCount: targetCount };
    }
  }

  return { ok: false, code: "rollback_failed" };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {{ newCount: number, preClaim: object }} claim
 * @param {string} code
 * @param {Record<string, unknown>} [extra]
 */
async function failOpenAfterClaim(supabase, studentId, claim, code, extra = {}) {
  const rollback = await rollbackSurpriseBoxClaim(supabase, studentId, {
    claimedCount: claim.newCount,
    preClaim: claim.preClaim,
  });
  return {
    ok: false,
    code,
    rollbackOk: rollback.ok,
    rollbackCode: rollback.ok ? undefined : rollback.code,
    pendingBoxCountAfter: rollback.ok ? rollback.pendingBoxCount : undefined,
    ...extra,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} [idempotencyKey]
 */
export async function openSurpriseBox(supabase, studentId, idempotencyKey) {
  if (idempotencyKey) {
    const { data: priorCoinTx } = await supabase
      .from("coin_transactions")
      .select("id, metadata")
      .eq("student_id", studentId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (priorCoinTx?.id) {
      const { data: priorOpening } = await supabase
        .from("surprise_box_openings")
        .select("id, coins_reward, diamonds_reward, rewards_json, card_1_id, card_2_id")
        .eq("student_id", studentId)
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (priorOpening?.id) {
        const status = await getSurpriseBoxStatus(supabase, studentId);
        return {
          ok: true,
          duplicate: true,
          openingId: priorOpening.id,
          coinsReward: priorOpening.coins_reward,
          diamondsReward: priorOpening.diamonds_reward,
          pendingBoxCountAfter: status.pendingBoxCount ?? 0,
        };
      }
    }
  }

  const general = await loadSurpriseBoxGeneralForStudent(supabase, studentId);
  const claim = await claimOnePendingSurpriseBox(supabase, studentId, general);
  if (!claim.ok) {
    return { ok: false, code: claim.code, message: claim.message };
  }

  const { newCount, now, state } = claim;
  const preventDup = general.prevent_duplicate_in_box;
  const { data: studentRow } = await supabase
    .from("students")
    .select("account_kind")
    .eq("id", studentId)
    .maybeSingle();
  const guestCardsGuard = await assertGuestCardsAllowed(supabase, studentRow || {});
  const cardsWanted = guestCardsGuard.ok ? general.cards_per_open : 0;
  const coinsWanted = general.coin_prizes_per_open;

  let pickedCards = [];
  try {
    pickedCards = cardsWanted > 0 ? await pickBoxCards(supabase, preventDup, cardsWanted) : [];
  } catch {
    pickedCards = [];
  }

  const coinSlots = Math.max(1, Math.max(0, Math.floor(Number(coinsWanted) || 0)));
  const coinAmounts = [];
  for (let i = 0; i < coinSlots; i += 1) {
    try {
      coinAmounts.push(await pickCoinReward(supabase));
    } catch {
      coinAmounts.push(500);
    }
  }

  let diamondsRewardTotal = 0;
  try {
    const diamondAmount = await pickDiamondReward(supabase);
    diamondsRewardTotal = diamondAmount > 0 ? diamondAmount : 0;
  } catch {
    diamondsRewardTotal = 0;
  }

  let coinsBefore = null;
  let coinsAfter = null;
  let anyCoinGranted = false;
  const grantedCoinAmounts = [];

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
    if (coinResult.ok) {
      anyCoinGranted = true;
      grantedCoinAmounts.push(amount);
      coinsBefore = coinsBefore ?? coinResult.coinsBefore;
      coinsAfter = coinResult.coinsAfter;
    }
  }

  if (!anyCoinGranted) {
    return failOpenAfterClaim(supabase, studentId, claim, "coin_failed");
  }

  let diamondsBalanceAfter = null;
  if (diamondsRewardTotal > 0) {
    try {
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
        diamondsRewardTotal = 0;
        diamondsBalanceAfter = null;
      } else {
        diamondsBalanceAfter = diamondResult.balanceAfter ?? null;
      }
    } catch {
      diamondsRewardTotal = 0;
      diamondsBalanceAfter = null;
    }
  }

  /** @type {object[]} */
  const grants = [];
  /** @type {object[]} */
  const grantedCards = [];
  for (const card of pickedCards) {
    try {
      const grant = await grantCardToStudent(supabase, studentId, card.id, {
        transactionType: "surprise_box_reward",
      });
      if (grant?.ok) {
        grants.push(grant);
        grantedCards.push(card);
      }
    } catch {
      /* skip card — coins/diamonds already granted */
    }
  }

  return buildSurpriseBoxOpenSuccess(supabase, studentId, claim, {
    coinAmounts: grantedCoinAmounts,
    coinsBefore,
    coinsAfter,
    diamondsRewardTotal,
    diamondsBalanceAfter,
    pickedCards: grantedCards,
    grants,
    cardsWanted,
    coinsWanted,
  });
}
