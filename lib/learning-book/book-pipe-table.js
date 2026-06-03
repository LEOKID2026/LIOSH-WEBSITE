/**
 * Parse markdown pipe tables in learning-book section bodies.
 */

import { stripStrayMarkdown } from "./parse-inline-markdown.js";

const PIPE_ROW = /^\|.+\|$/;
const SEPARATOR_ROW = /^\|[\s\-:|]+\|$/;

/**
 * @param {string} line
 * @returns {string[]}
 */
export function splitPipeTableCells(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed.startsWith("|")) return [];
  return trimmed
    .slice(1, trimmed.endsWith("|") ? -1 : undefined)
    .split("|")
    .map((c) => c.trim());
}

/**
 * @param {string[]} lines
 * @returns {boolean}
 */
export function isPipeTableBlock(lines) {
  if (!lines || lines.length < 2) return false;
  const trimmed = lines.map((l) => l.trim()).filter(Boolean);
  if (trimmed.length < 2) return false;
  if (!trimmed.every((l) => PIPE_ROW.test(l))) return false;
  const hasSeparator = trimmed.some((l) => SEPARATOR_ROW.test(l));
  return hasSeparator;
}

/**
 * @typedef {{ headers: string[], rows: string[][] }} PipeTableData
 */

/**
 * @param {string[]} lines consecutive pipe-table lines
 * @returns {PipeTableData|null}
 */
export function parsePipeTable(lines) {
  const trimmed = lines.map((l) => l.trim()).filter(Boolean);
  if (!isPipeTableBlock(trimmed)) return null;

  let headerIndex = 0;
  let separatorIndex = -1;

  for (let i = 0; i < trimmed.length; i += 1) {
    if (SEPARATOR_ROW.test(trimmed[i])) {
      separatorIndex = i;
      headerIndex = i > 0 ? i - 1 : 0;
      break;
    }
  }

  if (separatorIndex < 0) return null;

  const headers = splitPipeTableCells(trimmed[headerIndex]).map((c) =>
    stripStrayMarkdown(c)
  );
  /** @type {string[][]} */
  const rows = [];

  for (let i = separatorIndex + 1; i < trimmed.length; i += 1) {
    if (!PIPE_ROW.test(trimmed[i]) || SEPARATOR_ROW.test(trimmed[i])) continue;
    const cells = splitPipeTableCells(trimmed[i]).map((c) => stripStrayMarkdown(c));
    if (cells.length) rows.push(cells);
  }

  if (!headers.length && !rows.length) return null;

  return { headers, rows };
}

/**
 * Extract consecutive pipe-table line groups from a text chunk.
 * @param {string} chunk
 * @returns {{ before: string[], table: PipeTableData, after: string[] }[]}
 */
export function extractPipeTablesFromChunk(chunk) {
  const rawLines = String(chunk || "").split(/\r?\n/);
  /** @type {{ before: string[], table: PipeTableData, after: string[] }[]} */
  const tables = [];
  /** @type {string[]} */
  let buf = [];
  /** @type {string[]} */
  let before = [];

  function flushTable() {
    if (buf.length >= 2 && isPipeTableBlock(buf)) {
      const parsed = parsePipeTable(buf);
      if (parsed) {
        tables.push({ before: [...before], table: parsed, after: [] });
        before = [];
        buf = [];
        return true;
      }
    }
    if (buf.length) {
      before.push(...buf);
      buf = [];
    }
    return false;
  }

  for (const line of rawLines) {
    const t = line.trim();
    if (PIPE_ROW.test(t)) {
      buf.push(line);
    } else {
      if (buf.length) {
        if (!flushTable()) {
          before.push(...buf);
          buf = [];
        }
      }
      if (t) before.push(line);
    }
  }

  if (buf.length) {
    flushTable();
  }

  return tables;
}
