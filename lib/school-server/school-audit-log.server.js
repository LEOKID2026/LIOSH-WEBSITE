import {
  isDbSchemaNotReadyError,
  sanitizeTeacherAuditMetadata,
} from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { loadSchoolScope } from "./school-scope.server.js";
import { sanitizeStaffAuditMetadata } from "./school-staff-audit.server.js";

/** @deprecated Use MANAGER_VISIBLE_SCHOOL_AUDIT_ACTIONS — kept for import compatibility. */
export const SCHOOL_AUDIT_ACTIONS = new Set([
  "school_subject_granted",
  "school_subject_revoked",
  "school_student_enrolled",
  "school_student_unenrolled",
  "school_class_viewed",
  "school_student_report_viewed",
  "school_student_class_transferred",
  "school_class_teacher_reassigned",
  "school_class_archived",
  "school_student_access_created",
  "school_student_access_blocked",
  "school_student_access_unblocked",
  "school_student_access_revoked",
  "school_student_pin_rotated",
]);

export const SCHOOL_STAFF_AUDIT_ACTIONS = new Set([
  "staff_login_success",
  "staff_login_failed",
  "staff_suspended",
  "staff_reactivated",
  "staff_code_regenerated",
  "staff_pin_reset",
  "staff_pin_changed",
  "staff_code_created",
  "staff_revoked",
]);

export const SCHOOL_OPERATOR_AUDIT_ACTIONS = new Set([
  "grant_student_access_admin",
  "revoke_student_access_admin",
  "grant_student_data_viewer",
  "revoke_student_data_viewer",
  "credential_create",
  "credential_reset",
  "credential_revoke",
  "guardian_credential_create",
  "guardian_credential_reset",
  "guardian_credential_revoke",
  "student_enroll",
  "student_update",
  "report_view",
]);

export const MANAGER_VISIBLE_SCHOOL_AUDIT_ACTIONS = new Set([
  ...SCHOOL_AUDIT_ACTIONS,
  ...SCHOOL_STAFF_AUDIT_ACTIONS,
  ...SCHOOL_OPERATOR_AUDIT_ACTIONS,
]);

const AUDIT_METADATA_DENY_KEYS = new Set([
  "pin",
  "pin_plain",
  "pin_hash",
  "token",
  "token_plain",
  "password",
  "email",
  "full_name",
  "ip",
  "ip_address",
  "session_token",
  "cookie",
  "bearer",
]);

/**
 * @param {object|null|undefined} metadata
 */
export function sanitizeOperatorAuditMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (AUDIT_METADATA_DENY_KEYS.has(String(key).trim().toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

/**
 * @param {"teacher_access_audit"|"school_staff_audit_log"|"school_operator_audit_log"} source
 * @param {object|null|undefined} metadata
 */
export function sanitizeAuditMetadataForResponse(source, metadata) {
  if (source === "school_staff_audit_log") {
    return sanitizeStaffAuditMetadata(metadata);
  }
  if (source === "school_operator_audit_log") {
    return sanitizeOperatorAuditMetadata(metadata);
  }
  const sanitized = sanitizeTeacherAuditMetadata(metadata);
  return sanitized.ok ? sanitized.metadata : {};
}

/**
 * @param {string|null|undefined} action
 */
function auditActionSource(action) {
  if (!action) return null;
  if (SCHOOL_STAFF_AUDIT_ACTIONS.has(action)) return "school_staff_audit_log";
  if (SCHOOL_OPERATOR_AUDIT_ACTIONS.has(action)) return "school_operator_audit_log";
  if (SCHOOL_AUDIT_ACTIONS.has(action)) return "teacher_access_audit";
  return null;
}

/**
 * @param {object} row
 * @param {string} schoolId
 */
function normalizeTeacherAccessEntry(row, schoolId) {
  let targetType = null;
  let targetId = null;
  if (row.student_id) {
    targetType = "student";
    targetId = row.student_id;
  } else if (row.metadata?.class_id) {
    targetType = "class";
    targetId = String(row.metadata.class_id);
  } else if (row.metadata?.teacher_id) {
    targetType = "teacher";
    targetId = String(row.metadata.teacher_id);
  }

  return {
    id: row.id,
    source: "teacher_access_audit",
    action: row.action,
    actorId: row.actor_id || row.teacher_id || null,
    actorRole: row.actor_role || null,
    schoolId,
    teacherId: row.teacher_id || null,
    studentId: row.student_id || null,
    targetType,
    targetId,
    createdAt: row.created_at,
    metadata: sanitizeAuditMetadataForResponse("teacher_access_audit", row.metadata),
  };
}

/**
 * @param {object} row
 */
function normalizeStaffAuditEntry(row) {
  return {
    id: row.id,
    source: "school_staff_audit_log",
    action: row.action,
    actorId: row.actor_user_id || null,
    actorRole: row.actor_user_id ? "school_staff" : null,
    schoolId: row.school_id,
    teacherId: null,
    studentId: null,
    targetType: row.target_user_id ? "staff" : null,
    targetId: row.target_user_id || null,
    createdAt: row.created_at,
    metadata: sanitizeAuditMetadataForResponse("school_staff_audit_log", row.metadata),
  };
}

/**
 * @param {object} row
 */
function normalizeOperatorAuditEntry(row) {
  let targetType = null;
  let targetId = null;
  if (row.target_student_id) {
    targetType = "student";
    targetId = row.target_student_id;
  } else if (row.target_user_id) {
    targetType = "operator";
    targetId = row.target_user_id;
  }

  return {
    id: row.id,
    source: "school_operator_audit_log",
    action: row.action_type,
    actorId: row.actor_user_id || null,
    actorRole: "school_operator",
    schoolId: row.school_id,
    teacherId: null,
    studentId: row.target_student_id || null,
    targetType,
    targetId,
    createdAt: row.created_at,
    metadata: sanitizeAuditMetadataForResponse("school_operator_audit_log", row.metadata),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string, limit?: number, offset?: number, action?: string|null }} opts
 */
export async function listSchoolAuditLog(serviceRole, opts) {
  const { schoolId } = opts;
  if (!isUuid(schoolId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 200);
  const offset = Math.max(Number(opts.offset) || 0, 0);
  const actionFilter = opts.action ? String(opts.action).trim() : null;

  if (actionFilter && !MANAGER_VISIBLE_SCHOOL_AUDIT_ACTIONS.has(actionFilter)) {
    return { ok: false, status: 400, code: "invalid_audit_action" };
  }

  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const fetchLimit = Math.min(offset + limit, 500);
  const entries = [];
  let total = 0;

  const includeTeacher = !actionFilter || auditActionSource(actionFilter) === "teacher_access_audit";
  const includeStaff = !actionFilter || auditActionSource(actionFilter) === "school_staff_audit_log";
  const includeOperator =
    !actionFilter || auditActionSource(actionFilter) === "school_operator_audit_log";

  if (includeTeacher && scope.teacherIds.length > 0) {
    const teacherActions = actionFilter
      ? [actionFilter]
      : [...SCHOOL_AUDIT_ACTIONS];

    let teacherQuery = serviceRole
      .from("teacher_access_audit")
      .select(
        "id, teacher_id, student_id, action, actor_role, actor_id, metadata, created_at",
        { count: "exact" }
      )
      .in("teacher_id", scope.teacherIds)
      .in("action", teacherActions)
      .order("created_at", { ascending: false })
      .limit(fetchLimit);

    const { data, error, count } = await teacherQuery;
    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    total += count ?? (data || []).length;
    for (const row of data || []) {
      entries.push(normalizeTeacherAccessEntry(row, schoolId));
    }
  }

  if (includeStaff) {
    const staffActions = actionFilter ? [actionFilter] : [...SCHOOL_STAFF_AUDIT_ACTIONS];

    const { data, error, count } = await serviceRole
      .from("school_staff_audit_log")
      .select(
        "id, school_id, actor_user_id, target_user_id, action, metadata, created_at",
        { count: "exact" }
      )
      .eq("school_id", schoolId)
      .in("action", staffActions)
      .order("created_at", { ascending: false })
      .limit(fetchLimit);

    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    total += count ?? (data || []).length;
    for (const row of data || []) {
      entries.push(normalizeStaffAuditEntry(row));
    }
  }

  if (includeOperator) {
    const operatorActions = actionFilter ? [actionFilter] : [...SCHOOL_OPERATOR_AUDIT_ACTIONS];

    const { data, error, count } = await serviceRole
      .from("school_operator_audit_log")
      .select(
        "id, school_id, actor_user_id, target_user_id, target_student_id, action_type, metadata, created_at",
        { count: "exact" }
      )
      .eq("school_id", schoolId)
      .in("action_type", operatorActions)
      .order("created_at", { ascending: false })
      .limit(fetchLimit);

    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    total += count ?? (data || []).length;
    for (const row of data || []) {
      entries.push(normalizeOperatorAuditEntry(row));
    }
  }

  entries.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });

  const page = entries.slice(offset, offset + limit);

  return {
    ok: true,
    entries: page,
    total,
    limit,
    offset,
  };
}
