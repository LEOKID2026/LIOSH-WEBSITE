import { LEARNING_SUBJECT_ALLOWLIST } from "../learning-supabase/learning-activity.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { buildStudentTeacherGuidance } from "../teacher-server/teacher-recommendations.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { loadTeacherSchoolMembership } from "./school-membership.server.js";

export function normalizeSubjectKey(subject) {
  return String(subject || "")
    .trim()
    .toLowerCase();
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} schoolId
 * @param {string} subject
 * @param {string|null|undefined} gradeLevel
 */
export async function checkSchoolTeacherSubjectPermission(
  serviceRole,
  teacherId,
  schoolId,
  subject,
  gradeLevel
) {
  const subjectKey = normalizeSubjectKey(subject);
  if (!subjectKey) return false;

  const grade =
    gradeLevel != null && String(gradeLevel).trim() !== "" ? String(gradeLevel).trim() : null;

  const { data, error } = await serviceRole
    .from("school_teacher_subjects")
    .select("id, subject, grade_level")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId);

  if (error) {
    return false;
  }

  for (const row of data || []) {
    if (normalizeSubjectKey(row.subject) !== subjectKey) continue;
    if (!row.grade_level || !grade || row.grade_level === grade) {
      return true;
    }
  }

  return false;
}

/**
 * Returns Set<string> of normalized subject keys, or null if unrestricted.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function loadTeacherPermittedSubjects(serviceRole, teacherId) {
  const membershipResult = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!membershipResult.ok) {
    return { ok: false, status: membershipResult.status, code: membershipResult.code };
  }

  const membership = membershipResult.membership;
  if (!membership || membership.role === "school_admin") {
    return { ok: true, permittedSubjects: null, membership };
  }

  const { data, error } = await serviceRole
    .from("school_teacher_subjects")
    .select("subject")
    .eq("school_id", membership.schoolId)
    .eq("teacher_id", teacherId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const set = new Set((data || []).map((r) => normalizeSubjectKey(r.subject)));
  return { ok: true, permittedSubjects: set, membership };
}

/**
 * @param {object} reportPayload
 * @param {Set<string>|null} permittedSubjects normalized keys; null = no filter
 */
export function filterReportByPermittedSubjects(reportPayload, permittedSubjects) {
  if (!permittedSubjects || permittedSubjects.size === 0) {
    if (permittedSubjects && permittedSubjects.size === 0) {
      const empty = { ...reportPayload };
      if (empty.subjects && typeof empty.subjects === "object") {
        empty.subjects = {};
      }
      if (Array.isArray(empty.recentMistakes)) {
        empty.recentMistakes = [];
      }
      if (empty.teacherGuidanceBlock) {
        empty.teacherGuidanceBlock = buildStudentTeacherGuidance(empty);
      }
      return empty;
    }
    return reportPayload;
  }

  const out = { ...reportPayload };

  if (out.subjects && typeof out.subjects === "object") {
    const filtered = {};
    for (const [key, value] of Object.entries(out.subjects)) {
      if (permittedSubjects.has(normalizeSubjectKey(key))) {
        filtered[key] = value;
      }
    }
    out.subjects = filtered;
  }

  if (Array.isArray(out.recentMistakes)) {
    out.recentMistakes = out.recentMistakes.filter((row) => {
      const subj = row?.subject ?? row?.metadata?.subject;
      if (!subj) return true;
      return permittedSubjects.has(normalizeSubjectKey(subj));
    });
  }

  if (out.probeEvidence && typeof out.probeEvidence === "object") {
    const pe = { ...out.probeEvidence };
    if (pe.bySubject && typeof pe.bySubject === "object") {
      const filteredPe = {};
      for (const [key, value] of Object.entries(pe.bySubject)) {
        if (permittedSubjects.has(normalizeSubjectKey(key))) {
          filteredPe[key] = value;
        }
      }
      pe.bySubject = filteredPe;
    }
    out.probeEvidence = pe;
  }

  if (out.teacherGuidanceBlock) {
    out.teacherGuidanceBlock = buildStudentTeacherGuidance(out);
  }

  return out;
}

/** Subject-bearing keys in teacher student report payloads (no separate activityHistory arrays). */
export const TEACHER_REPORT_SUBJECT_FILTER_KEYS = [
  "subjects",
  "recentMistakes",
  "probeEvidence.bySubject",
];

/**
 * Enforce subject permission for school teachers on activity/report mutations.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} subject
 * @param {string|null|undefined} gradeLevel
 */
export async function assertSchoolTeacherSubjectAllowed(
  serviceRole,
  teacherId,
  subject,
  gradeLevel
) {
  const membershipResult = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!membershipResult.ok) {
    return membershipResult;
  }

  const membership = membershipResult.membership;
  if (!membership) {
    return { ok: true, allowed: true, membership: null };
  }

  if (membership.role === "school_admin") {
    return { ok: true, allowed: true, membership };
  }

  const allowed = await checkSchoolTeacherSubjectPermission(
    serviceRole,
    teacherId,
    membership.schoolId,
    subject,
    gradeLevel
  );

  if (!allowed) {
    return { ok: false, status: 403, code: "subject_not_permitted" };
  }

  return { ok: true, allowed: true, membership };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} teacherId
 */
export async function listSchoolTeacherSubjects(serviceRole, schoolId, teacherId) {
  const { data, error } = await serviceRole
    .from("school_teacher_subjects")
    .select("id, school_id, teacher_id, subject, grade_level, granted_by, created_at")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .order("subject", { ascending: true });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    subjects: (data || []).map((row) => ({
      id: row.id,
      subject: row.subject,
      gradeLevel: row.grade_level,
      grantedBy: row.granted_by,
      createdAt: row.created_at,
    })),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string, teacherId: string, subject: string, gradeLevel?: string|null, grantedBy: string }} input
 */
export async function grantSchoolTeacherSubject(serviceRole, input) {
  const subject = typeof input.subject === "string" ? input.subject.trim().toLowerCase() : "";
  if (!subject || !LEARNING_SUBJECT_ALLOWLIST.has(subject)) {
    return { ok: false, status: 400, code: "validation_failed", field: "subject" };
  }

  let gradeLevel = input.gradeLevel;
  if (gradeLevel != null) {
    gradeLevel = String(gradeLevel).trim() || null;
    if (gradeLevel && gradeLevel.length > 32) {
      return { ok: false, status: 400, code: "validation_failed", field: "gradeLevel" };
    }
  } else {
    gradeLevel = null;
  }

  const { data, error } = await serviceRole
    .from("school_teacher_subjects")
    .insert({
      school_id: input.schoolId,
      teacher_id: input.teacherId,
      subject,
      grade_level: gradeLevel,
      granted_by: input.grantedBy,
    })
    .select("id, subject, grade_level, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, status: 409, code: "subject_already_granted" };
    }
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, row: data };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} subjectId
 */
export async function revokeSchoolTeacherSubject(serviceRole, schoolId, subjectId) {
  if (!isUuid(subjectId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: row, error: fetchErr } = await serviceRole
    .from("school_teacher_subjects")
    .select("id, school_id, teacher_id, subject")
    .eq("id", subjectId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!row || row.school_id !== schoolId) {
    return { ok: false, status: 403, code: "subject_not_in_school" };
  }

  const { error } = await serviceRole.from("school_teacher_subjects").delete().eq("id", subjectId);
  if (error) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, row };
}

/**
 * Apply subject filter to a built student/parent report payload for school teachers.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {object} payload
 */
export async function applySchoolTeacherReportFilter(serviceRole, teacherId, payload) {
  const perm = await loadTeacherPermittedSubjects(serviceRole, teacherId);
  if (!perm.ok) {
    return perm;
  }
  return {
    ok: true,
    payload: filterReportByPermittedSubjects(payload, perm.permittedSubjects),
  };
}

/**
 * Block class report when subject_focus is outside permitted subjects.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} classId
 */
export async function assertTeacherClassReportSubjectAllowed(serviceRole, teacherId, classId) {
  const membershipResult = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!membershipResult.ok) {
    return membershipResult;
  }

  const membership = membershipResult.membership;
  if (!membership || membership.role === "school_admin") {
    return { ok: true };
  }

  const { data: cls, error } = await serviceRole
    .from("teacher_classes")
    .select("subject_focus, grade_level")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!cls) {
    return { ok: false, status: 404, code: "class_not_found" };
  }

  const focus = cls.subject_focus ? String(cls.subject_focus).trim() : "";
  if (!focus) {
    return { ok: true };
  }

  const allowed = await checkSchoolTeacherSubjectPermission(
    serviceRole,
    teacherId,
    membership.schoolId,
    focus,
    cls.grade_level
  );

  if (!allowed) {
    return { ok: false, status: 403, code: "subject_not_permitted_for_class" };
  }

  return { ok: true };
}
