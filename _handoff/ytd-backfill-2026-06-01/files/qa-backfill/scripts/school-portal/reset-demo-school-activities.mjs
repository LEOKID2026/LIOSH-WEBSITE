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

const IN_CHUNK_SIZE = 100;
const SELECT_PAGE_SIZE = 1000;

function parseMode(argv) {
  const idx = argv.indexOf("--mode");
  const mode = idx >= 0 ? argv[idx + 1] : "activities";
  if (!["activities", "full"].includes(mode)) throw new Error("Invalid --mode (activities|full)");
  return mode;
}

function chunkArray(arr, size = IN_CHUNK_SIZE) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function selectAllIdsPaginated(serviceRole, table, applyFilters) {
  const ids = [];
  for (let offset = 0; ; offset += SELECT_PAGE_SIZE) {
    let query = serviceRole.from(table).select("id");
    query = applyFilters(query);
    const { data, error } = await query.range(offset, offset + SELECT_PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data || [];
    for (const row of rows) ids.push(row.id);
    if (rows.length < SELECT_PAGE_SIZE) break;
  }
  return ids;
}

async function countInChunks(serviceRole, table, column, ids) {
  let total = 0;
  for (const chunk of chunkArray(ids)) {
    const { count, error } = await serviceRole
      .from(table)
      .select("id", { count: "exact", head: true })
      .in(column, chunk);
    if (error) throw error;
    total += count ?? 0;
  }
  return total;
}

async function deleteInChunks(serviceRole, table, column, ids) {
  for (const chunk of chunkArray(ids)) {
    const { error } = await serviceRole.from(table).delete().in(column, chunk);
    if (error) throw error;
  }
}

async function selectIdsInChunks(serviceRole, table, filterColumn, filterIds, valueColumn = "id") {
  const out = [];
  for (const chunk of chunkArray(filterIds)) {
    const { data, error } = await serviceRole.from(table).select(valueColumn).in(filterColumn, chunk);
    if (error) throw error;
    for (const row of data || []) out.push(row[valueColumn]);
  }
  return out;
}

async function collectDemoActivityIds(serviceRole, { schoolId, teacherIds }) {
  const activityFilters = [];
  if (schoolId) {
    const bySchool = await selectAllIdsPaginated(serviceRole, "classroom_activities", (q) =>
      q.eq("school_id", schoolId)
    );
    activityFilters.push(...bySchool);
  }
  if (teacherIds.length) {
    const byTeacher = await selectAllIdsPaginated(serviceRole, "classroom_activities", (q) =>
      q.in("teacher_id", teacherIds)
    );
    for (const id of byTeacher) {
      if (!activityFilters.includes(id)) activityFilters.push(id);
    }
  }
  return [...new Set(activityFilters)];
}

async function collectLearningSessionIds(serviceRole, studentIds) {
  return selectIdsInChunks(serviceRole, "learning_sessions", "student_id", studentIds, "id");
}

async function resetLearningSessionsAndAnswers(serviceRole, studentIds) {
  if (!studentIds.length) return { sessions: 0, answers: 0, sessionIds: [] };

  const sessionIds = await collectLearningSessionIds(serviceRole, studentIds);
  if (sessionIds.length > MAX_LEARNING_SESSIONS_RESET) {
    throw new Error(
      `reset safety: learning_sessions count ${sessionIds.length} exceeds cap ${MAX_LEARNING_SESSIONS_RESET}`
    );
  }

  let answersDeleted = 0;
  if (sessionIds.length) {
    const ansCount = await countInChunks(serviceRole, "answers", "learning_session_id", sessionIds);
    if (ansCount > MAX_ANSWERS_RESET) {
      throw new Error(`reset safety: answers count ${ansCount} exceeds cap ${MAX_ANSWERS_RESET}`);
    }
    await deleteInChunks(serviceRole, "answers", "learning_session_id", sessionIds);
    answersDeleted = ansCount;
  }

  await deleteInChunks(serviceRole, "learning_sessions", "student_id", studentIds);

  return { sessions: sessionIds.length, answers: answersDeleted, sessionIds };
}

async function resetActivities(serviceRole, state, { preResetPath = null } = {}) {
  const schoolId = state.schoolId;
  const teacherIds = Object.values(state.teacherIds || {});

  const activityIds = await collectDemoActivityIds(serviceRole, { schoolId, teacherIds });
  const now = new Date().toISOString();

  if (activityIds.length) {
    await deleteInChunks(serviceRole, "classroom_activity_attempts", "activity_id", activityIds);
    await deleteInChunks(serviceRole, "classroom_activity_student_status", "activity_id", activityIds);
    await deleteInChunks(serviceRole, "classroom_activities", "id", activityIds);
  }

  if (teacherIds.length) {
    const saIds = await selectAllIdsPaginated(serviceRole, "student_activities", (q) =>
      q.in("teacher_id", teacherIds)
    );
    if (saIds.length) {
      for (const chunk of chunkArray(saIds)) {
        const { error: updErr } = await serviceRole
          .from("student_activities")
          .update({ status: "archived", archived_at: now })
          .in("id", chunk);
        if (updErr) throw updErr;
      }
      await deleteInChunks(serviceRole, "student_activity_attempts", "activity_id", saIds);
      await deleteInChunks(serviceRole, "student_activity_status", "activity_id", saIds);
    }
  }

  const studentIds = state.studentIds || [];
  const preReset = {
    classroom_activities: activityIds.length,
    learning_sessions: 0,
    answers: 0,
  };
  if (studentIds.length) {
    preReset.learning_sessions = await countInChunks(
      serviceRole,
      "learning_sessions",
      "student_id",
      studentIds
    );
    const sessionIds = await collectLearningSessionIds(serviceRole, studentIds);
    if (sessionIds.length) {
      preReset.answers = await countInChunks(serviceRole, "answers", "learning_session_id", sessionIds);
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
    await deleteInChunks(serviceRole, "teacher_class_students", "class_id", classIds);
  }
  if (schoolId && studentIds.length) {
    for (const chunk of chunkArray(studentIds)) {
      const { error } = await serviceRole
        .from("school_student_enrollments")
        .delete()
        .eq("school_id", schoolId)
        .in("student_id", chunk);
      if (error) throw error;
    }
  }
  if (studentIds.length) {
    await deleteInChunks(serviceRole, "student_access_codes", "student_id", studentIds);
    for (const chunk of chunkArray(studentIds)) {
      const { error } = await serviceRole
        .from("students")
        .delete()
        .in("id", chunk)
        .eq("parent_id", parentId);
      if (error) throw error;
    }
  }
  if (classIds.length) {
    await deleteInChunks(serviceRole, "teacher_classes", "id", classIds);
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
