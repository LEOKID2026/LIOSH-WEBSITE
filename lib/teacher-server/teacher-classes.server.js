import { countRowsByGroupColumn } from "../school-server/school-query-chunks.server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import {
  effectiveMaxStudentsPerClass,
  isFiniteQuotaLimit,
} from "./teacher-entitlements.server.js";
import { SYSTEM_DEFAULT_MAX_STUDENTS_PER_CLASS } from "./teacher-session.server.js";
import { hasActiveTeacherStudentLink, teacherStudentDisplayName } from "./teacher-students.server.js";
import { isUuid } from "./teacher-request.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function countActiveTeacherClasses(serviceRole, teacherId) {
  const { count, error } = await serviceRole
    .from("teacher_classes")
    .select("id", { count: "exact", head: true })
    .eq("teacher_id", teacherId)
    .eq("is_archived", false)
    .is("archived_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, count: count ?? 0 };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} classId
 * @param {{ allowArchived?: boolean }} [opts]
 */
export async function loadTeacherClassOwned(serviceRole, teacherId, classId, opts = {}) {
  if (!isUuid(classId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("teacher_classes")
    .select("id, teacher_id, name, grade_level, subject_focus, is_archived, archived_at, created_at, updated_at")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data) {
    return { ok: false, status: 404, code: "class_not_found" };
  }

  if (!opts.allowArchived && (data.is_archived || data.archived_at != null)) {
    return { ok: false, status: 404, code: "class_not_found" };
  }

  return { ok: true, row: data };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ includeArchived?: boolean, classLimit: number, planCode: string }} opts
 */
export async function listTeacherClasses(serviceRole, teacherId, opts) {
  const includeArchived = opts.includeArchived === true;
  let query = serviceRole
    .from("teacher_classes")
    .select("id, name, grade_level, subject_focus, is_archived, archived_at, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!includeArchived) {
    query = query.eq("is_archived", false).is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const classIds = (data || []).map((c) => c.id);
  const memberCounts = new Map();
  if (classIds.length) {
    const membersRes = await countRowsByGroupColumn(
      serviceRole,
      "teacher_class_students",
      "class_id",
      "class_id",
      classIds,
      (q) => q.is("removed_at", null)
    );
    if (!membersRes.ok) {
      if (isDbSchemaNotReadyError(membersRes.error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    for (const [classId, count] of membersRes.counts) {
      memberCounts.set(classId, count);
    }
  }

  const countResult = await countActiveTeacherClasses(serviceRole, teacherId);
  if (!countResult.ok) return countResult;

  const classes = (data || []).map((c) => ({
    classId: c.id,
    name: c.name,
    gradeLevel: c.grade_level,
    subjectFocus: c.subject_focus,
    studentCount: memberCounts.get(c.id) || 0,
    isArchived: Boolean(c.is_archived || c.archived_at),
    createdAt: c.created_at,
  }));

  return {
    ok: true,
    classes,
    limits: {
      planCode: opts.planCode,
      classLimit: opts.classLimit,
      currentActive: countResult.count,
    },
  };
}

/**
 * @param {object} body
 */
export function parseCreateClassBody(body) {
  const raw = body && typeof body === "object" ? body : {};
  if (typeof raw.name !== "string") {
    return { ok: false, code: "validation_failed", field: "name" };
  }
  const name = raw.name.trim();
  if (name.length < 1 || name.length > 80) {
    return { ok: false, code: "validation_failed", field: "name" };
  }

  let gradeLevel = raw.gradeLevel;
  if (gradeLevel != null) {
    if (typeof gradeLevel !== "string") return { ok: false, code: "validation_failed", field: "gradeLevel" };
    gradeLevel = gradeLevel.trim();
    if (gradeLevel.length > 32) return { ok: false, code: "validation_failed", field: "gradeLevel" };
    if (!gradeLevel) gradeLevel = null;
  } else {
    gradeLevel = null;
  }

  let subjectFocus = raw.subjectFocus;
  if (subjectFocus != null) {
    if (typeof subjectFocus !== "string") {
      return { ok: false, code: "validation_failed", field: "subjectFocus" };
    }
    subjectFocus = subjectFocus.trim();
    if (subjectFocus.length > 64) return { ok: false, code: "validation_failed", field: "subjectFocus" };
    if (!subjectFocus) subjectFocus = null;
  } else {
    subjectFocus = null;
  }

  return { ok: true, name, gradeLevel, subjectFocus };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ name: string, gradeLevel: string|null, subjectFocus: string|null, classLimit: number }} input
 */
export async function createTeacherClass(serviceRole, teacherId, input) {
  if (input.classLimit === 0) {
    return { ok: false, status: 409, code: "class_limit_zero" };
  }

  const countResult = await countActiveTeacherClasses(serviceRole, teacherId);
  if (!countResult.ok) return countResult;
  if (isFiniteQuotaLimit(input.classLimit) && countResult.count >= input.classLimit) {
    return { ok: false, status: 409, code: "class_limit_reached", classLimit: input.classLimit };
  }

  const { data, error } = await serviceRole
    .from("teacher_classes")
    .insert({
      teacher_id: teacherId,
      name: input.name,
      grade_level: input.gradeLevel,
      subject_focus: input.subjectFocus,
    })
    .select("id, created_at")
    .single();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, classId: data.id, createdAt: data.created_at };
}

/**
 * @param {object} body
 */
export function parsePatchClassBody(body) {
  const raw = body && typeof body === "object" ? body : {};
  const patch = {};
  if (raw.name != null) {
    if (typeof raw.name !== "string") return { ok: false, code: "validation_failed", field: "name" };
    const name = raw.name.trim();
    if (name.length < 1 || name.length > 80) return { ok: false, code: "validation_failed", field: "name" };
    patch.name = name;
  }
  if (raw.gradeLevel != null) {
    if (typeof raw.gradeLevel !== "string") return { ok: false, code: "validation_failed", field: "gradeLevel" };
    const gradeLevel = raw.gradeLevel.trim();
    if (gradeLevel.length > 32) return { ok: false, code: "validation_failed", field: "gradeLevel" };
    patch.grade_level = gradeLevel || null;
  }
  if (raw.subjectFocus != null) {
    if (typeof raw.subjectFocus !== "string") {
      return { ok: false, code: "validation_failed", field: "subjectFocus" };
    }
    const subjectFocus = raw.subjectFocus.trim();
    if (subjectFocus.length > 64) return { ok: false, code: "validation_failed", field: "subjectFocus" };
    patch.subject_focus = subjectFocus || null;
  }

  if (!Object.keys(patch).length) {
    return { ok: false, code: "validation_failed", field: "body" };
  }

  return { ok: true, patch, fieldsChanged: Object.keys(patch) };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} classId
 */
export async function loadClassMembers(serviceRole, classId) {
  const { data, error } = await serviceRole
    .from("teacher_class_students")
    .select("id, student_id, joined_at, students!inner(full_name)")
    .eq("class_id", classId)
    .is("removed_at", null)
    .order("joined_at", { ascending: true });

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const members = (data || []).map((row) => ({
    membershipId: row.id,
    studentId: row.student_id,
    studentFullName: row.students?.full_name || "",
    studentFullNameMasked: teacherStudentDisplayName(row.students?.full_name),
    joinedAt: row.joined_at,
  }));

  return { ok: true, members };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} classId
 * @param {number|null|undefined} maxStudentsPerClass resolved limit; null uses plan/default (40)
 */
export async function assertTeacherCanAddStudentToClass(serviceRole, classId, maxStudentsPerClass) {
  const cap = effectiveMaxStudentsPerClass(
    maxStudentsPerClass,
    SYSTEM_DEFAULT_MAX_STUDENTS_PER_CLASS
  );

  const { count, error } = await serviceRole
    .from("teacher_class_students")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .is("removed_at", null);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if ((count ?? 0) >= cap) {
    return {
      ok: false,
      status: 409,
      code: "class_student_limit_reached",
      classStudentLimit: cap,
    };
  }

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} classId
 * @param {string} studentId
 * @param {{ maxStudentsPerClass?: number|null }} [opts]
 */
export async function addClassMember(serviceRole, teacherId, classId, studentId, opts = {}) {
  if (!isUuid(studentId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const capCheck = await assertTeacherCanAddStudentToClass(
    serviceRole,
    classId,
    opts.maxStudentsPerClass ?? null
  );
  if (!capCheck.ok) return capCheck;

  const link = await hasActiveTeacherStudentLink(serviceRole, teacherId, studentId);
  if (!link.ok) return link;
  if (!link.linked) {
    return { ok: false, status: 403, code: "student_not_linked" };
  }

  const { data: existing } = await serviceRole
    .from("teacher_class_students")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .is("removed_at", null)
    .maybeSingle();

  if (existing?.id) {
    return { ok: false, status: 409, code: "already_member" };
  }

  const { data, error } = await serviceRole
    .from("teacher_class_students")
    .insert({ class_id: classId, student_id: studentId })
    .select("id, joined_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, status: 409, code: "already_member" };
    }
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, membershipId: data.id, joinedAt: data.joined_at, studentId };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} classId
 * @param {string} membershipId
 */
export async function removeClassMember(serviceRole, classId, membershipId) {
  if (!isUuid(membershipId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data, error } = await serviceRole
    .from("teacher_class_students")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", membershipId)
    .eq("class_id", classId)
    .is("removed_at", null)
    .select("id, student_id, removed_at")
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data) {
    return { ok: false, status: 404, code: "membership_not_found" };
  }

  return { ok: true, membershipId: data.id, removedAt: data.removed_at, studentId: data.student_id };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} classId
 */
export async function archiveTeacherClass(serviceRole, classId) {
  const now = new Date().toISOString();

  const { data: members, error: listErr } = await serviceRole
    .from("teacher_class_students")
    .select("id")
    .eq("class_id", classId)
    .is("removed_at", null);

  if (listErr) {
    if (isDbSchemaNotReadyError(listErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const memberIds = (members || []).map((m) => m.id);
  if (memberIds.length) {
    const { error: memErr } = await serviceRole
      .from("teacher_class_students")
      .update({ removed_at: now })
      .in("id", memberIds);
    if (memErr) {
      return { ok: false, status: 500, code: "internal_error" };
    }
  }

  const { data, error } = await serviceRole
    .from("teacher_classes")
    .update({ is_archived: true, archived_at: now })
    .eq("id", classId)
    .eq("is_archived", false)
    .is("archived_at", null)
    .select("id, archived_at")
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data) {
    const { data: existing } = await serviceRole
      .from("teacher_classes")
      .select("id, archived_at, is_archived")
      .eq("id", classId)
      .maybeSingle();
    if (existing?.is_archived || existing?.archived_at) {
      return { ok: false, status: 409, code: "already_archived" };
    }
    return { ok: false, status: 404, code: "class_not_found" };
  }

  return {
    ok: true,
    classId: data.id,
    archivedAt: data.archived_at,
    memberRowsArchived: memberIds.length,
  };
}
