import { normalizeActivitySubject } from "../classroom-activities/classroom-activities-shared.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";

export const WORKSHEET_BUCKET = "worksheet-pdfs";
export const WORKSHEET_MAX_BYTES = 20 * 1024 * 1024;
export const WORKSHEET_SIGNED_URL_TEACHER_SEC = 30 * 60;
export const WORKSHEET_SIGNED_URL_STUDENT_SEC = 15 * 60;

export const WORKSHEET_MODES = new Set(["pdf_only", "digital_answers", "manual_grading"]);
export const WORKSHEET_STATUSES = new Set(["draft", "active", "closed", "archived"]);
export const WORKSHEET_FILE_ROLES = new Set(["worksheet", "answer_key"]);
export const WORKSHEET_QUESTION_TYPES = new Set([
  "multiple_choice",
  "true_false",
  "numeric",
  "short_answer",
  "free_text",
]);
export const GRADING_STATUSES = new Set([
  "not_submitted",
  "submitted",
  "pending_review",
  "partially_checked",
  "checked",
  "published",
]);

const AUTO_GRADABLE_TYPES = new Set(["multiple_choice", "true_false", "numeric"]);

/**
 * @param {unknown} raw
 */
export function normalizeWorksheetMode(raw) {
  const mode = String(raw || "pdf_only").trim().toLowerCase();
  return WORKSHEET_MODES.has(mode) ? mode : null;
}

/**
 * @param {unknown} raw
 */
export function normalizeWorksheetStatus(raw) {
  const status = String(raw || "").trim().toLowerCase();
  return WORKSHEET_STATUSES.has(status) ? status : null;
}

/**
 * @param {unknown} raw
 */
export function normalizeQuestionType(raw) {
  const t = String(raw || "").trim().toLowerCase();
  return WORKSHEET_QUESTION_TYPES.has(t) ? t : null;
}

/**
 * @param {string} questionType
 */
export function isQuestionTypeAutoGradable(questionType) {
  return AUTO_GRADABLE_TYPES.has(questionType);
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapWorksheetActivityRow(row) {
  const assignmentScope =
    row.assignment_scope === "selected_students" || row.assignment_scope === "class"
      ? row.assignment_scope
      : row.class_id
        ? "class"
        : "selected_students";

  return {
    worksheetId: row.id,
    teacherId: row.teacher_id,
    classId: row.class_id,
    assignmentScope,
    schoolId: row.school_id ?? null,
    title: row.title,
    subject: row.subject,
    instructions: row.instructions ?? null,
    worksheetMode: row.worksheet_mode,
    questionCount: row.question_count ?? null,
    physicalDueAt: row.physical_due_at ?? null,
    status: row.status,
    hasAnswerKey: row.has_answer_key === true,
    activatedAt: row.activated_at ?? null,
    closedAt: row.closed_at ?? null,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapWorksheetFileRow(row) {
  return {
    fileId: row.id,
    worksheetId: row.worksheet_activity_id,
    originalFilename: row.original_filename,
    fileSizeBytes: row.file_size_bytes,
    fileRole: row.file_role,
    isDeleted: row.is_deleted === true,
    createdAt: row.created_at,
  };
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapWorksheetQuestionRow(row) {
  return {
    questionIndex: row.question_index,
    questionType: row.question_type,
    points: row.points != null ? Number(row.points) : null,
    choices: row.choices ?? null,
    correctAnswer: row.correct_answer ?? null,
    isAutoGradable: row.is_auto_gradable === true,
  };
}

/**
 * @param {Record<string, unknown>} row
 */
export function mapWorksheetStudentStatusRow(row) {
  return {
    studentId: row.student_id,
    pdfFirstOpenedAt: row.pdf_first_opened_at ?? null,
    pdfLastOpenedAt: row.pdf_last_opened_at ?? null,
    pdfOpenCount: row.pdf_open_count ?? 0,
    markedCompletedAt: row.marked_completed_at ?? null,
    digitalSubmittedAt: row.digital_submitted_at ?? null,
    gradingStatus: row.grading_status,
    autoScorePct: row.auto_score_pct != null ? Number(row.auto_score_pct) : null,
    finalScorePct: row.final_score_pct != null ? Number(row.final_score_pct) : null,
    teacherCheckedAt: row.teacher_checked_at ?? null,
    teacherPublishedAt: row.teacher_published_at ?? null,
  };
}

/**
 * @param {import('@supabase/supabase-js').PostgrestError|null|undefined} error
 */
export function worksheetDbError(error) {
  if (error && isDbSchemaNotReadyError(error)) {
    return { ok: false, status: 503, code: "db_schema_not_ready" };
  }
  return { ok: false, status: 500, code: "internal_error" };
}

export { normalizeActivitySubject };
