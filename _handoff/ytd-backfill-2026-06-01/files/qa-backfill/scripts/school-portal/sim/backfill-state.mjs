/**
 * Sandbox backfill state — separate from sim-state.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const STATE_DIR = path.join(REPO_ROOT, ".local", "backfill-state");

export function backfillStateKey(fromIso, toIso) {
  return `${fromIso}__${toIso}`;
}

export function backfillStatePath(fromIso, toIso) {
  return path.join(STATE_DIR, `${backfillStateKey(fromIso, toIso)}.json`);
}

export function backfillLockPath(fromIso, toIso) {
  return path.join(STATE_DIR, `${backfillStateKey(fromIso, toIso)}.lock`);
}

export function defaultBackfillState(fromIso, toIso) {
  return {
    fromDate: fromIso,
    toDate: toIso,
    completedDates: [],
    improvingDayBoost: {},
    homePracticeByStudent: {},
    statusRowsCreated: 0,
    attemptRowsCreated: 0,
    homePracticeSessionsCreated: 0,
    homePracticeAnswersCreated: 0,
    activitiesCreated: 0,
    schoolDaysSimulated: 0,
    daysSkipped: 0,
    skipReasons: { weekend: 0, alreadyExists: 0 },
  };
}

export function loadBackfillState(fromIso, toIso) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const p = backfillStatePath(fromIso, toIso);
  if (!fs.existsSync(p)) return defaultBackfillState(fromIso, toIso);
  return { ...defaultBackfillState(fromIso, toIso), ...JSON.parse(fs.readFileSync(p, "utf8")) };
}

export function saveBackfillState(fromIso, toIso, state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(backfillStatePath(fromIso, toIso), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function mergeBackfillState(fromIso, toIso, patch) {
  const current = loadBackfillState(fromIso, toIso);
  const next = { ...current, ...patch };
  saveBackfillState(fromIso, toIso, next);
  return next;
}

export function acquireBackfillLock(fromIso, toIso) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const lockPath = backfillLockPath(fromIso, toIso);
  if (fs.existsSync(lockPath)) {
    throw new Error(
      `Backfill lock exists at ${lockPath}. Another backfill or daily sim may be running. Remove lock only if sure.`
    );
  }
  fs.writeFileSync(
    lockPath,
    `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8"
  );
  return lockPath;
}

export function releaseBackfillLock(fromIso, toIso) {
  const lockPath = backfillLockPath(fromIso, toIso);
  if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
}
