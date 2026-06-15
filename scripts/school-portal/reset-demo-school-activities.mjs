#!/usr/bin/env node
/**
 * Reset demo school activities or full demo data.
 *
 *   node --env-file=.env.local scripts/school-portal/reset-demo-school-activities.mjs --mode=activities
 *   node --env-file=.env.local scripts/school-portal/reset-demo-school-activities.mjs --mode=full
 */
import {
  assertDemoSchoolBaseline,
  createServiceRole,
  loadSimState,
  mergeSimState,
} from "./demo-school-lib.mjs";
import { MAX_ANSWERS_RESET, MAX_LEARNING_SESSIONS_RESET } from "./sim/school-sim-config.mjs";
import { bootstrapSchoolDbWriteGuard } from "./lib/school-db-write-guard.mjs";

function parseMode(argv) {
  const idx = argv.indexOf("--mode");
  const mode = idx >= 0 ? argv[idx + 1] : "activities";
  if (!["activities", "full"].includes(mode)) throw new Error("Invalid --mode (activities|full)");
  return mode;
}

async function resetLearningSessionsAndAnswers(serviceRole, studentIds) {
  if (!studentIds.length) return { sessions: 0, answers: 0, sessionIds: [] };

  const { data: sessions, error: sessErr } = await serviceRole
    .from("learning_sessions")
    .select("id")
    .in("student_id", studentIds);
  if (sessErr) throw sessErr;

  const sessionIds = (sessions || []).map((r) => r.id);
  if (sessionIds.length > MAX_LEARNING_SESSIONS_RESET) {
    throw new Error(
      `reset safety: learning_sessions count ${sessionIds.length} exceeds cap ${MAX_LEARNING_SESSIONS_RESET}`
    );
  }

  let answersDeleted = 0;
  if (sessionIds.length) {
    const { count: ansCount, error: ansCountErr } = await serviceRole
      .from("answers")
      .select("id", { count: "exact", head: true })
      .in("learning_session_id", sessionIds);
    if (ansCountErr) throw ansCountErr;
    if ((ansCount ?? 0) > MAX_ANSWERS_RESET) {
      throw new Error(`reset safety: answers count ${ansCount} exceeds cap ${MAX_ANSWERS_RESET}`);
    }

    const { error: delAnsErr } = await serviceRole
      .from("answers")
      .delete()
      .in("learning_session_id", sessionIds);
    if (delAnsErr) throw delAnsErr;
    answersDeleted = ansCount ?? 0;
  }

  const { error: delSessErr } = await serviceRole
    .from("learning_sessions")
    .delete()
    .in("student_id", studentIds);
  if (delSessErr) throw delSessErr;

  return { sessions: sessionIds.length, answers: answersDeleted, sessionIds };
}

async function resetActivities(serviceRole, state, { preResetPath = null } = {}) {
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

  const studentIds = state.studentIds || [];
  const preReset = {
    classroom_activities: activityIds.length,
    learning_sessions: 0,
    answers: 0,
  };
  if (studentIds.length) {
    const { count: lsCount } = await serviceRole
      .from("learning_sessions")
      .select("id", { count: "exact", head: true })
      .in("student_id", studentIds);
    preReset.learning_sessions = lsCount ?? 0;
    const { data: sessRows } = await serviceRole
      .from("learning_sessions")
      .select("id")
      .in("student_id", studentIds);
    const sessionIds = (sessRows || []).map((r) => r.id);
    if (sessionIds.length) {
      const { count: ansCount } = await serviceRole
        .from("answers")
        .select("id", { count: "exact", head: true })
        .in("learning_session_id", sessionIds);
      preReset.answers = ansCount ?? 0;
    }
  }

  if (preResetPath) {
    const fs = await import("node:fs");
    const path = await import("node:path");
    fs.mkdirSync(path.dirname(preResetPath), { recursive: true });
    fs.writeFileSync(preResetPath, `${JSON.stringify(preReset, null, 2)}\n`, "utf8");
  }

  const learningReset = await resetLearningSessionsAndAnswers(serviceRole, studentIds);

  mergeSimState({ currentSchoolDay: 0, lastRunAt: null });
  console.log(
    JSON.stringify(
      {
        mode: "activities",
        deletedActivities: activityIds.length,
        deletedLearningSessions: learningReset.sessions,
        deletedAnswers: learningReset.answers,
        preReset,
      },
      null,
      2
    )
  );
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

function parsePreResetPath(argv) {
  const idx = argv.indexOf("--pre-reset-out");
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return null;
}

async function main() {
  const argv = process.argv.slice(2);
  const guard = bootstrapSchoolDbWriteGuard(
    "school-portal/reset-demo-school-activities",
    "RESET_DEMO_SCHOOL_ACTIVITIES",
    argv
  );
  if (guard.isDryRun) {
    console.log("[production-guard] dry-run: no DB mutations (pass --write)");
    guard.printEndSummary();
    return;
  }
  const mode = parseMode(argv);
  const preResetPath = parsePreResetPath(argv);
  const state = loadSimState();
  const serviceRole = createServiceRole();

  if (!state.schoolId) {
    throw new Error("sim-state.json missing schoolId");
  }

  await assertDemoSchoolBaseline(serviceRole, state, { strict: true });

  if (mode === "activities") await resetActivities(serviceRole, state, { preResetPath });
  else await resetFull(serviceRole, state);
}

main().catch((e) => {
  console.error("reset-demo-school-activities: FAIL", e.message || e);
  process.exit(1);
});
