/**
 * User-facing broken-quote scan (pages + book-full.md).
 * Uses precise orphan-close detection (not naive \s* after closing quote).
 */
import { scanBrokenQuotes } from "./lib/broken-quote-utils.mjs";

const { total, hits } = scanBrokenQuotes();
for (const h of hits) {
  console.log(h.file, h.count);
}
console.log(`brokenQuoteCount=${total}`);
process.exit(total ? 1 : 0);
