#!/usr/bin/env node
/**
 * Live DB truth audit for school portal vs teacher data.
 * node --env-file=.env.local scripts/school-portal/audit-school-data-truth.mjs [schoolId]
 */
import { createClient } from "@supabase/supabase-js";

const SCHOOL_ID =
  process.argv[2] || process.env.SCHOOL_QA_SCHOOL_ID || "9645e06d-0a0c-4d55-b1a3-74b43c3c18d5";

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function main() {
  const admin = createClient(requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL"), requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  const { data: school } = await admin.from("school_accounts").select("*").eq("id", SCHOOL_ID).maybeSingle();
  console.log("\n=== school_accounts ===");
  console.log(school || "NOT FOUND");

  const { data: memberships } = await admin
    .from("school_teacher_memberships")
    .select("id, teacher_id, role, joined_at")
    .eq("school_id", SCHOOL_ID);

  console.log("\n=== school_teacher_memberships ===", memberships?.length ?? 0);
  for (const m of memberships || []) {
    const { data: p } = await admin.from("teacher_profiles").select("display_name, school_id").eq("id", m.teacher_id).maybeSingle();
    console.log(`  ${m.role} ${m.teacher_id} profile.school_id=${p?.school_id ?? "null"} name=${p?.display_name}`);
  }

  const teacherIds = (memberships || []).map((m) => m.teacher_id);

  const { data: subjects } = await admin
    .from("school_teacher_subjects")
    .select("teacher_id, subject")
    .eq("school_id", SCHOOL_ID);
  console.log("\n=== school_teacher_subjects ===", subjects?.length ?? 0);

  const { data: enrollments } = await admin
    .from("school_student_enrollments")
    .select("student_id")
    .eq("school_id", SCHOOL_ID)
    .is("unenrolled_at", null);
  console.log("\n=== school_student_enrollments ===", enrollments?.length ?? 0);

  const { data: classesBySchoolId } = await admin
    .from("teacher_classes")
    .select("id, teacher_id, name, school_id, is_archived")
    .eq("school_id", SCHOOL_ID);
  console.log("\n=== teacher_classes WHERE school_id = school ===", classesBySchoolId?.length ?? 0);

  let classesByTeacher = [];
  if (teacherIds.length) {
    const { data } = await admin
      .from("teacher_classes")
      .select("id, teacher_id, name, school_id, is_archived")
      .in("teacher_id", teacherIds)
      .eq("is_archived", false)
      .is("archived_at", null);
    classesByTeacher = data || [];
  }
  console.log("=== teacher_classes for school teachers (any school_id) ===", classesByTeacher.length);
  const missingSchoolIdOnClass = classesByTeacher.filter((c) => !c.school_id);
  console.log("  classes missing school_id on row:", missingSchoolIdOnClass.length);

  const classIds = classesByTeacher.map((c) => c.id);
  let classStudentCount = 0;
  if (classIds.length) {
    const { count } = await admin
      .from("teacher_class_students")
      .select("id", { count: "exact", head: true })
      .in("class_id", classIds)
      .is("removed_at", null);
    classStudentCount = count ?? 0;
  }
  console.log("=== teacher_class_students in those classes ===", classStudentCount);

  let directLinks = 0;
  if (teacherIds.length) {
    const { count } = await admin
      .from("teacher_students")
      .select("id", { count: "exact", head: true })
      .in("teacher_id", teacherIds)
      .is("archived_at", null);
    directLinks = count ?? 0;
  }
  console.log("=== teacher_students for school teachers ===", directLinks);

  const { data: actBySchool } = await admin
    .from("classroom_activities")
    .select("id, teacher_id, school_id, status, title")
    .eq("school_id", SCHOOL_ID);
  console.log("\n=== classroom_activities WHERE school_id ===", actBySchool?.length ?? 0);

  let actByTeacher = [];
  if (teacherIds.length) {
    const { data } = await admin.from("classroom_activities").select("id, teacher_id, school_id, status").in("teacher_id", teacherIds);
    actByTeacher = data || [];
  }
  console.log("=== classroom_activities for school teachers ===", actByTeacher.length);
  console.log("  missing school_id on activity:", actByTeacher.filter((a) => !a.school_id).length);

  let indivByTeacher = [];
  if (teacherIds.length) {
    const { data } = await admin.from("student_activities").select("id, teacher_id, school_id").in("teacher_id", teacherIds);
    indivByTeacher = data || [];
  }
  console.log("=== student_activities for school teachers ===", indivByTeacher.length);

  console.log("\n=== API-style counts (current broken model) ===");
  console.log("dashboard teacherCount (all memberships):", memberships?.length ?? 0);
  console.log("dashboard teacherCount (role=teacher only):", (memberships || []).filter((m) => m.role === "teacher").length);
  console.log("dashboard enrolledStudentCount:", enrollments?.length ?? 0);
  console.log("dashboard activeClassCount (school_id col):", classesBySchoolId?.filter((c) => !c.is_archived).length ?? 0);
  console.log("dashboard activeClassCount (by teacher):", classesByTeacher.length);
}

main().catch((e) => {
  console.error("audit-school-data-truth: FAIL", e.message || e);
  process.exit(1);
});
