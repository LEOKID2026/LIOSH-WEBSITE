import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { assertTeacherCanManageStudentAccess } from "./teacher-student-access.server.js";
import { isUuid } from "./teacher-request.server.js";
import {
  allocateTeacherAccessUsername,
  generateTeacherPrefixedStudentUsername,
  TEACHER_ACCESS_KIND_STUDENT,
} from "./teacher-access-prefix.server.js";
import {
  generateStudentPin,
  hashStudentSecret,
  normalizeStudentPin,
  normalizeStudentUsername,
} from "../guardian-server/guardian-crypto.server.js";

/**
 * @param {Record<string, unknown>} row
 */
export function computeStudentLoginAccessState(row) {
  if (!row) return "revoked";
  if (row.revoked_at != null || row.is_active === false) return "revoked";
  if (row.expires_at && row.expires_at <= new Date().toISOString()) return "expired";
  return "active";
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} studentId
 */
export async function endLiveStudentSessions(serviceRole, studentId) {
  const now = new Date().toISOString();
  await serviceRole
    .from("student_sessions")
    .update({ ended_at: now })
    .eq("student_id", studentId)
    .is("ended_at", null);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 */
export async function listTeacherStudentLoginAccess(serviceRole, teacherId, studentId) {
  const linked = await assertTeacherCanManageStudentAccess(serviceRole, teacherId, studentId);
  if (!linked.ok) return linked;

  const { data, error } = await serviceRole
    .from("student_access_codes")
    .select("id, login_username, is_active, revoked_at, expires_at, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const accesses = (data || []).map((row) => ({
    accessId: row.id,
    studentId,
    state: computeStudentLoginAccessState(row),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    loginUsername: row.login_username,
  }));

  return { ok: true, accesses };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 */
async function findActiveStudentLoginAccess(serviceRole, studentId) {
  const { data, error } = await serviceRole
    .from("student_access_codes")
    .select("id, expires_at, revoked_at, is_active")
    .eq("student_id", studentId)
    .eq("is_active", true)
    .is("revoked_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const active = (data || []).find((row) => computeStudentLoginAccessState(row) === "active");
  return { ok: true, row: active || null };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   studentId: string,
 *   defaultPin?: string|null,
 *   preferredSequence?: number|null,
 * }} input
 */
export async function createTeacherStudentLoginAccess(input) {
  const { serviceRole, teacherId, studentId, defaultPin, preferredSequence } = input;

  const linked = await assertTeacherCanManageStudentAccess(serviceRole, teacherId, studentId);
  if (!linked.ok) return linked;

  const existing = await findActiveStudentLoginAccess(serviceRole, studentId);
  if (!existing.ok) return existing;
  if (existing.row?.id) {
    return { ok: false, status: 409, code: "active_access_exists" };
  }

  const usernameGen = await generateTeacherPrefixedStudentUsername(serviceRole, teacherId, {
    studentId,
    preferredSequence,
  });
  if (!usernameGen.ok) return usernameGen;

  const pinPlain =
    defaultPin && /^\d{4}$/.test(String(defaultPin))
      ? String(defaultPin)
      : generateStudentPin();
  const pin = normalizeStudentPin(pinPlain);
  const username = usernameGen.loginUsername;
  const usernameNormalized = usernameGen.loginUsernameNormalized;
  const codeHash = hashStudentSecret(usernameNormalized);
  const pinHash = hashStudentSecret(pin);

  const { data: inserted, error: insErr } = await serviceRole
    .from("student_access_codes")
    .insert({
      student_id: studentId,
      login_username: username,
      code_hash: codeHash,
      pin_hash: pinHash,
      is_active: true,
    })
    .select("id")
    .single();

  if (insErr) {
    if (isDbSchemaNotReadyError(insErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    data: {
      accessId: inserted.id,
      studentId,
      loginUsername: username,
      loginPinPlaintext: pinPlain,
      shownOnceWarning: "Plaintext PIN will not be retrievable after this response. Store securely.",
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} accessId
 */
export async function loadTeacherOwnedStudentLoginAccess(serviceRole, teacherId, accessId) {
  if (!isUuid(accessId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("student_access_codes")
    .select("id, student_id, is_active, revoked_at, expires_at, login_username")
    .eq("id", accessId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data?.id) {
    return { ok: false, status: 404, code: "access_not_found" };
  }

  const linked = await assertTeacherCanManageStudentAccess(serviceRole, teacherId, data.student_id);
  if (!linked.ok) return { ok: false, status: 404, code: "access_not_found" };

  return { ok: true, row: data };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   accessId: string,
 * }} input
 */
export async function revokeTeacherStudentLoginAccess(input) {
  const { serviceRole, teacherId, accessId } = input;
  const loaded = await loadTeacherOwnedStudentLoginAccess(serviceRole, teacherId, accessId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  if (row.revoked_at != null || row.is_active === false) {
    return { ok: false, status: 409, code: "already_revoked" };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await serviceRole
    .from("student_access_codes")
    .update({ is_active: false, revoked_at: now })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  await endLiveStudentSessions(serviceRole, row.student_id);

  return { ok: true, data: { accessId, revokedAt: now } };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   accessId: string,
 * }} input
 */
export async function rotateTeacherStudentLoginPin(input) {
  const { serviceRole, teacherId, accessId } = input;
  const loaded = await loadTeacherOwnedStudentLoginAccess(serviceRole, teacherId, accessId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  if (computeStudentLoginAccessState(row) !== "active") {
    return { ok: false, status: 409, code: "access_not_active" };
  }

  const pinPlain = generateStudentPin();
  const pinHash = hashStudentSecret(normalizeStudentPin(pinPlain));
  const now = new Date().toISOString();

  const { error: updErr } = await serviceRole
    .from("student_access_codes")
    .update({ pin_hash: pinHash, updated_at: now })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  await endLiveStudentSessions(serviceRole, row.student_id);

  return {
    ok: true,
    data: { accessId, loginPinPlaintext: pinPlain, rotatedAt: now },
  };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   accessId: string,
 * }} input
 */
export async function rotateTeacherStudentLoginUsername(input) {
  const { serviceRole, teacherId, accessId } = input;
  const loaded = await loadTeacherOwnedStudentLoginAccess(serviceRole, teacherId, accessId);
  if (!loaded.ok) return loaded;

  const row = loaded.row;
  if (computeStudentLoginAccessState(row) !== "active") {
    return { ok: false, status: 409, code: "access_not_active" };
  }

  const usernameGen = await allocateTeacherAccessUsername(
    serviceRole,
    teacherId,
    TEACHER_ACCESS_KIND_STUDENT,
    { studentId: row.student_id }
  );
  if (!usernameGen.ok) return usernameGen;

  const username = usernameGen.loginUsername;
  const usernameNormalized = usernameGen.loginUsernameNormalized;
  const codeHash = hashStudentSecret(usernameNormalized);
  const now = new Date().toISOString();

  const { error: updErr } = await serviceRole
    .from("student_access_codes")
    .update({
      login_username: username,
      code_hash: codeHash,
      updated_at: now,
    })
    .eq("id", accessId);

  if (updErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  await endLiveStudentSessions(serviceRole, row.student_id);

  return {
    ok: true,
    data: { accessId, loginUsername: username, rotatedAt: now },
  };
}
