import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { classifyActivityEvidence } from "../learning/activity-classification.js";
import { resolveCanonicalGradeKey } from "../teacher-portal/teacher-class-grade.js";
import {
  assertStudentActivityQuestionNotAlreadyAnswered,
  loadStudentActivityResumePayload,
} from "../classroom-activities/student-activity-resume.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { gradeAssignedActivityAnswer } from "../../utils/geometry-activity-answer-ui.js";
import {
  extractCorrectAnswerFromQuestion,
  jsonSafeCloneForStorage,
  normalizeActivitySubject,
  normalizeDifficultyLevel,
  shouldRevealCorrectAnswerToStudent,
  validateSameExactQuestionSet,
} from "../classroom-activities/classroom-activities-shared.server.js";
import {
  loadStudentGradeLevelFallback,
  prepareAssignedActivityStudentPlayData,
} from "../classroom-activities/assigned-activity-play-metadata.server.js";
import {
  buildAttemptSnapshotFields,
  buildFrozenActivityInsertFields,
  mapAssignedActivityQuestionAnswerDetail,
  normalizeSnapshotStatus,
  resolveQuestionFromFrozenSet,
  validateAssignedActivityQuestionIndex,
  warnLegacyQuestionKeyMissing,
} from "../classroom-activities/assigned-activity-snapshot.server.js";
import { isActivityPreviewSubjectSupported } from "../classroom-activities/classroom-activities-preview.js";
import { buildAssignedQuestionSnapshotWithEngine } from "../learning/question-engine-metadata.js";
import { buildDiagnosticCanonicalMetadata } from "../learning/diagnostic-canonical-metadata.js";
import { trackServerAnalyticsEvent } from "../analytics/track-event.server.js";
import { assertStudentCanAccessSubject } from "../learning/subject-permissions/subject-access.server.js";
import { resolvePermissionSubjectKey } from "../learning/subject-permissions/subject-key-map.js";

const PARENT_MODES = new Set(["guided_practice", "homework"]);
const MAX_QUESTION_COUNT = 30;

/**
 * @param {Record<string, unknown>} row
 */
export function mapParentActivityRow(row) {
  return {
    activityId: row.id,
    scope: "parent",
    parentId: row.parent_id,
    studentId: row.student_id,
    title: row.title,
    subject: row.subject,
    topic: row.topic,
    subtopic: row.subtopic ?? null,
    skillKey: row.skill_key ?? null,
    difficultyLevel: row.difficulty_level ?? null,
    questionCount: row.question_count,
    mode: row.mode,
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
function normalizeParentActivityMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  return PARENT_MODES.has(mode) ? mode : null;
}

/**
 * @param {Record<string, unknown>} body
 */
export function parseCreateParentActivityBody(body) {
  const title = String(body.title || "").trim();
  if (!title || title.length > 120) {
    return { ok: false, code: "validation_failed", message: "title required (1-120 chars)" };
  }

  const studentId = String(body.studentId || "").trim();
  if (!isUuid(studentId)) {
    return { ok: false, code: "validation_failed", message: "studentId must be a UUID" };
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

  const mode = normalizeParentActivityMode(body.mode);
  if (!mode) {
    return {
      ok: false,
      code: "validation_failed",
      message: "invalid mode (guided_practice or homework only)",
    };
  }

  const questionCount = Number(body.questionCount);
  if (!Number.isFinite(questionCount) || questionCount < 1 || questionCount > MAX_QUESTION_COUNT) {
    return {
      ok: false,
      code: "validation_failed",
      message: `questionCount must be 1-${MAX_QUESTION_COUNT}`,
    };
  }

  const questionSet = body.questionSet;
  const qValidation = validateSameExactQuestionSet(questionSet, questionCount);
  if (!qValidation.ok) {
    return { ok: false, code: qValidation.code, message: qValidation.message };
  }

  const subtopic = body.subtopic != null ? String(body.subtopic).trim().slice(0, 120) : null;
  const skillKey = body.skillKey != null ? String(body.skillKey).trim().slice(0, 120) : null;
  const difficultyLevel = normalizeDifficultyLevel(body.difficultyLevel ?? body.difficulty);
  const gradeLevel = resolveCanonicalGradeKey(body.gradeLevel) || null;
  if (!gradeLevel) {
    return {
      ok: false,
      code: "validation_failed",
      message: "gradeLevel required (g1-g6)",
    };
  }

  let dueAt = null;
  if (body.dueAt != null && body.dueAt !== "") {
    const d = new Date(body.dueAt);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, code: "validation_failed", message: "invalid dueAt" };
    }
    dueAt = d.toISOString();
  }

  return {
    ok: true,
    payload: {
      studentId,
      title,
      subject,
      topic,
      subtopic: subtopic || null,
      skillKey: skillKey || null,
      difficultyLevel,
      gradeLevel,
      questionCount: Math.floor(questionCount),
      mode,
      dueAt,
      questionSet,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentId
 * @param {string} studentId
 */
export async function verifyParentOwnsStudent(serviceRole, parentId, studentId) {
  const { data, error } = await serviceRole
    .from("students")
    .select("id, parent_id, grade_level")
    .eq("id", studentId)
    .eq("parent_id", parentId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data?.id) {
    return { ok: false, status: 403, code: "forbidden", message: "student not linked to parent" };
  }

  return { ok: true, student: data };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentId
 * @param {string} studentId
 * @param {ReturnType<typeof parseCreateParentActivityBody> & { ok: true }} parsed
 */
export async function createParentActivity(serviceRole, parentId, studentId, parsed) {
  const owned = await verifyParentOwnsStudent(serviceRole, parentId, studentId);
  if (!owned.ok) return owned;

  if (parsed.payload.studentId !== studentId) {
    return { ok: false, status: 400, code: "validation_failed", message: "studentId mismatch" };
  }

  const permissionKey = resolvePermissionSubjectKey({
    subject: parsed.payload.subject,
    visualStrand: parsed.payload.visualStrand,
  });
  if (permissionKey) {
    const subjectGate = await assertStudentCanAccessSubject(serviceRole, {
      studentId,
      permissionKey,
      subject: parsed.payload.subject,
      visualStrand: parsed.payload.visualStrand,
    });
    if (!subjectGate.ok) {
      return {
        ok: false,
        status: subjectGate.status || 403,
        code: subjectGate.code || "SUBJECT_LOCKED_BY_PARENT",
        message: subjectGate.message || "יש לפתוח את המקצוע לפני הקצאת פעילות.",
      };
    }
  }

  const { data, error } = await serviceRole
    .from("parent_assigned_activities")
    .insert({
      parent_id: parentId,
      student_id: studentId,
      title: parsed.payload.title,
      subject: parsed.payload.subject,
      topic: parsed.payload.topic,
      subtopic: parsed.payload.subtopic,
      skill_key: parsed.payload.skillKey,
      difficulty_level: parsed.payload.difficultyLevel,
      question_count: parsed.payload.questionCount,
      mode: parsed.payload.mode,
      due_at: parsed.payload.dueAt,
      status: "active",
      activated_at: new Date().toISOString(),
      ...buildFrozenActivityInsertFields(parsed.payload.questionSet, {
        subject: parsed.payload.subject,
        topic: parsed.payload.topic,
        subtopic: parsed.payload.subtopic,
        gradeLevel: parsed.payload.gradeLevel,
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

  const { error: statusErr } = await serviceRole.from("parent_activity_status").insert({
    activity_id: data.id,
    student_id: studentId,
    status: "not_started",
  });

  if (statusErr) {
    if (isDbSchemaNotReadyError(statusErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, activityId: data.id };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentId
 * @param {string} studentId
 */
export async function listParentActivitiesForParent(serviceRole, parentId, studentId) {
  const owned = await verifyParentOwnsStudent(serviceRole, parentId, studentId);
  if (!owned.ok) return owned;

  const { data: activities, error } = await serviceRole
    .from("parent_assigned_activities")
    .select("*")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(100);

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
      .from("parent_activity_status")
      .select(
        "activity_id, status, answers_count, correct_count, score_pct, started_at, submitted_at"
      )
      .eq("student_id", studentId)
      .in("activity_id", activityIds);

    for (const row of statusRows || []) {
      statusByActivity.set(row.activity_id, row);
    }
  }

  return {
    ok: true,
    activities: (activities || []).map((row) => {
      const st = statusByActivity.get(row.id);
      return {
        ...mapParentActivityRow(row),
        studentStatus: st?.status || "not_started",
        answersCount: st?.answers_count ?? 0,
        correctCount: st?.correct_count ?? 0,
        scorePct: st?.score_pct != null ? Number(st.score_pct) : null,
        startedAt: st?.started_at ?? null,
        submittedAt: st?.submitted_at ?? null,
      };
    }),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} parentId
 * @param {string} activityId
 */
export async function getParentActivityDetailForParent(serviceRole, parentId, activityId) {
  if (!isUuid(activityId)) {
    return { ok: false, status: 400, code: "validation_failed", message: "invalid activityId" };
  }

  const { data: row, error } = await serviceRole
    .from("parent_assigned_activities")
    .select("*")
    .eq("id", activityId)
    .eq("parent_id", parentId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!row?.id) {
    return { ok: false, status: 404, code: "activity_not_found" };
  }

  const owned = await verifyParentOwnsStudent(serviceRole, parentId, row.student_id);
  if (!owned.ok) return owned;

  const { data: statusRow, error: statusErr } = await serviceRole
    .from("parent_activity_status")
    .select(
      "status, answers_count, correct_count, score_pct, started_at, submitted_at, last_seen_at"
    )
    .eq("activity_id", activityId)
    .eq("student_id", row.student_id)
    .maybeSingle();

  if (statusErr) {
    if (isDbSchemaNotReadyError(statusErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const { data: attempts, error: attemptsErr } = await serviceRole
    .from("parent_activity_attempts")
    .select(
      "question_index, question_key, is_correct, selected_answer, correct_answer, answered_at, time_spent_ms, hints_used, question_snapshot"
    )
    .eq("activity_id", activityId)
    .eq("student_id", row.student_id)
    .order("question_index", { ascending: true });

  if (attemptsErr) {
    if (isDbSchemaNotReadyError(attemptsErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const questionSet = Array.isArray(row.question_set) ? row.question_set : [];
  const questions = mapAssignedActivityQuestionAnswerDetail({
    questionSet,
    attempts: attempts || [],
    questionCount: row.question_count,
    snapshotStatus: row.snapshot_status,
    subject: row.subject,
    topic: row.topic,
  });

  return {
    ok: true,
    activity: {
      ...mapParentActivityRow(row),
      studentStatus: statusRow?.status || "not_started",
      answersCount: statusRow?.answers_count ?? 0,
      correctCount: statusRow?.correct_count ?? 0,
      scorePct: statusRow?.score_pct != null ? Number(statusRow.score_pct) : null,
      startedAt: statusRow?.started_at ?? null,
      submittedAt: statusRow?.submitted_at ?? null,
      lastSeenAt: statusRow?.last_seen_at ?? null,
      snapshotStatus: normalizeSnapshotStatus(row.snapshot_status),
    },
    attempts: (attempts || []).map((attempt) => ({
      questionIndex: attempt.question_index,
      questionKey: attempt.question_key ?? null,
      isCorrect: attempt.is_correct,
      selectedAnswer: attempt.selected_answer,
      correctAnswer: attempt.correct_answer,
      answeredAt: attempt.answered_at,
      timeSpentMs: attempt.time_spent_ms,
      hintsUsed: attempt.hints_used ?? 0,
    })),
    questions,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 */
export async function listParentActivitiesForStudent(serviceRole, studentId) {
  const { data: activities, error } = await serviceRole
    .from("parent_assigned_activities")
    .select("id, title, mode, question_count, status, due_at, activated_at")
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
      .from("parent_activity_status")
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
        (st.status === "submitted" || Number(st.answers_count) > 0)
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
        scope: "parent",
        title: a.title,
        mode: a.mode,
        questionCount: a.question_count,
        timeLimitSeconds: null,
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

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} activityId
 */
export async function loadParentActivityForStudent(serviceRole, studentId, activityId) {
  if (!isUuid(activityId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("parent_assigned_activities")
    .select("*")
    .eq("id", activityId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data || data.student_id !== studentId) {
    return { ok: false, status: 404, code: "activity_not_found" };
  }

  const studentGradeFallback = await loadStudentGradeLevelFallback(serviceRole, studentId);

  return { ok: true, scope: "parent", row: data, studentGradeFallback };
}

/**
 * @param {Record<string, unknown>} row
 */
function isParentActivityAcceptingAnswers(row) {
  if (row.status === "closed" || row.status === "archived") {
    return false;
  }
  if (row.mode === "homework" && row.due_at) {
    const due = new Date(row.due_at).getTime();
    if (Number.isFinite(due) && Date.now() > due) {
      return false;
    }
  }
  return row.status === "active";
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} activityId
 */
export async function startParentActivity(serviceRole, studentId, activityId) {
  const loaded = await loadParentActivityForStudent(serviceRole, studentId, activityId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  if (row.status !== "active") {
    return { ok: false, status: 409, code: "activity_not_available" };
  }

  const now = new Date().toISOString();

  const { data: existingStatus, error: existingErr } = await serviceRole
    .from("parent_activity_status")
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
  const studentGradeFallback = loaded.studentGradeFallback ?? null;
  const { activity: activityPayload, questionSet: enrichedQuestionSet } =
    prepareAssignedActivityStudentPlayData(row, rawQuestionSet, "parent", studentGradeFallback);

  if (existingStatus?.status === "submitted") {
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
    const { data, error: insertErr } = await serviceRole
      .from("parent_activity_status")
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
      .from("parent_activity_status")
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
      .from("parent_activity_status")
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
      "parent",
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

  void trackServerAnalyticsEvent(serviceRole, {
    eventName: "personal_activity_started",
    actorType: "student",
    actorId: studentId,
    parentId: row.parent_id,
    studentId,
    subject: row.subject,
    topic: row.topic,
    grade: loaded.studentGradeFallback ?? null,
    objectType: "parent_assigned_activity",
    objectId: activityId,
    idempotencyKey: `personal_activity_started:${activityId}:${studentId}`,
    metadata: { mode: row.mode },
  });

  return {
    ok: true,
    scope: "parent",
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
export async function recordParentActivityAnswer(serviceRole, studentId, activityId, input) {
  const loaded = await loadParentActivityForStudent(serviceRole, studentId, activityId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  if (!isParentActivityAcceptingAnswers(row)) {
    return { ok: false, status: 409, code: "activity_not_accepting_answers" };
  }

  const questionIndex = Math.floor(Number(input.questionIndex));
  const qSet = Array.isArray(row.question_set) ? row.question_set : [];
  const indexValidation = validateAssignedActivityQuestionIndex(
    questionIndex,
    row.question_count,
    qSet
  );
  if (!indexValidation.ok) return indexValidation;

  const { data: statusRow, error: statusLookupErr } = await serviceRole
    .from("parent_activity_status")
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

  if (statusRow.status === "submitted") {
    return { ok: false, status: 409, code: "already_submitted" };
  }

  const question = resolveQuestionFromFrozenSet(qSet, questionIndex);
  if (!question) {
    return { ok: false, status: 500, code: "question_missing" };
  }

  const correctAnswer = extractCorrectAnswerFromQuestion(question);
  if (!correctAnswer) {
    return { ok: false, status: 500, code: "question_missing_answer" };
  }

  const duplicateGuard = await assertStudentActivityQuestionNotAlreadyAnswered(
    serviceRole,
    "parent",
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
    warnLegacyQuestionKeyMissing("parent", activityId, questionIndex);
  }

  const classification = classifyActivityEvidence(
    row.mode,
    "assigned_parent",
    {
      afterStepByStep: input.afterStepByStep === true,
      hintsUsed: input.hintsUsed ?? 0,
    }
  );

  const snapshotWithEngine = buildAssignedQuestionSnapshotWithEngine(
    attemptFields.question_snapshot,
    selectedAnswer,
    {
      generatorSource: "parent-assigned-activity",
      afterStepByStep: input.afterStepByStep === true,
      explanationViewed: input.explanationViewed === true,
    }
  );

  const canonicalBundle = buildDiagnosticCanonicalMetadata({
    subject: row.subject,
    topic: row.topic,
    contentGradeKey: snapshotWithEngine.grade || loaded.studentGradeFallback,
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

  const { error: attemptErr } = await serviceRole.from("parent_activity_attempts").upsert(
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
    .from("parent_activity_attempts")
    .select("question_index, is_correct")
    .eq("activity_id", activityId)
    .eq("student_id", studentId);

  const answered = (allAttempts || []).filter((a) => a.is_correct != null);
  const answersCount = answered.length;
  const correctCount = answered.filter((a) => a.is_correct === true).length;

  await serviceRole
    .from("parent_activity_status")
    .update({
      answers_count: answersCount,
      correct_count: correctCount,
      last_seen_at: now,
      status: "in_progress",
    })
    .eq("id", statusRow.id);

  const explanation =
    question.explanation != null ? String(question.explanation) : undefined;

  void trackServerAnalyticsEvent(serviceRole, {
    eventName: "question_answered",
    actorType: "student",
    actorId: studentId,
    parentId: row.parent_id,
    studentId,
    subject: row.subject,
    topic: row.topic,
    grade: loaded.studentGradeFallback ?? null,
    objectType: "parent_activity_attempt",
    objectId: `${activityId}:${questionIndex}`,
    idempotencyKey: `question_answered:parent_activity:${activityId}:${studentId}:${questionIndex}`,
    metadata: {
      isCorrect,
      sourceType: "parent_assigned_activity",
    },
  });
  if (input.explanationViewed === true) {
    void trackServerAnalyticsEvent(serviceRole, {
      eventName: "explanation_opened",
      actorType: "student",
      actorId: studentId,
      parentId: row.parent_id,
      studentId,
      subject: row.subject,
      topic: row.topic,
      grade: loaded.studentGradeFallback ?? null,
      objectType: "parent_activity_attempt",
      objectId: `${activityId}:${questionIndex}`,
      idempotencyKey: `explanation_opened:parent_activity:${activityId}:${studentId}:${questionIndex}`,
      metadata: { sourceType: "parent_assigned_activity" },
    });
  }

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
export async function submitParentActivity(serviceRole, studentId, activityId) {
  const loaded = await loadParentActivityForStudent(serviceRole, studentId, activityId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  if (row.status === "closed" || row.status === "archived") {
    return { ok: false, status: 409, code: "activity_not_available" };
  }

  const { data: statusRow, error } = await serviceRole
    .from("parent_activity_status")
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

  const scorePct =
    row.question_count > 0
      ? Number(((Number(statusRow.correct_count) / row.question_count) * 100).toFixed(2))
      : 0;

  const now = new Date().toISOString();
  await serviceRole
    .from("parent_activity_status")
    .update({
      status: "submitted",
      submitted_at: now,
      score_pct: scorePct,
      last_seen_at: now,
    })
    .eq("id", statusRow.id);

  let rewards = null;
  if (Number(statusRow.answers_count) > 0) {
    try {
      const { data: studentRow } = await serviceRole
        .from("students")
        .select("grade_level")
        .eq("id", studentId)
        .maybeSingle();
      const { syncParentActivityCompletionRewards } = await import(
        "../learning-supabase/parent-activity-completion-reward.server.js"
      );
      const rewardSync = await syncParentActivityCompletionRewards(
        serviceRole,
        studentId,
        activityId,
        {
          subject: row.subject ?? null,
          gradeLevel: studentRow?.grade_level ?? null,
        }
      );
      rewards = rewardSync?.rewards ?? null;
    } catch {
      rewards = null;
    }
  }

  void trackServerAnalyticsEvent(serviceRole, {
    eventName: "personal_activity_completed",
    actorType: "student",
    actorId: studentId,
    parentId: row.parent_id,
    studentId,
    subject: row.subject,
    topic: row.topic,
    objectType: "parent_assigned_activity",
    objectId: activityId,
    idempotencyKey: `personal_activity_completed:${activityId}:${studentId}`,
    metadata: {
      scorePct,
      answersCount: statusRow.answers_count,
      correctCount: statusRow.correct_count,
    },
  });
  const coinsAwarded = Number(rewards?.coins?.amount || rewards?.coins?.coinsAwarded || 0);
  if (rewards?.coins?.ok && coinsAwarded > 0 && rewards.coins.duplicate !== true) {
    void trackServerAnalyticsEvent(serviceRole, {
      eventName: "reward_earned",
      actorType: "student",
      actorId: studentId,
      parentId: row.parent_id,
      studentId,
      subject: row.subject,
      topic: row.topic,
      objectType: "parent_assigned_activity",
      objectId: activityId,
      idempotencyKey: `reward_earned:parent_activity:${activityId}:${studentId}`,
      metadata: {
        sourceType: "parent_assigned_activity",
        coinsAwarded,
      },
    });
  }

  return {
    ok: true,
    scorePct,
    answersCount: statusRow.answers_count,
    correctCount: statusRow.correct_count,
    questionCount: row.question_count,
    revealAnswers: false,
    rewards,
  };
}
