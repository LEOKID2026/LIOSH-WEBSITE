/**
 * Run all worksheet tests — Wave A+.
 * Run: node tests/worksheets/run-all.mjs
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_FILES = [
  "worksheet-sanitize.test.mjs",
  "worksheet-payload-split.test.mjs",
  "worksheet-no-answers-in-html.test.mjs",
  "worksheet-no-metadata-in-html.test.mjs",
  "math-all-operations-selector.test.mjs",
  "math-fraction-print.test.mjs",
  "math-vertical-layout.test.mjs",
  "worksheet-math-practice-format.test.mjs",
  "worksheet-print-layout-math-ltr.test.mjs",
  "worksheet-refresh-questions.test.mjs",
  "worksheet-generator-mcq-preference.test.mjs",
  "geometry-all-topics-selector.test.mjs",
  "geometry-diagram-print.test.mjs",
  "geometry-diagram-coverage.test.mjs",
  "geometry-text-renderer.test.mjs",
  "worksheet-mixed-topics.test.mjs",
  "hebrew-all-topics-selector.test.mjs",
  "hebrew-nikud-passage.test.mjs",
  "hebrew-open-answer-print.test.mjs",
  "english-all-topics-selector.test.mjs",
  "english-ltr-in-rtl.test.mjs",
  "english-phonics-blocked.test.mjs",
  "parent-worksheets-hub.test.mjs",
  "worksheet-include-answers-option.test.mjs",
  "worksheet-preview-no-answers.test.mjs",
  "worksheet-answer-key-fingerprint.test.mjs",
  "worksheet-answer-key-route.test.mjs",
  "worksheet-recommendations-auth.test.mjs",
  "worksheet-recommendations-zero-evidence.test.mjs",
  "worksheet-public-level-labels.test.mjs",
  "worksheet-ready-catalog-integrity.test.mjs",
  "public-worksheets-demo-count.test.mjs",
  "public-worksheets-ready-unchanged.test.mjs",
  "public-worksheets-topic-lock.test.mjs",
  "public-worksheets-math-formats.test.mjs",
  "public-worksheets-no-auth.test.mjs",
  "public-worksheets-no-pii.test.mjs",
  "public-worksheets-rate-limit.test.mjs",
  "public-worksheets-catalog-parity.test.mjs",
  "public-worksheets-preview-empty.test.mjs",
  "worksheets-seo-page-qa.mjs",
  "worksheet-system-closure.test.mjs",
];

/**
 * @param {string} file
 * @returns {Promise<number>}
 */
function runTest(file) {
  return new Promise((resolve) => {
    const full = path.join(__dirname, file);
    const child = spawn(process.execPath, ["--test", full], {
      stdio: "inherit",
      shell: false,
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

let failed = 0;
for (const file of TEST_FILES) {
  console.log(`\n--- ${file} ---`);
  const code = await runTest(file);
  if (code !== 0) failed += 1;
}

if (failed > 0) {
  console.error(`\nworksheet tests: ${failed} file(s) failed`);
  process.exit(1);
}

console.log("\nworksheet tests: all passed");
