import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../learning-supabase/student-auth";
import { getLearningSupabaseServiceRoleClient } from "../../learning-supabase/server";
import { rejectIfCrossOriginCookieMutation } from "../../security/same-origin.js";

/**
 * Resolves the authenticated student from the HTTP-only session cookie only.
 * Never accepts student_id from the request body or query.
 */
export async function requireArcadeStudent(req, res) {
  const method = String(req.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    if (rejectIfCrossOriginCookieMutation(req, res)) return null;
  }

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth?.studentId) {
      clearStudentSessionCookie(res);
      res.status(401).json({
        ok: false,
        error: "נדרשת התחברות ילד/ה",
        code: "unauthorized",
      });
      return null;
    }

    const supabase = getLearningSupabaseServiceRoleClient();

    return {
      studentId: auth.studentId,
      studentSessionId: auth.studentSessionId,
      student: auth.student,
      supabase,
    };
  } catch (_e) {
    clearStudentSessionCookie(res);
    res.status(500).json({ ok: false, error: "שגיאת שרת", code: "server_error" });
    return null;
  }
}
