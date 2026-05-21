import { itemAllowedForGrade } from "./grade-gating.js";
import { mergeDiagnosticContractIntoParams } from "./diagnostic-question-contract.js";
import { sanitizeQuestionForStudentDisplay } from "./student-question-stem-sanitizer.js";

/**
 * שאלות גיאומטריה קונספטואליות — הסקה, השוואה, סיווג, בלבול שטח/היקף, רב-שלבי מושגי.
 * תשובות טקסט; בינאריות = 2 אופציות בלבד.
 */

function shuffleOptions(correct, options) {
  const arr = [...new Set(options.map((s) => String(s).trim()))].filter(Boolean);
  if (!arr.includes(correct)) arr.push(correct);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return { answers: arr, correctAnswer: correct };
}

/**
 * Render one conceptual bank row into a lesson question (deterministic wiring).
 * @param {Record<string, unknown>} row
 * @param {{ gradeKey: string, levelKey: string, topic: string }} ctx
 */
export function renderGeometryConceptualRowToQuestion(row, ctx) {
  const { gradeKey, levelKey, topic } = ctx;
  const lv = levelKey || "easy";
  const correct = String(row.correct).trim();
  let answers;
  const baseParams = {
    kind: row.kind || "conceptual_mcq",
    patternFamily: row.patternFamily,
    subtype: row.subtype,
    conceptTag: row.conceptTag,
    distractorFamily: row.distractorFamily || "conceptual",
    answerMode: row.binary ? "binary" : "mcq_text",
  };
  let params = mergeDiagnosticContractIntoParams(baseParams, {
    diagnosticSkillId: row.diagnosticSkillId,
    expectedErrorTags: row.expectedErrorTags,
    probePower: row.probePower,
    suggestedQuestionType: row.suggestedQuestionType,
  });

  if (row.binary) {
    const opts =
      row.options.length === 2
        ? row.options
        : [correct, row.options.find((x) => x !== correct)];
    const sh = shuffleOptions(correct, opts);
    answers = sh.answers;
    params.optionCount = 2;
  } else {
    const sh = shuffleOptions(correct, row.options);
    answers = sh.answers;
    params.optionCount = answers.length;
  }

  const levelFr =
    lv === "easy"
      ? "מושגים (קל)"
      : lv === "medium"
        ? "מושגים (בינוני)"
        : "מושגים (אתגר)";
  const qText = String(row.question || "").trim();

  return sanitizeQuestionForStudentDisplay({
    question: qText,
    correctAnswer: correct,
    answers,
    topic,
    shape: null,
    params: { ...params, conceptualLevelFraming: levelFr },
  });
}

/**
 * @param {{ gradeKey: string, levelKey: string, topic: string }} ctx
 * @returns {null | { question: string, correctAnswer: string, answers: string[], params: object }}
 */
export function pickGeometryConceptualQuestion(ctx) {
  const { gradeKey, levelKey, topic } = ctx;
  const g = gradeKey || "g3";
  const lv = levelKey || "easy";
  const candidates = GEOMETRY_CONCEPTUAL_ITEMS.filter((row) => {
    if (!row.topics.includes(topic)) return false;
    if (!itemAllowedForGrade(row, g)) return false;
    if (row.levels && !row.levels.includes(lv)) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  const row = candidates[Math.floor(Math.random() * candidates.length)];
  const rendered = renderGeometryConceptualRowToQuestion(row, {
    gradeKey,
    levelKey,
    topic,
  });
  return {
    question: rendered.question,
    correctAnswer: rendered.correctAnswer,
    answers: rendered.answers,
    params: rendered.params,
  };
}

/** הסתברות לנסות בנק קונספטואלי לפני נוסחתית */
export function geometryConceptualProbability(gradeKey, topic) {
  const p = {
    g1: { shapes_basic: 0.35, transformations: 0.35, default: 0 },
    g2: { area: 0.45, solids: 0.4, transformations: 0.3, default: 0.25 },
    g3: {
      area: 0.58,
      perimeter: 0.58,
      angles: 0.52,
      triangles: 0.45,
      quadrilaterals: 0.45,
      parallel_perpendicular: 0.4,
      rotation: 0.35,
      default: 0.4,
    },
    g4: {
      area: 0.6,
      perimeter: 0.6,
      volume: 0.45,
      shapes_basic: 0.45,
      symmetry: 0.45,
      diagonal: 0.4,
      default: 0.42,
    },
    g5: {
      area: 0.62,
      perimeter: 0.55,
      volume: 0.48,
      heights: 0.45,
      tiling: 0.5,
      quadrilaterals: 0.45,
      default: 0.45,
    },
    g6: {
      area: 0.55,
      perimeter: 0.55,
      volume: 0.48,
      circles: 0.5,
      angles: 0.48,
      pythagoras: 0.42,
      solids: 0.45,
      default: 0.48,
    },
  };
  const map = p[gradeKey];
  if (!map) return 0;
  return map[topic] ?? map.default ?? 0;
}

/** ייצוא לסקריפט אודיט (`scripts/audit-question-banks.mjs`) */
// Metadata enrichment (safe pass): difficulty, cognitiveLevel, expectedErrorTypes, prerequisiteSkillIds (confidence/taxonomy-gated). See reports/question-metadata-qa/geometry-metadata-apply-report.json.
export const GEOMETRY_CONCEPTUAL_ITEMS = [
  {
    "gradeBand": "mid",
    "topics": [
      "area",
      "perimeter"
    ],
    "levels": [
      "easy",
      "medium",
      "hard"
    ],
    "kind": "concept_measure_interpret",
    "patternFamily": "perimeter_vs_area",
    "subtype": "choose_measure",
    "conceptTag": "pv_area",
    "distractorFamily": "measure_confusion",
    "diagnosticSkillId": "geo_pv_area_vs_perimeter",
    "expectedErrorTags": [
      "concept_confusion"
    ],
    "suggestedQuestionType": "geometry_concept_minimal_contrast",
    "question": "יש ריבוע עם צלע 5 ס״מ. אם שואלים 'כמה נייר צריך לכסות את כל הפנים', איזה מושג מחפשים?",
    "correct": "שטח",
    "options": [
      "שטח",
      "היקף",
      "נפח",
      "אורך אלכסון בלבד"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "measurement_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "area",
      "perimeter"
    ],
    "levels": [
      "easy",
      "medium",
      "hard"
    ],
    "kind": "concept_measure_interpret",
    "patternFamily": "perimeter_vs_area",
    "subtype": "choose_measure_floor",
    "conceptTag": "pv_area_late",
    "distractorFamily": "measure_confusion",
    "diagnosticSkillId": "geo_pv_area_vs_perimeter",
    "expectedErrorTags": [
      "concept_confusion"
    ],
    "suggestedQuestionType": "geometry_concept_minimal_contrast",
    "question": "ריצוף ריבועי לחדר: צלע הריצוף 5 מ׳. כדי לדעת כמה מ״ר צריך לרכוש — איזה מושג מחשבים?",
    "correct": "שטח",
    "options": [
      "שטח",
      "היקף",
      "נפח",
      "אורך אלכסון בלבד"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "measurement_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "area",
      "perimeter"
    ],
    "levels": [
      "easy",
      "medium",
      "hard"
    ],
    "kind": "concept_measure_interpret",
    "patternFamily": "perimeter_vs_area",
    "subtype": "fence",
    "conceptTag": "pv_perimeter",
    "distractorFamily": "measure_confusion",
    "diagnosticSkillId": "geo_pv_area_vs_perimeter",
    "expectedErrorTags": [
      "concept_confusion"
    ],
    "suggestedQuestionType": "geometry_concept_minimal_contrast",
    "question": "רוצים גדר סביב מגרש מלבני (רק סביב הגבול החיצוני). מה בדרך כלל מחשבים כדי לדעת כמה חומר גדר לקנות?",
    "correct": "היקף",
    "options": [
      "היקף",
      "שטח",
      "נפח",
      "זווית פנימית"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "measurement_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "area",
      "perimeter"
    ],
    "levels": [
      "easy",
      "medium",
      "hard"
    ],
    "kind": "concept_measure_interpret",
    "patternFamily": "perimeter_vs_area",
    "subtype": "fence_perimeter_project",
    "conceptTag": "pv_perimeter_late",
    "distractorFamily": "measure_confusion",
    "diagnosticSkillId": "geo_pv_area_vs_perimeter",
    "expectedErrorTags": [
      "concept_confusion"
    ],
    "suggestedQuestionType": "geometry_concept_minimal_contrast",
    "question": "פרויקט תכנון: גדר סביב מגרש מלבני (רק החיצון). כדי להזמין אורך גדר — מה מודדים?",
    "correct": "היקף",
    "options": [
      "היקף",
      "שטח",
      "נפח",
      "זווית פנימית"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "measurement_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "area"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_multi_step_plan",
    "patternFamily": "plan_then_compute",
    "subtype": "area_rectangle",
    "conceptTag": "plan_area_rect",
    "distractorFamily": "wrong_formula_family",
    "diagnosticSkillId": "geo_rect_area_plan",
    "expectedErrorTags": [
      "geometry_calculation_slip",
      "concept_confusion"
    ],
    "suggestedQuestionType": "geometry_formula_choice",
    "question": "מלבן באורך 8 מ׳ וברוחב 3 מ׳. מה השלב הנכון הראשון כדי למצוא את שטח הרצפה?",
    "correct": "להכפיל אורך ברוחב",
    "options": [
      "להכפיל אורך ברוחב",
      "לחבר את כל הצלעות (כמו היקף)",
      "להכפיל אורך ב־4",
      "לחלק אורך ב־2 בלבד"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "application",
    "expectedErrorTypes": [
      "geometry_calculation_slip",
      "concept_confusion",
      "formula_selection_error"
    ],
    "prerequisiteSkillIds": [
      "geo_pv_area_vs_perimeter"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "area"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_multi_step_plan",
    "patternFamily": "plan_then_compute",
    "subtype": "area_rectangle_site",
    "conceptTag": "plan_area_rect_late",
    "distractorFamily": "wrong_formula_family",
    "diagnosticSkillId": "geo_rect_area_plan",
    "expectedErrorTags": [
      "geometry_calculation_slip",
      "concept_confusion"
    ],
    "suggestedQuestionType": "geometry_formula_choice",
    "question": "שטיח מלבני לחדר גדול: אורך 8 מ׳ ורוחב 3 מ׳. לפני חישוב שטח החלל — מה צעד ראשון מתאים?",
    "correct": "להכפיל אורך ברוחב",
    "options": [
      "להכפיל אורך ברוחב",
      "לחבר את כל הצלעות (כמו היקף)",
      "להכפיל אורך ב־4",
      "לחלק אורך ב־2 בלבד"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "application",
    "expectedErrorTypes": [
      "geometry_calculation_slip",
      "concept_confusion",
      "formula_selection_error"
    ],
    "prerequisiteSkillIds": [
      "geo_pv_area_vs_perimeter"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "area",
      "perimeter"
    ],
    "levels": [
      "hard"
    ],
    "kind": "concept_compare_shapes",
    "patternFamily": "shape_comparison",
    "subtype": "same_perimeter",
    "conceptTag": "compare_area",
    "distractorFamily": "comparison_trap",
    "diagnosticSkillId": "geo_rect_area_plan",
    "expectedErrorTags": [
      "compare_area",
      "same_perimeter_area_trap",
      "visual_reasoning_error"
    ],
    "question": "שני מלבנים שונים עם אותו היקף. מה נכון לגבי השטח שלהם?",
    "correct": "השטחים יכולים להיות שונים",
    "options": [
      "השטחים יכולים להיות שונים",
      "השטחים תמיד שווים",
      "תמיד למלבן הגבוה יותר יש שטח גדול יותר בלי קשר לרוחב",
      "ההיקף קובע את השטח בצורה חד־משמעית"
    ],
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "visual_reasoning_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "angles"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_angle_reason",
    "patternFamily": "triangle_angle_sum",
    "subtype": "inference",
    "conceptTag": "tri_sum_180",
    "distractorFamily": "angle_misconception",
    "question": "במשולש ידועות שתי זוויות: 50° ו־60°. מה אפשר להסיק על הזווית השלישית בלי לחשב עדיין את המספר?",
    "correct": "סכום שלוש הזוויות במשולש הוא 180°",
    "options": [
      "סכום שלוש הזוויות במשולש הוא 180°",
      "הזווית השלישית תמיד 90°",
      "סכום הזוויות במשולש הוא 360°",
      "אין מספיק מידע בלי לדעת אורכי צלעות"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "concept_confusion"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "angles"
    ],
    "levels": [
      "easy",
      "medium",
      "hard"
    ],
    "kind": "concept_angle_reason",
    "patternFamily": "triangle_angle_sum",
    "subtype": "inference_reasoning",
    "conceptTag": "tri_sum_180_late",
    "distractorFamily": "angle_misconception",
    "diagnosticSkillId": "geo_angle_measure",
    "expectedErrorTags": [
      "tri_sum_180_late",
      "triangle_angle_sum_error",
      "angle_measure_error"
    ],
    "question": "במשולש במישור, שתי זוויות פנימיות ידועות (למשל 50° ו־60°). לפני חישוב המספר המדויק — איזה עיקרון גיאומטרי מאפשר להסיק על השלישית?",
    "correct": "סכום שלוש הזוויות במשולש הוא 180°",
    "options": [
      "סכום שלוש הזוויות במשולש הוא 180°",
      "הזווית השלישית תמיד 90°",
      "סכום הזוויות במשולש הוא 360°",
      "אין מספיק מידע בלי לדעת אורכי צלעות"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "concept_confusion"
    ],
    "prerequisiteSkillIds": [
      "tri_sum_180"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "angles"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_angle_reason",
    "patternFamily": "right_angle",
    "subtype": "classification",
    "conceptTag": "right_90",
    "distractorFamily": "angle_type",
    "diagnosticSkillId": "geo_angle_right_identify",
    "expectedErrorTags": [
      "concept_confusion"
    ],
    "suggestedQuestionType": "geometry_identify_shape_property",
    "question": "זווית ישרה היא בערך:",
    "correct": "90°",
    "options": [
      "90°",
      "180°",
      "45°",
      "360°"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "concept_confusion"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "angles"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_angle_reason",
    "patternFamily": "right_angle",
    "subtype": "classification_late",
    "conceptTag": "right_90_late",
    "distractorFamily": "angle_type",
    "diagnosticSkillId": "geo_angle_right_identify",
    "expectedErrorTags": [
      "concept_confusion"
    ],
    "suggestedQuestionType": "geometry_identify_shape_property",
    "question": "במדידה מדויקת, זווית ישרת־מעשית קרובה ל:",
    "correct": "90°",
    "options": [
      "90°",
      "180°",
      "45°",
      "360°"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "concept_confusion"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "angles"
    ],
    "levels": [
      "hard"
    ],
    "kind": "concept_angle_reason",
    "patternFamily": "parallel_lines",
    "subtype": "concept_only",
    "conceptTag": "corresponding",
    "distractorFamily": "parallel_confusion",
    "diagnosticSkillId": "geo_angle_measure",
    "expectedErrorTags": [
      "corresponding",
      "parallel_corresponding_angle_error",
      "angle_equality_error"
    ],
    "question": "שני ישרים מקבילים חותכים על ידי קו חוצה. זוג זוויות מתאימות (באותו מיקום יחסי) — מה הקשר ביניהן?",
    "correct": "שוות בגודל",
    "options": [
      "שוות בגודל",
      "תמיד משלימות ל־180° זו עם זו",
      "תמיד סכומן 90°",
      "אין קשר קבוע"
    ],
    "difficulty": "advanced",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "triangles"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_classify",
    "patternFamily": "triangle_by_sides",
    "subtype": "equal_sides",
    "conceptTag": "equilateral",
    "distractorFamily": "class_mislabel",
    "question": "משולש שבו כל שלוש הצלעות שוות — איך נקרא?",
    "correct": "משולש שווה צלעות",
    "options": [
      "משולש שווה צלעות",
      "משולש שווה שוקיים",
      "משולש ישר זווית תמיד",
      "ריבוע"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "triangles"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_classify",
    "patternFamily": "triangle_by_sides",
    "subtype": "equal_sides_review",
    "conceptTag": "equilateral_late",
    "distractorFamily": "class_mislabel",
    "question": "בסיווג לפי צלעות: משולש עם שלוש צלעות שוות — השם המתאים הוא:",
    "correct": "משולש שווה צלעות",
    "options": [
      "משולש שווה צלעות",
      "משולש שווה שוקיים",
      "משולש ישר זווית תמיד",
      "ריבוע"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "quadrilaterals"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_classify",
    "patternFamily": "quadrilateral_props",
    "subtype": "parallelogram",
    "conceptTag": "para_parallel",
    "distractorFamily": "shape_family",
    "diagnosticSkillId": "geo_quad_properties",
    "expectedErrorTags": [
      "para_parallel",
      "opposite_sides_parallel_error",
      "shape_property_misread"
    ],
    "question": "במקבילית, כל זוג צלעות נגדיות:",
    "correct": "מקבילות ושוות באורך",
    "options": [
      "מקבילות ושוות באורך",
      "תמיד מאונכות",
      "תמיד באותו אורך כמו האלכסונים",
      "יוצרות זווית ישרה בכל חיבור"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "quadrilaterals"
    ],
    "levels": [
      "easy",
      "medium",
      "hard"
    ],
    "kind": "concept_classify",
    "patternFamily": "quadrilateral_props",
    "subtype": "parallelogram_late",
    "conceptTag": "para_parallel_late",
    "distractorFamily": "shape_family",
    "diagnosticSkillId": "geo_quad_properties",
    "expectedErrorTags": [
      "para_parallel_late",
      "opposite_sides_parallel_error",
      "shape_property_misread"
    ],
    "question": "במקבילית במישור — לגבי זוגות צלעות נגדיות נכון לומר שהם:",
    "correct": "מקבילות ושוות באורך",
    "options": [
      "מקבילות ושוות באורך",
      "תמיד מאונכות",
      "תמיד באותו אורך כמו האלכסונים",
      "יוצרות זווית ישרה בכל חיבור"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "quadrilaterals"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_classify",
    "patternFamily": "hierarchy",
    "subtype": "square_rectangle",
    "conceptTag": "square_special",
    "distractorFamily": "hierarchy_confusion",
    "diagnosticSkillId": "geo_quad_classification",
    "expectedErrorTags": [
      "square_special",
      "hierarchy_inclusion_error",
      "shape_family_mislabel"
    ],
    "question": "כל ריבוע הוא גם:",
    "correct": "מלבן",
    "options": [
      "מלבן",
      "טרפז בלבד",
      "מעגל",
      "משולש"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "quadrilaterals"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_classify",
    "patternFamily": "hierarchy",
    "subtype": "square_rectangle_late",
    "conceptTag": "square_special_late",
    "distractorFamily": "hierarchy_confusion",
    "diagnosticSkillId": "geo_quad_classification",
    "expectedErrorTags": [
      "square_special_late",
      "hierarchy_inclusion_error",
      "shape_family_mislabel"
    ],
    "question": "במושגי הכללה: לכל ריבוע יש תכונות של:",
    "correct": "מלבן",
    "options": [
      "מלבן",
      "טרפז בלבד",
      "מעגל",
      "משולש"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "symmetry"
    ],
    "levels": [
      "easy",
      "medium",
      "hard"
    ],
    "kind": "concept_symmetry",
    "patternFamily": "reflection",
    "subtype": "meaning",
    "conceptTag": "mirror",
    "distractorFamily": "transform_confusion",
    "diagnosticSkillId": "geo_symmetry_reflection",
    "expectedErrorTags": [
      "mirror",
      "reflection_vs_rotation_confusion",
      "transform_confusion"
    ],
    "question": "שיקוף מול ציר סימטרייה דומה בעיקר ל:",
    "correct": "תמונה במראה",
    "options": [
      "תמונה במראה",
      "סיבוב סביב מרכז",
      "הזזה בלי סיבוב",
      "הגדלת הצורה"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "symmetry"
    ],
    "levels": [
      "easy",
      "medium",
      "hard"
    ],
    "kind": "concept_symmetry",
    "patternFamily": "reflection",
    "subtype": "meaning_axis",
    "conceptTag": "mirror_late",
    "distractorFamily": "transform_confusion",
    "diagnosticSkillId": "geo_symmetry_reflection",
    "expectedErrorTags": [
      "mirror_late",
      "reflection_vs_rotation_confusion",
      "transform_confusion"
    ],
    "question": "שיקוף ביחס לציר סימטרייה — הדימוי הקרוב ביותר הוא:",
    "correct": "תמונה במראה",
    "options": [
      "תמונה במראה",
      "סיבוב סביב מרכז",
      "הזזה בלי סיבוב",
      "הגדלת הצורה"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "symmetry",
      "transformations"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_congruence",
    "patternFamily": "congruence",
    "subtype": "same_size_shape",
    "conceptTag": "congruent_def",
    "distractorFamily": "congruence_vs_similar",
    "diagnosticSkillId": "geo_symmetry_reflection",
    "expectedErrorTags": [
      "congruent_def",
      "congruence_vs_similarity_error",
      "transform_confusion"
    ],
    "question": "שתי צורות חופפות אומרות ש:",
    "correct": "אותו צורה ואותו גודל (אפשר להניח אחת על השנייה)",
    "options": [
      "אותו צורה ואותו גודל (אפשר להניח אחת על השנייה)",
      "רק אותו שטח אבל צורה שונה",
      "רק אותו היקף",
      "רק זוויות שוות בלי קשר לצלעות"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "parallel_perpendicular"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_lines",
    "patternFamily": "parallel_perpendicular",
    "subtype": "definition",
    "conceptTag": "perp_meeting",
    "distractorFamily": "line_relation",
    "question": "שני קווים מאונכים זה לזה — מה נכון?",
    "correct": "הם נפגשים בזווית של 90°",
    "options": [
      "הם נפגשים בזווית של 90°",
      "הם לעולם לא נפגשים",
      "הם תמיד באותו אורך",
      "הם תמיד מקבילים"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "parallel_perpendicular"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_lines",
    "patternFamily": "parallel_perpendicular",
    "subtype": "definition_late",
    "conceptTag": "perp_meeting_late",
    "distractorFamily": "line_relation",
    "question": "במישור, שני ישרים מאונכים זה לזה — מה תכונה נכונה בנקודת החיתוך?",
    "correct": "הם נפגשים בזווית של 90°",
    "options": [
      "הם נפגשים בזווית של 90°",
      "הם לעולם לא נפגשים",
      "הם תמיד באותו אורך",
      "הם תמיד מקבילים"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "parallel_perpendicular"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_lines",
    "patternFamily": "parallel_perpendicular",
    "subtype": "parallel_def",
    "conceptTag": "parallel_never_meet",
    "distractorFamily": "line_relation",
    "question": "שני קווים מקבילים באותו מישור — מה תכונה נכונה?",
    "correct": "אין להם נקודת חיתוך (נשארים באותו מרחק)",
    "options": [
      "אין להם נקודת חיתוך (נשארים באותו מרחק)",
      "הם חייבים להיפגש בנקודה אחת",
      "הם תמיד מאונכים",
      "הם תמיד שווים באורך"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "parallel_perpendicular"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_lines",
    "patternFamily": "parallel_perpendicular",
    "subtype": "parallel_def_late",
    "conceptTag": "parallel_never_meet_late",
    "distractorFamily": "line_relation",
    "question": "שני ישרים מקבילים באותו מישור — לגבי חיתוך ביניהם נכון ש:",
    "correct": "אין להם נקודת חיתוך (נשארים באותו מרחק)",
    "options": [
      "אין להם נקודת חיתוך (נשארים באותו מרחק)",
      "הם חייבים להיפגש בנקודה אחת",
      "הם תמיד מאונכים",
      "הם תמיד שווים באורך"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "volume"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_volume_meaning",
    "patternFamily": "volume_space",
    "subtype": "definition",
    "conceptTag": "volume_3d",
    "distractorFamily": "dimension_confusion",
    "diagnosticSkillId": "geo_volume_unit_reasoning",
    "expectedErrorTags": [
      "volume_3d",
      "dimension_confusion",
      "measurement_error"
    ],
    "question": "נפח של תיבה מבטא בעיקר:",
    "correct": "כמה מקום תפוס בתוך התיבה (שלושה ממדים)",
    "options": [
      "כמה מקום תפוס בתוך התיבה (שלושה ממדים)",
      "אורך הקצה הארוך ביותר בלבד",
      "שטח של פאה אחת בלבד",
      "היקף הבסיס בלבד"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "volume"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_volume_meaning",
    "patternFamily": "volume_space",
    "subtype": "definition_capacity",
    "conceptTag": "volume_3d_late",
    "distractorFamily": "dimension_confusion",
    "diagnosticSkillId": "geo_volume_unit_reasoning",
    "expectedErrorTags": [
      "volume_3d_late",
      "dimension_confusion",
      "measurement_error"
    ],
    "question": "כשמדברים על נפח של תיבה סגורה — מה המשמעות הגיאומטרית העיקרית?",
    "correct": "כמה מקום תפוס בתוך התיבה (שלושה ממדים)",
    "options": [
      "כמה מקום תפוס בתוך התיבה (שלושה ממדים)",
      "אורך הקצה הארוך ביותר בלבד",
      "שטח של פאה אחת בלבד",
      "היקף הבסיס בלבד"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "volume"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_multi_step_plan",
    "patternFamily": "volume_prism_plan",
    "subtype": "order_ops",
    "conceptTag": "vol_box",
    "distractorFamily": "formula_order",
    "diagnosticSkillId": "geo_volume_prism_formula",
    "expectedErrorTags": [
      "vol_box",
      "formula_selection_error",
      "volume_unit_error"
    ],
    "question": "תיבה מלבנית: קודם כל רוצים את הנפח. מה סדר חישוב סביר?",
    "correct": "אורך × רוחב × גובה",
    "options": [
      "אורך × רוחב × גובה",
      "אורך + רוחב + גובה",
      "(אורך + רוחב) × 2",
      "אורך × גובה בלבד בלי רוחב"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "application",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "minGrade": 6,
    "maxGrade": 6,
    "topics": [
      "circles"
    ],
    "levels": [
      "easy",
      "medium",
      "hard"
    ],
    "kind": "concept_circle",
    "patternFamily": "radius_diameter",
    "subtype": "relation",
    "conceptTag": "d_2r",
    "distractorFamily": "circle_terms",
    "question": "במעגל, הקשר בין קוטר לרדיוס הוא:",
    "correct": "הקוטר פי 2 מהרדיוס",
    "options": [
      "הקוטר פי 2 מהרדיוס",
      "הרדיוס פי 2 מהקוטר",
      "הם תמיד שווים",
      "אין קשר קבוע"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "minGrade": 6,
    "maxGrade": 6,
    "topics": [
      "circles",
      "area",
      "perimeter"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_circle",
    "patternFamily": "circumference_vs_area",
    "subtype": "interpret",
    "conceptTag": "wheel_rotation",
    "distractorFamily": "circle_measure_confusion",
    "diagnosticSkillId": "geo_perimeter_formula",
    "expectedErrorTags": [
      "wheel_rotation",
      "circumference_vs_area_confusion",
      "measurement_error"
    ],
    "question": "כמה מטרים עובר גלגל אופניים במסלול מעגלי אחד מלא — זה קשור בעיקר ל:",
    "correct": "היקף (היקף המעגל)",
    "options": [
      "היקף (היקף המעגל)",
      "שטח העיגול",
      "נפח הצמיג",
      "רדיוס בלבד בלי כפל"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "measurement_error",
      "concept_confusion"
    ]
  },
  {
    "minGrade": 6,
    "maxGrade": 6,
    "topics": [
      "pythagoras"
    ],
    "levels": [
      "easy",
      "medium",
      "hard"
    ],
    "kind": "concept_pythagoras",
    "patternFamily": "right_triangle_identify",
    "subtype": "hypotenuse_side",
    "conceptTag": "hyp_opposite_right",
    "distractorFamily": "pythagoras_misconception",
    "question": "במשולש ישר זווית, היתר הוא:",
    "correct": "הצלע שמול זווית הישר",
    "options": [
      "הצלע שמול זווית הישר",
      "הצלע הקצרה ביותר תמיד",
      "כל צלע שלא נבחרה",
      "הצלע שליד זווית הישר תמיד"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "minGrade": 6,
    "maxGrade": 6,
    "topics": [
      "pythagoras"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_multi_step_plan",
    "patternFamily": "pythagoras_plan",
    "subtype": "first_step",
    "conceptTag": "when_pyth",
    "distractorFamily": "strategy_error",
    "question": "במשולש ישר זווית ידועים שני ניצבים ורוצים את היתר. מה הכלי המתאים?",
    "correct": "משפט פיתגורס (סכום ריבועי ניצבים = ריבוע היתר)",
    "options": [
      "משפט פיתגורס (סכום ריבועי ניצבים = ריבוע היתר)",
      "סכום ישר של שלוש הצלעות",
      "שטח משולש (חצי בסיס כפול גובה) בלבד",
      "היקף המשולש בלבד"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "application",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "early",
    "topics": [
      "solids"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_solids",
    "patternFamily": "solid_faces_band_early",
    "subtype": "cube",
    "conceptTag": "cube_faces",
    "distractorFamily": "solid_confusion",
    "question": "לקובייה יש בדרך כלל כמה פאות מרובעות?",
    "correct": "6",
    "options": [
      "6",
      "4",
      "8",
      "12"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "solids"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_solids",
    "patternFamily": "solid_faces_band_late",
    "subtype": "cube_faces_late",
    "conceptTag": "cube_faces_late",
    "distractorFamily": "solid_confusion",
    "question": "בגוף תלת־ממדי מסוג קובייה — כמה פאות מרובעות יש בדרך כלל?",
    "correct": "6",
    "options": [
      "6",
      "4",
      "8",
      "12"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "early",
    "topics": [
      "solids"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_solids",
    "patternFamily": "prism_vs_pyramid_band_early",
    "subtype": "compare",
    "conceptTag": "apex",
    "distractorFamily": "solid_confusion",
    "question": "מה נכון לגבי פירמידה לעומת מנסרה עם אותו בסיס?",
    "correct": "לפירמידה יש קודקוד אחד; למנסרה שתי בסיסים מקבילים דומים",
    "options": [
      "לפירמידה יש קודקוד אחד; למנסרה שתי בסיסים מקבילים דומים",
      "שתיהן חייבות להיות עגולות",
      "אין הבדל בין פירמידה למנסרה",
      "למנסרה תמיד אין פאות"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "solids"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_solids",
    "patternFamily": "prism_vs_pyramid_band_late",
    "subtype": "compare_late",
    "conceptTag": "apex_late",
    "distractorFamily": "solid_confusion",
    "question": "בהשוואה גיאומטרית: פירמידה לעומת מנסרה עם אותו צורת בסיס — מה נכון?",
    "correct": "לפירמידה יש קודקוד אחד; למנסרה שתי בסיסים מקבילים דומים",
    "options": [
      "לפירמידה יש קודקוד אחד; למנסרה שתי בסיסים מקבילים דומים",
      "שתיהן חייבות להיות עגולות",
      "אין הבדל בין פירמידה למנסרה",
      "למנסרה תמיד אין פאות"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "tiling"
    ],
    "levels": [
      "easy",
      "medium",
      "hard"
    ],
    "kind": "concept_tiling",
    "patternFamily": "regular_tiling",
    "subtype": "angles_around_point",
    "conceptTag": "360_at_vertex",
    "distractorFamily": "tiling_angle",
    "question": "בריצוף במישור סביב כל נקודת מפגש של צורות משוכללות, סכום הזוויות סביב הנקודה הוא:",
    "correct": "360°",
    "options": [
      "360°",
      "180°",
      "90°",
      "תלוי רק בצבע הריצוף"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "heights"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_height",
    "patternFamily": "height_definition",
    "subtype": "triangle",
    "conceptTag": "perpendicular_to_base",
    "distractorFamily": "height_confusion",
    "question": "גובה במשולש (ביחס לבסיס נתון) הוא:",
    "correct": "קטע מאונך מהקודקוד הנגדי לבסיס (או להארכתו)",
    "options": [
      "קטע מאונך מהקודקוד הנגדי לבסיס (או להארכתו)",
      "תמיד אחת מצלעות המשולש",
      "האלכסון של המשולש",
      "הממוצע של שלוש הצלעות"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "diagonal"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_diagonal",
    "patternFamily": "rectangle_diagonal",
    "subtype": "property",
    "conceptTag": "diag_equal_rect",
    "distractorFamily": "diagonal_confusion",
    "question": "במלבן, שני האלכסונים:",
    "correct": "שווים באורך וחוצים זה את זה",
    "options": [
      "שווים באורך וחוצים זה את זה",
      "תמיד מאונכים זה לזה בזווית 90° זה לזה במרכז בלבד במלבן כללי",
      "תמיד שונים באורך",
      "תמיד שווים לצלע"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "diagonal"
    ],
    "levels": [
      "medium",
      "hard"
    ],
    "kind": "concept_diagonal",
    "patternFamily": "rectangle_diagonal",
    "subtype": "property_late",
    "conceptTag": "diag_equal_rect_late",
    "distractorFamily": "diagonal_confusion",
    "question": "במלבן כללי במישור — לגבי שני האלכסונים נכון ש:",
    "correct": "שווים באורך וחוצים זה את זה",
    "options": [
      "שווים באורך וחוצים זה את זה",
      "תמיד מאונכים זה לזה בזווית 90° זה לזה במרכז בלבד במלבן כללי",
      "תמיד שונים באורך",
      "תמיד שווים לצלע"
    ],
    "difficulty": "standard",
    "cognitiveLevel": "understanding",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "rotation"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_rotation",
    "patternFamily": "quarter_turn",
    "subtype": "degrees",
    "conceptTag": "quarter_90",
    "distractorFamily": "rotation_confusion",
    "question": "סיבוב של רבע סיבוב מלא סביב מרכז נקרא לרוב:",
    "correct": "90°",
    "options": [
      "90°",
      "180°",
      "45°",
      "360°"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "early",
    "topics": [
      "shapes_basic"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_shape_id",
    "patternFamily": "polygon_sides",
    "subtype": "square_count",
    "conceptTag": "square_4_equal",
    "distractorFamily": "count_confusion",
    "diagnosticSkillId": "geo_shape_classification",
    "expectedErrorTags": [
      "square_4_equal",
      "polygon_side_count_error",
      "careless_error"
    ],
    "question": "לריבוע יש כמה צלעות?",
    "correct": "4",
    "options": [
      "4",
      "3",
      "5",
      "6"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "shapes_basic"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_shape_id",
    "patternFamily": "polygon_sides",
    "subtype": "square_count_mid",
    "conceptTag": "square_4_equal_mid",
    "distractorFamily": "count_confusion",
    "diagnosticSkillId": "geo_shape_classification",
    "expectedErrorTags": [
      "square_4_equal_mid",
      "polygon_side_count_error",
      "careless_error"
    ],
    "question": "בצורה מרובעת עם כל הצלעות שוות (ריבוע) — כמה צלעות יש?",
    "correct": "4",
    "options": [
      "4",
      "3",
      "5",
      "6"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "early",
    "topics": [
      "shapes_basic"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_tf",
    "patternFamily": "binary_property_band_early_rect90",
    "subtype": "rectangle_angles",
    "conceptTag": "rect_all_90",
    "distractorFamily": "polar",
    "diagnosticSkillId": "geo_shape_properties",
    "expectedErrorTags": [
      "rect_all_90",
      "right_angle_property_error",
      "shape_property_misread"
    ],
    "binary": true,
    "question": "במלבן כל ארבע הזוויות הפנימיות ישרות (90°). נכון או לא נכון?",
    "correct": "נכון",
    "options": [
      "נכון",
      "לא נכון"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "shapes_basic"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_tf",
    "patternFamily": "binary_property_band_mid_rect90",
    "subtype": "rectangle_angles_mid",
    "conceptTag": "rect_all_90_mid",
    "distractorFamily": "polar",
    "diagnosticSkillId": "geo_shape_properties",
    "expectedErrorTags": [
      "rect_all_90_mid",
      "right_angle_property_error",
      "shape_property_misread"
    ],
    "binary": true,
    "question": "במלבן במישור, כל ארבע הזוויות הפנימיות ישרות (90°). נכון או לא נכון?",
    "correct": "נכון",
    "options": [
      "נכון",
      "לא נכון"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "mid",
    "topics": [
      "quadrilaterals",
      "triangles"
    ],
    "levels": [
      "hard"
    ],
    "kind": "concept_tf",
    "patternFamily": "binary_property_band_mid_rhombus_rect",
    "subtype": "rhombus_rectangle",
    "conceptTag": "not_always_both",
    "distractorFamily": "polar",
    "diagnosticSkillId": "geo_quad_classification",
    "expectedErrorTags": [
      "not_always_both",
      "rhombus_rectangle_overgeneralization",
      "shape_family_mislabel"
    ],
    "binary": true,
    "question": "כל מעוין הוא תמיד גם מלבן. נכון או לא נכון?",
    "correct": "לא נכון",
    "options": [
      "נכון",
      "לא נכון"
    ],
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "quadrilaterals",
      "triangles"
    ],
    "levels": [
      "hard"
    ],
    "kind": "concept_tf",
    "patternFamily": "binary_property_band_late_rhombus_rect",
    "subtype": "rhombus_rectangle_late",
    "conceptTag": "not_always_both_late",
    "distractorFamily": "polar",
    "diagnosticSkillId": "geo_quad_classification",
    "expectedErrorTags": [
      "not_always_both_late",
      "rhombus_rectangle_overgeneralization",
      "shape_family_mislabel"
    ],
    "binary": true,
    "question": "טענה: כל מעוין הוא בהכרח גם מלבן. נכון או לא נכון?",
    "correct": "לא נכון",
    "options": [
      "נכון",
      "לא נכון"
    ],
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "angles",
      "triangles"
    ],
    "levels": [
      "hard"
    ],
    "kind": "concept_tf",
    "patternFamily": "binary_property_band_late_obtuse_triangle",
    "subtype": "obtuse_count",
    "conceptTag": "one_obtuse_max",
    "distractorFamily": "polar",
    "diagnosticSkillId": "geo_triangle_properties",
    "expectedErrorTags": [
      "one_obtuse_max",
      "obtuse_angle_misconception",
      "triangle_angle_type_error"
    ],
    "binary": true,
    "question": "במשולש יכולות להיות שתי זוויות כהות (גדולות מ־90°). נכון או לא נכון?",
    "correct": "לא נכון",
    "options": [
      "נכון",
      "לא נכון"
    ],
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "early",
    "topics": [
      "transformations"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_transform",
    "patternFamily": "slide_vs_flip",
    "subtype": "translation",
    "conceptTag": "slide",
    "distractorFamily": "transform_confusion",
    "question": "הזזה של צורה בלי לסובב וללא שינוי גודל נקראת לרוב:",
    "correct": "הזזה (טרנסלציה)",
    "options": [
      "הזזה (טרנסלציה)",
      "שיקוף",
      "הגדלה",
      "עיוות"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "early",
    "topics": [
      "transformations"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_transform",
    "patternFamily": "slide_vs_flip",
    "subtype": "reflection",
    "conceptTag": "mirror_flip",
    "distractorFamily": "transform_confusion",
    "question": "שיקוף מול קו נותן תמונה כמו:",
    "correct": "מראה ליד הקו",
    "options": [
      "מראה ליד הקו",
      "סיבוב סביב מרכז הצורה",
      "הזזה בלבד",
      "מחיקת חצי מהצורה"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  },
  {
    "gradeBand": "early",
    "topics": [
      "area"
    ],
    "levels": [
      "easy",
      "medium"
    ],
    "kind": "concept_area_intro",
    "patternFamily": "area_as_covering",
    "subtype": "square_units",
    "conceptTag": "unit_squares",
    "distractorFamily": "measure_confusion",
    "question": "כשסופרים 'ריבועי יחידה' בתוך צורה, מה מודדים בערך?",
    "correct": "שטח",
    "options": [
      "שטח",
      "היקף",
      "זווית",
      "אורך בלבד"
    ],
    "difficulty": "basic",
    "cognitiveLevel": "recall",
    "expectedErrorTypes": [
      "measurement_error",
      "concept_confusion"
    ]
  },
  {
    "gradeBand": "late",
    "topics": [
      "area",
      "perimeter"
    ],
    "levels": [
      "hard"
    ],
    "kind": "concept_partial_info",
    "patternFamily": "infer_missing",
    "subtype": "square_from_perimeter",
    "conceptTag": "perim_to_side",
    "distractorFamily": "algebra_misstep",
    "diagnosticSkillId": "geo_perimeter_formula",
    "expectedErrorTags": [
      "perim_to_side",
      "side_from_perimeter_error",
      "formula_selection_error"
    ],
    "question": "לריבוע היקף 20 ס״מ. מה נכון לגבי אורך צלע?",
    "correct": "אורך צלע הוא 5 ס״מ (כי 20 ÷ 4 = 5)",
    "options": [
      "אורך צלע הוא 5 ס״מ (כי 20 ÷ 4 = 5)",
      "אורך צלע הוא 20 ס״מ",
      "אי אפשר לדעת בלי השטח",
      "אורך צלע הוא 10 ס״מ"
    ],
    "difficulty": "advanced",
    "cognitiveLevel": "analysis",
    "expectedErrorTypes": [
      "concept_confusion",
      "careless_error"
    ]
  }
];
