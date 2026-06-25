/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */
/** @typedef {'skip' | 'even' | 'odd' | 'multiples' | 'sequence_pick'} PathRule */

/** @typedef {{
 *   id: string
 *   rule: PathRule
 *   step?: number
 *   multiple?: number
 *   numbers: number[]
 *   correctPath: number[]
 *   promptHe: string
 * }} PathTask */

/** @type {Record<DifficultyId, PathTask[]>} */
export const PATH_TASKS = {
  easy: [
    {
      id: "e1",
      rule: "skip",
      step: 2,
      numbers: [2, 3, 4, 5, 6, 7, 8, 9, 10],
      correctPath: [2, 4, 6, 8, 10],
      promptHe: "קפצו על 2, 4, 6, 8",
    },
    {
      id: "e2",
      rule: "skip",
      step: 5,
      numbers: [5, 7, 10, 12, 15, 18, 20, 22, 25],
      correctPath: [5, 10, 15, 20, 25],
      promptHe: "קפצו על 5, 10, 15, 20",
    },
    {
      id: "e3",
      rule: "even",
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      correctPath: [2, 4, 6, 8, 10, 12],
      promptHe: "בחרו מספרים זוגיים",
    },
    {
      id: "e4",
      rule: "odd",
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      correctPath: [1, 3, 5, 7, 9, 11],
      promptHe: "בחרו מספרים אי־זוגיים",
    },
    {
      id: "e5",
      rule: "skip",
      step: 2,
      numbers: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
      correctPath: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
      promptHe: "קפצו ב־2 כל פעם מההתחלה",
    },
    {
      id: "e6",
      rule: "skip",
      step: 5,
      numbers: [5, 6, 10, 11, 15, 16, 20, 21, 25, 26, 30],
      correctPath: [5, 10, 15, 20, 25, 30],
      promptHe: "קפצו ב־5",
    },
    {
      id: "e7",
      rule: "even",
      numbers: [3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30],
      correctPath: [6, 8, 14, 16, 22, 24, 30],
      promptHe: "רק מספרים זוגיים",
    },
    {
      id: "e8",
      rule: "odd",
      numbers: [2, 5, 7, 10, 13, 15, 18, 21, 23, 26, 29],
      correctPath: [5, 7, 13, 15, 21, 23, 29],
      promptHe: "רק מספרים אי־זוגיים",
    },
    {
      id: "e9",
      rule: "skip",
      step: 2,
      numbers: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      correctPath: [4, 6, 8, 10, 12, 14],
      promptHe: "קפצו על כפולות של 2",
    },
    {
      id: "e10",
      rule: "skip",
      step: 5,
      numbers: [3, 5, 8, 10, 13, 15, 18, 20, 23, 25, 28, 30],
      correctPath: [5, 10, 15, 20, 25, 30],
      promptHe: "קפצו על 5, 10, 15…",
    },
  ],
  medium: [
    {
      id: "m1",
      rule: "multiples",
      multiple: 3,
      numbers: [3, 4, 6, 8, 9, 12, 14, 15, 18, 20, 21, 24],
      correctPath: [3, 6, 9, 12, 15, 18, 21, 24],
      promptHe: "קפצו רק על כפולות של 3",
    },
    {
      id: "m2",
      rule: "multiples",
      multiple: 4,
      numbers: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28],
      correctPath: [4, 8, 12, 16, 20, 24, 28],
      promptHe: "קפצו על כפולות של 4",
    },
    {
      id: "m3",
      rule: "multiples",
      multiple: 6,
      numbers: [6, 8, 12, 14, 18, 20, 24, 26, 30, 32, 36, 38, 42],
      correctPath: [6, 12, 18, 24, 30, 36, 42],
      promptHe: "כפולות של 6",
    },
    {
      id: "m4",
      rule: "skip",
      step: 7,
      numbers: [7, 9, 14, 16, 21, 23, 28, 30, 35, 37, 42, 44, 49],
      correctPath: [7, 14, 21, 28, 35, 42, 49],
      promptHe: "סדרה בקפיצות של 7",
    },
    {
      id: "m5",
      rule: "multiples",
      multiple: 3,
      numbers: [2, 3, 5, 6, 9, 10, 12, 15, 17, 18, 21, 24, 26],
      correctPath: [3, 6, 9, 12, 15, 18, 21, 24],
      promptHe: "כל הכפולות של 3",
    },
    {
      id: "m6",
      rule: "multiples",
      multiple: 4,
      numbers: [3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28],
      correctPath: [4, 8, 12, 16, 20, 24, 28],
      promptHe: "מסלול של 4",
    },
    {
      id: "m7",
      rule: "skip",
      step: 7,
      numbers: [7, 8, 14, 15, 21, 22, 28, 29, 35, 36, 42, 43, 49, 50],
      correctPath: [7, 14, 21, 28, 35, 42, 49],
      promptHe: "קפיצות של 7",
    },
    {
      id: "m8",
      rule: "multiples",
      multiple: 6,
      numbers: [5, 6, 11, 12, 17, 18, 23, 24, 29, 30, 35, 36, 41, 42],
      correctPath: [6, 12, 18, 24, 30, 36, 42],
      promptHe: "כפולות של 6",
    },
    {
      id: "m9",
      rule: "multiples",
      multiple: 3,
      numbers: [1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21],
      correctPath: [3, 6, 9, 12, 15, 18, 21],
      promptHe: "כפולות של 3",
    },
    {
      id: "m10",
      rule: "skip",
      step: 7,
      numbers: [7, 10, 14, 17, 21, 24, 28, 31, 35, 38, 42, 45, 49],
      correctPath: [7, 14, 21, 28, 35, 42, 49],
      promptHe: "עלו ב־7",
    },
  ],
  hard: [
    {
      id: "h1",
      rule: "sequence_pick",
      numbers: [6, 12, 18, 22, 24, 30, 36, 40],
      correctPath: [6, 12, 18, 24, 30, 36],
      promptHe: "המשיכו: 6, 12, 18, __",
    },
    {
      id: "h2",
      rule: "sequence_pick",
      numbers: [3, 6, 12, 18, 24, 25, 48, 50],
      correctPath: [3, 6, 12, 24, 48],
      promptHe: "3, 6, 12, 24, __",
    },
    {
      id: "h3",
      rule: "multiples",
      multiple: 8,
      numbers: [6, 8, 14, 16, 22, 24, 30, 32, 38, 40, 46, 48, 54, 56, 64],
      correctPath: [8, 16, 24, 32, 40, 48, 56, 64],
      promptHe: "בחרו את כל הכפולות של 8",
    },
    {
      id: "h4",
      rule: "skip",
      step: 9,
      numbers: [9, 11, 18, 20, 27, 29, 36, 38, 45, 47, 54, 56, 63, 65, 72],
      correctPath: [9, 18, 27, 36, 45, 54, 63, 72],
      promptHe: "מסלול שעולה ב־9 כל פעם",
    },
    {
      id: "h5",
      rule: "sequence_pick",
      numbers: [5, 10, 15, 20, 22, 25, 30, 35, 38, 40],
      correctPath: [5, 10, 15, 20, 25, 30, 35, 40],
      promptHe: "המשיכו בקפיצות של 5",
    },
    {
      id: "h6",
      rule: "multiples",
      multiple: 8,
      numbers: [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64],
      correctPath: [8, 16, 24, 32, 40, 48, 56, 64],
      promptHe: "כל הכפולות של 8",
    },
    {
      id: "h7",
      rule: "skip",
      step: 9,
      numbers: [9, 10, 18, 19, 27, 28, 36, 37, 45, 46, 54, 55, 63, 64, 72, 73],
      correctPath: [9, 18, 27, 36, 45, 54, 63, 72],
      promptHe: "קפיצות של 9",
    },
    {
      id: "h8",
      rule: "sequence_pick",
      numbers: [4, 8, 16, 20, 32, 34, 64, 68],
      correctPath: [4, 8, 16, 32, 64],
      promptHe: "4, 8, 16, 32, __",
    },
    {
      id: "h9",
      rule: "multiples",
      multiple: 8,
      numbers: [7, 8, 15, 16, 23, 24, 31, 32, 39, 40, 47, 48, 55, 56, 63, 64],
      correctPath: [8, 16, 24, 32, 40, 48, 56, 64],
      promptHe: "כפולות של 8",
    },
    {
      id: "h10",
      rule: "skip",
      step: 9,
      numbers: [9, 12, 18, 21, 27, 30, 36, 39, 45, 48, 54, 57, 63, 66, 72, 75],
      correctPath: [9, 18, 27, 36, 45, 54, 63, 72],
      promptHe: "עלו ב־9",
    },
  ],
};

/** @param {PathTask} task @param {number[]} selected */
export function validatePath(task, selected) {
  const expected = task.correctPath;
  if (task.rule === "multiples" || task.rule === "even" || task.rule === "odd") {
    const a = [...selected].sort((x, y) => x - y);
    const b = [...expected].sort((x, y) => x - y);
    if (a.length !== b.length) return false;
    return a.every((n, i) => n === b[i]);
  }
  if (selected.length !== expected.length) return false;
  return selected.every((n, i) => n === expected[i]);
}

export function pathFeedback(ok) {
  return ok ? "מעולה! בחרתם מסלול נכון." : "כמעט! בדקו את הקפיצות בין המספרים.";
}
