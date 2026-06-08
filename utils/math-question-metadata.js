/**
 * Professional diagnostic metadata for procedurally generated math questions.
 * Attached at generation time — does not alter numeric correctness or Hebrew stems beyond existing pipeline.
 */
import {
  EXTENDED_EXPECTED_ERROR_TYPES,
  mapDifficultyToCanonical,
} from "./question-metadata-qa/question-metadata-taxonomy.js";
import { attachCanonicalMetadataToMathGeometryQuestion } from "../lib/learning/math-geometry-canonical-metadata.js";

function pickStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/**
 * Canonical difficulty from internal math level key (קל/בינוני/קשה mapping lives in generator).
 * @param {string} mathLevelKey easy|medium|hard
 */
export function mapMathLevelKeyToDifficulty(mathLevelKey) {
  const k = String(mathLevelKey || "").toLowerCase();
  if (k === "hard") return mapDifficultyToCanonical("hard");
  if (k === "easy") return mapDifficultyToCanonical("easy");
  return mapDifficultyToCanonical("medium");
}

/**
 * Stable skill id for scanner / analytics — prefers explicit diagnostic ids from probes/fractions.
 * @param {Record<string, unknown>} params
 * @param {string} selectedOp
 */
export function resolveMathSkillId(params, selectedOp) {
  const diag = pickStr(params.diagnosticSkillId);
  if (diag) return diag;
  const kind = pickStr(params.kind);
  if (kind) return `math_${kind}`;
  const op = pickStr(selectedOp);
  return op ? `math_op_${op}` : "math_unknown";
}

/**
 * Sub-skill / pattern bucket for routing — prefers explicit subtype / pattern family / kind.
 * @param {Record<string, unknown>} params
 * @param {string} selectedOp
 */
export function resolveMathSubskillId(params, selectedOp) {
  return (
    pickStr(params.subtype) ||
    pickStr(params.patternFamily) ||
    pickStr(params.kind) ||
    pickStr(selectedOp) ||
    "general"
  );
}

/**
 * @param {unknown} kind
 * @param {string} selectedOp
 * @param {string} mathLevelKey
 * @param {Record<string, unknown>} [params]
 */
export function inferMathCognitiveLevel(kind, selectedOp, mathLevelKey, params = {}) {
  const k = String(kind || "");
  const pp = String(params.probePower || "").toLowerCase();
  if (pp === "high") return "application";
  if (pp === "medium") return "understanding";
  if (pp === "low") return "recall";

  if (k.startsWith("wp_multi") || k.includes("ratio") || k === "order_parentheses") return "analysis";
  if (k.startsWith("wp_") || selectedOp === "word_problems") return "application";
  if (k.startsWith("frac_") || k.startsWith("dec_") || k.startsWith("scale_")) return "understanding";
  if (
    k.startsWith("ns_") ||
    k === "cmp" ||
    k === "divisibility" ||
    k === "prime_composite" ||
    k.startsWith("pc_")
  ) {
    return "recall";
  }
  const lev = String(mathLevelKey || "").toLowerCase();
  if (lev === "hard") return "application";
  if (lev === "easy") return "recall";
  return "understanding";
}

/**
 * @param {Record<string, unknown>} params
 * @param {string} selectedOp
 */
export function inferMathExpectedErrorTypes(params, selectedOp) {
  const fromTags = Array.isArray(params.expectedErrorTags)
    ? params.expectedErrorTags.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const kind = String(params.kind || "");
  /** @type {Set<string>} */
  const out = new Set(fromTags);

  const add = (/** @type {string} */ t) => {
    if (t) out.add(t);
  };

  add("calculation_error");
  add("careless_error");

  if (kind.startsWith("wp_") || selectedOp === "word_problems") {
    add("word_problem_comprehension_error");
    add("strategy_error");
  }
  if (kind.includes("frac") || selectedOp === "fractions") {
    add("fraction_misconception");
    add("denominator_confusion");
    add("numerator_denominator_confusion");
  }
  if (kind.startsWith("dec_") || kind === "round") {
    add("decimal_place_error");
  }
  if (kind.includes("place") || kind.includes("ns_place")) {
    add("place_value_error");
  }
  if (kind.startsWith("scale_")) {
    add("unit_confusion");
    add("unit_or_scale_error");
  }
  if (
    kind === "divisibility" ||
    kind === "prime_composite" ||
    kind.startsWith("pc_") ||
    kind.startsWith("fm_")
  ) {
    add("concept_confusion");
  }
  if (selectedOp === "equations" || kind.startsWith("eq_") || kind.startsWith("order_")) {
    add("strategy_error");
    add("operation_confusion");
  }
  if (kind.startsWith("perc_")) {
    add("concept_confusion");
  }

  const merged = [...out].filter((t) => EXTENDED_EXPECTED_ERROR_TYPES.has(t));
  return merged.length ? merged : ["calculation_error", "careless_error"];
}

/**
 * Merge professional metadata into a generator output object (non-destructive for answers).
 * @param {Record<string, unknown>} output
 * @param {{ selectedOp: string, gradeKey: string, mathLevelKey: string }} ctx
 */
export function attachProfessionalMathMetadata(output, ctx) {
  const base =
    output && typeof output === "object"
      ? /** @type {Record<string, unknown>} */ (output)
      : {};

  const params =
    base.params && typeof base.params === "object"
      ? { .../** @type {Record<string, unknown>} */ (base.params) }
      : {};

  const selectedOp = pickStr(ctx.selectedOp) || pickStr(base.operation) || "";
  const mathLevelKey = pickStr(ctx.mathLevelKey) || "medium";

  const skillId = resolveMathSkillId(params, selectedOp);
  const subskillId = resolveMathSubskillId(params, selectedOp);
  const difficulty = mapMathLevelKeyToDifficulty(mathLevelKey);
  const cognitiveLevel = inferMathCognitiveLevel(params.kind, selectedOp, mathLevelKey, params);
  const expectedErrorTypes = inferMathExpectedErrorTypes(params, selectedOp);

  if (!pickStr(params.diagnosticSkillId)) params.diagnosticSkillId = skillId;
  if (!pickStr(params.subtype)) params.subtype = subskillId;
  if (!pickStr(params.patternFamily) && params.kind) {
    params.patternFamily = `math_${pickStr(params.kind)}`;
  }

  params.subjectId = "math";

  /** @type {Record<string, unknown>} */
  const next = {
    ...base,
    subject: "math",
    skillId,
    subskillId,
    difficulty,
    cognitiveLevel,
    expectedErrorTypes,
    prerequisiteSkillIds: Array.isArray(base.prerequisiteSkillIds) ? base.prerequisiteSkillIds : [],
    params,
  };

  return attachCanonicalMetadataToMathGeometryQuestion(next, {
    subject: "math",
    gradeKey: pickStr(ctx.gradeKey) || null,
    levelKey: pickStr(ctx.mathLevelKey) || null,
    topic: pickStr(base.operation) || selectedOp || null,
    selectedOp,
  });
}
