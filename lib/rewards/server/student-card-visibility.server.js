/**
 * Exclude legacy 058 seed cards from student-facing card world APIs.
 */
import {
  LEGACY_058_ACHIEVEMENT_KEY_SET,
  LEGACY_058_SERIES_SLUG_SET,
  LEGACY_058_SHOP_KEY_SET,
} from "../legacy-seed-card-keys.js";

/** @param {string | null | undefined} url */
function legacy058SvgAssetPathReason(url) {
  const base = String(url || "").split("?")[0];
  if (!base.endsWith(".svg")) return null;
  if (
    /^\/rewards\/cards\/shop\/(animals|space|dinosaurs|robots|heroes|fantasy|nature|football)\/[^/]+\.svg$/i.test(
      base
    )
  ) {
    return "legacy_058_shop_svg_path";
  }
  if (
    /^\/rewards\/cards\/achievements\/(general|persistence|math|hebrew|english|science|geometry|moledet)\/[^/]+\.svg$/i.test(
      base
    )
  ) {
    return "legacy_058_achievement_svg_path";
  }
  return null;
}

/**
 * @param {object | null | undefined} card
 * @returns {string | null} exclusion reason code, or null if visible to students
 */
export function getLegacySeedCardExclusionReason(card) {
  if (!card) return "missing_card";

  const cardKey = String(card.card_key || card.cardKey || "").trim();
  const cardType = String(card.card_type || card.cardType || "").trim();
  const seriesSlug = String(card.reward_card_series?.slug || card.seriesSlug || "").trim();
  const imageUrl = String(card.image_url || card.imageUrl || "").trim();

  if (cardType === "shop" && LEGACY_058_SHOP_KEY_SET.has(cardKey)) {
    return "legacy_058_shop_seed_key";
  }
  if (cardType === "achievement" && LEGACY_058_ACHIEVEMENT_KEY_SET.has(cardKey)) {
    return "legacy_058_achievement_seed_key";
  }
  if (seriesSlug && LEGACY_058_SERIES_SLUG_SET.has(seriesSlug)) {
    return "legacy_058_inactive_series";
  }

  const svgReason = legacy058SvgAssetPathReason(imageUrl);
  if (svgReason) return svgReason;

  return null;
}

/** @param {object | null | undefined} card */
export function isLegacySeedCardExcludedFromStudentWorld(card) {
  return getLegacySeedCardExclusionReason(card) != null;
}

/**
 * @param {object[]} cards
 * @returns {{ visible: object[], excluded: { cardKey: string, reason: string }[] }}
 */
export function filterStudentWorldCards(cards) {
  const visible = [];
  const excluded = [];
  for (const card of cards || []) {
    const reason = getLegacySeedCardExclusionReason(card);
    if (reason) {
      excluded.push({
        cardKey: String(card.card_key || card.cardKey || ""),
        reason,
      });
    } else {
      visible.push(card);
    }
  }
  return { visible, excluded };
}
