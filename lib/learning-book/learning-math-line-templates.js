/**
 * Structured learning math line templates.
 * Parse known pedagogical patterns into explicit prose (RTL) + math (LTR) runs
 * instead of BiDi guessing on free-form strings.
 */

import { isFullEquationLine, isMathLikeText } from "./book-math-display.js";
import { parseBookLineStructure } from "./book-line-structure.js";
import { stripStrayMarkdown } from "./parse-inline-markdown.js";
import { canonicalizePlaceValueDecomposition } from "./place-value-equation-order.js";

/** @typedef {{ type: "prose" | "math", value: string }} TemplateRun */

const LIST_PREFIX_RE = /^((?:[-•*]|\d+[.)])\s+)/u;

/**
 * @param {string} value
 * @returns {TemplateRun}
 */
export function mathRun(value) {
  return {
    type: "math",
    value: canonicalizePlaceValueDecomposition(String(value || "").trim()),
  };
}

/**
 * @param {string} value
 * @returns {TemplateRun}
 */
export function proseRun(value) {
  return { type: "prose", value: String(value || "") };
}

/**
 * @param {string} text
 */
function peelListPrefix(text) {
  const input = String(text || "").trim();
  const m = input.match(LIST_PREFIX_RE);
  if (!m) return { prefix: null, rest: input };
  return { prefix: m[1], rest: input.slice(m[0].length).trim() };
}

/**
 * @param {string} body
 */
function isLabeledMathBody(body) {
  const line = stripStrayMarkdown(body).trim().replace(/\.$/, "");
  if (!line || /גדול\s+מ|קטן\s+מ/u.test(line)) return false;
  if (/^\d+\s*[<>]\s*\d+\s*→/u.test(line)) return false;
  return isFullEquationLine(line) || isMathLikeText(line);
}

/**
 * עשרות: 30 + 20 = 50
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseLabeledMathRuns(text) {
  const structure = parseBookLineStructure(text);
  if (!structure?.body || !isLabeledMathBody(structure.body)) return null;

  const body = stripStrayMarkdown(structure.body).trim().replace(/\.$/, "");
  return [proseRun(structure.label), mathRun(body)];
}

/**
 * 8 + 7 = 15 → 5, נשיאה 1
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseArrowCarryRuns(text) {
  const input = String(text || "");
  const match = input.match(
    /^([\d\s+−\-=×÷→←.,]+?)\s*(,\s*[\u0590-\u05FF][\s\S]*)$/u
  );
  if (!match?.[1] || !/→/.test(match[1]) || !/=\s*\d/.test(match[1])) {
    return null;
  }
  return [mathRun(match[1].trim()), proseRun(match[2])];
}

/**
 * 735 גדול מ-708 → 735 > 708
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseComparisonConclusionRuns(text) {
  let label = null;
  let body = stripStrayMarkdown(text).trim();

  const structure = parseBookLineStructure(text);
  if (structure?.body) {
    label = structure.label;
    body = stripStrayMarkdown(structure.body).trim();
  }

const NUM = String.raw`\d+(?:,\d+)*`;

  const tryBody = (rest) => {
    const arrow = rest.match(
      new RegExp(
        `^(${NUM})\\s+(גדול|קטן)\\s+מ-?\\s*(${NUM})\\s*→\\s*(${NUM})\\s*([<>＝=])\\s*(${NUM})\\s*$`
      )
    );
    const hence = rest.match(
      new RegExp(
        `^(${NUM})\\s+(גדול|קטן)\\s+מ-?\\s*(${NUM})\\s*,?\\s*לכן:\\s*(${NUM})\\s*([<>＝=])\\s*(${NUM})\\s*$`
      )
    );
    const m = arrow || hence;
    if (!m) return null;
    const [, a, adj, b, left, op, right] = m;
    const sign = op === "＝" ? "=" : op;
    return [
      proseRun(`${a} ${adj} מ-${b}, לכן:`),
      mathRun(`${left} ${sign} ${right}`),
    ];
  };

  const { prefix, rest } = peelListPrefix(body);
  const core = tryBody(rest);
  if (!core) return null;

  /** @type {TemplateRun[]} */
  const runs = [];
  if (prefix) runs.push(proseRun(prefix));
  if (label) runs.push(proseRun(label));
  runs.push(...core);
  return runs;
}

/**
 * עשרות: 1 < 2 → 612 קטן מ-628
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseLabeledDigitComparisonRuns(text) {
  const structure = parseBookLineStructure(text);
  if (!structure?.body) return null;

  const body = stripStrayMarkdown(structure.body).trim();
  const m = body.match(/^(\d+)\s*([<>])\s*(\d+)\s*→\s*(.+)$/);
  if (!m) return null;

  return [
    proseRun(structure.label),
    mathRun(`${m[1]} ${m[2]} ${m[3]}`),
    proseRun(`→ ${m[4].trim()}`),
  ];
}

/**
 * Build comparison conclusion from parts (generators / future API).
 * @param {{ left: number|string, right: number|string, relation: "gt"|"lt"|"eq" }} p
 * @returns {TemplateRun[]}
 */
export function buildComparisonConclusionRuns({ left, right, relation }) {
  const a = String(left);
  const b = String(right);
  if (relation === "gt") {
    return [
      proseRun(`${a} גדול מ-${b}, לכן:`),
      mathRun(`${a} > ${b}`),
    ];
  }
  if (relation === "lt") {
    return [
      proseRun(`${a} קטן מ-${b}, לכן:`),
      mathRun(`${a} < ${b}`),
    ];
  }
  return [proseRun(`${a} שווה ל-${b}, לכן:`), mathRun(`${a} = ${b}`)];
}

/**
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseTemplateRuns(text) {
  const input = String(text || "");
  if (!input.trim()) return null;

  return (
    parseLabeledMathRuns(input) ||
    parseComparisonConclusionRuns(input) ||
    parseLabeledDigitComparisonRuns(input) ||
    parseArrowCarryRuns(input) ||
    null
  );
}

/**
 * Flatten template runs to visible child-facing string (verification).
 * @param {TemplateRun[]} runs
 */
export function flattenTemplateRuns(runs) {
  return runs
    .map((r) => r.value.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Patterns that must never appear in learning math output. */
export const FORBIDDEN_LEARNING_MATH_STRINGS = [
  "124 = 100 + 20 + 4",
  "405 = 400 + 0 + 5",
  "80 + 5 + 1 = 95",
  "80 + 2 + 1 = 92",
];

/**
 * @param {string} rendered
 */
export function assertNotForbiddenLearningMath(rendered) {
  const norm = String(rendered || "").replace(/\s+/g, " ").trim();
  for (const bad of FORBIDDEN_LEARNING_MATH_STRINGS) {
    if (norm.includes(bad)) {
      throw new Error(`forbidden learning math string: "${bad}" in "${norm}"`);
    }
  }
}
