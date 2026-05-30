#!/usr/bin/env node
/**
 * Phase 1–3 runtime acceptance — live HTTP checks where fixtures exist.
 * Safe / non-destructive where possible. Does not fake PASS when fixtures missing.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=.env.e2e.local scripts/security/phase1-3-runtime-acceptance.mjs
 *
 * Optional env (falls back to OWNERSHIP_TEST_* where noted):
 *   PHASE13_BASE_URL / OWNERSHIP_TEST_BASE_URL (default http://localhost:3000)
 *   PHASE13_PARENT_A_BEARER / OWNERSHIP_TEST_PARENT_A_BEARER
 *   PHASE13_PARENT_B_CHILD_ID / OWNERSHIP_TEST_STUDENT_B_ID
 *   PHASE13_PARENT_A_OWN_CHILD_ID / OWNERSHIP_TEST_STUDENT_A_ID
 *   PHASE13_TEACHER_JWT — private/school teacher bearer for policy-acceptance 403 test
 *   PHASE13_ADMIN_JWT — admin bearer for policy-acceptance 403 test
 *   PHASE13_PARENT_JWT — real parent bearer for policy status 200 test
 *   PHASE13_TEACHER_A_BEARER — private teacher A JWT
 *   PHASE13_TEACHER_B_STUDENT_ID — student owned by teacher B
 *   PHASE13_TEACHER_B_ACTIVITY_ID — activity owned by teacher B
 *   PHASE13_STUDENT_A_COOKIE — liosh_student_session cookie value
 *   PHASE13_STUDENT_B_ACTIVITY_ID — activity for student B
 *   PHASE13_STUDENT_ACTIVE_ACTIVITY_ID — active assigned activity for student A
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

/** @typedef {'PASS'|'FAIL'|'NOT_RUN'|'STATIC_PASS'} ResultStatus */
/** @type {Array<{ area: string, name: string, status: ResultStatus, detail: string }>} */
const results = [];

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function baseUrl() {
  return (env("PHASE13_BASE_URL") || env("OWNERSHIP_TEST_BASE_URL") || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

function record(area, name, status, detail = "") {
  results.push({ area, name, status, detail });
  const tag = status === "PASS" || status === "STATIC_PASS" ? "PASS" : status;
  console.log(`[${tag}] ${area} — ${name}${detail ? `: ${detail}` : ""}`);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

async function http(method, urlPath, { bearer, cookie, body, expectedStatuses } = {}) {
  const headers = { Accept: "application/json" };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (cookie) headers.Cookie = `liosh_student_session=${encodeURIComponent(cookie)}`;
  if (body != null) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${baseUrl()}${urlPath}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const ok = expectedStatuses.includes(res.status);
  return { ok, status: res.status, json, text: text.slice(0, 500) };
}

function runStaticChecks() {
  const sw = read("public/sw.js");
  const swSkipsApi =
    sw.includes("url.pathname.startsWith('/api/')") &&
    /Skip API routes/.test(sw);
  record(
    "PWA",
    "Service worker skips /api/ routes (no SW cache of protected APIs)",
    swSkipsApi ? "STATIC_PASS" : "FAIL",
    swSkipsApi ? "public/sw.js early return for /api/" : "missing API skip"
  );

  const studentMe = read("pages/api/student/me.js");
  record(
    "PWA",
    "Student /me sets no-store cache headers",
    /Cache-Control.*no-store/.test(studentMe) ? "STATIC_PASS" : "FAIL"
  );

  const logout = read("pages/api/student/logout.js");
  const logoutRevokes =
    logout.includes("clearStudentSessionCookie") &&
    logout.includes("revoked_at") &&
    logout.includes("ended_at");
  record(
    "Student logout",
    "Logout clears cookie and revokes DB session (source)",
    logoutRevokes ? "STATIC_PASS" : "FAIL"
  );

  const studentAuth = read("lib/learning-supabase/student-auth.js");
  record(
    "Student session",
    "Null access_code_id fail-closed in getAuthenticatedStudentSession",
    /!sessionRow\.access_code_id[\s\S]*return null/.test(studentAuth) ? "STATIC_PASS" : "FAIL"
  );

  const batchMon = read("lib/teacher-server/student-activity.server.js");
  record(
    "Private teacher",
    "Batch monitor subject re-check (source)",
    /loadStudentActivityBatchMonitor[\s\S]*assertActivitySubjectAllowed/.test(batchMon)
      ? "STATIC_PASS"
      : "FAIL"
  );

  const policy = read("lib/parent-server/policy-acceptance.server.js");
  record(
    "Parent policy",
    "Non-parent persona blocked before parentUserId return (source)",
    /assertPolicyAcceptanceParentEligible/.test(policy) ? "STATIC_PASS" : "FAIL"
  );
}

async function runParentOwnershipLive() {
  const parentA = env("PHASE13_PARENT_A_BEARER") || env("OWNERSHIP_TEST_PARENT_A_BEARER");
  const childB = env("PHASE13_PARENT_B_CHILD_ID") || env("OWNERSHIP_TEST_STUDENT_B_ID");
  const ownChild = env("PHASE13_PARENT_A_OWN_CHILD_ID") || env("OWNERSHIP_TEST_STUDENT_A_ID");

  if (!parentA) {
    record("Parent", "Parent A → Parent B child report-data → 403/404", "NOT_RUN", "missing parent A bearer");
    record("Parent", "Parent A → own child report-data → 200", "NOT_RUN", "missing parent A bearer");
    return;
  }

  if (childB) {
    const foreign = await http(
      "GET",
      `/api/parent/students/${encodeURIComponent(childB)}/report-data`,
      { bearer: parentA, expectedStatuses: [403, 404] }
    );
    record(
      "Parent",
      "Parent A → Parent B child report-data → 403/404",
      foreign.ok ? "PASS" : "FAIL",
      `HTTP ${foreign.status}`
    );
  } else {
    record("Parent", "Parent A → Parent B child report-data → 403/404", "NOT_RUN", "missing child B id");
  }

  if (ownChild) {
    const own = await http(
      "GET",
      `/api/parent/students/${encodeURIComponent(ownChild)}/report-data`,
      { bearer: parentA, expectedStatuses: [200] }
    );
    record(
      "Parent",
      "Parent A → own child report-data → 200",
      own.ok ? "PASS" : "FAIL",
      `HTTP ${own.status}`
    );
  } else {
    record("Parent", "Parent A → own child report-data → 200", "NOT_RUN", "missing own child id");
  }
}

async function runPolicyAcceptanceLive() {
  const teacherJwt = env("PHASE13_TEACHER_JWT");
  const adminJwt = env("PHASE13_ADMIN_JWT");
  const parentJwt = env("PHASE13_PARENT_JWT") || env("PHASE13_PARENT_A_BEARER");

  if (teacherJwt) {
    const r = await http("POST", "/api/parent/policy-acceptance/accept", {
      bearer: teacherJwt,
      body: { version: "test" },
      expectedStatuses: [403],
    });
    record(
      "Parent policy",
      "Teacher JWT → POST policy-acceptance/accept → 403",
      r.ok ? "PASS" : "FAIL",
      `HTTP ${r.status}`
    );
  } else {
    record(
      "Parent policy",
      "Teacher JWT → POST policy-acceptance/accept → 403",
      "NOT_RUN",
      "set PHASE13_TEACHER_JWT"
    );
  }

  if (adminJwt) {
    const r = await http("POST", "/api/parent/policy-acceptance/accept", {
      bearer: adminJwt,
      body: { version: "test" },
      expectedStatuses: [403],
    });
    record(
      "Parent policy",
      "Admin JWT → POST policy-acceptance/accept → 403",
      r.ok ? "PASS" : "FAIL",
      `HTTP ${r.status}`
    );
  } else {
    record(
      "Parent policy",
      "Admin JWT → POST policy-acceptance/accept → 403",
      "NOT_RUN",
      "set PHASE13_ADMIN_JWT"
    );
  }

  if (parentJwt) {
    const r = await http("GET", "/api/parent/policy-acceptance/status", {
      bearer: parentJwt,
      expectedStatuses: [200],
    });
    record(
      "Parent policy",
      "Real parent JWT → GET policy status → 200",
      r.ok ? "PASS" : "FAIL",
      `HTTP ${r.status}`
    );
  } else {
    record(
      "Parent policy",
      "Real parent JWT → GET policy status → 200",
      "NOT_RUN",
      "set PHASE13_PARENT_JWT or PHASE13_PARENT_A_BEARER"
    );
  }
}

async function runPrivateTeacherLive() {
  const teacherA = env("PHASE13_TEACHER_A_BEARER");
  const studentB = env("PHASE13_TEACHER_B_STUDENT_ID");
  const activityB = env("PHASE13_TEACHER_B_ACTIVITY_ID");

  if (!teacherA) {
    record("Private teacher", "Teacher A → Teacher B student/report → 403/404", "NOT_RUN", "missing PHASE13_TEACHER_A_BEARER");
    return;
  }

  if (studentB) {
    const r = await http("GET", `/api/teacher/students/${encodeURIComponent(studentB)}`, {
      bearer: teacherA,
      expectedStatuses: [403, 404],
    });
    record(
      "Private teacher",
      "Teacher A → Teacher B student detail → 403/404",
      r.ok ? "PASS" : "FAIL",
      `HTTP ${r.status}`
    );
  } else {
    record("Private teacher", "Teacher A → Teacher B student detail → 403/404", "NOT_RUN", "missing PHASE13_TEACHER_B_STUDENT_ID");
  }

  if (activityB) {
    const r = await http(
      "GET",
      `/api/teacher/student-activities/${encodeURIComponent(activityB)}/report`,
      { bearer: teacherA, expectedStatuses: [403, 404] }
    );
    record(
      "Private teacher",
      "Teacher A → Teacher B activity report → 403/404",
      r.ok ? "PASS" : "FAIL",
      `HTTP ${r.status}`
    );
  } else {
    record(
      "Private teacher",
      "Teacher A → Teacher B activity report → 403/404",
      "NOT_RUN",
      "missing PHASE13_TEACHER_B_ACTIVITY_ID"
    );
  }
}

async function runStudentLive() {
  const cookie = env("PHASE13_STUDENT_A_COOKIE") || env("OWNERSHIP_TEST_STUDENT_A_COOKIE");
  const activityB = env("PHASE13_STUDENT_B_ACTIVITY_ID");

  if (!cookie) {
    record("Student", "Student A session → /api/student/me → 200", "NOT_RUN", "missing student cookie");
    record("Student", "Student A → Student B activity → 403/404", "NOT_RUN", "missing student cookie");
    return;
  }

  const me = await http("GET", "/api/student/me", {
    cookie,
    expectedStatuses: [200],
  });
  record(
    "Student",
    "Student A session → /api/student/me → 200",
    me.ok ? "PASS" : "FAIL",
    `HTTP ${me.status}`
  );

  if (activityB) {
    const start = await http(
      "POST",
      `/api/student/activities/${encodeURIComponent(activityB)}/start`,
      { cookie, body: {}, expectedStatuses: [403, 404] }
    );
    record(
      "Student",
      "Student A → Student B activity start → 403/404",
      start.ok ? "PASS" : "FAIL",
      `HTTP ${start.status}`
    );
  } else {
    record(
      "Student",
      "Student A → Student B activity start → 403/404",
      "NOT_RUN",
      "missing PHASE13_STUDENT_B_ACTIVITY_ID"
    );
  }

  const logout = await http("POST", "/api/student/logout", {
    cookie,
    expectedStatuses: [200],
  });
  record(
    "Student",
    "Student logout → 200",
    logout.ok ? "PASS" : "FAIL",
    `HTTP ${logout.status}`
  );

  const afterLogout = await http("GET", "/api/student/me", {
    cookie,
    expectedStatuses: [401],
  });
  record(
    "Student",
    "After logout same cookie → /api/student/me → 401",
    afterLogout.ok ? "PASS" : "FAIL",
    `HTTP ${afterLogout.status}`
  );
}

function printSummary() {
  const pass = results.filter((r) => r.status === "PASS" || r.status === "STATIC_PASS");
  const fail = results.filter((r) => r.status === "FAIL");
  const notRun = results.filter((r) => r.status === "NOT_RUN");

  console.log("\n--- Phase 1–3 runtime acceptance summary ---");
  console.log(`STATIC/LIVE PASS: ${pass.length}`);
  console.log(`FAIL: ${fail.length}`);
  console.log(`NOT RUN: ${notRun.length}`);

  if (fail.length) {
    console.log("\nFailures:");
    for (const f of fail) console.log(`  - [${f.area}] ${f.name}: ${f.detail}`);
  }
  if (notRun.length) {
    console.log("\nNOT RUN (fixtures/credentials required):");
    for (const n of notRun) console.log(`  - [${n.area}] ${n.name}: ${n.detail}`);
  }

  const liveCases = results.filter((r) => r.status !== "STATIC_PASS");
  const livePass = liveCases.filter((r) => r.status === "PASS");
  const liveFail = liveCases.filter((r) => r.status === "FAIL");
  const liveNotRun = liveCases.filter((r) => r.status === "NOT_RUN");

  console.log("\nLive HTTP: PASS", livePass.length, "FAIL", liveFail.length, "NOT_RUN", liveNotRun.length);
  console.log(
    "\nNote: Block/revoke/PIN-rotate → 401 requires manual admin action during test (not automated here)."
  );
  console.log(
    "Note: PWA offline replay of protected payloads requires browser manual verification (see final summary)."
  );

  if (fail.length) process.exit(1);
}

async function main() {
  console.log(`Phase 1–3 runtime acceptance — base URL: ${baseUrl()}\n`);
  runStaticChecks();
  console.log("");
  try {
    await runParentOwnershipLive();
    await runPolicyAcceptanceLive();
    await runPrivateTeacherLive();
    await runStudentLive();
  } catch (err) {
    console.error("Live HTTP error (is dev server running?):", err.message);
    record("Runtime", "Live HTTP suite", "FAIL", err.message);
  }
  printSummary();
}

main();
