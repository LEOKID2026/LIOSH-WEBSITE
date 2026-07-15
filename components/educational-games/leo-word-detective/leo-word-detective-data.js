/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/**
 * @typedef {{ id: string, label: string, sub?: string, icon?: string }} DetectiveZone
 * @typedef {{ id: string, label: string }} DetectivePiece
 * @typedef {{
 *   id: string,
 *   level: DifficultyId,
 *   taskType: string,
 *   type: string,
 *   prompt: string,
 *   caseLabel: string,
 *   missionHe: string,
 *   passage?: string,
 *   emoji?: string,
 *   zones: DetectiveZone[],
 *   pieces: DetectivePiece[],
 *   solution: Record<string, string>,
 *   correctAnswer: string,
 *   feedbackShort: string,
 *   gradeBand: string,
 *   difficultyWeight: number,
 * }} DetectiveTask
 */

import { planLanguageSession } from "../../../lib/educational-games/language-session-planner.js";
import {
  LANGUAGE_MIN_POOL_PER_LEVEL,
  LANGUAGE_SESSION_TASKS,
  shuffleLanguageTasks,
} from "../../../lib/educational-games/language-game-config.js";

const GRADE_BANDS = {
  easy: "א׳–ב׳",
  medium: "ג׳–ד׳",
  hard: "ה׳–ו׳",
};

const EASY_TYPES = new Set(["letter_drop", "fill_gap", "image_word", "sort_letter"]);
const MEDIUM_TYPES = new Set(["fill_sentence", "sort_plural", "sort_gender", "meaning_word"]);
const HARD_TYPES = new Set(["event_order", "title_stamp", "conclusion", "meaning"]);

const MEANING_WORD_LEXICON = {
  שמח: "מרגיש טוב",
  עייף: "צריך מנוחה",
  רעב: "רוצה לאכול",
  אמיץ: "לא מפחד",
  נדיב: "נותן לאחרים",
  זהיר: "שומר על עצמו",
  לח: "רטוב",
};

const DIFFICULTY_WEIGHT = {
  letter_drop: 15,
  fill_gap: 22,
  image_word: 28,
  sort_letter: 32,
  fill_sentence: 45,
  sort_plural: 50,
  sort_gender: 52,
  word_family: 55,
  meaning_word: 58,
  event_order: 75,
  title_stamp: 80,
  conclusion: 85,
  meaning: 88,
};

const MAX_HARD_PASSAGE_SENTENCES = 3;
const MAX_EASY_MISSION_CHARS = 48;

/** @param {DetectivePiece[]} pieces */
function shufflePieces(pieces) {
  return shuffleLanguageTasks(pieces);
}

/** @param {DetectiveTask} task */
function taskCorrectAnswer(task) {
  return Object.entries(task.solution)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, pieceId]) => task.pieces.find((p) => p.id === pieceId)?.label ?? "")
    .filter(Boolean)
    .join("|");
}

/**
 * @param {DifficultyId} level
 * @param {string} taskType
 * @param {Omit<DetectiveTask, 'level'|'taskType'|'type'|'prompt'|'correctAnswer'|'gradeBand'|'difficultyWeight'> & { missionHe: string, pieces: DetectivePiece[] }} base
 */
function wrapDetectiveTask(level, taskType, base) {
  const task = {
    ...base,
    level,
    taskType,
    type: taskType,
    prompt: base.missionHe,
    gradeBand: GRADE_BANDS[level],
    difficultyWeight: DIFFICULTY_WEIGHT[taskType] ?? 50,
    feedbackShort: base.feedbackShort ?? "🔖 התיק נפתר!",
  };
  return { ...task, correctAnswer: taskCorrectAnswer(task) };
}

/** @param {string} passage */
function countSentences(passage) {
  return passage
    .split(/[.!?]\s*/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

/** @param {{ word: string, emoji: string, letter: string, distractors: string[] }} spec */
function letterDropTask(id, caseLabel, spec) {
  const { word, emoji, letter, distractors } = spec;
  const pieces = shufflePieces([
    { id: "p1", label: letter },
    ...distractors.map((label, i) => ({ id: `d${i}`, label })),
  ]);
  return wrapDetectiveTask("easy", "letter_drop", {
    id,
    caseLabel,
    missionHe: `גררו אות פותחת - ${word}`,
    emoji,
    zones: [{ id: "z1", label: "אות פותחת", icon: "🔤" }],
    pieces,
    solution: { z1: "p1" },
    feedbackShort: "האות הפותחת במקום!",
  });
}

/** @param {{ fragment: string, letter: string, distractors: string[] }} spec */
function fillGapTask(id, caseLabel, spec) {
  const { fragment, letter, distractors } = spec;
  const pieces = shufflePieces([
    { id: "p1", label: letter },
    ...distractors.map((label, i) => ({ id: `d${i}`, label })),
  ]);
  return wrapDetectiveTask("easy", "fill_gap", {
    id,
    caseLabel,
    missionHe: `השלימו: ${fragment} - גררו אות`,
    zones: [{ id: "z1", label: "אות חסרה", icon: "🧩" }],
    pieces,
    solution: { z1: "p1" },
    feedbackShort: "האות החסרה הושלמה!",
  });
}

/** @param {{ emoji: string, answer: string, options: string[] }} spec */
function imageWordTask(id, caseLabel, spec) {
  const { emoji, answer, options } = spec;
  const pieces = shufflePieces(options.map((label, i) => ({ id: `p${i + 1}`, label })));
  const correctId = pieces.find((p) => p.label === answer)?.id ?? "p1";
  return wrapDetectiveTask("easy", "image_word", {
    id,
    caseLabel,
    missionHe: "גררו את המילה המתאימה לתמונה",
    emoji,
    zones: [{ id: "z1", label: "ראיה", icon: "📌" }],
    pieces,
    solution: { z1: correctId },
    feedbackShort: "המילה מתאימה לתמונה!",
  });
}

/** @param {{ letter: string, answer: string, options: string[] }} spec */
function sortLetterTask(id, caseLabel, spec) {
  const { letter, answer, options } = spec;
  const pieces = shufflePieces(options.map((label, i) => ({ id: `p${i + 1}`, label })));
  const correctId = pieces.find((p) => p.label === answer)?.id ?? "p1";
  return wrapDetectiveTask("easy", "sort_letter", {
    id,
    caseLabel,
    missionHe: `גררו מילה שמתחילה ב-${letter}`,
    zones: [{ id: "zL", label: `מתחיל ב-${letter}`, icon: "📁" }],
    pieces,
    solution: { zL: correctId },
    feedbackShort: "מילה נכונה לתיקייה!",
  });
}

/** @param {{ sentence: string, answer: string, options: string[] }} spec */
function fillSentenceTask(id, caseLabel, spec) {
  const { sentence, answer, options } = spec;
  const pieces = shufflePieces(options.map((label, i) => ({ id: `p${i + 1}`, label })));
  const correctId = pieces.find((p) => p.label === answer)?.id ?? "p1";
  return wrapDetectiveTask("medium", "fill_sentence", {
    id,
    caseLabel,
    missionHe: `גררו מילה חסרה: ${sentence}`,
    zones: [{ id: "z1", label: "חלל במשפט", icon: "📝" }],
    pieces,
    solution: { z1: correctId },
    feedbackShort: "המילה משלימה את המשפט!",
  });
}

/** @param {{ base: string, answer: string, options: string[] }} spec */
function sortPluralTask(id, caseLabel, spec) {
  const { base, answer, options } = spec;
  const pieces = shufflePieces(options.map((label, i) => ({ id: `p${i + 1}`, label })));
  const correctId = pieces.find((p) => p.label === answer)?.id ?? "p1";
  return wrapDetectiveTask("medium", "sort_plural", {
    id,
    caseLabel,
    missionHe: `גררו את הרבים של "${base}"`,
    zones: [{ id: "zPlural", label: "רבים", icon: "📁" }],
    pieces,
    solution: { zPlural: correctId },
    feedbackShort: "צורת הרבים נכונה!",
  });
}

/** @param {{ base: string, answer: string, options: string[] }} spec */
function sortGenderTask(id, caseLabel, spec) {
  const { base, answer, options } = spec;
  const pieces = shufflePieces(options.map((label, i) => ({ id: `p${i + 1}`, label })));
  const correctId = pieces.find((p) => p.label === answer)?.id ?? "p1";
  return wrapDetectiveTask("medium", "sort_gender", {
    id,
    caseLabel,
    missionHe: `גררו נקבה של "${base}"`,
    zones: [{ id: "zFem", label: "נקבה", icon: "📁" }],
    pieces,
    solution: { zFem: correctId },
    feedbackShort: "צורת הנקבה נכונה!",
  });
}

/** @param {{ root: string, answer: string, options: string[] }} spec */
function wordFamilyTask(id, caseLabel, spec) {
  const { root, answer, options } = spec;
  const pieces = shufflePieces(options.map((label, i) => ({ id: `p${i + 1}`, label })));
  const correctId = pieces.find((p) => p.label === answer)?.id ?? "p1";
  return wrapDetectiveTask("medium", "word_family", {
    id,
    caseLabel,
    missionHe: `גררו מילה ממשפחת "${root}"`,
    zones: [{ id: "zFam", label: `משפחת ${root}`, icon: "🧬" }],
    pieces,
    solution: { zFam: correctId },
    feedbackShort: "מילה מאותה משפחה!",
  });
}

/** @param {{ word: string, answer: string, options: string[] }} spec */
function meaningWordTask(id, caseLabel, spec) {
  const { word, answer, options } = spec;
  const pieces = shufflePieces(options.map((label, i) => ({ id: `p${i + 1}`, label })));
  const correctId = pieces.find((p) => p.label === answer)?.id ?? "p1";
  return wrapDetectiveTask("medium", "meaning_word", {
    id,
    caseLabel,
    missionHe: `מה הפירוש של "${word}"?`,
    zones: [{ id: "z1", label: "פירוש", icon: "📖" }],
    pieces,
    solution: { z1: correctId },
    feedbackShort: "הפירוש מתאים!",
  });
}

/** @param {{ passage: string, labels: string[], answerIds: string[] }} spec */
function eventOrderTask(id, caseLabel, spec) {
  const { passage, labels, answerIds } = spec;
  const pieces = shufflePieces(labels.map((label, i) => ({ id: `p${i + 1}`, label })));
  const zones = [
    { id: "z0", label: "קודם", icon: "1️⃣" },
    { id: "z1", label: "אחר כך", icon: "2️⃣" },
    { id: "z2", label: "בסוף", icon: "3️⃣" },
  ];
  const solution = Object.fromEntries(zones.map((z, i) => [z.id, answerIds[i]]));
  return wrapDetectiveTask("hard", "event_order", {
    id,
    caseLabel,
    missionHe: "סדרו אירועים - גררו ללוח",
    passage,
    zones,
    pieces,
    solution,
    feedbackShort: "סדר האירועים נכון!",
  });
}

/** @param {{ passage: string, answer: string, options: string[] }} spec */
function titleStampTask(id, caseLabel, spec) {
  const { passage, answer, options } = spec;
  const pieces = shufflePieces(options.map((label, i) => ({ id: `p${i + 1}`, label })));
  const correctId = pieces.find((p) => p.label === answer)?.id ?? "p1";
  return wrapDetectiveTask("hard", "title_stamp", {
    id,
    caseLabel,
    missionHe: "גררו כותרת מתאימה לראש התיק",
    passage,
    zones: [{ id: "zTitle", label: "כותרת התיק", icon: "📋" }],
    pieces,
    solution: { zTitle: correctId },
    feedbackShort: "כותרת מתאימה לקטע!",
  });
}

/** @param {{ passage: string, question: string, answer: string, options: string[] }} spec */
function conclusionTask(id, caseLabel, spec) {
  const { passage, question, answer, options } = spec;
  const pieces = shufflePieces(options.map((label, i) => ({ id: `p${i + 1}`, label })));
  const correctId = pieces.find((p) => p.label === answer)?.id ?? "p1";
  return wrapDetectiveTask("hard", "conclusion", {
    id,
    caseLabel,
    missionHe: question,
    passage,
    zones: [{ id: "z1", label: "מסקנה", icon: "🎯" }],
    pieces,
    solution: { z1: correctId },
    feedbackShort: "מסקנה נכונה מהקטע!",
  });
}

/** @param {{ passage: string, word: string, answer: string, options: string[] }} spec */
function meaningPassageTask(id, caseLabel, spec) {
  const { passage, word, answer, options } = spec;
  const pieces = shufflePieces(options.map((label, i) => ({ id: `p${i + 1}`, label })));
  const correctId = pieces.find((p) => p.label === answer)?.id ?? "p1";
  return wrapDetectiveTask("hard", "meaning", {
    id,
    caseLabel,
    missionHe: `פירוש "${word}" לפי הקטע`,
    passage,
    zones: [{ id: "z1", label: "פירוש", icon: "📖" }],
    pieces,
    solution: { z1: correctId },
    feedbackShort: "הפירוש מתאים לקטע!",
  });
}

/** @returns {DetectiveTask[]} */
function buildEasyDetectiveTasks() {
  /** @type {DetectiveTask[]} */
  const tasks = [];

  const letterDrops = [
    { word: "כלב", emoji: "🐕", letter: "כ", distractors: ["ל", "ב", "ח"] },
    { word: "חתול", emoji: "🐱", letter: "ח", distractors: ["ת", "ל", "ב"] },
    { word: "בית", emoji: "🏠", letter: "ב", distractors: ["י", "ת", "ש"] },
    { word: "ספר", emoji: "📚", letter: "ס", distractors: ["פ", "ר", "מ"] },
    { word: "עץ", emoji: "🌳", letter: "ע", distractors: ["ץ", "ר", "נ"] },
    { word: "מים", emoji: "💧", letter: "מ", distractors: ["י", "ם", "ש"] },
    { word: "שמש", emoji: "☀️", letter: "ש", distractors: ["מ", "ס", "ר"] },
    { word: "פרח", emoji: "🌸", letter: "פ", distractors: ["ר", "ח", "ל"] },
  ];
  letterDrops.forEach((spec, i) => {
    tasks.push(letterDropTask(`wd-e-ld-${i + 1}`, `תיק #${i + 1}`, spec));
  });

  const fillGaps = [
    { fragment: "שו_חן", letter: "ל", distractors: ["ר", "מ", "נ"] },
    { fragment: "י_ד", letter: "ל", distractors: ["ר", "ש", "ח"] },
    { fragment: "ס_פר", letter: "פ", distractors: ["ב", "מ", "כ"] },
    { fragment: "ע_נן", letter: "נ", distractors: ["מ", "ל", "ש"] },
    { fragment: "מ_ים", letter: "י", distractors: ["ל", "ש", "ר"] },
    { fragment: "כ_סא", letter: "י", distractors: ["ל", "ב", "ח"] },
    { fragment: "ג_שם", letter: "ש", distractors: ["מ", "ל", "ר"] },
    { fragment: "ח_לון", letter: "ל", distractors: ["נ", "מ", "ש"] },
  ];
  fillGaps.forEach((spec, i) => {
    tasks.push(fillGapTask(`wd-e-fg-${i + 1}`, `תיק #${i + 9}`, spec));
  });

  const imageWords = [
    { emoji: "🏠", answer: "בית", options: ["בית", "כיסא", "ענן", "רכב"] },
    { emoji: "🍎", answer: "תפוח", options: ["תפוח", "שולחן", "גשם", "עץ"] },
    { emoji: "✏️", answer: "עיפרון", options: ["עיפרון", "כדור", "מים", "ענן"] },
    { emoji: "🐟", answer: "דג", options: ["דג", "ספר", "ענף", "רוח"] },
    { emoji: "🎈", answer: "בלון", options: ["בלון", "שולחן", "ענן", "מפתח"] },
    { emoji: "🚌", answer: "אוטובוס", options: ["אוטובוס", "אופניים", "מטריה", "כובע"] },
    { emoji: "🌙", answer: "ירח", options: ["ירח", "שמש", "ענן", "כוכב"] },
  ];
  imageWords.forEach((spec, i) => {
    tasks.push(imageWordTask(`wd-e-iw-${i + 1}`, `תיק #${i + 17}`, spec));
  });

  const sortLetters = [
    { letter: "מ׳", answer: "מים", options: ["מים", "כלב", "מלך", "ספר"] },
    { letter: "ס׳", answer: "ספר", options: ["ספר", "כלב", "מים", "ענן"] },
    { letter: "ב׳", answer: "בית", options: ["בית", "עץ", "גשם", "שמש"] },
    { letter: "כ׳", answer: "כיסא", options: ["כיסא", "ספר", "ענן", "דג"] },
    { letter: "ש׳", answer: "שמש", options: ["שמש", "ענן", "מים", "פרח"] },
    { letter: "ע׳", answer: "ענן", options: ["ענן", "בית", "ספר", "כלב"] },
    { letter: "פ׳", answer: "פרח", options: ["פרח", "מים", "כיסא", "עץ"] },
  ];
  sortLetters.forEach((spec, i) => {
    tasks.push(sortLetterTask(`wd-e-sl-${i + 1}`, `תיק #${i + 24}`, spec));
  });

  return tasks;
}

/** @returns {DetectiveTask[]} */
function buildMediumDetectiveTasks() {
  /** @type {DetectiveTask[]} */
  const tasks = [];

  const fillSentences = [
    { sentence: "הילדה ___ ספר", answer: "קוראת", options: ["קוראת", "רצה", "כחול", "שולחן"] },
    { sentence: "הגשם ירד - לקחתי ___", answer: "מטרייה", options: ["מטרייה", "גלידה", "כדור", "ספר"] },
    { sentence: "היה קר - לבשתי ___", answer: "מעיל", options: ["מעיל", "בגד ים", "כובע קיץ", "גלידה"] },
    { sentence: "אמא ___ אוכל", answer: "מבשלת", options: ["מבשלת", "רצה", "כחול", "גשם"] },
    { sentence: "הכלב ___ בגינה", answer: "רץ", options: ["רץ", "ירוק", "שולחן", "ספר"] },
    { sentence: "השמש ___ בחוץ", answer: "זורחת", options: ["זורחת", "שותה", "כחול", "ענן"] },
  ];
  fillSentences.forEach((spec, i) => {
    tasks.push(fillSentenceTask(`wd-m-fs-${i + 1}`, `תיק #${i + 1}`, spec));
  });

  const plurals = [
    { base: "ילד", answer: "ילדים", options: ["ילדים", "ילדה", "ילדות", "ילד"] },
    { base: "ספר", answer: "ספרים", options: ["ספרים", "ספרה", "ספרות", "ספר"] },
    { base: "כלב", answer: "כלבים", options: ["כלבים", "כלבה", "כלבות", "כלב"] },
    { base: "פרח", answer: "פרחים", options: ["פרחים", "פרחה", "פרחות", "פרח"] },
    { base: "כיסא", answer: "כיסאות", options: ["כיסאות", "כיסא", "כיסאה", "כיסאים"] },
    { base: "עץ", answer: "עצים", options: ["עצים", "עץ", "עצה", "עצות"] },
  ];
  plurals.forEach((spec, i) => {
    tasks.push(sortPluralTask(`wd-m-sp-${i + 1}`, `תיק #${i + 7}`, spec));
  });

  const genders = [
    { base: "גדול", answer: "גדולה", options: ["גדולה", "גדולים", "גדל", "גדול"] },
    { base: "חכם", answer: "חכמה", options: ["חכמה", "חכמים", "חכמו", "חכם"] },
    { base: "חמוד", answer: "חמודה", options: ["חמודה", "חמודים", "חמוד", "חמדה"] },
    { base: "קטן", answer: "קטנה", options: ["קטנה", "קטנים", "קטן", "קטנטן"] },
    { base: "חזק", answer: "חזקה", options: ["חזקה", "חזקים", "חזק", "חוזק"] },
    { base: "עייף", answer: "עייפה", options: ["עייפה", "עייפים", "עייף", "עייפות"] },
  ];
  genders.forEach((spec, i) => {
    tasks.push(sortGenderTask(`wd-m-sg-${i + 1}`, `תיק #${i + 13}`, spec));
  });

  const mediumReplacements = [
    {
      taskType: "fill_sentence",
      sentence: "הילד ___ מים",
      answer: "שותה",
      options: ["שותה", "רץ", "כחול", "שולחן"],
    },
    {
      taskType: "fill_sentence",
      sentence: "הכלב ___ על הרצפה",
      answer: "ישן",
      options: ["ישן", "רץ", "ירוק", "שולחן"],
    },
    {
      taskType: "sort_plural",
      base: "תפוח",
      answer: "תפוחים",
      options: ["תפוחים", "תפוח", "תפוחה", "תפוחות"],
    },
    {
      taskType: "sort_plural",
      base: "שולחן",
      answer: "שולחנות",
      options: ["שולחנות", "שולחן", "שולחנה", "שולחנים"],
    },
    {
      taskType: "sort_gender",
      base: "חדש",
      answer: "חדשה",
      options: ["חדשה", "חדשים", "חדש", "חדשות"],
    },
    {
      taskType: "meaning_word",
      word: "לח",
      answer: "רטוב",
      options: ["רטוב", "יבש", "חם מאוד", "קר מדי"],
    },
  ];
  mediumReplacements.forEach((entry, i) => {
    const id = `wd-m-wf-${i + 1}`;
    const caseLabel = `תיק #${i + 19}`;
    const { taskType, ...spec } = entry;
    if (taskType === "fill_sentence") tasks.push(fillSentenceTask(id, caseLabel, spec));
    else if (taskType === "sort_plural") tasks.push(sortPluralTask(id, caseLabel, spec));
    else if (taskType === "sort_gender") tasks.push(sortGenderTask(id, caseLabel, spec));
    else if (taskType === "meaning_word") tasks.push(meaningWordTask(id, caseLabel, spec));
  });

  const meanings = [
    { word: "שמח", answer: "מרגיש טוב", options: ["מרגיש טוב", "ישן", "אוכל", "רץ"] },
    { word: "עייף", answer: "צריך מנוחה", options: ["צריך מנוחה", "רעב", "שמח", "קופץ"] },
    { word: "רעב", answer: "רוצה לאכול", options: ["רוצה לאכול", "רוצה לישון", "רוצה לרקוד", "רוצה לשחק"] },
    { word: "אמיץ", answer: "לא מפחד", options: ["לא מפחד", "מפחד", "ישן", "אוכל"] },
    { word: "נדיב", answer: "נותן לאחרים", options: ["נותן לאחרים", "לוקח הכל", "בוכה", "צוחק"] },
    { word: "זהיר", answer: "שומר על עצמו", options: ["שומר על עצמו", "נופל", "רץ מהר", "צועק"] },
  ];
  meanings.forEach((spec, i) => {
    tasks.push(meaningWordTask(`wd-m-mw-${i + 1}`, `תיק #${i + 25}`, spec));
  });

  return tasks;
}

/** @returns {DetectiveTask[]} */
function buildHardDetectiveTasks() {
  /** @type {DetectiveTask[]} */
  const tasks = [];

  const events = [
    {
      passage: "דני יצא מהבית. הלך לגן ושיחק. אחר כך חזר לארוחת צהריים.",
      labels: ["יצא מהבית", "שיחק בגן", "חזר לארוחה", "הלך לישון"],
      answerIds: ["p1", "p2", "p3"],
    },
    {
      passage: "הגשם ירד. הילדים שיחקו בבית. אחרי הגשם יצאה קשת.",
      labels: ["ירד גשם", "שיחקו בבית", "יצאה קשת", "הלכו לים"],
      answerIds: ["p1", "p2", "p3"],
    },
    {
      passage: "מיה קמה בבוקר. אכלה ארוחת בוקר. לבשה תיק ויצאה לבית הספר.",
      labels: ["קמה בבוקר", "אכלה ארוחה", "יצאה לבית הספר", "הלכה לים"],
      answerIds: ["p1", "p2", "p3"],
    },
    {
      passage: "יואב שתה מים. התלבש ויצא. רכב על אופניים לגן.",
      labels: ["שתה מים", "יצא מהבית", "רכב לגן", "קנה נעליים"],
      answerIds: ["p1", "p2", "p3"],
    },
    {
      passage: "אמא הדליקה תנור. אפתה עוגה. כולם אכלו יחד.",
      labels: ["הדליקה תנור", "אפתה עוגה", "אכלו יחד", "הלכו לקניות"],
      answerIds: ["p1", "p2", "p3"],
    },
    {
      passage: "השמש שקעה. הכוכבים הופיעו. הילדים הלכו לישון.",
      labels: ["השמש שקעה", "הכוכבים הופיעו", "הלכו לישון", "יצאו לטיול"],
      answerIds: ["p1", "p2", "p3"],
    },
    {
      passage: "נועה פתחה ספר. קראה שני עמודים. סגרה ושמרה על המדף.",
      labels: ["פתחה ספר", "קראה עמודים", "שמרה על המדף", "ציירה תמונה"],
      answerIds: ["p1", "p2", "p3"],
    },
    {
      passage: "הרוח נשבה חזק. העלים נשרו. אחר כך ירד גשם קל.",
      labels: ["הרוח נשבה", "העלים נשרו", "ירד גשם", "יצאה שמש"],
      answerIds: ["p1", "p2", "p3"],
    },
  ];
  events.forEach((spec, i) => {
    tasks.push(eventOrderTask(`wd-h-eo-${i + 1}`, `תיק #${i + 1}`, spec));
  });

  const titles = [
    {
      passage: "מיה אהבה לקרוא ספרים. כל ערב ישבה בפינה עם ספר חדש.",
      answer: "מיה אוהבת לקרוא",
      options: ["מיה אוהבת לקרוא", "מיה הולכת לים", "מיה קונה נעליים", "יום גשום"],
    },
    {
      passage: "יואב למד לרכוב על אופניים. בהתחלה נפל, אבל המשיך. בסוף רכב לבד.",
      answer: "יואב לומד לרכוב",
      options: ["יואב לומד לרכוב", "יואב קונה בגדים", "יואב אוכל צהריים", "טיול ביער"],
    },
    {
      passage: "הגשם ירד חזק. הילדים שיחקו במשחקי קופסה. אחרי הגשם יצאה קשת.",
      answer: "יום גשום ומשחקים",
      options: ["יום גשום ומשחקים", "טיול ביער", "קנייה בחנות", "שיעור שחייה"],
    },
    {
      passage: "דני טיפל בגינה. השקה פרחים וקצץ עשב. הגינה נראתה יפה.",
      answer: "דני בגינה",
      options: ["דני בגינה", "דני בים", "דני בחנות", "דני בבית הספר"],
    },
    {
      passage: "המשפחה הכינה פיצה ביחד. כל אחד בחר תוספת. אכלו יחד בשמחה.",
      answer: "ערב פיצה במשפחה",
      options: ["ערב פיצה במשפחה", "בוקר בבית הספר", "טיול בהרים", "קנייה בחנות"],
    },
    {
      passage: "נועה למדה שיר חדש. חזרה עליו שוב ושוב. שרה בפני הכיתה.",
      answer: "נועה לומדת שיר",
      options: ["נועה לומדת שיר", "נועה קונה שעון", "נועה רוקדת", "נועה ישנה"],
    },
    {
      passage: "החתול ישן על הספה. התעורר, אכל וחזר לישון. היה יום שקט.",
      answer: "יום של חתול",
      options: ["יום של חתול", "יום של כלב", "יום בים", "יום בחנות"],
    },
  ];
  titles.forEach((spec, i) => {
    tasks.push(titleStampTask(`wd-h-ts-${i + 1}`, `תיק #${i + 9}`, spec));
  });

  const conclusions = [
    {
      passage: "דני יצא מהבית עם תיק. הלך לגן ושיחק עם חברים. אחר כך חזר הביתה לארוחת צהריים.",
      question: "למה דני חזר הביתה?",
      answer: "לארוחת צהריים",
      options: ["לארוחת צהריים", "לישון", "לקנות נעליים", "לשחות בים"],
    },
    {
      passage: "הגשם ירד חזק. הילדים נשארו בבית ושיחקו במשחקי קופסה.",
      question: "מה אפשר להבין מהקטע?",
      answer: "נשארו בבית בגלל הגשם",
      options: ["נשארו בבית בגלל הגשם", "שחו בים", "טסו לחו״ל", "קנו אופניים"],
    },
    {
      passage: "סבתא ביקשה עזרה בשוק. נועה ליוותה אותה וסייעה לשאת שקיות.",
      question: "מי עזר לסבתא?",
      answer: "נועה",
      options: ["נועה", "הכלב", "השכן", "אף אחד"],
    },
    {
      passage: "יואב נפל מהאופניים אבל המשיך להתאמן עד שרכב לבד.",
      question: "מה למדנו על יואב?",
      answer: "הוא לא ויתר",
      options: ["הוא לא ויתר", "הוא מכר את האופניים", "הוא נשאר בבית", "הוא פחד ממים"],
    },
    {
      passage: "המורה סיפרה סיפור. הילדים הקשיבו בשקט. בסוף כולם מחאו כפיים.",
      question: "איך הגיבו הילדים?",
      answer: "מחאו כפיים",
      options: ["מחאו כפיים", "בכו", "יצאו החוצה", "ישנו"],
    },
    {
      passage: "הכלב חיכה ליד הדלת. כשדני חזר, זנבו כעכב בשמחה.",
      question: "איך הרגיש הכלב?",
      answer: "שמח לראות את דני",
      options: ["שמח לראות את דני", "כועס", "עייף", "רעב מאוד"],
    },
    {
      passage: "אמא הכינה מרק. כולם ישבו לשולחן. אכלו ביחד בחום.",
      question: "מה עשתה המשפחה?",
      answer: "אכלה יחד",
      options: ["אכלה יחד", "יצאה לטיול", "צפתה בטלוויזיה", "שיחקה בחוץ"],
    },
    {
      passage: "הילדים שתלו עציץ. השקו אותו כל יום. אחרי שבועיים צמח פרח.",
      question: "מה קרה לעציץ?",
      answer: "צמח פרח",
      options: ["צמח פרח", "נשבר", "נעלם", "התייבש"],
    },
  ];
  conclusions.forEach((spec, i) => {
    tasks.push(conclusionTask(`wd-h-co-${i + 1}`, `תיק #${i + 16}`, spec));
  });

  const meaningPassages = [
    {
      passage: "יואב למד לרכוב. נפל, אבל המשיך להתאמן. בסוף רכב לבד.",
      word: "התאמן",
      answer: "תרגל שוב ושוב",
      options: ["תרגל שוב ושוב", "ישן", "אכל", "רקד"],
    },
    {
      passage: "הילדה חייכה לכולם. עזרה לחברה שנפלה. כולם אהבו אותה.",
      word: "נדיבה",
      answer: "עוזרת לאחרים",
      options: ["עוזרת לאחרים", "בוכה", "צועקת", "בורחת"],
    },
    {
      passage: "הוא הסתכל סביב בזהירות. חיכה לפני שחצה את הכביש.",
      word: "זהיר",
      answer: "שומר על עצמו",
      options: ["שומר על עצמו", "רץ מהר", "צועק", "ישן"],
    },
    {
      passage: "היא לא ויתרה על החידה. ניסתה שוב ושוב עד שנפתרה.",
      word: "התמדה",
      answer: "המשיכה לנסות",
      options: ["המשיכה לנסות", "ויתרה מיד", "הלכה לישון", "אכלה"],
    },
    {
      passage: "הוא שיתף את הממתקים עם כולם. לא שמר לעצמו.",
      word: "שיתף",
      answer: "נתן גם לאחרים",
      options: ["נתן גם לאחרים", "אכל הכל", "זרק", "הסתיר"],
    },
    {
      passage: "היא הקשיבה בשקט. לא הפריעה לחברים.",
      word: "מכבדת",
      answer: "מתחשבת באחרים",
      options: ["מתחשבת באחרים", "צועקת", "בורחת", "ישנה"],
    },
    {
      passage: "הוא סידר את החדר לפני שיצא. הכל היה במקום.",
      word: "מסודר",
      answer: "דואג שהכל במקום",
      options: ["דואג שהכל במקום", "זורק הכל", "ישן", "אוכל"],
    },
  ];
  meaningPassages.forEach((spec, i) => {
    tasks.push(meaningPassageTask(`wd-h-me-${i + 1}`, `תיק #${i + 24}`, spec));
  });

  return tasks;
}

/** @type {Record<DifficultyId, DetectiveTask[]>} */
export const WORD_DETECTIVE_TASKS = {
  easy: buildEasyDetectiveTasks(),
  medium: buildMediumDetectiveTasks(),
  hard: buildHardDetectiveTasks(),
};

/** @param {DetectiveTask} task @param {Record<string, string>} zoneFills zoneId -> pieceId */
export function validateDetectiveTask(task, zoneFills) {
  for (const [zoneId, pieceId] of Object.entries(task.solution)) {
    if (zoneFills[zoneId] !== pieceId) return false;
  }
  return Object.keys(task.solution).every((z) => zoneFills[z]);
}

/** @param {boolean} ok */
export function detectiveFeedback(ok) {
  return ok ? "🔖 התיק נפתר!" : "הראיה לא מתאימה - נסו שוב";
}

/** @param {DifficultyId} difficulty */
export function pickWordDetectiveSession(difficulty) {
  const pool = WORD_DETECTIVE_TASKS[difficulty] ?? WORD_DETECTIVE_TASKS.easy;
  return planLanguageSession(pool, LANGUAGE_SESSION_TASKS);
}

/** @param {DetectiveTask[]} tasks */
function countByType(tasks) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const task of tasks) {
    counts[task.taskType] = (counts[task.taskType] ?? 0) + 1;
  }
  return counts;
}

/** @returns {{ totals: Record<DifficultyId, number>, byType: Record<DifficultyId, Record<string, number>>, gaps: string[] }} */
export function auditWordDetectiveContent() {
  /** @type {string[]} */
  const gaps = [];
  /** @type {Record<DifficultyId, number>} */
  const totals = { easy: 0, medium: 0, hard: 0 };
  /** @type {Record<DifficultyId, Record<string, number>>} */
  const byType = { easy: {}, medium: {}, hard: {} };
  /** @type {Set<string>} */
  const seenIds = new Set();

  for (const level of /** @type {DifficultyId[]} */ (["easy", "medium", "hard"])) {
    const tasks = WORD_DETECTIVE_TASKS[level];
    totals[level] = tasks.length;
    byType[level] = countByType(tasks);

    if (tasks.length < LANGUAGE_MIN_POOL_PER_LEVEL) {
      gaps.push(`רמת ${level}: ${tasks.length}/${LANGUAGE_MIN_POOL_PER_LEVEL} משימות`);
    }

    for (const task of tasks) {
      if (seenIds.has(task.id)) gaps.push(`${task.id}: id כפול`);
      seenIds.add(task.id);

      if (task.level !== level) gaps.push(`${task.id}: level לא תואם`);
      if (task.taskType !== task.type) gaps.push(`${task.id}: taskType/type לא תואמים`);
      if (task.prompt !== task.missionHe) gaps.push(`${task.id}: prompt/missionHe לא תואמים`);
      if (task.gradeBand !== GRADE_BANDS[level]) gaps.push(`${task.id}: gradeBand שגוי`);
      if (!task.correctAnswer) gaps.push(`${task.id}: חסר correctAnswer`);
      if (!task.feedbackShort) gaps.push(`${task.id}: חסר feedbackShort`);

      const type = task.taskType;
      if (level === "easy") {
        if (!EASY_TYPES.has(type)) gaps.push(`${task.id}: סוג ${type} לא מותר ברמה קלה`);
        if (task.passage) gaps.push(`${task.id}: passage אסור ברמה קלה`);
        if (type === "fill_sentence") gaps.push(`${task.id}: fill_sentence אסור ברמה קלה`);
        if (task.missionHe.length > MAX_EASY_MISSION_CHARS) {
          gaps.push(`${task.id}: משימה ארוכה מדי לרמה קלה`);
        }
      }
      if (level === "medium") {
        if (!MEDIUM_TYPES.has(type)) gaps.push(`${task.id}: סוג ${type} לא מותר ברמה בינונית`);
        if (type === "word_family") gaps.push(`${task.id}: word_family אסור ברמה בינונית`);
        if (task.passage) gaps.push(`${task.id}: passage אסור ברמה בינונית`);
        if (type === "meaning_word") {
          const match = task.missionHe.match(/מה הפירוש של "(.+?)"\?/);
          if (match) {
            const word = match[1];
            const lexiconAnswer = MEANING_WORD_LEXICON[word];
            if (lexiconAnswer === undefined) {
              gaps.push(`${task.id}: "${word}" חסר ב-MEANING_WORD_LEXICON`);
            } else if (task.correctAnswer !== lexiconAnswer) {
              gaps.push(`${task.id}: פירוש "${word}" (${task.correctAnswer}) לא תואם ללקסיקון (${lexiconAnswer})`);
            }
          }
        }
      }
      if (level === "hard") {
        if (!HARD_TYPES.has(type)) gaps.push(`${task.id}: סוג ${type} לא מותר ברמה קשה`);
        if (!task.passage) gaps.push(`${task.id}: חסר passage ברמה קשה`);
        if (task.passage && countSentences(task.passage) > MAX_HARD_PASSAGE_SENTENCES) {
          gaps.push(`${task.id}: passage ארוך מדי (${countSentences(task.passage)} משפטים)`);
        }
      }
    }
  }

  return { totals, byType, gaps };
}
