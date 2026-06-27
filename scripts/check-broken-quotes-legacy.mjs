import fs from "node:fs";
import path from "node:path";

const root = "exports/audio-text/books";
let count = 0;
function walk(d) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/page-\d+\.txt$|book-full\.md$/.test(n)) {
      const t = fs.readFileSync(p, "utf8");
      const hits = t.match(/"[^"\n]*\n"\s*/g) || [];
      if (hits.length) {
        console.log(p, hits.length);
        count += hits.length;
      }
    }
  }
}
walk(root);
console.log("brokenQuoteCount=", count);
process.exit(count ? 1 : 0);
