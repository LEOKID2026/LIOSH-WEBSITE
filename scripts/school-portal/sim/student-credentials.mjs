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

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures");

/** Gitignored local override (written at seed/export time). */
export function localCredentialsArtifactPath() {
  return path.join(__dirname, "..", ".local", "student-access-credentials.json");
}

/** Tracked QA fixture — read-only fallback for demo school sim only. */
export function demoCredentialsFixturePath() {
  return path.join(FIXTURES_DIR, "demo-student-access-credentials.json");
}

/** Write target — always the gitignored local file. */
export function credentialsArtifactPath() {
  return localCredentialsArtifactPath();
}

/**
 * Resolve credentials path: local gitignored file first, then tracked demo fixture.
 * Fixture fallback is allowed only for the leo-k demo school simulation scripts.
 */
export function resolveCredentialsArtifactPath() {
  const local = localCredentialsArtifactPath();
  if (fs.existsSync(local)) {
    return { path: local, source: "local" };
  }
  const fixture = demoCredentialsFixturePath();
  if (fs.existsSync(fixture)) {
    return { path: fixture, source: "demo-fixture" };
  }
  return { path: local, source: "missing" };
}

function assertDemoSchoolCredentialsArtifact(artifact) {
  const count = artifact?.students ? Object.keys(artifact.students).length : 0;
  if (count < 12) {
    throw new Error(`demo credentials fixture rejected: need >=12 student entries, got ${count}`);
  }
  const isDemoUsername = (username) =>
    username.startsWith("demo-") || /^leok-s\d+$/i.test(username);
  for (const row of Object.values(artifact.students || {})) {
    const username = String(row?.username || "");
    if (!isDemoUsername(username)) {
      throw new Error(
        `demo credentials fixture rejected: username must be demo-* or leok-s####, got ${username}`
      );
    }
  }
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
  const resolved = resolveCredentialsArtifactPath();
  if (resolved.source === "missing") {
    return null;
  }
  const artifact = JSON.parse(fs.readFileSync(resolved.path, "utf8"));
  if (resolved.source === "demo-fixture") {
    assertDemoSchoolCredentialsArtifact(artifact);
  }
  return artifact;
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
