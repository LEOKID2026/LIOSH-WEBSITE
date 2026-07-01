/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/**
 * @typedef {Object} WordTrainTask
 * @property {string} id
 * @property {'case_match'|'first_letter'|'fill_letter'|'image_word'|'build_word'|'phrase_pick'|'hebrew_match'|'fill_sentence'|'sentence_order'|'sentence_image'|'context_pick'} type
 * @property {string} promptHe
 * @property {string} [emoji]
 * @property {string} [word]
 * @property {string} [hebrewHint]
 * @property {string} [template]
 * @property {string[]} [letters]
 * @property {string[]} [words]
 * @property {string[]} [options]
 * @property {number} [correctIndex]
 * @property {string} [sentenceTemplate]
 */

import { LANGUAGE_PROTOTYPE_TASKS, shuffleTasks } from "../shared/language-prototype-config.js";

/** @type {Record<DifficultyId, WordTrainTask[]>} */
export const WORD_TRAIN_TASKS = {
  easy: [
    {
      id: "e1",
      type: "case_match",
      promptHe: "בחרו את האות הקטנה של B",
      word: "b",
      options: ["b", "B", "d", "p"],
      correctIndex: 0,
    },
    {
      id: "e2",
      type: "case_match",
      promptHe: "בחרו את האות הקטנה של C",
      word: "c",
      options: ["c", "C", "e", "o"],
      correctIndex: 0,
    },
    {
      id: "e3",
      type: "first_letter",
      promptHe: "איזו אות מתחילה את המילה cat?",
      word: "cat",
      options: ["c", "t", "a", "g"],
      correctIndex: 0,
    },
    {
      id: "e4",
      type: "first_letter",
      promptHe: "איזו אות מתחילה את המילה dog?",
      word: "dog",
      options: ["d", "o", "g", "b"],
      correctIndex: 0,
    },
    {
      id: "e5",
      type: "fill_letter",
      promptHe: "השלימו את האות החסרה",
      template: "d_g",
      word: "dog",
      letters: ["o", "a", "e", "u", "i"],
    },
    {
      id: "e6",
      type: "fill_letter",
      promptHe: "השלימו את האות החסרה",
      template: "c_t",
      word: "cat",
      letters: ["a", "o", "e", "u", "i"],
    },
    {
      id: "e7",
      type: "image_word",
      promptHe: "התאימו מילה לתמונה",
      emoji: "🐶",
      word: "dog",
      letters: ["d", "o", "g", "b", "s", "n"],
    },
    {
      id: "e8",
      type: "image_word",
      promptHe: "התאימו מילה לתמונה",
      emoji: "🐱",
      word: "cat",
      letters: ["c", "a", "t", "b", "r", "m"],
    },
    {
      id: "e9",
      type: "image_word",
      promptHe: "התאימו מילה לתמונה",
      emoji: "☀️",
      word: "sun",
      letters: ["s", "u", "n", "m", "p", "b"],
    },
    {
      id: "e10",
      type: "build_word",
      promptHe: "בנו מילה מ־3 אותיות",
      emoji: "🔴",
      word: "red",
      letters: ["r", "e", "d", "b", "l", "t"],
    },
  ],
  medium: [
    {
      id: "m1",
      type: "build_word",
      promptHe: "בנו את המילה milk",
      emoji: "🥛",
      word: "milk",
      letters: ["m", "i", "l", "k", "a", "e"],
    },
    {
      id: "m2",
      type: "build_word",
      promptHe: "בנו את המילה book",
      emoji: "📚",
      word: "book",
      letters: ["b", "o", "o", "k", "r", "t"],
    },
    {
      id: "m3",
      type: "phrase_pick",
      promptHe: "בחרו את הצירוף הנכון",
      options: ["red hat", "red dog", "blue hat", "green bag"],
      correctIndex: 0,
    },
    {
      id: "m4",
      type: "phrase_pick",
      promptHe: "בחרו את הצירוף הנכון",
      options: ["blue bag", "red milk", "green sun", "yellow book"],
      correctIndex: 0,
    },
    {
      id: "m5",
      type: "fill_letter",
      promptHe: "השלימו: sh_rt",
      template: "sh_rt",
      word: "shirt",
      letters: ["i", "a", "e", "o", "u"],
    },
    {
      id: "m6",
      type: "hebrew_match",
      promptHe: "בחרו את המילה school",
      hebrewHint: "בית ספר",
      word: "school",
      options: ["school", "milk", "chair", "apple"],
      correctIndex: 0,
    },
    {
      id: "m7",
      type: "image_word",
      promptHe: "בחרו מילה שמתאימה לתמונה",
      emoji: "🍎",
      word: "apple",
      letters: ["a", "p", "p", "l", "e", "o", "r"],
    },
    {
      id: "m8",
      type: "build_word",
      promptHe: "בנו מילה מ־5 אותיות",
      emoji: "🟢",
      word: "green",
      letters: ["g", "r", "e", "e", "n", "a", "t"],
    },
    {
      id: "m9",
      type: "hebrew_match",
      promptHe: "התאימו מילה בעברית לאנגלית",
      hebrewHint: "כיסא",
      word: "chair",
      options: ["table", "chair", "water"],
      correctIndex: 1,
    },
    {
      id: "m10",
      type: "build_word",
      promptHe: "בנו מילה מ־4 אותיות",
      emoji: "🪑",
      word: "desk",
      letters: ["d", "e", "s", "k", "r", "t"],
    },
  ],
  hard: [
    {
      id: "h1",
      type: "fill_sentence",
      promptHe: "I drink ___.",
      sentenceTemplate: "I drink ___",
      word: "milk",
      options: ["milk", "table", "run"],
      correctIndex: 0,
    },
    {
      id: "h2",
      type: "fill_sentence",
      promptHe: "The cat is ___.",
      sentenceTemplate: "The cat is ___",
      word: "small",
      options: ["small", "milk", "jump"],
      correctIndex: 0,
    },
    {
      id: "h3",
      type: "sentence_order",
      promptHe: "סדרו: I / like / pizza",
      words: ["I", "like", "pizza"],
      word: "I like pizza",
    },
    {
      id: "h4",
      type: "sentence_order",
      promptHe: "סדרו: The / dog / runs",
      words: ["The", "dog", "runs"],
      word: "The dog runs",
    },
    {
      id: "h5",
      type: "context_pick",
      promptHe: "בחרו מילה שמתאימה למשפט",
      sentenceTemplate: "It is raining. I need a ___.",
      options: ["umbrella", "pizza", "book"],
      correctIndex: 0,
    },
    {
      id: "h6",
      type: "sentence_image",
      promptHe: "בחרו משפט שמתאים לתמונה",
      emoji: "🐱",
      options: ["I see a cat", "I like milk", "The dog runs"],
      correctIndex: 0,
    },
    {
      id: "h7",
      type: "sentence_order",
      promptHe: "סדרו מילים למשפט קצר",
      words: ["She", "likes", "red"],
      word: "She likes red",
    },
    {
      id: "h8",
      type: "fill_sentence",
      promptHe: "I ___ a cat",
      sentenceTemplate: "I ___ a cat",
      word: "see",
      options: ["see", "milk", "chair"],
      correctIndex: 0,
    },
    {
      id: "h9",
      type: "sentence_image",
      promptHe: "בחרו משפט שמתאים לתמונה",
      emoji: "📚",
      options: ["I read a book", "I eat apple", "I see sun"],
      correctIndex: 0,
    },
    {
      id: "h10",
      type: "context_pick",
      promptHe: "בחרו מילה שמתאימה למשפט",
      sentenceTemplate: "I am hungry. I want ___.",
      options: ["food", "sleep", "rain"],
      correctIndex: 0,
    },
  ],
};

/** @param {WordTrainTask} task */
export function trainSlotsCount(task) {
  if (task.type === "build_word" || task.type === "image_word" || task.type === "fill_letter") {
    return (task.word ?? "").length;
  }
  if (task.type === "sentence_order") return (task.words ?? []).length;
  return 0;
}

/** @param {WordTrainTask} task */
export function letterBankForTask(task) {
  if (task.letters) return shuffleTasks(task.letters);
  if (task.type === "sentence_order") return shuffleTasks([...(task.words ?? [])]);
  if (!task.word) return [];
  const w = task.word.toLowerCase().replace(/\s/g, "");
  const extras = "abcdefghijklmnopqrstuvwxyz".split("").filter((c) => !w.includes(c));
  return shuffleTasks([...w.split(""), ...extras.slice(0, 3)]);
}

/** @param {WordTrainTask} task @param {string} built @param {number|null} selected */
export function validateTrainTask(task, built, selected) {
  if (
    [
      "case_match",
      "first_letter",
      "hebrew_match",
      "fill_sentence",
      "sentence_image",
      "phrase_pick",
      "context_pick",
    ].includes(task.type)
  ) {
    return selected === task.correctIndex;
  }
  if (["image_word", "build_word", "fill_letter", "sentence_order"].includes(task.type)) {
    return built.toLowerCase().trim() === (task.word ?? "").toLowerCase().trim();
  }
  return false;
}

export function trainFeedback(ok) {
  return ok ? "מעולה! הרכבת יצאה לדרך 🚂" : "כמעט — בדקו את האותיות או הבחירה";
}

/** @param {DifficultyId} difficulty */
export function pickWordTrainTasks(difficulty) {
  const pool = WORD_TRAIN_TASKS[difficulty] ?? WORD_TRAIN_TASKS.easy;
  return shuffleTasks(pool).slice(0, LANGUAGE_PROTOTYPE_TASKS);
}
