import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import {
  hashStudentSecret,
  normalizeStudentUsername,
} from "../guardian-server/guardian-crypto.server.js";

export const SCHOOL_ACCESS_KIND_PARENT = "p";
export const SCHOOL_ACCESS_KIND_STUDENT = "s";

/**
 * @param {number} sequence
 */
export function formatSchoolAccessSequence(sequence) {
  const n = Math.max(1, Math.floor(Number(sequence) || 1));
  return String(n).padStart(4, "0");
}

/**
 * @param {string} schoolCode
 * @param {"p"|"s"} kind
 * @param {number} sequence
 */
export function formatSchoolAccessUsername(schoolCode, kind, sequence) {
  const code = String(schoolCode || "").trim().toLowerCase();
  if (!/^[a-z]{3,4}$/.test(code)) {
    throw new Error("invalid_school_code");
  }
  if (kind !== SCHOOL_ACCESS_KIND_PARENT && kind !== SCHOOL_ACCESS_KIND_STUDENT) {
    throw new Error("invalid_access_kind");
  }
  return `${code}-${kind}${formatSchoolAccessSequence(sequence)}`;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function loadSchoolCode(serviceRole, schoolId) {
  const { data, error } = await serviceRole
    .from("school_accounts")
    .select("school_code")
    .eq("id", schoolId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const schoolCode = data?.school_code ? String(data.school_code).trim().toLowerCase() : null;
  if (!schoolCode || !/^[a-z]{3,4}$/.test(schoolCode)) {
    return { ok: false, status: 409, code: "school_code_not_configured" };
  }
  return { ok: true, schoolCode };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {"p"|"s"} kind
 */
async function bumpSchoolCredentialSequence(serviceRole, schoolId, kind) {
  const { data: existing, error: loadErr } = await serviceRole
    .from("school_credential_sequences")
    .select("school_id, next_parent_seq, next_student_seq")
    .eq("school_id", schoolId)
    .maybeSingle();

  if (loadErr) {
    if (isDbSchemaNotReadyError(loadErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!existing?.school_id) {
    const { error: insErr } = await serviceRole.from("school_credential_sequences").insert({
      school_id: schoolId,
      next_parent_seq: kind === SCHOOL_ACCESS_KIND_PARENT ? 2 : 1,
      next_student_seq: kind === SCHOOL_ACCESS_KIND_STUDENT ? 2 : 1,
    });
    if (insErr) {
      if (isDbSchemaNotReadyError(insErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    return { ok: true, sequence: 1 };
  }

  const col = kind === SCHOOL_ACCESS_KIND_PARENT ? "next_parent_seq" : "next_student_seq";
  const current = Number(existing[col]) || 1;
  const nextVal = current + 1;

  const { error: updErr } = await serviceRole
    .from("school_credential_sequences")
    .update({
      [col]: nextVal,
      updated_at: new Date().toISOString(),
    })
    .eq("school_id", schoolId)
    .eq(col, current);

  if (updErr) {
    if (isDbSchemaNotReadyError(updErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, sequence: current };
}

async function isGuardianUsernameAvailable(serviceRole, usernameNormalized) {
  const { data, error } = await serviceRole
    .from("student_guardian_access")
    .select("id")
    .eq("login_username_normalized", usernameNormalized)
    .eq("is_active", true)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (error && !isDbSchemaNotReadyError(error)) {
    return { ok: false, status: 500, code: "internal_error" };
  }
  return { ok: true, available: !data?.id };
}

async function isStudentLoginUsernameAvailable(serviceRole, usernameNormalized, exceptStudentId = null) {
  const codeHash = hashStudentSecret(usernameNormalized);
  const { data, error } = await serviceRole
    .from("student_access_codes")
    .select("id, student_id")
    .eq("code_hash", codeHash)
    .eq("is_active", true)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (error && !isDbSchemaNotReadyError(error)) {
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (!data?.id) return { ok: true, available: true };
  if (exceptStudentId && data.student_id === exceptStudentId) {
    return { ok: true, available: true };
  }
  return { ok: true, available: false };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {"p"|"s"} kind
 * @param {{ studentId?: string|null }} opts
 */
export async function allocateSchoolAccessUsername(serviceRole, schoolId, kind, opts = {}) {
  const codeResult = await loadSchoolCode(serviceRole, schoolId);
  if (!codeResult.ok) return codeResult;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const seqResult = await bumpSchoolCredentialSequence(serviceRole, schoolId, kind);
    if (!seqResult.ok) return seqResult;

    const username = formatSchoolAccessUsername(codeResult.schoolCode, kind, seqResult.sequence);
    const normalized = normalizeStudentUsername(username);

    if (kind === SCHOOL_ACCESS_KIND_PARENT) {
      const check = await isGuardianUsernameAvailable(serviceRole, normalized);
      if (!check.ok) return check;
      if (!check.available) continue;
      return { ok: true, loginUsername: username, loginUsernameNormalized: normalized, sequence: seqResult.sequence };
    }

    const check = await isStudentLoginUsernameAvailable(
      serviceRole,
      normalized,
      opts.studentId || null
    );
    if (!check.ok) return check;
    if (!check.available) continue;
    return { ok: true, loginUsername: username, loginUsernameNormalized: normalized, sequence: seqResult.sequence };
  }

  return { ok: false, status: 500, code: "internal_error" };
}
