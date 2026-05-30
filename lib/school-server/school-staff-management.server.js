import { upsertActiveEntitlement } from "../auth/persona-entitlement.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { verifyTeacherMembershipInSchool } from "./school-membership.server.js";
import { writeSchoolStaffAuditRow } from "./school-staff-audit.server.js";
import {
  SCHOOL_STAFF_KIND_OPERATOR,
  SCHOOL_STAFF_KIND_TEACHER,
  reserveNextSchoolStaffCode,
} from "./school-staff-code.server.js";
import {
  generateStaffPin,
  hashStaffSecret,
} from "./school-staff-crypto.server.js";
import {
  revokeLiveStaffSessionsForAccess,
  revokeLiveStaffSessionsForUser,
} from "./school-staff-session.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} userId
 */
async function loadActiveStaffAccess(serviceRole, schoolId, userId) {
  const { data, error } = await serviceRole
    .from("school_staff_access_codes")
    .select("*")
    .eq("school_id", schoolId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data?.id) {
    return { ok: false, status: 404, code: "staff_access_not_found" };
  }

  return { ok: true, access: data };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string; managerId: string; userId: string }} input
 */
export async function resetSchoolStaffPin(serviceRole, input) {
  const { schoolId, managerId, userId } = input;
  if (!isUuid(schoolId) || !isUuid(managerId) || !isUuid(userId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const verified = await verifyTeacherMembershipInSchool(serviceRole, schoolId, userId);
  if (!verified.ok) return verified;

  const accessResult = await loadActiveStaffAccess(serviceRole, schoolId, userId);
  if (!accessResult.ok) return accessResult;

  const newPin = generateStaffPin();
  const pinHash = hashStaffSecret(newPin);

  const { error } = await serviceRole
    .from("school_staff_access_codes")
    .update({
      pin_hash: pinHash,
      must_change_pin: true,
      failed_attempts: 0,
      locked_until: null,
    })
    .eq("id", accessResult.access.id);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  await revokeLiveStaffSessionsForAccess(serviceRole, accessResult.access.id);

  await writeSchoolStaffAuditRow(serviceRole, {
    schoolId,
    action: "staff_pin_reset",
    actorUserId: managerId,
    targetUserId: userId,
    metadata: { access_id: accessResult.access.id },
  });

  return { ok: true, initialPin: newPin, staffCode: accessResult.access.code_display };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string; managerId: string; userId: string }} input
 */
export async function suspendSchoolStaffAccess(serviceRole, input) {
  const { schoolId, managerId, userId } = input;
  if (!isUuid(schoolId) || !isUuid(managerId) || !isUuid(userId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const verified = await verifyTeacherMembershipInSchool(serviceRole, schoolId, userId);
  if (!verified.ok) return verified;

  const accessResult = await loadActiveStaffAccess(serviceRole, schoolId, userId);
  if (!accessResult.ok) return accessResult;

  const persona =
    accessResult.access.staff_role === "school_operator" ? "school_operator" : "school_teacher";

  await serviceRole
    .from("account_persona_entitlements")
    .update({
      status: "suspended",
      suspended_by: managerId,
      suspended_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("persona", persona);

  await serviceRole
    .from("school_staff_access_codes")
    .update({ is_active: false })
    .eq("id", accessResult.access.id);

  await revokeLiveStaffSessionsForUser(serviceRole, userId);

  await writeSchoolStaffAuditRow(serviceRole, {
    schoolId,
    action: "staff_suspended",
    actorUserId: managerId,
    targetUserId: userId,
    metadata: { access_id: accessResult.access.id },
  });

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string; managerId: string; userId: string }} input
 */
export async function reactivateSchoolStaffAccess(serviceRole, input) {
  const { schoolId, managerId, userId } = input;
  if (!isUuid(schoolId) || !isUuid(managerId) || !isUuid(userId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const verified = await verifyTeacherMembershipInSchool(serviceRole, schoolId, userId);
  if (!verified.ok) return verified;

  const { data: access, error } = await serviceRole
    .from("school_staff_access_codes")
    .select("*")
    .eq("school_id", schoolId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !access?.id) {
    return { ok: false, status: 404, code: "staff_access_not_found" };
  }

  const persona = access.staff_role === "school_operator" ? "school_operator" : "school_teacher";

  await upsertActiveEntitlement(serviceRole, userId, persona, {
    approvalSource: "school_admin",
    approvedBy: managerId,
  });

  await serviceRole
    .from("school_staff_access_codes")
    .update({
      is_active: true,
      failed_attempts: 0,
      locked_until: null,
    })
    .eq("id", access.id);

  await writeSchoolStaffAuditRow(serviceRole, {
    schoolId,
    action: "staff_reactivated",
    actorUserId: managerId,
    targetUserId: userId,
    metadata: { access_id: access.id },
  });

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string; managerId: string; userId: string }} input
 */
export async function regenerateSchoolStaffCode(serviceRole, input) {
  const { schoolId, managerId, userId } = input;
  if (!isUuid(schoolId) || !isUuid(managerId) || !isUuid(userId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const verified = await verifyTeacherMembershipInSchool(serviceRole, schoolId, userId);
  if (!verified.ok) return verified;

  const accessResult = await loadActiveStaffAccess(serviceRole, schoolId, userId);
  if (!accessResult.ok) return accessResult;

  const kind =
    accessResult.access.staff_role === "school_operator"
      ? SCHOOL_STAFF_KIND_OPERATOR
      : SCHOOL_STAFF_KIND_TEACHER;

  const codeReserved = await reserveNextSchoolStaffCode(serviceRole, schoolId, kind);
  if (!codeReserved.ok) return codeReserved;

  const now = new Date().toISOString();
  await serviceRole
    .from("school_staff_access_codes")
    .update({
      revoked_at: now,
      revoked_by: managerId,
      is_active: false,
    })
    .eq("id", accessResult.access.id);

  await revokeLiveStaffSessionsForAccess(serviceRole, accessResult.access.id);

  const newPin = generateStaffPin();
  const pinHash = hashStaffSecret(newPin);

  const { data: newAccess, error: insErr } = await serviceRole
    .from("school_staff_access_codes")
    .insert({
      school_id: schoolId,
      user_id: userId,
      staff_role: accessResult.access.staff_role,
      code_display: codeReserved.codeDisplay,
      code_display_normalized: codeReserved.codeDisplayNormalized,
      pin_hash: pinHash,
      must_change_pin: true,
      is_active: true,
      created_by: managerId,
    })
    .select("id, code_display")
    .single();

  if (insErr) {
    if (isDbSchemaNotReadyError(insErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  await writeSchoolStaffAuditRow(serviceRole, {
    schoolId,
    action: "staff_code_regenerated",
    actorUserId: managerId,
    targetUserId: userId,
    metadata: {
      old_access_id: accessResult.access.id,
      new_access_id: newAccess.id,
      code_display: newAccess.code_display,
    },
  });

  return { ok: true, staffCode: newAccess.code_display, initialPin: newPin };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string; managerId: string; userId: string }} input
 */
export async function revokeSchoolStaffAccess(serviceRole, input) {
  const { schoolId, managerId, userId } = input;
  if (!isUuid(schoolId) || !isUuid(managerId) || !isUuid(userId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const verified = await verifyTeacherMembershipInSchool(serviceRole, schoolId, userId);
  if (!verified.ok) return verified;

  const accessResult = await loadActiveStaffAccess(serviceRole, schoolId, userId);
  if (!accessResult.ok) return accessResult;

  const persona =
    accessResult.access.staff_role === "school_operator" ? "school_operator" : "school_teacher";
  const now = new Date().toISOString();

  await serviceRole
    .from("school_staff_access_codes")
    .update({
      revoked_at: now,
      revoked_by: managerId,
      is_active: false,
    })
    .eq("id", accessResult.access.id);

  await serviceRole
    .from("account_persona_entitlements")
    .update({
      status: "revoked",
      revoked_by: managerId,
      revoked_at: now,
    })
    .eq("user_id", userId)
    .eq("persona", persona);

  await serviceRole
    .from("school_teacher_memberships")
    .delete()
    .eq("school_id", schoolId)
    .eq("teacher_id", userId);

  await revokeLiveStaffSessionsForUser(serviceRole, userId);

  await writeSchoolStaffAuditRow(serviceRole, {
    schoolId,
    action: "staff_revoked",
    actorUserId: managerId,
    targetUserId: userId,
    metadata: { access_id: accessResult.access.id },
  });

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string[]} userIds
 */
export async function loadStaffAccessMapForUsers(serviceRole, schoolId, userIds) {
  if (!userIds.length) return new Map();

  const { data, error } = await serviceRole
    .from("school_staff_access_codes")
    .select("user_id, code_display, is_active, revoked_at, must_change_pin, staff_role")
    .eq("school_id", schoolId)
    .in("user_id", userIds)
    .is("revoked_at", null);

  if (error) return new Map();

  const map = new Map();
  for (const row of data || []) {
    map.set(row.user_id, row);
  }
  return map;
}
