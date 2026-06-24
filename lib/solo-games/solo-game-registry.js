/** Solo Leo games catalog for /student/solo-games/* */

export const SOLO_GAME_KEYS = Object.freeze([
  "catcher",
  "puzzle",
  "memory",
  "flyer",
  "leo-jump",
  "balloons",
  "maze",
  "picture-puzzle",
  "target-tap",
  "sort-shapes",
]);

export const SOLO_DIFFICULTY_OPTIONS = Object.freeze([
  { id: "easy", labelHe: "קל" },
  { id: "medium", labelHe: "בינוני" },
  { id: "hard", labelHe: "קשה" },
]);

/** @typedef {"landscape-recommend" | "portrait-recommend" | null} SoloOrientationHint */

/** @type {Record<string, { id: string, route: string, titleHe: string, emoji: string, blurbHe: string, hasDifficultyPicker: boolean, orientationHint: SoloOrientationHint }>} */
export const SOLO_GAME_REGISTRY = {
  catcher: {
    id: "catcher",
    route: "/student/solo-games/catcher",
    titleHe: "תופס עם ליאו",
    emoji: "🎯",
    blurbHe: "תפסו מטבעות והתרחקו מפצצות!",
    hasDifficultyPicker: false,
    orientationHint: "landscape-recommend",
  },
  flyer: {
    id: "flyer",
    route: "/student/solo-games/flyer",
    titleHe: "ליאו במטוס",
    emoji: "🪂",
    blurbHe: "החזיקו לטוס, אספו מטבעות והימנעו ממכשולים!",
    hasDifficultyPicker: false,
    orientationHint: "landscape-recommend",
  },
  puzzle: {
    id: "puzzle",
    route: "/student/solo-games/puzzle",
    titleHe: "חידת ליאו",
    emoji: "🧩",
    blurbHe: "שלבו אריחים וצברו נקודות לפני שהזמן נגמר!",
    hasDifficultyPicker: true,
    orientationHint: "portrait-recommend",
  },
  memory: {
    id: "memory",
    route: "/student/solo-games/memory",
    titleHe: "זיכרון ליאו",
    emoji: "🧠",
    blurbHe: "הפכו קלפים ומצאו זוגות לפני שהשעון נגמר!",
    hasDifficultyPicker: true,
    orientationHint: null,
  },
  "leo-jump": {
    id: "leo-jump",
    route: "/student/solo-games/leo-jump",
    titleHe: "ליאו קופץ",
    emoji: "🦘",
    blurbHe: "קפצו מעל מכשולים ואספו מטבעות!",
    hasDifficultyPicker: false,
    orientationHint: "landscape-recommend",
  },
  balloons: {
    id: "balloons",
    route: "/student/solo-games/balloons",
    titleHe: "פיצוץ בלונים",
    emoji: "🎈",
    blurbHe: "פוצצו בלונים לפני שהזמן נגמר!",
    hasDifficultyPicker: false,
    orientationHint: null,
  },
  maze: {
    id: "maze",
    route: "/student/solo-games/maze",
    titleHe: "מבוך ליאו",
    emoji: "🌀",
    blurbHe: "מצאו את היציאה במבוך לפני שהזמן נגמר!",
    hasDifficultyPicker: true,
    orientationHint: "portrait-recommend",
  },
  "picture-puzzle": {
    id: "picture-puzzle",
    route: "/student/solo-games/picture-puzzle",
    titleHe: "פאזל תמונה",
    emoji: "🖼️",
    blurbHe: "השלימו את חלקי התמונה של ליאו!",
    hasDifficultyPicker: true,
    orientationHint: "landscape-recommend",
  },
  "target-tap": {
    id: "target-tap",
    route: "/student/solo-games/target-tap",
    titleHe: "קליעה למטרה",
    emoji: "🎯",
    blurbHe: "לחצו על המטרות לפני שהן נעלמות!",
    hasDifficultyPicker: true,
    orientationHint: null,
  },
  "sort-shapes": {
    id: "sort-shapes",
    route: "/student/solo-games/sort-shapes",
    titleHe: "מיון צורות",
    emoji: "🔺",
    blurbHe: "מיינו צורות וצבעים לתיבות הנכונות!",
    hasDifficultyPicker: true,
    orientationHint: null,
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
