import { LEARNING_SUBJECT_ALLOWLIST } from "../learning-supabase/learning-activity.js";
import { schoolSubjectGradeKeysMatch } from "../teacher-portal/teacher-class-grade.js";
import { buildParentFacingBlocks } from "../parent-server/parent-report-parent-facing.server.js";
import { stripInternalReportPayloadFields } from "../parent-server/report-data-aggregate.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { buildStudentTeacherGuidanceV2 } from "../teacher-server/teacher-guidance-v2.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { loadTeacherSchoolMembership, verifyTeacherMembershipInSchool } from "./school-membership.server.js";
import { normalizeMoledetGeographyActivitySubjectId } from "../learning-shared/moledet-geography-subject-id.js";

export function normalizeSubjectKey(subject) {
  const moledet = normalizeMoledetGeographyActivitySubjectId(subject);
  if (moledet) return moledet;
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
    if (schoolSubjectGradeKeysMatch(row.grade_level, grade)) {
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
 * Sum sessions/answers/correct/wrong from a report subjects map.
 * @param {Record<string, { sessions?: number, answers?: number, correct?: number, wrong?: number }>|null|undefined} subjects
 */
export function sumMetricsFromSubjectRollups(subjects) {
  let totalSessions = 0;
  let totalAnswers = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;

  for (const subj of Object.values(subjects || {})) {
    if (!subj || typeof subj !== "object") continue;
    totalSessions += Number(subj.sessions) || 0;
    totalAnswers += Number(subj.answers) || 0;
    correctAnswers += Number(subj.correct) || 0;
    wrongAnswers += Number(subj.wrong) || 0;
  }

  return {
    totalSessions,
    totalAnswers,
    correctAnswers,
    wrongAnswers,
    accuracy:
      totalAnswers > 0 ? Number(((correctAnswers / totalAnswers) * 100).toFixed(2)) : null,
  };
}

/**
 * Recompute top-level summary from the subjects map (single source of truth for subject cards).
 * @param {object} reportPayload
 */
export function recomputeReportSummaryFromSubjects(reportPayload) {
  const metrics = sumMetricsFromSubjectRollups(reportPayload?.subjects);
  const summary = {
    ...(typeof reportPayload?.summary === "object" && reportPayload.summary ? reportPayload.summary : {}),
  };
  summary.totalSessions = metrics.totalSessions;
  summary.totalAnswers = metrics.totalAnswers;
  summary.correctAnswers = metrics.correctAnswers;
  summary.wrongAnswers = metrics.wrongAnswers;
  summary.accuracy = metrics.totalAnswers > 0 ? metrics.accuracy : 0;
  return { ...reportPayload, summary };
}

/**
 * Debug helper: compare summary totals vs subject rollup totals.
 * @param {object} reportPayload
 * @param {Set<string>|null} [permittedSubjects]
 */
export function analyzeReportSubjectReconciliation(reportPayload, permittedSubjects = null) {
  const summary = reportPayload?.summary || {};
  const allSubjects = reportPayload?.subjects && typeof reportPayload.subjects === "object"
    ? reportPayload.subjects
    : {};

  const bySubject = {};
  for (const [key, subj] of Object.entries(allSubjects)) {
    bySubject[key] = {
      sessions: Number(subj?.sessions) || 0,
      answers: Number(subj?.answers) || 0,
      correct: Number(subj?.correct) || 0,
      permitted:
        !permittedSubjects ||
        permittedSubjects.size === 0 ||
        permittedSubjects.has(normalizeSubjectKey(key)),
    };
  }

  const visibleSubjects = {};
  const droppedSubjects = {};
  for (const [key, row] of Object.entries(bySubject)) {
    if (row.permitted) visibleSubjects[key] = row;
    else droppedSubjects[key] = row;
  }

  const visibleMetrics = sumMetricsFromSubjectRollups(
    Object.fromEntries(
      Object.entries(allSubjects).filter(([key]) =>
        !permittedSubjects || permittedSubjects.has(normalizeSubjectKey(key))
      )
    )
  );
  const allSubjectMetrics = sumMetricsFromSubjectRollups(allSubjects);

  return {
    summary: {
      totalSessions: Number(summary.totalSessions) || 0,
      totalAnswers: Number(summary.totalAnswers) || 0,
      correctAnswers: Number(summary.correctAnswers) || 0,
      accuracy: summary.accuracy ?? null,
    },
    allSubjectsTotal: allSubjectMetrics,
    visibleSubjectsTotal: visibleMetrics,
    bySubject,
    droppedSubjects,
    visibleSubjects,
    reconciled:
      Number(summary.totalSessions) === visibleMetrics.totalSessions &&
      Number(summary.totalAnswers) === visibleMetrics.totalAnswers,
    gap: {
      sessions: (Number(summary.totalSessions) || 0) - visibleMetrics.totalSessions,
      answers: (Number(summary.totalAnswers) || 0) - visibleMetrics.totalAnswers,
    },
  };
}

/**
 * @param {string|null|undefined} subject
 * @param {Set<string>|null} permittedSubjects
 */
export function isSubjectInPermittedScope(subject, permittedSubjects) {
  if (!permittedSubjects) return true;
  if (permittedSubjects.size === 0) return false;
  const key = normalizeSubjectKey(subject);
  if (!key) return false;
  return permittedSubjects.has(key);
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
      const zeroed = recomputeReportSummaryFromSubjects(empty);
      zeroed.teacherGuidanceBlock = buildStudentTeacherGuidanceV2(zeroed, {
        permittedSubjects,
      });
      applyDailyActivityFilterFromSubjectBreakdown(zeroed, permittedSubjects);
      if (zeroed.parentFacing && typeof zeroed.parentFacing === "object") {
        const blocks = buildParentFacingBlocks(zeroed);
        zeroed.parentFacing = {
          ...zeroed.parentFacing,
          insights: blocks.insights,
          homeRecommendations: blocks.homeRecommendations,
        };
      }
      return stripInternalReportPayloadFields(zeroed);
    }
    return stripInternalReportPayloadFields(reportPayload);
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

  const reconciled = recomputeReportSummaryFromSubjects(out);
  reconciled.teacherGuidanceBlock = buildStudentTeacherGuidanceV2(reconciled, {
    permittedSubjects,
  });
  applyDailyActivityFilterFromSubjectBreakdown(reconciled, permittedSubjects);

  if (reconciled.parentFacing && typeof reconciled.parentFacing === "object") {
    const blocks = buildParentFacingBlocks(reconciled);
    reconciled.parentFacing = {
      ...reconciled.parentFacing,
      insights: blocks.insights,
      homeRecommendations: blocks.homeRecommendations,
    };
  }

  return stripInternalReportPayloadFields(reconciled);
}

/**
 * Rebuild `dailyActivity` from the `_dailyBySubject` per-subject breakdown so the
 * day-level totals reflect only the subjects the caller is permitted to see.
 * When `permittedSubjects` is null (unrestricted) all subjects contribute - which
 * matches the unfiltered aggregator output.
 * @param {object} payload mutated in place
 * @param {Set<string>|null} permittedSubjects
 */
function applyDailyActivityFilterFromSubjectBreakdown(payload, permittedSubjects) {
  if (!payload || typeof payload !== "object") return;
  const breakdown = payload.dailyActivityBySubject || payload._dailyBySubject;
  if (!breakdown || typeof breakdown !== "object") {
    delete payload._dailyBySubject;
    delete payload.dailyActivityBySubject;
    return;
  }

  const dailyMap = new Map();
  for (const [dateKey, subjectMap] of Object.entries(breakdown)) {
    if (!subjectMap || typeof subjectMap !== "object") continue;
    for (const [subjectKey, counts] of Object.entries(subjectMap)) {
      if (!counts || typeof counts !== "object") continue;
      if (permittedSubjects && !permittedSubjects.has(normalizeSubjectKey(subjectKey))) continue;
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          sessions: 0,
          answers: 0,
          correct: 0,
          wrong: 0,
          durationSeconds: 0,
        });
      }
      const day = dailyMap.get(dateKey);
      day.sessions += Number(counts.sessions) || 0;
      day.answers += Number(counts.answers) || 0;
      day.correct += Number(counts.correct) || 0;
      day.wrong += Number(counts.wrong) || 0;
      day.durationSeconds += Number(counts.durationSeconds) || 0;
    }
  }
  payload.dailyActivity = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  delete payload._dailyBySubject;
  if (payload.dailyActivityBySubject && typeof payload.dailyActivityBySubject === "object") {
    const filtered = {};
    for (const [dateKey, subjectMap] of Object.entries(payload.dailyActivityBySubject)) {
      if (!subjectMap || typeof subjectMap !== "object") continue;
      /** @type {Record<string, unknown>} */
      const nextSubjectMap = {};
      for (const [subjectKey, counts] of Object.entries(subjectMap)) {
        if (permittedSubjects && !permittedSubjects.has(normalizeSubjectKey(subjectKey))) continue;
        nextSubjectMap[subjectKey] = counts;
      }
      if (Object.keys(nextSubjectMap).length > 0) filtered[dateKey] = nextSubjectMap;
    }
    payload.dailyActivityBySubject = filtered;
  }
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
 * Private teachers: subject-only permission (no grade/class scope).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} subject
 */
export async function checkPrivateTeacherSubjectPermission(serviceRole, teacherId, subject) {
  const subjectKey = normalizeSubjectKey(subject);
  if (!subjectKey) return false;

  const { data, error } = await serviceRole
    .from("private_teacher_subjects")
    .select("id, subject")
    .eq("teacher_id", teacherId)
    .eq("subject", subjectKey)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return false;
    }
    return false;
  }

  return Boolean(data?.id);
}

/**
 * Private teachers require explicit subject grants in private_teacher_subjects.
 * Student grade_level is not part of this check (used only for question generation).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} subject
 */
export async function assertPrivateTeacherSubjectAllowed(serviceRole, teacherId, subject) {
  const membershipResult = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!membershipResult.ok) {
    return membershipResult;
  }

  if (membershipResult.membership) {
    return { ok: false, status: 403, code: "not_private_teacher" };
  }

  const allowed = await checkPrivateTeacherSubjectPermission(serviceRole, teacherId, subject);

  if (!allowed) {
    return { ok: false, status: 403, code: "subject_not_permitted" };
  }

  return { ok: true, allowed: true, membership: null };
}

/**
 * Activity create/read/export: school teachers use school grants; private teachers use private_teacher_subjects.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} subject
 * @param {string|null|undefined} gradeLevel
 */
export async function assertActivitySubjectAllowed(
  serviceRole,
  teacherId,
  subject,
  gradeLevel
) {
  const membershipResult = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!membershipResult.ok) {
    return membershipResult;
  }

  if (!membershipResult.membership) {
    return assertPrivateTeacherSubjectAllowed(serviceRole, teacherId, subject);
  }

  return assertSchoolTeacherSubjectAllowed(serviceRole, teacherId, subject, gradeLevel);
}

/**
 * Discussion activity create: school teachers use school grants; private teachers use private_teacher_subjects.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} subject
 * @param {string|null|undefined} gradeLevel
 */
export async function assertDiscussionActivitySubjectAllowed(
  serviceRole,
  teacherId,
  subject,
  gradeLevel
) {
  return assertActivitySubjectAllowed(serviceRole, teacherId, subject, gradeLevel);
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
  const verified = await verifyTeacherMembershipInSchool(
    serviceRole,
    input.schoolId,
    input.teacherId
  );
  if (!verified.ok) return verified;
  if (verified.membership.role === "school_operator") {
    return { ok: false, status: 403, code: "not_a_school_teacher" };
  }

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
