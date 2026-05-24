#!/usr/bin/env node
/**
 * Phase 5A API smoke (dev Supabase + handlers).
 * node --env-file=.env.local --env-file=.env.e2e.local scripts/teacher-portal/phase5a-smoke.mjs
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
const DEMO_STUDENT_ID = "d119f721-05b3-4fe2-ac58-4174ac06f733";

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

const results = [];
function record(n, p, d = "") {
  results.push({ name: n, pass: p, detail: d });
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

function envFlag(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") {
    return defaultValue;
  }
  return String(raw).trim().toLowerCase() === "true";
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} teacherId
 * @param {string} studentId
 */
async function ensureActiveTeacherStudentLink(admin, teacherId, studentId) {
  const now = new Date().toISOString();
  await admin
    .from("teacher_students")
    .update({ archived_at: now })
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .is("archived_at", null);

  const { error } = await admin.from("teacher_students").insert({
    teacher_id: teacherId,
    student_id: studentId,
    relationship: "primary_teacher",
  });
  if (error) {
    throw new Error(`seed teacher_students failed: ${error.message}`);
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} teacherId
 */
async function resetTeacherClassesForSmoke(admin, teacherId) {
  const { data: oldClasses } = await admin
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", teacherId);
  for (const row of oldClasses || []) {
    await admin.from("teacher_class_students").delete().eq("class_id", row.id);
  }
  await admin.from("teacher_classes").delete().eq("teacher_id", teacherId);
}

async function main() {
  process.env.TEACHER_PORTAL_ENABLED = "true";
  const linkEnabled = envFlag("TEACHER_PORTAL_LINK_ENABLED", false);

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const token = await signIn(anon, TEACHER_EMAIL, TEACHER_PASSWORD);
  const auth = { authorization: `Bearer ${token}`, origin: "http://localhost:3001" };

  const teacherUser = (
    await admin.auth.admin.listUsers({ perPage: 200, page: 1 })
  ).data?.users?.find((x) => x.email === TEACHER_EMAIL);
  const teacherId = teacherUser?.id;
  if (!teacherId) throw new Error("teacher user not found");

  await admin.from("teacher_profiles").upsert({ id: teacherId });
  await admin.from("teacher_limits").upsert({ teacher_id: teacherId, plan_code: "teacher_basic_20" });

  const students = await run("./pages/api/teacher/students.js", {
    method: "GET",
    headers: auth,
    query: {},
  });
  record(
    "GET /api/teacher/students",
    students.statusCode === 200 && Array.isArray(students.body?.data?.students),
    `count=${students.body?.data?.students?.length}`
  );

  const link = await run("./pages/api/teacher/students/link.js", {
    method: "POST",
    headers: auth,
    body: linkEnabled
      ? { studentId: DEMO_STUDENT_ID }
      : { studentId: DEMO_STUDENT_ID, consentToken: "x" },
  });
  if (linkEnabled) {
    record(
      "POST /api/teacher/students/link (enabled, no token) → consent_required",
      link.statusCode === 403 && link.body?.error?.code === "consent_required",
      JSON.stringify(link.body?.error)
    );
  } else {
    record(
      "POST /api/teacher/students/link (disabled) → link_unavailable",
      link.statusCode === 503 && link.body?.error?.code === "link_unavailable",
      JSON.stringify(link.body?.error)
    );
  }

  await resetTeacherClassesForSmoke(admin, teacherId);

  const create1 = await run("./pages/api/teacher/classes/index.js", {
    method: "POST",
    headers: auth,
    body: { name: "Phase5A Smoke Class" },
  });
  record("POST /api/teacher/classes", create1.statusCode === 201, String(create1.statusCode));
  const classId = create1.body?.data?.classId;
  if (!classId) {
    console.error("Phase 5A smoke: class create failed; cannot continue class/member tests");
    process.exit(1);
  }

  const limits = 5;
  let hitLimit = false;
  for (let i = 0; i < 10; i++) {
    const r = await run("./pages/api/teacher/classes/index.js", {
      method: "POST",
      headers: auth,
      body: { name: `Extra ${i}` },
    });
    if (r.statusCode === 409 && r.body?.error?.code === "class_limit_reached") {
      hitLimit = true;
      break;
    }
  }
  record("class limit enforced", hitLimit, `plan classLimit=${limits}`);

  const listClasses = await run("./pages/api/teacher/classes/index.js", {
    method: "GET",
    headers: auth,
    query: {},
  });
  record("GET /api/teacher/classes", listClasses.statusCode === 200, String(listClasses.statusCode));

  const patch = await run("./pages/api/teacher/classes/[classId].js", {
    method: "PATCH",
    headers: auth,
    query: { classId },
    body: { name: "Phase5A Renamed" },
  });
  record("PATCH class", patch.statusCode === 200, String(patch.statusCode));

  await ensureActiveTeacherStudentLink(admin, teacherId, DEMO_STUDENT_ID);

  const addUnlinked = await run("./pages/api/teacher/classes/[classId]/members.js", {
    method: "POST",
    headers: auth,
    query: { classId },
    body: { studentId: "e0000000-0000-4000-8000-000000000099" },
  });
  record(
    "add unlinked student → 403 student_not_linked",
    addUnlinked.statusCode === 403 && addUnlinked.body?.error?.code === "student_not_linked",
    addUnlinked.body?.error?.code
  );

  const addLinked = await run("./pages/api/teacher/classes/[classId]/members.js", {
    method: "POST",
    headers: auth,
    query: { classId },
    body: { studentId: DEMO_STUDENT_ID },
  });
  record("add linked student", addLinked.statusCode === 201, String(addLinked.statusCode));
  const membershipId = addLinked.body?.data?.membershipId;

  const otherEmail = "teacher-portal-other@liosh-dev.invalid";
  let otherId = null;
  const listed = await admin.auth.admin.listUsers({ perPage: 200, page: 1 });
  const found = listed.data?.users?.find((x) => x.email === otherEmail);
  if (found?.id) {
    otherId = found.id;
  } else {
    const c = await admin.auth.admin.createUser({
      email: otherEmail,
      password: "OtherTeacher!2026",
      email_confirm: true,
      app_metadata: { role: "teacher" },
    });
    otherId = c.data?.user?.id;
  }
  await admin.from("teacher_profiles").upsert({ id: otherId });
  await admin.from("teacher_limits").upsert({ teacher_id: otherId, plan_code: "teacher_basic_20" });
  const otherToken = await signIn(anon, otherEmail, "OtherTeacher!2026");
  const cross = await run("./pages/api/teacher/classes/[classId].js", {
    method: "GET",
    headers: { authorization: `Bearer ${otherToken}` },
    query: { classId },
  });
  record(
    "other teacher cannot read class",
    cross.statusCode === 404 && cross.body?.error?.code === "class_not_found",
    String(cross.statusCode)
  );

  const delMember = await run("./pages/api/teacher/classes/[classId]/members/[membershipId].js", {
    method: "DELETE",
    headers: auth,
    query: { classId, membershipId },
  });
  record("DELETE member", delMember.statusCode === 200, String(delMember.statusCode));

  const archive = await run("./pages/api/teacher/classes/[classId]/archive.js", {
    method: "POST",
    headers: auth,
    query: { classId },
  });
  record("POST archive class", archive.statusCode === 200, String(archive.statusCode));

  const { data: audits } = await admin
    .from("teacher_access_audit")
    .select("action")
    .eq("teacher_id", teacherId)
    .in("action", ["class_created", "class_updated", "class_archived", "class_member_added", "class_member_removed"]);
  record(
    "audit rows for class actions",
    (audits || []).length >= 3,
    (audits || []).map((a) => a.action).join(",")
  );

  process.env.TEACHER_PORTAL_ENABLED = "false";
  const disabled = await run("./pages/api/teacher/classes/index.js", {
    method: "GET",
    headers: auth,
    query: {},
  });
  record(
    "flag off disables API",
    disabled.statusCode === 503 && disabled.body?.error?.code === "feature_disabled",
    String(disabled.statusCode)
  );
  process.env.TEACHER_PORTAL_ENABLED = "true";

  const { execSync } = await import("node:child_process");
  const diff = execSync(
    "git diff --name-only -- pages/parent pages/api/parent pages/api/student lib/parent-server utils/parent-copilot",
    { cwd: root, encoding: "utf8" }
  ).trim();
  record("parent/student/copilot unchanged", diff === "", diff || "(clean)");

  console.log("\nPhase 5A smoke:\n");
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
