#!/usr/bin/env node
/**
 * Reset demo school activities or full demo data.
 *
 *   node --env-file=.env.local scripts/school-portal/reset-demo-school-activities.mjs --mode=activities
 *   node --env-file=.env.local scripts/school-portal/reset-demo-school-activities.mjs --mode=full
 */
import { createServiceRole, loadSimState, mergeSimState, saveSimState } from "./demo-school-lib.mjs";

function parseMode(argv) {
  const idx = argv.indexOf("--mode");
  const mode = idx >= 0 ? argv[idx + 1] : "activities";
  if (!["activities", "full"].includes(mode)) throw new Error("Invalid --mode (activities|full)");
  return mode;
}

async function resetActivities(serviceRole, state) {
  const schoolId = state.schoolId;
  const classIds = Object.values(state.classIds || {});
  const teacherIds = Object.values(state.teacherIds || {});

  const activityFilters = [];
  if (schoolId) {
    const { data: bySchool } = await serviceRole
      .from("classroom_activities")
      .select("id")
      .eq("school_id", schoolId);
    activityFilters.push(...(bySchool || []).map((r) => r.id));
  }
  if (teacherIds.length) {
    const { data: byTeacher } = await serviceRole
      .from("classroom_activities")
      .select("id")
      .in("teacher_id", teacherIds);
    for (const row of byTeacher || []) {
      if (!activityFilters.includes(row.id)) activityFilters.push(row.id);
    }
  }

  const activityIds = [...new Set(activityFilters)];
  const now = new Date().toISOString();

  if (activityIds.length) {
    await serviceRole.from("classroom_activity_attempts").delete().in("activity_id", activityIds);
    await serviceRole.from("classroom_activity_student_status").delete().in("activity_id", activityIds);
    await serviceRole.from("classroom_activities").delete().in("id", activityIds);
  }

  if (teacherIds.length) {
    const { data: studentActs } = await serviceRole
      .from("student_activities")
      .select("id")
      .in("teacher_id", teacherIds);
    const saIds = (studentActs || []).map((r) => r.id);
    if (saIds.length) {
      await serviceRole
        .from("student_activities")
        .update({ status: "archived", archived_at: now })
        .in("id", saIds);
      await serviceRole.from("student_activity_attempts").delete().in("activity_id", saIds);
      await serviceRole.from("student_activity_status").delete().in("activity_id", saIds);
    }
  }

  mergeSimState({ currentSchoolDay: 0, lastRunAt: null });
  console.log(JSON.stringify({ mode: "activities", deletedActivities: activityIds.length }, null, 2));
}

async function resetFull(serviceRole, state) {
  await resetActivities(serviceRole, state);

  const schoolId = state.schoolId;
  const parentId = state.demoParentId;
  const classIds = Object.values(state.classIds || {});
  const studentIds = state.studentIds || [];

  if (classIds.length) {
    await serviceRole.from("teacher_class_students").delete().in("class_id", classIds);
  }
  if (schoolId && studentIds.length) {
    await serviceRole
      .from("school_student_enrollments")
      .delete()
      .eq("school_id", schoolId)
      .in("student_id", studentIds);
  }
  if (studentIds.length) {
    await serviceRole.from("student_access_codes").delete().in("student_id", studentIds);
    await serviceRole.from("students").delete().in("id", studentIds).eq("parent_id", parentId);
  }
  if (classIds.length) {
    await serviceRole.from("teacher_classes").delete().in("id", classIds).eq("school_id", schoolId);
  }
  if (schoolId) {
    await serviceRole.from("school_teacher_subjects").delete().eq("school_id", schoolId);
    await serviceRole.from("school_teacher_memberships").delete().eq("school_id", schoolId);
  }

  console.log(JSON.stringify({ mode: "full", schoolId, studentsRemoved: studentIds.length }, null, 2));
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const state = loadSimState();
  const serviceRole = createServiceRole();

  if (!state.schoolId) {
    throw new Error("sim-state.json missing schoolId");
  }

  if (mode === "activities") await resetActivities(serviceRole, state);
  else await resetFull(serviceRole, state);
}

main().catch((e) => {
  console.error("reset-demo-school-activities: FAIL", e.message || e);
  process.exit(1);
});
