import { getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  recordLoginSuccess,
} from "../security/login-rate-limit.js";
import { assertActivePersonaEntitlement } from "../auth/persona-guard.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { writeSchoolStaffAuditRow } from "./school-staff-audit.server.js";
import {
  STAFF_CODE_RE,
  hashStaffSecret,
  normalizeStaffCode,
  normalizeStaffPin,
} from "./school-staff-crypto.server.js";
import {
  issueStaffSession,
  staffRequestMeta,
} from "./school-staff-session.server.js";

const LOCKOUT_AFTER_FAILS = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} accessId
 * @param {boolean} success
 */
async function recordStaffAccessAttempt(serviceRole, accessId, success) {
  const { data: row } = await serviceRole
    .from("school_staff_access_codes")
    .select("id, failed_attempts")
    .eq("id", accessId)
    .maybeSingle();

  if (!row?.id) return;

  if (success) {
    await serviceRole
      .from("school_staff_access_codes")
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", accessId);
    return;
  }

  const fails = (row.failed_attempts || 0) + 1;
  const patch = { failed_attempts: fails };
  if (fails >= LOCKOUT_AFTER_FAILS) {
    patch.locked_until = new Date(Date.now() + LOCKOUT_MS).toISOString();
  }
  await serviceRole.from("school_staff_access_codes").update(patch).eq("id", accessId);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} codeNormalized
 * @param {string} pinNormalized
 */
async function verifyStaffCredentials(serviceRole, codeNormalized, pinNormalized) {
  const { data: rows, error } = await serviceRole
    .from("school_staff_access_codes")
    .select(
      "id, school_id, user_id, staff_role, pin_hash, is_active, revoked_at, locked_until, must_change_pin"
    )
    .eq("code_display_normalized", codeNormalized)
    .eq("is_active", true)
    .is("revoked_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const pinHash = hashStaffSecret(pinNormalized);
  const nowMs = Date.now();
  const matching = (rows || []).filter((row) => {
    if (row.locked_until) {
      const lockedUntil = new Date(row.locked_until).getTime();
      if (Number.isFinite(lockedUntil) && lockedUntil > nowMs) return false;
    }
    return row.pin_hash === pinHash;
  });

  if (!matching.length) {
    return { ok: false, status: 401, code: "invalid_credentials" };
  }

  if (matching.length > 1) {
    return { ok: false, status: 409, code: "ambiguous_credentials" };
  }

  const accessRow = matching[0];
  const persona = accessRow.staff_role;
  const entitlement = await assertActivePersonaEntitlement(serviceRole, accessRow.user_id, persona);
  if (!entitlement.ok) {
    return { ok: false, status: 403, code: entitlement.code || "not_authorized" };
  }

  return { ok: true, accessRow };
}

/**
 * @param {{ staffCode?: string, pin?: string, req: import('http').IncomingMessage }} input
 */
export async function staffLogin(input) {
  const serviceRole = getLearningSupabaseServiceRoleClient();
  const meta = staffRequestMeta(input.req);

  const codeNormalized = normalizeStaffCode(input.staffCode || "");
  const pinNormalized = normalizeStaffPin(input.pin || "");

  if (!codeNormalized || !STAFF_CODE_RE.test(codeNormalized)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }
  if (!/^\d{4}$/.test(pinNormalized)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const rl = checkLoginRateLimit(input.req, codeNormalized);
  if (!rl.allowed) {
    return { ok: false, status: 429, code: "rate_limited", retryAfterSec: rl.retryAfterSec };
  }

  const cred = await verifyStaffCredentials(serviceRole, codeNormalized, pinNormalized);
  if (!cred.ok) {
    if (cred.code === "invalid_credentials") {
      recordLoginFailure(input.req, codeNormalized);
      const { data: accessRows } = await serviceRole
        .from("school_staff_access_codes")
        .select("id, school_id")
        .eq("code_display_normalized", codeNormalized)
        .eq("is_active", true)
        .is("revoked_at", null);
      for (const row of accessRows || []) {
        await recordStaffAccessAttempt(serviceRole, row.id, false);
      }
      await writeSchoolStaffAuditRow(serviceRole, {
        schoolId: accessRows?.[0]?.school_id || "00000000-0000-0000-0000-000000000000",
        action: "staff_login_failed",
        metadata: { code_normalized: codeNormalized, error_code: "invalid_credentials" },
        ipHash: meta.ipHash,
        userAgent: meta.userAgent,
      });
    }
    return cred;
  }

  recordLoginSuccess(input.req, codeNormalized);
  await recordStaffAccessAttempt(serviceRole, cred.accessRow.id, true);

  const session = await issueStaffSession(serviceRole, cred.accessRow, {
    userAgent: meta.userAgent,
    ipHash: meta.ipHash,
  });
  if (!session.ok) return session;

  await writeSchoolStaffAuditRow(serviceRole, {
    schoolId: cred.accessRow.school_id,
    action: "staff_login_success",
    actorUserId: cred.accessRow.user_id,
    targetUserId: cred.accessRow.user_id,
    metadata: { staff_role: cred.accessRow.staff_role },
    ipHash: meta.ipHash,
    userAgent: meta.userAgent,
  });

  const redirectPath =
    cred.accessRow.must_change_pin === true
      ? "/school/staff/change-pin"
      : cred.accessRow.staff_role === "school_operator"
        ? "/school/operator/dashboard"
        : "/teacher/dashboard";

  return {
    ok: true,
    sessionToken: session.token,
    cookieMaxAgeSec: session.maxAgeSec,
    data: {
      userId: cred.accessRow.user_id,
      schoolId: cred.accessRow.school_id,
      staffRole: cred.accessRow.staff_role,
      mustChangePin: Boolean(cred.accessRow.must_change_pin),
      redirectPath,
      expiresAt: session.sessionExpiresAt,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 * @param {string} schoolId
 */
export async function loadActiveStaffAccessForUser(serviceRole, userId, schoolId) {
  const { data, error } = await serviceRole
    .from("school_staff_access_codes")
    .select(
      "id, code_display, staff_role, is_active, revoked_at, must_change_pin, locked_until, last_login_at"
    )
    .eq("user_id", userId)
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, access: data || null };
}
