/**
 * Math worksheet question selector — grade/topic/level/count with seeded RNG.
 * @module lib/worksheets/worksheet-math-selector.server
 */

import { GRADES } from "../../utils/math-constants.js";
import { getLevelConfig } from "../../utils/math-storage.js";
import { generateQuestion } from "../../utils/math-question-generator.js";
import {
  normalizeMathActivityTopic,
  mathActivityKindMatchesOperation,
} from "../classroom-activities/generate-activity-questions-client.js";
import {
  pickSourceDifficultyForAttempt,
  resolveActivityGenerationPlan,
} from "../learning/activity-question-selection.js";
import { withSeededRandom } from "./worksheet-seeded-random.server.js";
import {
  defaultMathPracticeFormatForGradeTopic,
  getMathPracticeFormatSpec,
  inferMathPracticeFormat,
  isMathKindAllowedForPracticeFormat,
  isMathPracticeFormatAllowedForGradeTopic,
  isWorksheetMathPracticeFormat,
} from "./worksheet-math-practice-format.js";

/**
 * @param {string} gradeKey
 * @returns {number}
 */
function mathGradeNumberFromKey(gradeKey) {
  const num = parseInt(String(gradeKey || "").replace(/\D/g, ""), 10);
  return num >= 1 && num <= 6 ? num : 3;
}

/**
 * @param {string} gradeKey
 * @returns {string[]}
 */
export function listMathOperationsForGrade(gradeKey) {
  return (GRADES[gradeKey]?.operations || []).slice();
}

/**
 * Resolve operation key for worksheet selector.
 * @param {string} topicKey
 * @param {string} gradeKey
 * @returns {string}
 */
export function resolveMathWorksheetOperation(topicKey, gradeKey) {
  const raw = String(topicKey || "").trim().toLowerCase();
  if (raw === "mixed") {
    if (!GRADES[gradeKey]?.operations?.includes("mixed")) {
      throw new Error(`WORKSHEET_MATH_MIXED_NOT_ALLOWED:${gradeKey}`);
    }
    return "mixed";
  }
  return normalizeMathActivityTopic(topicKey, gradeKey);
}

/**
 * @typedef {Object} MathWorksheetSelectorParams
 * @property {string} gradeKey
 * @property {string} topicKey
 * @property {string} levelKey
 * @property {number} count
 * @property {number} [seed]
 * @property {string} [mathPracticeFormat]
 */

/**
 * @param {Record<string, unknown>} q
 * @returns {boolean}
 */
function isUsableMathWorksheetQuestion(q) {
  const label = String(q.questionLabel || "").trim();
  if (label.length > 2 && !isPlaceholderStem(label)) return true;
  const stem = String(q.question || "").trim();
  if (stem && !isPlaceholderStem(stem)) return true;
  const exercise = String(q.exerciseText || "").trim();
  if (exercise && !isPlaceholderStem(exercise)) return true;
  if (q.a != null && q.b != null) return true;
  if (q.params?.a != null && q.params?.b != null) return true;
  if (Array.isArray(q.answers) && q.answers.length >= 2) return true;
  return false;
}

function isPlaceholderStem(text) {
  const t = String(text || "").trim();
  return !t || t === "__" || t === "= __" || /^_{2,}$/.test(t);
}

/**
 * @param {MathWorksheetSelectorParams} params
 * @returns {string}
 */
function resolveMathPracticeFormat(params) {
  const topicKey = String(params.topicKey || "").trim().toLowerCase();
  const gradeKey = String(params.gradeKey || "g3");
  const requested = params.mathPracticeFormat;

  if (requested && isWorksheetMathPracticeFormat(requested)) {
    if (!isMathPracticeFormatAllowedForGradeTopic(requested, gradeKey, topicKey)) {
      throw new Error(
        `WORKSHEET_MATH_INVALID_PRACTICE_FORMAT:${gradeKey}:${topicKey}:${requested}`
      );
    }
    return requested;
  }

  const inferred = inferMathPracticeFormat(topicKey, gradeKey);
  if (inferred) return inferred;

  const fallback = defaultMathPracticeFormatForGradeTopic(gradeKey, topicKey);
  if (fallback) return fallback;

  return "";
}

/**
 * @param {string} formatId
 * @param {number} attempt
 * @param {string} [gradeKey]
 * @returns {string | undefined}
 */
function pickForcedKindForFormat(formatId, attempt, gradeKey = "g3") {
  const spec = getMathPracticeFormatSpec(formatId);
  if (!spec.allowedKinds.length) return undefined;
  let kinds = spec.allowedKinds;
  if (formatId === "long_division" && gradeKey === "g4") {
    kinds = ["div_long"];
  }
  return kinds[attempt % kinds.length];
}

/**
 * @param {MathWorksheetSelectorParams} params
 * @returns {{ questions: Record<string, unknown>[], seed: number, mathPracticeFormat: string }}
 */
export function selectMathWorksheetQuestions(params) {
  const gradeKey = String(params.gradeKey || "g3");
  if (!GRADES[gradeKey]) {
    throw new Error(`WORKSHEET_MATH_INVALID_GRADE:${gradeKey}`);
  }
  const operation = resolveMathWorksheetOperation(params.topicKey, gradeKey);
  const mathPracticeFormat = resolveMathPracticeFormat(params);
  const n = Math.min(20, Math.max(1, Math.floor(Number(params.count) || 5)));
  const useSeed =
    typeof params.seed === "number" ? params.seed >>> 0 : (Date.now() % 1_000_000) >>> 0;

  return withSeededRandom(useSeed, () => {
    const plan = resolveActivityGenerationPlan(params.levelKey, "math");
    /** @type {Record<string, unknown>[]} */
    const questions = [];
    const seen = new Set();
    const maxAttempts = n * 80;

    for (let attempt = 0; attempt < maxAttempts && questions.length < n; attempt += 1) {
      const sourceDifficulty = pickSourceDifficultyForAttempt(
        plan.sourceDifficulties,
        attempt
      );
      const levelConfig = getLevelConfig(
        mathGradeNumberFromKey(gradeKey),
        sourceDifficulty
      );
      const forceKind = mathPracticeFormat
        ? pickForcedKindForFormat(mathPracticeFormat, attempt, gradeKey)
        : undefined;
      const q = generateQuestion(levelConfig, operation, gradeKey, null, {
        forceKind,
      });
      if (!q?.question || q.correctAnswer == null) continue;
      if (!isUsableMathWorksheetQuestion(q)) continue;

      const kind = String(q.params?.kind || "");
      if (
        mathPracticeFormat &&
        !isMathKindAllowedForPracticeFormat(kind, mathPracticeFormat)
      ) {
        continue;
      }

      if (operation !== "mixed" && !mathActivityKindMatchesOperation(operation, kind)) {
        continue;
      }

      const fp = `${q.question}|${q.correctAnswer}|${kind || ""}`;
      if (!fp || fp === "||" || seen.has(fp)) continue;
      seen.add(fp);

      const answers = Array.isArray(q.answers)
        ? q.answers.map((a) => String(a))
        : undefined;

      questions.push({
        question: String(q.question),
        questionLabel:
          q.questionLabel != null ? String(q.questionLabel) : undefined,
        correctAnswer: String(q.correctAnswer),
        explanation: q.explanation != null ? String(q.explanation) : undefined,
        params: q.params,
        subject: "math",
        topic: operation === "mixed" ? String(q.operation || kind) : operation,
        operation: operation === "mixed" ? String(q.operation || operation) : operation,
        a: q.a,
        b: q.b,
        exerciseText:
          q.exerciseText != null ? String(q.exerciseText) : undefined,
        gradeLevel: gradeKey,
        ...(answers?.length >= 2 ? { answers, choices: answers } : {}),
      });
    }

    if (questions.length < n) {
      throw new Error(
        `WORKSHEET_MATH_INSUFFICIENT:${gradeKey}:${operation}:${params.levelKey}:${mathPracticeFormat || "none"}`
      );
    }

    return { questions, seed: useSeed, mathPracticeFormat };
  });
}

/**
 * @param {string} gradeKey
 * @param {string} operation
 * @param {string} [levelKey]
 * @param {number} [seed]
 * @param {string} [mathPracticeFormat]
 * @returns {boolean}
 */
export function canSelectMathWorksheetOperation(
  gradeKey,
  operation,
  levelKey = "medium",
  seed = 42,
  mathPracticeFormat
) {
  try {
    const { questions } = selectMathWorksheetQuestions({
      gradeKey,
      topicKey: operation,
      levelKey,
      count: 1,
      seed,
      mathPracticeFormat,
    });
    return questions.length >= 1;
  } catch {
    return false;
  }
}

/**
 * Document which grade operations are selectable under worksheet constraints.
 * @returns {Array<{ gradeKey: string, operation: string, supported: boolean }>}
 */
export function auditMathOperationsSupportMatrix() {
  /** @type {Array<{ gradeKey: string, operation: string, supported: boolean }>} */
  const rows = [];
  for (const gradeKey of Object.keys(GRADES)) {
    for (const operation of listMathOperationsForGrade(gradeKey)) {
      const format = inferMathPracticeFormat(operation, gradeKey) || undefined;
      rows.push({
        gradeKey,
        operation,
        supported: canSelectMathWorksheetOperation(
          gradeKey,
          operation,
          "medium",
          42,
          format
        ),
      });
    }
  }
  return rows;
}
