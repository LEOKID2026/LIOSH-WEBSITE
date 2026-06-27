import fs from "node:fs";
import path from "node:path";

const root = "exports/audio-text/books";
const pats = [/""/g, /✓["“]/g, /[?!]["”]["“]/g, /[.!?]["”][\u0590-\u05FFA-Za-z]/g];
const hits = [];

function walk(d) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/page-\d+\.txt$|book-full\.md$/.test(n)) {
      const t = fs.readFileSync(p, "utf8");
      for (const re of pats) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(t))) {
          hits.push(
            `${p}: ${t.slice(Math.max(0, m.index - 60), Math.min(t.length, m.index + 120)).replace(/\n/g, "\\n")}`
          );
        }
      }
    }
  }
}

walk(root);
console.log(hits.join("\n"));
console.error(`joinedQuoteIssues=${hits.length}`);
process.exit(hits.length ? 1 : 0);
