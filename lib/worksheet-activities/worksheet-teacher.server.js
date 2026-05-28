import { loadClassMembers, loadTeacherClassOwned } from "../teacher-server/teacher-classes.server.js";
import { maskStudentFullName } from "../teacher-server/teacher-students.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import {
  createDirectAssignments,
  ensureStudentStatusRowsForAssignments,
  parseStudentIdsArray,
  resolveWorksheetAssignmentScope,
  validateTeacherStudentLinks,
} from "./worksheet-assignments.server.js";
import {
  computeAutoScorePct,
  computeFinalScorePct,
  gradeWorksheetAnswer,
  submissionRequiresTeacherReview,
} from "./worksheet-grading.server.js";
import {
  buildWorksheetStoragePath,
  createWorksheetSignedUrl,
  uploadWorksheetPdf,
  validatePdfBuffer,
} from "./worksheet-storage.server.js";
import {
  isQuestionTypeAutoGradable,
  mapWorksheetActivityRow,
  mapWorksheetFileRow,
  mapWorksheetQuestionRow,
  mapWorksheetStudentStatusRow,
  normalizeActivitySubject,
  normalizeQuestionType,
  normalizeWorksheetMode,
  normalizeWorksheetStatus,
  worksheetDbError,
} from "./worksheet-shared.server.js";
import { buildWorksheetActivityReport } from "./worksheet-report.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 */
export async function loadTeacherWorksheetOwned(serviceRole, teacherId, worksheetId) {
  if (!isUuid(worksheetId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("worksheet_activities")
    .select("*")
    .eq("id", worksheetId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) return worksheetDbError(error);
  if (!data) return { ok: false, status: 404, code: "worksheet_not_found" };
  return { ok: true, row: data };
}

/**
 * @param {unknown} body
 */
export function parseCreateWorksheetBody(body) {
  const classId = String(body?.classId || body?.class_id || "").trim();
  const studentIds = parseStudentIdsArray(body?.studentIds ?? body?.student_ids);
  const hasClassId = isUuid(classId);
  const hasStudentIds = Boolean(studentIds?.length);

  if (hasClassId && hasStudentIds) {
    return { ok: false, status: 400, code: "validation_failed", message: "classId and studentIds are mutually exclusive" };
  }
  if (!hasClassId && !hasStudentIds) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const title = String(body?.title || "").trim();
  const subject = normalizeActivitySubject(body?.subject);
  const worksheetMode = normalizeWorksheetMode(body?.worksheetMode ?? body?.worksheet_mode);
  const instructions =
    body?.instructions != null && String(body.instructions).trim()
      ? String(body.instructions).trim()
      : null;
  const physicalDueAt = body?.physicalDueAt ?? body?.physical_due_at ?? null;
  const questionCountRaw = body?.questionCount ?? body?.question_count;

  if (!title || title.length > 120 || !subject || !worksheetMode) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  let questionCount = null;
  if (questionCountRaw != null && questionCountRaw !== "") {
    const n = Number(questionCountRaw);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return { ok: false, status: 400, code: "validation_failed" };
    }
    questionCount = n;
  }

  if (worksheetMode !== "pdf_only" && questionCount == null) {
    return { ok: false, status: 400, code: "validation_failed", message: "questionCount required" };
  }

  const common = {
    title,
    subject,
    instructions,
    worksheetMode,
    questionCount,
    physicalDueAt: physicalDueAt ? String(physicalDueAt) : null,
  };

  if (hasStudentIds) {
    return {
      ok: true,
      scope: "selected_students",
      payload: {
        ...common,
        studentIds,
      },
    };
  }

  return {
    ok: true,
    scope: "class",
    payload: {
      ...common,
      classId,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ classId: string, title: string, subject: string, instructions: string|null, worksheetMode: string, questionCount: number|null, physicalDueAt: string|null }} payload
 * @param {{ schoolId?: string|null }} [opts]
 */
export async function createWorksheetActivity(serviceRole, teacherId, payload, opts = {}) {
  const scope = payload.scope || (payload.studentIds?.length ? "selected_students" : "class");

  if (scope === "selected_students") {
    const validated = await validateTeacherStudentLinks(serviceRole, teacherId, payload.studentIds);
    if (!validated.ok) return validated;

    const now = new Date().toISOString();
    const { data, error } = await serviceRole
      .from("worksheet_activities")
      .insert({
        teacher_id: teacherId,
        class_id: null,
        school_id: null,
        assignment_scope: "selected_students",
        title: payload.title,
        subject: payload.subject,
        instructions: payload.instructions,
        worksheet_mode: payload.worksheetMode,
        question_count: payload.questionCount,
        physical_due_at: payload.physicalDueAt,
        status: "draft",
        updated_at: now,
      })
      .select("id")
      .single();

    if (error) return worksheetDbError(error);

    const assigned = await createDirectAssignments(serviceRole, data.id, validated.studentIds);
    if (!assigned.ok) return assigned;

    return { ok: true, worksheetId: data.id, scope: "selected_students" };
  }

  const owned = await loadTeacherClassOwned(serviceRole, teacherId, payload.classId);
  if (!owned.ok) return owned;

  const now = new Date().toISOString();
  const { data, error } = await serviceRole
    .from("worksheet_activities")
    .insert({
      teacher_id: teacherId,
      class_id: payload.classId,
      school_id: opts.schoolId ?? owned.row.school_id ?? null,
      assignment_scope: "class",
      title: payload.title,
      subject: payload.subject,
      instructions: payload.instructions,
      worksheet_mode: payload.worksheetMode,
      question_count: payload.questionCount,
      physical_due_at: payload.physicalDueAt,
      status: "draft",
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) return worksheetDbError(error);
  return { ok: true, worksheetId: data.id, scope: "class" };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ classId?: string, status?: string, includeArchived?: boolean }} filters
 */
export async function listTeacherWorksheets(serviceRole, teacherId, filters = {}) {
  let query = serviceRole
    .from("worksheet_activities")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (filters.classId) {
    if (!isUuid(filters.classId)) return { ok: false, status: 400, code: "validation_failed" };
    query = query.eq("class_id", filters.classId);
  }
  if (filters.status) {
    const st = normalizeWorksheetStatus(filters.status);
    if (!st) return { ok: false, status: 400, code: "validation_failed" };
    query = query.eq("status", st);
  } else if (!filters.includeArchived) {
    query = query.neq("status", "archived");
  }

  const { data, error } = await query;
  if (error) return worksheetDbError(error);

  return { ok: true, worksheets: (data || []).map(mapWorksheetActivityRow) };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 */
export async function getTeacherWorksheetDetail(serviceRole, teacherId, worksheetId) {
  const loaded = await loadTeacherWorksheetOwned(serviceRole, teacherId, worksheetId);
  if (!loaded.ok) return loaded;

  const [filesRes, questionsRes] = await Promise.all([
    serviceRole
      .from("worksheet_files")
      .select("*")
      .eq("worksheet_activity_id", worksheetId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true }),
    serviceRole
      .from("worksheet_questions")
      .select("*")
      .eq("worksheet_activity_id", worksheetId)
      .order("question_index", { ascending: true }),
  ]);

  if (filesRes.error) return worksheetDbError(filesRes.error);
  if (questionsRes.error) return worksheetDbError(questionsRes.error);

  return {
    ok: true,
    worksheet: mapWorksheetActivityRow(loaded.row),
    files: (filesRes.data || []).map(mapWorksheetFileRow),
    questions: (questionsRes.data || []).map(mapWorksheetQuestionRow),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 * @param {Record<string, unknown>} patch
 */
export async function patchWorksheetActivity(serviceRole, teacherId, worksheetId, patch) {
  const loaded = await loadTeacherWorksheetOwned(serviceRole, teacherId, worksheetId);
  if (!loaded.ok) return loaded;
  if (loaded.row.status === "archived") {
    return { ok: false, status: 409, code: "worksheet_archived" };
  }

  /** @type {Record<string, unknown>} */
  const updates = { updated_at: new Date().toISOString() };

  if (patch.title != null) {
    const title = String(patch.title).trim();
    if (!title || title.length > 120) return { ok: false, status: 400, code: "validation_failed" };
    updates.title = title;
  }
  if (patch.instructions !== undefined) {
    const ins = patch.instructions == null ? null : String(patch.instructions).trim();
    if (ins && ins.length > 1000) return { ok: false, status: 400, code: "validation_failed" };
    updates.instructions = ins || null;
  }
  if (patch.physicalDueAt !== undefined || patch.physical_due_at !== undefined) {
    const due = patch.physicalDueAt ?? patch.physical_due_at;
    updates.physical_due_at = due == null || due === "" ? null : String(due);
  }
  if (patch.questionCount != null || patch.question_count != null) {
    const n = Number(patch.questionCount ?? patch.question_count);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return { ok: false, status: 400, code: "validation_failed" };
    }
    updates.question_count = n;
  }

  const { error } = await serviceRole
    .from("worksheet_activities")
    .update(updates)
    .eq("id", worksheetId)
    .eq("teacher_id", teacherId);

  if (error) return worksheetDbError(error);
  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 */
export async function archiveWorksheetActivity(serviceRole, teacherId, worksheetId) {
  const loaded = await loadTeacherWorksheetOwned(serviceRole, teacherId, worksheetId);
  if (!loaded.ok) return loaded;

  const now = new Date().toISOString();
  const { error } = await serviceRole
    .from("worksheet_activities")
    .update({ status: "archived", archived_at: now, updated_at: now })
    .eq("id", worksheetId)
    .eq("teacher_id", teacherId);

  if (error) return worksheetDbError(error);

  await serviceRole
    .from("worksheet_files")
    .update({ is_deleted: true, deleted_at: now })
    .eq("worksheet_activity_id", worksheetId)
    .eq("is_deleted", false);

  return { ok: true, status: "archived" };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} classId
 */
async function ensureStudentStatusRowsForClass(serviceRole, worksheetId, classId) {
  const members = await loadClassMembers(serviceRole, classId);
  if (!members.ok) return members;

  const rows = (members.members || []).map((m) => ({
    worksheet_activity_id: worksheetId,
    student_id: m.studentId,
    grading_status: "not_submitted",
  }));

  if (!rows.length) return { ok: true };

  const { error } = await serviceRole.from("worksheet_student_status").upsert(rows, {
    onConflict: "worksheet_activity_id,student_id",
    ignoreDuplicates: true,
  });

  if (error) return worksheetDbError(error);
  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 */
async function hasActiveWorksheetPdf(serviceRole, worksheetId) {
  const { count, error } = await serviceRole
    .from("worksheet_files")
    .select("id", { count: "exact", head: true })
    .eq("worksheet_activity_id", worksheetId)
    .eq("file_role", "worksheet")
    .eq("is_deleted", false);

  if (error) return worksheetDbError(error);
  return { ok: true, hasFile: (count ?? 0) > 0 };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 * @param {'activate'|'close'|'archive'} action
 */
export async function transitionWorksheetStatus(serviceRole, teacherId, worksheetId, action) {
  const loaded = await loadTeacherWorksheetOwned(serviceRole, teacherId, worksheetId);
  if (!loaded.ok) return loaded;

  const current = loaded.row.status;
  const now = new Date().toISOString();
  /** @type {Record<string, unknown>} */
  const updates = { updated_at: now };

  if (action === "activate") {
    if (current !== "draft" && current !== "closed") {
      return { ok: false, status: 409, code: "invalid_status_transition" };
    }
    const pdfCheck = await hasActiveWorksheetPdf(serviceRole, worksheetId);
    if (!pdfCheck.ok) return pdfCheck;
    if (!pdfCheck.hasFile) {
      return { ok: false, status: 400, code: "worksheet_pdf_required" };
    }
    updates.status = "active";
    updates.activated_at = now;
    updates.closed_at = null;

    const assignmentScope = resolveWorksheetAssignmentScope(loaded.row);
    const ensure =
      assignmentScope === "selected_students"
        ? await ensureStudentStatusRowsForAssignments(serviceRole, worksheetId)
        : await ensureStudentStatusRowsForClass(serviceRole, worksheetId, loaded.row.class_id);
    if (!ensure.ok) return ensure;
  } else if (action === "close") {
    if (current !== "active") {
      return { ok: false, status: 409, code: "invalid_status_transition" };
    }
    updates.status = "closed";
    updates.closed_at = now;
  } else if (action === "archive") {
    return archiveWorksheetActivity(serviceRole, teacherId, worksheetId);
  } else {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { error } = await serviceRole
    .from("worksheet_activities")
    .update(updates)
    .eq("id", worksheetId)
    .eq("teacher_id", teacherId);

  if (error) return worksheetDbError(error);
  return { ok: true, status: updates.status };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 * @param {{ buffer: Buffer, originalFilename: string, fileRole: string }} upload
 */
export async function uploadWorksheetPdfForActivity(serviceRole, teacherId, worksheetId, upload) {
  const loaded = await loadTeacherWorksheetOwned(serviceRole, teacherId, worksheetId);
  if (!loaded.ok) return loaded;

  const fileRole = upload.fileRole === "answer_key" ? "answer_key" : "worksheet";
  if (!/\.pdf$/i.test(upload.originalFilename)) {
    return { ok: false, status: 400, code: "invalid_pdf" };
  }

  const validation = validatePdfBuffer(upload.buffer);
  if (!validation.ok) {
    return { ok: false, status: 400, code: validation.code };
  }

  const storagePath = buildWorksheetStoragePath(teacherId, worksheetId, fileRole);
  const uploaded = await uploadWorksheetPdf(serviceRole, {
    storagePath,
    buffer: upload.buffer,
  });
  if (!uploaded.ok) return uploaded;

  const now = new Date().toISOString();
  if (fileRole === "worksheet") {
    await serviceRole
      .from("worksheet_files")
      .update({ is_deleted: true, deleted_at: now })
      .eq("worksheet_activity_id", worksheetId)
      .eq("file_role", "worksheet")
      .eq("is_deleted", false);
  }

  const { data, error } = await serviceRole
    .from("worksheet_files")
    .insert({
      worksheet_activity_id: worksheetId,
      teacher_id: teacherId,
      storage_path: storagePath,
      original_filename: upload.originalFilename.slice(0, 255),
      file_size_bytes: upload.buffer.length,
      content_type: "application/pdf",
      file_role: fileRole,
    })
    .select("id, original_filename")
    .single();

  if (error) return worksheetDbError(error);

  if (fileRole === "answer_key") {
    await serviceRole
      .from("worksheet_activities")
      .update({ has_answer_key: true, updated_at: now })
      .eq("id", worksheetId);
  }

  return { ok: true, fileId: data.id, originalFilename: data.original_filename };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 * @param {string} fileId
 */
export async function softDeleteWorksheetFile(serviceRole, teacherId, worksheetId, fileId) {
  const loaded = await loadTeacherWorksheetOwned(serviceRole, teacherId, worksheetId);
  if (!loaded.ok) return loaded;

  const now = new Date().toISOString();
  const { error } = await serviceRole
    .from("worksheet_files")
    .update({ is_deleted: true, deleted_at: now })
    .eq("id", fileId)
    .eq("worksheet_activity_id", worksheetId)
    .eq("teacher_id", teacherId);

  if (error) return worksheetDbError(error);
  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 * @param {Array<Record<string, unknown>>} questions
 */
export async function upsertWorksheetQuestions(serviceRole, teacherId, worksheetId, questions) {
  const loaded = await loadTeacherWorksheetOwned(serviceRole, teacherId, worksheetId);
  if (!loaded.ok) return loaded;

  if (loaded.row.worksheet_mode === "pdf_only") {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (const q of questions) {
    const questionIndex = Number(q.questionIndex ?? q.question_index);
    const questionType = normalizeQuestionType(q.questionType ?? q.question_type);
    if (!Number.isInteger(questionIndex) || questionIndex < 1 || !questionType) {
      return { ok: false, status: 400, code: "validation_failed" };
    }
    const points = q.points != null && q.points !== "" ? Number(q.points) : null;
    if (points != null && (!Number.isFinite(points) || points <= 0)) {
      return { ok: false, status: 400, code: "validation_failed" };
    }
    const autoGradable = isQuestionTypeAutoGradable(questionType);
    rows.push({
      worksheet_activity_id: worksheetId,
      question_index: questionIndex,
      question_type: questionType,
      points,
      choices: q.choices ?? null,
      correct_answer: q.correctAnswer ?? q.correct_answer ?? null,
      is_auto_gradable: autoGradable,
      updated_at: new Date().toISOString(),
    });
  }

  const { error: delError } = await serviceRole
    .from("worksheet_questions")
    .delete()
    .eq("worksheet_activity_id", worksheetId);
  if (delError) return worksheetDbError(delError);

  if (rows.length) {
    const { error } = await serviceRole.from("worksheet_questions").insert(rows);
    if (error) return worksheetDbError(error);
  }

  await recalculateWorksheetAutoGrades(serviceRole, worksheetId);

  const hasKey = rows.some((r) => r.correct_answer != null);
  await serviceRole
    .from("worksheet_activities")
    .update({
      question_count: rows.length || loaded.row.question_count,
      has_answer_key: hasKey,
      updated_at: new Date().toISOString(),
    })
    .eq("id", worksheetId);

  return { ok: true, questionCount: rows.length };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 */
export async function getWorksheetActivityReport(serviceRole, teacherId, worksheetId) {
  const loaded = await loadTeacherWorksheetOwned(serviceRole, teacherId, worksheetId);
  if (!loaded.ok) return loaded;
  return buildWorksheetActivityReport(serviceRole, loaded.row, { maskNames: true });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 * @param {string} studentId
 */
export async function getStudentWorksheetAnswersForTeacher(
  serviceRole,
  teacherId,
  worksheetId,
  studentId
) {
  const loaded = await loadTeacherWorksheetOwned(serviceRole, teacherId, worksheetId);
  if (!loaded.ok) return loaded;
  if (!isUuid(studentId)) return { ok: false, status: 400, code: "validation_failed" };

  const [statusRes, answersRes, questionsRes] = await Promise.all([
    serviceRole
      .from("worksheet_student_status")
      .select("*")
      .eq("worksheet_activity_id", worksheetId)
      .eq("student_id", studentId)
      .maybeSingle(),
    serviceRole
      .from("worksheet_student_answers")
      .select("*")
      .eq("worksheet_activity_id", worksheetId)
      .eq("student_id", studentId)
      .order("question_index", { ascending: true }),
    serviceRole
      .from("worksheet_questions")
      .select("*")
      .eq("worksheet_activity_id", worksheetId)
      .order("question_index", { ascending: true }),
  ]);

  if (statusRes.error) return worksheetDbError(statusRes.error);
  if (answersRes.error) return worksheetDbError(answersRes.error);
  if (questionsRes.error) return worksheetDbError(questionsRes.error);

  return {
    ok: true,
    status: statusRes.data ? mapWorksheetStudentStatusRow(statusRes.data) : null,
    questions: (questionsRes.data || []).map(mapWorksheetQuestionRow),
    answers: (answersRes.data || []).map((row) => ({
      questionIndex: row.question_index,
      answerValue: row.answer_value,
      autoIsCorrect: row.auto_is_correct,
      autoScore: row.auto_score != null ? Number(row.auto_score) : null,
      teacherScore: row.teacher_score != null ? Number(row.teacher_score) : null,
      teacherComment: row.teacher_comment,
      teacherOverride: row.teacher_override === true,
      teacherGradedAt: row.teacher_graded_at,
    })),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 * @param {string} studentId
 * @param {{ grades: Array<Record<string, unknown>>, markChecked?: boolean }} payload
 */
export async function gradeStudentWorksheet(serviceRole, teacherId, worksheetId, studentId, payload) {
  const detail = await getStudentWorksheetAnswersForTeacher(serviceRole, teacherId, worksheetId, studentId);
  if (!detail.ok) return detail;

  const questions = detail.questions || [];
  const now = new Date().toISOString();

  for (const g of payload.grades || []) {
    const questionIndex = Number(g.questionIndex ?? g.question_index);
    if (!Number.isInteger(questionIndex)) continue;

    const teacherScore =
      g.teacherScore != null || g.teacher_score != null
        ? Number(g.teacherScore ?? g.teacher_score)
        : null;
    const teacherComment =
      g.teacherComment != null || g.teacher_comment != null
        ? String(g.teacherComment ?? g.teacher_comment).slice(0, 500)
        : null;
    const teacherOverride = g.teacherOverride === true || g.teacher_override === true;

    const { error } = await serviceRole.from("worksheet_student_answers").upsert(
      {
        worksheet_activity_id: worksheetId,
        student_id: studentId,
        question_index: questionIndex,
        teacher_score: teacherScore,
        teacher_comment: teacherComment,
        teacher_override: teacherOverride,
        teacher_graded_at: now,
        updated_at: now,
      },
      { onConflict: "worksheet_activity_id,student_id,question_index" }
    );
    if (error) return worksheetDbError(error);
  }

  const answersRes = await serviceRole
    .from("worksheet_student_answers")
    .select("*")
    .eq("worksheet_activity_id", worksheetId)
    .eq("student_id", studentId);

  if (answersRes.error) return worksheetDbError(answersRes.error);

  const answerRows = (answersRes.data || []).map((row) => ({
    questionIndex: row.question_index,
    teacherScore: row.teacher_score != null ? Number(row.teacher_score) : null,
    autoIsCorrect: row.auto_is_correct,
    autoScore: row.auto_score != null ? Number(row.auto_score) : null,
    teacherOverride: row.teacher_override === true,
  }));

  const allGraded =
    questions.length > 0 &&
    questions.every((q) => {
      const a = answerRows.find((r) => r.questionIndex === q.questionIndex);
      if (!a) return false;
      if (isQuestionTypeAutoGradable(q.questionType) && q.correctAnswer != null && !a.teacherOverride) {
        return a.autoIsCorrect != null || a.teacherScore != null;
      }
      return a.teacherScore != null;
    });

  const finalScorePct = computeFinalScorePct(questions, answerRows);
  let gradingStatus = "partially_checked";
  if (payload.markChecked && allGraded) {
    gradingStatus = "checked";
  } else if (!payload.markChecked) {
    gradingStatus = "partially_checked";
  }

  const { error: statusError } = await serviceRole.from("worksheet_student_status").upsert(
    {
      worksheet_activity_id: worksheetId,
      student_id: studentId,
      grading_status: gradingStatus,
      final_score_pct: finalScorePct,
      teacher_checked_at: payload.markChecked ? now : null,
      updated_at: now,
    },
    { onConflict: "worksheet_activity_id,student_id" }
  );

  if (statusError) return worksheetDbError(statusError);
  return { ok: true, gradingStatus, finalScorePct, allGraded };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 * @param {string} studentId
 */
export async function publishStudentWorksheetResult(serviceRole, teacherId, worksheetId, studentId) {
  const detail = await getStudentWorksheetAnswersForTeacher(serviceRole, teacherId, worksheetId, studentId);
  if (!detail.ok) return detail;

  const questions = detail.questions || [];
  const answers = detail.answers || [];

  const allGraded =
    questions.length === 0 ||
    questions.every((q) => {
      const a = answers.find((r) => r.questionIndex === q.questionIndex);
      if (!a) return false;
      if (isQuestionTypeAutoGradable(q.questionType) && q.correctAnswer != null && !a.teacherOverride) {
        return a.autoIsCorrect != null || a.teacherScore != null;
      }
      return a.teacherScore != null;
    });

  if (!allGraded && questions.length > 0) {
    return { ok: false, status: 400, code: "grading_incomplete" };
  }

  const finalScorePct = computeFinalScorePct(questions, answers);
  const now = new Date().toISOString();
  const { error } = await serviceRole
    .from("worksheet_student_status")
    .update({
      grading_status: "published",
      teacher_published_at: now,
      teacher_checked_at: now,
      final_score_pct: finalScorePct,
      updated_at: now,
    })
    .eq("worksheet_activity_id", worksheetId)
    .eq("student_id", studentId);

  if (error) return worksheetDbError(error);
  return { ok: true, finalScorePct };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} worksheetId
 * @param {'worksheet'|'answer_key'} [fileRole]
 */
export async function getTeacherWorksheetPdfUrl(serviceRole, teacherId, worksheetId, fileRole = "worksheet") {
  const loaded = await loadTeacherWorksheetOwned(serviceRole, teacherId, worksheetId);
  if (!loaded.ok) return loaded;

  const role = fileRole === "answer_key" ? "answer_key" : "worksheet";
  const { data: file, error } = await serviceRole
    .from("worksheet_files")
    .select("storage_path")
    .eq("worksheet_activity_id", worksheetId)
    .eq("file_role", role)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return worksheetDbError(error);
  if (!file) return { ok: false, status: 404, code: "worksheet_pdf_not_found" };

  return createWorksheetSignedUrl(serviceRole, file.storage_path, "teacher");
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 */
export async function listWorksheetsForStudentReport(serviceRole, teacherId, studentId) {
  if (!isUuid(studentId)) return { ok: false, status: 400, code: "validation_failed" };

  const { data: memberships, error: memError } = await serviceRole
    .from("teacher_class_students")
    .select("class_id")
    .eq("student_id", studentId);

  if (memError) return worksheetDbError(memError);
  const classIds = [...new Set((memberships || []).map((m) => m.class_id).filter(Boolean))];

  /** @type {Record<string, unknown>[]} */
  let activities = [];

  if (classIds.length) {
    const { data: classActivities, error } = await serviceRole
      .from("worksheet_activities")
      .select("*")
      .eq("teacher_id", teacherId)
      .in("class_id", classIds)
      .neq("status", "draft")
      .order("created_at", { ascending: false });

    if (error) return worksheetDbError(error);
    activities = classActivities || [];
  }

  const { data: assignmentRows, error: assignError } = await serviceRole
    .from("worksheet_student_assignments")
    .select("worksheet_activity_id, worksheet_activities!inner(*)")
    .eq("student_id", studentId)
    .eq("worksheet_activities.teacher_id", teacherId)
    .neq("worksheet_activities.status", "draft");

  if (assignError) return worksheetDbError(assignError);

  const byId = new Map(activities.map((row) => [row.id, row]));
  for (const row of assignmentRows || []) {
    const activity = row.worksheet_activities;
    if (activity?.id && !byId.has(activity.id)) {
      byId.set(activity.id, activity);
    }
  }

  const mergedActivities = [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const worksheetIds = mergedActivities.map((a) => a.id);
  if (!worksheetIds.length) return { ok: true, worksheets: [] };

  const { data: statuses, error: stError } = await serviceRole
    .from("worksheet_student_status")
    .select("*")
    .eq("student_id", studentId)
    .in("worksheet_activity_id", worksheetIds);

  if (stError) return worksheetDbError(stError);

  const statusByWs = new Map((statuses || []).map((s) => [s.worksheet_activity_id, s]));

  const worksheets = mergedActivities.map((row) => {
    const st = statusByWs.get(row.id);
    const mapped = mapWorksheetActivityRow(row);
    const statusRow = st ? mapWorksheetStudentStatusRow(st) : null;
    return {
      ...mapped,
      studentStatus: statusRow,
      displayScore:
        statusRow?.gradingStatus === "published" ? statusRow.finalScorePct : null,
    };
  });

  return { ok: true, worksheets };
}

/**
 * Re-run auto grading when answer key is updated after submissions.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} worksheetId
 */
export async function recalculateWorksheetAutoGrades(serviceRole, worksheetId) {
  const { data: questions, error: qError } = await serviceRole
    .from("worksheet_questions")
    .select("*")
    .eq("worksheet_activity_id", worksheetId);

  if (qError) return worksheetDbError(qError);

  const { data: answers, error: aError } = await serviceRole
    .from("worksheet_student_answers")
    .select("*")
    .eq("worksheet_activity_id", worksheetId);

  if (aError) return worksheetDbError(aError);

  const now = new Date().toISOString();
  for (const ans of answers || []) {
    const q = (questions || []).find((qq) => qq.question_index === ans.question_index);
    if (!q) continue;
    const graded = gradeWorksheetAnswer(ans.answer_value, q.correct_answer, q.question_type);
    const pts = q.points != null && q.points > 0 ? Number(q.points) : 1;
    await serviceRole
      .from("worksheet_student_answers")
      .update({
        auto_is_correct: graded.autoIsCorrect,
        auto_score: graded.autoIsCorrect === true ? pts : graded.autoIsCorrect === false ? 0 : null,
        updated_at: now,
      })
      .eq("id", ans.id);
  }

  return { ok: true };
}

export { maskStudentFullName };
