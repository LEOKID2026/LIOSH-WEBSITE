/**
 * Local-only student username/PIN map for school sim UI sampling.
 *
 * PINs are stored as pin_hash in DB and cannot be recovered from hashes.
 * This module reads a gitignored artifact written at seed time (or via export helper).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServiceRole } from "../demo-school-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Same directory as sim-state.json — already gitignored. */
export function credentialsArtifactPath() {
  return path.join(__dirname, "..", ".local", "student-access-credentials.json");
}

/**
 * Resolve teacher/school-manager password from existing env names (no hardcoding).
 */
export function resolveStaffPassword() {
  const v =
    process.env.DEMO_TEACHER_PASSWORD ||
    process.env.SCHOOL_QA_PASSWORD ||
    process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
    process.env.TEACHER_PORTAL_VERIFY_PASSWORD ||
    "";
  if (!v) {
    throw new Error(
      "Missing staff password env — set one of: DEMO_TEACHER_PASSWORD, SCHOOL_QA_PASSWORD " +
        "(at runtime only; never commit)"
    );
  }
  return v;
}

/**
 * Demo scaffolding parent (email/password) — not used for all 398 school parents.
 */
export function resolveScaffoldingParentPassword() {
  return (
    process.env.DEMO_PARENT_PASSWORD ||
    process.env.DEMO_TEACHER_PASSWORD ||
    process.env.SCHOOL_QA_PASSWORD ||
    resolveStaffPassword()
  );
}

export function writeCredentialsArtifact(entries, meta = {}) {
  const filePath = credentialsArtifactPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: meta.source || "unknown",
    note:
      "Plaintext PINs for demo students at seed/export time only. Gitignored. " +
      "Cannot be derived from pin_hash in DB.",
    students: entries,
  };
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
  return filePath;
}

export function loadCredentialsArtifact() {
  const filePath = credentialsArtifactPath();
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * @param {string[]} studentIds
 * @returns {Promise<Map<string, { username: string, pin: string }>>}
 */
export async function loadStudentCredentialsForIds(studentIds) {
  const artifact = loadCredentialsArtifact();
  const map = new Map();
  const byId = artifact?.students || {};

  for (const id of studentIds) {
    const row = byId[id];
    if (row?.username && row?.pin) {
      map.set(id, { username: row.username, pin: row.pin });
    }
  }

  if (map.size >= studentIds.length) {
    return map;
  }

  return map;
}

export function assertStudentCredentialsReady(studentIds, map) {
  const missing = studentIds.filter((id) => !map.has(id));
  if (!missing.length) return;
  throw new Error(
    `student UI sample: missing plaintext PIN for ${missing.length} student(s). ` +
      `PIN cannot be read from pin_hash. Run: ` +
      `node --env-file=.env.local scripts/school-portal/seed-demo-school.mjs --phase=students ` +
      `(writes ${credentialsArtifactPath()}) ` +
      `or node --env-file=.env.local scripts/school-portal/export-demo-student-credentials.mjs ` +
      `with the same DEMO_STUDENT_PIN used at original seed.`
  );
}
