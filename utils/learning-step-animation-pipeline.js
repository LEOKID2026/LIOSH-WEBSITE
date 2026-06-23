/**
 * Post-process animation steps: exerciseView, topic-specific metadata, expression highlights.
 */

import { parseTemplateRuns } from "../lib/learning-book/learning-math-line-templates.js";
import { flattenTemplateRuns } from "../lib/learning-book/learning-math-line-build.js";
import { splitMixedHebrewMathRuns } from "../lib/bidi/mixed-hebrew-math-runs.js";

/**
 * @param {Record<string, unknown>} step
 */
function enrichAnimationStepRuns(step) {
  if (!step || typeof step !== "object") return step;
  if (Array.isArray(step.runs) && step.runs.length) return step;

  const text = typeof step.text === "string" ? step.text : "";
  if (!text.trim()) return step;

  const runs = parseTemplateRuns(text) || splitMixedHebrewMathRuns(text);
  return {
    ...step,
    runs,
    text: flattenTemplateRuns(runs),
  };
}
import { enrichExpressionSteps } from "./learning-step-expression-exercise.js";
import { enrichMultiplicationSteps } from "./learning-step-multiplication-exercise.js";
import { enrichDivisionSteps } from "./learning-step-division-exercise.js";
import { enrichFractionSteps } from "./learning-step-fraction-exercise.js";
import { enrichWordProblemSteps } from "./learning-step-word-problem-exercise.js";
import { annotateAnimationSteps } from "./learning-step-exercise-types.js";

const EXPRESSION_OPS = new Set([
  "percentages",
  "sequences",
  "equations",
  "compare",
  "number_sense",
  "factors_multiples",
  "rounding",
  "divisibility",
  "prime_composite",
  "powers",
  "ratio",
  "order_of_operations",
  "zero_one_properties",
  "estimation",
  "scale",
]);

/** Map legacy highlight keys to expression span keys. */
const LEGACY_TO_EXPRESSION_HIGHLIGHTS = {
  question: ["baseNumber"],
  explanation: ["leftNumber", "rightNumber"],
  calculation: ["leftNumber", "rightNumber", "operator"],
  result: ["result"],
  story: ["numbers"],
  operation: ["keywords"],
  equation: ["numbers"],
};

/** Default highlights per expression builder step id patterns. */
const EXPRESSION_HIGHLIGHT_BY_ID = {
  percentages: {
    show: ["baseNumber", "percentValue"],
    fraction: ["percentValue", "fractionPart"],
    formula: ["baseNumber", "operator"],
    multiply: ["baseNumber", "result"],
    final: ["result"],
  },
  sequences: {
    show: ["sequence"],
    diff: ["difference"],
    calc: ["calculation"],
    final: ["result"],
  },
  compare: {
    show: ["leftNumber", "rightNumber"],
    explain: ["leftNumber", "rightNumber"],
    calculate: ["leftNumber", "rightNumber", "operator"],
    final: ["result"],
  },
  powers: {
    show: ["base", "exponent"],
    calc: ["result"],
    final: ["result"],
  },
  equations: {
    show: ["leftNumber", "rightNumber"],
    isolate: ["operator"],
    calc: ["result"],
    final: ["result"],
  },
  rounding: {
    show: ["originalValue"],
    round: ["decidingDigit", "roundedDigit"],
    final: ["result"],
  },
  ratio: {
    show: ["partA", "partB"],
    calc: ["total"],
    final: ["result"],
  },
  order_of_operations: {
    show: ["parentheses"],
    step: ["activeTerm"],
    final: ["result"],
  },
};

function mapLegacyHighlights(highlights) {
  if (!Array.isArray(highlights) || !highlights.length) return [];
  const out = [];
  for (const key of highlights) {
    const mapped = LEGACY_TO_EXPRESSION_HIGHLIGHTS[key];
    if (mapped) out.push(...mapped);
    else out.push(key);
  }
  return [...new Set(out)];
}

function applyExpressionHighlightDefaults(step, operation) {
  if (!step) return step;

  let highlights = step.highlights?.length
    ? mapLegacyHighlights(step.highlights)
    : [];

  const defaultsByOp = EXPRESSION_HIGHLIGHT_BY_ID[operation] || EXPRESSION_HIGHLIGHT_BY_ID[step.type];
  if (defaultsByOp) {
    const id = String(step.id || "");
    for (const [prefix, keys] of Object.entries(defaultsByOp)) {
      if (id.includes(prefix) || id === prefix) {
        highlights = keys;
        break;
      }
    }
  }

  if (EXPRESSION_OPS.has(step.type) || EXPRESSION_OPS.has(operation)) {
    return {
      ...step,
      highlights: highlights.length ? highlights : step.highlights,
      exerciseView: step.exerciseView || "expression",
    };
  }

  if (highlights.length && !step.highlights?.length) {
    return { ...step, highlights, exerciseView: step.exerciseView || "expression" };
  }

  return step;
}

/**
 * @param {object[]} steps
 * @param {object} question
 * @param {string} [operation]
 */
export function finalizeAnimationSteps(steps, question, operation) {
  if (!Array.isArray(steps) || !steps.length) return steps;

  const op = operation || question?.operation;
  let out = steps;

  if (op === "multiplication") {
    out = enrichMultiplicationSteps(out);
  } else if (op === "division" || op === "division_with_remainder") {
    out = enrichDivisionSteps(out);
  } else if (op === "fractions") {
    out = enrichFractionSteps(out);
  } else if (op === "word_problems") {
    out = enrichWordProblemSteps(out);
  }

  out = out.map((s) => applyExpressionHighlightDefaults(s, op));
  out = enrichExpressionSteps(out);
  out = annotateAnimationSteps(out, question, op);
  out = out.map(enrichAnimationStepRuns);

  if (op === "addition" || op === "subtraction" || op === "decimals") {
    out = out.map((s) =>
      s.exerciseView ? s : { ...s, exerciseView: "placeValue" }
    );
  }

  return out;
}
