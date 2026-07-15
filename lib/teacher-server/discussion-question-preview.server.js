import { generateActivityQuestionSetClient } from "../classroom-activities/generate-activity-questions-client.js";
import {
  isActivityPreviewSubjectSupported,
  normalizeActivitySubject,
  normalizeDifficultyLevel,
} from "../classroom-activities/classroom-activities-shared.server.js";
import { ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS } from "../classroom-activities/classroom-activities-preview.js";
import {
  assertDiscussionActivitySubjectAllowed,
  checkPrivateTeacherSubjectPermission,
  checkSchoolTeacherSubjectPermission,
  normalizeSubjectKey,
} from "../school-server/school-subjects.server.js";
import { loadTeacherSchoolMembership } from "../school-server/school-membership.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { schoolSubjectGradeKeysMatch } from "../teacher-portal/teacher-class-grade.js";
import { isMoledetGeographyGradeAllowed } from "../../utils/moledet-geography-curriculum-gates.js";

function filterMoledetForGrade(subjects, gradeLevel) {
  if (isMoledetGeographyGradeAllowed(gradeLevel)) return subjects;
  return subjects.filter((s) => s !== "moledet_geography");
}

/**
 * Subjects the teacher may use for discussion at a given grade (for UI filters).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string|null|undefined} gradeLevel
 */
export async function listDiscussionPermittedSubjects(serviceRole, teacherId, gradeLevel) {
  const membershipResult = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (!membershipResult.ok) {
    return membershipResult;
  }

  const grade =
    gradeLevel != null && String(gradeLevel).trim() !== "" ? String(gradeLevel).trim() : null;

  const membership = membershipResult.membership;
  if (!membership) {
    const { data, error } = await serviceRole
      .from("private_teacher_subjects")
      .select("subject")
      .eq("teacher_id", teacherId);

    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }

    const allowed = new Set();
    for (const row of data || []) {
      const key = normalizeSubjectKey(row.subject);
      if (!key || !isActivityPreviewSubjectSupported(key)) continue;
      allowed.add(key);
    }
    return { ok: true, subjects: filterMoledetForGrade([...allowed], grade) };
  }

  if (membership.role === "school_admin") {
    return {
      ok: true,
      subjects: filterMoledetForGrade([...ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS], grade),
    };
  }

  const { data, error } = await serviceRole
    .from("school_teacher_subjects")
    .select("subject, grade_level")
    .eq("school_id", membership.schoolId)
    .eq("teacher_id", teacherId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const allowed = new Set();
  for (const row of data || []) {
    const key = normalizeSubjectKey(row.subject);
    if (!key || !isActivityPreviewSubjectSupported(key)) continue;
    if (schoolSubjectGradeKeysMatch(row.grade_level, grade)) {
      allowed.add(key);
    }
  }
  return { ok: true, subjects: filterMoledetForGrade([...allowed], grade) };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ subject: string, gradeLevel?: string|null, topic: string, difficulty?: string|null, count?: number }} input
 */
export async function buildDiscussionQuestionPreview(serviceRole, teacherId, input) {
  const subject = normalizeActivitySubject(input.subject);
  if (!subject || !isActivityPreviewSubjectSupported(subject)) {
    return { ok: false, status: 400, code: "validation_failed", message: "מקצוע לא תקין" };
  }

  const topic = String(input.topic || "").trim();
  if (!topic || topic.length > 120) {
    return { ok: false, status: 400, code: "validation_failed", message: "נושא הוא שדה חובה" };
  }

  const gradeLevel = input.gradeLevel != null ? String(input.gradeLevel).trim() : null;

  if (
    subject === "moledet_geography" &&
    !isMoledetGeographyGradeAllowed(gradeLevel)
  ) {
    return { ok: false, status: 400, code: "validation_failed", message: "מקצוע לא תקין" };
  }

  const gate = await assertDiscussionActivitySubjectAllowed(
    serviceRole,
    teacherId,
    subject,
    gradeLevel || null
  );
  if (!gate.ok) {
    return gate;
  }

  const countRaw = Number(input.count);
  const count = Number.isFinite(countRaw) ? Math.min(10, Math.max(1, Math.floor(countRaw))) : 5;
  const difficulty = normalizeDifficultyLevel(input.difficulty) || "medium";

  try {
    const questions = await generateActivityQuestionSetClient({
      subject,
      gradeLevel: gradeLevel || "g3",
      topic,
      difficulty,
      count,
    });

    return { ok: true, questions };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      code: "preview_generation_failed",
      message: err?.message || "יצירת שאלות נכשלה - נסה נושא או רמת קושי אחרים",
    };
  }
}

export { checkPrivateTeacherSubjectPermission, checkSchoolTeacherSubjectPermission };
