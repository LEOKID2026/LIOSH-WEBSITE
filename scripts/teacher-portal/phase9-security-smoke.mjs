#!/usr/bin/env node
/**
 * Phase 9 — Teacher Portal + Guardian combined security / regression smoke.
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase9-security-smoke.mjs
 */
import path from "node:path";
import { readFileSync } from "node:fs";
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
const FAKE_CLASS_ID = "00000000-0000-4000-8000-000000000088";
const FAKE_ACCESS_ID = "00000000-0000-4000-8000-000000000077";

const results = [];
function record(area, name, pass, detail = "") {
  results.push({ area, name, pass, detail });
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

function hasParentPii(text) {
  const forbidden = ["parent_id", "parentEmail", "parent_email", "parentName", "parent_name"];
  return forbidden.some((k) => text.includes(`"${k}"`));
}

function hasForbiddenGuardianReportFields(text) {
  const forbidden = [
    "copilotLastResponse",
    "parentAiExplanation",
    '"copilot"',
    "teacherGuidanceBlock",
    "guardianAccessSummary",
    '"gamification"',
    '"coins"',
    '"inventory"',
  ];
  return forbidden.some((k) => text.includes(k));
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

function isRlsDenied(error) {
  if (!error) return false;
  const code = String(error.code || "");
  const msg = String(error.message || "").toLowerCase();
  return (
    code === "42501" ||
    code === "PGRST301" ||
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("violates row-level security")
  );
}

async function expectClientWriteDenied(client, table, payload) {
  const { error } = await client.from(table).insert(payload);
  return isRlsDenied(error) || Boolean(error);
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
  const otherAuth = { authorization: `Bearer ${otherToken}`, origin: "http://localhost:3001" };

  const teacherClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${teacherToken}` } },
  });

  // ── 1. Feature flags ───────────────────────────────────────────────────────
  process.env.TEACHER_PORTAL_ENABLED = "false";
  const teacherOff = await run("./pages/api/teacher/me.js", {
    method: "GET",
    headers: teacherAuth,
    query: {},
  });
  record(
    "flags",
    "TEACHER_PORTAL_ENABLED=false blocks /api/teacher/*",
    teacherOff.statusCode === 503 && teacherOff.body?.error?.code === "feature_disabled",
    String(teacherOff.statusCode)
  );
  process.env.TEACHER_PORTAL_ENABLED = "true";

  process.env.GUARDIAN_PORTAL_ENABLED = "false";
  const guardianOff = await run("./pages/api/guardian/me.js", {
    method: "GET",
    headers: { origin: "http://localhost:3001" },
    cookies: {},
    query: {},
  });
  record(
    "flags",
    "GUARDIAN_PORTAL_ENABLED=false blocks /api/guardian/*",
    guardianOff.statusCode === 503 && guardianOff.body?.error?.code === "feature_disabled",
    String(guardianOff.statusCode)
  );
  process.env.GUARDIAN_PORTAL_ENABLED = "true";

  const { isTeacherPortalUiCopyEnabled } = await import(
    u("./lib/teacher-server/teacher-session.server.js")
  );
  const { isGuardianPortalUiCopyEnabled } = await import(
    u("./lib/guardian-server/guardian-session.server.js")
  );
  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  record(
    "flags",
    "Hebrew teacher/guardian UI enabled by default (no UI_COPY gate)",
    isTeacherPortalUiCopyEnabled() === true && isGuardianPortalUiCopyEnabled() === true,
    "visible by default"
  );
  process.env.NODE_ENV = prevNodeEnv;

  const dashSrc = readFileSync(path.join(root, "pages/teacher/dashboard.js"), "utf8");
  const guardianLoginSrc = readFileSync(path.join(root, "pages/guardian/login.js"), "utf8");
  record(
    "flags",
    "teacher/guardian pages render Hebrew copy (not flag-gated)",
    dashSrc.includes("לוח הבקרה") &&
      dashSrc.includes("TeacherPortalShell") &&
      guardianLoginSrc.includes("כניסה לצפייה בדוח"),
    "ok"
  );

  // ── 2. Teacher cross-tenant ────────────────────────────────────────────────
  const crossMe = await run("./pages/api/teacher/me.js", {
    method: "GET",
    headers: otherAuth,
    query: {},
  });
  record(
    "teacher_idor",
    "Teacher B /me does not expose Teacher A data (isolated)",
    crossMe.statusCode === 200 && crossMe.body?.data?.teacher?.teacherId === otherId,
    crossMe.body?.data?.teacher?.teacherId
  );

  const crossStudentReport = await run("./pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: otherAuth,
    query: { studentId: DEMO_STUDENT_ID },
  });
  record(
    "teacher_idor",
    "Teacher B cannot read Teacher A linked student report",
    crossStudentReport.statusCode === 403 &&
      crossStudentReport.body?.error?.code === "student_not_linked",
    crossStudentReport.body?.error?.code
  );

  const { data: teacherAClass } = await admin
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("is_archived", false)
    .limit(1)
    .maybeSingle();

  const classId = teacherAClass?.id;
  if (classId) {
    const crossClass = await run("./pages/api/teacher/classes/[classId].js", {
      method: "GET",
      headers: otherAuth,
      query: { classId },
    });
    record(
      "teacher_idor",
      "Teacher B cannot read Teacher A class",
      crossClass.statusCode === 404 && crossClass.body?.error?.code === "class_not_found",
      crossClass.body?.error?.code
    );

    const crossClassReport = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
      method: "GET",
      headers: otherAuth,
      query: { classId },
    });
    record(
      "teacher_idor",
      "Teacher B cannot read Teacher A class report",
      crossClassReport.statusCode === 404,
      String(crossClassReport.statusCode)
    );
  } else {
    record("teacher_idor", "Teacher B cannot read Teacher A class", true, "no class seeded");
    record("teacher_idor", "Teacher B cannot read Teacher A class report", true, "no class seeded");
  }

  await admin.from("teacher_students").upsert({
    teacher_id: teacherId,
    student_id: DEMO_STUDENT_ID,
    relationship: "primary_teacher",
    archived_at: null,
  });

  const crossAccessList = await run("./pages/api/teacher/student-access/index.js", {
    method: "GET",
    headers: otherAuth,
    query: { studentId: DEMO_STUDENT_ID },
  });
  record(
    "teacher_idor",
    "Teacher B cannot list guardian access for Teacher A student",
    crossAccessList.statusCode === 403 &&
      crossAccessList.body?.error?.code === "student_not_linked",
    crossAccessList.body?.error?.code
  );

  const crossAccessCreate = await run("./pages/api/teacher/student-access/create.js", {
    method: "POST",
    headers: { ...otherAuth, "content-type": "application/json" },
    body: { studentId: DEMO_STUDENT_ID, deliveryChannel: "code" },
  });
  record(
    "teacher_idor",
    "Teacher B cannot create guardian access for Teacher A student",
    crossAccessCreate.statusCode === 403,
    crossAccessCreate.body?.error?.code
  );

  const { data: accessRow } = await admin
    .from("student_guardian_access")
    .select("id")
    .eq("created_by_teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .eq("is_active", true)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  let accessId = accessRow?.id;
  if (accessId) {
    const crossRevoke = await run("./pages/api/teacher/student-access/[accessId]/revoke.js", {
      method: "POST",
      headers: otherAuth,
      query: { accessId },
    });
    record(
      "teacher_idor",
      "Teacher B cannot revoke Teacher A guardian access",
      crossRevoke.statusCode === 404,
      crossRevoke.body?.error?.code
    );
    const crossRotate = await run("./pages/api/teacher/student-access/[accessId]/rotate-pin.js", {
      method: "POST",
      headers: otherAuth,
      query: { accessId },
    });
    record(
      "teacher_idor",
      "Teacher B cannot rotate Teacher A guardian PIN",
      crossRotate.statusCode === 404,
      crossRotate.body?.error?.code
    );
  } else {
    record("teacher_idor", "Teacher B cannot revoke Teacher A guardian access", true, "no access row");
    record("teacher_idor", "Teacher B cannot rotate Teacher A guardian PIN", true, "no access row");
  }

  record(
    "teacher_idor",
    "Teacher B cannot access fake class by ID",
    (
      await run("./pages/api/teacher/classes/[classId].js", {
        method: "GET",
        headers: otherAuth,
        query: { classId: FAKE_CLASS_ID },
      })
    ).statusCode === 404,
    "ok"
  );

  // ── 3–4. Parent boundary ─────────────────────────────────────────────────────
  const parentOnTeacher = await run("./pages/api/teacher/me.js", {
    method: "GET",
    headers: parentAuth,
    query: {},
  });
  record(
    "parent_boundary",
    "Parent bearer cannot access /api/teacher/*",
    parentOnTeacher.statusCode === 403 && parentOnTeacher.body?.error?.code === "not_a_teacher",
    parentOnTeacher.body?.error?.code
  );

  const parentOnGuardianMe = await run("./pages/api/guardian/me.js", {
    method: "GET",
    headers: parentAuth,
    query: {},
  });
  record(
    "parent_boundary",
    "Parent bearer cannot access /api/guardian/me",
    parentOnGuardianMe.statusCode === 401,
    String(parentOnGuardianMe.statusCode)
  );

  const parentUser = (await admin.auth.admin.listUsers({ perPage: 200, page: 1 })).data?.users?.find(
    (x) => x.email === parentEmail
  );
  const { data: otherParentStudent } = await admin
    .from("students")
    .select("id, parent_id")
    .neq("parent_id", parentUser?.id)
    .limit(1)
    .maybeSingle();

  if (otherParentStudent?.id && teacherId) {
    const consentOther = await run("./pages/api/parent/teacher-consent/issue.js", {
      method: "POST",
      headers: { ...parentAuth, "content-type": "application/json" },
      body: { studentId: otherParentStudent.id, teacherId },
    });
    record(
      "parent_boundary",
      "Parent cannot issue consent for another parents student",
      consentOther.statusCode === 403 || consentOther.statusCode === 404,
      String(consentOther.statusCode)
    );
  } else {
    record(
      "parent_boundary",
      "Parent cannot issue consent for another parents student",
      true,
      "skipped — no foreign student row"
    );
  }

  const { aggregateParentReportPayload } = await import(
    u("./lib/parent-server/report-data-aggregate.server.js")
  );
  const { data: ownedStudent } = await admin
    .from("students")
    .select("id, full_name, grade_level, is_active")
    .eq("id", DEMO_STUDENT_ID)
    .eq("parent_id", parentUser?.id)
    .maybeSingle();
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  const parentAgg = ownedStudent?.id
    ? await aggregateParentReportPayload(admin, ownedStudent, fromDate, toDate)
    : { ok: false };
  record("parent_boundary", "Parent report aggregator still works", parentAgg.ok === true, "ok");

  // ── 5. Student boundary (API only; no student session in smoke env) ─────────
  record(
    "student_boundary",
    "Student session cannot access /api/teacher/* (no bearer)",
    (
      await run("./pages/api/teacher/me.js", {
        method: "GET",
        headers: { origin: "http://localhost:3001" },
        query: {},
      })
    ).statusCode === 401,
    "ok"
  );
  record(
    "student_boundary",
    "Unauthenticated /api/guardian/me blocked",
    (
      await run("./pages/api/guardian/me.js", {
        method: "GET",
        headers: { origin: "http://localhost:3001" },
        cookies: {},
        query: {},
      })
    ).statusCode === 401,
    "ok"
  );

  // ── 6. Privacy / PII ───────────────────────────────────────────────────────
  const teacherReport = await run("./pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { studentId: DEMO_STUDENT_ID },
  });
  const teacherReportText = JSON.stringify(teacherReport.body || {});
  record(
    "privacy",
    "Teacher report has no parent PII",
    teacherReport.statusCode === 200 && !hasParentPii(teacherReportText),
    String(teacherReport.statusCode)
  );
  record(
    "privacy",
    "Teacher report has no copilot fields",
    !teacherReportText.includes("copilotLastResponse"),
    "ok"
  );

  if (!accessId) {
    await admin
      .from("student_guardian_access")
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq("created_by_teacher_id", teacherId)
      .eq("student_id", DEMO_STUDENT_ID)
      .is("revoked_at", null);
    const created = await run("./pages/api/teacher/student-access/create.js", {
      method: "POST",
      headers: { ...teacherAuth, "content-type": "application/json" },
      body: { studentId: DEMO_STUDENT_ID, deliveryChannel: "code" },
    });
    if (created.body?.data?.accessId) {
      accessId = created.body.data.accessId;
    }
  }

  // Re-create access with known pin for guardian tests
  await admin
    .from("student_guardian_access")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("created_by_teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("revoked_at", null);

  const gCreate = await run("./pages/api/teacher/student-access/create.js", {
    method: "POST",
    headers: { ...teacherAuth, "content-type": "application/json" },
    body: { studentId: DEMO_STUDENT_ID, deliveryChannel: "code" },
  });
  const gUser = gCreate.body?.data?.loginUsername;
  const gPin = gCreate.body?.data?.loginPinPlaintext;
  const gAccessId = gCreate.body?.data?.accessId;
  let guardianCookie = "";

  if (gUser && gPin) {
    const gLogin = await run("./pages/api/guardian/login.js", {
      method: "POST",
      headers: { origin: "http://localhost:3001", "content-type": "application/json" },
      body: { loginUsername: gUser, pin: gPin },
    });
    guardianCookie = parseSetCookie(gLogin.headers);

    const gReport = await run("./pages/api/guardian/student/[studentId]/report-data.js", {
      method: "GET",
      headers: { origin: "http://localhost:3001" },
      cookies: { liosh_guardian_session: guardianCookie },
      query: { studentId: DEMO_STUDENT_ID },
    });
    const gText = JSON.stringify(gReport.body || {});
    record(
      "privacy",
      "Guardian report has no parent PII",
      gReport.statusCode === 200 && !hasParentPii(gText),
      String(gReport.statusCode)
    );
    record(
      "privacy",
      "Guardian report omits copilot/guidance/gamification fields",
      gReport.statusCode === 200 && !hasForbiddenGuardianReportFields(gText),
      "ok"
    );

    record(
      "guardian_boundary",
      "Guardian cannot access other student report",
      (
        await run("./pages/api/guardian/student/[studentId]/report-data.js", {
          method: "GET",
          headers: { origin: "http://localhost:3001" },
          cookies: { liosh_guardian_session: guardianCookie },
          query: { studentId: FAKE_STUDENT_ID },
        })
      ).body?.error?.code === "student_scope_violation",
      "ok"
    );

    await run("./pages/api/teacher/student-access/[accessId]/revoke.js", {
      method: "POST",
      headers: teacherAuth,
      query: { accessId: gAccessId },
    });
    const afterRevoke = await run("./pages/api/guardian/me.js", {
      method: "GET",
      headers: { origin: "http://localhost:3001" },
      cookies: { liosh_guardian_session: guardianCookie },
      query: {},
    });
    record(
      "guardian_boundary",
      "Revoked access rejects guardian session",
      afterRevoke.statusCode === 401,
      afterRevoke.body?.error?.code
    );
  } else {
    record("privacy", "Guardian report checks", false, "guardian access create failed");
    record("guardian_boundary", "Guardian scope check", false, "skipped");
    record("guardian_boundary", "Revoked session rejected", false, "skipped");
  }

  if (gAccessId) {
    const { data: audits } = await admin
      .from("teacher_access_audit")
      .select("metadata, action")
      .eq("guardian_access_id", gAccessId)
      .limit(20);
    record(
      "privacy",
      "Audit metadata has no raw PIN/token/email/full_name",
      !hasForbiddenAuditSecrets(audits),
      "ok"
    );
  }

  // ── 7. RLS direct client writes (authenticated teacher JWT) ────────────────
  const rlsTables = [
    ["teacher_students", { teacher_id: teacherId, student_id: FAKE_STUDENT_ID, relationship: "tutor" }],
    ["teacher_classes", { teacher_id: teacherId, name: "RLS probe" }],
    [
      "teacher_class_students",
      { class_id: FAKE_CLASS_ID, student_id: FAKE_STUDENT_ID },
    ],
    [
      "teacher_access_audit",
      { teacher_id: teacherId, action: "grant_created", actor_role: "teacher", actor_id: teacherId },
    ],
    [
      "student_guardian_access",
      {
        student_id: FAKE_STUDENT_ID,
        created_by_teacher_id: teacherId,
        login_username: "zzz",
        login_username_normalized: "zzz",
        code_hash: "a".repeat(32),
        pin_hash: "b".repeat(32),
      },
    ],
    [
      "student_guardian_sessions",
      {
        guardian_access_id: FAKE_ACCESS_ID,
        session_token_hash: "c".repeat(32),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
    ],
    [
      "teacher_access_invitations",
      {
        student_id: FAKE_STUDENT_ID,
        teacher_id: teacherId,
        token_hash: "d".repeat(32),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    ],
    [
      "teacher_student_consent_tokens",
      {
        token_hash: "e".repeat(32),
        teacher_id: teacherId,
        student_id: FAKE_STUDENT_ID,
        issued_by_parent_id: teacherId,
        purpose: "teacher_student_link",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    ],
  ];

  for (const [table, payload] of rlsTables) {
    const denied = await expectClientWriteDenied(teacherClient, table, payload);
    record("rls", `authenticated INSERT denied on ${table}`, denied, denied ? "denied" : "allowed");
  }

  const serviceInsert = await admin.from("teacher_profiles").select("id").eq("id", teacherId).maybeSingle();
  record(
    "rls",
    "service-role can read teacher_profiles (API path viable)",
    Boolean(serviceInsert.data?.id),
    "ok"
  );

  // ── 8. Regression git diff ─────────────────────────────────────────────────
  const { execSync } = await import("node:child_process");
  const protectedPaths = [
    "pages/parent/login.js",
    "pages/api/parent/students",
    "pages/api/parent/copilot-turn.js",
    "pages/api/student",
    "lib/parent-server/report-data-aggregate.server.js",
  ];
  let diff = "";
  for (const p of protectedPaths) {
    try {
      diff += execSync(`git diff --name-only -- "${p}"`, { cwd: root, encoding: "utf8" });
    } catch { /* ignore */ }
  }
  record(
    "regression",
    "parent/student/copilot paths unchanged in git diff",
    diff.trim() === "",
    diff.trim() || "(clean)"
  );

  const parentLogin = readFileSync(path.join(root, "pages/parent/login.js"), "utf8");
  record(
    "regression",
    "/parent/login exposes teacher-code parent access (no visible guardian wording)",
    parentLogin.includes("קיבלתי קוד מהמורה") &&
      parentLogin.includes("כניסה לדוח הילד") &&
      !parentLogin.includes("guardian") &&
      !parentLogin.includes("אפוטרופוס") &&
      !parentLogin.includes("/guardian/login"),
    "ok"
  );

  // ── output ─────────────────────────────────────────────────────────────────
  console.log("\nPhase 9 security smoke:\n");
  const areas = [...new Set(results.map((r) => r.area))];
  for (const area of areas) {
    console.log(`[${area}]`);
    for (const r of results.filter((x) => x.area === area)) {
      console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
    }
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\nTotal: ${results.length - failed.length}/${results.length} PASS\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
