#!/usr/bin/env node
/**
 * Phase 4 live verification (dev Supabase + API handlers).
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase4-live-verify.mjs
 */
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

process.env.TEACHER_PORTAL_ENABLED = "true";
process.env.TEACHER_PORTAL_INVITE_ONLY = "true";
process.env.TEACHER_PORTAL_UI_COPY_ENABLED = "false";

const TEACHER_EMAIL = process.env.TEACHER_PORTAL_VERIFY_EMAIL || "teacher-portal-live-verify@liosh-dev.invalid";
const TEACHER_PASSWORD = process.env.TEACHER_PORTAL_VERIFY_PASSWORD || "TeacherPortalVerify!2026";

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader() {
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

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
}

const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureTeacherUser() {
  let userId = null;
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const match = data?.users?.find((u) => u.email === TEACHER_EMAIL);
    if (match?.id) {
      userId = match.id;
      break;
    }
    if (!data?.users?.length) break;
  }

  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email: TEACHER_EMAIL,
      password: TEACHER_PASSWORD,
      email_confirm: true,
      app_metadata: { role: "teacher" },
    });
    if (created.error || !created.data.user?.id) {
      throw new Error(`createUser failed: ${created.error?.message || "unknown"}`);
    }
    userId = created.data.user.id;
  } else {
    await admin.auth.admin.updateUserById(userId, {
      password: TEACHER_PASSWORD,
      app_metadata: { role: "teacher" },
    });
  }

  await admin.from("teacher_limits").delete().eq("teacher_id", userId);
  await admin.from("teacher_profiles").delete().eq("id", userId);

  return userId;
}

async function signIn(email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`signIn failed for ${email}: ${error?.message || "no token"}`);
  }
  return data.session.access_token;
}

async function main() {
  const teacherId = await ensureTeacherUser();
  record("teacher Auth user ready", true, teacherId);

  const teacherToken = await signIn(TEACHER_EMAIL, TEACHER_PASSWORD);
  record("teacher login (signInWithPassword)", true, "JWT issued");

  const authHeader = `Bearer ${teacherToken}`;

  let me = await runHandler("./pages/api/teacher/me.js", {
    method: "GET",
    headers: { authorization: authHeader },
    query: {},
  });
  record(
    "GET /api/teacher/me before onboard → 404 teacher_profile_missing",
    me.statusCode === 404 && me.body?.error?.code === "teacher_profile_missing",
    JSON.stringify(me.body)
  );
  if (!results.at(-1).pass) throw new Error("Pre-onboard me check failed");

  const onboard1 = await runHandler("./pages/api/teacher/onboard.js", {
    method: "POST",
    headers: { authorization: authHeader, origin: "http://localhost:3001" },
    body: {},
  });
  record(
    "POST /api/teacher/onboard creates profile",
    (onboard1.statusCode === 201 || onboard1.statusCode === 200) && onboard1.body?.data?.teacherId === teacherId,
    String(onboard1.statusCode)
  );

  const { data: profileRow } = await admin.from("teacher_profiles").select("id").eq("id", teacherId).maybeSingle();
  record("teacher_profiles row exists", Boolean(profileRow?.id), profileRow?.id || "missing");

  const { data: limitsRow } = await admin
    .from("teacher_limits")
    .select("plan_code")
    .eq("teacher_id", teacherId)
    .maybeSingle();
  record(
    "teacher_limits plan_code teacher_basic_20",
    limitsRow?.plan_code === "teacher_basic_20",
    limitsRow?.plan_code || "missing"
  );

  const onboard2 = await runHandler("./pages/api/teacher/onboard.js", {
    method: "POST",
    headers: { authorization: authHeader, origin: "http://localhost:3001" },
    body: {},
  });
  record(
    "POST /api/teacher/onboard idempotent",
    onboard2.statusCode === 200,
    String(onboard2.statusCode)
  );

  me = await runHandler("./pages/api/teacher/me.js", {
    method: "GET",
    headers: { authorization: authHeader },
    query: {},
  });
  record(
    "GET /api/teacher/me after onboard → 200 profile+limits+counters",
    me.statusCode === 200 &&
      me.body?.data?.teacher?.teacherId === teacherId &&
      me.body?.data?.limits?.planCode === "teacher_basic_20",
    JSON.stringify(me.body?.data?.limits)
  );

  const anonMe = await runHandler("./pages/api/teacher/me.js", {
    method: "GET",
    headers: {},
    query: {},
  });
  record(
    "anonymous GET /api/teacher/me → 401",
    anonMe.statusCode === 401,
    String(anonMe.statusCode)
  );

  const parentEmail = process.env.E2E_PARENT_EMAIL || "admin@admin.com";
  const parentPassword = process.env.E2E_PARENT_PASSWORD;
  if (parentPassword) {
    try {
      const parentToken = await signIn(parentEmail, parentPassword);
      const parentMe = await runHandler("./pages/api/teacher/me.js", {
        method: "GET",
        headers: { authorization: `Bearer ${parentToken}` },
        query: {},
      });
      record(
        "parent bearer GET /api/teacher/me → 403 not_a_teacher",
        parentMe.statusCode === 403 && parentMe.body?.error?.code === "not_a_teacher",
        JSON.stringify(parentMe.body)
      );
    } catch (e) {
      record("parent bearer GET /api/teacher/me → 403 not_a_teacher", false, e.message);
    }
  } else {
    record("parent bearer test", false, "skipped — set E2E_PARENT_PASSWORD in .env.e2e.local");
  }

  const { execSync } = await import("node:child_process");
  const parentDiff = execSync(
    "git diff --name-only -- pages/parent/login.js pages/api/parent lib/parent-server lib/learning-supabase/student-auth.js utils/parent-copilot",
    { cwd: root, encoding: "utf8" }
  ).trim();
  record("/parent/login + parent/student/copilot flows unchanged in git", parentDiff === "", parentDiff || "(clean)");

  console.log("\nPhase 4 live verification:\n");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.error("\nStopping — Phase 4 live verification failed.");
    process.exit(1);
  }
  console.log("\nPhase 4 live verification: ALL PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
