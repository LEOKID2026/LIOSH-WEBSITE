import { getLearningSupabaseServiceRoleClient } from "../../../lib/learning-supabase/server";
import { devStudentIdentityPayload } from "../../../lib/dev-student-identity-api";
import { isStudentIdentityDebugEnabled } from "../../../lib/student-identity-debug-flag";
import {
  clearStudentSessionCookie,
  getAuthenticatedStudentSession,
} from "../../../lib/learning-supabase/student-auth";
import { safeApiLog } from "../../../lib/security/safe-log.js";

export default async function handler(req, res) {
  // Authenticated identity must never be served from a shared or disk cache — otherwise
  // after switching students (new session cookie), a stale cached GET can return the
  // previous child and client sync logic would overwrite the correct identity.
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const auth = await getAuthenticatedStudentSession(req);
    if (!auth) {
      clearStudentSessionCookie(res);
      return res.status(401).json({ ok: false, error: "Student session expired" });
    }

    const supabase = getLearningSupabaseServiceRoleClient();
    const nowIso = new Date().toISOString();

    await supabase
      .from("student_sessions")
      .update({ last_seen_at: nowIso })
      .eq("id", auth.studentSessionId);

    const student = auth.student;
    const rel = student.student_coin_balances;
    const balance =
      Array.isArray(rel) ? rel[0]?.balance ?? 0 : rel?.balance ?? 0;

    const bodyStudent = {
      id: student.id,
      full_name: student.full_name,
      grade_level: student.grade_level,
      is_active: student.is_active,
      coin_balance: balance,
    };
    const debugStudentIdentity = devStudentIdentityPayload("student-me-api", student);
    if (isStudentIdentityDebugEnabled() && debugStudentIdentity) {
      safeApiLog("[LIOSH student identity] API", debugStudentIdentity);
    }

    return res.status(200).json({
      ok: true,
      student: bodyStudent,
      ...(debugStudentIdentity ? { debugStudentIdentity } : {}),
    });
  } catch (_e) {
    clearStudentSessionCookie(res);
    return res.status(500).json({ ok: false, error: "שגיאת שרת" });
  }
}

