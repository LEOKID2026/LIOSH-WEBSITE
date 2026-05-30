import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { upsertActiveEntitlement } from "../auth/persona-entitlement.server.js";
import { assertSchoolQuotaAvailable } from "./school-quota.server.js";
import { loadStaffAccessMapForUsers } from "./school-staff-management.server.js";
import { sanitizeOperatorAuditMetadata } from "./school-audit-log.server.js";

/** DB-allowed action_type values (045_school_operator_audit_log.sql). */
export const SCHOOL_OPERATOR_AUDIT_DB_ACTIONS = new Set([
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

/** Route-level aliases mapped to DB action_type + metadata.operation. */
const OPERATOR_AUDIT_ACTION_ALIASES = {
  credential_create_student: "credential_create",
  credential_reset_student_pin: "credential_reset",
  credential_revoke_student: "credential_revoke",
  credential_block_student: "student_update",
  credential_unblock_student: "student_update",
  credential_create_parent: "guardian_credential_create",
  credential_reset_parent_pin: "guardian_credential_reset",
  credential_revoke_parent: "guardian_credential_revoke",
  credential_block_parent: "student_update",
  credential_unblock_parent: "student_update",
  parent_link: "guardian_credential_create",
  parent_unlink: "guardian_credential_revoke",
};

/**
 * @param {string} actionType
 */
export function normalizeOperatorAuditActionType(actionType) {
  const raw = String(actionType || "").trim();
  if (!raw) return { ok: false, code: "invalid_operator_audit_action" };

  const mapped = OPERATOR_AUDIT_ACTION_ALIASES[raw] || raw;
  if (!SCHOOL_OPERATOR_AUDIT_DB_ACTIONS.has(mapped)) {
    return { ok: false, code: "invalid_operator_audit_action", raw };
  }

  return {
    ok: true,
    actionType: mapped,
    operation: raw !== mapped ? raw : undefined,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{
 *   schoolId: string;
 *   actorUserId: string;
 *   targetUserId?: string|null;
 *   targetStudentId?: string|null;
 *   actionType: string;
 *   metadata?: object|null;
 * }} input
 */
export async function writeSchoolOperatorAuditLog(serviceRole, input) {
  const normalized = normalizeOperatorAuditActionType(input.actionType);
  if (!normalized.ok) {
    return { ok: false, status: 400, code: normalized.code };
  }

  const metadata = sanitizeOperatorAuditMetadata(input.metadata);
  if (normalized.operation) {
    metadata.operation = normalized.operation;
  }

  const { error } = await serviceRole.from("school_operator_audit_log").insert({
    school_id: input.schoolId,
    actor_user_id: input.actorUserId,
    target_user_id: input.targetUserId || null,
    target_student_id: input.targetStudentId || null,
    action_type: normalized.actionType,
    metadata,
  });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true };
}

/**
 * Write operator audit log when actor is school_operator.
 * @param {object} ctx
 * @param {{ studentId?: string|null; targetUserId?: string|null; actionType: string; metadata?: object|null }} input
 */
export async function maybeWriteOperatorCredentialAudit(ctx, input) {
  if (ctx?.actorRole !== "school_operator") {
    return { ok: true };
  }
  return writeSchoolOperatorAuditLog(ctx.serviceRole, {
    schoolId: ctx.schoolId,
    actorUserId: ctx.actorUserId,
    targetStudentId: input.studentId || null,
    targetUserId: input.targetUserId || null,
    actionType: input.actionType,
    metadata: input.metadata || null,
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function listSchoolOperators(serviceRole, schoolId) {
  if (!isUuid(schoolId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: memberships, error } = await serviceRole
    .from("school_teacher_memberships")
    .select("id, school_id, teacher_id, role, joined_at")
    .eq("school_id", schoolId)
    .eq("role", "school_operator")
    .order("joined_at", { ascending: true });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const operatorIds = (memberships || []).map((m) => m.teacher_id);
  const grantsMap = new Map();
  const profileMap = new Map();
  const emailMap = new Map();

  if (operatorIds.length > 0) {
    for (let page = 1; page <= 10; page++) {
      const { data } = await serviceRole.auth.admin.listUsers({ page, perPage: 200 });
      for (const u of data?.users || []) {
        if (u?.id && operatorIds.includes(u.id)) {
          emailMap.set(u.id, u.email || null);
        }
      }
      if (!data?.users?.length || data.users.length < 200) break;
    }

    const [grantsRes, profilesRes] = await Promise.all([
      serviceRole
        .from("school_operator_grants")
        .select("operator_user_id, student_access_admin, student_data_viewer, updated_by, updated_at")
        .eq("school_id", schoolId)
        .in("operator_user_id", operatorIds),
      serviceRole
        .from("teacher_profiles")
        .select("id, display_name, is_active")
        .in("id", operatorIds),
    ]);

    if (grantsRes.error || profilesRes.error) {
      const err = grantsRes.error || profilesRes.error;
      if (isDbSchemaNotReadyError(err)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    for (const g of grantsRes.data || []) {
      grantsMap.set(g.operator_user_id, g);
    }
    for (const p of profilesRes.data || []) {
      profileMap.set(p.id, p);
    }
  }

  const staffAccessMap = await loadStaffAccessMapForUsers(serviceRole, schoolId, operatorIds);

  return {
    ok: true,
    operators: (memberships || []).map((m) => {
      const grants = grantsMap.get(m.teacher_id);
      const profile = profileMap.get(m.teacher_id);
      const staffAccess = staffAccessMap.get(m.teacher_id);
      let staffAccessStatus = null;
      if (staffAccess) {
        staffAccessStatus = staffAccess.is_active ? "active" : "suspended";
      }
      return {
        operatorUserId: m.teacher_id,
        displayName: profile?.display_name || null,
        email: emailMap.get(m.teacher_id) || null,
        joinedAt: m.joined_at,
        staffCode: staffAccess?.code_display || null,
        staffAccessStatus,
        hasStaffCodeLogin: Boolean(staffAccess?.code_display),
        mustChangePin: staffAccess?.must_change_pin === true,
        grants: {
          studentAccessAdmin: grants?.student_access_admin === true,
          studentDataViewer: grants?.student_data_viewer === true,
          updatedBy: grants?.updated_by || null,
          updatedAt: grants?.updated_at || null,
        },
      };
    }),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string; managerId: string; operatorUserId: string; displayName?: string|null }} input
 */
export async function inviteSchoolOperator(serviceRole, input) {
  const { schoolId, managerId, operatorUserId } = input;
  if (!isUuid(schoolId) || !isUuid(managerId) || !isUuid(operatorUserId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const quotaCheck = await assertSchoolQuotaAvailable(serviceRole, schoolId, "operator");
  if (!quotaCheck.ok) return quotaCheck;

  const { data: profile, error: profileErr } = await serviceRole
    .from("teacher_profiles")
    .select("id, display_name, is_active, archived_at")
    .eq("id", operatorUserId)
    .maybeSingle();

  if (profileErr) {
    if (isDbSchemaNotReadyError(profileErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!profile || profile.archived_at != null || profile.is_active === false) {
    const displayName =
      typeof input.displayName === "string" && input.displayName.trim()
        ? input.displayName.trim().slice(0, 80)
        : "School Operator";
    const { error: createProfileErr } = await serviceRole.from("teacher_profiles").insert({
      id: operatorUserId,
      display_name: displayName,
      is_active: true,
    });
    if (createProfileErr && !isDbSchemaNotReadyError(createProfileErr)) {
      if (createProfileErr.code !== "23505") {
        return { ok: false, status: 500, code: "internal_error" };
      }
    }
  }

  const { data: existingMembership } = await serviceRole
    .from("school_teacher_memberships")
    .select("id, role, school_id")
    .eq("teacher_id", operatorUserId)
    .maybeSingle();

  if (existingMembership && existingMembership.school_id !== schoolId) {
    return { ok: false, status: 409, code: "operator_already_in_other_school" };
  }

  if (existingMembership) {
    if (existingMembership.role !== "school_operator") {
      return { ok: false, status: 409, code: "user_already_school_staff" };
    }
  } else {
    const { error: membershipErr } = await serviceRole.from("school_teacher_memberships").insert({
      school_id: schoolId,
      teacher_id: operatorUserId,
      role: "school_operator",
    });
    if (membershipErr) {
      if (isDbSchemaNotReadyError(membershipErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
  }

  const entitlementResult = await upsertActiveEntitlement(serviceRole, operatorUserId, "school_operator", {
    approvalSource: "school_admin",
    approvedBy: managerId,
  });
  if (!entitlementResult.ok) return entitlementResult;

  const { error: grantsErr } = await serviceRole.from("school_operator_grants").upsert(
    {
      school_id: schoolId,
      operator_user_id: operatorUserId,
      student_access_admin: false,
      student_data_viewer: false,
      updated_by: managerId,
    },
    { onConflict: "school_id,operator_user_id" }
  );

  if (grantsErr) {
    if (isDbSchemaNotReadyError(grantsErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, operatorUserId, schoolId };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{
 *   schoolId: string;
 *   managerId: string;
 *   operatorUserId: string;
 *   studentAccessAdmin?: boolean;
 *   studentDataViewer?: boolean;
 * }} input
 */
export async function updateSchoolOperatorGrants(serviceRole, input) {
  const { schoolId, managerId, operatorUserId } = input;
  if (!isUuid(schoolId) || !isUuid(managerId) || !isUuid(operatorUserId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: membership, error: memErr } = await serviceRole
    .from("school_teacher_memberships")
    .select("id, role")
    .eq("school_id", schoolId)
    .eq("teacher_id", operatorUserId)
    .maybeSingle();

  if (memErr) {
    if (isDbSchemaNotReadyError(memErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!membership || membership.role !== "school_operator") {
    return { ok: false, status: 404, code: "operator_not_found" };
  }

  const { data: beforeGrants } = await serviceRole
    .from("school_operator_grants")
    .select("student_access_admin, student_data_viewer")
    .eq("school_id", schoolId)
    .eq("operator_user_id", operatorUserId)
    .maybeSingle();

  const patch = {
    school_id: schoolId,
    operator_user_id: operatorUserId,
    updated_by: managerId,
  };

  if (typeof input.studentAccessAdmin === "boolean") {
    patch.student_access_admin = input.studentAccessAdmin;
  } else if (beforeGrants) {
    patch.student_access_admin = beforeGrants.student_access_admin;
  } else {
    patch.student_access_admin = false;
  }

  if (typeof input.studentDataViewer === "boolean") {
    patch.student_data_viewer = input.studentDataViewer;
  } else if (beforeGrants) {
    patch.student_data_viewer = beforeGrants.student_data_viewer;
  } else {
    patch.student_data_viewer = false;
  }

  const { data: afterGrants, error: updErr } = await serviceRole
    .from("school_operator_grants")
    .upsert(patch, { onConflict: "school_id,operator_user_id" })
    .select("*")
    .single();

  if (updErr) {
    if (isDbSchemaNotReadyError(updErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const auditEntries = [];
  if (typeof input.studentAccessAdmin === "boolean") {
    const was = beforeGrants?.student_access_admin === true;
    const now = input.studentAccessAdmin === true;
    if (was !== now) {
      auditEntries.push(
        now ? "grant_student_access_admin" : "revoke_student_access_admin"
      );
    }
  }
  if (typeof input.studentDataViewer === "boolean") {
    const was = beforeGrants?.student_data_viewer === true;
    const now = input.studentDataViewer === true;
    if (was !== now) {
      auditEntries.push(now ? "grant_student_data_viewer" : "revoke_student_data_viewer");
    }
  }

  for (const actionType of auditEntries) {
    await writeSchoolOperatorAuditLog(serviceRole, {
      schoolId,
      actorUserId: managerId,
      targetUserId: operatorUserId,
      actionType,
      metadata: { grants: afterGrants },
    });
  }

  return { ok: true, grants: afterGrants };
}
