import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BOOKS_ROOT = path.join(__dirname, "..", "..", "exports", "audio-text", "books");

/** Cross-line broken quote: opening ", text, newline, orphan closing " (not start of next quoted phrase). */
export const BROKEN_QUOTE_RE =
  /"([^"\n]+)\n"(?!\??[^\S\n]*[\u0590-\u05FF"A-Za-z0-9])(\??[^\S\n]*(?:—|→)?[^\S\n]*)/g;

export function walkPageTxt(dir) {
  /** @type {string[]} */
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out.push(...walkPageTxt(p));
    else if (/^page-\d+\.txt$/.test(name)) out.push(p);
  }
  return out;
}

/**
 * @param {string} text
 * @returns {number}
 */
export function countBrokenQuotesInText(text) {
  return (text.match(BROKEN_QUOTE_RE) || []).length;
}

/**
 * @param {string} text
 * @returns {{ text: string, count: number }}
 */
export function fixBrokenCrossLineQuotes(text) {
  let count = 0;
  const fixed = text.replace(BROKEN_QUOTE_RE, (match, inner, trailing) => {
    count += 1;
    return `"${inner}"${trailing}`;
  });
  return { text: fixed, count };
}

/**
 * @param {string} [root]
 */
export function scanBrokenQuotes(root = BOOKS_ROOT) {
  /** @type {{ file: string, count: number }[]} */
  const hits = [];
  let total = 0;

  function walk(d) {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      const s = fs.statSync(p);
      if (s.isDirectory()) walk(p);
      else if (/page-\d+\.txt$|book-full\.md$/.test(n)) {
        const t = fs.readFileSync(p, "utf8");
        const c = countBrokenQuotesInText(t);
        if (c) {
          hits.push({ file: p, count: c });
          total += c;
        }
      }
    }
  }

  walk(root);
  return { total, hits };
}
