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
  cardRulesAllMatchFromCache,
  buildStudentRuleProgressCache,
} from "./card-acquisition-engine.server.js";
import { getGradeBand } from "../../learning-supabase/mission-progress.server.js";
import { buildCardRequirementHe, formatProgressLineHe } from "../card-requirement-he.server.js";
import { isLegacySeedCardExcludedFromStudentWorld } from "./student-card-visibility.server.js";

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
 * @param {object} card
 * @param {object[]} rules
 * @param {object} ctx
 * @param {Awaited<ReturnType<typeof buildStudentRuleProgressCache>>} progressCache
 */
function buildCardLockMetaFromCache(card, rules, ctx, progressCache) {
  const { matches, primaryProgress, anyProgress } = cardRulesAllMatchFromCache(
    rules,
    ctx,
    progressCache
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
    primaryProgress,
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
  return (cards || []).filter(
    (c) => isCardActiveNow(c) && !isLegacySeedCardExcludedFromStudentWorld(c)
  );
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

  return (owned || [])
    .filter((row) => !isLegacySeedCardExcludedFromStudentWorld(row.reward_cards))
    .map((row) => {
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

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
async function loadStudentGradeBand(supabase, studentId) {
  const { data: studentRow } = await supabase
    .from("students")
    .select("grade_level")
    .eq("id", studentId)
    .maybeSingle();
  return getGradeBand(studentRow?.grade_level);
}

/**
 * @param {object[]} allCards
 * @param {Set<string>} ownedIds
 * @param {string} studentGradeBand
 * @param {Map<string, object[]>} rulesByCard
 * @param {{ gradeBand: string, monthlyMinutes: number }} ctx
 * @param {Awaited<ReturnType<typeof buildStudentRuleProgressCache>>} progressCache
 */
function buildLockMetaByCardId(allCards, ownedIds, rulesByCard, ctx, progressCache) {
  /** @type {Map<string, ReturnType<typeof buildCardLockMetaFromCache>>} */
  const lockMetaByCardId = new Map();
  for (const card of allCards) {
    if (ownedIds.has(card.id)) continue;
    lockMetaByCardId.set(
      card.id,
      buildCardLockMetaFromCache(card, rulesByCard.get(card.id) || [], ctx, progressCache)
    );
  }
  return lockMetaByCardId;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 * @param {object[]} allCards
 * @param {Map<string, object[]>} rulesByCard
 * @param {Set<string>} ownedIds
 * @param {string} studentGradeBand
 */
async function loadLockMetaContext(supabase, studentId, allCards, rulesByCard, ownedIds, studentGradeBand) {
  const ctx = { gradeBand: studentGradeBand, monthlyMinutes: 0 };
  const progressCache = await buildStudentRuleProgressCache(
    supabase,
    studentId,
    rulesByCard,
    ctx
  );
  const lockMetaByCardId = buildLockMetaByCardId(allCards, ownedIds, rulesByCard, ctx, progressCache);
  const getLockMeta = (card) =>
    ownedIds.has(card.id) ? null : lockMetaByCardId.get(card.id) ?? null;
  return { ctx, progressCache, getLockMeta };
}

/**
 * Lightweight counts + coin balance for cards page shell.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getStudentCardsSummary(supabase, studentId) {
  const studentGradeBand = await loadStudentGradeBand(supabase, studentId);
  const [coinBalance, ownedRows, shopCardsRes, seriesRows] = await Promise.all([
    getStudentCoinBalance(supabase, studentId),
    supabase
      .from("student_reward_cards")
      .select("card_id, owned, reward_cards(card_key, card_type, image_url, reward_card_series(slug))")
      .eq("student_id", studentId),
    supabase
      .from("reward_cards")
      .select(
        "id, card_key, card_type, can_be_purchased, grade_bands, starts_at, ends_at, is_active, image_url, reward_card_series(slug)"
      )
      .eq("is_active", true),
    supabase.from("reward_card_series").select("id, slug").eq("is_active", true),
  ]);

  if (ownedRows.error) throw new Error(ownedRows.error.message);
  if (shopCardsRes.error) throw new Error(shopCardsRes.error.message);
  if (seriesRows.error) throw new Error(seriesRows.error.message);

  const ownedIds = new Set(
    (ownedRows.data || [])
      .filter(
        (r) => r.owned && !isLegacySeedCardExcludedFromStudentWorld(r.reward_cards)
      )
      .map((r) => r.card_id)
  );

  let shopCount = 0;
  for (const card of (shopCardsRes.data || []).filter((c) => isCardActiveNow(c))) {
    if (isLegacySeedCardExcludedFromStudentWorld(card)) continue;
    if (!card.can_be_purchased || card.card_type !== "shop") continue;
    if (!cardPassesGradeBands(card, studentGradeBand)) continue;
    shopCount += 1;
  }

  const seriesCount = (seriesRows.data || []).filter(
    (series) => !isLegacySeedCardExcludedFromStudentWorld({ reward_card_series: series })
  ).length;

  return {
    coinBalance,
    counts: {
      collection: ownedIds.size,
      shop: shopCount,
      series: seriesCount,
    },
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getStudentCardsShopView(supabase, studentId) {
  const studentGradeBand = await loadStudentGradeBand(supabase, studentId);
  const [allCards, ownedRows, sellbackPercent, coinBalance] = await Promise.all([
    fetchActiveCardsWithSeries(supabase),
    supabase.from("student_reward_cards").select("*").eq("student_id", studentId),
    getDuplicateSellbackPercent(supabase),
    getStudentCoinBalance(supabase, studentId),
  ]);

  if (ownedRows.error) throw new Error(ownedRows.error.message);

  const ownedMap = new Map((ownedRows.data || []).map((r) => [r.card_id, r]));
  const ownedIds = new Set((ownedRows.data || []).filter((r) => r.owned).map((r) => r.card_id));

  const shop = [];
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

  return { shop: sortShopCardsByDisplayPrice(shop) };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getStudentCardsCollectionView(supabase, studentId) {
  return { collection: await getStudentCollection(supabase, studentId) };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getStudentCardsCatalogView(supabase, studentId) {
  const studentGradeBand = await loadStudentGradeBand(supabase, studentId);
  const [allCards, ownedRows, rulesByCard] = await Promise.all([
    fetchActiveCardsWithSeries(supabase),
    supabase.from("student_reward_cards").select("*").eq("student_id", studentId),
    loadRulesGroupedByCardId(supabase),
  ]);

  if (ownedRows.error) throw new Error(ownedRows.error.message);

  const ownedMap = new Map((ownedRows.data || []).map((r) => [r.card_id, r]));
  const ownedIds = new Set((ownedRows.data || []).filter((r) => r.owned).map((r) => r.card_id));
  const { getLockMeta } = await loadLockMetaContext(
    supabase,
    studentId,
    allCards,
    rulesByCard,
    ownedIds,
    studentGradeBand
  );

  const catalog = sortCatalogCardsForDisplay(
    allCards
      .map((card) => {
        const seriesName = card.reward_card_series?.name_he || "";
        const mapped = mapCardForChild(card, seriesName);
        const ownedRow = ownedMap.get(card.id);
        const isOwned = ownedIds.has(card.id);
        const rules = rulesByCard.get(card.id) || [];
        const gradeOk = cardPassesGradeBands(card, studentGradeBand);
        const lockMeta = getLockMeta(card);

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
      .filter(Boolean)
  );

  return { catalog };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getStudentCardsSeriesView(supabase, studentId) {
  const studentGradeBand = await loadStudentGradeBand(supabase, studentId);
  const [allCards, ownedRows, seriesRows, rulesByCard] = await Promise.all([
    fetchActiveCardsWithSeries(supabase),
    supabase.from("student_reward_cards").select("*").eq("student_id", studentId),
    supabase.from("reward_card_series").select("*").eq("is_active", true).order("display_order"),
    loadRulesGroupedByCardId(supabase),
  ]);

  if (ownedRows.error) throw new Error(ownedRows.error.message);
  if (seriesRows.error) throw new Error(seriesRows.error.message);

  const ownedIds = new Set((ownedRows.data || []).filter((r) => r.owned).map((r) => r.card_id));
  const { getLockMeta } = await loadLockMetaContext(
    supabase,
    studentId,
    allCards,
    rulesByCard,
    ownedIds,
    studentGradeBand
  );

  const seriesProgress = [];
  for (const series of seriesRows.data || []) {
    if (isLegacySeedCardExcludedFromStudentWorld({ reward_card_series: series })) continue;
    const inSeries = allCards
      .filter((c) => c.series_id === series.id)
      .sort((a, b) => (a.name_he || "").localeCompare(b.name_he || "", "he"));
    const seriesName = series.name_he || "";
    const cards = [];
    for (const card of inSeries) {
      const owned = ownedIds.has(card.id);
      const gradeOk = cardPassesGradeBands(card, studentGradeBand);
      const lockMeta = getLockMeta(card);
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

  return { seriesProgress };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
export async function getStudentCardsView(supabase, studentId) {
  const [summary, collectionView, shopView, catalogView, seriesView] = await Promise.all([
    getStudentCardsSummary(supabase, studentId),
    getStudentCardsCollectionView(supabase, studentId),
    getStudentCardsShopView(supabase, studentId),
    getStudentCardsCatalogView(supabase, studentId),
    getStudentCardsSeriesView(supabase, studentId),
  ]);

  const studentGradeBand = await loadStudentGradeBand(supabase, studentId);
  const [allCards, ownedRows, rulesByCard] = await Promise.all([
    fetchActiveCardsWithSeries(supabase),
    supabase.from("student_reward_cards").select("*").eq("student_id", studentId),
    loadRulesGroupedByCardId(supabase),
  ]);
  if (ownedRows.error) throw new Error(ownedRows.error.message);

  const ownedMap = new Map((ownedRows.data || []).map((r) => [r.card_id, r]));
  const ownedIds = new Set((ownedRows.data || []).filter((r) => r.owned).map((r) => r.card_id));
  const { getLockMeta } = await loadLockMetaContext(
    supabase,
    studentId,
    allCards,
    rulesByCard,
    ownedIds,
    studentGradeBand
  );

  const locked = [];
  for (const card of allCards) {
    const seriesName = card.reward_card_series?.name_he || "";
    const mapped = mapCardForChild(card, seriesName);
    const ownedRow = ownedMap.get(card.id);
    const isOwned = ownedIds.has(card.id);
    const rules = rulesByCard.get(card.id) || [];
    const gradeOk = cardPassesGradeBands(card, studentGradeBand);
    const lockMeta = getLockMeta(card);

    if (!cardVisibleToStudent(card, isOwned, gradeOk, lockMeta || {})) continue;

    if (isOwned && ownedRow) continue;

    if (card.card_type === "achievement" || rules.length > 0) {
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

  return {
    collection: collectionView.collection,
    catalog: catalogView.catalog,
    locked: sortCatalogCardsForDisplay(locked),
    shop: shopView.shop,
    seriesProgress: seriesView.seriesProgress,
    coinBalance: summary.coinBalance,
    counts: summary.counts,
  };
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
