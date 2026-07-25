/**
 * W1 — Persistable math classifier params (global operand dual-write).
 * Body `params` must carry clean numeric operands for classifiers without
 * relying on questionId pipe parsing alone.
 */

/**
 * CLOSED 2026-07-25 — word-problem keys merged into MATH_CLASSIFIER_OPERAND_KEYS.
 * Kept as empty freeze for import compatibility; do not re-open without a plan.
 * @see MATH_CLASSIFIER_OPERAND_KEYS
 */
export const MATH_CLASSIFIER_OPERAND_KEYS_OPEN_TODO_WORD_PROBLEMS = Object.freeze([]);

/** Keys safe/useful for deterministic numeric classifiers (keep small for payload). */
export const MATH_CLASSIFIER_OPERAND_KEYS = Object.freeze([
  "kind",
  // binary / ternary arithmetic
  "a",
  "b",
  "c",
  "op",
  // multiplication variants
  "twoDigit",
  "oneDigit",
  "tens",
  "hundreds",
  "multiplier",
  "groups",
  "perGroup",
  // division
  "dividend",
  "divisor",
  "quotient",
  "remainder",
  // fractions
  "n1",
  "n2",
  "d1",
  "d2",
  "den1",
  "den2",
  "num",
  "den",
  "factor",
  "whole",
  "improperNum",
  // decimals / rounding
  "places",
  "x",
  "y",
  "n",
  "toWhat",
  // percentages
  "base",
  "p",
  "discount",
  "finalPrice",
  "ask",
  // equations
  "form",
  // word problems / compare / scale (common)
  "big",
  "small",
  "diff",
  "per",
  "partA",
  "partB",
  "mapLength",
  "scale",
  "realLength",
  "units",
  // word problems — change / money / unit (closed from former OPEN_TODO)
  "start",
  "gain",
  "loss",
  "spent",
  "left",
  "total",
  "have",
  "got",
  "gave",
  "money",
  "give",
  "toy",
  "cm",
  "g",
  "meters",
  "kg",
  "conversionFactor",
  // word problems — time / leftover / coins / rate / average / shop
  "l1",
  "l2",
  "groupSize",
  "leftover",
  "today",
  "daysLater",
  "days",
  "startDayIdx",
  "endDayIdx",
  "coins1",
  "coins2",
  "value1",
  "value2",
  "price",
  "discPerc",
  "speed",
  "hours",
  "distance",
  "s1",
  "s2",
  "s3",
]);

const BULKY_PARAM_KEYS = new Set([
  "canonicalMetadata",
  "mcqOptionCells",
  "answers",
  "topicDiagnosticEvidence",
  "exerciseText",
  "questionLabel",
  "presentationVariant",
  "diagnosticSkillId",
  "subtype",
  "patternFamily",
  "subjectId",
  "optionCount",
]);

/** @param {unknown} v */
function isPlainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * @param {unknown} v
 * @returns {number|string|boolean|null}
 */
function coercePersistableScalar(v) {
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    if (Number.isFinite(n) && String(n) === t) return n;
    // keep short non-numeric tokens (ops, kinds, fraction strings)
    return t.length <= 64 ? t : t.slice(0, 64);
  }
  return null;
}

/**
 * Build a compact classifier-facing params object from generator params (+ optional question root a/b).
 * Always prefers explicit operands on params; falls back to question.a / question.b when present.
 *
 * @param {Record<string, unknown>|null|undefined} params
 * @param {Record<string, unknown>|null|undefined} [question]
 * @returns {Record<string, unknown>}
 */
export function pickPersistableMathClassifierParams(params, question = null) {
  /** @type {Record<string, unknown>} */
  const src = isPlainObject(params) ? { ...params } : {};
  const q = isPlainObject(question) ? question : null;

  // Dual-write fallback: root operands → params
  if (src.a == null && q && q.a != null) src.a = q.a;
  if (src.b == null && q && q.b != null) src.b = q.b;
  if (src.c == null && q && q.c != null) src.c = q.c;
  if (!src.kind && q) {
    const k = q.params && isPlainObject(q.params) ? q.params.kind : null;
    if (k) src.kind = k;
    else if (q.kind) src.kind = q.kind;
  }

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of MATH_CLASSIFIER_OPERAND_KEYS) {
    if (!(key in src) || src[key] == null || src[key] === "") continue;
    if (BULKY_PARAM_KEYS.has(key)) continue;
    const coerced = coercePersistableScalar(src[key]);
    if (coerced != null) out[key] = coerced;
  }

  // Also keep any other small finite numeric keys already on params (future-proof)
  for (const [key, raw] of Object.entries(src)) {
    if (key in out) continue;
    if (BULKY_PARAM_KEYS.has(key)) continue;
    if (MATH_CLASSIFIER_OPERAND_KEYS.includes(key)) continue;
    if (typeof raw === "number" && Number.isFinite(raw)) out[key] = raw;
  }

  return out;
}

/**
 * Mutates question.params so operands are present for engine/save dual-write.
 * Safe to call at generator finalize and before answer save.
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @returns {Record<string, unknown>|null|undefined}
 */
export function ensureMathQuestionParamsOperands(question) {
  if (!isPlainObject(question)) return question;
  const picked = pickPersistableMathClassifierParams(
    isPlainObject(question.params) ? question.params : {},
    question,
  );
  question.params = {
    ...(isPlainObject(question.params) ? question.params : {}),
    ...picked,
  };
  return question;
}

/**
 * True when params expose at least one pair of classifier operands for the kind family.
 * Used by contract tests / W1 live sanity.
 *
 * @param {Record<string, unknown>|null|undefined} params
 */
export function mathParamsHaveClassifierOperands(params) {
  if (!isPlainObject(params)) return false;
  const kind = String(params.kind || "").trim();
  const has = (...keys) => keys.every((k) => params[k] != null && params[k] !== "");

  if (kind.startsWith("frac_") || kind.includes("frac")) {
    return (
      has("n1", "den1", "n2", "den2") ||
      has("n1", "d1", "n2", "d2") ||
      has("num", "den") ||
      has("a", "b")
    );
  }
  if (kind === "mul_vertical") return has("twoDigit", "oneDigit") || has("a", "b");
  if (kind === "mul_tens") return has("tens", "multiplier") || has("a", "b");
  if (kind === "mul_hundreds") return has("hundreds", "multiplier") || has("a", "b");
  if (kind.startsWith("div") || kind === "div") {
    return has("a", "b") || has("dividend", "divisor");
  }
  if (kind.startsWith("wp_")) {
    const wpPairs = [
      ["a", "b"],
      ["big", "small"],
      ["per", "groups"],
      ["perGroup", "groups"],
      ["whole", "partA"],
      ["start", "gain", "loss"],
      ["total", "give"],
      ["total", "spent"],
      ["total", "groupSize"],
      ["total", "groups"],
      ["total", "perGroup"],
      ["total", "leftover"],
      ["money", "give"],
      ["money", "spent"],
      ["money", "toy"],
      ["l1", "l2"],
      ["today", "daysLater"],
      ["days", "startDayIdx"],
      ["startDayIdx", "endDayIdx"],
      ["coins1", "coins2"],
      ["value1", "value2"],
      ["cm", "meters"],
      ["g", "kg"],
      ["price", "discPerc"],
      ["price", "discount"],
      ["price", "finalPrice"],
      ["speed", "hours"],
      ["speed", "distance"],
      ["hours", "distance"],
      ["s1", "s2"],
      ["s1", "s2", "s3"],
    ];
    if (wpPairs.some((keys) => has(...keys))) return true;
    // Future-proof: any wp_* with ≥2 allowlisted numeric operands is dual-write complete.
    const numericOperandCount = MATH_CLASSIFIER_OPERAND_KEYS.filter(
      (k) => k !== "kind" && typeof params[k] === "number" && Number.isFinite(params[k]),
    ).length;
    return numericOperandCount >= 2;
  }
  if (kind === "round" || kind.startsWith("dec_round")) {
    return has("n", "toWhat") || has("n", "places") || has("a", "places");
  }
  if (kind.startsWith("perc_")) {
    return has("base", "p") || has("a", "b");
  }
  if (kind.startsWith("eq_")) {
    return has("a", "c") || has("a", "b", "c") || has("a", "b");
  }
  if (kind.startsWith("dec_") || kind.startsWith("add_") || kind.startsWith("sub_") || kind === "mul" || kind === "cmp") {
    if (kind === "add_three") return has("a", "b", "c");
    return has("a", "b") || has("x", "y");
  }
  // generic: any a+b or n1+den1
  return has("a", "b") || has("n1", "den1") || has("num", "den") || has("n");
}
