/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/**
 * @typedef {Object} ShapeTask
 * @property {string} id
 * @property {'pick_shape'|'pattern'|'match_shape'|'symmetry'|'area'|'perimeter'|'rotate'|'reflect'|'net'} type
 * @property {string} prompt
 * @property {string} [shapeId]
 * @property {string[]} [options]
 * @property {number} [correctIndex]
 * @property {string[]} [pattern]
 * @property {number} [gridW]
 * @property {number} [gridH]
 * @property {number} [filledCount]
 * @property {number} [perimeter]
 * @property {string} [rotateFrom]
 * @property {number} [rotateDeg]
 */

export const SHAPE_LABELS = {
  circle: "עיגול",
  square: "ריבוע",
  triangle: "משולש",
  rectangle: "מלבן",
  cube: "קובייה",
  box: "תיבה",
  cylinder: "גליל",
};

/** @type {Record<DifficultyId, ShapeTask[]>} */
export const SHAPE_TASKS = {
  easy: [
    {
      id: "e1",
      type: "pick_shape",
      prompt: "בחרו את הצורה: עיגול",
      shapeId: "circle",
      options: ["circle", "square", "triangle", "rectangle"],
      correctIndex: 0,
    },
    {
      id: "e2",
      type: "pick_shape",
      prompt: "בחרו את הצורה: ריבוע",
      shapeId: "square",
      options: ["triangle", "square", "circle", "rectangle"],
      correctIndex: 1,
    },
    {
      id: "e3",
      type: "pick_shape",
      prompt: "בחרו את הצורה: משולש",
      shapeId: "triangle",
      options: ["square", "circle", "triangle", "rectangle"],
      correctIndex: 2,
    },
    {
      id: "e4",
      type: "pick_shape",
      prompt: "בחרו את הצורה: מלבן",
      shapeId: "rectangle",
      options: ["rectangle", "circle", "triangle", "square"],
      correctIndex: 0,
    },
    {
      id: "e5",
      type: "pattern",
      prompt: "השלימו את הדגם",
      pattern: ["square", "triangle", "square", "triangle", "?"],
      options: ["square", "triangle", "circle", "rectangle"],
      correctIndex: 1,
    },
    {
      id: "e6",
      type: "pattern",
      prompt: "השלימו את הדגם",
      pattern: ["circle", "circle", "square", "circle", "?"],
      options: ["circle", "square", "triangle", "rectangle"],
      correctIndex: 0,
    },
    {
      id: "e7",
      type: "match_shape",
      prompt: "מצאו צורה זהה",
      shapeId: "triangle",
      options: ["triangle", "square", "circle", "rectangle"],
      correctIndex: 0,
    },
    {
      id: "e8",
      type: "match_shape",
      prompt: "מצאו צורה זהה",
      shapeId: "rectangle",
      options: ["square", "rectangle", "circle", "triangle"],
      correctIndex: 1,
    },
    {
      id: "e9",
      type: "pattern",
      prompt: "השלימו את הדגם",
      pattern: ["triangle", "square", "triangle", "square", "?"],
      options: ["triangle", "square", "circle", "rectangle"],
      correctIndex: 0,
    },
    {
      id: "e10",
      type: "pick_shape",
      prompt: "בחרו את הצורה: ריבוע",
      shapeId: "square",
      options: ["circle", "rectangle", "square", "triangle"],
      correctIndex: 2,
    },
    {
      id: "e11",
      type: "match_shape",
      prompt: "מצאו צורה זהה",
      shapeId: "circle",
      options: ["square", "triangle", "circle", "rectangle"],
      correctIndex: 2,
    },
    {
      id: "e12",
      type: "pattern",
      prompt: "השלימו את הדגם",
      pattern: ["square", "square", "circle", "square", "?"],
      options: ["square", "circle", "triangle", "rectangle"],
      correctIndex: 0,
    },
  ],
  medium: [
    {
      id: "m1",
      type: "symmetry",
      prompt: "איפה עובר קו הסימטריה?",
      shapeId: "square",
      options: ["אנכי במרכז", "אלכסון בלבד", "אין סימטריה"],
      correctIndex: 0,
    },
    {
      id: "m2",
      type: "symmetry",
      prompt: "איזו צורה יש לה סימטריה?",
      shapeId: "circle",
      options: ["עיגול", "משולש לא שווה", "צורה לא סגורה"],
      correctIndex: 0,
    },
    {
      id: "m3",
      type: "area",
      prompt: "כמה ריבועים מכסים את הצורה?",
      gridW: 4,
      gridH: 3,
      filledCount: 6,
      options: ["4", "6", "8", "10"],
      correctIndex: 1,
    },
    {
      id: "m4",
      type: "area",
      prompt: "כמה ריבועים מכסים את הצורה?",
      gridW: 5,
      gridH: 3,
      filledCount: 8,
      options: ["6", "8", "9", "12"],
      correctIndex: 1,
    },
    {
      id: "m5",
      type: "perimeter",
      prompt: "מה ההיקף של הצורה (ביחידות רשת)?",
      gridW: 3,
      gridH: 2,
      filledCount: 6,
      perimeter: 10,
      options: ["8", "10", "12", "14"],
      correctIndex: 1,
    },
    {
      id: "m6",
      type: "perimeter",
      prompt: "מה ההיקף של הריבוע (ביחידות)?",
      gridW: 2,
      gridH: 2,
      filledCount: 4,
      perimeter: 8,
      options: ["4", "6", "8", "10"],
      correctIndex: 2,
    },
    {
      id: "m7",
      type: "area",
      prompt: "כמה ריבועים מכסים את הצורה?",
      gridW: 4,
      gridH: 4,
      filledCount: 9,
      options: ["7", "9", "11", "12"],
      correctIndex: 1,
    },
    {
      id: "m8",
      type: "symmetry",
      prompt: "למלבן יש קו סימטריה…",
      shapeId: "rectangle",
      options: ["אנכי ואופקי", "רק אלכסון", "בכלל לא"],
      correctIndex: 0,
    },
    {
      id: "m9",
      type: "perimeter",
      prompt: "מה ההיקף (ביחידות רשת)?",
      gridW: 4,
      gridH: 1,
      filledCount: 4,
      perimeter: 10,
      options: ["8", "10", "12", "6"],
      correctIndex: 1,
    },
    {
      id: "m10",
      type: "area",
      prompt: "כמה ריבועים מכסים את הצורה?",
      gridW: 3,
      gridH: 3,
      filledCount: 5,
      options: ["4", "5", "6", "9"],
      correctIndex: 1,
    },
    {
      id: "m11",
      type: "symmetry",
      prompt: "לאיזו צורה יש הכי הרבה קווי סימטריה?",
      options: ["עיגול", "משולש", "מלבן ארוך"],
      correctIndex: 0,
    },
    {
      id: "m12",
      type: "perimeter",
      prompt: "מה ההיקף (ביחידות)?",
      gridW: 3,
      gridH: 2,
      filledCount: 6,
      perimeter: 10,
      options: ["8", "10", "12", "14"],
      correctIndex: 1,
    },
  ],
  hard: [
    {
      id: "h1",
      type: "rotate",
      prompt: "איזו צורה מתקבלת אחרי סיבוב של 90°?",
      rotateFrom: "L-shape",
      rotateDeg: 90,
      options: ["rotate_a", "rotate_b", "rotate_c"],
      correctIndex: 1,
    },
    {
      id: "h2",
      type: "rotate",
      prompt: "איזו צורה מתקבלת אחרי סיבוב?",
      rotateFrom: "arrow",
      rotateDeg: 180,
      options: ["rotate_d", "rotate_e", "rotate_f"],
      correctIndex: 0,
    },
    {
      id: "h3",
      type: "reflect",
      prompt: "בחרו את השיקוף הנכון",
      shapeId: "triangle",
      options: ["reflect_a", "reflect_b", "reflect_c"],
      correctIndex: 2,
    },
    {
      id: "h4",
      type: "reflect",
      prompt: "בחרו את השיקוף הנכון",
      shapeId: "rectangle",
      options: ["reflect_d", "reflect_e", "reflect_f"],
      correctIndex: 1,
    },
    {
      id: "h5",
      type: "net",
      prompt: "איזו פריסה מתאימה לקובייה?",
      options: ["net_cube", "net_box", "net_cylinder"],
      correctIndex: 0,
    },
    {
      id: "h6",
      type: "net",
      prompt: "איזו פריסה מתאימה לתיבה (מלבן)?",
      options: ["net_cube", "net_box", "net_cylinder"],
      correctIndex: 1,
    },
    {
      id: "h7",
      type: "net",
      prompt: "איזו פריסה מתאימה לגליל?",
      options: ["net_cube", "net_box", "net_cylinder"],
      correctIndex: 2,
    },
    {
      id: "h8",
      type: "rotate",
      prompt: "אחרי סיבוב - איזו צורה נכונה?",
      rotateFrom: "square",
      rotateDeg: 90,
      options: ["square", "rectangle", "circle"],
      correctIndex: 0,
    },
    {
      id: "h9",
      type: "reflect",
      prompt: "בחרו שיקוף של משולש",
      shapeId: "triangle",
      options: ["reflect_a", "reflect_b", "reflect_g"],
      correctIndex: 0,
    },
    {
      id: "h10",
      type: "area",
      prompt: "כמה ריבועים בצורה המורכבת?",
      gridW: 5,
      gridH: 4,
      filledCount: 12,
      options: ["10", "12", "14", "16"],
      correctIndex: 1,
    },
    {
      id: "h11",
      type: "net",
      prompt: "פריסה של קובייה - בחרו נכון",
      options: ["net_cube", "net_cylinder", "net_box"],
      correctIndex: 0,
    },
    {
      id: "h12",
      type: "rotate",
      prompt: "סיבוב חץ - מה מתקבל?",
      rotateFrom: "arrow",
      rotateDeg: 90,
      options: ["rotate_e", "rotate_f", "rotate_d"],
      correctIndex: 2,
    },
  ],
};

export function shapeFeedback(ok) {
  return ok ? "כל הכבוד! הבנייה הצליחה" : "כמעט. בדקו שוב את הצורה או המיקום";
}

/** @param {number} w @param {number} h @param {number} count */
export function gridCells(w, h, count) {
  /** @type {boolean[]} */
  const cells = [];
  for (let i = 0; i < w * h; i += 1) {
    cells.push(i < count);
  }
  return cells;
}
