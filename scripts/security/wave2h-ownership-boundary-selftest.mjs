#!/usr/bin/env node
/**
 * Wave 2H — ownership / cross-tenant static closure selftest.
 * No Supabase writes, no HTTP unless shell fixtures present.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  fixtureStatus,
  runStaticOwnershipAudit,
  printStaticAuditTable,
  OWNERSHIP_HTTP_CASES,
} from "./ownership-boundary-http-matrix.mjs";
import {
  resolveParentStudentLimit,
  QA_SIMULATION_PARENT_EMAIL,
  QA_SIMULATION_PARENT_STUDENT_LIMIT,
  DEFAULT_PARENT_STUDENT_LIMIT,
} from "../../lib/parent-server/parent-student-limit.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function testParentStudentCapRules() {
  assert.equal(resolveParentStudentLimit("parent@example.com"), DEFAULT_PARENT_STUDENT_LIMIT);
  assert.equal(resolveParentStudentLimit("ADMIN@ADMIN.COM"), QA_SIMULATION_PARENT_STUDENT_LIMIT);
  assert.equal(QA_SIMULATION_PARENT_EMAIL, "admin@admin.com");
  assert.equal(QA_SIMULATION_PARENT_STUDENT_LIMIT, 50);
  assert.equal(DEFAULT_PARENT_STUDENT_LIMIT, 3);

  const createStudent = read("pages/api/parent/create-student.js");
  assert.match(createStudent, /resolveParentMaxChildren/);
  assert.match(createStudent, /requireParentApiContext/);
  assert.match(createStudent, /\.eq\("parent_id", ctx\.parentUserId\)/);

  const limitModule = read("lib/parent-server/parent-student-limit.server.js");
  assert.match(limitModule, /admin@admin\.com/);
  assert.match(limitModule, /50/);
  assert.match(limitModule, /DEFAULT_PARENT_STUDENT_LIMIT = 3/);
}

function testCriticalRoutePatterns() {
  const reportData = read("pages/api/parent/students/[studentId]/report-data.js");
  assert.match(reportData, /requireParentApiContext/);
  assert.match(reportData, /\.eq\("parent_id", ctx\.parentUserId\)/);
  assert.match(reportData, /404.*Student not found for this parent/s);

  const copilot = read("pages/api/parent/copilot-turn.js");
  assert.match(copilot, /\.eq\("parent_id", ctx\.parentUserId\)/);
  assert.match(copilot, /Student not found for this parent/);

  const payload = read("lib/parent-copilot/copilot-turn-payload.server.js");
  assert.match(payload, /verifyStudentForCopilotRebuild/);

  const rebuild = read("lib/security/copilot-rebuild-ownership.server.js");
  assert.match(rebuild, /PARENT_OWNERSHIP_DENIED/);
  assert.match(rebuild, /STUDENT_SESSION_DENIED/);

  const answer = read("pages/api/learning/answer.js");
  assert.match(answer, /verifyLearningSessionOwnership/);
  assert.match(answer, /Session does not belong to student/);

  const profile = read("pages/api/student/learning-profile.js");
  assert.match(profile, /auth\.studentId/);
  assert.match(profile, /delete body\.studentId/);
  assert.match(profile, /delete body\.student_id/);
}

async function main() {
  testParentStudentCapRules();
  testCriticalRoutePatterns();

  const staticResults = runStaticOwnershipAudit();
  printStaticAuditTable(staticResults);

  const fails = staticResults.filter((r) => r.status === "FAIL");
  assert.equal(fails.length, 0, `static ownership audit failures: ${fails.map((f) => f.id).join(", ")}`);

  const { missingCore, missingExecute } = fixtureStatus("execute");
  if (missingCore.length > 0) {
    console.log("HTTP_MATRIX: PENDING (core fixtures missing)");
    console.log("Missing:", missingCore.join(", "));
  } else if (missingExecute.length > 0) {
    console.log("HTTP_MATRIX: PARTIAL-READY (student session fixtures missing)");
    console.log("Missing execute:", missingExecute.join(", "));
  } else {
    console.log("HTTP_MATRIX: READY for --execute");
  }

  assert.ok(OWNERSHIP_HTTP_CASES.length >= 6);
  console.log("wave2h-ownership-boundary-selftest: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
