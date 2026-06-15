#!/usr/bin/env node
/**
 * Restore demo school to exact seed baseline (108 / 398 / 2388).
 *
 *   node --env-file=.env.local scripts/school-portal/restore-demo-school-baseline.mjs
 */
import { SUBJECTS, classRecordKey } from "./demo-school-data.mjs";
import {
  assertDemoSchoolBaseline,
  createServiceRole,
  loadSimState,
} from "./demo-school-lib.mjs";
import { bootstrapSchoolDbWriteGuard } from "./lib/school-db-write-guard.mjs";

async function rebuildClassStudentLinks(serviceRole, state) {
  const classIds = Object.values(state.classIds || {});
  if (!classIds.length) throw new Error("sim-state missing classIds");

  await serviceRole.from("teacher_class_students").delete().in("class_id", classIds);

  const rows = [];
  for (const [key, bucket] of Object.entries(state.studentsByPhysical || {})) {
    const [gradeStr, sectionStr] = key.split(":");
    const grade = Number(gradeStr);
    const section = Number(sectionStr);
    for (const subject of SUBJECTS) {
      const classId = state.classIds[classRecordKey(grade, section, subject)];
      if (!classId) {
        throw new Error(`missing classId for ${key} ${subject}`);
      }
      for (const studentId of bucket.studentIds || []) {
        rows.push({ class_id: classId, student_id: studentId });
      }
    }
  }

  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    const { error } = await serviceRole.from("teacher_class_students").insert(chunk);
    if (error) throw new Error(`teacher_class_students insert: ${error.message}`);
  }

  return rows.length;
}

async function restoreEnrollments(serviceRole, state) {
  const schoolId = state.schoolId;
  const studentIds = state.studentIds || [];
  const managerId = state.teacherIds?.manager;
  if (!schoolId || !managerId) throw new Error("sim-state missing schoolId or manager");

  const { data: existing } = await serviceRole
    .from("school_student_enrollments")
    .select("id, student_id")
    .eq("school_id", schoolId);

  const allowed = new Set(studentIds);
  const toRemove = (existing || []).filter((r) => !allowed.has(r.student_id)).map((r) => r.id);
  if (toRemove.length) {
    await serviceRole.from("school_student_enrollments").delete().in("id", toRemove);
  }

  const enrolled = new Set((existing || []).filter((r) => allowed.has(r.student_id)).map((r) => r.student_id));
  const missing = studentIds.filter((id) => !enrolled.has(id));
  if (missing.length) {
    const { error } = await serviceRole.from("school_student_enrollments").insert(
      missing.map((studentId) => ({
        school_id: schoolId,
        student_id: studentId,
        enrolled_by: managerId,
      }))
    );
    if (error) throw new Error(`enrollment insert: ${error.message}`);
  }
}

async function restoreClasses(serviceRole, state) {
  const schoolId = state.schoolId;
  const classIdSet = new Set(Object.values(state.classIds || {}));
  const teacherIds = Object.values(state.teacherIds || {});

  if (teacherIds.length) {
    const { data: allTeacherClasses } = await serviceRole
      .from("teacher_classes")
      .select("id")
      .in("teacher_id", teacherIds);
    const strayIds = (allTeacherClasses || [])
      .map((r) => r.id)
      .filter((id) => !classIdSet.has(id));
    if (strayIds.length) {
      await serviceRole.from("teacher_class_students").delete().in("class_id", strayIds);
      await serviceRole.from("teacher_classes").delete().in("id", strayIds);
    }

    await serviceRole.from("teacher_students").delete().in("teacher_id", teacherIds);
  }

  const { data: atSchool } = await serviceRole.from("teacher_classes").select("id").eq("school_id", schoolId);
  const extras = (atSchool || []).filter((r) => !classIdSet.has(r.id)).map((r) => r.id);
  if (extras.length) {
    await serviceRole.from("teacher_class_students").delete().in("class_id", extras);
    await serviceRole.from("teacher_classes").delete().in("id", extras);
  }

  const { error } = await serviceRole
    .from("teacher_classes")
    .update({ is_archived: false, archived_at: null })
    .in("id", [...classIdSet]);
  if (error) throw new Error(`unarchive classes: ${error.message}`);
}

async function restoreManagerIsolation(serviceRole, state) {
  const schoolId = state.schoolId;
  const managerId = state.teacherIds?.manager;
  if (!managerId) throw new Error("sim-state missing manager");

  await serviceRole
    .from("school_teacher_memberships")
    .delete()
    .eq("teacher_id", managerId)
    .neq("school_id", schoolId);

  const { error: upErr } = await serviceRole.from("school_teacher_memberships").upsert(
    {
      school_id: schoolId,
      teacher_id: managerId,
      role: "school_admin",
    },
    { onConflict: "school_id,teacher_id" }
  );
  if (upErr) throw new Error(`manager membership: ${upErr.message}`);

  await serviceRole.from("teacher_profiles").update({ school_id: schoolId }).eq("id", managerId);
}

async function main() {
  const argv = process.argv.slice(2);
  const guard = bootstrapSchoolDbWriteGuard(
    "school-portal/restore-demo-school-baseline",
    "RESTORE_DEMO_SCHOOL_BASELINE",
    argv
  );
  if (guard.isDryRun) {
    console.log("[production-guard] dry-run: no DB mutations (pass --write)");
    guard.printEndSummary();
    return;
  }
  const state = loadSimState();
  const serviceRole = createServiceRole();

  await restoreManagerIsolation(serviceRole, state);
  await restoreClasses(serviceRole, state);
  await restoreEnrollments(serviceRole, state);
  const links = await rebuildClassStudentLinks(serviceRole, state);

  const baseline = await assertDemoSchoolBaseline(serviceRole, state, { strict: true });
  console.log(
    JSON.stringify(
      {
        ok: true,
        schoolId: state.schoolId,
        rebuiltLinks: links,
        baseline,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("restore-demo-school-baseline: FAIL", e.message || e);
  process.exit(1);
});
