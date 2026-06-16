/**
 * BiDi stabilization helpers for mixed Hebrew + math book rendering.
 * Ensures every prose fragment between LTR math islands is RTL-isolated
 * so the Unicode BiDi algorithm cannot reorder sibling runs.
 */

import {
  bookLabelIsolateStyle,
  bookMathIsolateStyle,
  bookProseIsolateStyle,
  isMathLikeText,
} from "./book-math-display.js";
import { splitMixedHebrewMathRuns } from "../bidi/mixed-hebrew-math-runs.js";
import { parseBookLineStructure, splitMixedBodyClauses } from "./book-line-structure.js";
import { parseInlineMarkdown, stripStrayMarkdown } from "./parse-inline-markdown.js";
import { interRunGapText } from "./book-visible-text-render.js";

export { bookLabelIsolateStyle, bookMathIsolateStyle, bookProseIsolateStyle };

const HEBREW_CHAR = /[\u0590-\u05FF]/;

/** Hebrew single-letter prefixes before hyphen + number (ו-, מ-, ל-, ב-, ש-, כ-, ה-) */
export const HEBREW_MATH_AFFIX =
  /(?:^|[\s,])([ובלשכה])-(?=\d)/u;

/**
 * Split a prose fragment for safer BiDi rendering when it sits between math runs.
 * Keeps Hebrew affixes like "ו-" attached to RTL prose, never merged into LTR math.
 * @param {string} text
 * @returns {{ type: "prose", value: string }[]}
 */
export function splitProseForBidiRendering(text) {
  const input = String(text || "");
  if (!input) return [];

  /** @type {{ type: "prose", value: string }[]} */
  const out = [];
  let last = 0;
  const re = /(?:^|[\s,])([ובלשכה])-(?=\d)/gu;
  let match;

  while ((match = re.exec(input)) !== null) {
    const affixStart = match.index + match[0].indexOf(match[1]);
    if (affixStart > last) {
      out.push({ type: "prose", value: input.slice(last, affixStart) });
    }
    out.push({ type: "prose", value: input.slice(affixStart, affixStart + match[1].length + 1) });
    last = affixStart + match[1].length + 1;
  }

  if (last < input.length) {
    out.push({ type: "prose", value: input.slice(last) });
  }

  return out.length ? out : [{ type: "prose", value: input }];
}

/**
 * Flatten prose sub-runs (used by tests and visible-text export).
 * @param {string} text
 */
export function flattenProseForBidi(text) {
  return splitProseForBidiRendering(text)
    .map((p) => stripStrayMarkdown(p.value))
    .join("");
}

/**
 * Analyze how a line will be rendered as isolated BiDi runs (for regression tests).
 * @param {string} line
 * @returns {{ dir: "rtl" | "ltr", value: string, role: string }[]}
 */
export function analyzeBidiRenderStructure(line) {
  const input = String(line || "").trim();
  /** @type {{ dir: "rtl" | "ltr", value: string, role: string }[]} */
  const runs = [];

  function pushRun(dir, value, role) {
    const v = stripStrayMarkdown(value).replace(/\s+/g, " ").trim();
    if (!v) return;
    runs.push({ dir, value: v, role });
  }

  function walkUnified(text) {
    for (const run of splitMixedHebrewMathRuns(text)) {
      if (run.value === "\n") continue;
      if (run.type === "math") {
        pushRun("ltr", run.value, "math");
      } else {
        pushRun("rtl", run.value, "prose");
      }
    }
  }

  function walkProseSegment(text) {
    for (const token of parseInlineMarkdown(text)) {
      walkUnified(token.value);
    }
  }

  function walkMixedBodyInner(text) {
    walkUnified(String(text || ""));
  }

  function walkClause(clause) {
    const structure = parseBookLineStructure(clause);
    if (structure?.label) {
      pushRun("rtl", structure.label, "label");
    }
    if (structure?.body) {
      walkMixedBodyInner(structure.body);
    } else if (!structure) {
      walkMixedBodyInner(clause);
    }
  }

  const top = parseBookLineStructure(input);
  if (top?.label) {
    pushRun("rtl", top.label, "label");
  }
  const body = top?.body ?? input;
  for (const clause of splitMixedBodyClauses(body)) {
    if (top?.label && clause === body && !parseBookLineStructure(clause)?.label) {
      walkMixedBodyInner(clause);
    } else {
      walkClause(clause);
    }
  }

  return runs;
}

/**
 * Assert visual run order won't mangle between math islands (test helper).
 * @param {string} line
 * @param {string[]} expectedLtrSnippets in visual/logical order
 */
export function assertBidiMathOrder(line, expectedLtrSnippets) {
  const runs = analyzeBidiRenderStructure(line);
  const ltrValues = runs.filter((r) => r.dir === "ltr").map((r) => r.value);
  let lastIdx = -1;
  for (const snippet of expectedLtrSnippets) {
    const n = stripStrayMarkdown(snippet).replace(/\s+/g, " ").trim();
    const idx = ltrValues.findIndex(
      (v, i) => i > lastIdx && (v.includes(n) || n.includes(v))
    );
    if (idx < 0) {
      throw new Error(
        `BiDi order: missing "${n}" in "${line}"\n  LTR runs: ${JSON.stringify(ltrValues)}`
      );
    }
    lastIdx = idx;
  }
  return true;
}

/**
 * True when line has Hebrew prose sandwiched between two math runs (high BiDi risk).
 * @param {string} line
 */
export function hasProseBetweenMathRuns(line) {
  const body = parseBookLineStructure(line)?.body ?? line;
  const runs = splitMixedHebrewMathRuns(body);
  for (let i = 1; i < runs.length - 1; i += 1) {
    if (
      runs[i].type === "prose" &&
      runs[i - 1].type === "math" &&
      runs[i + 1].type === "math" &&
      HEBREW_CHAR.test(runs[i].value)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Split "חשבו: 68 − 24 = ?" into Hebrew prefix + one LTR equation island.
 * @param {string} text
 * @returns {{ prefix: string, equation: string }|null}
 */
export function splitInlineHebrewTaskEquation(text) {
  const input = String(text || "").trim();
  const match = input.match(/^([\u0590-\u05FF][\u0590-\u05FF\s]*:)\s*(\d[\s\S]+)$/u);
  if (!match?.[2]) return null;
  const equation = stripStrayMarkdown(match[2]).trim();
  if (!isMathLikeText(equation)) return null;
  // Consecutive Hebrew words = a prose phrase that would reverse inside the LTR
  // island; keep the whole line on the unified splitter instead.
  if (/[\u0590-\u05FF]+\s+[\u0590-\u05FF]+/u.test(equation)) return null;
  return { prefix: stripStrayMarkdown(match[1]).trim(), equation };
}

/**
 * Split comma-separated Hebrew formula rows like "2 מאות = 200, 3 עשרות = 30".
 * @param {string} body
 * @returns {string[]|null}
 */
export function splitCommaSeparatedFormulaDisplay(body) {
  const input = String(body || "").trim();
  if (!input.includes(",")) return null;
  if ((input.match(/=/g) || []).length < 2) return null;
  if (!HEBREW_CHAR.test(input)) return null;

  const parts = input
    .split(/,\s+(?=[\u0590-\u05FF\d*])/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;
  if (!parts.every((part) => /=/.test(part))) return null;
  return parts;
}

/**
 * Split "… 68 = 60 + 8, ו-24 = 20 + 4." into two display rows (renderer only).
 * @param {string} body
 * @returns {string[]|null}
 */
export function splitCommaVavEquationDisplay(body) {
  const input = String(body || "").trim();
  const match = input.match(/^([\s\S]+?,\s*)(ו-\d[\s\S]*)$/u);
  if (!match?.[2]) return null;
  return [match[1].trimEnd(), match[2].trim()];
}

/**
 * @param {string} sourceText
 * @param {number} prevEnd
 * @param {number} nextStart
 */
export { interRunGapText };
