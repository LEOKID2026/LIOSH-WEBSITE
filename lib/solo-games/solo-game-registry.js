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
  "smart-blocks",
  "fruit-slice",
  "leo-miners",
]);

export const SOLO_DIFFICULTY_OPTIONS = Object.freeze([
  { id: "easy", labelHe: "קל" },
  { id: "medium", labelHe: "בינוני" },
  { id: "hard", labelHe: "קשה" },
]);

/** @typedef {"landscape-recommend" | "portrait-recommend" | null} SoloOrientationHint */

/** @typedef {{ howToPlay: string, scoring: string, rewards: string, tip: string }} SoloGameHelpConfig */

/** @type {Record<string, { id: string, route: string, titleHe: string, emoji: string, blurbHe: string, hasDifficultyPicker: boolean, orientationHint: SoloOrientationHint, help: SoloGameHelpConfig }>} */
export const SOLO_GAME_REGISTRY = {
  catcher: {
    id: "catcher",
    route: "/student/solo-games/catcher",
    titleHe: "תופס עם ליאו",
    emoji: "🎯",
    blurbHe: "תפסו מטבעות והתרחקו מפצצות!",
    hasDifficultyPicker: false,
    orientationHint: "landscape-recommend",
    help: {
      howToPlay: "הזיזו את ליאו ימינה ושמאלה ותפסו מטבעות ויהלומים שנופלים מהשמיים.",
      scoring: "כל מטבע או יהלום שנתפס מוסיף נקודות. פגיעה בפצצה מסיימת את המשחק.",
      rewards: "ככל שצברתם יותר ניקוד - תקבלו יותר מטבעות ויהלומים לעולם הילד.",
      tip: "עקבו בעיניים אחרי מה שנופל ותזוזו מראש לפני שהפריט מגיע לתחתית.",
    },
  },
  flyer: {
    id: "flyer",
    route: "/student/solo-games/flyer",
    titleHe: "ליאו במטוס",
    emoji: "🪂",
    blurbHe: "החזיקו לטוס, אספו מטבעות והימנעו ממכשולים!",
    hasDifficultyPicker: false,
    orientationHint: "landscape-recommend",
    help: {
      howToPlay: "החזיקו את הכפתור או את המסך כדי לעוף, ושחררו כדי לרדת. אספו מטבעות והימנעו ממכשולים.",
      scoring: "מטבעות ויהלומים מוסיפים נקודות. פגיעה במכשול מסיימת את המשחק.",
      rewards: "ככל שטסתם יותר רחוק וצברתם ניקוד - תקבלו יותר מטבעות ויהלומים.",
      tip: "אל תעופו גבוה מדי - לפעמים עדיף לעבור מתחת למכשול.",
    },
  },
  puzzle: {
    id: "puzzle",
    route: "/student/solo-games/puzzle",
    titleHe: "חידת ליאו",
    emoji: "🧩",
    blurbHe: "שלבו אריחים וצברו נקודות לפני שהזמן נגמר!",
    hasDifficultyPicker: true,
    orientationHint: "portrait-recommend",
    help: {
      howToPlay: "הזיזו אריחים על הלוח כדי לשלב מספרים זהים. ככל שהמספרים גדולים יותר - הניקוד גבוה יותר.",
      scoring: "כל שילוב מוסיף נקודות. המטרה היא להגיע ליעד הניקוד לפני שהזמן נגמר.",
      rewards: "ניצחון לפי רמת הקושי מעניק מטבעות, ובונוס ניקוד מוסיף עוד.",
      tip: "נסו לשמור פינה פנויה כדי שיהיה לכם מקום להזיז אריחים.",
    },
  },
  memory: {
    id: "memory",
    route: "/student/solo-games/memory",
    titleHe: "זיכרון ליאו",
    emoji: "🧠",
    blurbHe: "הפכו קלפים ומצאו זוגות לפני שהשעון נגמר!",
    hasDifficultyPicker: true,
    orientationHint: null,
    help: {
      howToPlay: "לחצו על קלף כדי להפוך אותו, ומצאו את הזוג המתאים. כל זוג שנמצא נשאר פתוח.",
      scoring: "מתחילים עם ניקוד גבוה - ככל שמתמהמים יותר, הניקוד יורד. מציאת כל הזוגות לפני שהזמן נגמר = ניצחון.",
      rewards: "ניצחון לפי רמת הקושי מעניק מטבעות ויהלומים. ככל שהניקוד גבוה יותר - כך גם הפרס.",
      tip: "נסו לזכור איפה ראיתם כל תמונה - גם אם לא מצאתם לה זוג מיד.",
    },
  },
  "leo-jump": {
    id: "leo-jump",
    route: "/student/solo-games/leo-jump",
    titleHe: "ליאו קופץ",
    emoji: "🦘",
    blurbHe: "קפצו מעל מכשולים ואספו מטבעות!",
    hasDifficultyPicker: false,
    orientationHint: "landscape-recommend",
    help: {
      howToPlay: "לחצו כדי לקפוץ. עברו מעל מכשולים ואספו מטבעות, יהלומים ומגנטים בדרך.",
      scoring: "מטבעות ויהלומים מוסיפים נקודות. קפיצות רצופות מעל מכשולים נותנות בונוס קומבו. פגיעה במכשול מסיימת את המשחק.",
      rewards: "ככל שרצתם יותר רחוק וצברתם ניקוד - תקבלו יותר מטבעות ויהלומים.",
      tip: "אל תקפצו בכל פעם - לפעמים עדיף לחכות רגע ולקפוץ בזמן הנכון.",
    },
  },
  balloons: {
    id: "balloons",
    route: "/student/solo-games/balloons",
    titleHe: "פיצוץ בלונים",
    emoji: "🎈",
    blurbHe: "פוצצו בלונים לפני שהזמן נגמר!",
    hasDifficultyPicker: false,
    orientationHint: null,
    help: {
      howToPlay: "לחצו על בלונים כדי לפוצץ אותם. יש לכם שלוש חיים ודקה אחת. היזהרו מפצצות!",
      scoring: "בלונים רגילים, זהב ויהלומים מוסיפים נקודות. בלוני שעון מוסיפים זמן, ולב מחזיר חיים. פצצה מורידה חיים.",
      rewards: "הגעה ליעד הפיצוצים או ניקוד גבוה בסיום מעניקה מטבעות ויהלומים.",
      tip: "שימו לב לבלונים מיוחדים - הם יכולים לעזור לכם לפני שהזמן נגמר.",
    },
  },
  maze: {
    id: "maze",
    route: "/student/solo-games/maze",
    titleHe: "מבוך ליאו",
    emoji: "🌀",
    blurbHe: "מצאו את היציאה במבוך לפני שהזמן נגמר!",
    hasDifficultyPicker: true,
    orientationHint: "portrait-recommend",
    help: {
      howToPlay: "הזיזו את ליאו במבוך, אספו מפתחות וכוכבים, ומצאו את היציאה לפני שהזמן נגמר.",
      scoring: "מפתחות, כוכבים ויהלומים מוסיפים נקודות. סיום מבוך נותן בונוס גדול. אם הזמן נגמר - המשחק נגמר.",
      rewards: "סיום מבוך מוצלח לפי רמת הקושי מעניק מטבעות, ובונוס ניקוד מוסיף עוד.",
      tip: "אספו קודם את המפתחות - לפעמים הם פותחים דרך קצרה יותר.",
    },
  },
  "picture-puzzle": {
    id: "picture-puzzle",
    route: "/student/solo-games/picture-puzzle",
    titleHe: "פאזל תמונה",
    emoji: "🖼️",
    blurbHe: "השלימו את חלקי התמונה של ליאו!",
    hasDifficultyPicker: true,
    orientationHint: "landscape-recommend",
    help: {
      howToPlay: "גררו את חלקי התמונה למקום הנכון על הלוח. השלימו את כל החלקים לפני שהזמן נגמר.",
      scoring: "ככל שסיימתם מהר יותר ובפחות מהלכים - הניקוד גבוה יותר. אם הזמן נגמר לפני סיום - אין ניצחון.",
      rewards: "השלמת הפאזל לפי רמת הקושי מעניקה מטבעות, ובונוס ניקוד מוסיף עוד.",
      tip: "התחילו מהפינות והקצוות - כך קל יותר לראות איפה כל חלק שייך.",
    },
  },
  "target-tap": {
    id: "target-tap",
    route: "/student/solo-games/target-tap",
    titleHe: "קליעה למטרה",
    emoji: "🎯",
    blurbHe: "לחצו על המטרות לפני שהן נעלמות!",
    hasDifficultyPicker: true,
    orientationHint: null,
    help: {
      howToPlay: "לחצו על המטרות שמופיעות על המסך לפני שהן נעלמות. יש לכם שלושה חיים.",
      scoring: "מטרות רגילות, כוכבים ויהלומים שווים נקודות שונות. פספוס מוריד חיים. פגיעות רצופות נותנות בונוס קומבו.",
      rewards: "הגעה ליעד הפגיעות או ניקוד גבוה בסיום מעניקה מטבעות ויהלומים.",
      tip: "אל תמהרו על הכל - לפעמים מטרה עם יהלום שווה יותר.",
    },
  },
  "sort-shapes": {
    id: "sort-shapes",
    route: "/student/solo-games/sort-shapes",
    titleHe: "מיון צורות",
    emoji: "🔺",
    blurbHe: "מיינו צורות וצבעים לתיבות הנכונות!",
    hasDifficultyPicker: true,
    orientationHint: null,
    help: {
      howToPlay: "גררו כל צורה לתיבה המתאימה לפי הצורה או הצבע. סיימו את כל המיון לפני שהזמן נגמר.",
      scoring: "כל מיון נכון מוסיף נקודות. טעות מורידה מהניקוד. אם הזמן נגמר לפני סיום - המשחק נגמר.",
      rewards: "סיום מוצלח לפי רמת הקושי מעניק מטבעות, ובונוס ניקוד מוסיף עוד.",
      tip: "קודם בחרו לאיזו תיבה שייכת כל צורה - ואז גררו בביטחון.",
    },
  },
  "smart-blocks": {
    id: "smart-blocks",
    route: "/student/solo-games/smart-blocks",
    titleHe: "בלוקים חכמים",
    emoji: "🧱",
    blurbHe: "הניחו צורות, נקו שורות ועמודות והגיעו ליעד הניקוד!",
    hasDifficultyPicker: true,
    orientationHint: "landscape-recommend",
    help: {
      howToPlay: "גררו צורות ללוח, סובבו אותן במידת הצורך, והניחו אותן כדי למלא שורות ועמודות.",
      scoring: "ניקוי שורה או עמודה מוסיף נקודות. המטרה היא להגיע ליעד הניקוד לפני שהלוח מתמלא.",
      rewards: "ניצחון לפי רמת הקושי מעניק מטבעות, ובונוס ניקוד מוסיף עוד.",
      tip: "נסו לנקות כמה שורות בבת אחת - זה נותן הרבה נקודות.",
    },
  },
  "fruit-slice": {
    id: "fruit-slice",
    route: "/student/solo-games/fruit-slice",
    titleHe: "חיתוך פירות",
    emoji: "🍎",
    blurbHe: "חתכו פירות, הימנעו מפצצות והגיעו ליעד הניקוד!",
    hasDifficultyPicker: true,
    orientationHint: null,
    help: {
      howToPlay: "גררו אצבע על המסך כדי לחתוך פירות שעפים. הימנעו מפצצות - יש לכם שלוש טעויות.",
      scoring: "כל פרי שנחתך מוסיף נקודות. חיתוך כמה פירות בבת אחת נותן בונוס קומבו. פגיעה בפצצה או פספוס פרי מורידים טעות.",
      rewards: "הגעה ליעד הניקוד לפי רמת הקושי מעניקה מטבעות ויהלומים.",
      tip: "חתכו רק פירות - אם רואים פצצה, עדיף לדלג עליה.",
    },
  },
  "leo-miners": {
    id: "leo-miners",
    route: "/student/solo-games/leo-miners",
    titleHe: "ליאו הכורה",
    emoji: "⛏️",
    blurbHe: "שלבו כלבי כורים, שברו סלעים וצברו נקודות למימוש!",
    hasDifficultyPicker: false,
    orientationHint: "portrait-recommend",
    help: {
      howToPlay:
        "הוסיפו כלבי כורה ללוח, גררו כלבים מאותה רמה כדי לשלב, ושברו סלעים כדי לקבל מטבעות ונקודות.",
      scoring: "כל סלע שנשבר מעניק מטבעות. נקודות מצטברות לפי שלב הסלע - עם מגבלה יומית.",
      rewards: "נקודות ניתנות למימוש למטבעות ליאו ויהלומים (כשהשרת מוכן).",
      tip: "שדרגו DPS כדי לשבור סלעים מהר יותר, ו-GOLD כדי לקבל יותר מטבעות מכל סלע.",
    },
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
  return d?.labelHe || difficulty || "-";
}
