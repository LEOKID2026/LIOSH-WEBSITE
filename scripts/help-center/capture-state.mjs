/**
 * Cross-batch capture state (SHA-256 per manifest job).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const statePath = join(root, "data", "help-center", "_capture-state.json");

/** @param {{ section: string, slug: string, region: string, viewport: string }} job */
export function jobKey(job) {
  return `${job.section}/${job.slug}/${job.viewport}/${job.region}`;
}

export function loadCaptureState() {
  if (!existsSync(statePath)) return { version: 1, jobs: {} };
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return { version: 1, jobs: {} };
  }
}

export function saveCaptureState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/**
 * @returns {string|null} duplicate owner key if hash already used by another job
 */
export function checkDuplicateHash(state, key, sha256) {
  for (const [otherKey, meta] of Object.entries(state.jobs || {})) {
    if (otherKey !== key && meta.sha256 === sha256) return otherKey;
  }
  return null;
}

export function recordCapture(state, key, { sha256, batch, filePath }) {
  state.jobs[key] = {
    sha256,
    batch,
    filePath,
    capturedAt: new Date().toISOString(),
  };
  return state;
}
