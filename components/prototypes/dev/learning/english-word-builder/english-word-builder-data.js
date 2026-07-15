/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/**
 * @typedef {Object} TrainTask
 * @property {string} id
 * @property {'image_word'|'first_letter'|'build_word'|'hebrew_match'|'listen_pick'|'sentence_order'|'fill_sentence'|'sentence_image'} type
 * @property {string} promptHe
 * @property {string} [emoji]
 * @property {string} [word]
 * @property {string} [hebrewHint]
 * @property {string[]} [letters]
 * @property {string[]} [words]
 * @property {string[]} [options]
 * @property {number} [correctIndex]
 * @property {string} [sentenceTemplate]
 * @property {string} [missingWord]
 */

/** @type {Record<DifficultyId, TrainTask[]>} */
export const TRAIN_TASKS = {
  easy: [
    {
      id: "e1",
      type: "image_word",
      promptHe: "התאימו מילה לתמונה",
      emoji: "🐱",
      word: "cat",
    },
    {
      id: "e2",
      type: "image_word",
      promptHe: "התאימו מילה לתמונה",
      emoji: "🐶",
      word: "dog",
    },
    {
      id: "e3",
      type: "image_word",
      promptHe: "התאימו מילה לתמונה",
      emoji: "☀️",
      word: "sun",
    },
    {
      id: "e4",
      type: "image_word",
      promptHe: "התאימו מילה לתמונה",
      emoji: "🔴",
      word: "red",
    },
    {
      id: "e5",
      type: "first_letter",
      promptHe: "בחרו את האות הראשונה",
      word: "dog",
      options: ["d", "g", "o"],
      correctIndex: 0,
    },
    {
      id: "e6",
      type: "first_letter",
      promptHe: "בחרו את האות הראשונה",
      word: "cat",
      options: ["c", "t", "a"],
      correctIndex: 0,
    },
    {
      id: "e7",
      type: "build_word",
      promptHe: "בנו מילה מ-3 אותיות",
      emoji: "🐱",
      word: "cat",
      letters: ["c", "a", "t", "b", "r"],
    },
    {
      id: "e8",
      type: "build_word",
      promptHe: "בנו מילה מ-3 אותיות",
      emoji: "🐶",
      word: "dog",
      letters: ["d", "o", "g", "s", "n"],
    },
    {
      id: "e9",
      type: "build_word",
      promptHe: "בנו מילה מ-3 אותיות",
      emoji: "☀️",
      word: "sun",
      letters: ["s", "u", "n", "m", "p"],
    },
    {
      id: "e10",
      type: "first_letter",
      promptHe: "בחרו את האות הראשונה",
      word: "sun",
      options: ["s", "u", "n"],
      correctIndex: 0,
    },
    {
      id: "e11",
      type: "build_word",
      promptHe: "בנו מילה מ-3 אותיות",
      emoji: "🔴",
      word: "red",
      letters: ["r", "e", "d", "b", "l"],
    },
    {
      id: "e12",
      type: "image_word",
      promptHe: "התאימו מילה לתמונה",
      emoji: "🚌",
      word: "bus",
    },
  ],
  medium: [
    {
      id: "m1",
      type: "build_word",
      promptHe: "בנו מילה מ-4 אותיות",
      emoji: "🥛",
      word: "milk",
      letters: ["m", "i", "l", "k", "a", "e"],
    },
    {
      id: "m2",
      type: "build_word",
      promptHe: "בנו מילה מ-4 אותיות",
      emoji: "📚",
      word: "book",
      letters: ["b", "o", "o", "k", "r", "t"],
    },
    {
      id: "m3",
      type: "build_word",
      promptHe: "בנו מילה מ-5 אותיות",
      emoji: "🟢",
      word: "green",
      letters: ["g", "r", "e", "e", "n", "a", "t"],
    },
    {
      id: "m4",
      type: "hebrew_match",
      promptHe: "התאימו מילה בעברית לאנגלית",
      hebrewHint: "כלב",
      word: "dog",
      options: ["dog", "cat", "milk"],
      correctIndex: 0,
    },
    {
      id: "m5",
      type: "hebrew_match",
      promptHe: "התאימו מילה בעברית לאנגלית",
      hebrewHint: "חלב",
      word: "milk",
      options: ["book", "milk", "chair"],
      correctIndex: 1,
    },
    {
      id: "m6",
      type: "listen_pick",
      promptHe: "לחצו «השמע מילה» ובחרו את המילה הנכונה",
      word: "book",
      options: ["book", "milk", "green"],
      correctIndex: 0,
    },
    {
      id: "m7",
      type: "listen_pick",
      promptHe: "לחצו «השמע מילה» ובחרו את המילה הנכונה",
      word: "chair",
      options: ["table", "chair", "apple"],
      correctIndex: 1,
    },
    {
      id: "m8",
      type: "build_word",
      promptHe: "בנו מילה מ-5 אותיות",
      emoji: "🪑",
      word: "chair",
      letters: ["c", "h", "a", "i", "r", "e", "o"],
    },
    {
      id: "m9",
      type: "hebrew_match",
      promptHe: "התאימו מילה בעברית לאנגלית",
      hebrewHint: "ספר",
      word: "book",
      options: ["green", "book", "water"],
      correctIndex: 1,
    },
    {
      id: "m10",
      type: "build_word",
      promptHe: "בנו מילה מ-5 אותיות",
      emoji: "🍎",
      word: "apple",
      letters: ["a", "p", "p", "l", "e", "o", "r"],
    },
    {
      id: "m11",
      type: "listen_pick",
      promptHe: "לחצו «השמע מילה» ובחרו את המילה הנכונה",
      word: "green",
      options: ["red", "green", "blue"],
      correctIndex: 1,
    },
    {
      id: "m12",
      type: "hebrew_match",
      promptHe: "התאימו מילה בעברית לאנגלית",
      hebrewHint: "כיסא",
      word: "chair",
      options: ["chair", "house", "dog"],
      correctIndex: 0,
    },
  ],
  hard: [
    {
      id: "h1",
      type: "sentence_order",
      promptHe: "סדרו מילים למשפט קצר",
      words: ["I", "like", "milk"],
      word: "I like milk",
    },
    {
      id: "h2",
      type: "sentence_order",
      promptHe: "סדרו מילים למשפט קצר",
      words: ["I", "see", "a", "cat"],
      word: "I see a cat",
    },
    {
      id: "h3",
      type: "fill_sentence",
      promptHe: "השלימו את המילה החסרה",
      sentenceTemplate: "I see a ___",
      missingWord: "dog",
      options: ["dog", "table", "run"],
      correctIndex: 0,
    },
    {
      id: "h4",
      type: "fill_sentence",
      promptHe: "השלימו את המילה החסרה",
      sentenceTemplate: "I like ___",
      missingWord: "milk",
      options: ["milk", "chair", "green"],
      correctIndex: 0,
    },
    {
      id: "h5",
      type: "sentence_image",
      promptHe: "בחרו משפט שמתאים לתמונה",
      emoji: "🐱",
      options: ["I see a cat", "I like milk", "I run fast"],
      correctIndex: 0,
    },
    {
      id: "h6",
      type: "sentence_image",
      promptHe: "בחרו משפט שמתאים לתמונה",
      emoji: "🥛",
      options: ["I like milk", "I see a dog", "I read book"],
      correctIndex: 0,
    },
    {
      id: "h7",
      type: "sentence_order",
      promptHe: "סדרו מילים למשפט קצר",
      words: ["The", "cat", "is", "red"],
      word: "The cat is red",
    },
    {
      id: "h8",
      type: "fill_sentence",
      promptHe: "השלימו את המילה החסרה",
      sentenceTemplate: "The apple is ___",
      missingWord: "red",
      options: ["red", "run", "swim"],
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
      type: "sentence_order",
      promptHe: "סדרו מילים למשפט קצר",
      words: ["I", "have", "a", "dog"],
      word: "I have a dog",
    },
    {
      id: "h11",
      type: "fill_sentence",
      promptHe: "השלימו את המילה החסרה",
      sentenceTemplate: "I ___ a cat",
      missingWord: "see",
      options: ["see", "milk", "chair"],
      correctIndex: 0,
    },
    {
      id: "h12",
      type: "sentence_order",
      promptHe: "סדרו מילים למשפט קצר",
      words: ["She", "likes", "red"],
      word: "She likes red",
    },
  ],
};

/** @param {TrainTask} task */
export function letterBankForTrainTask(task) {
  if (task.letters) return [...task.letters].sort(() => Math.random() - 0.5);
  if (!task.word) return [];
  const w = task.word.toLowerCase().replace(/\s/g, "");
  const extras = "abcdefghijklmnopqrstuvwxyz".split("").filter((c) => !w.includes(c));
  return [...w.split(""), ...extras.sort(() => Math.random() - 0.5).slice(0, 3)].sort(
    () => Math.random() - 0.5,
  );
}

export function trainFeedback(ok) {
  return ok ? "מעולה! הרכבת יצאה לדרך" : "כמעט. בדקו את סדר האותיות או המילים";
}

/** @param {TrainTask} task @param {string} built @param {number|null} selected */
export function validateTrainTask(task, built, selected) {
  if (task.type === "first_letter" || task.type === "hebrew_match" || task.type === "listen_pick" || task.type === "fill_sentence" || task.type === "sentence_image") {
    return selected === task.correctIndex;
  }
  if (task.type === "image_word" || task.type === "build_word" || task.type === "sentence_order") {
    return built.toLowerCase().trim() === (task.word ?? "").toLowerCase().trim();
  }
  return false;
}

/** @param {TrainTask} task */
export function trainSlotsCount(task) {
  if (task.type === "build_word" || task.type === "image_word") return (task.word ?? "").length;
  if (task.type === "sentence_order") return (task.words ?? []).length;
  if (task.type === "first_letter") return 1;
  return 0;
}
