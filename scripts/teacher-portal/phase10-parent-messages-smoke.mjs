#!/usr/bin/env node
/**
 * Smoke: teacher parent messages API + parentFacing in reports.
 * Requires migration 023 applied and simulation teacher linked to a student.
 *
 *   node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase10-parent-messages-smoke.mjs
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

const TEACHER_EMAIL = process.env.SIM_TEACHER_EMAIL || "teacher@leo.com";
const TEACHER_PASSWORD = process.env.SIM_TEACHER_PASSWORD || "747975";
const OTHER_TEACHER_EMAIL =
  process.env.TEACHER_PORTAL_OTHER_EMAIL || "teacher-portal-other@liosh-dev.invalid";
const OTHER_TEACHER_PASSWORD =
  process.env.TEACHER_PORTAL_OTHER_PASSWORD || "OtherTeacher!2026";
const FAKE_STUDENT_ID = "00000000-0000-4000-8000-000000000099";

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
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

async function signIn(anon, email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(error?.message || "no token");
  return data.session.access_token;
}

async function findLinkedStudentId(serviceRole, teacherId) {
  const { data, error } = await serviceRole
    .from("teacher_students")
    .select("student_id")
    .eq("teacher_id", teacherId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.student_id || null;
}

async function tableExists(serviceRole) {
  const { error } = await serviceRole.from("teacher_parent_messages").select("id").limit(1);
  if (error && (error.code === "42P01" || /does not exist/i.test(error.message || ""))) {
    return false;
  }
  if (error) throw new Error(error.message);
  return true;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");

  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const serviceRole = createClient(url, serviceKey, { auth: { persistSession: false } });

  const schemaReady = await tableExists(serviceRole);
  if (!schemaReady) {
    record("schema", false, "023 migration not applied — skip live API tests");
    console.log(JSON.stringify({ pass: false, results }, null, 2));
    console.error("\nApply supabase/migrations/023_teacher_parent_messages.sql then re-run.");
    process.exit(1);
  }
  record("schema", true, "teacher_parent_messages exists");

  let teacherToken;
  let otherToken;
  try {
    teacherToken = await signIn(anon, TEACHER_EMAIL, TEACHER_PASSWORD);
    record("teacher_auth", true);
  } catch (e) {
    record("teacher_auth", false, String(e.message));
    printAndExit();
  }

  try {
    otherToken = await signIn(anon, OTHER_TEACHER_EMAIL, OTHER_TEACHER_PASSWORD);
    record("other_teacher_auth", true);
  } catch {
    record("other_teacher_auth", true, "other teacher optional — IDOR test skipped");
    otherToken = null;
  }

  const { data: userData } = await anon.auth.getUser(teacherToken);
  const authUserId = userData?.user?.id;
  const { data: teacherProfile } = authUserId
    ? await serviceRole.from("teacher_profiles").select("id").eq("id", authUserId).maybeSingle()
    : { data: null };

  const teacherId = teacherProfile?.id;
  const studentId = teacherId ? await findLinkedStudentId(serviceRole, teacherId) : null;

  if (!studentId) {
    record("linked_student", false, "no teacher_students row");
    printAndExit();
  }
  record("linked_student", true, studentId);

  const listRes = await runHandler(
    "pages/api/teacher/students/[studentId]/parent-messages/index.js",
    {
      method: "GET",
      query: { studentId },
      headers: { authorization: `Bearer ${teacherToken}` },
    }
  );
  record(
    "teacher_list_messages",
    listRes.statusCode === 200 && Array.isArray(listRes.body?.data?.messages),
    `status=${listRes.statusCode}`
  );

  const testMsg = `בדיקת smoke ${Date.now()} — הודעה קצרה להורה.`;
  const createRes = await runHandler(
    "pages/api/teacher/students/[studentId]/parent-messages/index.js",
    {
      method: "POST",
      query: { studentId },
      headers: { authorization: `Bearer ${teacherToken}`, origin: "http://localhost:3000" },
      body: { message: testMsg },
    }
  );
  const createdId = createRes.body?.data?.id;
  record(
    "teacher_create_message",
    createRes.statusCode === 201 && createdId,
    `status=${createRes.statusCode}`
  );

  const forbidRes = await runHandler(
    "pages/api/teacher/students/[studentId]/parent-messages/index.js",
    {
      method: "POST",
      query: { studentId: FAKE_STUDENT_ID },
      headers: { authorization: `Bearer ${teacherToken}`, origin: "http://localhost:3000" },
      body: { message: "should fail" },
    }
  );
  record("teacher_unlinked_forbidden", forbidRes.statusCode === 403, `status=${forbidRes.statusCode}`);

  if (otherToken) {
    const idorRes = await runHandler(
      "pages/api/teacher/students/[studentId]/parent-messages/index.js",
      {
        method: "GET",
        query: { studentId },
        headers: { authorization: `Bearer ${otherToken}` },
      }
    );
    record(
      "teacher_idor_list",
      idorRes.statusCode === 403,
      `status=${idorRes.statusCode}`
    );
  }

  const { buildParentInsightsHe } = await import(
    u("lib/parent-server/parent-report-parent-facing.server.js")
  );
  const insights = buildParentInsightsHe({ summary: { totalAnswers: 0 }, subjects: {} });
  record(
    "insights_hebrew",
    insights.length > 0 && !/[a-zA-Z]/.test(insights.join(" ")),
    insights[0]
  );

  if (createdId) {
    const hideRes = await runHandler(
      "pages/api/teacher/students/[studentId]/parent-messages/[messageId]/hide.js",
      {
        method: "POST",
        query: { studentId, messageId: createdId },
        headers: { authorization: `Bearer ${teacherToken}`, origin: "http://localhost:3000" },
      }
    );
    record("teacher_hide_message", hideRes.statusCode === 200, `status=${hideRes.statusCode}`);
  }

  printAndExit();
}

function printAndExit() {
  const pass = results.every((r) => r.pass);
  console.log(JSON.stringify({ pass, results }, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
