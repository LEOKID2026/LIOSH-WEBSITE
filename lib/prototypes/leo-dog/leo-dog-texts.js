/** @typedef {import('./leo-dog-state.js').LeoDogMood} LeoDogMood */

/** @type {Record<LeoDogMood, string[]>} */
const MOOD_LINES = {
  happy: [
    "איזה כיף שבאת! ליאו שמח לראות אותך.",
    "ליאו מחכה לך עם זנב מכונס!",
    "היי! בואו נשחק קצת יחד.",
  ],
  superHappy: [
    "ליאו מאושר ממש! אתם חברים מעולים!",
    "וואו! ליאו אוהב אתכם הכי הרבה!",
    "לבבות בכל מקום - ליאו במצב רוח מעולה!",
  ],
  hungry: ["ליאו ישמח לקערת אוכל.", "הבטן של ליאו מרמזת - אולי נשנה?", "ליאו מחפש משהו טעים."],
  dirty: ["ליאו שיחק בבוץ וצריך מקלחת טובה.", "יש קצת לכלוך על הפרווה - מקלחת תעזור!", "ליאו רוצה להיות נקי ומבריק."],
  tired: ["ליאו עייף קצת - מנוחה תעשה לו טוב.", "ליאו מפהק... אולי שינה קצרה?", "עיניים כבדות - זמן לנוח."],
  missing: ["ליאו חיכה לך והתגעגע מאוד.", "ליאו שמח שחזרת - התגעגע!", "היי! ליאו חיכה כל הזמן."],
  veryDirtyAndMissing: [
    "ליאו חיכה לך - וגם צריך מקלחת!",
    "התגעגענו אליך! בואו נרחץ ונשחק.",
    "ליאו מחכה לך עם פרווה מעט מלוכלכת - אבל שמח!",
  ],
};

export const ACTION_LINES = {
  feed: "ליאו אכל בשמחה!",
  bathProgress: "ליאו מתקלח...",
  bathAfter: "ליאו נקי ומרוצה!",
  play: "איזה כיף לשחק!",
  pet: "ליאו מאושר!",
  restStart: "ליאו נח וצובר כוח...",
  sleeping: "ששש... ליאו ישן.",
  wake: "ליאו התעורר ויש לו כוח!",
  touchHead: "מממ... ליטוף טוב!",
  touchNose: "אצצצ'! חמוד!",
  touchBelly: "ההה! זה מצחיק!",
  touchPaw: "כיף! כף יד!",
  touchBody: "ליאו מתנער בשמחה.",
};

/** @param {LeoDogMood} mood */
export function pickMoodLine(mood) {
  const lines = MOOD_LINES[mood] ?? MOOD_LINES.happy;
  return lines[Math.floor(Math.random() * lines.length)];
}
