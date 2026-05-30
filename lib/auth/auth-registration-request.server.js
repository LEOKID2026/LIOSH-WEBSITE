import crypto from "node:crypto";
import { LEARNING_SUBJECT_ALLOWLIST } from "../learning-supabase/learning-activity.js";
import { isDbSchemaNotReadyError } from "../teacher-server/teacher-audit.server.js";
import {
  TEACHER_PORTAL_DEFAULT_PLAN_CODE,
  loadTeacherLimitsRow,
  loadTeacherProfileRow,
} from "../teacher-server/teacher-session.server.js";
import { loadPersonaEntitlement } from "./persona-entitlement.server.js";
import { sendSchoolContactPasswordSetupEmail } from "./auth-password-setup.server.js";
import {
  REG_REQUEST_INTENT_OPTIONS,
  regRequestIntentLabelHe,
} from "./auth-registration.he.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_INTENT_SET = new Set(REG_REQUEST_INTENT_OPTIONS.map((o) => o.id));
const MIN_EXPLANATION_LENGTH = 10;

/**
 * @param {string} phone
 */
export function normalizeRegistrationPhone(phone) {
  const trimmed = String(phone || "").trim();
  if (!trimmed || trimmed.length > 30) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return trimmed;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} email
 */
export async function findAuthUserByEmail(serviceRole, email) {
  const target = String(email).trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await serviceRole.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data?.users?.find((u) => String(u.email || "").toLowerCase() === target);
    if (match) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} email
 * @param {string} displayName
 */
export async function ensureTeacherAuthUser(serviceRole, email, displayName) {
  const normalized = String(email).trim().toLowerCase();
  let user = await findAuthUserByEmail(serviceRole, normalized);
  if (user) return { ok: true, user, created: false };

  const tempPassword = crypto.randomBytes(24).toString("base64url");
  const { data, error } = await serviceRole.auth.admin.createUser({
    email: normalized,
    password: tempPassword,
    email_confirm: true,
    app_metadata: { role: "teacher" },
    user_metadata: { display_name: displayName, source: "registration_request" },
  });
  if (error) {
    return { ok: false, status: 500, code: "auth_user_create_failed" };
  }
  return { ok: true, user: data.user, created: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} displayName
 */
export async function ensureTeacherProfileAndLimits(serviceRole, teacherId, displayName) {
  const profileRes = await loadTeacherProfileRow(serviceRole, teacherId);
  if (!profileRes.ok) return profileRes;

  if (!profileRes.profile) {
    const { error } = await serviceRole.from("teacher_profiles").insert({
      id: teacherId,
      display_name: displayName,
      preferred_language: "he",
    });
    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
  }

  const limitsRes = await loadTeacherLimitsRow(serviceRole, teacherId);
  if (!limitsRes.ok) return limitsRes;
  if (!limitsRes.limits) {
    const { error } = await serviceRole.from("teacher_limits").insert({
      teacher_id: teacherId,
      plan_code: TEACHER_PORTAL_DEFAULT_PLAN_CODE,
      is_account_active: false,
    });
    if (error) {
      if (isDbSchemaNotReadyError(error)) {
        return { ok: false, status: 503, code: "db_schema_not_ready" };
      }
      return { ok: false, status: 500, code: "internal_error" };
    }
  }

  return { ok: true };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 * @param {'private_teacher'|'school_manager'} persona
 */
export async function upsertPendingEntitlement(serviceRole, userId, persona) {
  const existing = await loadPersonaEntitlement(serviceRole, userId, persona);
  if (!existing.ok) return existing;

  const status = existing.entitlement?.status;
  if (status && status !== "rejected") {
    if (status === "pending") {
      return { ok: false, status: 409, code: "request_already_pending" };
    }
    return { ok: false, status: 409, code: "entitlement_exists" };
  }

  const row = {
    user_id: userId,
    persona,
    status: "pending",
    approval_source: "self_signup",
    approved_by: null,
    approved_at: null,
  };

  const { data, error } = await serviceRole
    .from("account_persona_entitlements")
    .upsert(row, { onConflict: "user_id,persona" })
    .select("*")
    .single();

  if (error) {
    if (isDbSchemaNotReadyError(error)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  return { ok: true, entitlement: data };
}

/**
 * @param {string} requestIntent
 * @param {string} explanation
 */
export function formatRegistrationDescription(requestIntent, explanation) {
  const label = regRequestIntentLabelHe(requestIntent);
  const body = String(explanation || "").trim();
  return `סוג בקשה: ${label}\n${body}`.slice(0, 1000);
}

/**
 * @param {unknown} body
 */
export function parseTeacherRegistrationBody(body) {
  const b = body && typeof body === "object" ? body : {};
  const fullName = typeof b.fullName === "string" ? b.fullName.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const requestIntent =
    typeof b.requestIntent === "string" ? b.requestIntent.trim() : "";
  const explanation =
    typeof b.description === "string" ? b.description.trim() : "";
  const phone = normalizeRegistrationPhone(b.phone);

  if (!fullName || fullName.length > 120) {
    return { ok: false, code: "validation_failed", field: "fullName" };
  }
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, code: "validation_failed", field: "email" };
  }
  if (!phone) {
    return { ok: false, code: "validation_failed", field: "phone" };
  }
  if (!requestIntent || !REQUEST_INTENT_SET.has(requestIntent)) {
    return { ok: false, code: "validation_failed", field: "requestIntent" };
  }
  if (!explanation || explanation.length < MIN_EXPLANATION_LENGTH) {
    return { ok: false, code: "validation_failed", field: "description" };
  }

  let requestedSubjects = b.requestedSubjects;
  if (requestedSubjects == null) {
    requestedSubjects = [];
  }
  if (!Array.isArray(requestedSubjects)) {
    return { ok: false, code: "validation_failed", field: "requestedSubjects" };
  }
  requestedSubjects = [...new Set(requestedSubjects.map((s) => String(s).trim()).filter(Boolean))];
  for (const s of requestedSubjects) {
    if (!LEARNING_SUBJECT_ALLOWLIST.has(s)) {
      return { ok: false, code: "validation_failed", field: "requestedSubjects" };
    }
  }

  const description = formatRegistrationDescription(requestIntent, explanation);

  return {
    ok: true,
    payload: {
      fullName,
      email,
      phone,
      requestIntent,
      description,
      requestedSubjects,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {object} payload
 */
export async function submitTeacherRegistrationRequest(serviceRole, payload) {
  const authResult = await ensureTeacherAuthUser(serviceRole, payload.email, payload.fullName);
  if (!authResult.ok) return authResult;

  const userId = authResult.user.id;
  const profileResult = await ensureTeacherProfileAndLimits(serviceRole, userId, payload.fullName);
  if (!profileResult.ok) return profileResult;

  const entResult = await upsertPendingEntitlement(serviceRole, userId, "private_teacher");
  if (!entResult.ok) return entResult;

  const { error: reqErr } = await serviceRole.from("teacher_registration_requests").upsert(
    {
      user_id: userId,
      requested_subjects: payload.requestedSubjects,
      description: payload.description,
      phone: payload.phone,
      request_intent: payload.requestIntent,
      status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (reqErr && !isDbSchemaNotReadyError(reqErr)) {
    if (reqErr.code === "42703") {
      const { error: legacyErr } = await serviceRole.from("teacher_registration_requests").upsert(
        {
          user_id: userId,
          requested_subjects: payload.requestedSubjects,
          description: `${payload.description}\nטלפון: ${payload.phone}`.slice(0, 1000),
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (legacyErr && legacyErr.code !== "42P01") {
        return { ok: false, status: 500, code: "internal_error" };
      }
    } else if (reqErr.code !== "42P01") {
      return { ok: false, status: 500, code: "internal_error" };
    }
  }

  return { ok: true, userId };
}

/**
 * @param {unknown} body
 */
export function parseSchoolRegistrationBody(body) {
  const b = body && typeof body === "object" ? body : {};
  const schoolName = typeof b.schoolName === "string" ? b.schoolName.trim() : "";
  const city = typeof b.city === "string" ? b.city.trim() : "";
  const contactName = typeof b.contactName === "string" ? b.contactName.trim() : "";
  const contactEmail =
    typeof b.contactEmail === "string" ? b.contactEmail.trim().toLowerCase() : "";
  const message = typeof b.message === "string" ? b.message.trim().slice(0, 1000) : null;

  if (!schoolName || schoolName.length > 120) {
    return { ok: false, code: "validation_failed", field: "schoolName" };
  }
  if (!city || city.length > 100) {
    return { ok: false, code: "validation_failed", field: "city" };
  }
  if (!contactName || contactName.length > 120) {
    return { ok: false, code: "validation_failed", field: "contactName" };
  }
  if (!contactEmail || !EMAIL_RE.test(contactEmail) || contactEmail.length > 254) {
    return { ok: false, code: "validation_failed", field: "contactEmail" };
  }

  let approxTeachers = b.approxTeachers;
  if (approxTeachers != null && approxTeachers !== "") {
    approxTeachers = Number(approxTeachers);
    if (!Number.isInteger(approxTeachers) || approxTeachers < 1 || approxTeachers > 10000) {
      return { ok: false, code: "validation_failed", field: "approxTeachers" };
    }
  } else {
    approxTeachers = null;
  }

  let approxStudents = b.approxStudents;
  if (approxStudents != null && approxStudents !== "") {
    approxStudents = Number(approxStudents);
    if (!Number.isInteger(approxStudents) || approxStudents < 1 || approxStudents > 100000) {
      return { ok: false, code: "validation_failed", field: "approxStudents" };
    }
  } else {
    approxStudents = null;
  }

  return {
    ok: true,
    payload: {
      schoolName,
      city,
      contactName,
      contactEmail,
      approxTeachers,
      approxStudents,
      message: message || null,
    },
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {object} payload
 */
export async function submitSchoolRegistrationRequest(serviceRole, payload) {
  const authResult = await ensureTeacherAuthUser(
    serviceRole,
    payload.contactEmail,
    payload.contactName
  );
  if (!authResult.ok) return authResult;

  const contactUserId = authResult.user.id;
  const profileResult = await ensureTeacherProfileAndLimits(
    serviceRole,
    contactUserId,
    payload.contactName
  );
  if (!profileResult.ok) return profileResult;

  const existingEnt = await loadPersonaEntitlement(serviceRole, contactUserId, "school_manager");
  if (!existingEnt.ok) return existingEnt;
  if (existingEnt.entitlement?.status === "pending") {
    return { ok: false, status: 409, code: "request_already_pending" };
  }
  if (existingEnt.entitlement?.status && existingEnt.entitlement.status !== "rejected") {
    return { ok: false, status: 409, code: "entitlement_exists" };
  }

  const { data: schoolRow, error: schoolErr } = await serviceRole
    .from("school_accounts")
    .insert({
      name: payload.schoolName,
      city: payload.city,
      contact_email: payload.contactEmail,
      is_active: false,
      max_school_managers: 1,
    })
    .select("id")
    .single();

  if (schoolErr) {
    if (isDbSchemaNotReadyError(schoolErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const schoolId = schoolRow.id;

  const { error: memErr } = await serviceRole.from("school_teacher_memberships").insert({
    teacher_id: contactUserId,
    school_id: schoolId,
    role: "school_admin",
  });
  if (memErr) {
    if (isDbSchemaNotReadyError(memErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const entResult = await upsertPendingEntitlement(serviceRole, contactUserId, "school_manager");
  if (!entResult.ok) return entResult;

  const { error: reqErr } = await serviceRole.from("school_registration_requests").insert({
    school_id: schoolId,
    contact_user_id: contactUserId,
    contact_name: payload.contactName,
    contact_email: payload.contactEmail,
    approx_teachers: payload.approxTeachers,
    approx_students: payload.approxStudents,
    message: payload.message,
    status: "pending",
  });

  if (reqErr && !isDbSchemaNotReadyError(reqErr)) {
    if (reqErr.code !== "42P01") {
      return { ok: false, status: 500, code: "internal_error" };
    }
  }

  return { ok: true, schoolId, contactUserId };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} adminUserId
 */
export async function approveSchoolRegistration(serviceRole, schoolId, adminUserId) {
  const { data: school, error: schoolErr } = await serviceRole
    .from("school_accounts")
    .select("id, is_active")
    .eq("id", schoolId)
    .maybeSingle();
  if (schoolErr || !school) {
    return { ok: false, status: 404, code: "school_not_found" };
  }

  const { error: activateErr } = await serviceRole
    .from("school_accounts")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", schoolId);
  if (activateErr) {
    return { ok: false, status: 500, code: "internal_error" };
  }

  const { data: managers } = await serviceRole
    .from("school_teacher_memberships")
    .select("teacher_id")
    .eq("school_id", schoolId)
    .eq("role", "school_admin");

  for (const m of managers || []) {
    const ent = await loadPersonaEntitlement(serviceRole, m.teacher_id, "school_manager");
    if (!ent.ok || !ent.entitlement?.id) continue;
    await serviceRole
      .from("account_persona_entitlements")
      .update({
        status: "active",
        approval_source: "admin",
        approved_by: adminUserId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ent.entitlement.id);
  }

  await serviceRole
    .from("school_registration_requests")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("school_id", schoolId);

  const passwordSetup = await sendSchoolContactPasswordSetupEmail(serviceRole, schoolId, {
    portal: "teacher",
  });

  return { ok: true, schoolId, passwordSetup };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {string} adminUserId
 * @param {string|null} reason
 */
export async function rejectSchoolRegistration(serviceRole, schoolId, adminUserId, reason) {
  const { data: school, error: schoolErr } = await serviceRole
    .from("school_accounts")
    .select("id")
    .eq("id", schoolId)
    .maybeSingle();
  if (schoolErr || !school) {
    return { ok: false, status: 404, code: "school_not_found" };
  }

  const { data: managers } = await serviceRole
    .from("school_teacher_memberships")
    .select("teacher_id")
    .eq("school_id", schoolId)
    .eq("role", "school_admin");

  for (const m of managers || []) {
    const ent = await loadPersonaEntitlement(serviceRole, m.teacher_id, "school_manager");
    if (!ent.ok || !ent.entitlement?.id) continue;
    await serviceRole
      .from("account_persona_entitlements")
      .update({
        status: "rejected",
        rejected_by: adminUserId,
        rejected_at: new Date().toISOString(),
        reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ent.entitlement.id);
  }

  await serviceRole
    .from("school_registration_requests")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("school_id", schoolId);

  return { ok: true, schoolId };
}

export { LEARNING_SUBJECT_ALLOWLIST };
