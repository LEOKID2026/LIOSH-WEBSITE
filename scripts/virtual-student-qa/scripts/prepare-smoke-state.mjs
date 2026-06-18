/**
 * Prepare local state for realistic smoke on 2026-05-01 (no DB changes).
 * Backs up state.json and sets lastRunDate=2026-04-30 so date-guard allows smoke.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { resolveStateDir } from "../lib/config.mjs";

const TARGET_LAST_RUN = "2026-04-30";

const stateDir = resolveStateDir();
const statePath = join(stateDir, "state.json");
if (!existsSync(statePath)) {
  throw new Error(`state.json not found at ${statePath}`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = join(
  process.env.LOCALAPPDATA || "",
  "liosh-qa",
  "backups",
  `pre-smoke-state-${stamp}`
);
mkdirSync(backupDir, { recursive: true });
const backupPath = join(backupDir, "state.json.bak");
copyFileSync(statePath, backupPath);

const state = JSON.parse(readFileSync(statePath, "utf8"));
const before = { lastRunDate: state.lastRunDate, lastRunStatus: state.lastRunStatus };
state.lastRunDate = TARGET_LAST_RUN;
state.lastRunStatus = "pass";
writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");

console.log(
  JSON.stringify(
    {
      prepared: true,
      backupPath,
      before,
      after: { lastRunDate: state.lastRunDate, lastRunStatus: state.lastRunStatus },
      note: "Local state only — DB untouched. Use for smoke on 2026-05-01.",
    },
    null,
    2
  )
);
