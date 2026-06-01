/**
 * Apply normalizePracticeSectionBody to section 7 in all G1/G2 draft markdown files.
 * Run: node scripts/normalize-math-book-practice-sections.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G1_PAGE_ORDER } from "../lib/learning-book/math-g1-registry.js";
import { MATH_G2_PAGE_ORDER } from "../lib/learning-book/math-g2-registry.js";
import { normalizePracticeSectionBody } from "../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const headerRe = /^## (\d+)\.\s*(.+)$/gm;

function normalizeFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const headers = [];
  let match;
  while ((match = headerRe.exec(raw)) !== null) {
    const number = Number(match[1]);
    if (number < 1 || number > 7) continue;
    headers.push({
      number,
      bodyStart: headerRe.lastIndex,
      headerStart: match.index,
    });
  }

  const sec7 = headers.find((h) => h.number === 7);
  if (!sec7) return false;

  const nextStart = headers.find((h) => h.headerStart > sec7.headerStart)?.headerStart ?? raw.length;
  const body = raw.slice(sec7.bodyStart, nextStart).trim();
  const normalized = normalizePracticeSectionBody(body);
  if (normalized === body) return false;

  const updated =
    raw.slice(0, sec7.bodyStart) +
    "\n\n" +
    normalized +
    "\n" +
    raw.slice(nextStart);
  fs.writeFileSync(filePath, updated, "utf8");
  return true;
}

let changed = 0;
for (const [order, rel] of [
  [MATH_G1_PAGE_ORDER, "docs/learning-book/math/g1/drafts"],
  [MATH_G2_PAGE_ORDER, "docs/learning-book/math/g2/drafts"],
]) {
  for (const pageId of order) {
    const filePath = path.join(ROOT, rel, `${pageId}.md`);
    if (normalizeFile(filePath)) {
      changed += 1;
      console.log("updated:", `${rel}/${pageId}.md`);
    }
  }
}

console.log(`Done. ${changed} file(s) updated.`);
