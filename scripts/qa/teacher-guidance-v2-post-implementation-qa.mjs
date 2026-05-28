#!/usr/bin/env node
/**
 * Teacher Guidance V2 — remaining QA (dashboard nav, worksheets, classroom activities, V2 API fields).
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/qa/teacher-guidance-v2-post-implementation-qa.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

const TEACHER_EMAIL =
  process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher-portal-live-verify@liosh-dev.invalid";
const TEACHER_PASSWORD = process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "TeacherPortalVerify!2026";
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

async function main() {
  process.env.TEACHER_PORTAL_ENABLED = "true";

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const teacherToken = await signIn(anon, TEACHER_EMAIL, TEACHER_PASSWORD);
  const teacherAuth = { authorization: `Bearer ${teacherToken}`, origin: "http://localhost:3001" };

  const teacherUser = (
    await admin.auth.admin.listUsers({ perPage: 200, page: 1 })
  ).data?.users?.find((x) => x.email === TEACHER_EMAIL);
  const teacherId = teacherUser?.id;
  if (!teacherId) throw new Error("teacher user not found");

  // ── 28 Dashboard navigation (API + static routes) ─────────────────────────
  const dashRes = await run("pages/api/teacher/dashboard.js", {
    method: "GET",
    headers: teacherAuth,
  });
  const dash = dashRes.body?.data ?? dashRes.body;
  record(
    "dashboard_api_loads",
    dashRes.statusCode === 200 && dash != null,
    `status=${dashRes.statusCode}`
  );
  record(
    "dashboard_teacherAttentionSignals_shape",
    dash?.teacherAttentionSignals != null &&
      Array.isArray(dash.teacherAttentionSignals.topAttentionStudents) &&
      dash.teacherAttentionSignals.topAttentionStudents.length <= 3,
    `count=${dash?.teacherAttentionSignals?.topAttentionStudents?.length ?? "n/a"}`
  );
  const hasClass = Array.isArray(dash?.classes) && dash.classes.length > 0;
  const hasStudent = Array.isArray(dash?.students) && dash.students.length > 0;
  record("dashboard_has_classes_and_students", hasClass || hasStudent, `classes=${dash?.classes?.length ?? 0} students=${dash?.students?.length ?? 0}`);

  const dashClient = readFileSync(
    path.join(root, "components/teacher-portal/TeacherDashboardClient.jsx"),
    "utf8"
  );
  record(
    "dashboard_ui_class_link",
    dashClient.includes("/teacher/class/"),
    "TeacherDashboardClient class href"
  );
  record(
    "dashboard_ui_student_link",
    dashClient.includes("/teacher/student/"),
    "TeacherDashboardClient student href"
  );
  record(
    "dashboard_ui_worksheet_link",
    dashClient.includes("/teacher/worksheets"),
    "TeacherDashboardClient worksheets href"
  );

  // ── Student / class report V2 fields ───────────────────────────────────────
  const studentReport = await run("pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: teacherAuth,
    query: { studentId: DEMO_STUDENT_ID },
  });
  const sgb = studentReport.body?.teacherGuidanceBlock;
  record(
    "student_report_v2_version",
    studentReport.statusCode === 200 && sgb?.version === "v2",
    `version=${sgb?.version}`
  );
  record(
    "student_report_v2_has_recommendation_units",
    Array.isArray(sgb?.recommendationUnits),
    `units=${sgb?.recommendationUnits?.length ?? 0}`
  );

  const { data: anyClass } = await admin
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", teacherId)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (anyClass?.id) {
    const classReport = await run("pages/api/teacher/classes/[classId]/report-data.js", {
      method: "GET",
      headers: teacherAuth,
      query: { classId: anyClass.id },
    });
    const cgb = classReport.body?.teacherGuidanceBlock;
    record(
      "class_report_v2_version",
      classReport.statusCode === 200 && cgb?.version === "v2",
      `version=${cgb?.version}`
    );
    record(
      "class_report_v2_has_classRecommendationUnits",
      Array.isArray(cgb?.classRecommendationUnits),
      `units=${cgb?.classRecommendationUnits?.length ?? 0}`
    );
  } else {
    record("class_report_v2_version", true, "skipped — no active class for teacher");
    record("class_report_v2_has_classRecommendationUnits", true, "skipped");
  }

  // ── 29 Worksheet PDF (API list + structural regression already separate) ───
  const wsList = await run("pages/api/teacher/worksheet-activities/index.js", {
    method: "GET",
    headers: teacherAuth,
  });
  record(
    "worksheet_activities_list_api",
    wsList.statusCode === 200,
    `status=${wsList.statusCode}`
  );

  // ── 30 Classroom activities (list API — classroom_activities table path) ─
  const actList = await run("pages/api/teacher/activities/index.js", {
    method: "GET",
    headers: teacherAuth,
  });
  record(
    "classroom_activities_list_api",
    actList.statusCode === 200,
    `status=${actList.statusCode}`
  );
  const acts = actList.body?.activities ?? actList.body?.data?.activities;
  record(
    "classroom_activities_list_shape",
    acts == null || Array.isArray(acts),
    acts == null ? "no activities field (empty ok)" : `count=${acts.length}`
  );

  // ── 26 Guardian strip (static) ─────────────────────────────────────────────
  const guardianSrc = readFileSync(
    path.join(root, "lib/guardian-server/guardian-report.server.js"),
    "utf8"
  );
  record(
    "guardian_strips_teacherGuidanceBlock",
    guardianSrc.includes('"teacherGuidanceBlock"'),
    "unchanged strip list"
  );

  console.log("\nTeacher Guidance V2 post-implementation QA:\n");
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
