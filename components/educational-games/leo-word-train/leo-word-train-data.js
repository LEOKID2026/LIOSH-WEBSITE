/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/**
 * @typedef {{ id: string, hint?: string, kind: 'fixed'|'slot', content?: string, emoji?: string }} TrainCarriage
 * @typedef {{ id: string, label: string, emoji?: string }} TrainPiece
 * @typedef {{
 *   id: string,
 *   level: DifficultyId,
 *   taskType: string,
 *   type: string,
 *   prompt: string,
 *   stationLabel: string,
 *   missionHe: string,
 *   emoji?: string,
 *   carriages: TrainCarriage[],
 *   pieces: TrainPiece[],
 *   solution: Record<string, string>,
 *   correctAnswer: string,
 *   feedbackShort: string,
 *   gradeBand: string,
 *   difficultyWeight: number,
 * }} TrainTask
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

const EASY_TYPES = new Set(["upper_to_lower", "lower_to_upper", "first_letter", "one_gap"]);
const EASY_BANNED = new Set([
  "build_word",
  "fill_gaps",
  "dual_phrase",
  "image_word",
  "word_order",
  "sentence_gap",
  "context_word",
  "image_sentence",
]);

const MEDIUM_TYPES = new Set(["build_word", "fill_gaps", "dual_phrase", "image_word"]);
const HARD_TYPES = new Set(["word_order", "sentence_gap", "context_word", "image_sentence"]);

const DIFFICULTY_WEIGHT = {
  upper_to_lower: 12,
  lower_to_upper: 14,
  first_letter: 22,
  one_gap: 28,
  build_word: 42,
  fill_gaps: 48,
  dual_phrase: 55,
  image_word: 50,
  word_order: 72,
  sentence_gap: 78,
  context_word: 85,
  image_sentence: 90,
};

/** @param {string[]} labels @param {number} extra */
function letterPieces(labels, extra = 3) {
  const pool = "abcdefghijklmnopqrstuvwxyz".split("");
  const distractors = shuffleLanguageTasks(pool.filter((c) => !labels.includes(c))).slice(0, extra);
  return shuffleLanguageTasks([...labels, ...distractors]).map((label, i) => ({
    id: `p${i}-${label}`,
    label,
  }));
}

/** @param {string} word @param {number} extra */
function wordPieces(word, extra = 2) {
  const extras = ["run", "milk", "book", "hat", "bag", "red", "blue", "cat", "dog", "sun", "pen", "box"].filter(
    (w) => w !== word && !word.includes(w),
  );
  return shuffleLanguageTasks([word, ...shuffleLanguageTasks(extras).slice(0, extra)]).map((label, i) => ({
    id: `w${i}-${label}`,
    label,
  }));
}

/** @param {Record<string, string>} solution */
function solutionToAnswer(solution) {
  return Object.values(solution).join("|").toLowerCase();
}

/**
 * @param {DifficultyId} level
 * @param {string} taskType
 * @param {Omit<TrainTask, 'level'|'taskType'|'type'|'prompt'|'correctAnswer'|'gradeBand'|'difficultyWeight'> & { missionHe: string }} base
 */
function wrapTrainTask(level, taskType, base) {
  return {
    ...base,
    level,
    taskType,
    type: taskType,
    prompt: base.missionHe,
    correctAnswer: solutionToAnswer(base.solution),
    gradeBand: GRADE_BANDS[level],
    difficultyWeight: DIFFICULTY_WEIGHT[taskType] ?? 50,
    feedbackShort: base.feedbackShort ?? "🚂 הרכבת יוצאת מהתחנה!",
  };
}

/** @param {string} letter */
function upperToLowerTask(id, stationLabel, letter) {
  const upper = letter.toUpperCase();
  const lower = letter.toLowerCase();
  return wrapTrainTask("easy", "upper_to_lower", {
    id,
    stationLabel,
    missionHe: `העמיסו אות קטנה ליד ${upper}`,
    carriages: [
      { id: "ref", kind: "fixed", content: upper },
      { id: "slot", kind: "slot" },
    ],
    pieces: letterPieces([lower], 3),
    solution: { slot: lower },
    feedbackShort: "מצוין! האות הקטנה עלה לקרון.",
  });
}

/** @param {string} letter */
function lowerToUpperTask(id, stationLabel, letter) {
  const upper = letter.toUpperCase();
  const lower = letter.toLowerCase();
  return wrapTrainTask("easy", "lower_to_upper", {
    id,
    stationLabel,
    missionHe: `העמיסו אות גדולה ליד ${lower}`,
    carriages: [
      { id: "ref", kind: "fixed", content: lower },
      { id: "slot", kind: "slot" },
    ],
    pieces: letterPieces([upper], 3),
    solution: { slot: upper },
    feedbackShort: "כל הכבוד! האות הגדולה במקום.",
  });
}

/** @param {string} word */
function firstLetterTask(id, stationLabel, word) {
  const letter = word[0].toLowerCase();
  return wrapTrainTask("easy", "first_letter", {
    id,
    stationLabel,
    missionHe: `איזו אות פותחת את ${word}?`,
    carriages: [
      { id: "word", kind: "fixed", content: word },
      { id: "slot", kind: "slot" },
    ],
    pieces: letterPieces([letter], 3),
    solution: { slot: letter },
    feedbackShort: "נכון! האות הראשונה על הקרון.",
  });
}

/** @param {string} word @param {number} blankIdx */
function oneMissingLetterTask(id, stationLabel, word, blankIdx) {
  const letters = word.split("");
  if (letters.length !== 3 || blankIdx < 0 || blankIdx > 2) {
    throw new Error(`easy gap word must be 3 letters: ${word}`);
  }
  return wrapTrainTask("easy", "one_gap", {
    id,
    stationLabel,
    missionHe: "מלאו אות אחת חסרה בקרון",
    carriages: letters.map((ch, i) =>
      i === blankIdx
        ? { id: `s${i}`, kind: "slot" }
        : { id: `s${i}`, kind: "fixed", content: ch },
    ),
    pieces: letterPieces([letters[blankIdx]], 4),
    solution: { [`s${blankIdx}`]: letters[blankIdx] },
    feedbackShort: "יופי! האות החסרה הושלמה.",
  });
}

/** @param {string} word */
function buildWordTask(id, stationLabel, missionHe, emoji, word) {
  const letters = word.split("");
  return wrapTrainTask("medium", "build_word", {
    id,
    stationLabel,
    missionHe,
    emoji,
    carriages: letters.map((_, i) => ({ id: `s${i}`, kind: "slot" })),
    pieces: letterPieces(letters, 4),
    solution: Object.fromEntries(letters.map((ch, i) => [`s${i}`, ch])),
    feedbackShort: "מעולה! בניתם את המילה על הקרונות.",
  });
}

/** @param {string} word @param {number[]} blankIdx */
function fillWordTask(id, stationLabel, missionHe, word, blankIdx, emoji) {
  const letters = word.split("");
  return wrapTrainTask("medium", "fill_gaps", {
    id,
    stationLabel,
    missionHe,
    emoji,
    carriages: letters.map((ch, i) =>
      blankIdx.includes(i)
        ? { id: `s${i}`, kind: "slot" }
        : { id: `s${i}`, kind: "fixed", content: ch },
    ),
    pieces: letterPieces(
      blankIdx.map((i) => letters[i]),
      4,
    ),
    solution: Object.fromEntries(blankIdx.map((i) => [`s${i}`, letters[i]])),
    feedbackShort: "נהדר! השלמתם את האותיות החסרות.",
  });
}

/** @param {{ color: string, noun: string, emoji?: string }} pair */
function dualPhraseTask(id, stationLabel, pair) {
  const { color, noun, emoji } = pair;
  return wrapTrainTask("medium", "dual_phrase", {
    id,
    stationLabel,
    missionHe: `העמיסו שני קרונות: ${color} + ${noun}`,
    emoji,
    carriages: [
      { id: "c1", kind: "slot", hint: "צבע" },
      { id: "c2", kind: "slot", hint: "חפץ" },
    ],
    pieces: shuffleLanguageTasks([
      { id: "r1", label: color },
      { id: "h1", label: noun },
      { id: "x1", label: color === "red" ? "blue" : "red" },
      { id: "x2", label: noun === "hat" ? "bag" : "hat" },
      { id: "x3", label: "book" },
    ]),
    solution: { c1: color, c2: noun },
    feedbackShort: "שני הקרונות במקום — יוצאים!",
  });
}

/** @param {string} word @param {string} emoji */
function imageWordTask(id, stationLabel, word, emoji) {
  return wrapTrainTask("medium", "image_word", {
    id,
    stationLabel,
    missionHe: "העמיסו את המילה שמתאימה לתמונה",
    emoji,
    carriages: [{ id: "slot", kind: "slot", emoji }],
    pieces: wordPieces(word, 3),
    solution: { slot: word },
    feedbackShort: "המילה הנכונה על הקרון!",
  });
}

/** @param {string[]} words */
function wordOrderTask(id, stationLabel, missionHe, words, distractor) {
  const slots = words.map((_, i) => ({ id: `w${i}`, kind: /** @type {'slot'} */ ("slot"), hint: String(i + 1) }));
  const pieces = shuffleLanguageTasks([
    ...words.map((label, i) => ({ id: `a${i}`, label })),
    { id: "d", label: distractor },
  ]);
  return wrapTrainTask("hard", "word_order", {
    id,
    stationLabel,
    missionHe,
    carriages: slots,
    pieces,
    solution: Object.fromEntries(words.map((w, i) => [`w${i}`, w])),
    feedbackShort: "סדר המילים נכון — הרכבת יוצאת!",
  });
}

/** @param {string} word @param {string[]} prefix @param {string} suffix */
function sentenceGapTask(id, stationLabel, missionHe, prefix, gapWord, suffix, distractorWords) {
  /** @type {TrainCarriage[]} */
  const carriages = [];
  prefix.forEach((content, i) => {
    carriages.push({ id: `p${i}`, kind: "fixed", content });
  });
  carriages.push({ id: "gap", kind: "slot" });
  suffix.forEach((content, i) => {
    carriages.push({ id: `s${i}`, kind: "fixed", content });
  });
  return wrapTrainTask("hard", "sentence_gap", {
    id,
    stationLabel,
    missionHe,
    carriages,
    pieces: wordPieces(gapWord, 3),
    solution: { gap: gapWord },
    feedbackShort: "המילה החסרה במקום!",
  });
}

/** @param {string} clue @param {string} word */
function contextWordTask(id, stationLabel, clue, word) {
  return wrapTrainTask("hard", "context_word", {
    id,
    stationLabel,
    missionHe: `${clue} — העמיסו מילת הקשר`,
    carriages: [
      { id: "p1", kind: "fixed", content: clue.split(" ")[0] ?? clue },
      { id: "gap", kind: "slot" },
    ],
    pieces: shuffleLanguageTasks([
      { id: "a", label: word },
      { id: "b", label: "sleep" },
      { id: "c", label: "rain" },
      { id: "d", label: "run" },
    ]),
    solution: { gap: word },
    feedbackShort: "מילת הקשר מתאימה לסיטואציה!",
  });
}

/** @param {string} emoji @param {string[]} words @param {string} distractor */
function imageSentenceTask(id, stationLabel, emoji, words, distractor) {
  return wrapTrainTask("hard", "image_sentence", {
    id,
    stationLabel,
    missionHe: "סדרו משפט שמתאר את התמונה",
    emoji,
    carriages: words.map((_, i) => ({ id: `w${i}`, kind: "slot", hint: String(i + 1) })),
    pieces: shuffleLanguageTasks([
      ...words.map((label, i) => ({ id: `a${i}`, label })),
      { id: "d", label: distractor },
    ]),
    solution: Object.fromEntries(words.map((w, i) => [`w${i}`, w])),
    feedbackShort: "המשפט מתאר את התמונה — יוצאים!",
  });
}

/** @returns {TrainTask[]} */
function buildEasyTrainTasks() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  /** @type {TrainTask[]} */
  const tasks = [];
  letters.slice(0, 8).forEach((letter, i) => {
    tasks.push(upperToLowerTask(`wt-e-u2l-${i + 1}`, `תחנה ${i + 1}`, letter));
  });
  letters.slice(0, 8).forEach((letter, i) => {
    tasks.push(lowerToUpperTask(`wt-e-l2u-${i + 1}`, `תחנה ${i + 9}`, letter.toLowerCase()));
  });
  const words3 = [
    "sun",
    "dog",
    "cat",
    "hat",
    "run",
    "pen",
    "box",
    "cup",
    "bus",
    "map",
    "red",
    "big",
    "top",
    "fun",
  ];
  words3.slice(0, 7).forEach((word, i) => {
    tasks.push(firstLetterTask(`wt-e-fl-${i + 1}`, `תחנה ${i + 17}`, word));
  });
  words3.slice(7, 14).forEach((word, i) => {
    tasks.push(oneMissingLetterTask(`wt-e-gap-${i + 1}`, `תחנה ${i + 24}`, word, i % 3));
  });
  return tasks;
}

/** @returns {TrainTask[]} */
function buildMediumTrainTasks() {
  const buildWords = [
    ["🥛", "milk"],
    ["📚", "book"],
    ["🪑", "chair"],
    ["📝", "desk"],
    ["💧", "water"],
    ["🏫", "school"],
    ["🟢", "green"],
    ["🍎", "apple"],
  ];
  /** @type {TrainTask[]} */
  const tasks = buildWords.map(([emoji, word], i) =>
    buildWordTask(`wt-m-bw-${i + 1}`, `תחנה ${i + 1}`, `בנו את המילה ${word}`, emoji, word),
  );

  const fillWords = [
    ["👕", "shirt", [2]],
    ["🪑", "table", [1]],
    ["⬛", "black", [2]],
    ["🚂", "train", [2]],
    ["☁️", "cloud", [2]],
    ["🍇", "grape", [2]],
    ["🏠", "house", [2]],
    ["💡", "light", [2]],
  ];
  fillWords.forEach(([emoji, word, blanks], i) => {
    tasks.push(
      fillWordTask(`wt-m-fg-${i + 1}`, `תחנה ${i + 9}`, `השלימו ${word} — אות חסרה`, word, blanks, emoji),
    );
  });

  const dualPairs = [
    { color: "red", noun: "hat", emoji: "🎩" },
    { color: "blue", noun: "bag", emoji: "👜" },
    { color: "green", noun: "tree", emoji: "🌳" },
    { color: "yellow", noun: "sun", emoji: "☀️" },
    { color: "black", noun: "cat", emoji: "🐈" },
    { color: "white", noun: "snow", emoji: "❄️" },
    { color: "brown", noun: "bear", emoji: "🐻" },
  ];
  dualPairs.forEach((pair, i) => {
    tasks.push(dualPhraseTask(`wt-m-dp-${i + 1}`, `תחנה ${i + 17}`, pair));
  });

  const imageWords = [
    ["🐕", "dog"],
    ["🐱", "cat"],
    ["🍕", "pizza"],
    ["🌸", "flower"],
    ["✏️", "pencil"],
    ["🎈", "balloon"],
    ["🚗", "car"],
  ];
  imageWords.forEach(([emoji, word], i) => {
    tasks.push(imageWordTask(`wt-m-iw-${i + 1}`, `תחנה ${i + 24}`, word, emoji));
  });

  return tasks;
}

/** @returns {TrainTask[]} */
function buildHardTrainTasks() {
  /** @type {TrainTask[]} */
  const tasks = [];

  const orders = [
    ["I / like / pizza", ["I", "like", "pizza"], "milk"],
    ["The / dog / runs", ["The", "dog", "runs"], "cat"],
    ["We / go / to / school", ["We", "go", "to", "school"], "home"],
    ["She / likes / red", ["She", "likes", "red"], "blue"],
    ["I / read / a / book", ["I", "read", "a", "book"], "milk"],
    ["He / eats / an / apple", ["He", "eats", "an", "apple"], "chair"],
    ["They / play / in / park", ["They", "play", "in", "park"], "desk"],
    ["My / cat / is / small", ["My", "cat", "is", "small"], "big"],
  ];
  orders.forEach(([label, words, dist], i) => {
    tasks.push(wordOrderTask(`wt-h-wo-${i + 1}`, `תחנה ${i + 1}`, `סדרו מילים — ${label}`, words, dist));
  });

  const gaps = [
    { mission: "I drink ___", prefix: ["I", "drink"], word: "milk", suffix: [] },
    { mission: "The cat is ___", prefix: ["The", "cat", "is"], word: "small", suffix: [] },
    { mission: "I ___ a cat", prefix: ["I"], word: "see", suffix: ["a", "cat"] },
    { mission: "The apple is ___", prefix: ["The", "apple", "is"], word: "red", suffix: [] },
    { mission: "We ___ pizza", prefix: ["We"], word: "eat", suffix: ["pizza"] },
    { mission: "She has a ___ bag", prefix: ["She", "has", "a"], word: "blue", suffix: ["bag"] },
    { mission: "It is ___ today", prefix: ["It", "is"], word: "cold", suffix: ["today"] },
    { mission: "They ___ books", prefix: ["They"], word: "read", suffix: ["books"] },
  ];
  gaps.forEach(({ mission, prefix, word, suffix }, i) => {
    tasks.push(
      sentenceGapTask(
        `wt-h-sg-${i + 1}`,
        `תחנה ${i + 9}`,
        `העמיסו מילה חסרה — ${mission}`,
        prefix,
        word,
        suffix,
        ["run", "sleep", "jump"],
      ),
    );
  });

  const contexts = [
    ["I am hungry", "food"],
    ["I am thirsty", "water"],
    ["It is raining", "umbrella"],
    ["I feel cold", "jacket"],
    ["The sun is hot", "hat"],
    ["I want to sleep", "bed"],
    ["We need light", "lamp"],
  ];
  contexts.forEach(([clue, word], i) => {
    tasks.push(contextWordTask(`wt-h-cw-${i + 1}`, `תחנה ${i + 17}`, clue, word));
  });

  const imageSentences = [
    ["🐕", ["The", "dog", "runs"], "milk"],
    ["🍎", ["I", "eat", "apple"], "chair"],
    ["☀️", ["The", "sun", "shines"], "rain"],
    ["📚", ["I", "read", "book"], "run"],
    ["🌧️", ["It", "is", "raining"], "snow"],
    ["🎂", ["We", "eat", "cake"], "fish"],
    ["🚌", ["The", "bus", "stops"], "fly"],
  ];
  imageSentences.forEach(([emoji, words, dist], i) => {
    tasks.push(imageSentenceTask(`wt-h-is-${i + 1}`, `תחנה ${i + 24}`, emoji, words, dist));
  });

  return tasks;
}

/** @type {Record<DifficultyId, TrainTask[]>} */
export const WORD_TRAIN_TASKS = {
  easy: buildEasyTrainTasks(),
  medium: buildMediumTrainTasks(),
  hard: buildHardTrainTasks(),
};

/** @param {TrainTask} task @param {Record<string, string>} fills */
export function validateTrainTask(task, fills) {
  for (const [carriageId, expected] of Object.entries(task.solution)) {
    if ((fills[carriageId] ?? "").toLowerCase() !== expected.toLowerCase()) return false;
  }
  const slotIds = task.carriages.filter((c) => c.kind === "slot").map((c) => c.id);
  for (const id of slotIds) {
    if (!fills[id]) return false;
  }
  return true;
}

/** @param {boolean} ok */
export function trainFeedback(ok) {
  return ok ? "🚂 הרכבת יוצאת מהתחנה!" : "הקרונות רועדים — בדקו שוב";
}

/** @param {DifficultyId} difficulty */
export function pickWordTrainSession(difficulty) {
  const pool = WORD_TRAIN_TASKS[difficulty] ?? WORD_TRAIN_TASKS.easy;
  return planLanguageSession(pool, LANGUAGE_SESSION_TASKS);
}

/** @param {TrainTask[]} tasks */
function countByType(tasks) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const task of tasks) {
    counts[task.taskType] = (counts[task.taskType] ?? 0) + 1;
  }
  return counts;
}

/** @returns {{ totals: Record<DifficultyId, number>, byType: Record<DifficultyId, Record<string, number>>, gaps: string[] }} */
export function auditWordTrainContent() {
  /** @type {string[]} */
  const gaps = [];
  /** @type {Record<DifficultyId, number>} */
  const totals = { easy: 0, medium: 0, hard: 0 };
  /** @type {Record<DifficultyId, Record<string, number>>} */
  const byType = { easy: {}, medium: {}, hard: {} };

  for (const level of /** @type {DifficultyId[]} */ (["easy", "medium", "hard"])) {
    const tasks = WORD_TRAIN_TASKS[level];
    totals[level] = tasks.length;
    byType[level] = countByType(tasks);

    if (tasks.length < LANGUAGE_MIN_POOL_PER_LEVEL) {
      gaps.push(`רמת ${level}: ${tasks.length}/${LANGUAGE_MIN_POOL_PER_LEVEL} משימות`);
    }

    for (const task of tasks) {
      if (task.level !== level) gaps.push(`${task.id}: level לא תואם`);
      if (task.taskType !== task.type) gaps.push(`${task.id}: taskType/type לא תואמים`);
      if (task.prompt !== task.missionHe) gaps.push(`${task.id}: prompt/missionHe לא תואמים`);
      if (task.gradeBand !== GRADE_BANDS[level]) gaps.push(`${task.id}: gradeBand שגוי`);
      if (!task.correctAnswer) gaps.push(`${task.id}: חסר correctAnswer`);
      if (!task.feedbackShort) gaps.push(`${task.id}: חסר feedbackShort`);
      if (typeof task.difficultyWeight !== "number") gaps.push(`${task.id}: חסר difficultyWeight`);

      const type = task.taskType;
      if (level === "easy") {
        if (!EASY_TYPES.has(type)) gaps.push(`${task.id}: סוג ${type} לא מותר ברמה קלה`);
        if (EASY_BANNED.has(type)) gaps.push(`${task.id}: סוג ${type} אסור ברמה קלה`);
      }
      if (level === "medium" && !MEDIUM_TYPES.has(type)) {
        gaps.push(`${task.id}: סוג ${type} לא מותר ברמה בינונית`);
      }
      if (level === "hard" && !HARD_TYPES.has(type)) {
        gaps.push(`${task.id}: סוג ${type} לא מותר ברמה קשה`);
      }
    }
  }

  return { totals, byType, gaps };
}
