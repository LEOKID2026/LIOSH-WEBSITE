/**
 * Scoped AAA simulation timestamp repair from run-summary artifacts.
 *
 * Default: dry-run (read-only diagnosis + planned shifts).
 * Execute: --execute (requires explicit operator approval; backs up first).
 *
 * Only touches session IDs recorded in PASS run-summary.json artifacts.
 * Never applies broad date-range patches.
 *
 * Usage:
 *   node scripts/virtual-student-qa/scripts/repair-aaa-simulation-timestamps.mjs \
 *     --from 2026-05-01 --to 2026-05-21 --dry-run
 *   node scripts/virtual-student-qa/scripts/repair-aaa-simulation-timestamps.mjs \
 *     --from 2026-05-01 --to 2026-05-21 --execute
 */
import { join } from "node:path";
import {
  diagnoseTimestampRepair,
  executeTimestampRepair,
} from "../lib/simulation-timestamp-repair.mjs";

function parseArgs(argv) {
  const out = {
    from: "2026-05-01",
    to: null,
    dryRun: true,
    execute: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from") out.from = argv[++i];
    else if (a === "--to") out.to = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--execute") {
      out.execute = true;
      out.dryRun = false;
    }
  }
  if (!out.to) {
    throw new Error("--to YYYY-MM-DD is required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out.from) || !/^\d{4}-\d{2}-\d{2}$/.test(out.to)) {
    throw new Error("--from and --to must be YYYY-MM-DD");
  }
  if (out.from > out.to) {
    throw new Error("--from must be <= --to");
  }
  return out;
}

const args = parseArgs(process.argv);
const diagnosis = await diagnoseTimestampRepair({ from: args.from, to: args.to });

if (args.dryRun || !args.execute) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        ...diagnosis,
        message:
          diagnosis.mappingReliable
            ? "Mapping reliable. Re-run with --execute to apply scoped timestamp repair."
            : "Mapping incomplete or DB rows missing. Repair by sessionId is NOT safe until rows exist.",
      },
      null,
      2
    )
  );
  process.exit(diagnosis.mappingReliable ? 0 : 1);
}

if (!diagnosis.mappingReliable) {
  console.error(
    JSON.stringify(
      {
        mode: "execute-refused",
        reason: "mappingReliable=false",
        ...diagnosis,
      },
      null,
      2
    )
  );
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = join(
  process.env.LOCALAPPDATA || "",
  "liosh-qa",
  "backups",
  `aaa-timestamp-repair-${args.from}__${args.to}-${stamp}`
);

const result = await executeTimestampRepair({
  from: args.from,
  to: args.to,
  backupDir,
});

console.log(JSON.stringify({ mode: "executed", ...result, diagnosis }, null, 2));
