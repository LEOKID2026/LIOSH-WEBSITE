#!/usr/bin/env node
/**
 * Compare teacher dashboard data vs school manager APIs for QA school teachers.
 * node --env-file=.env.local scripts/school-portal/compare-teacher-vs-school-apis.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SCHOOL_ID = process.env.SCHOOL_QA_SCHOOL_ID || "9645e06d-0a0c-4d55-b1a3-74b43c3c18d5";
const BASE = process.env.SCHOOL_PORTAL_BASE_URL || "http://localhost:3000";

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function signInAs(email, password) {
  const admin = createClient(requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
  });
  const { data, error } = await admin.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session.access_token;
}

async function apiGet(token, path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function teacherCounts(serviceRole, teacherId) {
  const [classes, students, classroom, individual] = await Promise.all([
    serviceRole
      .from("teacher_classes")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .eq("is_archived", false)
      .is("archived_at", null),
    serviceRole
      .from("teacher_students")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .is("archived_at", null),
    serviceRole
      .from("classroom_activities")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .in("status", ["draft", "active", "paused"]),
    serviceRole
      .from("student_activities")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .in("status", ["draft", "active", "paused"]),
  ]);
  return {
    classes: classes.count ?? 0,
    students: students.count ?? 0,
    activities: (classroom.count ?? 0) + (individual.count ?? 0),
  };
}

async function main() {
  const serviceRole = createClient(
    requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL"),
    requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );

  const managerEmail = process.env.SCHOOL_QA_MANAGER_EMAIL || "school@leo.com";
  const managerPassword = process.env.SCHOOL_QA_MANAGER_PASSWORD || requireEnv("SCHOOL_QA_MANAGER_PASSWORD");
  const teacherEmail = process.env.SCHOOL_QA_TEACHER_EMAIL || "qamath@leo.com";
  const teacherPassword = process.env.SCHOOL_QA_TEACHER_PASSWORD || requireEnv("SCHOOL_QA_TEACHER_PASSWORD");

  const { data: memberships } = await serviceRole
    .from("school_teacher_memberships")
    .select("teacher_id, role")
    .eq("school_id", SCHOOL_ID);

  console.log("\n=== Per-teacher DB counts ===");
  for (const m of memberships || []) {
    if (m.role !== "teacher") continue;
    const c = await teacherCounts(serviceRole, m.teacher_id);
    console.log(`teacher ${m.teacher_id}: classes=${c.classes} studentLinks=${c.students} activities=${c.activities}`);
  }

  let managerToken;
  try {
    managerToken = await signInAs(managerEmail, managerPassword);
  } catch (e) {
    console.log("\nSkip live API compare (manager login failed):", e.message);
    return;
  }

  const dash = await apiGet(managerToken, "/api/school/dashboard");
  const teachers = await apiGet(managerToken, "/api/school/teachers");
  const classes = await apiGet(managerToken, "/api/school/classes");
  const students = await apiGet(managerToken, "/api/school/students");
  const activities = await apiGet(managerToken, "/api/school/activities?limit=50");

  console.log("\n=== School manager API ===");
  console.log("dashboard status", dash.status, "stats", dash.body?.data?.stats);
  console.log("teachers", teachers.status, "count", teachers.body?.data?.teachers?.length);
  console.log("classes", classes.status, "count", classes.body?.data?.classes?.length);
  console.log("students", students.status, "count", students.body?.data?.students?.length);
  console.log("activities", activities.status, "count", activities.body?.data?.activities?.length);

  console.log("\n| Metric | School API |");
  console.log("|--------|------------|");
  const s = dash.body?.data?.stats || {};
  console.log(`| Teachers (role=teacher) | ${s.teacherCount} |`);
  console.log(`| Students (visible union) | ${s.studentCount ?? s.enrolledStudentCount} |`);
  console.log(`| Enrolled only | ${s.enrolledStudentCount} |`);
  console.log(`| Classes | ${s.activeClassCount} |`);
  console.log(`| Activities | ${s.activeActivityCount} |`);
}

main().catch((e) => {
  console.error("compare-teacher-vs-school-apis: FAIL", e.message || e);
  process.exit(1);
});
