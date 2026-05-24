/**
 * Longitudinal state for teacher classroom simulation.
 * Separate from virtual-student-qa state (%LOCALAPPDATA%\\liosh-qa\\virtual-student-state).
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { PERSONA_SLOTS } from "./personas.mjs";

export const STATE_VERSION = 2;
export const MANIFEST_FILENAME = "manifest.json";

export function manifestPath(stateDir) {
  return join(stateDir, MANIFEST_FILENAME);
}

export function statePath(stateDir) {
  return join(stateDir, "state.json");
}

export function ensureStateDir(stateDir) {
  mkdirSync(stateDir, { recursive: true });
}

export function loadManifest(stateDir) {
  const file = manifestPath(stateDir);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function saveManifest(stateDir, manifest) {
  ensureStateDir(stateDir);
  const file = manifestPath(stateDir);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(manifest, null, 2), "utf8");
  renameSync(tmp, file);
}

export function defaultState() {
  const students = {};
  for (const slot of PERSONA_SLOTS) {
    students[String(slot).padStart(2, "0")] = {
      defaultProfile: null,
      attendance: [],
      lastAccuracy: null,
    };
  }
  return {
    version: STATE_VERSION,
    runs: [],
    students,
  };
}

export function loadState(stateDir) {
  ensureStateDir(stateDir);
  const file = statePath(stateDir);
  if (!existsSync(file)) {
    return { state: defaultState(), fresh: true };
  }
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const merged = { ...defaultState(), ...parsed, students: { ...defaultState().students, ...(parsed.students || {}) } };
    return { state: merged, fresh: false };
  } catch {
    return { state: defaultState(), fresh: true, parseError: true };
  }
}

export function saveState(stateDir, state) {
  ensureStateDir(stateDir);
  const file = statePath(stateDir);
  const bak = `${file}.bak`;
  if (existsSync(file)) {
    try {
      renameSync(file, bak);
    } catch {
      // ignore
    }
  }
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, file);
}

export function isAlreadyRun(state, { date, grade, subject }) {
  return (state.runs || []).some(
    (r) =>
      r.date === date &&
      r.grade === grade &&
      r.subject === subject &&
      (r.status === "pass" || r.status === "partial")
  );
}

export function recordRun(state, runRecord) {
  const next = { ...state, runs: [...(state.runs || []), runRecord] };
  return next;
}
