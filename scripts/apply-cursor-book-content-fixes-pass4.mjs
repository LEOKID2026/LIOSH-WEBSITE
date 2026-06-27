/**
 * Pass 4: fix broken quote lines + split מ.א.ח in page txt only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_ROOT = path.join(__dirname, "..", "exports", "audio-text", "books");

/** @type {{ quotes: string[], mac: string[] }} */
const changed = { quotes: [], mac: [] };

function walkPageTxt(dir) {
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
 * @returns {string}
 */
function fixBrokenQuotes(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  /** @type {string[]} */
  const out = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    const t = trimmed.trim();

    if (out.length && (t === '"' || t === '"?' || t === '"!' || t === '".')) {
      out[out.length - 1] = out[out.length - 1] + t;
      continue;
    }

    out.push(trimmed);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

/**
 * @param {string} text
 * @returns {string}
 */
function fixMacSplit(text) {
  return text
    .replace(/מ\.\s*\n\s*א\.\s*\n\s*ח\./g, "מ.א.ח.")
    .replace(/מ\.\s*\n\s*א\.\s*\n\s*ח/g, "מ.א.ח");
}

function isMathBook(file) {
  return /[\\/]math-g[456][\\/]/.test(file);
}

for (const file of walkPageTxt(BOOKS_ROOT)) {
  const original = fs.readFileSync(file, "utf8");
  let text = original;

  const afterQuotes = fixBrokenQuotes(text);
  if (afterQuotes !== text) {
    changed.quotes.push(path.relative(BOOKS_ROOT, file).replaceAll("\\", "/"));
    text = afterQuotes;
  }

  if (isMathBook(file)) {
    const afterMac = fixMacSplit(text);
    if (afterMac !== text) {
      changed.mac.push(path.relative(BOOKS_ROOT, file).replaceAll("\\", "/"));
      text = afterMac;
    }
  }

  if (text !== original) {
    fs.writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`, "utf8");
  }
}

console.log(
  JSON.stringify(
    {
      quotePagesFixed: changed.quotes.length,
      macPagesFixed: changed.mac.length,
      quotePages: changed.quotes,
      macPages: changed.mac,
    },
    null,
    2
  )
);
