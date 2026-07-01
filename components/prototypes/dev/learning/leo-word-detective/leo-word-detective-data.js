/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/**
 * @typedef {Object} WordDetectiveTask
 * @property {string} id
 * @property {'first_letter'|'fill_blank'|'image_word'|'starts_with'|'fill_sentence'|'plural'|'feminine'|'word_family'|'context'|'passage_q'|'title_pick'|'meaning'} type
 * @property {string} caseLabel
 * @property {string} prompt
 * @property {string} [emoji]
 * @property {string[]} [options]
 * @property {number} [correctIndex]
 * @property {string} [passage]
 */

import { LANGUAGE_PROTOTYPE_TASKS, shuffleTasks } from "../shared/language-prototype-config.js";

/** @type {Record<DifficultyId, WordDetectiveTask[]>} */
export const WORD_DETECTIVE_TASKS = {
  easy: [
    {
      id: "e1",
      type: "first_letter",
      caseLabel: "תיק #1",
      prompt: "איזו אות מתחילה את המילה כלב?",
      options: ["כ", "ל", "ב", "ח"],
      correctIndex: 0,
    },
    {
      id: "e2",
      type: "fill_blank",
      caseLabel: "תיק #2",
      prompt: "השלימו: שו_חן",
      options: ["ל", "ר", "מ", "נ"],
      correctIndex: 0,
    },
    {
      id: "e3",
      type: "image_word",
      caseLabel: "תיק #3",
      prompt: "בחרו את המילה שמתאימה לתמונה",
      emoji: "🏠",
      options: ["בית", "כיסא", "ענן"],
      correctIndex: 0,
    },
    {
      id: "e4",
      type: "starts_with",
      caseLabel: "תיק #4",
      prompt: "איזו מילה מתחילה באות מ׳?",
      options: ["מים", "שולחן", "כלב", "ספר"],
      correctIndex: 0,
    },
    {
      id: "e5",
      type: "image_word",
      caseLabel: "תיק #5",
      prompt: "בחרו את המילה שמתאימה לתמונה",
      emoji: "🐱",
      options: ["חתול", "עץ", "רכב"],
      correctIndex: 0,
    },
    {
      id: "e6",
      type: "first_letter",
      caseLabel: "תיק #6",
      prompt: "איזו אות מתחילה את המילה בית?",
      options: ["ב", "י", "ת", "ש"],
      correctIndex: 0,
    },
    {
      id: "e7",
      type: "fill_blank",
      caseLabel: "תיק #7",
      prompt: "הילד שתה ___",
      options: ["מים", "שולחן", "רץ"],
      correctIndex: 0,
    },
    {
      id: "e8",
      type: "image_word",
      caseLabel: "תיק #8",
      prompt: "בחרו את המילה שמתאימה לתמונה",
      emoji: "🍎",
      options: ["תפוח", "כיסא", "גשם"],
      correctIndex: 0,
    },
    {
      id: "e9",
      type: "starts_with",
      caseLabel: "תיק #9",
      prompt: "איזו מילה מתחילה באות ס׳?",
      options: ["ספר", "כלב", "מים", "ענן"],
      correctIndex: 0,
    },
    {
      id: "e10",
      type: "fill_blank",
      caseLabel: "תיק #10",
      prompt: "הכלב רץ ב___",
      options: ["גן", "אכל", "כחול"],
      correctIndex: 0,
    },
  ],
  medium: [
    {
      id: "m1",
      type: "fill_sentence",
      caseLabel: "תיק #1",
      prompt: "השלימו: הילדה ___ ספר.",
      options: ["קוראת", "רצה", "כחול"],
      correctIndex: 0,
    },
    {
      id: "m2",
      type: "plural",
      caseLabel: "תיק #2",
      prompt: "מה הרבים של ילד?",
      options: ["ילדים", "ילדה", "ילדות"],
      correctIndex: 0,
    },
    {
      id: "m3",
      type: "feminine",
      caseLabel: "תיק #3",
      prompt: "מה הנקבה של גדול?",
      options: ["גדולה", "גדולים", "גדל"],
      correctIndex: 0,
    },
    {
      id: "m4",
      type: "word_family",
      caseLabel: "תיק #4",
      prompt: 'איזו מילה שייכת למשפחה של "כתב"?',
      options: ["כתיבה", "שולחן", "ריצה"],
      correctIndex: 0,
    },
    {
      id: "m5",
      type: "context",
      caseLabel: "תיק #5",
      prompt: "בחרו מילה שמתאימה למשפט: הגשם ירד ולכן לקחתי ___",
      options: ["מטרייה", "גלידה", "כדור"],
      correctIndex: 0,
    },
    {
      id: "m6",
      type: "fill_sentence",
      caseLabel: "תיק #6",
      prompt: "השלימו: אמא ___ אוכל.",
      options: ["מבשלת", "רצה", "כחול"],
      correctIndex: 0,
    },
    {
      id: "m7",
      type: "plural",
      caseLabel: "תיק #7",
      prompt: "מה הרבים של ספר?",
      options: ["ספרים", "ספרה", "ספרות"],
      correctIndex: 0,
    },
    {
      id: "m8",
      type: "word_family",
      caseLabel: "תיק #8",
      prompt: 'איזו מילה שייכת למשפחה של "למד"?',
      options: ["לימוד", "ענן", "רכב"],
      correctIndex: 0,
    },
    {
      id: "m9",
      type: "context",
      caseLabel: "תיק #9",
      prompt: "היה קר ולכן לבשתי ___",
      options: ["מעיל", "בגד ים", "כובע קיץ"],
      correctIndex: 0,
    },
    {
      id: "m10",
      type: "feminine",
      caseLabel: "תיק #10",
      prompt: "מה הנקבה של חכם?",
      options: ["חכמה", "חכמים", "חכמו"],
      correctIndex: 0,
    },
  ],
  hard: [
    {
      id: "h1",
      type: "passage_q",
      caseLabel: "תיק #1",
      prompt: "מה קרה קודם?",
      passage:
        "דני יצא מהבית עם תיק. הוא הלך לגן ושיחק עם חברים. אחר כך חזר הביתה לארוחת צהריים.",
      options: ["דני יצא מהבית", "דני חזר הביתה", "דני אכל ארוחת ערב"],
      correctIndex: 0,
    },
    {
      id: "h2",
      type: "passage_q",
      caseLabel: "תיק #2",
      prompt: "למה הילד חזר הביתה?",
      passage:
        "דני יצא מהבית עם תיק. הוא הלך לגן ושיחק עם חברים. אחר כך חזר הביתה לארוחת צהריים.",
      options: ["לארוחת צהריים", "לישון", "לקנות נעליים"],
      correctIndex: 0,
    },
    {
      id: "h3",
      type: "title_pick",
      caseLabel: "תיק #3",
      prompt: "איזו כותרת מתאימה לקטע?",
      passage:
        "מיה אהבה לקרוא ספרים. כל ערב היא ישבה בפינה עם ספר חדש. הספרים לימדו אותה דברים חדשים.",
      options: ["מיה אוהבת לקרוא", "מיה הולכת לים", "מיה קונה נעליים"],
      correctIndex: 0,
    },
    {
      id: "h4",
      type: "meaning",
      caseLabel: "תיק #4",
      prompt: "מה אפשר להבין מהקטע?",
      passage:
        "הגשם ירד חזק. הילדים נשארו בבית ושיחקו במשחקי קופסה. אחרי הגשם יצא קשת בענן.",
      options: ["הילדים נשארו בבית בגלל הגשם", "הילדים שחו בים", "הילדים טסו לחו״ל"],
      correctIndex: 0,
    },
    {
      id: "h5",
      type: "passage_q",
      caseLabel: "תיק #5",
      prompt: "מה עשו הילדים כשירד גשם?",
      passage:
        "הגשם ירד חזק. הילדים נשארו בבית ושיחקו במשחקי קופסה. אחרי הגשם יצא קשת בענן.",
      options: ["שיחקו במשחקי קופסה", "שחו בים", "רכבו על אופניים"],
      correctIndex: 0,
    },
    {
      id: "h6",
      type: "title_pick",
      caseLabel: "תיק #6",
      prompt: "איזו כותרת מתאימה לקטע?",
      passage:
        "יואב למד לרכוב על אופניים. בהתחלה נפל, אבל המשיך להתאמן. בסוף רכב לבד בכביש.",
      options: ["יואב לומד לרכוב", "יואב קונה בגדים", "יואב אוכל ארוחת צהריים"],
      correctIndex: 0,
    },
    {
      id: "h7",
      type: "meaning",
      caseLabel: "תיק #7",
      prompt: "מה פירוש המילה «התאמן» לפי המשפט?",
      passage:
        "יואב למד לרכוב על אופניים. בהתחלה נפל, אבל המשיך להתאמן. בסוף רכב לבד בכביש.",
      options: ["תרגל שוב ושוב", "ישן", "אכל"],
      correctIndex: 0,
    },
    {
      id: "h8",
      type: "passage_q",
      caseLabel: "תיק #8",
      prompt: "מי עזר לסבתא?",
      passage:
        "סבתא ביקשה עזרה בשוק. נועה ליוותה אותה וסייעה לשאת את השקיות. סבתא חיבקה אותה בחום.",
      options: ["נועה", "הכלב", "השכן"],
      correctIndex: 0,
    },
    {
      id: "h9",
      type: "passage_q",
      caseLabel: "תיק #9",
      prompt: "מה קרה אחר כך?",
      passage:
        "סבתא ביקשה עזרה בשוק. נועה ליוותה אותה וסייעה לשאת את השקיות. סבתא חיבקה אותה בחום.",
      options: ["סבתא חיבקה את נועה", "נועה הלכה לישון", "סבתא קנתה רכב"],
      correctIndex: 0,
    },
    {
      id: "h10",
      type: "title_pick",
      caseLabel: "תיק #10",
      prompt: "איזו כותרת מתאימה לקטע?",
      passage:
        "הגשם ירד חזק. הילדים נשארו בבית ושיחקו במשחקי קופסה. אחרי הגשם יצא קשת בענן.",
      options: ["יום גשום ומשחקים", "טיול ביער", "קנייה בחנות"],
      correctIndex: 0,
    },
  ],
};

export function detectiveFeedback(ok) {
  return ok ? "כל הכבוד! מצאתם את הרמז הנכון 🕵️" : "כמעט — נסו לחשוב על הרמז שוב";
}

/** @param {DifficultyId} difficulty */
export function pickWordDetectiveTasks(difficulty) {
  const pool = WORD_DETECTIVE_TASKS[difficulty] ?? WORD_DETECTIVE_TASKS.easy;
  return shuffleTasks(pool).slice(0, LANGUAGE_PROTOTYPE_TASKS);
}
