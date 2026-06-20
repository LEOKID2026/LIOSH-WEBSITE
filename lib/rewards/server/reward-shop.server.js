/**
 * Card shop purchase flow.
 */

import { resolveCardPrice } from "./reward-settings.server.js";
import { grantCardToStudent, isCardActiveNow } from "./reward-cards.server.js";
import { cardPassesGradeBands } from "./card-acquisition-engine.server.js";
import { getGradeBand } from "../../learning-supabase/mission-progress.server.js";
import { spendCardRewardCoins, writeRewardCardTransaction, getStudentCoinBalance } from "./reward-coins.server.js";
import { formatRarityHe } from "../rewards-ui.he.js";
import { resolveShopCardImageUrl } from "../leo-shop-cards-registry.js";
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
    .select("card_id")
    .eq("student_id", studentId)
    .eq("owned", true);
  const ownedSet = new Set((ownedRows || []).map((r) => r.card_id));

  const items = [];
  for (const card of cards || []) {
    if (!isCardActiveNow(card)) continue;
    if (!cardPassesGradeBands(card, gradeBand)) continue;

    const isOwned = ownedSet.has(card.id);
    const price = await resolveCardPrice(supabase, card);
    const missing = isOwned ? 0 : Math.max(0, price - balance);
    items.push({
      id: card.id,
      nameHe: card.name_he,
      imageUrl: resolveShopCardImageUrl(card) || card.image_url,
      seriesNameHe: card.reward_card_series?.name_he || "",
      rarity: card.rarity,
      rarityHe: formatRarityHe(card.rarity),
      priceCoins: price,
      canAfford: !isOwned && balance >= price,
      missingCoins: missing,
      alreadyOwned: isOwned,
    });
  }
  return sortShopCardsByDisplayPrice(items);
}
