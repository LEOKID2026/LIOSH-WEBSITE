#!/usr/bin/env node
/**
 * Cleanup mass virtual-students QA run — deletes ONLY data tagged with runId.
 *
 *   node --env-file=.env.local scripts/qa/cleanup-mass-virtual-students.mjs --runId=<runId>
 *   node --env-file=.env.local scripts/qa/cleanup-mass-virtual-students.mjs --runId=<runId> --execute
 */
import { parseMassSimulationCli } from "./lib/mass-virtual-students/config.mjs";
import { cleanupMassSimulationRun } from "./lib/mass-virtual-students/cleanup.mjs";

function parseRunIdArg(argv) {
  const hit = argv.find((a) => a.startsWith("--runId="));
  if (!hit) throw new Error("Missing --runId=<runId>");
  return hit.slice("--runId=".length);
}

async function main() {
  const argv = process.argv.slice(2);
  const runId = parseRunIdArg(argv);
  const execute = argv.includes("--execute");
  const cfg = parseMassSimulationCli(argv);

  const result = await cleanupMassSimulationRun(runId, {
    execute,
    emailDomain: cfg.emailDomain,
  });

  console.log(JSON.stringify(result, null, 2));
  if (!execute) {
    console.log("Dry-run only. Re-run with --execute to delete.");
  }
}

main().catch((err) => {
  console.error("FATAL", err?.message || err);
  process.exit(1);
});
