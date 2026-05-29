import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";

/**
 * Mask student display name for guardian / low-trust surfaces.
 * @param {string|null|undefined} fullName
 */
export function maskStudentFullName(fullName) {
  const raw = typeof fullName === "string" ? fullName.trim() : "";
  if (!raw) return "";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0);
  return `${first} ${lastInitial}.`;
}

/**
 * Full student name for teacher/school-facing roster and reports.
 * @param {string|null|undefined} fullName
 */
export function teacherStudentDisplayName(fullName) {
  const raw = typeof fullName === "string" ? fullName.trim().replace(/\s+/g, " ") : "";
  return raw;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 */
export async function loadGuardianAccessSummary(serviceRole, teacherId, studentId) {
  const nowIso = new Date().toISOString();
  const { data, error } = await serviceRole
    .from("student_guardian_access")
    .select("is_active, revoked_at, expires_at")
    .eq("created_by_teacher_id", teacherId)
    .eq("student_id", studentId);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { active: 0, revoked: 0, expired: 0 };
    }
    return { active: 0, revoked: 0, expired: 0 };
  }

  let active = 0;
  let revoked = 0;
  let expired = 0;
  for (const row of data || []) {
    if (row.revoked_at != null || row.is_active === false) {
      revoked += 1;
      continue;
    }
    if (row.expires_at && row.expires_at <= nowIso) {
      expired += 1;
      continue;
    }
    active += 1;
  }
  return { active, revoked, expired };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {{ includeArchived?: boolean, studentLimit: number }} opts
 */
export async function listTeacherStudents(serviceRole, teacherId, opts) {
  const includeArchived = opts.includeArchived === true;
  const skipGuardianAccess = opts.skipGuardianAccess === true;
  let query = serviceRole
    .from("teacher_students")
    .select(
      "id, student_id, relationship, created_at, archived_at, students!inner(full_name, grade_level)"
    )
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const rows = data || [];
  const students = [];

  let guardianByStudent = new Map();
  if (!skipGuardianAccess && rows.length) {
    const ids = rows.map((r) => r.student_id);
    const { data: accessRows } = await serviceRole
      .from("student_guardian_access")
      .select("student_id, is_active, revoked_at, expires_at")
      .eq("created_by_teacher_id", teacherId)
      .in("student_id", ids);
    const nowIso = new Date().toISOString();
    for (const id of ids) {
      guardianByStudent.set(id, { active: 0, revoked: 0, expired: 0 });
    }
    for (const row of accessRows || []) {
      const sid = row.student_id;
      if (!sid) continue;
      const cur = guardianByStudent.get(sid) || { active: 0, revoked: 0, expired: 0 };
      if (row.revoked_at != null || row.is_active === false) {
        cur.revoked += 1;
      } else if (row.expires_at && row.expires_at <= nowIso) {
        cur.expired += 1;
      } else {
        cur.active += 1;
      }
      guardianByStudent.set(sid, cur);
    }
  }

  for (const row of rows) {
    const student = row.students;
    const guardianAccessSummary = skipGuardianAccess
      ? { active: 0, revoked: 0, expired: 0 }
      : guardianByStudent.get(row.student_id) || { active: 0, revoked: 0, expired: 0 };
    students.push({
      linkId: row.id,
      studentId: row.student_id,
      studentFullName: student?.full_name || "",
      studentFullNameMasked: teacherStudentDisplayName(student?.full_name),
      gradeLevel: student?.grade_level ?? null,
      relationship: row.relationship,
      linkedAt: row.created_at,
      archivedAt: row.archived_at,
      guardianAccessSummary,
    });
  }

  const activeCount = includeArchived
    ? students.filter((s) => !s.archivedAt).length
    : students.length;

  return {
    ok: true,
    students,
    limits: {
      planCode: opts.planCode,
      studentLimit: opts.studentLimit,
      currentActive: activeCount,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} studentId
 */
export async function hasActiveTeacherStudentLink(serviceRole, teacherId, studentId) {
  const { data, error } = await serviceRole
    .from("teacher_students")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, linked: Boolean(data?.id) };
}
