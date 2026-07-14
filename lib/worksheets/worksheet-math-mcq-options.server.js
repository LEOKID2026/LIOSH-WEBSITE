/**
 * Build printable MCQ options for math worksheet questions when the generator
 * returns an open answer but the parent requested preferMcq.
 * @module lib/worksheets/worksheet-math-mcq-options.server
 */

import { withSeededRandom } from "./worksheet-seeded-random.server.js";

/**
 * @param {string} str
 * @returns {number}
 */
function stableSeedFromString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param {unknown[]} items
 * @returns {unknown[]}
 */
function shuffleInPlace(items) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {number} correct
 * @param {number} seed
 * @returns {string[]}
 */
function buildNumericMcqOptions(correct, seed) {
  return withSeededRandom(seed, () => {
    const correctStr = String(correct);
    const wrong = new Set();
    const offsets = [1, 2, 3, 5, 10, 11, -1, -2, -3, -5, -10, 20, -20];
    let guard = 0;
    while (wrong.size < 3 && guard < 60) {
      guard += 1;
      const off = offsets[Math.floor(Math.random() * offsets.length)];
      const candidate = correct + off;
      if (!Number.isFinite(candidate)) continue;
      if (candidate < 0) continue;
      if (String(candidate) === correctStr) continue;
      wrong.add(String(candidate));
    }

    if (correct >= 10) {
      const digits = correctStr.split("");
      const flipped = digits
        .map((d, i) => (i === digits.length - 1 ? String((Number(d) + 1) % 10) : d))
        .join("");
      if (flipped !== correctStr) wrong.add(flipped);
    }

    const picks = [correctStr, ...Array.from(wrong).slice(0, 3)];
    while (picks.length < 4) {
      const filler = String(Math.max(0, correct + picks.length * 7 + 3));
      if (!picks.includes(filler)) picks.push(filler);
    }
    return shuffleInPlace(picks).map(String);
  });
}

/**
 * @param {string} correct
 * @param {number} seed
 * @returns {string[] | null}
 */
function buildFractionMcqOptions(correct, seed) {
  const m = String(correct).trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  const num = Number(m[1]);
  const den = Number(m[2]);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  const alts = new Set();
  alts.add(`${num}/${den + 1}`);
  alts.add(`${num + 1}/${den}`);
  alts.add(`${Math.max(1, num - 1)}/${den}`);
  alts.add(`${num}/${Math.max(1, den - 1)}`);
  alts.delete(correct);
  const picks = [correct, ...Array.from(alts).slice(0, 3)];
  while (picks.length < 4) picks.push(`${num}/${den + picks.length}`);
  return withSeededRandom(seed, () => shuffleInPlace(picks).map(String));
}

/**
 * @param {unknown} correctAnswer
 * @param {number} [seed]
 * @returns {string[] | null}
 */
export function buildWorksheetMathMcqOptions(correctAnswer, seed = 0) {
  if (correctAnswer == null) return null;
  const correct = String(correctAnswer).trim();
  if (!correct) return null;

  if (/^\d+\s*\/\s*\d+$/.test(correct)) {
    return buildFractionMcqOptions(correct, seed);
  }

  const asNum = Number(correct);
  if (Number.isFinite(asNum)) {
    return buildNumericMcqOptions(asNum, seed);
  }

  return null;
}

/**
 * @param {Record<string, unknown>} question
 * @param {boolean} preferMcq
 * @returns {Record<string, unknown>}
 */
export function attachMathMcqOptionsIfRequested(question, preferMcq) {
  if (!preferMcq) return question;
  const existing = Array.isArray(question.answers)
    ? question.answers.map((a) => String(a))
    : null;
  if (existing && existing.length >= 4) {
    return { ...question, answers: existing, choices: existing };
  }
  if (existing && existing.length >= 2) {
    return { ...question, answers: existing, choices: existing };
  }

  const seed = stableSeedFromString(
    `${String(question.question || "")}|${String(question.correctAnswer || "")}`
  );
  const built = buildWorksheetMathMcqOptions(question.correctAnswer, seed);
  if (!built || built.length < 4) return question;
  return { ...question, answers: built, choices: built };
}
