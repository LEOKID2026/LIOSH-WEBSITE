import { compareGeometryLearnerAnswer } from "./answer-compare.js";
import {
  assignedActivityMathTopicUsesMcq,
  extractAssignedActivityMathMcqChoiceList,
} from "../lib/classroom-activities/assigned-activity-math-mcq.js";

export { assignedActivityMathTopicUsesMcq } from "../lib/classroom-activities/assigned-activity-math-mcq.js";

/** Same rules as classroom-activities-shared answersMatch (kept local for client-safe import). */
function assignedActivityMcqAnswersMatch(a, b) {
  const left = String(a ?? "").trim().replace(/\s+/g, " ");
  const right = String(b ?? "").trim().replace(/\s+/g, " ");
  if (!left || !right) return false;
  if (left === right) return true;
  const leftNum = Number(left.replace(/,/g, ""));
  const rightNum = Number(right.replace(/,/g, ""));
  if (Number.isFinite(leftNum) && Number.isFinite(rightNum) && leftNum === rightNum) {
    return true;
  }
  return left.toLowerCase() === right.toLowerCase();
}

/** Reserved for legacy index-label MCQ kinds (none in current child-facing geometry UI). */
export const GEOMETRY_INDEX_LABEL_KINDS = {};

/** Hebrew solid names pool used for 4-option MCQ in identification questions. */
export const GEOMETRY_SOLID_NAMES_HE = ["קובייה", "תיבה", "גליל", "פירמידה", "חרוט", "כדור"];

export const GEOMETRY_HEBREW_LABEL_OPTIONS = {
  parallel_perpendicular: ["מקבילות", "מאונכות"],
  triangles: ["שווה צלעות", "שווה שוקיים", "שונה צלעות"],
  quadrilaterals: ["ריבוע", "מלבן", "מקבילית", "טרפז"],
  transformations: ["הזזה", "שיקוף", "סיבוב", "ללא תנועה"],
  concept_transform: ["הזזה", "שיקוף", "סיבוב", "ללא תנועה"],
  shapes_basic_square: ["ריבוע", "מלבן"],
  shapes_basic_rectangle: ["ריבוע", "מלבן"],
  shapes_basic_properties_square: ["2", "3", "4", "אין צלעות שוות"],
  shapes_basic_properties_rectangle: ["1", "2", "3", "4"],
  shapes_basic_properties_angles: ["2", "3", "4", "אין זוויות ישרות"],
};

/** Same tolerances as geometry-master learning/practice numeric input. */
export const GEOMETRY_ACTIVITY_NUMERIC_SCALE_FLOOR = 1e-6;
export const GEOMETRY_ACTIVITY_NUMERIC_RELATIVE_FACTOR = 1e-5;
export const GEOMETRY_ACTIVITY_NUMERIC_MIN_TOLERANCE = 1e-9;

/**
 * @param {Record<string, unknown>|null|undefined} params
 */
export function geometryQuestionUsesChoiceUi(params) {
  if (!params || typeof params !== "object") return false;
  const baseKind = String(params.kind || "").replace(/^story_/, "");
  const answerMode = String(params.answerMode || "").trim();
  return (
    answerMode === "binary" ||
    answerMode === "mcq_text" ||
    baseKind.startsWith("concept_") ||
    Boolean(GEOMETRY_HEBREW_LABEL_OPTIONS[baseKind]) ||
    Boolean(GEOMETRY_INDEX_LABEL_KINDS[baseKind]) ||
    baseKind === "solids"
  );
}

/**
 * Whether assigned-activity UI should render MCQ buttons (not free numeric typing).
 *
 * @param {Record<string, unknown>|null|undefined} question
 */
export function assignedActivityQuestionUsesChoiceUi(question) {
  const subject = String(question?.subject || "").trim().toLowerCase();
  if (subject === "math") {
    if (!assignedActivityMathTopicUsesMcq(question)) return false;
    const choices = extractAssignedActivityMathMcqChoiceList(question);
    return Array.isArray(choices) && choices.length >= 2;
  }
  if (subject === "geometry") {
    return geometryQuestionUsesChoiceUi(question?.params);
  }
  return Array.isArray(question?.choices) && question.choices.length > 0;
}

/**
 * @param {string|null|undefined} selectedAnswer
 * @param {string|null|undefined} correctAnswer
 * @param {Record<string, unknown>|null|undefined} question
 */
export function gradeGeometryActivityAnswer(selectedAnswer, correctAnswer, question) {
  if (assignedActivityQuestionUsesChoiceUi(question)) {
    return assignedActivityMcqAnswersMatch(selectedAnswer, correctAnswer);
  }
  return compareGeometryLearnerAnswer({
    user: selectedAnswer,
    correctAnswer,
    scaleFloor: GEOMETRY_ACTIVITY_NUMERIC_SCALE_FLOOR,
    relativeFactor: GEOMETRY_ACTIVITY_NUMERIC_RELATIVE_FACTOR,
    minTolerance: GEOMETRY_ACTIVITY_NUMERIC_MIN_TOLERANCE,
  }).isCorrect;
}

/**
 * @param {string|null|undefined} selectedAnswer
 * @param {string|null|undefined} correctAnswer
 * @param {Record<string, unknown>|null|undefined} question
 */
export function gradeAssignedActivityAnswer(selectedAnswer, correctAnswer, question) {
  if (String(question?.subject) === "geometry") {
    return gradeGeometryActivityAnswer(selectedAnswer, correctAnswer, question);
  }
  return assignedActivityMcqAnswersMatch(selectedAnswer, correctAnswer);
}
