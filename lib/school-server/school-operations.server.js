import { writeTeacherAuditRow } from "../teacher-server/teacher-audit.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { checkSchoolTeacherSubjectPermission } from "./school-subjects.server.js";
import {
  loadSchoolClassInScope,
  loadSchoolScope,
  verifyStudentVisibleToSchool,
} from "./school-scope.server.js";
import { verifyTeacherMembershipInSchool } from "./school-membership.server.js";
import { LEARNING_SUBJECT_ALLOWLIST } from "../learning-supabase/learning-activity.js";

const SUBJECTS = [...LEARNING_SUBJECT_ALLOWLIST];

/**
 * Resolve subject-class rows for a physical class (strict: all subjects required).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} className
 * @param {string} gradeLevel
 */
async function loadSubjectClassIdsForPhysical(serviceRole, schoolId, className, gradeLevel) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const { data, error } = await serviceRole
    .from("teacher_classes")
    .select("id, subject_focus, teacher_id")
    .eq("school_id", schoolId)
    .eq("name", className)
    .eq("grade_level", String(gradeLevel))
    .eq("is_archived", false)
    .is("archived_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const bySubject = new Map();
  for (const row of data || []) {
    if (row.subject_focus) bySubject.set(row.subject_focus, row);
  }

  const missing = SUBJECTS.filter((s) => !bySubject.has(s));
  if (missing.length > 0) {
    return {
      ok: false,
      status: 404,
      code: "physical_class_not_found",
      missingSubjects: missing,
    };
  }

  return { ok: true, bySubject, rows: data || [] };
}

/**
 * Resolve subject-class rows for a physical class report (relaxed: at least one subject).
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} className
 * @param {string} gradeLevel
 */
export async function loadSubjectClassesForPhysicalReport(serviceRole, schoolId, className, gradeLevel) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const { data, error } = await serviceRole
    .from("teacher_classes")
    .select("id, subject_focus, teacher_id, name, grade_level")
    .eq("school_id", schoolId)
    .eq("name", String(className).trim())
    .eq("grade_level", String(gradeLevel))
    .eq("is_archived", false)
    .is("archived_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const rows = data || [];
  if (rows.length === 0) {
    return { ok: false, status: 404, code: "physical_class_not_found" };
  }

  const teacherIds = [...new Set(rows.map((r) => r.teacher_id).filter(Boolean))];
  const profileMap = new Map();
  if (teacherIds.length > 0) {
    const { data: profiles } = await serviceRole
      .from("teacher_profiles")
      .select("id, display_name")
      .in("id", teacherIds);
    for (const p of profiles || []) {
      profileMap.set(p.id, p.display_name);
    }
  }

  return {
    ok: true,
    rows: rows.map((r) => ({
      classId: r.id,
      subjectFocus: r.subject_focus,
      teacherId: r.teacher_id,
      teacherName: profileMap.get(r.teacher_id) || null,
      name: r.name,
      gradeLevel: r.grade_level,
    })),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{
 *   schoolId: string,
 *   studentId: string,
 *   fromPhysicalClass: string,
 *   toPhysicalClass: string,
 *   gradeLevel: string,
 *   managerId: string,
 * }} input
 */
export async function transferStudentBetweenSections(serviceRole, input) {
  const { schoolId, studentId, fromPhysicalClass, toPhysicalClass, gradeLevel, managerId } = input;

  if (!isUuid(schoolId) || !isUuid(studentId) || !isUuid(managerId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const visible = await verifyStudentVisibleToSchool(serviceRole, schoolId, studentId);
  if (!visible.ok) return visible;

  const from = await loadSubjectClassIdsForPhysical(
    serviceRole,
    schoolId,
    String(fromPhysicalClass).trim(),
    gradeLevel
  );
  if (!from.ok) return from;

  const to = await loadSubjectClassIdsForPhysical(
    serviceRole,
    schoolId,
    String(toPhysicalClass).trim(),
    gradeLevel
  );
  if (!to.ok) return to;

  const now = new Date().toISOString();

  for (const subject of SUBJECTS) {
    const fromClass = from.bySubject.get(subject);
    const toClass = to.bySubject.get(subject);

    const { error: remErr } = await serviceRole
      .from("teacher_class_students")
      .update({ removed_at: now })
      .eq("class_id", fromClass.id)
      .eq("student_id", studentId)
      .is("removed_at", null);

    if (remErr) {
      return { ok: false, status: 500, code: "internal_error" };
    }

    const { data: existingTo } = await serviceRole
      .from("teacher_class_students")
      .select("id, removed_at")
      .eq("class_id", toClass.id)
      .eq("student_id", studentId)
      .maybeSingle();

    if (existingTo?.id && existingTo.removed_at) {
      const { error: restoreErr } = await serviceRole
        .from("teacher_class_students")
        .update({ removed_at: null })
        .eq("id", existingTo.id);
      if (restoreErr) return { ok: false, status: 500, code: "internal_error" };
    } else if (!existingTo?.id) {
      const { error: insErr } = await serviceRole.from("teacher_class_students").insert({
        class_id: toClass.id,
        student_id: studentId,
      });
      if (insErr && insErr.code !== "23505") {
        return { ok: false, status: 500, code: "internal_error" };
      }
    }
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    studentId,
    action: "school_student_class_transferred",
    actorRole: "teacher",
    actorId: managerId,
    metadata: {
      school_id: schoolId,
      from_physical_class: fromPhysicalClass,
      to_physical_class: toPhysicalClass,
      grade_level: gradeLevel,
    },
  });

  return {
    ok: true,
    studentId,
    fromPhysicalClass,
    toPhysicalClass,
    subjectsUpdated: SUBJECTS.length,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{
 *   schoolId: string,
 *   classId: string,
 *   newTeacherId: string,
 *   managerId: string,
 * }} input
 */
export async function reassignClassTeacher(serviceRole, input) {
  const { schoolId, classId, newTeacherId, managerId } = input;

  if (!isUuid(schoolId) || !isUuid(classId) || !isUuid(newTeacherId) || !isUuid(managerId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const inScope = await loadSchoolClassInScope(serviceRole, schoolId, classId);
  if (!inScope.ok) return inScope;

  const classRow = inScope.classRow;
  if (classRow.is_archived) {
    return { ok: false, status: 409, code: "class_archived" };
  }

  const membership = await verifyTeacherMembershipInSchool(serviceRole, schoolId, newTeacherId);
  if (!membership.ok) return membership;

  const subject = classRow.subject_focus;
  if (!subject) {
    return { ok: false, status: 400, code: "class_missing_subject_focus" };
  }

  const permitted = await checkSchoolTeacherSubjectPermission(
    serviceRole,
    newTeacherId,
    schoolId,
    subject,
    classRow.grade_level
  );
  if (!permitted) {
    return { ok: false, status: 403, code: "teacher_subject_not_granted" };
  }

  const previousTeacherId = classRow.teacher_id;

  const { error } = await serviceRole
    .from("teacher_classes")
    .update({
      teacher_id: newTeacherId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", classId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    action: "school_class_teacher_reassigned",
    actorRole: "teacher",
    actorId: managerId,
    metadata: {
      school_id: schoolId,
      class_id: classId,
      previous_teacher_id: previousTeacherId,
      new_teacher_id: newTeacherId,
      subject_focus: subject,
    },
  });

  return {
    ok: true,
    classId,
    previousTeacherId,
    newTeacherId,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string, classId: string, managerId: string }} input
 */
export async function archiveSchoolClass(serviceRole, input) {
  const { schoolId, classId, managerId } = input;

  if (!isUuid(schoolId) || !isUuid(classId) || !isUuid(managerId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const inScope = await loadSchoolClassInScope(serviceRole, schoolId, classId);
  if (!inScope.ok) return inScope;

  const classRow = inScope.classRow;
  if (classRow.is_archived) {
    return { ok: true, classId, alreadyArchived: true };
  }

  const now = new Date().toISOString();
  const { error } = await serviceRole
    .from("teacher_classes")
    .update({
      is_archived: true,
      archived_at: now,
      updated_at: now,
    })
    .eq("id", classId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: managerId,
    action: "school_class_archived",
    actorRole: "teacher",
    actorId: managerId,
    metadata: {
      school_id: schoolId,
      class_id: classId,
      class_name: classRow.name,
      subject_focus: classRow.subject_focus,
    },
  });

  return { ok: true, classId, archivedAt: now };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string, classId: string, managerId: string }} input
 */
export async function unarchiveSchoolClass(serviceRole, input) {
  const { schoolId, classId, managerId } = input;

  if (!isUuid(schoolId) || !isUuid(classId) || !isUuid(managerId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const inScope = await loadSchoolClassInScope(serviceRole, schoolId, classId);
  if (!inScope.ok) return inScope;

  const classRow = inScope.classRow;
  if (!classRow.is_archived) {
    return { ok: true, classId, alreadyActive: true };
  }

  const now = new Date().toISOString();
  const { error } = await serviceRole
    .from("teacher_classes")
    .update({
      is_archived: false,
      archived_at: null,
      updated_at: now,
    })
    .eq("id", classId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, classId };
}

export {
  listSchoolAuditLog,
  MANAGER_VISIBLE_SCHOOL_AUDIT_ACTIONS,
  SCHOOL_AUDIT_ACTIONS,
  SCHOOL_STAFF_AUDIT_ACTIONS,
  SCHOOL_OPERATOR_AUDIT_ACTIONS,
} from "./school-audit-log.server.js";
