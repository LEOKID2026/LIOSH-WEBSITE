/**
 * Shared Hebrew + math BiDi run splitting for learning, books, and practice surfaces.
 * Policy:
 *  - Hebrew prose → RTL isolated runs
 *  - Full equations (incl. Hebrew place-value words) → single LTR island
 *  - Hebrew label + equation → label RTL, equation LTR
 *  - Arrow carry lines keep → inside the math island
 */

import {
  findInlineMathRuns,
  isFullEquationLine,
  isMathLikeText,
} from "../learning-book/book-math-display.js";
import { parseBookLineStructure } from "../learning-book/book-line-structure.js";
import { stripStrayMarkdown } from "../learning-book/parse-inline-markdown.js";

/** @typedef {{ type: "prose" | "math", value: string }} MixedRun */

const HEBREW = /[\u0590-\u05FF]/;
const MATH_OP = /[+−\-=×÷→←≈<>]/;
const BIDI_STRIP = /\u2066|\u2067|\u2068|\u2069/g;

/** List / bullet prefix belongs to RTL layout, not the math island. */
const LIST_PREFIX_RE = /^((?:[-•*]|\d+[.)])\s+)/u;

export { isFullEquationLine } from "../learning-book/book-math-display.js";

/**
 * @param {MixedRun[]} runs
 */
function consolidateAdjacentProse(runs) {
  /** @type {MixedRun[]} */
  const out = [];
  for (const run of runs) {
    const last = out[out.length - 1];
    if (run.type === "prose" && last?.type === "prose") {
      last.value += run.value;
    } else if (run.value) {
      out.push({ ...run });
    }
  }
  return out;
}

/**
 * @param {MixedRun[]} runs
 * @returns {MixedRun[]}
 */
function moveTrailingPunctuationFromMathToProse(runs) {
  /** @type {MixedRun[]} */
  const fixed = [];
  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i];
    if (run.type !== "math") {
      fixed.push(run);
      continue;
    }

    const match = run.value.match(/^([\s\S]*?\d)(\s*[.,;:!?]+)(\s*)$/);
    if (!match) {
      fixed.push(run);
      continue;
    }

    fixed.push({ type: "math", value: match[1] });
    const tail = `${match[2]}${match[3] || ""}`;
    const nextRun = runs[i + 1];
    if (nextRun?.type === "prose") {
      fixed.push({ type: "prose", value: tail + nextRun.value });
      i += 1;
    } else {
      fixed.push({ type: "prose", value: tail });
    }
  }
  return fixed;
}

/**
 * @param {string} text
 * @returns {MixedRun[]|null}
 */
function splitLabelEquation(text) {
  const structure = parseBookLineStructure(text);
  if (!structure?.body) return null;
  const body = structure.body.trim();
  if (!isFullEquationLine(body) && !isMathLikeText(body.replace(/\.$/, ""))) {
    return null;
  }
  return [
    { type: "prose", value: structure.label },
    { type: "math", value: body.replace(/\.$/, "").trim() },
  ];
}

/**
 * @param {string} text
 * @returns {MixedRun[]|null}
 */
function splitArrowCarryLine(text) {
  const input = String(text || "");
  const match = input.match(
    /^([\d\s+−\-=×÷→←.,]+?)\s*(,\s*[\u0590-\u05FF][\s\S]*)$/u
  );
  if (!match?.[1] || !/→/.test(match[1]) || !/=\s*\d/.test(match[1])) {
    return null;
  }
  return [
    { type: "math", value: match[1].trim() },
    { type: "prose", value: match[2] },
  ];
}

/**
 * @param {string} text
 * @returns {MixedRun[]}
 */
function splitByInlineMath(text) {
  const input = String(text || "");
  const runs = findInlineMathRuns(input);
  if (!runs.length) {
    return input ? [{ type: "prose", value: input }] : [];
  }

  /** @type {MixedRun[]} */
  const out = [];
  let last = 0;
  for (const m of runs) {
    if (m.start > last) {
      out.push({ type: "prose", value: input.slice(last, m.start) });
    }
    out.push({ type: "math", value: m.value });
    last = m.end;
  }
  if (last < input.length) {
    out.push({ type: "prose", value: input.slice(last) });
  }
  return out;
}

/**
 * @param {string} text
 * @returns {MixedRun[]}
 */
function splitSingleLine(text) {
  const input = String(text || "");
  if (!input.trim()) return [];

  const labelSplit = splitLabelEquation(input);
  if (labelSplit) return labelSplit;

  const arrowSplit = splitArrowCarryLine(input);
  if (arrowSplit) return arrowSplit;

  const listMatch = input.match(LIST_PREFIX_RE);
  if (listMatch) {
    const rest = input.slice(listMatch[0].length);
    if (isFullEquationLine(rest)) {
      return [
        { type: "prose", value: listMatch[1] },
        {
          type: "math",
          value: stripStrayMarkdown(rest).trim().replace(/\.$/, ""),
        },
      ];
    }
  }

  const eqThenProse = input.match(
    /^(.+?\d\s*=\s*\d[\d\s.,]*(?:\s*→\s*\d[\d\s.,]*)?)\s*\.\s+([\u0590-\u05FF].*)$/u
  );
  if (eqThenProse) {
    return [
      { type: "math", value: eqThenProse[1].trim() },
      { type: "prose", value: eqThenProse[2].trim() },
    ];
  }

  if (isFullEquationLine(input)) {
    return [
      {
        type: "math",
        value: stripStrayMarkdown(input).trim().replace(/\.$/, ""),
      },
    ];
  }

  return splitByInlineMath(input);
}

/**
 * Split mixed Hebrew + math into alternating prose/math runs.
 * @param {string|null|undefined} text
 * @returns {MixedRun[]}
 */
export function splitMixedHebrewMathRuns(text) {
  if (text == null || typeof text !== "string" || text === "") return [];

  const normalized = String(text).replace(BIDI_STRIP, "");

  if (normalized.includes("\n")) {
    /** @type {MixedRun[]} */
    const out = [];
    const lines = normalized.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      if (i > 0) out.push({ type: "prose", value: "\n" });
      out.push(...splitSingleLine(lines[i]));
    }
    return moveTrailingPunctuationFromMathToProse(consolidateAdjacentProse(out));
  }

  return moveTrailingPunctuationFromMathToProse(splitSingleLine(normalized));
}

/**
 * Lightweight heuristics for screenshot / text audits.
 * @param {string|null|undefined} text
 * @returns {string[]}
 */
export function detectMixedMathRenderIssues(text) {
  const flat = String(text || "");
  /** @type {string[]} */
  const issues = [];
  if (/\d+\.\s+\d/.test(flat)) issues.push("split-decimal");
  if (/\.[\d\s]+\s*≈\s*π|≈\s*\.\d+/u.test(flat)) issues.push("pi-reversed");
  if (/%\s*\d/.test(flat)) issues.push("percent-before-number");
  if (/=\s*[<>]|[<>]\s*=/.test(flat)) issues.push("compare-reversed");
  if (HEBREW.test(flat) && /\d\s*[+−\-=×÷]/.test(flat)) {
    const runs = splitMixedHebrewMathRuns(flat);
    const hasUnisolated = runs.some(
      (r) =>
        r.type === "prose" &&
        /\d\s*[+−\-=×÷→←]\s*\d/.test(r.value) &&
        !/^[-•*\d.)]+\s*$/.test(r.value.trim())
    );
    if (hasUnisolated) issues.push("unisolated-math-in-prose");
  }
  return issues;
}
