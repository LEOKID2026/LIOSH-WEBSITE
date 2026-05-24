#!/usr/bin/env node
/**
 * Phase 5B consent-link smoke (dev Supabase + handlers).
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase5b-smoke.mjs
 */
import fs from "node:fs";
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
const FAKE_STUDENT_ID = "e0000000-0000-4000-8000-000000000099";

const results = [];
function record(n, p, d = "") {
  results.push({ name: n, pass: p, detail: d });
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    setHeader() {},
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

async function ensureOtherTeacher(admin, anon) {
  const listed = await admin.auth.admin.listUsers({ perPage: 200, page: 1 });
  let otherId = listed.data?.users?.find((x) => x.email === OTHER_TEACHER_EMAIL)?.id;
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
  await admin.from("teacher_limits").upsert({ teacher_id: otherId, plan_code: "teacher_basic_20" });
  const otherToken = await signIn(anon, OTHER_TEACHER_EMAIL, OTHER_TEACHER_PASSWORD);
  return { otherId, otherToken };
}

async function main() {
  process.env.TEACHER_PORTAL_ENABLED = "true";
  process.env.TEACHER_PORTAL_LINK_ENABLED = "true";

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const parentEmail = requireEnv("E2E_PARENT_EMAIL");
  const parentPassword = requireEnv("E2E_PARENT_PASSWORD");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: schemaProbe, error: schemaErr } = await admin
    .from("teacher_student_consent_tokens")
    .select("id")
    .limit(1);
  record(
    "migration 021 table present",
    !schemaErr || schemaErr.code !== "42P01",
    schemaErr?.message || "ok"
  );
  if (schemaErr?.code === "42P01") {
    console.error("\nApply supabase/migrations/021_teacher_portal_consent_tokens.sql on development first.\n");
    printResults();
    process.exit(1);
  }

  const teacherToken = await signIn(anon, TEACHER_EMAIL, TEACHER_PASSWORD);
  const parentToken = await signIn(anon, parentEmail, parentPassword);
  const teacherAuth = { authorization: `Bearer ${teacherToken}`, origin: "http://localhost:3001" };
  const parentAuth = { authorization: `Bearer ${parentToken}`, origin: "http://localhost:3001" };

  const teacherUser = (
    await admin.auth.admin.listUsers({ perPage: 200, page: 1 })
  ).data?.users?.find((x) => x.email === TEACHER_EMAIL);
  const teacherId = teacherUser?.id;
  if (!teacherId) throw new Error("teacher user not found");

  const parentUser = (
    await admin.auth.admin.listUsers({ perPage: 200, page: 1 })
  ).data?.users?.find((x) => x.email === parentEmail);
  const parentId = parentUser?.id;
  if (!parentId) throw new Error("parent user not found");

  await admin.from("teacher_profiles").upsert({ id: teacherId });
  await admin.from("teacher_limits").upsert({
    teacher_id: teacherId,
    plan_code: "teacher_basic_20",
    student_limit_override: null,
  });

  const { otherId, otherToken } = await ensureOtherTeacher(admin, anon);
  const otherAuth = { authorization: `Bearer ${otherToken}`, origin: "http://localhost:3001" };

  await admin
    .from("teacher_students")
    .update({ archived_at: new Date().toISOString() })
    .eq("teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("archived_at", null);

  await admin
    .from("teacher_student_consent_tokens")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID);

  const issue = await run("./pages/api/parent/teacher-consent/issue.js", {
    method: "POST",
    headers: parentAuth,
    body: { teacherId, studentId: DEMO_STUDENT_ID },
  });
  const consentToken = issue.body?.data?.consentToken;
  record(
    "parent issues consent for own student",
    issue.statusCode === 201 && typeof consentToken === "string" && consentToken.startsWith("tsc_"),
    String(issue.statusCode)
  );

  const { data: foreignStudent } = await admin
    .from("students")
    .select("id, parent_id")
    .neq("parent_id", parentId)
    .limit(1)
    .maybeSingle();

  if (foreignStudent?.id) {
    const foreignIssue = await run("./pages/api/parent/teacher-consent/issue.js", {
      method: "POST",
      headers: parentAuth,
      body: { teacherId, studentId: foreignStudent.id },
    });
    record(
      "parent cannot issue for another parent student",
      foreignIssue.statusCode === 403 && foreignIssue.body?.error === "not_authorized",
      String(foreignIssue.statusCode)
    );
  } else {
    record("parent cannot issue for another parent student", true, "skipped (no foreign student row)");
  }

  const noToken = await run("./pages/api/teacher/students/link.js", {
    method: "POST",
    headers: teacherAuth,
    body: { studentId: DEMO_STUDENT_ID, consentToken: "bad" },
  });
  record(
    "teacher link without valid token → consent_required/invalid",
    noToken.statusCode === 403 &&
      (noToken.body?.error?.code === "consent_required" ||
        noToken.body?.error?.code === "consent_invalid"),
    noToken.body?.error?.code
  );

  const crossTeacher = await run("./pages/api/teacher/students/link.js", {
    method: "POST",
    headers: otherAuth,
    body: { studentId: DEMO_STUDENT_ID, consentToken },
  });
  record(
    "teacher B cannot use teacher A token",
    crossTeacher.statusCode === 403 && crossTeacher.body?.error?.code === "consent_invalid",
    crossTeacher.body?.error?.code
  );

  const linkOk = await run("./pages/api/teacher/students/link.js", {
    method: "POST",
    headers: teacherAuth,
    body: { studentId: DEMO_STUDENT_ID, consentToken },
  });
  record(
    "teacher A links with valid token",
    linkOk.statusCode === 201 && linkOk.body?.data?.studentId === DEMO_STUDENT_ID,
    String(linkOk.statusCode)
  );
  const { data: activeLinkRow } = await admin
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("archived_at", null)
    .maybeSingle();
  const linkId = activeLinkRow?.id || linkOk.body?.data?.linkId;

  const reuse = await run("./pages/api/teacher/students/link.js", {
    method: "POST",
    headers: teacherAuth,
    body: { studentId: DEMO_STUDENT_ID, consentToken },
  });
  record(
    "same token cannot be reused",
    reuse.statusCode === 403 && reuse.body?.error?.code === "consent_invalid",
    reuse.body?.error?.code
  );

  const unlinkEarly = await run("./pages/api/teacher/students/unlink.js", {
    method: "POST",
    headers: teacherAuth,
    body: { linkId },
  });
  if (unlinkEarly.statusCode !== 200) {
    await admin
      .from("teacher_students")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", linkId);
  }

  const issue2 = await run("./pages/api/parent/teacher-consent/issue.js", {
    method: "POST",
    headers: parentAuth,
    body: { teacherId, studentId: DEMO_STUDENT_ID },
  });
  const token2 = issue2.body?.data?.consentToken;
  const token2Id = issue2.body?.data?.consentTokenId;
  if (token2Id) {
    const pastIssued = new Date(Date.now() - 120_000).toISOString();
    const pastExpires = new Date(Date.now() - 60_000).toISOString();
    await admin
      .from("teacher_student_consent_tokens")
      .update({ issued_at: pastIssued, expires_at: pastExpires })
      .eq("id", token2Id);
  }
  await admin
    .from("teacher_students")
    .update({ archived_at: new Date().toISOString() })
    .eq("teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("archived_at", null);
  const expiredLink = await run("./pages/api/teacher/students/link.js", {
    method: "POST",
    headers: teacherAuth,
    body: { studentId: DEMO_STUDENT_ID, consentToken: token2 },
  });
  record(
    "expired token → consent_invalid",
    expiredLink.statusCode === 403 && expiredLink.body?.error?.code === "consent_invalid",
    `${expiredLink.statusCode}:${expiredLink.body?.error?.code || "none"}`
  );

  const issueScope = await run("./pages/api/parent/teacher-consent/issue.js", {
    method: "POST",
    headers: parentAuth,
    body: { teacherId, studentId: DEMO_STUDENT_ID },
  });
  const scopeToken = issueScope.body?.data?.consentToken;
  const badScope = await run("./pages/api/teacher/students/link.js", {
    method: "POST",
    headers: teacherAuth,
    body: { studentId: FAKE_STUDENT_ID, consentToken: scopeToken },
  });
  record(
    "wrong student_id in link body → consent_invalid",
    badScope.statusCode === 403 && badScope.body?.error?.code === "consent_invalid",
    badScope.body?.error?.code
  );

  const consentOnly = await run("./pages/api/teacher/students/link.js", {
    method: "POST",
    headers: teacherAuth,
    body: { studentId: DEMO_STUDENT_ID },
  });
  record(
    "link without token field → consent_required",
    consentOnly.statusCode === 403 && consentOnly.body?.error?.code === "consent_required",
    consentOnly.body?.error?.code
  );

  await admin.from("teacher_limits").upsert({
    teacher_id: teacherId,
    plan_code: "teacher_basic_20",
    student_limit_override: 0,
  });
  const issueLimit = await run("./pages/api/parent/teacher-consent/issue.js", {
    method: "POST",
    headers: parentAuth,
    body: { teacherId, studentId: DEMO_STUDENT_ID },
  });
  const limitToken = issueLimit.body?.data?.consentToken;
  const limitLink = await run("./pages/api/teacher/students/link.js", {
    method: "POST",
    headers: teacherAuth,
    body: { studentId: DEMO_STUDENT_ID, consentToken: limitToken },
  });
  record(
    "student limit enforced",
    limitLink.statusCode === 409 && limitLink.body?.error?.code === "link_limit_reached",
    limitLink.body?.error?.code
  );
  await admin.from("teacher_limits").upsert({
    teacher_id: teacherId,
    plan_code: "teacher_basic_20",
    student_limit_override: null,
  });

  const issueRelink = await run("./pages/api/parent/teacher-consent/issue.js", {
    method: "POST",
    headers: parentAuth,
    body: { teacherId, studentId: DEMO_STUDENT_ID },
  });
  const relinkToken = issueRelink.body?.data?.consentToken;
  const relink = await run("./pages/api/teacher/students/link.js", {
    method: "POST",
    headers: teacherAuth,
    body: { studentId: DEMO_STUDENT_ID, consentToken: relinkToken },
  });
  const { data: relinkRow } = await admin
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("archived_at", null)
    .maybeSingle();
  const relinkId = relinkRow?.id || relink.body?.data?.linkId;

  const list = await run("./pages/api/teacher/students.js", {
    method: "GET",
    headers: teacherAuth,
    query: {},
  });
  const listed = (list.body?.data?.students || []).some((s) => s.studentId === DEMO_STUDENT_ID);
  record("GET students shows linked student", list.statusCode === 200 && listed, `found=${listed}`);

  const unlink = await run("./pages/api/teacher/students/unlink.js", {
    method: "POST",
    headers: teacherAuth,
    body: { linkId: relinkId },
  });
  record(
    "POST unlink archives link",
    unlink.statusCode === 200 && unlink.body?.data?.linkId === relinkId,
    String(unlink.statusCode)
  );

  const listAfter = await run("./pages/api/teacher/students.js", {
    method: "GET",
    headers: teacherAuth,
    query: {},
  });
  const stillActive = (listAfter.body?.data?.students || []).some(
    (s) => s.studentId === DEMO_STUDENT_ID
  );
  record("archived link not in active list", listAfter.statusCode === 200 && !stillActive, `active=${stillActive}`);

  process.env.TEACHER_PORTAL_LINK_ENABLED = "false";
  const disabledLink = await run("./pages/api/teacher/students/link.js", {
    method: "POST",
    headers: teacherAuth,
    body: { studentId: DEMO_STUDENT_ID, consentToken: "tsc_invalidtoken000000000000000000" },
  });
  record(
    "link flag off → link_unavailable",
    disabledLink.statusCode === 503 && disabledLink.body?.error?.code === "link_unavailable",
    String(disabledLink.statusCode)
  );
  process.env.TEACHER_PORTAL_LINK_ENABLED = "true";

  const { execSync } = await import("node:child_process");
  const protectedPaths = [
    "pages/parent/login.js",
    "pages/api/parent/login.js",
    "pages/api/parent/students",
    "pages/api/student",
    "lib/parent-server/policy-acceptance.server.js",
    "utils/parent-copilot",
  ];
  let parentDiff = "";
  for (const p of protectedPaths) {
    try {
      parentDiff += execSync(`git diff --name-only -- "${p}"`, { cwd: root, encoding: "utf8" });
    } catch {
      /* path may not exist */
    }
  }
  record(
    "existing parent/student/copilot paths unchanged",
    parentDiff.trim() === "",
    parentDiff.trim() || "(clean)"
  );

  const migrationSql = fs.readFileSync(
    path.join(root, "supabase/migrations/021_teacher_portal_consent_tokens.sql"),
    "utf8"
  );
  const ddlOnly = migrationSql.replace(/--[^\n]*/g, "");
  const sqlLower = ddlOnly.toLowerCase();
  const sqlOk =
    !sqlLower.includes("students.parent_id") &&
    !/alter\s+table\s+public\.students/.test(sqlLower);
  record("migration 021 within approved scope", sqlOk, sqlOk ? "ok" : "scope violation");

  printResults();
  const failed = results.filter((r) => !r.pass);
  process.exit(failed.length ? 1 : 0);
}

function printResults() {
  console.log("\nPhase 5B smoke:\n");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
