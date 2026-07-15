// יצירת שאלות גיאומטריה

import { GRADES, PI, getShapesForTopic, TOPICS } from "./geometry-constants.js";
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
import { attachCanonicalMetadataToMathGeometryQuestion } from "../lib/learning/math-geometry-canonical-metadata.js";
import { formatTriangleAnglesKnownTwoStem } from "./geometry-activity-question-stem.js";
import { pickValidTriangleSides } from "../lib/worksheets/worksheet-geometry-math-valid.js";
import { sanitizeQuestionForStudentDisplay } from "./student-question-stem-sanitizer.js";
import { repairMcqObviousAnswerContent } from "./mcq-fail-content-repair.js";

function geometryTopicLabelHe(topicKey) {
  return TOPICS[topicKey]?.name || "נושא";
}

function shuffleMcqList(answers) {
  const arr = [...answers];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Remove child-facing (1 = …, 2 = …) legends from shapes_basic stems. */
function stripShapesBasicIndexLegend(text) {
  return String(text || "")
    .replace(/\s*\(\s*1\s*=\s*[^)]*\)/gu, "")
    .trim();
}

import {
  GEOMETRY_HEBREW_LABEL_OPTIONS,
  GEOMETRY_INDEX_LABEL_KINDS,
} from "./geometry-activity-answer-ui.js";

/**
 * מסיחים סבירים לפי סוג שאלה - לא לולאת 1..10 אקראית כשהקשר הוא שטח/נפח וכו'.
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

  // זיהוי גוף: 4 כפתורים בעברית — תשובה נכונה + 3 מסיחים מתוך 6 הגופים
  if (baseKind === "solids") {
    const allSolids = ["קובייה", "תיבה", "גליל", "פירמידה", "חרוט", "כדור"];
    const ca4 = String(correctAnswer);
    const others = allSolids.filter((n) => n !== ca4);
    shuffleMcqList(others);
    const choices = [ca4, ...others.slice(0, 3)];
    return shuffleMcqList(choices);
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

  if (baseKind === "solids_faces") {
    takeFromPool([2, 3, 4, 5, 6, 7, 8]);
  } else if (baseKind === "solids_vertices") {
    takeFromPool([0, 1, 4, 5, 6, 8, 10]);
  } else if (baseKind === "solids_edges") {
    takeFromPool([0, 1, 2, 4, 6, 8, 9, 10, 12]);
  } else if (baseKind === "tiling") {
    takeFromPool([60, 90, 120]);
  } else if (baseKind === "tiling_count") {
    const cnt = Number(correctAnswer);
    add(cnt - 1); add(cnt + 1); add(cnt + (params.floorL ?? 2)); add(cnt - (params.floorW ?? 2));
  } else if (baseKind === "rotation") {
    takeFromPool([90, 180, 270, 360]);
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
          question: `הנושא "${geometryTopicLabelHe(topic)}" לא זמין עבור הכיתה הזו. אנא בחר נושא אחר.`,
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
      return sanitizeQuestionForStudentDisplay(
        attachCanonicalMetadataToMathGeometryQuestion(
          {
            question: conceptual.question,
            correctAnswer: conceptual.correctAnswer,
            answers: conceptual.answers,
            topic: selectedTopic,
            shape,
            params: conceptual.params,
          },
          {
            subject: "geometry",
            gradeKey,
            levelKey,
            topic: selectedTopic,
          }
        )
      );
    }
  }

  let question;
  let correctAnswer;
  let params = {};

  const roundTo = level.decimals ? 2 : 0;
  const round = (num) =>
    Math.round(num * Math.pow(10, roundTo)) / Math.pow(10, roundTo);

  const formulaBand = gradeBandForKey(gradeKey) || "mid";
  // תרגילי מילים רק ב late (ה׳–ו׳)
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
              question = `ריבוע בגודל ${side}×${side} משבצות. כמה משבצות יש בשטחו?`;
            } else if (levelKey === "medium") {
              const earlyW = Math.floor(Math.random() * 10);
              question = [
                `ריבוע צלע ${side}. מה השטח?`,
                `ריבוע צלע ${side}: מה השטח ביחידות ריבוע?`,
                `ריבוע עם צלע ${side}. מה השטח?`,
                `ריבוע ${side}. מה השטח?`,
                `ריבוע בצלע ${side}. מה השטח?`,
                `כמה יחידות שטח בריבוע עם צלע ${side}?`,
                `ריבוע ${side} יחידות. חשבו שטח.`,
                `מצאו שטח ריבוע בצלע ${side}.`,
                `ריבוע: צלע ${side}. שטחו הוא?`,
              ][earlyW];
            } else {
              const earlyW = Math.floor(Math.random() * 10);
              question = [
                `ריבוע עם צלע ${side}. מה שטחו?`,
                `ריבוע עם צלע ${side}. מה השטח?`,
                `שטח ריבוע בצלע ${side}?`,
                `ריבוע: צלע ${side}. כמה שטח?`,
                `מהו שטח ריבוע בצלע ${side}?`,
                `ריבוע ${side}×${side}. מה השטח?`,
                `ריבוע צלע ${side}. חשבו שטח.`,
                `מה שטח ריבוע עם צלע ${side}?`,
                `ריבוע בצלע ${side} - מה שטחו?`,
                `ריבוע צלע ${side}. חשבו את השטח.`,
              ][earlyW];
            }
          } else if (formulaBand === "mid") {
            const aw = Math.floor(Math.random() * 8);
            if (levelKey === "easy") {
              question = [
                `ריבוע עם צלע ${side}. מה השטח?`,
                `ריבוע צלע ${side} - מה גודל השטח ביחידות ריבוע?`,
                `כפל הצלע בעצמה: ריבוע ${side}. מה השטח?`,
                `ריבוע ${side}×${side}: כמה יחידות שטח?`,
                `חשבו: ריבוע צלע ${side}. מה השטח?`,
                `ריבוע עם צלע ${side} - מה השטח?`,
                `נתון ריבוע צלע ${side}. מה השטח הכולל?`,
                `כמה שטח יש לריבוע עם צלע ${side} יחידות?`,
              ][aw];
            } else if (levelKey === "medium") {
              question = [
                `מה השטח של ריבוע עם צלע ${side}?`,
                `נתון ריבוע, צלע ${side}. חשבו את שטח הריבוע.`,
                `ביטוי לשטח ריבוע: צלע ${side}. מה הערך המספרי?`,
                `ריבוע מידות ${side}×${side}: חישוב שטח.`,
                `חשבו שטח ריבוע צלע ${side} יחידות.`,
                `ריבוע ${side} יחידות - מה שטחו?`,
                `שטח ריבוע: צלע ${side}. מה התוצאה?`,
                `אורך ${side}, רוחב ${side}: חשבו שטח הריבוע.`,
              ][aw];
            } else {
              question = [
                `ריבוע עם צלע ${side}. מה השטח?`,
                `ריבוע עם צלע ${side}. מה השטח?`,
                `הוכיחו בראש ואז חשבו - ריבוע צלע ${side}, מה השטח?`,
                `ריבוע ${side}×${side}. מה השטח?`,
                `ריבוע צלע ${side}: חישוב עצמאי של שטח.`,
                `ריבוע ${side} יחידות. מה שטחו?`,
                `בדיקת הבנה: ריבוע ${side}, מה השטח?`,
                `ריבוע ${side} יחידות - הוכיחו וחשבו שטח.`,
              ][aw];
            }
          } else {
            question = `ריבוע עם צלע ${side}. מה השטח?`;
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
              question = `מלבן בגודל ${length}×${width} משבצות. כמה משבצות יש בשטחו?`;
            } else if (levelKey === "medium") {
              const earlyRW = Math.floor(Math.random() * 10);
              question = [
                `שטח מלבן ${length}×${width}. מה השטח?`,
                `מלבן אורך ${length}, רוחב ${width}. חשבו שטח.`,
                `מלבן ${length}×${width}. מה השטח?`,
                `מלבן ${length}×${width}. מה שטחו?`,
                `מלבן ${length}×${width}. מה השטח?`,
                `מלבן: אורך ${length}, רוחב ${width}. מה השטח?`,
                `חשבו שטח מלבן: ${length}×${width}.`,
                `${length} שורות ו-${width} עמודות. מה השטח?`,
                `שטח מלבן ${length}×${width}?`,
                `מלבן: ${length} יחידות ארוך ו-${width} יחידות רחב. מה שטחו?`,
              ][earlyRW];
            } else {
              const earlyRW = Math.floor(Math.random() * 10);
              question = [
                `מלבן ${length}×${width}. מה השטח?`,
                `מלבן אורך ${length} ורוחב ${width}. חשבו שטח.`,
                `שטח מלבן ${length}×${width}?`,
                `מלבן: ${length}×${width}. כמה שטח?`,
                `מה שטח מלבן ${length} ו-${width}?`,
                `מלבן ${length}×${width} - מה השטח?`,
                `מלבן ${length}×${width}. חשבו את השטח.`,
                `מה שטח המלבן? ${length}×${width}.`,
                `מלבן בצלעות ${length} ו-${width}. מה שטחו?`,
                `חשבו את שטח המלבן: ${length} × ${width}.`,
              ][earlyRW];
            }
          } else if (formulaBand === "mid") {
            const rw = Math.floor(Math.random() * 8);
            if (levelKey === "easy") {
              question = [
                `מלבן שאורכו ${length} יחידות ורוחבו ${width} יחידות. מה שטח המלבן?`,
                `מלבן שאורכו ${length} יחידות ורוחבו ${width} יחידות. מה השטח?`,
                `נתון מלבן: אורך = ${length} יחידות, רוחב = ${width} יחידות. מה שטחו?`,
                `חשבו שטח מלבן באורך ${length} וברוחב ${width}.`,
                `מלבן ${length}×${width} - כמה יחידות שטח?`,
                `מלבן: ${length} יחידות ארוכה ו-${width} יחידות רחבה. מה השטח?`,
                `מה השטח? מלבן מידות ${length} ו-${width} יחידות.`,
                `מלבן באורך ${length} וברוחב ${width}. מה השטח?`,
              ][rw];
            } else if (levelKey === "medium") {
              question = [
                `מה שטח המלבן? אורך ${length} יחידות, רוחב ${width} יחידות.`,
                `מלבן באורך ${length} יחידות וברוחב ${width} יחידות. מה השטח?`,
                `מלבן באורך ${length} יחידות וברוחב ${width} יחידות. מה שטחו?`,
                `מלבן ${length}×${width} יחידות. מה השטח?`,
                `מלבן מידות ${length} ו-${width} - מה השטח הכולל?`,
                `אורך ${length}, רוחב ${width}: חשבו שטח.`,
                `כמה שטח במלבן ${length}×${width} יחידות?`,
                `מלבן ${length}×${width}: מה שטחו?`,
              ][rw];
            } else {
              question = [
                `מלבן שאורכו ${length} יחידות ורוחבו ${width} יחידות. מה שטח המלבן?`,
                `מלבן אורך ${length} ורוחב ${width}. מה השטח?`,
                `בדקו לפני בחירה - מלבן ${length}×${width} יחידות. מה שטח המלבן?`,
                `אתגר: מלבן ${length}×${width} - חשבו שטח.`,
                `מלבן ${length}×${width}. מה השטח?`,
                `שטח מלבן ${length} ו-${width} - חישוב מהיר.`,
                `מלבן מידות ${length} ו-${width} יחידות. מה השטח?`,
                `מלבן ${length}×${width}. מה השטח?`,
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
            question = `משולש: בסיס ${base}, גובה ${height}. מה השטח?`;
          } else if (formulaBand === "mid") {
            if (levelKey === "easy") {
              question = `משולש בסיס ${base}, גובה ${height}. מה השטח?`;
            } else if (levelKey === "medium") {
              question = `מה השטח של משולש עם בסיס ${base} וגובה ${height}?`;
            } else {
              question = `אתגר שטח משולש - בסיס ${base}, גובה ${height}. מה השטח?`;
            }
          } else {
            question = `משולש עם בסיס ${base} וגובה ${height}. מה השטח?`;
          }
          break;
        }

        case "parallelogram": {
          const base = Math.floor(Math.random() * level.maxSide) + 1;
          const height = Math.floor(Math.random() * level.maxSide) + 1;
          params = { base, height, kind: "parallelogram_area" };
          correctAnswer = round(base * height);
          if (formulaBand === "late") {
            question = `אורך בסיס המקבילית הוא ${base} ס״מ והגובה לבסיס הוא ${height} ס״מ. חשבו את שטח המקבילית.`;
          } else if (levelKey === "easy") {
            question = `אורך בסיס המקבילית הוא ${base} ס״מ והגובה הוא ${height} ס״מ. חשבו את שטח המקבילית.`;
          } else if (levelKey === "medium") {
            question = `מה השטח של מקבילית עם בסיס ${base} ס״מ וגובה ${height} ס״מ?`;
          } else {
            question = `מקבילית: בסיס ${base} ס״מ וגובה ${height} ס״מ. חשבו את שטח המקבילית.`;
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
              ? `טרפז: בסיסים ${base1} ו-${base2}, גובה ${height}. מה השטח?`
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
                ? `עיגול עם רדיוס ${radius}. מה השטח? (π = 3.14)`
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
              ? `ריבוע: צלע ${side}. כמה שטח?`
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
              `ריבוע: כל צלע ${side}. מה ההיקף?`,
              `חשבו היקף ריבוע: צלע ${side}. מה ההיקף?`,
              `ריבוע ${side} יחידות לכל צלע - מה סכום המעטפת?`,
            ];
            question = earlyVariants[Math.floor(Math.random() * earlyVariants.length)];
          } else if (formulaBand === "mid") {
            const variants = [
              `מה ההיקף של ריבוע עם צלע ${side} ס״מ?`,
              `ריבוע עם צלע ${side} ס״מ. מה ההיקף?`,
              `ריבוע צלע ${side} ס״מ - מה ההיקף הכולל?`,
              `אורך צלע הריבוע הוא ${side} ס״מ. חשבו את היקף הריבוע.`,
              `כמה ס״מ היקף יש לריבוע שצלעו ${side} ס״מ?`,
              `צלע ${side} ס״מ: חשבו את היקף הריבוע.`,
              `ריבוע מידות ${side} ס״מ לכל צלע. מה ההיקף?`,
              `ריבוע ${side}×${side}: מה סכום צלעות המעטפת?`,
            ];
            question = variants[Math.floor(Math.random() * variants.length)];
          } else {
            const lateVariants = [
              `ריבוע עם צלע ${side}. מה ההיקף?`,
              `ריבוע צלע ${side}. מה ההיקף?`,
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
              `מלבן: אורך ${length} ס״מ, רוחב ${width} ס״מ. מה ההיקף?`,
              `חשבו את היקף המלבן: אורך ${length} ס״מ ורוחב ${width} ס״מ.`,
              `מלבן ${length}×${width} ס״מ: חשבו את סכום ארבע הצלעות.`,
            ];
            question = earlyVariants[phrasing % earlyVariants.length];
          } else if (formulaBand === "mid") {
            const variants = [
              `מה ההיקף של מלבן עם אורך ${length} ס״מ ורוחב ${width} ס״מ?`,
              `מלבן אורך ${length} ס״מ ורוחב ${width} ס״מ. מה ההיקף?`,
              `מלבן אורכו ${length} ס״מ ורוחבו ${width} ס״מ - מה ההיקף?`,
              `אורך המלבן הוא ${length} ס״מ ורוחבו ${width} ס״מ. חשבו את היקף המלבן.`,
              `כמה ס״מ היקף יש במלבן ${length}×${width}?`,
              `אורך ${length} ס״מ, רוחב ${width} ס״מ: חשבו את היקף המלבן.`,
              `מלבן מידות ${length} ס״מ ו-${width} ס״מ. מה סכום צלעות המעטפת?`,
              `מלבן ${length}×${width}: מה ההיקף הכולל?`,
            ];
            question = variants[phrasing];
          } else {
            const lateVariants = [
              `מלבן שאורכו ${length} יחידות ורוחבו ${width} יחידות. מה היקף המלבן?`,
              `מלבן מידות ${length} ו-${width}. מה ההיקף?`,
              `מלבן מידות ${length} ו-${width}: הוכיחו וחשבו היקף.`,
            ];
            question = lateVariants[phrasing % lateVariants.length];
          }
          break;
        }

        case "triangle": {
          const { side1, side2, side3 } = pickValidTriangleSides(level.maxSide);
          params = { side1, side2, side3, kind: "triangle_perimeter" };
          correctAnswer = round(side1 + side2 + side3);
          question =
            formulaBand === "late"
              ? `אורכי צלעות המשולש הם ${side1} ס״מ, ${side2} ס״מ ו-${side3} ס״מ. חשבו את היקף המשולש.`
              : `אורכי צלעות המשולש הם ${side1} ס״מ, ${side2} ס״מ ו-${side3} ס״מ. מה ההיקף של המשולש?`;
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
            question = `קובייה: צלע ${side}. מה הנפח?`;
          } else if (formulaBand === "mid") {
            if (levelKey === "easy") {
              question = `קובייה צלע ${side}. מה הנפח?`;
            } else if (levelKey === "medium") {
              question = `מה הנפח של קובייה עם צלע ${side}?`;
            } else {
              question = `נפח קובייה במרחב - צלע ${side}. מה הנפח?`;
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
              question = `תיבה ${length}×${width}×${height}. מה הנפח?`;
            } else if (levelKey === "medium") {
              question = `תיבה מלבנית: ${length} × ${width} × ${height}. מה הנפח?`;
            } else {
              question = `אתגר נפח - תיבה ממדים ${length}×${width}×${height} (יחידות עקביות). מה הנפח?`;
            }
          } else if (gradeKey === "g4") {
            if (levelKey === "easy") {
              question = `תיבה באורך ${length}, רוחב ${width} וגובה ${height} ס"מ. מה הנפח?`;
            } else if (levelKey === "medium") {
              question = `תיבה מלבנית בממדים ${length} × ${width} × ${height} ס"מ. מה הנפח?`;
            } else {
              question = `תיבה ${length}×${width}×${height} ס"מ. מה הנפח?`;
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
          question = `רדיוס הגליל הוא ${radius} ס״מ וגובהו ${height} ס״מ. חשבו את נפח הגליל (π = 3.14).`;
          break;
        }

        case "sphere": {
          const radius =
            Math.floor(Math.random() * (level.maxSide / 3)) + 1;
          params = { radius, kind: "sphere_volume" };
          correctAnswer = round((4 / 3) * PI * radius * radius * radius);
          question = `רדיוס הכדור הוא ${radius} ס״מ. חשבו את נפח הכדור (π = 3.14).`;
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
            params = { baseSide, side: baseSide, height, baseArea, kind: "pyramid_volume_square" };
            correctAnswer = round((baseArea * height) / 3);
            question =
              gradeKey === "g6"
                ? `אורך צלע בסיס הפירמידה הריבועי הוא ${baseSide} ס״מ וגובה הפירמידה הוא ${height} ס״מ. חשבו את נפח הפירמידה.`
                : `אורך צלע בסיס הפירמידה הריבועי הוא ${baseSide} ס״מ וגובהה ${height} ס״מ. מה נפח הפירמידה?`;
          } else {
            const baseWidth = Math.floor(Math.random() * (level.maxSide / 2)) + 1;
            const baseArea = baseSide * baseWidth;
            params = {
              baseSide,
              side: baseSide,
              baseWidth,
              width: baseWidth,
              height,
              baseArea,
              kind: "pyramid_volume_rectangular",
            };
            correctAnswer = round((baseArea * height) / 3);
            question =
              gradeKey === "g6"
                ? `בסיס הפירמידה הוא מלבן באורך ${baseSide} ס״מ וברוחב ${baseWidth} ס״מ, וגובהה ${height} ס״מ. חשבו את נפח הפירמידה.`
                : `בסיס מלבני ${baseSide}×${baseWidth} ס״מ וגובה ${height} ס״מ. מה נפח הפירמידה?`;
          }
          break;
        }

        case "cone": {
          // נפח חרוט = (1/3) × π × רדיוס² × גובה
          const radius = Math.floor(Math.random() * (level.maxSide / 3)) + 1;
          const height = Math.floor(Math.random() * level.maxSide) + 1;
          params = { radius, height, kind: "cone_volume" };
          correctAnswer = round((PI * radius * radius * height) / 3);
          question = `רדיוס בסיס החרוט הוא ${radius} ס״מ וגובהו ${height} ס״מ. חשבו את נפח החרוט (π = 3.14).`;
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
            question = `בסיס המנסרה הוא משולש: בסיס ${base} ס״מ וגובה ${baseHeight} ס״מ, וגובה המנסרה ${height} ס״מ. חשבו את נפח המנסרה.`;
          } else {
            const baseLength = Math.floor(Math.random() * (level.maxSide / 2)) + 1;
            const baseWidth = Math.floor(Math.random() * (level.maxSide / 2)) + 1;
            const baseArea = baseLength * baseWidth;
            params = { baseLength, baseWidth, height, baseArea, kind: "prism_volume_rectangular" };
            correctAnswer = round(baseArea * height);
            question = `בסיס המנסרה הוא מלבן ${baseLength}×${baseWidth} ס״מ, וגובה המנסרה ${height} ס״מ. חשבו את נפח המנסרה.`;
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
                ? `תיבה במרחב - מידות ${length}×${width}×${height}. מה הנפח?`
                : levelKey === "medium"
                  ? `נפח גוף תיבתי: ${length} × ${width} × ${height}. מה התוצאה?`
                  : `אתגר נפח: תיבה ${length}×${width}×${height}. מה הנפח?`;
          } else if (levelKey === "easy") {
            question = `כמה יחידות נפח בתיבה ${length}×${width}×${height}?`;
          } else if (levelKey === "medium") {
            question = `מה הנפח של תיבה עם אורך ${length}, רוחב ${width} וגובה ${height}?`;
          } else {
            question = `ניתוח נפח - תיבה ${length}×${width}×${height}. מה המוצא?`;
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
        const baseMidC = `ידועות ${angle1}° ו-${angle2}° - השלימו את הזווית השלישית במשולש.`;
        const baseLate = `במשולש, שתי זוויות ידועות (${angle1}° ו-${angle2}°). מה הזווית השלישית?`;
        const tw = Math.floor(Math.random() * 3);
        if (formulaBand === "mid") {
          if (levelKey === "easy") {
            question = [
              baseMid,
              baseMidB,
              baseMidC,
            ][tw];
          } else if (levelKey === "medium") {
            question = [
              baseMid,
              baseMidB,
              baseMidC,
            ][tw];
          } else {
            question = [
              formatTriangleAnglesKnownTwoStem(angle1, angle2),
              `ידועות ${angle1}° ו-${angle2}°. מה הזווית השלישית במשולש?`,
              `שתי זוויות במשולש: ${angle1}° ו-${angle2}°. מה השלישית?`,
            ][tw];
          }
        } else if (levelKey === "easy") {
          question = formatTriangleAnglesKnownTwoStem(angle1, angle2);
        } else if (levelKey === "medium") {
          question = baseLate;
        } else {
          question = baseLate;
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
          question = `ניצבים ${a} ו-${b}. מה אורך היתר?`;
        } else if (levelKey === "medium") {
          question =
            gradeKey === "g6" && Math.random() < 0.5
              ? `משולש ישר זווית: ניצבים ${a} ו-${b}. מה אורך היתר (c)?`
              : `במשולש ישר זווית, הניצבים הם ${a} ו-${b}. מה אורך היתר?`;
        } else {
          question = `ניצבים ${a} ו-${b} במשולש ישר זווית. מה אורך היתר?`;
        }
      } else {
        // נשאל על ניצב חסר
        const missing = Math.random() < 0.5 ? "a" : "b";
        if (missing === "a") {
          params = { a, b, c, which: "leg_a", kind: "pythagoras_leg" };
          correctAnswer = round(a);
          question =
            levelKey === "easy"
              ? `היתר הוא ${c} וניצב אחד הוא ${b}. מה הניצב השני?`
              : levelKey === "medium"
                ? `במשולש ישר זווית, היתר הוא ${c} והניצב השני הוא ${b}. מה אורך הניצב החסר?`
                : `במשולש ישר זווית: היתר ${c} וניצב ${b}. מה הניצב השני?`;
        } else {
          params = { a, b, c, which: "leg_b", kind: "pythagoras_leg" };
          correctAnswer = round(b);
          question =
            levelKey === "easy"
              ? `היתר הוא ${c} וניצב אחד הוא ${a}. מה הניצב השני?`
              : levelKey === "medium"
                ? `במשולש ישר זווית, היתר הוא ${c} והניצב השני הוא ${a}. מה אורך הניצב החסר?`
                : `במשולש ישר זווית: היתר ${c} וניצב ${a}. מה הניצב השני?`;
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
          correctAnswer = "ריבוע";
          const sqW = Math.floor(Math.random() * 3);
          question =
            levelKey === "easy"
              ? [
                  `שאלת זיהוי קצרה - ריבוע: כל הצלעות באורך ${side}. מה סוג הצורה? (1 = ריבוע, 2 = מלבן)`,
                  `בוחנים צורה סגורה: ארבע צלעות שוות (${side}) וזוויות ישרות. מה היא? (1 = ריבוע, 2 = מלבן)`,
                  `זיהוי מהיר - מרובע עם צלע ${side} לכל צד. ריבוע או מלבן? (1 = ריבוע, 2 = מלבן)`,
                ][sqW]
              : levelKey === "medium"
                ? [
                    `השוו בין ריבוע למלבן: היקף בסיסי עם צלע ${side} לכל הצלעות. מה מתאים? (1 = ריבוע, 2 = מלבן)`,
                    `ארבע צלעות באורך ${side} - האם זה תיאור של ריבוע? (1 = ריבוע, 2 = מלבן)`,
                    `סימטרייה מלאה בצלעות: כולן ${side}. איזו צורה? (1 = ריבוע, 2 = מלבן)`,
                  ][sqW]
                : [
                    `ניתוח תיאור - מרובע עם ארבע צלעות שוות ${side} וזוויות ישרות. מה סוג הצורה? (1 = ריבוע, 2 = מלבן)`,
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
          correctAnswer = "מלבן";
          const rectW = Math.floor(Math.random() * 3);
          question =
            levelKey === "easy"
              ? [
                  `שאלת זיהוי קצרה - מלבן: אורך ${side}, רוחב ${width}. מה סוג הצורה? (1 = ריבוע, 2 = מלבן)`,
                  `צורה עם זוגות נגדיים שווים: ${side} מול ${side}, ${width} מול ${width}. מה זה? (1 = ריבוע, 2 = מלבן)`,
                  `אורך ${side} ורוחב ${width} (שונים) - ריבוע או מלבן? (1 = ריבוע, 2 = מלבן)`,
                ][rectW]
              : levelKey === "medium"
                ? [
                    `השוו בין ריבוע למלבן: אורך ${side} ורוחב ${width} (לא כל הצלעות שוות). מה מתאים? (1 = ריבוע, 2 = מלבן)`,
                    `מלבן אמיתי: צלעות ${side} ו-${width} לסירוגין. מה סוג הצורה? (1 = ריבוע, 2 = מלבן)`,
                    `האם מדובר בריבוע כשהצלעות ${side} ו-${width}? (1 = ריבוע, 2 = מלבן)`,
                  ][rectW]
                : [
                    `ניתוח תיאור - מרובע עם זוגות צלעות נגדיות שווים אך לא כל ארבע השוות; אורך ${side}, רוחב ${width}. מה סוג הצורה? (1 = ריבוע, 2 = מלבן)`,
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
          correctAnswer = "ריבוע";
          question =
            levelKey === "easy"
              ? [
                  `זיהוי: ארבע צלעות שוות (${side}), ארבע זוויות ישרות. ריבוע או מלבן? (1=ריבוע, 2=מלבן)`,
                  `בדיקה: מרובע עם צלעות ${side} לכל הצדדים - ריבוע או מלבן? (1=ריבוע, 2=מלבן)`,
                  `מהי הצורה? ארבע צלעות ${side}, זוויות ישרות. (1=ריבוע, 2=מלבן)`,
                  `צורה סגורה: ${side} לכל צלע - ריבוע או מלבן? (1=ריבוע, 2=מלבן)`,
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
                    `זיהוי: מרובע עם צלעות ${side}. (1=ריבוע, 2=מלבן)`,
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
          correctAnswer = "מלבן";
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
                    `זיהוי: מרובע עם צלעות ${side} ו-${width}. (1=ריבוע, 2=מלבן)`,
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
          correctAnswer = "4";
          question =
            levelKey === "easy"
              ? [
                  `ריבוע: כמה צלעות שוות יש לו? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `בריבוע - כמה צלעות באותו אורך? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `ספירת צלעות שוות בריבוע: (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `תכונת ריבוע: מספר צלעות זהות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `זיהוי ריבוע לפי צלעות שוות - כמה? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `חקר תכונות: צלעות שוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `בדיקה: כמה צלעות זהות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  `מה מספר הצלעות השוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                ][g4w]
              : levelKey === "medium"
                ? [
                    `כמה צלעות שוות יש לריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `תכונת הצלעות בריבוע - כמה שוות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `זיהוי ריבוע לפי צלעות שוות - כמה? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `ניתוח תכונות ריבוע: צלעות שוות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `חקר ריבוע - מספר צלעות זהות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `בדיקת הבנה: צלעות שוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `הגדרת ריבוע: כמה צלעות שוות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `מה מספר הצלעות הזהות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  ][g4w]
                : [
                    `תכונות ריבוע - כמה צלעות באותו אורך? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `ניתוח ריבוע: כמה צלעות זהות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `הוכחה מילולית - כמה צלעות שוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `אתגר תכונות: צלעות שוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `חקר מעמיק: מספר צלעות זהות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `בדיקה מדויקת: צלעות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `ניתוח: צלעות שוות בריבוע? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                    `מה מספר הצלעות השוות? (1 = 2, 2 = 3, 3 = 4, 4 = אין צלעות שוות)`,
                  ][g4w];
        } else if (questionType < 0.66) {
          // כמה זוגות של צלעות שוות יש למלבן?
          params = { shape: "מלבן", kind: "shapes_basic_properties_rectangle" };
          correctAnswer = "2";
          question =
            levelKey === "easy"
              ? [
                  `מלבן: כמה זוגות צלעות שוות יש? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                  `זוגות צלעות במלבן - כמה זוגות שווים? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                  `ספירת זוגות צלעות שוות במלבן: (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                ][g4w3]
              : levelKey === "medium"
                ? [
                    `כמה זוגות של צלעות שוות יש למלבן? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                    `תכונת המלבן - כמה זוגות צלעות זהות? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                    `זוגות נגדיים שווים במלבן - כמה זוגות? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                  ][g4w3]
                : [
                    `תכונות מלבן - כמה זוגות צלעות באותו אורך? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                    `ניתוח מלבן: כמה זוגות צלעות שוות? (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                    `הסבר מילולי - זוגות צלעות במלבן: (1 = 1, 2 = 2, 3 = 3, 4 = 4)`,
                  ][g4w3];
        } else {
          // כמה זוויות ישרות יש לריבוע/מלבן?
          const shape = Math.random() < 0.5 ? "ריבוע" : "מלבן";
          params = { shape, kind: "shapes_basic_properties_angles" };
          correctAnswer = "4";
          question =
            levelKey === "easy"
              ? [
                  `${shape}: כמה זוויות ישרות יש? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                  `זוויות ישרות ב${shape} - כמה? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                  `ספירת זוויות ישרות: ${shape}. (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                ][g4w3]
              : levelKey === "medium"
                ? [
                    `כמה זוויות ישרות יש ל${shape}? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                    `זוויות פנימיות ישרות ב${shape} - כמה? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                    `תכונת הזוויות ב${shape}: (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                  ][g4w3]
                : [
                    `זוויות ב${shape} - כמה מהן ישרות? (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                    `ניתוח זוויות ב${shape}: (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                    `אתגר קצר - זוויות ישרות ב${shape}: (1 = 2, 2 = 3, 3 = 4, 4 = אין זוויות ישרות)`,
                  ][g4w3];
        }
      }
      if (question) question = stripShapesBasicIndexLegend(question);
      break;
    }

    // ===================== PARALLEL PERPENDICULAR =====================
    case "parallel_perpendicular": {
      const types = ["מקבילות", "מאונכות"];
      const selectedType = types[Math.floor(Math.random() * types.length)];
      const isParallel = selectedType === "מקבילות";

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
            ? `התבוננו בשני הישרים בשרטוט. מה היחס ביניהם?`
            : levelKey === "medium"
              ? `סיווג ישרים לפי השרטוט: מה היחס הנכון?`
              : `לפי השרטוט, איזה יחס מתקיים בין שני הישרים?`;
      } else {
        question =
          levelKey === "easy"
            ? `זיהוי מהיר: מה היחס בין הישרים שבשרטוט?`
            : levelKey === "medium"
              ? `בחרו לפי השרטוט: מה היחס בין שני הישרים?`
              : `לפי הסימון והשרטוט, מה היחס הגיאומטרי בין שני הישרים?`;
      }
      break;
    }

    // ===================== TRIANGLES =====================
    case "triangles": {
      const types = ["שווה צלעות", "שווה שוקיים", "שונה צלעות"];
      const selectedType = types[Math.floor(Math.random() * types.length)];
      const triW = Math.floor(Math.random() * 10); // 10 stem variants

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
                `התבוננו במשולש שבשרטוט. איזה סוג משולש זה לפי הצלעות?`,
                `איזה סוג משולש מופיע בשרטוט?`,
                `בחרו את סוג המשולש לפי השרטוט.`,
                `לפי אורכי הצלעות בשרטוט, מה סוג המשולש?`,
                `סווגו את המשולש שבשרטוט לפי הצלעות.`,
                `מהו סוג המשולש המוצג?`,
                `זהו את סוג המשולש לפי הצורה.`,
                `בחרו שם מתאים למשולש שבשרטוט.`,
                `זיהוי נוסף: מה סוג המשולש לפי הצלעות?`,
                `בדקו את המשולש בשרטוט ובחרו את סוגו.`,
              ][triW % 10]
            : levelKey === "medium"
              ? [
                  `סווגו את המשולש לפי סימוני הצלעות בשרטוט.`,
                  `לפי התכונות שרואים בשרטוט, איזה סוג משולש זה?`,
                  `בדקו את הצלעות בשרטוט ובחרו את סוג המשולש.`,
                  `איזה שם מתאים למשולש לפי אורכי הצלעות?`,
                  `התאימו את השרטוט לסוג המשולש הנכון.`,
                  `ניתוח תכונות: לאיזה סוג שייך המשולש שבשרטוט?`,
                  `בחרו את הקטגוריה המתאימה למשולש המוצג.`,
                  `מהו סיווג המשולש לפי הצלעות?`,
                  `סיווג נוסף: איזה שם מתאים למשולש?`,
                  `בחרו קטגוריה לפי אורכי הצלעות בשרטוט.`,
                ][triW % 10]
              : [
                  `אתגר סיווג: קבעו את סוג המשולש לפי השרטוט.`,
                  `ניתוח מעמיק: מהו סיווג המשולש המוצג?`,
                  `הוכיחו בראש לפי הצלעות ואז בחרו את סוג המשולש.`,
                  `אתגר הגדרות: איזה סוג משולש מתאים לשרטוט?`,
                  `ניתוח תכונות: מה מאפייני הצלעות של המשולש המוצג?`,
                  `סיווג: לאיזו קטגוריה שייך המשולש?`,
                  `הבנת מונחים: איזה מונח מתאר את המשולש שבשרטוט?`,
                  `אתגר קצר: בחרו את סוג המשולש לפי הצורה.`,
                  `סיווג מדויק: מה סוג המשולש בשרטוט?`,
                  `בחרו הגדרה מתאימה לפי צלעות המשולש.`,
                ][triW % 10];
      } else {
        // Late band (G5-G6) - expanded to 16 variants for maximum coverage
        const triLateW = Math.floor(Math.random() * 16);
        question =
          levelKey === "easy"
            ? [
                `בחרו סוג למשולש שבשרטוט.`,
                `זיהוי: איזה סוג משולש מוצג?`,
                `מהו הסוג של המשולש המוצג?`,
                `התאימו את השרטוט לסוג משולש.`,
                `סיווג פשוט: לאיזו קטגוריה שייך המשולש?`,
                `זיהוי בסיסי: מה סוג המשולש?`,
                `בחירת סוג: מה מתאים למשולש שבשרטוט?`,
                `הגדרה לפי צלעות: איזה סוג משולש זה?`,
                `זיהוי לפי צורה: איזה משולש מופיע?`,
                `סיווג: איזה סוג משולש מוצג?`,
                `תיאור לפי הצלעות: מה סוג המשולש?`,
                `מה סוג המשולש שבשרטוט?`,
                `חברו את השרטוט לשם סוג המשולש.`,
                `זיהוי: בחרו את סוג המשולש.`,
                `סימון סוג: מהו סוג המשולש?`,
                `בדיקה: איזה סוג מתאים לשרטוט?`,
              ][triLateW]
            : levelKey === "medium"
              ? [
                  `התאמת מונח: איזה סוג משולש רואים בשרטוט?`,
                  `סווגו את המשולש לפי מאפייני הצלעות.`,
                  `הגדרה וסיווג: לאיזה סוג מתאים השרטוט?`,
                  `זיהוי מונח: מה שם סוג המשולש?`,
                  `התאמת הגדרה: איזה סוג מתאר את צלעות המשולש?`,
                  `מונח גיאומטרי: מהו סוג המשולש המוצג?`,
                  `סיווג לפי צורה: איזה סוג משולש זה?`,
                  `הבנת מונח: בחרו את הסיווג לפי הצלעות.`,
                  `ניתוח: מה אפשר להסיק על סוג המשולש?`,
                  `זיהוי סוג: בחרו את הקטגוריה הנכונה.`,
                  `הגדרה: איזה שם מתאים למשולש?`,
                  `סיווג משולש: מהי התשובה הנכונה?`,
                  `מאפייני צלעות: איזה סוג משולש זה?`,
                  `חקר משולשים: לאיזה סוג שייך השרטוט?`,
                  `בדיקת הבנה: בחרו סוג משולש.`,
                  `מיון משולשים: בחרו קטגוריה מתאימה.`,
                ][triLateW]
              : [
                  `ניסוח מדויק: מהו סוג המשולש שבשרטוט?`,
                  `הגדרה מדויקת: איזה סיווג מתאים למשולש?`,
                  `ניתוח מונחי: איזה מונח מתאר את המשולש?`,
                  `התאמה מדויקת: בחרו את סוג המשולש לפי הצלעות.`,
                  `ביטוי מתמטי: איזה סוג מתקבל לפי תכונות הצלעות?`,
                  `זיהוי מדויק: איזה סיווג מתאים לשרטוט?`,
                  `הגדרה: מה שם סוג המשולש?`,
                  `ניסוח מתמטי: בחרו את הקטגוריה הנכונה.`,
                  `אתגר: מהו סוג המשולש?`,
                  `חקר מעמיק: סווגו את המשולש.`,
                  `ניתוח: מה סוג המשולש?`,
                  `הוכחה בראש: איזו קטגוריה מתאימה?`,
                  `אתגר הגדרות: איזה סוג משולש מוצג?`,
                  `חקר תכונות: מה מאפייני הצלעות?`,
                  `ניתוח מדויק: מה קטגוריית המשולש?`,
                  `הסבר מילולי: בחרו סוג משולש.`,
                ][triLateW];
      }
      break;
    }

    // ===================== QUADRILATERALS =====================
    case "quadrilaterals": {
      const types = ["ריבוע", "מלבן", "מקבילית", "טרפז"];
      const selectedType = types[Math.floor(Math.random() * types.length)];
      const quadW = Math.floor(Math.random() * 10); // 10 stem variants
      const pickQuad = (variants) => variants[quadW % variants.length];
      
      params = { 
        type: selectedType, 
        kind: "quadrilaterals",
        patternFamily: `quadrilaterals_${formulaBand}_${levelKey}`,
      };
      correctAnswer = selectedType;
      
      if (formulaBand === "mid") {
        question =
          levelKey === "easy"
            ? pickQuad([
                `התבוננו במרובע שבשרטוט. איזה סוג מרובע זה?`,
                `זיהוי מרובע לפי השרטוט: איזה שם מתאים?`,
                `בחרו את סוג המרובע לפי השרטוט.`,
                `מהו סוג המרובע המוצג?`,
                `חברו בין השרטוט לסוג המרובע.`,
                `סיווג: איזה סוג מרובע מופיע בשרטוט?`,
                `זהו את המרובע לפי הצורה.`,
                `בחרו שם מתאים לסוג המרובע שבשרטוט.`,
                `זיהוי נוסף: מה סוג המרובע לפי הצורה?`,
                `בדקו את המרובע בשרטוט ובחרו את סוגו.`,
              ])
            : levelKey === "medium"
              ? pickQuad([
                  `סווגו את המרובע לפי התכונות שרואים בשרטוט.`,
                  `לפי השרטוט, איזה סוג מרובע זה?`,
                  `חקר תכונות: בחרו את סוג המרובע המוצג.`,
                  `זיהוי לפי צורה: איזה מרובע מופיע?`,
                  `התאמת שרטוט: איזה שם מתאים לסוג המרובע?`,
                  `ניתוח תכונות: לאיזו קטגוריה שייך המרובע?`,
                  `זיהוי סוג: בחרו את המרובע המתאים לשרטוט.`,
                  `סיווג מתמטי: מה סוג המרובע בשרטוט?`,
                ])
              : pickQuad([
                  `אתגר סיווג: קבעו את סוג המרובע לפי השרטוט.`,
                  `ניתוח מעמיק: מהי ההגדרה המתאימה למרובע המוצג?`,
                  `הוכיחו בראש לפי הצלעות ואז בחרו את סוג המרובע.`,
                  `אתגר הגדרות: איזה סוג מרובע מתאים לשרטוט?`,
                  `ניתוח תכונות: מה מאפייני הצלעות של המרובע?`,
                  `סיווג: לאיזה סוג שייך המרובע?`,
                  `הבנת מונחים: איזה מונח מתאר את המרובע בשרטוט?`,
                  `אתגר הגדרה: בחרו את סוג המרובע לפי הצורה.`,
                ]);
      } else {
        question =
          levelKey === "easy"
            ? pickQuad([
                `סיווג מרובעים: איזה סוג מופיע בשרטוט?`,
                `זיהוי: בחרו סוג מרובע מתאים לשרטוט.`,
                `מהו סוג המרובע המוצג?`,
                `התאמה: איזה שם מתאר את המרובע?`,
                `סיווג פשוט: לאיזו קטגוריה שייך המרובע?`,
                `זיהוי בסיסי: מה סוג המרובע?`,
                `בחירת סוג: איזה מרובע רואים?`,
                `הגדרה לפי צורה: איזה סוג מרובע זה?`,
                `זיהוי נוסף: בחרו סוג מרובע לפי השרטוט.`,
                `מה סוג המרובע לפי הצלעות שבשרטוט?`,
              ])
            : levelKey === "medium"
              ? pickQuad([
                  `התאמת מונח: איזה סוג מרובע רואים בשרטוט?`,
                  `סווגו את המרובע לפי תכונות הצלעות.`,
                  `הגדרה וסיווג: איזה סוג מתאים לשרטוט?`,
                  `זיהוי מונח: מה שם סוג המרובע?`,
                  `התאמת הגדרה: איזה סוג מתאר את צלעות המרובע?`,
                  `מונח גיאומטרי: מהו סוג המרובע המוצג?`,
                  `סיווג לפי צורה: איזה סוג מרובע זה?`,
                  `הבנת מונח: בחרו את הסיווג לפי הצלעות.`,
                ])
              : pickQuad([
                  `ניסוח מדויק: איזה סוג מרובע מוצג?`,
                  `הגדרה מדויקת: איזה סיווג מתאים למרובע?`,
                  `ניתוח מונחי: איזה מונח מתאר את המרובע?`,
                  `התאמה מדויקת: בחרו את סוג המרובע לפי הצלעות.`,
                  `ביטוי מתמטי: איזה סוג מתקבל לפי תכונות הצורה?`,
                  `זיהוי מדויק: איזה סיווג מתאים לשרטוט?`,
                  `הגדרה: מה שם סוג המרובע?`,
                  `ניסוח מתמטי: בחרו את הקטגוריה הנכונה.`,
                ]);
      }
      break;
    }

    // ===================== TRANSFORMATIONS =====================
    case "transformations": {
      const scenarios = [
        {
          answer: "הזזה",
          subtype: "translation",
          stems: {
            easy: [
              "הצורה זזה ימינה בלי סיבוב ובלי שינוי גודל - איזו תנועה זו?",
              "העתקנו צורה למקום חדש בלי לסובב אותה - מה סוג התנועה?",
              "הצורה עברה למקום אחר בלי להתהפך - איזו תנועה?",
              "הזזנו צורה למעלה בלי לסובב אותה - מה קרה לה?",
              "כשצורה נעה ישר בלי שינוי כיוון - איזו תנועה?",
              "הצורה קפצה שמאלה בלי לסובב - מה סוג התנועה?",
            ],
            medium: [
              "צורה עוברת למקום אחר בלי שינוי כיוון - איזו טרנספורמציה?",
              "העתקת צורה למקום חדש בלי סיבוב ובלי שינוי גודל - מה השם הנכון?",
              "תנועה שרק מיקום משתנה, כיוון וגודל נשארים - מה שמה?",
              "הזזה ישרה של צורה ממקום למקום בלי כל שינוי - איזו פעולה?",
              "אם רק מיקום הצורה שינה, מה קרה?",
              "צורה עברה ב-3 צעדים ימינה בלי לסובב - איזו תנועה?",
            ],
            hard: [
              "צורה נשארת אותה צורה ואותו גודל אבל משנה מיקום בלבד - איזו תנועה?",
              "ניתוח תנועה: רק המיקום משתנה, לא הכיוון ולא הגודל - מה סוג הטרנספורמציה?",
              "טרנספורמציה שכל נקודה נעה באותו כיוון ובאותו מרחק - מה שמה?",
              "הזזה קווית: כיוון אחד, מרחק אחד, ללא שינוי כיוון - מה הטרנספורמציה?",
              "אם וקטור תנועה אחיד מוחל על כל נקודות הצורה - מה שמה?",
              "תנועה שבה הצורה 'מחליקה' ממיקום למיקום בלי סיבוב - מה שמה?",
            ],
          },
        },
        {
          answer: "שיקוף",
          subtype: "reflection",
          stems: {
            easy: [
              "הצורה מתהפכת כמו במראה ליד קו - איזו תנועה זו?",
              "ראינו תמונת מראה של צורה מול קו - מה סוג התנועה?",
              "הצורה הפוכה כמו בראי - איזו תנועה?",
              "ביצענו היפוך של צורה מול קו - מה הפעולה?",
              "הצורה התהפכה כאילו קיפלנו דף - מה קרה?",
              "צורה הפוכה מול קו אמצע - איזו תנועה?",
            ],
            medium: [
              "תמונת מראה מול קו ישר נותן צורה הפוכה - איזו טרנספורמציה?",
              "הצורה מתהפכת ביחס לקו בלי שינוי גודל - מה סוג התנועה?",
              "פעולה שהופכת צורה ביחס לציר - מה שמה?",
              "ציר שיקוף חוצה את המרחק בין הצורה לתמונתה - מה הפעולה?",
              "הצורה והתמונה שלה נראות כמו בצילום מראה - מה הפעולה?",
              "כשצורה נכפלת ביחס לקו - מה הטרנספורמציה?",
            ],
            hard: [
              "צורה מקבלת תמונת מראה מול ציר - איזו תנועה מתארת זאת?",
              "הכיוון משתנה כמו במראה והגודל נשאר - מה התשובה?",
              "כל נקודה מוחלפת בנקודה הסימטרית לה מול ציר - מה הטרנספורמציה?",
              "פעולה שמשמרת גודל אך הופכת כיוון - מה שמה?",
              "טרנספורמציה שהציר הוא אמצע המקטע בין כל נקודה ותמונתה - מה?",
              "היפוך מושלם מול קו קבוע - מה שמה?",
            ],
          },
        },
        {
          answer: "סיבוב",
          subtype: "rotation",
          stems: {
            easy: [
              "הצורה מסתובבת סביב נקודה בלי לשנות גודל - איזו תנועה זו?",
              "סובבנו צורה סביב מרכזה - מה סוג התנועה?",
              "הצורה הסתובבה סביב מרכז - איזו תנועה?",
              "כמו גלגל שמסתובב - איזו תנועה זו?",
              "ביצענו סיבוב של צורה סביב נקודה - מה הפעולה?",
              "הצורה עשתה רבע סיבוב - איזו תנועה?",
            ],
            medium: [
              "צורה מסתובבת סביב נקודה קבועה - איזו טרנספורמציה?",
              "סיבוב סביב מרכז בלי שינוי גודל - מה השם הנכון?",
              "פעולה שצורה מסתובבת סביב נקודה בזווית - מה שמה?",
              "כל נקודה מסתובבת סביב מרכז בזווית שווה - מה הטרנספורמציה?",
              "הצורה עשתה 180° סביב נקודה - מה הפעולה?",
              "תנועה מעגלית סביב ציר - מה שמה?",
            ],
            hard: [
              "רק הכיוון משתנה סביב נקודת מרכז, המיקום הכללי והגודל נשמרים - איזו תנועה?",
              "הצורה מסתובבת סביב נקודה קבועה - מה סוג הטרנספורמציה?",
              "פעולה ישומרת מרחקים מהמרכז ומשנה זוויות - מה שמה?",
              "טרנספורמציה שמכפילה את כל המרחקים מהמרכז ב-1 - מה?",
              "סיבוב ב-270° עם כיוון השעון - מה הפעולה?",
              "כל נקודה נעה על מעגל סביב המרכז - מה הטרנספורמציה?",
            ],
          },
        },
        {
          answer: "ללא תנועה",
          subtype: "identity",
          stems: {
            easy: [
              "הצורה נשארה בדיוק באותו מקום ובאותו כיוון - איזו טרנספורמציה?",
              "לא הזזנו ולא סובבנו את הצורה - מה הסוג הנכון?",
              "הצורה לא זזה בכלל - איזו תנועה?",
              "כלום לא השתנה בצורה - מה סוג הטרנספורמציה?",
              "הצורה נשארה בדיוק כמו שהייתה - איזו פעולה?",
              "לא עשינו שום דבר לצורה - מה הסוג?",
            ],
            medium: [
              "אין שינוי במיקום, בכיוון או בגודל - איזו טרנספורמציה מתארת זאת?",
              "הצורה נשארה ללא שינוי - מה התשובה הנכונה?",
              "אם לפני ואחרי הצורה זהה לחלוטין - מה הפעולה?",
              "פעולה שלא משנה שום דבר בצורה - מה שמה?",
              "הצורה זהה לפני ואחרי - מה הטרנספורמציה?",
              "שום שינוי לא בוצע - מה מסוג הטרנספורמציות מתאים?",
            ],
            hard: [
              "לא השתנה מיקום, כיוון או גודל - איזו טרנספורמציה מתאימה?",
              "ניתוח: הצורה זהה לחלוטין לפני ואחרי - מה סוג הטרנספורמציה?",
              "הטרנספורמציה הטריוויאלית שמחזירה כל נקודה לעצמה - מה שמה?",
              "אין שינוי בקואורדינטות אחרי הפעולה - מה הפעולה?",
              "הזהות: f(P) = P לכל נקודה - מה סוג הטרנספורמציה?",
              "פעולה ניטרלית - מה מהאפשרויות מתאימה?",
            ],
          },
        },
      ];
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      const stemPool = scenario.stems[levelKey] || scenario.stems.medium;
      correctAnswer = scenario.answer;
      params = {
        kind: "concept_transform",
        type: scenario.answer,
        subtype: scenario.subtype,
        patternFamily: `transform_${formulaBand}_${levelKey}`,
        conceptTag: scenario.subtype,
        distractorFamily: "transform_confusion",
      };
      question = stemPool[Math.floor(Math.random() * stemPool.length)];
      break;
    }

    // ===================== ROTATION =====================
    case "rotation": {
      const angle = [90, 180, 270, 360][Math.floor(Math.random() * 4)];
      const angleLabel =
        angle === 90 ? "רבע סיבוב" :
        angle === 180 ? "חצי סיבוב" :
        angle === 270 ? "שלושה רבעי סיבוב" : "סיבוב מלא";
      params = {
        angle,
        kind: "rotation",
        patternFamily: `rotation_${formulaBand}_${levelKey}`,
      };
      correctAnswer = angle;
      const rotW = Math.floor(Math.random() * 8);
      if (levelKey === "easy") {
        question = [
          `${angleLabel} - כמה מעלות?`,
          `${angleLabel} שווה כמה מעלות?`,
          `${angleLabel}: מה גודל הסיבוב במעלות?`,
          `כמה מעלות יש ב${angleLabel}?`,
          `${angleLabel} - כמה מעלות בדיוק?`,
          `גלגל מבצע ${angleLabel}. כמה מעלות סובב?`,
          `שעון מבצע ${angleLabel}. כמה מעלות עבר?`,
          `${angleLabel} סביב מרכז - מה גודל הזווית?`,
        ][rotW];
      } else if (levelKey === "medium") {
        question = [
          `${angleLabel}: כמה מעלות עושה סיבוב כזה?`,
          `${angleLabel} סביב מרכז הצורה - מה גודל הסיבוב במעלות?`,
          `${angleLabel} - מה מספר המעלות?`,
          `בצוע ${angleLabel} - כמה מעלות?`,
          `מחוג שעון עובר ${angleLabel}. כמה מעלות עשה?`,
          `צורה מסתובבת ${angleLabel}. כמה מעלות הסתובבה?`,
          `${angleLabel} - מה מספר המעלות המדויק?`,
          `מה הזווית של ${angleLabel}?`,
        ][rotW];
      } else {
        question = [
          `${angleLabel} - כמה מעלות בדיוק?`,
          `${angleLabel}: מה הזווית המדויקת במעלות?`,
          `${angleLabel} - מה גודל הסיבוב המדויק?`,
          `ידועה פעולת ${angleLabel}. מה מספר המעלות המדויק?`,
          `${angleLabel} - חשבו: כמה מעלות?`,
          `מחשבים: ${angleLabel} שווה כמה מעלות?`,
          `${angleLabel} סביב ציר - מה הזווית?`,
          `${angleLabel}: מה ערך הסיבוב במעלות?`,
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
                `כמה צירי סימטרייה (קווי שיקוף) יש ל${selectedShape}?`,
                `ספירת צירי סימטרייה: כמה קווי שיקוף ל${selectedShape}?`,
                `כמה צירי סימטרייה יש לצורה ${selectedShape}?`,
                `בדיקת סימטרייה: כמה צירים ל${selectedShape}?`,
                `חשבו צירי שיקוף: ${selectedShape} - כמה?`,
                `כמה קווי סימטרייה יש ל${selectedShape}?`,
                `צירי סימטרייה: ${selectedShape} - מספר?`,
                `מה מספר צירי השיקוף ל${selectedShape}?`,
              ][symW]
            : levelKey === "medium"
              ? [
                  `ספירת צירים: כמה צירי סימטרייה יש ל${selectedShape}?`,
                  `ניתוח סימטרייה - כמה צירי שיקוף ל${selectedShape}?`,
                  `כמה צירי סימטרייה (התאמות) יש ל${selectedShape}?`,
                  `חקר צירי שיקוף: ${selectedShape} - כמה צירים?`,
                  `בדיקת התאמה: כמה צירי סימטרייה ל${selectedShape}?`,
                  `מה מספר צירי הסימטרייה ל${selectedShape}?`,
                  `ל${selectedShape} - כמה צירי שיקוף?`,
                  `ניתוח צירי סימטרייה ל${selectedShape}.`,
                ][symW]
              : [
                  `ניתוח סימטרייה - כמה צירי שיקוף שונים יש ל${selectedShape}?`,
                  `בשלב אתגר - כמה צירי סימטרייה יש ל${selectedShape}?`,
                  `אתגר: כמה צירי סימטרייה ייחודיים ל${selectedShape}?`,
                  `חקר מעמיק: מספר צירי שיקוף ל${selectedShape}.`,
                  `ניתוח: צירי סימטרייה ל${selectedShape} - כמה?`,
                  `אתגר ספירה: כמה צירי סימטרייה ל${selectedShape}?`,
                  `בדיקה מדויקת: צירי שיקוף ב${selectedShape}.`,
                  `הוכחת מספר צירים: ${selectedShape} - כמה?`,
                ][symW];
      } else if (levelKey === "easy") {
        question = pickSymStem([
          `כמה צירי סימטרייה יש לצורה ${selectedShape}?`,
          `ספירת צירים: ${selectedShape} - כמה צירי שיקוף?`,
          `בדיקה: מספר צירי סימטרייה ל${selectedShape}.`,
          `מה מספר צירי השיקוף ל${selectedShape}?`,
          `כמה קווי סימטרייה ל${selectedShape}?`,
          `צירי סימטרייה ב${selectedShape} - מספר?`,
          `חשבו: כמה צירים ל${selectedShape}?`,
          `מספר צירי סימטרייה: ${selectedShape}.`,
          `זיהוי צירים: ${selectedShape} - כמה צירי שיקוף?`,
          `בדיקת סימטרייה: ${selectedShape} - מספר צירים?`,
          `חקר צירי שיקוף: ${selectedShape}.`,
          `ניתוח צירים: ${selectedShape} - כמה צירי סימטרייה?`,
        ]);
      } else if (levelKey === "medium") {
        question = pickSymStem([
          `כמה צירי סימטרייה (התאמות) יש לצורה ${selectedShape}?`,
          `ניתוח: מספר צירי שיקוף ל${selectedShape}.`,
          `בדיקת התאמה: צירי סימטרייה ל${selectedShape}.`,
          `מה מספר צירי הסימטרייה ל${selectedShape}?`,
          `חקר צירים: ${selectedShape} - כמה צירי שיקוף?`,
          `כמה צירי סימטרייה ייחודיים ל${selectedShape}?`,
          `ספירת צירי שיקוף: ${selectedShape}.`,
          `ניתוח צירים: ${selectedShape} - כמה?`,
          `בדיקת סימטרייה: ${selectedShape}.`,
          `ניתוח מעמיק: ${selectedShape} - כמה צירים?`,
          `חקר מדויק: צירי סימטרייה ל${selectedShape}.`,
          `הבנת צירי שיקוף: ${selectedShape}.`,
        ]);
      } else {
        question = pickSymStem([
          `בשלב אתגר - כמה צירי סימטרייה יש ל${selectedShape}?`,
          `אתגר: מספר צירי שיקוף ל${selectedShape}.`,
          `ניתוח: צירי סימטרייה ל${selectedShape}.`,
          `בדיקה מעמיקה: כמה צירים ל${selectedShape}?`,
          `אתגר ספירה: צירי סימטרייה ב${selectedShape}.`,
          `חקר מדויק: מספר צירי שיקוף ל${selectedShape}.`,
          `הוכחת מספר צירים: ${selectedShape} - כמה?`,
          `ניתוח אתגר: צירי סימטרייה ל${selectedShape}.`,
          `בדיקה סופית: כמה צירי שיקוף ל${selectedShape}?`,
          `אתגר ניתוח: צירי סימטרייה ב${selectedShape}.`,
          `חקר: מספר צירים ל${selectedShape}.`,
          `הבנת מעמיקה: צירי שיקוף ל${selectedShape}.`,
        ]);
      }
      break;
    }

    // ===================== DIAGONAL =====================
    case "diagonal": {
      // מסלול נוסחתי: משתמשים ב shape שנבחר מ TOPIC_SHAPES (כולל כפייה אל harness)
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
              `אורך צלע הריבוע הוא ${side} ס״מ. חשבו את אורך האלכסון.`,
              `בריבוע צלע ${side} ס״מ - שני ניצבים שווים; מה אורך האלכסון?`,
              `פיתגורס על ריבוע: צלע ${side} ס״מ. מה אורך האלכסון?`,
            ][diagSqW];
          } else if (levelKey === "medium") {
            question = [
              `מה אורך האלכסון של ריבוע עם צלע ${side} ס״מ?`,
              `אורך צלע הריבוע הוא ${side} ס״מ. חשבו את אורך האלכסון.`,
              `ריבוע עם צלע ${side} ס״מ. מה אורך האלכסון?`,
            ][diagSqW];
          } else {
            question = [
              `אתגר אלכסון - ריבוע צלע ${side} ס״מ, מה אורך האלכסון?`,
              `אורך צלע הריבוע הוא ${side} ס״מ. חשבו את אורך האלכסון.`,
              `ריבוע עם צלע ${side} ס״מ. מה אורך האלכסון?`,
            ][diagSqW];
          }
        } else if (levelKey === "hard") {
          question = [
            `בשלב אתגר - ריבוע צלע ${side} ס״מ: מה אורך האלכסון?`,
            `אורך צלע הריבוע הוא ${side} ס״מ. חשבו את אורך האלכסון.`,
            `ריבוע עם צלע ${side} ס״מ. מה אורך האלכסון?`,
          ][diagSqW];
        } else {
          question = [
            `אורך צלע הריבוע הוא ${side} ס״מ. חשבו את אורך האלכסון.`,
            `אורך אלכסון בריבוע עם צלע ${side} ס״מ?`,
            `ריבוע עם צלע ${side} ס״מ. מה אורך האלכסון?`,
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
              `מלבן ${side}×${width}. מה אלכסון?`,
              `אלכסון במלבן ישר זווית: ניצבים ${side}, ${width} - מה d?`,
              `ניצבים במלבן ${side} ו-${width}. חשבו אלכסון (פיתגורס).`,
            ][diagW];
          } else if (levelKey === "medium") {
            question = [
              `מה אורך האלכסון של מלבן עם אורך ${side} ורוחב ${width}?`,
              `מלבן באורך ${side} יחידות וברוחב ${width} יחידות - מה אורך האלכסון?`,
              `חישוב אלכסון מניצבים ${side} ו-${width} במלבן.`,
            ][diagW];
          } else {
            question = [
              `אתגר אלכסון - מלבן ${side}×${width}. מה אורך האלכסון?`,
              `מלבן ${side}×${width}. מה d?`,
              `מלבן עם צלעות ${side} ו-${width}. מה אורך האלכסון?`,
            ][diagW];
          }
        } else if (formulaBand === "late") {
          if (levelKey === "easy") {
            question = `במלבן ישר זווית: ניצבים ${side} ו ${width}. מה אורך האלכסון (פיתגורס)?`;
          } else if (levelKey === "medium") {
            question = `מלבן עם צלעות ${side} ו-${width}. מה אורך האלכסון?`;
          } else {
            question = `בשלב אתגר - מלבן ${side}×${width}: הוכיחו בראש ואז חשבו את אלכסון.`;
          }
        } else if (levelKey === "hard") {
          question = `בשלב אתגר - מלבן ${side}×${width}: מה אורך אלכסון?`;
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
        const base = Math.floor(Math.random() * level.maxSide) + 1;
        const area = Math.floor(Math.random() * level.maxSide * 5) + 10;
        const height = round((area * 2) / base);
        params = { base, area, height, shape: "triangle", kind: "heights_triangle" };
        correctAnswer = height;
        const hTriW = Math.floor(Math.random() * 15);
        question = [
          `במשולש עם בסיס ${base} ס״מ ושטח ${area} סמ״ר, מה הגובה לבסיס?`,
          `שטח המשולש הוא ${area} סמ״ר ובסיסו ${base} ס״מ. חשבו את גובה המשולש.`,
          `משולש: בסיס ${base} ס״מ, שטח ${area} סמ״ר. מה הגובה לבסיס?`,
          `נתון משולש עם בסיס ${base} ס״מ ושטח ${area} סמ״ר. מה אורך הגובה?`,
          `במשולש עם בסיס ${base} ס״מ ושטח ${area} סמ״ר, מה הגובה?`,
          `גינה משולשת: בסיס ${base} מ׳, שטח ${area} מ"ר. מה הגובה?`,
          `משולש: בסיס ${base} ס״מ, שטח ${area} סמ״ר. חשבו את הגובה לבסיס.`,
          `השטח הוא ${area} סמ״ר. הבסיס ${base} ס״מ. מה הגובה של המשולש?`,
          `משולש שבסיסו ${base} ס״מ ושטחו ${area} סמ״ר. כמה הגובה?`,
          `בסיס ${base} ס״מ, שטח ${area} סמ״ר - מצאו את גובה המשולש.`,
          `שטח משולש ${area} סמ״ר ובסיס ${base} ס״מ. חשבו את הגובה לבסיס.`,
          `פיסת בד משולשת: בסיס ${base} ס״מ, שטח ${area} סמ״ר. מה הגובה?`,
          `משולש: בסיס ${base} ס״מ, שטח ${area} סמ״ר. מה הגובה?`,
          `משולש עם בסיס ${base} ס״מ ושטח ${area} סמ״ר. מה הגובה?`,
          `שטח ${area} סמ״ר ובסיס ${base} ס״מ. חשבו את גובה המשולש.`,
        ][hTriW];
      } else if (shapeType < 0.66) {
        const base = Math.floor(Math.random() * level.maxSide) + 1;
        const area = Math.floor(Math.random() * level.maxSide * 5) + 10;
        const height = round(area / base);
        params = { base, area, height, shape: "parallelogram", kind: "heights_parallelogram" };
        correctAnswer = height;
        const hParW = Math.floor(Math.random() * 12);
        question = [
          `במקבילית עם בסיס ${base} ושטח ${area}, מה הגובה?`,
          `מקבילית: בסיס ${base}, שטח ${area}. מצאו גובה.`,
          `שטח מקבילית ${area}, בסיסה ${base}. מה גובהה?`,
          `מקבילית: בסיס ${base}, שטח ${area}. מה הגובה?`,
          `נתון מקבילית: בסיס ${base}, שטח ${area}. מה הגובה?`,
          `מקבילית עם בסיס ${base} ושטח ${area}. כמה הגובה?`,
          `בסיס ${base} ושטח ${area} - מה גובה המקבילית?`,
          `מקבילית: בסיס ${base}, שטח ${area}. מה הגובה?`,
          `שדה מקבילי: בסיס ${base} מ׳, שטח ${area} מ"ר. מה הגובה?`,
          `מקבילית: ${area} יחידות שטח, בסיס ${base}. כמה הגובה?`,
          `מצאו גובה: מקבילית בסיס ${base}, שטח ${area}.`,
          `מקבילית עם שטח ${area} ובסיס ${base}. מה אורך הגובה?`,
        ][hParW];
      } else {
        const base1 = Math.floor(Math.random() * level.maxSide) + 1;
        const base2 = Math.floor(Math.random() * level.maxSide) + 1;
        const area = Math.floor(Math.random() * level.maxSide * 5) + 10;
        const height = round((area * 2) / (base1 + base2));
        params = { base1, base2, area, height, shape: "trapezoid", kind: "heights_trapezoid" };
        correctAnswer = height;
        const hTrapW = Math.floor(Math.random() * 10);
        question = [
          `בטרפז עם בסיסים ${base1} ו-${base2} ושטח ${area}, מה הגובה?`,
          `טרפז: בסיסים ${base1} ו-${base2}, שטח ${area}. מצאו גובה.`,
          `שטח טרפז ${area}, בסיסיו ${base1} ו-${base2}. מה גובהו?`,
          `טרפז: בסיסים ${base1} ו-${base2}, שטח ${area}. מה הגובה?`,
          `טרפז: בסיס ראשון ${base1}, בסיס שני ${base2}, שטח ${area}. מה הגובה?`,
          `פיסת קרקע טרפזית: בסיסים ${base1} ו-${base2} מ׳, שטח ${area} מ"ר. מה הגובה?`,
          `מצאו גובה טרפז: שטח ${area}, בסיסים ${base1} ו-${base2}.`,
          `טרפז: שטח ${area}, בסיסים ${base1} ו-${base2}. כמה הגובה?`,
          `טרפז: בסיסים ${base1} ו-${base2}, שטח ${area}. מה הגובה?`,
          `טרפז עם בסיסים ${base1} ו-${base2} ושטח ${area}. מה אורך הגובה?`,
        ][hTrapW];
      }
      break;
    }

    // ===================== TILING =====================
    case "tiling": {
      const tilingSubtype = Math.floor(Math.random() * 3);

      if (tilingSubtype === 0) {
        // שאלת זווית פנימית
        const shapes = ["ריבוע", "משולש שווה צלעות", "משושה", "מלבן"];
        const selectedShape = shapes[Math.floor(Math.random() * shapes.length)];
        const angle =
          selectedShape === "ריבוע" || selectedShape === "מלבן" ? 90 :
          selectedShape === "משולש שווה צלעות" ? 60 : 120;
        params = { shape: selectedShape, angle, kind: "tiling" };
        correctAnswer = angle;
        const tW = Math.floor(Math.random() * 14);
        question = [
          `מה גודל הזווית הפנימית ב${selectedShape}?`,
          `ב${selectedShape} המשמש לריצוף - מה זווית הפנים?`,
          `ריצוף: מה הזווית הפנימית ב${selectedShape}?`,
          `כמה מעלות יש בכל פינה של ${selectedShape}?`,
          `${selectedShape} משמש לריצוף. מה גודל זוויותיו הפנימיות?`,
          `ריצוף ב${selectedShape}: מה הזווית בכל קודקוד?`,
          `כדי לרצף עם ${selectedShape}, מה גודל הזווית הפנימית?`,
          `${selectedShape} לריצוף - מה גודל הזווית הנכון?`,
          `כמה מעלות יש בזווית הפנימית של ${selectedShape}?`,
          `${selectedShape} לריצוף - מה הזווית בין הצלעות?`,
          `אם ${selectedShape} מרצף, מה גודל הזווית הפנימית?`,
          `${selectedShape} ממלא רצפה ללא פערים. מה הזווית בפינות?`,
          `זווית הפנים של ${selectedShape} המשמש לריצוף - כמה מעלות?`,
          `${selectedShape}: מה ערך הזווית הפנימית שלו?`,
        ][tW];

      } else if (tilingSubtype === 1) {
        // ספירת אריחים לכיסוי שטח
        const tileSide = Math.floor(Math.random() * 4) + 1;   // צלע אריח 1-4
        const floorL = (Math.floor(Math.random() * 4) + 2) * tileSide;
        const floorW = (Math.floor(Math.random() * 4) + 2) * tileSide;
        const tileArea = tileSide * tileSide;
        const floorArea = floorL * floorW;
        const count = Math.round(floorArea / tileArea);
        params = { tileSide, floorL, floorW, tileArea, floorArea, count, kind: "tiling_count" };
        correctAnswer = count;
        const tcW = Math.floor(Math.random() * 16);
        question = [
          `רצפה בגודל ${floorL}×${floorW}. אריחים ריבועיים עם צלע ${tileSide}. כמה אריחים צריך?`,
          `אריח ריבועי בצלע ${tileSide}. רצפה ${floorL}×${floorW}. כמה אריחים?`,
          `מרצפת בצלע ${tileSide}. רוצים לרצף שטח ${floorL}×${floorW}. כמה מרצפות?`,
          `כמה אריחים בצלע ${tileSide} נדרשים לכיסוי רצפה ${floorL}×${floorW}?`,
          `רצפת חדר ${floorL}×${floorW}. כל אריח הוא ${tileSide}×${tileSide}. כמה אריחים?`,
          `שטח רצפה: ${floorL}×${floorW}. שטח אריח: ${tileArea}. כמה אריחים נדרשים?`,
          `חדר ${floorL}×${floorW} אמות. אריחי רצפה בצלע ${tileSide}. כמה אריחים?`,
          `לריצוף שטח ${floorArea} עם אריחים בשטח ${tileArea} - כמה אריחים?`,
          `כמה אריחים ריבועיים בצלע ${tileSide} נדרשים לרצפה ${floorL}×${floorW}?`,
          `אריח ריבוע ${tileSide}×${tileSide}. כמה אריחים לכיסוי שטח ${floorArea}?`,
          `חדר בגודל ${floorL}×${floorW}. אריח הוא ${tileSide}×${tileSide}. כמה אריחים דרושים?`,
          `רצפה ${floorL}×${floorW}. אריחים ריבועיים ${tileSide}×${tileSide}. כמה?`,
          `${floorL}×${floorW} - לריצוף עם אריחים ${tileSide}×${tileSide}, מה מספר האריחים?`,
          `מחלקים שטח ${floorArea} לאריחים בשטח ${tileArea}. כמה אריחים?`,
          `מסדרים אריחים ${tileSide}×${tileSide} ברצפה ${floorL}×${floorW}. כמה?`,
          `רצפת מטבח ${floorL}×${floorW}. אריח כל צלע ${tileSide}. כמה אריחים לכיסוי מלא?`,
        ][tcW];

      } else {
        // שאלת "איזו צורה יכולה לרצף" — MCQ מושגי
        const canTile = ["ריבוע", "משושה", "משולש שווה צלעות"][Math.floor(Math.random() * 3)];
        const cannotTile = ["עיגול", "חמשה צלעות לא סדיר", "מנסרה"][Math.floor(Math.random() * 3)];
        // שאלות על זווית פנימית שמאפשרת ריצוף
        const tilingShapes = ["ריבוע", "משולש שווה צלעות", "משושה"];
        const tiledShape = tilingShapes[Math.floor(Math.random() * tilingShapes.length)];
        const tilingAngle =
          tiledShape === "ריבוע" ? 90 : tiledShape === "משולש שווה צלעות" ? 60 : 120;
        params = { shape: tiledShape, angle: tilingAngle, kind: "tiling" };
        correctAnswer = tilingAngle;
        const tcW2 = Math.floor(Math.random() * 16);
        question = [
          `${tiledShape} משמש לריצוף סדיר. מה הזווית הפנימית שלו?`,
          `ריצוף מלא ב${tiledShape} - כמה מעלות בכל זווית פנימית?`,
          `${tiledShape} מכסה רצפה ללא פערים. מה הזווית הפנימית שלו?`,
          `מה גודל הזווית הפנימית של ${tiledShape} שמאפשרת ריצוף?`,
          `${tiledShape} מתאים לריצוף. מה זווית הפנים?`,
          `ריצוף צפוף ב${tiledShape}: מה הזווית בכל פינה?`,
          `${tiledShape} ממלא שטח ללא רווחים. כמה מעלות בזווית פנימית?`,
          `זווית פנימית של ${tiledShape} שמכסה רצפה בדיוק - כמה מעלות?`,
          `${tiledShape} מכסה שטח ללא חריגות. מה זווית הפנים שלו?`,
          `ריצוף רצפה ב${tiledShape}. כמה מעלות בכל פינה?`,
          `${tiledShape} משתלב בריצוף ללא פערים. מה הזווית הפנימית?`,
          `מה גודל הזווית בפינות ${tiledShape} שמאפשרת ריצוף אחיד?`,
          `ריצוף מלא ב${tiledShape} - מה גודל הזווית?`,
          `${tiledShape}: מה הזווית הפנימית שלו כשמשמש לריצוף?`,
          `${tiledShape} מסדר ריצוף - מה הזווית הפנימית?`,
          `ריצוף ב${tiledShape}: כמה מעלות בזווית הפנים?`,
        ][tcW2];
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
            question = `עיגול עם רדיוס ${radius}. מה שטח הדיסק? (π = 3.14)`;
          } else if (levelKey === "medium") {
            question = `עיגול עם רדיוס ${radius}. מה השטח? (π = 3.14)`;
          } else {
            question = `אתגר שטח - עיגול רדיוס ${radius}: חשבו שטח מדויק (π = 3.14).`;
          }
        } else if (levelKey === "easy") {
          question = `עיגול קטן: רדיוס ${radius}. מה השטח? (π = 3.14)`;
        } else if (levelKey === "medium") {
          question = `מה שטח העיגול עם רדיוס ${radius}? (π = 3.14)`;
        } else {
          question = `שטח מעגל - רדיוס ${radius}. מה השטח? (π = 3.14)`;
        }
      } else {
        params = { radius, kind: "circle_perimeter", askArea: false };
        correctAnswer = round(2 * PI * radius);
        if (gradeKey === "g6") {
          if (levelKey === "easy") {
            question = `מעגל רדיוס ${radius}. מה היקף? (π = 3.14)`;
          } else if (levelKey === "medium") {
            question = `מעגל: רדיוס ${radius}. מה היקף המעטפת? (π = 3.14)`;
          } else {
            question = `אתגר היקף - מעגל רדיוס ${radius}. מה אורך המעטפת? (π = 3.14)`;
          }
        } else if (levelKey === "hard") {
          question = `אתגר - מה היקף המעגל עם רדיוס ${radius}? (π = 3.14)`;
        } else {
          question = `מה היקף המעגל עם רדיוס ${radius}? (π = 3.14)`;
        }
      }
      break;
    }

    // ===================== SOLIDS =====================
    case "solids": {
      const solidsList = [
        {
          name: "קובייה", solidKey: "cube", num: 1, faces: 6, vertices: 8, edges: 12,
          curved: false,
          descs: [
            "6 פאות ריבועיות שוות",
            "כל פאותיו ריבועים שווים",
            "8 קודקודים ו-6 פאות ריבועיות",
            "כל צלעותיו שוות",
            "6 פנים ריבועיים שווים",
            "נראה כמו קוביית משחק",
          ],
          dailyLife: ["קוביית משחק", "קוביית קרח", "קוביית רובי"],
        },
        {
          name: "תיבה", solidKey: "rectangular_prism", num: 2, faces: 6, vertices: 8, edges: 12,
          curved: false,
          descs: [
            "6 פאות מלבניות",
            "בסיסים מלבניים ופאות מלבניות",
            "8 קודקודים ו-6 פאות מלבניות",
            "אורכו, רוחבו וגובהו שונים",
            "כמו קופסת קרטון",
            "שש פאות, לא כולן שוות",
          ],
          dailyLife: ["קופסת נעליים", "קופסת קרטון", "לבנה"],
        },
        {
          name: "גליל", solidKey: "cylinder", num: 3, faces: 3, vertices: 0, edges: 2,
          curved: true,
          descs: [
            "2 בסיסים עגולים ומעטפת עגולה",
            "בסיס עגול ומעטפת גלילית",
            "נראה כמו פחית",
            "גלגל מוארך מצידיו",
            "פחית שימורים",
            "שני עיגולים בראשים",
          ],
          dailyLife: ["פחית קולה", "גליל נייר", "בול עץ"],
        },
        {
          name: "פירמידה", solidKey: "pyramid", num: 4, faces: 5, vertices: 5, edges: 8,
          curved: false,
          descs: [
            "בסיס מרובע ו-4 פאות משולשות",
            "בסיס מצולע ופאות משולשות",
            "קודקוד עליון ובסיס מרובע",
            "נראה כמו פירמידה במצרים",
            "5 פאות - בסיס ו-4 משולשים",
            "פאות משולשות שמתכנסות לנקודה",
          ],
          dailyLife: ["פירמידה מצרית", "אוהל", "גג מחודד"],
        },
        {
          name: "חרוט", solidKey: "cone", num: 5, faces: 2, vertices: 1, edges: 1,
          curved: true,
          descs: [
            "בסיס עגול וקודקוד חד",
            "בסיס עגול ומעטפת חלקה",
            "גלידה שאוחזים בה",
            "בסיס עגול ופסגה מחודדת",
            "נראה כמו כובע ליצן",
            "קודקוד אחד ובסיס עגול",
          ],
          dailyLife: ["גביע גלידה", "כובע קסמים", "חרוט בטיחות"],
        },
        {
          name: "כדור", solidKey: "sphere", num: 6, faces: 1, vertices: 0, edges: 0,
          curved: true,
          descs: [
            "כל הנקודות במרחק שווה מהמרכז",
            "עגול בכל הכיוונים",
            "אין פינות ואין צלעות",
            "מעטפת עגולה מכל כיוון",
            "ניתן לגלגל לכל כיוון",
            "רדיוס שווה מהמרכז לכל נקודה",
          ],
          dailyLife: ["כדורגל", "תפוח", "כדור טניס"],
        },
      ];

      const sel = solidsList[Math.floor(Math.random() * solidsList.length)];
      const solidSubtype = Math.floor(Math.random() * 5);
      const swDesc = Math.floor(Math.random() * sel.descs.length);
      const swDL = Math.floor(Math.random() * sel.dailyLife.length);

      if (formulaBand === "early" || solidSubtype === 0) {
        // g2 ו-g3: זיהוי שם לפי תיאור
        params = { solid: sel.name, solidShape: sel.solidKey, desc: sel.descs[swDesc], kind: "solids" };
        correctAnswer = sel.name;
        const sW = Math.floor(Math.random() * 8);
        if (formulaBand === "early") {
          question = [
            `גוף: ${sel.descs[swDesc]}. איזה גוף זה?`,
            `בחרו שם לגוף: ${sel.descs[swDesc]}.`,
            `${sel.dailyLife[swDL]} - איזה גוף זה?`,
            `זהו את הגוף: ${sel.descs[swDesc]}.`,
            `גוף תלת ממדי - ${sel.descs[swDesc]}. מה שמו?`,
            `${sel.descs[swDesc]} - מה שם הגוף?`,
            `איזה גוף יש לו: ${sel.descs[swDesc]}?`,
            `התאימו שם: ${sel.descs[swDesc]}.`,
          ][sW];
        } else {
          question = [
            `גוף תלת ממדי עם ${sel.descs[swDesc]}. מה שמו?`,
            `${sel.descs[swDesc]}. לאיזה גוף מתאים התיאור?`,
            `זהה גוף לפי: ${sel.descs[swDesc]}.`,
            `${sel.dailyLife[swDL]} נראה כמו - איזה גוף?`,
            `גוף שיש לו ${sel.descs[swDesc]}. מה שמו?`,
            `לגוף זה: ${sel.descs[swDesc]}. מה שמו?`,
            `תיאור גוף: ${sel.descs[swDesc]}. מה מתאים?`,
            `תלת ממד: ${sel.descs[swDesc]}. מה הגוף?`,
          ][sW];
        }
      } else if (solidSubtype === 1 && (formulaBand === "mid" || formulaBand === "late")) {
        // g3-g6: כמה פאות?
        params = { solid: sel.name, solidShape: sel.solidKey, faces: sel.faces, kind: "solids_faces" };
        correctAnswer = sel.faces;
        const sfW = Math.floor(Math.random() * 8);
        question = [
          `כמה פאות יש ל${sel.name}?`,
          `ל${sel.name} - כמה פאות?`,
          `מנו את פאות ה${sel.name}. כמה יש?`,
          `${sel.name} - מה מספר פאותיו?`,
          `כמה פנים יש לגוף ${sel.name}?`,
          `${sel.name}: ספרו כמה פאות.`,
          `${sel.name} מורכב מכמה פאות?`,
          `מספר הפאות של ${sel.name} הוא?`,
        ][sfW];
      } else if (solidSubtype === 2 && (formulaBand === "mid" || formulaBand === "late")) {
        // g3-g6: כמה קודקודים?
        params = { solid: sel.name, solidShape: sel.solidKey, vertices: sel.vertices, kind: "solids_vertices" };
        correctAnswer = sel.vertices;
        const svW = Math.floor(Math.random() * 8);
        question = [
          `כמה קודקודים יש ל${sel.name}?`,
          `ל${sel.name} - כמה קודקודים?`,
          `${sel.name}: מה מספר הקודקודים?`,
          `מנו קודקודי ה${sel.name}. כמה יש?`,
          `כמה פינות (קודקודים) יש ל${sel.name}?`,
          `${sel.name} - כמה קודקודים לו?`,
          `${sel.name}: ספרו כמה קודקודים.`,
          `מספר הקודקודים של ${sel.name}?`,
        ][svW];
      } else if (solidSubtype === 3 && (formulaBand === "mid" || formulaBand === "late")) {
        // g3-g6: כמה צלעות?
        params = { solid: sel.name, solidShape: sel.solidKey, edges: sel.edges, kind: "solids_edges" };
        correctAnswer = sel.edges;
        const seW = Math.floor(Math.random() * 6);
        question = [
          `כמה צלעות יש ל${sel.name}?`,
          `ל${sel.name} - כמה צלעות?`,
          `${sel.name}: מה מספר הצלעות?`,
          `מנו צלעות ה${sel.name}. כמה יש?`,
          `${sel.name} - כמה קווי חיבור בין קודקודים?`,
          `מספר הצלעות של ${sel.name}?`,
        ][seW];
      } else {
        // ברירת מחדל: זיהוי שם
        params = { solid: sel.name, solidShape: sel.solidKey, desc: sel.descs[swDesc], kind: "solids" };
        correctAnswer = sel.name;
        question = `גוף תלת ממדי עם ${sel.descs[swDesc]}. מה שמו?`;
      }
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
            : `ריבוע עם צלע ${side}. מה השטח?`;
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

  const correctIdx = shuffledAnswers.findIndex(
    (a) => String(a) === String(resolvedCorrect) || String(a) === String(correctAnswer)
  );
  const skipLabelRepair =
    (baseKindOut === "concept_transform" && Boolean(GEOMETRY_HEBREW_LABEL_OPTIONS.concept_transform)) ||
    baseKindOut === "concept_tf" ||
    params?.answerMode === "binary";
  const repairedBundle = skipLabelRepair
    ? { answers: shuffledAnswers, correctAnswer: resolvedCorrect }
    : repairMcqObviousAnswerContent(
        {
          question,
          answers: shuffledAnswers,
          correctIndex: correctIdx >= 0 ? correctIdx : 0,
          correctAnswer: resolvedCorrect,
        },
        { subject: "geometry", stem: question }
      );
  const repairedAnswers = repairedBundle.answers ?? shuffledAnswers;
  const repairedCorrect =
    repairedBundle.correctAnswer != null ? repairedBundle.correctAnswer : resolvedCorrect;
  const finalCorrectIdx = repairedAnswers.findIndex(
    (a) => String(a) === String(repairedCorrect)
  );

  const enrichedParams = enrichGeometryProceduralParams(params, {
    topic: selectedTopic,
    gradeKey,
    levelKey,
  });

  return sanitizeQuestionForStudentDisplay(
    attachCanonicalMetadataToMathGeometryQuestion(
      {
        question,
        correctAnswer: repairedCorrect,
        answers: repairedAnswers,
        topic: selectedTopic,
        shape,
        params: enrichedParams,
      },
      {
        subject: "geometry",
        gradeKey,
        levelKey,
        topic: selectedTopic,
      }
    )
  );
}

