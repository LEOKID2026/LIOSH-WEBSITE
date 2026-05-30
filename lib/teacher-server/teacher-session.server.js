import { getLearningSupabaseServerUserClient, getLearningSupabaseServiceRoleClient } from "../learning-supabase/server.js";
import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { normalizeTeacherFeatureFlags } from "./teacher-entitlements.server.js";

export const TEACHER_PORTAL_DEFAULT_PLAN_CODE = "teacher_basic_20";
/** Unlimited total active teacher_students links (this phase). */
export const SYSTEM_DEFAULT_MAX_TOTAL_STUDENTS = null;
/** Unlimited active classes per teacher (this phase). */
export const SYSTEM_DEFAULT_MAX_CLASSES = null;
/** Hard per-class cap when plan/override do not apply. */
export const SYSTEM_DEFAULT_MAX_STUDENTS_PER_CLASS = 40;

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

const TEACHER_PERSONAS = ["private_teacher", "school_teacher", "school_manager", "school_operator"];

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 */
async function resolveTeacherPersonaEntitlement(serviceRole, userId) {
  const { assertActivePersonaEntitlement } = await import("../auth/persona-guard.server.js");
  let matchedEntitlement = null;

  for (const persona of TEACHER_PERSONAS) {
    const check = await assertActivePersonaEntitlement(serviceRole, userId, persona);
    if (!check.ok && check.code === "db_schema_not_ready") {
      return { ok: false, status: 503, code: "db_schema_not_ready", message: "db_schema_not_ready" };
    }
    if (check.ok) {
      matchedEntitlement = check.entitlement;
      break;
    }
    if (
      check.code === "entitlement_pending" ||
      check.code === "entitlement_rejected" ||
      check.code === "entitlement_suspended" ||
      check.code === "entitlement_revoked"
    ) {
      return {
        ok: false,
        status: check.status || 403,
        code: check.code,
        message: check.code,
      };
    }
  }

  if (!matchedEntitlement) {
    return { ok: false, status: 403, code: "not_a_teacher", message: "No active teacher entitlement" };
  }

  return { ok: true, entitlement: matchedEntitlement };
}

/**
 * @param {string} authHeader
 * @param {import('http').IncomingMessage} [req]
 */
export async function resolveAuthenticatedTeacherUserId(authHeader, req) {
  const bearer = typeof authHeader === "string" ? authHeader.trim() : "";

  if (bearer.startsWith("Bearer ")) {
    const supabase = getLearningSupabaseServerUserClient(bearer);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return { ok: false, status: 401, code: "not_authenticated", message: "Invalid session" };
    }

    const role = normalizeTeacherRole(userData.user);
    if (role !== "teacher") {
      return { ok: false, status: 403, code: "not_a_teacher", message: "Not a teacher account" };
    }

    const serviceRole = getLearningSupabaseServiceRoleClient();
    const entitlementResult = await resolveTeacherPersonaEntitlement(
      serviceRole,
      userData.user.id
    );
    if (!entitlementResult.ok) return entitlementResult;

    return {
      ok: true,
      teacherUserId: userData.user.id,
      entitlement: entitlementResult.entitlement,
      authMethod: "supabase_jwt",
    };
  }

  if (req) {
    const { resolveAuthenticatedStaffFromRequest } = await import(
      "../school-server/school-staff-session.server.js"
    );
    const { isStaffPinChangeExemptRequest } = await import(
      "../school-server/school-staff-pin-gate.server.js"
    );
    const staffAuth = await resolveAuthenticatedStaffFromRequest(req);
    if (staffAuth.ok) {
      if (staffAuth.mustChangePin && !isStaffPinChangeExemptRequest(req)) {
        return {
          ok: false,
          status: 403,
          code: "pin_change_required",
          message: "PIN change required before accessing this resource",
        };
      }

      const serviceRole = getLearningSupabaseServiceRoleClient();
      const entitlementResult = await resolveTeacherPersonaEntitlement(serviceRole, staffAuth.userId);
      if (!entitlementResult.ok) return entitlementResult;

      return {
        ok: true,
        teacherUserId: staffAuth.userId,
        entitlement: entitlementResult.entitlement,
        authMethod: "staff_cookie",
        staffRole: staffAuth.staffRole,
        schoolId: staffAuth.schoolId,
        mustChangePin: staffAuth.mustChangePin === true,
      };
    }
  }

  return { ok: false, status: 401, code: "not_authenticated", message: "Missing bearer token" };
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
    .select(
      "teacher_id, plan_code, student_limit_override, class_limit_override, max_students_per_class_override, feature_flags, is_account_active, effective_until, notes"
    )
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
    .select("code, student_limit, class_limit, max_students_per_class")
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
  const overridePerClass = limitsRow.max_students_per_class_override;
  const planStudent = plan?.student_limit;
  const planClass = plan?.class_limit;
  const planPerClass = plan?.max_students_per_class;

  let studentLimit = SYSTEM_DEFAULT_MAX_TOTAL_STUDENTS;
  if (overrideStudent != null) {
    studentLimit = overrideStudent;
  } else if (planStudent != null) {
    studentLimit = planStudent;
  }

  let classLimit = SYSTEM_DEFAULT_MAX_CLASSES;
  if (overrideClass != null) {
    classLimit = overrideClass;
  } else if (planClass != null) {
    classLimit = planClass;
  }

  // NULL override → plan (40 for all plans after migration 025). Never unlimited per class.
  let maxStudentsPerClass = SYSTEM_DEFAULT_MAX_STUDENTS_PER_CLASS;
  if (overridePerClass != null) {
    maxStudentsPerClass = overridePerClass;
  } else if (planPerClass != null) {
    maxStudentsPerClass = planPerClass;
  }

  const featureFlags = normalizeTeacherFeatureFlags(limitsRow.feature_flags);

  return {
    ok: true,
    limits: {
      planCode: limitsRow.plan_code,
      studentLimit,
      classLimit,
      maxStudentsPerClass,
      featureFlags,
      isAccountActive: limitsRow.is_account_active !== false,
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
 * @param {{ planCode: string, studentLimit: number|null, classLimit: number|null, maxStudentsPerClass: number|null, featureFlags?: object, isAccountActive?: boolean }} limits
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
 * @param {{ planCode: string, studentLimit: number|null, classLimit: number|null, maxStudentsPerClass: number|null, featureFlags?: object, isAccountActive?: boolean }} limits
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
