#!/usr/bin/env node
/**
 * Ensure teacher@leo.com has one real (non-smoke) class with QA students linked.
 * Uses Supabase service role — same pattern as teacher-classroom-sim bootstrap (not migration SQL).
 *
 *   node --env-file=.env.local scripts/teacher-portal/ensure-qa-teacher-class.mjs
 */
import { createAdminClient } from "./teacher-classroom-sim/bootstrap.mjs";
import { SIM_STUDENT_NAMES, SIM_TEACHER_EMAIL, parseConfig } from "./teacher-classroom-sim/config.mjs";
import { loadManifest } from "./teacher-classroom-sim/state.mjs";
import {
  CANONICAL_LEO_QA_CLASS_ID,
  isSmokeClassName,
  isSmokeStudentName,
} from "../../lib/teacher-portal/teacher-smoke-artifacts.js";
import { buildTeacherDashboardPayload } from "../../lib/teacher-server/teacher-dashboard.server.js";

export const QA_CLASS_NAME = "כיתה ג׳ - LEO";
const QA_GRADE_LEVEL = "g3";
const MAX_CLASS_MEMBERS = 20;

async function findAuthUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === email.toLowerCase());
    if (match?.id) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function ensureTeacherProfile(admin, teacherId) {
  const { data: profile } = await admin
    .from("teacher_profiles")
    .select("id")
    .eq("id", teacherId)
    .maybeSingle();
  if (!profile?.id) {
    throw new Error(
      `teacher_profiles missing for ${SIM_TEACHER_EMAIL} — run teacher-classroom-sim bootstrap first`
    );
  }
}

async function findOrCreateQaClass(admin, teacherId) {
  const { data: rows, error } = await admin
    .from("teacher_classes")
    .select("id, name, is_archived, archived_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`teacher_classes list failed: ${error.message}`);

  let target =
    (rows || []).find((r) => r.id === CANONICAL_LEO_QA_CLASS_ID) ||
    (rows || []).find((r) => r.name === QA_CLASS_NAME) ||
    (rows || []).find((r) => !isSmokeClassName(r.name) && !r.is_archived && !r.archived_at);

  if (target?.id) {
    if (target.is_archived || target.archived_at) {
      const { error: upErr } = await admin
        .from("teacher_classes")
        .update({ is_archived: false, archived_at: null })
        .eq("id", target.id);
      if (upErr) throw new Error(`unarchive class failed: ${upErr.message}`);
    }
    if (target.name !== QA_CLASS_NAME) {
      const { error: nameErr } = await admin
        .from("teacher_classes")
        .update({ name: QA_CLASS_NAME, grade_level: QA_GRADE_LEVEL })
        .eq("id", target.id);
      if (nameErr) throw new Error(`rename class failed: ${nameErr.message}`);
    }
    return { classId: target.id, created: false, name: QA_CLASS_NAME };
  }

  const { data, error: insErr } = await admin
    .from("teacher_classes")
    .insert({
      teacher_id: teacherId,
      name: QA_CLASS_NAME,
      grade_level: QA_GRADE_LEVEL,
      subject_focus: null,
      color_hint: "qa",
      is_archived: false,
    })
    .select("id, name")
    .single();

  if (insErr) throw new Error(`teacher_classes insert failed: ${insErr.message}`);
  return { classId: data.id, created: true, name: data.name };
}

async function listLinkableStudentIds(admin, teacherId) {
  const config = parseConfig([]);
  const manifest = loadManifest(config.stateDir);
  const preferredIds = new Set((manifest?.students || []).map((s) => s.id).filter(Boolean));
  const preferredNames = new Set(SIM_STUDENT_NAMES);

  const { data: links, error } = await admin
    .from("teacher_students")
    .select("student_id, students(id, full_name)")
    .eq("teacher_id", teacherId)
    .is("archived_at", null);

  if (error) throw new Error(`teacher_students list failed: ${error.message}`);

  const candidates = [];
  for (const row of links || []) {
    const student = row.students;
    const id = student?.id || row.student_id;
    const name = student?.full_name;
    if (!id || isSmokeStudentName(name)) continue;
    const score =
      (preferredIds.has(id) ? 4 : 0) +
      (preferredNames.has(name) ? 2 : 0) +
      (name && !String(name).includes("Smoke") ? 1 : 0);
    candidates.push({ id, name, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, MAX_CLASS_MEMBERS).map((c) => c.id);
}

async function ensureClassMember(admin, classId, studentId) {
  const { data } = await admin
    .from("teacher_class_students")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .is("removed_at", null)
    .maybeSingle();
  if (data?.id) return false;
  const { error } = await admin.from("teacher_class_students").insert({
    class_id: classId,
    student_id: studentId,
  });
  if (error && error.code !== "23505") {
    throw new Error(`teacher_class_students insert failed: ${error.message}`);
  }
  return true;
}

async function countClassMembers(admin, classId) {
  const { count, error } = await admin
    .from("teacher_class_students")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .is("removed_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function ensureQaTeacherClass(admin, options = {}) {
  const email = options.email || SIM_TEACHER_EMAIL;
  const user = await findAuthUserByEmail(admin, email);
  if (!user?.id) throw new Error(`Auth user not found: ${email}`);

  await ensureTeacherProfile(admin, user.id);
  const classInfo = await findOrCreateQaClass(admin, user.id);
  const studentIds = await listLinkableStudentIds(admin, user.id);

  let linked = 0;
  for (const studentId of studentIds) {
    if (await ensureClassMember(admin, classInfo.classId, studentId)) linked += 1;
  }

  const memberCount = await countClassMembers(admin, classInfo.classId);
  return {
    teacherId: user.id,
    email,
    classId: classInfo.classId,
    className: classInfo.name,
    classCreated: classInfo.created,
    studentsLinked: linked,
    memberCount,
  };
}

async function main() {
  const admin = createAdminClient();
  const result = await ensureQaTeacherClass(admin);

  const dash = await buildTeacherDashboardPayload({
    serviceRole: admin,
    teacherId: result.teacherId,
  });
  if (!dash.ok) throw new Error(`dashboard build failed: ${dash.code}`);

  const visible = dash.payload.classes || [];
  const classCount = dash.payload.summary?.classCount ?? 0;

  console.log("ensure-qa-teacher-class: OK");
  console.log(`  teacher: ${result.email}`);
  console.log(`  class: ${result.className} (${result.classId})`);
  console.log(`  created: ${result.classCreated}`);
  console.log(`  members in class: ${result.memberCount} (newly linked: ${result.studentsLinked})`);
  console.log(`  dashboard visible classes: ${visible.length} (summary.classCount=${classCount})`);

  if (classCount < 1 || visible.length < 1) {
    throw new Error("dashboard still shows 0 visible classes after provisioning");
  }
  if (!visible.some((c) => c.name === QA_CLASS_NAME)) {
    throw new Error(`dashboard missing QA class "${QA_CLASS_NAME}"`);
  }
  if (isSmokeClassName(QA_CLASS_NAME)) {
    throw new Error("QA_CLASS_NAME must not match smoke filter");
  }
}

main().catch((e) => {
  console.error("ensure-qa-teacher-class: FAIL", e.message || e);
  process.exit(1);
});
