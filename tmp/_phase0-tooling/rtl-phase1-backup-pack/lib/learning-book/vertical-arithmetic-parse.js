/**
 * Parse vertical addition/subtraction ASCII diagrams from book code blocks.
 */

import { stripStrayMarkdown } from "./parse-inline-markdown.js";

const RULE_LINE = /^[-─—–_=]{3,}$/;
const OP_LINE = /^([+−\-])\s*(\d[\d\s]*)$/;
const DIGIT_ROW = /^[\s\d¹²³⁴⁵⁶⁷⁸⁹⁰]+$/;
const BORROW_MARK = /^[\s\d¹²³⁴⁵⁶⁷⁸⁹⁰]*[¹²³⁴⁵⁶⁷⁸⁹][\s\d]*$/;

/**
 * @param {string} content
 */
export function isVerticalArithmeticBlock(content) {
  const lines = normalizeLines(content);
  if (lines.length < 3) return false;
  if (!lines.some((l) => RULE_LINE.test(l))) return false;

  const mathLines = lines.filter((l) => !RULE_LINE.test(l));
  const hasOperator = mathLines.some((l) => OP_LINE.test(l));
  const hasDigits = mathLines.some((l) => /^\d/.test(l.trim()) || DIGIT_ROW.test(l));
  return hasOperator && hasDigits;
}

/**
 * @param {string} content
 * @returns {{ rows: { cells: string[], kind: 'borrow'|'operand'|'operator'|'result' }[], operator: string|null }|null}
 */
export function parseVerticalArithmetic(content) {
  if (!isVerticalArithmeticBlock(content)) return null;

  const lines = normalizeLines(content);
  /** @type {{ cells: string[], kind: 'borrow'|'operand'|'operator'|'result' }[]} */
  const rows = [];
  /** @type {string|null} */
  let operator = null;
  let pastRule = false;

  for (const line of lines) {
    if (RULE_LINE.test(line)) {
      pastRule = true;
      continue;
    }

    const opMatch = line.match(OP_LINE);
    if (opMatch) {
      operator = opMatch[1] === "-" ? "−" : opMatch[1];
      rows.push({
        kind: "operator",
        cells: splitAlignedCells(`${operator} ${opMatch[2].trim()}`),
      });
      continue;
    }

    const cells = splitAlignedCells(line);
    if (!cells.length) continue;

    const kind = pastRule ? "result" : BORROW_MARK.test(line) ? "borrow" : "operand";
    rows.push({ kind, cells });
  }

  if (rows.length < 2) return null;
  return { rows, operator };
}

/**
 * @param {string} content
 * @returns {string[]}
 */
function normalizeLines(content) {
  return String(content || "")
    .split("\n")
    .map((l) => stripStrayMarkdown(l).replace(/\t/g, " "))
    .filter((l) => l.trim().length > 0);
}

/**
 * Split a fixed-width row into non-empty cell tokens while preserving spacing groups.
 * @param {string} line
 * @returns {string[]}
 */
function splitAlignedCells(line) {
  const trimmed = String(line || "").trimEnd();
  if (!trimmed.trim()) return [];

  /** @type {string[]} */
  const cells = [];
  const re = /\S+/g;
  let match;
  while ((match = re.exec(trimmed)) !== null) {
    cells.push(match[0]);
  }
  return cells;
}
