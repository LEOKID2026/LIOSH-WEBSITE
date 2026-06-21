/** Solo Leo games catalog for /student/solo-games/* */

export const SOLO_GAME_KEYS = Object.freeze(["catcher", "puzzle", "memory", "flyer"]);

export const SOLO_DIFFICULTY_OPTIONS = Object.freeze([
  { id: "easy", labelHe: "קל" },
  { id: "medium", labelHe: "בינוני" },
  { id: "hard", labelHe: "קשה" },
]);

/** @type {Record<string, { id: string, route: string, titleHe: string, emoji: string, blurbHe: string, hasDifficultyPicker: boolean, requiresLandscape: boolean }>} */
export const SOLO_GAME_REGISTRY = {
  catcher: {
    id: "catcher",
    route: "/student/solo-games/catcher",
    titleHe: "תופס עם ליאו",
    emoji: "🎯",
    blurbHe: "תפסו מטבעות והתרחקו מפצצות!",
    hasDifficultyPicker: false,
    requiresLandscape: false,
  },
  flyer: {
    id: "flyer",
    route: "/student/solo-games/flyer",
    titleHe: "ליאו במטוס",
    emoji: "🪂",
    blurbHe: "החזיקו לטוס, אספו מטבעות והימנעו ממכשולים!",
    hasDifficultyPicker: false,
    requiresLandscape: false,
  },
  puzzle: {
    id: "puzzle",
    route: "/student/solo-games/puzzle",
    titleHe: "חידת ליאו",
    emoji: "🧩",
    blurbHe: "שלבו אריחים וצברו נקודות לפני שהזמן נגמר!",
    hasDifficultyPicker: true,
    requiresLandscape: true,
  },
  memory: {
    id: "memory",
    route: "/student/solo-games/memory",
    titleHe: "זיכרון ליאו",
    emoji: "🧠",
    blurbHe: "הפכו קלפים ומצאו זוגות לפני שהשעון נגמר!",
    hasDifficultyPicker: true,
    requiresLandscape: false,
  },
};

export const SOLO_GAME_LIST = SOLO_GAME_KEYS.map((key) => SOLO_GAME_REGISTRY[key]);

/**
 * @param {string} gameKey
 */
export function findSoloGame(gameKey) {
  const key = String(gameKey || "").trim().toLowerCase();
  return SOLO_GAME_REGISTRY[key] || null;
}

/**
 * @param {string} gameKey
 */
export function isValidSoloGameKey(gameKey) {
  return SOLO_GAME_KEYS.includes(String(gameKey || "").trim().toLowerCase());
}

/**
 * @param {string} difficulty
 */
export function isValidSoloDifficulty(difficulty) {
  if (!difficulty) return true;
  return SOLO_DIFFICULTY_OPTIONS.some((d) => d.id === difficulty);
}

/**
 * @param {string} difficulty
 */
export function difficultyLabelHe(difficulty) {
  const d = SOLO_DIFFICULTY_OPTIONS.find((x) => x.id === difficulty);
  return d?.labelHe || difficulty || "—";
}
