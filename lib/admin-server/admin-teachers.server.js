import {
  loadSchoolAccountRow,
  loadTeacherSchoolMembership,
} from "../school-server/school-membership.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { normalizeTeacherFeatureFlags } from "../teacher-server/teacher-entitlements.server.js";
import {
  loadTeacherLimitsRow,
  resolveTeacherPlanLimits,
} from "../teacher-server/teacher-session.server.js";
import { isUuid } from "../teacher-server/teacher-request.server.js";

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 */
async function loadAuthEmailMap(serviceRole) {
  const map = new Map();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await serviceRole.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
    for (const u of data?.users || []) {
      if (u?.id) map.set(u.id, u.email || null);
    }
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return { ok: true, map };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
async function buildTeacherUsage(serviceRole, teacherId) {
  const [classesRes, linksRes, individualActRes] = await Promise.all([
    serviceRole
      .from("teacher_classes")
      .select("id, name, grade_level, is_archived, archived_at")
      .eq("teacher_id", teacherId)
      .eq("is_archived", false)
      .is("archived_at", null),
    serviceRole
      .from("teacher_students")
      .select("student_id")
      .eq("teacher_id", teacherId)
      .is("archived_at", null),
    serviceRole
      .from("student_activities")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .in("status", ["draft", "active"]),
  ]);

  if (classesRes.error || linksRes.error) {
    const err = classesRes.error || linksRes.error;
    if (isDbSchemaNotReadyError(err)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const classRows = classesRes.data || [];
  const classIds = classRows.map((c) => c.id);
  const memberCounts = new Map();
  /** @type {Set<string>} */
  const studentsInClass = new Set();

  if (classIds.length) {
    const { data: members } = await serviceRole
      .from("teacher_class_students")
      .select("class_id, student_id")
      .in("class_id", classIds)
      .is("removed_at", null);
    for (const m of members || []) {
      memberCounts.set(m.class_id, (memberCounts.get(m.class_id) || 0) + 1);
      if (m.student_id) studentsInClass.add(m.student_id);
    }
  }

  const linkedStudentIds = new Set((linksRes.data || []).map((r) => r.student_id).filter(Boolean));
  let directStudentCount = 0;
  for (const sid of linkedStudentIds) {
    if (!studentsInClass.has(sid)) directStudentCount += 1;
  }

  const classes = classRows.map((c) => ({
    classId: c.id,
    name: c.name,
    gradeLevel: c.grade_level,
    activeStudentCount: memberCounts.get(c.id) || 0,
  }));

  let individualActivityCount = 0;
  if (!individualActRes.error) {
    individualActivityCount = individualActRes.count ?? 0;
  } else if (!isDbSchemaNotReadyError(individualActRes.error)) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    classCount: classes.length,
    totalActiveStudents: linkedStudentIds.size,
    classStudentCount: studentsInClass.size,
    directStudentCount,
    individualActivityCount,
    classes,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {Map<string, string|null>} emailMap
 */
export async function buildAdminTeacherDetail(serviceRole, teacherId, emailMap) {
  if (!isUuid(teacherId)) {
    return { ok: false, status: 400, code: "validation_failed" };
  }

  const { data: profile, error: profileErr } = await serviceRole
    .from("teacher_profiles")
    .select("id, display_name, is_active, archived_at, school_id, created_at")
    .eq("id", teacherId)
    .maybeSingle();

  if (profileErr) {
    if (isDbSchemaNotReadyError(profileErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (!profile) {
    return { ok: false, status: 404, code: "teacher_not_found" };
  }

  const limitsRow = await loadTeacherLimitsRow(serviceRole, teacherId);
  if (!limitsRow.ok) return limitsRow;
  if (!limitsRow.limits) {
    return { ok: false, status: 404, code: "teacher_limits_missing" };
  }

  const resolved = await resolveTeacherPlanLimits(serviceRole, limitsRow.limits);
  if (!resolved.ok) return resolved;

  const usage = await buildTeacherUsage(serviceRole, teacherId);
  if (!usage.ok) return usage;

  let schoolMembership = null;
  const memResult = await loadTeacherSchoolMembership(serviceRole, teacherId);
  if (memResult.ok && memResult.membership) {
    const schoolRow = await loadSchoolAccountRow(serviceRole, memResult.membership.schoolId);
    schoolMembership = {
      schoolId: memResult.membership.schoolId,
      schoolName: schoolRow.ok ? schoolRow.school.name : null,
      schoolRole: memResult.membership.role,
      isSchoolManager: memResult.membership.isSchoolManager,
    };
  }

  return {
    ok: true,
    teacher: {
      teacherId: profile.id,
      email: emailMap.get(profile.id) || null,
      displayName: profile.display_name,
      isActive: profile.is_active && profile.archived_at == null,
      isAccountActive: resolved.limits.isAccountActive !== false,
      planCode: resolved.limits.planCode,
      schoolId: schoolMembership?.schoolId ?? null,
      schoolName: schoolMembership?.schoolName ?? null,
      schoolRole: schoolMembership?.schoolRole ?? null,
      schoolMembership,
      createdAt: profile.created_at,
      classCount: usage.classCount,
      totalActiveStudents: usage.totalActiveStudents,
      classStudentCount: usage.classStudentCount,
      directStudentCount: usage.directStudentCount,
      individualActivityCount: usage.individualActivityCount,
      classes: usage.classes,
      quotas: {
        maxStudentsPerClass: resolved.limits.maxStudentsPerClass,
        maxStudentsPerClassOverride: limitsRow.limits.max_students_per_class_override ?? null,
        maxClasses: resolved.limits.classLimit,
        classLimitOverride: limitsRow.limits.class_limit_override ?? null,
        maxTotalStudents: resolved.limits.studentLimit,
        studentLimitOverride: limitsRow.limits.student_limit_override ?? null,
      },
      featureFlags: resolved.limits.featureFlags,
      notes: limitsRow.limits.notes ?? null,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 */
export async function listAdminTeachers(serviceRole) {
  const emailResult = await loadAuthEmailMap(serviceRole);
  if (!emailResult.ok) return emailResult;

  const { data: profiles, error } = await serviceRole
    .from("teacher_profiles")
    .select("id, display_name, is_active, archived_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const teachers = [];
  for (const p of profiles || []) {
    const detail = await buildAdminTeacherDetail(serviceRole, p.id, emailResult.map);
    if (!detail.ok) continue;
    teachers.push(detail.teacher);
  }

  return { ok: true, teachers };
}

/**
 * @param {object} body
 */
export function parseAdminQuotaPatchBody(body) {
  const raw = body && typeof body === "object" ? body : {};
  const patch = {};

  if ("maxStudentsPerClassOverride" in raw) {
    const v = raw.maxStudentsPerClassOverride;
    if (v === null || v === "") {
      patch.max_students_per_class_override = null;
    } else if (typeof v === "number" && Number.isInteger(v) && v >= 1) {
      patch.max_students_per_class_override = v;
    } else {
      return { ok: false, code: "validation_failed", field: "maxStudentsPerClassOverride" };
    }
  }

  if ("studentLimitOverride" in raw) {
    const v = raw.studentLimitOverride;
    if (v === null || v === "") {
      patch.student_limit_override = null;
    } else if (typeof v === "number" && Number.isInteger(v) && v >= 0) {
      patch.student_limit_override = v;
    } else {
      return { ok: false, code: "validation_failed", field: "studentLimitOverride" };
    }
  }

  if ("classLimitOverride" in raw) {
    const v = raw.classLimitOverride;
    if (v === null || v === "") {
      patch.class_limit_override = null;
    } else if (typeof v === "number" && Number.isInteger(v) && v >= 0) {
      patch.class_limit_override = v;
    } else {
      return { ok: false, code: "validation_failed", field: "classLimitOverride" };
    }
  }

  if ("notes" in raw) {
    if (raw.notes === null) {
      patch.notes = null;
    } else if (typeof raw.notes === "string") {
      const notes = raw.notes.trim();
      if (notes.length > 500) {
        return { ok: false, code: "validation_failed", field: "notes" };
      }
      patch.notes = notes || null;
    } else {
      return { ok: false, code: "validation_failed", field: "notes" };
    }
  }

  if (!Object.keys(patch).length) {
    return { ok: false, code: "validation_failed", field: "body" };
  }

  return { ok: true, patch };
}

/**
 * @param {object} body
 */
export function parseAdminFeaturesPatchBody(body) {
  const raw = body && typeof body === "object" ? body : {};
  if (!raw.featureFlags || typeof raw.featureFlags !== "object") {
    return { ok: false, code: "validation_failed", field: "featureFlags" };
  }
  const merged = normalizeTeacherFeatureFlags(raw.featureFlags);
  for (const key of Object.keys(raw.featureFlags)) {
    if (typeof raw.featureFlags[key] === "boolean") {
      merged[key] = raw.featureFlags[key];
    }
  }
  return { ok: true, featureFlags: merged };
}

/**
 * @param {object} body
 */
export function parseAdminStatusPatchBody(body) {
  const raw = body && typeof body === "object" ? body : {};
  if (typeof raw.isAccountActive !== "boolean") {
    return { ok: false, code: "validation_failed", field: "isAccountActive" };
  }
  return { ok: true, isAccountActive: raw.isAccountActive };
}
