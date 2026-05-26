#!/usr/bin/env node
/**
 * Verify school aggregation matches teacher-linked data (no HTTP).
 */
import { createClient } from "@supabase/supabase-js";
import { buildSchoolDashboardStats } from "../../lib/school-server/school-session.server.js";
import { listSchoolClasses } from "../../lib/school-server/school-classes.server.js";
import { listSchoolEnrolledStudents } from "../../lib/school-server/school-students.server.js";
import { listSchoolTeachers } from "../../lib/school-server/school-teachers.server.js";
import { listSchoolActivities } from "../../lib/school-server/school-reports.server.js";

const SCHOOL_ID = process.argv[2] || "9645e06d-0a0c-4d55-b1a3-74b43c3c18d5";

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function main() {
  const serviceRole = createClient(
    requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL"),
    requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );

  const [stats, teachers, classes, students, activities] = await Promise.all([
    buildSchoolDashboardStats(serviceRole, SCHOOL_ID),
    listSchoolTeachers(serviceRole, SCHOOL_ID),
    listSchoolClasses(serviceRole, SCHOOL_ID, { isArchived: false }),
    listSchoolEnrolledStudents(serviceRole, SCHOOL_ID),
    listSchoolActivities(serviceRole, SCHOOL_ID, { limit: 100 }),
  ]);

  for (const [name, r] of [
    ["stats", stats],
    ["teachers", teachers],
    ["classes", classes],
    ["students", students],
    ["activities", activities],
  ]) {
    if (!r.ok) throw new Error(`${name}: ${r.code}`);
  }

  const teachingTeachers = teachers.teachers.filter((t) => t.role === "teacher");
  const classSum = teachingTeachers.reduce((n, t) => n + (t.activeClassCount || 0), 0);

  console.log("stats", stats.stats);
  console.log("teachers listed", teachers.teachers.length, "role=teacher", teachingTeachers.length);
  console.log("classes listed", classes.classes.length);
  console.log("students listed", students.students.length, "enrolled flag", students.students.filter((s) => s.isEnrolled).length);
  console.log("activities listed", activities.activities.length);

  const checks = [
    ["teacherCount matches role=teacher", stats.stats.teacherCount === teachingTeachers.length],
    ["studentCount >= enrolledStudentCount", stats.stats.studentCount >= stats.stats.enrolledStudentCount],
    ["classes list matches activeClassCount", classes.classes.length === stats.stats.activeClassCount],
    ["students list matches studentCount", students.students.length === stats.stats.studentCount],
  ];

  let failed = 0;
  for (const [label, ok] of checks) {
    console.log(ok ? "PASS" : "FAIL", label);
    if (!ok) failed++;
  }

  if (failed) process.exit(1);
  console.log("\nverify-school-aggregation: ALL PASS");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
