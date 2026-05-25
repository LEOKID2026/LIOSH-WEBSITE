/**
 * Teacher Classroom Daily Simulation — config / CLI / env.
 * Isolated from scripts/virtual-student-qa (read-only reuse only).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, "../../..");

export const SIM_PARENT_EMAIL = "parent-class-sim@liosh-dev.invalid";
export const SIM_TEACHER_EMAIL = "teacher@leo.com";
export const SIM_STUDENT_NAME_PREFIX = "סימולציה תלמיד";
export const SIM_TEACHER_DISPLAY_NAME = "מורה LEO";
export const SIM_PARENT_DISPLAY_NAME = "הורה סימולציה כיתה";
export const TEACHER_PLAN_CODE = "teacher_basic_20";
export const STUDENT_COUNT = 20;

/** Subject keys used by virtual-student-qa subject drivers (hyphen form). */
export const SUBJECT_ROTATION = Object.freeze([
  "math",
  "hebrew",
  "english",
  "science",
  "geometry",
  "moledet-geography",
]);

const GRADE_CLASS_NAMES = Object.freeze({
  g1: "כיתת סימולציה - כיתה א׳",
  g2: "כיתת סימולציה - כיתה ב׳",
  g3: "כיתת סימולציה - כיתה ג׳",
  g4: "כיתת סימולציה - כיתה ד׳",
  g5: "כיתת סימולציה - כיתה ה׳",
  g6: "כיתת סימולציה - כיתה ו׳",
});

const GRADE_DB_LEVEL = Object.freeze({
  g1: "grade_1",
  g2: "grade_2",
  g3: "grade_3",
  g4: "grade_4",
  g5: "grade_5",
  g6: "grade_6",
});

function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return defaultValue;
}

function parseArgv(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const body = arg.slice(2);
    const eq = body.indexOf("=");
    if (eq === -1) {
      out[body] = "true";
    } else {
      out[body.slice(0, eq)] = body.slice(eq + 1);
    }
  }
  return out;
}

export function normalizeSubjectCli(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return null;
  if (s === "moledet_geography" || s === "moledet-geography") return "moledet-geography";
  if (SUBJECT_ROTATION.includes(s)) return s;
  throw new Error(
    `Invalid --subject=${raw}. Use: math|hebrew|english|science|geometry|moledet_geography`
  );
}

export function normalizeGradeCli(raw) {
  const g = String(raw || "g3").trim().toLowerCase();
  if (!/^g[1-6]$/.test(g)) {
    throw new Error(`Invalid --grade=${raw}. Use g1..g6`);
  }
  return g;
}

export function gradeNumber(gradeKey) {
  return Number.parseInt(gradeKey.slice(1), 10);
}

export function classNameForGrade(gradeKey) {
  return GRADE_CLASS_NAMES[gradeKey] || `כיתת סימולציה - ${gradeKey}`;
}

export function dbGradeLevel(gradeKey) {
  return GRADE_DB_LEVEL[gradeKey] || `grade_${gradeNumber(gradeKey)}`;
}

export function studentUsername(gradeKey, slot) {
  const g = gradeKey.replace(/^g/, "");
  return `simg${g}-${String(slot).padStart(2, "0")}`;
}

export function studentFullName(slot) {
  return `${SIM_STUDENT_NAME_PREFIX} ${String(slot).padStart(2, "0")}`;
}

export function studentLabel(slot) {
  return `SIM${String(slot).padStart(2, "0")}`;
}

export function resolveStateDir() {
  const override = String(process.env.TEACHER_CLASSROOM_SIM_STATE_DIR || "").trim();
  if (override) return resolve(override);
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local");
    return join(local, "liosh-qa", "teacher-classroom-sim-state");
  }
  return join(homedir(), ".local", "share", "liosh-qa", "teacher-classroom-sim-state");
}

export function resolveBaseUrl() {
  return (
    String(process.env.PLAYWRIGHT_BASE_URL || "").trim() ||
    String(process.env.TEACHER_CLASSROOM_SIM_BASE_URL || "").trim() ||
    "https://liosh-website.vercel.app"
  );
}

export function resolveTodayDate() {
  const override = String(process.env.TEACHER_CLASSROOM_SIM_DATE || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function resolvePassword(envName, fallback) {
  return String(process.env[envName] || "").trim() || fallback;
}

export function parseConfig(argv = process.argv.slice(2)) {
  const args = parseArgv(argv);
  const grade = normalizeGradeCli(args.grade);
  const subjectOverride = args.subject ? normalizeSubjectCli(args.subject) : null;
  return {
    grade,
    subjectOverride,
    dryRun: parseBool(args["dry-run"], false),
    printOnly: parseBool(args["print-only"], false),
    resetActivity: parseBool(args["reset-activity"], false),
    force: parseBool(args.force, false),
    headed: parseBool(args.headed, false) || parseBool(process.env.TEACHER_CLASSROOM_SIM_HEADED, false),
    baseUrl: args["base-url"] ? String(args["base-url"]).trim() : resolveBaseUrl(),
    date: args.date ? String(args.date).trim() : resolveTodayDate(),
    topicsPerDay: Math.max(2, Math.min(6, Number.parseInt(args["topics-per-day"] || "4", 10) || 4)),
    stateDir: resolveStateDir(),
    repoRoot: REPO_ROOT,
    teacherPassword: resolvePassword("SIM_TEACHER_PASSWORD", "747975"),
    parentPassword: resolvePassword("SIM_TEACHER_PARENT_PASSWORD", "ParentClassSim!2026"),
    studentPin: String(process.env.SIM_TEACHER_STUDENT_PIN || "1234").replace(/\D/g, "").slice(0, 4) || "1234",
  };
}

export function makeArtifactsDir({ repoRoot, date, subject }) {
  const safeSubject = String(subject).replace(/[^a-zA-Z0-9._-]/g, "_");
  return join(repoRoot, "reports", "teacher-classroom-daily", date, safeSubject);
}
