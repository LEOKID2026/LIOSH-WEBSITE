/**
 * Classify learning-book lines for dedicated renderers (Phase 1).
 * Fallback remains MixedHebrewMathText — do not change shared helpers here.
 */

import { stripStrayMarkdown } from "./parse-inline-markdown.js";
import { isVerticalArithmeticBlock } from "./vertical-arithmetic-parse.js";

const HEBREW = /[\u0590-\u05FF]/;
const EM_DASH = /[—–-]/;
const MATH_OP = /[+−\-×÷=]/;
const THOUSANDS = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;

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
  if (isPlaceValueEquationLine(raw)) return "place_value_equation";

  return "fallback";
}

/**
 * @param {string} raw
 */
export function isExampleTitleLine(raw) {
  const line = stripStrayMarkdown(raw).trim();
  if (!HEBREW.test(line) || !/\d/.test(line)) return false;
  if (!EM_DASH.test(line)) return false;

  const withoutBold = line.replace(/^\*\*|\*\*$/g, "").trim();
  if (/^=\s*\d/.test(withoutBold)) return false;

  const m = withoutBold.match(
    /^(\d[\d,]*(?:\s*[+−\-×÷]\s*\d[\d,]*)*)\s*[—–-]\s*([\u0590-\u05FF][\s\S]*?)\s*:?\s*$/
  );
  if (m) {
    const mathPart = m[1].trim();
    const hebrewPart = m[2].trim();
    if (mathPart && hebrewPart) return true;
  }

  const compact = withoutBold.match(
    /^(\d[\d,]*(?:\s*[+−\-×÷]\s*\d[\d,]*)+)\s+([\u0590-\u05FF][\s\S]*?)\s*:?\s*$/
  );
  if (compact && !/=/.test(withoutBold)) {
    return Boolean(compact[1].trim() && compact[2].trim());
  }

  return false;
}

/**
 * @param {string} raw
 */
export function isPlaceValueEquationLine(raw) {
  const line = stripStrayMarkdown(raw).trim();
  if (!/=/.test(line) || !/\d/.test(line)) return false;
  if (HEBREW.test(line)) return false;

  const eqMatch = line.match(/^([\d,]+)\s*=\s*(.+)$/);
  if (!eqMatch) return false;

  const left = eqMatch[1].replace(/\s/g, "");
  if (!THOUSANDS.test(left) && !/^\d{4,}$/.test(left)) return false;

  const rhs = eqMatch[2];
  const terms = rhs.split(/\s*\+\s*/);
  if (terms.length < 3) return false;
  return terms.every((t) => /^[\d,]+$/.test(t.trim()));
}

/**
 * @param {string} raw
 * @returns {{ mathPart: string, hebrewPart: string, trailingColon: boolean }|null}
 */
export function parseExampleTitleLine(raw) {
  const line = stripStrayMarkdown(raw).trim().replace(/^\*\*|\*\*$/g, "").trim();

  const emDash = line.match(
    /^(\d[\d,]*(?:\s*[+−\-×÷]\s*\d[\d,]*)*)\s*[—–-]\s*([\u0590-\u05FF][\s\S]*?)\s*(?<colon>:)?\s*$/
  );
  if (emDash) {
    return {
      mathPart: emDash[1].trim(),
      hebrewPart: emDash[2].trim(),
      trailingColon: Boolean(emDash.groups?.colon),
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
    };
  }

  return null;
}

/**
 * @param {string} raw
 * @returns {{ left: string, terms: string[] }|null}
 */
export function parsePlaceValueEquationLine(raw) {
  const line = stripStrayMarkdown(raw).trim();
  const m = line.match(/^([\d,]+)\s*=\s*(.+)$/);
  if (!m) return null;
  const terms = m[2].split(/\s*\+\s*/).map((t) => t.trim()).filter(Boolean);
  if (terms.length < 3) return null;
  return { left: m[1].trim(), terms };
}
