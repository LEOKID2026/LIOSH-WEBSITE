/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/**
 * @typedef {{ id: string, label: string, sub?: string, icon?: string }} DetectiveZone
 * @typedef {{ id: string, label: string }} DetectivePiece
 * @typedef {{
 *   id: string,
 *   type: string,
 *   caseLabel: string,
 *   missionHe: string,
 *   passage?: string,
 *   emoji?: string,
 *   zones: DetectiveZone[],
 *   pieces: DetectivePiece[],
 *   solution: Record<string, string>,
 * }} DetectiveTask
 */

import { LANGUAGE_PROTOTYPE_TASKS, shuffleTasks } from "../shared/language-prototype-config.js";

/** @param {DetectivePiece[]} pieces */
function shufflePieces(pieces) {
  return shuffleTasks(pieces);
}

/** @type {Record<DifficultyId, DetectiveTask[]>} */
export const WORD_DETECTIVE_TASKS = {
  easy: [
    {
      id: "e1",
      type: "letter_drop",
      caseLabel: "תיק #1",
      missionHe: "גררו אות פותחת ללוח החקירה",
      emoji: "🐕",
      zones: [{ id: "z1", label: "אות פותחת", icon: "🔤" }],
      pieces: shufflePieces([
        { id: "p1", label: "כ" },
        { id: "p2", label: "ל" },
        { id: "p3", label: "ב" },
        { id: "p4", label: "ח" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "e2",
      type: "fill_gap",
      caseLabel: "תיק #2",
      missionHe: "השלימו: שו_חן - גררו אות לחלל",
      zones: [{ id: "z1", label: "אות חסרה", icon: "🧩" }],
      pieces: shufflePieces([
        { id: "p1", label: "ל" },
        { id: "p2", label: "ר" },
        { id: "p3", label: "מ" },
        { id: "p4", label: "נ" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "e3",
      type: "image_word",
      caseLabel: "תיק #3",
      missionHe: "גררו את המילה המתאימה לתמונה",
      emoji: "🏠",
      zones: [{ id: "z1", label: "ראיה", icon: "📌" }],
      pieces: shufflePieces([
        { id: "p1", label: "בית" },
        { id: "p2", label: "כיסא" },
        { id: "p3", label: "ענן" },
        { id: "p4", label: "רכב" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "e4",
      type: "sort_letter",
      caseLabel: "תיק #4",
      missionHe: "גררו מילה שמתחילה ב-מ׳ לתיקייה",
      zones: [
        { id: "zM", label: "מתחיל ב-מ׳", icon: "📁" },
        { id: "zX", label: "לא מתאים", icon: "🗑️" },
      ],
      pieces: shufflePieces([
        { id: "p1", label: "מים" },
        { id: "p2", label: "כלב" },
        { id: "p3", label: "מלך" },
        { id: "p4", label: "ספר" },
      ]),
      solution: { zM: "p1" },
    },
    {
      id: "e5",
      type: "letter_drop",
      caseLabel: "תיק #5",
      missionHe: "גררו אות פותחת - חתול",
      emoji: "🐱",
      zones: [{ id: "z1", label: "אות פותחת", icon: "🔤" }],
      pieces: shufflePieces([
        { id: "p1", label: "ח" },
        { id: "p2", label: "ת" },
        { id: "p3", label: "ל" },
        { id: "p4", label: "ב" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "e6",
      type: "image_word",
      caseLabel: "תיק #6",
      missionHe: "גררו מילה לתמונה",
      emoji: "🍎",
      zones: [{ id: "z1", label: "ראיה", icon: "📌" }],
      pieces: shufflePieces([
        { id: "p1", label: "תפוח" },
        { id: "p2", label: "שולחן" },
        { id: "p3", label: "גשם" },
        { id: "p4", label: "עץ" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "e7",
      type: "fill_gap",
      caseLabel: "תיק #7",
      missionHe: "הילד שתה ___ - גררו מילה",
      zones: [{ id: "z1", label: "ראיה", icon: "📌" }],
      pieces: shufflePieces([
        { id: "p1", label: "מים" },
        { id: "p2", label: "שולחן" },
        { id: "p3", label: "רץ" },
        { id: "p4", label: "כחול" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "e8",
      type: "letter_drop",
      caseLabel: "תיק #8",
      missionHe: "גררו אות פותחת - בית",
      emoji: "🏠",
      zones: [{ id: "z1", label: "אות פותחת", icon: "🔤" }],
      pieces: shufflePieces([
        { id: "p1", label: "ב" },
        { id: "p2", label: "י" },
        { id: "p3", label: "ת" },
        { id: "p4", label: "ש" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "e9",
      type: "sort_letter",
      caseLabel: "תיק #9",
      missionHe: "גררו מילה שמתחילה ב-ס׳",
      zones: [{ id: "zS", label: "מתחיל ב-ס׳", icon: "📁" }],
      pieces: shufflePieces([
        { id: "p1", label: "ספר" },
        { id: "p2", label: "כלב" },
        { id: "p3", label: "מים" },
        { id: "p4", label: "ענן" },
      ]),
      solution: { zS: "p1" },
    },
    {
      id: "e10",
      type: "image_word",
      caseLabel: "תיק #10",
      missionHe: "גררו מילה - עיפרון לכתיבה",
      emoji: "✏️",
      zones: [{ id: "z1", label: "ראיה", icon: "📌" }],
      pieces: shufflePieces([
        { id: "p1", label: "עיפרון" },
        { id: "p2", label: "כדור" },
        { id: "p3", label: "מים" },
        { id: "p4", label: "ענן" },
      ]),
      solution: { z1: "p1" },
    },
  ],
  medium: [
    {
      id: "m1",
      type: "fill_sentence",
      caseLabel: "תיק #1",
      missionHe: "גררו מילה חסרה: הילדה ___ ספר",
      zones: [{ id: "z1", label: "חלל במשפט", icon: "📝" }],
      pieces: shufflePieces([
        { id: "p1", label: "קוראת" },
        { id: "p2", label: "רצה" },
        { id: "p3", label: "כחול" },
        { id: "p4", label: "שולחן" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "m2",
      type: "sort_plural",
      caseLabel: "תיק #2",
      missionHe: "גררו את הרבים של «ילד» לתיקייה",
      zones: [
        { id: "zPlural", label: "רבים", icon: "📁" },
        { id: "zSing", label: "יחיד", icon: "📂" },
      ],
      pieces: shufflePieces([
        { id: "p1", label: "ילדים" },
        { id: "p2", label: "ילדה" },
        { id: "p3", label: "ילדות" },
        { id: "p4", label: "ילד" },
      ]),
      solution: { zPlural: "p1" },
    },
    {
      id: "m3",
      type: "sort_gender",
      caseLabel: "תיק #3",
      missionHe: "גררו נקבה של «גדול»",
      zones: [
        { id: "zFem", label: "נקבה", icon: "📁" },
        { id: "zMasc", label: "זכר", icon: "📂" },
      ],
      pieces: shufflePieces([
        { id: "p1", label: "גדולה" },
        { id: "p2", label: "גדולים" },
        { id: "p3", label: "גדל" },
        { id: "p4", label: "גדול" },
      ]),
      solution: { zFem: "p1" },
    },
    {
      id: "m4",
      type: "word_family",
      caseLabel: "תיק #4",
      missionHe: "גררו מילה ממשפחת «כתב»",
      zones: [{ id: "zFam", label: "משפחת כתב", icon: "🧬" }],
      pieces: shufflePieces([
        { id: "p1", label: "כתיבה" },
        { id: "p2", label: "שולחן" },
        { id: "p3", label: "ריצה" },
        { id: "p4", label: "מכתב" },
      ]),
      solution: { zFam: "p1" },
    },
    {
      id: "m5",
      type: "fill_sentence",
      caseLabel: "תיק #5",
      missionHe: "גררו מילה: הגשם ירד - לקחתי ___",
      zones: [{ id: "z1", label: "ראיה", icon: "📌" }],
      pieces: shufflePieces([
        { id: "p1", label: "מטרייה" },
        { id: "p2", label: "גלידה" },
        { id: "p3", label: "כדור" },
        { id: "p4", label: "ספר" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "m6",
      type: "sort_plural",
      caseLabel: "תיק #6",
      missionHe: "מה הרבים של «ספר»?",
      zones: [{ id: "zPlural", label: "רבים", icon: "📁" }],
      pieces: shufflePieces([
        { id: "p1", label: "ספרים" },
        { id: "p2", label: "ספרה" },
        { id: "p3", label: "ספרות" },
        { id: "p4", label: "ספר" },
      ]),
      solution: { zPlural: "p1" },
    },
    {
      id: "m7",
      type: "word_family",
      caseLabel: "תיק #7",
      missionHe: "משפחת «למד» - גררו מילה",
      zones: [{ id: "zFam", label: "משפחת למד", icon: "🧬" }],
      pieces: shufflePieces([
        { id: "p1", label: "לימוד" },
        { id: "p2", label: "ענן" },
        { id: "p3", label: "רכב" },
        { id: "p4", label: "שולחן" },
      ]),
      solution: { zFam: "p1" },
    },
    {
      id: "m8",
      type: "sort_gender",
      caseLabel: "תיק #8",
      missionHe: "נקבה של «חכם»",
      zones: [{ id: "zFem", label: "נקבה", icon: "📁" }],
      pieces: shufflePieces([
        { id: "p1", label: "חכמה" },
        { id: "p2", label: "חכמים" },
        { id: "p3", label: "חכמו" },
        { id: "p4", label: "חכם" },
      ]),
      solution: { zFem: "p1" },
    },
    {
      id: "m9",
      type: "fill_sentence",
      caseLabel: "תיק #9",
      missionHe: "היה קר - לבשתי ___",
      zones: [{ id: "z1", label: "ראיה", icon: "📌" }],
      pieces: shufflePieces([
        { id: "p1", label: "מעיל" },
        { id: "p2", label: "בגד ים" },
        { id: "p3", label: "כובע קיץ" },
        { id: "p4", label: "גלידה" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "m10",
      type: "fill_sentence",
      caseLabel: "תיק #10",
      missionHe: "אמא ___ אוכל",
      zones: [{ id: "z1", label: "חלל במשפט", icon: "📝" }],
      pieces: shufflePieces([
        { id: "p1", label: "מבשלת" },
        { id: "p2", label: "רצה" },
        { id: "p3", label: "כחול" },
        { id: "p4", label: "גשם" },
      ]),
      solution: { z1: "p1" },
    },
  ],
  hard: [
    {
      id: "h1",
      type: "event_order",
      caseLabel: "תיק #1",
      missionHe: "סדרו אירועים - גררו ללוח",
      passage: "דני יצא מהבית. הלך לגן ושיחק. אחר כך חזר לארוחת צהריים.",
      zones: [
        { id: "z0", label: "קודם", icon: "1️⃣" },
        { id: "z1", label: "אחר כך", icon: "2️⃣" },
        { id: "z2", label: "בסוף", icon: "3️⃣" },
      ],
      pieces: shufflePieces([
        { id: "p1", label: "יצא מהבית" },
        { id: "p2", label: "שיחק בגן" },
        { id: "p3", label: "חזר לארוחה" },
        { id: "p4", label: "הלך לישון" },
      ]),
      solution: { z0: "p1", z1: "p2", z2: "p3" },
    },
    {
      id: "h2",
      type: "title_stamp",
      caseLabel: "תיק #2",
      missionHe: "גררו כותרת מתאימה לראש התיק",
      passage: "מיה אהבה לקרוא ספרים. כל ערב ישבה בפינה עם ספר חדש.",
      zones: [{ id: "zTitle", label: "כותרת התיק", icon: "📋" }],
      pieces: shufflePieces([
        { id: "p1", label: "מיה אוהבת לקרוא" },
        { id: "p2", label: "מיה הולכת לים" },
        { id: "p3", label: "מיה קונה נעליים" },
        { id: "p4", label: "יום גשום" },
      ]),
      solution: { zTitle: "p1" },
    },
    {
      id: "h3",
      type: "conclusion",
      caseLabel: "תיק #3",
      missionHe: "למה דני חזר הביתה?",
      passage: "דני יצא מהבית עם תיק. הלך לגן ושיחק עם חברים. אחר כך חזר הביתה לארוחת צהריים.",
      zones: [{ id: "z1", label: "מסקנה", icon: "🎯" }],
      pieces: shufflePieces([
        { id: "p1", label: "לארוחת צהריים" },
        { id: "p2", label: "לישון" },
        { id: "p3", label: "לקנות נעליים" },
        { id: "p4", label: "לשחות בים" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "h4",
      type: "conclusion",
      caseLabel: "תיק #4",
      missionHe: "מה אפשר להבין מהקטע?",
      passage: "הגשם ירד חזק. הילדים נשארו בבית ושיחקו במשחקי קופסה.",
      zones: [{ id: "z1", label: "מסקנה", icon: "🎯" }],
      pieces: shufflePieces([
        { id: "p1", label: "נשארו בבית בגלל הגשם" },
        { id: "p2", label: "שחו בים" },
        { id: "p3", label: "טסו לחו״ל" },
        { id: "p4", label: "קנו אופניים" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "h5",
      type: "event_order",
      caseLabel: "תיק #5",
      missionHe: "סדרו מה קרה בגשם",
      passage: "הגשם ירד. הילדים שיחקו בבית. אחרי הגשם יצאה קשת.",
      zones: [
        { id: "z0", label: "קודם", icon: "1️⃣" },
        { id: "z1", label: "אחר כך", icon: "2️⃣" },
        { id: "z2", label: "בסוף", icon: "3️⃣" },
      ],
      pieces: shufflePieces([
        { id: "p1", label: "ירד גשם" },
        { id: "p2", label: "שיחקו בבית" },
        { id: "p3", label: "יצאה קשת" },
        { id: "p4", label: "הלכו לים" },
      ]),
      solution: { z0: "p1", z1: "p2", z2: "p3" },
    },
    {
      id: "h6",
      type: "title_stamp",
      caseLabel: "תיק #6",
      missionHe: "בחרו כותרת לקטע",
      passage: "יואב למד לרכוב על אופניים. בהתחלה נפל, אבל המשיך. בסוף רכב לבד.",
      zones: [{ id: "zTitle", label: "כותרת", icon: "📋" }],
      pieces: shufflePieces([
        { id: "p1", label: "יואב לומד לרכוב" },
        { id: "p2", label: "יואב קונה בגדים" },
        { id: "p3", label: "יואב אוכל צהריים" },
        { id: "p4", label: "טיול ביער" },
      ]),
      solution: { zTitle: "p1" },
    },
    {
      id: "h7",
      type: "meaning",
      caseLabel: "תיק #7",
      missionHe: "פירוש «התאמן» לפי הקטע",
      passage: "יואב למד לרכוב. נפל, אבל המשיך להתאמן. בסוף רכב לבד.",
      zones: [{ id: "z1", label: "פירוש", icon: "📖" }],
      pieces: shufflePieces([
        { id: "p1", label: "תרגל שוב ושוב" },
        { id: "p2", label: "ישן" },
        { id: "p3", label: "אכל" },
        { id: "p4", label: "רקד" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "h8",
      type: "conclusion",
      caseLabel: "תיק #8",
      missionHe: "מי עזר לסבתא?",
      passage: "סבתא ביקשה עזרה בשוק. נועה ליוותה אותה וסייעה לשאת שקיות.",
      zones: [{ id: "z1", label: "מסקנה", icon: "🎯" }],
      pieces: shufflePieces([
        { id: "p1", label: "נועה" },
        { id: "p2", label: "הכלב" },
        { id: "p3", label: "השכן" },
        { id: "p4", label: "אף אחד" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "h9",
      type: "conclusion",
      caseLabel: "תיק #9",
      missionHe: "מה למדנו על יואב?",
      passage: "יואב נפל מהאופניים אבל המשיך להתאמן עד שרכב לבד.",
      zones: [{ id: "z1", label: "מסקנה", icon: "🎯" }],
      pieces: shufflePieces([
        { id: "p1", label: "הוא לא ויתר" },
        { id: "p2", label: "הוא מכר את האופניים" },
        { id: "p3", label: "הוא נשאר בבית" },
        { id: "p4", label: "הוא פחד ממים" },
      ]),
      solution: { z1: "p1" },
    },
    {
      id: "h10",
      type: "title_stamp",
      caseLabel: "תיק #10",
      missionHe: "כותרת לקטע הגשם",
      passage: "הגשם ירד חזק. הילדים שיחקו במשחקי קופסה. אחרי הגשם יצאה קשת.",
      zones: [{ id: "zTitle", label: "כותרת", icon: "📋" }],
      pieces: shufflePieces([
        { id: "p1", label: "יום גשום ומשחקים" },
        { id: "p2", label: "טיול ביער" },
        { id: "p3", label: "קנייה בחנות" },
        { id: "p4", label: "שיעור שחייה" },
      ]),
      solution: { zTitle: "p1" },
    },
  ],
};

/** @param {DetectiveTask} task @param {Record<string, string>} zoneFills zoneId -> pieceId */
export function validateDetectiveTask(task, zoneFills) {
  for (const [zoneId, pieceId] of Object.entries(task.solution)) {
    if (zoneFills[zoneId] !== pieceId) return false;
  }
  return Object.keys(task.solution).every((z) => zoneFills[z]);
}

export function detectiveFeedback(ok) {
  return ok ? "🔖 התיק נפתר!" : "הראיה לא מתאימה - נסו שוב";
}

/** @param {DifficultyId} difficulty */
export function pickWordDetectiveTasks(difficulty) {
  const pool = WORD_DETECTIVE_TASKS[difficulty] ?? WORD_DETECTIVE_TASKS.easy;
  return shuffleTasks(pool).slice(0, LANGUAGE_PROTOTYPE_TASKS);
}

/** @param {DetectiveTask} task @param {Record<string, string>} zoneFills */
export function usedPieceIds(task, zoneFills) {
  return new Set(Object.values(zoneFills));
}
