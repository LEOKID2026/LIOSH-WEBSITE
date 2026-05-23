/**
 * Defense-in-depth ownership gate for Copilot service-role payload rebuild.
 * Fail closed — independent of upstream handler auth.
 */

/**
 * @param {string} raw
 * @returns {string | null}
 */
export function safeUuid(raw) {
  const s = String(raw || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return null;
  }
  return s;
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} serviceClient
 * @param {string} studentId
 * @param {{ authMode?: string, parentUserId?: string | null, authenticatedStudentId?: string | null }} authContext
 * @returns {Promise<{ ok: true, student: object } | { ok: false, code: string }>}
 */
export async function verifyStudentForCopilotRebuild(serviceClient, studentId, authContext) {
  const mode = String(authContext?.authMode || "");
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && mode === "dev_local") {
    return { ok: false, code: "DEV_LOCAL_BLOCKED" };
  }
  if (mode !== "parent_bearer" && mode !== "student_session") {
    return { ok: false, code: "UNSUPPORTED_AUTH_MODE" };
  }

  const { data: student, error: studentErr } = await serviceClient
    .from("students")
    .select("id,full_name,grade_level,is_active,parent_id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentErr || !student?.id || student.is_active !== true) {
    return { ok: false, code: "STUDENT_NOT_FOUND" };
  }

  if (mode === "parent_bearer") {
    const parentUserId = safeUuid(authContext?.parentUserId);
    if (!parentUserId || student.parent_id !== parentUserId) {
      return { ok: false, code: "PARENT_OWNERSHIP_DENIED" };
    }
  } else if (mode === "student_session") {
    const sessionStudentId = safeUuid(authContext?.authenticatedStudentId);
    if (!sessionStudentId || student.id !== sessionStudentId) {
      return { ok: false, code: "STUDENT_SESSION_DENIED" };
    }
  }

  return { ok: true, student };
}
