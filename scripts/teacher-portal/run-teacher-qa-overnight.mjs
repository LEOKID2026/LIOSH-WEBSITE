#!/usr/bin/env node
/**
 * Overnight QA: accumulate learning + activities for teacher@leo.com / כיתה ג׳ - LEO.
 * Does NOT touch AAA nightly or virtual-student-qa state dirs.
 *
 *   node --env-file=.env.local scripts/teacher-portal/run-teacher-qa-overnight.mjs
 *   node --env-file=.env.local scripts/teacher-portal/run-teacher-qa-overnight.mjs --cycles-only=math,science
 *   node --env-file=.env.local scripts/teacher-portal/run-teacher-qa-overnight.mjs --skip-playwright
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { QA_CLASS_NAME, ensureQaTeacherClass } from "./ensure-qa-teacher-class.mjs";
import { buildTeacherDashboardPayload } from "../../lib/teacher-server/teacher-dashboard.server.js";
import { isSmokeClassName } from "../../lib/teacher-portal/teacher-smoke-artifacts.js";
import { parseConfig, SUBJECT_ROTATION } from "./teacher-classroom-sim/config.mjs";
import { createAdminClient } from "./teacher-classroom-sim/bootstrap.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "../..");

const TEACHER_EMAIL = "teacher@leo.com";
const TEACHER_PASSWORD = process.env.SIM_TEACHER_PASSWORD || "747975";
const DEFAULT_CYCLES = ["math", "science", "moledet-geography", "geometry"];
const QA_ACTIVITY_TITLE_PREFIX = "QA Overnight";

function parseArgs(argv) {
  const out = { cyclesOnly: null, skipPlaywright: false, skipActivities: false, baseUrl: null };
  for (const a of argv) {
    if (a.startsWith("--cycles-only=")) out.cyclesOnly = a.split("=")[1].split(",").map((s) => s.trim());
    if (a === "--skip-playwright") out.skipPlaywright = true;
    if (a === "--skip-activities") out.skipActivities = true;
    if (a.startsWith("--base-url=")) out.baseUrl = a.split("=").slice(1).join("=");
  }
  return out;
}

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function runNodeScript(relScript, extraArgs = [], envExtra = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const envFiles = [".env.local"];
    const e2ePath = join(REPO_ROOT, ".env.e2e.local");
    if (process.env.USE_E2E_ENV === "1" || existsSync(e2ePath)) envFiles.push(".env.e2e.local");
    const envFlag = envFiles.map((f) => `--env-file=${f}`).join(" ");
    const args = [
      ...envFiles.flatMap((f) => ["--env-file", join(REPO_ROOT, f)]),
      join(REPO_ROOT, relScript),
      ...extraArgs,
    ];
    const child = spawn(process.execPath, args, {
      cwd: REPO_ROOT,
      env: { ...process.env, ...envExtra },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      const t = d.toString();
      stdout += t;
      process.stdout.write(t);
    });
    child.stderr.on("data", (d) => {
      const t = d.toString();
      stderr += t;
      process.stderr.write(t);
    });
    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
        runtimeMs: Date.now() - started,
      });
    });
    child.on("error", reject);
  });
}

async function signInTeacher() {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({
    email: TEACHER_EMAIL,
    password: TEACHER_PASSWORD,
  });
  if (error || !data.session?.access_token) throw new Error(error?.message || "teacher sign-in failed");
  return data.session.access_token;
}

async function apiFetch(baseUrl, path, opts = {}) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method: opts.method || "GET",
    headers: opts.headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { _raw: text.slice(0, 400) };
  }
  return { status: res.status, json, text, headers: res.headers };
}

function sampleQuestionSet(n, subject, topic) {
  const qs = [];
  for (let i = 0; i < n; i += 1) {
    const a = 2 + i;
    const b = 3;
    qs.push({
      question: `${a} + ${b} = __`,
      correctAnswer: String(a + b),
      subject,
      topic,
    });
  }
  return qs;
}

async function verifyDashboard(admin, teacherId) {
  const dash = await buildTeacherDashboardPayload({ serviceRole: admin, teacherId });
  if (!dash.ok) return { ok: false, error: dash.code };
  const classes = dash.payload.classes || [];
  const qa = classes.find((c) => c.name === QA_CLASS_NAME);
  return {
    ok: Boolean(qa),
    classCount: dash.payload.summary?.classCount ?? 0,
    studentCount: dash.payload.summary?.studentCount ?? 0,
    directCount: dash.payload.summary?.directStudentsCount ?? 0,
    qaClassId: qa?.classId || null,
    qaRosterCount: qa?.rosterStudentCount ?? qa?.studentCount ?? 0,
    classNames: classes.map((c) => c.name),
    rosterFilterKeys: (dash.payload.rosterFilters || []).map((f) => f.key),
  };
}

async function runClassroomActivityForQaClass(baseUrl, teacherToken, classId) {
  const auth = { Authorization: `Bearer ${teacherToken}`, Origin: baseUrl };
  const stamp = new Date().toISOString().slice(0, 16);
  const title = `${QA_ACTIVITY_TITLE_PREFIX} Class ${stamp}`;
  const createRes = await apiFetch(baseUrl, "/api/teacher/activities", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: {
      classId,
      title,
      subject: "math",
      topic: "addition",
      mode: "guided_practice",
      questionSelection: "same_exact",
      difficultyLevel: "medium",
      questionCount: 5,
      questionSet: sampleQuestionSet(5, "math", "addition"),
    },
  });
  const activityId = createRes.json?.data?.activityId;
  if (createRes.status !== 201 || !activityId) {
    return { ok: false, error: `create ${createRes.status}`, title };
  }
  await apiFetch(baseUrl, `/api/teacher/activities/${activityId}/status`, {
    method: "PATCH",
    headers: { ...auth, "Content-Type": "application/json" },
    body: { action: "activate" },
  });
  const loginRes = await apiFetch(baseUrl, "/api/student/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: { username: "leo-s01", pin: "1234" },
  });
  const cookieRaw = loginRes.headers.get("set-cookie") || "";
  const m = cookieRaw.match(/liosh_student_session=([^;]+)/);
  if (!m) return { ok: false, error: "student login cookie", activityId, title };
  const studentHeaders = {
    Cookie: `liosh_student_session=${decodeURIComponent(m[1])}`,
    Origin: baseUrl,
    "Content-Type": "application/json",
  };
  await apiFetch(baseUrl, `/api/student/activities/${activityId}/start`, {
    method: "POST",
    headers: studentHeaders,
    body: {},
  });
  for (let i = 0; i < 5; i += 1) {
    await apiFetch(baseUrl, `/api/student/activities/${activityId}/answer`, {
      method: "POST",
      headers: studentHeaders,
      body: { questionIndex: i, selectedAnswer: String(5 + i), timeSpentMs: 1000 },
    });
  }
  await apiFetch(baseUrl, `/api/student/activities/${activityId}/submit`, {
    method: "POST",
    headers: studentHeaders,
    body: {},
  });
  return { ok: true, activityId, title };
}

async function runIndividualActivity(admin, teacherId, studentId, baseUrl, teacherToken) {
  const auth = { Authorization: `Bearer ${teacherToken}`, Origin: baseUrl };
  const stamp = new Date().toISOString().slice(0, 16);
  const title = `${QA_ACTIVITY_TITLE_PREFIX} Individual ${stamp}`;
  const createRes = await apiFetch(baseUrl, "/api/teacher/student-activities", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: {
      studentId,
      title,
      subject: "math",
      topic: "addition",
      mode: "guided_practice",
      questionSelection: "same_exact",
      difficultyLevel: "medium",
      questionCount: 3,
      questionSet: sampleQuestionSet(3, "math", "addition"),
    },
  });
  const activityId = createRes.json?.data?.activityId;
  if (createRes.status !== 201 || !activityId) {
    return { ok: false, error: `create ${createRes.status}`, title };
  }
  await apiFetch(baseUrl, `/api/teacher/student-activities/${activityId}/status`, {
    method: "PATCH",
    headers: { ...auth, "Content-Type": "application/json" },
    body: { action: "activate" },
  });
  const { data: access } = await admin
    .from("student_access_codes")
    .select("login_username")
    .eq("student_id", studentId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  const username = access?.login_username || "leo-s01";
  const loginRes = await apiFetch(baseUrl, "/api/student/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: { username, pin: "1234" },
  });
  const cookieRaw = loginRes.headers.get("set-cookie") || "";
  const m = cookieRaw.match(/liosh_student_session=([^;]+)/);
  if (!m) return { ok: false, error: "student login", activityId, title };
  const studentHeaders = {
    Cookie: `liosh_student_session=${decodeURIComponent(m[1])}`,
    Origin: baseUrl,
    "Content-Type": "application/json",
  };
  await apiFetch(baseUrl, `/api/student/activities/${activityId}/start`, {
    method: "POST",
    headers: studentHeaders,
    body: {},
  });
  for (let i = 0; i < 3; i += 1) {
    await apiFetch(baseUrl, `/api/student/activities/${activityId}/answer`, {
      method: "POST",
      headers: studentHeaders,
      body: { questionIndex: i, selectedAnswer: String(5 + i), timeSpentMs: 800 },
    });
  }
  await apiFetch(baseUrl, `/api/student/activities/${activityId}/submit`, {
    method: "POST",
    headers: studentHeaders,
    body: {},
  });
  return { ok: true, activityId, title, username };
}

async function countLearningRows(admin, studentIds) {
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { count: sessions, error: sErr } = await admin
    .from("learning_sessions")
    .select("id", { count: "exact", head: true })
    .in("student_id", studentIds)
    .gte("started_at", since);
  if (sErr) throw new Error(sErr.message);
  return { sessions48h: sessions ?? 0 };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = parseConfig(["--grade=g3"]);
  const baseUrl = args.baseUrl || config.baseUrl;
  const date = config.date;
  const reportDir = join(REPO_ROOT, "reports", "teacher-qa-overnight", date);
  mkdirSync(reportDir, { recursive: true });

  const report = {
    startedAt: new Date().toISOString(),
    teacherEmail: TEACHER_EMAIL,
    qaClassName: QA_CLASS_NAME,
    baseUrl,
    preflight: null,
    cycles: [],
    activities: null,
    individualActivities: [],
    postVerify: null,
    errors: [],
  };

  console.log("=== Teacher QA Overnight ===");
  console.log(`baseUrl=${baseUrl} date=${date}`);

  const admin = createAdminClient();
  const provision = await ensureQaTeacherClass(admin);
  report.preflight = { provision, dashboard: await verifyDashboard(admin, provision.teacherId) };

  if (!report.preflight.dashboard.ok) {
    throw new Error(`Preflight dashboard failed: ${JSON.stringify(report.preflight.dashboard)}`);
  }

  const cycles =
    args.cyclesOnly ||
    DEFAULT_CYCLES.filter((s) => SUBJECT_ROTATION.includes(s));
  const qaClassId = report.preflight.dashboard.qaClassId;

  if (!args.skipPlaywright) {
    for (const subject of cycles) {
      console.log(`\n--- Playwright cycle: ${subject} ---`);
      const extra = [
        `--grade=g3`,
        `--subject=${subject}`,
        `--force=true`,
        `--date=${date}`,
        `--base-url=${baseUrl}`,
      ];
      const result = await runNodeScript("scripts/teacher-portal/run-teacher-classroom-daily-simulation.mjs", extra, {
        SIM_TEACHER_STUDENT_PIN: "1234",
      });
      const cycleEntry = {
        subject,
        exitCode: result.exitCode,
        runtimeMs: result.runtimeMs,
        sessionsCreated: null,
        answersCreated: null,
        failures: result.exitCode !== 0 ? result.stderr.slice(-2000) : null,
      };
      const mSess = result.stdout.match(/Sessions completed:\s+(\d+)/i);
      const mAns = result.stdout.match(/Answers recorded:\s+(\d+)/i);
      if (mSess) cycleEntry.sessionsCreated = Number(mSess[1]);
      if (mAns) cycleEntry.answersCreated = Number(mAns[1]);
      report.cycles.push(cycleEntry);
      if (result.exitCode !== 0) {
        report.errors.push(`cycle ${subject} exit ${result.exitCode}`);
      }
    }
  }

  if (!args.skipActivities && qaClassId) {
    console.log("\n--- Classroom activity (QA class) ---");
    try {
      const teacherToken = await signInTeacher();
      report.activities = await runClassroomActivityForQaClass(baseUrl, teacherToken, qaClassId);
    } catch (e) {
      report.activities = { ok: false, error: String(e?.message || e) };
      report.errors.push(`class activity: ${e?.message}`);
    }

    const { data: members } = await admin
      .from("teacher_class_students")
      .select("student_id")
      .eq("class_id", qaClassId)
      .is("removed_at", null)
      .limit(3);
    const studentIds = (members || []).map((m) => m.student_id).filter(Boolean);
    if (studentIds.length >= 2) {
      console.log("\n--- Individual activities (2 students) ---");
      const teacherToken = await signInTeacher();
      for (const sid of studentIds.slice(0, 2)) {
        try {
          const r = await runIndividualActivity(admin, provision.teacherId, sid, baseUrl, teacherToken);
          report.individualActivities.push({ studentId: sid, ...r });
        } catch (e) {
          report.individualActivities.push({ studentId: sid, ok: false, error: String(e?.message || e) });
        }
      }
    }
  }

  const manifestStudents = (await admin
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", qaClassId)
    .is("removed_at", null)).data?.map((r) => r.student_id) || [];

  report.postVerify = {
    dashboard: await verifyDashboard(admin, provision.teacherId),
    learning: manifestStudents.length
      ? await countLearningRows(admin, manifestStudents)
      : { sessions48h: 0 },
  };

  if (qaClassId) {
    const teacherToken = await signInTeacher();
    const auth = { Authorization: `Bearer ${teacherToken}` };
    report.postVerify.classReport = (
      await apiFetch(baseUrl, `/api/teacher/classes/${qaClassId}/report-data`, { headers: auth })
    ).status;
    const s1 = manifestStudents[0];
    const s2 = manifestStudents[1];
    if (s1) {
      report.postVerify.studentReport1 = (
        await apiFetch(baseUrl, `/api/teacher/students/${s1}/report-data`, { headers: auth })
      ).status;
    }
    if (s2) {
      report.postVerify.studentReport2 = (
        await apiFetch(baseUrl, `/api/teacher/students/${s2}/report-data`, { headers: auth })
      ).status;
    }
    const studentLogin = await apiFetch(baseUrl, "/api/student/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: { username: "leo-s01", pin: "1234" },
    });
    report.postVerify.studentHomeLogin = studentLogin.status;
    const studentCookieRaw = studentLogin.headers.get("set-cookie") || "";
    const sm = studentCookieRaw.match(/liosh_student_session=([^;]+)/);
    if (sm) {
      const studentCookie = `liosh_student_session=${decodeURIComponent(sm[1])}`;
      report.postVerify.studentHomeProfile = (
        await apiFetch(baseUrl, "/api/student/home-profile", {
          headers: { Cookie: studentCookie, Origin: baseUrl },
        })
      ).status;
      report.postVerify.studentMe = (
        await apiFetch(baseUrl, "/api/student/me", {
          headers: { Cookie: studentCookie, Origin: baseUrl },
        })
      ).status;
    }
    const guardianLogin = await apiFetch(baseUrl, "/api/guardian/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: { loginUsername: "leo-p01", pin: "1234" },
    });
    report.postVerify.parentGuardianLogin = guardianLogin.status;
    const guardianCookieRaw = guardianLogin.headers.get("set-cookie") || "";
    const gm = guardianCookieRaw.match(/liosh_guardian_session=([^;]+)/);
    if (gm && s1) {
      const guardianCookie = `liosh_guardian_session=${decodeURIComponent(gm[1])}`;
      report.postVerify.parentReport = (
        await apiFetch(baseUrl, `/api/guardian/student/${s1}/report-data`, {
          headers: { Cookie: guardianCookie, Origin: baseUrl },
        })
      ).status;
    }
    report.postVerify.classActivitiesList = (
      await apiFetch(baseUrl, `/api/teacher/activities?classId=${qaClassId}`, { headers: auth })
    ).status;
    if (s1) {
      report.postVerify.personalActivitiesList = (
        await apiFetch(baseUrl, `/api/teacher/student-activities?studentId=${s1}`, { headers: auth })
      ).status;
    }
  }

  report.finishedAt = new Date().toISOString();
  const outPath = join(reportDir, "overnight-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport written: ${outPath}`);
  console.log(JSON.stringify(report, null, 2));

  if (report.errors.length) process.exit(1);
}

main().catch((e) => {
  console.error("run-teacher-qa-overnight: FAIL", e.message || e);
  process.exit(2);
});
