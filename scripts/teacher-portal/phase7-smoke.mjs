#!/usr/bin/env node
/**
 * Phase 7 teacher class report smoke.
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase7-smoke.mjs
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

function hasParentPii(body) {
  const text = JSON.stringify(body || {});
  const forbidden = ["parent_id", "parentEmail", "parent_email", "parentName", "parent_name"];
  return forbidden.some((k) => text.includes(`"${k}"`));
}

function hasCopilotFields(body) {
  const text = JSON.stringify(body || {});
  return (
    text.includes("copilotLastResponse") ||
    text.includes("parentAiExplanation") ||
    text.includes('"copilot"')
  );
}

async function main() {
  process.env.TEACHER_PORTAL_ENABLED = "true";

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

  const teacherUser = (
    await admin.auth.admin.listUsers({ perPage: 200, page: 1 })
  ).data?.users?.find((x) => x.email === TEACHER_EMAIL);
  const teacherId = teacherUser?.id;
  if (!teacherId) throw new Error("teacher user not found");

  await admin.from("teacher_profiles").upsert({ id: teacherId });
  await admin.from("teacher_limits").upsert({ teacher_id: teacherId, plan_code: "teacher_basic_20" });

  await admin
    .from("teacher_students")
    .update({ archived_at: new Date().toISOString() })
    .eq("teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("archived_at", null);
  const { error: linkErr } = await admin.from("teacher_students").insert({
    teacher_id: teacherId,
    student_id: DEMO_STUDENT_ID,
    relationship: "primary_teacher",
  });
  if (linkErr && !String(linkErr.message).includes("duplicate")) {
    throw new Error(`seed link failed: ${linkErr.message}`);
  }

  const { data: oldClasses } = await admin.from("teacher_classes").select("id").eq("teacher_id", teacherId);
  for (const row of oldClasses || []) {
    await admin.from("teacher_class_students").delete().eq("class_id", row.id);
  }
  await admin.from("teacher_classes").delete().eq("teacher_id", teacherId);

  const { data: createdClass, error: classErr } = await admin
    .from("teacher_classes")
    .insert({
      teacher_id: teacherId,
      name: "Phase7 Smoke Class",
      grade_level: "g3",
      subject_focus: "math",
    })
    .select("id")
    .single();
  if (classErr) throw new Error(`create class failed: ${classErr.message}`);
  const classId = createdClass.id;

  const emptyReport = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { classId },
  });
  record(
    "class with no members → safe empty report",
    emptyReport.statusCode === 200 &&
      emptyReport.body?.ok === true &&
      emptyReport.body?.roster?.activeMemberCount === 0 &&
      emptyReport.body?.cohortSummary?.totalAnswers === 0,
    `members=${emptyReport.body?.roster?.activeMemberCount}`
  );

  const { error: memErr } = await admin.from("teacher_class_students").insert({
    class_id: classId,
    student_id: DEMO_STUDENT_ID,
  });
  if (memErr) throw new Error(`add member failed: ${memErr.message}`);

  const withMember = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { classId },
  });
  record(
    "teacher owner → own class report",
    withMember.statusCode === 200 &&
      withMember.body?.ok === true &&
      withMember.body?.roster?.activeMemberCount === 1 &&
      !hasParentPii(withMember.body) &&
      !hasCopilotFields(withMember.body) &&
      withMember.body?.cohortSummary != null &&
      withMember.body?.subjects != null,
    `answers=${withMember.body?.cohortSummary?.totalAnswers}`
  );

  const listedOther = await admin.auth.admin.listUsers({ perPage: 200, page: 1 });
  let otherTeacherId = listedOther.data?.users?.find((x) => x.email === OTHER_TEACHER_EMAIL)?.id;
  if (!otherTeacherId) {
    const c = await admin.auth.admin.createUser({
      email: OTHER_TEACHER_EMAIL,
      password: OTHER_TEACHER_PASSWORD,
      email_confirm: true,
      app_metadata: { role: "teacher" },
    });
    otherTeacherId = c.data?.user?.id;
  }
  await admin.from("teacher_profiles").upsert({ id: otherTeacherId });
  const otherToken = await signIn(anon, OTHER_TEACHER_EMAIL, OTHER_TEACHER_PASSWORD);
  const cross = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
    method: "GET",
    headers: { authorization: `Bearer ${otherToken}`, origin: "http://localhost:3001" },
    query: { classId },
  });
  record(
    "teacher A → teacher B class blocked",
    cross.statusCode === 404 && cross.body?.error?.code === "class_not_found",
    cross.body?.error?.code
  );

  const anonReq = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
    method: "GET",
    headers: { origin: "http://localhost:3001" },
    query: { classId },
  });
  record(
    "anonymous → blocked",
    anonReq.statusCode === 401 && anonReq.body?.error?.code === "not_authenticated",
    anonReq.body?.error?.code
  );

  const parentReq = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
    method: "GET",
    headers: parentAuth,
    query: { classId },
  });
  record(
    "parent bearer → blocked",
    parentReq.statusCode === 403 && parentReq.body?.error?.code === "not_a_teacher",
    parentReq.body?.error?.code
  );

  const { data: memRow } = await admin
    .from("teacher_class_students")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("removed_at", null)
    .single();
  await admin
    .from("teacher_class_students")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", memRow.id);

  const afterRemove = await run("./pages/api/teacher/classes/[classId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { classId },
  });
  record(
    "archived/removed members excluded",
    afterRemove.statusCode === 200 && afterRemove.body?.roster?.activeMemberCount === 0,
    `count=${afterRemove.body?.roster?.activeMemberCount}`
  );

  await admin.from("teacher_class_students").insert({
    class_id: classId,
    student_id: DEMO_STUDENT_ID,
  });

  const phase6 = await run("./pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { studentId: DEMO_STUDENT_ID },
  });
  record(
    "Phase 6 single-student report still works",
    phase6.statusCode === 200 && phase6.body?.ok === true,
    String(phase6.statusCode)
  );

  const parentUser = (
    await admin.auth.admin.listUsers({ perPage: 200, page: 1 })
  ).data?.users?.find((x) => x.email === parentEmail);
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

  const { execSync } = await import("node:child_process");
  const protectedPaths = [
    "pages/parent/login.js",
    "pages/api/parent/students/[studentId]/report-data.js",
    "pages/api/parent/copilot-turn.js",
    "lib/parent-server/report-data-aggregate.server.js",
    "utils/parent-copilot",
  ];
  let parentDiff = "";
  for (const p of protectedPaths) {
    try {
      parentDiff += execSync(`git diff --name-only -- "${p}"`, { cwd: root, encoding: "utf8" });
    } catch {
      /* ignore */
    }
  }
  record("parent/student/copilot paths unchanged", parentDiff.trim() === "", parentDiff.trim() || "(clean)");

  console.log("\nPhase 7 smoke:\n");
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
