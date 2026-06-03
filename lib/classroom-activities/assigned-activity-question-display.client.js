import {
  isEquationLikeText,
  isFormulaLikeText,
} from "../../utils/student-question-display.js";
import { isMathLikeText } from "../../lib/learning-book/book-math-display.js";

/** @type {Readonly<import('react').CSSProperties>} */
export const ASSIGNED_ACTIVITY_LTR_ISOLATE_STYLE = Object.freeze({
  direction: "ltr",
  unicodeBidi: "isolate",
});

/**
 * @param {unknown} raw
 */
export function extractAssignedActivityQuestionFields(raw) {
  if (raw == null) {
    return { question: "", questionLabel: undefined, exerciseText: undefined };
  }
  if (typeof raw === "string") {
    return { question: raw.trim(), questionLabel: undefined, exerciseText: undefined };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { question: "", questionLabel: undefined, exerciseText: undefined };
  }

  const q = /** @type {Record<string, unknown>} */ (raw);
  const params =
    q.params && typeof q.params === "object" && !Array.isArray(q.params)
      ? /** @type {Record<string, unknown>} */ (q.params)
      : {};

  return {
    question: String(q.question || q.prompt || q.stem || "").trim(),
    questionLabel:
      q.questionLabel != null
        ? String(q.questionLabel)
        : params.questionLabel != null
          ? String(params.questionLabel)
          : undefined,
    exerciseText:
      q.exerciseText != null
        ? String(q.exerciseText)
        : params.exerciseText != null
          ? String(params.exerciseText)
          : undefined,
  };
}

/**
 * @param {string|null|undefined} text
 */
export function shouldIsolateAssignedActivityTextLtr(text) {
  const t = String(text ?? "").trim();
  if (!t) return false;
  if (/[\u0590-\u05FF]/.test(t)) return false;
  if (isEquationLikeText(t) || isFormulaLikeText(t)) return true;
  if (isMathLikeText(t)) return true;
  if (/^[\d\s+\-×÷*/()._=?:…₪%,]+$/.test(t.replace(/_{2,}/g, ""))) return true;
  return false;
}

/**
 * @param {string|null|undefined} text
 */
export function assignedActivityTextIsMixedHebrewMath(text) {
  const t = String(text ?? "");
  if (!t.trim()) return false;
  if (!/[\u0590-\u05FF]/.test(t)) return false;
  return /\d/.test(t) || /[=×÷]/.test(t) || /__/.test(t) || /₪/.test(t) || /%/.test(t);
}

/**
 * @param {string|null|undefined} text
 */
export function assignedActivityTextIsEnglishLeading(text) {
  const t = String(text ?? "").trim();
  if (!t) return false;
  return /^[A-Za-z"'([]/.test(t);
}

/**
 * Direction props for simple inline assigned-activity strings (choices, answers).
 *
 * @param {string|null|undefined} text
 */
export function assignedActivityInlineTextProps(text) {
  const value = String(text ?? "");
  if (shouldIsolateAssignedActivityTextLtr(value)) {
    return { dir: "ltr", style: ASSIGNED_ACTIVITY_LTR_ISOLATE_STYLE };
  }
  if (assignedActivityTextIsEnglishLeading(value)) {
    return { dir: "ltr", style: { unicodeBidi: "plaintext" } };
  }
  return { dir: "rtl", style: { unicodeBidi: "plaintext" } };
}
