import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import {
  formatSchoolAccessSequence,
  loadSchoolCode,
} from "./school-access-username.server.js";

export const SCHOOL_STAFF_KIND_TEACHER = "t";
export const SCHOOL_STAFF_KIND_OPERATOR = "o";

/**
 * @param {string} schoolCode
 * @param {"t"|"o"} kind
 * @param {number} sequence
 */
export function formatSchoolStaffCode(schoolCode, kind, sequence) {
  const code = String(schoolCode || "").trim().toLowerCase();
  if (!/^[a-z]{3,4}$/.test(code)) {
    throw new Error("invalid_school_code");
  }
  if (kind !== SCHOOL_STAFF_KIND_TEACHER && kind !== SCHOOL_STAFF_KIND_OPERATOR) {
    throw new Error("invalid_staff_kind");
  }
  return `${code}-${kind}${formatSchoolAccessSequence(sequence)}`;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {"t"|"o"} kind
 */
export async function reserveNextSchoolStaffCode(serviceRole, schoolId, kind) {
  const schoolCodeResult = await loadSchoolCode(serviceRole, schoolId);
  if (!schoolCodeResult.ok) return schoolCodeResult;

  const seqColumn =
    kind === SCHOOL_STAFF_KIND_TEACHER ? "next_teacher_seq" : "next_operator_seq";

  const { data: existing, error: loadErr } = await serviceRole
    .from("school_credential_sequences")
    .select(`school_id, ${seqColumn}`)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (loadErr) {
    if (isDbSchemaNotReadyError(loadErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  let sequence = 1;
  if (!existing?.school_id) {
    const insertPayload = {
      school_id: schoolId,
      next_parent_seq: 1,
      next_student_seq: 1,
      next_teacher_seq: 1,
      next_operator_seq: 1,
    };
    const { error: insErr } = await serviceRole.from("school_credential_sequences").insert(insertPayload);
    if (insErr && insErr.code !== "23505") {
      if (isDbSchemaNotReadyError(insErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
  } else {
    sequence = Number(existing[seqColumn]) || 1;
  }

  const nextSeq = sequence + 1;
  const { error: updErr } = await serviceRole
    .from("school_credential_sequences")
    .update({ [seqColumn]: nextSeq, updated_at: new Date().toISOString() })
    .eq("school_id", schoolId);

  if (updErr) {
    if (isDbSchemaNotReadyError(updErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const codeDisplay = formatSchoolStaffCode(schoolCodeResult.schoolCode, kind, sequence);
  return {
    ok: true,
    codeDisplay,
    codeDisplayNormalized: codeDisplay.toLowerCase(),
    sequence,
  };
}

/**
 * Roll back a reserved sequence increment after failed provisioning.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {"t"|"o"} kind
 * @param {number} sequence
 */
export async function rollbackSchoolStaffSequence(serviceRole, schoolId, kind, sequence) {
  const seqColumn =
    kind === SCHOOL_STAFF_KIND_TEACHER ? "next_teacher_seq" : "next_operator_seq";
  await serviceRole
    .from("school_credential_sequences")
    .update({ [seqColumn]: Math.max(1, sequence), updated_at: new Date().toISOString() })
    .eq("school_id", schoolId);
}
