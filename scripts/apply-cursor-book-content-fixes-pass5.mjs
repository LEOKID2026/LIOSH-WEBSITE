/**
 * Pass 5: fix quotes broken across two lines: "text\n" → "text"
 * Only modifies page txt files under exports/audio-text/books
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOOKS_ROOT,
  countBrokenQuotesInText,
  fixBrokenCrossLineQuotes,
  scanBrokenQuotes,
  walkPageTxt,
} from "./lib/broken-quote-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export { countBrokenQuotesInText, fixBrokenCrossLineQuotes, scanBrokenQuotes };

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  /** @type {string[]} */
  const changed = [];
  let fixCount = 0;

  for (const file of walkPageTxt(BOOKS_ROOT)) {
    const original = fs.readFileSync(file, "utf8");
    const { text, count } = fixBrokenCrossLineQuotes(original);
    if (count > 0) {
      fixCount += count;
      changed.push(path.relative(BOOKS_ROOT, file).replaceAll("\\", "/"));
      fs.writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`, "utf8");
    }
  }

  console.log(
    JSON.stringify(
      {
        brokenQuotesFixed: fixCount,
        pagesChanged: changed.length,
        pages: changed,
      },
      null,
      2
    )
  );
}
