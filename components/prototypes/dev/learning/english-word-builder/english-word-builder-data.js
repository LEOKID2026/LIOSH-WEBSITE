/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/** @typedef {{
 *   id: string
 *   word: string
 *   category: string
 *   emoji: string
 *   imageSrc?: string
 *   audioSrc?: string
 *   missingIndex?: number
 * }} WordTask */

/** @type {Record<DifficultyId, WordTask[]>} */
export const WORD_TASKS = {
  easy: [
    { id: "e1", word: "cat", category: "animals", emoji: "🐱" },
    { id: "e2", word: "dog", category: "animals", emoji: "🐶" },
    { id: "e3", word: "sun", category: "nature", emoji: "☀️" },
    { id: "e4", word: "red", category: "colors", emoji: "🔴" },
    { id: "e5", word: "bed", category: "home", emoji: "🛏️" },
    { id: "e6", word: "box", category: "home", emoji: "📦" },
    { id: "e7", word: "pen", category: "school", emoji: "🖊️" },
    { id: "e8", word: "hat", category: "clothes", emoji: "🎩" },
    { id: "e9", word: "cup", category: "home", emoji: "☕" },
    { id: "e10", word: "bus", category: "transport", emoji: "🚌" },
  ],
  medium: [
    { id: "m1", word: "milk", category: "food", emoji: "🥛" },
    { id: "m2", word: "book", category: "school", emoji: "📚" },
    { id: "m3", word: "apple", category: "food", emoji: "🍎" },
    { id: "m4", word: "green", category: "colors", emoji: "🟢" },
    { id: "m5", word: "house", category: "home", emoji: "🏠" },
    { id: "m6", word: "chair", category: "home", emoji: "🪑" },
    { id: "m7", word: "table", category: "home", emoji: "🪵" },
    { id: "m8", word: "water", category: "food", emoji: "💧" },
    { id: "m9", word: "cloud", category: "nature", emoji: "☁️" },
    { id: "m10", word: "happy", category: "feelings", emoji: "😊" },
  ],
  hard: [
    { id: "h1", word: "school", category: "school", emoji: "🏫" },
    { id: "h2", word: "pencil", category: "school", emoji: "✏️" },
    { id: "h3", word: "window", category: "home", emoji: "🪟" },
    { id: "h4", word: "animal", category: "animals", emoji: "🐾" },
    { id: "h5", word: "orange", category: "food", emoji: "🍊" },
    { id: "h6", word: "teacher", category: "school", emoji: "👩‍🏫" },
    { id: "h7", word: "apple", category: "food", emoji: "🍎", missingIndex: 0 },
    { id: "h8", word: "green", category: "colors", emoji: "🟢", missingIndex: 2 },
    { id: "h9", word: "house", category: "home", emoji: "🏠", missingIndex: 1 },
    { id: "h10", word: "water", category: "food", emoji: "💧", missingIndex: 3 },
  ],
};

const EXTRA_LETTERS = "abcdefghijklmnopqrstuvwxyz";

/** @param {WordTask} task */
export function letterBankForTask(task) {
  const word = task.word.toLowerCase();
  const letters = word.split("");
  const extras = EXTRA_LETTERS.split("").filter((c) => !letters.includes(c));
  const distractorCount = word.length <= 3 ? 2 : word.length <= 5 ? 4 : 5;
  const shuffledExtras = extras.sort(() => Math.random() - 0.5).slice(0, distractorCount);
  return [...letters, ...shuffledExtras].sort(() => Math.random() - 0.5);
}

export const CATEGORY_LABELS = {
  animals: "Animals",
  food: "Food",
  school: "School",
  home: "Home",
  colors: "Colors",
  nature: "Nature",
  clothes: "Clothes",
  transport: "Transport",
  feelings: "Feelings",
};

export function wordBuilderFeedback(ok) {
  return ok ? "Great! ✓" : "Try again — check the letters.";
}
