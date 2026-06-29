/**
 * Verify Grade 6 History learning book registry + draft presence.
 * Run: node scripts/verify-history-g6-book.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  HISTORY_G6_PAGE_ORDER,
  HISTORY_G6_BOOK_META,
} from "../lib/learning-book/history-g6-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/history/g6/drafts");

const errors = [];
/** @type {string[]} */
const warnings = [];

if (HISTORY_G6_BOOK_META.subject !== "history" || HISTORY_G6_BOOK_META.grade !== "g6") {
  errors.push("HISTORY_G6_BOOK_META subject/grade mismatch");
}

const expectedPages = [
  "what_is_history",
  "classical_greece",
  "hellenism_jews",
  "hasmonaeans",
  "rome_jews",
];

for (const pageId of expectedPages) {
  if (!HISTORY_G6_PAGE_ORDER.includes(pageId)) {
    errors.push(`Missing page in HISTORY_G6_PAGE_ORDER: ${pageId}`);
  }
}

let draftCount = 0;
for (const pageId of HISTORY_G6_PAGE_ORDER) {
  const filePath = path.join(DRAFTS_DIR, `${pageId}.md`);
  if (!fs.existsSync(filePath)) {
    warnings.push(`Missing draft (non-blocking): ${pageId}.md`);
    continue;
  }
  draftCount++;
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) errors.push(`${pageId}.md is empty`);
  if (!/[\u0590-\u05FF]/.test(raw)) errors.push(`${pageId}.md must contain Hebrew content`);
}

if (draftCount === 0) {
  errors.push("No history G6 draft pages found on disk");
}

if (errors.length) {
  console.error("G6 History book verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  if (warnings.length) {
    console.error("\nWarnings:\n" + warnings.map((w) => `  - ${w}`).join("\n"));
  }
  process.exit(1);
}

console.log(`G6 History book verification PASSED: ${HISTORY_G6_PAGE_ORDER.length} registry pages, ${draftCount} drafts on disk.`);
if (warnings.length) {
  console.log("Warnings:\n" + warnings.map((w) => `  - ${w}`).join("\n"));
}
console.log(`- registry: history:g6:{topic}`);
console.log(`- drafts dir: ${DRAFTS_DIR}`);
