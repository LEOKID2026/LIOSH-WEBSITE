#!/usr/bin/env node
/**
 * Classroom Activities API simulation (isolated from daily classroom sim).
 * Requires migration 024 applied and dev server optional (API handlers imported directly).
 *
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/teacher-activity-sim.mjs
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

const TEACHER_EMAIL =
  process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher@leo.com";
const TEACHER_PASSWORD = process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "TeacherPortalVerify!2026";
const STUDENT_USER = process.env.ACTIVITY_SIM_STUDENT_USER || "simg3-01";
const STUDENT_PIN = process.env.ACTIVITY_SIM_STUDENT_PIN || "1234";

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
    setHeader() {},
    end() {},
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
  if (error || !data.session?.access_token) {
    throw new Error(error?.message || "teacher sign-in failed");
  }
  return data.session.access_token;
}

function parseStudentCookie(headers) {
  const raw = headers["set-cookie"] || headers["Set-Cookie"] || "";
  const line = Array.isArray(raw) ? raw[0] : String(raw);
  const match = line.match(/liosh_student_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function sampleQuestionSet(n) {
  const qs = [];
  for (let i = 0; i < n; i += 1) {
    const a = 2 + i;
    const b = 3;
    qs.push({
      question: `${a} + ${b} = __`,
      correctAnswer: String(a + b),
      subject: "math",
      topic: "addition",
    });
  }
  return qs;
}

async function main() {
  process.env.TEACHER_PORTAL_ENABLED = "true";

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: schemaProbe, error: schemaErr } = await admin
    .from("classroom_activities")
    .select("id")
    .limit(1);

  if (schemaErr) {
    console.error("Migration 024 not applied:", schemaErr.message);
    process.exit(2);
  }
  void schemaProbe;

  const teacherToken = await signIn(anon, TEACHER_EMAIL, TEACHER_PASSWORD);
  const teacherAuth = { authorization: `Bearer ${teacherToken}`, origin: "http://localhost:3001" };

  const classesRes = await runHandler("pages/api/teacher/classes/index.js", {
    method: "GET",
    headers: teacherAuth,
    query: {},
  });
  const classes = classesRes.body?.data?.classes || [];
  const cls = classes.find((c) => (c.memberCount ?? c.activeMemberCount ?? 0) >= 1) || classes[0];
  if (!cls?.classId) {
    record("pick_class", false, "no class with members");
    printSummary();
    process.exit(1);
  }
  record("pick_class", true, cls.classId);

  const questionSet = sampleQuestionSet(5);
  const createRes = await runHandler("pages/api/teacher/activities/index.js", {
    method: "POST",
    headers: { ...teacherAuth, "content-type": "application/json" },
    body: {
      classId: cls.classId,
      title: `Sim Activity ${new Date().toISOString().slice(0, 16)}`,
      subject: "math",
      topic: "addition",
      mode: "guided_practice",
      questionSelection: "same_exact",
      difficultyLevel: "medium",
      questionCount: 5,
      questionSet,
    },
  });
  const activityId = createRes.body?.data?.activityId;
  record("create_activity", createRes.statusCode === 201 && !!activityId, String(createRes.statusCode));

  if (!activityId) {
    printSummary();
    process.exit(1);
  }

  const activateRes = await runHandler(
    `pages/api/teacher/activities/[activityId]/status.js`,
    {
      method: "PATCH",
      headers: { ...teacherAuth, "content-type": "application/json" },
      query: { activityId },
      body: { action: "activate" },
    }
  );
  record("activate", activateRes.statusCode === 200, activateRes.body?.data?.status);

  const loginRes = await runHandler("pages/api/student/login.js", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3001" },
    body: { username: STUDENT_USER, pin: STUDENT_PIN },
  });
  const studentCookie = parseStudentCookie(loginRes.headers);
  record("student_login", loginRes.statusCode === 200 && !!studentCookie, String(loginRes.statusCode));

  const studentHeaders = {
    cookie: `liosh_student_session=${studentCookie}`,
    "content-type": "application/json",
    origin: "http://localhost:3001",
  };

  const startRes = await runHandler(
    `pages/api/student/activities/[activityId]/start.js`,
    {
      method: "POST",
      headers: studentHeaders,
      query: { activityId },
      body: {},
    }
  );
  const stripped = JSON.stringify(startRes.body?.questionSet || []);
  record(
    "start_strips_answers",
    !stripped.includes("correctAnswer") && !stripped.includes("correct_answer"),
    stripped.slice(0, 80)
  );

  for (let i = 0; i < 5; i += 1) {
    const ansRes = await runHandler(
      `pages/api/student/activities/[activityId]/answer.js`,
      {
        method: "POST",
        headers: studentHeaders,
        query: { activityId },
        body: {
          questionIndex: i,
          selectedAnswer: String(questionSet[i].correctAnswer),
          timeSpentMs: 1000,
        },
      }
    );
    if (i === 0) {
      record("answer_correct", ansRes.body?.isCorrect === true, String(ansRes.body?.isCorrect));
    }
  }

  const tamperRes = await runHandler(
    `pages/api/student/activities/[activityId]/answer.js`,
    {
      method: "POST",
      headers: studentHeaders,
      query: { activityId },
      body: {
        questionIndex: 0,
        selectedAnswer: "wrong",
        is_correct: true,
        correct_answer: "wrong",
      },
    }
  );
  record(
    "tamper_ignored",
    tamperRes.body?.isCorrect === false,
    `isCorrect=${tamperRes.body?.isCorrect}`
  );

  await runHandler(`pages/api/student/activities/[activityId]/submit.js`, {
    method: "POST",
    headers: studentHeaders,
    query: { activityId },
    body: {},
  });

  const monitorRes = await runHandler(
    `pages/api/teacher/activities/[activityId]/monitor.js`,
    {
      method: "GET",
      headers: teacherAuth,
      query: { activityId },
    }
  );
  record(
    "monitor",
    monitorRes.statusCode === 200 && monitorRes.body?.data?.students?.length >= 0,
    `students=${monitorRes.body?.data?.students?.length}`
  );

  await runHandler(`pages/api/teacher/activities/[activityId]/status.js`, {
    method: "PATCH",
    headers: { ...teacherAuth, "content-type": "application/json" },
    query: { activityId },
    body: { action: "close" },
  });

  const reportRes = await runHandler(
    `pages/api/teacher/activities/[activityId]/report.js`,
    {
      method: "GET",
      headers: teacherAuth,
      query: { activityId },
    }
  );
  record(
    "report",
    reportRes.statusCode === 200 && reportRes.body?.data?.perQuestion?.length === 5,
    `pq=${reportRes.body?.data?.perQuestion?.length}`
  );

  const variantsRes = await runHandler("pages/api/teacher/activities/index.js", {
    method: "POST",
    headers: { ...teacherAuth, "content-type": "application/json" },
    body: {
      classId: cls.classId,
      title: "Variants blocked",
      subject: "math",
      topic: "x",
      mode: "guided_practice",
      questionSelection: "controlled_variants",
      questionCount: 3,
      questionSet: sampleQuestionSet(3),
    },
  });
  record("controlled_variants_501", variantsRes.statusCode === 501, String(variantsRes.statusCode));

  printSummary();
  const failed = results.filter((r) => !r.pass).length;
  process.exit(failed ? 1 : 0);
}

function printSummary() {
  console.log("\n--- teacher-activity-sim ---");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"} ${r.name}${r.detail ? ` (${r.detail})` : ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
