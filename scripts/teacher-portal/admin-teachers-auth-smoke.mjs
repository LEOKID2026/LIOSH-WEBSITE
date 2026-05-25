#!/usr/bin/env node
/**
 * Smoke: teacher cannot access admin APIs; admin can list teachers.
 * node --env-file=.env.local scripts/teacher-portal/admin-teachers-auth-smoke.mjs
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

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function mockRes() {
  return {
    statusCode: 200,
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

async function runHandler(rel, req) {
  const mod = await import(u(rel));
  const res = mockRes();
  await mod.default(req, res);
  return res;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");

  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({
    email: TEACHER_EMAIL,
    password: TEACHER_PASSWORD,
  });
  if (error || !data.session?.access_token) throw error || new Error("no teacher token");

  const teacherRes = await runHandler("pages/api/admin/teachers/index.js", {
    method: "GET",
    headers: { authorization: `Bearer ${data.session.access_token}` },
  });
  if (teacherRes.statusCode !== 403) {
    throw new Error(`expected 403 for teacher on admin list, got ${teacherRes.statusCode}`);
  }
  console.log("admin-teachers-auth-smoke: teacher blocked (403) — ok");
  console.log("admin-teachers-auth-smoke: set app_metadata.role=admin on owner user to test admin path");
}

main().catch((e) => {
  console.error("admin-teachers-auth-smoke: FAIL", e.message || e);
  process.exit(1);
});
