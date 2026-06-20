/** Hebrew labels for child-facing reward UI — never expose English enum keys. */

export const RARITY_LABELS_HE = {
  regular: "רגיל",
  special: "מיוחד",
  rare: "נדיר",
  gold: "זהב",
};

export const CARD_TYPE_LABELS_HE = {
  achievement: "קלף הישג",
  shop: "קלף חנות",
  event: "קלף אירוע",
};

export const CARD_SOURCE_LABELS_HE = {
  earned_achievement: "הישג לימודי",
  shop_purchase: "רכישה בחנות",
  surprise_box_reward: "קופסת הפתעה",
  duplicate_conversion: "המרת כפילויות",
  card_sellback: "מכירת עותק כפול",
  admin_grant: "מתנה מהמערכת",
};

export function formatRarityHe(rarity) {
  return RARITY_LABELS_HE[rarity] || RARITY_LABELS_HE.regular;
}

export function formatCardTypeHe(cardType) {
  return CARD_TYPE_LABELS_HE[cardType] || CARD_TYPE_LABELS_HE.shop;
}

export function formatCoinAmountHe(amount) {
  const n = Math.floor(Number(amount) || 0);
  return `${n.toLocaleString("he-IL")} מטבעות`;
}

export function formatCoinAmountNumberHe(amount) {
  const n = Math.floor(Number(amount) || 0);
  return n.toLocaleString("he-IL");
}

/** Shop tile when the student already owns this purchasable card. */
export const SHOP_CARD_ALREADY_OWNED_HE = "יש לך!";

/** Shop tile when the student can sell one duplicate copy. */
export const SHOP_CARD_SELL_DUPLICATE_HE = "מכור עותק כפול";

/** Catalog tile when the student already owns this card. */
export const CATALOG_CARD_OWNED_HE = "השגתם";

export function formatCountdownHe(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
