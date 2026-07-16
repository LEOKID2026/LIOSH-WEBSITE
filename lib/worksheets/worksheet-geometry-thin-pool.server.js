/**
 * Supplemental geometry worksheet pools for thin topics (count 12–20).
 * Uses existing conceptual bank + approved diagram stem catalogs only.
 * @module lib/worksheets/worksheet-geometry-thin-pool.server
 */

import {
  GEOMETRY_CONCEPTUAL_ITEMS,
  renderGeometryConceptualRowToQuestion,
} from "../../utils/geometry-conceptual-bank.js";
import { itemAllowedForGrade } from "../../utils/grade-gating.js";

const PP_MID_STEMS = {
  easy: [
    `התבוננו בשני הישרים בשרטוט. מה היחס ביניהם?`,
    `זיהוי מהיר: מה היחס בין הישרים שבשרטוט?`,
    `לפי השרטוט: מה היחס בין שני הישרים?`,
    `בדקו את השרטוט — מקבילות או מאונכות?`,
    `מה היחס הגיאומטרי בין הישרים המוצגים?`,
  ],
  medium: [
    `סיווג ישרים לפי השרטוט: מה היחס הנכון?`,
    `בחרו לפי השרטוט: מה היחס בין שני הישרים?`,
    `זיהוי ישרים: מה היחס הנכון לפי השרטוט?`,
    `השוו בין שני הישרים בשרטוט — מה היחס?`,
    `סמנו את היחס המתאים בין הישרים בשרטוט.`,
    `לפי השרטוט — מקבילות או מאונכות?`,
    `מה היחס בין הישרים המוצגים בשרטוט?`,
    `בדקו את זוג הישרים: מה היחס הנכון?`,
    `סיווג קצר: מקבילות או מאונכות לפי השרטוט?`,
    `השלימו את הסיווג לפי השרטוט.`,
  ],
  hard: [
    `לפי השרטוט, איזה יחס מתקיים בין שני הישרים?`,
    `סיווג ישרים לפי השרטוט: מה היחס הנכון?`,
    `התבוננו בשני הישרים בשרטוט. מה היחס ביניהם?`,
    `לפי הסימון והשרטוט, מה היחס הגיאומטרי בין שני הישרים?`,
    `בחרו לפי השרטוט: מה היחס בין שני הישרים?`,
    `איזה זוג ישרים מתאים לתיאור בשרטוט — מקבילות או מאונכות?`,
    `ניתוח ישרים: מה היחס הנכון לפי השרטוט?`,
    `השלימו את הסיווג: מקבילות או מאונכות?`,
  ],
};

const PP_LATE_STEMS = {
  easy: [
    `זיהוי מהיר: מה היחס בין הישרים שבשרטוט?`,
    `התבוננו בשני הישרים בשרטוט. מה היחס ביניהם?`,
    `לפי השרטוט: מה היחס בין שני הישרים?`,
    `בדקו את השרטוט — מקבילות או מאונכות?`,
    `מה היחס בין הישרים המוצגים?`,
  ],
  medium: [
    `בחרו לפי השרטוט: מה היחס בין שני הישרים?`,
    `סיווג ישרים לפי השרטוט: מה היחס הנכון?`,
    `זיהוי ישרים: מה היחס הנכון לפי השרטוט?`,
    `השוו בין שני הישרים בשרטוט — מה היחס?`,
    `סמנו את היחס המתאים בין הישרים בשרטוט.`,
    `לפי השרטוט — מקבילות או מאונכות?`,
    `מה היחס בין הישרים המוצגים בשרטוט?`,
    `בדקו את זוג הישרים: מה היחס הנכון?`,
    `סיווג קצר: מקבילות או מאונכות לפי השרטוט?`,
    `השלימו את הסיווג לפי השרטוט.`,
  ],
  hard: [
    `לפי הסימון והשרטוט, מה היחס הגיאומטרי בין שני הישרים?`,
    `לפי השרטוט, איזה יחס מתקיים בין שני הישרים?`,
    `בחרו לפי השרטוט: מה היחס בין שני הישרים?`,
    `סיווג ישרים לפי השרטוט: מה היחס הנכון?`,
    `התבוננו בשני הישרים בשרטוט. מה היחס ביניהם?`,
    `איזה זוג ישרים מתאים לתיאור בשרטוט — מקבילות או מאונכות?`,
    `ניתוח ישרים: מה היחס הנכון לפי השרטוט?`,
    `השלימו את הסיווג: מקבילות או מאונכות?`,
    `בדקו את זוג הישרים בשרטוט: מקבילות או מאונכות?`,
  ],
};

/** Topics that always use supplemental worksheet pools. */
export const WORKSHEET_GEOMETRY_THIN_POOL_TOPICS = new Set([
  "parallel_perpendicular",
  "circles",
]);

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 */
export function geometryWorksheetUsesThinPool(gradeKey, topicKey) {
  if (WORKSHEET_GEOMETRY_THIN_POOL_TOPICS.has(topicKey)) return true;
  return topicKey === "shapes_basic" && gradeKey === "g4";
}

/**
 * @param {string} gradeKey
 * @returns {"mid"|"late"}
 */
function formulaBand(gradeKey) {
  const n = parseInt(String(gradeKey).replace(/\D/g, ""), 10) || 3;
  return n <= 4 ? "mid" : "late";
}

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {string} levelKey easy|medium|hard
 */
export function listGeometryConceptualWorksheetPool(gradeKey, topicKey, levelKey) {
  const lv = String(levelKey || "medium").toLowerCase();
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const row of GEOMETRY_CONCEPTUAL_ITEMS) {
    if (!row.topics?.includes(topicKey)) continue;
    if (!itemAllowedForGrade(row, gradeKey)) continue;
    if (row.levels && !row.levels.includes(lv)) continue;
    const rendered = renderGeometryConceptualRowToQuestion(row, {
      gradeKey,
      levelKey: lv,
      topic: topicKey,
    });
    out.push({
      question: rendered.question,
      correctAnswer: rendered.correctAnswer,
      answers: rendered.answers,
      topic: topicKey,
      params: { ...rendered.params, worksheetPoolSource: "conceptual", poolRowId: row.subtype },
    });
  }
  return out;
}

/**
 * @param {string} gradeKey
 * @param {string} levelKey
 */
export function listParallelPerpendicularDiagramPool(gradeKey, levelKey) {
  const lv = String(levelKey || "medium").toLowerCase();
  const band = formulaBand(gradeKey);
  const stemBank = band === "mid" ? PP_MID_STEMS : PP_LATE_STEMS;
  const stems = stemBank[lv] || stemBank.medium || stemBank.easy;
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (let variant = 0; variant < stems.length; variant += 1) {
    for (const isParallel of [true, false]) {
      const selectedType = isParallel ? "מקבילות" : "מאונכות";
      out.push({
        question: stems[variant],
        correctAnswer: selectedType,
        answers: ["מקבילות", "מאונכות"],
        topic: "parallel_perpendicular",
        params: {
          type: selectedType,
          isParallel,
          kind: "parallel_perpendicular",
          patternFamily: `parallel_perpendicular_${lv}`,
          subtype: band === "mid" ? "mid_band" : "late_band",
          diagramVariant: variant,
          worksheetPoolSource: "diagram_catalog",
        },
      });
    }
  }
  return out;
}

/**
 * @param {string} gradeKey
 * @param {string} levelKey
 */
export function listCirclesWorksheetPool(gradeKey, levelKey) {
  const lv = String(levelKey || "medium").toLowerCase();
  const maxR = gradeKey === "g6" ? 24 : 16;
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (let radius = 1; radius <= maxR; radius += 1) {
    for (const askArea of [true, false]) {
      const kind = askArea ? "circle_area" : "circle_perimeter";
      const correctAnswer = askArea
        ? Math.round(3.14 * radius * radius)
        : Math.round(2 * 3.14 * radius);
      const question = askArea
        ? gradeKey === "g6"
          ? lv === "easy"
            ? `עיגול עם רדיוס ${radius}. מה שטח הדיסק? (π = 3.14)`
            : lv === "medium"
              ? `עיגול עם רדיוס ${radius}. מה השטח? (π = 3.14)`
              : `אתגר שטח - עיגול רדיוס ${radius}: חשבו שטח מדויק (π = 3.14).`
          : `מה שטח העיגול עם רדיוס ${radius}? (π = 3.14)`
        : gradeKey === "g6"
          ? lv === "easy"
            ? `מעגל רדיוס ${radius}. מה היקף? (π = 3.14)`
            : `מעגל: רדיוס ${radius}. מה היקף המעטפת? (π = 3.14)`
          : `מה היקף המעגל עם רדיוס ${radius}? (π = 3.14)`;
      out.push({
        question,
        correctAnswer: String(correctAnswer),
        topic: "circles",
        params: {
          radius,
          kind,
          askArea,
          patternFamily: `circles_${gradeKey}_${lv}`,
          worksheetPoolSource: "circles_catalog",
          diagramVariant: radius,
        },
      });
    }
  }
  return out;
}

/**
 * @param {string} gradeKey
 * @param {string} levelKey
 */
export function listShapesBasicWorksheetPool(gradeKey, levelKey) {
  if (gradeKey !== "g4") return [];
  const lv = String(levelKey || "medium").toLowerCase();
  const shapes = ["ריבוע", "מלבן", "משולש", "מקבילית"];
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (let i = 0; i < shapes.length; i += 1) {
    const shape = shapes[i];
    for (let v = 0; v < 6; v += 1) {
      const side = 3 + ((i + v) % 8);
      out.push({
        question: [
          `זוויות ב${shape} - כמה מהן ישרות? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
          `ניתוח זוויות ב${shape}: (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
          `אתגר קצר - זוויות ישרות ב${shape}: (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
          `תכונת הזוויות ב${shape}: (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
          `כמה זוויות ישרות יש ל${shape}? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
          `זיהוי זוויות ב${shape} לפי צלע ${side}: (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
        ][v % 6],
        correctAnswer: shape === "ריבוע" ? "4" : shape === "מלבן" ? "4" : "2",
        answers: ["2", "3", "4", "אין זוויות ישרות"],
        topic: "shapes_basic",
        params: {
          shape,
          side,
          kind: "shapes_basic_properties_angles",
          patternFamily: `shapes_basic_angles_${gradeKey}_${lv}`,
          worksheetPoolSource: "shapes_catalog",
          diagramVariant: i * 6 + v,
        },
      });
    }
  }
  return out;
}

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {string} levelKey
 */
export function listGeometryWorksheetThinPool(gradeKey, topicKey, levelKey) {
  const topic = String(topicKey || "").trim();
  const lv = String(levelKey || "medium").toLowerCase();
  /** @type {Array<Record<string, unknown>>} */
  let pool = listGeometryConceptualWorksheetPool(gradeKey, topic, lv);
  if (topic === "parallel_perpendicular") {
    pool = pool.concat(listParallelPerpendicularDiagramPool(gradeKey, lv));
  } else if (topic === "circles") {
    pool = pool.concat(listCirclesWorksheetPool(gradeKey, lv));
  } else if (topic === "shapes_basic") {
    pool = pool.concat(listShapesBasicWorksheetPool(gradeKey, lv));
  }
  const seen = new Set();
  return pool.filter((row) => {
    const fp = `${row.question}|${row.correctAnswer}|${row.params?.subtype}|${row.params?.diagramVariant}|${row.params?.poolRowId}`;
    if (seen.has(fp)) return false;
    seen.add(fp);
    return true;
  });
}
