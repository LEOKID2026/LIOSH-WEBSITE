import crypto from "node:crypto";
import {
  GUEST_ACCOUNT_KIND,
  GUEST_DEFAULT_GRADE_LEVEL,
  GUEST_SESSION_KIND,
  GUEST_STATUS_ACTIVE,
  GUEST_STATUS_LINKED,
} from "./constants.js";
import { generateUniqueLeoNumber } from "./guest-leo-number.server.js";
import { resolveGuestSystemParentId } from "./guest-system-parent.server.js";
import { loadGuestRuntimeConfig } from "./guest-settings.server.js";
import { isGuestStudent } from "./guest-display.js";
import { isLinkedGuestStudent } from "./guest-access-policy.server.js";
import {
  generateStudentSessionToken,
  hashStudentSecret,
  sessionExpiryIsoFromNow,
} from "../learning-supabase/student-auth.js";

function isMissingGuestColumnError(error) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
}

export function generateGuestResumeToken() {
  return crypto.randomUUID();
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} resumeTokenHash
 */
async function findActiveGuestBinding(supabase, resumeTokenHash) {
  const { data, error } = await supabase
    .from("guest_device_bindings")
    .select("id, student_id, resume_token_hash, revoked_at")
    .eq("resume_token_hash", resumeTokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    if (isMissingGuestColumnError(error)) return null;
    throw error;
  }
  return data;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
async function loadGuestStudentRow(supabase, studentId) {
  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, grade_level, is_active, account_kind, leo_number, guest_status")
    .eq("id", studentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} studentId
 */
async function createGuestSession(supabase, studentId) {
  const token = generateStudentSessionToken();
  const tokenHash = hashStudentSecret(token);
  const nowIso = new Date().toISOString();
  const expiresAt = sessionExpiryIsoFromNow();

  const insertRow = {
    student_id: studentId,
    access_code_id: null,
    session_token_hash: tokenHash,
    started_at: nowIso,
    last_seen_at: nowIso,
    expires_at: expiresAt,
    ended_at: null,
    revoked_at: null,
    client_meta: { guest: true },
    session_kind: GUEST_SESSION_KIND,
  };

  let result = await supabase.from("student_sessions").insert(insertRow).select("id").maybeSingle();
  if (result.error && isMissingGuestColumnError(result.error)) {
    const { session_kind, ...fallback } = insertRow;
    result = await supabase.from("student_sessions").insert(fallback).select("id").maybeSingle();
  }

  if (result.error || !result.data?.id) {
    return { ok: false, code: "session_create_failed" };
  }

  await supabase
    .from("students")
    .update({ guest_last_seen_at: nowIso })
    .eq("id", studentId);

  return {
    ok: true,
    sessionToken: token,
    sessionId: result.data.id,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} resumeToken
 */
export async function resumeGuestStudent(supabase, resumeToken) {
  const raw = String(resumeToken || "").trim();
  if (!raw) {
    return { ok: false, status: 400, code: "missing_resume_token", message: "חסר resume token" };
  }

  const config = await loadGuestRuntimeConfig(supabase);
  if (!config.enabled) {
    return { ok: false, status: 403, code: "guest_mode_disabled", message: "מצב אורח כבוי כרגע" };
  }

  const tokenHash = hashStudentSecret(raw);
  const binding = await findActiveGuestBinding(supabase, tokenHash);
  if (!binding?.student_id) {
    return { ok: false, status: 401, code: "guest_resume_invalid", message: "לא ניתן לחדש את האורח במכשיר זה" };
  }

  const student = await loadGuestStudentRow(supabase, binding.student_id);
  if (!student?.id || student.is_active !== true || !isGuestStudent(student)) {
    return { ok: false, status: 401, code: "guest_resume_invalid", message: "לא ניתן לחדש את האורח במכשיר זה" };
  }

  if (isLinkedGuestStudent(student)) {
    return {
      ok: false,
      status: 403,
      code: "guest_already_linked",
      message: "המספר כבר שויך להורה - התחבר/י עם שם משתמש ו-PIN",
    };
  }

  await supabase
    .from("guest_device_bindings")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", binding.id);

  const session = await createGuestSession(supabase, student.id);
  if (!session.ok) {
    return { ok: false, status: 500, code: session.code, message: "שגיאת שרת" };
  }

  return {
    ok: true,
    student,
    resumeToken: raw,
    sessionToken: session.sessionToken,
    sessionId: session.sessionId,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ resumeToken?: string|null }} [options]
 */
export async function startGuestStudent(supabase, options = {}) {
  const existingToken = String(options.resumeToken || "").trim();
  if (existingToken) {
    return resumeGuestStudent(supabase, existingToken);
  }

  const config = await loadGuestRuntimeConfig(supabase);
  if (!config.enabled) {
    return { ok: false, status: 403, code: "guest_mode_disabled", message: "מצב אורח כבוי כרגע" };
  }

  const parent = await resolveGuestSystemParentId(supabase);
  if (!parent.ok) {
    return { ok: false, status: parent.status, code: parent.code, message: "מערכת אורח לא מוכנה" };
  }

  const leoNumber = await generateUniqueLeoNumber(supabase);
  const displayName = `אורח ${leoNumber}`;
  const nowIso = new Date().toISOString();

  const studentInsert = {
    parent_id: parent.parentId,
    full_name: displayName,
    grade_level: GUEST_DEFAULT_GRADE_LEVEL,
    is_active: true,
    account_kind: GUEST_ACCOUNT_KIND,
    leo_number: leoNumber,
    guest_status: GUEST_STATUS_ACTIVE,
    guest_last_seen_at: nowIso,
  };

  const { data: student, error: studentErr } = await supabase
    .from("students")
    .insert(studentInsert)
    .select("id, full_name, grade_level, is_active, account_kind, leo_number, guest_status")
    .single();

  if (studentErr || !student?.id) {
    if (isMissingGuestColumnError(studentErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready", message: "מערכת אורח לא מוכנה" };
    }
    return { ok: false, status: 500, code: "guest_create_failed", message: "לא ניתן ליצור אורח" };
  }

  const resumeToken = generateGuestResumeToken();
  const resumeTokenHash = hashStudentSecret(resumeToken);

  const { error: bindErr } = await supabase.from("guest_device_bindings").insert({
    student_id: student.id,
    resume_token_hash: resumeTokenHash,
    last_used_at: nowIso,
  });

  if (bindErr) {
    return { ok: false, status: 500, code: "guest_binding_failed", message: "לא ניתן ליצור אורח" };
  }

  const session = await createGuestSession(supabase, student.id);
  if (!session.ok) {
    return { ok: false, status: 500, code: session.code, message: "שגיאת שרת" };
  }

  return {
    ok: true,
    student,
    resumeToken,
    sessionToken: session.sessionToken,
    sessionId: session.sessionId,
    leoNumber,
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} guestStudentId
 */
export async function revokeGuestSessionsAndBindings(supabase, guestStudentId) {
  const nowIso = new Date().toISOString();

  await supabase
    .from("guest_device_bindings")
    .update({ revoked_at: nowIso })
    .eq("student_id", guestStudentId)
    .is("revoked_at", null);

  await supabase
    .from("student_sessions")
    .update({ revoked_at: nowIso, ended_at: nowIso })
    .eq("student_id", guestStudentId)
    .is("revoked_at", null);
}
