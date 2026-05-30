import { buildVerticalOperation } from "../../utils/math-animations.js";

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

/**
 * @param {Record<string, unknown>|null|undefined} question
 */
export function canStudentActivityQuestionDisplayVertically(question) {
  if (!question || typeof question !== "object") return false;
  const op = question.operation;
  const params = question.params || {};

  if (op === "addition" || op === "subtraction" || op === "multiplication") {
    return typeof question.a === "number" && typeof question.b === "number";
  }
  if (op === "division" || op === "division_with_remainder") {
    return (
      (params.dividend && params.divisor) ||
      (typeof question.a === "number" && typeof question.b === "number")
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
  if (!question || !canStudentActivityQuestionDisplayVertically(question)) return null;

  const op = question.operation;
  const params = question.params || {};

  if (op === "addition") {
    return buildVerticalOperation(question.a, question.b, "+");
  }
  if (op === "subtraction") {
    return buildVerticalOperation(question.a, question.b, "-");
  }
  if (op === "multiplication") {
    return buildVerticalOperation(question.a, question.b, "×");
  }
  if (op === "division" || op === "division_with_remainder") {
    const dividend = params.dividend || question.a;
    const divisor = params.divisor || question.b;
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
 * Mobile-friendly input props for free-text activity answers.
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @returns {{ inputMode?: string, enterKeyHint?: string, autoComplete?: string }}
 */
export function resolveStudentActivityAnswerInputProps(question) {
  if (Array.isArray(question?.choices) && question.choices.length > 0) {
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
