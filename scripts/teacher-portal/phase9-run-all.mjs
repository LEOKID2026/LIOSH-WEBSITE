#!/usr/bin/env node
/**
 * Phase 9 — run security smoke + phase smokes + build; aggregate PASS/FAIL.
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase9-run-all.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

const suites = [
  { name: "phase9-security", cmd: "scripts/teacher-portal/phase9-security-smoke.mjs" },
  { name: "phase4-live-verify", cmd: "scripts/teacher-portal/phase4-live-verify.mjs" },
  { name: "phase5a", cmd: "scripts/teacher-portal/phase5a-smoke.mjs" },
  { name: "phase5b", cmd: "scripts/teacher-portal/phase5b-smoke.mjs" },
  { name: "phase6", cmd: "scripts/teacher-portal/phase6-smoke.mjs" },
  { name: "phase7", cmd: "scripts/teacher-portal/phase7-smoke.mjs" },
  { name: "phase7b", cmd: "scripts/teacher-portal/phase7b-smoke.mjs" },
  { name: "phase8", cmd: "scripts/teacher-portal/phase8-smoke.mjs" },
  { name: "npm-build", cmd: null, npm: "run build" },
];

const envArgs = ["--env-file=.env.local", "--env-file=.env.e2e.local"];
const results = [];

for (const suite of suites) {
  const started = Date.now();
  let r;
  if (suite.npm) {
    r = spawnSync("npm", suite.npm.split(" "), {
      cwd: root,
      encoding: "utf8",
      shell: true,
      env: { ...process.env, TEACHER_PORTAL_ENABLED: "true", GUARDIAN_PORTAL_ENABLED: "true" },
    });
  } else {
    r = spawnSync("node", [...envArgs, suite.cmd], {
      cwd: root,
      encoding: "utf8",
      shell: true,
      env: {
        ...process.env,
        TEACHER_PORTAL_ENABLED: "true",
        GUARDIAN_PORTAL_ENABLED: "true",
        TEACHER_PORTAL_LINK_ENABLED: "true",
      },
    });
  }
  const pass = r.status === 0;
  results.push({
    name: suite.name,
    pass,
    exitCode: r.status,
    ms: Date.now() - started,
    tail: (r.stdout || r.stderr || "").split("\n").slice(-4).join("\n").trim(),
  });
}

console.log("\nPhase 9 run-all summary:\n");
for (const row of results) {
  console.log(`${row.pass ? "PASS" : "FAIL"}  ${row.name} (${row.ms}ms) exit=${row.exitCode}`);
  if (!row.pass && row.tail) console.log(`       ${row.tail.replace(/\n/g, "\n       ")}`);
}
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} suites PASS\n`);
process.exit(failed.length ? 1 : 0);
