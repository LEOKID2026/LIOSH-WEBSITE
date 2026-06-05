import { buildVerticalOperation } from "../../utils/math-animations.js";
import { getCompactEquationFontStyle, getQuestionFontStyle } from "../../utils/learning-question-font.js";
import { assignedActivityQuestionUsesChoiceUi } from "../../utils/geometry-activity-answer-ui.js";
import { isVirtualAnswerKeyboardSubject } from "../learning/virtual-answer-keyboard-policy.js";
import { normalizeGradeLevelToKey } from "../learning-student-defaults.js";

const TEXT_SUBJECTS = new Set(["hebrew", "english"]);
const TEXT_OPERATIONS = new Set([
  "reading",
  "comprehension",
  "writing",
  "grammar",
  "vocabulary",
  "speaking",
  "translation",
  "sentences",
]);

const VERTICAL_MATH_OPS = new Set([
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "division_with_remainder",
  "decimals",
]);

/** Adaptive font sizing for assigned-activity question prompts (all subjects). */
export function getStudentActivityQuestionFontStyle({ text, kind = "main" } = {}) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  const len = normalized.length;

  if (kind === "label") {
    return getQuestionFontStyle({
      text,
      kind: "label",
      mobileMinPx: 15,
      mobileMaxPx: len > 72 ? 22 : len > 48 ? 24 : 26,
    });
  }

  if (len > 120) {
    return getQuestionFontStyle({ text, kind: "main", mobileMinPx: 16, mobileMaxPx: 26 });
  }
  if (len > 80) {
    return getQuestionFontStyle({ text, kind: "main", mobileMinPx: 17, mobileMaxPx: 30 });
  }
  if (len > 48) {
    return getQuestionFontStyle({ text, kind: "main", mobileMinPx: 18, mobileMaxPx: 34 });
  }
  return getQuestionFontStyle({ text, kind: "main", mobileMinPx: 20, mobileMaxPx: 38 });
}

/** Compact equation lines in the activity stage (horizontal math). */
export function getStudentActivityEquationFontStyle(opts = {}) {
  return getCompactEquationFontStyle({
    mobileMinPx: 16,
    mobileMaxPx: 30,
    ...opts,
  });
}

/**
 * @param {string|null|undefined} topic
 */
function mathOperationFromTopic(topic) {
  const t = String(topic || "").toLowerCase();
  if (t.includes("fraction") || t.includes("שבר")) return "fractions";
  if (t.includes("mult") || t.includes("כפל")) return "multiplication";
  if (t.includes("div") || t.includes("חילוק")) return "division";
  if (t.includes("sub") || t.includes("חיסור")) return "subtraction";
  if (t.includes("add") || t.includes("חיבור")) return "addition";
  return "addition";
}

/**
 * @param {Record<string, unknown>|undefined|null} params
 * @param {string|null|undefined} topic
 */
function inferOperationFromParams(params, topic) {
  const kind = String(params?.kind || "").toLowerCase();
  const op = String(params?.op || "").toLowerCase();

  if (op === "add" || kind.startsWith("add")) return "addition";
  if (op === "sub" || kind.startsWith("sub")) return "subtraction";
  if (op === "mul" || kind.startsWith("mul")) return "multiplication";
  if (op === "div" || kind.startsWith("div")) return "division";
  if (kind.startsWith("dec_")) return "decimals";

  const topicOp = mathOperationFromTopic(topic);
  return VERTICAL_MATH_OPS.has(topicOp) ? topicOp : null;
}

/**
 * Parse horizontal arithmetic like `3 + 13 = __`.
 *
 * @param {string|null|undefined} text
 */
export function parseHorizontalArithmeticExercise(text) {
  const s = String(text || "").trim();
  if (!s) return null;
  if (/\d+\s*[+\-×x*÷/−]\s*\d+\s*[+\-×x*÷/−]\s*\d+/.test(s)) {
    return null;
  }

  const m = s.match(/^(\d+(?:\.\d+)?)\s*([+\-×x*÷/−])\s*(\d+(?:\.\d+)?)\s*=/);
  if (!m) return null;

  const opChar = m[2] === "−" ? "-" : m[2];
  const opMap = {
    "+": "addition",
    "-": "subtraction",
    "×": "multiplication",
    x: "multiplication",
    "*": "multiplication",
    "÷": "division",
    "/": "division",
  };

  return {
    a: Number(m[1]),
    b: Number(m[3]),
    operation: opMap[opChar] || null,
    operator: opChar,
  };
}

/**
 * Activity question_sets store operands in params — normalize for layout toggle.
 *
 * @param {Record<string, unknown>|null|undefined} question
 */
export function normalizeStudentActivityMathLayoutQuestion(question) {
  if (!question || typeof question !== "object") return null;

  const subject = String(question.subject || "").trim().toLowerCase();
  if (subject !== "math") return question;

  const params =
    question.params && typeof question.params === "object" && !Array.isArray(question.params)
      ? question.params
      : {};

  const text = String(
    question.exerciseText || params.exerciseText || question.question || ""
  ).trim();

  let a =
    typeof question.a === "number"
      ? question.a
      : typeof params.a === "number"
        ? params.a
        : null;
  let b =
    typeof question.b === "number"
      ? question.b
      : typeof params.b === "number"
        ? params.b
        : null;

  let operation =
    typeof question.operation === "string" ? question.operation : inferOperationFromParams(params, question.topic);

  const parsed = parseHorizontalArithmeticExercise(text);
  if (parsed) {
    if (a == null) a = parsed.a;
    if (b == null) b = parsed.b;
    if (!operation && parsed.operation) operation = parsed.operation;
  }

  return {
    ...question,
    subject,
    a,
    b,
    operation,
    exerciseText: text,
    questionLabel:
      question.questionLabel != null
        ? String(question.questionLabel)
        : params.questionLabel != null
          ? String(params.questionLabel)
          : undefined,
    params,
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 */
export function canStudentActivityQuestionDisplayVertically(question) {
  const normalized = normalizeStudentActivityMathLayoutQuestion(question);
  if (!normalized) return false;

  const op = normalized.operation;
  const params = normalized.params || {};

  if (!VERTICAL_MATH_OPS.has(String(op || ""))) return false;

  if (op === "addition" || op === "subtraction" || op === "multiplication") {
    return typeof normalized.a === "number" && typeof normalized.b === "number";
  }
  if (op === "division" || op === "division_with_remainder") {
    return (
      (params.dividend && params.divisor) ||
      (typeof normalized.a === "number" && typeof normalized.b === "number")
    );
  }
  if (op === "decimals") {
    return Boolean(params.a && params.b);
  }
  return false;
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 * @returns {string|null}
 */
export function getStudentActivityVerticalExerciseText(question) {
  const normalized = normalizeStudentActivityMathLayoutQuestion(question);
  if (!normalized || !canStudentActivityQuestionDisplayVertically(normalized)) return null;

  const op = normalized.operation;
  const params = normalized.params || {};

  if (op === "addition") {
    return buildVerticalOperation(normalized.a, normalized.b, "+");
  }
  if (op === "subtraction") {
    return buildVerticalOperation(normalized.a, normalized.b, "-");
  }
  if (op === "multiplication") {
    return buildVerticalOperation(normalized.a, normalized.b, "×");
  }
  if (op === "division" || op === "division_with_remainder") {
    const dividend = params.dividend ?? normalized.a;
    const divisor = params.divisor ?? normalized.b;
    return buildVerticalOperation(divisor, dividend, "÷");
  }
  if (op === "decimals") {
    const a = params.a;
    const b = params.b;
    const kind = params.kind;
    const places = params.places || 2;
    if (kind === "dec_add") {
      return buildVerticalOperation(a.toFixed(places), b.toFixed(places), "+");
    }
    if (kind === "dec_sub") {
      return buildVerticalOperation(a.toFixed(places), b.toFixed(places), "-");
    }
  }
  return null;
}

/**
 * Grade + operation + normalized question for assigned-activity math scratchpad.
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @param {Record<string, unknown>|null|undefined} activity
 */
export function resolveAssignedActivityMathScratchpadContext(question, activity) {
  const normalized = normalizeStudentActivityMathLayoutQuestion(question);
  if (!normalized || String(normalized.subject) !== "math") return null;

  const gradeKey =
    normalizeGradeLevelToKey(
      question?.grade ||
        question?.gradeLevel ||
        activity?.gradeLevel ||
        activity?.grade
    ) || null;
  if (!gradeKey) return null;

  const operation = String(
    normalized.operation || question?.topic || activity?.topic || ""
  ).trim();
  if (!operation) return null;

  return { gradeKey, operation, question: normalized };
}

/** Numeric typed math answers in assigned activities (same surface as math-master learning). */
export function assignedActivityUsesMathScratchpad(question) {
  return (
    String(question?.subject) === "math" && assignedActivityUsesNumericKeyboard(question)
  );
}

/**
 * Mobile-friendly input props for free-text activity answers.
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @returns {{ inputMode?: string, enterKeyHint?: string, autoComplete?: string }}
 */
export function assignedActivityUsesNumericKeyboard(question) {
  if (assignedActivityQuestionUsesChoiceUi(question)) return false;
  return isVirtualAnswerKeyboardSubject(question?.subject);
}

export function resolveStudentActivityAnswerInputProps(question) {
  if (assignedActivityUsesNumericKeyboard(question)) {
    return {};
  }

  const subject = String(question?.subject || "").trim().toLowerCase();
  const op = String(question?.operation || "").trim().toLowerCase();

  if (TEXT_SUBJECTS.has(subject) || TEXT_OPERATIONS.has(op)) {
    return { inputMode: "text", enterKeyHint: "done", autoComplete: "off" };
  }

  if (subject === "math" || subject === "geometry") {
    return { inputMode: "decimal", enterKeyHint: "done", autoComplete: "off" };
  }

  return { inputMode: "text", enterKeyHint: "done", autoComplete: "off" };
}
