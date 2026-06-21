/**
 * Student card collection queries and card catalog helpers.
 */

import { resolveCardPrice, getDuplicateSellbackPercent, computeCardSellbackCoins } from "./reward-settings.server.js";
import { getStudentCoinBalance } from "./reward-coins.server.js";
import { formatRarityHe, formatCardTypeHe } from "../rewards-ui.he.js";
import { mapRewardCardImageFields } from "../reward-card-image-urls.js";
import { sortShopCardsByDisplayPrice } from "../shop-card-sort.js";
import {
  loadRulesGroupedByCardId,
  cardPassesGradeBands,
  cardRulesAllMatch,
} from "./card-acquisition-engine.server.js";
import { getGradeBand } from "../../learning-supabase/mission-progress.server.js";
import { buildCardRequirementHe, formatProgressLineHe } from "../card-requirement-he.server.js";

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
    ...mapRewardCardImageFields(card),
    seriesNameHe: seriesName || "",
    rarity: card.rarity,
    rarityHe: formatRarityHe(card.rarity),
    cardType: card.card_type,
    cardTypeHe: formatCardTypeHe(card.card_type),
    subject: card.subject,
    topic: card.topic,
    visibilityMode: card.visibility_mode || "visible_locked",
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {object} card
 * @param {object[]} rules
 * @param {object} ctx
 */
async function buildCardLockMeta(supabase, studentId, card, rules, ctx) {
  const { matches, primaryProgress, anyProgress } = await cardRulesAllMatch(
    supabase,
    studentId,
    rules,
    ctx
  );
  const requirementHe = buildCardRequirementHe(card, rules, primaryProgress);
  const progressHe = formatProgressLineHe(primaryProgress);
  return {
    requirementHe,
    lockMessageHe: requirementHe,
    progressHe,
    progressCurrent: primaryProgress?.current ?? null,
    progressTarget: primaryProgress?.target ?? null,
    isEligible: matches,
    hasRuleProgress: anyProgress,
  };
}

/**
 * @param {object} card
 * @param {boolean} isOwned
 * @param {boolean} gradeOk
 * @param {{ hasRuleProgress?: boolean, isEligible?: boolean }} meta
 */
function cardVisibleToStudent(card, isOwned, gradeOk, meta) {
  if (isOwned) return true;
  if (!gradeOk) return false;
  if (card.visibility_mode === "hidden_until_eligible") {
    return meta.hasRuleProgress === true || meta.isEligible === true;
  }
  return true;
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

  return (owned || []).map((row) => {
    const card = row.reward_cards;
    const isAchievement = card?.card_type === "achievement";
    return {
      ...mapCardForChild(card, card?.reward_card_series?.name_he),
      duplicateCount: isAchievement ? 0 : row.duplicate_count,
      canConvert: false,
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
  const [allCards, ownedRows, seriesRows, rulesByCard] = await Promise.all([
    fetchActiveCardsWithSeries(supabase),
    supabase.from("student_reward_cards").select("*").eq("student_id", studentId),
    supabase.from("reward_card_series").select("*").eq("is_active", true).order("display_order"),
    loadRulesGroupedByCardId(supabase),
  ]);

  if (ownedRows.error) throw new Error(ownedRows.error.message);
  if (seriesRows.error) throw new Error(seriesRows.error.message);

  const { data: studentRow } = await supabase
    .from("students")
    .select("grade_level")
    .eq("id", studentId)
    .maybeSingle();
  const studentGradeBand = getGradeBand(studentRow?.grade_level);
  const ctx = { gradeBand: studentGradeBand, monthlyMinutes: 0 };

  const ownedMap = new Map((ownedRows.data || []).map((r) => [r.card_id, r]));
  const ownedIds = new Set([...(ownedRows.data || []).filter((r) => r.owned).map((r) => r.card_id)]);
  const sellbackPercent = await getDuplicateSellbackPercent(supabase);
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
    const rules = rulesByCard.get(card.id) || [];
    const gradeOk = cardPassesGradeBands(card, studentGradeBand);
    const lockMeta = isOwned
      ? null
      : await buildCardLockMeta(supabase, studentId, card, rules, ctx);

    if (!cardVisibleToStudent(card, isOwned, gradeOk, lockMeta || {})) {
      continue;
    }

    if (isOwned && ownedRow) {
      const isAchievement = card.card_type === "achievement";
      collection.push({
        ...mapped,
        duplicateCount: isAchievement ? 0 : ownedRow.duplicate_count,
        canConvert: false,
      });
    } else if (card.card_type === "achievement" || rules.length > 0) {
      locked.push({
        ...mapped,
        lockMessageHe: lockMeta?.lockMessageHe || "המשך ללמוד כדי לפתוח את הקלף",
        requirementHe: lockMeta?.requirementHe || mapped.descriptionHe,
        progressHe: lockMeta?.progressHe || null,
        progressCurrent: lockMeta?.progressCurrent ?? null,
        progressTarget: lockMeta?.progressTarget ?? null,
      });
    } else if (card.can_be_purchased && card.card_type !== "achievement") {
      locked.push({
        ...mapped,
        lockMessageHe:
          lockMeta?.lockMessageHe ||
          (card.card_type === "event" ? "לא זמין כרגע" : "אפשר לקנות בחנות"),
        requirementHe: lockMeta?.requirementHe || null,
        progressHe: lockMeta?.progressHe || null,
      });
    } else if (!isOwned) {
      locked.push({
        ...mapped,
        lockMessageHe: lockMeta?.lockMessageHe || "לא זמין כרגע",
        requirementHe: lockMeta?.requirementHe || null,
        progressHe: lockMeta?.progressHe || null,
      });
    }
  }

  for (const card of allCards) {
    if (!card.can_be_purchased || card.card_type !== "shop") continue;
    if (!cardPassesGradeBands(card, studentGradeBand)) continue;
    if (!isCardActiveNow(card)) continue;

    const isOwned = ownedIds.has(card.id);
    const ownedRow = ownedMap.get(card.id);
    const duplicateCount = isOwned ? Math.max(0, Math.floor(Number(ownedRow?.duplicate_count) || 0)) : 0;
    const price = await resolveCardPrice(supabase, card);
    const sellbackCoins = computeCardSellbackCoins(price, sellbackPercent);
    const missing = isOwned ? 0 : Math.max(0, price - coinBalance);
    shop.push({
      ...mapCardForChild(card, card.reward_card_series?.name_he),
      priceCoins: price,
      sellbackCoins,
      sellbackPercent,
      duplicateCount,
      canSellDuplicate: duplicateCount >= 1 && sellbackCoins > 0,
      canAfford: !isOwned && coinBalance >= price,
      missingCoins: missing,
      alreadyOwned: isOwned,
    });
  }

  const sortedShop = sortShopCardsByDisplayPrice(shop);

  const catalog = sortCatalogCardsForDisplay(
    (
      await Promise.all(
        allCards.map(async (card) => {
          const seriesName = card.reward_card_series?.name_he || "";
          const mapped = mapCardForChild(card, seriesName);
          const ownedRow = ownedMap.get(card.id);
          const isOwned = ownedIds.has(card.id);
          const rules = rulesByCard.get(card.id) || [];
          const gradeOk = cardPassesGradeBands(card, studentGradeBand);
          const lockMeta = isOwned
            ? null
            : await buildCardLockMeta(supabase, studentId, card, rules, ctx);

          if (!cardVisibleToStudent(card, isOwned, gradeOk, lockMeta || {})) {
            return null;
          }

          if (isOwned && ownedRow) {
            const isAchievement = card.card_type === "achievement";
            return {
              ...mapped,
              isOwned: true,
              duplicateCount: isAchievement ? 0 : ownedRow.duplicate_count,
              canConvert: false,
            };
          }

          const requirementHe =
            lockMeta?.requirementHe ||
            buildCardRequirementHe(card, rules, lockMeta?.primaryProgress);

          return {
            ...mapped,
            isOwned: false,
            lockMessageHe: requirementHe,
            requirementHe,
            progressHe: lockMeta?.progressHe || null,
            progressCurrent: lockMeta?.progressCurrent ?? null,
            progressTarget: lockMeta?.progressTarget ?? null,
          };
        })
      )
    ).filter(Boolean)
  );

  for (const series of seriesRows.data || []) {
    const inSeries = allCards
      .filter((c) => c.series_id === series.id)
      .sort((a, b) => (a.name_he || "").localeCompare(b.name_he || "", "he"));
    const seriesName = series.name_he || "";
    const cards = [];
    for (const card of inSeries) {
      const owned = ownedIds.has(card.id);
      const gradeOk = cardPassesGradeBands(card, studentGradeBand);
      const rules = rulesByCard.get(card.id) || [];
      const lockMeta = owned
        ? null
        : await buildCardLockMeta(supabase, studentId, card, rules, ctx);
      if (!cardVisibleToStudent(card, owned, gradeOk, lockMeta || {})) continue;

      const mapped = mapCardForChild(card, seriesName);
      cards.push({
        cardId: card.id,
        cardKey: card.card_key,
        id: card.id,
        nameHe: mapped.nameHe,
        imageUrl: mapped.imageUrl,
        imageThumbUrl: mapped.imageThumbUrl,
        imageDisplayUrl: mapped.imageDisplayUrl,
        imageDownloadUrl: mapped.imageDownloadUrl,
        imageVariantsReady: mapped.imageVariantsReady,
        rarity: mapped.rarity,
        rarityHe: mapped.rarityHe,
        seriesNameHe: seriesName,
        owned,
        isLocked: !owned,
        requirementHe: lockMeta?.requirementHe || null,
        progressHe: lockMeta?.progressHe || null,
      });
    }
    const ownedInSeries = cards.filter((c) => c.owned).length;
    seriesProgress.push({
      seriesId: series.id,
      nameHe: seriesName,
      ownedCount: ownedInSeries,
      totalCount: cards.length,
      cards,
    });
  }

  return {
    collection,
    catalog,
    locked: sortCatalogCardsForDisplay(locked),
    shop: sortedShop,
    seriesProgress,
  };
}

/** Catalog / locked tab: non-event cards first, event cards last. */
function sortCatalogCardsForDisplay(cards) {
  const rest = [];
  const events = [];
  for (const card of cards) {
    if (card.cardType === "event") events.push(card);
    else rest.push(card);
  }
  events.sort((a, b) => (a.nameHe || "").localeCompare(b.nameHe || "", "he"));
  return [...rest, ...events];
}

function buildAchievementLockHint(card) {
  if (card.requirement_text_he) return String(card.requirement_text_he).trim();
  if (card.description_he) return String(card.description_he).trim();
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
