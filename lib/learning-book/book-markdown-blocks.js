/**
 * Parse learning-book section body into render blocks (shared with tests).
 */

import { formatBookProseForDisplay } from "./book-prose-format.js";

/**
 * @typedef {{ type: 'code', content: string } | { type: 'hr' } | { type: 'ul' | 'ol', items: string[][] } | { type: 'prose', lines: string[] }} BookMarkdownBlock
 */

/**
 * @param {string} body
 * @returns {BookMarkdownBlock[]}
 */
export function splitBookMarkdownBlocks(body) {
  if (!body?.trim()) return [];

  /** @type {BookMarkdownBlock[]} */
  const blocks = [];
  const segments = body.split(/(```[\s\S]*?```)/g);

  for (const segment of segments) {
    if (!segment.trim()) continue;

    if (segment.startsWith("```") && segment.endsWith("```")) {
      const content = segment.slice(3, -3).replace(/^\n/, "").replace(/\n$/, "");
      blocks.push({ type: "code", content });
      continue;
    }

    const chunks = segment.split(/\r?\n\r?\n+/);
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;

      if (/^---+$/.test(trimmed)) {
        blocks.push({ type: "hr" });
        continue;
      }

      const listLines = trimmed.split("\n");
      if (listLines.every((line) => /^[-*]\s+/.test(line))) {
        blocks.push({
          type: "ul",
          items: listLines.map((line) =>
            formatBookProseForDisplay(line.replace(/^[-*]\s+/, ""))
          ),
        });
        continue;
      }

      if (listLines.every((line) => /^\d+\.\s+/.test(line))) {
        blocks.push({
          type: "ol",
          items: listLines.map((line) =>
            formatBookProseForDisplay(line.replace(/^\d+\.\s+/, ""))
          ),
        });
        continue;
      }

      blocks.push({
        type: "prose",
        lines: formatBookProseForDisplay(trimmed),
      });
    }
  }

  return dropTrailingHrBlocks(normalizeProseHrBlocks(blocks));
}

/**
 * Remove trailing `---` hr blocks (source-file section delimiters, not UI content).
 * @param {BookMarkdownBlock[]} blocks
 */
function dropTrailingHrBlocks(blocks) {
  while (blocks.length && blocks[blocks.length - 1].type === "hr") {
    blocks.pop();
  }
  return blocks;
}

/**
 * Split trailing `---` markers into hr blocks.
 * @param {BookMarkdownBlock[]} blocks
 */
function normalizeProseHrBlocks(blocks) {
  /** @type {BookMarkdownBlock[]} */
  const out = [];

  for (const block of blocks) {
    if (block.type !== "prose") {
      out.push(block);
      continue;
    }

    /** @type {string[]} */
    const proseLines = [];
    for (const line of block.lines) {
      if (/^---+$/.test(String(line).trim())) {
        if (proseLines.length) {
          out.push({ type: "prose", lines: [...proseLines] });
          proseLines.length = 0;
        }
        out.push({ type: "hr" });
      } else {
        proseLines.push(line);
      }
    }

    if (proseLines.length) {
      out.push({ type: "prose", lines: proseLines });
    }
  }

  return out;
}

/**
 * Simulate flat text output as a child would see (prose lines + diagram equations).
 * @param {string} body
 * @param {{ diagrams?: { equations: string[] } }} ctx
 * @returns {string[]}
 */
export function simulateBookDisplayLines(body, ctx = { diagrams: { equations: [] } }) {
  const blocks = splitBookMarkdownBlocks(body);
  /** @type {string[]} */
  const lines = [];

  for (const block of blocks) {
    if (block.type === "prose") {
      lines.push(...block.lines);
    } else if (block.type === "ul" || block.type === "ol") {
      for (const itemLines of block.items) {
        lines.push(...itemLines);
      }
    } else if (block.type === "code") {
      ctx.diagrams.equations.forEach((eq) => lines.push(eq));
    }
  }

  return lines;
}
