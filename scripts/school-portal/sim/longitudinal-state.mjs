/**
 * School sim longitudinal state (repo sim-state.json + optional timeline).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSimState, mergeSimState, saveSimState } from "../demo-school-lib.mjs";
import { buildStudentProfiles } from "./persona-model.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getSimStatePath() {
  return path.join(__dirname, "..", "sim-state.json");
}

export function loadSchoolSimState() {
  return loadSimState();
}

export function saveSchoolSimState(state) {
  saveSimState(state);
}

export function mergeSchoolSimState(patch) {
  return mergeSimState(patch);
}

export function ensurePersonaMaps(state) {
  const studentIds = state.studentIds || [];
  if (
    state.studentProfiles &&
    Object.keys(state.studentProfiles).length >= studentIds.length * 0.9
  ) {
    return state;
  }
  const { profiles, weakSubjects, improvingDayBoost } = buildStudentProfiles(studentIds);
  return mergeSimState({
    studentProfiles: profiles,
    studentWeakSubjects: weakSubjects,
    improvingDayBoost,
  });
}

export function appendTimelineRow(line) {
  const timelinePath = path.join(__dirname, "..", "timeline-school-sim.md");
  const stamp = new Date().toISOString();
  const row = `| ${stamp.slice(0, 10)} | ${line} |\n`;
  if (!fs.existsSync(timelinePath)) {
    fs.writeFileSync(
      timelinePath,
      "# School sim timeline\n\n| date | note |\n|------|------|\n",
      "utf8"
    );
  }
  fs.appendFileSync(timelinePath, row, "utf8");
}

export function isDayAlreadyRun(state, calendarDate, { force = false } = {}) {
  if (force) return false;
  const last = state.lastSimCalendarDate;
  if (last && last === calendarDate) return true;
  return false;
}
