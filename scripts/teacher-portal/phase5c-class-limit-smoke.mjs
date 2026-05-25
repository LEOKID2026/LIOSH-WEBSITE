#!/usr/bin/env node
/**
 * Smoke: per-class 40 student cap via HTTP APIs.
 * Requires migration 025 applied and .env.local teacher credentials.
 *
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase5c-class-limit-smoke.mjs
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
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");

  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: signIn, error } = await anon.auth.signInWithPassword({
    email: TEACHER_EMAIL,
    password: TEACHER_PASSWORD,
  });
  if (error || !signIn.session?.access_token) throw error || new Error("no token");
  const token = signIn.session.access_token;
  const teacherId = signIn.user.id;

  const classRes = await runHandler("pages/api/teacher/classes/index.js", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, origin: "http://localhost:3001" },
    body: { name: `quota-smoke-${Date.now()}` },
  });
  if (classRes.statusCode !== 201) {
    throw new Error(`class create failed: ${classRes.statusCode} ${JSON.stringify(classRes.body)}`);
  }
  const classId = classRes.body?.data?.classId;
  if (!classId) throw new Error("no classId");

  const simParentListed = await admin.auth.admin.listUsers({ perPage: 200, page: 1 });
  const simParent = simParentListed.data?.users?.find(
    (x) => x.email === "parent-class-sim@liosh-dev.invalid"
  );
  if (!simParent?.id) throw new Error("sim parent missing");

  const studentIds = [];
  for (let i = 0; i < 41; i++) {
    const ins = await admin
      .from("students")
      .insert({
        parent_id: simParent.id,
        full_name: `Quota Smoke ${i} ${Date.now()}`,
        is_active: true,
      })
      .select("id")
      .single();
    if (ins.error) throw ins.error;
    studentIds.push(ins.data.id);
    await admin.from("teacher_students").upsert({
      teacher_id: teacherId,
      student_id: ins.data.id,
      relationship: "primary_teacher",
    });
  }

  let blocked = false;
  for (let i = 0; i < studentIds.length; i++) {
    const memberRes = await runHandler("pages/api/teacher/classes/[classId]/members.js", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, origin: "http://localhost:3001" },
      query: { classId },
      body: { studentId: studentIds[i] },
    });
    if (memberRes.statusCode === 409 && memberRes.body?.error?.code === "class_student_limit_reached") {
      blocked = true;
      console.log("phase5c: class_student_limit_reached at member", i + 1);
      break;
    }
    if (memberRes.statusCode !== 201) {
      console.warn("member add", i, memberRes.statusCode, memberRes.body?.error?.code);
    }
  }

  if (!blocked) {
    throw new Error("expected class_student_limit_reached before 41 members");
  }

  console.log("phase5c-class-limit-smoke: PASS");
}

main().catch((e) => {
  console.error("phase5c-class-limit-smoke: FAIL", e.message || e);
  process.exit(1);
});
