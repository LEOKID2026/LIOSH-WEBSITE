import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_PARENT_PASSWORD,
  DEFAULT_STUDENT_PIN,
  GRADE_KEYS,
  LAUNCH_SUBJECTS,
  QA_EMAIL_DOMAIN,
  BEHAVIOR_PROFILES,
} from "./constants.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
export const REPO_ROOT = resolve(__dirname, "../../../..");

function tryLoadDotenv() {
  for (const name of [".env.local", ".env"]) {
    const filePath = join(REPO_ROOT, name);
    if (!existsSync(filePath)) continue;
    const text = readFileSync(filePath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

function parseFlag(name, argv) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.slice(name.length + 3);
}

function parseBoolFlag(name, argv) {
  if (argv.includes(`--${name}`)) return true;
  const v = parseFlag(name, argv);
  if (v === undefined) return false;
  return v === "1" || v.toLowerCase() === "true";
}

function parseList(name, argv, fallback) {
  const raw = parseFlag(name, argv);
  if (!raw) return fallback;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function parseIntFlag(name, argv, fallback) {
  const raw = parseFlag(name, argv);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function parseMassSimulationCli(argv = process.argv.slice(2)) {
  tryLoadDotenv();

  const students = parseIntFlag("students", argv, 60);
  const parents = parseIntFlag("parents", argv, Math.max(1, Math.ceil(students / 10)));
  const days = parseIntFlag("days", argv, 7);
  const minutesPerDay = parseIntFlag("minutesPerDay", argv, 30);
  const password = parseFlag("password", argv) || DEFAULT_PARENT_PASSWORD;
  const studentPin = parseFlag("studentPin", argv) || DEFAULT_STUDENT_PIN;
  const subjects = parseList("subjects", argv, LAUNCH_SUBJECTS);
  const grades = parseList("grades", argv, GRADE_KEYS);
  const mode = parseFlag("mode", argv) || "staging";
  const timestampStamping = parseBoolFlag("timestampStamping", argv) || parseFlag("timestampStamping", argv) === "1";
  const dryRun = parseBoolFlag("dry-run", argv);
  const verifyOnly = parseBoolFlag("verify-only", argv);
  const syncNames = argv.includes("--sync-names")
    ? true
    : argv.includes("--no-sync-names")
      ? false
      : verifyOnly;
  const patchSpeedPressure = parseBoolFlag("patch-speed-pressure", argv);
  const patchParentAssigned = parseBoolFlag("patch-parent-assigned", argv);
  const noSeedSpeedPressure = parseBoolFlag("no-seed-speed-pressure", argv);
  const seedSpeedPressure = !noSeedSpeedPressure;
  const focusProfile = parseFlag("focus-profile", argv) || undefined;
  const runId =
    parseFlag("runId", argv) ||
    `mass-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
  const emailDomain = parseFlag("emailDomain", argv) || QA_EMAIL_DOMAIN;
  const baseUrl =
    parseFlag("base-url", argv) ||
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.E2E_BASE_URL ||
    "http://127.0.0.1:3001";

  if (students < parents) {
    throw new Error("--students must be >= --parents");
  }
  if (studentPin.replace(/\D/g, "").length !== 4) {
    throw new Error("--studentPin must be a 4-digit PIN");
  }

  return {
    argv,
    students,
    parents,
    days,
    minutesPerDay,
    password,
    studentPin: studentPin.replace(/\D/g, ""),
    subjects,
    grades: grades.map((g) => (g.startsWith("g") ? Number(g.slice(1)) : Number(g))).filter((n) => n >= 1 && n <= 6),
    mode,
    timestampStamping,
    dryRun,
    verifyOnly,
    syncNames,
    patchSpeedPressure,
    patchParentAssigned,
    seedSpeedPressure,
    focusProfile,
    runId,
    emailDomain,
    baseUrl,
    reportDir: join(REPO_ROOT, "reports", "mass-simulation", runId),
  };
}

export function parentEmail(index, domain) {
  return `qa-parent-${String(index).padStart(2, "0")}@${domain}`;
}

export function studentLogin(parentIndex, studentIndex) {
  return `qp${String(parentIndex).padStart(2, "0")}s${String(studentIndex).padStart(3, "0")}`;
}

export function studentDisplayName({ grade, subject, profileId, profileLabelHe, seq }) {
  const gradeHe = { 1: "א", 2: "ב", 3: "ג", 4: "ד", 5: "ה", 6: "ו" }[grade] || String(grade);
  const subjHe = {
    math: "מתמטיקה",
    geometry: "גאומטריה",
    hebrew: "עברית",
    english: "אנגלית",
    science: "מדעים",
  }[subject] || subject;
  const profileHe =
    profileLabelHe ||
    BEHAVIOR_PROFILES.find((p) => p.id === profileId)?.labelHe ||
    profileId;
  return `בדיקה ${gradeHe} ${subjHe} ${profileHe} ${String(seq).padStart(3, "0")}`;
}
