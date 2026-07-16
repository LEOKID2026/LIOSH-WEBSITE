/**
 * Grade/topic-aware allowed math kinds for worksheet practice formats.
 * @module lib/worksheets/worksheet-math-kind-allowlist
 */

import {
  getMathPracticeFormatSpec,
  isMathKindAllowedForPracticeFormat,
} from "./worksheet-math-practice-format.js";
import { mathActivityKindMatchesOperation } from "../classroom-activities/generate-activity-questions-client.js";

/** Kinds that belong only to grade 1 curriculum. */
const GRADE1_ONLY_KINDS = new Set(["add_tens_only", "add_second_decade"]);

/** Kinds blocked on grade 1. */
const GRADE1_BLOCKED_KINDS = new Set(["add_three"]);

/** g1-only multiplication kinds. */
const GRADE1_ONLY_MUL_KINDS = new Set(["mul_groups_g1", "mul_skip_count_g1"]);

/**
 * @param {string} gradeKey
 * @returns {number}
 */
function gradeNum(gradeKey) {
  const n = parseInt(String(gradeKey || "").replace(/\D/g, ""), 10);
  return n >= 1 && n <= 6 ? n : 3;
}

/**
 * @param {string} kind
 * @param {string} gradeKey
 * @returns {boolean}
 */
export function isMathKindAllowedForGrade(kind, gradeKey) {
  const k = String(kind || "").trim();
  if (!k) return true;
  const g = gradeNum(gradeKey);

  if (GRADE1_ONLY_KINDS.has(k) && g > 1) return false;
  if (GRADE1_BLOCKED_KINDS.has(k) && g === 1) return false;
  if (GRADE1_ONLY_MUL_KINDS.has(k) && g > 1) return false;

  if (k === "add_vertical" && g < 2) return false;
  if (k === "sub_vertical" && g < 2) return false;
  if (k === "div_long" && g < 4) return false;
  if (k === "div_two_digit" && g < 4) return false;
  if (k === "div_with_remainder_long" && g < 4) return false;
  if (k === "mul_vertical" && g < 4) return false;

  return true;
}

/**
 * @param {Object} params
 * @param {string} params.formatId
 * @param {string} params.gradeKey
 * @param {string} params.topicKey
 * @returns {string[]}
 */
export function listWorksheetMathForcedKinds({ formatId, gradeKey, topicKey }) {
  const spec = getMathPracticeFormatSpec(formatId);
  const topic = String(topicKey || "").trim().toLowerCase();
  let kinds = spec.allowedKinds.filter((kind) => isMathKindAllowedForGrade(kind, gradeKey));

  if (formatId === "long_division" && gradeKey === "g4") {
    kinds = kinds.filter((k) => k === "div_long" || k === "div_two_digit");
    if (!kinds.length) kinds = ["div_long"];
  }
  if (formatId === "long_division_with_remainder") {
    kinds = kinds.filter((k) => k === "div_with_remainder_long");
    if (!kinds.length) kinds = ["div_with_remainder_long"];
  }

  if (topic === "addition") {
    kinds = kinds.filter((k) => !k.startsWith("sub"));
  } else if (topic === "subtraction") {
    kinds = kinds.filter((k) => !k.startsWith("add"));
  } else if (topic !== "mixed") {
    kinds = kinds.filter((k) => mathActivityKindMatchesOperation(topic, k));
  }

  return kinds;
}

/**
 * @param {string} formatId
 * @param {number} attempt
 * @param {string} gradeKey
 * @param {string} topicKey
 * @returns {string | undefined}
 */
export function pickWorksheetMathForcedKind(formatId, attempt, gradeKey, topicKey) {
  const kinds = listWorksheetMathForcedKinds({ formatId, gradeKey, topicKey });
  if (!kinds.length) return undefined;
  return kinds[attempt % kinds.length];
}

/**
 * @param {string} kind
 * @param {string} formatId
 * @param {string} gradeKey
 * @param {string} topicKey
 * @returns {boolean}
 */
export function isWorksheetMathKindSelectable(kind, formatId, gradeKey, topicKey) {
  const k = String(kind || "").trim();
  if (!k) return false;
  if (!isMathKindAllowedForGrade(k, gradeKey)) return false;
  if (formatId && formatId !== "mixed" && !isMathKindAllowedForPracticeFormat(k, formatId)) {
    return false;
  }
  const topic = String(topicKey || "").trim().toLowerCase();
  if (topic !== "mixed" && !mathActivityKindMatchesOperation(topic, k)) return false;
  return true;
}
