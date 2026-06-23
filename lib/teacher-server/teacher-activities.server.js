import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { classifyActivityEvidence } from "../learning/activity-classification.js";
import { loadClassMembers, loadTeacherClassOwned } from "./teacher-classes.server.js";
import { listIndividualActivitiesForStudent } from "./student-activity.server.js";
import {
  loadIndividualActivityForStudent,
  recordIndividualStudentActivityAnswer,
  startIndividualStudentActivity,
  submitIndividualStudentActivity,
} from "./student-activity-play.server.js";
import {
  listParentActivitiesForStudent,
  loadParentActivityForStudent,
  recordParentActivityAnswer,
  startParentActivity,
  submitParentActivity,
} from "../parent-server/parent-activity.server.js";
import { teacherStudentDisplayName } from "./teacher-students.server.js";
import { isUuid } from "./teacher-request.server.js";
import {
  loadStudentGradeLevelFallback,
  prepareAssignedActivityStudentPlayData,
} from "../classroom-activities/assigned-activity-play-metadata.server.js";
import { resolveCanonicalGradeKey } from "../teacher-portal/teacher-class-grade.js";
import {
  assertStudentActivityQuestionNotAlreadyAnswered,
  loadStudentActivityResumePayload,
} from "../classroom-activities/student-activity-resume.server.js";
import { gradeAssignedActivityAnswer } from "../../utils/geometry-activity-answer-ui.js";
import {
  ACTIVITY_MODES,
  ACTIVITY_STATUSES,
  extractCorrectAnswerFromQuestion,
  mapActivityRow,
  normalizeActivityMode,
  normalizeActivitySubject,
  normalizeDifficultyLevel,
  normalizeQuestionSelection,
  shouldRevealCorrectAnswerToStudent,
  validateSameExactQuestionSet,
  jsonSafeCloneForStorage,
  isActivityPreviewSubjectSupported,
  normalizeRecipientScope,
} from "../classroom-activities/classroom-activities-shared.server.js";
import {
  buildAttemptSnapshotFields,
  buildFrozenActivityInsertFields,
  mapAssignedActivityQuestionAnswerDetail,
  normalizeSnapshotStatus,
  resolveQuestionFromFrozenSet,
  validateAssignedActivityQuestionIndex,
  warnLegacyQuestionKeyMissing,
} from "../classroom-activities/assigned-activity-snapshot.server.js";
import { buildAssignedQuestionSnapshotWithEngine } from "../learning/question-engine-metadata.js";
import { buildDiagnosticCanonicalMetadata } from "../learning/diagnostic-canonical-metadata.js";
import { decorateWeakSkillsForTeacherDisplay } from "../classroom-activities/classroom-skill-labels-he.js";

const STUCK_THRESHOLD_MS = 3 * 60 * 1000;

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 */
export async function loadTeacherActivityOwned(serviceRole, teacherId, activityId) {
  if (!isUuid(activityId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("classroom_activities")
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
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} classId
 * @param {string} studentId
 */
export async function verifyStudentInClass(serviceRole, classId, studentId) {
  const { data, error } = await serviceRole
    .from("teacher_class_students")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .is("removed_at", null)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, member: Boolean(data?.id) };
}

/**
 * Resolve which class student IDs receive status rows for an activity.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} classId
 * @param {{ mode?: string, recipientScope?: string|null, assignedStudentIds?: string[]|null }} opts
 */
export async function resolveClassActivityRecipientStudentIds(serviceRole, classId, opts = {}) {
  const members = await loadClassMembers(serviceRole, classId);
  if (!members.ok) return members;

  const memberIds = members.members.map((m) => m.studentId);
  const memberSet = new Set(memberIds);

  const mode = String(opts.mode || "");
  const scope =
    mode === "discussion" && opts.recipientScope === "selected_students"
      ? "selected_students"
      : "whole_class";

  if (scope === "selected_students") {
    const raw = Array.isArray(opts.assignedStudentIds) ? opts.assignedStudentIds : [];
    const unique = [...new Set(raw.map((id) => String(id).trim()).filter((id) => isUuid(id)))];
    if (!unique.length) {
      return {
        ok: false,
        status: 400,
        code: "validation_failed",
        message: "studentIds required for selected_students",
      };
    }
    for (const studentId of unique) {
      if (!memberSet.has(studentId)) {
        return {
          ok: false,
          status: 400,
          code: "student_not_in_class",
          message: "student not in class",
        };
      }
    }
    return { ok: true, studentIds: unique, recipientScope: scope };
  }

  if (!memberIds.length) {
    return { ok: false, status: 400, code: "class_has_no_students" };
  }

  return { ok: true, studentIds: memberIds, recipientScope: "whole_class" };
}

/**
 * @param {Record<string, unknown>} body
 */
export function parseCreateActivityBody(body) {
  const title = String(body.title || "").trim();
  if (!title || title.length > 120) {
    return { ok: false, code: "validation_failed", message: "יש להזין כותרת (עד 120 תווים)" };
  }

  const classId = String(body.classId || "").trim();
  if (!isUuid(classId)) {
    return { ok: false, code: "validation_failed", message: "מזהה הכיתה אינו תקין" };
  }

  const subject = normalizeActivitySubject(body.subject);
  if (!subject) {
    return { ok: false, code: "validation_failed", message: "מקצוע לא תקין" };
  }

  if (!isActivityPreviewSubjectSupported(subject)) {
    return {
      ok: false,
      code: "subject_preview_not_supported",
      message: "מקצוע זה אינו נתמך ליצירת פעילות כיתה",
    };
  }

  const topic = String(body.topic || "").trim();
  if (!topic || topic.length > 120) {
    return { ok: false, code: "validation_failed", message: "יש להזין נושא (עד 120 תווים)" };
  }

  const mode = normalizeActivityMode(body.mode);
  if (!mode) {
    return { ok: false, code: "validation_failed", message: "סוג פעילות לא תקין" };
  }

  const questionSelection = normalizeQuestionSelection(body.questionSelection);
  if (!questionSelection) {
    return { ok: false, code: "validation_failed", message: "אופן בחירת השאלות לא תקין" };
  }

  if (questionSelection === "controlled_variants") {
    return { ok: false, status: 501, code: "not_implemented", message: "controlled_variants is not enabled in Phase A" };
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

  if (mode === "discussion" && (Math.floor(questionCount) < 1 || Math.floor(questionCount) > 5)) {
    return {
      ok: false,
      code: "validation_failed",
      message: "פעילות דיון חייבת להכיל 1 עד 5 שאלות",
    };
  }

  const answerRequired = body.answerRequired === false ? false : true;
  const rawGradeLevel =
    body.gradeLevel != null ? String(body.gradeLevel).trim().slice(0, 32) : null;
  const gradeLevel = rawGradeLevel ? resolveCanonicalGradeKey(rawGradeLevel) || rawGradeLevel : null;

  let recipientScope = "whole_class";
  /** @type {string[]|null} */
  let assignedStudentIds = null;

  if (mode === "discussion") {
    const normalizedScope = normalizeRecipientScope(body.recipientScope);
    if (!normalizedScope) {
      return { ok: false, code: "validation_failed", message: "טווח נמענים לא תקין" };
    }
    recipientScope = normalizedScope;

    if (recipientScope === "selected_students") {
      const rawIds = body.studentIds;
      if (!Array.isArray(rawIds) || !rawIds.length) {
        return {
          ok: false,
          code: "validation_failed",
          message: "יש לבחור לפחות ילד/ה אחד",
        };
      }
      assignedStudentIds = [...new Set(rawIds.map((id) => String(id).trim()).filter((id) => isUuid(id)))];
      if (!assignedStudentIds.length || assignedStudentIds.length !== rawIds.length) {
        return { ok: false, code: "validation_failed", message: "מזהה ילד/ה לא תקין" };
      }
    }
  }

  return {
    ok: true,
    payload: {
      classId,
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
      recipientScope,
      assignedStudentIds,
      answerRequired,
      gradeLevel,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {ReturnType<typeof parseCreateActivityBody> & { ok: true }} parsed
 */
export async function createClassroomActivity(serviceRole, teacherId, parsed, options = {}) {
  const owned = options.ownedRow
    ? { ok: true, row: options.ownedRow }
    : await loadTeacherClassOwned(serviceRole, teacherId, parsed.payload.classId);
  if (!owned.ok) {
    return owned;
  }

  const insertRow = {
      teacher_id: teacherId,
      class_id: parsed.payload.classId,
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
        gradeLevel: parsed.payload.gradeLevel,
        difficultyLevel: parsed.payload.difficultyLevel,
        skillKey: parsed.payload.skillKey,
      }),
  };

  if (options.schoolId) {
    insertRow.school_id = options.schoolId;
  }

  if (parsed.payload.mode === "discussion") {
    const resolved = await resolveClassActivityRecipientStudentIds(
      serviceRole,
      parsed.payload.classId,
      {
        mode: "discussion",
        recipientScope: parsed.payload.recipientScope,
        assignedStudentIds: parsed.payload.assignedStudentIds,
      }
    );
    if (!resolved.ok) {
      return resolved;
    }
    insertRow.recipient_scope = resolved.recipientScope;
    insertRow.assigned_student_ids =
      resolved.recipientScope === "selected_students" ? resolved.studentIds : null;
    insertRow.answer_required = parsed.payload.answerRequired ?? true;
  }

  const { data, error } = await serviceRole
    .from("classroom_activities")
    .insert(insertRow)
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
 * @param {{ classId?: string, status?: string }} filters
 */
export async function listTeacherActivities(serviceRole, teacherId, filters = {}) {
  let query = serviceRole
    .from("classroom_activities")
    .select(
      "id, class_id, title, subject, topic, mode, question_count, status, question_selection, activated_at, closed_at, created_at, updated_at"
    )
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(100);

  const classIds = Array.isArray(filters.classIds)
    ? filters.classIds.filter((id) => isUuid(id))
    : [];
  if (classIds.length) {
    query = query.in("class_id", classIds);
  } else if (filters.classId && isUuid(filters.classId)) {
    query = query.eq("class_id", filters.classId);
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
  const submittedCounts = new Map();

  if (activityIds.length) {
    const { data: statusRows } = await serviceRole
      .from("classroom_activity_student_status")
      .select("activity_id, status")
      .in("activity_id", activityIds);

    for (const row of statusRows || []) {
      const cur = submittedCounts.get(row.activity_id) || { total: 0, submitted: 0 };
      cur.total += 1;
      if (row.status === "submitted") cur.submitted += 1;
      submittedCounts.set(row.activity_id, cur);
    }
  }

  const activities = (data || []).map((row) => {
    const counts = submittedCounts.get(row.id) || { total: 0, submitted: 0 };
    return {
      activityId: row.id,
      classId: row.class_id,
      title: row.title,
      subject: row.subject,
      topic: row.topic,
      mode: row.mode,
      questionCount: row.question_count,
      status: row.status,
      questionSelection: row.question_selection,
      activatedAt: row.activated_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      progressSummary: {
        submittedCount: counts.submitted,
        rosterCount: counts.total,
      },
    };
  });

  return { ok: true, activities };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} activityId
 */
export async function loadActivityStudentStatuses(serviceRole, activityId) {
  const { data, error } = await serviceRole
    .from("classroom_activity_student_status")
    .select(
      "id, student_id, status, started_at, submitted_at, last_seen_at, answers_count, correct_count, score_pct, students!inner(full_name)"
    )
    .eq("activity_id", activityId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const students = (data || []).map((row) => {
    const student = row.students;
    return {
      studentId: row.student_id,
      studentFullNameMasked: teacherStudentDisplayName(student?.full_name),
      status: row.status,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      lastSeenAt: row.last_seen_at,
      answersCount: row.answers_count,
      correctCount: row.correct_count,
      scorePct: row.score_pct != null ? Number(row.score_pct) : null,
    };
  });

  return { ok: true, students };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 */
export async function getTeacherActivityDetail(serviceRole, teacherId, activityId) {
  const owned = await loadTeacherActivityOwned(serviceRole, teacherId, activityId);
  if (!owned.ok) return owned;

  const statuses = await loadActivityStudentStatuses(serviceRole, activityId);
  if (!statuses.ok) return statuses;

  const questionSet = owned.row.question_set;
  const safeQuestionSet = Array.isArray(questionSet) ? questionSet : [];

  return {
    ok: true,
    activity: {
      ...mapActivityRow(owned.row),
      questionSet: safeQuestionSet,
    },
    students: statuses.students,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} activityId
 * @param {string} classId
 * @param {{ mode?: string, recipientScope?: string|null, assignedStudentIds?: string[]|null }} [opts]
 */
async function seedStudentStatusRowsForClass(serviceRole, activityId, classId, opts = {}) {
  const resolved = await resolveClassActivityRecipientStudentIds(serviceRole, classId, {
    mode: opts.mode,
    recipientScope: opts.recipientScope,
    assignedStudentIds: opts.assignedStudentIds,
  });
  if (!resolved.ok) return resolved;

  const rows = resolved.studentIds.map((studentId) => ({
    activity_id: activityId,
    student_id: studentId,
    status: "not_started",
  }));

  const { error } = await serviceRole
    .from("classroom_activity_student_status")
    .upsert(rows, { onConflict: "activity_id,student_id", ignoreDuplicates: true });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, count: rows.length };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 * @param {string} action
 */
export async function transitionActivityStatus(serviceRole, teacherId, activityId, action) {
  const owned = await loadTeacherActivityOwned(serviceRole, teacherId, activityId);
  if (!owned.ok) return owned;

  const row = owned.row;
  const now = new Date().toISOString();

  if (row.question_selection === "controlled_variants") {
    return { ok: false, status: 501, code: "not_implemented", message: "controlled_variants is not enabled in Phase A" };
  }

  /** @type {Record<string, unknown>} */
  const patch = {};

  if (action === "activate") {
    if (row.status !== "draft" && row.status !== "paused") {
      return { ok: false, status: 409, code: "invalid_transition", message: "cannot activate from current status" };
    }
    const qSet = Array.isArray(row.question_set) ? row.question_set : [];
    const v = validateSameExactQuestionSet(qSet, row.question_count);
    if (!v.ok) {
      return { ok: false, status: 400, code: v.code, message: v.message };
    }
    const seed = await seedStudentStatusRowsForClass(serviceRole, activityId, row.class_id, {
      mode: row.mode,
      recipientScope: row.recipient_scope,
      assignedStudentIds: row.assigned_student_ids,
    });
    if (!seed.ok) return seed;

    patch.status = "active";
    patch.activated_at = row.activated_at || now;
    patch.paused_at = null;
    if (row.mode === "live_lesson" && row.current_question_idx == null) {
      patch.current_question_idx = 0;
    }
  } else if (action === "pause") {
    if (row.status !== "active" || row.mode !== "live_lesson") {
      return { ok: false, status: 409, code: "invalid_transition", message: "pause only for active live_lesson" };
    }
    patch.status = "paused";
    patch.paused_at = now;
  } else if (action === "resume") {
    if (row.status !== "paused") {
      return { ok: false, status: 409, code: "invalid_transition", message: "resume only from paused" };
    }
    patch.status = "active";
    patch.paused_at = null;
  } else if (action === "close") {
    if (row.status !== "active" && row.status !== "paused") {
      return { ok: false, status: 409, code: "invalid_transition", message: "close only from active or paused" };
    }
    patch.status = "closed";
    patch.closed_at = now;
    await finalizeActivityScores(serviceRole, activityId, row.question_count);
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
    .from("classroom_activities")
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
 * @param {string} activityId
 * @param {number} questionCount
 */
async function finalizeActivityScores(serviceRole, activityId, questionCount) {
  const { data: rows } = await serviceRole
    .from("classroom_activity_student_status")
    .select("id, student_id, answers_count, correct_count, status")
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
    await serviceRole
      .from("classroom_activity_student_status")
      .update(patch)
      .eq("id", row.id);
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 * @param {number} currentQuestionIdx
 */
export async function setLiveLessonQuestionIndex(serviceRole, teacherId, activityId, currentQuestionIdx) {
  const owned = await loadTeacherActivityOwned(serviceRole, teacherId, activityId);
  if (!owned.ok) return owned;

  if (owned.row.mode !== "live_lesson") {
    return { ok: false, status: 400, code: "validation_failed", message: "not a live_lesson activity" };
  }

  if (owned.row.status !== "active" && owned.row.status !== "paused") {
    return { ok: false, status: 409, code: "invalid_transition", message: "activity not active" };
  }

  const idx = Math.floor(Number(currentQuestionIdx));
  if (!Number.isFinite(idx) || idx < 0 || idx >= owned.row.question_count) {
    return { ok: false, status: 400, code: "validation_failed", message: "invalid question index" };
  }

  const { error } = await serviceRole
    .from("classroom_activities")
    .update({ current_question_idx: idx })
    .eq("id", activityId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, currentQuestionIdx: idx };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 */
export async function deleteDraftActivity(serviceRole, teacherId, activityId) {
  const owned = await loadTeacherActivityOwned(serviceRole, teacherId, activityId);
  if (!owned.ok) return owned;

  if (owned.row.status !== "draft") {
    return { ok: false, status: 409, code: "activity_not_draft", message: "only draft activities can be deleted" };
  }

  const { error } = await serviceRole
    .from("classroom_activities")
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
 * @param {string} activityId
 * @param {number} questionCount
 */
async function buildPerQuestionAggregates(serviceRole, activityId, questionCount) {
  const { data: attempts, error } = await serviceRole
    .from("classroom_activity_attempts")
    .select("question_index, student_id, is_correct")
    .eq("activity_id", activityId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  /** @type {Array<{ questionIndex: number, totalAnswers: number, correctCount: number, wrongCount: number, accuracyPct: number, wrongStudentIds: string[] }>} */
  const perQuestion = [];

  for (let i = 0; i < questionCount; i += 1) {
    const rows = (attempts || []).filter((a) => a.question_index === i && a.is_correct != null);
    const correctCount = rows.filter((a) => a.is_correct === true).length;
    const totalAnswers = rows.length;
    const wrongStudentIds = rows
      .filter((a) => a.is_correct === false)
      .map((a) => a.student_id);
    perQuestion.push({
      questionIndex: i,
      totalAnswers,
      correctCount,
      wrongCount: totalAnswers - correctCount,
      accuracyPct: totalAnswers > 0 ? Number(((correctCount / totalAnswers) * 100).toFixed(2)) : 0,
      wrongStudentIds,
    });
  }

  return { ok: true, perQuestion };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 */
export async function buildActivityMonitorPayload(serviceRole, teacherId, activityId) {
  const owned = await loadTeacherActivityOwned(serviceRole, teacherId, activityId);
  if (!owned.ok) return owned;

  const statuses = await loadActivityStudentStatuses(serviceRole, activityId);
  if (!statuses.ok) return statuses;

  const aggregates = await buildPerQuestionAggregates(
    serviceRole,
    activityId,
    owned.row.question_count
  );
  if (!aggregates.ok) return aggregates;

  const questionSet = Array.isArray(owned.row.question_set) ? owned.row.question_set : [];
  const perQuestionWithPrompts = aggregates.perQuestion.map((pq) => {
    const q = questionSet[pq.questionIndex];
    const prompt = q && typeof q === "object" ? String(q.question || q.prompt || "").trim() : "";
    return { ...pq, prompt };
  });

  let notStarted = 0;
  let inProgress = 0;
  let submitted = 0;
  let totalCorrect = 0;
  let totalAnswers = 0;
  const now = Date.now();

  const students = statuses.students.map((s) => {
    if (s.status === "not_started") notStarted += 1;
    else if (s.status === "in_progress") inProgress += 1;
    else if (s.status === "submitted" || s.status === "timed_out") submitted += 1;

    totalCorrect += Number(s.correctCount) || 0;
    totalAnswers += Number(s.answersCount) || 0;

    const lastSeen = s.lastSeenAt ? new Date(s.lastSeenAt).getTime() : 0;
    const stuck =
      s.status === "in_progress" &&
      lastSeen > 0 &&
      now - lastSeen > STUCK_THRESHOLD_MS;

    return { ...s, stuck };
  });

  const stuckStudents = students.filter((s) => s.stuck);

  return {
    ok: true,
    activity: mapActivityRow(owned.row),
    summary: {
      notStartedCount: notStarted,
      inProgressCount: inProgress,
      submittedCount: submitted,
      classAccuracy:
        totalAnswers > 0 ? Number(((totalCorrect / totalAnswers) * 100).toFixed(2)) : 0,
      rosterCount: students.length,
    },
    students,
    perQuestion: perQuestionWithPrompts,
    stuckStudents: stuckStudents.map((s) => ({
      studentId: s.studentId,
      studentFullNameMasked: s.studentFullNameMasked,
      lastSeenAt: s.lastSeenAt,
    })),
  };
}

/**
 * Build ordered question rows for teacher answer review (from frozen set + attempts).
 * @param {{ questionSet: unknown[], attempts: Array<Record<string, unknown>>, questionCount: number, snapshotStatus?: string|null, subject?: string|null, topic?: string|null }} input
 */
export function mapTeacherActivityStudentAnswerDetail(input) {
  return mapAssignedActivityQuestionAnswerDetail(input);
}

/**
 * Teacher-only: per-student answer detail for activity monitor.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 * @param {string} studentId
 */
export async function buildActivityStudentAnswersPayload(
  serviceRole,
  teacherId,
  activityId,
  studentId
) {
  if (!isUuid(studentId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const owned = await loadTeacherActivityOwned(serviceRole, teacherId, activityId);
  if (!owned.ok) return owned;

  const inClass = await verifyStudentInClass(serviceRole, owned.row.class_id, studentId);
  if (!inClass.ok) return inClass;
  if (!inClass.member) {
    return { ok: false, status: 404, code: "student_not_found" };
  }

  const { data: statusRow, error: statusErr } = await serviceRole
    .from("classroom_activity_student_status")
    .select(
      "status, started_at, submitted_at, last_seen_at, answers_count, correct_count, score_pct, students!inner(full_name)"
    )
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (statusErr) {
    if (isDbSchemaNotReadyError(statusErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!statusRow) {
    return { ok: false, status: 404, code: "student_not_in_activity" };
  }

  const { data: attempts, error: attemptsErr } = await serviceRole
    .from("classroom_activity_attempts")
    .select(
      "question_index, question_key, selected_answer, correct_answer, is_correct, answered_at, question_snapshot"
    )
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
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

  const answersCount = Number(statusRow.answers_count) || 0;
  const correctCount = Number(statusRow.correct_count) || 0;
  const accuracyPct =
    answersCount > 0 ? Number(((correctCount / answersCount) * 100).toFixed(2)) : null;

  const student = statusRow.students;

  return {
    ok: true,
    activity: {
      activityId: owned.row.id,
      title: owned.row.title,
      subject: owned.row.subject,
      questionCount: owned.row.question_count,
      snapshotStatus: normalizeSnapshotStatus(owned.row.snapshot_status),
    },
    student: {
      studentId,
      studentFullNameMasked: teacherStudentDisplayName(student?.full_name),
      status: statusRow.status,
      startedAt: statusRow.started_at,
      submittedAt: statusRow.submitted_at,
      lastSeenAt: statusRow.last_seen_at,
      answersCount,
      correctCount,
      scorePct: statusRow.score_pct != null ? Number(statusRow.score_pct) : null,
      accuracyPct,
    },
    questions,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 */
export async function buildActivityReportPayload(serviceRole, teacherId, activityId) {
  const owned = await loadTeacherActivityOwned(serviceRole, teacherId, activityId);
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
    return { ok: false, status: 409, code: "activity_not_closed", message: "report available when closed or archived" };
  }

  const monitor = await buildActivityMonitorPayload(serviceRole, teacherId, activityId);
  if (!monitor.ok) return monitor;

  const { data: attempts } = await serviceRole
    .from("classroom_activity_attempts")
    .select("skill_key, is_correct")
    .eq("activity_id", activityId)
    .not("is_correct", "is", null);

  /** @type {Map<string, { answers: number, correct: number }>} */
  const skillMap = new Map();
  for (const a of attempts || []) {
    const key = a.skill_key || "general";
    const cur = skillMap.get(key) || { answers: 0, correct: 0 };
    cur.answers += 1;
    if (a.is_correct) cur.correct += 1;
    skillMap.set(key, cur);
  }

  const weakSkills = [];
  for (const [skillKey, stats] of skillMap.entries()) {
    const accuracy = stats.answers > 0 ? (stats.correct / stats.answers) * 100 : 0;
    if (accuracy < 60 && stats.answers >= 2) {
      weakSkills.push({
        skillKey,
        accuracyPct: Number(accuracy.toFixed(2)),
        answers: stats.answers,
        correct: stats.correct,
      });
    }
  }

  weakSkills.sort((a, b) => a.accuracyPct - b.accuracyPct);

  /** @type {string|null} */
  let reportGradeLevel = null;
  try {
    const classResult = await loadTeacherClassOwned(
      serviceRole,
      teacherId,
      owned.row.class_id,
      { allowArchived: true }
    );
    if (classResult.ok) {
      reportGradeLevel = classResult.row.grade_level ?? null;
    }
  } catch {
    // Class grade unavailable — formula labels fail closed via decorateWeakSkillsForTeacherDisplay.
  }

  const completionRate =
    monitor.summary.rosterCount > 0
      ? Number(((monitor.summary.submittedCount / monitor.summary.rosterCount) * 100).toFixed(2))
      : 0;

  return {
    ok: true,
    activity: monitor.activity,
    summary: {
      ...monitor.summary,
      completionRate,
    },
    students: monitor.students,
    perQuestion: monitor.perQuestion,
    weakSkills: decorateWeakSkillsForTeacherDisplay(weakSkills, owned.row.subject, {
      gradeLevel: reportGradeLevel,
    }),
  };
}

// ---------------------------------------------------------------------------
// Student-facing operations (called from /api/student/activities/*)
// ---------------------------------------------------------------------------

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 */
export async function listStudentActivities(serviceRole, studentId) {
  /** @type {Array<Record<string, unknown>>} */
  const merged = [];

  const { data: memberships, error: memErr } = await serviceRole
    .from("teacher_class_students")
    .select("class_id")
    .eq("student_id", studentId)
    .is("removed_at", null);

  if (memErr) {
    if (isDbSchemaNotReadyError(memErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const classIds = (memberships || []).map((m) => m.class_id).filter(Boolean);

  if (classIds.length) {
    const { data: activities, error } = await serviceRole
      .from("classroom_activities")
      .select(
        "id, title, mode, question_count, time_limit_seconds, status, class_id, due_at, current_question_idx, activated_at"
      )
      .in("class_id", classIds)
      .in("status", ["active", "paused", "closed"])
      .order("activated_at", { ascending: false })
      .limit(50);

    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    const activityIds = (activities || []).map((a) => a.id);
    /** @type {Map<string, Record<string, unknown>>} */
    const statusByActivity = new Map();

    if (activityIds.length) {
      const { data: statusRows } = await serviceRole
        .from("classroom_activity_student_status")
        .select("activity_id, status, answers_count, correct_count, score_pct, submitted_at")
        .eq("student_id", studentId)
        .in("activity_id", activityIds);

      for (const row of statusRows || []) {
        statusByActivity.set(row.activity_id, row);
      }
    }

    const visible = (activities || []).filter((a) => {
      if (a.mode === "discussion" && !statusByActivity.has(a.id)) {
        return false;
      }
      if (a.status === "active" || a.status === "paused") return true;
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

    for (const a of visible) {
      const st = statusByActivity.get(a.id);
      merged.push({
        activityId: a.id,
        scope: "class",
        title: a.title,
        mode: a.mode,
        questionCount: a.question_count,
        timeLimitSeconds: a.time_limit_seconds,
        activityStatus: a.status,
        dueAt: a.due_at,
        currentQuestionIdx: a.current_question_idx,
        studentStatus: st?.status || "not_started",
        answersCount: st?.answers_count ?? 0,
        correctCount: st?.correct_count ?? 0,
        scorePct: st?.score_pct != null ? Number(st.score_pct) : null,
        submittedAt: st?.submitted_at ?? null,
        sortAt: a.activated_at || null,
      });
    }
  }

  const individual = await listIndividualActivitiesForStudent(serviceRole, studentId);
  if (!individual.ok) {
    if (individual.code === "db_schema_not_ready") {
      return { ok: true, activities: merged };
    }
    return individual;
  }

  for (const a of individual.activities || []) {
    merged.push({
      ...a,
      sortAt: a.activatedAt || null,
    });
  }

  const parentActivities = await listParentActivitiesForStudent(serviceRole, studentId);
  if (!parentActivities.ok) {
    if (parentActivities.code === "db_schema_not_ready") {
      // Parent activity tables not migrated yet — continue with teacher activities only.
    } else {
      return parentActivities;
    }
  } else {
    for (const a of parentActivities.activities || []) {
      merged.push({
        ...a,
        sortAt: a.activatedAt || null,
      });
    }
  }

  merged.sort((a, b) => {
    const ta = a.sortAt ? new Date(String(a.sortAt)).getTime() : 0;
    const tb = b.sortAt ? new Date(String(b.sortAt)).getTime() : 0;
    return tb - ta;
  });

  const activities = merged.map(({ sortAt, ...rest }) => rest);

  return { ok: true, activities };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} activityId
 */
export async function loadActivityForStudent(serviceRole, studentId, activityId) {
  if (!isUuid(activityId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("classroom_activities")
    .select("*")
    .eq("id", activityId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (data) {
    const member = await verifyStudentInClass(serviceRole, data.class_id, studentId);
    if (!member.ok) return member;
    if (!member.member) {
      return { ok: false, status: 403, code: "forbidden" };
    }

    if (data.mode === "discussion") {
      const { data: assigned, error: assignErr } = await serviceRole
        .from("classroom_activity_student_status")
        .select("id")
        .eq("activity_id", activityId)
        .eq("student_id", studentId)
        .maybeSingle();

      if (assignErr) {
        if (isDbSchemaNotReadyError(assignErr)) {
          return { ok: false, status: 503, code: "db_schema_not_ready" };
        }
        return { ok: false, status: 500, code: "internal_error" };
      }

      if (!assigned?.id) {
        return { ok: false, status: 403, code: "not_assigned" };
      }
    }

    return { ok: true, scope: "class", row: data };
  }

  const individual = await loadIndividualActivityForStudent(serviceRole, studentId, activityId);
  if (individual.ok) {
    return { ok: true, scope: individual.scope, row: individual.row };
  }

  if (individual.status !== 404) {
    return individual;
  }

  const parentActivity = await loadParentActivityForStudent(serviceRole, studentId, activityId);
  if (parentActivity.ok) {
    return { ok: true, scope: "parent", row: parentActivity.row };
  }

  if (parentActivity.status === 404) {
    return { ok: false, status: 404, code: "activity_not_found" };
  }

  return parentActivity;
}

/**
 * @param {Record<string, unknown>} row
 */
function isActivityAcceptingAnswers(row) {
  if (row.status === "closed" || row.status === "archived" || row.status === "draft") {
    return false;
  }
  if (row.status === "paused" && row.mode !== "homework") {
    return false;
  }
  if (row.mode === "homework" && row.due_at) {
    const due = new Date(row.due_at).getTime();
    if (Number.isFinite(due) && Date.now() > due) {
      return false;
    }
  }
  return row.status === "active" || (row.status === "paused" && row.mode === "homework");
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} activityId
 */
export async function startStudentActivity(serviceRole, studentId, activityId) {
  const loaded = await loadActivityForStudent(serviceRole, studentId, activityId);
  if (!loaded.ok) return loaded;

  if (loaded.scope === "student") {
    return startIndividualStudentActivity(serviceRole, studentId, activityId);
  }

  if (loaded.scope === "parent") {
    return startParentActivity(serviceRole, studentId, activityId);
  }

  const row = loaded.row;
  if (row.status !== "active" && row.status !== "paused") {
    return { ok: false, status: 409, code: "activity_not_available" };
  }

  const now = new Date().toISOString();

  const { data: existingStatus, error: existingErr } = await serviceRole
    .from("classroom_activity_student_status")
    .select("id, status, answers_count, correct_count, score_pct, started_at, submitted_at")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existingErr) {
    if (isDbSchemaNotReadyError(existingErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const rawQuestionSet = Array.isArray(row.question_set) ? row.question_set : [];
  const studentGradeFallback = await loadStudentGradeLevelFallback(serviceRole, studentId);
  const { activity: activityPayload, questionSet: enrichedQuestionSet } =
    prepareAssignedActivityStudentPlayData(row, rawQuestionSet, "class", studentGradeFallback);

  if (existingStatus?.status === "submitted" || existingStatus?.status === "timed_out") {
    return {
      ok: true,
      alreadyCompleted: true,
      activity: activityPayload,
      studentStatus: existingStatus.status,
      scorePct: existingStatus.score_pct != null ? Number(existingStatus.score_pct) : null,
      answersCount: existingStatus.answers_count ?? 0,
      correctCount: existingStatus.correct_count ?? 0,
      questionSet: [],
    };
  }

  let statusRow = existingStatus;

  if (!existingStatus) {
    if (row.mode === "discussion") {
      return { ok: false, status: 403, code: "not_assigned" };
    }
    const { data, error: insertErr } = await serviceRole
      .from("classroom_activity_student_status")
      .insert({
        activity_id: activityId,
        student_id: studentId,
        status: "in_progress",
        started_at: now,
        last_seen_at: now,
      })
      .select("id, status, answers_count, correct_count, score_pct")
      .maybeSingle();
    if (insertErr) {
      if (isDbSchemaNotReadyError(insertErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    statusRow = data;
  } else if (existingStatus.status === "not_started") {
    const { data, error: updateErr } = await serviceRole
      .from("classroom_activity_student_status")
      .update({
        status: "in_progress",
        started_at: existingStatus.started_at || now,
        last_seen_at: now,
      })
      .eq("id", existingStatus.id)
      .select("id, status, answers_count, correct_count, score_pct")
      .maybeSingle();
    if (updateErr) {
      if (isDbSchemaNotReadyError(updateErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    statusRow = data;
  } else {
    const { data, error: touchErr } = await serviceRole
      .from("classroom_activity_student_status")
      .update({ last_seen_at: now })
      .eq("id", existingStatus.id)
      .select("id, status, answers_count, correct_count, score_pct")
      .maybeSingle();
    if (touchErr) {
      if (isDbSchemaNotReadyError(touchErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    statusRow = data;
  }

  let resumePayload;
  try {
    resumePayload = await loadStudentActivityResumePayload(
      serviceRole,
      "class",
      activityId,
      studentId,
      row.question_count
    );
  } catch (err) {
    if (err?.code === "db_schema_not_ready") {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    activity: activityPayload,
    studentStatus: statusRow?.status || "in_progress",
    questionSet: enrichedQuestionSet,
    attempts: resumePayload.attempts,
    resumeQuestionIndex: resumePayload.resumeQuestionIndex,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} activityId
 * @param {{
 *   questionIndex: number,
 *   selectedAnswer: string,
 *   timeSpentMs?: number|null,
 *   rawTimeSpentMs?: number|null,
 *   creditedTimeMs?: number|null,
 *   timingStatus?: string|null,
 *   hintsUsed?: number,
 *   explanationViewed?: boolean,
 * }} input
 */
export async function recordStudentActivityAnswer(serviceRole, studentId, activityId, input) {
  const loaded = await loadActivityForStudent(serviceRole, studentId, activityId);
  if (!loaded.ok) return loaded;

  if (loaded.scope === "student") {
    return recordIndividualStudentActivityAnswer(serviceRole, studentId, activityId, input);
  }

  if (loaded.scope === "parent") {
    return recordParentActivityAnswer(serviceRole, studentId, activityId, input);
  }

  const row = loaded.row;
  if (!isActivityAcceptingAnswers(row)) {
    return { ok: false, status: 409, code: "activity_not_accepting_answers" };
  }

  if (row.mode === "discussion" && row.answer_required === false) {
    return { ok: false, status: 409, code: "answer_not_required" };
  }

  const questionIndex = Math.floor(Number(input.questionIndex));
  const qSet = Array.isArray(row.question_set) ? row.question_set : [];
  const indexValidation = validateAssignedActivityQuestionIndex(
    questionIndex,
    row.question_count,
    qSet
  );
  if (!indexValidation.ok) return indexValidation;

  if (row.mode === "live_lesson") {
    const broadcast = row.current_question_idx;
    if (broadcast == null || questionIndex !== broadcast) {
      return { ok: false, status: 409, code: "question_not_broadcast", message: "wait for teacher" };
    }
  }

  const { data: statusRow, error: statusLookupErr } = await serviceRole
    .from("classroom_activity_student_status")
    .select("id, status, answers_count, correct_count")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (statusLookupErr) {
    if (isDbSchemaNotReadyError(statusLookupErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!statusRow || statusRow.status === "not_started") {
    return { ok: false, status: 400, code: "activity_not_started" };
  }

  if (statusRow.status === "submitted" || statusRow.status === "timed_out") {
    return { ok: false, status: 409, code: "already_submitted" };
  }

  const qSetValidated = Array.isArray(row.question_set) ? row.question_set : [];
  const question = resolveQuestionFromFrozenSet(qSetValidated, questionIndex);
  if (!question) {
    return { ok: false, status: 500, code: "question_missing" };
  }

  const correctAnswer = extractCorrectAnswerFromQuestion(question);
  if (!correctAnswer) {
    return { ok: false, status: 500, code: "question_missing_answer" };
  }

  const duplicateGuard = await assertStudentActivityQuestionNotAlreadyAnswered(
    serviceRole,
    "class",
    activityId,
    studentId,
    questionIndex
  );
  if (!duplicateGuard.ok) return duplicateGuard;

  const selectedAnswer = String(input.selectedAnswer ?? "").trim().slice(0, 1000);
  const isCorrect = gradeAssignedActivityAnswer(selectedAnswer, correctAnswer, question);
  const now = new Date().toISOString();

  const attemptFields = buildAttemptSnapshotFields(question, row);
  if (!attemptFields.question_key) {
    warnLegacyQuestionKeyMissing("class", activityId, questionIndex);
  }

  const studentGradeFallback = await loadStudentGradeLevelFallback(serviceRole, studentId);

  const classification = classifyActivityEvidence(
    row.mode,
    "assigned_class",
    {
      afterStepByStep: input.afterStepByStep === true,
      hintsUsed: input.hintsUsed ?? 0,
    }
  );

  const snapshotWithEngine = buildAssignedQuestionSnapshotWithEngine(
    attemptFields.question_snapshot,
    selectedAnswer,
    {
      generatorSource: "class-assigned-activity",
      afterStepByStep: input.afterStepByStep === true,
      explanationViewed: input.explanationViewed === true,
    }
  );

  const canonicalBundle = buildDiagnosticCanonicalMetadata({
    subject: row.subject,
    topic: row.topic,
    contentGradeKey: snapshotWithEngine.grade || studentGradeFallback,
    questionId: attemptFields.question_key,
    isDiagnosticEligible: classification.isDiagnosticEligible,
    source: snapshotWithEngine,
    questionEngine: snapshotWithEngine.questionEngine,
  });

  const frozenSnapshot = {
    ...snapshotWithEngine,
    ...(canonicalBundle.enrichedQuestionEngine
      ? { questionEngine: canonicalBundle.enrichedQuestionEngine }
      : {}),
    ...(canonicalBundle.diagnosticMetadata
      ? { diagnosticMetadata: canonicalBundle.diagnosticMetadata }
      : {}),
  };

  const { error: attemptErr } = await serviceRole.from("classroom_activity_attempts").upsert(
    {
      activity_id: activityId,
      student_id: studentId,
      question_index: questionIndex,
      skill_key: attemptFields.skill_key,
      question_snapshot: {
        ...frozenSnapshot,
        evidenceCategory: classification.evidenceCategory,
        isDiagnosticEligible: classification.isDiagnosticEligible,
        contextFlags: classification.contextFlags,
        // Phase 3: timing truth stored in JSONB; explicit columns added via migration
        rawTimeSpentMs: input.rawTimeSpentMs ?? input.timeSpentMs ?? null,
        creditedTimeMs: input.creditedTimeMs ?? input.rawTimeSpentMs ?? input.timeSpentMs ?? null,
        timingStatus: input.timingStatus ?? null,
      },
      question_key: attemptFields.question_key,
      selected_answer: selectedAnswer || null,
      correct_answer: correctAnswer,
      is_correct: isCorrect,
      time_spent_ms: input.rawTimeSpentMs ?? input.timeSpentMs ?? null,
      hints_used: input.hintsUsed ?? 0,
      explanation_viewed: input.explanationViewed === true,
      answered_at: now,
    },
    { onConflict: "activity_id,student_id,question_index" }
  );

  if (attemptErr) {
    if (isDbSchemaNotReadyError(attemptErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const { data: allAttempts } = await serviceRole
    .from("classroom_activity_attempts")
    .select("question_index, is_correct")
    .eq("activity_id", activityId)
    .eq("student_id", studentId);

  const answered = (allAttempts || []).filter((a) => a.is_correct != null);
  const answersCount = answered.length;
  const correctCount = answered.filter((a) => a.is_correct === true).length;

  await serviceRole
    .from("classroom_activity_student_status")
    .update({
      answers_count: answersCount,
      correct_count: correctCount,
      last_seen_at: now,
      status: "in_progress",
    })
    .eq("id", statusRow.id);

  const explanation =
    question.explanation != null ? String(question.explanation) : undefined;

  const reveal = shouldRevealCorrectAnswerToStudent(row.mode);
  return {
    ok: true,
    isCorrect,
    correctAnswer: reveal ? correctAnswer : undefined,
    explanation: reveal ? explanation : undefined,
    answersCount,
    correctCount,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} activityId
 */
export async function submitStudentActivity(serviceRole, studentId, activityId) {
  const loaded = await loadActivityForStudent(serviceRole, studentId, activityId);
  if (!loaded.ok) return loaded;

  if (loaded.scope === "student") {
    return submitIndividualStudentActivity(serviceRole, studentId, activityId);
  }

  if (loaded.scope === "parent") {
    return submitParentActivity(serviceRole, studentId, activityId);
  }

  const row = loaded.row;
  if (row.status === "closed" || row.status === "archived" || row.status === "draft") {
    return { ok: false, status: 409, code: "activity_not_available" };
  }

  const isExplanationOnlyDiscussion =
    row.mode === "discussion" && row.answer_required === false;

  const { data: statusRow, error } = await serviceRole
    .from("classroom_activity_student_status")
    .select("id, status, answers_count, correct_count")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!statusRow || statusRow.status === "not_started") {
    return { ok: false, status: 400, code: "activity_not_started" };
  }

  if (statusRow.status === "submitted") {
    return { ok: true, alreadySubmitted: true, scorePct: null };
  }

  const scorePct = isExplanationOnlyDiscussion
    ? null
    : row.question_count > 0
      ? Number(((Number(statusRow.correct_count) / row.question_count) * 100).toFixed(2))
      : 0;

  const now = new Date().toISOString();
  await serviceRole
    .from("classroom_activity_student_status")
    .update({
      status: "submitted",
      submitted_at: now,
      score_pct: scorePct,
      last_seen_at: now,
    })
    .eq("id", statusRow.id);

  return {
    ok: true,
    scorePct,
    answersCount: statusRow.answers_count,
    correctCount: statusRow.correct_count,
    questionCount: row.question_count,
    revealAnswers: false,
  };
}

/**
 * Lightweight poll for live_lesson students.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} activityId
 */
export async function getStudentActivityLiveState(serviceRole, studentId, activityId) {
  const loaded = await loadActivityForStudent(serviceRole, studentId, activityId);
  if (!loaded.ok) return loaded;

  return {
    ok: true,
    activityStatus: loaded.row.status,
    currentQuestionIdx: loaded.row.current_question_idx,
    mode: loaded.row.mode,
  };
}
