// יצירת שאלות גיאומטריה

import { GRADES, PI, getShapesForTopic } from "./geometry-constants.js";
import {
  isPrismVolumeTriangleAllowed,
  isTriangleAreaFormulaGradeAllowed,
} from "./geometry-curriculum-gates.js";
import {
  pickGeometryConceptualQuestion,
  geometryConceptualProbability,
} from "./geometry-conceptual-bank.js";
import { gradeBandForKey } from "./grade-gating.js";
import { enrichGeometryProceduralParams } from "./geometry-diagnostic-metadata-bridge.js";
import { formatTriangleAnglesKnownTwoStem } from "./geometry-activity-question-stem.js";
import { sanitizeQuestionForStudentDisplay } from "./student-question-stem-sanitizer.js";

function shuffleMcqList(answers) {
  const arr = [...answers];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

import {
  GEOMETRY_HEBREW_LABEL_OPTIONS,
  GEOMETRY_INDEX_LABEL_KINDS,
} from "./geometry-activity-answer-ui.js";

/**
 * מסיחים סבירים לפי סוג שאלה — לא לולאת 1..10 אקראית כשהקשר הוא שטח/נפח וכו'.
 */

function geometryIndexLabelAnswers(correctAnswer, optionCount) {
  const opts = Array.from({ length: optionCount }, (_, i) => String(i + 1));
  const correct = String(Math.round(Number(correctAnswer)));
  if (!opts.includes(correct)) return shuffleMcqList(opts);
  return shuffleMcqList(opts);
}

export function buildGeometryMcqAnswers({
  correctAnswer,
  params,
  level,
  round,
  selectedTopic,
  shape,
}) {
  const kind = params?.kind || "";
  const baseKind = kind.replace(/^story_/, "");
  const hebrewOpts = GEOMETRY_HEBREW_LABEL_OPTIONS[baseKind];
  if (hebrewOpts) {
    return shuffleMcqList(hebrewOpts);
  }
  const labelCount = GEOMETRY_INDEX_LABEL_KINDS[baseKind];
  if (labelCount) {
    return geometryIndexLabelAnswers(correctAnswer, labelCount);
  }

  const ca = Number(correctAnswer);
  const wrong = new Set();
  const r = (n) => round(n);

  const add = (x) => {
    if (x == null || Number.isNaN(Number(x))) return;
    const v = r(Number(x));
    const c = r(ca);
    if (v === c || v <= 0) return;
    if (wrong.size < 3) wrong.add(v);
  };

  const takeFromPool = (pool) => {
    const p = pool.filter((n) => r(n) !== r(ca));
    shuffleMcqList(p);
    for (const n of p) {
      add(n);
      if (wrong.size >= 3) break;
    }
  };

  if (baseKind === "solids") {
    takeFromPool([1, 2, 3, 4, 5, 6]);
  } else if (baseKind === "tiling") {
    takeFromPool([60, 90, 120]);
  } else if (baseKind === "rotation") {
    takeFromPool([90, 180, 270]);
  } else if (baseKind === "triangle_angles") {
    const { angle1, angle2, angle3 } = params;
    add(angle1);
    add(angle2);
    add(r(angle1 + angle2));
    add(90);
    add(180 - angle1);
    add(180 - angle2);
  } else if (baseKind === "pythagoras_hyp" || baseKind === "pythagoras_leg") {
    const { a, b, c } = params;
    add(r(a + b));
    add(r(Math.abs(a - b)));
    add(r((a * a + b * b) ** 0.5 * 0.85));
    if (c) add(r(c + 2));
    if (c) add(r(Math.max(1, c - 3)));
    if (a) add(r(a * a));
    if (b) add(r(b * b));
  } else if (
    baseKind === "square_area" ||
    (selectedTopic === "area" && shape === "square")
  ) {
    const side = params.side;
    if (side != null) {
      add(side * 4);
      add(side + side);
      add(r((side + 1) * (side + 1)));
      add(r((side - 1) * (side - 1)));
      add(2 * side * side);
    }
  } else if (
    baseKind === "rectangle_area" ||
    (selectedTopic === "area" && shape === "rectangle")
  ) {
    const L = params.length;
    const W = params.width;
    if (L != null && W != null) {
      add(L + W);
      add(2 * (L + W));
      add(L * W + L);
      add(r((L + 1) * W));
      add(r(L * (W + 1)));
    }
  } else if (
    baseKind === "triangle_area" ||
    (selectedTopic === "area" && shape === "triangle")
  ) {
    const base = params.base;
    const height = params.height;
    if (base != null && height != null) {
      add(base * height);
      add(base + height);
      add(r((base * height) / 4));
    }
  } else if (
    baseKind === "parallelogram_area" ||
    (selectedTopic === "area" && shape === "parallelogram")
  ) {
    const base = params.base;
    const height = params.height;
    if (base != null && height != null) {
      add(r((base * height) / 2));
      add(base + height);
      add(2 * base + height);
    }
  } else if (
    baseKind === "trapezoid_area" ||
    (selectedTopic === "area" && shape === "trapezoid")
  ) {
    const b1 = params.base1;
    const b2 = params.base2;
    const h = params.height;
    if (b1 != null && b2 != null && h != null) {
      add(r(((b1 + b2) * h)));
      add(r(((b1 + b2) * h) / 4));
      add(b1 * b2);
    }
  } else if (baseKind === "circle_area") {
    const rad = params.radius;
    if (rad != null) {
      add(r(2 * PI * rad));
      add(r(2 * rad));
      add(r(PI * rad * rad * 1.15));
      add(r(PI * (rad + 1) * (rad + 1)));
    }
  } else if (baseKind === "circle_perimeter") {
    const rad = params.radius;
    if (rad != null) {
      add(r(PI * rad * rad));
      add(r(PI * rad));
      add(r(2 * PI * rad * 1.12));
    }
  } else if (baseKind === "square_perimeter" || baseKind.endsWith("square_perimeter")) {
    const side = params.side;
    if (side != null) {
      add(side * side);
      add(3 * side);
      add(2 * side);
    }
  } else if (baseKind === "rectangle_perimeter" || baseKind.endsWith("rectangle_perimeter")) {
    const L = params.length;
    const W = params.width;
    if (L != null && W != null) {
      add(L * W);
      add(L + W);
      add(2 * L + W);
    }
  } else if (baseKind === "triangle_perimeter") {
    const { side1, side2, side3 } = params;
    if (side1 != null && side2 != null && side3 != null) {
      add(side1 + side2);
      add(side2 + side3);
      add(side1 + side3);
    }
  } else if (baseKind === "cube_volume" || baseKind.endsWith("cube_volume")) {
    const side = params.side;
    if (side != null) {
      add(side * side);
      add(6 * side * side);
      add(side * side * side + side);
    }
  } else if (baseKind === "rectangular_prism_volume" || baseKind.endsWith("box_volume") || baseKind.endsWith("rectangular_prism_volume")) {
    const { length: L, width: W, height: H } = params;
    if (L != null && W != null && H != null) {
      add(L * W + H);
      add(L + W + H);
      add(L * W);
      add(r(L * W * H * 0.75));
    }
  } else if (baseKind === "cylinder_volume") {
    const { radius, height } = params;
    if (radius != null && height != null) {
      add(r(PI * radius * radius));
      add(r(PI * radius * height));
      add(r(2 * PI * radius * height));
    }
  } else if (baseKind === "sphere_volume") {
    const { radius } = params;
    if (radius != null) {
      add(r(PI * radius * radius * radius));
      add(r((4 / 3) * PI * radius * radius * radius * 0.7));
    }
  } else if (baseKind === "cone_volume") {
    const { radius, height } = params;
    if (radius != null && height != null) {
      add(r(PI * radius * radius * height));
      add(r((1 / 2) * PI * radius * radius * height));
    }
  } else if (baseKind === "pyramid_volume_square" || baseKind === "pyramid_volume_rectangular") {
    const h = params.height;
    const baseArea = params.baseArea;
    if (baseArea != null && h != null) {
      add(r(baseArea * h));
      add(r((baseArea * h) / 2));
    }
  } else if (baseKind === "prism_volume_triangle" || baseKind === "prism_volume_rectangular") {
    const baseArea = params.baseArea;
    const h = params.height;
    if (baseArea != null && h != null) {
      add(r((baseArea * h) / 2));
      add(baseArea + h);
    }
  } else if (
    baseKind === "heights_triangle" ||
    baseKind === "heights_parallelogram" ||
    baseKind === "heights_trapezoid"
  ) {
    const base = params.base ?? params.base1;
    const area = params.area;
    const b2 = params.base2;
    if (base != null && area != null) {
      add(r(area / base));
      add(r((area * 2) / base + 1));
    }
    if (b2 != null && base != null && area != null) {
      add(r(area / (base + b2)));
    }
  } else if (baseKind === "diagonal_square") {
    const side = params.side;
    if (side != null) {
      add(side * 2);
      add(side * side);
      add(r(side * Math.sqrt(3)));
    }
  } else if (
    baseKind === "diagonal_rectangle" ||
    baseKind === "diagonal_parallelogram"
  ) {
    const { side, width } = params;
    if (side != null && width != null) {
      add(side + width);
      add(Math.abs(side - width));
      add(r(Math.sqrt(side * side + width * width) * 0.85));
    }
  } else if (baseKind === "symmetry") {
    const axes = params.axes;
    if (axes != null) {
      takeFromPool([1, 2, 3, 4, 5, 6].filter((n) => n !== axes));
    }
  }

  let tries = 0;
  while (wrong.size < 3 && tries < 80) {
    tries++;
    const jitter = 1 + Math.floor(Math.random() * Math.max(2, Math.abs(ca) * 0.08));
    const sign = Math.random() < 0.5 ? -1 : 1;
    add(ca + sign * jitter);
  }

  let pad = 1;
  while (wrong.size < 3) {
    add(Math.max(1, ca + pad * 3));
    pad++;
    if (pad > 50) break;
  }

  const wrongArr = Array.from(wrong).slice(0, 3);
  const merged = shuffleMcqList([r(ca), ...wrongArr.map((x) => r(x))]);
  const uniq = [];
  for (const x of merged) {
    if (!uniq.includes(x)) uniq.push(x);
  }
  let bump = 1;
  while (uniq.length < 4) {
    const v = r(ca + bump * (Math.abs(ca) > 50 ? 7 : 3));
    bump++;
    if (v > 0 && !uniq.includes(v)) uniq.push(v);
    if (bump > 100) break;
  }
  return shuffleMcqList(uniq.slice(0, 4));
}

export function generateQuestion(level, topic, gradeKey, mixedOps = null, probeOpts = null) {
  const geoForceKind =
    probeOpts?.forceKind != null ? String(probeOpts.forceKind) : "";
  const forcedTopic =
    probeOpts?.topic != null ? String(probeOpts.topic) : "";

  // בדיקה שהכיתה קיימת
  if (!GRADES[gradeKey]) {
    return {
      question: "כיתה לא תקינה. אנא בחר כיתה אחרת.",
      correctAnswer: 0,
      options: [0],
      params: { kind: "no_question" },
    };
  }
  
  const isMixed = topic === "mixed";
  const allowedTopics = GRADES[gradeKey].topics || [];
  
  let selectedTopic;
  if (forcedTopic && allowedTopics.includes(forcedTopic)) {
    selectedTopic = forcedTopic;
  } else if (isMixed) {
    let availableTopics;
    if (mixedOps) {
      availableTopics = Object.entries(mixedOps)
        .filter(([t, selected]) => selected && t !== "mixed")
        .map(([t]) => t);
    } else {
      availableTopics = allowedTopics.filter((t) => t !== "mixed");
    }
    if (!availableTopics || availableTopics.length === 0) {
      availableTopics = allowedTopics.filter((t) => t !== "mixed");
    }
    if (!availableTopics || availableTopics.length === 0) {
      return {
        question: "אין נושאים זמינים עבור הכיתה הזו. אנא בחר כיתה אחרת.",
        correctAnswer: 0,
        options: [0],
        params: { kind: "no_question" },
      };
    }
    selectedTopic =
      availableTopics[Math.floor(Math.random() * availableTopics.length)];
  } else {
    // בדיקה שהנושא קיים עבור הכיתה
    if (!allowedTopics.includes(topic)) {
      // ננסה למצוא נושא חלופי
      const alternativeTopic = allowedTopics.find(t => t !== "mixed");
      if (alternativeTopic) {
        selectedTopic = alternativeTopic;
      } else {
        return {
          question: `הנושא "${topic}" לא זמין עבור הכיתה הזו. אנא בחר נושא אחר.`,
          correctAnswer: 0,
          options: [0],
          params: { kind: "no_question" },
        };
      }
    } else {
      selectedTopic = topic;
    }
  }

  const availableShapesRaw = getShapesForTopic(gradeKey, selectedTopic);
  const availableShapes = (availableShapesRaw || []).filter((shape) => {
    if (selectedTopic === "area" && shape === "triangle") {
      return isTriangleAreaFormulaGradeAllowed(gradeKey);
    }
    return true;
  });
  
  // אם אין צורות זמינות, נחזיר שאלה ברירת מחדל
  if (!availableShapes || availableShapes.length === 0) {
    console.warn(`No shapes available for topic ${selectedTopic} in grade ${gradeKey}`);
    return {
      question: "אין שאלות זמינות עבור הנושא והכיתה שנבחרו. אנא בחר נושא אחר.",
      correctAnswer: 0,
      answers: [0],
      params: { kind: "no_question" },
    };
  }
  
  const geoForce =
    typeof globalThis !== "undefined" ? globalThis.__LIOSH_GEOMETRY_FORCE : null;

  let shape =
    availableShapes.length > 0
      ? availableShapes[Math.floor(Math.random() * availableShapes.length)]
      : null;

  const SHAPE_FOR_KIND = {
    shapes_basic_square: "square",
    shapes_basic_rectangle: "rectangle",
    shapes_basic_properties_square: "square",
    shapes_basic_properties_rectangle: "rectangle",
    shapes_basic_properties_angles: "square",
    square_area: "square",
    square_perimeter: "square",
    triangle_perimeter: "triangle",
    triangle_angles: "triangle",
    parallelogram_area: "parallelogram",
    trapezoid_area: "trapezoid",
    diagonal_square: "square",
    diagonal_rectangle: "rectangle",
    diagonal_parallelogram: "parallelogram",
    rectangular_prism_volume: "rectangular_prism",
    cylinder_volume: "cylinder",
    sphere_volume: "sphere",
    cone_volume: "cone",
    pyramid_volume_square: "pyramid",
    pyramid_volume_rectangular: "pyramid",
    prism_volume_rectangular: "prism",
    prism_volume_triangle: "prism",
    circle_area: "circle",
    circle_perimeter: "circle",
    pythagoras_hyp: "triangle",
    pythagoras_leg: "triangle",
  };
  if (
    geoForceKind &&
    SHAPE_FOR_KIND[geoForceKind] &&
    availableShapes.includes(SHAPE_FOR_KIND[geoForceKind])
  ) {
    shape = SHAPE_FOR_KIND[geoForceKind];
  }

  if (geoForce?.shape && availableShapes.includes(geoForce.shape)) {
    shape = geoForce.shape;
  }

  if (!shape) {
    console.warn(`Failed to select shape from available shapes:`, availableShapes);
    return {
      question: "שגיאה ביצירת שאלה. אנא נסה שוב.",
      correctAnswer: 0,
      answers: [0],
      params: { kind: "no_question" },
    };
  }

  const levelKey =
    level?.name === "קשה"
      ? "hard"
      : level?.name === "בינוני"
        ? "medium"
        : "easy";

  const skipConceptual =
    typeof globalThis !== "undefined" &&
    globalThis.__LIOSH_SKIP_GEOMETRY_CONCEPTUAL === true;
  const forceConceptual =
    typeof globalThis !== "undefined" &&
    globalThis.__LIOSH_GEOMETRY_FORCE_CONCEPTUAL === true;
  const conceptualP = forceConceptual
    ? 1
    : geometryConceptualProbability(gradeKey, selectedTopic);

  if (
    !skipConceptual &&
    !geoForceKind &&
    selectedTopic !== "mixed" &&
    Math.random() < conceptualP
  ) {
    const conceptual = pickGeometryConceptualQuestion({
      gradeKey,
      levelKey,
      topic: selectedTopic,
    });
    if (conceptual) {
      return {
        question: conceptual.question,
        correctAnswer: conceptual.correctAnswer,
        answers: conceptual.answers,
        topic: selectedTopic,
        shape,
        params: conceptual.params,
      };
    }
  }

  let question;
  let correctAnswer;
  let params = {};

  const roundTo = level.decimals ? 2 : 0;
  const round = (num) =>
    Math.round(num * Math.pow(10, roundTo)) / Math.pow(10, roundTo);

  const formulaBand = gradeBandForKey(gradeKey) || "mid";
  // תרגילי מילים רק ב־late (ה׳–ו׳)
  const allowStory = formulaBand === "late";

  switch (selectedTopic) {
    // ===================== AREA =====================
    case "area": {
      switch (shape) {
        case "square": {
          const side = Math.floor(Math.random() * level.maxSide) + 1;
          const useStory =
            allowStory && !geoForceKind && Math.random() < 0.4;

          params = {
            side,
            kind: useStory ? "story_square_area" : "square_area",
            patternFamily: useStory
              ? "area_square_story"
              : `area_square_${formulaBand}_${levelKey}`,
          };
          correctAnswer = round(side * side);

          if (useStory) {
            question = `לליאו יש גינה בצורת ריבוע, אורך כל צלע הוא ${side} מטר. כמה מטרים רבועים שטח הגינה?`;
          } else if (formulaBand === "early") {
            if (levelKey === "easy") {
              question = `ספרו יחידות שטח על רשת: ריבוע עם צלע ${side} (כל משבצת = 1). כמה משבצות?`;
            } else if (levelKey === "medium") {
              question = `נוסחה: שטח ריבוע = צלע × צלע. לריבוע צלע ${side} — מה השטח ביחידות?`;
            } else {
              question = `בלי רמז חזותי — ריבוע במישור, צלע ${side}. מה שטחו?`;
            }
          } else if (formulaBand === "mid") {
            const aw = Math.floor(Math.random() * 8);
            if (levelKey === "easy") {
              question = [
                `ריבוע עם צלע ${side}: חשבו שטח (כפל צלע בעצמה). מה התוצאה?`,
                `שטח במישור: ריבוע צלע ${side} — מה גודל השטח (ביחידות ריבוע)?`,
                `כפל הצלע בעצמה: ריבוע ${side}. מה השטח?`,
                `ריבוע ${side} על ${side}: כמה יחידות שטח?`,
                `חשבו: ריבוע צלע ${side}. שטח = צלע × צלע.`,
                `ריבוע באורך ${side} — מה שטח הפנים?`,
                `נתון ריבוע צלע ${side}. מה השטח הכולל?`,
                `כמה שטח יש לריבוע עם צלע ${side} יחידות?`,
              ][aw];
            } else if (levelKey === "medium") {
              question = [
                `מה השטח של ריבוע עם צלע ${side}?`,
                `נתון ריבוע, צלע ${side}. חשבו שטח פנים.`,
                `ביטוי לשטח ריבוע: צלע ${side}. מה הערך המספרי?`,
                `ריבוע מידות ${side}×${side}: חישוב שטח.`,
                `חשבו שטח ריבוע צלע ${side} יחידות.`,
                `ריבוע ${side} יחידות — מה שטחו במישור?`,
                `שטח ריבוע: צלע ${side}. מה התוצאה?`,
                `אורך ${side}, רוחב ${side}: חשבו שטח הריבוע.`,
              ][aw];
            } else {
              question = [
                `אתגר — שטח ריבוע במישור: צלע ${side}, ללא הנחיות נוספות. מה השטח?`,
                `שטח ריבוע ללא רמזים: צלע ${side} בלבד.`,
                `הוכיחו בראש ואז חשבו — ריבוע צלע ${side}, מה השטח?`,
                `אתגר חישוב: ריבוע ${side}×${side} (ללא עזרה).`,
                `ריבוע צלע ${side}: חישוב עצמאי של שטח.`,
                `שטח במישור — ריבוע ${side} יחידות. מהו?`,
                `בדיקת הבנה: ריבוע ${side}, מה השטח?`,
                `ריבוע ${side} יחידות — הוכיחו וחשבו שטח.`,
              ][aw];
            }
          } else {
            question = `חישוב שטח ריבוע במישור: צלע ${side}. מה השטח?`;
          }
          break;
        }

        case "rectangle": {
          const length = Math.floor(Math.random() * level.maxSide) + 1;
          const width = Math.floor(Math.random() * level.maxSide) + 1;
          const useStory = allowStory && Math.random() < 0.5;

          params = {
            length,
            width,
            kind: useStory ? "story_rectangle_area" : "rectangle_area",
            patternFamily: useStory
              ? "area_rectangle_story"
              : `area_rectangle_${formulaBand}_${levelKey}`,
          };
          correctAnswer = round(length * width);

          if (useStory) {
            question = `רצפת חדר של ליאו היא מלבן באורך ${length} מטר וברוחב ${width} מטר. מה שטח הרצפה במטרים רבועים?`;
          } else if (formulaBand === "early") {
            if (levelKey === "easy") {
              question = `מלבן על רשת: שורות ${length}, עמודות ${width} — כמה משבצות (שטח)?`;
            } else if (levelKey === "medium") {
              question = `שטח מלבן = אורך × רוחב. נתון ${length} ו-${width} — חשבו את השטח.`;
            } else {
              question = `אתגר: מלבן ${length}×${width} במישור — מה השטח ללא ציור עזר?`;
            }
          } else if (formulaBand === "mid") {
            const rw = Math.floor(Math.random() * 8);
            if (levelKey === "easy") {
              question = [
                `מלבן שאורכו ${length} יחידות ורוחבו ${width} יחידות. מה שטח המלבן?`,
                `מלבן שאורכו ${length} יחידות ורוחבו ${width} יחידות. שטח = אורך × רוחב. מה השטח?`,
                `נתון מלבן: אורך = ${length} יחידות, רוחב = ${width} יחידות. מה שטחו?`,
                `חשבו שטח מלבן באורך ${length} וברוחב ${width}.`,
                `מלבן ${length} על ${width} — כמה יחידות שטח?`,
                `מלבן: ${length} יחידות ארוכה ו-${width} יחידות רחבה. מה השטח?`,
                `מה השטח? מלבן מידות ${length} ו-${width} יחידות.`,
                `מלבן באורך ${length} וברוחב ${width}. מה שטח הפנים?`,
              ][rw];
            } else if (levelKey === "medium") {
              question = [
                `מה שטח המלבן? אורך ${length} יחידות, רוחב ${width} יחידות.`,
                `שטח = אורך × רוחב. מלבן באורך ${length} יחידות וברוחב ${width} יחידות — מה השטח?`,
                `מלבן באורך ${length} יחידות וברוחב ${width} יחידות. מה שטחו?`,
                `חישוב שטח: מלבן ${length} יחידות על ${width} יחידות.`,
                `מלבן מידות ${length} ו-${width} — מה השטח הכולל?`,
                `אורך ${length}, רוחב ${width}: חשבו שטח.`,
                `כמה שטח במלבן ${length} על ${width} יחידות?`,
                `מלבן ${length}×${width}: מה שטחו במישור?`,
              ][rw];
            } else {
              question = [
                `מלבן שאורכו ${length} יחידות ורוחבו ${width} יחידות. מה שטח המלבן?`,
                `מלבן באורך ${length} יחידות וברוחב ${width} יחידות (ללא ציור). מה השטח?`,
                `בדקו לפני בחירה — מלבן ${length}×${width} יחידות. מה שטח המלבן?`,
                `אתגר: מלבן ${length}×${width} במישור — חשבו שטח.`,
                `מלבן ${length} על ${width}: מה השטח ללא רמז?`,
                `שטח מלבן ${length} ו-${width} — חישוב מהיר.`,
                `מלבן מידות ${length} ו-${width} יחידות. מה השטח?`,
                `חישוב: מלבן ${length}×${width} (ללא עזרה חזותית).`,
              ][rw];
            }
          } else {
            question = `שטח מלבן: אורך ${length}, רוחב ${width}. מה התוצאה?`;
          }
          break;
        }

        case "triangle": {
          const base = Math.floor(Math.random() * level.maxSide) + 1;
          const height = Math.floor(Math.random() * level.maxSide) + 1;
          const useStory = allowStory && Math.random() < 0.3;

          params = {
            base,
            height,
            kind: useStory ? "story_triangle_area" : "triangle_area",
          };
          correctAnswer = round((base * height) / 2);

          if (useStory) {
            question = `גג של בית הוא משולש עם בסיס ${base} מטר וגובה ${height} מטר. מה שטח הגג בצד אחד?`;
          } else if (formulaBand === "early") {
            question = `משולש: בסיס ${base}, גובה ${height}. שטח ≈ חצי מ־(בסיס × גובה). כמה?`;
          } else if (formulaBand === "mid") {
            if (levelKey === "easy") {
              question = `משולש בסיס ${base}, גובה ${height}: שטח = חצי × בסיס × גובה. מה התוצאה?`;
            } else if (levelKey === "medium") {
              question = `מה השטח של משולש עם בסיס ${base} וגובה ${height}?`;
            } else {
              question = `אתגר שטח משולש — בסיס ${base}, גובה ${height}. מה השטח?`;
            }
          } else {
            question = `חישוב שטח משולש: בסיס ${base}, גובה ${height}. מה השטח?`;
          }
          break;
        }

        case "parallelogram": {
          const base = Math.floor(Math.random() * level.maxSide) + 1;
          const height = Math.floor(Math.random() * level.maxSide) + 1;
          params = { base, height, kind: "parallelogram_area" };
          correctAnswer = round(base * height);
          if (formulaBand === "late") {
            question = `מקבילית במישור: בסיס ${base}, גובה לבסיס ${height}. מה השטח?`;
          } else if (levelKey === "easy") {
            question = `מקבילית: בסיס ${base}, גובה ${height}. שטח = בסיס × גובה. מה התוצאה?`;
          } else if (levelKey === "medium") {
            question = `מה השטח של מקבילית עם בסיס ${base} וגובה ${height}?`;
          } else {
            question = `אתגר — מקבילית בסיס ${base}, גובה ${height}. מה השטח?`;
          }
          break;
        }

        case "trapezoid": {
          const base1 = Math.floor(Math.random() * level.maxSide) + 1;
          const base2 = Math.floor(Math.random() * level.maxSide) + 1;
          const height = Math.floor(Math.random() * level.maxSide) + 1;
          params = { base1, base2, height, kind: "trapezoid_area" };
          correctAnswer = round(((base1 + base2) * height) / 2);
          question =
            formulaBand === "late"
              ? `טרפז: בסיסים ${base1} ו-${base2}, גובה ${height}. מה השטח? (ממוצע הבסיסים × גובה)`
              : `מה השטח של טרפז עם בסיסים ${base1} ו-${base2} וגובה ${height}?`;
          break;
        }

        case "circle": {
          const radius =
            Math.floor(Math.random() * (level.maxSide / 2)) + 1;
          const useStory = allowStory && Math.random() < 0.4;

          params = {
            radius,
            kind: useStory ? "story_circle_area" : "circle_area",
          };
          correctAnswer = round(PI * radius * radius);

          if (useStory) {
            question = `מגרש משחקים עגול בעל רדיוס ${radius} מטר. מה שטח המגרש? (π = 3.14)`;
          } else if (formulaBand === "late") {
            question =
              gradeKey === "g6"
                ? `דיסק במישור, רדיוס ${radius}. מה השטח? (π = 3.14)`
                : `עיגול ברדיוס ${radius}: מה השטח? (π = 3.14)`;
          } else {
            question = `מה השטח של עיגול עם רדיוס ${radius}? (π = 3.14)`;
          }
          break;
        }

        default: {
          const side = Math.floor(Math.random() * level.maxSide) + 1;
          params = { side, kind: "square_area" };
          correctAnswer = round(side * side);
          question =
            formulaBand === "early"
              ? `ריבוע: צלע ${side}. כמה שטח? (צלע × צלע)`
              : formulaBand === "mid"
                ? `מה השטח של ריבוע עם צלע ${side}?`
                : `שטח ריבוע: צלע ${side}. מה התוצאה?`;
        }
      }
      break;
    }

    // ===================== PERIMETER =====================
    case "perimeter": {
      switch (shape) {
        case "square": {
          const side = Math.floor(Math.random() * level.maxSide) + 1;
          const useStory = allowStory && Math.random() < 0.4;

          params = { side, kind: useStory ? "story_square_perimeter" : "square_perimeter" };
          correctAnswer = round(side * 4);

          if (useStory) {
            const storyVariants = [
              `ליאו רוצה לשים גדר מסביב לגינה בצורת ריבוע, אורך כל צלע הוא ${side} מטר. מה אורך הגדר הכולל שהוא צריך?`,
              `גינה ריבועית עם צלע ${side} מטר. כמה מטרים של גדר צריך להקיף אותה?`,
              `רצפת ריבועית צלעה ${side} מטר. כמה מטרים של מסגרת צריך?`,
              `מגרש משחקים ריבועי באורך ${side} מטר. מה אורך הגדר סביבו?`,
            ];
            question = storyVariants[Math.floor(Math.random() * storyVariants.length)];
          } else if (formulaBand === "early") {
            const earlyVariants = [
              `ריבוע: כל צלע ${side}. מה ההיקף? (חברו את ארבע הצלעות)`,
              `חשבו היקף ריבוע: צלע ${side}. (4×צלע)`,
              `ריבוע ${side} יחידות לכל צלע — מה סכום המעטפת?`,
            ];
            question = earlyVariants[Math.floor(Math.random() * earlyVariants.length)];
          } else if (formulaBand === "mid") {
            const variants = [
              `מה ההיקף של ריבוע עם צלע ${side}?`,
              `חישוב היקף: ריבוע צלע ${side} יחידות.`,
              `ריבוע צלע ${side} — מה ההיקף הכולל?`,
              `היקף ריבוע: כל צלע ${side} יחידות.`,
              `כמה יחידות היקף יש לריבוע ${side} לכל צלע?`,
              `צלע ${side}: חשבו היקף הריבוע.`,
              `ריבוע מידות ${side} לכל צלע. מה ההיקף?`,
              `ריבוע ${side}×${side}: מה סכום צלעות המעטפת?`,
            ];
            question = variants[Math.floor(Math.random() * variants.length)];
          } else {
            const lateVariants = [
              `היקף ריבוע במישור: צלע ${side}. מה סכום צלעות המעטפת?`,
              `חישוב היקף — ריבוע צלע ${side} (נוסחה).`,
              `ריבוע צלע ${side}: הוכיחו וחשבו היקף.`,
            ];
            question = lateVariants[Math.floor(Math.random() * lateVariants.length)];
          }
          break;
        }

        case "rectangle": {
          const length = Math.floor(Math.random() * level.maxSide) + 1;
          const width = Math.floor(Math.random() * level.maxSide) + 1;
          const useStory = allowStory && Math.random() < 0.5;
          const phrasing = Math.floor(Math.random() * 8);

          params = {
            length,
            width,
            kind: useStory ? "story_rectangle_perimeter" : "rectangle_perimeter",
          };
          correctAnswer = round((length + width) * 2);

          if (useStory) {
            const storyVariants = [
              `גינה מלבנית מוקפת בגדר. האורך ${length} מטר והרוחב ${width} מטר. כמה מטרים של גדר צריך בסך הכל?`,
              `רצפת חדר מלבנית באורך ${length} מטר ורוחב ${width} מטר. כמה מטרים של מסגרת צריך?`,
              `מגרש משחקים מלבני אורכו ${length} מטר ורוחבו ${width} מטר. מה אורך הגדר סביבו?`,
              `בריכה מלבנית באורך ${length} מטר וברוחב ${width} מטר. כמה מטרים של מסגרת?`,
            ];
            question = storyVariants[Math.floor(Math.random() * storyVariants.length)];
          } else if (formulaBand === "early") {
            const earlyVariants = [
              `מלבן: אורך ${length}, רוחב ${width}. מה ההיקף? (פעמיים אורך+רוחב)`,
              `חשבו היקף מלבן: ${length} ו-${width}. (2×(א+ר))`,
              `מלבן ${length} על ${width}: חברו את ארבע הצלעות.`,
            ];
            question = earlyVariants[phrasing % earlyVariants.length];
          } else if (formulaBand === "mid") {
            const variants = [
              `מה ההיקף של מלבן עם אורך ${length} ורוחב ${width}?`,
              `חישוב היקף: מלבן ${length} יחידות על ${width} יחידות.`,
              `מלבן אורכו ${length} ורוחבו ${width} — מה ההיקף?`,
              `היקף מלבן: ${length} ו-${width} יחידות.`,
              `כמה יחידות היקף יש במלבן ${length} על ${width}?`,
              `אורך ${length}, רוחב ${width}: חשבו היקף המלבן.`,
              `מלבן מידות ${length} ו-${width}. מה סכום צלעות המעטפת?`,
              `מלבן ${length}×${width}: מה ההיקף הכולל?`,
            ];
            question = variants[phrasing];
          } else {
            const lateVariants = [
              `מלבן שאורכו ${length} יחידות ורוחבו ${width} יחידות. היקף = 2 × (אורך + רוחב). מה היקף המלבן?`,
              `חישוב היקף — מלבן ${length} ו-${width} יחידות (נוסחה).`,
              `מלבן מידות ${length} ו-${width}: הוכיחו וחשבו היקף.`,
            ];
            question = lateVariants[phrasing % lateVariants.length];
          }
          break;
        }

        case "triangle": {
          const side1 = Math.floor(Math.random() * level.maxSide) + 1;
          const side2 = Math.floor(Math.random() * level.maxSide) + 1;
          const side3 = Math.floor(Math.random() * level.maxSide) + 1;
          params = { side1, side2, side3, kind: "triangle_perimeter" };
          correctAnswer = round(side1 + side2 + side3);
          question =
            formulaBand === "late"
              ? `היקף משולש במישור: צלעות ${side1}, ${side2}, ${side3}. מה סכום צלעות המעטפת?`
              : `מה ההיקף של משולש עם צלעות ${side1}, ${side2}, ${side3}?`;
          break;
        }

        case "circle": {
          const radius =
            Math.floor(Math.random() * (level.maxSide / 2)) + 1;
          const useStory = allowStory && Math.random() < 0.4;

          params = { radius, kind: useStory ? "story_circle_perimeter" : "circle_perimeter" };
          correctAnswer = round(2 * PI * radius);

          if (useStory) {
            question = `שביל הליכה מקיף אגם עגול בעל רדיוס ${radius} מטר. כמה מטרים אורך השביל? (π = 3.14)`;
          } else if (formulaBand === "late") {
            question = `מעגל ברדיוס ${radius}: מה אורך המעטפת (היקף)? (π = 3.14)`;
          } else {
            question = `מה ההיקף של עיגול עם רדיוס ${radius}? (π = 3.14)`;
          }
          break;
        }

        default: {
          const side = Math.floor(Math.random() * level.maxSide) + 1;
          params = { side, kind: "square_perimeter" };
          correctAnswer = round(side * 4);
          question =
            formulaBand === "early"
              ? `ריבוע: צלע ${side}. מה ההיקף?`
              : formulaBand === "mid"
                ? `מה ההיקף של ריבוע עם צלע ${side}?`
                : `היקף ריבוע: צלע ${side}. מה התוצאה?`;
        }
      }
      break;
    }

    // ===================== VOLUME =====================
    case "volume": {
      switch (shape) {
        case "cube": {
          const side =
            Math.floor(Math.random() * (level.maxSide / 2)) + 1;
          const useStory = allowStory && Math.random() < 0.4;

          params = { side, kind: useStory ? "story_cube_volume" : "cube_volume" };
          correctAnswer = round(side * side * side);

          if (useStory) {
            question = `קופסת משחקים בצורת קובייה, אורך הצלע שלה ${side} ס"מ. מה נפח הקופסה בס"מ מעוקב?`;
          } else if (formulaBand === "early") {
            question = `קובייה: צלע ${side}. נפח = צלע × צלע × צלע. כמה?`;
          } else if (formulaBand === "mid") {
            if (levelKey === "easy") {
              question = `קובייה צלע ${side}: נפח = צלע³. מה הנפח?`;
            } else if (levelKey === "medium") {
              question = `מה הנפח של קובייה עם צלע ${side}?`;
            } else {
              question = `נפח קובייה במרחב — צלע ${side}. מה הנפח?`;
            }
          } else {
            question = `נפח קובייה: צלע ${side}. מה הנפח?`;
          }
          break;
        }

        case "rectangular_prism": {
          const length =
            Math.floor(Math.random() * (level.maxSide / 2)) + 1;
          const width =
            Math.floor(Math.random() * (level.maxSide / 2)) + 1;
          const height =
            Math.floor(Math.random() * level.maxSide) + 1;
          const useStory =
            allowStory && !geoForceKind && Math.random() < 0.5;

          params = {
            length,
            width,
            height,
            kind: useStory ? "story_box_volume" : "rectangular_prism_volume",
          };
          correctAnswer = round(length * width * height);

          if (useStory) {
            question = `ליאו אורז צעצועים בקופסת קרטון בצורת תיבה באורך ${length} ס"מ, רוחב ${width} ס"מ וגובה ${height} ס"מ. מה נפח הקופסה בס"מ מעוקב?`;
          } else if (formulaBand === "late") {
            if (levelKey === "easy") {
              question = `תיבה ${length}×${width}×${height}: נפח = אורך×רוחב×גובה. מה הנפח?`;
            } else if (levelKey === "medium") {
              question = `תיבה מלבנית: ${length} × ${width} × ${height}. מה הנפח?`;
            } else {
              question = `אתגר נפח — תיבה ממדים ${length}×${width}×${height} (יחידות עקביות). מה הנפח?`;
            }
          } else if (gradeKey === "g4") {
            if (levelKey === "easy") {
              question = `כיתה ד׳ (קל): תיבה ${length}×${width}×${height} ס"מ — נפח = אורך×רוחב×גובה. כמה ס"מ מעוקב?`;
            } else if (levelKey === "medium") {
              question = `כיתה ד׳: תיבה מלבנית בממדים ${length} × ${width} × ${height} ס"מ. מה הנפח?`;
            } else {
              question = `כיתה ד׳ (מאתגר): תיבה ${length}×${width}×${height} ס"מ — ודאו יחידות ואז חשבו נפח.`;
            }
          } else if (gradeKey === "g5") {
            question = `תיבה מלבנית במדידה ${length}×${width}×${height}: חשבו נפח (ס"מ מעוקב).`;
          } else {
            question = `מה הנפח של תיבה עם אורך ${length}, רוחב ${width} וגובה ${height}?`;
          }
          break;
        }

        case "cylinder": {
          const radius =
            Math.floor(Math.random() * (level.maxSide / 3)) + 1;
          const height =
            Math.floor(Math.random() * level.maxSide) + 1;
          params = { radius, height, kind: "cylinder_volume" };
          correctAnswer = round(PI * radius * radius * height);
          question =
            gradeKey === "g6"
              ? `גליל: רדיוס ${radius}, גובה ${height}. מה הנפח? (π = 3.14)`
              : `מה הנפח של גליל עם רדיוס ${radius} וגובה ${height}? (π = 3.14)`;
          break;
        }

        case "sphere": {
          const radius =
            Math.floor(Math.random() * (level.maxSide / 3)) + 1;
          params = { radius, kind: "sphere_volume" };
          correctAnswer = round((4 / 3) * PI * radius * radius * radius);
          question =
            gradeKey === "g6"
              ? `כדור במרחב, רדיוס ${radius}. מה הנפח? (π = 3.14)`
              : `מה הנפח של כדור עם רדיוס ${radius}? (π = 3.14)`;
          break;
        }

        case "pyramid": {
          // נפח פירמידה = (1/3) × שטח בסיס × גובה
          // נשתמש בפירמידה עם בסיס ריבועי או מלבני
          const baseSide = Math.floor(Math.random() * (level.maxSide / 2)) + 1;
          const height = Math.floor(Math.random() * level.maxSide) + 1;
          const isSquareBase = Math.random() < 0.5;
          
          if (isSquareBase) {
            const baseArea = baseSide * baseSide;
            params = { baseSide, height, baseArea, kind: "pyramid_volume_square" };
            correctAnswer = round((baseArea * height) / 3);
            question =
              gradeKey === "g6"
                ? `פירמידה: בסיס ריבועי צלע ${baseSide}, גובה ${height}. נפח = ⅓×שטח בסיס×גובה — כמה?`
                : `מה הנפח של פירמידה עם בסיס ריבועי (צלע ${baseSide}) וגובה ${height}?`;
          } else {
            const baseWidth = Math.floor(Math.random() * (level.maxSide / 2)) + 1;
            const baseArea = baseSide * baseWidth;
            params = { baseSide, baseWidth, height, baseArea, kind: "pyramid_volume_rectangular" };
            correctAnswer = round((baseArea * height) / 3);
            question =
              gradeKey === "g6"
                ? `פירמידה: בסיס מלבני ${baseSide}×${baseWidth}, גובה ${height}. חשבו נפח (⅓×בסיס×גובה).`
                : `מה הנפח של פירמידה עם בסיס מלבני (${baseSide} × ${baseWidth}) וגובה ${height}?`;
          }
          break;
        }

        case "cone": {
          // נפח חרוט = (1/3) × π × רדיוס² × גובה
          const radius = Math.floor(Math.random() * (level.maxSide / 3)) + 1;
          const height = Math.floor(Math.random() * level.maxSide) + 1;
          params = { radius, height, kind: "cone_volume" };
          correctAnswer = round((PI * radius * radius * height) / 3);
          question =
            gradeKey === "g6"
              ? `חרוט: רדיוס ${radius}, גובה ${height}. נפח = ⅓πr²h (π = 3.14) — כמה?`
              : `מה הנפח של חרוט עם רדיוס ${radius} וגובה ${height}? (π = 3.14)`;
          break;
        }

        case "prism": {
          // נפח מנסרה = שטח בסיס × גובה
          const height = Math.floor(Math.random() * level.maxSide) + 1;
          const trianglePrismOk = isPrismVolumeTriangleAllowed();
          const baseType =
            trianglePrismOk && Math.random() < 0.5 ? "triangle" : "rectangle";

          if (baseType === "triangle") {
            const base = Math.floor(Math.random() * (level.maxSide / 2)) + 1;
            const baseHeight = Math.floor(Math.random() * (level.maxSide / 2)) + 1;
            const baseArea = (base * baseHeight) / 2;
            params = { base, baseHeight, height, baseArea, kind: "prism_volume_triangle" };
            correctAnswer = round(baseArea * height);
            question = `מה הנפח של מנסרה עם בסיס משולש (בסיס ${base}, גובה ${baseHeight}) וגובה המנסרה ${height}?`;
          } else {
            const baseLength = Math.floor(Math.random() * (level.maxSide / 2)) + 1;
            const baseWidth = Math.floor(Math.random() * (level.maxSide / 2)) + 1;
            const baseArea = baseLength * baseWidth;
            params = { baseLength, baseWidth, height, baseArea, kind: "prism_volume_rectangular" };
            correctAnswer = round(baseArea * height);
            question = `מה הנפח של מנסרה עם בסיס מלבני (${baseLength} × ${baseWidth}) וגובה המנסרה ${height}?`;
          }
          break;
        }

        default: {
          const length =
            Math.floor(Math.random() * (level.maxSide / 2)) + 1;
          const width =
            Math.floor(Math.random() * (level.maxSide / 2)) + 1;
          const height =
            Math.floor(Math.random() * level.maxSide) + 1;
          params = {
            length,
            width,
            height,
            kind: "rectangular_prism_volume",
            patternFamily: `prism_volume_${formulaBand}_${levelKey}`,
          };
          correctAnswer = round(length * width * height);
          if (formulaBand === "late") {
            question =
              levelKey === "easy"
                ? `תיבה במרחב — מידות ${length}×${width}×${height}. נפח = אורך×רוחב×גובה. מה הנפח?`
                : levelKey === "medium"
                  ? `נפח גוף תיבתי: ${length} × ${width} × ${height}. מה התוצאה?`
                  : `אתגר נפח: תיבה ${length}×${width}×${height} — חשבו לפני שבוחרים.`;
          } else if (levelKey === "easy") {
            question = `כמה יחידות נפח בתיבה ${length}×${width}×${height}? (כפל שלושת המידות)`;
          } else if (levelKey === "medium") {
            question = `מה הנפח של תיבה עם אורך ${length}, רוחב ${width} וגובה ${height}?`;
          } else {
            question = `ניתוח נפח — תיבה ${length}×${width}×${height}. מה המוצא?`;
          }
        }
      }
      break;
    }

    // ===================== ANGLES =====================
    case "angles": {
      const angle1 = Math.floor(Math.random() * 61) + 40;
      const maxAngle2 = 160 - angle1;
      const angle2 = Math.floor(Math.random() * (maxAngle2 - 19)) + 20;
      const angle3 = 180 - angle1 - angle2;

      params = {
        angle1,
        angle2,
        angle3,
        kind: "triangle_angles",
        patternFamily: `triangle_angles_${formulaBand}_${levelKey}`,
      };
      correctAnswer = round(angle3);
      {
        const baseMid = `במשולש, זווית אחת היא ${angle1}° וזווית שנייה היא ${angle2}°. מה הזווית השלישית?`;
        const baseMidB = `זוויות במשולש: ${angle1}° ו-${angle2}° כבר ידועות. מה נשאר לזווית השלישית?`;
        const baseMidC = `ידועות ${angle1}° ו-${angle2}° — השלימו את הזווית השלישית במשולש.`;
        const baseLate = `במשולש, שתי זוויות ידועות (${angle1}° ו-${angle2}°). מה הזווית השלישית?`;
        const tw = Math.floor(Math.random() * 3);
        if (formulaBand === "mid") {
          if (levelKey === "easy") {
            question = [
              `כלל בסיס: סכום זוויות במשולש הוא 180°. ${baseMid}`,
              `זכרו: במשולש סה״כ 180°. ${baseMidB}`,
              `משולש פשוט — ${baseMidC}`,
            ][tw];
          } else if (levelKey === "medium") {
            question = [
              `חישוב זוויות במשולש — ${baseMid}`,
              `מציאת זווית חסרה במשולש: ${baseMidB}`,
              `חישוב זוויות במשולש — ${baseMidC}`,
            ][tw];
          } else {
            question = [
              formatTriangleAnglesKnownTwoStem(angle1, angle2),
              `חישוב זוויות במשולש — ידועות ${angle1}° ו-${angle2}°. מה נשאר?`,
              `חישוב זוויות במשולש — ידועות ${angle1}° ו-${angle2}°. מה התוצאה?`,
            ][tw];
          }
        } else if (levelKey === "easy") {
          question = formatTriangleAnglesKnownTwoStem(angle1, angle2);
        } else if (levelKey === "medium") {
          question = baseLate;
        } else {
          question = `חישוב זוויות במשולש — ${baseLate}`;
        }
      }
      break;
    }

    // ===================== PYTHAGORAS =====================
    case "pythagoras": {
      const triples = [
        [3, 4, 5],
        [5, 12, 13],
        [6, 8, 10],
        [8, 15, 17],
      ];
      const [ba, bb, bc] =
        triples[Math.floor(Math.random() * triples.length)];
      const maxK = gradeKey === "g6" ? 3 : 2;
      const k = Math.floor(Math.random() * maxK) + 1;

      const a = ba * k;
      const b = bb * k;
      const c = bc * k;

      // לפעמים שואלים על היתר (כמו קודם), לפעמים על אחד הניצבים
      const askLeg =
        geoForceKind === "pythagoras_leg"
          ? true
          : geoForceKind === "pythagoras_hyp"
            ? false
            : allowStory && Math.random() < 0.4;
      if (!askLeg) {
        params = { a, b, c, which: "hypotenuse", kind: "pythagoras_hyp" };
        correctAnswer = round(c);
        if (levelKey === "easy") {
          question = `פיתגורס (קל): ניצבים ${a} ו-${b} — מה אורך היתר?`;
        } else if (levelKey === "medium") {
          question =
            gradeKey === "g6" && Math.random() < 0.5
              ? `משולש ישר־זווית: ניצבים ${a} ו-${b}. מה אורך היתר (c)?`
              : `במשולש ישר זווית, הניצבים הם ${a} ו-${b}. מה אורך היתר?`;
        } else {
          question = `אתגר פיתגורס — ניצבים ${a} ו-${b}: חשבו היתר והסבירו לעצמכם את הנוסחה.`;
        }
      } else {
        // נשאל על ניצב חסר
        const missing = Math.random() < 0.5 ? "a" : "b";
        if (missing === "a") {
          params = { a, b, c, which: "leg_a", kind: "pythagoras_leg" };
          correctAnswer = round(a);
          question =
            levelKey === "easy"
              ? `ניצב חסר (קל): היתר ${c}, ניצב ידוע ${b}. מה הניצב השני?`
              : levelKey === "medium"
                ? `במשולש ישר זווית, היתר הוא ${c} והניצב השני הוא ${b}. מה אורך הניצב החסר?`
                : `פיתגורס הפוך (אתגר): היתר ${c}, ניצב ${b} — מצאו את הניצב השני.`;
        } else {
          params = { a, b, c, which: "leg_b", kind: "pythagoras_leg" };
          correctAnswer = round(b);
          question =
            levelKey === "easy"
              ? `ניצב חסר (קל): היתר ${c}, ניצב ידוע ${a}. מה הניצב השני?`
              : levelKey === "medium"
                ? `במשולש ישר זווית, היתר הוא ${c} והניצב השני הוא ${a}. מה אורך הניצב החסר?`
                : `פיתגורס הפוך (אתגר): היתר ${c}, ניצב ${a} — מצאו את הניצב השני.`;
        }
      }
      break;
    }

    // ===================== SHAPES BASIC =====================
    case "shapes_basic": {
      // כיתה א' - זיהוי בסיסי, כיתה ד' - תכונות
      if (gradeKey === "g1") {
        // שאלות זיהוי בסיסיות - מה השם של הצורה?
        const side = Math.floor(Math.random() * level.maxSide) + 1;
        const isSquare =
          geoForceKind === "shapes_basic_square" ||
          (geoForceKind !== "shapes_basic_rectangle" && Math.random() < 0.5);
        
        if (isSquare) {
          params = {
            shape: "ריבוע",
            side,
            kind: "shapes_basic_square",
            patternFamily:
              levelKey === "easy"
                ? "shapes_basic_square_g1_easy"
                : levelKey === "medium"
                  ? "shapes_basic_square_g1_medium"
                  : "shapes_basic_square_g1_hard",
          };
          correctAnswer = 1; // ריבוע
          const sqW = Math.floor(Math.random() * 3);
          question =
            levelKey === "easy"
              ? [
                  `שאלת זיהוי קצרה — ריבוע: כל הצלעות באורך ${side}. מה סוג הצורה? (1 = ריבוע, 2 = מלבן)`,
                  `בוחנים צורה סגורה: ארבע צלעות שוות (${side}) וזוויות ישרות. מה היא? (1 = ריבוע, 2 = מלבן)`,
                  `זיהוי מהיר — מרובע עם צלע ${side} לכל צד. ריבוע או מלבן? (1 = ריבוע, 2 = מלבן)`,
                ][sqW]
              : levelKey === "medium"
                ? [
                    `השוו בין ריבוע למלבן: היקף בסיסי עם צלע ${side} לכל הצלעות. מה מתאים? (1 = ריבוע, 2 = מלבן)`,
                    `ארבע צלעות באורך ${side} — האם זה תיאור של ריבוע? (1 = ריבוע, 2 = מלבן)`,
                    `סימטרייה מלאה בצלעות: כולן ${side}. איזו צורה? (1 = ריבוע, 2 = מלבן)`,
                  ][sqW]
                : [
                    `ניתוח תיאור — מרובע עם ארבע צלעות שוות ${side} וזוויות ישרות. מה סוג הצורה? (1 = ריבוע, 2 = מלבן)`,
                    `תכונות: כל הצלעות ${side}, כל הזוויות ישרות. מה סוג המרובע? (1 = ריבוע, 2 = מלבן)`,
                    `הוכחה מילולית קצרה: מדוע זה ריבוע ולא מלבן כללי? (1 = ריבוע, 2 = מלבן)`,
                  ][sqW];
        } else {
          const width = Math.floor(Math.random() * level.maxSide) + 1;
          params = {
            shape: "מלבן",
            length: side,
            width,
            kind: "shapes_basic_rectangle",
            patternFamily:
              levelKey === "easy"
                ? "shapes_basic_rect_g1_easy"
                : levelKey === "medium"
                  ? "shapes_basic_rect_g1_medium"
                  : "shapes_basic_rect_g1_hard",
          };
          correctAnswer = 2; // מלבן
          const rectW = Math.floor(Math.random() * 3);
          question =
            levelKey === "easy"
              ? [
                  `שאלת זיהוי קצרה — מלבן: אורך ${side}, רוחב ${width}. מה סוג הצורה? (1 = ריבוע, 2 = מלבן)`,
                  `צורה עם זוגות נגדיים שווים: ${side} מול ${side}, ${width} מול ${width}. מה זה? (1 = ריבוע, 2 = מלבן)`,
                  `אורך ${side} ורוחב ${width} (שונים) — ריבוע או מלבן? (1 = ריבוע, 2 = מלבן)`,
                ][rectW]
              : levelKey === "medium"
                ? [
                    `השוו בין ריבוע למלבן: אורך ${side} ורוחב ${width} (לא כל הצלעות שוות). מה מתאים? (1 = ריבוע, 2 = מלבן)`,
                    `מלבן אמיתי: צלעות ${side} ו-${width} לסירוגין. מה סוג הצורה? (1 = ריבוע, 2 = מלבן)`,
                    `האם מדובר בריבוע כשהצלעות ${side} ו-${width}? (1 = ריבוע, 2 = מלבן)`,
                  ][rectW]
                : [
                    `ניתוח תיאור — מרובע עם זוגות צלעות נגדיות שווים אך לא כל ארבע השוות; אורך ${side}, רוחב ${width}. מה סוג הצורה? (1 = ריבוע, 2 = מלבן)`,
                    `זיהוי לפי תכונות: שני אורכי צלע שונים (${side}, ${width}). מה המשמעות? (1 = ריבוע, 2 = מלבן)`,
                    `הסבר מילולי: למה זה מלבן ולא ריבוע? (1 = ריבוע, 2 = מלבן)`,
                  ][rectW];
        }
      } else if (gradeKey === "g2" || gradeKey === "g3") {
        // כיתה ב'-ג' - זיהוי ותכונות בסיסיות (5 variants each)
        const side = Math.floor(Math.random() * level.maxSide) + 1;
        const width = Math.floor(Math.random() * level.maxSide) + 1;
        const isSquare = Math.random() < 0.5;
        const g23w = Math.floor(Math.random() * 5);
        
        if (isSquare) {
          params = {
            shape: "ריבוע",
            side,
            kind: "shapes_basic_square",
            patternFamily: `shapes_basic_square_${gradeKey}_${levelKey}`,
          };
          correctAnswer = 1;
          question =
            levelKey === "easy"
              ? [
                  `זיהוי: ארבע צלעות שוות (${side}), ארבע זוויות ישרות. ריבוע או מלבן? (1=ריבוע, 2=מלבן)`,
                  `בדיקה: מרובע עם צלעות ${side} לכל הצדדים — ריבוע או מלבן? (1=ריבוע, 2=מלבן)`,
                  `מהי הצורה? ארבע צלעות ${side}, זוויות ישרות. (1=ריבוע, 2=מלבן)`,
                  `צורה סגורה: ${side} לכל צלע — ריבוע או מלבן? (1=ריבוע, 2=מלבן)`,
                  `זיהוי: כל הצלעות ${side}, זוויות ישרות. (1=ריבוע, 2=מלבן)`,
                ][g23w]
              : levelKey === "medium"
                ? [
                    `תכונות: צלע ${side} לכל הצלעות. ריבוע או מלבן? (1=ריבוע, 2=מלבן)`,
                    `השוו: ארבע צלעות ${side} שוות. (1=ריבוע, 2=מלבן)`,
                    `זיהוי לפי צלעות: ${side} לכל צלע. (1=ריבוע, 2=מלבן)`,
                    `סוג המרובע? כל הצלעות ${side}. (1=ריבוע, 2=מלבן)`,
                    `בדיקה: צלעות שוות ${side}. (1=ריבוע, 2=מלבן)`,
                  ][g23w]
                : [
                    `ניתוח: מרובע עם ארבע צלעות שוות ${side} וזוויות ישרות. (1=ריבוע, 2=מלבן)`,
                    `תכונות מתמטיות: ארבע צלעות ${side}. (1=ריבוע, 2=מלבן)`,
                    `הוכחה: מדוע ארבע צלעות ${side} יוצרות ריבוע? (1=ריבוע, 2=מלבן)`,
                    `זיהוי מתקדם: מרובע עם צלעות ${side}. (1=ריבוע, 2=מלבן)`,
                    `אתגר: תאר את המרובע עם צלעות ${side}. (1=ריבוע, 2=מלבן)`,
                  ][g23w];
        } else {
          params = {
            shape: "מלבן",
            length: side,
            width,
            kind: "shapes_basic_rectangle",
            patternFamily: `shapes_basic_rect_${gradeKey}_${levelKey}`,
          };
          correctAnswer = 2;
          question =
            levelKey === "easy"
              ? [
                  `זיהוי: אורך ${side}, רוחב ${width} (שונים). ריבוע או מלבן? (1=ריבוע, 2=מלבן)`,
                  `בדיקה: זוגות צלעות ${side} ו-${width}. (1=ריבוע, 2=מלבן)`,
                  `מהי הצורה? ${side} ו-${width} לסירוגין. (1=ריבוע, 2=מלבן)`,
                  `צורה עם צלעות ${side} ו-${width}. (1=ריבוע, 2=מלבן)`,
                  `זיהוי: שני אורכים שונים ${side} ו-${width}. (1=ריבוע, 2=מלבן)`,
                ][g23w]
              : levelKey === "medium"
                ? [
                    `תכונות: אורך ${side}, רוחב ${width} (שונה). (1=ריבוע, 2=מלבן)`,
                    `השוו: זוגות ${side} מול ${width}. (1=ריבוע, 2=מלבן)`,
                    `זיהוי לפי צלעות: ${side} ו-${width}. (1=ריבוע, 2=מלבן)`,
                    `סוג המרובע? ${side} ו-${width}. (1=ריבוע, 2=מלבן)`,
                    `בדיקה: צלעות ${side} ו-${width} לסירוגין. (1=ריבוע, 2=מלבן)`,
                  ][g23w]
                : [
                    `ניתוח: מרובע עם זוגות צלעות ${side} ו-${width}. (1=ריבוע, 2=מלבן)`,
                    `תכונות מתמטיות: ${side} ו-${width} לסירוגין. (1=ריבוע, 2=מלבן)`,
                    `הוכחה: למה ${side} ו-${width} יוצרים מלבן? (1=ריבוע, 2=מלבן)`,
                    `זיהוי מתקדם: מרובע עם צלעות ${side} ו-${width}. (1=ריבוע, 2=מלבן)`,
                    `אתגר: תאר את המרובע עם ${side} ו-${width}. (1=ריבוע, 2=מלבן)`,
                  ][g23w];
        }
      } else {
        // כיתה ד' - תכונות ריבוע ומלבן (expanded to 8 variants)
        const questionType = Math.random();
        const g4w = Math.floor(Math.random() * 8);
        const g4w3 = g4w % 3;
        if (questionType < 0.33) {
          // כמה צלעות שוות יש לריבוע?
          params = { shape: "ריבוע", kind: "shapes_basic_properties_square" };
          correctAnswer = 4; // 4 צלעות שוות
          question =
            levelKey === "easy"
              ? [
                  `ריבוע: כמה צלעות שוות יש לו? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `בריבוע — כמה צלעות באותו אורך? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `ספירת צלעות שוות בריבוע: (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `תכונת ריבוע: מספר צלעות זהות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `זיהוי ריבוע לפי צלעות שוות — כמה? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `חקר תכונות: צלעות שוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `בדיקה: כמה צלעות זהות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `מה מספר הצלעות השוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                ][g4w]
              : levelKey === "medium"
                ? [
                    `כמה צלעות שוות יש לריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `תכונת הצלעות בריבוע — כמה שוות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `זיהוי ריבוע לפי צלעות שוות — כמה? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `ניתוח תכונות ריבוע: צלעות שוות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `חקר ריבוע — מספר צלעות זהות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `בדיקת הבנה: צלעות שוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `הגדרת ריבוע: כמה צלעות שוות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `מה מספר הצלעות הזהות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  ][g4w]
                : [
                    `תכונות ריבוע — כמה צלעות באותו אורך? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `ניתוח ריבוע: כמה צלעות זהות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `הוכחה מילולית — כמה צלעות שוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `אתגר תכונות: צלעות שוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `חקר מעמיק: מספר צלעות זהות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `בדיקה מדויקת: צלעות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `ניתוח מתקדם: צלעות שוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `מה מספר הצלעות השוות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  ][g4w];
        } else if (questionType < 0.66) {
          // כמה זוגות של צלעות שוות יש למלבן?
          params = { shape: "מלבן", kind: "shapes_basic_properties_rectangle" };
          correctAnswer = 2; // 2 זוגות
          question =
            levelKey === "easy"
              ? [
                  `מלבן: כמה זוגות צלעות שוות יש? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                  `זוגות צלעות במלבן — כמה זוגות שווים? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                  `ספירת זוגות צלעות שוות במלבן: (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                ][g4w3]
              : levelKey === "medium"
                ? [
                    `כמה זוגות של צלעות שוות יש למלבן? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                    `תכונת המלבן — כמה זוגות צלעות זהות? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                    `זוגות נגדיים שווים במלבן — כמה זוגות? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                  ][g4w3]
                : [
                    `תכונות מלבן — כמה זוגות צלעות באותו אורך? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                    `ניתוח מלבן: כמה זוגות צלעות שוות? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                    `הסבר מילולי — זוגות צלעות במלבן: (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                  ][g4w3];
        } else {
          // כמה זוויות ישרות יש לריבוע/מלבן?
          const shape = Math.random() < 0.5 ? "ריבוע" : "מלבן";
          params = { shape, kind: "shapes_basic_properties_angles" };
          correctAnswer = 4; // 4 זוויות ישרות
          question =
            levelKey === "easy"
              ? [
                  `${shape}: כמה זוויות ישרות יש? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                  `זוויות ישרות ב${shape} — כמה? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                  `ספירת זוויות ישרות: ${shape}. (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                ][g4w3]
              : levelKey === "medium"
                ? [
                    `כמה זוויות ישרות יש ל${shape}? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                    `זוויות פנימיות ישרות ב${shape} — כמה? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                    `תכונת הזוויות ב${shape}: (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                  ][g4w3]
                : [
                    `זוויות ב${shape} — כמה מהן ישרות? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                    `ניתוח זוויות ב${shape}: (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                    `אתגר קצר — זוויות ישרות ב${shape}: (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                  ][g4w3];
        }
      }
      break;
    }

    // ===================== PARALLEL PERPENDICULAR =====================
    case "parallel_perpendicular": {
      const types = ["מקבילות", "מאונכות"];
      const selectedType = types[Math.floor(Math.random() * types.length)];
      const isParallel = selectedType === "מקבילות";
      const gN = parseInt(String(gradeKey || "").replace(/\D/g, ""), 10) || 0;
      const gradeTag =
        gN === 3
          ? "כיתה ג׳"
          : gN === 4
            ? "כיתה ד׳"
            : gN === 5
              ? "כיתה ה׳"
              : gN === 6
                ? "כיתה ו׳"
                : "";

      params = {
        type: selectedType,
        isParallel,
        kind: "parallel_perpendicular",
        patternFamily: `parallel_perpendicular_${levelKey}`,
        subtype: formulaBand === "mid" ? "mid_band" : "late_band",
      };
      correctAnswer = selectedType;
      if (formulaBand === "mid") {
        question =
          levelKey === "easy"
            ? `${gradeTag ? `${gradeTag}: ` : ""}המילה "${selectedType}" מתארת זוג קווים. סמנו: (1 = מקבילות, 2 = מאונכות)`
            : levelKey === "medium"
              ? `${gradeTag ? `${gradeTag} — ` : ""}סיווג ישרים: "${selectedType}" מתאים לאיזה מספר? (1 = מקבילות, 2 = מאונכות)`
              : `${gradeTag ? `${gradeTag} | ` : ""}הגדרה "${selectedType}" — איזה יחס בין שני ישרים במישור? (1 = מקבילות, 2 = מאונכות)`;
      } else {
        question =
          levelKey === "easy"
            ? `זיהוי מהיר: "${selectedType}" במישור — (1 = מקבילות, 2 = מאונכות)`
            : levelKey === "medium"
              ? `בחירה מדויקת: "${selectedType}" מתאר מצב של שני ישרים. (1 = מקבילות, 2 = מאונכות)`
              : `ניסוח פורמלי: "${selectedType}" כיחס גיאומטרי בין ישרים. (1 = מקבילות, 2 = מאונכות)`;
      }
      break;
    }

    // ===================== TRIANGLES =====================
    case "triangles": {
      const types = ["שווה צלעות", "שווה שוקיים", "שונה צלעות"];
      const selectedType = types[Math.floor(Math.random() * types.length)];
      const triW = Math.floor(Math.random() * 8); // 8 variants

      params = {
        type: selectedType,
        kind: "triangles",
        patternFamily: `triangles_classify_${levelKey}`,
        subtype: formulaBand === "mid" ? "mid_band" : "late_band",
      };
      correctAnswer = selectedType;
      
      if (formulaBand === "mid") {
        question =
          levelKey === "easy"
            ? [
                `לפי השם "${selectedType}" — איזה מספר מתאים? (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `זיהוי משולש: "${selectedType}" = איזה סוג? (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `בחרו את הסוג הנכון: "${selectedType}" מתאר משולש מסוג — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `מהו סוג המשולש "${selectedType}"? (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `חברו בין השם "${selectedType}" לסוג המשולש. (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `סיווג: "${selectedType}" מתאים למשולש מסוג — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `זיהוי שם: "${selectedType}" = ? (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `מה הסוג של משולש שנקרא "${selectedType}"? (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
              ][triW]
            : levelKey === "medium"
              ? [
                  `סיווג משולש לפי תיאור: "${selectedType}". (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `הגדרת סוג משולש: "${selectedType}" מתאר משולש עם תכונות של — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `חקר תכונות: למשולש "${selectedType}" יש צלעות — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `זיהוי לפי הגדרה: "${selectedType}" = משולש עם תכונות ייחודיות של — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `התאמת תיאור: "${selectedType}" מתאים לסוג משולש מספר — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `ניתוח תכונות: משולש "${selectedType}" שייך לקטגוריה — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `זיהוי סוג: השם "${selectedType}" מצביע על משולש מסוג — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `הגדרה מתמטית: "${selectedType}" הוא משולש המוגדר כ — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                ][triW]
              : [
                  `אתגר סיווג: "${selectedType}" כשם סוג משולש. (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `ניתוח מעמיק: "${selectedType}" — מהי הגדרתו המדויקת של משולש זה? (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `הוכחת זיהוי: מדוע "${selectedType}" שייך לקטגוריה מסוימת? (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `אתגר הגדרות: "${selectedType}" מתאר משולש המקיים תנאים של — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `ניתוח תכונות מתמטיות: השם "${selectedType}" מרמז על מאפייני הצלעות — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `סיווג מתקדם: "${selectedType}" = משולש שכל צלעותיו — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `הבנת מונחים: "${selectedType}" מתייחס למשולש עם תכונת — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `אתגר הגדרה: מהו "${selectedType}" במונחי סיווג משולשים? (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                ][triW];
      } else {
        // Late band (G5-G6) - expanded to 16 variants for maximum coverage
        const triLateW = Math.floor(Math.random() * 16);
        question =
          levelKey === "easy"
            ? [
                `בחרו סוג למשולש בשם "${selectedType}": (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `זיהוי: "${selectedType}" מתאים לסוג משולש — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `מהו הסוג: "${selectedType}" = משולש מספר — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `התאמה: השם "${selectedType}" מתאר משולש מסוג — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `סיווג פשוט: "${selectedType}" שייך לקטגוריה — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `זיהוי בסיסי: משולש "${selectedType}" הוא מסוג — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `בחירת סוג: "${selectedType}" מתאים למשולש מספר — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `הגדרה: "${selectedType}" מתאר משולש עם מאפייני — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `זיהוי לפי שם: "${selectedType}" הוא משולש — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `סיווג: "${selectedType}" = משולש מסוג — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `תיאור: "${selectedType}" מתאר משולש — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `מה סוג המשולש "${selectedType}"? (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `חברו שם לסוג: "${selectedType}" = משולש — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `זיהוי קל: "${selectedType}" הוא סוג משולש — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `סימון סוג: "${selectedType}" משולש מספר — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                `בדיקה: "${selectedType}" מתאים לסוג — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
              ][triLateW]
            : levelKey === "medium"
              ? [
                  `התאמת מונח: "${selectedType}" = איזה סוג משולש? (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `מונח מתמטי: "${selectedType}" מגדיר משולש עם תכונות של — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `הגדרה וסיווג: "${selectedType}" מתייחס למשולש המקיים — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `זיהוי מונח: "${selectedType}" = משולש בעל צלעות — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `התאמת הגדרה: "${selectedType}" מתאר משולש שצלעותיו — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `מונח גיאומטרי: "${selectedType}" הוא משולש המוגדר כ — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `סיווג לפי שם: "${selectedType}" מצביע על משולש מסוג — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `הבנת מונח: "${selectedType}" מתייחס למשולש עם מאפייני צלעות — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `ניתוח: "${selectedType}" מתאר משולש עם צלעות — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `זיהוי סוג: "${selectedType}" = סוג משולש — (1 = שווה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `הגדרה: "${selectedType}" מתאים למשולש — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `סיווג משולש: "${selectedType}" הוא — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `מאפייני צלעות: "${selectedType}" = משולש — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `חקר משולשים: "${selectedType}" שייך לסוג — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `בדיקת הבנה: "${selectedType}" סוג משולש — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `מיון משולשים: "${selectedType}" = קטגוריה — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                ][triLateW]
              : [
                  `ניסוח מדויק: "${selectedType}" מתאר משולש מסוג — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `הגדרה מדויקת: "${selectedType}" = משולש המוגדר לפי תכונות הצלעות שלו כ — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `ניתוח מונחי: השם "${selectedType}" מגדיר משולש שמתאפיין ב — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `התאמה מדויקת: "${selectedType}" מתאר משולש עם תכונות ייחודיות של — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `ביטוי מתמטי: "${selectedType}" הוא מונח המתייחס למשולש שבו — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `זיהוי מדויק: "${selectedType}" = משולש המקיים תנאים ספציפיים של — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `הגדרה מתקדמת: "${selectedType}" מוגדר כמשולש שכל צלעותיו — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `ניסוח מתמטי: "${selectedType}" מתייחס למשולש בעל תכונות גיאומטריות של — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `אתגר: "${selectedType}" הוא משולש מסוג — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `חקר מעמיק: "${selectedType}" מתאר משולש — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `ניתוח מתקדם: "${selectedType}" = סוג משולש — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `הוכחה: "${selectedType}" שייך לקטגוריה — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `אתגר הגדרות: "${selectedType}" משולש מסוג — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `חקר תכונות: "${selectedType}" מאפייני צלעות — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `ניתוח מדויק: "${selectedType}" קטגוריית משולש — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                  `הסבר מילולי: "${selectedType}" סוג משולש — (1 = שוׁה צלעות, 2 = שווה שוקיים, 3 = שונה צלעות)`,
                ][triLateW];
      }
      break;
    }

    // ===================== QUADRILATERALS =====================
    case "quadrilaterals": {
      const types = ["ריבוע", "מלבן", "מקבילית", "טרפז"];
      const selectedType = types[Math.floor(Math.random() * types.length)];
      const quadW = Math.floor(Math.random() * 8); // 8 variants
      
      params = { 
        type: selectedType, 
        kind: "quadrilaterals",
        patternFamily: `quadrilaterals_${formulaBand}_${levelKey}`,
      };
      correctAnswer = types.indexOf(selectedType) + 1;
      
      if (formulaBand === "mid") {
        question =
          levelKey === "easy"
            ? [
                `איזה סוג מרובע הוא ${selectedType}? (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `זיהוי מרובע: ${selectedType} = איזה מספר? (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `בחרו את הסוג הנכון: ${selectedType} מתאר מרובע מספר — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `מהו סוג המרובע ${selectedType}? (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `חברו בין השם ${selectedType} לסוג המרובע. (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `סיווג: ${selectedType} מתאים למרובע מסוג — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `זיהוי שם: ${selectedType} = ? (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `מה הסוג של מרובע שנקרא ${selectedType}? (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
              ][quadW]
            : levelKey === "medium"
              ? [
                  `סיווג מרובע לפי תיאור: ${selectedType}. (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `הגדרת סוג מרובע: ${selectedType} מתאר מרובע עם תכונות של — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `חקר תכונות: למרובע ${selectedType} יש צלעות — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `זיהוי לפי הגדרה: ${selectedType} = מרובע עם תכונות ייחודיות של — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `התאמת תיאור: ${selectedType} מתאים לסוג מרובע מספר — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `ניתוח תכונות: מרובע ${selectedType} שייך לקטגוריה — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `זיהוי סוג: השם ${selectedType} מצביע על מרובע מסוג — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `הגדרה מתמטית: ${selectedType} הוא מרובע המוגדר כ — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                ][quadW]
              : [
                  `אתגר סיווג: ${selectedType} כשם סוג מרובע. (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `ניתוח מעמיק: ${selectedType} — מהי הגדרתו המדויקת של מרובע זה? (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `הוכחת זיהוי: מדוע ${selectedType} שייך לקטגוריה מסוימת? (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `אתגר הגדרות: ${selectedType} מתאר מרובע המקיים תנאים של — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `ניתוח תכונות מתמטיות: השם ${selectedType} מרמז על מאפייני הצלעות — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `סיווג מתקדם: ${selectedType} = מרובע שכל צלעותיו — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `הבנת מונחים: ${selectedType} מתייחס למרובע עם תכונת — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `אתגר הגדרה: מהו ${selectedType} במונחי סיווג מרובעים? (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                ][quadW];
      } else {
        question =
          levelKey === "easy"
            ? [
                `סיווג מרובעים: ${selectedType} — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `זיהוי: ${selectedType} מתאים לסוג מרובע — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `מהו הסוג: ${selectedType} = מרובע מספר — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `התאמה: השם ${selectedType} מתאר מרובע מסוג — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `סיווג פשוט: ${selectedType} שייך לקטגוריה — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `זיהוי בסיסי: מרובע ${selectedType} הוא מסוג — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `בחירת סוג: ${selectedType} מתאים למרובע מספר — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                `הגדרה: ${selectedType} מתאר מרובע עם מאפייני — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
              ][quadW]
            : levelKey === "medium"
              ? [
                  `התאמת מונח: ${selectedType} = איזה סוג מרובע? (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `מונח מתמטי: ${selectedType} מגדיר מרובע עם תכונות של — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `הגדרה וסיווג: ${selectedType} מתייחס למרובע המקיים — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `זיהוי מונח: ${selectedType} = מרובע בעל צלעות — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `התאמת הגדרה: ${selectedType} מתאר מרובע שצלעותיו — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `מונח גיאומטרי: ${selectedType} הוא מרובע המוגדר כ — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `סיווג לפי שם: ${selectedType} מצביע על מרובע מסוג — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `הבנת מונח: ${selectedType} מתייחס למרובע עם מאפייני צלעות — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                ][quadW]
              : [
                  `ניסוח מדויק: ${selectedType} מתאר מרובע מסוג — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `הגדרה מדויקת: ${selectedType} = מרובע המוגדר לפי תכונות הצלעות שלו כ — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `ניתוח מונחי: השם ${selectedType} מגדיר מרובע שמתאפיין ב — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `התאמה מדויקת: ${selectedType} מתאר מרובע עם תכונות ייחודיות של — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `ביטוי מתמטי: ${selectedType} הוא מונח המתייחס למרובע שבו — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `זיהוי מדויק: ${selectedType} = מרובע המקיים תנאים ספציפיים של — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `הגדרה מתקדמת: ${selectedType} מוגדר כמרובע שכל צלעותיו — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                  `ניסוח מתמטי: ${selectedType} מתייחס למרובע בעל תכונות גיאומטריות של — (1 = ריבוע, 2 = מלבן, 3 = מקבילית, 4 = טרפז)`,
                ][quadW];
      }
      break;
    }

    // ===================== TRANSFORMATIONS =====================
    case "transformations": {
      const types = ["הזזה", "שיקוף"];
      const selectedType = types[Math.floor(Math.random() * types.length)];
      const isTranslation = selectedType === "הזזה";
      
      params = { type: selectedType, isTranslation, kind: "transformations" };
      correctAnswer = selectedType;
      if (gradeKey === "g1") {
        question =
          levelKey === "easy"
            ? `טרנספורמציה (כיתה א׳): מה סוג התנועה של ${selectedType}? (1 = הזזה, 2 = שיקוף)`
            : levelKey === "medium"
              ? `מה סוג התנועה של ${selectedType}? (1 = הזזה, 2 = שיקוף)`
              : `אתגר — זיהוי תנועה במישור: ${selectedType}? (1 = הזזה, 2 = שיקוף)`;
      } else if (gradeKey === "g2") {
        question =
          levelKey === "easy"
            ? `(כיתה ב׳) מה סוג הטרנספורמציה של ${selectedType}? (1 = הזזה, 2 = שיקוף)`
            : levelKey === "medium"
              ? `איזה סוג טרנספורמציה מתאים ל־${selectedType}? (1 = הזזה, 2 = שיקוף)`
              : `אתגר טרנספורמציה — ${selectedType}: (1 = הזזה, 2 = שיקוף)`;
      } else {
        question = `איזה סוג טרנספורמציה היא ${selectedType}? (1 = הזזה, 2 = שיקוף)`;
      }
      break;
    }

    // ===================== ROTATION =====================
    case "rotation": {
      const angle = [90, 180, 270][Math.floor(Math.random() * 3)];
      params = {
        angle,
        kind: "rotation",
        patternFamily: `rotation_${formulaBand}_${levelKey}`,
      };
      correctAnswer = angle;
      const rotW = Math.floor(Math.random() * 3);
      if (formulaBand === "mid") {
        if (levelKey === "easy") {
          question = [
            `פעולת סיבוב סביב מרכז: מה גודל הסיבוב במעלות? (רמז: ${angle}°)`,
            `סיבוב חצי/רבע/שלוש רבעים — כמה מעלות במקרה הזה? (${angle}°)`,
            `זווית סיבוב סטנדרטית במישור — בחרו במעלות. (${angle}°)`,
          ][rotW];
        } else if (levelKey === "medium") {
          question = [
            `בכמה מעלות מסתובבת צורה במישור סביב נקודת המרכז? (${angle}°)`,
            `סיבוב סביב מרכז הצורה — מה גודל הסיבוב? (${angle}°)`,
            `מעלות סיבוב במישור (סביב מרכז): (${angle}°)`,
          ][rotW];
        } else {
          question = [
            `סיבוב במערכת צירים — העריכו את מספר המעלות לפני בחירה. (${angle}°)`,
            `סיבוב מדויק — אימות לפני בחירה במעלות. (${angle}°)`,
            `אתגר סיבוב במישור — מה המעלות? (${angle}°)`,
          ][rotW];
        }
      } else if (levelKey === "easy") {
        question = [
          `זווית סיבוב בסיסית במישור — כמה מעלות? (${angle}°)`,
          `כמה מעלות בפעולת סיבוב זו? (${angle}°)`,
          `סיבוב במישור — בחרו זווית נכונה. (${angle}°)`,
        ][rotW];
      } else if (levelKey === "medium") {
        question = [
          `סיבוב במישור סביב מרכז — כמה מעלות? (${angle}°)`,
          `זווית סיבוב סביב נקודת מרכז — מה המעלות? (${angle}°)`,
          `פעולת סיבוב במישור — מה גודל המעלות? (${angle}°)`,
        ][rotW];
      } else {
        question = [
          `אתגר סיבוב — מה גודל הסיבוב במעלות? (${angle}°)`,
          `סיבוב מאתגר — העריכו מעלות. (${angle}°)`,
          `ניתוח סיבוב במישור — מה המעלות? (${angle}°)`,
        ][rotW];
      }
      break;
    }

    // ===================== SYMMETRY =====================
    case "symmetry": {
      const shapes = ["ריבוע", "מלבן", "משולש שווה צלעות"];
      const selectedShape = shapes[Math.floor(Math.random() * shapes.length)];
      const axes = selectedShape === "ריבוע" ? 4 : selectedShape === "מלבן" ? 2 : 3;
      const pickSymStem = (stems) =>
        stems[Math.floor(Math.random() * stems.length)];
      const symW = Math.floor(Math.random() * 8);
      
      params = {
        shape: selectedShape,
        axes,
        kind: "symmetry",
        patternFamily: `symmetry_${formulaBand}_${levelKey}`,
      };
      correctAnswer = axes;
      
      if (formulaBand === "mid") {
        question =
          levelKey === "easy"
            ? [
                `שיקוף במישור — כמה צירי סימטרייה (קווי שיקוף) יש ל${selectedShape}?`,
                `ספירת צירי סימטרייה: כמה קווי שיקוף ל${selectedShape}?`,
                `כמה צירי סימטרייה יש לצורה ${selectedShape}?`,
                `בדיקת סימטרייה: כמה צירים ל${selectedShape}?`,
                `חשבו צירי שיקוף: ${selectedShape} — כמה?`,
                `כמה קווי סימטרייה במישור ל${selectedShape}?`,
                `צירי סימטרייה: ${selectedShape} — מספר?`,
                `מה מספר צירי השיקוף ל${selectedShape}?`,
              ][symW]
            : levelKey === "medium"
              ? [
                  `ספירת צירים: כמה צירי סימטרייה יש ל${selectedShape}?`,
                  `ניתוח סימטרייה — כמה צירי שיקוף ל${selectedShape}?`,
                  `כמה צירי סימטרייה (התאמות) יש ל${selectedShape}?`,
                  `חקר צירי שיקוף: ${selectedShape} — כמה צירים?`,
                  `בדיקת התאמה: כמה צירי סימטרייה ל${selectedShape}?`,
                  `מה מספר צירי הסימטרייה ל${selectedShape}?`,
                  `חישוב צירים: ${selectedShape} — כמה צירי שיקוף?`,
                  `ניתוח צירי סימטרייה ל${selectedShape}.`,
                ][symW]
              : [
                  `ניתוח סימטרייה — כמה צירי שיקוף שונים יש ל${selectedShape}?`,
                  `בשלב אתגר — כמה צירי סימטרייה יש ל${selectedShape}?`,
                  `אתגר: כמה צירי סימטרייה ייחודיים ל${selectedShape}?`,
                  `חקר מעמיק: מספר צירי שיקוף ל${selectedShape}.`,
                  `ניתוח מתקדם: צירי סימטרייה ל${selectedShape} — כמה?`,
                  `אתגר ספירה: כמה צירי סימטרייה ל${selectedShape}?`,
                  `בדיקה מדויקת: צירי שיקוף ב${selectedShape}.`,
                  `הוכחת מספר צירים: ${selectedShape} — כמה?`,
                ][symW];
      } else if (levelKey === "easy") {
        question = pickSymStem([
          `כמה צירי סימטרייה יש לצורה ${selectedShape}?`,
          `ספירת צירים: ${selectedShape} — כמה צירי שיקוף?`,
          `בדיקה: מספר צירי סימטרייה ל${selectedShape}.`,
          `מה מספר צירי השיקוף ל${selectedShape}?`,
          `כמה קווי סימטרייה ל${selectedShape}?`,
          `צירי סימטרייה ב${selectedShape} — מספר?`,
          `חשבו: כמה צירים ל${selectedShape}?`,
          `מספר צירי סימטרייה: ${selectedShape}.`,
          `זיהוי צירים: ${selectedShape} — כמה צירי שיקוף?`,
          `בדיקת סימטרייה: ${selectedShape} — מספר צירים?`,
          `חקר צירי שיקוף: ${selectedShape}.`,
          `ניתוח צירים: ${selectedShape} — כמה צירי סימטרייה?`,
        ]);
      } else if (levelKey === "medium") {
        question = pickSymStem([
          `כמה צירי סימטרייה (התאמות) יש לצורה ${selectedShape}?`,
          `ניתוח: מספר צירי שיקוף ל${selectedShape}.`,
          `בדיקת התאמה: צירי סימטרייה ל${selectedShape}.`,
          `מה מספר צירי הסימטרייה ל${selectedShape}?`,
          `חקר צירים: ${selectedShape} — כמה צירי שיקוף?`,
          `כמה צירי סימטרייה ייחודיים ל${selectedShape}?`,
          `ספירת צירי שיקוף: ${selectedShape}.`,
          `ניתוח צירים: ${selectedShape} — כמה?`,
          `בדיקת סימטרייה מתקדמת: ${selectedShape}.`,
          `ניתוח מעמיק: ${selectedShape} — כמה צירים?`,
          `חקר מדויק: צירי סימטרייה ל${selectedShape}.`,
          `הבנת צירי שיקוף: ${selectedShape}.`,
        ]);
      } else {
        question = pickSymStem([
          `בשלב אתגר — כמה צירי סימטרייה יש ל${selectedShape}?`,
          `אתגר: מספר צירי שיקוף ל${selectedShape}.`,
          `ניתוח מתקדם: צירי סימטרייה ל${selectedShape}.`,
          `בדיקה מעמיקה: כמה צירים ל${selectedShape}?`,
          `אתגר ספירה: צירי סימטרייה ב${selectedShape}.`,
          `חקר מדויק: מספר צירי שיקוף ל${selectedShape}.`,
          `הוכחת מספר צירים: ${selectedShape} — כמה?`,
          `ניתוח אתגר: צירי סימטרייה ל${selectedShape}.`,
          `בדיקה סופית: כמה צירי שיקוף ל${selectedShape}?`,
          `אתגר ניתוח: צירי סימטרייה ב${selectedShape}.`,
          `חקר מתקדם: מספר צירים ל${selectedShape}.`,
          `הבנת מעמיקה: צירי שיקוף ל${selectedShape}.`,
        ]);
      }
      break;
    }

    // ===================== DIAGONAL =====================
    case "diagonal": {
      // מסלול נוסחתי: משתמשים ב־shape שנבחר מ־TOPIC_SHAPES (כולל כפייה ל־harness)
      const fromTopic =
        shape === "square"
          ? "ריבוע"
          : shape === "rectangle"
            ? "מלבן"
            : shape === "parallelogram"
              ? "מקבילית"
              : null;
      const shapeOptions =
        gradeKey === "g5"
          ? ["ריבוע", "מלבן", "מקבילית"]
          : ["ריבוע", "מלבן"];
      const hebShape =
        fromTopic && shapeOptions.includes(fromTopic)
          ? fromTopic
          : shapeOptions[Math.floor(Math.random() * shapeOptions.length)];
      const side = Math.floor(Math.random() * level.maxSide) + 1;
      
      let diagonal;
      if (hebShape === "ריבוע") {
        diagonal = round(side * Math.sqrt(2));
        params = { shape: hebShape, side, diagonal, kind: "diagonal_square" };
        const diagSqW = Math.floor(Math.random() * 3);
        if (formulaBand === "mid") {
          if (levelKey === "easy") {
            question = [
              `ריבוע צלע ${side}: אלכסון קשור לפיתגורס (שני ניצבים שווים). מה אורך האלכסון?`,
              `בריבוע צלע ${side} — שני ניצבים שווים; מה אורך האלכסון?`,
              `פיתגורס על ריבוע: צלע ${side}, מה אלכסון?`,
            ][diagSqW];
          } else if (levelKey === "medium") {
            question = [
              `מה אורך האלכסון של ריבוע עם צלע ${side}?`,
              `אלכסון בריבוע במישור — צלע ${side}. מה האורך?`,
              `חישוב אלכסון מריבוע צלע ${side}.`,
            ][diagSqW];
          } else {
            question = [
              `אתגר אלכסון — ריבוע צלע ${side}, מה אורך האלכסון?`,
              `בדקו נוסחה — ריבוע ${side}, מה d?`,
              `אלכסון בריבוע ללא ציור עזר: צלע ${side}.`,
            ][diagSqW];
          }
        } else if (levelKey === "hard") {
          question = [
            `בשלב אתגר — ריבוע צלע ${side}: מה אורך אלכסון?`,
            `אתגר קצר — אלכסון בריבוע ${side}.`,
            `ניתוח אלכסון בריבוע צלע ${side}.`,
          ][diagSqW];
        } else {
          question = [
            `ריבוע צלע ${side}: מה אורך אלכסון?`,
            `אורך אלכסון בריבוע עם צלע ${side}?`,
            `מדידת אלכסון — ריבוע ${side}.`,
          ][diagSqW];
        }
      } else if (hebShape === "מלבן") {
        const width = Math.floor(Math.random() * level.maxSide) + 1;
        diagonal = round(Math.sqrt(side * side + width * width));
        params = {
          shape: hebShape,
          side,
          width,
          diagonal,
          kind: "diagonal_rectangle",
          patternFamily: `diagonal_rectangle_${levelKey}`,
        };
        const diagW = Math.floor(Math.random() * 3);
        if (formulaBand === "mid") {
          if (levelKey === "easy") {
            question = [
              `מלבן ${side}×${width}: השתמשו בפיתגורס (ניצבים ${side} ו-${width}). מה אלכסון?`,
              `אלכסון במלבן ישר־זווית: ניצבים ${side}, ${width} — מה d?`,
              `ניצבים במלבן ${side} ו-${width}. חשבו אלכסון (פיתגורס).`,
            ][diagW];
          } else if (levelKey === "medium") {
            question = [
              `מה אורך האלכסון של מלבן עם אורך ${side} ורוחב ${width}?`,
              `מלבן באורך ${side} יחידות וברוחב ${width} יחידות — מה אורך האלכסון?`,
              `חישוב אלכסון מניצבים ${side} ו-${width} במלבן.`,
            ][diagW];
          } else {
            question = [
              `אתגר אלכסון — מלבן ${side}×${width}. מה אורך האלכסון?`,
              `בדקו נוסחת פיתגורס — מלבן ${side}×${width}, מה d?`,
              `אלכסון במלבן ללא ציור: ${side}, ${width}.`,
            ][diagW];
          }
        } else if (formulaBand === "late") {
          if (levelKey === "easy") {
            question = `במלבן ישר־זווית: ניצבים ${side} ו־${width}. מה אורך האלכסון (פיתגורס)?`;
          } else if (levelKey === "medium") {
            question = `חישוב אלכסון — מלבן עם צלעות ניצבות ${side} ו־${width}. מה d?`;
          } else {
            question = `בשלב אתגר — מלבן ${side}×${width}: הוכיחו בראש ואז חשבו את אלכסון.`;
          }
        } else if (levelKey === "hard") {
          question = `בשלב אתגר — מלבן ${side}×${width}: מה אורך אלכסון?`;
        } else {
          question = `מלבן ${side} × ${width}: מה אורך אלכסון?`;
        }
      } else {
        // מקבילית - כיתה ה'
        const width = Math.floor(Math.random() * level.maxSide) + 1;
        diagonal = round(Math.sqrt(side * side + width * width));
        params = { shape: hebShape, side, width, diagonal, kind: "diagonal_parallelogram" };
        question = `מקבילית: צלעות ${side} ו-${width}. מה אורך אלכסון (הנחה: כמו במלבן)?`;
      }
      
      correctAnswer = diagonal;
      break;
    }

    // ===================== HEIGHTS =====================
    case "heights": {
      const shapeType = Math.random();
      if (shapeType < 0.33) {
        // משולש
        const base = Math.floor(Math.random() * level.maxSide) + 1;
        const area = Math.floor(Math.random() * level.maxSide * 5) + 10;
        const height = round((area * 2) / base);
        
        params = { base, area, height, shape: "triangle", kind: "heights_triangle" };
        correctAnswer = height;
        question =
          formulaBand === "late"
            ? `גובה במשולש (לפי בסיס ${base}): אם השטח ${area}, מה הגובה?`
            : `במשולש עם בסיס ${base} ושטח ${area}, מה הגובה?`;
      } else if (shapeType < 0.66) {
        // מקבילית
        const base = Math.floor(Math.random() * level.maxSide) + 1;
        const area = Math.floor(Math.random() * level.maxSide * 5) + 10;
        const height = round(area / base);
        
        params = { base, area, height, shape: "parallelogram", kind: "heights_parallelogram" };
        correctAnswer = height;
        question = `במקבילית עם בסיס ${base} ושטח ${area}, מה הגובה?`;
      } else {
        // טרפז
        const base1 = Math.floor(Math.random() * level.maxSide) + 1;
        const base2 = Math.floor(Math.random() * level.maxSide) + 1;
        const area = Math.floor(Math.random() * level.maxSide * 5) + 10;
        const height = round((area * 2) / (base1 + base2));
        
        params = { base1, base2, area, height, shape: "trapezoid", kind: "heights_trapezoid" };
        correctAnswer = height;
        question = `בטרפז עם בסיסים ${base1} ו-${base2} ושטח ${area}, מה הגובה?`;
      }
      break;
    }

    // ===================== TILING =====================
    case "tiling": {
      const shapes = ["ריבוע", "משולש שווה צלעות", "משושה"];
      const selectedShape = shapes[Math.floor(Math.random() * shapes.length)];
      const angle = selectedShape === "ריבוע" ? 90 : selectedShape === "משולש שווה צלעות" ? 60 : 120;
      
      params = { shape: selectedShape, angle, kind: "tiling" };
      correctAnswer = angle;
      if (formulaBand === "late") {
        if (levelKey === "easy") {
          question = `ריצוף (קל): זווית פנימית ב${selectedShape} — מה גודל הזווית?`;
        } else if (levelKey === "medium") {
          question = `ריצוף במישור: זווית פנימית טיפוסית ב${selectedShape}?`;
        } else {
          question = `ריצוף (אתגר): הסיקו זווית פנימית ב${selectedShape} לפני שבוחרים.`;
        }
      } else if (levelKey === "easy") {
        question = `ב${selectedShape} המשמש לריצוף — מה זווית הפנים?`;
      } else if (levelKey === "medium") {
        question = `איזו זווית יש ב${selectedShape} המשמש לריצוף?`;
      } else {
        question = `זיהוי זווית לריצוף — ${selectedShape}: מה הזווית הפנימית?`;
      }
      break;
    }

    // ===================== CIRCLES =====================
    case "circles": {
      const radius = Math.floor(Math.random() * (level.maxSide / 2)) + 1;
      const askArea = Math.random() < 0.5;
      
      if (askArea) {
        params = { radius, kind: "circle_area", askArea: true };
        correctAnswer = round(PI * radius * radius);
        if (gradeKey === "g6") {
          if (levelKey === "easy") {
            question = `שטח דיסק (קל): רדיוס ${radius}, השתמשו ב־πr² (π = 3.14). מה השטח?`;
          } else if (levelKey === "medium") {
            question = `דיסק במישור, רדיוס ${radius}. מה השטח? (π = 3.14)`;
          } else {
            question = `אתגר שטח — עיגול רדיוס ${radius}: חשבו שטח מדויק (π = 3.14).`;
          }
        } else if (levelKey === "easy") {
          question = `עיגול קטן: רדיוס ${radius}. מה השטח? (π = 3.14)`;
        } else if (levelKey === "medium") {
          question = `מה שטח העיגול עם רדיוס ${radius}? (π = 3.14)`;
        } else {
          question = `שטח מעגל — רדיוס ${radius}, בדקו נוסחה לפני החישוב (π = 3.14).`;
        }
      } else {
        params = { radius, kind: "circle_perimeter", askArea: false };
        correctAnswer = round(2 * PI * radius);
        if (gradeKey === "g6") {
          if (levelKey === "easy") {
            question = `מעגל רדיוס ${radius}: היקף = 2πr. מה היקף? (π = 3.14)`;
          } else if (levelKey === "medium") {
            question = `מעגל: רדיוס ${radius}. מה היקף המעטפת? (π = 3.14)`;
          } else {
            question = `אתגר היקף — מעגל רדיוס ${radius}. מה אורך המעטפת? (π = 3.14)`;
          }
        } else if (levelKey === "hard") {
          question = `אתגר — מה היקף המעגל עם רדיוס ${radius}? (π = 3.14)`;
        } else {
          question = `מה היקף המעגל עם רדיוס ${radius}? (π = 3.14)`;
        }
      }
      break;
    }

    // ===================== SOLIDS =====================
    case "solids": {
      // שאלות זיהוי גופים - מה השם של הגוף?
      const solids = [
        { name: "קובייה", desc: "6 פאות ריבועיות שוות", num: 1 },
        { name: "תיבה", desc: "6 פאות מלבניות", num: 2 },
        { name: "גליל", desc: "2 בסיסים עגולים", num: 3 },
        { name: "פירמידה", desc: "בסיס מצולע ופאות משולשות", num: 4 },
        { name: "חרוט", desc: "בסיס עגול וקודקוד", num: 5 },
        { name: "כדור", desc: "כל הנקודות במרחק שווה מהמרכז", num: 6 },
      ];
      const selected = solids[Math.floor(Math.random() * solids.length)];
      
      params = { solid: selected.name, desc: selected.desc, kind: "solids" };
      correctAnswer = selected.num;
      question =
        gradeKey === "g2"
          ? `בחרו שם לגוף: ${selected.desc}. (1 = קובייה, 2 = תיבה, 3 = גליל, 4 = פירמידה, 5 = חרוט, 6 = כדור)`
          : `גוף תלת־ממדי עם ${selected.desc}. מה שמו? (1 = קובייה, 2 = תיבה, 3 = גליל, 4 = פירמידה, 5 = חרוט, 6 = כדור)`;
      break;
    }

    // ===================== DEFAULT =====================
    default: {
      const side = Math.floor(Math.random() * level.maxSide) + 1;
      params = { side, kind: "square_area" };
      correctAnswer = round(side * side);
      question =
        formulaBand === "early"
          ? `ריבוע: צלע ${side}. כמה שטח?`
          : formulaBand === "mid"
            ? `מה השטח של ריבוע עם צלע ${side}?`
            : `שטח ריבוע במישור: צלע ${side}. מה התוצאה?`;
    }
  }

  // ===== יצירת תשובות (מסיחים הקשריים) =====
  const shuffledAnswers = buildGeometryMcqAnswers({
    correctAnswer,
    params,
    level,
    round,
    selectedTopic,
    shape,
  });

  const baseKindOut = params?.kind?.replace(/^story_/, "") || "";
  const labelMcq =
    Boolean(GEOMETRY_INDEX_LABEL_KINDS[baseKindOut]) ||
    Boolean(GEOMETRY_HEBREW_LABEL_OPTIONS[baseKindOut]);
  const resolvedCorrect = GEOMETRY_INDEX_LABEL_KINDS[baseKindOut]
    ? String(Math.round(Number(correctAnswer)))
    : correctAnswer;

  const enrichedParams = enrichGeometryProceduralParams(params, {
    topic: selectedTopic,
    gradeKey,
    levelKey,
  });

  return sanitizeQuestionForStudentDisplay({
    question,
    correctAnswer: resolvedCorrect,
    answers: shuffledAnswers,
    topic: selectedTopic,
    shape,
    params: enrichedParams,
  });
}

