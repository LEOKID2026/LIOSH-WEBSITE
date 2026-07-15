import { SOLO_GAME_LIST } from "../solo-games/solo-game-registry.js";
import { EDUCATIONAL_GAME_LIST } from "../educational-games/educational-game-registry.js";

export const OFFLINE_HUB_ROUTE = "/student/offline";

export const OFFLINE_SOLO_HUB_ROUTE = "/student/offline/solo";

export const OFFLINE_EDUCATIONAL_HUB_ROUTE = "/student/offline/educational";

export const SAME_DEVICE_OFFLINE_GAMES = Object.freeze([
  {
    slug: "tic-tac-toe",
    title: "איקס עיגול",
    emoji: "❌⭕️",
    players: "2 שחקנים",
    blurb: "לוחות מ 3×3 ועד 7×7 עם מעקב ציון.",
  },
  {
    slug: "rock-paper-scissors",
    title: "אבן · נייר · מספריים",
    titleOneLine: true,
    emoji: "🪨📄✂️",
    players: "2 שחקנים או נגד רובוט",
    blurb: "משחקים מהירים, סיבובים הטוב מול כולם.",
  },
  {
    slug: "tap-battle",
    title: "קרב הקשות",
    emoji: "⚡️",
    players: "2 שחקנים",
    blurb: "כל צד מקיש מהר ככל האפשר - מי ינצח?",
  },
  {
    slug: "memory-match",
    title: "התאמת זיכרון",
    emoji: "🧠",
    players: "1–2 שחקנים",
    blurb: "הופכים קלפים, מוצאים זוגות ומנסים לנצח.",
  },
]);

/** @param {string} gameKey */
export function offlineSoloRoute(gameKey) {
  return `${OFFLINE_SOLO_HUB_ROUTE}/${gameKey}`;
}

/** @param {string} gameKey */
export function offlineEducationalRoute(gameKey) {
  return `${OFFLINE_EDUCATIONAL_HUB_ROUTE}/${gameKey}`;
}

export const OFFLINE_SOLO_GAMES = SOLO_GAME_LIST.map((game) => ({
  id: game.id,
  titleHe: game.titleHe,
  emoji: game.emoji,
  blurbHe: game.blurbHe,
  route: offlineSoloRoute(game.id),
  hasDifficultyPicker: game.hasDifficultyPicker,
}));

export const OFFLINE_EDUCATIONAL_GAMES = EDUCATIONAL_GAME_LIST.map((game) => ({
  id: game.id,
  titleHe: game.titleHe,
  emoji: game.emoji,
  blurbHe: game.blurbHe,
  route: offlineEducationalRoute(game.id),
  hasDifficultyPicker: game.hasDifficultyPicker,
}));

/** @param {string} gameKey */
export function isValidOfflineSoloGameKey(gameKey) {
  return OFFLINE_SOLO_GAMES.some((g) => g.id === gameKey);
}

/** @param {string} gameKey */
export function isValidOfflineEducationalGameKey(gameKey) {
  return OFFLINE_EDUCATIONAL_GAMES.some((g) => g.id === gameKey);
}
