/**
 * Learning-book decomposition equations must read pedagogically as:
 *   50 + 8 = 58
 *   100 + 20 + 4 = 124
 * not:
 *   58 = 50 + 8
 *   124 = 100 + 20 + 4
 *
 * Source drafts sometimes use total-first form; canonicalize at render time.
 */

import { stripStrayMarkdown } from "./parse-inline-markdown.js";

const LIST_PREFIX_RE = /^((?:[-•*]|\d+[.)])\s+)/u;
const NUM = /^[\d,]+$/;

/**
 * @param {string} raw
 * @returns {string}
 */
function stripListPrefix(raw) {
  const input = String(raw || "").trim();
  const m = input.match(LIST_PREFIX_RE);
  if (!m) return input;
  return { prefix: m[1], body: input.slice(m[0].length).trim() };
}

/**
 * @param {string} term
 */
function parseNumericTerm(term) {
  const n = Number(String(term || "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {number[]} terms
 * @param {number} total
 */
function termsSumToTotal(terms, total) {
  if (!terms.length || terms.some((t) => !Number.isFinite(t))) return false;
  return terms.reduce((a, b) => a + b, 0) === total;
}

/**
 * @param {string} body
 * @returns {boolean}
 */
export function isPlaceValueDecompositionEquation(body) {
  const line = stripStrayMarkdown(body).trim();
  if (!/=/.test(line) || !/\d/.test(line) || /[\u0590-\u05FF]/.test(line)) {
    return false;
  }

  const totalFirst = line.match(/^([\d,]+)\s*=\s*(.+)$/);
  if (totalFirst) {
    const terms = totalFirst[2].split(/\s*\+\s*/).map((t) => t.trim());
    if (terms.length < 2 || !terms.every((t) => NUM.test(t))) return false;
    return termsSumToTotal(
      terms.map(parseNumericTerm),
      parseNumericTerm(totalFirst[1])
    );
  }

  const totalLast = line.match(/^(.+?)\s*=\s*([\d,]+)$/);
  if (totalLast) {
    const terms = totalLast[1].split(/\s*\+\s*/).map((t) => t.trim());
    if (terms.length < 2 || !terms.every((t) => NUM.test(t))) return false;
    return termsSumToTotal(
      terms.map(parseNumericTerm),
      parseNumericTerm(totalLast[2])
    );
  }

  return false;
}

/**
 * @param {string} body equation without list prefix
 * @returns {string}
 */
export function canonicalizePlaceValueDecompositionBody(body) {
  const line = stripStrayMarkdown(body).trim();
  if (!isPlaceValueDecompositionEquation(line)) return line;

  const totalFirst = line.match(/^([\d,]+)\s*=\s*(.+)$/);
  if (totalFirst) {
    const terms = totalFirst[2]
      .split(/\s*\+\s*/)
      .map((t) => t.trim())
      .filter(Boolean);
    const total = totalFirst[1].trim();
    if (termsSumToTotal(terms.map(parseNumericTerm), parseNumericTerm(total))) {
      return `${terms.join(" + ")} = ${total}`;
    }
  }

  return line;
}

/**
 * @param {string} raw full line (may include bullet prefix)
 * @returns {string}
 */
export function canonicalizePlaceValueDecomposition(raw) {
  const input = String(raw || "").trim();
  const listMatch = input.match(LIST_PREFIX_RE);
  if (listMatch) {
    const body = input.slice(listMatch[0].length).trim();
    const canonicalBody = canonicalizePlaceValueDecompositionBody(body);
    if (canonicalBody !== body) {
      return `${listMatch[1]}${canonicalBody}`;
    }
  }
  return canonicalizePlaceValueDecompositionBody(input);
}

/**
 * @param {string} raw
 * @returns {{ terms: string[], total: string }|null}
 */
export function parseCanonicalPlaceValueEquation(raw) {
  const canonical = canonicalizePlaceValueDecomposition(raw);
  const line = stripStrayMarkdown(canonical).trim().replace(LIST_PREFIX_RE, "").trim();
  const m = line.match(/^(.+?)\s*=\s*([\d,]+)$/);
  if (!m) return null;
  const terms = m[1]
    .split(/\s*\+\s*/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length < 2) return null;
  return { terms, total: m[2].trim() };
}

/** @param {string} rendered */
export function isForbiddenTotalFirstDecomposition(rendered) {
  const line = stripStrayMarkdown(rendered).trim().replace(LIST_PREFIX_RE, "").trim();
  const totalFirst = line.match(/^([\d,]+)\s*=\s*(.+)$/);
  if (!totalFirst) return false;
  const terms = totalFirst[2].split(/\s*\+\s*/).map((t) => t.trim());
  if (terms.length < 2 || !terms.every((t) => NUM.test(t))) return false;
  return termsSumToTotal(
    terms.map(parseNumericTerm),
    parseNumericTerm(totalFirst[1])
  );
}

/**
 * Assert rendered math string matches pedagogical order (terms before total).
 * @param {string} rendered
 * @param {string} expected canonical equation
 */
export function assertPlaceValueDisplayOrder(rendered, expected) {
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const r = norm(rendered);
  const e = norm(expected);
  if (r !== e) {
    throw new Error(`place-value order: got "${r}" expected "${e}"`);
  }
}
