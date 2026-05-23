#!/usr/bin/env node
/**
 * Run Phase C scenarios one-by-one for Help Center demo student (fresh browser each).
 *   node scripts/help-center/run-phase-c-populate.mjs
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCENARIOS = [
  "math-average",
  "math-weak",
  "math-targeted",
  "geometry-average",
  "hebrew-average",
  "english-average",
  "science-average",
  "moledet-geography-average",
];

const PAUSE_MS = Number(process.env.HELP_POPULATE_PAUSE_MS || 15_000);

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const runner = join(root, "scripts", "virtual-student-qa", "run.mjs");
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const childEnv = { ...process.env };

const summary = [];
for (const id of SCENARIOS) {
  console.log(`\n========== ${id} ==========`);
  const r = spawnSync(
    process.execPath,
    [runner, "--phase", "c", "--student", "help-demo", "--scenarios", id, "--base-url", baseUrl],
    { cwd: root, stdio: "inherit", env: childEnv }
  );
  summary.push({ id, exit: r.status ?? 1 });
  if (PAUSE_MS > 0) {
    console.log(`(pause ${PAUSE_MS}ms before next scenario)`);
    await sleep(PAUSE_MS);
  }
}

console.log("\n========== summary ==========");
for (const row of summary) {
  console.log(`${row.id}: exit ${row.exit}`);
}
const failed = summary.filter((r) => r.exit !== 0);
process.exit(failed.length ? 1 : 0);
