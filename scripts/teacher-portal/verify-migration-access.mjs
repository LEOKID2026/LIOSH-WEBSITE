#!/usr/bin/env node
/**
 * Post-migration verification for leo-pNN / leo-sNN simulation access.
 * node --env-file=.env.local scripts/teacher-portal/verify-migration-access.mjs
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadManifest } from "./teacher-classroom-sim/state.mjs";
import {
  parseConfig,
  SIM_TEACHER_EMAIL,
  resolvePassword,
  resolveBaseUrl,
} from "./teacher-classroom-sim/config.mjs";
import { createAdminClient } from "./teacher-classroom-sim/bootstrap.mjs";
import { hashStudentSecret, normalizeStudentUsername } from "../../lib/guardian-server/guardian-crypto.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;
const EXPECTED_CLASS = "4746eb0d-74cd-412a-946e-8a62ffff80ee";

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

async function run(rel, req) {
  const mod = await import(u(rel));
  const res = mockRes();
  await mod.default(req, res);
  return res;
}

function parseCookie(headers, name) {
  const raw = headers["set-cookie"] || headers["Set-Cookie"] || "";
  const line = Array.isArray(raw) ? raw[0] : String(raw);
  const m = line.match(new RegExp(`${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

const results = [];
function pass(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

async function httpLogin(username, pin) {
  const baseUrl = resolveBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/api/student/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ username, pin }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, cookie: res.headers.get("set-cookie") || "", baseUrl };
}

// Parent login (handler)
const pOk = await run("./pages/api/guardian/login.js", {
  method: "POST",
  headers: { origin: "http://localhost:3000", "content-type": "application/json" },
  body: { loginUsername: "leo-p01", pin: "1234" },
});
const guardianCookie = parseCookie(pOk.headers, "liosh_guardian_session");
const parentStudentId = pOk.body?.data?.studentId;
pass(
  "parent leo-p01/1234 login",
  pOk.statusCode === 200 && Boolean(parentStudentId),
  `status=${pOk.statusCode} studentId=${parentStudentId || ""}`
);

const pOld = await run("./pages/api/guardian/login.js", {
  method: "POST",
  headers: { origin: "http://localhost:3000", "content-type": "application/json" },
  body: { loginUsername: "leo-01", pin: "1234" },
});
pass("old leo-01 fails", pOld.statusCode === 401, `status=${pOld.statusCode}`);

if (guardianCookie) {
  const me = await run("./pages/api/guardian/me.js", {
    method: "GET",
    headers: { origin: "http://localhost:3000" },
    cookies: { liosh_guardian_session: guardianCookie },
    query: {},
  });
  pass("parent /api/guardian/me", me.statusCode === 200, `status=${me.statusCode}`);

  const rep = await run("./pages/api/guardian/student/[studentId]/report-data.js", {
    method: "GET",
    headers: { origin: "http://localhost:3000" },
    cookies: { liosh_guardian_session: guardianCookie },
    query: { studentId: parentStudentId },
  });
  pass("parent child report loads", rep.statusCode === 200 && rep.body?.ok === true, `status=${rep.statusCode}`);

  const teacherApi = await run("./pages/api/teacher/me.js", {
    method: "GET",
    headers: { origin: "http://localhost:3000" },
    cookies: { liosh_guardian_session: guardianCookie },
    query: {},
  });
  pass(
    "parent code cannot access teacher API",
    teacherApi.statusCode === 401 || teacherApi.statusCode === 403,
    `status=${teacherApi.statusCode}`
  );
}

// Student login via deployed HTTP API
const sOk = await httpLogin("leo-s01", "1234");
pass(
  "HTTP student leo-s01/1234 login",
  sOk.status === 200 && sOk.body?.ok === true,
  `base=${sOk.baseUrl} status=${sOk.status}`
);

const sOld = await httpLogin("simg3-01", "1234");
pass("HTTP old simg3-01 fails", sOld.status === 401, `status=${sOld.status}`);

if (sOk.body?.student?.id && sOk.cookie) {
  const meRes = await fetch(`${sOk.baseUrl}/api/student/me`, {
    headers: { cookie: sOk.cookie, origin: sOk.baseUrl },
  });
  pass("HTTP student /api/student/me", meRes.status === 200, `status=${meRes.status}`);

  const teacherRes = await fetch(`${sOk.baseUrl}/api/teacher/me`, {
    headers: { cookie: sOk.cookie, origin: sOk.baseUrl },
  });
  pass(
    "HTTP student session cannot access teacher API",
    teacherRes.status === 401 || teacherRes.status === 403,
    `status=${teacherRes.status}`
  );
}

// DB hash verification
const admin = createAdminClient();
const codeHash = hashStudentSecret(normalizeStudentUsername("leo-s01"));
const pinHash = hashStudentSecret("1234");
const { data: row } = await admin
  .from("student_access_codes")
  .select("id,student_id,login_username")
  .eq("code_hash", codeHash)
  .eq("pin_hash", pinHash)
  .eq("is_active", true)
  .is("revoked_at", null)
  .maybeSingle();
pass(
  "DB student leo-s01/1234 hash match",
  Boolean(row?.id) && row.login_username === "leo-s01",
  `studentId=${row?.student_id || ""}`
);

const oldHash = hashStudentSecret(normalizeStudentUsername("simg3-01"));
const { data: oldRow } = await admin
  .from("student_access_codes")
  .select("id,login_username")
  .eq("code_hash", oldHash)
  .eq("is_active", true)
  .is("revoked_at", null)
  .maybeSingle();
pass("DB old simg3-01 no longer matches", !oldRow?.id, oldRow?.login_username || "none");

// Teacher + class
const config = parseConfig([]);
const manifest = loadManifest(config.stateDir);
const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const { data: tAuth, error: tErr } = await anon.auth.signInWithPassword({
  email: SIM_TEACHER_EMAIL,
  password: resolvePassword("SIM_TEACHER_PASSWORD", "747975"),
});
pass("teacher login teacher@leo.com", !tErr && Boolean(tAuth?.session?.access_token), tErr?.message || "ok");

const teacherId = tAuth?.user?.id;
const classId = manifest?.classId || EXPECTED_CLASS;
pass("manifest class id matches", classId === EXPECTED_CLASS, `classId=${classId}`);

const { data: classRows } = await admin
  .from("teacher_classes")
  .select("id")
  .eq("teacher_id", teacherId)
  .eq("id", EXPECTED_CLASS);
pass("same class remains", (classRows || []).length === 1, `count=${(classRows || []).length}`);

const { data: studentRows } = await admin
  .from("teacher_class_students")
  .select("student_id")
  .eq("class_id", EXPECTED_CLASS);
const uniqueStudents = new Set((studentRows || []).map((r) => r.student_id));
pass(
  "20 students in class, no duplicates",
  uniqueStudents.size === 20 && (studentRows || []).length === 20,
  `unique=${uniqueStudents.size} rows=${(studentRows || []).length}`
);

const { data: codes } = await admin
  .from("student_access_codes")
  .select("login_username")
  .eq("is_active", true)
  .is("revoked_at", null)
  .like("login_username", "leo-s%");
const sortedS = (codes || [])
  .map((r) => r.login_username)
  .sort((a, b) => parseInt(a.split("-s")[1], 10) - parseInt(b.split("-s")[1], 10));
pass(
  "student usernames leo-s01..20",
  sortedS.length === 20 && sortedS[0] === "leo-s01" && sortedS[19] === "leo-s20",
  sortedS.join(", ")
);

const { data: parents } = await admin
  .from("student_guardian_access")
  .select("login_username")
  .eq("is_active", true)
  .is("revoked_at", null)
  .like("login_username", "leo-p%");
const sortedP = (parents || [])
  .map((r) => r.login_username)
  .sort((a, b) => parseInt(a.split("-p")[1], 10) - parseInt(b.split("-p")[1], 10));
pass(
  "parent usernames leo-p01..20",
  sortedP.length === 20 && sortedP[0] === "leo-p01" && sortedP[19] === "leo-p20",
  sortedP.join(", ")
);

const failed = results.filter((r) => !r.ok).length;
console.log(`\nVerification summary: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
