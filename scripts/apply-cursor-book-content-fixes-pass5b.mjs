/**
 * Pass 5b: restore newlines accidentally merged when fixing cross-line quotes.
 * Inserts newline before a quote that follows a period without space: ."text → .\n"text
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BOOKS_ROOT, walkPageTxt } from "./lib/broken-quote-utils.mjs";

const GLUED_AFTER_PERIOD_RE = /\."(?=[\u0590-\u05FF"A-Za-z])/g;

/** @type {string[]} */
const changed = [];
let fixCount = 0;

for (const file of walkPageTxt(BOOKS_ROOT)) {
  const original = fs.readFileSync(file, "utf8");
  const fixed = original.replace(GLUED_AFTER_PERIOD_RE, '.\n"');
  const count = (original.match(GLUED_AFTER_PERIOD_RE) || []).length;
  if (count > 0) {
    fixCount += count;
    changed.push(path.relative(BOOKS_ROOT, file).replaceAll("\\", "/"));
    fs.writeFileSync(file, fixed.endsWith("\n") ? fixed : `${fixed}\n`, "utf8");
  }
}

console.log(JSON.stringify({ gluedLinesFixed: fixCount, pagesChanged: changed.length, pages: changed }, null, 2));
