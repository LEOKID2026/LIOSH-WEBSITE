import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { classifyActivityEvidence } from "../learning/activity-classification.js";
import { isUuid } from "./teacher-request.server.js";
import { gradeAssignedActivityAnswer } from "../../utils/geometry-activity-answer-ui.js";
import {
  extractCorrectAnswerFromQuestion,
  shouldRevealCorrectAnswerToStudent,
} from "../classroom-activities/classroom-activities-shared.server.js";
import {
  buildAttemptSnapshotFields,
  resolveQuestionFromFrozenSet,
  validateAssignedActivityQuestionIndex,
  warnLegacyQuestionKeyMissing,
} from "../classroom-activities/assigned-activity-snapshot.server.js";
import {
  assertStudentActivityQuestionNotAlreadyAnswered,
  loadStudentActivityResumePayload,
} from "../classroom-activities/student-activity-resume.server.js";
import {
  loadStudentGradeLevelFallback,
  prepareAssignedActivityStudentPlayData,
} from "../classroom-activities/assigned-activity-play-metadata.server.js";
import { buildAssignedQuestionSnapshotWithEngine } from "../learning/question-engine-metadata.js";
import { buildDiagnosticCanonicalMetadata } from "../learning/diagnostic-canonical-metadata.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} activityId
 */
export async function loadIndividualActivityForStudent(serviceRole, studentId, activityId) {
  if (!isUuid(activityId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("student_activities")
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

  return { ok: true, scope: "student", row: data };
}

/**
 * @param {Record<string, unknown>} row
 */
function isIndividualActivityAcceptingAnswers(row) {
  if (row.status === "closed" || row.status === "archived" || row.status === "draft") {
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
export async function startIndividualStudentActivity(serviceRole, studentId, activityId) {
  const loaded = await loadIndividualActivityForStudent(serviceRole, studentId, activityId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  if (row.status !== "active") {
    return { ok: false, status: 409, code: "activity_not_available" };
  }

  const now = new Date().toISOString();

  const { data: existingStatus, error: existingErr } = await serviceRole
    .from("student_activity_status")
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
  const { activity: activityPayload, questionSet } = prepareAssignedActivityStudentPlayData(
    row,
    rawQuestionSet,
    "student",
    studentGradeFallback
  );

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
    const { data, error: insertErr } = await serviceRole
      .from("student_activity_status")
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
      .from("student_activity_status")
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
      .from("student_activity_status")
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
      "student",
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
    questionSet,
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
export async function recordIndividualStudentActivityAnswer(
  serviceRole,
  studentId,
  activityId,
  input
) {
  const loaded = await loadIndividualActivityForStudent(serviceRole, studentId, activityId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  if (!isIndividualActivityAcceptingAnswers(row)) {
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
    .from("student_activity_status")
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
    "student",
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
    warnLegacyQuestionKeyMissing("student", activityId, questionIndex);
  }

  const studentGradeFallback = await loadStudentGradeLevelFallback(serviceRole, studentId);

  const classification = classifyActivityEvidence(
    row.mode,
    "assigned_individual",
    {
      afterStepByStep: input.afterStepByStep === true,
      hintsUsed: input.hintsUsed ?? 0,
    }
  );

  const snapshotWithEngine = buildAssignedQuestionSnapshotWithEngine(
    attemptFields.question_snapshot,
    selectedAnswer,
    {
      generatorSource: "student-assigned-activity",
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

  const { error: attemptErr } = await serviceRole.from("student_activity_attempts").upsert(
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
    .from("student_activity_attempts")
    .select("question_index, is_correct")
    .eq("activity_id", activityId)
    .eq("student_id", studentId);

  const answered = (allAttempts || []).filter((a) => a.is_correct != null);
  const answersCount = answered.length;
  const correctCount = answered.filter((a) => a.is_correct === true).length;

  await serviceRole
    .from("student_activity_status")
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
export async function submitIndividualStudentActivity(serviceRole, studentId, activityId) {
  const loaded = await loadIndividualActivityForStudent(serviceRole, studentId, activityId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  if (row.status === "closed" || row.status === "archived" || row.status === "draft") {
    return { ok: false, status: 409, code: "activity_not_available" };
  }

  const { data: statusRow, error } = await serviceRole
    .from("student_activity_status")
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
    .from("student_activity_status")
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
