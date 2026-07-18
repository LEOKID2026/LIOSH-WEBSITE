/** @typedef {'easy'|'medium'|'hard'} EducationalDifficultyId */

export const EDUCATIONAL_DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);

export const EDUCATIONAL_GAME_KEYS = Object.freeze([
  "recycling-factory",
  "leo-supermarket",
  "leo-lab",
  "leo-gifts",
  "leo-bakery",
  "leo-number-path",
  "leo-pizzeria",
  "leo-word-train",
  "leo-word-detective",
]);

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
        "מיון נכון +10, מיון מהיר +5, רצף 5 נכונים +20, רצף 10 +50. טעות או פריט שפוספס −5 (הניקוד לא יורד מתחת ל-0).",
      rewards: "מטבעות לפי כמה פריטים מיינתם נכון, דיוק, רצף והשלמת יעד - גם אם לא סיימתם את כל המשחק.",
      tip: "שימו לב לסוג הפריט - נייר, פלסטיק, זכוכית, מתכת או פח רגיל.",
    },
  },
  "leo-supermarket": {
    id: "leo-supermarket",
    gameKey: "leo-supermarket",
    titleHe: "המכולת של ליאו",
    blurbHe: "מוצרים, כסף והחזרת עודף",
    emoji: "🏪",
    route: "/student/educational-games/leo-supermarket",
    hubRoute: "/student/educational-games",
    hasDifficultyPicker: true,
    help: {
      howToPlay:
        "בחרו את המוצרים שהלקוח ביקש. אחר כך בדקו את סכום הקנייה, חשבו את העודף ובחרו את המטבעות המתאימים.",
      scoring:
        "מוצר נכון מזכה ב־10 נקודות. עודף נכון מזכה ב־25 נקודות. טעות או זמן שנגמר מפחיתים 5 נקודות.",
      rewards: "המטבעות נקבעים לפי מספר הלקוחות שהשלמתם, הדיוק, הרצף ורמת הקושי.",
      tip: "בדקו את סכום הקנייה ואת הסכום ששולם לפני שבוחרים מטבעות.",
    },
  },
  "leo-lab": {
    id: "leo-lab",
    gameKey: "leo-lab",
    titleHe: "מעבדת הניסויים של ליאו",
    blurbHe: "משחק ניסויים, חומרים וסיבה ותוצאה",
    emoji: "🔬",
    route: "/student/educational-games/leo-lab",
    hubRoute: "/student/educational-games",
    hasDifficultyPicker: true,
    help: {
      howToPlay:
        "קראו את משימת הניסוי, בחרו חפצים מהמדף (גרירה או לחיצה), שימו על שולחן הניסוי ולחצו \"בדוק ניסוי\".",
      scoring:
        "ניסוי שהצליח +30, הצלחה בניסיון ראשון +10, רצף 3 נכונים +15, רצף 5 +30. אין הורדת ניקוד על טעות.",
      rewards: "מטבעות לפי כמה ניסויים הצלחתם, רמת קושי, דיוק, רצף והשלמת 20 ניסויים - רק אם הצלחתם לפחות ניסוי אחד.",
      tip: "חשבו מה צריך כדי לבצע את המשימה - אל תסתמכו על רמזים בכרטיסי החפצים.",
    },
  },
  "leo-gifts": {
    id: "leo-gifts",
    gameKey: "leo-gifts",
    titleHe: "חנות הממתקים של ליאו",
    blurbHe: "חלוקה שווה, שקיות ומה שנשאר",
    emoji: "🍬",
    route: "/student/educational-games/leo-gifts",
    hubRoute: "/student/educational-games",
    hasDifficultyPicker: true,
    help: {
      howToPlay:
        "בכל משימה בחרו כמה יקבל כל ילד, או כמה שקיות אפשר להכין. כשצריך, בחרו גם כמה פריטים נשארו.",
      scoring:
        "תשובה נכונה מזכה ב־30 נקודות. תשובה מהירה ורצף של תשובות נכונות מוסיפים נקודות.",
      rewards: "המטבעות נקבעים לפי מספר המשימות שפתרתם, הדיוק, הרצף ורמת הקושי.",
      tip: "בדקו אם השאלה מבקשת כמה יקבל כל ילד או כמה שקיות אפשר להכין.",
    },
  },
  "leo-bakery": {
    id: "leo-bakery",
    gameKey: "leo-bakery",
    titleHe: "המאפייה של ליאו",
    blurbHe: "כפל, מגשים וכמויות שוות",
    emoji: "🥐",
    route: "/student/educational-games/leo-bakery",
    hubRoute: "/student/educational-games",
    hasDifficultyPicker: true,
    help: {
      howToPlay:
        "בנו מגשים, מצאו כמה מאפים יש בסך הכול, או השלימו את המספר החסר.",
      scoring:
        "תשובה נכונה מזכה ב־30 נקודות. תשובה מהירה ורצף של תשובות נכונות מוסיפים נקודות.",
      rewards: "המטבעות נקבעים לפי מספר ההזמנות שהשלמתם, הדיוק, הרצף ורמת הקושי.",
      tip: "חשבו כמה מגשים יש וכמה מאפים יש בכל מגש.",
    },
  },
  "leo-number-path": {
    id: "leo-number-path",
    gameKey: "leo-number-path",
    titleHe: "מסלול המספרים של ליאו",
    blurbHe: "זוגי ואי־זוגי, כפולות, קפיצות וסדרות",
    emoji: "🔢",
    route: "/student/educational-games/leo-number-path",
    hubRoute: "/student/educational-games",
    hasDifficultyPicker: true,
    help: {
      howToPlay:
        "קראו את הכלל ובחרו את המספרים המתאימים. במשימות של קפיצות וסדרות, סדר הבחירה חשוב.",
      scoring:
        "תשובה נכונה בניסיון הראשון מזכה ב־30 נקודות, בניסיון השני ב־20 ובניסיון השלישי ב־10.",
      rewards: "המטבעות נקבעים לפי מספר המשימות שפתרתם, הדיוק, הרצף והשלמת המשחק.",
      tip: "קראו מהו המספר הראשון ומה צריך לעשות בכל צעד.",
    },
  },
  "leo-pizzeria": {
    id: "leo-pizzeria",
    gameKey: "leo-pizzeria",
    titleHe: "הפיצרייה של ליאו",
    blurbHe: "בניית שברים, שברים שווים והשוואה",
    emoji: "🍕",
    route: "/student/educational-games/leo-pizzeria",
    hubRoute: "/student/educational-games",
    hasDifficultyPicker: true,
    help: {
      howToPlay:
        "בכל משימה סמנו פרוסות, זהו שבר, השלימו פיצה, השוו בין שברים או מצאו שברים שווים.",
      scoring:
        "תשובה נכונה מזכה ב־30 נקודות. רצף של תשובות נכונות מוסיף נקודות.",
      rewards: "המטבעות נקבעים לפי מספר המשימות שפתרתם, הדיוק, הרצף ורמת הקושי.",
      tip: "בדקו לכמה פרוסות הפיצה מחולקת וכמה מהן מסומנות.",
    },
  },
  "leo-word-train": {
    id: "leo-word-train",
    gameKey: "leo-word-train",
    titleHe: "רכבת המילים של ליאו",
    blurbHe: "אותיות, מילים ומשפטים באנגלית - על קרונות הרכבת",
    emoji: "🚂",
    route: "/student/educational-games/leo-word-train",
    hubRoute: "/student/educational-games",
    hasDifficultyPicker: true,
    help: {
      howToPlay:
        "בחרו קלף, העמיסו על קרון ריק, ולחצו \"הוציאו רכבת\". כשהתשובה נכונה - הרכבת יוצאת!",
      scoring:
        "תשובה נכונה +30, בונוס זמן, רצף 3 +15, רצף 5 +30. timeout −5. טעות לא שוברת - רק נספרת.",
      rewards: "מטבעות לפי כמה משימות הצלחתם מתוך 20, דיוק, רצף ורמת קושי.",
      tip: "ברמה קלה - רק אותיות. בינוני - מילים קצרות. קשה - משפטים קצרים.",
    },
  },
  "leo-word-detective": {
    id: "leo-word-detective",
    gameKey: "leo-word-detective",
    titleHe: "בלש המילים של ליאו",
    blurbHe: "חקירת מילים, משפטים והבנת הנקרא בעברית",
    emoji: "🕵️",
    route: "/student/educational-games/leo-word-detective",
    hubRoute: "/student/educational-games",
    hasDifficultyPicker: true,
    help: {
      howToPlay:
        "גררו כרטיסי ראיות ללוח החקירה ולחצו \"פתור תיק\". כשהתשובה נכונה - התיק נחתם!",
      scoring:
        "תשובה נכונה +30, בונוס זמן, רצף 3 +15, רצף 5 +30. timeout −5. טעות לא שוברת - רק נספרת.",
      rewards: "מטבעות לפי כמה תיקים פתרתם מתוך 20, דיוק, רצף ורמת קושי.",
      tip: "קראו את משימת התיק - ברמה קשה יש קטע קצר על הלוח.",
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

/** Recommended grade bands — hint only, never blocks selection. */
export const EDUCATIONAL_DIFFICULTY_GRADE_HINT =
  "קל: א׳–ב׳ · בינוני: ג׳–ד׳ · קשה: ה׳–ו׳";

/** @param {EducationalDifficultyId} difficulty */
export function difficultyLabelHe(difficulty) {
  if (difficulty === "easy") return "קל";
  if (difficulty === "hard") return "קשה";
  return "בינוני";
}

export const EDUCATIONAL_GAME_LIST = EDUCATIONAL_GAME_KEYS.map((k) => EDUCATIONAL_GAME_REGISTRY[k]);
