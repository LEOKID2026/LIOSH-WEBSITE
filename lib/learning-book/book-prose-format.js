/**
 * Book prose formatting — readable line breaks for Grade 1 learning book (renderer only).
 */

import { stripStrayMarkdown } from "./parse-inline-markdown.js";

const HEBREW_START = /[\u0590-\u05FF"(❌✓]/;

/** Lines that should stay on one display row (labels, steps, checks). */
const STRUCTURED_LINE =
  /^(?:\*\*)?(?:שאלה|שלב\s*\d+|תשובה|דוגמה|זכרו|טיפ|עודף|היה|הוציא|נשאר|מה\s+(?:יודעים|מבקשים|עושים))(?:\*\*)?\s*:/u;

/**
 * @param {string} line
 */
export function isStructuredBookLine(line) {
  const t = String(line || "").trim();
  if (!t) return false;
  if (/^(?:❌|✓)/.test(t)) return true;
  if (/^\*(?:\(|[^*])/.test(t)) return true;
  if (/^\*\*[^*]+:\*\*\s*/.test(t)) return true;
  const plain = stripStrayMarkdown(t);
  return STRUCTURED_LINE.test(plain) || STRUCTURED_LINE.test(t);
}

/**
 * Split a prose paragraph into sentence lines (period / safe ?! boundaries).
 * Skips decimal points (e.g. 3.14) and math placeholders like `5 + 3 = ?`.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function splitBookProseSentences(text) {
  const input = String(text || "").trim();
  if (!input) return [];

  if (isStructuredBookLine(input)) {
    return [input];
  }

  /** @type {string[]} */
  const sentences = [];
  let buf = "";

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    buf += ch;

    if (ch !== "." && ch !== "!" && ch !== "?") continue;

    if (ch === ".") {
      const prev = input[i - 1] || "";
      const next = input[i + 1] || "";
      if (/\d/.test(prev) && /\d/.test(next)) continue;
      if (input.slice(i, i + 3) === "...") continue;
    }

    if (ch === "?") {
      const prev = input[i - 1] || "";
      if (/[\d=+\-−× ]/.test(prev)) continue;
    }

    let j = i + 1;
    while (j < input.length && /\s/.test(input[j])) j += 1;

    const atEnd = j >= input.length;
    const nextChar = input[j] || "";
    const startsNewSentence = atEnd || HEBREW_START.test(nextChar);

    if (!startsNewSentence) continue;

    sentences.push(buf.trimEnd());
    buf = "";
    i = j - 1;
  }

  if (buf.trim()) sentences.push(buf.trimEnd());

  return sentences.length ? sentences : [input];
}

/**
 * Split `**Label:** body` or `Label: body` into label + body when both exist.
 * @param {string} line
 * @returns {{ label: string, body: string }|null}
 */
export function splitLeadingLabel(line) {
  const input = String(line || "").trim();
  if (!input || isStructuredBookLine(input)) return null;
  if (/[*`]/.test(input)) return null;

  const patterns = [
    /^(\*\*[^*]+:\*\*)\s*(.+)$/,
    /^([^:\n]{3,60}:)\s*([\u0590-\u05FF].+)$/,
  ];

  for (const re of patterns) {
    const match = input.match(re);
    if (match?.[2]?.trim()) {
      return {
        label: stripStrayMarkdown(match[1].trim()),
        body: match[2].trim(),
      };
    }
  }

  return null;
}

/**
 * Expand a markdown prose chunk into raw lines (respect single newlines in source).
 * @param {string} chunk
 * @returns {string[]}
 */
export function expandBookProseRawLines(chunk) {
  const trimmed = String(chunk || "").trim();
  if (!trimmed) return [];
  if (!/\r?\n/.test(trimmed)) return [trimmed];
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Format one prose line/chunk into display lines (labels, sentences, structure).
 * @param {string} text
 * @returns {string[]}
 */
export function formatBookProseLine(text) {
  const input = String(text || "").trim();
  if (!input) return [];

  if (/^\*\*[^*]+:\*\*\s*$/.test(input)) {
    return [input];
  }

  const labelParts = splitLeadingLabel(input);
  if (labelParts) {
    return [labelParts.label, ...formatBookProseLine(labelParts.body)];
  }

  if (isStructuredBookLine(input)) {
    return [input];
  }

  return splitBookProseSentences(input);
}

/**
 * Full book prose block → display lines for the renderer.
 * @param {string} chunk
 * @returns {string[]}
 */
export function formatBookProseForDisplay(chunk) {
  const rawLines = expandBookProseRawLines(chunk);
  /** @type {string[]} */
  const out = [];

  for (const raw of rawLines) {
    out.push(...formatBookProseLine(raw));
  }

  return out.filter((line) => line.trim());
}
