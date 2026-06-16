/**
 * Flatten MixedHebrewMathText output to child-visible strings (verification + export).
 */

import { splitMixedHebrewMathRuns } from "../bidi/mixed-hebrew-math-runs.js";
import { classifyBookLine } from "./book-line-classifier.js";
import { parseCanonicalPlaceValueEquation } from "./place-value-equation-order.js";
import {
  parseBookLineStructure,
  splitMixedBodyClauses,
} from "./book-line-structure.js";
import {
  parseInlineMarkdown,
  stripStrayMarkdown,
} from "./parse-inline-markdown.js";
import { splitBookMarkdownBlocks } from "./book-markdown-blocks.js";
import { detectDiagramType } from "./diagram-detect.js";
import { formatBookProseForDisplay } from "./book-prose-format.js";
import { isFullEquationLine, isMathLikeText } from "./book-math-display.js";

const HEBREW_CHAR = /[\u0590-\u05FF]/;

/**
 * @param {string} sourceText
 * @param {number} prevEnd
 * @param {number} nextStart
 */
export function interRunGapText(sourceText, prevEnd, nextStart) {
  if (prevEnd == null || nextStart == null || nextStart <= prevEnd) return "";
  return String(sourceText || "").slice(prevEnd, nextStart);
}

/**
 * @param {{ start?: number, end?: number, value: string }[]} runs
 * @param {string} sourceText
 */
export function flattenRunsToVisibleText(runs, sourceText) {
  let out = "";
  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i];
    const start = run.start ?? 0;
    const end = run.end ?? start + run.value.length;
    if (i > 0) {
      const prev = runs[i - 1];
      const prevEnd = prev.end ?? (prev.start ?? 0) + prev.value.length;
      out += interRunGapText(sourceText, prevEnd, start);
    }
    out += stripStrayMarkdown(run.value);
  }
  return out;
}

/**
 * @param {string} text
 * @param {string} sourceText
 * @param {number} [sourceOffset]
 */
function flattenUnified(text) {
  const input = String(text || "");
  const runs = splitMixedHebrewMathRuns(input);
  if (!runs.length) return input;
  let out = runs
    .map((run) => (run.value === "\n" ? "\n" : stripStrayMarkdown(run.value)))
    .join("");
  if (/^\s+/.test(input) && !/^\s/.test(out)) {
    out = `${input.match(/^\s+/)?.[0] || ""}${out}`;
  }
  if (/\s+$/.test(input) && !/\s$/.test(out)) {
    out = `${out}${input.match(/\s+$/)?.[0] || ""}`;
  }
  return out;
}

function flattenProseSegment(text) {
  const tokens = parseInlineMarkdown(text);
  return tokens.map((token) => flattenUnified(token.value)).join("");
}

function flattenMixedBodyInner(text) {
  const input = String(text || "");
  const stripped = stripStrayMarkdown(input);
  if (
    isFullEquationLine(stripped) ||
    (isMathLikeText(stripped) && !HEBREW_CHAR.test(stripped))
  ) {
    return flattenUnified(stripped);
  }
  if (/[*`_]/.test(input)) {
    return flattenProseSegment(input);
  }
  return flattenUnified(input);
}

/**
 * @param {string} clause
 */
function flattenMixedClause(clause) {
  const structure = parseBookLineStructure(clause);
  if (structure?.body) {
    const label = stripStrayMarkdown(structure.label || "");
    const body = flattenMixedBodyInner(structure.body);
    return label && body ? `${label} ${body}` : label || body;
  }
  return flattenMixedBodyInner(clause);
}

/**
 * @param {string} text
 */
function flattenMixedBody(text) {
  const clauses = splitMixedBodyClauses(text);
  return clauses
    .map((clause, i) => {
      const rendered = flattenMixedClause(clause);
      if (i === 0) return rendered;
      return rendered;
    })
    .join(" ");
}

/**
 * Flatten one book line the way MixedHebrewMathText renders it.
 * @param {string} line
 */
export function flattenMixedHebrewMathVisibleText(line) {
  const input = String(line || "");

  if (classifyBookLine(input) === "place_value_equation") {
    const parsed = parseCanonicalPlaceValueEquation(input);
    if (parsed) {
      return `${parsed.terms.join(" + ")} = ${parsed.total}`;
    }
  }

  const structure = parseBookLineStructure(input);

  if (structure) {
    const label = stripStrayMarkdown(structure.label || "");
    if (structure.body) {
      const body = flattenMixedBody(structure.body);
      return label && body ? `${label} ${body}` : label || body;
    }
    return label;
  }

  return flattenMixedBody(input);
}

/**
 * Source-only visible line (markdown stripped, spaces preserved).
 * @param {string} line
 */
export function flattenSourceNormalizedLine(line) {
  return stripStrayMarkdown(String(line || ""));
}

/**
 * @param {string} body markdown section body
 * @returns {{ lines: { source: string, rendered: string }[], diagramLines: string[] }}
 */
export function flattenBookSectionVisibleLines(body) {
  const blocks = splitBookMarkdownBlocks(body);
  /** @type {{ source: string, rendered: string }[]} */
  const lines = [];
  /** @type {string[]} */
  const diagramLines = [];

  for (const block of blocks) {
    if (block.type === "prose") {
      for (const raw of block.lines) {
        for (const displayLine of formatBookProseForDisplay(raw)) {
          lines.push({
            source: flattenSourceNormalizedLine(displayLine),
            rendered: flattenMixedHebrewMathVisibleText(displayLine),
          });
        }
      }
    }

    if (block.type === "ul" || block.type === "ol") {
      for (const item of block.items) {
        for (const raw of item) {
          lines.push({
            source: flattenSourceNormalizedLine(raw),
            rendered: flattenMixedHebrewMathVisibleText(raw),
          });
        }
      }
    }

    if (block.type === "code") {
      const kind = detectDiagramType(block.content);
      const codeLines = String(block.content || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      for (const cl of codeLines) {
        if (kind === "number_line" && /^[↑↓←→]/.test(cl)) {
          const cleaned = cl.replace(/^[\s_↑↓←→]+/, "").replace(/^[↑↓←→]\s*/, "");
          diagramLines.push(flattenMixedHebrewMathVisibleText(cleaned));
        } else if (/[\u0590-\u05FF]/.test(cl)) {
          diagramLines.push(flattenMixedHebrewMathVisibleText(cl));
        } else {
          diagramLines.push(stripStrayMarkdown(cl));
        }
      }
    }
  }

  return { lines, diagramLines };
}

/**
 * Detect suspicious glued Hebrew (missing spaces vs source).
 * @param {string} source
 * @param {string} rendered
 */
export function detectSpacingRegression(source, rendered) {
  /** @type {string[]} */
  const issues = [];

  if (!source || !rendered) return issues;

  const sourceSpaces = (source.match(/ /g) || []).length;
  const renderedSpaces = (rendered.match(/ /g) || []).length;
  if (renderedSpaces < sourceSpaces) {
    issues.push("lost_spaces");
  }

  const sourceNoSpace = source.replace(/\s+/g, "");
  const renderedNoSpace = rendered.replace(/\s+/g, "");
  if (sourceNoSpace === renderedNoSpace && source !== rendered) {
    issues.push("whitespace_only_change");
  }

    const longHebrewRun = rendered.match(/[\u0590-\u05FF]{14,}/u);
  if (longHebrewRun && HEBREW_CHAR.test(source)) {
    const sourceWords = source.split(/\s+/).filter((w) => HEBREW_CHAR.test(w));
    if (sourceWords.length >= 2 && longHebrewRun[0].length >= 10) {
      issues.push("long_hebrew_run");
    }
  }

  return issues;
}
