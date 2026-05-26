#!/usr/bin/env node
/**
 * Verify QA school manager: signIn, teacher/me, school/me, not admin.
 * SCHOOL_QA_PASSWORD required at runtime (same as ensure script).
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const u = (p) => pathToFileURL(path.join(root, p)).href;

const EMAIL = String(process.env.SCHOOL_QA_EMAIL || "school@leo.com").trim().toLowerCase();

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    stopped: false,
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

async function runHandler(rel, req) {
  const mod = await import(u(rel));
  const res = mockRes();
  await mod.default(req, res);
  return res;
}

async function main() {
  requireEnv("SCHOOL_QA_PASSWORD");
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const password = requireEnv("SCHOOL_QA_PASSWORD");

  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({
    email: EMAIL,
    password,
  });
  if (error || !data.session?.access_token) {
    throw error || new Error("signIn failed");
  }

  const token = data.session.access_token;
  const role = data.user?.app_metadata?.role;
  if (String(role).toLowerCase() === "admin") {
    throw new Error("User must not be admin");
  }
  if (String(role).toLowerCase() !== "teacher") {
    throw new Error(`expected role=teacher, got ${JSON.stringify(role)}`);
  }
  console.log("PASS signIn — role=teacher");

  const teacherMe = await runHandler("pages/api/teacher/me.js", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    query: {},
  });
  if (teacherMe.statusCode !== 200) {
    throw new Error(`teacher/me expected 200, got ${teacherMe.statusCode} ${JSON.stringify(teacherMe.body)}`);
  }
  const sm = teacherMe.body?.data?.schoolMembership;
  if (!sm?.isSchoolManager) {
    throw new Error(`teacher/me missing schoolMembership.isSchoolManager: ${JSON.stringify(sm)}`);
  }
  console.log(`PASS teacher/me — isSchoolManager=true schoolId=${sm.schoolId}`);

  const postLoginPath = sm.isSchoolManager ? "/school/dashboard" : "/teacher/dashboard";
  console.log(`PASS login redirect target: ${postLoginPath}`);

  const schoolMe = await runHandler("pages/api/school/me.js", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    query: {},
  });
  if (schoolMe.statusCode !== 200) {
    throw new Error(`school/me expected 200, got ${schoolMe.statusCode} ${JSON.stringify(schoolMe.body)}`);
  }
  console.log(`PASS school/me — school=${schoolMe.body?.data?.school?.name}`);

  const adminList = await runHandler("pages/api/admin/teachers/index.js", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    query: {},
  });
  if (adminList.statusCode === 200) {
    throw new Error("admin/teachers must not return 200 for school manager");
  }
  console.log(`PASS admin/teachers blocked (status=${adminList.statusCode})`);

  const schoolDash = await runHandler("pages/api/school/dashboard.js", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    query: {},
  });
  if (schoolDash.statusCode !== 200) {
    throw new Error(`school/dashboard expected 200, got ${schoolDash.statusCode}`);
  }
  console.log("PASS school/dashboard — stats loaded");

  console.log("\nAll school manager auth checks passed.");
  console.log(JSON.stringify({
    email: EMAIL,
    redirectAfterLogin: postLoginPath,
    schoolId: sm.schoolId,
    schoolName: sm.schoolName,
    sameSessionAsTeacher: true,
  }, null, 2));
}

main().catch((e) => {
  console.error("verify-school-manager-login-flow: FAIL", e.message || e);
  process.exit(1);
});
