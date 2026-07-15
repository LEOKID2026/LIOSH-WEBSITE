/**
 * Unified answer comparison for learning masters (Phase 1 contract).
 * All subjects must route learner-facing correctness through compareAnswers — see plan.
 */

import { resolveCanonicalComparisonSignAnswer } from "./comparison-sign-mcq.js";
import { normalizeAnswerForSpellingNiqqudStrict } from "./hebrew-spelling-niqqud.js";

/**
 * Upper bound for absolute numeric tolerance in {@link compareAnswers} (`numeric_absolute_tolerance`)
 * and {@link compareMathLearnerAnswer}. Values above this are **clamped** (never widened)
 * so a misconfigured caller cannot mark all answers correct.
 * @type {number}
 */
export const MAX_NUMERIC_ABSOLUTE_TOLERANCE = 0.05;

/**
 * @param {number} tol
 * @returns {number}
 */
function clampAbsoluteTolerance(tol) {
  return Math.min(tol, MAX_NUMERIC_ABSOLUTE_TOLERANCE);
}

/**
 * Parse a trimmed string as a plain decimal only: optional integer, optional single `.` or `,`
 * as decimal separator (never both). No scientific notation, no thousands grouping, no suffix junk.
 * Used for math learner numeric branch and geometry coordinate parsing (comma only here).
 * @param {string} trimmed
 * @returns {number|null}
 */
export function parsePureNumericDecimalString(trimmed) {
  if (!trimmed) return null;
  if (!/^-?\d+([.,]\d+)?$/.test(trimmed)) return null;
  const dot = trimmed.includes(".");
  const comma = trimmed.includes(",");
  if (dot && comma) return null;
  const normalized = comma ? trimmed.replace(",", ".") : trimmed;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {number} n
 * @returns {number}
 */
function gcdInt(n, d) {
  let a = Math.abs(Math.trunc(n));
  let b = Math.abs(Math.trunc(d));
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

/**
 * Parse fraction-like math answers:
 * - a/b
 * - whole + space + a/b (mixed), e.g. "1 1/2"
 * Returns normalized rational (num/den reduced, den>0) or null.
 * @param {unknown} value
 * @returns {{num:number, den:number}|null}
 */
function parseNormalizedRational(value) {
  if (typeof value !== "string") return null;
  const t = value.trim().replace(/\s+/g, " ");
  if (!t.includes("/")) return null;
  const mixed = t.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const n = Number(mixed[2]);
    const d = Number(mixed[3]);
    if (
      !Number.isInteger(whole) ||
      !Number.isInteger(n) ||
      !Number.isInteger(d) ||
      d === 0 ||
      n < 0
    ) {
      return null;
    }
    const absWhole = Math.abs(whole);
    let num = absWhole * d + n;
    if (whole < 0) num = -num;
    const den = d;
    const g = gcdInt(num, den);
    const numR = num / g;
    const denR = den / g;
    return denR < 0 ? { num: -numR, den: -denR } : { num: numR, den: denR };
  }
  const simple = t.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (!simple) return null;
  const n = Number(simple[1]);
  const d = Number(simple[2]);
  if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) return null;
  const g = gcdInt(n, d);
  const numR = n / g;
  const denR = d / g;
  return denR < 0 ? { num: -numR, den: -denR } : { num: numR, den: denR };
}

function parsePercentToUnitNumber(value) {
  if (typeof value !== "string") return null;
  const t = value.trim().replace(/\s+/g, "");
  const m = t.match(/^(-?\d+(?:[.,]\d+)?)%$/);
  if (!m) return null;
  const n = parsePureNumericDecimalString(m[1]);
  if (n == null) return null;
  return n / 100;
}

const UNIT_CONVERSION_KIND_ALLOWLIST = new Set(["wp_unit_cm_to_m"]);

function parseLengthToMeters(value) {
  if (typeof value !== "string") return null;
  const t = value.trim().toLowerCase().replace(/\s+/g, " ");
  const m = t.match(/^(-?\d+(?:[.,]\d+)?)\s*(cm|m)$/);
  if (!m) return null;
  const n = parsePureNumericDecimalString(m[1]);
  if (n == null) return null;
  if (m[2] === "cm") return n / 100;
  return n;
}

/**
 * English-style normalization: quotes, edge punctuation, collapse whitespace, ASCII lower.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeAnswerExactText(value) {
  return String(value ?? "")
    .replace(/[\u201c\u201d\u05f4]/g, '"')
    .replace(/[\u2018\u2019\u05f3]/g, "'")
    .replace(/^[\s"'`.,!?;:()[\]{}\-–-]+|[\s"'`.,!?;:()[\]{}\-–-]+$/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const HEBREW_NIQQUD_RE = /[\u0591-\u05C7]/g;
const SURROUNDING_PUNCT_RE =
  /^[\s"'`׳״“”‘’.,!?;:()[\]{}\-–-]+|[\s"'`׳״“”‘’.,!?;:()[\]{}\-–-]+$/g;

/**
 * Hebrew relaxed compare (matches hebrew-master strip + punct rules; no wording changes).
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeHebrewRelaxedAnswer(value) {
  return String(value ?? "")
    .replace(/[“”״]/g, '"')
    .replace(/[‘’׳]/g, "'")
    .replace(HEBREW_NIQQUD_RE, "")
    .replace(SURROUNDING_PUNCT_RE, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * @param {object} p
 * @param {"exact_text"|"mcq_index"|"exact_integer"|"trim_string_equal"|"numeric_absolute_tolerance"|"numeric_scale_relative_tolerance"|"hebrew_relaxed_text"|"hebrew_niqqud_strict"} p.mode
 * @param {unknown} p.user
 * @param {unknown} [p.expected] - for exact_text: canonical correct string; for exact_integer: finite integer `expected`; `user` must be a trimmed string of ASCII digits only (full string, no `parseInt` prefix acceptance)
 * @param {unknown[]} [p.acceptedList] — optional extra accepted strings (exact_text, hebrew_*)
 * @param {unknown} [p.expectedIndex] — for mcq_index
 * @param {number} [p.tolerance] — required for numeric_absolute_tolerance (caller supplies; e.g. 0.01). Clamped to {@link MAX_NUMERIC_ABSOLUTE_TOLERANCE} if larger.
 * @param {number} [p.scaleFloor] — required for numeric_scale_relative_tolerance
 * @param {number} [p.relativeFactor] — required for numeric_scale_relative_tolerance
 * @param {number} [p.minTolerance] — required for numeric_scale_relative_tolerance
 * @returns {{ isCorrect: boolean }}
 */
export function compareAnswers(p) {
  const mode = String(p?.mode || "");
  if (mode === "mcq_index") {
    const a = Number(p.user);
    const b = Number(p.expectedIndex);
    return { isCorrect: Number.isFinite(a) && Number.isFinite(b) && a === b };
  }
  if (mode === "exact_integer") {
    const raw = String(p.user ?? "").trim();
    const e = Number(p.expected);
    if (raw === "" || !/^-?\d+$/.test(raw)) {
      return { isCorrect: false };
    }
    const u = Number(raw);
    return {
      isCorrect:
        Number.isFinite(u) &&
        Number.isFinite(e) &&
        Number.isInteger(u) &&
        Number.isInteger(e) &&
        u === e,
    };
  }
  if (mode === "trim_string_equal") {
    const u = String(p.user ?? "").trim();
    const e = String(p.expected ?? "").trim();
    return { isCorrect: u === e };
  }
  if (mode === "numeric_absolute_tolerance") {
    const tol = Number(p.tolerance);
    if (!Number.isFinite(tol) || tol <= 0) {
      throw new Error(
        `compareAnswers: mode "${mode}" requires finite positive tolerance from caller`
      );
    }
    const effectiveTol = clampAbsoluteTolerance(tol);
    const a = p.user;
    const b = p.expected;
    if (a === b) {
      return { isCorrect: true };
    }
    if (
      typeof a === "number" &&
      typeof b === "number" &&
      !isNaN(a) &&
      !isNaN(b) &&
      Math.abs(a - b) < effectiveTol
    ) {
      return { isCorrect: true };
    }
    return { isCorrect: false };
  }
  if (mode === "numeric_scale_relative_tolerance") {
    const sf = Number(p.scaleFloor);
    const rf = Number(p.relativeFactor);
    const mt = Number(p.minTolerance);
    if (
      !Number.isFinite(sf) ||
      !Number.isFinite(rf) ||
      !Number.isFinite(mt) ||
      sf <= 0 ||
      rf <= 0 ||
      mt <= 0
    ) {
      throw new Error(
        `compareAnswers: mode "${mode}" requires finite positive scaleFloor, relativeFactor, minTolerance from caller`
      );
    }
    const a = Number(p.user);
    const b = Number(p.expected);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return { isCorrect: false };
    }
    const scale = Math.max(Math.abs(a), Math.abs(b), sf);
    const tol = Math.max(mt, scale * rf);
    return { isCorrect: Math.abs(a - b) <= tol };
  }
  if (mode === "hebrew_relaxed_text") {
    const norm = normalizeHebrewRelaxedAnswer;
    const baseList =
      Array.isArray(p.acceptedList) && p.acceptedList.length > 0
        ? p.acceptedList
        : p.expected != null
          ? [p.expected]
          : [];
    const u = norm(p.user);
    const ok = baseList.some((c) => norm(c) === u);
    return { isCorrect: ok };
  }
  if (mode === "hebrew_niqqud_strict") {
    const baseList =
      Array.isArray(p.acceptedList) && p.acceptedList.length > 0
        ? p.acceptedList
        : p.expected != null
          ? [p.expected]
          : [];
    const u = normalizeAnswerForSpellingNiqqudStrict(p.user);
    const ok = baseList.some(
      (c) => normalizeAnswerForSpellingNiqqudStrict(c) === u
    );
    return { isCorrect: ok };
  }
  if (mode === "exact_text") {
    const norm = normalizeAnswerExactText;
    const expected = p.expected;
    const baseList =
      Array.isArray(p.acceptedList) && p.acceptedList.length > 0
        ? p.acceptedList
        : expected != null
          ? [expected]
          : [];
    const u = norm(p.user);
    const ok = baseList.some((c) => norm(c) === u);
    return { isCorrect: ok };
  }
  throw new Error(`compareAnswers: unsupported mode "${mode}"`);
}

/**
 * Math learner answer (same rules as math-master handleAnswer): fractions, comparison signs, numeric tolerance.
 * Caller must pass numericTolerance (e.g. 0.01 from math-master); no default inside. Tolerance is clamped to
 * {@link MAX_NUMERIC_ABSOLUTE_TOLERANCE} if larger. Comma as decimal separator applies only on the pure-decimal
 * string branch (not fractions, not mixed numbers with spaces, not comparison tokens).
 * @param {{ user: unknown, correctAnswer: unknown, numericTolerance: number }} p
 * @returns {{ isCorrect: boolean, rejectInvalidNumber: boolean, selectedValue: unknown }}
 */
export function compareMathLearnerAnswer(p) {
  const tol = Number(p.numericTolerance);
  if (!Number.isFinite(tol) || tol <= 0) {
    throw new Error(
      "compareMathLearnerAnswer: numericTolerance must be a finite positive number from caller"
    );
  }
  const effectiveTol = clampAbsoluteTolerance(tol);
  const user = p.user;
  const canonicalCmpSign = resolveCanonicalComparisonSignAnswer({
    params: p.params,
    a: p.a,
    b: p.b,
    operation: p.operation,
    correctAnswer: p.correctAnswer,
  });
  const correctAnswer =
    canonicalCmpSign != null ? canonicalCmpSign : p.correctAnswer;
  const percentageCompatible = p?.percentageCompatible === true;
  const unitConversionEnabled = p?.unitConversionEnabled === true;
  const unitConversionKind = String(p?.unitConversionKind || "");

  let numericAnswer;
  let isStringAnswer = false;

  if (typeof user === "string") {
    const trimmed = user.trim();
    if (trimmed === "<" || trimmed === ">" || trimmed === "=") {
      isStringAnswer = true;
      numericAnswer = trimmed;
    } else if (trimmed.includes("/") || trimmed.includes(" ")) {
      isStringAnswer = true;
      numericAnswer = trimmed;
    } else {
      const parsed = parsePureNumericDecimalString(trimmed);
      if (parsed === null) {
        isStringAnswer = true;
        numericAnswer = trimmed;
      } else {
        numericAnswer = parsed;
      }
    }
  } else {
    numericAnswer = user;
  }

  const correctAnswerStr = String(correctAnswer).trim();
  const isComparisonAnswer =
    correctAnswerStr === "<" ||
    correctAnswerStr === ">" ||
    correctAnswerStr === "=";

  let isCorrect;
  const userPercent = parsePercentToUnitNumber(user);
  const correctPercent = parsePercentToUnitNumber(correctAnswer);
  if (
    percentageCompatible &&
    ((userPercent != null && parsePureNumericDecimalString(correctAnswerStr) != null) ||
      (correctPercent != null && typeof numericAnswer === "number") ||
      (userPercent != null && correctPercent != null))
  ) {
    const a = userPercent != null ? userPercent : typeof numericAnswer === "number" ? numericAnswer : NaN;
    const b =
      correctPercent != null
        ? correctPercent
        : parsePureNumericDecimalString(correctAnswerStr) ?? (typeof correctAnswer === "number" ? correctAnswer : NaN);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return {
        isCorrect: Math.abs(a - b) < effectiveTol,
        rejectInvalidNumber: false,
        selectedValue: numericAnswer,
      };
    }
  }

  if (unitConversionEnabled && UNIT_CONVERSION_KIND_ALLOWLIST.has(unitConversionKind)) {
    const aM = parseLengthToMeters(user);
    const bM = parseLengthToMeters(correctAnswer);
    if (aM != null && bM != null) {
      return {
        isCorrect: Math.abs(aM - bM) < effectiveTol,
        rejectInvalidNumber: false,
        selectedValue: numericAnswer,
      };
    }
  }

  const correctPure =
    typeof correctAnswer === "string"
      ? parsePureNumericDecimalString(correctAnswerStr)
      : null;
  if (
    isStringAnswer ||
    isComparisonAnswer ||
    (typeof correctAnswer === "string" &&
      (correctAnswerStr.includes("/") ||
        correctAnswerStr.includes(" ") ||
        correctPure === null))
  ) {
    const aRat = parseNormalizedRational(numericAnswer);
    const bRat = parseNormalizedRational(correctAnswer);
    if (aRat && bRat) {
      isCorrect = aRat.num === bRat.num && aRat.den === bRat.den;
    } else {
      isCorrect =
        String(numericAnswer).trim() === String(correctAnswer).trim();
    }
  } else {
    const correctNumericAnswer =
      typeof correctAnswer === "string" ? correctPure : correctAnswer;
    isCorrect =
      numericAnswer === correctNumericAnswer ||
      (typeof numericAnswer === "number" &&
        typeof correctNumericAnswer === "number" &&
        !isNaN(numericAnswer) &&
        !isNaN(correctNumericAnswer) &&
        Math.abs(numericAnswer - correctNumericAnswer) < effectiveTol);
  }

  return {
    isCorrect,
    rejectInvalidNumber: false,
    selectedValue: numericAnswer,
  };
}

/**
 * Geometry learner answer (same rules as geometry-master handleAnswer).
 * Caller passes scaleFloor, relativeFactor, minTolerance (e.g. 1e-6, 1e-5, 1e-9); no defaults inside.
 * String inputs use the same pure-decimal comma rules as math ({@link parsePureNumericDecimalString}); no comma normalization on non-numeric shapes.
 * @param {{ user: unknown, correctAnswer: unknown, scaleFloor: number, relativeFactor: number, minTolerance: number }} p
 * @returns {{ isCorrect: boolean }}
 */
export function compareGeometryLearnerAnswer(p) {
  const sf = Number(p.scaleFloor);
  const rf = Number(p.relativeFactor);
  const mt = Number(p.minTolerance);
  if (
    !Number.isFinite(sf) ||
    !Number.isFinite(rf) ||
    !Number.isFinite(mt) ||
    sf <= 0 ||
    rf <= 0 ||
    mt <= 0
  ) {
    throw new Error(
      "compareGeometryLearnerAnswer: scaleFloor, relativeFactor, minTolerance must be finite positive numbers from caller"
    );
  }
  const user = p.user;
  const correctAnswer = p.correctAnswer;

  const toNumeric = (v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v !== "string") return null;
    const t = v.trim();
    return parsePureNumericDecimalString(t);
  };

  const answerNum = toNumeric(user);
  const correctNum = toNumeric(correctAnswer);
  if (answerNum != null && correctNum != null) {
    const a = answerNum;
    const b = correctNum;
    const scale = Math.max(Math.abs(a), Math.abs(b), sf);
    const tol = Math.max(mt, scale * rf);
    return { isCorrect: Math.abs(a - b) <= tol };
  }
  return {
    isCorrect:
      String(user ?? "").trim() === String(correctAnswer ?? "").trim(),
  };
}

/**
 * MCQ SAFETY RULE (dev only): duplicate option strings break index-only semantics.
 * @param {string[]|undefined|null} options
 * @param {unknown} questionId
 */
export function warnDuplicateMcqOptionsDevOnly(options, questionId) {
  try {
    if (
      typeof process === "undefined" ||
      !process.env ||
      process.env.NODE_ENV !== "development"
    ) {
      return;
    }
  } catch {
    return;
  }
  const arr = Array.isArray(options) ? options.map((x) => String(x ?? "")) : [];
  if (arr.length === 0) return;
  const uniq = new Set(arr);
  if (uniq.size < arr.length) {
    // eslint-disable-next-line no-console
    console.warn("[science][mcq-safety] duplicate option strings", {
      id: questionId,
      options: arr,
    });
  }
}
