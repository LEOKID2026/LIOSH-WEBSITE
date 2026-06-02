/**
 * Verify Grade 4–6 book practice mappings cover all pages and use valid operations.
 * Run: node scripts/verify-math-g456-practice-target.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G4_PAGE_ORDER } from "../lib/learning-book/math-g4-registry.js";
import { MATH_G5_PAGE_ORDER } from "../lib/learning-book/math-g5-registry.js";
import { MATH_G6_PAGE_ORDER } from "../lib/learning-book/math-g6-registry.js";
import { GRADES } from "../utils/math-constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @param {string} gradeKey @param {string[]} pageOrder */
function verifyGrade(gradeKey, pageOrder) {
  const resolverPath = path.join(
    __dirname,
    `../lib/learning-book/resolve-math-${gradeKey}-practice-target.js`
  );
  const resolverSrc = fs.readFileSync(resolverPath, "utf8");
  const ops = new Set(GRADES[gradeKey].operations);
  let ok = true;

  for (const pageId of pageOrder) {
    const keyPattern = new RegExp(`\\b${pageId}\\s*:\\s*\\{\\s*operation:\\s*"([^"]+)"`);
    const match = resolverSrc.match(keyPattern);
    if (!match) {
      console.error(`FAIL [${gradeKey}]: no PAGE_TO_PRACTICE entry for ${pageId}`);
      ok = false;
      continue;
    }
    const operation = match[1];
    if (!ops.has(operation)) {
      console.error(
        `FAIL [${gradeKey}]: operation "${operation}" not in GRADES.${gradeKey} for ${pageId}`
      );
      ok = false;
    }
  }

  if (ok) {
    console.log(`OK [${gradeKey}]: ${pageOrder.length} pages with practice mappings.`);
  }
  return ok;
}

const allOk =
  verifyGrade("g4", MATH_G4_PAGE_ORDER) &&
  verifyGrade("g5", MATH_G5_PAGE_ORDER) &&
  verifyGrade("g6", MATH_G6_PAGE_ORDER);

if (!allOk) process.exit(1);
