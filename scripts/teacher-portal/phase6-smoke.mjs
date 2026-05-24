#!/usr/bin/env node
/**
 * Phase 6 teacher single-student report smoke.
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase6-smoke.mjs
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
const UNLINKED_STUDENT_ID = "e0000000-0000-4000-8000-000000000099";

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

  const { data: existingLink } = await admin
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", DEMO_STUDENT_ID)
    .is("archived_at", null)
    .maybeSingle();

  if (!existingLink?.id) {
    const { error: seedErr } = await admin.from("teacher_students").insert({
      teacher_id: teacherId,
      student_id: DEMO_STUDENT_ID,
      relationship: "primary_teacher",
    });
    if (seedErr) throw new Error(`seed link failed: ${seedErr.message}`);
  }

  const linked = await run("./pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { studentId: DEMO_STUDENT_ID },
  });
  record(
    "linked teacher → own student report",
    linked.statusCode === 200 &&
      linked.body?.ok === true &&
      linked.body?.student?.id === DEMO_STUDENT_ID &&
      !hasParentPii(linked.body) &&
      !hasCopilotFields(linked.body) &&
      linked.body?.guardianAccessSummary != null,
    `${linked.statusCode} pii=${hasParentPii(linked.body)}`
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
  await admin.from("teacher_limits").upsert({ teacher_id: otherTeacherId, plan_code: "teacher_basic_20" });
  const otherToken = await signIn(anon, OTHER_TEACHER_EMAIL, OTHER_TEACHER_PASSWORD);
  const otherAuth = { authorization: `Bearer ${otherToken}`, origin: "http://localhost:3001" };

  const cross = await run("./pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: otherAuth,
    query: { studentId: DEMO_STUDENT_ID },
  });
  record(
    "teacher A → teacher B student blocked",
    cross.statusCode === 403 && cross.body?.error?.code === "student_not_linked",
    cross.body?.error?.code
  );

  const unlinked = await run("./pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { studentId: UNLINKED_STUDENT_ID },
  });
  record(
    "teacher → unlinked student blocked",
    unlinked.statusCode === 403 && unlinked.body?.error?.code === "student_not_linked",
    unlinked.body?.error?.code
  );

  const parentOnTeacher = await run("./pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: parentAuth,
    query: { studentId: DEMO_STUDENT_ID },
  });
  record(
    "parent bearer → teacher endpoint blocked",
    parentOnTeacher.statusCode === 403 && parentOnTeacher.body?.error?.code === "not_a_teacher",
    parentOnTeacher.body?.error?.code
  );

  const anonReq = await run("./pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: { origin: "http://localhost:3001" },
    query: { studentId: DEMO_STUDENT_ID },
  });
  record(
    "anonymous → teacher endpoint blocked",
    anonReq.statusCode === 401 && anonReq.body?.error?.code === "not_authenticated",
    anonReq.body?.error?.code
  );

  const parentUser = (
    await admin.auth.admin.listUsers({ perPage: 200, page: 1 })
  ).data?.users?.find((x) => x.email === parentEmail);
  const parentId = parentUser?.id;
  const { data: ownedStudent } = await admin
    .from("students")
    .select("id, full_name, grade_level, is_active")
    .eq("id", DEMO_STUDENT_ID)
    .eq("parent_id", parentId)
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
  record(
    "parent report aggregator still works (route file not imported in smoke)",
    parentAgg.ok === true && ownedStudent?.id === DEMO_STUDENT_ID,
    ownedStudent?.id ? "ok" : "no owned student"
  );

  const { execSync } = await import("node:child_process");
  const protectedPaths = [
    "pages/parent/login.js",
    "pages/api/parent/login.js",
    "pages/api/parent/students/[studentId]/report-data.js",
    "pages/api/parent/copilot-turn.js",
    "lib/parent-server/report-data-aggregate.server.js",
    "lib/parent-server/parent-report-account-attachment.server.js",
    "pages/api/student",
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
  record(
    "existing parent/student/copilot paths unchanged",
    parentDiff.trim() === "",
    parentDiff.trim() || "(clean)"
  );

  console.log("\nPhase 6 smoke:\n");
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
