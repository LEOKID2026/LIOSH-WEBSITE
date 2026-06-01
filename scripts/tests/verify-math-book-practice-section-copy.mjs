/**
 * Section 7 practice preview copy — no "בואו נתרגל —" prefix, no decorative quotes.
 * Run: node scripts/tests/verify-math-book-practice-section-copy.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G1_PAGE_ORDER } from "../../lib/learning-book/math-g1-registry.js";
import { MATH_G2_PAGE_ORDER } from "../../lib/learning-book/math-g2-registry.js";
import {
  normalizePracticeSectionBody,
  parseLearningPageMarkdown,
} from "../../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

let failures = 0;

function fail(msg) {
  failures += 1;
  console.error("FAIL:", msg);
}

{
  const raw = normalizePracticeSectionBody(
    'בואו נתרגל — בתרגול תמצאו שאלות "כמה מאות? כמה עשרות? כמה אחדות?". התחילו תמיד מהספרה השמאלית!'
  );
  const expected =
    "בתרגול תמצאו שאלות כמה מאות? כמה עשרות? כמה אחדות? התחילו תמיד מהספרה השמאלית!";
  if (raw !== expected) {
    fail(`canonical normalize: expected "${expected}", got "${raw}"`);
  }
}

function checkBookPages(pageOrder, draftsRel) {
  const draftsDir = path.join(ROOT, draftsRel);
  for (const pageId of pageOrder) {
    const raw = fs.readFileSync(path.join(draftsDir, `${pageId}.md`), "utf8");
    const page = parseLearningPageMarkdown(raw, pageId);
    const sec7 = page.sections.find((s) => s.number === 7);
    if (!sec7) {
      fail(`${pageId}: missing section 7`);
      continue;
    }
    if (/בואו נתרגל\s*[—–-]/u.test(sec7.body)) {
      fail(`${pageId} §7: still contains "בואו נתרגל —" after parse`);
    }
    if (/[\u201C\u201D\u201E\u00AB\u00BB"]/u.test(sec7.body)) {
      fail(`${pageId} §7: decorative quotes remain in "${sec7.body.slice(0, 80)}..."`);
    }
    if (/\?\./u.test(sec7.body)) {
      fail(`${pageId} §7: orphan ?. sequence in body`);
    }
  }
}

checkBookPages(MATH_G1_PAGE_ORDER, "docs/learning-book/math/g1/drafts");
checkBookPages(MATH_G2_PAGE_ORDER, "docs/learning-book/math/g2/drafts");

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}

console.log(
  `OK: practice section copy — ${MATH_G1_PAGE_ORDER.length + MATH_G2_PAGE_ORDER.length} pages.`
);
