/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/**
 * @typedef {Object} TrainingTask
 * @property {string} id
 * @property {string} prompt
 * @property {string[]} options
 * @property {number} correctIndex
 * @property {string} [emoji]
 */

/**
 * @typedef {Object} TrainingArea
 * @property {string} id
 * @property {string} title
 * @property {string} subtitle
 * @property {string} emoji
 * @property {Record<DifficultyId, TrainingTask[]>} tasks
 */

/** @type {TrainingArea[]} */
export const TRAINING_AREAS = [
  {
    id: "math",
    title: "חיזוק בכפל",
    subtitle: "מתמטיקה · חשבון",
    emoji: "✖️",
    tasks: {
      easy: [
        { id: "me1", prompt: "כמה זה 2 × 3?", options: ["5", "6", "8"], correctIndex: 1 },
        { id: "me2", prompt: "כמה זה 4 × 2?", options: ["6", "8", "10"], correctIndex: 1 },
        { id: "me3", prompt: "איזה מספר זוגי?", options: ["7", "8", "9"], correctIndex: 1 },
        { id: "me4", prompt: "המשיכu: 2, 4, 6, ?", options: ["7", "8", "9"], correctIndex: 1 },
        { id: "me5", prompt: "כמה זה 5 × 1?", options: ["5", "6", "4"], correctIndex: 0 },
        { id: "me6", prompt: "כמה זה 3 × 3?", options: ["6", "9", "12"], correctIndex: 1 },
        { id: "me7", prompt: "איזה מספר אי-זוגי?", options: ["4", "6", "5"], correctIndex: 2 },
        { id: "me8", prompt: "כמה זה 10 ÷ 2?", options: ["4", "5", "6"], correctIndex: 1 },
      ],
      medium: [
        { id: "mm1", prompt: "כמה זה 6 × 4?", options: ["20", "24", "28"], correctIndex: 1 },
        { id: "mm2", prompt: "כמה זה 36 ÷ 6?", options: ["5", "6", "7"], correctIndex: 1 },
        { id: "mm3", prompt: "המשיכu: 5, 10, 15, ?", options: ["18", "20", "22"], correctIndex: 1 },
        { id: "mm4", prompt: "כמה זה 7 × 3?", options: ["21", "24", "18"], correctIndex: 0 },
        { id: "mm5", prompt: "איזה מספר זוגי?", options: ["13", "14", "15"], correctIndex: 1 },
        { id: "mm6", prompt: "כמה זה 48 ÷ 8?", options: ["5", "6", "7"], correctIndex: 1 },
        { id: "mm7", prompt: "כמה זה 9 × 2?", options: ["16", "18", "20"], correctIndex: 1 },
        { id: "mm8", prompt: "המשיכu: 3, 6, 9, ?", options: ["10", "12", "14"], correctIndex: 1 },
      ],
      hard: [
        { id: "mh1", prompt: "כמה זה 12 × 5?", options: ["50", "60", "70"], correctIndex: 1 },
        { id: "mh2", prompt: "כמה זה 72 ÷ 9?", options: ["7", "8", "9"], correctIndex: 1 },
        { id: "mh3", prompt: "המשיכu: 4, 8, 12, ?", options: ["14", "16", "18"], correctIndex: 1 },
        { id: "mh4", prompt: "כמה זה 11 × 3?", options: ["33", "30", "36"], correctIndex: 0 },
        { id: "mh5", prompt: "איזה מספר אי-זוגי?", options: ["22", "24", "25"], correctIndex: 2 },
        { id: "mh6", prompt: "כמה זה 56 ÷ 7?", options: ["7", "8", "9"], correctIndex: 1 },
        { id: "mh7", prompt: "כמה זה 8 × 8?", options: ["56", "64", "72"], correctIndex: 1 },
        { id: "mh8", prompt: "המשיכu: 10, 20, 30, ?", options: ["35", "40", "45"], correctIndex: 1 },
      ],
    },
  },
  {
    id: "hebrew",
    title: "חיזוק בכתיב",
    subtitle: "עברית · אוצר מילים",
    emoji: "✏️",
    tasks: {
      easy: [
        { id: "he1", prompt: "איזו מילה כתובה נכון?", options: ["חתול", "חתעל", "חטול"], correctIndex: 0 },
        { id: "he2", prompt: "הילד שתה ___", options: ["מים", "שולחן", "רץ"], correctIndex: 0 },
        { id: "he3", prompt: "מה מתאים למשהו שאוכלים?", options: ["תפוח", "כיסא", "ענן"], correctIndex: 0 },
        { id: "he4", prompt: "איזו מילה כתובה נכון?", options: ["ספר", "ספאר", "ספרר"], correctIndex: 0 },
        { id: "he5", prompt: "השמש זורחת ב___", options: ["יום", "שתה", "רכב"], correctIndex: 0 },
        { id: "he6", prompt: "איזו מילה שייכת למשפחה של «כתב»?", options: ["כתיבה", "שולחן", "ריצה"], correctIndex: 0 },
        { id: "he7", prompt: "איזו מילה כתובה נכון?", options: ["בית", "ביית", "ביט"], correctIndex: 0 },
        { id: "he8", prompt: "הגשם ירד ולכן לקחתי ___", options: ["מטרייה", "גלידה", "כדור"], correctIndex: 0 },
      ],
      medium: [
        { id: "hm1", prompt: "סדרu נכון: הילדה / ספר / קוראת", options: ["הילדה קוראת ספר", "ספר הילדה קוראת", "קוראת ספר הילדה"], correctIndex: 0 },
        { id: "hm2", prompt: "איזו מילה שייכת למשפחה של «למד»?", options: ["לימוד", "ענן", "רכב"], correctIndex: 0 },
        { id: "hm3", prompt: "תיקון: איזו מילה נכונה?", options: ["ילדה", "ילדע", "ילדהה"], correctIndex: 0 },
        { id: "hm4", prompt: "היה קר ולכן לבשתי ___", options: ["מעיל", "בגד ים", "כובע קיץ"], correctIndex: 0 },
        { id: "hm5", prompt: "סדרu נכון: הכלב / בגן / משחק", options: ["הכלב משחק בגן", "בגן הכלב משחק", "משחק בגן הכלב"], correctIndex: 0 },
        { id: "hm6", prompt: "איזו מילה שייכת למשפחה של «רץ»?", options: ["ריצה", "שולחן", "כתיבה"], correctIndex: 0 },
        { id: "hm7", prompt: "רציתי לישון ולכן הלכתי ל___", options: ["מיטה", "חנות", "ים"], correctIndex: 0 },
        { id: "hm8", prompt: "איזו מילה לא מתאימה: «הילד אכל ___ בבוקר»?", options: ["ארוחת בוקר", "שולחן", "דגנים"], correctIndex: 1 },
      ],
      hard: [
        { id: "hh1", prompt: "כותרת לקטע: «מיה אהבה לקרוא ספרים בכל ערב»", options: ["מיה אוהבת לקרוא", "מיה בים", "מיה קונה נעליים"], correctIndex: 0 },
        { id: "hh2", prompt: "מה משמעות «עייפים»? «הם שכבu ונרדמו»", options: ["מותשים", "שמחים", "רעבים"], correctIndex: 0 },
        { id: "hh3", prompt: "איזו מילה לא מתאימה: «הפרח צמח ב___»?", options: ["גן", "אדמה", "מים"], correctIndex: 2 },
        { id: "hh4", prompt: "סדרu: אמא / אוכל / מבשלת", options: ["אמא מבשלת אוכל", "אוכל אמא מבשלת", "מבשלת אוכל אמא"], correctIndex: 0 },
        { id: "hh5", prompt: "כותרת: «יואב למד לרכb על אופניים»", options: ["יואב לומד לרכb", "יואב בחנות", "יואב ישן"], correctIndex: 0 },
        { id: "hh6", prompt: "מה אפשר להבין? «ליאo שכח מחברת»", options: ["צריך מחברת לכתיבה", "אוהb לשחות", "בחופש"], correctIndex: 0 },
        { id: "hh7", prompt: "משפט שמוכיח: «תומer לקח רצועה ויצא»", options: ["יוצא לטיול", "ישן", "אוכל"], correctIndex: 0 },
        { id: "hh8", prompt: "מה משמעות «אמיץ»?", options: ["לא מפחd ועוזר", "עיif", "כועs"], correctIndex: 0 },
      ],
    },
  },
  {
    id: "english",
    title: "חיזוק באנגלית",
    subtitle: "אוצר מילים · משפטים",
    emoji: "🔤",
    tasks: {
      easy: [
        { id: "ee1", prompt: "תמונה: 🐱 - בחרu מילה", options: ["cat", "dog", "sun"], correctIndex: 0, emoji: "🐱" },
        { id: "ee2", prompt: "אות ראשונה ב-dog", options: ["d", "g", "o"], correctIndex: 0 },
        { id: "ee3", prompt: "כלb → ?", options: ["dog", "milk", "book"], correctIndex: 0 },
        { id: "ee4", prompt: "תמונה: ☀️", options: ["sun", "red", "bus"], correctIndex: 0, emoji: "☀️" },
        { id: "ee5", prompt: "אות ראשונה ב-cat", options: ["c", "t", "a"], correctIndex: 0 },
        { id: "ee6", prompt: "חלב → ?", options: ["milk", "book", "chair"], correctIndex: 0 },
        { id: "ee7", prompt: "תמונה: 🔴", options: ["red", "green", "blue"], correctIndex: 0, emoji: "🔴" },
        { id: "ee8", prompt: "בנה: c-a-t", options: ["cat", "car", "cap"], correctIndex: 0 },
      ],
      medium: [
        { id: "em1", prompt: "בנה: m-i-l-k", options: ["milk", "mill", "silk"], correctIndex: 0 },
        { id: "em2", prompt: "ספר → ?", options: ["book", "green", "house"], correctIndex: 0 },
        { id: "em3", prompt: "השמע: book (דמה)", options: ["book", "milk", "chair"], correctIndex: 0 },
        { id: "em4", prompt: "בנה: g-r-e-e-n", options: ["green", "great", "grin"], correctIndex: 0 },
        { id: "em5", prompt: "כיסא → ?", options: ["chair", "table", "apple"], correctIndex: 0 },
        { id: "em6", prompt: "תמונה: 🍎", options: ["apple", "water", "school"], correctIndex: 0, emoji: "🍎" },
        { id: "em7", prompt: "השמע: chair", options: ["table", "chair", "book"], correctIndex: 1 },
        { id: "em8", prompt: "בנה: b-o-o-k", options: ["book", "boot", "look"], correctIndex: 0 },
      ],
      hard: [
        { id: "eh1", prompt: "סדרu: I / like / milk", options: ["I like milk", "like I milk", "milk like I"], correctIndex: 0 },
        { id: "eh2", prompt: "I see a ___", options: ["dog", "table", "run"], correctIndex: 0 },
        { id: "eh3", prompt: "תמונה 🐱 - משפט", options: ["I see a cat", "I like milk", "I run fast"], correctIndex: 0, emoji: "🐱" },
        { id: "eh4", prompt: "סדרu: I / see / a / cat", options: ["I see a cat", "see I a cat", "cat see I a"], correctIndex: 0 },
        { id: "eh5", prompt: "The apple is ___", options: ["red", "swim", "chair"], correctIndex: 0 },
        { id: "eh6", prompt: "תמונה 📚", options: ["I read a book", "I eat apple", "I see sun"], correctIndex: 0, emoji: "📚" },
        { id: "eh7", prompt: "I ___ a cat", options: ["see", "milk", "chair"], correctIndex: 0 },
        { id: "eh8", prompt: "סדרu: She / likes / red", options: ["She likes red", "likes She red", "red likes She"], correctIndex: 0 },
      ],
    },
  },
  {
    id: "geometry",
    title: "חיזוק בגאומטריה",
    subtitle: "צורות · שטח · סימטריה",
    emoji: "📐",
    tasks: {
      easy: [
        { id: "ge1", prompt: "בחרu צורה: עיגול", options: ["עיגול", "ריבוע", "משולש"], correctIndex: 0, emoji: "⭕" },
        { id: "ge2", prompt: "בחרu צורה: משולש", options: ["ריבוע", "משולש", "עיגול"], correctIndex: 1, emoji: "🔺" },
        { id: "ge3", prompt: "דגם: ריבוע, משולש, ריבוע, ?", options: ["משולש", "עיגול", "ריבוע"], correctIndex: 0 },
        { id: "ge4", prompt: "בחרu צורה: מלבן", options: ["מלבן", "עיגול", "משולש"], correctIndex: 0, emoji: "▭" },
        { id: "ge5", prompt: "מצאu צורה זהה לריבוע", options: ["ריבוע", "משולש", "עיגול"], correctIndex: 0 },
        { id: "ge6", prompt: "דגם: עיגול, עיגול, ריבוע, ?", options: ["עיגול", "ריבוע", "משולש"], correctIndex: 0 },
        { id: "ge7", prompt: "בחרu צורה: ריבוע", options: ["משולש", "ריבוע", "מלבן"], correctIndex: 1, emoji: "⬜" },
        { id: "ge8", prompt: "דגם: משולש, ריבוע, משולש, ?", options: ["ריבוע", "עיגול", "משולש"], correctIndex: 0 },
      ],
      medium: [
        { id: "gm1", prompt: "קו סימטריה בריבוע?", options: ["אנכי במרכז", "אין", "רק אלכסון"], correctIndex: 0 },
        { id: "gm2", prompt: "כמה ריבועים? (רשת 2×3 מלאה)", options: ["4", "6", "8"], correctIndex: 1 },
        { id: "gm3", prompt: "היקף ריבוע 2×2?", options: ["4", "6", "8"], correctIndex: 2 },
        { id: "gm4", prompt: "צורה עם הכי הרבה סימטריה?", options: ["עיגול", "משולש", "קו"], correctIndex: 0 },
        { id: "gm5", prompt: "כמה ריבועים? (3×3 חלקי)", options: ["5", "6", "9"], correctIndex: 0 },
        { id: "gm6", prompt: "היקף שורה של 4 ריבועים?", options: ["8", "10", "12"], correctIndex: 1 },
        { id: "gm7", prompt: "למלבן יש סימטריה…", options: ["אנכי ואופקי", "לא", "רק נקודה"], correctIndex: 0 },
        { id: "gm8", prompt: "כמה ריבועים? (4×2)", options: ["6", "8", "10"], correctIndex: 1 },
      ],
      hard: [
        { id: "gh1", prompt: "סיבוב 90° - ריבוע נשאר?", options: ["כן, נראה אותו דבר", "הופך לעיגול", "נעלם"], correctIndex: 0 },
        { id: "gh2", prompt: "פריסה של קובייה?", options: ["6 ריבועים בצורת צלב", "עיגול אחד", "משולש"], correctIndex: 0 },
        { id: "gh3", prompt: "שיקוף משולש - צורה", options: ["משולש מראה", "ריבוע", "קו"], correctIndex: 0 },
        { id: "gh4", prompt: "פריסה של גליל?", options: ["מלבן + 2 עיגולים", "6 ריבועים", "משולש"], correctIndex: 0 },
        { id: "gh5", prompt: "כמה ריבועים? (5×3=12 מלאים)", options: ["10", "12", "15"], correctIndex: 1 },
        { id: "gh6", prompt: "סיבוב חץ 180°", options: ["מצביע הפוך", "נעלם", "הופך לעיגול"], correctIndex: 0 },
        { id: "gh7", prompt: "פריסה של תיבה (מלבן)", options: ["6 מלבנים", "2 עיגולים", "משולש"], correctIndex: 0 },
        { id: "gh8", prompt: "שטח - כמה יחידות?", options: ["8", "9", "10"], correctIndex: 1 },
      ],
    },
  },
  {
    id: "reading",
    title: "חיזוק בהבנת הנקרא",
    subtitle: "קטע קצר · שאלות",
    emoji: "📖",
    tasks: {
      easy: [
        { id: "re1", prompt: "«נועה לקחה מטרייה כי ירד גשם» - למה?", options: ["כי ירד גשם", "כי היה חם", "כי ישנה"], correctIndex: 0 },
        { id: "re2", prompt: "«דני שתה מים כי צמא» - למה?", options: ["כי צמא", "כי ירד שלג", "כי רץ"], correctIndex: 0 },
        { id: "re3", prompt: "«אמא קנתה תפוחים» - מי?", options: ["אמא", "הכלb", "מורה"], correctIndex: 0 },
        { id: "re4", prompt: "«שיחקu בגן» - איפה?", options: ["בגן", "בים", "בכיתה"], correctIndex: 0 },
        { id: "re5", prompt: "«שרה לבשה מעיל» - למה?", options: ["כי קר", "כי חם", "כי גשם"], correctIndex: 0 },
        { id: "re6", prompt: "«סבא סיפר סיפור» - מי?", options: ["סבא", "כלb", "שכn"], correctIndex: 0 },
        { id: "re7", prompt: "«ציפורים על העץ» - איפה?", options: ["על העץ", "בים", "ברחוב"], correctIndex: 0 },
        { id: "re8", prompt: "«יואb הדליק אור» - למה?", options: ["כי חשך", "כי קיץ", "כי ים"], correctIndex: 0 },
      ],
      medium: [
        { id: "rm1", prompt: "«אמא הכינה, אחר כך יצאu לבית ספר» - מה קודם?", options: ["ארוחת בוקר", "חזרו הביתה", "גשם"], correctIndex: 0 },
        { id: "rm2", prompt: "«נעמי מצאה חתלתול» - מי?", options: ["נעמi", "אבא", "שכn"], correctIndex: 0 },
        { id: "rm3", prompt: "«נסעu לים, שחu» - איפה?", options: ["בים", "בבית", "ביער"], correctIndex: 0 },
        { id: "rm4", prompt: "כותרת: «דni אוהb לצייר»", options: ["דni אוהb לצייר", "דni בחנות", "דni ישn"], correctIndex: 0 },
        { id: "rm5", prompt: "«שתלu זרעים, השקu, צמחu» - מה אחרי השקייה?", options: ["צמחu", "שלג", "ים"], correctIndex: 0 },
        { id: "rm6", prompt: "«הספרנית עזרה» - מי?", options: ["ספרנית", "רופא", "נהג"], correctIndex: 0 },
        { id: "rm7", prompt: "כותרת: «גשם, משחקים בבית»", options: ["יום גשום", "טיול", "קנייה"], correctIndex: 0 },
        { id: "rm8", prompt: "«לפני שינה קראu סיפור» - מה לפני כיבוי אור?", options: ["קראu סיפור", "ארוחת בוקר", "גן"], correctIndex: 0 },
      ],
      hard: [
        { id: "rh1", prompt: "«יעל הכינה עוגה לאמא» - מה מבינים?", options: ["יעל אוהbת אמא", "כועסת", "לא bשל"], correctIndex: 0 },
        { id: "rh2", prompt: "«תומer לקח רצועה» - מוכיח?", options: ["יוצא לטיול", "ישn", "אוכl"], correctIndex: 0 },
        { id: "rh3", prompt: "«עייפים, שכbו, נרדמו» - «עייפים»?", options: ["מותשים", "שמחים", "רעbים"], correctIndex: 0 },
        { id: "rh4", prompt: "«ליאo שכח מחברת» - מה מבינים?", options: ["צריך מחברת", "אוהb שחייה", "חופש"], correctIndex: 0 },
        { id: "rh5", prompt: "כותרת: «ציפורים נודדות דרומה»", options: ["נדידת ציפורים", "שחייה", "ארוחה"], correctIndex: 0 },
        { id: "rh6", prompt: "«שמיים כהים, רעם» - גשם?", options: ["כן", "לא", "שלg"], correctIndex: 0 },
        { id: "rh7", prompt: "«אמיץ, עזר לחבר» - «אמיץ»?", options: ["לא מפחd", "עיif", "כועs"], correctIndex: 0 },
        { id: "rh8", prompt: "«מאיה חסכה בקופסה» - מה מבינים?", options: ["חסכה לקנייה", "זרקה כסף", "לא אוהbת סבתא"], correctIndex: 0 },
      ],
    },
  },
];

export const TRAINING_TASKS_PER_SESSION = 6;

/** @param {string} areaId @param {DifficultyId} difficulty */
export function pickTrainingTasks(areaId, difficulty) {
  const area = TRAINING_AREAS.find((a) => a.id === areaId) ?? TRAINING_AREAS[0];
  const pool = area.tasks[difficulty] ?? area.tasks.easy;
  return pool.slice(0, TRAINING_TASKS_PER_SESSION);
}

export function trainingFeedback(ok) {
  return ok ? "יפה! המשיכu כך" : "כמעט - ננסה שוב בצורה פשוטה יותר";
}

export function trainingSummaryMessage(correct, total) {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio >= 0.85) return "השתפרתם במשימות האלה - כדאי להמשיך לתרגל";
  if (ratio >= 0.5) return "תרגלתם היום נקודות חשובות - נמשיך להתאמן";
  return "נמשיך להתאמן יחד - כל ניסיון מחזק";
}
