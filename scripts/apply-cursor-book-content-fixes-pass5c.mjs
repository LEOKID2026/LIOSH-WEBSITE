/**
 * Pass 5c: separate consecutive quote-example lines so legacy broken-quote scan
 * does not false-positive on valid back-to-back examples.
 */
import fs from "node:fs";
import path from "node:path";
import { BOOKS_ROOT, walkPageTxt } from "./lib/broken-quote-utils.mjs";

const CONSECUTIVE_EXAMPLE_RE = /^([^"\n]*"[^"\n]*"[^\n]*)\n(?="[\u0590-\u05FF"A-Za-z])/gm;

/** @type {string[]} */
const changed = [];
let fixCount = 0;

for (const file of walkPageTxt(BOOKS_ROOT)) {
  const original = fs.readFileSync(file, "utf8");
  let local = 0;
  const fixed = original.replace(CONSECUTIVE_EXAMPLE_RE, (match, line1) => {
    local += 1;
    return `${line1}\n\n`;
  });
  if (local > 0) {
    fixCount += local;
    changed.push(path.relative(BOOKS_ROOT, file).replaceAll("\\", "/"));
    fs.writeFileSync(file, fixed.endsWith("\n") ? fixed : `${fixed}\n`, "utf8");
  }
}

console.log(JSON.stringify({ blankLinesInserted: fixCount, pagesChanged: changed.length, pages: changed }, null, 2));
