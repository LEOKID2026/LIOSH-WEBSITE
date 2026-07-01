/**
 * Final subject simulation — 7 launch subjects (incl. history + moledet-geography).
 * Display levels: רגיל / מתקדם (science = regular only).
 */
import { FINAL_LAUNCH_SUBJECTS_CLI } from "../mass-virtual-students/subject-registry.mjs";
import { SUBJECT_LABELS_HE } from "../mass-virtual-students/constants.mjs";
import { isScienceSubjectId } from "../../../../lib/learning/display-level.js";

/** Product subject keys in run order (matches FINAL_LAUNCH_SUBJECTS_CLI). */
export const FINAL_SIMULATION_SUBJECT_KEYS = FINAL_LAUNCH_SUBJECTS_CLI.split(",").map((s) => s.trim());

/** Hebrew labels for console / summary table. */
export const FINAL_SIMULATION_SUBJECT_LABELS_HE = Object.fromEntries(
  FINAL_SIMULATION_SUBJECT_KEYS.map((key) => [key, SUBJECT_LABELS_HE[key] || key])
);

/**
 * Per-subject simulation profile.
 * harnessKey → visual-qa-config SUBJECT_PLANS key (moledet-geography → moledet).
 */
export const FINAL_SIMULATION_PROFILES = {
  math: { harnessKey: "math", grade: 3, masterLabel: "math-master", regularOnly: false },
  geometry: { harnessKey: "geometry", grade: 3, masterLabel: "geometry-master", regularOnly: false },
  hebrew: { harnessKey: "hebrew", grade: 3, masterLabel: "hebrew-master", regularOnly: false },
  english: { harnessKey: "english", grade: 3, masterLabel: "english-master", regularOnly: false },
  science: { harnessKey: "science", grade: 3, masterLabel: "science-master", regularOnly: true },
  "moledet-geography": {
    harnessKey: "moledet",
    grade: 3,
    masterLabel: "moledet-geography-master",
    regularOnly: false,
  },
  history: {
    harnessKey: "history",
    grade: 6,
    masterLabel: "history-master",
    surfaceSubject: "science",
    mcqPrefix: "science-mcq-",
    checkAnswerTestId: null,
    regularOnly: false,
    useSecondStudent: false,
  },
};

/** Steps executed once per subject (before level loops). */
export const SUBJECT_SETUP_STEPS = ["subject_loads", "grade_topic_selection"];

/** Steps executed per display level (regular / advanced). */
export const LEVEL_CHECK_STEPS = [
  "level_loads",
  "question_load",
  "answer_submit",
  "metadata_exists",
  "diagnostic_evidence",
  "no_raw_ids",
  "no_undefined_null_nan",
  "no_crash",
];

/** Activity checks (SSOT + activities API). */
export const ACTIVITY_CHECK_STEPS = ["regular_activity", "advanced_activity"];

export const DEFAULT_SIMULATION_PORT = 3200;
export const SIMULATION_PORT_MIN = 3200;
export const SIMULATION_PORT_MAX = 3210;

/** Dev ports reserved for normal work — never auto-pick these. */
export const RESERVED_DEV_PORTS = new Set([3000, 3001, 3002, 3003]);

/** @param {string} subjectKey */
export function isRegularOnlySubject(subjectKey) {
  return Boolean(FINAL_SIMULATION_PROFILES[subjectKey]?.regularOnly) || isScienceSubjectId(subjectKey);
}

export function formatRunTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

export function buildRunId(d = new Date()) {
  return `final-subjects-${formatRunTimestamp(d)}`;
}

export function defaultOutputDir(runId) {
  return `reports/simulations/${runId}`;
}

export function formatLevelSummaryLine(subjectKey, result) {
  const label = FINAL_SIMULATION_SUBJECT_LABELS_HE[subjectKey] || subjectKey;
  if (result?.notRun) {
    return `${label} — SKIPPED (${result.notRunReason || "not run"})`;
  }
  const reg = result.levels?.regular?.pass ? "PASS" : "FAIL";
  if (isRegularOnlySubject(subjectKey)) {
    const adv = result.advancedAbsent?.pass ? "N/A תקין" : "FAIL";
    return `${label} — רגיל ${reg} / מתקדם ${adv}`;
  }
  const adv = result.levels?.advanced?.pass ? "PASS" : "FAIL";
  return `${label} — רגיל ${reg} / מתקדם ${adv}`;
}

export function buildSkippedSubjectResult(subjectKey, reason) {
  return {
    subject: subjectKey,
    subjectLabel: FINAL_SIMULATION_SUBJECT_LABELS_HE[subjectKey] || subjectKey,
    pass: false,
    notRun: true,
    notRunReason: reason,
    levels: {},
    setup: {},
    activities: {},
  };
}
