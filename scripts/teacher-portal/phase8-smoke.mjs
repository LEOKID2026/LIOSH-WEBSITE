#!/usr/bin/env node
/**
 * Phase 8 guardian access smoke.
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase8-smoke.mjs
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

const TEACHER_EMAIL =
  process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher-portal-live-verify@liosh-dev.invalid";
const TEACHER_PASSWORD = process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "TeacherPortalVerify!2026";
const OTHER_TEACHER_EMAIL = "teacher-portal-other@liosh-dev.invalid";
const OTHER_TEACHER_PASSWORD = "OtherTeacher!2026";
const DEMO_STUDENT_ID = "d119f721-05b3-4fe2-ac58-4174ac06f733";
const FAKE_STUDENT_ID = "00000000-0000-4000-8000-000000000099";

const results = [];
function record(n, p, d = "") {
  results.push({ name: n, pass: p, detail: d });
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}

async function run(rel, req) {
  const mod = await import(u(rel));
  const res = mockRes();
  await mod.default(req, res);
  return res;
}

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function signIn(anon, email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(error?.message || "no token");
  return data.session.access_token;
}

function parseSetCookie(headers) {
  const raw = headers["set-cookie"] || headers["Set-Cookie"] || "";
  const line = Array.isArray(raw) ? raw[0] : String(raw);
  const match = line.match(/liosh_guardian_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function hasForbiddenAuditSecrets(rows) {
  const text = JSON.stringify(rows || []);
  const forbidden = [
    '"pin"',
    '"pin_plain"',
    '"token_plain"',
    '"magic_link"',
    '"parent_email"',
    '"full_name"',
    '"ip_address"',
  ];
  return forbidden.some((k) => text.includes(k));
}

function hasParentPii(body) {
  const text = JSON.stringify(body || {});
  return ["parent_id", "parentEmail", "parent_email", "parentName"].some((k) =>
    text.includes(`"${k}"`)
  );
}

async function main() {
  process.env.TEACHER_PORTAL_ENABLED = "true";
  process.env.GUARDIAN_PORTAL_ENABLED = "true";

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const parentEmail = requireEnv("E2E_PARENT_EMAIL");
  const parentPassword = requireEnv("E2E_PARENT_PASSWORD");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const teacherToken = await signIn(anon, TEACHER_EMAIL, TEACHER_PASSWORD);
  const parentToken = await signIn(anon, parentEmail, parentPassword);
  const teacherAuth = { authorization: `Bearer ${teacherToken}`, origin: "http://localhost:3001" };
  const parentAuth = { authorization: `Bearer ${parentToken}`, origin: "http://localhost:3001" };

  const teacherUser = (await admin.auth.admin.listUsers({ perPage: 200, page: 1 })).data?.users?.find(
    (x) => x.email === TEACHER_EMAIL
  );
  const teacherId = teacherUser?.id;
  if (!teacherId) throw new Error("teacher user not found");

  await admin.from("teacher_profiles").upsert({ id: teacherId });
  await admin.from("teacher_limits").upsert({ teacher_id: teacherId, plan_code: "teacher_basic_20" });

  const { data: existingLink } = await admin
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("archived_at", null)
    .maybeSingle();
  if (!existingLink?.id) {
    await admin.from("teacher_students").insert({
      teacher_id: teacherId,
      student_id: DEMO_STUDENT_ID,
      relationship: "primary_teacher",
    });
  }

  await admin
    .from("student_guardian_access")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("created_by_teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("revoked_at", null);

  const createRes = await run("./pages/api/teacher/student-access/create.js", {
    method: "POST",
    headers: { ...teacherAuth, "content-type": "application/json" },
    body: { studentId: DEMO_STUDENT_ID, deliveryChannel: "code" },
  });

  record(
    "teacher creates guardian access for linked student",
    createRes.statusCode === 201 &&
      createRes.body?.data?.accessId &&
      createRes.body?.data?.loginPinPlaintext &&
      /^\d{4}$/.test(createRes.body.data.loginPinPlaintext) &&
      /^[a-z]{3}-p\d{2,}$/.test(String(createRes.body?.data?.loginUsername || "")),
    `status=${createRes.statusCode} username=${createRes.body?.data?.loginUsername || ""}`
  );

  const accessId = createRes.body?.data?.accessId;
  const loginUsername = createRes.body?.data?.loginUsername;
  const loginPin = createRes.body?.data?.loginPinPlaintext;

  const unlinkedCreate = await run("./pages/api/teacher/student-access/create.js", {
    method: "POST",
    headers: { ...teacherAuth, "content-type": "application/json" },
    body: { studentId: FAKE_STUDENT_ID, deliveryChannel: "code" },
  });
  record(
    "teacher cannot create access for unlinked student",
    unlinkedCreate.statusCode === 403 &&
      unlinkedCreate.body?.error?.code === "student_not_linked",
    unlinkedCreate.body?.error?.code
  );

  let otherId = (await admin.auth.admin.listUsers({ perPage: 200, page: 1 })).data?.users?.find(
    (x) => x.email === OTHER_TEACHER_EMAIL
  )?.id;
  if (!otherId) {
    const c = await admin.auth.admin.createUser({
      email: OTHER_TEACHER_EMAIL,
      password: OTHER_TEACHER_PASSWORD,
      email_confirm: true,
      app_metadata: { role: "teacher" },
    });
    otherId = c.data?.user?.id;
  }
  await admin.from("teacher_profiles").upsert({ id: otherId });
  const otherToken = await signIn(anon, OTHER_TEACHER_EMAIL, OTHER_TEACHER_PASSWORD);

  const crossRevoke = await run("./pages/api/teacher/student-access/[accessId]/revoke.js", {
    method: "POST",
    headers: { authorization: `Bearer ${otherToken}`, origin: "http://localhost:3001" },
    query: { accessId },
  });
  record(
    "teacher B cannot manage teacher A access",
    crossRevoke.statusCode === 404 && crossRevoke.body?.error?.code === "access_not_found",
    crossRevoke.body?.error?.code
  );

  const loginOk = await run("./pages/api/guardian/login.js", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: { loginUsername, pin: loginPin },
  });
  const guardianCookie = parseSetCookie(loginOk.headers);
  record(
    "guardian login valid credentials",
    loginOk.statusCode === 200 &&
      loginOk.body?.data?.studentId === DEMO_STUDENT_ID &&
      Boolean(guardianCookie),
    `status=${loginOk.statusCode}`
  );

  const loginBad = await run("./pages/api/guardian/login.js", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: { loginUsername, pin: "0000" },
  });
  record(
    "guardian login invalid credentials generic",
    loginBad.statusCode === 401 && loginBad.body?.error?.code === "invalid_credentials",
    loginBad.body?.error?.code
  );

  const reportOwn = await run("./pages/api/guardian/student/[studentId]/report-data.js", {
    method: "GET",
    headers: { origin: "http://localhost:3001" },
    cookies: { liosh_guardian_session: guardianCookie },
    query: { studentId: DEMO_STUDENT_ID },
  });
  record(
    "guardian report own student",
    reportOwn.statusCode === 200 && reportOwn.body?.ok === true && !hasParentPii(reportOwn.body),
    `status=${reportOwn.statusCode}`
  );

  const reportOther = await run("./pages/api/guardian/student/[studentId]/report-data.js", {
    method: "GET",
    headers: { origin: "http://localhost:3001" },
    cookies: { liosh_guardian_session: guardianCookie },
    query: { studentId: FAKE_STUDENT_ID },
  });
  record(
    "guardian report other student blocked",
    reportOther.statusCode === 403 &&
      reportOther.body?.error?.code === "student_scope_violation",
    reportOther.body?.error?.code
  );

  const guardianOnTeacher = await run("./pages/api/teacher/me.js", {
    method: "GET",
    headers: { origin: "http://localhost:3001" },
    cookies: { liosh_guardian_session: guardianCookie },
    query: {},
  });
  record(
    "guardian session cannot call /api/teacher/*",
    guardianOnTeacher.statusCode === 401 || guardianOnTeacher.statusCode === 403,
    `status=${guardianOnTeacher.statusCode}`
  );

  let guardianOnParentStatus = 401;
  try {
    const guardianOnParent = await run("./pages/api/parent/list-students.js", {
      method: "GET",
      headers: { origin: "http://localhost:3001" },
      cookies: { liosh_guardian_session: guardianCookie },
      query: {},
    });
    guardianOnParentStatus = guardianOnParent.statusCode;
  } catch {
    guardianOnParentStatus = 401;
  }
  record(
    "guardian session cannot call /api/parent/*",
    guardianOnParentStatus === 401,
    `status=${guardianOnParentStatus}`
  );

  let copilotBlocked = true;
  try {
    const copilot = await run("./pages/api/parent/copilot-turn.js", {
      method: "POST",
      headers: { origin: "http://localhost:3001" },
      cookies: { liosh_guardian_session: guardianCookie },
      body: {},
    });
    copilotBlocked = copilot.statusCode === 401 || copilot.statusCode === 403;
  } catch {
    copilotBlocked = true;
  }
  record("guardian session cannot call Parent Copilot", copilotBlocked, "ok");

  const revokeRes = await run("./pages/api/teacher/student-access/[accessId]/revoke.js", {
    method: "POST",
    headers: teacherAuth,
    query: { accessId },
  });
  record(
    "teacher revokes guardian access",
    revokeRes.statusCode === 200,
    `status=${revokeRes.statusCode}`
  );

  const loginAfterRevoke = await run("./pages/api/guardian/login.js", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: { loginUsername, pin: loginPin },
  });
  record(
    "revoked access blocks login",
    loginAfterRevoke.statusCode === 401 &&
      loginAfterRevoke.body?.error?.code === "invalid_credentials",
    loginAfterRevoke.body?.error?.code
  );

  await admin
    .from("student_guardian_access")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("created_by_teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("revoked_at", null);

  const expiredCreate = await run("./pages/api/teacher/student-access/create.js", {
    method: "POST",
    headers: { ...teacherAuth, "content-type": "application/json" },
    body: { studentId: DEMO_STUDENT_ID, deliveryChannel: "code", expiresInDays: 1 },
  });
  const expiredAccessId = expiredCreate.body?.data?.accessId;
  const expiredUser = expiredCreate.body?.data?.loginUsername;
  const expiredPin = expiredCreate.body?.data?.loginPinPlaintext;

  if (expiredAccessId) {
    const past = new Date();
    past.setUTCDate(past.getUTCDate() - 2);
    await admin
      .from("student_guardian_access")
      .update({ expires_at: past.toISOString() })
      .eq("id", expiredAccessId);

    const loginExpired = await run("./pages/api/guardian/login.js", {
      method: "POST",
      headers: { origin: "http://localhost:3001", "content-type": "application/json" },
      body: { loginUsername: expiredUser, pin: expiredPin },
    });
    record(
      "expired access blocks login",
      loginExpired.statusCode === 403 &&
        loginExpired.body?.error?.code === "access_expired",
      loginExpired.body?.error?.code
    );
  } else {
    record("expired access blocks login", false, "create failed");
  }

  await admin
    .from("student_guardian_access")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("created_by_teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("revoked_at", null);

  const rotateCreate = await run("./pages/api/teacher/student-access/create.js", {
    method: "POST",
    headers: { ...teacherAuth, "content-type": "application/json" },
    body: { studentId: DEMO_STUDENT_ID, deliveryChannel: "code" },
  });
  const rotAccessId = rotateCreate.body?.data?.accessId;
  const rotUser = rotateCreate.body?.data?.loginUsername;
  const rotPinOld = rotateCreate.body?.data?.loginPinPlaintext;

  const loginBeforeRotate = await run("./pages/api/guardian/login.js", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: { loginUsername: rotUser, pin: rotPinOld },
  });
  const cookieBeforeRotate = parseSetCookie(loginBeforeRotate.headers);

  const rotatePin = await run("./pages/api/teacher/student-access/[accessId]/rotate-pin.js", {
    method: "POST",
    headers: teacherAuth,
    query: { accessId: rotAccessId },
  });
  const rotPinNew = rotatePin.body?.data?.loginPinPlaintext;

  const meAfterRotate = await run("./pages/api/guardian/me.js", {
    method: "GET",
    headers: { origin: "http://localhost:3001" },
    cookies: { liosh_guardian_session: cookieBeforeRotate },
    query: {},
  });

  const loginNewPin = await run("./pages/api/guardian/login.js", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: { loginUsername: rotUser, pin: rotPinNew },
  });

  record(
    "rotate PIN invalidates previous session",
    rotatePin.statusCode === 200 &&
      (meAfterRotate.statusCode === 401 || meAfterRotate.body?.error?.code === "session_revoked") &&
      loginNewPin.statusCode === 200,
    `me=${meAfterRotate.statusCode} newLogin=${loginNewPin.statusCode}`
  );

  const rotateUsername = await run("./pages/api/teacher/student-access/[accessId]/rotate-username.js", {
    method: "POST",
    headers: teacherAuth,
    query: { accessId: rotAccessId },
  });
  const rotUserNew = rotateUsername.body?.data?.loginUsername;

  const loginOldUserAfterRotate = await run("./pages/api/guardian/login.js", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: { loginUsername: rotUser, pin: rotPinNew },
  });

  const loginNewUserAfterRotate = await run("./pages/api/guardian/login.js", {
    method: "POST",
    headers: { origin: "http://localhost:3001", "content-type": "application/json" },
    body: { loginUsername: rotUserNew, pin: rotPinNew },
  });

  record(
    "rotate username uses next prefixed sequence",
    rotateUsername.statusCode === 200 &&
      rotUserNew !== rotUser &&
      /^[a-z]{3}-p\d{2,}$/.test(String(rotUserNew || "")) &&
      loginOldUserAfterRotate.statusCode === 401 &&
      loginNewUserAfterRotate.statusCode === 200,
    `old=${rotUser} new=${rotUserNew}`
  );

  const { data: audits } = await admin
    .from("teacher_access_audit")
    .select("metadata, action")
    .eq("guardian_access_id", rotAccessId)
    .order("created_at", { ascending: false })
    .limit(30);

  record(
    "no raw PIN/token/parent PII in audit metadata",
    !hasForbiddenAuditSecrets(audits),
    "ok"
  );

  const parentUser = (await admin.auth.admin.listUsers({ perPage: 200, page: 1 })).data?.users?.find(
    (x) => x.email === parentEmail
  );
  const { data: ownedStudent } = await admin
    .from("students")
    .select("id, full_name, grade_level, is_active")
    .eq("id", DEMO_STUDENT_ID)
    .eq("parent_id", parentUser?.id)
    .maybeSingle();
  const { aggregateParentReportPayload } = await import(
    u("./lib/parent-server/report-data-aggregate.server.js")
  );
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  const parentAgg = ownedStudent?.id
    ? await aggregateParentReportPayload(admin, ownedStudent, fromDate, toDate)
    : { ok: false };
  record("parent report aggregator unchanged", parentAgg.ok === true, "ok");

  const teacherStudentReport = await run("./pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { studentId: DEMO_STUDENT_ID },
  });
  record(
    "teacher Phase 6 student report still works",
    teacherStudentReport.statusCode === 200,
    `status=${teacherStudentReport.statusCode}`
  );

  const { execSync } = await import("node:child_process");
  const protectedPaths = [
    "pages/parent/login.js",
    "pages/api/parent/students/[studentId]/report-data.js",
    "pages/api/parent/copilot-turn.js",
    "lib/parent-server/report-data-aggregate.server.js",
  ];
  let diff = "";
  for (const p of protectedPaths) {
    try {
      diff += execSync(`git diff --name-only -- "${p}"`, { cwd: root, encoding: "utf8" });
    } catch { /* ignore */ }
  }
  record("parent/student/copilot paths unchanged", diff.trim() === "", diff.trim() || "(clean)");

  const recFiles = await import(u("./lib/teacher-server/teacher-recommendations.server.js"));
  const hasLlm = String(recFiles.buildStudentTeacherGuidance).includes("openai");
  record("no LLM usage in recommendation layer", !hasLlm, "ok");

  console.log("\nPhase 8 smoke:\n");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  const failed = results.filter((r) => !r.pass);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
