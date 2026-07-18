/**
 * Lightweight hub card metadata â€” no game components, data generators, or audio.
 * Safe to import from educational games hub and prefetch paths.
 */
import { EDUCATIONAL_GAME_KEYS, EDUCATIONAL_GAME_REGISTRY } from "./educational-game-registry.js";
/** @typedef {{ id: string, gameKey: string, titleHe: string, blurbHe: string, emoji: string, route: string, href: string, enabled: boolean }} EducationalHubCardMeta */
/** @returns {EducationalHubCardMeta[]} */
export function listEducationalHubCardMetadata() {
  return EDUCATIONAL_GAME_KEYS.map((key) => {
    const row = EDUCATIONAL_GAME_REGISTRY[key];
    return {
      id: row.id,
      gameKey: row.gameKey,
      titleHe: row.titleHe,
      blurbHe: row.blurbHe,
      emoji: row.emoji,
      route: row.route,
      href: row.route,
      enabled: true,
    };
  });
}
/** @param {string} gameKey */
export function getEducationalHubCardMetadata(gameKey) {
  return listEducationalHubCardMetadata().find((r) => r.gameKey === gameKey) || null;
}
/**
 * Dynamic loaders â€” import game page modules only when entering a specific game.
 * @param {string} gameKey
 */
export function loadEducationalGamePage(gameKey) {
  const key = String(gameKey || "").trim().toLowerCase();
  switch (key) {
    case "recycling-factory":
      return import("../../pages/student/educational-games/recycling-factory.js");
    case "leo-supermarket":
      return import("../../pages/student/educational-games/leo-supermarket.js");
    case "leo-lab":
      return import("../../pages/student/educational-games/leo-lab.js");
    case "leo-gifts":
      return import("../../pages/student/educational-games/leo-gifts.js");
    case "leo-bakery":
      return import("../../pages/student/educational-games/leo-bakery.js");
    case "leo-number-path":
      return import("../../pages/student/educational-games/leo-number-path.js");
    case "leo-pizzeria":
      return import("../../pages/student/educational-games/leo-pizzeria.js");
    case "leo-word-train":
      return import("../../pages/student/educational-games/leo-word-train.js");
    case "leo-word-detective":
      return import("../../pages/student/educational-games/leo-word-detective.js");
    default:
      return Promise.reject(new Error(`unknown_educational_game:${key}`));
  }
}
