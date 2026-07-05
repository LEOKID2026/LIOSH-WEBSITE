import { safeApiLog } from "../security/safe-log.js";
import { CANONICAL_PUBLIC_SITE_ORIGIN } from "../site/canonical-public-site-origin.js";

/** @returns {string} */
export function getPublicSiteOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    CANONICAL_PUBLIC_SITE_ORIGIN;
  return String(raw).replace(/\/$/, "");
}

/**
 * @param {string} email
 * @param {{ portal?: 'teacher'|'parent' }} [options]
 */
export async function sendPasswordSetupRecoveryEmail(email, { portal = "teacher" } = {}) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, code: "missing_supabase_env", message: "Missing Supabase public env" };
  }

  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return { ok: false, code: "validation_failed", message: "Missing email" };
  }

  const redirectTo = `${getPublicSiteOrigin()}/auth/reset-password?portal=${portal}`;

  try {
    const res = await fetch(`${url}/auth/v1/recover`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalized,
        redirect_to: redirectTo,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      safeApiLog("password_setup_recover_failed", {
        status: res.status,
        message: String(body?.msg || body?.error_description || ""),
      });
      return {
        ok: false,
        code: "recover_request_failed",
        message: String(body?.msg || body?.error_description || "recover failed"),
        redirectTo,
      };
    }

    return { ok: true, code: null, redirectTo, sentAt: new Date().toISOString() };
  } catch (err) {
    safeApiLog("password_setup_recover_error", {
      message: String(err?.message || err),
    });
    return { ok: false, code: "network_error", message: String(err?.message || "network error") };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 */
export async function resolveUserEmail(serviceRole, userId) {
  const { data, error } = await serviceRole.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) {
    return { ok: false, code: "user_not_found" };
  }
  return { ok: true, email: String(data.user.email).trim().toLowerCase() };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 * @param {{ portal?: 'teacher'|'parent' }} [options]
 */
export async function sendUserPasswordSetupEmail(serviceRole, userId, options = {}) {
  const emailResult = await resolveUserEmail(serviceRole, userId);
  if (!emailResult.ok) return emailResult;

  const sendResult = await sendPasswordSetupRecoveryEmail(emailResult.email, options);
  await recordTeacherPasswordSetupStatus(serviceRole, userId, sendResult);
  return { ...sendResult, email: emailResult.email, userId };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} userId
 * @param {{ ok: boolean, sentAt?: string, message?: string }} sendResult
 */
export async function recordTeacherPasswordSetupStatus(serviceRole, userId, sendResult) {
  const patch = sendResult.ok
    ? {
        password_setup_sent_at: sendResult.sentAt || new Date().toISOString(),
        password_setup_last_error: null,
        updated_at: new Date().toISOString(),
      }
    : {
        password_setup_last_error: String(sendResult.message || sendResult.code || "send_failed").slice(
          0,
          500
        ),
        updated_at: new Date().toISOString(),
      };

  const { error } = await serviceRole
    .from("teacher_registration_requests")
    .update(patch)
    .eq("user_id", userId);

  if (error && error.code !== "42P01" && error.code !== "42703") {
    safeApiLog("teacher_password_setup_status_update_failed", { code: error.code });
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {{ ok: boolean, sentAt?: string, message?: string }} sendResult
 */
export async function recordSchoolPasswordSetupStatus(serviceRole, schoolId, sendResult) {
  const patch = sendResult.ok
    ? {
        password_setup_sent_at: sendResult.sentAt || new Date().toISOString(),
        password_setup_last_error: null,
        updated_at: new Date().toISOString(),
      }
    : {
        password_setup_last_error: String(sendResult.message || sendResult.code || "send_failed").slice(
          0,
          500
        ),
        updated_at: new Date().toISOString(),
      };

  const { error } = await serviceRole
    .from("school_registration_requests")
    .update(patch)
    .eq("school_id", schoolId);

  if (error && error.code !== "42P01" && error.code !== "42703") {
    safeApiLog("school_password_setup_status_update_failed", { code: error.code });
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} schoolId
 * @param {{ portal?: 'teacher'|'parent' }} [options]
 */
export async function sendSchoolContactPasswordSetupEmail(serviceRole, schoolId, options = {}) {
  const { data: reqRow, error } = await serviceRole
    .from("school_registration_requests")
    .select("contact_user_id, contact_email")
    .eq("school_id", schoolId)
    .maybeSingle();

  if (error || !reqRow) {
    return { ok: false, code: "school_request_not_found" };
  }

  let email = reqRow.contact_email ? String(reqRow.contact_email).trim().toLowerCase() : "";
  if (!email && reqRow.contact_user_id) {
    const resolved = await resolveUserEmail(serviceRole, reqRow.contact_user_id);
    if (resolved.ok) email = resolved.email;
  }
  if (!email) {
    return { ok: false, code: "no_contact_email" };
  }

  const sendResult = await sendPasswordSetupRecoveryEmail(email, options);
  await recordSchoolPasswordSetupStatus(serviceRole, schoolId, sendResult);
  if (reqRow.contact_user_id) {
    await recordTeacherPasswordSetupStatus(serviceRole, reqRow.contact_user_id, sendResult);
  }
  return { ...sendResult, email, userId: reqRow.contact_user_id, schoolId };
}
