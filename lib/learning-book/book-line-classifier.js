/**
 * Classify learning-book lines for dedicated renderers (Phase 1).
 * Fallback remains MixedHebrewMathText — do not change shared helpers here.
 */

import { stripStrayMarkdown } from "./parse-inline-markdown.js";
import {
  isPlaceValueDecompositionEquation,
  parseCanonicalPlaceValueEquation,
} from "./place-value-equation-order.js";
import { isVerticalArithmeticBlock } from "./vertical-arithmetic-parse.js";

const HEBREW = /[\u0590-\u05FF]/;
const LIST_PREFIX_RE = /^((?:[-•*]|\d+[.)])\s+)/u;

/** @typedef {'example_title'|'place_value_equation'|'vertical_arithmetic_block'|'fallback'} BookLineKind */

/**
 * @param {string} text
 * @param {{ context?: 'prose'|'diagram'|'diagram_block' }} [opts]
 * @returns {BookLineKind}
 */
export function classifyBookLine(text, opts = {}) {
  const raw = String(text || "").trim();
  if (!raw) return "fallback";

  if (opts.context === "diagram_block" && isVerticalArithmeticBlock(raw)) {
    return "vertical_arithmetic_block";
  }

  if (isExampleTitleLine(raw)) return "example_title";
  if (opts.context !== "diagram" && isPlaceValueEquationLine(raw)) {
    return "place_value_equation";
  }

  return "fallback";
}

/**
 * @param {string} raw
 */
export function isExampleTitleLine(raw) {
  return Boolean(parseExampleTitleLine(raw));
}

/**
 * @param {string} raw
 */
export function isPlaceValueEquationLine(raw) {
  const line = stripStrayMarkdown(raw).trim().replace(LIST_PREFIX_RE, "").trim();
  return isPlaceValueDecompositionEquation(line);
}

/**
 * @param {string} raw
 * @returns {{ mathPart: string, hebrewPart: string, trailingColon: boolean }|null}
 */
export function parseExampleTitleLine(raw) {
  const line = stripStrayMarkdown(raw).trim().replace(/^\*\*|\*\*$/g, "").trim();

  const emDash = line.match(
    /^(\d[\d,]*(?:\s*[+−\-×÷]\s*\d[\d,]*)*)\s*[–-]\s*([\u0590-\u05FF][\s\S]*?)\s*(?<colon>:)?\s*$/
  );
  if (emDash) {
    return {
      mathPart: emDash[1].trim(),
      hebrewPart: emDash[2].trim(),
      trailingColon: Boolean(emDash.groups?.colon),
      separator: " - ",
    };
  }

  const compact = line.match(
    /^(\d[\d,]*(?:\s*[+−\-×÷]\s*\d[\d,]*)+)\s+([\u0590-\u05FF][\s\S]*?)\s*(?<colon>:)?\s*$/
  );
  if (compact && !/=/.test(line)) {
    return {
      mathPart: compact[1].trim(),
      hebrewPart: compact[2].trim(),
      trailingColon: Boolean(compact.groups?.colon),
      separator: " ",
    };
  }

  return null;
}

/**
 * @param {string} raw
 * @returns {{ left: string, terms: string[] }|null}
 */
export function parsePlaceValueEquationLine(raw) {
  return parseCanonicalPlaceValueEquation(raw);
}
