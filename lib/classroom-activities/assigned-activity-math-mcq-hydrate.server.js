/**
 * Server-side MCQ hydration for legacy assigned math activities missing top-level choices.
 */

import { buildMathMcqAnswerList } from "../../utils/math-question-generator.js";
import {
  assignedActivityMathTopicUsesMcq,
  extractAssignedActivityMathMcqChoiceList,
  promoteAssignedActivityMathMcqChoices,
} from "./assigned-activity-math-mcq.js";

/**
 * @param {unknown} seed
 * @returns {number}
 */
function hashSeed(seed) {
  const s = String(seed ?? "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param {unknown} seed
 */
function makeSeededRandInt(seed) {
  let state = hashSeed(seed) || 1;
  return (min, max) => {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return lo + (state % (hi - lo + 1));
  };
}

/**
 * @param {unknown[]} list
 * @param {unknown} seed
 * @returns {string[]}
 */
function stableShuffleStrings(list, seed) {
  const arr = list.map((x) => String(x ?? "").trim()).filter(Boolean);
  const randInt = makeSeededRandInt(seed);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {Record<string, unknown>} question
 * @param {unknown} correctAnswer
 * @returns {string[]|null}
 */
export function rebuildAssignedActivityMathMcqChoices(question, correctAnswer) {
  if (correctAnswer == null || String(correctAnswer).trim() === "") return null;
  const op = String(question.operation || question.topic || "").trim().toLowerCase();
  const params =
    question.params && typeof question.params === "object" && !Array.isArray(question.params)
      ? { ...question.params }
      : {};
  const seed =
    question.qk ||
    question.question_index ||
    question.index ||
    `${question.question || ""}|${correctAnswer}`;
  const randInt = makeSeededRandInt(seed);
  const roundFn = (n, places = 0) => {
    const p = 10 ** places;
    return Math.round(Number(n) * p) / p;
  };

  let list = buildMathMcqAnswerList(correctAnswer, op || "fractions", params, randInt, roundFn);
  if ((!list || list.length < 2) && op === "division_with_remainder") {
    const ca = String(correctAnswer).trim();
    if (ca.includes("ושארית")) {
      const divisor = Number(params.divisor);
      const quotient = Number(params.quotient);
      const remainder = Number(params.remainder);
      if (Number.isFinite(divisor) && Number.isFinite(quotient) && Number.isFinite(remainder)) {
        const wrong = new Set();
        const addRemStr = (q, r) => {
          if (q <= 0 || r < 0 || r >= divisor) return;
          const s = `${q} ושארית ${r}`;
          if (s !== ca) wrong.add(s);
        };
        addRemStr(quotient, (remainder + 1) % divisor || divisor - 1);
        addRemStr(quotient + 1, remainder);
        addRemStr(Math.max(1, quotient - 1), remainder);
        addRemStr(quotient, Math.max(1, remainder - 1));
        addRemStr(quotient + 1, 0);
        list = [ca, ...Array.from(wrong)].slice(0, 4);
      }
    }
  }

  if (!Array.isArray(list) || list.length < 2) return null;
  const normalized = [];
  const seen = new Set();
  for (const raw of list) {
    const s = String(raw ?? "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    normalized.push(s);
  }
  if (normalized.length < 2) return null;
  return stableShuffleStrings(normalized, seed);
}

/**
 * Ensure student-facing math MCQ questions expose top-level `choices`.
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @param {{ correctAnswer?: unknown }} [opts]
 * @returns {Record<string, unknown>|null|undefined}
 */
export function hydrateAssignedActivityMathMcqQuestion(question, opts = {}) {
  if (!question || typeof question !== "object") return question;
  if (String(question.subject || "").trim().toLowerCase() !== "math") return question;
  if (!assignedActivityMathTopicUsesMcq(question)) return question;

  const promoted = promoteAssignedActivityMathMcqChoices(question);
  if (extractAssignedActivityMathMcqChoiceList(promoted)?.length >= 2) {
    return promoted;
  }

  const correct =
    opts.correctAnswer ??
    question.correct_answer ??
    question.correctAnswer ??
    null;
  const rebuilt = rebuildAssignedActivityMathMcqChoices(question, correct);
  if (!rebuilt?.length) return question;
  return { ...question, choices: rebuilt, answers: rebuilt };
}
