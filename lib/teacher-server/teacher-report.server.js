import {
  aggregateParentReportPayload,
  parseIsoDateParam,
  safeString,
} from "../parent-server/report-data-aggregate.server.js";
import { attachStudentLearningAccountToParentReportPayload } from "../parent-server/parent-report-account-attachment.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { writeTeacherAuditRow } from "./teacher-audit.server.js";
import { buildStudentTeacherGuidance } from "./teacher-recommendations.server.js";
import { hasActiveTeacherStudentLink, loadGuardianAccessSummary, maskStudentFullName } from "./teacher-students.server.js";
import { isUuid } from "./teacher-request.server.js";

const DEFAULT_RANGE_DAYS = 30;
const MAX_WINDOW_DAYS = 366;

const PARENT_PII_TOP_LEVEL_KEYS = new Set([
  "parent",
  "parentId",
  "parent_id",
  "parentEmail",
  "parent_email",
  "parentName",
  "parent_name",
  "parentDisplayName",
  "parent_display_name",
  "copilotLastResponse",
  "parentAiExplanation",
  "parentCopilot",
  "copilot",
]);

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 */
export async function teacherHasReportAccessToStudent(serviceRole, teacherId, studentId) {
  const link = await hasActiveTeacherStudentLink(serviceRole, teacherId, studentId);
  if (!link.ok) return link;
  if (link.linked) {
    return { ok: true, allowed: true, via: "teacher_students" };
  }

  const { data: classRows, error: classErr } = await serviceRole
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", teacherId)
    .is("archived_at", null)
    .eq("is_archived", false);

  if (classErr) {
    if (isDbSchemaNotReadyError(classErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const classIds = (classRows || []).map((row) => row.id);
  if (!classIds.length) {
    return { ok: true, allowed: false };
  }

  const { data: membership, error: memErr } = await serviceRole
    .from("teacher_class_students")
    .select("id")
    .in("class_id", classIds)
    .eq("student_id", studentId)
    .is("removed_at", null)
    .limit(1)
    .maybeSingle();

  if (memErr) {
    if (isDbSchemaNotReadyError(memErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    allowed: Boolean(membership?.id),
    via: membership?.id ? "teacher_class_students" : null,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 */
export async function loadStudentRowForTeacherReport(serviceRole, studentId) {
  const { data, error } = await serviceRole
    .from("students")
    .select("id, full_name, grade_level, is_active")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data?.id) {
    return { ok: false, status: 404, code: "student_not_found" };
  }

  return { ok: true, student: data };
}

function buildDefaultRange() {
  const toDate = new Date();
  toDate.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - (DEFAULT_RANGE_DAYS - 1));
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

/**
 * @param {string|undefined} raw
 */
export function parseReportWindowDays(raw) {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > MAX_WINDOW_DAYS) return null;
  return n;
}

/**
 * @param {Record<string, string| string[]|undefined>} query
 */
export function resolveTeacherReportDateRange(query) {
  const windowDays = parseReportWindowDays(query?.windowDays);
  if (windowDays != null) {
    const toDate = new Date();
    toDate.setUTCHours(0, 0, 0, 0);
    const fromDate = new Date(toDate);
    fromDate.setUTCDate(fromDate.getUTCDate() - (windowDays - 1));
    return { ok: true, fromDate, toDate };
  }

  const defaultRange = buildDefaultRange();
  const fromRaw = safeString(query?.from, 10);
  const toRaw = safeString(query?.to, 10);
  const fromDate = fromRaw ? parseIsoDateParam(fromRaw) : parseIsoDateParam(defaultRange.from);
  const toDate = toRaw ? parseIsoDateParam(toRaw) : parseIsoDateParam(defaultRange.to);

  if (!fromDate || !toDate) {
    return { ok: false, code: "validation_failed", field: "from|to" };
  }
  if (fromDate.getTime() > toDate.getTime()) {
    return { ok: false, code: "validation_failed", field: "from|to" };
  }

  return { ok: true, fromDate, toDate };
}

/**
 * @param {Record<string, unknown>} payload
 * @param {{ active: number, revoked: number, expired: number }} guardianAccessSummary
 */
export function sanitizeReportPayloadForTeacher(payload, guardianAccessSummary, options = {}) {
  const preserveName = options.preserveStudentDisplayName === true;
  const out = { ...payload };
  for (const key of PARENT_PII_TOP_LEVEL_KEYS) {
    delete out[key];
  }

  if (out.student && typeof out.student === "object") {
    const student = out.student;
    out.student = {
      id: student.id,
      full_name: preserveName
        ? (typeof student.full_name === "string" ? student.full_name.trim() : "")
        : maskStudentFullName(student.full_name),
      grade_level: student.grade_level ?? null,
      is_active: student.is_active === true,
    };
  }

  if (out.accountSnapshot && typeof out.accountSnapshot === "object") {
    const snap = { ...out.accountSnapshot };
    delete snap.parentId;
    delete snap.parent_id;
    delete snap.parentEmail;
    delete snap.parent_email;
    delete snap.parentName;
    delete snap.parent_name;
    if (typeof snap.displayName === "string" && snap.displayName.trim()) {
      snap.displayName = preserveName
        ? snap.displayName.trim()
        : maskStudentFullName(snap.displayName);
    }
    out.accountSnapshot = snap;
  }

  out.reportMeta = {
    ...(typeof out.reportMeta === "object" && out.reportMeta ? out.reportMeta : {}),
    linkOrigin: "parent_owned",
    audience: "teacher",
  };
  out.guardianAccessSummary = guardianAccessSummary;
  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 */
export async function writeTeacherViewReportAuditIfNeeded(serviceRole, teacherId, studentId) {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const { data: existing, error: readErr } = await serviceRole
    .from("teacher_access_audit")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .eq("action", "viewed_student_report")
    .gte("created_at", dayStart.toISOString())
    .limit(1)
    .maybeSingle();

  if (readErr || existing?.id) {
    return;
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId,
    studentId,
    action: "viewed_student_report",
    actorRole: "teacher",
    actorId: teacherId,
    metadata: { student_id: studentId, source: "single_student" },
  });
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   studentId: string,
 *   fromDate: Date,
 *   toDate: Date,
 * }} input
 */
export async function buildTeacherStudentReportPayload(input, options = {}) {
  const { serviceRole, teacherId, studentId, fromDate, toDate } = input;
  const skipAudit = options.skipAudit === true;

  const access = await teacherHasReportAccessToStudent(serviceRole, teacherId, studentId);
  if (!access.ok) return access;
  if (!access.allowed) {
    return { ok: false, status: 403, code: "student_not_linked" };
  }

  const loaded = await loadStudentRowForTeacherReport(serviceRole, studentId);
  if (!loaded.ok) return loaded;

  const analytics = await aggregateParentReportPayload(
    serviceRole,
    loaded.student,
    fromDate,
    toDate
  );
  const withAccount = await attachStudentLearningAccountToParentReportPayload(
    serviceRole,
    loaded.student,
    analytics
  );
  const guardianAccessSummary = await loadGuardianAccessSummary(serviceRole, teacherId, studentId);
  const payload = sanitizeReportPayloadForTeacher(withAccount, guardianAccessSummary, {
    preserveStudentDisplayName: true,
  });

  payload.teacherGuidanceBlock = buildStudentTeacherGuidance(payload);

  if (!skipAudit) {
    await writeTeacherViewReportAuditIfNeeded(serviceRole, teacherId, studentId);
  }

  return { ok: true, payload };
}

/**
 * Full parent-report payload for a linked student (unsanitized — same as parent report-data API).
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   studentId: string,
 *   fromDate: Date,
 *   toDate: Date,
 * }} input
 */
export async function buildTeacherParentReportPreviewPayload(input) {
  const { serviceRole, teacherId, studentId, fromDate, toDate } = input;

  const access = await teacherHasReportAccessToStudent(serviceRole, teacherId, studentId);
  if (!access.ok) return access;
  if (!access.allowed) {
    return { ok: false, status: 403, code: "student_not_linked" };
  }

  const loaded = await loadStudentRowForTeacherReport(serviceRole, studentId);
  if (!loaded.ok) return loaded;

  const analytics = await aggregateParentReportPayload(
    serviceRole,
    loaded.student,
    fromDate,
    toDate
  );
  const payload = await attachStudentLearningAccountToParentReportPayload(
    serviceRole,
    loaded.student,
    analytics
  );

  return { ok: true, payload };
}

export function parseTeacherReportStudentIdParam(raw) {
  if (!isUuid(raw)) {
    return { ok: false, code: "validation_failed", field: "studentId" };
  }
  return { ok: true, studentId: String(raw).trim() };
}
