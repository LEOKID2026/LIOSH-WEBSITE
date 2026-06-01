import { isUuid } from "../teacher-server/teacher-request.server.js";
import {
  loadStudentWorksheetAssignmentIds,
  resolveWorksheetAssignmentScope,
  studentHasWorksheetAssignment,
} from "./worksheet-assignments.server.js";
import {
  computeAutoScorePct,
  gradeWorksheetAnswer,
  submissionRequiresTeacherReview,
} from "./worksheet-grading.server.js";
import { createWorksheetSignedUrl } from "./worksheet-storage.server.js";
import {
  mapWorksheetActivityRow,
  mapWorksheetQuestionRow,
  mapWorksheetStudentStatusRow,
  worksheetDbError,
} from "./worksheet-shared.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 */
async function loadStudentClassIds(serviceRole, studentId) {
  const { data, error } = await serviceRole
    .from("teacher_class_students")
    .select("class_id")
    .eq("student_id", studentId);

  if (error) return worksheetDbError(error);
  return { ok: true, classIds: [...new Set((data || []).map((r) => r.class_id))] };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} worksheetId
 */
export async function loadStudentWorksheetAccess(serviceRole, studentId, worksheetId) {
  if (!isUuid(worksheetId)) return { ok: false, status: 400, code: "validation_failed" };

  const { data: activity, error } = await serviceRole
    .from("worksheet_activities")
    .select("*")
    .eq("id", worksheetId)
    .eq("status", "active")
    .maybeSingle();

  if (error) return worksheetDbError(error);
  if (!activity) return { ok: false, status: 404, code: "worksheet_not_found" };

  const assignmentScope = resolveWorksheetAssignmentScope(activity);

  if (assignmentScope === "selected_students") {
    const assigned = await studentHasWorksheetAssignment(serviceRole, studentId, worksheetId);
    if (!assigned.ok) return assigned;
    if (!assigned.assigned) {
      return { ok: false, status: 403, code: "forbidden" };
    }
    return { ok: true, row: activity };
  }

  const classes = await loadStudentClassIds(serviceRole, studentId);
  if (!classes.ok) return classes;
  if (!classes.classIds.includes(activity.class_id)) {
    return { ok: false, status: 403, code: "forbidden" };
  }

  return { ok: true, row: activity };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 */
export async function listStudentWorksheets(serviceRole, studentId) {
  const classes = await loadStudentClassIds(serviceRole, studentId);
  if (!classes.ok) return classes;

  const assignments = await loadStudentWorksheetAssignmentIds(serviceRole, studentId);
  if (!assignments.ok) return assignments;

  /** @type {Record<string, unknown>[]} */
  let activities = [];

  if (classes.classIds.length) {
    const { data, error } = await serviceRole
      .from("worksheet_activities")
      .select("*")
      .in("class_id", classes.classIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) return worksheetDbError(error);
    activities = data || [];
  }

  if (assignments.worksheetIds.length) {
    const { data, error } = await serviceRole
      .from("worksheet_activities")
      .select("*")
      .in("id", assignments.worksheetIds)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) return worksheetDbError(error);

    const byId = new Map(activities.map((row) => [row.id, row]));
    for (const row of data || []) {
      if (row?.id && !byId.has(row.id)) {
        byId.set(row.id, row);
      }
    }
    activities = [...byId.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  const ids = activities.map((r) => r.id);
  if (!ids.length) return { ok: true, worksheets: [] };

  const { data: statuses, error: stError } = await serviceRole
    .from("worksheet_student_status")
    .select("*")
    .eq("student_id", studentId)
    .in("worksheet_activity_id", ids);

  if (stError) return worksheetDbError(stError);

  const statusMap = new Map((statuses || []).map((s) => [s.worksheet_activity_id, s]));

  const worksheets = activities.map((row) => {
    const mapped = mapWorksheetActivityRow(row);
    const st = statusMap.get(row.id);
    const studentStatus = st ? mapWorksheetStudentStatusRow(st) : null;
    return {
      ...mapped,
      studentStatus,
      canMarkComplete:
        mapped.worksheetMode === "pdf_only" &&
        (!studentStatus || !studentStatus.markedCompletedAt),
      canSubmitAnswers:
        mapped.worksheetMode !== "pdf_only" &&
        (!studentStatus?.digitalSubmittedAt),
      displayScore:
        studentStatus?.gradingStatus === "published" ? studentStatus.finalScorePct : null,
    };
  });

  return { ok: true, worksheets };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} worksheetId
 */
export async function getStudentWorksheetDetail(serviceRole, studentId, worksheetId) {
  const access = await loadStudentWorksheetAccess(serviceRole, studentId, worksheetId);
  if (!access.ok) return access;

  const { data: questions, error: qError } = await serviceRole
    .from("worksheet_questions")
    .select("question_index, question_type, points, choices")
    .eq("worksheet_activity_id", worksheetId)
    .order("question_index", { ascending: true });

  if (qError) return worksheetDbError(qError);

  const { data: statusRow } = await serviceRole
    .from("worksheet_student_status")
    .select("*")
    .eq("worksheet_activity_id", worksheetId)
    .eq("student_id", studentId)
    .maybeSingle();

  const worksheet = mapWorksheetActivityRow(access.row);
  const studentStatus = statusRow ? mapWorksheetStudentStatusRow(statusRow) : null;

  const questionsForStudent = (questions || []).map((q) => ({
    questionIndex: q.question_index,
    questionType: q.question_type,
    points: q.points != null ? Number(q.points) : null,
    choices: q.choices ?? null,
  }));

  return {
    ok: true,
    worksheet,
    questions: questionsForStudent,
    studentStatus,
    displayScore:
      studentStatus?.gradingStatus === "published" ? studentStatus.finalScorePct : null,
    waitingForTeacher:
      studentStatus != null &&
      studentStatus.gradingStatus !== "published" &&
      studentStatus.gradingStatus !== "not_submitted" &&
      (studentStatus.digitalSubmittedAt != null || studentStatus.markedCompletedAt != null),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} worksheetId
 * @param {'worksheet'|'answer_key'} [fileRole]
 */
export async function recordStudentPdfOpenAndGetUrl(
  serviceRole,
  studentId,
  worksheetId,
  fileRole = "worksheet"
) {
  if (fileRole !== "worksheet") {
    return { ok: false, status: 403, code: "forbidden" };
  }

  const access = await loadStudentWorksheetAccess(serviceRole, studentId, worksheetId);
  if (!access.ok) return access;

  const { data: file, error: fError } = await serviceRole
    .from("worksheet_files")
    .select("storage_path")
    .eq("worksheet_activity_id", worksheetId)
    .eq("file_role", "worksheet")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fError) return worksheetDbError(fError);
  if (!file) return { ok: false, status: 404, code: "worksheet_pdf_not_found" };

  const now = new Date().toISOString();
  const { data: existing } = await serviceRole
    .from("worksheet_student_status")
    .select("pdf_open_count, pdf_first_opened_at")
    .eq("worksheet_activity_id", worksheetId)
    .eq("student_id", studentId)
    .maybeSingle();

  const openCount = (existing?.pdf_open_count ?? 0) + 1;
  await serviceRole.from("worksheet_student_status").upsert(
    {
      worksheet_activity_id: worksheetId,
      student_id: studentId,
      pdf_first_opened_at: existing?.pdf_first_opened_at || now,
      pdf_last_opened_at: now,
      pdf_open_count: openCount,
      updated_at: now,
    },
    { onConflict: "worksheet_activity_id,student_id" }
  );

  const signed = await createWorksheetSignedUrl(serviceRole, file.storage_path, "student");
  if (!signed.ok) return signed;

  return { ok: true, signedUrl: signed.signedUrl, expiresIn: signed.expiresIn };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} worksheetId
 */
export async function markStudentWorksheetComplete(serviceRole, studentId, worksheetId) {
  const access = await loadStudentWorksheetAccess(serviceRole, studentId, worksheetId);
  if (!access.ok) return access;

  if (access.row.worksheet_mode !== "pdf_only") {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: existing } = await serviceRole
    .from("worksheet_student_status")
    .select("marked_completed_at")
    .eq("worksheet_activity_id", worksheetId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing?.marked_completed_at) {
    return { ok: false, status: 409, code: "already_completed" };
  }

  const now = new Date().toISOString();
  const { error } = await serviceRole.from("worksheet_student_status").upsert(
    {
      worksheet_activity_id: worksheetId,
      student_id: studentId,
      marked_completed_at: now,
      grading_status: "submitted",
      updated_at: now,
    },
    { onConflict: "worksheet_activity_id,student_id" }
  );

  if (error) return worksheetDbError(error);
  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 * @param {string} worksheetId
 * @param {Array<{ questionIndex: number, answerValue: unknown }>} answers
 */
export async function submitStudentWorksheetAnswers(serviceRole, studentId, worksheetId, answers) {
  const access = await loadStudentWorksheetAccess(serviceRole, studentId, worksheetId);
  if (!access.ok) return access;

  if (access.row.worksheet_mode === "pdf_only") {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: existingStatus } = await serviceRole
    .from("worksheet_student_status")
    .select("digital_submitted_at")
    .eq("worksheet_activity_id", worksheetId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existingStatus?.digital_submitted_at) {
    return { ok: false, status: 409, code: "already_submitted" };
  }

  const { data: questions, error: qError } = await serviceRole
    .from("worksheet_questions")
    .select("*")
    .eq("worksheet_activity_id", worksheetId)
    .order("question_index", { ascending: true });

  if (qError) return worksheetDbError(qError);
  const questionRows = (questions || []).map(mapWorksheetQuestionRow);

  if (!questionRows.length) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const now = new Date().toISOString();
  /** @type {Array<Record<string, unknown>>} */
  const gradedAnswers = [];

  for (const q of questionRows) {
    const submitted = answers.find((a) => Number(a.questionIndex) === q.questionIndex);
    const answerValue = submitted?.answerValue ?? submitted?.answer_value ?? null;
    const graded = gradeWorksheetAnswer(answerValue, q.correctAnswer, q.questionType);
    const pts = q.points != null && q.points > 0 ? q.points : 1;
    const autoScore =
      graded.autoIsCorrect === true ? pts : graded.autoIsCorrect === false ? 0 : null;

    const questionSnapshot = {
      questionIndex: q.questionIndex,
      questionType: q.questionType,
      choices: q.choices,
      correctAnswer: q.correctAnswer,
      points: q.points,
      isAutoGradable: q.isAutoGradable,
    };

    const { error } = await serviceRole.from("worksheet_student_answers").upsert(
      {
        worksheet_activity_id: worksheetId,
        student_id: studentId,
        question_index: q.questionIndex,
        answer_value: answerValue,
        question_snapshot: questionSnapshot,
        submitted_at: now,
        auto_is_correct: graded.autoIsCorrect,
        auto_score: autoScore,
        updated_at: now,
      },
      { onConflict: "worksheet_activity_id,student_id,question_index" }
    );
    if (error) return worksheetDbError(error);

    gradedAnswers.push({
      questionIndex: q.questionIndex,
      answerValue,
      autoIsCorrect: graded.autoIsCorrect,
      autoScore,
      teacherScore: null,
      teacherOverride: false,
    });
  }

  const autoScorePct = computeAutoScorePct(questionRows, gradedAnswers);
  const needsReview = submissionRequiresTeacherReview(questionRows);
  const gradingStatus = needsReview ? "pending_review" : "submitted";

  const { error: statusError } = await serviceRole.from("worksheet_student_status").upsert(
    {
      worksheet_activity_id: worksheetId,
      student_id: studentId,
      digital_submitted_at: now,
      grading_status: gradingStatus,
      auto_score_pct: autoScorePct,
      updated_at: now,
    },
    { onConflict: "worksheet_activity_id,student_id" }
  );

  if (statusError) return worksheetDbError(statusError);

  return { ok: true, gradingStatus, hasManualQuestions: needsReview };
}
