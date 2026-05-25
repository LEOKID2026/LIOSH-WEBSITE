#!/usr/bin/env node
/**
 * Smoke: individual student activities (migration 026) + IDOR + roster + scope list.
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase5d-individual-activities-smoke.mjs
 */
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { filterStudentsByRosterKey } from "../../lib/teacher-portal/teacher-dashboard-roster.js";
import {
  listStudentActivities,
  startStudentActivity,
  recordStudentActivityAnswer,
  submitStudentActivity,
} from "../../lib/teacher-server/teacher-activities.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

const TEACHER_EMAIL =
  process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher-portal-live-verify@liosh-dev.invalid";
const TEACHER_PASSWORD = process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "TeacherPortalVerify!2026";
const OTHER_TEACHER_EMAIL = "teacher-portal-other@liosh-dev.invalid";
const OTHER_TEACHER_PASSWORD = "OtherTeacher!2026";
const UNRELATED_STUDENT_ID = "00000000-0000-4000-8000-000000000099";

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
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
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
  };
}

async function runHandler(rel, req) {
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

function hashStudentSecretLocal(value, accessSecret) {
  return crypto.createHmac("sha256", accessSecret).update(String(value)).digest("hex");
}

async function createStudentSessionToken(admin, studentId, accessSecret) {
  const { data: accessCode, error: codeErr } = await admin
    .from("student_access_codes")
    .select("id")
    .eq("student_id", studentId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (codeErr || !accessCode?.id) {
    throw new Error(codeErr?.message || "no student_access_codes row");
  }
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashStudentSecretLocal(token, accessSecret);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: sessErr } = await admin.from("student_sessions").insert({
    student_id: studentId,
    access_code_id: accessCode.id,
    session_token_hash: tokenHash,
    started_at: nowIso,
    last_seen_at: nowIso,
    expires_at: expiresAt,
    ended_at: null,
    revoked_at: null,
    client_meta: {},
  });
  if (sessErr) throw sessErr;
  return token;
}

function sampleQuestionSet(n) {
  const qs = [];
  for (let i = 0; i < n; i += 1) {
    const a = 2 + i;
    const b = 3;
    qs.push({
      question: `${a} + ${b} = __`,
      correct_answer: String(a + b),
      subject: "math",
      topic: "addition",
    });
  }
  return qs;
}

async function signInTeacher(anon, email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(error?.message || "teacher sign-in failed");
  return { token: data.session.access_token, teacherId: data.user.id };
}

async function main() {
  process.env.TEACHER_PORTAL_ENABLED = "true";

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const accessSecret = requireEnv("LEARNING_STUDENT_ACCESS_SECRET");

  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { error: schemaErr } = await admin.from("student_activities").select("id").limit(1);
  if (schemaErr) {
    console.error("Migration 026 not applied:", schemaErr.message);
    process.exit(2);
  }
  record("migration_026_schema", true);

  const teacher = await signInTeacher(anon, TEACHER_EMAIL, TEACHER_PASSWORD);
  const auth = { authorization: `Bearer ${teacher.token}`, origin: "http://localhost:3001" };

  const stamp = Date.now();
  const createStudentRes = await runHandler("pages/api/teacher/students/create.js", {
    method: "POST",
    headers: auth,
    body: {
      fullName: `Individual Smoke ${stamp}`,
      gradeLevel: "g3",
    },
  });
  const directStudentId = createStudentRes.body?.data?.studentId;
  const loginUsername = createStudentRes.body?.data?.loginUsername;
  record(
    "create_direct_student_no_class",
    createStudentRes.statusCode === 201 && !!directStudentId && !createStudentRes.body?.data?.membershipId,
    `status=${createStudentRes.statusCode}`
  );

  const dashRes = await runHandler("pages/api/teacher/dashboard.js", {
    method: "GET",
    headers: auth,
  });
  const dash = dashRes.body?.data;
  const directRow = (dash?.students || []).find((s) => s.studentId === directStudentId);
  const rosterFilters = dash?.rosterFilters || [];
  const hasAll = rosterFilters.some((f) => f.key === "all");
  const hasDirect = rosterFilters.some((f) => f.key === "direct");
  const directOnly = filterStudentsByRosterKey(dash?.students || [], "direct");
  record("dashboard_roster_filters", hasAll && hasDirect, `filters=${rosterFilters.length}`);
  record(
    "dashboard_direct_student_classified",
    directRow && directRow.isInAnyClass === false && (directRow.classIds || []).length === 0,
    directRow ? `isInAnyClass=${directRow.isInAnyClass}` : "missing student"
  );
  record(
    "dashboard_direct_roster_filter",
    directOnly.some((s) => s.studentId === directStudentId),
    `directCount=${directOnly.length}`
  );

  const reportRes = await runHandler("pages/api/teacher/students/[studentId]/report-data.js", {
    method: "GET",
    headers: auth,
    query: { studentId: directStudentId },
  });
  record("teacher_student_report", reportRes.statusCode === 200, String(reportRes.statusCode));

  const questionSet = sampleQuestionSet(3);
  const createActRes = await runHandler("pages/api/teacher/student-activities/index.js", {
    method: "POST",
    headers: auth,
    body: {
      studentId: directStudentId,
      title: `Individual ${stamp}`,
      subject: "math",
      topic: "addition",
      mode: "homework",
      questionCount: 3,
      questionSet,
    },
  });
  const activityId = createActRes.body?.data?.activityId;
  record("create_individual_activity", createActRes.statusCode === 201 && !!activityId, String(createActRes.statusCode));

  const idorCreateRes = await runHandler("pages/api/teacher/student-activities/index.js", {
    method: "POST",
    headers: auth,
    body: {
      studentId: UNRELATED_STUDENT_ID,
      title: "IDOR",
      subject: "math",
      topic: "x",
      mode: "homework",
      questionCount: 1,
      questionSet: sampleQuestionSet(1),
    },
  });
  record(
    "idor_teacher_unrelated_student",
    idorCreateRes.statusCode === 403 || idorCreateRes.statusCode === 404,
    String(idorCreateRes.statusCode)
  );

  if (!activityId) {
    printSummary();
    process.exit(1);
  }

  const activateRes = await runHandler("pages/api/teacher/student-activities/[activityId]/status.js", {
    method: "PATCH",
    headers: auth,
    query: { activityId },
    body: { action: "activate" },
  });
  record("activate_individual", activateRes.statusCode === 200, activateRes.body?.data?.status);

  const { data: statusRow } = await admin
    .from("student_activity_status")
    .select("student_id, activity_id")
    .eq("activity_id", activityId)
    .maybeSingle();
  record(
    "db_status_matches_activity_student",
    statusRow?.student_id === directStudentId,
    statusRow?.student_id || "none"
  );

  record("student_access_code_exists", Boolean(loginUsername), loginUsername || "none");

  const listResult = await listStudentActivities(admin, directStudentId);
  const activities = listResult.ok ? listResult.activities : [];
  const individual = activities.filter((a) => a.scope === "student");
  const classScoped = activities.filter((a) => a.scope === "class");
  const mine = individual.find((a) => a.activityId === activityId);
  record(
    "student_list_scope_separation",
    listResult.ok && !!mine,
    `individual=${individual.length} class=${classScoped.length}`
  );

  const startResult = await startStudentActivity(admin, directStudentId, activityId);
  record(
    "student_start_individual",
    startResult.ok && startResult.activity?.scope === "student",
    startResult.code || startResult.activity?.scope || "ok"
  );

  for (let i = 0; i < 3; i += 1) {
    await recordStudentActivityAnswer(admin, directStudentId, activityId, {
      questionIndex: i,
      selectedAnswer: String(2 + i + 3),
      timeSpentMs: 500,
    });
  }
  const submitResult = await submitStudentActivity(admin, directStudentId, activityId);
  record(
    "student_submit_individual",
    submitResult.ok,
    submitResult.scorePct != null ? `score=${submitResult.scorePct}` : submitResult.code || ""
  );

  await runHandler("pages/api/teacher/student-activities/[activityId]/status.js", {
    method: "PATCH",
    headers: auth,
    query: { activityId },
    body: { action: "close" },
  });

  const reportActRes = await runHandler("pages/api/teacher/student-activities/[activityId]/report.js", {
    method: "GET",
    headers: auth,
    query: { activityId },
  });
  record(
    "teacher_individual_report",
    reportActRes.statusCode === 200 && reportActRes.body?.data?.student?.studentId === directStudentId,
    String(reportActRes.statusCode)
  );

  const simParentListed = await admin.auth.admin.listUsers({ perPage: 200, page: 1 });
  const simParent = simParentListed.data?.users?.find(
    (x) => x.email === "parent-class-sim@liosh-dev.invalid"
  );
  if (!simParent?.id) throw new Error("sim parent missing for second student");

  const otherStudentIns = await admin
    .from("students")
    .insert({
      parent_id: simParent.id,
      full_name: `Individual IDOR B ${stamp}`,
      is_active: true,
    })
    .select("id")
    .single();
  if (otherStudentIns.error) throw otherStudentIns.error;
  const otherStudentId = otherStudentIns.data.id;
  await admin.from("teacher_students").upsert({
    teacher_id: teacher.teacherId,
    student_id: otherStudentId,
    relationship: "primary_teacher",
  });

  const otherActRes = await runHandler("pages/api/teacher/student-activities/index.js", {
    method: "POST",
    headers: auth,
    body: {
      studentId: otherStudentId,
      title: `Other ${stamp}`,
      subject: "math",
      topic: "addition",
      mode: "homework",
      questionCount: 1,
      questionSet: sampleQuestionSet(1),
    },
  });
  const otherActivityId = otherActRes.body?.data?.activityId;
  await runHandler("pages/api/teacher/student-activities/[activityId]/status.js", {
    method: "PATCH",
    headers: auth,
    query: { activityId: otherActivityId },
    body: { action: "activate" },
  });

  const crossStart = await startStudentActivity(admin, directStudentId, otherActivityId);
  record(
    "idor_student_other_individual_activity",
    !crossStart.ok && (crossStart.status === 403 || crossStart.status === 404),
    crossStart.code || "ok"
  );

  const classRes = await runHandler("pages/api/teacher/classes/index.js", {
    method: "POST",
    headers: auth,
    body: { name: `Indiv Smoke Class ${stamp}` },
  });
  const classId = classRes.body?.data?.classId;
  if (classId) {
    const classActRes = await runHandler("pages/api/teacher/activities/index.js", {
      method: "POST",
      headers: auth,
      body: {
        classId,
        title: `Class only ${stamp}`,
        subject: "math",
        topic: "addition",
        mode: "homework",
        questionCount: 1,
        questionSet: sampleQuestionSet(1),
      },
    });
    const classActivityId = classActRes.body?.data?.activityId;
    if (classActivityId) {
      await runHandler("pages/api/teacher/activities/[activityId]/status.js", {
        method: "PATCH",
        headers: auth,
        query: { activityId: classActivityId },
        body: { action: "activate" },
      });
      const classStart = await startStudentActivity(admin, directStudentId, classActivityId);
      record(
        "class_activity_requires_membership",
        !classStart.ok && (classStart.status === 403 || classStart.status === 404),
        classStart.code || "ok"
      );
    }
  }

  let otherTeacherToken = null;
  try {
    const other = await signInTeacher(anon, OTHER_TEACHER_EMAIL, OTHER_TEACHER_PASSWORD);
    otherTeacherToken = other.token;
  } catch {
    /* optional */
  }
  if (otherTeacherToken) {
    const otherTeacherCreate = await runHandler("pages/api/teacher/student-activities/index.js", {
      method: "POST",
      headers: { authorization: `Bearer ${otherTeacherToken}`, origin: "http://localhost:3001" },
      body: {
        studentId: directStudentId,
        title: "Cross teacher",
        subject: "math",
        topic: "x",
        mode: "homework",
        questionCount: 1,
        questionSet: sampleQuestionSet(1),
      },
    });
    record(
      "idor_other_teacher_linked_student",
      otherTeacherCreate.statusCode === 403 || otherTeacherCreate.statusCode === 404,
      String(otherTeacherCreate.statusCode)
    );
  } else {
    record("idor_other_teacher_linked_student", true, "skipped — other teacher creds missing");
  }

  const { error: badStatusErr } = await admin.from("student_activity_status").insert({
    activity_id: activityId,
    student_id: otherStudentId,
    status: "not_started",
  });
  record(
    "db_composite_fk_blocks_wrong_student",
    Boolean(badStatusErr),
    badStatusErr?.message?.slice(0, 80) || "insert succeeded (unexpected)"
  );

  printSummary();
  const failed = results.filter((r) => !r.pass).length;
  process.exit(failed ? 1 : 0);
}

function printSummary() {
  console.log("\n--- phase5d-individual-activities-smoke ---");
  const failed = results.filter((r) => !r.pass);
  console.log(`Total: ${results.length}, Failed: ${failed.length}`);
}

main().catch((e) => {
  console.error("phase5d-individual-activities-smoke: FAIL", e.message || e);
  process.exit(1);
});
