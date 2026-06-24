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
    help: {
      howToPlay:
        "גררו או לחצו על פריט מהמסוע, ואז בחרו את הפח הנכון. מיינו מספיק פריטים לפני שמגיעים למקסימום הטעויות.",
      scoring:
        "מיון נכון +10, מיון מהיר +5, רצף 5 נכונים +20, רצף 10 +50. טעות או פריט שפוספס −5 (הניקוד לא יורד מתחת ל־0).",
      rewards: "ניצחון לפי רמת הקושי מעניק מטבעות. דיוק גבוה ורצף טוב מוסיפים בונוס.",
      tip: "שימו לב לסוג הפריט — נייר, פלסטיק, זכוכית, מתכת או פח רגיל.",
    },
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
