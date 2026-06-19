/**
 * Student card collection queries and card catalog helpers.
 */

import { resolveCardPrice, getDuplicateThreshold } from "./reward-settings.server.js";
import { getStudentCoinBalance } from "./reward-coins.server.js";
import { formatRarityHe, formatCardTypeHe } from "../rewards-ui.he.js";
import { resolveShopCardImageUrlOrPlaceholder } from "../leo-shop-cards-registry.js";
import { sortShopCardsByDisplayPrice } from "../shop-card-sort.js";

function isCardActiveNow(card, now = new Date()) {
  if (!card.is_active) return false;
  if (card.starts_at && new Date(card.starts_at) > now) return false;
  if (card.ends_at && new Date(card.ends_at) < now) return false;
  return true;
}

function mapCardForChild(card, seriesName) {
  return {
    id: card.id,
    cardKey: card.card_key,
    nameHe: card.name_he,
    descriptionHe: card.description_he || "",
    imageUrl: resolveShopCardImageUrlOrPlaceholder(card),
    seriesNameHe: seriesName || "",
    rarity: card.rarity,
    rarityHe: formatRarityHe(card.rarity),
    cardType: card.card_type,
    cardTypeHe: formatCardTypeHe(card.card_type),
    subject: card.subject,
    topic: card.topic,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function fetchActiveCardsWithSeries(supabase) {
  const { data: cards, error } = await supabase
    .from("reward_cards")
    .select("*, reward_card_series(name_he, slug)")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return (cards || []).filter((c) => isCardActiveNow(c));
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getStudentCollection(supabase, studentId) {
  const { data: owned, error } = await supabase
    .from("student_reward_cards")
    .select("*, reward_cards(*, reward_card_series(name_he, slug))")
    .eq("student_id", studentId)
    .eq("owned", true);
  if (error) throw new Error(error.message);

  const threshold = await getDuplicateThreshold(supabase);
  return (owned || []).map((row) => {
    const card = row.reward_cards;
    const isAchievement = card?.card_type === "achievement";
    return {
      ...mapCardForChild(card, card?.reward_card_series?.name_he),
      duplicateCount: isAchievement ? 0 : row.duplicate_count,
      conversionThreshold: threshold,
      canConvert: !isAchievement && row.duplicate_count >= threshold,
      firstReceivedAt: row.first_received_at,
      lastReceivedAt: row.last_received_at,
    };
  });
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getStudentCardsView(supabase, studentId) {
  const [allCards, ownedRows, seriesRows] = await Promise.all([
    fetchActiveCardsWithSeries(supabase),
    supabase.from("student_reward_cards").select("*").eq("student_id", studentId),
    supabase.from("reward_card_series").select("*").eq("is_active", true).order("display_order"),
  ]);

  if (ownedRows.error) throw new Error(ownedRows.error.message);
  if (seriesRows.error) throw new Error(seriesRows.error.message);

  const ownedMap = new Map((ownedRows.data || []).map((r) => [r.card_id, r]));
  const ownedIds = new Set([...(ownedRows.data || []).filter((r) => r.owned).map((r) => r.card_id)]);
  const threshold = await getDuplicateThreshold(supabase);
  const coinBalance = await getStudentCoinBalance(supabase, studentId);

  const collection = [];
  const locked = [];
  const shop = [];
  const seriesProgress = [];

  for (const card of allCards) {
    const seriesName = card.reward_card_series?.name_he || "";
    const mapped = mapCardForChild(card, seriesName);
    const ownedRow = ownedMap.get(card.id);
    const isOwned = ownedIds.has(card.id);

    if (isOwned && ownedRow) {
      const isAchievement = card.card_type === "achievement";
      collection.push({
        ...mapped,
        duplicateCount: isAchievement ? 0 : ownedRow.duplicate_count,
        canConvert: !isAchievement && ownedRow.duplicate_count >= threshold,
      });
    } else if (card.card_type === "achievement") {
      locked.push({
        ...mapped,
        lockMessageHe: buildAchievementLockHint(card),
      });
    } else if (card.can_be_purchased && card.card_type !== "achievement") {
      if (!isOwned) {
        locked.push({
          ...mapped,
          lockMessageHe: card.card_type === "event" ? "לא זמין כרגע" : "אפשר לקנות בחנות",
        });
      }
    } else if (!isOwned) {
      locked.push({ ...mapped, lockMessageHe: "לא זמין כרגע" });
    }
  }

  for (const card of allCards) {
    if (card.can_be_purchased && card.card_type === "shop") {
      const isOwned = ownedIds.has(card.id);
      if (isOwned) continue;
      const price = await resolveCardPrice(supabase, card);
      const missing = Math.max(0, price - coinBalance);
      shop.push({
        ...mapCardForChild(card, card.reward_card_series?.name_he),
        priceCoins: price,
        canAfford: coinBalance >= price,
        missingCoins: missing,
        alreadyOwned: false,
      });
    }
  }

  const sortedShop = sortShopCardsByDisplayPrice(shop);

  for (const series of seriesRows.data || []) {
    const inSeries = allCards
      .filter((c) => c.series_id === series.id)
      .sort((a, b) => (a.name_he || "").localeCompare(b.name_he || "", "he"));
    const ownedInSeries = inSeries.filter((c) => ownedIds.has(c.id)).length;
    const seriesName = series.name_he || "";
    seriesProgress.push({
      seriesId: series.id,
      nameHe: seriesName,
      ownedCount: ownedInSeries,
      totalCount: inSeries.length,
      cards: inSeries.map((card) => {
        const owned = ownedIds.has(card.id);
        const mapped = mapCardForChild(card, seriesName);
        return {
          cardId: card.id,
          cardKey: card.card_key,
          id: card.id,
          nameHe: mapped.nameHe,
          imageUrl: mapped.imageUrl,
          rarity: mapped.rarity,
          rarityHe: mapped.rarityHe,
          seriesNameHe: seriesName,
          owned,
          isLocked: !owned,
        };
      }),
    });
  }

  return { collection, locked, shop: sortedShop, seriesProgress };
}

function buildAchievementLockHint(card) {
  if (card.description_he) return `ענה על עוד שאלות כדי לפתוח: ${card.description_he}`;
  return "המשך ללמוד כדי לפתוח את הקלף";
}

/**
 * Grant a card to student (owned or duplicate).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function grantCardToStudent(supabase, studentId, cardId, { transactionType, metadata } = {}) {
  const { data: card } = await supabase.from("reward_cards").select("*").eq("id", cardId).maybeSingle();
  if (!card) return { ok: false, code: "card_not_found" };

  const isAchievement = card.card_type === "achievement";
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("student_reward_cards")
    .select("*")
    .eq("student_id", studentId)
    .eq("card_id", cardId)
    .maybeSingle();

  if (isAchievement && existing?.owned) {
    return { ok: true, duplicate: false, alreadyOwned: true, card };
  }

  let wasDuplicate = false;
  if (existing?.owned) {
    if (isAchievement) {
      return { ok: true, duplicate: false, alreadyOwned: true, card };
    }
    wasDuplicate = true;
    const { error } = await supabase
      .from("student_reward_cards")
      .update({
        duplicate_count: (existing.duplicate_count || 0) + 1,
        last_received_at: now,
      })
      .eq("id", existing.id);
    if (error) return { ok: false, code: "update_failed", message: error.message };
  } else if (existing) {
    const { error } = await supabase
      .from("student_reward_cards")
      .update({ owned: true, last_received_at: now, first_received_at: existing.first_received_at || now })
      .eq("id", existing.id);
    if (error) return { ok: false, code: "update_failed", message: error.message };
  } else {
    const { error } = await supabase.from("student_reward_cards").insert({
      student_id: studentId,
      card_id: cardId,
      owned: true,
      duplicate_count: 0,
      first_received_at: now,
      last_received_at: now,
    });
    if (error) return { ok: false, code: "insert_failed", message: error.message };
  }

  const { data: afterRow } = await supabase
    .from("student_reward_cards")
    .select("duplicate_count")
    .eq("student_id", studentId)
    .eq("card_id", cardId)
    .maybeSingle();

  return {
    ok: true,
    duplicate: wasDuplicate,
    duplicateCount: afterRow?.duplicate_count ?? 0,
    card,
    transactionType: transactionType || "surprise_box_reward",
    metadata,
  };
}

export { isCardActiveNow, mapCardForChild };
