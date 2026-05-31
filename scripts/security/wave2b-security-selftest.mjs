#!/usr/bin/env node
/**
 * Wave 2B targeted security selftests — no Supabase writes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  verifyStudentForCopilotRebuild,
  safeUuid,
} from "../../lib/security/copilot-rebuild-ownership.server.js";
import {
  fixtureStatus,
  OWNERSHIP_HTTP_CASES,
  assertOwnershipScaffold,
} from "./ownership-boundary-http-matrix.mjs";
import {
  resolveParentStudentLimit,
  QA_SIMULATION_PARENT_STUDENT_LIMIT,
  DEFAULT_PARENT_STUDENT_LIMIT,
} from "../../lib/parent-server/parent-student-limit.server.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

function mockServiceClient(studentRow) {
  return {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle: async () => ({ data: studentRow, error: null }),
      };
    },
  };
}

async function testCopilotRebuildOwnership() {
  const studentId = "11111111-1111-4111-8111-111111111111";
  const parentId = "22222222-2222-4222-8222-222222222222";
  const foreignParentId = "33333333-3333-4333-8333-333333333333";
  const row = {
    id: studentId,
    full_name: "Test",
    grade_level: "3",
    is_active: true,
    parent_id: parentId,
  };
  const client = mockServiceClient(row);

  const parentOk = await verifyStudentForCopilotRebuild(client, studentId, {
    authMode: "parent_bearer",
    parentUserId: parentId,
  });
  assert.equal(parentOk.ok, true);

  const parentDeny = await verifyStudentForCopilotRebuild(client, studentId, {
    authMode: "parent_bearer",
    parentUserId: foreignParentId,
  });
  assert.equal(parentDeny.ok, false);
  assert.equal(parentDeny.code, "PARENT_OWNERSHIP_DENIED");

  const sessionOk = await verifyStudentForCopilotRebuild(client, studentId, {
    authMode: "student_session",
    authenticatedStudentId: studentId,
  });
  assert.equal(sessionOk.ok, true);

  const sessionDeny = await verifyStudentForCopilotRebuild(client, studentId, {
    authMode: "student_session",
    authenticatedStudentId: "44444444-4444-4444-8444-444444444444",
  });
  assert.equal(sessionDeny.ok, false);
  assert.equal(sessionDeny.code, "STUDENT_SESSION_DENIED");

  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const devBlocked = await verifyStudentForCopilotRebuild(client, studentId, {
    authMode: "dev_local",
  });
  assert.equal(devBlocked.ok, false);
  assert.equal(devBlocked.code, "DEV_LOCAL_BLOCKED");
  process.env.NODE_ENV = prev;

  assert.equal(safeUuid("not-a-uuid"), null);
}

function testOwnershipMatrixPending() {
  const saved = {};
  for (const k of [
    "OWNERSHIP_TEST_PARENT_A_BEARER",
    "OWNERSHIP_TEST_PARENT_B_BEARER",
    "OWNERSHIP_TEST_STUDENT_A_ID",
    "OWNERSHIP_TEST_STUDENT_B_ID",
  ]) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  const status = fixtureStatus("dry-run");
  assert.equal(status.ready, false);
  assert.ok(status.missingCore.length > 0);
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function testParentCapRules() {
  assert.equal(resolveParentStudentLimit("ADMIN@ADMIN.COM"), QA_SIMULATION_PARENT_STUDENT_LIMIT);
  assert.equal(resolveParentStudentLimit("user@test.com"), DEFAULT_PARENT_STUDENT_LIMIT);
}

function testReportsExist() {
  const files = [
    "reports/security/wave-2b-security-fix-summary.md",
    "reports/security/wave-2b-copilot-ownership-defense.md",
    "reports/security/wave-2b-csp-violation-collection-readiness.md",
    "reports/security/wave-2b-dependency-risk-triage.md",
    "pages/api/security/csp-report.js",
  ];
  for (const f of files) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), `missing ${f}`);
  }
}

function testOwnershipCasesIncludeRequired() {
  assertOwnershipScaffold();
  const ids = OWNERSHIP_HTTP_CASES.map((c) => c.id);
  assert.ok(ids.includes("parent-report-foreign-student"));
  assert.ok(ids.includes("copilot-parent-foreign-student"));
  assert.ok(ids.includes("learning-answer-foreign-session"));
  assert.ok(ids.includes("student-learning-profile-session-only"));
}

async function main() {
  await testCopilotRebuildOwnership();
  testOwnershipMatrixPending();
  testParentCapRules();
  testReportsExist();
  testOwnershipCasesIncludeRequired();
  console.log("wave2b-security-selftest: PASS");
}

main().catch((err) => {
  console.error("wave2b-security-selftest: FAIL", err);
  process.exit(1);
});
