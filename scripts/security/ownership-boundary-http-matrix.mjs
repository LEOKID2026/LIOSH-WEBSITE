#!/usr/bin/env node
/**
 * Ownership boundary HTTP matrix — dry-run, static audit, or live HTTP (D-OWNERSHIP-1).
 *
 * Does NOT create users or write Supabase data.
 * Fixtures are read from process env at runtime (shell export — not from .env files).
 *
 * Usage:
 *   node scripts/security/ownership-boundary-http-matrix.mjs --dry-run
 *   node scripts/security/ownership-boundary-http-matrix.mjs --static-audit
 *   node scripts/security/ownership-boundary-http-matrix.mjs --execute
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/** @typedef {'PASS'|'FAIL'|'PENDING'|'STATIC-ONLY'} CaseStatus */

/**
 * Static/code-review cases — Wave 2H required boundaries.
 * @type {Array<{
 *   id: string,
 *   status: CaseStatus,
 *   route: string,
 *   file: string,
 *   expected: string,
 *   note: string,
 *   audit: () => { pass: boolean, detail: string }
 * }>}
 */
export const STATIC_OWNERSHIP_CASES = [
  {
    id: "parent-report-foreign-student",
    status: "PENDING",
    route: "GET /api/parent/students/{studentB}/report-data",
    file: "pages/api/parent/students/[studentId]/report-data.js",
    expected: "HTTP 404 when parent A requests parent B student",
    note: "Handler filters .eq(parent_id, bearer user) before service-role reads",
    audit() {
      const src = readSource("pages/api/parent/students/[studentId]/report-data.js");
      const pass =
        (src.includes('.eq("parent_id", ctx.parentUserId)') ||
          src.includes('requireParentApiContext')) &&
        src.includes("404") &&
        src.includes("Student not found for this parent");
      return {
        pass,
        detail: pass ? "parent_id ownership filter + 404 fail-closed" : "missing parent_id filter or 404",
      };
    },
  },
  {
    id: "copilot-parent-foreign-student",
    status: "PENDING",
    route: "POST /api/parent/copilot-turn",
    file: "pages/api/parent/copilot-turn.js",
    expected: "HTTP 404 when parent bearer + foreign studentId",
    note: "authorizeRequest parent bearer path",
    audit() {
      const src = readSource("pages/api/parent/copilot-turn.js");
      const pass =
        src.includes('.eq("parent_id", ctx.parentUserId)') &&
        src.includes("Student not found for this parent");
      return { pass, detail: pass ? "handler ownership before turn" : "missing parent bearer ownership" };
    },
  },
  {
    id: "learning-answer-foreign-session",
    status: "PENDING",
    route: "POST /api/learning/answer",
    file: "pages/api/learning/answer.js",
    expected: "HTTP 403 when student A submits to student B session",
    note: "verifyLearningSessionOwnership before SR insert",
    audit() {
      const src = readSource("pages/api/learning/answer.js");
      const pass =
        src.includes("verifyLearningSessionOwnership") &&
        src.includes('data.student_id !== studentId') &&
        src.includes("Session does not belong to student");
      return { pass, detail: pass ? "session student_id match enforced" : "missing session ownership check" };
    },
  },
  {
    id: "student-learning-profile-session-only",
    status: "STATIC-ONLY",
    route: "PATCH /api/student/learning-profile",
    file: "pages/api/student/learning-profile.js",
    expected: "Identity from session cookie only; body studentId stripped",
    note: "No foreign studentId param accepted",
    audit() {
      const src = readSource("pages/api/student/learning-profile.js");
      const pass =
        src.includes("auth.studentId") &&
        src.includes("delete body.studentId") &&
        src.includes("delete body.student_id");
      return { pass, detail: pass ? "session-only studentId; body override deleted" : "body studentId not stripped" };
    },
  },
  {
    id: "create-student-cap-normal-parent",
    status: "STATIC-ONLY",
    route: "POST /api/parent/create-student",
    file: "pages/api/parent/create-student.js + lib/parent-server/parent-student-limit.server.js",
    expected: "Normal parent max 3 children",
    note: "resolveParentStudentLimit default 3",
    audit() {
      const limit = readSource("lib/parent-server/parent-student-limit.server.js");
      const create = readSource("pages/api/parent/create-student.js");
      const pass =
        limit.includes("DEFAULT_PARENT_STUDENT_LIMIT = 3") &&
        create.includes("resolveParentMaxChildren") &&
        create.includes('.eq("parent_id", ctx.parentUserId)');
      return { pass, detail: pass ? "cap=3 + parent-scoped count" : "cap enforcement missing" };
    },
  },
  {
    id: "create-student-cap-qa-parent",
    status: "STATIC-ONLY",
    route: "POST /api/parent/create-student",
    file: "lib/parent-server/parent-student-limit.server.js",
    expected: "admin@admin.com max 50 (QA only)",
    note: "Hardcoded QA allowlist — not env-widened",
    audit() {
      const limit = readSource("lib/parent-server/parent-student-limit.server.js");
      const pass =
        limit.includes('QA_SIMULATION_PARENT_EMAIL = "admin@admin.com"') &&
        limit.includes("QA_SIMULATION_PARENT_STUDENT_LIMIT = 50") &&
        limit.includes("ignored for limit resolution");
      return { pass, detail: pass ? "admin@admin.com → 50 only" : "QA cap rule missing" };
    },
  },
  {
    id: "parent-report-data-foreign-studentId",
    status: "STATIC-ONLY",
    route: "GET /api/parent/students/[studentId]/report-data",
    file: "pages/api/parent/students/[studentId]/report-data.js",
    expected: "Foreign studentId rejected before SR aggregate",
    note: "Same handler as cross-parent report case",
    audit() {
      const src = readSource("pages/api/parent/students/[studentId]/report-data.js");
      const handler = src.slice(src.indexOf("export default"));
      const parentFilterIdx = handler.indexOf('.eq("parent_id", ctx.parentUserId)');
      const srIdx = handler.indexOf("getLearningSupabaseServiceRoleClient()");
      const pass =
        parentFilterIdx > -1 &&
        srIdx > parentFilterIdx &&
        handler.includes("Student not found for this parent");
      return {
        pass,
        detail: pass ? "user-client ownership before service-role reads" : "SR may run before ownership",
      };
    },
  },
  {
    id: "copilot-rebuild-foreign-studentId",
    status: "STATIC-ONLY",
    route: "Copilot payload rebuild (server-side)",
    file: "lib/security/copilot-rebuild-ownership.server.js + lib/parent-copilot/copilot-turn-payload.server.js",
    expected: "verifyStudentForCopilotRebuild fail-closed on foreign student",
    note: "Wave 2B defense-in-depth",
    audit() {
      const payload = readSource("lib/parent-copilot/copilot-turn-payload.server.js");
      const gate = readSource("lib/security/copilot-rebuild-ownership.server.js");
      const pass =
        payload.includes("verifyStudentForCopilotRebuild") &&
        gate.includes("PARENT_OWNERSHIP_DENIED") &&
        gate.includes("STUDENT_SESSION_DENIED") &&
        gate.includes("DEV_LOCAL_BLOCKED");
      return { pass, detail: pass ? "rebuild ownership gate wired" : "rebuild gate missing" };
    },
  },
];

export function runStaticOwnershipAudit() {
  return STATIC_OWNERSHIP_CASES.map((c) => {
    const { pass, detail } = c.audit();
    /** @type {CaseStatus} */
    let status = c.status;
    if (pass && (status === "STATIC-ONLY" || status === "PENDING")) {
      status = status === "STATIC-ONLY" ? "STATIC-ONLY" : "STATIC-ONLY";
    }
    if (!pass) status = "FAIL";
    else if (status === "PENDING") status = "STATIC-ONLY";
    return {
      id: c.id,
      status,
      route: c.route,
      file: c.file,
      expected: c.expected,
      note: c.note,
      detail,
    };
  });
}

export function printStaticAuditTable(results) {
  console.log("\n# Static ownership audit (Wave 2H)\n");
  console.log("| ID | Status | Route | File | Detail |");
  console.log("|----|--------|-------|------|--------|");
  for (const r of results) {
    console.log(`| ${r.id} | ${r.status} | ${r.route} | ${r.file} | ${r.detail} |`);
  }
}

/** @typedef {'parent_a_bearer'|'parent_b_bearer'|'student_a_cookie'|'static_audit'|'cap_code_review'} AuthKind */

/**
 * @type {Array<{
 *   id: string,
 *   method: string,
 *   pathTemplate: string,
 *   auth: AuthKind,
 *   expectedStatus: number,
 *   note: string,
 *   executable: boolean,
 *   buildRequest?: (fixtures: Record<string, string>) => { url: string, init: RequestInit }
 * }>}
 */
export const OWNERSHIP_HTTP_CASES = [
  {
    id: "parent-report-foreign-student",
    method: "GET",
    pathTemplate: "/api/parent/students/{studentB}/report-data",
    auth: "parent_a_bearer",
    expectedStatus: 404,
    note: "Parent A must not read Parent B student report",
    executable: true,
    buildRequest(fixtures) {
      return {
        url: `${fixtures.baseUrl}/api/parent/students/${fixtures.studentBId}/report-data`,
        init: {
          method: "GET",
          headers: { authorization: `Bearer ${fixtures.parentABearer}` },
        },
      };
    },
  },
  {
    id: "copilot-parent-foreign-student",
    method: "POST",
    pathTemplate: "/api/parent/copilot-turn",
    auth: "parent_a_bearer",
    expectedStatus: 404,
    note: "Parent A cannot run Copilot for Parent B student",
    executable: true,
    buildRequest(fixtures) {
      return {
        url: `${fixtures.baseUrl}/api/parent/copilot-turn`,
        init: {
          method: "POST",
          headers: {
            authorization: `Bearer ${fixtures.parentABearer}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            studentId: fixtures.studentBId,
            utterance: "ownership-matrix-probe",
            reportPeriod: "week",
          }),
        },
      };
    },
  },
  {
    id: "learning-answer-foreign-session",
    method: "POST",
    pathTemplate: "/api/learning/answer",
    auth: "student_a_cookie",
    expectedStatus: 403,
    note: "Student A cannot submit answer to Student B session",
    executable: true,
    buildRequest(fixtures) {
      return {
        url: `${fixtures.baseUrl}/api/learning/answer`,
        init: {
          method: "POST",
          headers: {
            cookie: fixtures.studentACookie,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            learningSessionId: fixtures.sessionBId,
            isCorrect: true,
            subject: "math",
            questionId: "ownership-matrix-probe",
          }),
        },
      };
    },
  },
  {
    id: "student-learning-profile-session-only",
    method: "PATCH",
    pathTemplate: "/api/student/learning-profile",
    auth: "static_audit",
    expectedStatus: 0,
    note: "No foreign studentId param — identity from session cookie only (static audit)",
    executable: false,
  },
  {
    id: "create-student-cap-normal-parent",
    method: "POST",
    pathTemplate: "/api/parent/create-student",
    auth: "cap_code_review",
    expectedStatus: 400,
    note: "Normal parent max 3 — enforced in parent-student-limit.server.js (code review)",
    executable: false,
  },
  {
    id: "create-student-cap-qa-parent",
    method: "POST",
    pathTemplate: "/api/parent/create-student",
    auth: "cap_code_review",
    expectedStatus: 0,
    note: "admin@admin.com max 50 QA rule — code review + wave1 selftest",
    executable: false,
  },
];

const CORE_FIXTURE_KEYS = [
  "OWNERSHIP_TEST_PARENT_A_BEARER",
  "OWNERSHIP_TEST_PARENT_B_BEARER",
  "OWNERSHIP_TEST_STUDENT_A_ID",
  "OWNERSHIP_TEST_STUDENT_B_ID",
];

const EXECUTE_EXTRA_KEYS = [
  "OWNERSHIP_TEST_STUDENT_A_COOKIE",
  "OWNERSHIP_TEST_SESSION_B_ID",
];

export function loadFixtures() {
  const baseUrl = String(process.env.OWNERSHIP_TEST_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    baseUrl,
    parentABearer: String(process.env.OWNERSHIP_TEST_PARENT_A_BEARER || "").trim(),
    parentBBearer: String(process.env.OWNERSHIP_TEST_PARENT_B_BEARER || "").trim(),
    studentAId: String(process.env.OWNERSHIP_TEST_STUDENT_A_ID || "").trim(),
    studentBId: String(process.env.OWNERSHIP_TEST_STUDENT_B_ID || "").trim(),
    studentACookie: String(process.env.OWNERSHIP_TEST_STUDENT_A_COOKIE || "").trim(),
    sessionBId: String(process.env.OWNERSHIP_TEST_SESSION_B_ID || "").trim(),
  };
}

export function fixtureStatus(mode = "dry-run") {
  const missingCore = CORE_FIXTURE_KEYS.filter((k) => !String(process.env[k] || "").trim());
  const missingExecute =
    mode === "execute"
      ? EXECUTE_EXTRA_KEYS.filter((k) => !String(process.env[k] || "").trim())
      : [];
  const missing = [...missingCore, ...missingExecute];
  return {
    ready: missing.length === 0,
    missing,
    missingCore,
    missingExecute,
  };
}

function printMatrix() {
  console.log("# Ownership HTTP matrix\n");
  console.log("| ID | Method | Path | Auth | Expected | Executable | Note |");
  console.log("|----|--------|------|------|----------|------------|------|");
  for (const c of OWNERSHIP_HTTP_CASES) {
    console.log(
      `| ${c.id} | ${c.method} | ${c.pathTemplate} | ${c.auth} | ${c.expectedStatus || "audit"} | ${c.executable ? "yes" : "no"} | ${c.note} |`
    );
  }
}

async function runExecutableCases(fixtures) {
  const results = [];
  for (const testCase of OWNERSHIP_HTTP_CASES.filter((c) => c.executable)) {
    if (!testCase.buildRequest) continue;
    if (testCase.auth === "student_a_cookie" && (!fixtures.studentACookie || !fixtures.sessionBId)) {
      results.push({ id: testCase.id, status: "SKIP", reason: "missing student cookie or session B fixture" });
      continue;
    }
    const { url, init } = testCase.buildRequest({
      baseUrl: fixtures.baseUrl,
      parentABearer: fixtures.parentABearer,
      studentBId: fixtures.studentBId,
      studentACookie: fixtures.studentACookie,
      sessionBId: fixtures.sessionBId,
    });
    let status = 0;
    let error = null;
    try {
      const res = await fetch(url, init);
      status = res.status;
    } catch (e) {
      error = String(e?.message || e);
    }
    const pass = !error && status === testCase.expectedStatus;
    results.push({
      id: testCase.id,
      status: pass ? "PASS" : "FAIL",
      httpStatus: status,
      expected: testCase.expectedStatus,
      error,
    });
  }
  return results;
}

export function summarizeMatrixResults(results) {
  const fails = results.filter((r) => r.status === "FAIL");
  const passes = results.filter((r) => r.status === "PASS");
  if (fails.length > 0) return "FAIL";
  if (passes.length > 0) return "PASS";
  return "READY";
}

async function main() {
  const execute = process.argv.includes("--execute");
  const staticAudit =
    process.argv.includes("--static-audit") || process.argv.includes("--dry-run") || !execute;

  printMatrix();

  if (staticAudit) {
    const staticResults = runStaticOwnershipAudit();
    printStaticAuditTable(staticResults);
    const staticFails = staticResults.filter((r) => r.status === "FAIL");
    if (staticFails.length > 0) {
      console.log(`\nSTATIC_AUDIT_STATUS: FAIL (${staticFails.length})`);
      process.exit(1);
    }
    console.log(`\nSTATIC_AUDIT_STATUS: PASS (${staticResults.length} cases)`);
  }

  const { missingCore } = fixtureStatus(execute ? "execute" : "dry-run");

  if (missingCore.length > 0) {
    console.log(`\nMATRIX_STATUS: PENDING`);
    console.log("D-OWNERSHIP-1: missing core fixtures:", missingCore.join(", "));
    console.log("No HTTP calls made.");
    process.exit(0);
  }

  if (!execute) {
    console.log(`\nMATRIX_STATUS: READY`);
    console.log("Core fixtures present. Student-session cases need:", EXECUTE_EXTRA_KEYS.join(", "));
    console.log("Re-run with --execute after all execute fixtures are exported in shell.");
    process.exit(0);
  }

  const fixtures = loadFixtures();
  const results = await runExecutableCases(fixtures);
  for (const r of results) {
    console.log(`\n[${r.id}] ${r.status}${r.httpStatus ? ` (HTTP ${r.httpStatus}, expected ${r.expected})` : ""}${r.error ? ` — ${r.error}` : ""}${r.reason ? ` — ${r.reason}` : ""}`);
  }
  const overall = summarizeMatrixResults(results);
  console.log(`\nMATRIX_STATUS: ${overall}`);
  process.exit(overall === "FAIL" ? 1 : 0);
}

if (process.argv[1]?.includes("ownership-boundary-http-matrix")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export function assertOwnershipScaffold() {
  assert.ok(OWNERSHIP_HTTP_CASES.length >= 5);
}
