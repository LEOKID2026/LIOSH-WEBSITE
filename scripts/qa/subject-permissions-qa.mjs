#!/usr/bin/env node
/**
 * Offline QA checks for subject permissions (no live DB).
 * Run: node scripts/qa/subject-permissions-qa.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePermissionSubjectKey } from "../../lib/learning/subject-permissions/subject-key-map.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const tests = [
  "scripts/test/subject-grade-defaults.test.mjs",
  "scripts/test/resolve-effective-content-grade.test.mjs",
];

let failed = 0;
for (const rel of tests) {
  const abs = path.join(root, rel);
  const result = spawnSync(process.execPath, [abs], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) failed += 1;
}

assertMapping("moledet_geography", "moledet", "moledet");
assertMapping("moledet_geography", "geography", "geography");
assertMapping("math", null, "math");

function assertMapping(subject, strand, expected) {
  const got = resolvePermissionSubjectKey({ subject, visualStrand: strand });
  if (got !== expected) {
    console.error(`mapping failed: ${subject}+${strand} => ${got}, expected ${expected}`);
    failed += 1;
  }
}

if (failed) {
  console.error(`subject-permissions-qa: ${failed} failure(s)`);
  process.exit(1);
}
console.log("subject-permissions-qa: all checks passed");
