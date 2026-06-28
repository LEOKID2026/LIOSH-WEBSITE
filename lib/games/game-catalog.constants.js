/** Game categories for site_game_catalog (21 games — no legacy). */

export const GAME_CATEGORIES = Object.freeze(["online", "offline", "solo", "educational"]);

export const CATEGORY_HUB_ROUTES = Object.freeze({
  online: "/student/arcade",
  offline: "/offline",
  solo: "/game",
  educational: "/student/educational-games",
});

/** Maps /games hub card keys to catalog category. */
export const HUB_CARD_TO_CATEGORY = Object.freeze({
  online: "online",
  offline: "offline",
  regular: "solo",
  educational: "educational",
});

export const GAME_ACCESS_STATES = Object.freeze({
  ADMIN_DISABLED: "admin_disabled",
  PARENT_LOCKED: "parent_locked",
  GUEST_LOCKED: "guest_locked",
  ALLOWED: "allowed",
});

export const GAME_ACCESS_MESSAGES = Object.freeze({
  admin_disabled: "המשחק אינו זמין כרגע",
  parent_locked: "נעול על ידי ההורים",
});

/** @param {string} category */
export function isValidGameCategory(category) {
  return GAME_CATEGORIES.includes(String(category || "").trim());
}

/** @param {string} hubCardKey */
export function hubCardKeyToCategory(hubCardKey) {
  return HUB_CARD_TO_CATEGORY[String(hubCardKey || "").trim()] || null;
}

/** @param {string} category */
export function permissionsFieldForCategory(category) {
  if (category === "online") return "online_enabled";
  if (category === "offline") return "offline_enabled";
  if (category === "solo") return "solo_enabled";
  if (category === "educational") return "educational_enabled";
  return null;
}
