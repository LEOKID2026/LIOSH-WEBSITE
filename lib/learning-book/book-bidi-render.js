/**
 * BiDi stabilization helpers for mixed Hebrew + math book rendering.
 * Ensures every prose fragment between LTR math islands is RTL-isolated
 * so the Unicode BiDi algorithm cannot reorder sibling runs.
 */

import {
  bookLabelIsolateStyle,
  bookMathIsolateStyle,
  bookProseIsolateStyle,
  isFormulaLikeBody,
  splitFormulaTokens,
  splitHebrewMathRuns,
  splitTextAndMathRuns,
} from "./book-math-display.js";
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

  function walkContentRuns(text, sourceOffset = 0) {
    const scoped = text;
    const parts = splitHebrewMathRuns(scoped);
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (part.type === "math" || part.type === "digit") {
        pushRun("ltr", part.value, part.type);
        continue;
      }
      const proseChunks = splitProseForBidiRendering(part.value);
      for (const chunk of proseChunks) {
        if (HEBREW_CHAR.test(chunk.value) || /[,.:;!?()]/.test(chunk.value)) {
          pushRun("rtl", chunk.value, "prose");
        } else if (chunk.value.trim()) {
          pushRun("rtl", chunk.value, "neutral");
        }
      }
    }
  }

  function walkProseSegment(text) {
    for (const token of parseInlineMarkdown(text)) {
      walkContentRuns(token.value);
    }
  }

  function walkMixedBodyInner(text) {
    const body = String(text || "");
    if (isFormulaLikeBody(body)) {
      for (const token of splitFormulaTokens(body)) {
        if (token.type === "op") {
          pushRun("ltr", token.value, "formula-op");
        } else if (token.type === "hebrew") {
          pushRun("rtl", token.value, "formula-term");
        }
      }
      return;
    }
    for (const seg of splitTextAndMathRuns(body)) {
      if (seg.type === "math") {
        pushRun("ltr", seg.value, "math");
      } else {
        walkProseSegment(seg.value);
      }
    }
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
  const parts = splitTextAndMathRuns(body);
  for (let i = 1; i < parts.length - 1; i += 1) {
    if (parts[i].type === "text" && parts[i - 1].type === "math" && parts[i + 1].type === "math") {
      if (HEBREW_CHAR.test(parts[i].value)) return true;
    }
  }
  return false;
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
