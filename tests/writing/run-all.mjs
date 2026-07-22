/**
 * Run all writing tests.
 * Run: node tests/writing/run-all.mjs
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_FILES = [
  "writing-catalog-integrity.test.mjs",
  "worksheet-type-registry-extensibility.test.mjs",
  "writing-payload-integrity.test.mjs",
  "writing-session-ttl.test.mjs",
  "writing-public-demo-allowlist.test.mjs",
  "writing-asset-quality.test.mjs",
  "writing-hebrew-print-approved-assets.test.mjs",
  "writing-trace-mode.test.mjs",
  "writing-print-integrity.test.mjs",
  "writing-asset-http.test.mjs",
  "writing-render-all.test.mjs",
];

function run(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, file)], {
      stdio: "inherit",
      cwd: path.resolve(__dirname, "../.."),
    });
    child.on("exit", (code) => (code === 0 ? resolve(undefined) : reject(new Error(`${file} failed`))));
  });
}

for (const file of TEST_FILES) {
  await run(file);
}
console.log("All writing tests passed.");
