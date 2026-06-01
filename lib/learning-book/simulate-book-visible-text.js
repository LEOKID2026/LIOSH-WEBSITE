/**
 * Simulate child-visible text from book markdown (for verification tests).
 */

import { splitBookMarkdownBlocks } from "./book-markdown-blocks.js";
import { detectDiagramType } from "./diagram-detect.js";
import {
  parseInlineMarkdown,
  stripStrayMarkdown,
} from "./parse-inline-markdown.js";
import {
  inferDiagramEquation,
  inferEquationFromObjectVisual,
  parseDiagramNumberRow,
} from "./diagram-detect.js";
import { findInlineMathRuns } from "./book-math-display.js";

/**
 * Flatten inline markdown to visible text (bold kept, markers removed).
 * @param {string} line
 */
export function simulateVisibleProseLine(line) {
  const tokens = parseInlineMarkdown(String(line || ""));
  return tokens
    .map((token) => stripStrayMarkdown(token.value))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} body
 * @returns {{ proseLines: string[], diagramEquations: string[], issues: string[] }}
 */
export function simulateBookSectionRender(body) {
  const blocks = splitBookMarkdownBlocks(body);
  /** @type {string[]} */
  const proseLines = [];
  /** @type {string[]} */
  const diagramEquations = [];
  /** @type {string[]} */
  const issues = [];

  for (const block of blocks) {
    if (block.type === "prose") {
      for (const line of block.lines) {
        const visible = simulateVisibleProseLine(line);
        proseLines.push(visible);
        if (/\*\*/.test(visible) || /`/.test(visible)) {
          issues.push(`markdown artifact in prose: ${visible}`);
        }
      }
    }

    if (block.type === "ul" || block.type === "ol") {
      for (const item of block.items) {
        for (const line of item) {
          const visible = simulateVisibleProseLine(line);
          proseLines.push(visible);
          if (/\*\*/.test(visible)) {
            issues.push(`markdown artifact in list: ${visible}`);
          }
        }
      }
    }

    if (block.type === "code") {
      const kind = detectDiagramType(block.content);
      if (kind !== "objects" && kind !== "coins") continue;

      const lines = String(block.content || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      /** @type {string|null} */
      let lastVisual = null;
      for (const line of lines) {
        const numberRow = parseDiagramNumberRow(line);
        if (numberRow) {
          const eq =
            inferDiagramEquation(lastVisual, numberRow) ||
            inferEquationFromObjectVisual(lastVisual);
          if (eq && !diagramEquations.includes(eq)) diagramEquations.push(eq);
          continue;
        }
        const visualEq = inferEquationFromObjectVisual(line);
        if (visualEq && !diagramEquations.includes(visualEq)) {
          diagramEquations.push(visualEq);
        }
        if (/[●★✕]/.test(line)) lastVisual = line;
        else if (/₪/.test(line)) lastVisual = line;
      }
    }
  }

  return { proseLines, diagramEquations, issues };
}

/**
 * @param {string} line
 * @param {string} expectedMathSubstring
 */
export function assertLineContainsMath(line, expectedMathSubstring) {
  const runs = findInlineMathRuns(line);
  const normalized = expectedMathSubstring.replace(/\s+/g, " ").trim();
  const ok = runs.some((r) =>
    stripStrayMarkdown(r.value).replace(/\s+/g, " ").includes(normalized)
  );
  if (!ok) {
    throw new Error(
      `Expected math "${normalized}" in line "${line}"; runs=${JSON.stringify(runs.map((r) => r.value))}`
    );
  }
}
