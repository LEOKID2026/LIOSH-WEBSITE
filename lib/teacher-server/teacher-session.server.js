import { getLearningSupabaseServerUserClient, getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";

export const TEACHER_PORTAL_DEFAULT_PLAN_CODE = "teacher_basic_20";
const SYSTEM_DEFAULT_STUDENT_LIMIT = 20;

function envFlag(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") {
    return defaultValue;
  }
  return String(raw).trim().toLowerCase() === "true";
}

/** Portal on by default; set env to "false" to disable (e.g. emergency kill-switch). */
function envPortalEnabledFlag(name) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") {
    return true;
  }
  return String(raw).trim().toLowerCase() === "true";
}

export function isTeacherPortalEnabled() {
  return envPortalEnabledFlag("TEACHER_PORTAL_ENABLED");
}

export function isTeacherPortalInviteOnly() {
  return envFlag("TEACHER_PORTAL_INVITE_ONLY", true);
}

export function isTeacherPortalUiCopyEnabled() {
  return true;
}

export function isTeacherPortalLinkEnabled() {
  return envFlag("TEACHER_PORTAL_LINK_ENABLED", false);
}

/**
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {string} code
 * @param {string} [message]
 */
export function sendTeacherApiError(res, status, code, message) {
  const body = {
    error: {
      code,
      message: message || code,
    },
  };
  return res.status(status).json(body);
}

/**
 * @param {import('http').ServerResponse} res
 */
export function rejectIfTeacherPortalDisabled(res) {
  if (isTeacherPortalEnabled()) return false;
  sendTeacherApiError(res, 503, "feature_disabled", "Teacher portal is disabled");
  return true;
}

function normalizeTeacherRole(user) {
  const meta = user?.app_metadata;
  if (!meta || typeof meta !== "object") return null;
  const role = meta.role;
  return typeof role === "string" ? role.trim().toLowerCase() : null;
}

/**
 * @param {string} authHeader
 */
export async function resolveAuthenticatedTeacherUserId(authHeader) {
  const bearer = typeof authHeader === "string" ? authHeader.trim() : "";
  if (!bearer.startsWith("Bearer ")) {
    return { ok: false, status: 401, code: "not_authenticated", message: "Missing bearer token" };
  }

  const supabase = getLearningSupabaseServerUserClient(bearer);
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return { ok: false, status: 401, code: "not_authenticated", message: "Invalid session" };
  }

  const role = normalizeTeacherRole(userData.user);
  if (role !== "teacher") {
    return { ok: false, status: 403, code: "not_a_teacher", message: "Not a teacher account" };
  }

  return { ok: true, teacherUserId: userData.user.id };
}

export function getTeacherPortalServiceRole() {
  return getLearningSupabaseServiceRoleClient();
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function loadTeacherProfileRow(serviceRole, teacherId) {
  const { data, error } = await serviceRole
    .from("teacher_profiles")
    .select("id, display_name, preferred_language, is_active, created_at, archived_at")
    .eq("id", teacherId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  if (!data || data.archived_at != null || data.is_active === false) {
    return { ok: true, profile: null };
  }

  return { ok: true, profile: data };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function loadTeacherLimitsRow(serviceRole, teacherId) {
  const { data, error } = await serviceRole
    .from("teacher_limits")
    .select("teacher_id, plan_code, student_limit_override, class_limit_override, effective_until")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, limits: data || null };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {{ plan_code: string, student_limit_override: number|null, class_limit_override: number|null }} limitsRow
 */
export async function resolveTeacherPlanLimits(serviceRole, limitsRow) {
  const { data: plan, error } = await serviceRole
    .from("teacher_plans")
    .select("code, student_limit, class_limit")
    .eq("code", limitsRow.plan_code)
    .eq("is_active", true)
    .maybeSingle();

  if (error && !isDbSchemaNotReadyError(error)) {
    return { ok: false, status: 500, code: "internal_error" };
  }
  if (error && isDbSchemaNotReadyError(error)) {
    return { ok: false, status: 503, code: "db_schema_not_ready" };
  }

  const overrideStudent = limitsRow.student_limit_override;
  const overrideClass = limitsRow.class_limit_override;
  const planStudent = plan?.student_limit;
  const planClass = plan?.class_limit;

  let studentLimit = SYSTEM_DEFAULT_STUDENT_LIMIT;
  if (overrideStudent != null) {
    studentLimit = overrideStudent;
  } else if (planStudent != null) {
    studentLimit = planStudent;
  }

  let classLimit = 0;
  if (overrideClass != null) {
    classLimit = overrideClass;
  } else if (planClass != null) {
    classLimit = planClass;
  }

  return {
    ok: true,
    limits: {
      planCode: limitsRow.plan_code,
      studentLimit,
      classLimit,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 */
export async function loadTeacherCounters(serviceRole, teacherId) {
  const [studentsRes, classesRes] = await Promise.all([
    serviceRole
      .from("teacher_students")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .is("archived_at", null),
    serviceRole
      .from("teacher_classes")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .eq("is_archived", false)
      .is("archived_at", null),
  ]);

  const err = studentsRes.error || classesRes.error;
  if (err) {
    if (isDbSchemaNotReadyError(err)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return {
    ok: true,
    counters: {
      activeStudentLinks: studentsRes.count ?? 0,
      activeClasses: classesRes.count ?? 0,
    },
  };
}

/**
 * @param {import('http').IncomingMessage} req
 */
export function parseTeacherOnboardBody(req) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  let displayName = body.displayName;
  let preferredLanguage = body.preferredLanguage;

  if (displayName != null) {
    if (typeof displayName !== "string") {
      return { ok: false, code: "validation_failed", field: "displayName" };
    }
    displayName = displayName.trim();
    if (displayName.length > 80) {
      return { ok: false, code: "validation_failed", field: "displayName" };
    }
    if (!displayName) displayName = null;
  } else {
    displayName = null;
  }

  if (preferredLanguage != null) {
    if (typeof preferredLanguage !== "string") {
      return { ok: false, code: "validation_failed", field: "preferredLanguage" };
    }
    preferredLanguage = preferredLanguage.trim();
    if (preferredLanguage.length > 16) {
      return { ok: false, code: "validation_failed", field: "preferredLanguage" };
    }
    if (!preferredLanguage) preferredLanguage = null;
  } else {
    preferredLanguage = null;
  }

  return { ok: true, displayName, preferredLanguage };
}

/**
 * @param {{ id: string, display_name: string|null, preferred_language: string|null, is_active: boolean, created_at: string }} profile
 * @param {{ planCode: string, studentLimit: number, classLimit: number }} limits
 */
export function formatTeacherOnboardPayload(profile, limits) {
  return {
    teacherId: profile.id,
    displayName: profile.display_name,
    preferredLanguage: profile.preferred_language,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    limits,
  };
}

/**
 * @param {{ id: string, display_name: string|null, preferred_language: string|null, is_active: boolean, created_at: string }} profile
 * @param {{ planCode: string, studentLimit: number, classLimit: number }} limits
 * @param {{ activeStudentLinks: number, activeClasses: number }} counters
 */
export function formatTeacherMePayload(profile, limits, counters) {
  return {
    teacher: {
      teacherId: profile.id,
      displayName: profile.display_name,
      preferredLanguage: profile.preferred_language,
      isActive: profile.is_active,
      createdAt: profile.created_at,
    },
    limits,
    counters,
    flags: {
      uiCopyEnabled: isTeacherPortalUiCopyEnabled(),
    },
  };
}
