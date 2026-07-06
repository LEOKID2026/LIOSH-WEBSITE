/**
 * Card shop purchase flow.
 */

import { resolveCardPrice, getDuplicateSellbackPercent, computeCardSellbackCoins } from "./reward-settings.server.js";
import { grantCardToStudent, isCardActiveNow } from "./reward-cards.server.js";
import { cardPassesGradeBands } from "./card-acquisition-engine.server.js";
import { getGradeBand } from "../../learning-supabase/mission-progress.server.js";
import { spendCardRewardCoins, writeRewardCardTransaction, getStudentCoinBalance, earnCardRewardCoins } from "./reward-coins.server.js";
import { formatRarityHe } from "../rewards-ui.he.js";
import { mapRewardCardImageFields } from "../reward-card-image-urls.js";
import { sortShopCardsByDisplayPrice } from "../shop-card-sort.js";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} cardId
 */
export async function purchaseShopCard(supabase, studentId, cardId) {
  const { data: card, error: cardErr } = await supabase
    .from("reward_cards")
    .select("*, reward_card_series(name_he)")
    .eq("id", cardId)
    .maybeSingle();
  if (cardErr) return { ok: false, code: "db_error", message: cardErr.message };
  if (!card || !card.is_active || !isCardActiveNow(card)) {
    return { ok: false, code: "card_not_available" };
  }

  const { data: studentRow } = await supabase
    .from("students")
    .select("grade_level")
    .eq("id", studentId)
    .maybeSingle();
  if (!cardPassesGradeBands(card, getGradeBand(studentRow?.grade_level))) {
    return { ok: false, code: "card_not_available" };
  }

  if (card.card_type === "achievement" || !card.can_be_purchased) {
    return { ok: false, code: "not_purchasable", message: "אי אפשר לקנות את הקלף הזה" };
  }

  const { data: owned } = await supabase
    .from("student_reward_cards")
    .select("owned")
    .eq("student_id", studentId)
    .eq("card_id", cardId)
    .maybeSingle();
  if (owned?.owned) {
    return { ok: false, code: "already_owned", message: "כבר באוסף שלך" };
  }

  const price = await resolveCardPrice(supabase, card);
  const balance = await getStudentCoinBalance(supabase, studentId);
  if (balance < price) {
    return { ok: false, code: "insufficient_coins", message: "אין לך מספיק מטבעות לקלף הזה" };
  }

  const idempotencyKey = `card:purchase:${studentId}:${cardId}`;

  const spend = await spendCardRewardCoins(supabase, {
    studentId,
    amount: price,
    idempotencyKey,
    reason: "shop_purchase",
    sourceId: cardId,
    metadata: { cardId, priceCoins: price },
  });

  if (!spend.ok) {
    if (spend.code === "insufficient_balance") {
      return { ok: false, code: "insufficient_coins", message: "אין לך מספיק מטבעות לקלף הזה" };
    }
    return { ok: false, code: spend.code || "spend_failed", message: spend.message };
  }

  if (spend.duplicate === true) {
    const { data: ownedAfterSpend } = await supabase
      .from("student_reward_cards")
      .select("owned, card_id")
      .eq("student_id", studentId)
      .eq("card_id", cardId)
      .maybeSingle();
    if (ownedAfterSpend?.owned) {
      return {
        ok: true,
        duplicate: true,
        card: ownedAfterSpend,
        priceCoins: price,
        balanceAfter: spend.coinsAfter ?? (await getStudentCoinBalance(supabase, studentId)),
      };
    }
  }

  const grant = await grantCardToStudent(supabase, studentId, cardId, {
    transactionType: "shop_purchase",
    metadata: { priceCoins: price },
  });
  if (!grant.ok) {
    return { ok: false, code: grant.code || "grant_failed" };
  }

  await writeRewardCardTransaction(supabase, {
    student_id: studentId,
    card_id: cardId,
    transaction_type: "shop_purchase",
    coins_before: spend.coinsBefore,
    coins_after: spend.coinsAfter,
    coins_amount: -price,
    reason: "shop_purchase",
    metadata_json: { priceCoins: price },
  });

  return {
    ok: true,
    card: grant.card,
    priceCoins: price,
    balanceAfter: spend.coinsAfter,
  };
}

/**
 * Sell one duplicate copy of an owned shop card back for coins.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {string} cardId
 * @param {string} idempotencyKey
 */
export async function sellDuplicateShopCard(supabase, studentId, cardId, idempotencyKey) {
  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    return { ok: false, code: "missing_idempotency_key" };
  }

  const { data: card, error: cardErr } = await supabase
    .from("reward_cards")
    .select("*, reward_card_series(name_he)")
    .eq("id", cardId)
    .maybeSingle();
  if (cardErr) return { ok: false, code: "db_error", message: cardErr.message };
  if (!card || !card.is_active || !isCardActiveNow(card)) {
    return { ok: false, code: "card_not_available" };
  }

  const { data: studentRow } = await supabase
    .from("students")
    .select("grade_level")
    .eq("id", studentId)
    .maybeSingle();
  if (!cardPassesGradeBands(card, getGradeBand(studentRow?.grade_level))) {
    return { ok: false, code: "card_not_available" };
  }

  if (card.card_type !== "shop" || !card.can_be_purchased) {
    return { ok: false, code: "not_sellable", message: "אי אפשר למכור את הקלף הזה" };
  }

  const { data: ownedRow, error: ownedErr } = await supabase
    .from("student_reward_cards")
    .select("id, owned, duplicate_count")
    .eq("student_id", studentId)
    .eq("card_id", cardId)
    .maybeSingle();
  if (ownedErr) return { ok: false, code: "db_error", message: ownedErr.message };
  if (!ownedRow?.owned) {
    return { ok: false, code: "not_owned", message: "הקלף לא באוסף שלך" };
  }

  const duplicateCount = Math.floor(Number(ownedRow.duplicate_count) || 0);
  if (duplicateCount < 1) {
    return { ok: false, code: "no_duplicate", message: "אין עותק כפול למכירה" };
  }

  const price = await resolveCardPrice(supabase, card);
  const sellbackPercent = await getDuplicateSellbackPercent(supabase);
  const sellbackCoins = computeCardSellbackCoins(price, sellbackPercent);
  if (sellbackCoins <= 0) {
    return { ok: false, code: "sellback_disabled", message: "מכירת כפילויות לא זמינה כרגע" };
  }

  const { data: priorCoinTx } = await supabase
    .from("coin_transactions")
    .select("amount, balance_after, metadata")
    .eq("student_id", studentId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (priorCoinTx) {
    const { data: currentRow } = await supabase
      .from("student_reward_cards")
      .select("duplicate_count")
      .eq("student_id", studentId)
      .eq("card_id", cardId)
      .maybeSingle();
    return {
      ok: true,
      idempotentReplay: true,
      card: {
        id: card.id,
        card_key: card.card_key,
        name_he: card.name_he,
        nameHe: card.name_he,
      },
      sellbackCoins: Math.floor(Number(priorCoinTx.amount) || sellbackCoins),
      sellbackPercent,
      duplicateCountRemaining: Math.floor(Number(currentRow?.duplicate_count) || 0),
      balanceAfter:
        priorCoinTx.balance_after != null
          ? Math.floor(Number(priorCoinTx.balance_after))
          : await getStudentCoinBalance(supabase, studentId),
    };
  }

  const { data: updatedRow, error: updErr } = await supabase
    .from("student_reward_cards")
    .update({ duplicate_count: duplicateCount - 1 })
    .eq("id", ownedRow.id)
    .gte("duplicate_count", 1)
    .select("duplicate_count")
    .maybeSingle();
  if (updErr) return { ok: false, code: "update_failed", message: updErr.message };
  if (!updatedRow) {
    return { ok: false, code: "no_duplicate", message: "אין עותק כפול למכירה" };
  }

  const coinResult = await earnCardRewardCoins(supabase, {
    studentId,
    amount: sellbackCoins,
    idempotencyKey,
    reason: "card_sellback",
    sourceId: cardId,
    metadata: {
      cardId,
      cardKey: card.card_key,
      priceCoins: price,
      sellbackPercent,
      sellbackCoins,
      duplicateCountAfter: updatedRow.duplicate_count,
    },
  });

  if (!coinResult.ok) {
    await supabase
      .from("student_reward_cards")
      .update({ duplicate_count: duplicateCount })
      .eq("id", ownedRow.id);
    return { ok: false, code: coinResult.code || "coin_failed", message: coinResult.message };
  }

  await writeRewardCardTransaction(supabase, {
    student_id: studentId,
    card_id: cardId,
    transaction_type: "card_sellback",
    coins_before: coinResult.coinsBefore,
    coins_after: coinResult.coinsAfter,
    coins_amount: sellbackCoins,
    reason: "card_sellback",
    metadata_json: {
      priceCoins: price,
      sellbackPercent,
      sellbackCoins,
      duplicateCountBefore: duplicateCount,
      duplicateCountAfter: updatedRow.duplicate_count,
    },
  });

  return {
    ok: true,
    card: {
      id: card.id,
      card_key: card.card_key,
      name_he: card.name_he,
      nameHe: card.name_he,
    },
    sellbackCoins,
    sellbackPercent,
    duplicateCountRemaining: updatedRow.duplicate_count,
    balanceAfter: coinResult.coinsAfter,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {number} balance
 */
export async function getShopListing(supabase, studentId, balance) {
  const { data: cards, error } = await supabase
    .from("reward_cards")
    .select("*, reward_card_series(name_he)")
    .eq("is_active", true)
    .eq("can_be_purchased", true)
    .eq("card_type", "shop");
  if (error) throw new Error(error.message);

  const { data: studentRow } = await supabase
    .from("students")
    .select("grade_level")
    .eq("id", studentId)
    .maybeSingle();
  const gradeBand = getGradeBand(studentRow?.grade_level);

  const { data: ownedRows } = await supabase
    .from("student_reward_cards")
    .select("card_id, duplicate_count")
    .eq("student_id", studentId)
    .eq("owned", true);
  const ownedMap = new Map((ownedRows || []).map((r) => [r.card_id, r]));
  const sellbackPercent = await getDuplicateSellbackPercent(supabase);

  const items = [];
  for (const card of cards || []) {
    if (!isCardActiveNow(card)) continue;
    if (!cardPassesGradeBands(card, gradeBand)) continue;

    const ownedRow = ownedMap.get(card.id);
    const isOwned = Boolean(ownedRow);
    const duplicateCount = isOwned ? Math.max(0, Math.floor(Number(ownedRow.duplicate_count) || 0)) : 0;
    const price = await resolveCardPrice(supabase, card);
    const sellbackCoins = computeCardSellbackCoins(price, sellbackPercent);
    const missing = isOwned ? 0 : Math.max(0, price - balance);
    items.push({
      id: card.id,
      nameHe: card.name_he,
      ...mapRewardCardImageFields(card),
      seriesNameHe: card.reward_card_series?.name_he || "",
      rarity: card.rarity,
      rarityHe: formatRarityHe(card.rarity),
      priceCoins: price,
      sellbackCoins,
      sellbackPercent,
      duplicateCount,
      canSellDuplicate: duplicateCount >= 1 && sellbackCoins > 0,
      canAfford: !isOwned && balance >= price,
      missingCoins: missing,
      alreadyOwned: isOwned,
    });
  }
  return sortShopCardsByDisplayPrice(items);
}
