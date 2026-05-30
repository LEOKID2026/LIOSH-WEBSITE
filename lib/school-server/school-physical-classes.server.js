import { LEARNING_SUBJECT_ALLOWLIST } from "../learning-supabase/learning-activity.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { writeTeacherAuditRow } from "../teacher-server/teacher-audit.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";
import { loadSchoolScope } from "./school-scope.server.js";
import { verifyStudentVisibleToSchool } from "./school-scope.server.js";
import {
  loadSubjectClassesForPhysicalReport,
  transferStudentBetweenSections,
} from "./school-operations.server.js";
import { addSchoolStudentToPhysicalClass } from "./school-students.server.js";
import { resolveStudentPhysicalClass } from "./school-messaging.server.js";

const SUBJECTS = [...LEARNING_SUBJECT_ALLOWLIST];

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} gradeLevel
 * @param {string} subject
 */
async function findTeacherForSubjectGrade(serviceRole, schoolId, gradeLevel, subject) {
  const { data, error } = await serviceRole
    .from("school_teacher_subjects")
    .select("teacher_id")
    .eq("school_id", schoolId)
    .eq("subject", subject)
    .eq("grade_level", String(gradeLevel))
    .limit(1);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const teacherId = data?.[0]?.teacher_id;
  if (!teacherId) {
    return { ok: true, teacherId: null };
  }
  return { ok: true, teacherId };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 */
export async function listSchoolPhysicalClasses(serviceRole, schoolId) {
  const scope = await loadSchoolScope(serviceRole, schoolId);
  if (!scope.ok) return scope;

  const { data, error } = await serviceRole
    .from("teacher_classes")
    .select("id, name, grade_level, subject_focus, teacher_id")
    .eq("school_id", schoolId)
    .in("teacher_id", scope.teacherIds)
    .eq("is_archived", false)
    .is("archived_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  /** @type {Map<string, { name: string, gradeLevel: string, subjectCount: number, studentCount: number }>} */
  const byKey = new Map();

  const classIds = (data || []).map((c) => c.id);
  const memberCountMap = new Map();
  if (classIds.length) {
    for (const idChunk of chunkArray(classIds, 40)) {
      const { data: members, error: memErr } = await serviceRole
        .from("teacher_class_students")
        .select("class_id, student_id")
        .in("class_id", idChunk)
        .is("removed_at", null);
      if (memErr) {
        return { ok: false, status: 500, code: "internal_error" };
      }
      const seen = new Map();
      for (const m of members || []) {
        if (!seen.has(m.class_id)) seen.set(m.class_id, new Set());
        if (m.student_id) seen.get(m.class_id).add(m.student_id);
      }
      for (const [classId, set] of seen) {
        memberCountMap.set(classId, set.size);
      }
    }
  }

  for (const row of data || []) {
    const gradeLevel = String(row.grade_level || "").trim();
    const name = String(row.name || "").trim();
    if (!gradeLevel || !name) continue;
    const key = `${gradeLevel}::${name}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        name,
        gradeLevel,
        subjectCount: 0,
        studentCount: memberCountMap.get(row.id) ?? 0,
      });
    }
    const entry = byKey.get(key);
    entry.subjectCount += 1;
    entry.studentCount = Math.max(entry.studentCount, memberCountMap.get(row.id) ?? 0);
  }

  const physicalClasses = [...byKey.values()].sort((a, b) => {
    const ga = Number(a.gradeLevel) || 0;
    const gb = Number(b.gradeLevel) || 0;
    if (ga !== gb) return ga - gb;
    return a.name.localeCompare(b.name, "he");
  });

  return { ok: true, physicalClasses };
}

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ schoolId: string, managerId: string, name: string, gradeLevel: string }} input
 */
export async function createSchoolPhysicalClass(serviceRole, input) {
  const name = String(input.name || "").trim();
  const gradeLevel = String(input.gradeLevel || "").trim();
  if (!name || name.length > 80) {
    return { ok: false, status: 400, code: "validation_failed", field: "name" };
  }
  if (!gradeLevel || gradeLevel.length > 32) {
    return { ok: false, status: 400, code: "validation_failed", field: "gradeLevel" };
  }

  const scope = await loadSchoolScope(serviceRole, input.schoolId);
  if (!scope.ok) return scope;

  const created = [];
  const reused = [];
  const missingSubjects = [];

  for (const subject of SUBJECTS) {
    const teacherRes = await findTeacherForSubjectGrade(
      serviceRole,
      input.schoolId,
      gradeLevel,
      subject
    );
    if (!teacherRes.ok) return teacherRes;
    if (!teacherRes.teacherId) {
      missingSubjects.push(subject);
      continue;
    }

    const { data: existing } = await serviceRole
      .from("teacher_classes")
      .select("id")
      .eq("school_id", input.schoolId)
      .eq("teacher_id", teacherRes.teacherId)
      .eq("name", name)
      .eq("grade_level", gradeLevel)
      .eq("subject_focus", subject)
      .eq("is_archived", false)
      .is("archived_at", null)
      .maybeSingle();

    if (existing?.id) {
      reused.push({ subject, classId: existing.id });
      continue;
    }

    const { data: inserted, error: insErr } = await serviceRole
      .from("teacher_classes")
      .insert({
        teacher_id: teacherRes.teacherId,
        school_id: input.schoolId,
        name,
        grade_level: gradeLevel,
        subject_focus: subject,
        is_archived: false,
      })
      .select("id")
      .single();

    if (insErr) {
      if (isDbSchemaNotReadyError(insErr)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    created.push({ subject, classId: inserted.id });
  }

  if (created.length === 0 && reused.length === 0) {
    return {
      ok: false,
      status: 404,
      code: "no_teachers_for_grade",
      missingSubjects,
    };
  }

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: input.managerId,
    action: "school_physical_class_created",
    actorRole: "teacher",
    actorId: input.managerId,
    metadata: {
      school_id: input.schoolId,
      name,
      grade_level: gradeLevel,
      created: created.length,
      reused: reused.length,
      missing_subjects: missingSubjects,
    },
  });

  return {
    ok: true,
    name,
    gradeLevel,
    createdCount: created.length,
    reusedCount: reused.length,
    missingSubjects,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} studentId
 */
export async function getStudentSchoolAssignment(serviceRole, schoolId, studentId) {
  if (!isUuid(studentId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const visible = await verifyStudentVisibleToSchool(serviceRole, schoolId, studentId);
  if (!visible.ok) return visible;

  const { data: student, error: stErr } = await serviceRole
    .from("students")
    .select("id, full_name, grade_level")
    .eq("id", studentId)
    .maybeSingle();

  if (stErr || !student) {
    return { ok: false, status: 404, code: "student_not_found" };
  }

  const physical = await resolveStudentPhysicalClass(serviceRole, schoolId, studentId);
  if (!physical.ok) return physical;

  return {
    ok: true,
    assignment: {
      studentId,
      displayName: student.full_name,
      gradeLevel: physical.gradeLevel || student.grade_level || null,
      physicalClassName: physical.physicalClassName || null,
      storedGradeLevel: student.grade_level || null,
    },
  };
}

/**
 * Move student between physical classes and/or grades. Updates roster going forward; does not rewrite historical sessions.
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{
 *   schoolId: string,
 *   studentId: string,
 *   managerId: string,
 *   toGradeLevel: string,
 *   toPhysicalClassName: string,
 *   fromGradeLevel?: string|null,
 *   fromPhysicalClassName?: string|null,
 * }} input
 */
export async function updateStudentSchoolAssignment(serviceRole, input) {
  const toGrade = String(input.toGradeLevel || "").trim();
  const toClass = String(input.toPhysicalClassName || "").trim();
  if (!toGrade || !toClass) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const visible = await verifyStudentVisibleToSchool(serviceRole, input.schoolId, input.studentId);
  if (!visible.ok) return visible;

  let fromGrade = input.fromGradeLevel != null ? String(input.fromGradeLevel).trim() : "";
  let fromClass = input.fromPhysicalClassName != null ? String(input.fromPhysicalClassName).trim() : "";

  if (!fromGrade || !fromClass) {
    const resolved = await resolveStudentPhysicalClass(serviceRole, input.schoolId, input.studentId);
    if (!resolved.ok) return resolved;
    fromGrade = fromGrade || resolved.gradeLevel || "";
    fromClass = fromClass || resolved.physicalClassName || "";
  }

  const { error: gradeErr } = await serviceRole
    .from("students")
    .update({ grade_level: toGrade, updated_at: new Date().toISOString() })
    .eq("id", input.studentId);

  if (gradeErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (fromClass && fromGrade && fromClass === toClass && fromGrade === toGrade) {
    return {
      ok: true,
      studentId: input.studentId,
      gradeLevel: toGrade,
      physicalClassName: toClass,
      unchanged: true,
    };
  }

  if (fromClass && fromGrade && fromGrade === toGrade && fromClass !== toClass) {
    const moved = await transferStudentBetweenSections(serviceRole, {
      schoolId: input.schoolId,
      studentId: input.studentId,
      fromPhysicalClass: fromClass,
      toPhysicalClass: toClass,
      gradeLevel: toGrade,
      managerId: input.managerId,
    });
    if (!moved.ok) return moved;
    return {
      ok: true,
      studentId: input.studentId,
      gradeLevel: toGrade,
      physicalClassName: toClass,
      transfer: moved,
    };
  }

  if (fromClass && fromGrade) {
    const fromLoaded = await loadSubjectClassesForPhysicalReport(
      serviceRole,
      input.schoolId,
      fromClass,
      fromGrade
    );
    if (fromLoaded.ok) {
      const now = new Date().toISOString();
      for (const row of fromLoaded.rows) {
        await serviceRole
          .from("teacher_class_students")
          .update({ removed_at: now })
          .eq("class_id", row.classId)
          .eq("student_id", input.studentId)
          .is("removed_at", null);
      }
    }
  }

  const placed = await addSchoolStudentToPhysicalClass(
    serviceRole,
    input.schoolId,
    input.studentId,
    toGrade,
    toClass
  );
  if (!placed.ok) return placed;

  await writeTeacherAuditRow({
    serviceRole,
    teacherId: input.managerId,
    studentId: input.studentId,
    action: "school_student_assignment_updated",
    actorRole: "teacher",
    actorId: input.managerId,
    metadata: {
      school_id: input.schoolId,
      from_grade: fromGrade || null,
      from_physical_class: fromClass || null,
      to_grade: toGrade,
      to_physical_class: toClass,
    },
  });

  return {
    ok: true,
    studentId: input.studentId,
    gradeLevel: toGrade,
    physicalClassName: toClass,
    subjectClassCount: placed.subjectClassCount,
  };
}
