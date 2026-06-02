/**
 * Verify Grade 3 book practice mappings cover all pages and use valid g3 operations.
 * Run: node scripts/verify-math-g3-practice-target.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G3_PAGE_ORDER } from "../lib/learning-book/math-g3-registry.js";
import { GRADES } from "../utils/math-constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolverPath = path.join(
  __dirname,
  "../lib/learning-book/resolve-math-g3-practice-target.js"
);
const resolverSrc = fs.readFileSync(resolverPath, "utf8");
const g3Ops = new Set(GRADES.g3.operations);
let ok = true;

for (const pageId of MATH_G3_PAGE_ORDER) {
  const keyPattern = new RegExp(`\\b${pageId}\\s*:\\s*\\{\\s*operation:\\s*"([^"]+)"`);
  const match = resolverSrc.match(keyPattern);
  if (!match) {
    console.error(`FAIL: no PAGE_TO_PRACTICE entry for ${pageId}`);
    ok = false;
    continue;
  }
  const operation = match[1];
  if (!g3Ops.has(operation)) {
    console.error(
      `FAIL: operation "${operation}" not in GRADES.g3 for ${pageId}`
    );
    ok = false;
  }
}

if (!ok) process.exit(1);

console.log(`OK: ${MATH_G3_PAGE_ORDER.length} G3 pages with practice mappings.`);
