import { safeApiLog } from "../security/safe-log.js";
import { upsertActiveEntitlement } from "../auth/persona-entitlement.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { TEACHER_PORTAL_DEFAULT_PLAN_CODE } from "../teacher-server/teacher-session.server.js";
import { assertSchoolQuotaAvailable } from "./school-quota.server.js";
import { logStaffProvisionOrphan, writeSchoolStaffAuditRow } from "./school-staff-audit.server.js";
import {
  SCHOOL_STAFF_KIND_OPERATOR,
  SCHOOL_STAFF_KIND_TEACHER,
  reserveNextSchoolStaffCode,
  rollbackSchoolStaffSequence,
} from "./school-staff-code.server.js";
import {
  generateInternalStaffAuthEmail,
  generateInternalStaffAuthPassword,
  generateStaffPin,
  hashStaffSecret,
} from "./school-staff-crypto.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 */
export async function deleteOrphanAuthUser(serviceRole, userId) {
  try {
    const { error } = await serviceRole.auth.admin.deleteUser(userId);
    if (error) {
      safeApiLog("staff_provision_orphan_cleanup_failed", { userId });
      await logStaffProvisionOrphan(serviceRole, { userId });
      return false;
    }
    return true;
  } catch (_e) {
    safeApiLog("staff_provision_orphan_cleanup_failed", { userId });
    await logStaffProvisionOrphan(serviceRole, { userId });
    return false;
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 */
async function createInternalStaffAuthUser(serviceRole) {
  const email = generateInternalStaffAuthEmail();
  const password = generateInternalStaffAuthPassword();

  const { data, error } = await serviceRole.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "teacher", staff_internal: true },
  });

  if (error || !data?.user?.id) {
    return { ok: false, status: 500, code: "auth_user_create_failed" };
  }

  return { ok: true, userId: data.user.id };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{
 *   schoolId: string;
 *   managerId: string;
 *   displayName: string;
 *   staffRole: "school_teacher"|"school_operator";
 *   membershipRole: "teacher"|"school_operator";
 *   sequenceKind: "t"|"o";
 *   persona: "school_teacher"|"school_operator";
 *   quotaType: "teacher"|"operator";
 * }} input
 */
async function provisionSchoolStaffAccount(serviceRole, input) {
  const { schoolId, managerId, displayName, staffRole, membershipRole, sequenceKind, persona, quotaType } =
    input;

  if (!isUuid(schoolId) || !isUuid(managerId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const quotaCheck = await assertSchoolQuotaAvailable(serviceRole, schoolId, quotaType);
  if (!quotaCheck.ok) return quotaCheck;

  const codeReserved = await reserveNextSchoolStaffCode(serviceRole, schoolId, sequenceKind);
  if (!codeReserved.ok) return codeReserved;

  const authResult = await createInternalStaffAuthUser(serviceRole);
  if (!authResult.ok) {
    await rollbackSchoolStaffSequence(serviceRole, schoolId, sequenceKind, codeReserved.sequence);
    return authResult;
  }

  const userId = authResult.userId;
  const initialPin = generateStaffPin();
  const pinHash = hashStaffSecret(initialPin);

  const { error: profileErr } = await serviceRole.from("teacher_profiles").insert({
    id: userId,
    display_name: displayName,
    school_id: schoolId,
    is_active: true,
  });
  if (profileErr && profileErr.code !== "23505") {
    await rollbackSchoolStaffSequence(serviceRole, schoolId, sequenceKind, codeReserved.sequence);
    await deleteOrphanAuthUser(serviceRole, userId);
    if (isDbSchemaNotReadyError(profileErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "provision_failed" };
  }

  const { error: limitsErr } = await serviceRole.from("teacher_limits").insert({
    teacher_id: userId,
    plan_code: "teacher_school_unlimited",
  });
  if (limitsErr && limitsErr.code !== "23505") {
    await rollbackSchoolStaffSequence(serviceRole, schoolId, sequenceKind, codeReserved.sequence);
    await deleteOrphanAuthUser(serviceRole, userId);
    return { ok: false, status: 500, code: "provision_failed" };
  }

  const { error: membershipErr } = await serviceRole.from("school_teacher_memberships").insert({
    school_id: schoolId,
    teacher_id: userId,
    role: membershipRole,
  });
  if (membershipErr) {
    await rollbackSchoolStaffSequence(serviceRole, schoolId, sequenceKind, codeReserved.sequence);
    await deleteOrphanAuthUser(serviceRole, userId);
    if (isDbSchemaNotReadyError(membershipErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "provision_failed" };
  }

  const entitlementResult = await upsertActiveEntitlement(serviceRole, userId, persona, {
    approvalSource: "school_admin",
    approvedBy: managerId,
  });
  if (!entitlementResult.ok) {
    await rollbackSchoolStaffSequence(serviceRole, schoolId, sequenceKind, codeReserved.sequence);
    await deleteOrphanAuthUser(serviceRole, userId);
    return { ok: false, status: 500, code: "provision_failed" };
  }

  if (persona === "school_operator") {
    const { error: grantsErr } = await serviceRole.from("school_operator_grants").upsert(
      {
        school_id: schoolId,
        operator_user_id: userId,
        student_access_admin: false,
        student_data_viewer: false,
        updated_by: managerId,
      },
      { onConflict: "school_id,operator_user_id" }
    );
    if (grantsErr) {
      await rollbackSchoolStaffSequence(serviceRole, schoolId, sequenceKind, codeReserved.sequence);
      await deleteOrphanAuthUser(serviceRole, userId);
      return { ok: false, status: 500, code: "provision_failed" };
    }
  }

  const { data: accessRow, error: accessErr } = await serviceRole
    .from("school_staff_access_codes")
    .insert({
      school_id: schoolId,
      user_id: userId,
      staff_role: staffRole,
      code_display: codeReserved.codeDisplay,
      code_display_normalized: codeReserved.codeDisplayNormalized,
      pin_hash: pinHash,
      must_change_pin: true,
      is_active: true,
      created_by: managerId,
    })
    .select("id, code_display")
    .single();

  if (accessErr) {
    await rollbackSchoolStaffSequence(serviceRole, schoolId, sequenceKind, codeReserved.sequence);
    await deleteOrphanAuthUser(serviceRole, userId);
    if (isDbSchemaNotReadyError(accessErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "provision_failed" };
  }

  await writeSchoolStaffAuditRow(serviceRole, {
    schoolId,
    action: "staff_code_created",
    actorUserId: managerId,
    targetUserId: userId,
    metadata: {
      staff_role: staffRole,
      code_display: accessRow.code_display,
      access_id: accessRow.id,
    },
  });

  return {
    ok: true,
    userId,
    schoolId,
    staffCode: accessRow.code_display,
    initialPin,
    staffRole,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string; managerId: string; displayName: string }} input
 */
export async function provisionSchoolTeacherStaff(serviceRole, input) {
  const displayName =
    typeof input.displayName === "string" && input.displayName.trim()
      ? input.displayName.trim().slice(0, 80)
      : "School Teacher";

  return provisionSchoolStaffAccount(serviceRole, {
    schoolId: input.schoolId,
    managerId: input.managerId,
    displayName,
    staffRole: "school_teacher",
    membershipRole: "teacher",
    sequenceKind: SCHOOL_STAFF_KIND_TEACHER,
    persona: "school_teacher",
    quotaType: "teacher",
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string; managerId: string; displayName: string }} input
 */
export async function provisionSchoolOperatorStaff(serviceRole, input) {
  const displayName =
    typeof input.displayName === "string" && input.displayName.trim()
      ? input.displayName.trim().slice(0, 80)
      : "School Operator";

  return provisionSchoolStaffAccount(serviceRole, {
    schoolId: input.schoolId,
    managerId: input.managerId,
    displayName,
    staffRole: "school_operator",
    membershipRole: "school_operator",
    sequenceKind: SCHOOL_STAFF_KIND_OPERATOR,
    persona: "school_operator",
    quotaType: "operator",
  });
}

/** @internal Test hook — provision with injectable deps (see orphan cleanup test). */
export async function provisionSchoolStaffAccountForTest(serviceRole, input) {
  return provisionSchoolStaffAccount(serviceRole, input);
}

/**
 * @param {object|null|undefined} body
 */
export function parseCreateStaffBody(body) {
  const raw = body && typeof body === "object" ? body : {};
  const displayName = typeof raw.displayName === "string" ? raw.displayName.trim() : "";
  if (!displayName || displayName.length > 80) {
    return { ok: false, status: 400, code: "validation_failed", field: "displayName" };
  }
  return { ok: true, displayName };
}
