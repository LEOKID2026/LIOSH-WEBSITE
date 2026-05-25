import {
  consumeConsentTokenRow,
  hashTeacherConsentToken,
  isTeacherConsentPlaintextFormat,
  loadConsentTokenByHash,
  validateConsentTokenRow,
} from "./teacher-consent.server.js";
import { isFiniteQuotaLimit } from "./teacher-entitlements.server.js";
import { isUuid } from "./teacher-request.server.js";

const ALLOWED_RELATIONSHIPS = new Set(["primary_teacher", "subject_teacher", "tutor"]);

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function countActiveTeacherStudentLinks(serviceRole, teacherId) {
  const { count, error } = await serviceRole
    .from("teacher_students")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherId)
    .is("archived_at", null);

  if (error) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, count: count ?? 0 };
}

/**
 * @param {object} body
 */
export function parseTeacherLinkBody(body) {
  const raw = body && typeof body === "object" ? body : {};
  const studentId = raw.studentId;
  const consentToken = raw.consentToken;
  const relationship = raw.relationship || "primary_teacher";
  let notes = raw.notes;

  if (!isUuid(studentId)) {
    return { ok: false, code: "validation_failed", field: "studentId" };
  }
  if (!isTeacherConsentPlaintextFormat(consentToken)) {
    return { ok: false, code: "consent_required", field: "consentToken" };
  }
  if (!ALLOWED_RELATIONSHIPS.has(relationship)) {
    return { ok: false, code: "validation_failed", field: "relationship" };
  }
  if (notes != null) {
    if (typeof notes !== "string") return { ok: false, code: "validation_failed", field: "notes" };
    notes = notes.trim();
    if (notes.length > 500) return { ok: false, code: "validation_failed", field: "notes" };
    if (!notes) notes = null;
  } else {
    notes = null;
  }

  return {
    ok: true,
    studentId: studentId.trim(),
    consentToken: String(consentToken).trim(),
    relationship,
    notes,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 */
export async function assertStudentExists(serviceRole, studentId) {
  const { data, error } = await serviceRole
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (!data) {
    return { ok: false, status: 404, code: "student_not_found" };
  }
  return { ok: true };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   studentId: string,
 *   consentToken: string,
 *   relationship: string,
 *   notes: string|null,
 *   studentLimit: number|null,
 *   planCode: string,
 * }} input
 */
export async function linkTeacherStudentWithConsent(input) {
  const { serviceRole, teacherId, studentId, consentToken, relationship, notes, studentLimit, planCode } =
    input;

  const tokenHash = hashTeacherConsentToken(consentToken);
  const loaded = await loadConsentTokenByHash(serviceRole, tokenHash);
  if (!loaded.ok) return loaded;

  const validation = validateConsentTokenRow(loaded.row, teacherId, studentId);
  if (!validation.valid) {
    return { ok: false, status: 403, code: "consent_invalid" };
  }

  const exists = await assertStudentExists(serviceRole, studentId);
  if (!exists.ok) return exists;

  const activeCount = await countActiveTeacherStudentLinks(serviceRole, teacherId);
  if (!activeCount.ok) return activeCount;
  if (isFiniteQuotaLimit(studentLimit) && activeCount.count >= studentLimit) {
    return {
      ok: false,
      status: 409,
      code: "link_limit_reached",
      studentLimit,
      planCode,
    };
  }

  const { data: existingLink } = await serviceRole
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .is("archived_at", null)
    .maybeSingle();

  if (existingLink?.id) {
    return { ok: false, status: 409, code: "already_linked" };
  }

  const consumed = await consumeConsentTokenRow(serviceRole, validation.row.id);
  if (!consumed.ok) {
    return consumed;
  }

  const { data: inserted, error: insertErr } = await serviceRole
    .from("teacher_students")
    .insert({
      teacher_id: teacherId,
      student_id: studentId,
      relationship,
      notes,
    })
    .select("id, student_id, relationship, created_at")
    .single();

  if (insertErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    linkId: inserted.id,
    studentId: inserted.student_id,
    relationship: inserted.relationship,
    linkedAt: inserted.created_at,
  };
}

/**
 * @param {object} body
 */
export function parseTeacherUnlinkBody(body) {
  const raw = body && typeof body === "object" ? body : {};
  const linkId = raw.linkId;
  if (!isUuid(linkId)) {
    return { ok: false, code: "validation_failed", field: "linkId" };
  }
  let reason = raw.reason;
  if (reason != null) {
    if (typeof reason !== "string") return { ok: false, code: "validation_failed", field: "reason" };
    reason = reason.trim();
    if (reason.length > 200) return { ok: false, code: "validation_failed", field: "reason" };
    if (!reason) reason = null;
  }
  return { ok: true, linkId: linkId.trim(), reason };
}

/**
 * @param {{
 *   serviceRole: import('@supabase/supabase-js').SupabaseClient,
 *   teacherId: string,
 *   linkId: string,
 *   reason: string|null,
 * }} input
 */
export async function unlinkTeacherStudent(input) {
  const { serviceRole, teacherId, linkId, reason } = input;

  const { data: link, error: linkErr } = await serviceRole
    .from("teacher_students")
    .select("id, teacher_id, student_id, archived_at")
    .eq("id", linkId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (linkErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (!link || link.archived_at != null) {
    return { ok: false, status: 404, code: "link_not_found" };
  }

  const now = new Date().toISOString();
  const updatePayload = { archived_at: now, updated_at: now };
  if (reason) {
    updatePayload.notes = reason;
  }

  const { error: archiveErr } = await serviceRole
    .from("teacher_students")
    .update(updatePayload)
    .eq("id", linkId)
    .eq("teacher_id", teacherId)
    .is("archived_at", null);

  if (archiveErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const { data: classRows } = await serviceRole
    .from("teacher_classes")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("is_archived", false)
    .is("archived_at", null);

  let archivedClassMemberships = 0;
  const classIds = (classRows || []).map((c) => c.id);
  if (classIds.length) {
    const { data: memberships, error: memListErr } = await serviceRole
      .from("teacher_class_students")
      .select("id, class_id")
      .in("class_id", classIds)
      .eq("student_id", link.student_id)
      .is("removed_at", null);

    if (!memListErr && memberships?.length) {
      const ids = memberships.map((m) => m.id);
      const { error: memErr } = await serviceRole
        .from("teacher_class_students")
        .update({ removed_at: now })
        .in("id", ids);
      if (!memErr) {
        archivedClassMemberships = ids.length;
      }
    }
  }

  return {
    ok: true,
    linkId,
    studentId: link.student_id,
    archivedAt: now,
    archivedClassMemberships,
    guardianAccessRevoked: 0,
  };
}
