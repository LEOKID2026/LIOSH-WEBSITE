/** @typedef {'easy'|'medium'|'hard'} EducationalDifficultyId */

export const EDUCATIONAL_DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);

export const EDUCATIONAL_GAME_KEYS = Object.freeze(["recycling-factory"]);

/** @type {Record<string, { id: string, gameKey: string, titleHe: string, blurbHe: string, emoji: string, route: string, hubRoute: string, hasDifficultyPicker: boolean }>} */
export const EDUCATIONAL_GAME_REGISTRY = Object.freeze({
  "recycling-factory": {
    id: "recycling-factory",
    gameKey: "recycling-factory",
    titleHe: "מפעל המיחזור של ליאו",
    blurbHe: "מיינו פסולת לפחים הנכונים ושמרו על הסביבה",
    emoji: "♻️",
    route: "/student/educational-games/recycling-factory",
    hubRoute: "/student/educational-games",
    hasDifficultyPicker: true,
  },
});

export const EDUCATIONAL_HUB = Object.freeze({
  route: "/student/educational-games",
  titleHe: "המשחקים החינוכיים של ליאו",
  blurbHe: "משחקי העשרה, חשיבה וידע כללי",
  emoji: "📚",
});

/** @param {string} gameKey */
export function isValidEducationalGameKey(gameKey) {
  return EDUCATIONAL_GAME_KEYS.includes(String(gameKey || "").trim().toLowerCase());
}

/** @param {string} difficulty */
export function isValidEducationalDifficulty(difficulty) {
  return EDUCATIONAL_DIFFICULTIES.includes(String(difficulty || "").trim().toLowerCase());
}

/** @param {string} gameKey */
export function findEducationalGame(gameKey) {
  return EDUCATIONAL_GAME_REGISTRY[String(gameKey || "").trim().toLowerCase()] || null;
}

/** @param {EducationalDifficultyId} difficulty */
export function difficultyLabelHe(difficulty) {
  if (difficulty === "easy") return "קל";
  if (difficulty === "hard") return "קשה";
  return "בינוני";
}

export const EDUCATIONAL_GAME_LIST = EDUCATIONAL_GAME_KEYS.map((k) => EDUCATIONAL_GAME_REGISTRY[k]);
