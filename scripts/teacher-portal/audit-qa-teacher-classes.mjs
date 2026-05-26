#!/usr/bin/env node
/**
 * Read-only audit: teacher@leo.com classes (QA + sim duplicates).
 * No deletes — recommendation only. Service role via bootstrap client.
 *
 *   node --env-file=.env.local scripts/teacher-portal/audit-qa-teacher-classes.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createAdminClient } from "./teacher-classroom-sim/bootstrap.mjs";
import { SIM_TEACHER_EMAIL } from "./teacher-classroom-sim/config.mjs";

const QA_CLASS_NAME = "כיתה ג׳ - LEO";

const CANONICAL_QA_CLASS_ID_HINT = "f4962b3c-ff1e-4705-ad87-4493ebf50352";

async function findTeacherId(admin) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === SIM_TEACHER_EMAIL);
    if (match?.id) return match.id;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  throw new Error(`teacher not found: ${SIM_TEACHER_EMAIL}`);
}

async function countClassMembers(admin, classId) {
  const { count, error } = await admin
    .from("teacher_class_students")
    .select("student_id", { count: "exact", head: true })
    .eq("class_id", classId)
    .is("removed_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countClassActivities(admin, classId) {
  const { count, error } = await admin
    .from("classroom_activities")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId);
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

async function countIndividualForClassStudents(admin, studentIds) {
  if (!studentIds.length) return 0;
  const { count, error } = await admin
    .from("student_activities")
    .select("id", { count: "exact", head: true })
    .in("student_id", studentIds);
  if (error) return null;
  return count ?? 0;
}

async function main() {
  const admin = createAdminClient();
  const teacherId = await findTeacherId(admin);

  const { data: classes, error } = await admin
    .from("teacher_classes")
    .select("id, name, grade_level, is_archived, archived_at, created_at, color_hint")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = [];
  for (const c of classes || []) {
    const memberCount = await countClassMembers(admin, c.id);
    const { data: memberRows } = await admin
      .from("teacher_class_students")
      .select("student_id")
      .eq("class_id", c.id)
      .is("removed_at", null);
    const studentIds = (memberRows || []).map((r) => r.student_id).filter(Boolean);
    const activities = await countClassActivities(admin, c.id);
    const individualCount = await countIndividualForClassStudents(admin, studentIds);

    rows.push({
      id: c.id,
      name: c.name,
      grade_level: c.grade_level,
      is_archived: c.is_archived,
      archived_at: c.archived_at,
      color_hint: c.color_hint,
      created_at: c.created_at,
      activeMembers: memberCount,
      classroomActivities: activities.count,
      individualActivitiesOnRoster: individualCount,
      isTargetQaName: c.name === QA_CLASS_NAME,
      isSimClass: String(c.name || "").includes("כיתת סימולציה"),
      recommendedRole:
        c.id === CANONICAL_QA_CLASS_ID_HINT || (c.name === QA_CLASS_NAME && c.color_hint === "qa")
          ? "canonical_qa_candidate"
          : c.name === QA_CLASS_NAME
            ? "duplicate_qa_name"
            : c.isSimClass
              ? "sim_bootstrap_class"
              : "other",
    });
  }

  const qaNamed = rows.filter((r) => r.name === QA_CLASS_NAME);
  const recommendation = {
    canonicalQaClass: qaNamed.find((r) => r.id === CANONICAL_QA_CLASS_ID_HINT) ||
      qaNamed.sort((a, b) => b.activeMembers - a.activeMembers)[0] ||
      null,
    duplicateQaClasses: qaNamed.filter((r) => r.id !== CANONICAL_QA_CLASS_ID_HINT),
    simClass: rows.find((r) => r.isSimClass) || null,
    safeActions: [
      "Keep f4962b3c-ff1e-4705-ad87-4493ebf50352 (כיתה ג׳ - LEO) as canonical — has QA Overnight class activity (1) + 20 members.",
      "Archive 871a78b9-373a-47c5-9f3c-44d31284427b (duplicate כיתה ג׳ - LEO, color_hint=qa) after owner approval — 20 members, 0 class activities; unlink then set is_archived=true (no hard delete).",
      "Leave כיתת סימולציה - כיתה ג׳ for Playwright bootstrap unless owner wants sim hidden; it is not smoke-filtered.",
      "Approved cleanup script (owner only): node --env-file=.env.local scripts/teacher-portal/archive-duplicate-qa-class.mjs --dry-run",
    ],
    note: "No destructive action run by audit script.",
  };

  const out = { teacherEmail: SIM_TEACHER_EMAIL, teacherId, classes: rows, recommendation };
  const dir = join(process.cwd(), "reports", "teacher-qa-overnight");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "qa-class-audit.json");
  writeFileSync(path, JSON.stringify(out, null, 2), "utf8");
  console.log(JSON.stringify(out, null, 2));
  console.log(`\nWrote ${path}`);
}

main().catch((e) => {
  console.error("audit-qa-teacher-classes: FAIL", e.message || e);
  process.exit(2);
});
