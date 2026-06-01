import { randomUUID } from "crypto";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { assertTeacherCanManageStudentAccess } from "./teacher-student-access.server.js";
import { teacherStudentDisplayName } from "./teacher-students.server.js";
import { isUuid } from "./teacher-request.server.js";
import {
  isActivityPreviewSubjectSupported,
  jsonSafeCloneForStorage,
  normalizeActivitySubject,
  normalizeDifficultyLevel,
  normalizeQuestionSelection,
  validateSameExactQuestionSet,
} from "../classroom-activities/classroom-activities-shared.server.js";
import { buildFrozenActivityInsertFields } from "../classroom-activities/assigned-activity-snapshot.server.js";
import { mapTeacherActivityStudentAnswerDetail } from "./teacher-activities.server.js";

const INDIVIDUAL_MODES = new Set(["guided_practice", "quiz", "homework", "discussion"]);
const ACTIVITY_STATUSES = new Set(["draft", "active", "closed", "archived"]);

/**
 * @param {Record<string, unknown>} row
 */
export function mapStudentActivityRow(row) {
  return {
    activityId: row.id,
    scope: "student",
    studentId: row.student_id,
    teacherId: row.teacher_id,
    title: row.title,
    subject: row.subject,
    topic: row.topic,
    subtopic: row.subtopic ?? null,
    skillKey: row.skill_key ?? null,
    difficultyLevel: row.difficulty_level ?? null,
    questionCount: row.question_count,
    mode: row.mode,
    questionSelection: row.question_selection,
    timeLimitSeconds: row.time_limit_seconds ?? null,
    dueAt: row.due_at ?? null,
    status: row.status,
    activatedAt: row.activated_at ?? null,
    closedAt: row.closed_at ?? null,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    snapshotStatus: row.snapshot_status ?? "legacy_missing",
    snapshotFrozenAt: row.snapshot_frozen_at ?? null,
  };
}

/**
 * @param {unknown} raw
 */
function normalizeIndividualActivityMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  return INDIVIDUAL_MODES.has(mode) ? mode : null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 */
export async function loadTeacherStudentActivityOwned(serviceRole, teacherId, activityId) {
  if (!isUuid(activityId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("student_activities")
    .select("*")
    .eq("id", activityId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data) {
    return { ok: false, status: 404, code: "activity_not_found" };
  }

  return { ok: true, row: data };
}

/**
 * @param {Record<string, unknown>} body
 */
export function parseCreateStudentActivityBody(body) {
  const title = String(body.title || "").trim();
  if (!title || title.length > 120) {
    return { ok: false, code: "validation_failed", message: "title required (1-120 chars)" };
  }

  // Accept either studentId (single) or studentIds (array, 1..50).
  let studentIds;
  if (Array.isArray(body.studentIds) && body.studentIds.length > 0) {
    if (body.studentIds.length > 50) {
      return { ok: false, code: "validation_failed", message: "studentIds cannot exceed 50 students" };
    }
    studentIds = body.studentIds.map((id) => String(id || "").trim());
    if (studentIds.some((id) => !isUuid(id))) {
      return { ok: false, code: "validation_failed", message: "all studentIds must be UUIDs" };
    }
    // Deduplicate
    studentIds = [...new Set(studentIds)];
  } else {
    const studentId = String(body.studentId || "").trim();
    if (!isUuid(studentId)) {
      return { ok: false, code: "validation_failed", message: "studentId must be a UUID" };
    }
    studentIds = [studentId];
  }

  const subject = normalizeActivitySubject(body.subject);
  if (!subject) {
    return { ok: false, code: "validation_failed", message: "invalid subject" };
  }

  if (!isActivityPreviewSubjectSupported(subject)) {
    return {
      ok: false,
      code: "subject_preview_not_supported",
      message: "subject not supported for activity preview",
    };
  }

  const topic = String(body.topic || "").trim();
  if (!topic || topic.length > 120) {
    return { ok: false, code: "validation_failed", message: "topic required (1-120 chars)" };
  }

  const mode = normalizeIndividualActivityMode(body.mode);
  if (!mode) {
    return {
      ok: false,
      code: "validation_failed",
      message: "invalid mode (guided_practice, quiz, homework, discussion)",
    };
  }

  const questionSelection = normalizeQuestionSelection(body.questionSelection);
  if (!questionSelection) {
    return { ok: false, code: "validation_failed", message: "invalid questionSelection" };
  }

  if (questionSelection === "controlled_variants") {
    return { ok: false, status: 501, code: "not_implemented", message: "controlled_variants is not enabled" };
  }

  const questionCount = Number(body.questionCount);
  if (!Number.isFinite(questionCount) || questionCount < 1 || questionCount > 50) {
    return { ok: false, code: "validation_failed", message: "questionCount must be 1-50" };
  }

  const questionSet = body.questionSet;
  const qValidation = validateSameExactQuestionSet(questionSet, questionCount);
  if (!qValidation.ok) {
    return { ok: false, code: qValidation.code, message: qValidation.message };
  }

  const subtopic = body.subtopic != null ? String(body.subtopic).trim().slice(0, 120) : null;
  const skillKey = body.skillKey != null ? String(body.skillKey).trim().slice(0, 120) : null;
  const difficultyLevel = normalizeDifficultyLevel(body.difficultyLevel);

  let timeLimitSeconds = null;
  if (body.timeLimitSeconds != null && body.timeLimitSeconds !== "") {
    const t = Number(body.timeLimitSeconds);
    if (!Number.isFinite(t) || t <= 0) {
      return { ok: false, code: "validation_failed", message: "timeLimitSeconds must be positive" };
    }
    timeLimitSeconds = Math.floor(t);
  }

  let dueAt = null;
  if (body.dueAt != null && body.dueAt !== "") {
    const d = new Date(body.dueAt);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, code: "validation_failed", message: "invalid dueAt" };
    }
    dueAt = d.toISOString();
  }

  if (mode === "quiz" && !timeLimitSeconds) {
    return { ok: false, code: "validation_failed", message: "quiz mode requires timeLimitSeconds" };
  }

  if (mode === "discussion" && Math.floor(questionCount) !== 1) {
    return {
      ok: false,
      code: "validation_failed",
      message: "discussion mode requires questionCount 1",
    };
  }

  return {
    ok: true,
    payload: {
      studentIds,
      title,
      subject,
      topic,
      subtopic: subtopic || null,
      skillKey: skillKey || null,
      difficultyLevel,
      questionCount: Math.floor(questionCount),
      mode,
      questionSelection,
      timeLimitSeconds,
      dueAt,
      questionSet,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {ReturnType<typeof parseCreateStudentActivityBody> & { ok: true }} parsed
 */
export async function createStudentActivity(serviceRole, teacherId, parsed) {
  const studentId = parsed.payload.studentIds[0];
  const linked = await assertTeacherCanManageStudentAccess(serviceRole, teacherId, studentId);
  if (!linked.ok) return linked;

  const { data, error } = await serviceRole
    .from("student_activities")
    .insert({
      teacher_id: teacherId,
      student_id: studentId,
      title: parsed.payload.title,
      subject: parsed.payload.subject,
      topic: parsed.payload.topic,
      subtopic: parsed.payload.subtopic,
      skill_key: parsed.payload.skillKey,
      difficulty_level: parsed.payload.difficultyLevel,
      question_count: parsed.payload.questionCount,
      mode: parsed.payload.mode,
      question_selection: parsed.payload.questionSelection,
      time_limit_seconds: parsed.payload.timeLimitSeconds,
      due_at: parsed.payload.dueAt,
      status: "draft",
      ...buildFrozenActivityInsertFields(parsed.payload.questionSet, {
        subject: parsed.payload.subject,
        topic: parsed.payload.topic,
        subtopic: parsed.payload.subtopic,
        difficultyLevel: parsed.payload.difficultyLevel,
        skillKey: parsed.payload.skillKey,
      }),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data?.id) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, activityId: data.id };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ studentId?: string, status?: string, includeArchived?: boolean }} filters
 */
export async function listTeacherStudentActivities(serviceRole, teacherId, filters = {}) {
  let query = serviceRole
    .from("student_activities")
    .select(
      "id, student_id, title, subject, topic, mode, question_count, status, question_selection, activated_at, closed_at, created_at, updated_at"
    )
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.studentId && isUuid(filters.studentId)) {
    query = query.eq("student_id", filters.studentId);
  }

  if (filters.status && ACTIVITY_STATUSES.has(filters.status)) {
    query = query.eq("status", filters.status);
  } else if (!filters.includeArchived) {
    query = query.neq("status", "archived");
  }

  const { data, error } = await query;
  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const activityIds = (data || []).map((r) => r.id);
  const statusByActivity = new Map();

  if (activityIds.length) {
    const { data: statusRows } = await serviceRole
      .from("student_activity_status")
      .select("activity_id, status, answers_count, correct_count, score_pct, submitted_at")
      .in("activity_id", activityIds);

    for (const row of statusRows || []) {
      statusByActivity.set(row.activity_id, row);
    }
  }

  const activities = (data || []).map((row) => {
    const st = statusByActivity.get(row.id);
    return {
      ...mapStudentActivityRow(row),
      studentStatus: st?.status || "not_started",
      answersCount: st?.answers_count ?? 0,
      correctCount: st?.correct_count ?? 0,
      scorePct: st?.score_pct != null ? Number(st.score_pct) : null,
      submittedAt: st?.submitted_at ?? null,
    };
  });

  return { ok: true, activities };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} activityId
 */
async function loadStudentActivityStatus(serviceRole, activityId) {
  const { data, error } = await serviceRole
    .from("student_activity_status")
    .select(
      "id, student_id, status, started_at, submitted_at, last_seen_at, answers_count, correct_count, score_pct, students!inner(full_name)"
    )
    .eq("activity_id", activityId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data) {
    return { ok: true, student: null };
  }

  const student = data.students;
  return {
    ok: true,
    student: {
      studentId: data.student_id,
      studentFullNameMasked: teacherStudentDisplayName(student?.full_name),
      status: data.status,
      startedAt: data.started_at,
      submittedAt: data.submitted_at,
      lastSeenAt: data.last_seen_at,
      answersCount: data.answers_count,
      correctCount: data.correct_count,
      scorePct: data.score_pct != null ? Number(data.score_pct) : null,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 */
export async function getTeacherStudentActivityDetail(serviceRole, teacherId, activityId) {
  const owned = await loadTeacherStudentActivityOwned(serviceRole, teacherId, activityId);
  if (!owned.ok) return owned;

  const statuses = await loadStudentActivityStatus(serviceRole, activityId);
  if (!statuses.ok) return statuses;

  const questionSet = Array.isArray(owned.row.question_set) ? owned.row.question_set : [];

  return {
    ok: true,
    activity: {
      ...mapStudentActivityRow(owned.row),
      questionSet,
    },
    student: statuses.student,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} activityId
 * @param {string} studentId
 */
async function seedStudentActivityStatusRow(serviceRole, activityId, studentId) {
  const { error } = await serviceRole.from("student_activity_status").upsert(
    {
      activity_id: activityId,
      student_id: studentId,
      status: "not_started",
    },
    { onConflict: "activity_id,student_id", ignoreDuplicates: true }
  );

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} activityId
 * @param {number} questionCount
 */
async function finalizeStudentActivityScores(serviceRole, activityId, questionCount) {
  const { data: rows } = await serviceRole
    .from("student_activity_status")
    .select("id, answers_count, correct_count, status")
    .eq("activity_id", activityId);

  for (const row of rows || []) {
    const scorePct =
      questionCount > 0
        ? Number(((Number(row.correct_count) / questionCount) * 100).toFixed(2))
        : 0;
    const patch = { score_pct: scorePct };
    if (row.status === "in_progress" && Number(row.answers_count) >= questionCount) {
      patch.status = "submitted";
      patch.submitted_at = new Date().toISOString();
    }
    await serviceRole.from("student_activity_status").update(patch).eq("id", row.id);
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 * @param {string} action
 */
export async function transitionStudentActivityStatus(serviceRole, teacherId, activityId, action) {
  const owned = await loadTeacherStudentActivityOwned(serviceRole, teacherId, activityId);
  if (!owned.ok) return owned;

  const row = owned.row;
  const now = new Date().toISOString();

  if (row.question_selection === "controlled_variants") {
    return { ok: false, status: 501, code: "not_implemented", message: "controlled_variants is not enabled" };
  }

  /** @type {Record<string, unknown>} */
  const patch = {};

  if (action === "activate") {
    if (row.status !== "draft") {
      return { ok: false, status: 409, code: "invalid_transition", message: "cannot activate from current status" };
    }
    const qSet = Array.isArray(row.question_set) ? row.question_set : [];
    const v = validateSameExactQuestionSet(qSet, row.question_count);
    if (!v.ok) {
      return { ok: false, status: 400, code: v.code, message: v.message };
    }
    const seed = await seedStudentActivityStatusRow(serviceRole, activityId, row.student_id);
    if (!seed.ok) return seed;

    patch.status = "active";
    patch.activated_at = row.activated_at || now;
  } else if (action === "close") {
    if (row.status !== "active") {
      return { ok: false, status: 409, code: "invalid_transition", message: "close only from active" };
    }
    patch.status = "closed";
    patch.closed_at = now;
    await finalizeStudentActivityScores(serviceRole, activityId, row.question_count);
  } else if (action === "archive") {
    if (row.status !== "closed") {
      return { ok: false, status: 409, code: "invalid_transition", message: "archive only from closed" };
    }
    patch.status = "archived";
    patch.archived_at = now;
  } else {
    return { ok: false, status: 400, code: "validation_failed", message: "unknown action" };
  }

  const { error } = await serviceRole
    .from("student_activities")
    .update(patch)
    .eq("id", activityId)
    .eq("teacher_id", teacherId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, status: patch.status };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 */
export async function deleteDraftStudentActivity(serviceRole, teacherId, activityId) {
  const owned = await loadTeacherStudentActivityOwned(serviceRole, teacherId, activityId);
  if (!owned.ok) return owned;

  if (owned.row.status !== "draft") {
    return { ok: false, status: 409, code: "activity_not_draft", message: "only draft activities can be deleted" };
  }

  const { error } = await serviceRole
    .from("student_activities")
    .delete()
    .eq("id", activityId)
    .eq("teacher_id", teacherId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 */
export async function buildStudentActivityReportPayload(serviceRole, teacherId, activityId) {
  const owned = await loadTeacherStudentActivityOwned(serviceRole, teacherId, activityId);
  if (!owned.ok) return owned;

  const { assertActivitySubjectAllowed } = await import(
    "../school-server/school-subjects.server.js"
  );
  const subjectGate = await assertActivitySubjectAllowed(
    serviceRole,
    teacherId,
    owned.row.subject,
    null
  );
  if (!subjectGate.ok) return subjectGate;

  if (owned.row.status !== "closed" && owned.row.status !== "archived") {
    return {
      ok: false,
      status: 409,
      code: "activity_not_closed",
      message: "report available when closed or archived",
    };
  }

  const statuses = await loadStudentActivityStatus(serviceRole, activityId);
  if (!statuses.ok) return statuses;

  const { data: attempts, error: attemptsErr } = await serviceRole
    .from("student_activity_attempts")
    .select(
      "question_index, question_key, selected_answer, correct_answer, is_correct, answered_at, question_snapshot, skill_key"
    )
    .eq("activity_id", activityId)
    .order("question_index", { ascending: true });

  if (attemptsErr) {
    if (isDbSchemaNotReadyError(attemptsErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const questionSet = Array.isArray(owned.row.question_set) ? owned.row.question_set : [];
  const questions = mapTeacherActivityStudentAnswerDetail({
    questionSet,
    attempts: attempts || [],
    questionCount: owned.row.question_count,
    snapshotStatus: owned.row.snapshot_status,
    subject: owned.row.subject,
    topic: owned.row.topic,
  });

  const st = statuses.student;
  const completionRate =
    st?.status === "submitted" || st?.status === "timed_out" ? 100 : st?.answersCount > 0 ? 50 : 0;

  return {
    ok: true,
    activity: mapStudentActivityRow(owned.row),
    student: st,
    questions,
    summary: {
      completionRate,
      answersCount: st?.answersCount ?? 0,
      correctCount: st?.correctCount ?? 0,
      scorePct: st?.scorePct ?? null,
    },
  };
}

/**
 * Create N student_activities rows sharing one batch_id (multi-student send).
 * All rows are auto-activated so status rows are seeded immediately.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {ReturnType<typeof parseCreateStudentActivityBody> & { ok: true }} parsed
 */
export async function createStudentActivityBatch(serviceRole, teacherId, parsed) {
  const { studentIds } = parsed.payload;

  for (const studentId of studentIds) {
    const linked = await assertTeacherCanManageStudentAccess(serviceRole, teacherId, studentId);
    if (!linked.ok) return linked;
  }

  // V1 same-grade rule: all selected students must share the same grade_level.
  // The question set is grade-specific; mixing grades in one batch is not allowed.
  if (studentIds.length > 1) {
    const { data: gradeRows, error: gradeErr } = await serviceRole
      .from("students")
      .select("id, grade_level")
      .in("id", studentIds);

    if (gradeErr) {
      if (isDbSchemaNotReadyError(gradeErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    const grades = new Set((gradeRows || []).map((r) => r.grade_level ?? ""));
    if (grades.size > 1) {
      return {
        ok: false,
        status: 400,
        code: "mixed_grade_levels",
        message:
          "All students in a batch must have the same grade_level. " +
          "The activity question set is grade-specific and cannot span multiple grades.",
      };
    }
  }

  const batchId = randomUUID();
  const now = new Date().toISOString();
  const frozenFields = buildFrozenActivityInsertFields(parsed.payload.questionSet, {
    subject: parsed.payload.subject,
    topic: parsed.payload.topic,
    subtopic: parsed.payload.subtopic,
    difficultyLevel: parsed.payload.difficultyLevel,
    skillKey: parsed.payload.skillKey,
  });

  const rows = studentIds.map((studentId) => ({
    teacher_id: teacherId,
    student_id: studentId,
    batch_id: batchId,
    title: parsed.payload.title,
    subject: parsed.payload.subject,
    topic: parsed.payload.topic,
    subtopic: parsed.payload.subtopic,
    skill_key: parsed.payload.skillKey,
    difficulty_level: parsed.payload.difficultyLevel,
    question_count: parsed.payload.questionCount,
    mode: parsed.payload.mode,
    question_selection: parsed.payload.questionSelection,
    time_limit_seconds: parsed.payload.timeLimitSeconds,
    due_at: parsed.payload.dueAt,
    status: "active",
    activated_at: now,
    ...frozenFields,
  }));

  const { data, error } = await serviceRole
    .from("student_activities")
    .insert(rows)
    .select("id, student_id");

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data?.length) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const statusRows = data.map((row) => ({
    activity_id: row.id,
    student_id: row.student_id,
    status: "not_started",
  }));

  const { error: seedErr } = await serviceRole.from("student_activity_status").upsert(statusRows, {
    onConflict: "activity_id,student_id",
    ignoreDuplicates: true,
  });

  if (seedErr) {
    if (isDbSchemaNotReadyError(seedErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    batchId,
    activityIds: data.map((r) => r.id),
  };
}

/**
 * Load all activities in a batch for the teacher monitor view.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} batchId
 */
export async function loadStudentActivityBatchMonitor(serviceRole, teacherId, batchId) {
  if (!isUuid(batchId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: activities, error: actErr } = await serviceRole
    .from("student_activities")
    .select(
      "id, student_id, title, subject, topic, mode, question_count, status, activated_at, closed_at"
    )
    .eq("batch_id", batchId)
    .eq("teacher_id", teacherId);

  if (actErr) {
    if (isDbSchemaNotReadyError(actErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!activities?.length) {
    return { ok: false, status: 404, code: "batch_not_found" };
  }

  const { assertActivitySubjectAllowed } = await import(
    "../school-server/school-subjects.server.js"
  );
  const subjectGate = await assertActivitySubjectAllowed(
    serviceRole,
    teacherId,
    activities[0].subject,
    null
  );
  if (!subjectGate.ok) return subjectGate;

  const activityIds = activities.map((a) => a.id);
  const studentIds = activities.map((a) => a.student_id);

  const [{ data: statusRows }, { data: studentRows }] = await Promise.all([
    serviceRole
      .from("student_activity_status")
      .select(
        "activity_id, student_id, status, answers_count, correct_count, score_pct, submitted_at"
      )
      .in("activity_id", activityIds),
    serviceRole.from("students").select("id, full_name").in("id", studentIds),
  ]);

  const statusMap = new Map((statusRows || []).map((r) => [r.activity_id, r]));
  const nameMap = new Map((studentRows || []).map((s) => [s.id, s.full_name]));

  const first = activities[0];
  const activityMeta = {
    title: first.title,
    subject: first.subject,
    topic: first.topic,
    mode: first.mode,
    questionCount: first.question_count,
    status: first.status,
    activatedAt: first.activated_at,
  };

  const roster = activities.map((a) => {
    const st = statusMap.get(a.id);
    return {
      activityId: a.id,
      studentId: a.student_id,
      studentFullNameMasked: teacherStudentDisplayName(nameMap.get(a.student_id)),
      status: st?.status || "not_started",
      answersCount: st?.answers_count ?? 0,
      correctCount: st?.correct_count ?? 0,
      scorePct: st?.score_pct != null ? Number(st.score_pct) : null,
      submittedAt: st?.submitted_at ?? null,
    };
  });

  const summary = {
    rosterCount: roster.length,
    notStartedCount: roster.filter((r) => r.status === "not_started").length,
    inProgressCount: roster.filter((r) => r.status === "in_progress").length,
    submittedCount: roster.filter(
      (r) => r.status === "submitted" || r.status === "timed_out"
    ).length,
  };

  if (summary.rosterCount > 0 && summary.answersCount !== 0) {
    summary.classAccuracy = Math.round(
      (roster.reduce((s, r) => s + r.correctCount, 0) /
        Math.max(
          1,
          roster.reduce((s, r) => s + r.answersCount, 0)
        )) *
        100
    );
  } else {
    summary.classAccuracy = null;
  }

  return { ok: true, batchId, activity: activityMeta, roster, summary };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 */
export async function listIndividualActivitiesForStudent(serviceRole, studentId) {
  const { data: activities, error } = await serviceRole
    .from("student_activities")
    .select(
      "id, title, mode, question_count, time_limit_seconds, status, due_at, activated_at"
    )
    .eq("student_id", studentId)
    .in("status", ["active", "closed"])
    .order("activated_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const activityIds = (activities || []).map((a) => a.id);
  const statusByActivity = new Map();

  if (activityIds.length) {
    const { data: statusRows } = await serviceRole
      .from("student_activity_status")
      .select("activity_id, status, answers_count, correct_count, score_pct, submitted_at")
      .eq("student_id", studentId)
      .in("activity_id", activityIds);

    for (const row of statusRows || []) {
      statusByActivity.set(row.activity_id, row);
    }
  }

  const visible = (activities || []).filter((a) => {
    if (a.status === "active") return true;
    if (a.status === "closed") {
      const st = statusByActivity.get(a.id);
      return (
        st &&
        (st.status === "submitted" ||
          st.status === "timed_out" ||
          Number(st.answers_count) > 0)
      );
    }
    return false;
  });

  return {
    ok: true,
    activities: visible.map((a) => {
      const st = statusByActivity.get(a.id);
      return {
        activityId: a.id,
        scope: "student",
        title: a.title,
        mode: a.mode,
        questionCount: a.question_count,
        timeLimitSeconds: a.time_limit_seconds,
        activityStatus: a.status,
        dueAt: a.due_at,
        activatedAt: a.activated_at ?? null,
        studentStatus: st?.status || "not_started",
        answersCount: st?.answers_count ?? 0,
        correctCount: st?.correct_count ?? 0,
        scorePct: st?.score_pct != null ? Number(st.score_pct) : null,
        submittedAt: st?.submitted_at ?? null,
      };
    }),
  };
}
