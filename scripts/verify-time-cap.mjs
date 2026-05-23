/**
 * Unit test: per-question active-time cap
 *
 * Verifies that the accumulation function caps at exactly 120 s and that
 * all 6 subject master pages reference 120_000 (not 60000) in their cap
 * expressions.
 *
 * Run:  node scripts/verify-time-cap.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── 1. Unit test: cap logic ────────────────────────────────────────────────

const QUESTION_TIME_CAP_MS = 120_000;

function accumulateCapped(elapsedMs) {
  return Math.min(elapsedMs, QUESTION_TIME_CAP_MS);
}

const cases = [
  { elapsedMs: 15_000,  expectedMs: 15_000,  label: "15 s answer" },
  { elapsedMs: 90_000,  expectedMs: 90_000,  label: "90 s answer" },
  { elapsedMs: 120_000, expectedMs: 120_000, label: "exactly 120 s" },
  { elapsedMs: 300_000, expectedMs: 120_000, label: "5 min idle → capped at 120 s" },
  { elapsedMs: 3_600_000, expectedMs: 120_000, label: "1 h idle → capped at 120 s" },
];

let unitPassed = 0;
let unitFailed = 0;
for (const { elapsedMs, expectedMs, label } of cases) {
  const got = accumulateCapped(elapsedMs);
  if (got === expectedMs) {
    console.log(`  PASS  [${label}]  elapsed=${elapsedMs / 1000}s → credited=${got / 1000}s`);
    unitPassed++;
  } else {
    console.error(`  FAIL  [${label}]  expected=${expectedMs / 1000}s  got=${got / 1000}s`);
    unitFailed++;
  }
}

// ─── 2. Cross-subject static check ──────────────────────────────────────────

const MASTERS = [
  "pages/learning/math-master.js",
  "pages/learning/geometry-master.js",
  "pages/learning/hebrew-master.js",
  "pages/learning/english-master.js",
  "pages/learning/science-master.js",
  "pages/learning/moledet-geography-master.js",
];

const CAP_PATTERN_NEW   = /Math\.min\(\s*\w+,\s*120_000\s*\)/;
const CAP_PATTERN_OLD   = /Math\.min\(\s*\w+,\s*60000\s*\)/;

let staticPassed = 0;
let staticFailed = 0;

for (const rel of MASTERS) {
  const abs = resolve(ROOT, rel);
  let src;
  try {
    src = readFileSync(abs, "utf8");
  } catch {
    console.error(`  FAIL  [static] cannot read ${rel}`);
    staticFailed++;
    continue;
  }

  const hasNew = CAP_PATTERN_NEW.test(src);
  const hasOld = CAP_PATTERN_OLD.test(src);

  if (hasNew && !hasOld) {
    console.log(`  PASS  [static] ${rel}  uses 120_000 cap`);
    staticPassed++;
  } else if (!hasNew) {
    console.error(`  FAIL  [static] ${rel}  missing 120_000 cap`);
    staticFailed++;
  } else {
    // hasNew && hasOld — old cap still present somewhere
    console.error(`  FAIL  [static] ${rel}  still has 60000 cap`);
    staticFailed++;
  }
}

// ─── 3. Summary ─────────────────────────────────────────────────────────────

console.log("");
console.log(`Unit tests:   ${unitPassed} passed, ${unitFailed} failed`);
console.log(`Static check: ${staticPassed} passed, ${staticFailed} failed`);

const total = unitFailed + staticFailed;
if (total > 0) {
  console.error(`\n${total} check(s) FAILED`);
  process.exit(1);
} else {
  console.log("\nAll time-cap checks PASSED");
  process.exit(0);
}
