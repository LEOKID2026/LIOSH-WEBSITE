/**
 * Final subject simulation — 7 launch subjects (incl. history + moledet-geography).
 */
import { FINAL_LAUNCH_SUBJECTS_CLI } from "../mass-virtual-students/subject-registry.mjs";
import { SUBJECT_LABELS_HE } from "../mass-virtual-students/constants.mjs";

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
  math: { harnessKey: "math", grade: 3, masterLabel: "math-master" },
  geometry: { harnessKey: "geometry", grade: 3, masterLabel: "geometry-master" },
  hebrew: { harnessKey: "hebrew", grade: 3, masterLabel: "hebrew-master" },
  english: { harnessKey: "english", grade: 3, masterLabel: "english-master" },
  science: { harnessKey: "science", grade: 3, masterLabel: "science-master" },
  "moledet-geography": { harnessKey: "moledet", grade: 3, masterLabel: "moledet-geography-master" },
  history: {
    harnessKey: "history",
    grade: 6,
    masterLabel: "history-master",
    surfaceSubject: "science",
    mcqPrefix: "science-mcq-",
    checkAnswerTestId: null,
  },
};

export const SIMULATION_CHECK_STEPS = [
  "subject_loads",
  "grade_topic_selection",
  "question_load",
  "answer_submit",
  "diagnostic_metadata",
  "parent_report_evidence",
  "parent_activity",
  "no_raw_ids",
  "no_undefined_null_nan",
  "no_crash",
];

export const DEFAULT_SIMULATION_PORT = 3200;
export const SIMULATION_PORT_MIN = 3200;
export const SIMULATION_PORT_MAX = 3210;

/** Dev ports reserved for normal work — never auto-pick these. */
export const RESERVED_DEV_PORTS = new Set([3000, 3001, 3002, 3003]);

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
