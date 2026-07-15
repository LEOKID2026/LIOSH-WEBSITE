/**
 * Parse vertical addition/subtraction ASCII diagrams from book code blocks.
 */

import { stripStrayMarkdown } from "./parse-inline-markdown.js";

const RULE_LINE = /^[\-─–_=]{3,}$/;
const OP_LINE = /^([+−\-])\s*(\d[\d\s]*)$/;
const DIGIT_ROW = /^[\s\d¹²³⁴⁵⁶⁷⁸⁹⁰]+$/;
const BORROW_MARK = /^[\s\d¹²³⁴⁵⁶⁷⁸⁹⁰]*[¹²³⁴⁵⁶⁷⁸⁹][\s\d]*$/;

/**
 * @param {string} content
 * @returns {string[]}
 */
export function verticalArithmeticDisplayLines(content) {
  return String(content || "")
    .split("\n")
    .map((l) => stripStrayMarkdown(l).replace(/\t/g, " ").replace(/\s+$/, ""))
    .filter((l) => l.trim().length > 0);
}

/**
 * @param {string} content
 */
export function isVerticalArithmeticBlock(content) {
  const lines = verticalArithmeticDisplayLines(content);
  if (lines.length < 3) return false;
  if (!lines.some((l) => RULE_LINE.test(l.trim()))) return false;

  const mathLines = lines.filter((l) => !RULE_LINE.test(l.trim()));
  const hasOperator = mathLines.some((l) => OP_LINE.test(l.trim()));
  const hasDigits = mathLines.some(
    (l) => /^\s*\d/.test(l) || DIGIT_ROW.test(l.trim()) || OP_LINE.test(l.trim())
  );
  return hasOperator && hasDigits;
}

/**
 * @param {string} content
 * @returns {{ rows: { cells: string[], kind: 'borrow'|'operand'|'operator'|'result' }[], operator: string|null }|null}
 */
export function parseVerticalArithmetic(content) {
  if (!isVerticalArithmeticBlock(content)) return null;

  const lines = verticalArithmeticDisplayLines(content);
  /** @type {{ cells: string[], kind: 'borrow'|'operand'|'operator'|'result' }[]} */
  const rows = [];
  /** @type {string|null} */
  let operator = null;
  let pastRule = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (RULE_LINE.test(trimmed)) {
      pastRule = true;
      continue;
    }

    const opMatch = trimmed.match(OP_LINE);
    if (opMatch) {
      operator = opMatch[1] === "-" ? "−" : opMatch[1];
      rows.push({
        kind: "operator",
        cells: splitAlignedCells(`${operator} ${opMatch[2].trim()}`),
      });
      continue;
    }

    const cells = splitAlignedCells(trimmed);
    if (!cells.length) continue;

    const kind = pastRule ? "result" : BORROW_MARK.test(trimmed) ? "borrow" : "operand";
    rows.push({ kind, cells });
  }

  if (rows.length < 2) return null;
  return { rows, operator };
}

/**
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
