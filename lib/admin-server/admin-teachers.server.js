import {
  loadSchoolAccountRow,
  loadTeacherSchoolMembership,
} from "../school-server/school-membership.server.js";
import { loadSchoolAffiliatedTeacherIds } from "./admin-private-teacher-scope.server.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import { normalizeTeacherFeatureFlags } from "../teacher-server/teacher-entitlements.server.js";
import {
  loadTeacherLimitsRow,
  resolveTeacherPlanLimits,
  SYSTEM_DEFAULT_MAX_CLASSES,
  SYSTEM_DEFAULT_MAX_STUDENTS_PER_CLASS,
  SYSTEM_DEFAULT_MAX_TOTAL_STUDENTS,
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

  let registrationRequest = null;
  const { data: regRow, error: regErr } = await serviceRole
    .from("teacher_registration_requests")
    .select(
      "status, description, requested_subjects, phone, request_intent, password_setup_sent_at, password_setup_last_error, created_at, updated_at"
    )
    .eq("user_id", teacherId)
    .maybeSingle();
  if (!regErr && regRow) {
    registrationRequest = {
      status: regRow.status,
      description: regRow.description,
      requestedSubjects: regRow.requested_subjects || [],
      phone: regRow.phone || null,
      requestIntent: regRow.request_intent || null,
      passwordSetupSentAt: regRow.password_setup_sent_at || null,
      passwordSetupLastError: regRow.password_setup_last_error || null,
      createdAt: regRow.created_at,
      updatedAt: regRow.updated_at,
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
      registrationRequest,
    },
  };
}

import { chunkIds } from "../school-server/school-query-chunks.server.js";

function resolvePlanLimitsFromCache(limitsRow, planByCode) {
  const plan = planByCode.get(limitsRow.plan_code) || null;
  const overrideStudent = limitsRow.student_limit_override;
  const overrideClass = limitsRow.class_limit_override;
  const overridePerClass = limitsRow.max_students_per_class_override;

  let studentLimit = SYSTEM_DEFAULT_MAX_TOTAL_STUDENTS;
  if (overrideStudent != null) studentLimit = overrideStudent;
  else if (plan?.student_limit != null) studentLimit = plan.student_limit;

  let classLimit = SYSTEM_DEFAULT_MAX_CLASSES;
  if (overrideClass != null) classLimit = overrideClass;
  else if (plan?.class_limit != null) classLimit = plan.class_limit;

  let maxStudentsPerClass = SYSTEM_DEFAULT_MAX_STUDENTS_PER_CLASS;
  if (overridePerClass != null) maxStudentsPerClass = overridePerClass;
  else if (plan?.max_students_per_class != null) maxStudentsPerClass = plan.max_students_per_class;

  return {
    planCode: limitsRow.plan_code,
    studentLimit,
    classLimit,
    maxStudentsPerClass,
    featureFlags: normalizeTeacherFeatureFlags(limitsRow.feature_flags),
    isAccountActive: limitsRow.is_account_active !== false,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {Array<{ id: string, display_name?: string|null, is_active?: boolean, archived_at?: string|null, created_at?: string }>} profiles
 * @param {Map<string, string|null>} emailMap
 */
async function batchBuildAdminTeacherSummaries(serviceRole, profiles, emailMap) {
  const teacherIds = profiles.map((p) => p.id).filter(Boolean);
  if (!teacherIds.length) return [];

  /** @type {Map<string, object>} */
  const limitsById = new Map();
  /** @type {Map<string, object>} */
  const planByCode = new Map();

  for (const idChunk of chunkIds(teacherIds, 80)) {
    const { data, error } = await serviceRole
      .from("teacher_limits")
      .select(
        "teacher_id, plan_code, student_limit_override, class_limit_override, max_students_per_class_override, notes, feature_flags, is_account_active"
      )
      .in("teacher_id", idChunk);
    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        throw Object.assign(new Error("db_schema_not_ready"), { code: "db_schema_not_ready" });
      }
      throw error;
    }
    for (const row of data || []) {
      if (row?.teacher_id) limitsById.set(row.teacher_id, row);
    }
  }

  const planCodes = [...new Set([...limitsById.values()].map((r) => r.plan_code).filter(Boolean))];
  if (planCodes.length) {
    const { data: plans, error: planErr } = await serviceRole
      .from("teacher_plans")
      .select("code, student_limit, class_limit, max_students_per_class")
      .in("code", planCodes)
      .eq("is_active", true);
    if (planErr && !isDbSchemaNotReadyError(planErr)) throw planErr;
    for (const plan of plans || []) {
      if (plan?.code) planByCode.set(plan.code, plan);
    }
  }

  const [classesRes, linksRes, activitiesRes, membershipsRes] = await Promise.all([
    serviceRole
      .from("teacher_classes")
      .select("id, teacher_id, name, grade_level")
      .in("teacher_id", teacherIds)
      .eq("is_archived", false)
      .is("archived_at", null),
    serviceRole
      .from("teacher_students")
      .select("teacher_id, student_id")
      .in("teacher_id", teacherIds)
      .is("archived_at", null),
    serviceRole
      .from("student_activities")
      .select("teacher_id")
      .in("teacher_id", teacherIds)
      .in("status", ["draft", "active"]),
    serviceRole
      .from("school_teacher_memberships")
      .select("teacher_id, school_id, role")
      .in("teacher_id", teacherIds),
  ]);

  if (classesRes.error || linksRes.error) {
    const err = classesRes.error || linksRes.error;
    if (isDbSchemaNotReadyError(err)) {
      throw Object.assign(new Error("db_schema_not_ready"), { code: "db_schema_not_ready" });
    }
    throw err;
  }

  const classesByTeacher = new Map();
  const classIds = [];
  /** @type {Map<string, string>} */
  const teacherIdByClassId = new Map();
  for (const row of classesRes.data || []) {
    if (!row.teacher_id) continue;
    if (!classesByTeacher.has(row.teacher_id)) classesByTeacher.set(row.teacher_id, []);
    classesByTeacher.get(row.teacher_id).push(row);
    if (row.id) {
      classIds.push(row.id);
      teacherIdByClassId.set(row.id, row.teacher_id);
    }
  }

  const studentsInClassByTeacher = new Map();
  if (classIds.length) {
    for (const idChunk of chunkIds(classIds, 80)) {
      const { data: members } = await serviceRole
        .from("teacher_class_students")
        .select("class_id, student_id")
        .in("class_id", idChunk)
        .is("removed_at", null);
      for (const m of members || []) {
        const teacherId = teacherIdByClassId.get(m.class_id);
        if (!teacherId || !m.student_id) continue;
        if (!studentsInClassByTeacher.has(teacherId)) {
          studentsInClassByTeacher.set(teacherId, new Set());
        }
        studentsInClassByTeacher.get(teacherId).add(m.student_id);
      }
    }
  }

  const linksByTeacher = new Map();
  for (const row of linksRes.data || []) {
    if (!row.teacher_id) continue;
    if (!linksByTeacher.has(row.teacher_id)) linksByTeacher.set(row.teacher_id, new Set());
    if (row.student_id) linksByTeacher.get(row.teacher_id).add(row.student_id);
  }

  const activityCountByTeacher = new Map();
  if (!activitiesRes.error) {
    for (const row of activitiesRes.data || []) {
      if (!row.teacher_id) continue;
      activityCountByTeacher.set(
        row.teacher_id,
        (activityCountByTeacher.get(row.teacher_id) || 0) + 1
      );
    }
  }

  const membershipByTeacher = new Map();
  const schoolIds = new Set();
  if (!membershipsRes.error) {
    for (const row of membershipsRes.data || []) {
      if (!row.teacher_id) continue;
      membershipByTeacher.set(row.teacher_id, row);
      if (row.school_id) schoolIds.add(row.school_id);
    }
  }

  /** @type {Map<string, string|null>} */
  const schoolNameById = new Map();
  if (schoolIds.size) {
    const { data: schools } = await serviceRole
      .from("school_accounts")
      .select("id, name")
      .in("id", [...schoolIds]);
    for (const s of schools || []) {
      if (s?.id) schoolNameById.set(s.id, s.name || null);
    }
  }

  const summaries = [];
  for (const profile of profiles) {
    const limitsRow = limitsById.get(profile.id);
    if (!limitsRow) continue;

    const resolvedLimits = resolvePlanLimitsFromCache(limitsRow, planByCode);

    const classRows = classesByTeacher.get(profile.id) || [];
    const linkedStudentIds = linksByTeacher.get(profile.id) || new Set();
    const studentsInClass = studentsInClassByTeacher.get(profile.id) || new Set();
    let directStudentCount = 0;
    for (const sid of linkedStudentIds) {
      if (!studentsInClass.has(sid)) directStudentCount += 1;
    }

    const mem = membershipByTeacher.get(profile.id);
    const schoolMembership = mem
      ? {
          schoolId: mem.school_id,
          schoolName: schoolNameById.get(mem.school_id) || null,
          schoolRole: mem.role,
          isSchoolManager: mem.role === "school_manager",
        }
      : null;

    if (schoolMembership?.schoolId) continue;

    summaries.push({
      teacherId: profile.id,
      email: emailMap.get(profile.id) || null,
      displayName: profile.display_name,
      isActive: profile.is_active && profile.archived_at == null,
      isAccountActive: resolvedLimits.isAccountActive !== false,
      planCode: resolvedLimits.planCode,
      schoolId: null,
      schoolName: null,
      schoolRole: null,
      schoolMembership: null,
      createdAt: profile.created_at,
      classCount: classRows.length,
      totalActiveStudents: linkedStudentIds.size,
      classStudentCount: studentsInClass.size,
      directStudentCount,
      individualActivityCount: activityCountByTeacher.get(profile.id) || 0,
      classes: classRows.map((c) => ({
        classId: c.id,
        name: c.name,
        gradeLevel: c.grade_level,
        activeStudentCount: 0,
      })),
      quotas: {
        maxStudentsPerClass: resolvedLimits.maxStudentsPerClass,
        maxStudentsPerClassOverride: limitsRow.max_students_per_class_override ?? null,
        maxClasses: resolvedLimits.classLimit,
        classLimitOverride: limitsRow.class_limit_override ?? null,
        maxTotalStudents: resolvedLimits.studentLimit,
        studentLimitOverride: limitsRow.student_limit_override ?? null,
      },
      featureFlags: resolvedLimits.featureFlags,
      notes: limitsRow.notes ?? null,
      registrationRequest: null,
    });
  }

  return summaries;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ statusFilter?: string|null }} [options]
 */
export async function listAdminTeachers(serviceRole, options = {}) {
  const emailResult = await loadAuthEmailMap(serviceRole);
  if (!emailResult.ok) return emailResult;

  const statusFilter =
    typeof options.statusFilter === "string" ? options.statusFilter.trim().toLowerCase() : null;

  const { data: entitlements, error: entErr } = await serviceRole
    .from("account_persona_entitlements")
    .select("user_id, status")
    .eq("persona", "private_teacher");

  if (entErr && !isDbSchemaNotReadyError(entErr)) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const entMap = new Map((entitlements || []).map((e) => [e.user_id, e.status]));

  const affiliated = await loadSchoolAffiliatedTeacherIds(serviceRole);
  if (!affiliated.ok) {
    if (isDbSchemaNotReadyError(affiliated.error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

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

  const candidates = (profiles || []).filter((p) => {
    if (affiliated.ids.has(p.id)) return false;
    const entStatus = entMap.get(p.id) ?? null;
    if (statusFilter === "pending" && entStatus !== "pending") return false;
    return true;
  });

  try {
    const teachers = await batchBuildAdminTeacherSummaries(
      serviceRole,
      candidates,
      emailResult.map
    );
    return {
      ok: true,
      teachers: teachers.map((t) => ({
        ...t,
        entitlementStatus: entMap.get(t.teacherId) ?? null,
      })),
    };
  } catch (e) {
    if (e?.code === "db_schema_not_ready") {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }
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
